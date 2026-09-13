"""Candidate sourcing: match a talent pool against a JD and draft outreach."""

import re

from app.models.schemas import (
    OutreachRequest,
    OutreachResponse,
    SourcingCandidate,
    SourcingMatch,
    SourcingMatchRequest,
    SourcingMatchResponse,
)


def _normalize(skill: str) -> str:
    return re.sub(r"[^a-z0-9+#.]", "", skill.lower())


def _jd_skills(payload: SourcingMatchRequest) -> dict[str, str]:
    """Required skills keyed by normalized form → original label."""
    required = {_normalize(s): s for s in payload.skills if _normalize(s)}
    if required:
        return required
    # Fall back to salient tokens from the JD body when no skills were tagged.
    tokens = re.findall(r"[A-Za-z+#.]{3,}", payload.jdText)
    return {_normalize(t): t for t in tokens[:40] if _normalize(t)}


def _match_one(
    candidate: SourcingCandidate,
    required: dict[str, str],
    location: str,
) -> SourcingMatch:
    have = {_normalize(s): s for s in candidate.skills if _normalize(s)}
    matched = [orig for norm, orig in have.items() if norm in required]
    missing = [label for norm, label in required.items() if norm not in have]

    coverage = len(matched) / len(required) if required else 0.0
    score = coverage * 80
    # Seniority and location are soft signals on top of skill coverage.
    score += min(candidate.totalYears, 10) * 1.5
    if location and candidate.location:
        if _normalize(location) == _normalize(candidate.location):
            score += 5
    score = round(min(score, 100.0), 2)

    return SourcingMatch(
        candidateId=candidate.candidateId,
        name=candidate.name,
        score=score,
        matchedSkills=matched,
        missingSkills=missing,
        rationale=(
            f"Covers {len(matched)}/{len(required)} required skills"
            f" with ~{candidate.totalYears:g} years experience."
        ),
    )


def match_candidates(payload: SourcingMatchRequest) -> SourcingMatchResponse:
    required = _jd_skills(payload)
    matches = [_match_one(c, required, payload.location) for c in payload.candidates]
    matches.sort(key=lambda m: m.score, reverse=True)
    return SourcingMatchResponse(matches=matches)


def draft_outreach(payload: OutreachRequest) -> OutreachResponse:
    skills = ", ".join(payload.matchedSkills[:4]) or "your background"
    apply_line = f"\n\nApply here: {payload.applyUrl}" if payload.applyUrl else ""
    return OutreachResponse(
        subject=f"{payload.jobTitle} at {payload.company} — a fit for your {skills} work?",
        body=(
            f"Hi {payload.candidateName},\n\n"
            f"I'm hiring for {payload.jobTitle} at {payload.company}. "
            f"Your experience with {skills} lines up closely with what the team needs.\n\n"
            "Would you be open to a short intro call this week? Happy to share the "
            "role scope, team structure and compensation band up front."
            f"{apply_line}\n\nBest,\nTalent Team"
        ),
    )
