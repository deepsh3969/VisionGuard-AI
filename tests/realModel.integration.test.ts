import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import jpeg from 'jpeg-js';
import { describe, expect, it } from 'vitest';
import { fetchModel } from '../src/vision/yoloSession';
import { toFloat16Bits } from '../src/vision/yoloSession';
import {
  computeLetterbox,
  inputBoxToSource,
  rasterizeLetterbox,
} from '../src/core/preprocess';
import { postprocessYolo } from '../src/core/yolo';
import { COCO_CLASSES, DEFAULT_MODEL_URL } from '../src/core/coco';

/**
 * REAL-MODEL INTEGRATION TEST.
 * Downloads the official Ultralytics YOLOv5s ONNX export and a sample photo
 * (bus.jpg from the YOLOv5 repository), runs genuine ONNX Runtime Web
 * inference in Node, and asserts real detections (bus / person).
 * Test fixtures are cached in tests/fixtures/ and are gitignored.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, 'fixtures');
const modelPath = path.join(fixtures, 'yolov5s.onnx');
const imagePath = path.join(fixtures, 'bus.jpg');
const MODEL_URL = DEFAULT_MODEL_URL;
const IMAGE_URL =
  'https://github.com/ultralytics/yolov5/raw/master/data/images/bus.jpg';

function wasmDir(): string {
  return path.join(here, '..', 'node_modules', 'onnxruntime-web', 'dist') + path.sep;
}

async function ensureFile(url: string, dest: string): Promise<void> {
  if (existsSync(dest) && readFileSync(dest).byteLength > 1000) return;
  mkdirSync(fixtures, { recursive: true });
  const buf = await fetchModel(url, () => undefined);
  writeFileSync(dest, Buffer.from(buf));
}

describe('real YOLOv5s ONNX inference (integration)', () => {
  it(
    'detects a bus and people in the official sample photo',
    async () => {
      await ensureFile(MODEL_URL, modelPath);
      await ensureFile(IMAGE_URL, imagePath);

      const { InferenceSession, Tensor, env } = await import('onnxruntime-web');
      env.wasm.wasmPaths = wasmDir();
      env.wasm.numThreads = 1;
      const bytes = readFileSync(modelPath);
      const ortSession = await InferenceSession.create(bytes, {
        executionProviders: ['wasm'],
      });
      expect(ortSession.inputNames.length).toBeGreaterThan(0);
      expect(ortSession.outputNames.length).toBeGreaterThan(0);

      const jpegData = readFileSync(imagePath);
      const decoded = jpeg.decode(jpegData, { useTArray: true });
      const width = decoded.width;
      const height = decoded.height;
      const data = new Uint8ClampedArray(decoded.data.buffer, decoded.data.byteOffset, decoded.data.length);
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);

      const transform = computeLetterbox(width, height, 640);
      const chw = rasterizeLetterbox(data, width, height, transform);
      const dims = [1, 3, 640, 640];
      const inputName = ortSession.inputNames[0];

      // The Ultralytics v7.0 release export uses fp16 inputs; fall back
      // automatically if the float32 feed is rejected.
      let output;
      try {
        output = (
          await ortSession.run({ [inputName]: new Tensor('float32', chw, dims) })
        )[ortSession.outputNames[0]];
      } catch (err) {
        if (!/float16/i.test(err instanceof Error ? err.message : String(err))) throw err;
        output = (
          await ortSession.run({
            [inputName]: new Tensor('float16', toFloat16Bits(chw), dims),
          })
        )[ortSession.outputNames[0]];
      }
      const shape = output.dims.map(Number);
      expect(shape[0]).toBe(1);
      expect(shape[2]).toBe(85); // 4 box + objectness + 80 COCO classes

      const outData =
        output.data instanceof Float32Array
          ? output.data
          : Float32Array.from(output.data as ArrayLike<number>);
      const detections = postprocessYolo(outData, shape, 0.35, 0.45).map((d) => ({
        ...d,
        label: COCO_CLASSES[d.classId] ?? 'unknown',
        sourceBox: inputBoxToSource(d.box, transform),
      }));

      const labels = new Set(detections.map((d) => d.label));
      // The sample photo shows a bus with people standing in front of it.
      expect(
        labels.has('bus') || labels.has('person'),
        `Expected bus or person in detections; got: ${[...labels].join(', ') || '(none)'}`,
      ).toBe(true);

      // Sanity: boxes map back into the source frame.
      for (const d of detections) {
        expect(Number.isFinite(d.sourceBox.x)).toBe(true);
        expect(d.score).toBeGreaterThan(0.35);
      }

      ortSession.release();
    },
    300_000,
  );
});
