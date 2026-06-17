"""
FastAPI TTS proxy for Dukandar AI (example).

The widget POSTs {text, lang} here; this service holds the vendor API key (NEVER the frontend),
calls a cloud voice (ElevenLabs shown; Azure is similar), caches fixed lines so repeat playback
is free, and streams audio back.

Why FastAPI: async I/O to model/voice APIs, Pydantic typing, auto /docs, easy WebSocket streaming,
and it sits in the Python AI ecosystem (LLM SDKs, embeddings, vector DBs, RAG, Whisper).

Run:
    pip install fastapi uvicorn httpx
    export ELEVENLABS_API_KEY=...   ELEVENLABS_VOICE_ID=...
    uvicorn server.tts_proxy:app --reload --port 8000
Point the widget at it:  VITE_TTS_ENDPOINT=http://localhost:8000/api/tts  VITE_TTS_PROVIDER=cloud
"""
import os
import hashlib
import pathlib
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

app = FastAPI(title="Dukandar AI — TTS proxy")

# Lock this down to your merchant storefront origins in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

CACHE_DIR = pathlib.Path(".tts-cache")
CACHE_DIR.mkdir(exist_ok=True)

ELEVEN_KEY = os.getenv("ELEVENLABS_API_KEY", "")
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "")


class TTSRequest(BaseModel):
    text: str
    lang: str = "ur-PK"


@app.post("/api/tts")
async def tts(req: TTSRequest) -> Response:
    if not req.text.strip():
        raise HTTPException(400, "empty text")

    # Cache fixed/templated lines on disk → $0 on replay (greeting, prompts, etc.)
    key = hashlib.sha256(f"{VOICE_ID}:{req.lang}:{req.text}".encode()).hexdigest()
    cached = CACHE_DIR / f"{key}.mp3"
    if cached.exists():
        return Response(cached.read_bytes(), media_type="audio/mpeg")

    if not ELEVEN_KEY or not VOICE_ID:
        # Dev safety: no key configured → tell the widget to use its browser-voice fallback.
        raise HTTPException(503, "TTS vendor not configured")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    payload = {
        "text": req.text,
        "model_id": "eleven_multilingual_v2",  # multilingual voice for Urdu/English
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.7},
    }
    headers = {"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(url, json=payload, headers=headers)
    if r.status_code != 200:
        raise HTTPException(502, f"vendor error {r.status_code}")

    cached.write_bytes(r.content)  # persist for reuse
    return Response(r.content, media_type="audio/mpeg")


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "vendor_configured": bool(ELEVEN_KEY and VOICE_ID)}
