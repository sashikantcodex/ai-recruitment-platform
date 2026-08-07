"""Local RAG store with mock embeddings (Chroma-shaped persistence on disk)."""

from __future__ import annotations

import json
import math
import re
import uuid
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "chroma"
STORE_FILE = DATA_DIR / "documents.json"


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9+]{2,}", text.lower())


def _embed(text: str) -> dict[str, float]:
    tokens = _tokenize(text)
    if not tokens:
        return {}
    counts: dict[str, float] = {}
    for t in tokens:
        counts[t] = counts.get(t, 0.0) + 1.0
    norm = math.sqrt(sum(v * v for v in counts.values())) or 1.0
    return {k: v / norm for k, v in counts.items()}


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    keys = set(a) | set(b)
    return sum(a.get(k, 0.0) * b.get(k, 0.0) for k in keys)


def _load() -> list[dict]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not STORE_FILE.exists():
        return []
    return json.loads(STORE_FILE.read_text(encoding="utf-8"))


def _save(docs: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STORE_FILE.write_text(json.dumps(docs, indent=2), encoding="utf-8")


def ingest_document(title: str, content: str, category: str = "general") -> tuple[str, int]:
    docs = _load()
    # Simple chunking by paragraphs / length
    raw_chunks = [c.strip() for c in re.split(r"\n{2,}", content) if c.strip()]
    if not raw_chunks:
        raw_chunks = [content]
    chunks = []
    for chunk in raw_chunks:
        chunks.append(
            {
                "id": str(uuid.uuid4()),
                "title": title,
                "category": category,
                "text": chunk,
                "embedding": _embed(f"{title} {chunk}"),
            }
        )
    docs.extend(chunks)
    _save(docs)
    return chunks[0]["id"], len(chunks)


def query_documents(query: str, top_k: int = 5) -> list[dict]:
    docs = _load()
    q = _embed(query)
    scored = [
        {
            "title": d["title"],
            "category": d["category"],
            "excerpt": d["text"][:400],
            "score": round(_cosine(q, d.get("embedding", {})), 4),
        }
        for d in docs
    ]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return [s for s in scored if s["score"] > 0][:top_k]


def seed_if_empty() -> None:
    if _load():
        return
    fixtures = Path(__file__).resolve().parents[2] / "fixtures" / "knowledge"
    if not fixtures.exists():
        return
    for path in fixtures.glob("*.txt"):
        ingest_document(
            title=path.stem.replace("_", " ").title(),
            content=path.read_text(encoding="utf-8"),
            category=path.stem.split("_")[0] if "_" in path.stem else "policy",
        )
