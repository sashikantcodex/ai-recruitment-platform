from app.models.schemas import AgentRunResponse
from app.services.interview_assistant import generate_questions
from app.services.salary import benchmark_salary
from app.models.schemas import InterviewQuestionsRequest, SalaryBenchmarkRequest


def run_recruiter_agent(payload: dict) -> AgentRunResponse:
    jd = str(payload.get("jdText", "Software Engineer"))
    candidates = payload.get("candidates", [])
    ranked = sorted(
        candidates if isinstance(candidates, list) else [],
        key=lambda c: float(c.get("aiScore", 0) if isinstance(c, dict) else 0),
        reverse=True,
    )
    return AgentRunResponse(
        agent="recruiter",
        status="ok",
        result={
            "action": "source_and_rank",
            "jobFocus": jd[:120],
            "rankedCandidates": ranked[:10],
            "sourcingHints": [
                "Search LinkedIn for matching skills",
                "Re-engage past applicants with similar titles",
            ],
        },
    )


def run_interview_agent(payload: dict) -> AgentRunResponse:
    jd = str(payload.get("jdText", "Role"))
    skills = payload.get("skills") if isinstance(payload.get("skills"), list) else []
    questions = generate_questions(
        InterviewQuestionsRequest(jdText=jd, skills=[str(s) for s in skills])
    )
    return AgentRunResponse(
        agent="interview",
        status="ok",
        result={
            "questions": questions,
            "scorecardTemplate": {
                "technical": 0,
                "communication": 0,
                "culture": 0,
                "recommendation": "yes",
            },
        },
    )


def run_hr_agent(payload: dict) -> AgentRunResponse:
    title = str(payload.get("title", "Software Engineer"))
    bench = benchmark_salary(SalaryBenchmarkRequest(title=title))
    return AgentRunResponse(
        agent="hr",
        status="ok",
        result={
            "offerDraft": {
                "salary": bench.mid,
                "currency": bench.currency,
                "benchmark": bench.model_dump(),
            },
            "onboardingChecklist": [
                "Send offer for e-sign",
                "Collect ID documents",
                "Schedule day-1 orientation",
            ],
        },
    )
