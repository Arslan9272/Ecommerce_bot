import { PRODUCTS, pkr, type Product } from "./catalogue";
import {
  fetchCatalogue, fetchFacets, toProduct, type CatalogueQuery, type FacetValue,
} from "./api";
import { card } from "../components/product";
import { cart } from "../app/cart";
import { registerCatalogue } from "../app/bridge";
import { toast } from "../app/toast";

// The Saathi bot drives the grid through this shape so the page mirrors the conversation.
export interface BotFilter {
  category?: string | "all"; subtype?: string; color?: string; size?: string;
  sale?: boolean; priceBand?: string; q?: string;
}

// The bot talks to the catalogue through this (implemented by main.ts via the bridge).
export interface StoreApi {
  applyFilters(f: BotFilter, highlightIds?: string[]): void;
}

const PAGE_SIZE = 12;

// Renders the catalogue page (hero + search + chips + grid + pagination) into `host`.
// Returns a cleanup function the router calls when navigating away.
export function renderCatalogue(host: HTMLElement): () => void {
  const state = {
    q: "", category: "all" as string, color: "", subtype: "", size: "",
    sale: false, priceBand: "", page: 1, highlight: new Set<string>(),
  };
  let categories: FacetValue[] = [];
  const byId = new Map<string, Product>();

  host.innerHTML = `
    <section class="hero wrap">
      <div>
        <div class="eyebrow">Summer Edit · 2026</div>
        <h1>Clothes that<br>know your fit.</h1>
        <p>Modern desi staples, sized and styled for you. Not sure what suits you?
           Ask <b>Saathi</b> — our in-store helper who talks back, asks the right questions,
           and filters the rack for you.</p>
        <button class="hero-cta" id="ask-cta">Ask Saathi to style me →</button>
      </div>
      <div class="hero-art" aria-hidden="true"></div>
    </section>

    <div class="controls"><div class="wrap">
      <div class="search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="search" type="search" placeholder="Search kurtas, colours, fabrics…" aria-label="Search products" />
      </div>
      <div class="toolbar" id="toolbar"></div>
    </div></div>

    <div class="wrap">
      <div class="offline-note" id="offline" hidden>⚠ Showing demo data — start the backend (port 8000) for the full 100+ catalogue.</div>
      <section class="grid" id="grid"></section>
      <div class="pager" id="pager"></div>
    </div>`;

  const grid = host.querySelector<HTMLElement>("#grid")!;
  const toolbar = host.querySelector<HTMLElement>("#toolbar")!;
  const pager = host.querySelector<HTMLElement>("#pager")!;
  const search = host.querySelector<HTMLInputElement>("#search")!;
  const offlineNote = host.querySelector<HTMLElement>("#offline")!;

  const skeleton = (): string =>
    Array.from({ length: PAGE_SIZE }, () => '<div class="card skel"><div class="thumb-wrap sk"></div><div class="meta"><div class="sk-line"></div><div class="sk-line short"></div></div></div>').join("");

  const renderToolbar = (): void => {
    const chip = (label: string, val: string, active: boolean) =>
      `<button class="chip ${active ? "active" : ""}" data-cat="${val}">${label}</button>`;
    const cats = categories.map((c) => chip(c.value, c.value, state.category === c.value && !state.sale)).join("");
    toolbar.innerHTML =
      chip("All", "all", state.category === "all" && !state.sale) + cats +
      `<button class="chip ${state.sale ? "active" : ""}" data-sale>On sale</button>` +
      `<span class="count" id="count"></span>`;
  };

  const renderPager = (page: number, pages: number, total: number): void => {
    if (pages <= 1) { pager.innerHTML = total ? `<span class="pinfo">${total} item${total === 1 ? "" : "s"}</span>` : ""; return; }
    const btn = (label: string, p: number, dis = false, active = false) =>
      `<button class="pbtn ${active ? "active" : ""}" data-page="${p}" ${dis ? "disabled" : ""}>${label}</button>`;
    const nums: string[] = [];
    for (let p = 1; p <= pages; p++) {
      if (p === 1 || p === pages || (p >= page - 2 && p <= page + 2)) nums.push(btn(String(p), p, false, p === page));
      else if (nums[nums.length - 1] !== "…") nums.push("…");
    }
    pager.innerHTML =
      `<span class="pinfo">${total} items · page ${page} of ${pages}</span>` +
      `<div class="pnav">${btn("‹ Prev", page - 1, page <= 1)}${nums.map((n) => n === "…" ? '<span class="pdots">…</span>' : n).join("")}${btn("Next ›", page + 1, page >= pages)}</div>`;
  };

  const buildQuery = (): CatalogueQuery => ({
    q: state.q || undefined,
    category: state.category !== "all" ? state.category : undefined,
    subtype: state.subtype || undefined, color: state.color || undefined,
    size: state.size || undefined, sale: state.sale || undefined,
    price_band: state.priceBand || undefined, page: state.page, page_size: PAGE_SIZE,
  });

  const renderItems = (items: Product[], total: number, page: number, pages: number): void => {
    byId.clear(); items.forEach((p) => byId.set(p.id, p));
    grid.innerHTML = items.length
      ? items.map((p) => card(p, state.highlight.has(p.id))).join("")
      : `<div class="empty">No matches for these filters. <button class="link" id="clear-all">Clear all</button></div>`;
    const c = host.querySelector<HTMLElement>("#count");
    if (c) c.textContent = `${total} item${total === 1 ? "" : "s"}`;
    renderPager(page, pages, total);
  };

  const load = async (): Promise<void> => {
    grid.innerHTML = skeleton();
    try {
      const data = await fetchCatalogue(buildQuery());
      offlineNote.hidden = true;
      renderItems(data.items.map(toProduct), data.total, data.page, data.pages);
    } catch {
      offlineNote.hidden = false;
      const items = PRODUCTS.filter((p) =>
        (state.category === "all" || p.category === state.category) && (!state.sale || p.sale) &&
        (!state.q || `${p.name} ${p.category} ${p.color ?? ""}`.toLowerCase().includes(state.q.toLowerCase())));
      renderItems(items, items.length, 1, 1);
    }
  };

  const refresh = async (resetPage = true): Promise<void> => {
    if (resetPage) state.page = 1;
    renderToolbar();
    await load();
  };

  host.addEventListener("click", (e) => {
    const el = e.target as HTMLElement;
    const add = el.closest<HTMLElement>("[data-add]");
    const link = el.closest<HTMLElement>("[data-link]");
    const c = el.closest<HTMLElement>("[data-cat]");
    const s = el.closest<HTMLElement>("[data-sale]");
    const pg = el.closest<HTMLElement>("[data-page]");
    if (el.id === "ask-cta") { document.dispatchEvent(new CustomEvent("saathi:open")); return; }
    if (add) {
      e.preventDefault(); e.stopPropagation();
      const p = byId.get(add.dataset.add!);
      if (p) { cart.add(p, p.sizes[0] || "One"); toast(`Added ${p.name} to your bag`); }
      return;
    }
    if (link) { location.hash = link.dataset.link!; return; }
    if (el.id === "clear-all") { Object.assign(state, { q: "", category: "all", color: "", subtype: "", size: "", sale: false, priceBand: "", highlight: new Set<string>() }); search.value = ""; void refresh(); return; }
    if (c) { state.category = c.dataset.cat || "all"; state.sale = false; state.subtype = ""; state.color = ""; state.highlight = new Set(); void refresh(); }
    else if (s) { state.sale = !state.sale; state.category = "all"; state.highlight = new Set(); void refresh(); }
    else if (pg && !(pg as HTMLButtonElement).disabled) {
      state.page = Number(pg.dataset.page); void load();
      window.scrollTo({ top: (host.querySelector(".controls") as HTMLElement)?.offsetTop ?? 0 - 16, behavior: "smooth" });
    }
  });

  let timer: number | undefined;
  search.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { state.q = search.value.trim(); void refresh(); }, 300);
  });

  // initial categories + first load, honouring any ?cat=/?sale= in the hash
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  if (params.get("cat")) state.category = params.get("cat")!;
  if (params.get("sale")) state.sale = true;
  (async () => {
    try { categories = (await fetchFacets({})).categories; }
    catch { categories = [...new Set(PRODUCTS.map((p) => p.category))].map((v) => ({ value: v, count: 0 })); }
    renderToolbar();
    await load();
  })();

  // expose to the bot bridge
  const unregister = registerCatalogue({
    applyFilters(f, ids) {
      state.category = f.category && f.category !== "all" ? f.category : "all";
      state.subtype = f.subtype && f.subtype !== "Any" ? f.subtype : "";
      state.color = f.color && f.color !== "Any" ? f.color : "";
      state.size = f.size && f.size !== "Any" ? f.size : "";
      state.priceBand = f.priceBand && f.priceBand !== "Any" ? f.priceBand : "";
      state.sale = !!f.sale; state.q = f.q ?? ""; search.value = state.q;
      state.highlight = new Set(ids ?? []);
      void refresh();
    },
  });

  return unregister;
}

// Re-export so other modules can keep importing pkr/Product types from here if needed.
export { pkr };
