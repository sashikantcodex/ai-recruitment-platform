"""Consolidated candidate evaluation.

Blends the AI screening score, the assessment score and every interview
scorecard into one 0-100 number and a hire / hold / reject call.
"""

from app.models.schemas import EvaluationSummaryRequest, EvaluationSummaryResponse

# Relative pull of each signal when all three are present.
WEIGHTS = {"screening": 0.25, "assessment": 0.3, "interview": 0.45}

HIRE_THRESHOLD = 75.0
HOLD_THRESHOLD = 55.0


def _interview_percent(payload: EvaluationSummaryRequest) -> float | None:
    if not payload.interviews:
        return None
    totals = [
        (i.technical + i.communication + i.culture) / 3 for i in payload.interviews
    ]
    return round((sum(totals) / len(totals)) / 5 * 100, 2)


def summarize_evaluation(payload: EvaluationSummaryRequest) -> EvaluationSummaryResponse:
    signals: dict[str, float] = {}
    if payload.screeningScore is not None:
        signals["screening"] = payload.screeningScore
    if payload.assessmentScore is not None:
        signals["assessment"] = payload.assessmentScore
    interview = _interview_percent(payload)
    if interview is not None:
        signals["interview"] = interview

    if not signals:
        return EvaluationSummaryResponse(
            overallScore=0,
            recommendation="hold",
            concerns=["No screening, assessment or interview signal recorded yet."],
            summary="Not enough evidence to evaluate this candidate.",
        )

    # Re-normalize so a missing signal does not silently drag the score down.
    weight_total = sum(WEIGHTS[key] for key in signals)
    overall = round(
        sum(value * WEIGHTS[key] for key, value in signals.items()) / weight_total, 2
    )

    if overall >= HIRE_THRESHOLD:
        recommendation = "hire"
    elif overall >= HOLD_THRESHOLD:
        recommendation = "hold"
    else:
        recommendation = "reject"

    strengths = [f"{key.capitalize()} score {value}%." for key, value in signals.items() if value >= 70]
    if payload.matchedSkills:
        strengths.append(f"Matches required skills: {', '.join(payload.matchedSkills[:6])}.")

    concerns = [f"{key.capitalize()} score {value}%." for key, value in signals.items() if value < 55]
    if payload.missingSkills:
        concerns.append(f"Gaps against the JD: {', '.join(payload.missingSkills[:6])}.")
    for key in WEIGHTS:
        if key not in signals:
            concerns.append(f"No {key} signal recorded.")

    negatives = sum(1 for i in payload.interviews if i.recommendation in ("no", "strong_no"))
    if negatives:
        concerns.append(f"{negatives} interviewer(s) recommended against hiring.")

    return EvaluationSummaryResponse(
        overallScore=overall,
        recommendation=recommendation,
        strengths=strengths,
        concerns=concerns,
        summary=(
            f"Overall {overall}% for {payload.jobTitle} from "
            f"{', '.join(sorted(signals))} signal(s) → {recommendation}."
        ),
    )
