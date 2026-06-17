"""Claude-powered free-text understanding for the bot.

`extract_slots` maps a shopper's natural sentence ("something flowy and white, not too pricey,
I'm a medium") onto the catalogue's real facet values. It only ever returns values that exist
in the live catalogue, so the deterministic flow downstream stays safe.

This is the *smart* layer of the hybrid bot. If no API key is configured or anything goes
wrong (network, quota, bad JSON), it returns None and the caller falls back to the deterministic
keyword parser — the conversation never breaks.
"""
import json
import re

import httpx

from .config import settings

API_URL = "https://api.anthropic.com/v1/messages"
SLOT_KEYS = ("category", "subtype", "color", "size", "saleOnly", "budget")


def _system(facets: dict) -> str:
    return (
        "You extract structured shopping filters from a clothing shopper's message for a "
        "Pakistani fashion store. Reply with ONLY a compact JSON object — no prose, no markdown.\n"
        "Allowed keys (include a key ONLY if the shopper clearly implies it):\n"
        f"  category: one of {facets.get('categories', [])}\n"
        f"  subtype:  one of {facets.get('subtypes', [])} (the kind/style)\n"
        f"  color:    one of {facets.get('colors', [])} (map e.g. 'blueish' -> nearest)\n"
        f"  size:     one of {facets.get('sizes', [])}\n"
        "  saleOnly: true only if they ask for sale/discount/cheap deals\n"
        "  budget:   an integer max price in PKR if they give a number or 'under X'\n"
        "Map loose wording to the nearest allowed value. Omit keys you are unsure about. "
        "If the message is not about shopping for clothes, reply {}."
    )


def _coerce(data: dict, facets: dict) -> dict:
    """Keep only valid keys/values that exist in the catalogue facets."""
    out: dict = {}
    for key in ("category", "subtype", "color", "size"):
        val = data.get(key)
        allowed = facets.get(key + "s" if key != "category" else "categories", [])
        if isinstance(val, str) and val in allowed:
            out[key] = val
    if data.get("saleOnly") is True:
        out["saleOnly"] = True
    b = data.get("budget")
    if isinstance(b, (int, float)) and 100 <= b <= 1_000_000:
        out["budget"] = int(b)
    return out


async def extract_slots(text: str, facets: dict) -> dict | None:
    """Return slot updates from free text, or None to signal 'use the keyword fallback'."""
    if not settings.anthropic_api_key or not text.strip():
        return None
    payload = {
        "model": settings.anthropic_model,
        "max_tokens": 256,
        "system": _system(facets),
        "messages": [{"role": "user", "content": text.strip()}],
    }
    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.post(API_URL, json=payload, headers=headers)
        if r.status_code != 200:
            return None
        body = r.json()
        text_out = "".join(b.get("text", "") for b in body.get("content", []) if b.get("type") == "text")
        m = re.search(r"\{.*\}", text_out, re.S)
        if not m:
            return None
        return _coerce(json.loads(m.group(0)), facets)
    except Exception:
        return None
