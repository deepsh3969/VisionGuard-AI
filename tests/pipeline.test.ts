import { describe, expect, it } from 'vitest';
import { FramePipeline } from '../src/core/pipeline';
import { selectDefaultTrack, shouldRetainManualSelection, associationLabel } from '../src/core/candidate';
import type { Detection, HandDetection } from '../src/types';

/** MOCK DETECTIONS — unit-test fixtures only, not real model output. */
function det(x: number, y: number, cls = 41, score = 0.9): Detection {
  return {
    classId: cls,
    label: `class-${cls}`,
    score,
    box: { x, y, width: 100, height: 100 },
    space: 'source',
  };
}

function handAt(cx: number, cy: number, index = 0): HandDetection {
  return {
    index,
    landmarks: Array.from({ length: 21 }, () => ({ x: cx, y: cy, z: 0 })),
    box: { x: cx - 40, y: cy - 40, width: 80, height: 80 },
    handedness: 'Right',
    score: 0.9,
  };
}

describe('FramePipeline integration (mock detections)', () => {
  it('tracks detections and attaches association after stabilization window', () => {
    const pipeline = new FramePipeline({ associationWindow: 3 });
    const box = det(250, 250);
    const hand = handAt(300, 300);
    let tracks = pipeline.step([box], [hand], 0);
    expect(tracks).toHaveLength(1);
    // First frames report uncertain until the window fills.
    expect(tracks[0].association?.state).toBe('uncertain');
    tracks = pipeline.step([box], [hand], 100);
    tracks = pipeline.step([box], [hand], 200);
    expect(tracks[0].association?.state).toBe('held');
  });

  it('keeps a stable track id while the object moves slightly', () => {
    const pipeline = new FramePipeline();
    const [a] = pipeline.step([det(100, 100)], [], 0);
    const [b] = pipeline.step([det(110, 104)], [], 120);
    expect(b.id).toBe(a.id);
  });

  it('reset clears state', () => {
    const pipeline = new FramePipeline();
    pipeline.step([det(0, 0)], [], 0);
    pipeline.reset();
    expect(pipeline.step([], [], 100)).toHaveLength(0);
  });
});

describe('candidate selection', () => {
  it('prefers held tracks over mere detections', () => {
    const tracks = [
      {
        ...det(0, 0),
        id: 1,
        label: 'cup',
        lastSeen: 0,
        hits: 2,
        association: null,
        confidence: 0.9,
        box: det(0, 0).box,
      },
      {
        ...det(500, 500),
        id: 2,
        label: 'book',
        lastSeen: 0,
        hits: 2,
        association: {
          trackId: 2,
          handIndex: 0,
          state: 'held' as const,
          score: 0.8,
          signals: { boxOverlap: 0.7, palmDistance: 0.8, fingertipDistance: 0.9 },
        },
        confidence: 0.7,
        box: det(500, 500).box,
      },
    ];
    const selected = selectDefaultTrack(tracks);
    expect(selected?.id).toBe(2);
  });

  it('returns null when there are no tracks', () => {
    expect(selectDefaultTrack([])).toBeNull();
  });

  it('retains manual selection while the track is alive', () => {
    const tracks = [{ ...det(0, 0), id: 7, label: 'x', lastSeen: 0, hits: 1, association: null, confidence: 0.5, box: det(0, 0).box }];
    expect(shouldRetainManualSelection(7, tracks)).toBe(true);
    expect(shouldRetainManualSelection(8, tracks)).toBe(false);
  });

  it('labels association states for the UI', () => {
    expect(associationLabel('held')).toBe('Likely held');
    expect(associationLabel('uncertain')).toBe('Association uncertain');
    expect(associationLabel('no-hand')).toBe('No hand visible');
  });
});
