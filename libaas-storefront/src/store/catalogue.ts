// Product types + a small mock catalogue used ONLY as an offline fallback when the backend
// is unreachable. In normal operation the storefront and the Saathi bot read live data from
// the FastAPI/Postgres backend (see store/api.ts).

export type Category = string;

export interface Product {
  id: string;
  name: string;
  category: Category;
  subtype?: string;
  color?: string;
  fabric?: string;
  price: number;
  compareAt?: number;
  sizes: string[];
  sale: boolean;
  hot: boolean;
  tone: string;
  image?: string;
}

const GARMENT: Record<string, string> = {
  Pants: '<path d="M7 2h10l1 20h-5l-1-12-1 12H5z"/>',
  Trousers: '<path d="M7 2h10l1 20h-5l-1-12-1 12H5z"/>',
  Kurta: '<path d="M9 2 4 6l2 3 1-1v13h10V8l1 1 2-3-5-4z"/>',
  "Shalwar Kameez": '<path d="M9 2 4 6l2 3 1-1v6h10V8l1 1 2-3-5-4zM8 14h8l1 8h-4l-1-5-1 5H7z"/>',
  Shirt: '<path d="M8 2 4 5l2 4 2-1v12h8V8l2 1 2-4-4-3-2 2H10z"/>',
  Waistcoat: '<path d="M9 3 5 6v15h6l1-7 1 7h6V6l-4-3-3 4z"/>',
  Dress: '<path d="M9 2 7 7l-3 14h16L17 7l-2-5-3 3z"/>',
  Abaya: '<path d="M10 2 6 6l-2 16h16L18 6l-4-4-2 3z"/>',
  Saree: '<path d="M4 4c6 3 12 3 16-1l-2 18H6zM6 9c4 2 8 2 12 0"/>',
  Dupatta: '<path d="M3 6c6 4 12 4 18 0v4c-6 4-12 4-18 0zM3 14c6 4 12 4 18 0"/>',
};
const FALLBACK_ICON = '<path d="M6 3h12v18H6z"/>';

export const garmentSvg = (cat: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">${GARMENT[cat] ?? FALLBACK_ICON}</svg>`;

// Back-compat helper so `GARMENT_SVG[cat]` still works for any category string.
export const GARMENT_SVG: Record<string, string> = new Proxy(GARMENT, {
  get: (_t, key: string) => garmentSvg(key),
});

const make = (
  name: string, category: Category, price: number, compareAt: number | undefined,
  sizes: string[], sale: boolean, hot: boolean, color: string, subtype: string, tone: string,
): Product => ({ id: name.toLowerCase().replace(/\s+/g, "-"), name, category, subtype, color, price, compareAt, sizes, sale, hot, tone });

// Tiny offline fallback set (the live catalogue has 100+).
export const PRODUCTS: Product[] = [
  make("Utility Navy Pant", "Pants", 2890, 3600, ["S", "M", "L", "XL"], true, true, "Navy", "Cargo", "#2d3a57"),
  make("Tailored White Shirt", "Shirt", 2490, undefined, ["S", "M", "L"], false, true, "White", "Formal", "#cfc7b8"),
  make("Embroidered Maroon Kurta", "Kurta", 2790, 3400, ["S", "M", "L"], true, true, "Maroon", "Embroidered", "#6e2b35"),
  make("Midi Rose Pink Dress", "Dress", 4290, undefined, ["S", "M", "L"], false, true, "Rose Pink", "Midi", "#c56b86"),
  make("Chiffon Ivory Dupatta", "Dupatta", 1490, 1900, ["One"], true, false, "Ivory", "Chiffon", "#e6dec9"),
  make("Festive Emerald Suit", "Shalwar Kameez", 5490, undefined, ["M", "L"], false, true, "Emerald", "Embroidered", "#2f6b53"),
];

export const CATEGORIES: Category[] = ["Pants", "Kurta", "Shirt", "Dress", "Dupatta"];

export const pkr = (n: number): string => "Rs " + n.toLocaleString("en-PK");
