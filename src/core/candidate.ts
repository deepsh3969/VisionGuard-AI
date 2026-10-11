import type { AssociationState, Track } from '../types';

/**
 * Candidate selection: choose which track the UI should explain by default.
 *
 * Priority:
 *  1. Tracks with a temporally-stable "held" association (highest confidence first)
 *  2. Tracks with "uncertain" association
 * 3. Largest remaining high-confidence track
 * A manual user selection always overrides this logic (see useScanner).
 */

const STATE_RANK: Record<AssociationState, number> = {
  held: 3,
  uncertain: 2,
  'not-held': 1,
  'no-hand': 0,
};

export function selectDefaultTrack(tracks: Track[]): Track | null {
  if (tracks.length === 0) return null;
  const ranked = [...tracks].sort((a, b) => {
    const sa = STATE_RANK[a.association?.state ?? 'no-hand'];
    const sb = STATE_RANK[b.association?.state ?? 'no-hand'];
    if (sa !== sb) return sb - sa;
    const ha = a.association?.state === 'held' ? a.association.score : 0;
    const hb = b.association?.state === 'held' ? b.association.score : 0;
    if (ha !== hb) return hb - ha;
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    return b.box.width * b.box.height - a.box.width * a.box.height;
  });
  return ranked[0];
}

/**
 * Whether the current auto-selection differs from what the user last chose.
 * Used to decide when to auto-switch the explained object.
 */
export function shouldRetainManualSelection(
  manualTrackId: number | null,
  tracks: Track[],
): boolean {
  if (manualTrackId == null) return false;
  return tracks.some((t) => t.id === manualTrackId);
}

/** Short human label for an association state. */
export function associationLabel(state: AssociationState | undefined): string {
  switch (state) {
    case 'held':
      return 'Likely held';
    case 'uncertain':
      return 'Association uncertain';
    case 'not-held':
      return 'Not held';
    case 'no-hand':
      return 'No hand visible';
    default:
      return '—';
  }
}
