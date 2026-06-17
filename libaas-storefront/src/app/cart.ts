// Persistent shopping cart (localStorage). Lines are keyed by product id + chosen size.
import type { Product } from "../store/catalogue";

export interface CartLine {
  id: string; name: string; price: number; compareAt?: number; image?: string;
  category: string; color?: string; subtype?: string; tone: string; size: string; qty: number;
}

const KEY = "libaas_cart_v1";
type Listener = (lines: CartLine[]) => void;
const listeners = new Set<Listener>();

let lines: CartLine[] = load();

function load(): CartLine[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
function persist(): void {
  localStorage.setItem(KEY, JSON.stringify(lines));
  listeners.forEach((fn) => fn(lines));
}
const lineKey = (id: string, size: string) => `${id}__${size}`;

export const cart = {
  lines: (): CartLine[] => lines,
  count: (): number => lines.reduce((n, l) => n + l.qty, 0),
  subtotal: (): number => lines.reduce((n, l) => n + l.price * l.qty, 0),
  savings: (): number => lines.reduce((n, l) => n + (l.compareAt ? (l.compareAt - l.price) * l.qty : 0), 0),

  add(p: Product, size: string, qty = 1): void {
    const key = lineKey(p.id, size);
    const existing = lines.find((l) => lineKey(l.id, l.size) === key);
    if (existing) existing.qty += qty;
    else lines.push({
      id: p.id, name: p.name, price: p.price, compareAt: p.compareAt, image: p.image,
      category: p.category, color: p.color, subtype: p.subtype, tone: p.tone, size, qty,
    });
    persist();
  },
  setQty(id: string, size: string, qty: number): void {
    const l = lines.find((x) => lineKey(x.id, x.size) === lineKey(id, size));
    if (!l) return;
    l.qty = qty;
    if (l.qty <= 0) lines = lines.filter((x) => x !== l);
    persist();
  },
  remove(id: string, size: string): void {
    lines = lines.filter((l) => lineKey(l.id, l.size) !== lineKey(id, size));
    persist();
  },
  clear(): void { lines = []; persist(); },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(lines);
    return () => listeners.delete(fn);
  },
};
