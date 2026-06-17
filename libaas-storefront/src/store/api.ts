// Typed client for the FastAPI catalogue + facets endpoints.
import type { Product } from "./catalogue";

export const API_BASE: string =
  ((import.meta as any).env?.VITE_API_BASE as string) || "http://localhost:8000";
export const MERCHANT = "demo";

export interface ApiProduct {
  id: string; name: string; category: string; subtype: string; color: string; fabric: string;
  price: number; compare_at: number | null; sizes: string[]; sale: boolean; hot: boolean;
  tone: string; image: string;
}
export interface CataloguePage {
  items: ApiProduct[]; total: number; page: number; page_size: number; pages: number;
}
export interface FacetValue { value: string; count: number; }
export interface Facets {
  total: number; categories: FacetValue[]; subtypes: FacetValue[]; colors: FacetValue[];
  sizes: FacetValue[]; price_bands: FacetValue[];
}

export interface CatalogueQuery {
  q?: string; category?: string; subtype?: string; color?: string; size?: string;
  sale?: boolean; price_band?: string; page?: number; page_size?: number;
}

const qs = (params: CatalogueQuery): string => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== "all") u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
};

export const toProduct = (p: ApiProduct): Product => ({
  id: p.id, name: p.name, category: p.category, subtype: p.subtype, color: p.color,
  fabric: p.fabric, price: p.price, compareAt: p.compare_at ?? undefined, sizes: p.sizes,
  sale: p.sale, hot: p.hot, tone: p.tone, image: p.image,
});

export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/v1/merchant/${MERCHANT}/product/${id}`);
  if (!res.ok) throw new Error(`product ${res.status}`);
  return toProduct(await res.json());
}

export async function fetchCatalogue(query: CatalogueQuery): Promise<CataloguePage> {
  const res = await fetch(`${API_BASE}/v1/merchant/${MERCHANT}/catalogue${qs(query)}`);
  if (!res.ok) throw new Error(`catalogue ${res.status}`);
  return res.json();
}

export async function fetchFacets(query: CatalogueQuery): Promise<Facets> {
  const res = await fetch(`${API_BASE}/v1/merchant/${MERCHANT}/facets${qs(query)}`);
  if (!res.ok) throw new Error(`facets ${res.status}`);
  return res.json();
}
