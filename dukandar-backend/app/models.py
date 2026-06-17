import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _id() -> str:
    return uuid.uuid4().hex


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    name: Mapped[str] = mapped_column(String)
    plan: Mapped[str] = mapped_column(String, default="growth")
    status: Mapped[str] = mapped_column(String, default="active")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=_now)

    products: Mapped[list["Product"]] = relationship(back_populates="merchant", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String, index=True)
    subtype: Mapped[str] = mapped_column(String, default="", index=True)   # kind/style, e.g. "Formal"
    color: Mapped[str] = mapped_column(String, default="", index=True)
    fabric: Mapped[str] = mapped_column(String, default="")
    price: Mapped[int] = mapped_column(Integer)
    compare_at: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sizes: Mapped[list] = mapped_column(JSON, default=list)   # JSONB on Postgres in prod
    stock: Mapped[int] = mapped_column(Integer, default=0)
    sale: Mapped[bool] = mapped_column(Boolean, default=False)
    hot: Mapped[bool] = mapped_column(Boolean, default=False)
    tone: Mapped[str] = mapped_column(String, default="#5B2A4E")
    image: Mapped[str] = mapped_column(String, default="")
    attrs: Mapped[dict] = mapped_column(JSON, default=dict)

    merchant: Mapped["Merchant"] = relationship(back_populates="products")


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    started_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=_now)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    step: Mapped[str] = mapped_column(String, default="intent")
    slots: Mapped[dict] = mapped_column(JSON, default=dict)
    outcome: Mapped[str | None] = mapped_column(String, nullable=True)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    type: Mapped[str] = mapped_column(String)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    ts: Mapped[datetime.datetime] = mapped_column(DateTime, default=_now)
