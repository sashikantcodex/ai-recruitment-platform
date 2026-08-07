from fastapi import APIRouter, Depends

from app.core.security import verify_service_token
from app.models.schemas import (
    InterviewQuestionsRequest,
    InterviewQuestionsResponse,
    NotesSummaryRequest,
    NotesSummaryResponse,
)
from app.services.interview_assistant import generate_questions, summarize_notes

router = APIRouter(prefix="/internal/v1/interview", tags=["interview"])


@router.post("/questions", response_model=InterviewQuestionsResponse)
def questions(
    payload: InterviewQuestionsRequest,
    _: str = Depends(verify_service_token),
) -> InterviewQuestionsResponse:
    return InterviewQuestionsResponse(questions=generate_questions(payload))


@router.post("/notes-summary", response_model=NotesSummaryResponse)
def notes_summary(
    payload: NotesSummaryRequest,
    _: str = Depends(verify_service_token),
) -> NotesSummaryResponse:
    return NotesSummaryResponse(summary=summarize_notes(payload))
