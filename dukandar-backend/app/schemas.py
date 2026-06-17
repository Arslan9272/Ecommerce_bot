from typing import Any

from pydantic import BaseModel


class SlotIn(BaseModel):
    name: str          # category | subtype | color | size | price | saleOnly | reset
    value: Any = None


class Reply(BaseModel):
    label: str
    slot: SlotIn | None = None


class ProductOut(BaseModel):
    id: str
    name: str
    category: str
    subtype: str = ""
    color: str = ""
    fabric: str = ""
    price: int
    compare_at: int | None = None
    sizes: list[str]
    sale: bool
    hot: bool
    tone: str
    image: str = ""


class CataloguePage(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int
    pages: int


class FacetValue(BaseModel):
    value: str
    count: int


class FacetsOut(BaseModel):
    total: int
    categories: list[FacetValue] = []
    subtypes: list[FacetValue] = []
    colors: list[FacetValue] = []
    sizes: list[FacetValue] = []
    price_bands: list[FacetValue] = []


class SessionStartRequest(BaseModel):
    merchant_id: str = "demo"


class SessionStartResponse(BaseModel):
    session_id: str
    message: str
    replies: list[Reply]
    step: str


class TurnRequest(BaseModel):
    session_id: str
    input: str | None = None     # free text
    slot: SlotIn | None = None   # tapped quick-reply


class TurnResponse(BaseModel):
    message: str
    replies: list[Reply] = []
    products: list[ProductOut] = []
    step: str
    done: bool = False
    slots: dict = {}   # resolved filter state, so the storefront grid can mirror the bot


class CatalogueItemIn(BaseModel):
    name: str
    category: str
    subtype: str = ""
    color: str = ""
    fabric: str = ""
    price: int
    compare_at: int | None = None
    sizes: list[str] = []
    stock: int = 0
    sale: bool = False
    hot: bool = False
    image: str = ""
    attrs: dict = {}


class AnalyticsOut(BaseModel):
    sessions: int
    completed: int
    completion_rate: float
    results_shown: int
    item_clicks: int


class TTSRequest(BaseModel):
    text: str
    lang: str = "ur-PK"
