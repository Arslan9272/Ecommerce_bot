// Checkout page: delivery details + payment method + order summary -> places the order
// (demo: no real payment) and shows a confirmation.
import { pkr } from "../store/catalogue";
import { cart } from "../app/cart";

export function renderCheckout(host: HTMLElement): () => void {
  if (!cart.lines().length) {
    host.innerHTML = `<div class="wrap cartpage"><h1 class="page-title">Checkout</h1>
      <div class="empty big">Your bag is empty.<br><a class="btn-primary" data-link="#/">Start shopping</a></div></div>`;
    host.addEventListener("click", linkNav);
    return () => {};
  }

  const subtotal = cart.subtotal();
  const shipping = subtotal >= 5000 ? 0 : 250;
  const total = subtotal + shipping;

  host.innerHTML = `<div class="wrap checkout">
    <h1 class="page-title">Checkout</h1>
    <div class="cart-grid">
      <form class="co-form" id="co-form" novalidate>
        <h3>Delivery details</h3>
        <div class="co-row">
          <label>Full name<input name="name" required placeholder="Ayesha Khan"></label>
          <label>Phone<input name="phone" required placeholder="0300 1234567"></label>
        </div>
        <label>Email<input name="email" type="email" required placeholder="you@email.com"></label>
        <label>Address<input name="address" required placeholder="House 12, Street 4"></label>
        <div class="co-row">
          <label>City<input name="city" required placeholder="Lahore"></label>
          <label>Postal code<input name="zip" placeholder="54000"></label>
        </div>
        <h3>Payment</h3>
        <div class="pay-opts">
          <label class="pay"><input type="radio" name="pay" value="cod" checked> <span>Cash on delivery</span></label>
          <label class="pay"><input type="radio" name="pay" value="card"> <span>Card (demo)</span></label>
          <label class="pay"><input type="radio" name="pay" value="easypaisa"> <span>Easypaisa (demo)</span></label>
        </div>
        <div class="co-err" id="co-err" hidden></div>
      </form>
      <aside class="summary">
        <h3>Order summary</h3>
        <div class="summary-lines">
          ${cart.lines().map((l) => `<div class="srow"><span>${l.name} ×${l.qty} <i class="muted">(${l.size})</i></span><span>${pkr(l.price * l.qty)}</span></div>`).join("")}
        </div>
        <div class="srow"><span>Shipping</span><span>${shipping ? pkr(shipping) : "Free"}</span></div>
        <div class="srow total"><span>Total</span><span>${pkr(total)}</span></div>
        <button class="btn-primary wide" id="place">Place order · ${pkr(total)}</button>
        <a class="cont" data-link="#/cart">Back to bag</a>
      </aside>
    </div>
  </div>`;

  const form = host.querySelector<HTMLFormElement>("#co-form")!;
  const err = host.querySelector<HTMLElement>("#co-err")!;

  host.querySelector("#place")!.addEventListener("click", () => {
    const data = new FormData(form);
    const missing = ["name", "phone", "email", "address", "city"].filter((k) => !String(data.get(k) || "").trim());
    if (missing.length) {
      err.hidden = false;
      err.textContent = `Please fill in: ${missing.join(", ")}.`;
      (form.querySelector(`[name="${missing[0]}"]`) as HTMLElement)?.focus();
      return;
    }
    const orderNo = "LB" + Math.floor(100000 + Math.random() * 900000);
    const name = String(data.get("name"));
    const pay = String(data.get("pay"));
    cart.clear();
    confirm(orderNo, name, total, pay);
  });

  function confirm(orderNo: string, name: string, amount: number, pay: string): void {
    const payLabel = pay === "cod" ? "Cash on delivery" : pay === "card" ? "Card (demo)" : "Easypaisa (demo)";
    host.innerHTML = `<div class="wrap confirm">
      <div class="confirm-card">
        <div class="check">✓</div>
        <h1>Shukriya, ${name.split(" ")[0]}!</h1>
        <p>Your order <b>${orderNo}</b> is confirmed.</p>
        <div class="confirm-meta">
          <div><span>Amount</span><b>${pkr(amount)}</b></div>
          <div><span>Payment</span><b>${payLabel}</b></div>
          <div><span>Delivery</span><b>3–5 working days</b></div>
        </div>
        <p class="muted">A confirmation has been sent to your email. (This is a demo store — no real order is placed.)</p>
        <button class="btn-primary" data-link="#/">Continue shopping</button>
      </div>
    </div>`;
  }

  host.addEventListener("click", linkNav);
  return () => {};
}

function linkNav(e: Event): void {
  const link = (e.target as HTMLElement).closest<HTMLElement>("[data-link]");
  if (link) location.hash = link.dataset.link!;
}
