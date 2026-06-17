// Bridges the floating Saathi bot to whichever view is mounted. When the bot resolves a
// search it asks the catalogue to filter; if we're on another page we navigate home first
// and the catalogue consumes the pending filter when it mounts.
import type { BotFilter } from "../store/storefront";

export interface CatalogueController {
  applyFilters(f: BotFilter, highlightIds?: string[]): void;
}

let controller: CatalogueController | null = null;
let pending: { filter: BotFilter; ids: string[] } | null = null;

export function registerCatalogue(c: CatalogueController): () => void {
  controller = c;
  if (pending) { c.applyFilters(pending.filter, pending.ids); pending = null; }
  return () => { if (controller === c) controller = null; };
}

export function applyBotFilter(filter: BotFilter, ids: string[]): void {
  const onCatalogue = location.hash === "" || location.hash === "#/" || location.hash.startsWith("#/?");
  if (onCatalogue && controller) {
    controller.applyFilters(filter, ids);
  } else {
    pending = { filter, ids };
    location.hash = "#/";
  }
}
