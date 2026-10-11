import { describe, expect, it } from 'vitest';
import {
  computeLetterbox,
  inputBoxToSource,
  rasterizeLetterbox,
  sourceBoxToInput,
} from '../src/core/preprocess';

function makeRgba(w: number, h: number, rgb: [number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = rgb[0];
    data[i * 4 + 1] = rgb[1];
    data[i * 4 + 2] = rgb[2];
    data[i * 4 + 3] = 255;
  }
  return data;
}

describe('letterbox preprocessing', () => {
  it('computes scale and padding for landscape frames', () => {
    const t = computeLetterbox(1280, 720, 640);
    expect(t.scale).toBeCloseTo(0.5, 6);
    expect(t.padX).toBeCloseTo(0, 6);
    expect(t.padY).toBeCloseTo((640 - 360) / 2, 6);
  });

  it('computes scale and padding for portrait frames', () => {
    const t = computeLetterbox(720, 1280, 640);
    expect(t.scale).toBeCloseTo(0.5, 6);
    expect(t.padX).toBeCloseTo((640 - 360) / 2, 6);
    expect(t.padY).toBeCloseTo(0, 6);
  });

  it('rejects invalid sizes', () => {
    expect(() => computeLetterbox(0, 100, 640)).toThrow();
  });

  it('round-trips boxes through input↔source coordinates', () => {
    const t = computeLetterbox(1280, 720, 640);
    const source = { x: 100, y: 200, width: 300, height: 150 };
    const input = sourceBoxToInput(source, t);
    const back = inputBoxToSource(input, t);
    expect(back.x).toBeCloseTo(source.x, 6);
    expect(back.y).toBeCloseTo(source.y, 6);
    expect(back.width).toBeCloseTo(source.width, 6);
    expect(back.height).toBeCloseTo(source.height, 6);
  });

  it('maps a known input box back to source coordinates', () => {
    // 1280x720 → scale 0.5, padY 140.
    const t = computeLetterbox(1280, 720, 640);
    const inputBox = { x: 100, y: 240, width: 50, height: 50 };
    const source = inputBoxToSource(inputBox, t);
    expect(source.x).toBeCloseTo((100 - 0) / 0.5);
    expect(source.y).toBeCloseTo((240 - 140) / 0.5);
    expect(source.width).toBeCloseTo(100);
    expect(source.height).toBeCloseTo(100);
  });

  it('rasterizes a solid-color frame into the RGB planes', () => {
    const w = 8;
    const h = 4;
    const t = computeLetterbox(w, h, 16);
    const rgba = makeRgba(w, h, [255, 0, 0]);
    const tensor = rasterizeLetterbox(rgba, w, h, t);
    expect(tensor.length).toBe(3 * 16 * 16);
    // Center of the letterboxed image should be red (R=1, G=0, B=0).
    const cx = 8;
    const cy = 8;
    const plane = 256;
    expect(tensor[cy * 16 + cx]).toBeCloseTo(1, 5);
    expect(tensor[plane + cy * 16 + cx]).toBeCloseTo(0, 5);
    expect(tensor[2 * plane + cy * 16 + cx]).toBeCloseTo(0, 5);
    // Padding area stays at gray 114/255.
    expect(tensor[0]).toBeCloseTo(114 / 255, 5);
  });
});
