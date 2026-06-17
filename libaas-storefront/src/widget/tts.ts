// Voice output. v1 default is "cloud" (better Urdu) calling a backend proxy that holds the
// API key; "browser" is the zero-cost dev/demo fallback. Fixed lines are cached so repeat
// playback (greeting, prompts) costs $0 — the core cost-control idea.

export type TTSProvider = "browser" | "cloud";

export interface TTSOptions {
  provider: TTSProvider;
  endpoint: string; // e.g. /api/tts  (the backend proxy — never put a vendor key in the frontend)
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export class TTSService {
  private cache = new Map<string, string>(); // text -> object URL (cloud audio)
  private enabled = true;

  constructor(private opts: TTSOptions) {}

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.stop();
  }

  async speak(text: string): Promise<void> {
    if (!this.enabled) return;
    if (this.opts.provider === "cloud") {
      try { await this.speakCloud(text); return; }
      catch { /* network/quota issue → fall back to browser voice */ }
    }
    this.speakBrowser(text);
  }

  stop(): void {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    const vs = synth.getVoices();
    return vs.find((v) => /ur|hi/i.test(v.lang)) || vs.find((v) => /en/i.test(v.lang)) || vs[0] || null;
  }

  private speakBrowser(text: string): void {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/Rs/g, "rupees "));
    const v = this.pickVoice();
    if (v) u.voice = v;
    u.rate = 1.02;
    u.pitch = 1.05;
    u.onstart = () => this.opts.onStart?.();
    u.onend = () => this.opts.onEnd?.();
    synth.speak(u);
  }

  private async speakCloud(text: string): Promise<void> {
    let url = this.cache.get(text);
    if (!url) {
      const res = await fetch(this.opts.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: this.opts.lang ?? "ur-PK" }),
      });
      if (!res.ok) throw new Error(`tts proxy ${res.status}`);
      url = URL.createObjectURL(await res.blob());
      this.cache.set(text, url); // cache fixed lines → $0 on replay
    }
    await new Promise<void>((resolve) => {
      const audio = new Audio(url!);
      audio.onplay = () => this.opts.onStart?.();
      const done = () => { this.opts.onEnd?.(); resolve(); };
      audio.onended = done;
      audio.onerror = done;
      audio.play().catch(done);
    });
  }
}
