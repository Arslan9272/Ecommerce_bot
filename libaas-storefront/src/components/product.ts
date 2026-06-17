// Shared product rendering: photo (with graceful SVG fallback) + catalogue card.
import { garmentSvg, pkr, type Product } from "../store/catalogue";

// A real photo layered over a tinted garment-icon placeholder. If the image fails to load
// (offline / source down), `onerror` removes it and the placeholder shows through.
export function thumb(p: Product, cls = "thumb"): string {
  const ph = `<span class="ph" style="color:${p.tone}">${garmentSvg(p.category)}</span>`;
  const img = p.image
    ? `<img class="pimg" src="${p.image}" alt="${escapeAttr(p.name)}" loading="lazy" onerror="this.remove()">`
    : "";
  return `<div class="${cls}" style="background:linear-gradient(160deg,${p.tone}22,${p.tone}55)">${ph}${img}</div>`;
}

export function badges(p: Product, highlighted = false): string {
  let b = "";
  if (p.sale) b += '<span class="badge b-sale">Sale</span>';
  if (p.hot) b += '<span class="badge b-hot">Hot pick</span>';
  if (highlighted) b += '<span class="badge b-fit">Saathi pick</span>';
  return b ? `<div class="badges">${b}</div>` : "";
}

export function card(p: Product, highlighted = false): string {
  return `
    <article class="card ${highlighted ? "lit" : ""}" data-link="#/product/${p.id}">
      <div class="thumb-wrap">${thumb(p)}${badges(p, highlighted)}
        <button class="quick-add" data-add="${p.id}" title="Add to bag" aria-label="Add ${escapeAttr(p.name)} to bag">+ Bag</button>
      </div>
      <div class="meta">
        <div class="name">${p.name}</div>
        <div class="cat">${[p.subtype, p.category].filter(Boolean).join(" · ")}</div>
        <div class="price">${p.compareAt ? `<s>${pkr(p.compareAt)}</s>` : ""}${pkr(p.price)}</div>
        <div class="sizes">${p.sizes.map((s) => `<span class="sz">${s}</span>`).join("")}</div>
      </div>
    </article>`;
}

export function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
