from fastapi import APIRouter, Depends

from app.core.security import verify_service_token
from app.models.schemas import (
    AssessmentGenerateRequest,
    AssessmentGenerateResponse,
    AssessmentGradeRequest,
    AssessmentGradeResponse,
)
from app.services.assessment import generate_assessment, grade_assessment

router = APIRouter(prefix="/internal/v1/assessment", tags=["assessment"])


@router.post("/generate", response_model=AssessmentGenerateResponse)
def generate(
    payload: AssessmentGenerateRequest,
    _: str = Depends(verify_service_token),
) -> AssessmentGenerateResponse:
    return generate_assessment(payload)


@router.post("/grade", response_model=AssessmentGradeResponse)
def grade(
    payload: AssessmentGradeRequest,
    _: str = Depends(verify_service_token),
) -> AssessmentGradeResponse:
    return grade_assessment(payload)
