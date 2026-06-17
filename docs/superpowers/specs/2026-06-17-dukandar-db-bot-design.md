# Dukandar AI — DB-driven storefront + voice-first guided bot

Date: 2026-06-17

## Goal
Turn the Libaas storefront + Saathi assistant from a static, frontend-mock demo into a
real DB-backed app with a catalogue-aware, voice-first conversational shopping bot.

## Decisions (locked with user)
- **Bot brains:** Hybrid — Claude (`claude-haiku-4-5-20251001`) extracts slots from free text;
  deterministic facet-driven state machine is the backbone; keyword parser is the fallback when
  no API key / API error. Tapped quick-replies are always deterministic (no API call).
- **Data source:** Live from Postgres via FastAPI. Storefront grid *and* bot read the real catalogue.
- **Voice:** Browser SpeechSynthesis (free). Cloud TTS stays wired, off by default.
- **DB:** `postgresql+asyncpg://postgres:root@localhost:5432/postgres`.

## Bot UX — catalogue-aware drill-down
Voice-first conversation; every Saathi question is spoken AND shown as text. User answers by
tapping a chip, typing, or speaking (STT → transcribed into chat as a "you" bubble).

Drill order, each step offering ONLY options that still exist in stock given prior answers:
`category → subtype (kind/style) → colour → price band → (size, optional) → results`

Free text / speech can fill multiple slots at once ("white formal shirt under 4000") via the
LLM (or keyword fallback), short-circuiting the drill-down.

## Backend changes
- `app/config.py`: default `database_url` to the Postgres URL above; add `anthropic_api_key`,
  `anthropic_model` settings.
- `app/models.py`: `Product` gains `color: str`, `subtype: str`, `fabric: str` columns (indexed
  where useful).
- `app/seed.py`: generator producing 100+ items across Pants, Kurta, Shirt, Dress, Dupatta,
  Shalwar Kameez, Saree, Abaya, Waistcoat, Trousers — with realistic name/subtype/color/fabric/
  price/sizes/sale/hot. Idempotent (skip if merchant already seeded).
- `app/routers/catalogue.py`:
  - `GET /v1/merchant/{id}/catalogue` → query params `q, category, color, subtype, sale, page,
    page_size`; returns `{items, total, page, page_size}`.
  - `GET /v1/merchant/{id}/facets` → given current filter params, returns the available next-step
    options with counts: `{subtypes: [...], colors: [...], price_bands: [...], sizes: [...]}`.
- `app/llm.py` (new): `async extract_slots(text, slots) -> dict | None` calling Claude Messages
  API via `httpx`. Returns `None` on missing key/any error → caller falls back to keyword parser.
- `app/service.py`: replace fixed category→size→budget machine with a facet-driven machine that
  asks the next unfilled facet and sources its quick-replies from `facets`. Free text routed
  through `llm.extract_slots` then `catalogue.parse_text` fallback.
- `app/schemas.py`: paginated catalogue response, facets response, richer `ProductOut`
  (color/subtype), updated `Reply`/slot names.

## Frontend changes
- `src/store/api.ts` (new): typed fetch client for catalogue + facets. `VITE_API_BASE`
  (default `http://localhost:8000`).
- `src/store/storefront.ts`: fetch from backend; **search bar** (debounced → `?q=`),
  **pagination** (prev/next + page numbers), loading + empty states, category/sale chips hit the
  API. Mock fallback if backend unreachable so the page never looks broken.
- `src/store/catalogue.ts`: keep types + mock as fallback; `Product` type gains color/subtype.
- `src/widget/api.ts` (new): session/turn client.
- `src/widget/flow.ts`: drive the conversation from backend `/v1/session` + `/v1/turn`; render
  returned `message`/`replies`/`products`; delete the duplicated client-side matching.
- `src/widget/index.ts` + `styles.ts`: voice-first polish — auto-speak bot messages, prominent
  mic, typing indicator, transcript bubbles, smoother chat.

## Testing / verification
- Extend `tests/test_api.py`: pagination, search, facets, full drill-down flow, LLM-fallback
  (no key → deterministic still resolves).
- Run backend tests (SQLite), `tsc --noEmit` + `vite build` for frontend, smoke-test the running
  stack (seed count ≥ 100, a session reaching results).

## Out of scope (YAGNI)
- Auth / per-merchant API keys, Alembic migrations (startup `create_all` stays for dev),
  real cart/checkout, cloud TTS provisioning.
