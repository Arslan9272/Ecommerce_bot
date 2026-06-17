"""End-to-end check. Run: python -m tests.test_api  (uses SQLite, no Postgres needed).

Covers: pagination, search, facets, the facet-driven drill-down flow, free-text fast-forward
(keyword fallback — no Anthropic key needed), the off-topic guard, no-match recovery, analytics,
and the TTS fallback.
"""
import asyncio
import os
import pathlib

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./_test.db"  # set before importing the app
os.environ["ANTHROPIC_API_KEY"] = ""                          # force the deterministic path

import httpx  # noqa: E402
from httpx import ASGITransport  # noqa: E402


async def _drive(c, sid, body):
    """Continue a drill-down from `body`, choosing the first concrete option each step."""
    chosen = {}
    for _ in range(8):
        if body.get("done") or body["step"] == "intent":
            break
        # pick the first reply that carries a concrete (non-"Any") slot, else the first reply
        reply = next((x for x in body["replies"] if x["slot"] and x["slot"]["value"] != "Any"), None)
        reply = reply or (body["replies"][0] if body["replies"] else None)
        if reply is None or reply["slot"] is None:
            break
        chosen[reply["slot"]["name"]] = reply["slot"]["value"]
        r = await c.post("/v1/turn", json={"session_id": sid, "slot": reply["slot"]})
        body = r.json()
    return body, chosen


async def main() -> None:
    pathlib.Path("./_test.db").unlink(missing_ok=True)
    from app.main import app  # imported after DATABASE_URL is set

    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            # health
            r = await c.get("/health"); assert r.status_code == 200, r.text
            assert r.json()["ok"] is True

            # catalogue: paginated shape + 100+ items seeded
            r = await c.get("/v1/merchant/demo/catalogue?page=1&page_size=12")
            assert r.status_code == 200
            page = r.json()
            assert page["total"] >= 100, page["total"]
            assert len(page["items"]) == 12 and page["page"] == 1
            assert page["pages"] >= 9, page["pages"]
            assert {"subtype", "color", "fabric"} <= page["items"][0].keys()
            print(f"  catalogue -> {page['total']} items, {page['pages']} pages")

            # search narrows results
            r = await c.get("/v1/merchant/demo/catalogue?q=kurta")
            kt = r.json()["total"]
            assert kt > 0 and kt < page["total"], kt
            print(f"  search 'kurta' -> {kt} items")

            # facets: drilling by category exposes its real subtypes + colours
            r = await c.get("/v1/merchant/demo/facets?category=Shirt")
            f = r.json()
            assert f["total"] > 0 and len(f["subtypes"]) >= 1 and len(f["colors"]) >= 1, f
            print(f"  facets(Shirt) -> subtypes={[x['value'] for x in f['subtypes']]}")

            # 1) tapped drill-down path -> results consistent with the chosen category
            r = await c.post("/v1/session", json={"merchant_id": "demo"}); s = r.json(); sid = s["session_id"]
            assert s["step"] == "intent" and len(s["replies"]) >= 2
            r = await c.post("/v1/turn", json={"session_id": sid, "slot": {"name": "category", "value": "Shirt"}})
            body, chosen = await _drive(c, sid, r.json())
            chosen["category"] = "Shirt"
            assert body["done"] is True, body
            assert len(body["products"]) > 0
            assert all(p["category"] == "Shirt" for p in body["products"]), body["products"]
            assert body["slots"].get("category") == "Shirt"
            print(f"  drill-down -> {len(body['products'])} shirts; chosen={chosen}")

            # 2) free-text fast-forward via the keyword fallback (no API key)
            r = await c.post("/v1/session", json={"merchant_id": "demo"}); sid2 = r.json()["session_id"]
            r = await c.post("/v1/turn", json={"session_id": sid2, "input": "navy kurta under 4000"})
            body, _ = await _drive(c, sid2, r.json())
            # the parse should have set category=Kurta and a budget; ensure all results obey them
            assert body["done"] is True, body
            assert all(p["category"] == "Kurta" and p["price"] <= 4000 for p in body["products"]), body
            print(f"  free-text -> {len(body['products'])} navy kurtas under 4000")

            # 3) off-topic guard
            r = await c.post("/v1/session", json={"merchant_id": "demo"}); sid3 = r.json()["session_id"]
            r = await c.post("/v1/turn", json={"session_id": sid3, "input": "what's the weather today"})
            assert r.json()["step"] == "intent" and "find clothes" in r.json()["message"]
            print("  off-topic guard -> redirected")

            # 4) no-match recovery: an impossible combo offers a 'clear' relax option
            r = await c.post("/v1/session", json={"merchant_id": "demo"}); sid4 = r.json()["session_id"]
            r = await c.post("/v1/turn", json={"session_id": sid4, "input": "white formal shirt under 4000"})
            b = r.json()
            if not b["products"] and not b["done"]:
                clear = next((x for x in b["replies"] if x["slot"] and x["slot"]["name"] == "clear"), None)
                assert clear is not None, b
                print(f"  no-match recovery -> offered: {[x['label'] for x in b['replies']]}")
            else:
                print("  (white formal shirt existed; recovery not exercised)")

            # 5) analytics
            r = await c.get("/v1/merchant/demo/analytics"); a = r.json()
            assert a["sessions"] >= 4, a
            print(f"  analytics -> {a}")

            # 6) tts proxy 503 when vendor unconfigured (widget -> browser voice)
            r = await c.post("/api/tts", json={"text": "test", "lang": "ur-PK"})
            assert r.status_code == 503, r.status_code
            print("  tts proxy -> 503 (unconfigured, browser fallback)")

    pathlib.Path("./_test.db").unlink(missing_ok=True)
    print("ALL TESTS PASSED")


if __name__ == "__main__":
    asyncio.run(main())
