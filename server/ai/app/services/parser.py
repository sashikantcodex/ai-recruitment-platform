import json
import re

from fastapi import HTTPException, status
from openai import OpenAI

from app.config import settings
from app.models.schemas import EducationItem, ExperienceItem, ParsedResume
from app.services.text_extract import extract_text

COMMON_SKILLS = [
    "python",
    "javascript",
    "typescript",
    "node.js",
    "nodejs",
    "react",
    "express",
    "mongodb",
    "sql",
    "aws",
    "docker",
    "kubernetes",
    "fastapi",
    "django",
    "flask",
    "java",
    "c++",
    "git",
]


def _mock_parse(text: str) -> ParsedResume:
    lower = text.lower()
    skills = sorted({skill for skill in COMMON_SKILLS if skill in lower})
    # normalize nodejs -> Node.js style labels
    normalized = []
    for skill in skills:
        if skill in {"nodejs", "node.js"}:
            label = "Node.js"
        else:
            label = skill.title() if skill not in {"aws", "sql", "c++"} else skill.upper()
        if label not in normalized:
            normalized.append(label)

    years_match = re.search(r"(\d+)\s*\+?\s*years?", lower)
    total_years = float(years_match.group(1)) if years_match else 0.0

    summary = " ".join(text.split())[:280] or "Resume parsed in mock mode."

    return ParsedResume(
        summary=summary,
        skills=normalized or ["Communication"],
        experience=[
            ExperienceItem(
                title="Software Engineer",
                company="Unknown",
                years=total_years or 1,
            )
        ],
        education=[EducationItem(degree="Not specified", institution="Not specified")],
        totalYears=total_years,
    )


def _openai_parse(text: str) -> ParsedResume:
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY is not configured",
        )

    client = OpenAI(api_key=settings.openai_api_key)
    prompt = f"""
Extract structured resume data as JSON with keys:
summary (string), skills (string[]), experience (array of {{title, company, years}}),
education (array of {{degree, institution}}), totalYears (number).

Resume text:
\"\"\"{text[:12000]}\"\"\"
"""
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": "You extract resume data. Return valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    content = response.choices[0].message.content or "{}"
    data = json.loads(content)
    return ParsedResume.model_validate(data)


def parse_resume_file(file_path: str, mime_type: str) -> ParsedResume:
    text = extract_text(file_path, mime_type)
    if not text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract text from resume",
        )

    if settings.ai_mode.lower() == "openai":
        return _openai_parse(text)
    return _mock_parse(text)
