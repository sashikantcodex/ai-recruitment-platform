from fastapi import APIRouter, Body, Depends

from app.core.security import verify_service_token
from app.models.schemas import AgentRunResponse
from app.services.agents import run_hr_agent, run_interview_agent, run_recruiter_agent

router = APIRouter(prefix="/internal/v1/agents", tags=["agents"])


@router.post("/recruiter/run", response_model=AgentRunResponse)
def recruiter(
    payload: dict = Body(default_factory=dict),
    _: str = Depends(verify_service_token),
) -> AgentRunResponse:
    return run_recruiter_agent(payload)


@router.post("/interview/run", response_model=AgentRunResponse)
def interview(
    payload: dict = Body(default_factory=dict),
    _: str = Depends(verify_service_token),
) -> AgentRunResponse:
    return run_interview_agent(payload)


@router.post("/hr/run", response_model=AgentRunResponse)
def hr(
    payload: dict = Body(default_factory=dict),
    _: str = Depends(verify_service_token),
) -> AgentRunResponse:
    return run_hr_agent(payload)
