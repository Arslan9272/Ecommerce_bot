import "./store/store.css";
import { renderCatalogue, type StoreApi } from "./store/storefront";
import { renderProduct } from "./views/product";
import { renderCart } from "./views/cart";
import { renderCheckout } from "./views/checkout";
import { mountWidget } from "./widget";
import { cart } from "./app/cart";
import { applyBotFilter } from "./app/bridge";
import type { TTSProvider } from "./widget/tts";

const app = document.getElementById("app")!;

// ---- persistent shell (header + footer); only #view changes between routes ----
app.innerHTML = `
  <header><div class="wrap bar">
    <a class="brand" data-link="#/">Lib<span>aa</span>s</a>
    <nav>
      <a data-link="#/">New In</a>
      <a data-link="#/?cat=Kurta">Kurtas</a>
      <a data-link="#/?cat=Dress">Dresses</a>
      <a data-link="#/?cat=Shalwar Kameez">Suits</a>
      <a data-link="#/?sale=1">Sale</a>
    </nav>
    <a class="cart-link" data-link="#/cart" aria-label="Bag">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>
      <span class="cart-badge" id="cart-badge">0</span>
    </a>
  </div></header>
  <div id="view"></div>
  <footer class="wrap">Libaas is an original demo storefront for the Dukandar AI assistant. Not affiliated with any real brand.</footer>
`;

// live cart badge
const badge = document.getElementById("cart-badge")!;
cart.subscribe(() => {
  const n = cart.count();
  badge.textContent = String(n);
  badge.classList.toggle("show", n > 0);
});

// header link delegation
app.querySelector("header")!.addEventListener("click", (e) => {
  const link = (e.target as HTMLElement).closest<HTMLElement>("[data-link]");
  if (link) { e.preventDefault(); location.hash = link.dataset.link!; }
});

// ---- router ----
const view = document.getElementById("view")!;
let cleanup: () => void = () => {};

function route(): void {
  cleanup();
  view.innerHTML = "";
  window.scrollTo({ top: 0 });
  const hash = location.hash || "#/";
  const path = hash.split("?")[0];
  if (path.startsWith("#/product/")) cleanup = renderProduct(view, decodeURIComponent(path.slice("#/product/".length)));
  else if (path === "#/cart") cleanup = renderCart(view);
  else if (path === "#/checkout") cleanup = renderCheckout(view);
  else cleanup = renderCatalogue(view);
}

window.addEventListener("hashchange", route);
route();

// ---- the floating Saathi bot (persists across routes); drives the catalogue via the bridge ----
const store: StoreApi = { applyFilters: (f, ids) => applyBotFilter(f, ids ?? []) };
const env = (import.meta as any).env ?? {};
mountWidget({
  store,
  ttsProvider: (env.VITE_TTS_PROVIDER as TTSProvider) || "browser",
  ttsEndpoint: env.VITE_TTS_ENDPOINT || "/api/tts",
});
