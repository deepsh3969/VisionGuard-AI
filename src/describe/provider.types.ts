import type { DescriptionResult, ExplanationMode } from '../types';

export interface DescribeRequest {
  label: string;
  mode: ExplanationMode;
  /** JPEG data URL of the cropped object (used only by remote providers). */
  imageDataUrl?: string;
  confidence?: number;
}

export interface DescriptionProvider {
  readonly id: 'template' | 'remote-vlm';
  readonly name: string;
  /** Whether this provider can serve requests right now. */
  isAvailable(): boolean;
  describe(request: DescribeRequest): Promise<DescriptionResult>;
}
