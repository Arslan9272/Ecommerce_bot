from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import query
from ..db import get_db
from ..models import Event, Product, Session
from ..schemas import AnalyticsOut, CatalogueItemIn, CataloguePage, FacetsOut, ProductOut

router = APIRouter(prefix="/v1/merchant", tags=["catalogue"])


@router.get("/{merchant_id}/catalogue", response_model=CataloguePage)
async def list_catalogue(
    merchant_id: str,
    q: str | None = None,
    category: str | None = None,
    subtype: str | None = None,
    color: str | None = None,
    size: str | None = None,
    sale: bool | None = None,
    price_band: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> CataloguePage:
    rows = await query.all_products(db, merchant_id)
    pmin = pmax = None
    if price_band and (b := query.band_bounds(price_band)):
        pmin, pmax = b
    filtered = query.rank(query.apply_filters(
        rows, q=q, category=category, subtype=subtype, color=color, size=size,
        sale=sale, price_min=pmin, price_max=pmax,
    ))
    items, total, pages = query.paginate(filtered, page, page_size)
    return CataloguePage(
        items=[query.to_out(p) for p in items], total=total, page=page,
        page_size=page_size, pages=pages,
    )


@router.get("/{merchant_id}/product/{product_id}", response_model=ProductOut)
async def get_product(merchant_id: str, product_id: str, db: AsyncSession = Depends(get_db)) -> ProductOut:
    p = await db.get(Product, product_id)
    if p is None or p.merchant_id != merchant_id:
        raise HTTPException(404, "product not found")
    return query.to_out(p)


@router.get("/{merchant_id}/facets", response_model=FacetsOut)
async def facets(
    merchant_id: str,
    q: str | None = None,
    category: str | None = None,
    subtype: str | None = None,
    color: str | None = None,
    size: str | None = None,
    sale: bool | None = None,
    price_band: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> FacetsOut:
    rows = await query.all_products(db, merchant_id)
    pmin = pmax = None
    if price_band and (b := query.band_bounds(price_band)):
        pmin, pmax = b
    filtered = query.apply_filters(
        rows, q=q, category=category, subtype=subtype, color=color, size=size,
        sale=sale, price_min=pmin, price_max=pmax,
    )
    return FacetsOut(**query.compute_facets(filtered))


@router.post("/{merchant_id}/catalogue/sync")
async def sync_catalogue(merchant_id: str, items: list[CatalogueItemIn], db: AsyncSession = Depends(get_db)) -> dict:
    # naive replace-all sync (production: upsert by external id + validation report)
    existing = (await db.execute(select(Product).where(Product.merchant_id == merchant_id))).scalars().all()
    for p in existing:
        await db.delete(p)
    for it in items:
        db.add(Product(merchant_id=merchant_id, name=it.name, category=it.category, subtype=it.subtype,
                       color=it.color, fabric=it.fabric, price=it.price, compare_at=it.compare_at,
                       sizes=it.sizes, stock=it.stock, sale=it.sale, hot=it.hot,
                       image=it.image, attrs=it.attrs))
    await db.commit()
    return {"imported": len(items)}


@router.get("/{merchant_id}/analytics", response_model=AnalyticsOut)
async def analytics(merchant_id: str, db: AsyncSession = Depends(get_db)) -> AnalyticsOut:
    total = (await db.execute(select(func.count()).select_from(Session).where(Session.merchant_id == merchant_id))).scalar() or 0
    completed = (await db.execute(select(func.count()).select_from(Session).where(
        Session.merchant_id == merchant_id, Session.completed == True))).scalar() or 0  # noqa: E712
    results_shown = (await db.execute(select(func.count()).select_from(Event).join(
        Session, Event.session_id == Session.id).where(
        Session.merchant_id == merchant_id, Event.type == "results_shown"))).scalar() or 0
    clicks = (await db.execute(select(func.count()).select_from(Event).join(
        Session, Event.session_id == Session.id).where(
        Session.merchant_id == merchant_id, Event.type == "item_click"))).scalar() or 0
    rate = round(completed / total, 3) if total else 0.0
    return AnalyticsOut(sessions=total, completed=completed, completion_rate=rate,
                        results_shown=results_shown, item_clicks=clicks)
