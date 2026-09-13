from fastapi import APIRouter, Depends

from app.core.security import verify_service_token
from app.models.schemas import (
    OutreachRequest,
    OutreachResponse,
    SourcingMatchRequest,
    SourcingMatchResponse,
)
from app.services.sourcing import draft_outreach, match_candidates

router = APIRouter(prefix="/internal/v1/sourcing", tags=["sourcing"])


@router.post("/match", response_model=SourcingMatchResponse)
def match(
    payload: SourcingMatchRequest,
    _: str = Depends(verify_service_token),
) -> SourcingMatchResponse:
    return match_candidates(payload)


@router.post("/outreach", response_model=OutreachResponse)
def outreach(
    payload: OutreachRequest,
    _: str = Depends(verify_service_token),
) -> OutreachResponse:
    return draft_outreach(payload)
