import json
import re

from fastapi import HTTPException, status
from openai import OpenAI

from app.config import settings
from app.models.schemas import ParsedResume, ScoreResult


def _normalize(skill: str) -> str:
    return re.sub(r"[^a-z0-9+#.]", "", skill.lower())


def _mock_score(jd_text: str, parsed: ParsedResume) -> ScoreResult:
    jd_skills = {
        _normalize(token)
        for token in re.findall(r"[A-Za-z+#.]{2,}", jd_text)
        if len(token) > 2
    }
    resume_skills = {_normalize(s): s for s in parsed.skills}

    matched = [orig for norm, orig in resume_skills.items() if norm in jd_skills]
    # Prefer common tech tokens present in JD but missing in resume
    interesting = {
        "python",
        "javascript",
        "typescript",
        "nodejs",
        "node.js",
        "react",
        "mongodb",
        "express",
        "aws",
        "docker",
        "fastapi",
        "sql",
    }
    missing = sorted(
        {
            token
            for token in interesting
            if token in jd_skills and token not in resume_skills
        }
    )

    if not matched and not missing:
        score = 55.0
        rationale = "Mock scoring: limited skill overlap signals; assigned baseline score."
    else:
        denom = max(len(matched) + len(missing), 1)
        score = round((len(matched) / denom) * 100, 2)
        rationale = (
            f"Mock scoring: matched {len(matched)} skill(s), "
            f"missing {len(missing)} skill(s)."
        )

    return ScoreResult(
        score=score,
        matchedSkills=matched,
        missingSkills=missing,
        rationale=rationale,
    )


def _openai_score(jd_text: str, parsed: ParsedResume) -> ScoreResult:
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY is not configured",
        )

    client = OpenAI(api_key=settings.openai_api_key)
    prompt = f"""
Score candidate fit for the job. Return JSON with keys:
score (0-100 number), matchedSkills (string[]), missingSkills (string[]), rationale (string).

Job description:
\"\"\"{jd_text[:8000]}\"\"\"

Parsed resume JSON:
{parsed.model_dump_json()}
"""
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": "You score candidates. Return valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    content = response.choices[0].message.content or "{}"
    data = json.loads(content)
    return ScoreResult.model_validate(data)


def score_candidate(jd_text: str, parsed: ParsedResume) -> ScoreResult:
    if settings.ai_mode.lower() == "openai":
        return _openai_score(jd_text, parsed)
    return _mock_score(jd_text, parsed)
