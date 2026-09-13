from fastapi import APIRouter, Depends

from app.core.security import verify_service_token
from app.models.schemas import EvaluationSummaryRequest, EvaluationSummaryResponse
from app.services.evaluation import summarize_evaluation

router = APIRouter(prefix="/internal/v1/evaluation", tags=["evaluation"])


@router.post("/summary", response_model=EvaluationSummaryResponse)
def summary(
    payload: EvaluationSummaryRequest,
    _: str = Depends(verify_service_token),
) -> EvaluationSummaryResponse:
    return summarize_evaluation(payload)
