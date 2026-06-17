"""Seed the demo merchant ("Libaas") with 100+ richly-attributed products.

Idempotent: if the merchant already exists we skip, so restarts don't duplicate rows.
Each product carries category + subtype (kind/style) + colour + fabric so the bot can
drill down through facets that actually exist in stock.
"""
import random

from sqlalchemy.ext.asyncio import AsyncSession

from .models import Merchant, Product

TONES = ["#7a3a66", "#5B2A4E", "#9b6a4a", "#6B7A5A", "#3d1b34", "#a8546a", "#4a5d6b", "#b58a3c"]

# Colour -> a representative swatch tone for the card art.
COLOR_TONE = {
    "White": "#cfc7b8", "Black": "#2b2530", "Sky Blue": "#6f9bc4", "Navy": "#2d3a57",
    "Beige": "#b9a07e", "Maroon": "#6e2b35", "Emerald": "#2f6b53", "Mustard": "#c79a2e",
    "Rose Pink": "#c56b86", "Charcoal": "#3b3a40", "Teal": "#2f6f73", "Ivory": "#e6dec9",
    "Rust": "#a8552f", "Plum": "#5B2A4E", "Olive": "#6b7048",
}

SIZE_SETS = [
    ["XS", "S", "M", "L"], ["S", "M", "L", "XL"], ["S", "M", "L"], ["M", "L", "XL"],
    ["XS", "S", "M"], ["S", "M", "L", "XL", "XXL"],
]
ONE_SIZE = ["One"]

# category -> (subtypes, fabrics, base_price_range)
PLAN = {
    "Shirt":          (["Casual", "Formal", "Oversized", "Striped", "Linen"],
                       ["Cotton", "Poplin", "Linen", "Oxford"], (1700, 3200)),
    "Kurta":          (["Embroidered", "Lawn", "Festive", "Block-Print", "Cotton"],
                       ["Lawn", "Cotton", "Silk", "Khaddar"], (1900, 5600)),
    "Pants":          (["Cargo", "Wide-Leg", "Straight", "Culotte", "Palazzo"],
                       ["Denim", "Linen", "Cotton Twill", "Rayon"], (2300, 4200)),
    "Trousers":       (["Formal", "Pleated", "Tapered"],
                       ["Wool-Blend", "Cotton", "Twill"], (2600, 4800)),
    "Dress":          (["Midi", "Maxi", "Wrap", "Slip", "A-Line"],
                       ["Satin", "Lawn", "Chiffon", "Cotton"], (3200, 6200)),
    "Shalwar Kameez": (["Cotton", "Embroidered", "Printed"],
                       ["Lawn", "Cotton", "Khaddar"], (2800, 6800)),
    "Saree":          (["Silk", "Georgette", "Banarsi"],
                       ["Silk", "Georgette", "Chiffon"], (4500, 9800)),
    "Abaya":          (["Plain", "Embellished", "Open"],
                       ["Nida", "Crepe", "Georgette"], (3500, 7200)),
    "Waistcoat":      (["Formal", "Festive"],
                       ["Wool-Blend", "Jamawar"], (2200, 4600)),
    "Dupatta":        (["Chiffon", "Gota", "Bandhani", "Net", "Silk"],
                       ["Chiffon", "Net", "Silk", "Organza"], (1100, 2400)),
}

# category -> a search keyword for the stock photo source (loremflickr returns a real,
# stable-by-"lock" Flickr photo; the frontend falls back to an SVG if an image fails to load).
IMG_KEYWORD = {
    "Shirt": "shirt", "Kurta": "kurta", "Pants": "trousers", "Trousers": "trousers",
    "Dress": "dress", "Shalwar Kameez": "fashion,clothing", "Saree": "saree",
    "Abaya": "abaya", "Waistcoat": "waistcoat", "Dupatta": "scarf",
}


def _image(category: str, lock: int) -> str:
    kw = IMG_KEYWORD.get(category, "clothing")
    return f"https://loremflickr.com/600/750/{kw}?lock={lock}"


NAME_PREFIX = {
    "Casual": "Easy", "Formal": "Tailored", "Oversized": "Boxy", "Striped": "Striped",
    "Linen": "Breezy", "Embroidered": "Embroidered", "Lawn": "Summer", "Festive": "Festive",
    "Block-Print": "Block-Print", "Cotton": "Everyday", "Cargo": "Utility", "Wide-Leg": "Wide-Leg",
    "Straight": "Straight", "Culotte": "Pleated", "Palazzo": "Flowy", "Pleated": "Pleated",
    "Tapered": "Slim", "Midi": "Midi", "Maxi": "Maxi", "Wrap": "Wrap", "Slip": "Slip",
    "A-Line": "A-Line", "Printed": "Printed", "Silk": "Silk", "Georgette": "Georgette",
    "Banarsi": "Banarsi", "Plain": "Classic", "Embellished": "Embellished", "Open": "Open-Front",
    "Gota": "Gota", "Bandhani": "Bandhani", "Net": "Net",
}


def _price(rng: tuple[int, int], rnd: random.Random) -> int:
    lo, hi = rng
    return int(round(rnd.randint(lo, hi) / 100) * 100) - 10  # ...90 endings


def _build() -> list[dict]:
    rnd = random.Random(2026)  # deterministic seed -> stable catalogue across restarts
    items: list[dict] = []
    colors = list(COLOR_TONE.keys())

    for category, (subtypes, fabrics, rng) in PLAN.items():
        is_accessory = category == "Dupatta"
        # a colour palette per category so each category has its own set of facets
        palette = rnd.sample(colors, k=6 if is_accessory else 7)
        for subtype in subtypes:
            # 2-4 colourways per (category, subtype) -> rich, realistic facet counts
            for color in rnd.sample(palette, k=rnd.randint(2, 4)):
                price = _price(rng, rnd)
                on_sale = rnd.random() < 0.32
                compare_at = int(price * rnd.uniform(1.15, 1.4) // 10 * 10) if on_sale else None
                fabric = rnd.choice(fabrics)
                sizes = ONE_SIZE if is_accessory else rnd.choice(SIZE_SETS)
                if is_accessory:
                    noun = "Dupatta"
                elif category == "Shalwar Kameez":
                    noun = "Suit"
                else:
                    noun = category.split()[-1]
                name = f"{NAME_PREFIX.get(subtype, subtype)} {color} {noun}".replace("  ", " ").strip()
                items.append({
                    "name": name, "category": category, "subtype": subtype, "color": color,
                    "fabric": fabric, "price": price, "compare_at": compare_at, "sizes": sizes,
                    "stock": rnd.randint(0, 24), "sale": on_sale, "hot": rnd.random() < 0.22,
                    "tone": COLOR_TONE.get(color, rnd.choice(TONES)),
                    "image": _image(category, len(items) + 11),
                })
    return items


ITEMS = _build()


async def seed(db: AsyncSession) -> None:
    existing = await db.get(Merchant, "demo")
    if existing:
        return
    db.add(Merchant(id="demo", name="Libaas", plan="pro", status="active"))
    for it in ITEMS:
        db.add(Product(merchant_id="demo", **it))
    await db.commit()
