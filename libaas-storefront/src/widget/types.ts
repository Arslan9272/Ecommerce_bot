import type { Category } from "../store/catalogue";

export interface Slots {
  category: Category | null;
  size: string | null;
  budget: number | null;
  saleOnly: boolean;
}
