import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraState = 'idle' | 'starting' | 'live' | 'error';

export interface CameraController {
  state: CameraState;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  devices: MediaDeviceInfo[];
  activeDeviceId: string | null;
  facingMode: 'user' | 'environment';
  start: (deviceId?: string) => Promise<void>;
  stop: () => void;
  switchCamera: () => Promise<void>;
  /** True while a stream is attached to the video element. */
  isLive: boolean;
}

export function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : (err as { name?: string })?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera permission was denied. Allow camera access in your browser settings and try again.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found on this device.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The camera is already in use by another application.';
    case 'OverconstrainedError':
      return 'The selected camera does not support the requested settings.';
    case 'SecurityError':
      return 'Camera access is blocked in this context (HTTPS or localhost required).';
    default:
      return err instanceof Error ? err.message : 'Could not start the camera.';
  }
}

/**
 * Camera lifecycle: explicit permission, visible state, guaranteed cleanup.
 */
export function useCamera(): CameraController {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isLive, setIsLive] = useState(false);

  const stop = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsLive(false);
    setState('idle');
  }, []);

  const start = useCallback(
    async (deviceId?: string) => {
      setError(null);
      setState('starting');
      // Stop any previous stream first.
      const prev = streamRef.current;
      if (prev) {
        for (const track of prev.getTracks()) track.stop();
        streamRef.current = null;
      }
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new DOMException('Camera API unavailable', 'NotFoundError');
        }
        const constraints: MediaStreamConstraints = deviceId
          ? { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }
          : { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          await video.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings?.() ?? {};
        setActiveDeviceId(settings.deviceId ?? deviceId ?? null);
        if (!deviceId) setFacingMode(settings.facingMode === 'user' ? 'user' : facingMode);
        setIsLive(true);
        setState('live');
        try {
          const list = await navigator.mediaDevices.enumerateDevices();
          setDevices(list.filter((d) => d.kind === 'videoinput'));
        } catch {
          setDevices([]);
        }
      } catch (err) {
        setError(cameraErrorMessage(err));
        setState('error');
        setIsLive(false);
      }
    },
    [facingMode],
  );

  const switchCamera = useCallback(async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    // Save desired facing before awaiting (start reads state via closure).
    await startFacing(nextFacing);
    async function startFacing(mode: 'user' | 'environment') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const prev = streamRef.current;
        if (prev) for (const t of prev.getTracks()) t.stop();
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setIsLive(true);
        setState('live');
        setError(null);
      } catch (err) {
        setError(cameraErrorMessage(err));
        setState('error');
      }
    }
  }, [facingMode]);

  useEffect(() => stop, [stop]);

  return {
    state,
    error,
    videoRef,
    devices,
    activeDeviceId,
    facingMode,
    start,
    stop,
    switchCamera,
    isLive,
  };
}
