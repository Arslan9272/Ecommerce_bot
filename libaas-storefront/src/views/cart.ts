// Cart page: line items with quantity steppers, remove, and an order summary.
import { pkr } from "../store/catalogue";
import { garmentSvg } from "../store/catalogue";
import { cart, type CartLine } from "../app/cart";

export function renderCart(host: HTMLElement): () => void {
  const draw = (lines: CartLine[]): void => {
    if (!lines.length) {
      host.innerHTML = `<div class="wrap cartpage">
        <h1 class="page-title">Your bag</h1>
        <div class="empty big">Your bag is empty.<br><a class="btn-primary" data-link="#/">Start shopping</a></div>
      </div>`;
      return;
    }
    const line = (l: CartLine): string => {
      const ph = `<span class="ph" style="color:${l.tone}">${garmentSvg(l.category)}</span>`;
      const img = l.image ? `<img class="pimg" src="${l.image}" alt="" loading="lazy" onerror="this.remove()">` : "";
      return `<div class="cart-line" data-id="${l.id}" data-size="${l.size}">
        <div class="cl-thumb" style="background:linear-gradient(160deg,${l.tone}22,${l.tone}55)">${ph}${img}</div>
        <div class="cl-info">
          <div class="cl-name" data-link="#/product/${l.id}">${l.name}</div>
          <div class="cl-sub">${[l.color, l.subtype].filter(Boolean).join(" · ")} · Size ${l.size}</div>
          <button class="cl-remove" data-remove>Remove</button>
        </div>
        <div class="cl-qty">
          <button class="qbtn" data-dec aria-label="Decrease">−</button>
          <span class="qn">${l.qty}</span>
          <button class="qbtn" data-inc aria-label="Increase">+</button>
        </div>
        <div class="cl-price">${pkr(l.price * l.qty)}</div>
      </div>`;
    };
    const subtotal = cart.subtotal();
    const savings = cart.savings();
    const shipping = subtotal >= 5000 || subtotal === 0 ? 0 : 250;
    host.innerHTML = `<div class="wrap cartpage">
      <h1 class="page-title">Your bag <span class="muted">· ${cart.count()} item${cart.count() === 1 ? "" : "s"}</span></h1>
      <div class="cart-grid">
        <div class="cart-lines">${lines.map(line).join("")}</div>
        <aside class="summary">
          <h3>Order summary</h3>
          <div class="srow"><span>Subtotal</span><span>${pkr(subtotal)}</span></div>
          ${savings ? `<div class="srow save"><span>You save</span><span>− ${pkr(savings)}</span></div>` : ""}
          <div class="srow"><span>Shipping</span><span>${shipping ? pkr(shipping) : "Free"}</span></div>
          <div class="srow total"><span>Total</span><span>${pkr(subtotal + shipping)}</span></div>
          <button class="btn-primary wide" data-link="#/checkout">Checkout →</button>
          <a class="cont" data-link="#/">Continue shopping</a>
        </aside>
      </div>
    </div>`;
  };

  const unsub = cart.subscribe(draw);

  host.addEventListener("click", (e) => {
    const el = e.target as HTMLElement;
    const row = el.closest<HTMLElement>(".cart-line");
    const link = el.closest<HTMLElement>("[data-link]");
    if (el.closest("[data-inc]") && row) { cart.setQty(row.dataset.id!, row.dataset.size!, qtyOf(row) + 1); return; }
    if (el.closest("[data-dec]") && row) { cart.setQty(row.dataset.id!, row.dataset.size!, qtyOf(row) - 1); return; }
    if (el.closest("[data-remove]") && row) { cart.remove(row.dataset.id!, row.dataset.size!); return; }
    if (link) { location.hash = link.dataset.link!; }
  });

  const qtyOf = (row: HTMLElement): number => Number(row.querySelector(".qn")!.textContent || "1");

  return unsub;
}
