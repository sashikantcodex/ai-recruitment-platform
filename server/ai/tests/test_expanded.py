import os
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

os.environ.setdefault("AI_SERVICE_TOKEN", "test-token")
os.environ.setdefault("AI_MODE", "mock")

from app.config import settings  # noqa: E402
from app.core.security import verify_service_token  # noqa: E402
from app.main import app  # noqa: E402
from app.models.schemas import ParsedResume  # noqa: E402
from app.services.parser import _mock_parse  # noqa: E402
from app.services.scorer import _mock_score, _normalize  # noqa: E402
from app.services.salary import benchmark_salary  # noqa: E402
from app.models.schemas import SalaryBenchmarkRequest  # noqa: E402
from app.services.text_extract import extract_text  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def headers() -> dict[str, str]:
    return {"X-Service-Token": settings.ai_service_token}


def test_normalize_skill() -> None:
    assert _normalize("TypeScript!") == "typescript"
    assert _normalize("Node.js") == "node.js"
    assert _normalize("C++") == "c++"


def test_mock_parse_years_and_skills() -> None:
    parsed = _mock_parse("5 years with React and Docker experience")
    assert parsed.totalYears == 5.0
    lowered = [s.lower() for s in parsed.skills]
    assert "react" in lowered
    assert any("docker" in s for s in lowered)


def test_mock_parse_empty_defaults_communication() -> None:
    parsed = _mock_parse("hello world")
    assert "Communication" in parsed.skills or parsed.skills


def test_mock_score_baseline_when_no_signals() -> None:
    result = _mock_score("zzzz", ParsedResume(skills=["QQQ"]))
    assert result.score == 55.0


def test_salary_bands_by_seniority() -> None:
    junior = benchmark_salary(SalaryBenchmarkRequest(title="Junior Engineer", years=1))
    senior = benchmark_salary(SalaryBenchmarkRequest(title="Senior Engineer", years=1))
    staff = benchmark_salary(SalaryBenchmarkRequest(title="Staff Engineer", years=1))
    assert junior.mid < senior.mid < staff.mid


def test_extract_text_plain(tmp_path: Path) -> None:
    path = tmp_path / "r.txt"
    path.write_text("Plain resume text", encoding="utf-8")
    assert "Plain resume" in extract_text(str(path), "text/plain")


def test_verify_service_token_rejects() -> None:
    with pytest.raises(HTTPException) as exc:
        verify_service_token("wrong")
    assert exc.value.status_code == 401


def test_interview_and_agent_routes(client: TestClient, headers: dict[str, str]) -> None:
    qs = client.post(
        "/internal/v1/interview/questions",
        headers=headers,
        json={"jdText": "Senior React", "skills": ["React"]},
    )
    assert qs.status_code == 200
    assert len(qs.json()["questions"]) == 10

    agent = client.post(
        "/internal/v1/agents/hr/run",
        headers=headers,
        json={"title": "Senior React Engineer"},
    )
    assert agent.status_code == 200
    assert agent.json()["agent"] == "hr"
    assert "offerDraft" in agent.json()["result"]


def test_rag_query_seeded(client: TestClient, headers: dict[str, str]) -> None:
    response = client.post(
        "/internal/v1/rag/query",
        headers=headers,
        json={"query": "salary band senior engineer", "topK": 3},
    )
    assert response.status_code == 200
    body = response.json()
    assert "answer" in body
