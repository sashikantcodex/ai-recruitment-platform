from fastapi import APIRouter, Depends

from app.core.security import verify_service_token
from app.models.schemas import ScoreRequest, ScoreResult
from app.services.scorer import score_candidate

router = APIRouter(prefix="/internal/v1", tags=["score"])


@router.post("/score", response_model=ScoreResult)
def score(
    payload: ScoreRequest,
    _: str = Depends(verify_service_token),
) -> ScoreResult:
    return score_candidate(payload.jdText, payload.parsedResume)
