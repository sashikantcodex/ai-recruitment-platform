import os
from pathlib import Path

import pytest

os.environ.setdefault("AI_SERVICE_TOKEN", "test-token")
os.environ.setdefault("AI_MODE", "mock")

from app.models.schemas import (  # noqa: E402
    InterviewQuestionsRequest,
    SalaryBenchmarkRequest,
)
from app.services.agents import run_hr_agent, run_interview_agent, run_recruiter_agent  # noqa: E402
from app.services.interview_assistant import generate_questions, summarize_notes  # noqa: E402
from app.services.rag import ingest_document, query_documents  # noqa: E402
from app.services.salary import benchmark_salary  # noqa: E402
from app.models.schemas import NotesSummaryRequest  # noqa: E402


def test_rag_ingest_and_query(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    store = tmp_path / "documents.json"
    monkeypatch.setattr("app.services.rag.STORE_FILE", store)
    monkeypatch.setattr("app.services.rag.DATA_DIR", tmp_path)

    ingest_document("Salary Bands", "Senior Engineer band is 130k to 170k USD", "salary")
    hits = query_documents("senior engineer salary", top_k=3)
    assert hits
    assert hits[0]["score"] > 0


def test_interview_questions_count() -> None:
    qs = generate_questions(
        InterviewQuestionsRequest(jdText="Senior React role", skills=["React", "TypeScript"])
    )
    assert len(qs) == 10


def test_notes_summary() -> None:
    summary = summarize_notes(
        NotesSummaryRequest(notes="Strong communicator", questions=["Q1", "Q2"])
    )
    assert "Interview summary" in summary


def test_salary_benchmark_senior() -> None:
    result = benchmark_salary(SalaryBenchmarkRequest(title="Senior Engineer", years=5))
    assert result.mid >= result.min
    assert result.max >= result.mid


def test_agents_run() -> None:
    assert run_recruiter_agent({"jdText": "React", "candidates": []}).agent == "recruiter"
    assert run_interview_agent({"jdText": "React", "skills": ["React"]}).result["questions"]
    assert run_hr_agent({"title": "Senior Engineer"}).result["offerDraft"]["salary"] > 0
