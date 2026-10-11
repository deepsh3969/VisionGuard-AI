import type { DescriptionResult, ProviderStatus } from '../types';
import type { DescribeRequest, DescriptionProvider } from './provider.types';

/**
 * Remote vision-language provider.
 *
 * Sends the cropped object image to the app's serverless endpoint
 * (`/api/describe`), which holds the API key on the server — never in the
 * browser bundle. When the endpoint or key is unavailable the provider
 * reports an explicit error; the UI falls back to templates and labels the
 * result. It never fabricates a response.
 */
export class RemoteVlmProvider implements DescriptionProvider {
  readonly id = 'remote-vlm' as const;
  readonly name = 'Vision-language model (external API)';
  private status: ProviderStatus = 'unavailable';
  private lastError: string | null = null;

  isAvailable(): boolean {
    return this.status === 'ready';
  }

  getStatus(): ProviderStatus {
    return this.status;
  }

  getError(): string | null {
    return this.lastError;
  }

  /** Probe the endpoint once so the UI can show availability up-front. */
  async refreshAvailability(): Promise<ProviderStatus> {
    try {
      const res = await fetch('/api/describe', { method: 'OPTIONS' });
      if (res.ok) {
        const body = (await res.json()) as { configured?: boolean };
        this.status = body.configured ? 'ready' : 'unavailable';
        this.lastError = body.configured ? null : 'No vision API key is configured on the server.';
      } else {
        this.status = 'unavailable';
        this.lastError = `Endpoint returned HTTP ${res.status}.`;
      }
    } catch (err) {
      this.status = 'unavailable';
      this.lastError = err instanceof Error ? err.message : String(err);
    }
    return this.status;
  }

  async describe(request: DescribeRequest): Promise<DescriptionResult> {
    if (!request.imageDataUrl) {
      this.status = 'error';
      this.lastError = 'An image crop is required for visual analysis.';
      throw new Error(this.lastError);
    }
    this.status = 'loading';
    try {
      const res = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          image: request.imageDataUrl,
          labelHint: request.label,
          mode: request.mode,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Vision API request failed (HTTP ${res.status}).`);
      }
      const body = (await res.json()) as { text: string; provider: string };
      this.status = 'ready';
      this.lastError = null;
      return {
        text: body.text,
        mode: request.mode,
        provider: 'remote-vlm',
        providerStatus: 'ready',
        transmittedExternally: true,
        generatedAt: Date.now(),
      };
    } catch (err) {
      this.status = 'error';
      this.lastError = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }
}
