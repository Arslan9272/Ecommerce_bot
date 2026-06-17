from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import Base, SessionLocal, engine
from .routers import catalogue, sessions, tts
from .seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as db:
        await seed(db)
    yield


app = FastAPI(title="Dukandar AI — Backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(sessions.router)
app.include_router(catalogue.router)
app.include_router(tts.router)


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "tts_configured": bool(settings.eleven_api_key and settings.eleven_voice_id)}
