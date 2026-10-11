import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Detection,
  FrameResult,
  ModelStatus,
  ScannerSettings,
  Track,
} from '../types';
import { FramePipeline } from '../core/pipeline';
import { selectDefaultTrack } from '../core/candidate';
import { DEFAULT_MODEL_URL } from '../core/coco';
import type { ObjectDetector } from '../vision/detector.types';
import { OnnxDetector } from '../vision/onnxYoloDetector';
import { MockDetector } from '../vision/mockDetector';
import { HandLandmarkerAdapter } from '../vision/handLandmarker';
import { useCamera } from './useCamera';

export type ScannerSource = 'camera' | 'upload';

export interface ScannerController {
  camera: ReturnType<typeof useCamera>;
  modelStatus: ModelStatus;
  modelId: string;
  backendId: string;
  tracks: Track[];
  lastFrame: FrameResult | null;
  sourceType: ScannerSource;
  selectedTrackId: number | null;
  selectedTrack: Track | null;
  selectTrack: (id: number | null) => void;
  processingFps: number | null;
  latencyMs: number | null;
  lastError: string | null;
  handsReady: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  loadImage: (file: File) => Promise<void>;
  retryModel: () => void;
  busy: boolean;
  resetTracker: () => void;
  /** Re-run inference on the current still/upload without camera. */
  reanalyze: () => void;
  uploadPreviewUrl: string | null;
  /** Latest raw frame pixel dimensions (source space for overlay). */
  frameSize: { width: number; height: number } | null;
  /** Draw the current camera frame to a canvas (for snapshots). */
  grabSnapshotCanvas: () => HTMLCanvasElement | null;
}

interface UseScannerOptions {
  settings: ScannerSettings;
  /** Force the development mock backend (never real AI). */
  useMockBackend?: boolean;
}

function createDetector(useMock: boolean): ObjectDetector {
  if (useMock) return new MockDetector();
  const envUrl = import.meta.env.VITE_DETECTOR_MODEL_URL as string | undefined;
  return new OnnxDetector(envUrl || DEFAULT_MODEL_URL);
}

