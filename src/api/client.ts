/** Small fetch helper with timeout + normalized errors. */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function postJson<T>(
  url: string,
  body: unknown,
  timeoutMs = 30_000,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new ApiError(`Request timed out after ${Math.round(timeoutMs / 1000)}s.`, 408);
    }
    throw new ApiError(err instanceof Error ? err.message : 'Network request failed.', 0);
  }
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const msg = data && typeof data.error === 'string' ? data.error : `HTTP ${response.status}`;
    throw new ApiError(msg, response.status);
  }
  return data as T;
}

/** Validate an uploaded image file. Returns a human-readable error or null. */
export function validateImageFile(file: File): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return 'Unsupported file type. Please use JPEG, PNG or WebP.';
  }
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`;
  }
  return null;
}
