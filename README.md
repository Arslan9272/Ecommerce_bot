# Dukandar AI — Libaas storefront + voice-first guided-shopping bot

A full-stack demo: an original Pakistani fashion storefront (**Libaas**) with **Saathi**, a
catalogue-aware, voice-first shopping assistant.

```
dukandar-backend/    FastAPI + Postgres: catalogue (search/pagination/facets), the bot's
                     session/turn engine (hybrid: Claude + deterministic fallback), TTS proxy
libaas-storefront/   Vite + TypeScript multipage storefront: catalogue, product detail, cart,
                     checkout, and the embedded Saathi widget
docs/                design spec
```

## Run it

**1. Backend** (needs Postgres running)
```bash
cd dukandar-backend
pip install -r requirements.txt
cp .env.example .env          # set DATABASE_URL (defaults to postgres/root @ localhost)
uvicorn app.main:app --port 8000   # seeds 100+ products on first run
```

**2. Frontend**
```bash
cd libaas-storefront
npm install
cp .env.example .env          # VITE_API_BASE defaults to http://localhost:8000
npm run dev                   # open the printed localhost URL
```

## The bot (Saathi)
A facet-driven conversation that drills `category → kind → colour → size → price`, only ever
offering options that exist in stock, and mirrors its filters onto the storefront grid. Free
text / speech is understood by **Claude** (set `ANTHROPIC_API_KEY` in the backend `.env`), with a
deterministic keyword parser as a $0 fallback so it works offline. Voice output uses the free
browser speech synthesiser by default (cloud TTS is wired and optional).

> Demo store — no real orders, payments, or brand affiliation.
