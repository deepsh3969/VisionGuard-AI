import { describe, expect, it } from 'vitest';
import { cameraErrorMessage } from '../src/hooks/useCamera';
import { validateImageFile, ApiError, postJson } from '../src/api/client';
import { computeDisplayRect } from '../src/components/CameraViewport';

describe('camera permission error mapping', () => {
  it('maps NotAllowedError to a helpful message', () => {
    const msg = cameraErrorMessage(new DOMException('denied', 'NotAllowedError'));
    expect(msg).toMatch(/permission/i);
  });

  it('maps NotFoundError', () => {
    expect(cameraErrorMessage(new DOMException('x', 'NotFoundError'))).toMatch(/no camera/i);
  });

  it('maps NotReadableError to an in-use message', () => {
    expect(cameraErrorMessage(new DOMException('x', 'NotReadableError'))).toMatch(/in use/i);
  });

  it('maps SecurityError to an HTTPS hint', () => {
    expect(cameraErrorMessage(new DOMException('x', 'SecurityError'))).toMatch(/https/i);
  });

  it('falls back to the error message', () => {
    expect(cameraErrorMessage(new Error('boom'))).toBe('boom');
    expect(cameraErrorMessage('weird')).toBe('Could not start the camera.');
  });
});

describe('upload validation', () => {
  it('accepts jpeg/png/webp under the size limit', () => {
    const file = new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(file)).toBeNull();
  });

  it('rejects unsupported types', () => {
    const file = new File([new Uint8Array(10)], 'a.gif', { type: 'image/gif' });
    expect(validateImageFile(file)).toMatch(/unsupported/i);
  });

  it('rejects oversized files', () => {
    const big = new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    expect(validateImageFile(big)).toMatch(/too large/i);
  });
});

describe('api client', () => {
  it('normalizes HTTP errors', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: 'nope' }), { status: 400 })) as typeof fetch;
    try {
      await expect(postJson('/api/x', {})).rejects.toThrow(/nope/);
      await expect(postJson('/api/x', {})).rejects.toBeInstanceOf(ApiError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('display rect mapping (overlay alignment)', () => {
  it('letterboxes a 16:9 frame inside a square container', () => {
    const d = computeDisplayRect(1920, 1080, 800, 800);
    expect(d.width).toBeCloseTo(800);
    expect(d.height).toBeCloseTo(450);
    expect(d.offsetY).toBeCloseTo(175);
    expect(d.offsetX).toBeCloseTo(0);
  });

  it('centers a 4:3 frame in a wider container', () => {
    const d = computeDisplayRect(800, 600, 1000, 600);
    expect(d.height).toBeCloseTo(600);
    expect(d.width).toBeCloseTo(800);
    expect(d.offsetX).toBeCloseTo(100);
    expect(d.offsetY).toBeCloseTo(0);
  });

  it('handles degenerate inputs safely', () => {
    const d = computeDisplayRect(0, 0, 100, 100);
    expect(d.scale).toBe(1);
  });
});
