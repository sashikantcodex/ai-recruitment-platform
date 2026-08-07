from fastapi import APIRouter, Depends

from app.core.security import verify_service_token
from app.models.schemas import (
    RagHit,
    RagIngestRequest,
    RagIngestResponse,
    RagQueryRequest,
    RagQueryResponse,
)
from app.services.rag import ingest_document, query_documents, seed_if_empty

router = APIRouter(prefix="/internal/v1/rag", tags=["rag"])


@router.post("/ingest", response_model=RagIngestResponse)
def ingest(
    payload: RagIngestRequest,
    _: str = Depends(verify_service_token),
) -> RagIngestResponse:
    seed_if_empty()
    doc_id, chunks = ingest_document(payload.title, payload.content, payload.category)
    return RagIngestResponse(id=doc_id, chunks=chunks)


@router.post("/query", response_model=RagQueryResponse)
def query(
    payload: RagQueryRequest,
    _: str = Depends(verify_service_token),
) -> RagQueryResponse:
    seed_if_empty()
    hits_raw = query_documents(payload.query, payload.topK)
    hits = [RagHit(**h) for h in hits_raw]
    if not hits:
        answer = "No relevant policy documents found. Ingest hiring policies first."
    else:
        answer = (
            f"Based on '{hits[0].title}' ({hits[0].category}): {hits[0].excerpt}"
        )
    return RagQueryResponse(answer=answer, hits=hits)
