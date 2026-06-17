# Libaas storefront + Dukandar AI widget (frontend)

A real, runnable Vite + TypeScript build: an original demo fashion storefront ("Libaas") with the
guided-shopping assistant widget embedded. Architected for **cloud Urdu TTS** with a free browser
fallback so it runs with zero setup.

## Run the storefront
```bash
npm install
npm run dev          # open the printed localhost URL
npm run build        # type-check (tsc --noEmit) + production build to dist/
```
Click **Ask Saathi** (bottom-right). It greets, asks category → size → budget, filters the store,
and talks (browser voice by default).

## Project layout
```
src/
  main.ts                bootstrap: render store + mount widget
  store/
    catalogue.ts          mock products (replace with merchant feed)
    storefront.ts         store UI + StoreApi (filter/highlight)
    store.css
  widget/                 the embeddable assistant
    index.ts              shadow-DOM mount, launcher, panel, wiring
    flow.ts               scripted point-oriented flow (slots: category/size/budget/sale)
    tts.ts                voice: cloud (proxy) + browser fallback + line caching
    stt.ts                optional speech input
    avatar.ts             2D SVG avatar + mouth animation
    styles.ts             shadow-DOM CSS
server/
  tts_proxy.py            FastAPI cloud-voice proxy (holds the vendor key, caches audio)
  requirements.txt
```

## Turn on real Urdu voice
1. Run the FastAPI proxy:
   ```bash
   pip install -r server/requirements.txt
   export ELEVENLABS_API_KEY=...  ELEVENLABS_VOICE_ID=<multilingual voice>
   uvicorn server.tts_proxy:app --reload --port 8000
   ```
2. Copy `.env.example` to `.env` and set:
   ```
   VITE_TTS_PROVIDER=cloud
   VITE_TTS_ENDPOINT=http://localhost:8000/api/tts
   ```
3. `npm run dev` again. The vendor API key stays server-side only.

## Notes
- The widget runs in a **shadow root** so its styles never collide with the merchant's site.
- Fixed lines (greeting, prompts) are **cached** by the proxy → $0 on replay; only dynamic lines
  ("I found 6 items…") are synthesized live. This is what keeps cost ~$0.01–0.02/session.
- `catalogue.ts` is mock data; production swaps in the backend catalogue service (CSV/Shopify/Woo/REST).
