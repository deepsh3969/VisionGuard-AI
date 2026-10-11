import { useCallback, useEffect, useRef } from 'react';
import type { HandDetection, Track } from '../types';

export interface ViewportMedia {
  /** Intrinsic frame dimensions the boxes are expressed in. */
  frameWidth: number;
  frameHeight: number;
}

interface CameraViewportProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  uploadPreviewUrl: string | null;
  sourceType: 'camera' | 'upload';
  tracks: Track[];
  hands: HandDetection[];
  selectedTrackId: number | null;
  onSelectTrack: (id: number) => void;
  frame: ViewportMedia | null;
  showLandmarks: boolean;
  interactive: boolean;
  placeholder: React.ReactNode;
  statusOverlay?: React.ReactNode;
  onPointerDown?: (e: React.MouseEvent) => void;
}

const ASSOCIATION_COLORS: Record<string, string> = {
  held: '#34d399',
  uncertain: '#fbbf24',
  'not-held': '#7f93b5',
  'no-hand': '#7f93b5',
};

/** Map frame coordinates → displayed pixels for object-fit: contain. */
export function computeDisplayRect(
  frameW: number,
  frameH: number,
  containerW: number,
  containerH: number,
): { offsetX: number; offsetY: number; width: number; height: number; scale: number } {
  if (frameW <= 0 || frameH <= 0 || containerW <= 0 || containerH <= 0) {
    return { offsetX: 0, offsetY: 0, width: containerW, height: containerH, scale: 1 };
  }
  const scale = Math.min(containerW / frameW, containerH / frameH);
  const width = frameW * scale;
  const height = frameH * scale;
  return {
    offsetX: (containerW - width) / 2,
    offsetY: (containerH - height) / 2,
    width,
    height,
    scale,
  };
}

const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export function CameraViewport({
  videoRef,
  uploadPreviewUrl,
  sourceType,
  tracks,
  hands,
  selectedTrackId,
  onSelectTrack,
  frame,
  showLandmarks,
  interactive,
  placeholder,
  statusOverlay,
  onPointerDown,
}: CameraViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    if (!frame || frame.frameWidth <= 0) return;
    const disp = computeDisplayRect(frame.frameWidth, frame.frameHeight, cssW, cssH);

    // Hands
    if (showLandmarks) {
      for (const hand of hands) {
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.85)';
        ctx.fillStyle = 'rgba(167, 139, 250, 0.95)';
        ctx.lineWidth = 1.5;
        for (const [a, b] of HAND_CONNECTIONS) {
          const pa = hand.landmarks[a];
          const pb = hand.landmarks[b];
          if (!pa || !pb) continue;
          ctx.beginPath();
          ctx.moveTo(pa.x * disp.scale + disp.offsetX, pa.y * disp.scale + disp.offsetY);
          ctx.lineTo(pb.x * disp.scale + disp.offsetX, pb.y * disp.scale + disp.offsetY);
          ctx.stroke();
        }
        for (const p of hand.landmarks) {
          ctx.beginPath();
          ctx.arc(p.x * disp.scale + disp.offsetX, p.y * disp.scale + disp.offsetY, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.font = '600 11px system-ui';
        ctx.fillStyle = 'rgba(167, 139, 250, 0.95)';
        ctx.fillText(
          `${hand.handedness} hand`,
          hand.box.x * disp.scale + disp.offsetX,
          Math.max(12, hand.box.y * disp.scale + disp.offsetY - 6),
        );
      }
    }

    // Tracks
    for (const track of tracks) {
      const selected = track.id === selectedTrackId;
      const assoc = track.association?.state ?? 'no-hand';
      const color = ASSOCIATION_COLORS[assoc] ?? '#7f93b5';
      const x = track.box.x * disp.scale + disp.offsetX;
      const y = track.box.y * disp.scale + disp.offsetY;
      const w = track.box.width * disp.scale;
      const h = track.box.height * disp.scale;
      ctx.lineWidth = selected ? 3 : 2;
      ctx.strokeStyle = color;
      ctx.setLineDash(assoc === 'uncertain' ? [6, 4] : []);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      if (selected) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
        ctx.fillRect(x, y, w, h);
      }
      const label = `${track.label} ${(track.confidence * 100).toFixed(0)}%${assoc === 'held' ? ' · held' : assoc === 'uncertain' ? ' · ?' : ''}`;
      ctx.font = selected ? '700 12px system-ui' : '600 11px system-ui';
      const metrics = ctx.measureText(label);
      const pad = 4;
      const labelH = 16;
      const labelY = y >= labelH + 4 ? y - labelH : y;
      ctx.fillStyle = 'rgba(5, 10, 20, 0.78)';
      ctx.fillRect(x, labelY, metrics.width + pad * 2, labelH);
      ctx.fillStyle = color;
      ctx.fillText(label, x + pad, labelY + 12);
    }
  }, [frame, tracks, hands, selectedTrackId, showLandmarks]);

  useEffect(() => {
    draw();
    const observer = new ResizeObserver(() => draw());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [draw]);

  // Redraw on each React commit (tracks change frequently while live).
  useEffect(() => {
    draw();
  });

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !frame) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const disp = computeDisplayRect(frame.frameWidth, frame.frameHeight, rect.width, rect.height);
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Pick the smallest box containing the click (most specific).
    let best: Track | null = null;
    let bestArea = Infinity;
    for (const t of tracks) {
      const x = t.box.x * disp.scale + disp.offsetX;
      const y = t.box.y * disp.scale + disp.offsetY;
      const w = t.box.width * disp.scale;
      const h = t.box.height * disp.scale;
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
        const area = w * h;
        if (area < bestArea) {
          best = t;
          bestArea = area;
        }
      }
    }
    if (best) onSelectTrack(best.id);
  };

  return (
    <div className="viewport-wrap" ref={containerRef} onClick={handleClick} onMouseDown={onPointerDown}>
      {sourceType === 'camera' ? (
        <video ref={videoRef} playsInline muted autoPlay aria-label="Camera preview" />
      ) : uploadPreviewUrl ? (
        <img className="upload-preview" src={uploadPreviewUrl} alt="Uploaded object" />
      ) : (
        placeholder
      )}
      {statusOverlay ? <div className="viewport-status">{statusOverlay}</div> : null}
      <div className={`viewport-overlay${interactive && tracks.length > 0 ? ' interactive' : ''}`}>
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
    </div>
  );
}
