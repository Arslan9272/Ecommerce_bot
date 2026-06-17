"""The bot's brain: a catalogue-aware, facet-driven conversation engine.

The flow drills down through attributes that actually exist in stock:
    category -> subtype (kind) -> colour -> size -> price band -> results
After every answer it recomputes what's still available, so it only ever offers options that
lead somewhere (no dead ends), auto-skips a step that has just one option, and skips a step
that has none.

Free text / speech is understood by Claude (app.llm) first, then by the deterministic keyword
parser (app.catalogue) as a fallback — so a full sentence like "white formal shirt under 4000"
fills several slots at once and fast-forwards the drill-down. Tapped quick-replies never hit the
LLM; they are instant and deterministic.
"""
from sqlalchemy.ext.asyncio import AsyncSession

from . import catalogue, llm, query
from .models import Event, Session
from .schemas import (
    Reply, SlotIn, TurnResponse, SessionStartResponse, TurnRequest, SessionStartRequest,
)

GREETING = "Assalam-o-alaikum! I'm Saathi, your shopping helper. What are you looking for today?"
RESULTS_LIMIT = 6

# drill order: (slot key, facet key, question text). The category question is the greeting.
STEPS: list[tuple[str, str, str]] = [
    ("category", "categories", "What are you shopping for today?"),
    ("subtype", "subtypes", "What kind are you after?"),
    ("color", "colors", "What colour would you like?"),
    ("size", "sizes", "What size do you need?"),
    ("price_band", "price_bands", "And what's your price range?"),
]


async def _log(db: AsyncSession, session_id: str, type_: str, payload: dict | None = None) -> None:
    db.add(Event(session_id=session_id, type=type_, payload=payload or {}))


# ---- slot <-> filter plumbing ----------------------------------------------------------------

def _answered(slots: dict, slot_key: str) -> bool:
    if slot_key == "price_band":
        return "price_band" in slots or "budget" in slots
    return slot_key in slots


def _filter_kwargs(slots: dict) -> dict:
    def v(k: str):
        x = slots.get(k)
        return None if x in (None, "", "Any") else x

    kw = dict(category=v("category"), subtype=v("subtype"), color=v("color"), size=v("size"),
              sale=True if slots.get("saleOnly") else None)
    band = slots.get("price_band")
    if band and band != "Any" and (b := query.band_bounds(band)):
        kw["price_min"], kw["price_max"] = b
    elif slots.get("budget"):
        kw["price_max"] = int(slots["budget"])
    return kw


def _apply(slots: dict, name: str, value) -> str | None:
    if name == "reset":
        return "reset"
    if name == "clear":                      # drop a constraint (used by no-match recovery)
        slots.pop(value, None)
        if value == "price_band":
            slots.pop("budget", None)
        return None
    if name == "saleOnly":
        slots["saleOnly"] = bool(value)
    elif name == "budget":
        slots["budget"] = int(value)
    elif name in ("category", "subtype", "color", "size", "price_band"):
        slots[name] = value
    return None


def _public_slots(slots: dict) -> dict:
    """The filter state the storefront grid mirrors (drops bookkeeping like 'Any')."""
    out = {k: v for k, v in slots.items() if v not in (None, "", "Any")}
    return out


def _merge_text_updates(slots: dict, updates: dict) -> None:
    """Apply parsed/LLM slot updates, keeping only real facet keys."""
    for k, val in updates.items():
        if k in ("category", "subtype", "color", "size"):
            slots[k] = val
        elif k == "saleOnly" and val:
            slots["saleOnly"] = True
        elif k == "budget":
            slots["budget"] = int(val)


# ---- reply builders --------------------------------------------------------------------------

def _step_replies(slot_key: str, options: list, *, allow_any: bool) -> list[Reply]:
    reps = [Reply(label=o.value, slot=SlotIn(name=slot_key, value=o.value)) for o in options]
    if allow_any:
        reps.append(Reply(label="Any / no preference", slot=SlotIn(name=slot_key, value="Any")))
    return reps


def _category_intro_replies(facets: dict) -> list[Reply]:
    reps = [Reply(label=o.value, slot=SlotIn(name="category", value=o.value))
            for o in facets.get("categories", [])[:6]]
    reps.append(Reply(label="Just show me the sale", slot=SlotIn(name="saleOnly", value=True)))
    return reps


# ---- session lifecycle -----------------------------------------------------------------------

async def start_session(db: AsyncSession, req: SessionStartRequest) -> SessionStartResponse:
    session = Session(merchant_id=req.merchant_id, step="intent", slots={})
    db.add(session)
    await db.flush()
    await _log(db, session.id, "open")
    await db.commit()

    rows = await query.all_products(db, req.merchant_id)
    facets = query.compute_facets(rows)
    return SessionStartResponse(
        session_id=session.id, message=GREETING,
        replies=_category_intro_replies(facets), step="intent",
    )


