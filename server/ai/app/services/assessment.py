"""Assessment generation and grading.

MCQ answers grade deterministically; free-text and code answers get a
keyword-overlap heuristic in mock mode so the pipeline never blocks on a human.
"""

import re

from app.models.schemas import (
    AssessmentAnswer,
    AssessmentGenerateRequest,
    AssessmentGenerateResponse,
    AssessmentGradeRequest,
    AssessmentGradeResponse,
    AssessmentQuestion,
    GradedQuestion,
)

_DIFFICULTY_MINUTES = {"easy": 30, "medium": 45, "hard": 60}
_DIFFICULTY_PASS = {"easy": 50.0, "medium": 60.0, "hard": 70.0}


def _mcq_for_skill(skill: str, difficulty: str) -> AssessmentQuestion:
    options = [
        f"It is the primary tool for {skill} in production systems",
        f"It has no practical relationship to {skill}",
        f"It only applies to {skill} during local development",
        f"It was deprecated and replaced entirely in {skill}",
    ]
    return AssessmentQuestion(
        prompt=f"Which statement best describes how {skill} is applied on a production team?",
        type="mcq",
        options=options,
        correctIndex=0,
        weight=1 if difficulty != "hard" else 1.5,
        skill=skill,
    )


def _short_for_skill(skill: str) -> AssessmentQuestion:
    return AssessmentQuestion(
        prompt=f"Describe a trade-off you have made when working with {skill}, and why.",
        type="short",
        expected=f"{skill} trade-off performance maintainability testing scale",
        weight=2,
        skill=skill,
    )


def _code_for_skill(skill: str) -> AssessmentQuestion:
    return AssessmentQuestion(
        prompt=(
            f"Write a short function (any language) that demonstrates idiomatic {skill} "
            "usage, including error handling."
        ),
        type="code",
        expected="function return error handling test input validate",
        weight=3,
        skill=skill,
    )


def generate_assessment(payload: AssessmentGenerateRequest) -> AssessmentGenerateResponse:
    skills = payload.skills or ["problem solving", "communication"]
    questions: list[AssessmentQuestion] = []

    for index, skill in enumerate(skills):
        if len(questions) >= payload.numQuestions:
            break
        questions.append(_mcq_for_skill(skill, payload.difficulty))
        if index == 0 and len(questions) < payload.numQuestions:
            questions.append(_short_for_skill(skill))
        if index == 1 and len(questions) < payload.numQuestions:
            questions.append(_code_for_skill(skill))

    # Top up with generic MCQs when the JD listed few skills.
    filler = 0
    while len(questions) < payload.numQuestions:
        questions.append(_mcq_for_skill(skills[filler % len(skills)], payload.difficulty))
        filler += 1

    return AssessmentGenerateResponse(
        title=f"{payload.jobTitle} screening assessment",
        durationMinutes=_DIFFICULTY_MINUTES.get(payload.difficulty, 45),
        passingScore=_DIFFICULTY_PASS.get(payload.difficulty, 60.0),
        questions=questions[: payload.numQuestions],
    )


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9+#.]{3,}", text.lower())}


def _grade_free_text(question: AssessmentQuestion, answer: str) -> tuple[float, str]:
    """Fraction of the question weight earned, plus feedback."""
    given = _tokens(answer)
    if not given:
        return 0.0, "No answer submitted."

    expected = _tokens(question.expected) or _tokens(question.prompt)
    overlap = len(given & expected) / len(expected) if expected else 0.0
    # Reward substantive answers even when vocabulary differs from the rubric.
    depth = min(len(given) / 40, 1.0)
    fraction = min(0.6 * overlap + 0.4 * depth, 1.0)
    return round(fraction, 4), (
        f"Covered {len(given & expected)} of {len(expected)} rubric concepts "
        f"in {len(given)} distinct terms."
    )


def grade_assessment(payload: AssessmentGradeRequest) -> AssessmentGradeResponse:
    by_index: dict[int, AssessmentAnswer] = {a.questionIndex: a for a in payload.answers}
    graded: list[GradedQuestion] = []
    total_weight = 0.0
    total_awarded = 0.0

    for index, question in enumerate(payload.questions):
        weight = question.weight or 1
        total_weight += weight
        answer = by_index.get(index)

        if answer is None:
            graded.append(
                GradedQuestion(
                    questionIndex=index,
                    awarded=0,
                    max=weight,
                    correct=False,
                    feedback="Unanswered.",
                )
            )
            continue

        if question.type == "mcq":
            correct = (
                question.correctIndex is not None
                and answer.selectedIndex == question.correctIndex
            )
            awarded = weight if correct else 0.0
            feedback = "Correct." if correct else "Incorrect option selected."
        else:
            fraction, feedback = _grade_free_text(question, answer.response)
            awarded = round(weight * fraction, 4)
            correct = fraction >= 0.6

        total_awarded += awarded
        graded.append(
            GradedQuestion(
                questionIndex=index,
                awarded=awarded,
                max=weight,
                correct=correct,
                feedback=feedback,
            )
        )

    score = round((total_awarded / total_weight) * 100, 2) if total_weight else 0.0
    answered = sum(1 for g in graded if g.awarded > 0)
    return AssessmentGradeResponse(
        score=score,
        perQuestion=graded,
        summary=(
            f"Scored {score}% across {len(payload.questions)} question(s); "
            f"{answered} earned credit."
        ),
    )
