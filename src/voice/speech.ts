/**
 * Speech controller around the browser Web Speech API (speechSynthesis).
 * Announcement policy: a given key (e.g. track id + label) is spoken once;
 * repeated frames never re-trigger speech.
 */

export interface SpeechState {
  supported: boolean;
  speaking: boolean;
  paused: boolean;
  voices: Array<{ uri: string; name: string; lang: string }>;
}

type Listener = (state: SpeechState) => void;

export class SpeechController {
  private synth: SpeechSynthesis | null;
  private listeners = new Set<Listener>();
  private lastAnnouncedKey: string | null = null;
  private rate = 1;
  private voiceUri = '';

  constructor(synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null) {
    this.synth = synth;
    if (this.synth) {
      this.synth.addEventListener?.('voiceschanged', () => this.emit());
    }
  }

  get supported(): boolean {
    return this.synth !== null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  getState(): SpeechState {
    return {
      supported: this.supported,
      speaking: this.synth?.speaking ?? false,
      paused: this.synth?.paused ?? false,
      voices: this.getVoices(),
    };
  }

  getVoices(): Array<{ uri: string; name: string; lang: string }> {
    if (!this.synth) return [];
    const voices = this.synth.getVoices?.() ?? [];
    return voices.map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang }));
  }

  setRate(rate: number): void {
    this.rate = Math.min(3, Math.max(0.5, rate));
  }

  setVoiceUri(uri: string): void {
    this.voiceUri = uri;
  }

  /** Speak text immediately, cancelling anything in progress. */
  speak(text: string): void {
    if (!this.synth || !text.trim()) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.rate;
    utterance.lang = 'en-US';
    if (this.voiceUri) {
      const voice = this.synth.getVoices().find((v) => v.voiceURI === this.voiceUri);
      if (voice) utterance.voice = voice;
    }
    utterance.onstart = () => this.emit();
    utterance.onend = () => this.emit();
    utterance.onerror = () => this.emit();
    this.synth.speak(utterance);
    this.emit();
  }

  /**
   * Announce once per key. Returns true when speech was started.
   * Used for "new object selected" announcements across video frames.
   */
  announceOnce(key: string, text: string): boolean {
    if (this.lastAnnouncedKey === key) return false;
    this.lastAnnouncedKey = key;
    this.speak(text);
    return true;
  }

  resetAnnouncement(): void {
    this.lastAnnouncedKey = null;
  }

  pause(): void {
    this.synth?.pause();
    this.emit();
  }

  resume(): void {
    this.synth?.resume();
    this.emit();
  }

  stop(): void {
    this.synth?.cancel();
    this.emit();
  }

  /** Repeat the most recent spoken text. */
  repeat(lastText: string): void {
    this.speak(lastText);
  }

  private emit(): void {
    const state = this.getState();
    for (const l of this.listeners) l(state);
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }
}

/** Shared singleton for the app. */
export const speechController = new SpeechController();
