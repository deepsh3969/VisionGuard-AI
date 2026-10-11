import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Serverless vision-description proxy.
 *
 * Keeps the vision-language API key on the server (never in the browser
 * bundle). Accepts a cropped object image (JPEG/PNG data URL) plus a label
 * hint from the detector and returns a grounded description.
 *
 * Deploy: Vercel Node function. Locally: `vercel dev` (requires VISION_API_KEY).
 */

type Req = IncomingMessage & {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[]>;
};

const MAX_IMAGE_BYTES = 2_000_000; // base64 characters ≈ bytes budget
const ALLOWED_DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req: Req, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    json(res, 200, { configured: Boolean(process.env.VISION_API_KEY) });
    return;
  }
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed. Use POST.' });
    return;
  }

  const apiKey = process.env.VISION_API_KEY;
  if (!apiKey) {
    json(res, 503, {
      error: 'Vision API is not configured on the server (VISION_API_KEY missing).',
    });
    return;
  }

  const body = req.body as { image?: unknown; labelHint?: unknown; mode?: unknown } | null;
  if (!body || typeof body !== 'object') {
    json(res, 400, { error: 'Missing JSON body.' });
    return;
  }
  const { image, labelHint, mode } = body;
  if (typeof image !== 'string' || !ALLOWED_DATA_URL.test(image)) {
    json(res, 400, { error: 'image must be a jpeg/png/webp base64 data URL.' });
    return;
  }
  if (image.length > MAX_IMAGE_BYTES) {
    json(res, 413, { error: 'Image too large. Crop smaller or lower resolution.' });
    return;
  }
  const hint = typeof labelHint === 'string' ? labelHint.slice(0, 80) : '';
  const depth =
    mode === 'educational' ? 'an educational, beginner-friendly level' : mode === 'detailed' ? 'a detailed level' : 'a concise level';

  const base = (process.env.VISION_API_BASE ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.VISION_API_MODEL ?? 'gpt-4o-mini';

  const systemPrompt =
    'You are VisionGuard AI, a visual assistant. Describe ONLY what is visible in ' +
    'the provided image crop of a detected everyday object. The detector guessed the ' +
    `category "${hint || 'unknown'}" — treat it as a hint, not fact.\n` +
    'Rules: no brands, model numbers, hidden contents, medical/chemical identification, ' +
    'safety certifications, or invented specifications. If identity is uncertain, say so ' +
    `and suggest a better view. Write at ${depth}. 3 short paragraphs maximum.`;

  try {
    const upstream = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this object image.' },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('vision api upstream error', upstream.status, detail.slice(0, 300));
      json(res, 502, { error: `Vision provider returned HTTP ${upstream.status}.` });
      return;
    }
    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      json(res, 502, { error: 'Vision provider returned an empty response.' });
      return;
    }
    json(res, 200, { text, provider: 'openai-compatible', model });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const timedOut = /timeout|aborted/i.test(message);
    json(res, timedOut ? 504 : 502, {
      error: timedOut ? 'Vision provider timed out.' : `Vision provider request failed: ${message}`,
    });
  }
}
