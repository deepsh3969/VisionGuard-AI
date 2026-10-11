import { describe, expect, it } from 'vitest';
import { COCO_CLASSES } from '../src/core/coco';
import { TEMPLATES, templateFor } from '../src/describe/templates';

/** Words that grounded templates must never claim. */
const FORBIDDEN = [
  /apple inc/i,
  /iphone/i,
  /samsung/i,
  /coca-?cola/i,
  /starbucks/i,
  /\bnike\b/i,
  /\bboeing\b/i,
  /model number/i,
  /guaranteed/i,
  /certified/i,
  /cures/i,
  /medical device/i,
  /contains .{0,20}(pills|medicine|drug)/i,
];

describe('COCO description templates', () => {
  it('covers every COCO class', () => {
    for (const label of COCO_CLASSES) {
      expect(TEMPLATES[label], `missing template for "${label}"`).toBeTruthy();
    }
  });

  it('has no extra templates outside the COCO vocabulary', () => {
    for (const key of Object.keys(TEMPLATES)) {
      expect(COCO_CLASSES).toContain(key);
    }
  });

  it('every entry has all required grounded sections', () => {
    for (const [label, entry] of Object.entries(TEMPLATES)) {
      expect(entry.short.length, label).toBeGreaterThan(10);
      expect(entry.purpose.length, label).toBeGreaterThan(5);
      expect(entry.applications.length, label).toBeGreaterThan(5);
      expect(entry.visual.length, label).toBeGreaterThan(10);
      expect(entry.handling.length, label).toBeGreaterThan(5);
      expect(entry.facts.length, label).toBeGreaterThan(0);
      expect(['basic', 'moderate', 'rich']).toContain(entry.detailLevel);
    }
  });

  it('avoids brands, certifications and unsupported claims', () => {
    const allText = Object.entries(TEMPLATES)
      .map(([label, e]) => [label, JSON.stringify(e)] as const);
    for (const [label, text] of allText) {
      for (const pattern of FORBIDDEN) {
        expect(pattern.test(text), `${label} matched ${pattern}`).toBe(false);
      }
    }
  });

  it('templateFor returns null for unknown labels', () => {
    expect(templateFor('spaceship')).toBeNull();
    expect(templateFor('cup')).not.toBeNull();
  });
});
