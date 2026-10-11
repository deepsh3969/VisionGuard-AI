import type { BoundingBox } from '../types';

/** Result of letterboxing a source frame into the model input size. */
export interface LetterboxTransform {
  /** Input tensor size (square). */
  inputSize: number;
  /** Scale applied to source pixels (same for x and y). */
  scale: number;
  /** Padding added on the left/top of the input image. */
  padX: number;
  padY: number;
  sourceWidth: number;
  sourceHeight: number;
}

/** Compute the letterbox transform for a source frame. */
export function computeLetterbox(
  sourceWidth: number,
  sourceHeight: number,
  inputSize: number,
): LetterboxTransform {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error(`Invalid source size ${sourceWidth}×${sourceHeight}`);
  }
  const scale = Math.min(inputSize / sourceWidth, inputSize / sourceHeight);
  const padX = (inputSize - sourceWidth * scale) / 2;
  const padY = (inputSize - sourceHeight * scale) / 2;
  return { inputSize, scale, padX, padY, sourceWidth, sourceHeight };
}

/**
 * Map a box from model-input coordinates back to source-frame coordinates,
 * removing letterbox padding and reversing the scale.
 */
export function inputBoxToSource(box: BoundingBox, t: LetterboxTransform): BoundingBox {
  return {
    x: (box.x - t.padX) / t.scale,
    y: (box.y - t.padY) / t.scale,
    width: box.width / t.scale,
    height: box.height / t.scale,
  };
}

/** Map a box from source coordinates into model-input coordinates. */
export function sourceBoxToInput(box: BoundingBox, t: LetterboxTransform): BoundingBox {
  return {
    x: box.x * t.scale + t.padX,
    y: box.y * t.scale + t.padY,
    width: box.width * t.scale,
    height: box.height * t.scale,
  };
}

/**
 * Rasterize RGBA pixels into a letterboxed RGB float32 tensor (NCHW, 0..1).
 * Returns a Float32Array of length 3*inputSize*inputSize with layout
 * [R plane][G plane][B plane] as expected by the exported YOLOv5 ONNX graph.
 * Fill color is neutral gray (114), the standard YOLO letterbox color.
 */
export function rasterizeLetterbox(
  rgba: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  t: LetterboxTransform,
): Float32Array {
  const n = t.inputSize;
  const out = new Float32Array(3 * n * n);
  out.fill(114 / 255);

  const plane = n * n;
  // Source pixel (sx, sy) maps to input pixel (sx*scale+padX, sy*scale+padY).
  // Iterate over destination rows for a simple forward mapping.
  const scaledW = Math.round(sourceWidth * t.scale);
  const scaledH = Math.round(sourceHeight * t.scale);
  const x0 = Math.round(t.padX);
  const y0 = Math.round(t.padY);

  for (let dy = 0; dy < scaledH; dy++) {
    const sy = Math.min(sourceHeight - 1, Math.floor(dy / t.scale));
    const dstRow = y0 + dy;
    if (dstRow < 0 || dstRow >= n) continue;
    for (let dx = 0; dx < scaledW; dx++) {
      const sx = Math.min(sourceWidth - 1, Math.floor(dx / t.scale));
      const dstCol = x0 + dx;
      if (dstCol < 0 || dstCol >= n) continue;
      const srcIdx = (sy * sourceWidth + sx) * 4;
      const dstIdx = dstRow * n + dstCol;
      out[dstIdx] = rgba[srcIdx] / 255;
      out[plane + dstIdx] = rgba[srcIdx + 1] / 255;
      out[2 * plane + dstIdx] = rgba[srcIdx + 2] / 255;
    }
  }
  return out;
}
