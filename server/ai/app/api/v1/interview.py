from fastapi import APIRouter, Depends

from app.core.security import verify_service_token
from app.models.schemas import (
    AiInterviewTurnRequest,
    AiInterviewTurnResponse,
    InterviewEvaluateRequest,
    InterviewEvaluateResponse,
    InterviewQuestionsRequest,
    InterviewQuestionsResponse,
    NotesSummaryRequest,
    NotesSummaryResponse,
)
from app.services.interview_assistant import (
    evaluate_transcript,
    generate_questions,
    next_turn,
    summarize_notes,
)

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


@router.post("/ai-turn", response_model=AiInterviewTurnResponse)
def ai_turn(
    payload: AiInterviewTurnRequest,
    _: str = Depends(verify_service_token),
) -> AiInterviewTurnResponse:
    """Next question for an AI-conducted interview, given the transcript so far."""
    return next_turn(payload)


@router.post("/evaluate", response_model=InterviewEvaluateResponse)
def evaluate(
    payload: InterviewEvaluateRequest,
    _: str = Depends(verify_service_token),
) -> InterviewEvaluateResponse:
    return evaluate_transcript(payload)
