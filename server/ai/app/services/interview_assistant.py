import re

from app.models.schemas import (
    AiInterviewTurnRequest,
    AiInterviewTurnResponse,
    InterviewEvaluateRequest,
    InterviewEvaluateResponse,
    InterviewQuestionsRequest,
    NotesSummaryRequest,
)


def generate_questions(payload: InterviewQuestionsRequest) -> list[str]:
    skills = payload.skills or ["problem solving"]
    skill_qs = [f"Describe a production system you built using {s}." for s in skills[:5]]
    base = [
        "Walk me through a challenging debugging story from your last role.",
        "How do you approach system design for high traffic APIs?",
        "How do you ensure code quality and testing in a fast-paced team?",
        "Tell me about a time you disagreed with a stakeholder and how you resolved it.",
        "What would you improve first in our hiring/ATS product based on the JD?",
    ]
    # Aim for ~10 questions as in the prompt example.
    questions = (skill_qs + base)[:10]
    while len(questions) < 10:
        questions.append(f"Follow-up: how does this JD skill '{skills[0]}' show up in your work?")
    return questions


def summarize_notes(payload: NotesSummaryRequest) -> str:
    notes = payload.notes.strip() or "No notes provided."
    q_count = len(payload.questions)
    return (
        f"Interview summary ({q_count} planned questions): "
        f"{notes[:500]}"
        + ("…" if len(notes) > 500 else "")
    )


# --- AI-conducted interview ---------------------------------------------

_SHALLOW_ANSWER_WORDS = 25


def _words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9+#.]+", text)


def next_turn(payload: AiInterviewTurnRequest) -> AiInterviewTurnResponse:
    """Pick the next question: probe a thin answer, else advance the plan."""
    turn_index = len(payload.transcript)
    plan = payload.plannedQuestions or generate_questions(
        InterviewQuestionsRequest(jdText=payload.jdText, skills=payload.skills)
    )

    if turn_index >= min(payload.maxQuestions, len(plan)):
        return AiInterviewTurnResponse(question="", isFinal=True, turnIndex=turn_index)

    last = payload.transcript[-1] if payload.transcript else None
    if last and last.answer and len(_words(last.answer)) < _SHALLOW_ANSWER_WORDS:
        # Follow up in place rather than burning a planned question on a thin answer.
        return AiInterviewTurnResponse(
            question=(
                "Can you go deeper on that — what specifically did you do, "
                "what was the outcome, and what would you change now?"
            ),
            isFinal=False,
            turnIndex=turn_index,
        )

    return AiInterviewTurnResponse(
        question=plan[turn_index],
        isFinal=turn_index + 1 >= min(payload.maxQuestions, len(plan)),
        turnIndex=turn_index,
    )


def _clamp_score(value: float) -> float:
    return round(max(0.0, min(5.0, value)), 2)


def evaluate_transcript(payload: InterviewEvaluateRequest) -> InterviewEvaluateResponse:
    answered = [t for t in payload.transcript if t.answer.strip()]
    if not answered:
        return InterviewEvaluateResponse(
            technical=0,
            communication=0,
            culture=0,
            recommendation="no",
            concerns=["No answers were recorded for this interview."],
            summary="Interview produced no evaluable answers.",
        )

    all_words = [w for t in answered for w in _words(t.answer)]
    avg_len = len(all_words) / len(answered)
    lowered = " ".join(w.lower() for w in all_words)

    skill_hits = [s for s in payload.skills if s and s.lower() in lowered]
    skill_coverage = len(skill_hits) / len(payload.skills) if payload.skills else 0.5

    technical = _clamp_score(1 + skill_coverage * 3 + min(avg_len / 120, 1))
    communication = _clamp_score(1.5 + min(avg_len / 90, 2) + (0.5 if len(answered) >= 4 else 0))
    culture_signals = ("team", "collaborat", "mentor", "stakeholder", "ownership", "feedback")
    culture = _clamp_score(2 + sum(1 for s in culture_signals if s in lowered) * 0.5)

    overall = (technical + communication + culture) / 3
    if overall >= 4.2:
        recommendation = "strong_yes"
    elif overall >= 3.2:
        recommendation = "yes"
    elif overall >= 2.2:
        recommendation = "no"
    else:
        recommendation = "strong_no"

    strengths: list[str] = []
    if skill_hits:
        strengths.append(f"Demonstrated required skills: {', '.join(skill_hits[:5])}.")
    if avg_len >= 80:
        strengths.append("Answers were detailed and well structured.")
    if culture >= 3.5:
        strengths.append("Strong collaboration and ownership signals.")

    concerns: list[str] = []
    missing = [s for s in payload.skills if s not in skill_hits]
    if missing:
        concerns.append(f"No evidence given for: {', '.join(missing[:5])}.")
    if avg_len < 40:
        concerns.append("Answers were short; depth was hard to assess.")
    if len(answered) < 4:
        concerns.append("Few answers recorded; limited evaluation sample.")

    return InterviewEvaluateResponse(
        technical=technical,
        communication=communication,
        culture=culture,
        recommendation=recommendation,
        strengths=strengths,
        concerns=concerns,
        summary=(
            f"Evaluated {len(answered)} answer(s) averaging {avg_len:.0f} words. "
            f"Technical {technical}/5, communication {communication}/5, culture {culture}/5."
        ),
    )
