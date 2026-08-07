from app.models.schemas import InterviewQuestionsRequest, NotesSummaryRequest


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
