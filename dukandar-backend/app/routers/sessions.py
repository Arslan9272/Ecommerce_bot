from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from .. import service
from ..db import get_db
from ..schemas import SessionStartRequest, SessionStartResponse, TurnRequest, TurnResponse

router = APIRouter(prefix="/v1", tags=["session"])


@router.post("/session", response_model=SessionStartResponse)
async def start_session(req: SessionStartRequest, db: AsyncSession = Depends(get_db)) -> SessionStartResponse:
    return await service.start_session(db, req)


@router.post("/turn", response_model=TurnResponse)
async def turn(req: TurnRequest, db: AsyncSession = Depends(get_db)) -> TurnResponse:
    try:
        return await service.handle_turn(db, req)
    except KeyError:
        raise HTTPException(status_code=404, detail="session not found")