async def handle_turn(db: AsyncSession, req: TurnRequest) -> TurnResponse:
    session = await db.get(Session, req.session_id)
    if session is None:
        raise KeyError("session not found")

    slots = dict(session.slots or {})
    rows = await query.all_products(db, session.merchant_id)
    global_facets = query.compute_facets(rows)

    # 1) tapped quick-reply (deterministic, no LLM)
    if req.slot is not None:
        if _apply(slots, req.slot.name, req.slot.value) == "reset":
            return await _reset(db, session)

    # 2) free text / speech -> Claude, then keyword fallback
    if req.input and req.input.strip():
        updates = await llm.extract_slots(req.input, global_facets)
        used_llm = updates is not None
        if not updates:
            updates = catalogue.parse_text(req.input)
        # off-topic guard while still at the intent step with nothing extracted
        if not updates and not _answered(slots, "category") and not catalogue.is_shopping(req.input):
            await _log(db, session.id, "offtopic", {"text": req.input})
            session.slots = slots
            await db.commit()
            return TurnResponse(
                message="I'm here to help you find clothes — what are you shopping for? "
                        "Try 'white formal shirt under 4000' or tap a category.",
                replies=_category_intro_replies(global_facets), step="intent",
            )
        _merge_text_updates(slots, updates)
        await _log(db, session.id, "parse", {"updates": updates, "llm": used_llm})

    # 3) advance the drill-down, auto-skipping single/empty facets
    next_step = _advance(slots, rows)
    session.slots = dict(slots)
    session.step = next_step[0] if next_step else "done"

    if next_step is not None:
        slot_key, options, prompt = next_step
        await db.commit()
        return TurnResponse(message=prompt, replies=options, step=slot_key, slots=_public_slots(slots))

    return await _results(db, session, slots, rows)


def _advance(slots: dict, rows: list) -> tuple[str, list[Reply], str] | None:
    """Find the next question to ask, mutating `slots` to skip pointless steps. None => results."""
    for slot_key, facet_key, prompt in STEPS:
        if _answered(slots, slot_key):
            continue
        filtered = query.apply_filters(rows, **_filter_kwargs(slots))
        options = query.compute_facets(filtered)[facet_key]
        if len(options) == 0:
            slots[slot_key] = "Any"             # nothing to choose here, move on
            continue
        if len(options) == 1 and slot_key != "category":
            slots[slot_key] = options[0].value  # only one real choice — pick it silently
            continue
        text = prompt
        if slot_key == "subtype" and slots.get("category"):
            text = f"Nice — what kind of {slots['category'].lower()}?"
        return slot_key, _step_replies(slot_key, options, allow_any=slot_key != "category"), text
    return None


async def _results(db: AsyncSession, session: Session, slots: dict, rows: list) -> TurnResponse:
    matched = query.rank(query.apply_filters(rows, **_filter_kwargs(slots)))
    session.completed = True
    session.outcome = "results"
    await _log(db, session.id, "results_shown", {"count": len(matched), "slots": slots})
    await db.commit()

    if not matched:
        relax: list[Reply] = []
        if slots.get("color") and slots["color"] != "Any":
            relax.append(Reply(label=f"Any colour (not just {slots['color']})",
                               slot=SlotIn(name="clear", value="color")))
        if slots.get("subtype") and slots["subtype"] != "Any":
            relax.append(Reply(label=f"Any style (not just {slots['subtype']})",
                               slot=SlotIn(name="clear", value="subtype")))
        if slots.get("price_band") not in (None, "Any") or slots.get("budget"):
            relax.append(Reply(label="Drop the price limit", slot=SlotIn(name="clear", value="price_band")))
        relax.append(Reply(label="Start over", slot=SlotIn(name="reset", value=True)))
        return TurnResponse(
            message="Hmm, I couldn't find that exact combination. Want me to loosen a filter?",
            replies=relax, step="done", done=False, slots=_public_slots(slots),
        )

    bits = [slots.get("color"), slots.get("subtype"), slots.get("category")]
    label = " ".join(b for b in bits if b and b != "Any").lower() or "pieces"
    sale = any(p.sale for p in matched)
    msg = (f"Here {'is' if len(matched) == 1 else 'are'} {len(matched)} {label} "
           f"for you{' — some are on sale! ✨' if sale else ' ✨'}").replace("  ", " ")

    out = [query.to_out(p) for p in matched[:RESULTS_LIMIT]]
    return TurnResponse(
        message=msg, products=out, step="done", done=True, slots=_public_slots(slots),
        replies=[Reply(label="Look for something else", slot=SlotIn(name="reset", value=True))],
    )


async def _reset(db: AsyncSession, session: Session) -> TurnResponse:
    session.slots = {}
    session.step = "intent"
    session.completed = False
    session.outcome = None
    await _log(db, session.id, "reset")
    await db.commit()
    rows = await query.all_products(db, session.merchant_id)
    facets = query.compute_facets(rows)
    return TurnResponse(message=GREETING, replies=_category_intro_replies(facets), step="intent")
