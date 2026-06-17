import { garmentSvg, pkr } from "../store/catalogue";
import type { StoreApi, BotFilter } from "../store/storefront";
import type { TTSService } from "./tts";
import { startSession, sendTurn, type ApiReply, type ApiProduct } from "./api";

// The conversation lives on the backend (app/service.py). This class renders turns, speaks
// the bot's lines, and mirrors the resolved filters onto the storefront grid.
export class GuidedFlow {
  private stream: HTMLElement;
  private sessionId: string | null = null;
  private busy = false;

  constructor(host: ShadowRoot, private tts: TTSService, private store: StoreApi) {
    this.stream = host.querySelector<HTMLElement>(".stream")!;
  }

  // ---- rendering helpers ----
  private scroll(): void { this.stream.scrollTop = this.stream.scrollHeight; }

  private bot(text: string, speak = true): void {
    const d = document.createElement("div");
    d.className = "msg bot";
    d.textContent = text;
    this.stream.appendChild(d);
    this.scroll();
    if (speak) void this.tts.speak(text);
  }

  private me(text: string): void {
    const d = document.createElement("div");
    d.className = "msg me";
    d.textContent = text;
    this.stream.appendChild(d);
    this.scroll();
  }

  private typing(on: boolean): void {
    let el = this.stream.querySelector<HTMLElement>(".typing");
    if (on && !el) {
      el = document.createElement("div");
      el.className = "msg bot typing";
      el.innerHTML = "<span></span><span></span><span></span>";
      this.stream.appendChild(el);
      this.scroll();
    } else if (!on && el) {
      el.remove();
    }
  }

  private replies(opts: ApiReply[]): void {
    if (!opts.length) return;
    const wrap = document.createElement("div");
    wrap.className = "replies";
    opts.forEach((o) => {
      const b = document.createElement("button");
      b.className = "reply";
      b.textContent = o.label;
      b.onclick = () => {
        if (this.busy) return;
        this.me(o.label);
        wrap.remove();
        void this.turn({ slot: o.slot });
      };
      wrap.appendChild(b);
    });
    this.stream.appendChild(wrap);
    this.scroll();
  }

  private miniCards(items: ApiProduct[]): void {
    if (!items.length) return;
    const box = document.createElement("div");
    box.className = "minis";
    box.innerHTML = items
      .map((p) => `<div class="prodmini">
          <div class="pic" style="background:${p.tone}22;color:${p.tone}">${garmentSvg(p.category)}</div>
          <div class="mid"><div class="nm">${p.name}</div>
            <div class="sub">${[p.color, p.subtype].filter(Boolean).join(" · ")}</div>
            <div class="pr">${p.compare_at ? `<s>${pkr(p.compare_at)}</s> ` : ""}${pkr(p.price)}</div></div>
          <div class="tag">${p.sale ? "Sale" : p.hot ? "Hot" : ""}</div></div>`)
      .join("");
    this.stream.appendChild(box);
    this.scroll();
  }

  // ---- grid mirroring ----
  private mirror(slots: Record<string, unknown>, products: ApiProduct[]): void {
    const f: BotFilter = {
      category: (slots.category as string) || "all",
      subtype: slots.subtype as string | undefined,
      color: slots.color as string | undefined,
      size: slots.size as string | undefined,
      priceBand: slots.price_band as string | undefined,
      sale: !!slots.saleOnly,
    };
    this.store.applyFilters(f, products.map((p) => p.id));
  }

  // ---- conversation ----
  async greet(): Promise<void> {
    this.stream.innerHTML = "";
    this.busy = true;
    this.typing(true);
    try {
      const s = await startSession();
      this.sessionId = s.session_id;
      this.typing(false);
      this.bot(s.message);
      this.replies(s.replies);
    } catch {
      this.typing(false);
      this.bot("I can't reach the store right now — please make sure the backend is running on port 8000, then reopen me.");
    } finally {
      this.busy = false;
    }
  }

  private async turn(slotOrInput: { input?: string; slot?: ApiReply["slot"] }): Promise<void> {
    if (!this.sessionId || this.busy) return;
    this.busy = true;
    this.typing(true);
    try {
      const r = await sendTurn(this.sessionId, {
        input: slotOrInput.input,
        slot: slotOrInput.slot ?? undefined,
      });
      this.typing(false);
      this.bot(r.message);
      this.miniCards(r.products);
      this.replies(r.replies);
      this.mirror(r.slots || {}, r.products);
    } catch {
      this.typing(false);
      this.bot("Sorry, something went wrong reaching the store. Please try again.");
    } finally {
      this.busy = false;
    }
  }

  handleText(raw: string): void {
    const t = raw.trim();
    if (!t || this.busy) return;
    this.me(t);
    if (!this.sessionId) { void this.greet(); return; }
    void this.turn({ input: t });
  }
}
