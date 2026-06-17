// Product detail page: large photo, attributes, size picker, add-to-bag.
import { fetchProduct } from "../store/api";
import { pkr, type Product } from "../store/catalogue";
import { thumb, badges } from "../components/product";
import { cart } from "../app/cart";
import { toast } from "../app/toast";

export function renderProduct(host: HTMLElement, id: string): () => void {
  host.innerHTML = `<div class="wrap pdp"><div class="pdp-skel">Loading…</div></div>`;

  let chosenSize = "";

  const draw = (p: Product): void => {
    chosenSize = p.sizes[0] || "One";
    const off = p.compareAt ? Math.round((1 - p.price / p.compareAt) * 100) : 0;
    host.innerHTML = `
      <div class="wrap pdp">
        <a class="back" data-link="#/">‹ Back to shop</a>
        <div class="pdp-grid">
          <div class="pdp-media">${thumb(p, "pdp-photo")}${badges(p)}</div>
          <div class="pdp-info">
            <div class="pdp-cat">${[p.subtype, p.category].filter(Boolean).join(" · ")}</div>
            <h1 class="pdp-name">${p.name}</h1>
            <div class="pdp-price">
              ${p.compareAt ? `<s>${pkr(p.compareAt)}</s>` : ""}<b>${pkr(p.price)}</b>
              ${off ? `<span class="pdp-off">${off}% off</span>` : ""}
            </div>
            <p class="pdp-desc">A ${(p.color || "").toLowerCase()} ${(p.subtype || "").toLowerCase()} ${p.category.toLowerCase()}
               in ${(p.fabric || "premium fabric")}. Tailored for an easy, modern fit — a Libaas staple
               you'll reach for again and again.</p>

            <div class="pdp-field"><span>Colour</span><div class="swatch" style="background:${p.tone}"></div> ${p.color || "—"}</div>
            <div class="pdp-field"><span>Size</span>
              <div class="size-row" id="sizes">
                ${p.sizes.map((s, i) => `<button class="size-pick ${i === 0 ? "on" : ""}" data-size="${s}">${s}</button>`).join("")}
              </div>
            </div>

            <div class="pdp-actions">
              <button class="btn-primary" id="add">Add to bag · ${pkr(p.price)}</button>
              <button class="btn-ghost" id="buy">Buy now</button>
            </div>
            <div class="pdp-trust">✓ Free delivery over Rs 5,000 · ✓ 7-day easy returns</div>
          </div>
        </div>
      </div>`;

    host.querySelector("#sizes")!.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>("[data-size]");
      if (!b) return;
      chosenSize = b.dataset.size!;
      host.querySelectorAll(".size-pick").forEach((x) => x.classList.toggle("on", x === b));
    });
    host.querySelector("#add")!.addEventListener("click", () => { cart.add(p, chosenSize); toast(`Added ${p.name} (${chosenSize}) to your bag`); });
    host.querySelector("#buy")!.addEventListener("click", () => { cart.add(p, chosenSize); location.hash = "#/cart"; });
  };

  fetchProduct(id).then(draw).catch(() => {
    host.innerHTML = `<div class="wrap pdp"><div class="empty">Couldn't load this item. <a class="link" data-link="#/">Back to shop</a></div></div>`;
  });

  return () => {};
}
