import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure Settings can construct even without a local .env in CI.
os.environ.setdefault("AI_SERVICE_TOKEN", "test-token")
os.environ.setdefault("AI_MODE", "mock")

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.models.schemas import ParsedResume  # noqa: E402
from app.services.parser import _mock_parse  # noqa: E402
from app.services.scorer import _mock_score, score_candidate  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def service_headers() -> dict[str, str]:
    return {"X-Service-Token": settings.ai_service_token}


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "ai-ats"


def test_parse_requires_token(client: TestClient) -> None:
    response = client.post(
        "/internal/v1/parse",
        json={"resumeId": "1", "filePath": "/tmp/x", "mimeType": "text/plain"},
    )
    # FastAPI validates required header before our dependency runs.
    assert response.status_code in (401, 422)


def test_parse_rejects_bad_token(client: TestClient, tmp_path: Path) -> None:
    resume = tmp_path / "resume.txt"
    resume.write_text("React TypeScript engineer with 3 years experience")
    response = client.post(
        "/internal/v1/parse",
        headers={"X-Service-Token": "wrong-token"},
        json={
            "resumeId": "1",
            "filePath": str(resume),
            "mimeType": "text/plain",
        },
    )
    assert response.status_code == 401


def test_parse_and_score_happy_path(
    client: TestClient,
    tmp_path: Path,
    service_headers: dict[str, str],
) -> None:
    resume = tmp_path / "resume.txt"
    resume.write_text("Expert in React, TypeScript, and Next.js with 5 years experience")

    parsed = client.post(
        "/internal/v1/parse",
        headers=service_headers,
        json={
            "resumeId": "r1",
            "filePath": str(resume),
            "mimeType": "text/plain",
        },
    )
    assert parsed.status_code == 200
    body = parsed.json()
    assert isinstance(body["skills"], list)
    assert len(body["skills"]) >= 1

    scored = client.post(
        "/internal/v1/score",
        headers=service_headers,
        json={
            "jobId": "j1",
            "jdText": "Need React and TypeScript experience",
            "parsedResume": body,
        },
    )
    assert scored.status_code == 200
    score_body = scored.json()
    assert score_body["score"] >= 0
    assert "matchedSkills" in score_body


def test_mock_parse_extracts_skills() -> None:
    result = _mock_parse("Built APIs with Python FastAPI and Docker")
    lowered = [s.lower() for s in result.skills]
    assert "python" in lowered
    assert any("docker" in s for s in lowered)


def test_mock_score_computes_overlap() -> None:
    parsed = ParsedResume(summary="x", skills=["React", "TypeScript"], totalYears=3)
    result = _mock_score("Looking for React TypeScript developers", parsed)
    assert result.score > 0
    assert len(result.matchedSkills) >= 1


def test_score_candidate_mock_mode() -> None:
    parsed = ParsedResume(skills=["Python"], totalYears=2)
    result = score_candidate("Need Python and AWS", parsed)
    assert isinstance(result.score, float)
    assert result.rationale
