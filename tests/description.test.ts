import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplateProvider } from '../src/describe/templateProvider';
import { RemoteVlmProvider } from '../src/describe/remoteProvider';

describe('TemplateProvider', () => {
  const provider = new TemplateProvider();

  it('is always available', () => {
    expect(provider.isAvailable()).toBe(true);
  });

  it('returns a quick summary for a known class', async () => {
    const result = await provider.describe({ label: 'cup', mode: 'quick' });
    expect(result.provider).toBe('template');
    expect(result.transmittedExternally).toBe(false);
    expect(result.text.toLowerCase()).toContain('cup');
    expect(result.text.length).toBeGreaterThan(20);
    // Quick mode stays short (single paragraph).
    expect(result.text.split('\n').length).toBeLessThanOrEqual(2);
  });

  it('includes purpose and handling in detailed mode', async () => {
    const result = await provider.describe({ label: 'laptop', mode: 'detailed' });
    expect(result.text).toContain('Purpose:');
    expect(result.text).toContain('Handling:');
  });

  it('adds facts and a grounding disclaimer in educational mode', async () => {
    const result = await provider.describe({ label: 'scissors', mode: 'educational' });
    expect(result.text).toContain('Learn more:');
    expect(result.text).toContain('not a verified identification');
  });

  it('never invents a description for unknown classes', async () => {
    const result = await provider.describe({ label: 'quantum flux capacitor', mode: 'detailed' });
    expect(result.text).toContain('not in the supported');
    expect(result.text).toContain('will not invent');
  });
});

describe('RemoteVlmProvider', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires an image crop', async () => {
    const provider = new RemoteVlmProvider();
    await expect(provider.describe({ label: 'cup', mode: 'quick' })).rejects.toThrow(/crop/i);
    expect(provider.getStatus()).toBe('error');
  });

  it('returns remote results and flags external transmission', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ text: 'A ceramic mug.', provider: 'test' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    const provider = new RemoteVlmProvider();
    const result = await provider.describe({
      label: 'cup',
      mode: 'quick',
      imageDataUrl: 'data:image/jpeg;base64,AAAA',
    });
    expect(result.provider).toBe('remote-vlm');
    expect(result.transmittedExternally).toBe(true);
    expect(result.text).toContain('mug');
  });

  it('surfaces API errors without fabricating text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'quota exceeded' }), { status: 429 })),
    );
    const provider = new RemoteVlmProvider();
    await expect(
      provider.describe({ label: 'cup', mode: 'quick', imageDataUrl: 'data:image/jpeg;base64,AAAA' }),
    ).rejects.toThrow(/quota/);
    expect(provider.getStatus()).toBe('error');
  });

  it('refreshAvailability reflects server configuration', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ configured: false }), { status: 200 })),
    );
    const provider = new RemoteVlmProvider();
    const status = await provider.refreshAvailability();
    expect(status).toBe('unavailable');
    expect(provider.isAvailable()).toBe(false);
  });
});