export function useScanner({ settings, useMockBackend = false }: UseScannerOptions): ScannerController {
  const camera = useCamera();
  const [modelStatus, setModelStatus] = useState<ModelStatus>({ state: 'idle' });
  const [tracks, setTracks] = useState<Track[]>([]);
  const [lastFrame, setLastFrame] = useState<FrameResult | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [processingFps, setProcessingFps] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [handsReady, setHandsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sourceType, setSourceType] = useState<ScannerSource>('camera');
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);

  const detectorRef = useRef<ObjectDetector | null>(null);
  const handsRef = useRef<HandLandmarkerAdapter | null>(null);
  const pipelineRef = useRef(new FramePipeline());
  const processCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const uploadCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoMetaRef = useRef<{ width: number; height: number } | null>(null);
  const lastRunAtRef = useRef(0);
  const frameCounterRef = useRef(0);
  const latenciesRef = useRef<number[]>([]);
  const fpsTimesRef = useRef<number[]>([]);
  const busyRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const manualSelectionRef = useRef<number | null>(null);
  const uploadDataRef = useRef<{ canvas: HTMLCanvasElement; width: number; height: number } | null>(null);

  const backendId = useMockBackend ? 'dev-mock' : 'onnx-yolov5s';
  const modelId = useMockBackend
    ? 'MOCK (not a real model)'
    : 'yolov5s.onnx (Ultralytics, COCO-80, AGPL-3.0)';

  const getProcessCanvas = useCallback(() => {
    if (!processCanvasRef.current) {
      processCanvasRef.current = document.createElement('canvas');
      processCanvasRef.current.width = 640;
      processCanvasRef.current.height = 480;
    }
    return processCanvasRef.current;
  }, []);

  // ---- Model + hands initialization -------------------------------------
  const initModel = useCallback(async () => {
    setModelStatus({ state: 'loading' });
    setLastError(null);
    try {
      detectorRef.current?.dispose();
      const detector = createDetector(useMockBackend);
      detectorRef.current = detector;
      await detector.init((s) => setModelStatus(s));
      if (!detector.ready) throw new Error('Detector failed to become ready');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setModelStatus({ state: 'error', message, recoverable: true });
      setLastError(message);
    }
  }, [useMockBackend]);

  useEffect(() => {
    void initModel();
    return () => {
      detectorRef.current?.dispose();
      detectorRef.current = null;
    };
  }, [initModel]);

  useEffect(() => {
    if (!settings.handTrackingEnabled) {
      handsRef.current?.dispose();
      handsRef.current = null;
      setHandsReady(false);
      return;
    }
    let cancelled = false;
    const adapter = new HandLandmarkerAdapter();
    handsRef.current = adapter;
    adapter
      .init(() => undefined)
      .then(() => {
        if (!cancelled) setHandsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setHandsReady(false);
          // Hand tracking is optional; object detection still works.
        }
      });
    return () => {
      cancelled = true;
      adapter.dispose();
      if (handsRef.current === adapter) handsRef.current = null;
      setHandsReady(false);
    };
  }, [settings.handTrackingEnabled]);

  // ---- Core inference step ----------------------------------------------
  const runInference = useCallback(
    async (canvas: HTMLCanvasElement, timestampMs: number) => {
      const detector = detectorRef.current;
      if (!detector?.ready || busyRef.current) return;
      const s = settingsRef.current;
      busyRef.current = true;
      setBusy(true);
      try {
        const width = canvas.width;
        const height = canvas.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        const image = ctx.getImageData(0, 0, width, height);

        // Hand landmarks (main thread, same frame).
        let hands = [] as Awaited<ReturnType<HandLandmarkerAdapter['detect']>>;
        if (handsRef.current?.ready && s.handTrackingEnabled) {
          try {
            hands = handsRef.current.detect(canvas, timestampMs, width, height);
          } catch {
            hands = [];
          }
        }

        const result = await detector.detect(image.data, width, height, {
          confThreshold: s.confidenceThreshold,
          iouThreshold: s.nmsIoU,
        });

        const detections: Detection[] = result.detections.map((d) => ({
          classId: d.classId,
          label: d.label,
          score: d.score,
          box: d.box,
          space: 'source' as const,
        }));

        pipelineRef.current.configureTracker({
          smoothing: s.smoothing,
        });
        const frameTracks = pipelineRef.current.step(detections, hands, timestampMs);

        frameCounterRef.current += 1;
        latenciesRef.current.push(result.latencyMs);
        if (latenciesRef.current.length > 30) latenciesRef.current.shift();
        fpsTimesRef.current.push(timestampMs);
        if (fpsTimesRef.current.length > 30) fpsTimesRef.current.shift();

        const frame: FrameResult = {
          frameId: frameCounterRef.current,
          timestamp: timestampMs,
          sourceWidth: width,
          sourceHeight: height,
          tracks: frameTracks,
          hands,
          latencyMs: result.latencyMs,
          backend: detector.id,
        };
        setLastFrame(frame);
        setTracks(frameTracks);
        setFrameSize({ width, height });
        setLatencyMs(
          latenciesRef.current.reduce((a, b) => a + b, 0) / latenciesRef.current.length,
        );
        if (fpsTimesRef.current.length >= 2) {
          const span =
            fpsTimesRef.current[fpsTimesRef.current.length - 1] - fpsTimesRef.current[0];
          setProcessingFps(span > 0 ? ((fpsTimesRef.current.length - 1) * 1000) / span : null);
        }
      } catch (err) {
        // 'superseded' frames are an expected coalescing path — ignore.
        const message = err instanceof Error ? err.message : String(err);
        if (message !== 'superseded') setLastError(message);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [],
  );

  // ---- Camera loop --------------------------------------------------------
  const startCamera = useCallback(async () => {
    setSourceType('camera');
    setUploadPreviewUrl(null);
    uploadDataRef.current = null;
    await camera.start();
  }, [camera]);

  const stopCamera = useCallback(() => {
    camera.stop();
  }, [camera]);

  useEffect(() => {
    if (camera.state !== 'live') return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const video = camera.videoRef.current;
      const detector = detectorRef.current;
      if (!video || !detector?.ready) return;
      if (video.readyState < 2 || video.videoWidth === 0) return;
      const now = performance.now();
      if (now - lastRunAtRef.current < settingsRef.current.minIntervalMs) return;
      lastRunAtRef.current = now;
      videoMetaRef.current = { width: video.videoWidth, height: video.videoHeight };
      // Downscale into the reusable processing canvas.
      const maxSide = settingsRef.current.processingResolution;
      const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
      const canvas = getProcessCanvas();
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      void runInference(canvas, now);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [camera.state, camera.videoRef, runInference, getProcessCanvas]);

  // ---- Upload path --------------------------------------------------------
  const loadImage = useCallback(
    async (file: File) => {
      setSourceType('upload');
      camera.stop();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read the file.'));
        reader.readAsDataURL(file);
      });
      setUploadPreviewUrl(dataUrl);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Could not decode the image.'));
        el.src = dataUrl;
      });
      const maxSide = settingsRef.current.processingResolution;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = uploadCanvasRef.current ?? document.createElement('canvas');
      uploadCanvasRef.current = canvas;
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas unavailable.');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      uploadDataRef.current = { canvas, width: canvas.width, height: canvas.height };
      await runInference(canvas, performance.now());
    },
    [camera, runInference],
  );

  const reanalyze = useCallback(() => {
    const data = uploadDataRef.current;
    if (data) {
      void runInference(data.canvas, performance.now());
      return;
    }
    // Camera live: force an immediate frame on next loop iteration.
    lastRunAtRef.current = 0;
  }, [runInference]);

  // ---- Selection ----------------------------------------------------------
  const selectedTrack = useMemo(() => {
    if (tracks.length === 0) return null;
    const manual = tracks.find((t) => t.id === selectedTrackId);
    if (manual) return manual;
    return selectDefaultTrack(tracks);
  }, [tracks, selectedTrackId]);

  const selectTrack = useCallback((id: number | null) => {
    setSelectedTrackId(id);
    manualSelectionRef.current = id;
  }, []);

  // Drop manual selection when its track disappears.
  useEffect(() => {
    if (selectedTrackId != null && !tracks.some((t) => t.id === selectedTrackId)) {
      setSelectedTrackId(null);
      manualSelectionRef.current = null;
    }
  }, [tracks, selectedTrackId]);

  const grabSnapshotCanvas = useCallback((): HTMLCanvasElement | null => {
    const video = camera.videoRef.current;
    if (video && video.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      return canvas;
    }
    if (uploadDataRef.current) return uploadDataRef.current.canvas;
    return null;
  }, [camera.videoRef]);

  const resetTracker = useCallback(() => {
    pipelineRef.current.reset();
    setTracks([]);
    setSelectedTrackId(null);
  }, []);

  const retryModel = useCallback(() => {
    void initModel();
  }, [initModel]);

  return {
    camera,
    modelStatus,
    modelId,
    backendId,
    tracks,
    lastFrame,
    sourceType,
    selectedTrackId: selectedTrack?.id ?? null,
    selectedTrack,
    selectTrack,
    processingFps,
    latencyMs,
    lastError,
    handsReady,
    startCamera,
    stopCamera,
    loadImage,
    retryModel,
    busy,
    resetTracker,
    reanalyze,
    uploadPreviewUrl,
    frameSize,
    grabSnapshotCanvas,
  };
}
