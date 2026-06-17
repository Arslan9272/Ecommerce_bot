"""Catalogue querying: filtering, pagination, faceting, ranking.

Runs in Python over the merchant's product rows (the demo catalogue is ~120 items, so this
is both fast and fully DB-portable — identical behaviour on Postgres and the SQLite test DB).
Both the REST catalogue endpoints and the bot's conversational flow share this one code path,
so what the grid shows and what Saathi finds can never drift apart.
"""
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Product
from .schemas import FacetValue, ProductOut

# Price bands, low..high inclusive. Order matters (shown in this order).
PRICE_BANDS: list[tuple[str, int, int]] = [
    ("Under Rs 2,000", 0, 1999),
    ("Rs 2,000–4,000", 2000, 4000),
    ("Rs 4,000–6,000", 4001, 6000),
    ("Rs 6,000+", 6001, 10**9),
]
SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "One"]


async def all_products(db: AsyncSession, merchant_id: str) -> list[Product]:
    return list((await db.execute(
        select(Product).where(Product.merchant_id == merchant_id)
    )).scalars().all())


def band_bounds(label: str) -> tuple[int, int] | None:
    for name, lo, hi in PRICE_BANDS:
        if name == label:
            return lo, hi
    return None


def matches(p: Product, *, q: str | None = None, category: str | None = None,
            subtype: str | None = None, color: str | None = None, size: str | None = None,
            sale: bool | None = None, price_min: int | None = None,
            price_max: int | None = None) -> bool:
    if q:
        hay = f"{p.name} {p.category} {p.subtype} {p.color} {p.fabric}".lower()
        if q.lower() not in hay:
            return False
    if category and p.category != category:
        return False
    if subtype and p.subtype != subtype:
        return False
    if color and p.color != color:
        return False
    if size and size != "Any" and size not in (p.sizes or []):
        return False
    if sale and not p.sale:
        return False
    if price_min is not None and p.price < price_min:
        return False
    if price_max is not None and p.price > price_max:
        return False
    return True


def apply_filters(rows: Iterable[Product], **f) -> list[Product]:
    return [p for p in rows if matches(p, **f)]


def rank(rows: list[Product]) -> list[Product]:
    # in-stock first, then sale/hot, then cheaper
    return sorted(rows, key=lambda p: (p.stock <= 0, not (p.sale or p.hot), p.price))


def paginate(rows: list[Product], page: int, page_size: int) -> tuple[list[Product], int, int]:
    total = len(rows)
    pages = max(1, (total + page_size - 1) // page_size)
    page = max(1, min(page, pages))
    start = (page - 1) * page_size
    return rows[start:start + page_size], total, pages


def to_out(p: Product) -> ProductOut:
    return ProductOut(
        id=p.id, name=p.name, category=p.category, subtype=p.subtype or "", color=p.color or "",
        fabric=p.fabric or "", price=p.price, compare_at=p.compare_at, sizes=p.sizes or [],
        sale=p.sale, hot=p.hot, tone=p.tone, image=p.image or "",
    )


def _counts(rows: list[Product], key) -> list[FacetValue]:
    seen: dict[str, int] = {}
    for p in rows:
        v = key(p)
        if not v:
            continue
        seen[v] = seen.get(v, 0) + 1
    return [FacetValue(value=v, count=c) for v, c in sorted(seen.items(), key=lambda kv: -kv[1])]


def _size_counts(rows: list[Product]) -> list[FacetValue]:
    seen: dict[str, int] = {}
    for p in rows:
        for s in (p.sizes or []):
            seen[s] = seen.get(s, 0) + 1
    ordered = sorted(seen.items(), key=lambda kv: SIZE_ORDER.index(kv[0]) if kv[0] in SIZE_ORDER else 99)
    return [FacetValue(value=v, count=c) for v, c in ordered]


def _price_band_counts(rows: list[Product]) -> list[FacetValue]:
    out: list[FacetValue] = []
    for name, lo, hi in PRICE_BANDS:
        c = sum(1 for p in rows if lo <= p.price <= hi)
        if c:
            out.append(FacetValue(value=name, count=c))
    return out


def compute_facets(rows: list[Product]) -> dict:
    """Available next-step options for the *already filtered* set of rows."""
    return {
        "total": len(rows),
        "categories": _counts(rows, lambda p: p.category),
        "subtypes": _counts(rows, lambda p: p.subtype),
        "colors": _counts(rows, lambda p: p.color),
        "sizes": _size_counts(rows),
        "price_bands": _price_band_counts(rows),
    }
