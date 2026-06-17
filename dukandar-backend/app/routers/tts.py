import hashlib
import pathlib

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from ..config import settings
from ..schemas import TTSRequest

router = APIRouter(tags=["tts"])

CACHE_DIR = pathlib.Path(".tts-cache")
CACHE_DIR.mkdir(exist_ok=True)


@router.post("/api/tts")
async def tts(req: TTSRequest) -> Response:
    if not req.text.strip():
        raise HTTPException(400, "empty text")

    # cache fixed/templated lines on disk -> $0 on replay
    key = hashlib.sha256(f"{settings.eleven_voice_id}:{req.lang}:{req.text}".encode()).hexdigest()
    cached = CACHE_DIR / f"{key}.mp3"
    if cached.exists():
        return Response(cached.read_bytes(), media_type="audio/mpeg")

    if not settings.eleven_api_key or not settings.eleven_voice_id:
        # not configured -> tell the widget to use its free browser-voice fallback
        raise HTTPException(503, "TTS vendor not configured")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.eleven_voice_id}"
    payload = {
        "text": req.text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.7},
    }
    headers = {"xi-api-key": settings.eleven_api_key, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(url, json=payload, headers=headers)
    if r.status_code != 200:
        raise HTTPException(502, f"vendor error {r.status_code}")
    cached.write_bytes(r.content)
    return Response(r.content, media_type="audio/mpeg")
