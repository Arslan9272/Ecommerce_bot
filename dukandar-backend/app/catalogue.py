import re
from typing import Iterable

from .models import Product

CATMAP: list[tuple[str, str]] = [
    ("shalwar", "Shalwar Kameez"), ("kameez", "Shalwar Kameez"), ("suit", "Shalwar Kameez"),
    ("waistcoat", "Waistcoat"), ("abaya", "Abaya"), ("saree", "Saree"), ("sari", "Saree"),
    ("trouser", "Trousers"),
    ("pant", "Pants"), ("cargo", "Pants"), ("jean", "Pants"),
    ("denim", "Pants"), ("baggy", "Pants"), ("culotte", "Pants"), ("palazzo", "Pants"),
    ("kurta", "Kurta"), ("shirt", "Shirt"), ("dress", "Dress"), ("dupatta", "Dupatta"),
]
# colour keyword -> canonical catalogue colour
COLORMAP: list[tuple[str, str]] = [
    ("white", "White"), ("black", "Black"), ("sky blue", "Sky Blue"), ("navy", "Navy"),
    ("blue", "Navy"), ("beige", "Beige"), ("maroon", "Maroon"), ("emerald", "Emerald"),
    ("green", "Emerald"), ("mustard", "Mustard"), ("yellow", "Mustard"), ("pink", "Rose Pink"),
    ("rose", "Rose Pink"), ("charcoal", "Charcoal"), ("grey", "Charcoal"), ("gray", "Charcoal"),
    ("teal", "Teal"), ("ivory", "Ivory"), ("cream", "Ivory"), ("rust", "Rust"),
    ("plum", "Plum"), ("purple", "Plum"), ("olive", "Olive"),
]
# subtype/style keyword -> canonical subtype
SUBMAP: list[tuple[str, str]] = [
    ("formal", "Formal"), ("casual", "Casual"), ("oversized", "Oversized"), ("striped", "Striped"),
    ("embroider", "Embroidered"), ("festive", "Festive"), ("block", "Block-Print"),
    ("printed", "Printed"), ("wide", "Wide-Leg"), ("straight", "Straight"), ("pleated", "Pleated"),
    ("tapered", "Tapered"), ("midi", "Midi"), ("maxi", "Maxi"), ("wrap", "Wrap"), ("slip", "Slip"),
    ("silk", "Silk"), ("net", "Net"), ("gota", "Gota"), ("bandhani", "Bandhani"),
]
SHOP_RE = re.compile(r"sale|cheap|budget|size|price|show|pant|cloth|wear|buy|kurta|dress|shirt|trouser|jean|denim|baggy|dupatta|abaya|saree|waistcoat|colou?r|formal|casual|under", re.I)
SIZE_RE = re.compile(r"(?:^|\s)(XS|S|M|L|XL|XXL)(?:\s|$)", re.I)
NUM_RE = re.compile(r"(\d{3,6})")


def parse_text(text: str) -> dict:
    """Extract slot updates from free text (keyword fallback). Returns only keys it found.

    `color`/`subtype` are best-effort guesses; the caller validates them against the live facets.
    """
    out: dict = {}
    low = text.lower()
    for kw, cat in CATMAP:
        if kw in low:
            out["category"] = cat
            break
    for kw, col in COLORMAP:
        if kw in low:
            out["color"] = col
            break
    for kw, sub in SUBMAP:
        if kw in low:
            out["subtype"] = sub
            break
    m = SIZE_RE.search(text)
    if m:
        out["size"] = m.group(1).upper()
    if re.search(r"sale|discount|deal", low):
        out["saleOnly"] = True
    if re.search(r"under|below|less|within|budget|upto|up to", low):
        n = NUM_RE.search(low)
        if n:
            out["budget"] = int(n.group(1))
    return out


def is_shopping(text: str) -> bool:
    return bool(SHOP_RE.search(text) or SIZE_RE.search(text) or NUM_RE.search(text))


def filter_and_rank(products: Iterable[Product], slots: dict) -> list[Product]:
    cat = slots.get("category")
    size = slots.get("size")
    budget = slots.get("budget")
    sale_only = slots.get("saleOnly")

    def ok(p: Product) -> bool:
        if cat and p.category != cat:
            return False
        if size and size != "Any" and size not in (p.sizes or []):
            return False
        if budget and p.price > budget:
            return False
        if sale_only and not p.sale:
            return False
        return True

    matched = [p for p in products if ok(p)]
    # rank: in-stock first, then sale/hot, then cheaper
    matched.sort(key=lambda p: (p.stock <= 0, not (p.sale or p.hot), p.price))
    return matched
