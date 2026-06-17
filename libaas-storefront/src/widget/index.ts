import { WIDGET_CSS } from "./styles";
import { Avatar } from "./avatar";
import { TTSService, type TTSProvider } from "./tts";
import { GuidedFlow } from "./flow";
import { sttSupported, listenOnce } from "./stt";
import type { StoreApi } from "../store/storefront";

export interface WidgetOptions {
  store: StoreApi;
  ttsProvider: TTSProvider;
  ttsEndpoint: string;
}

const LAUNCH_FACE = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#fff" opacity=".15"/>
  <circle cx="20" cy="17" r="9" fill="#F7D9A0"/><path d="M9 17a11 7 0 0 1 22 0z" fill="#C9A227"/>
  <circle cx="16.5" cy="16" r="1.4" fill="#3d1b34"/><circle cx="23.5" cy="16" r="1.4" fill="#3d1b34"/>
  <path d="M16 20q4 3 8 0" stroke="#3d1b34" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`;

export function mountWidget(opts: WidgetOptions): void {
  const hostEl = document.createElement("div");
  hostEl.id = "dukandar-ai";
  document.body.appendChild(hostEl);
  const shadow = hostEl.attachShadow({ mode: "open" });

  shadow.innerHTML = `
    <style>${WIDGET_CSS}</style>
    <button class="launch" type="button" aria-label="Ask Saathi">${LAUNCH_FACE} Ask Saathi</button>
    <div class="panel" role="dialog" aria-label="Saathi shopping assistant">
      <div class="phead">
        <div class="avatar">${Avatar.svg()}</div>
        <div><div class="who">Saathi</div><div class="status">your shopping helper</div></div>
        <button class="sound" type="button" title="Toggle voice">🔊</button>
        <button class="x" type="button" aria-label="Close">×</button>
      </div>
      <div class="stream"></div>
      <div class="pfoot">
        <button class="icon mic" type="button" title="Speak">🎤</button>
        <input class="field" placeholder="Type what you're looking for…" aria-label="Message Saathi" />
        <button class="icon send" type="button" aria-label="Send">→</button>
      </div>
    </div>`;

  const $ = <T extends Element>(sel: string): T => shadow.querySelector<T>(sel)!;
  const launch = $<HTMLButtonElement>(".launch");
  const panel = $<HTMLElement>(".panel");
  const statusEl = $<HTMLElement>(".status");
  const soundBtn = $<HTMLButtonElement>(".sound");
  const micBtn = $<HTMLButtonElement>(".mic");
  const field = $<HTMLInputElement>(".field");

  const avatar = new Avatar(shadow);
  avatar.bind();

  const setStatus = (s: string): void => { statusEl.textContent = s; };
  const tts = new TTSService({
    provider: opts.ttsProvider,
    endpoint: opts.ttsEndpoint,
    lang: "ur-PK",
    onStart: () => { setStatus("speaking…"); avatar.start(); },
    onEnd: () => { setStatus("your shopping helper"); avatar.stop(); },
  });

  const flow = new GuidedFlow(shadow, tts, opts.store);

  let greeted = false;
  const open = (): void => {
    panel.classList.add("open");
    launch.style.display = "none";
    if (!greeted) { greeted = true; setTimeout(() => flow.greet(), 250); }
  };
  const close = (): void => {
    panel.classList.remove("open");
    launch.style.display = "flex";
    tts.stop();
    avatar.stop();
  };

  launch.addEventListener("click", open);
  $<HTMLButtonElement>(".x").addEventListener("click", close);
  // The storefront's "Ask Saathi to style me" CTA opens the assistant.
  document.addEventListener("saathi:open", open);

  let soundOn = true;
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    tts.setEnabled(soundOn);
    soundBtn.textContent = soundOn ? "🔊" : "🔇";
  });

  const send = (): void => {
    const t = field.value;
    field.value = "";
    flow.handleText(t);
  };
  $<HTMLButtonElement>(".send").addEventListener("click", send);
  field.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") send(); });

  let listening = false;
  micBtn.addEventListener("click", async () => {
    if (!sttSupported()) { field.placeholder = "Voice input not supported — please type"; field.focus(); return; }
    if (listening) return;
    listening = true;
    micBtn.classList.add("listening");
    try { const text = await listenOnce("en-PK"); flow.handleText(text); }
    catch { /* ignore; user can type */ }
    finally { listening = false; micBtn.classList.remove("listening"); }
  });
}
