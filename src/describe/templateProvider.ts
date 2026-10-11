import type { DescriptionResult, ExplanationMode } from '../types';
import { templateFor, type TemplateEntry } from './templates';
import type { DescribeRequest, DescriptionProvider } from './provider.types';

/**
 * Deterministic local description provider.
 * Builds structured explanations from grounded templates only — it never
 * invents brands, contents, materials or specifications.
 */
export class TemplateProvider implements DescriptionProvider {
  readonly id = 'template' as const;
  readonly name = 'Local template knowledge base (COCO classes)';

  isAvailable(): boolean {
    return true;
  }

  async describe(request: DescribeRequest): Promise<DescriptionResult> {
    const entry = templateFor(request.label);
    const text = entry
      ? composeText(request.label, entry, request.mode)
      : composeUnknown(request.label, request.mode);
    return {
      text,
      mode: request.mode,
      provider: 'template',
      providerStatus: 'ready',
      transmittedExternally: false,
      generatedAt: Date.now(),
    };
  }
}

function composeUnknown(label: string, mode: ExplanationMode): string {
  const base =
    `The detector reported “${label}”, but this class is not in the supported ` +
    `COCO vocabulary, so no grounded description is available. Try a clearer view ` +
    `or a different angle of the object.`;
  if (mode === 'quick') return base;
  return (
    base +
    '\n\nSupported classes are the 80 everyday COCO categories (people, vehicles, ' +
    'animals, common handheld items, food and furniture). Unsupported objects can ' +
    'still be tracked, but VisionGuard will not invent an explanation for them.'
  );
}

function composeText(label: string, e: TemplateEntry, mode: ExplanationMode): string {
  const lines: string[] = [];
  const title = label.charAt(0).toUpperCase() + label.slice(1);
  lines.push(`${title} — ${e.short}`);
  if (mode === 'quick') return lines[0];

  lines.push(`Purpose: ${e.purpose}`);
  lines.push(`Typical uses: ${e.applications}`);
  lines.push(`How it usually looks: ${e.visual}`);
  lines.push(`Handling: ${e.handling}`);

  if (mode === 'educational') {
    lines.push('');
    lines.push('Learn more:');
    for (const f of e.facts) lines.push(`• ${f}`);
    lines.push(
      'Note: this explanation is generated from a template keyed to the detected ' +
        'class. It describes the category, not a verified identification of this ' +
        'specific item — exact model, brand, contents and material cannot be ' +
        'confirmed from the camera image alone.',
    );
  }
  return lines.join('\n');
}
