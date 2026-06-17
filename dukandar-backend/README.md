# Dukandar AI — Backend (FastAPI + Postgres)

Async FastAPI service powering the guided-shopping assistant: the **session/turn** API
(the authoritative scripted flow), the **catalogue** service, **analytics**, and the
**cloud-TTS proxy**. Async SQLAlchemy on Postgres, with a SQLite fallback for local dev/tests.

## Run
```bash
pip install -r requirements.txt          # add --break-system-packages on managed Python
cp .env.example .env                      # set DATABASE_URL (Postgres) or use the sqlite line
uvicorn app.main:app --reload --port 8000
# Interactive docs: http://localhost:8000/docs
```
Tables are created and a demo merchant ("Libaas", id `demo`) with 18 products is seeded on startup.

### No Postgres handy?
Set in `.env`: `DATABASE_URL=sqlite+aiosqlite:///./dukandar.db` — everything works the same.

## Test (no Postgres needed)
```bash
python -m tests.test_api
```
Exercises: tapped flow (category→size→budget→results), free-text fast-forward, off-topic
guard, analytics, and the TTS fallback.

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/session` | start a session → greeting + intent quick-replies |
| POST | `/v1/turn` | advance the flow with a tapped `slot` or free `input` → message, replies, products |
| GET  | `/v1/merchant/{id}/catalogue` | list products |
| POST | `/v1/merchant/{id}/catalogue/sync` | replace catalogue from a feed |
| GET  | `/v1/merchant/{id}/analytics` | sessions, completion rate, results shown, clicks |
| POST | `/api/tts` | cloud Urdu voice proxy (caches lines; 503 when unconfigured → browser fallback) |

## The turn state machine (app/service.py)
`intent → size → budget → done`. Slots = {category, size, budget, saleOnly}. A turn accepts
either a tapped `slot` or free `input`; free text is parsed for category/size/budget/sale and can
**fast-forward** multiple steps at once. Off-topic input during intent is redirected. Every turn
logs an event for analytics/attribution.

## Wiring the frontend widget
Point the widget at this service: `POST /v1/session` on open, then `POST /v1/turn` per reply.
Render `message` (and speak it), `replies` (quick-reply buttons carrying their `slot`), and
`products` (mini-cards + filter the store grid). Voice still flows through `/api/tts`.

## Production notes
- Switch `JSON` columns to `JSONB` and add Alembic migrations (startup `create_all` is for dev).
- Add per-merchant API keys + origin allow-list; enforce per-plan session caps.
- Swap the keyword intent parser for an LLM call (keep the deterministic parser as fallback).
