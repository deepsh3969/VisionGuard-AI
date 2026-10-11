import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SpeechController } from '../src/voice/speech';

class FakeUtterance {
  text: string;
  rate = 1;
  lang = '';
  voice: unknown = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

class FakeSynth {
  speaking = false;
  paused = false;
  queue: FakeUtterance[] = [];
  cancelled: FakeUtterance[] = [];
  private listeners = new Map<string, Set<() => void>>();
  getVoices() {
    return [
      { voiceURI: 'v1', name: 'Test Voice', lang: 'en-US' },
      { voiceURI: 'v2', name: 'Alt Voice', lang: 'en-GB' },
    ];
  }
  speak(u: FakeUtterance) {
    this.queue.push(u);
    this.speaking = true;
    u.onstart?.();
  }
  cancel() {
    this.cancelled.push(...this.queue);
    this.queue = [];
    this.speaking = false;
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
  addEventListener(type: string, cb: () => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
  }
  endCurrent() {
    const u = this.queue.shift();
    this.speaking = this.queue.length > 0;
    u?.onend?.();
  }
}

function makeController() {
  const synth = new FakeSynth() as unknown as SpeechSynthesis & FakeSynth;
  (globalThis as Record<string, unknown>).SpeechSynthesisUtterance = FakeUtterance;
  const controller = new SpeechController(synth);
  return { synth: synth as unknown as FakeSynth, controller };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('SpeechController', () => {
  it('reports unsupported when synth is null', () => {
    const controller = new SpeechController(null);
    expect(controller.supported).toBe(false);
    expect(controller.getState().voices).toEqual([]);
  });

  it('speaks text and reflects speaking state', () => {
    const { synth, controller } = makeController();
    controller.speak('hello world');
    expect(synth.queue).toHaveLength(1);
    expect(synth.queue[0].text).toBe('hello world');
    expect(controller.getState().speaking).toBe(true);
  });

  it('applies the configured rate', () => {
    const { synth, controller } = makeController();
    controller.setRate(1.5);
    controller.speak('fast');
    expect(synth.queue[0].rate).toBe(1.5);
  });

  it('clamps rate to a sane range', () => {
    const { synth, controller } = makeController();
    controller.setRate(99);
    controller.speak('x');
    expect(synth.queue[0].rate).toBe(3);
  });

  it('announceOnce speaks only once per key', () => {
    const { synth, controller } = makeController();
    expect(controller.announceOnce('k1', 'cup detected')).toBe(true);
    expect(controller.announceOnce('k1', 'cup detected')).toBe(false);
    expect(synth.queue).toHaveLength(1);
  });

  it('announceOnce resets after resetAnnouncement', () => {
    const { synth, controller } = makeController();
    controller.announceOnce('k1', 'a');
    controller.resetAnnouncement();
    expect(controller.announceOnce('k1', 'a')).toBe(true);
    // speak() cancels the previous utterance (real Web Speech behaviour),
    // so only the newest utterance remains queued.
    expect(synth.queue).toHaveLength(1);
    expect(synth.queue[0].text).toBe('a');
    expect(synth.cancelled).toHaveLength(1);
  });

  it('stop cancels speech', () => {
    const { synth, controller } = makeController();
    controller.speak('x');
    controller.stop();
    expect(synth.cancelled).toHaveLength(1);
    expect(controller.getState().speaking).toBe(false);
  });

  it('pause and resume toggle synth state', () => {
    const { synth, controller } = makeController();
    controller.speak('x');
    controller.pause();
    expect(synth.paused).toBe(true);
    controller.resume();
    expect(synth.paused).toBe(false);
  });

  it('repeat re-speaks the last text', () => {
    const { synth, controller } = makeController();
    controller.repeat('again please');
    expect(synth.queue[0].text).toBe('again please');
  });

  it('lists voices', () => {
    const { controller } = makeController();
    expect(controller.getVoices().map((v) => v.uri)).toEqual(['v1', 'v2']);
  });

  it('ignores empty text', () => {
    const { synth, controller } = makeController();
    controller.speak('   ');
    expect(synth.queue).toHaveLength(0);
  });

  it('notifies subscribers on state changes', () => {
    const { controller } = makeController();
    const seen: boolean[] = [];
    controller.subscribe((s) => seen.push(s.speaking));
    controller.speak('x');
    expect(seen).toContain(true);
  });
});
