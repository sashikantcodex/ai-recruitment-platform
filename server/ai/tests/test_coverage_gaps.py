"""Close remaining AI service coverage gaps (mock + openai guard paths)."""

from __future__ import annotations

import os
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from docx import Document
from fastapi import HTTPException
from fastapi.testclient import TestClient

os.environ.setdefault("AI_SERVICE_TOKEN", "test-token")
os.environ.setdefault("AI_MODE", "mock")

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.models.schemas import ParsedResume  # noqa: E402
from app.services import parser as parser_mod  # noqa: E402
from app.services import scorer as scorer_mod  # noqa: E402
from app.services.parser import parse_resume_file  # noqa: E402
from app.services.rag import seed_if_empty  # noqa: E402
from app.services.scorer import score_candidate  # noqa: E402
from app.services.text_extract import extract_text  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def headers() -> dict[str, str]:
    return {"X-Service-Token": settings.ai_service_token}


def test_parse_and_score_mock(tmp_path: Path) -> None:
    path = tmp_path / "cv.txt"
    path.write_text("3 years Python FastAPI Docker", encoding="utf-8")
    parsed = parse_resume_file(str(path), "text/plain")
    assert parsed.skills
    scored = score_candidate("Python FastAPI engineer", parsed)
    assert scored.score > 0


def test_extract_docx(tmp_path: Path) -> None:
    path = tmp_path / "cv.docx"
    doc = Document()
    doc.add_paragraph("React TypeScript engineer with 4 years experience")
    doc.save(path)
    text = extract_text(
        str(path),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    assert "React" in text


def test_extract_missing_file() -> None:
    with pytest.raises(HTTPException) as exc:
        extract_text("/tmp/does-not-exist-ats.pdf", "application/pdf")
    assert exc.value.status_code == 404


def test_parse_empty_text_raises(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    path = tmp_path / "empty.txt"
    path.write_text("x", encoding="utf-8")
    monkeypatch.setattr(parser_mod, "extract_text", lambda *_a, **_k: "")
    with pytest.raises(HTTPException) as exc:
        parse_resume_file(str(path), "text/plain")
    assert exc.value.status_code == 422


def test_openai_mode_requires_api_key(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    path = tmp_path / "cv.txt"
    path.write_text("skills python", encoding="utf-8")
    monkeypatch.setattr(settings, "ai_mode", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "")
    with pytest.raises(HTTPException):
        parse_resume_file(str(path), "text/plain")
    with pytest.raises(HTTPException):
        score_candidate("python", ParsedResume(skills=["python"]))


def test_openai_parse_and_score_success(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    path = tmp_path / "cv.txt"
    path.write_text("skills python", encoding="utf-8")
    monkeypatch.setattr(settings, "ai_mode", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")

    parse_response = MagicMock()
    parse_response.choices = [
        MagicMock(
            message=MagicMock(
                content='{"summary":"ok","skills":["Python"],"experience":[],"education":[],"totalYears":2}'
            )
        )
    ]
    score_response = MagicMock()
    score_response.choices = [
        MagicMock(
            message=MagicMock(
                content='{"score":77,"matchedSkills":["Python"],"missingSkills":[],"rationale":"fit"}'
            )
        )
    ]

    client = MagicMock()
    client.chat.completions.create.side_effect = [parse_response, score_response]
    monkeypatch.setattr(parser_mod, "OpenAI", lambda **_k: client)
    monkeypatch.setattr(scorer_mod, "OpenAI", lambda **_k: client)

    parsed = parse_resume_file(str(path), "text/plain")
    assert parsed.skills == ["Python"]
    scored = score_candidate("Python role", parsed)
    assert scored.score == 77


def test_rag_query_empty_hits_answer(
    client: TestClient,
    headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.api.v1.rag.query_documents", lambda *_a, **_k: [])
    monkeypatch.setattr("app.api.v1.rag.seed_if_empty", lambda: None)
    response = client.post(
        "/internal/v1/rag/query",
        headers=headers,
        json={"query": "nothing", "topK": 1},
    )
    assert response.status_code == 200
    assert "No relevant" in response.json()["answer"]


def test_seed_if_empty_skips_when_populated(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.rag._load", lambda: [{"id": "already"}])
    seed_if_empty()


def test_rag_embed_and_cosine_edge_cases(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services import rag as rag_mod

    monkeypatch.setattr(rag_mod, "DATA_DIR", tmp_path)
    monkeypatch.setattr(rag_mod, "STORE_FILE", tmp_path / "documents.json")
    assert rag_mod._embed("") == {}
    assert rag_mod._cosine({}, {"a": 1.0}) == 0.0
    doc_id, chunks = rag_mod.ingest_document("Empty Chunks", "", "policy")
    assert doc_id and chunks >= 1


def test_seed_if_empty_from_fixtures(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services import rag as rag_mod

    monkeypatch.setattr(rag_mod, "DATA_DIR", tmp_path)
    monkeypatch.setattr(rag_mod, "STORE_FILE", tmp_path / "documents.json")
    seed_if_empty()
    assert (tmp_path / "documents.json").exists()


def test_seed_if_empty_missing_fixtures_dir(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services import rag as rag_mod
    from unittest.mock import MagicMock, patch

    monkeypatch.setattr(rag_mod, "_load", lambda: [])
    missing = MagicMock()
    missing.exists.return_value = False
    with patch.object(rag_mod, "Path") as path_cls:
        path_cls.return_value.resolve.return_value.parents = [None, None, missing]
        seed_if_empty()


def test_extract_pdf_via_reader(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    path = tmp_path / "cv.pdf"
    path.write_bytes(b"%PDF-1.4")
    page = MagicMock()
    page.extract_text.return_value = "PDF resume text with Docker"
    reader = MagicMock()
    reader.pages = [page]
    monkeypatch.setattr("app.services.text_extract.PdfReader", lambda *_a, **_k: reader)
    assert "Docker" in extract_text(str(path), "application/pdf")


def test_extract_text_generic_exception(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    path = tmp_path / "cv.txt"
    path.write_text("x", encoding="utf-8")
    monkeypatch.setattr(
        Path,
        "read_text",
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("boom")),
    )
    with pytest.raises(HTTPException) as exc:
        extract_text(str(path), "text/plain")
    assert exc.value.status_code == 422
