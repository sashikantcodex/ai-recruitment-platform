"""HTTP coverage for every AI microservice route used by Express."""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("AI_SERVICE_TOKEN", "test-token")
os.environ.setdefault("AI_MODE", "mock")

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def headers() -> dict[str, str]:
    return {"X-Service-Token": settings.ai_service_token}


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_parse_and_score(client: TestClient, headers: dict[str, str], tmp_path: Path) -> None:
    resume = tmp_path / "resume.txt"
    resume.write_text("5 years React TypeScript Node.js", encoding="utf-8")

    parsed = client.post(
        "/internal/v1/parse",
        headers=headers,
        json={
            "resumeId": "r1",
            "filePath": str(resume),
            "mimeType": "text/plain",
        },
    )
    assert parsed.status_code == 200
    body = parsed.json()
    assert "skills" in body

    scored = client.post(
        "/internal/v1/score",
        headers=headers,
        json={
            "jobId": "j1",
            "jdText": "React TypeScript engineer",
            "parsedResume": body,
        },
    )
    assert scored.status_code == 200
    assert "score" in scored.json()


def test_rag_ingest_and_query(client: TestClient, headers: dict[str, str]) -> None:
    ingest = client.post(
        "/internal/v1/rag/ingest",
        headers=headers,
        json={
            "title": "Unit Test Policy",
            "content": "Always verify identity documents during onboarding.",
            "category": "policy",
        },
    )
    assert ingest.status_code in (200, 201)

    query = client.post(
        "/internal/v1/rag/query",
        headers=headers,
        json={"query": "onboarding identity documents", "topK": 3},
    )
    assert query.status_code == 200
    assert "hits" in query.json() or "answer" in query.json()


def test_interview_questions_notes(client: TestClient, headers: dict[str, str]) -> None:
    questions = client.post(
        "/internal/v1/interview/questions",
        headers=headers,
        json={"jdText": "Senior backend engineer", "skills": ["Python", "FastAPI"]},
    )
    assert questions.status_code == 200
    assert len(questions.json()["questions"]) >= 1

    notes = client.post(
        "/internal/v1/interview/notes-summary",
        headers=headers,
        json={"notes": "Strong systems design", "questions": ["Q1"]},
    )
    assert notes.status_code == 200
    assert "summary" in notes.json()


def test_salary_benchmark(client: TestClient, headers: dict[str, str]) -> None:
    response = client.post(
        "/internal/v1/salary/benchmark",
        headers=headers,
        json={"title": "Senior Engineer", "years": 6},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["min"] <= data["mid"] <= data["max"]


@pytest.mark.parametrize("agent", ["recruiter", "interview", "hr"])
def test_agents(client: TestClient, headers: dict[str, str], agent: str) -> None:
    payload = {
        "recruiter": {"jdText": "React", "candidates": []},
        "interview": {"jdText": "React", "skills": ["React"]},
        "hr": {"title": "Senior Engineer"},
    }[agent]
    response = client.post(
        f"/internal/v1/agents/{agent}/run",
        headers=headers,
        json=payload,
    )
    assert response.status_code == 200
    assert response.json()["agent"] == agent


def test_unauthorized_without_token(client: TestClient) -> None:
    response = client.post(
        "/internal/v1/rag/query",
        headers={"X-Service-Token": "wrong-token"},
        json={"query": "hello", "topK": 1},
    )
    assert response.status_code == 401
