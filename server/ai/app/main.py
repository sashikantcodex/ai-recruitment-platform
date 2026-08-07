from fastapi import FastAPI

from app.api.v1 import agents, interview, parse, rag, salary, score
from app.config import settings
from app.services.rag import seed_if_empty

# Internal AI microservice used only by the Express API (service-token auth).
app = FastAPI(
    title="AI ATS Service",
    version="1.0.0",
    description="Resume parse/score, RAG, interview assist, salary, agents",
)


@app.on_event("startup")
def on_startup() -> None:
    # Load policy fixtures into the local vector store if empty.
    seed_if_empty()


@app.get("/health")
def health():
    """Liveness probe for Docker Compose / K8s."""
    return {
        "status": "ok",
        "service": "ai-ats",
        "mode": settings.ai_mode,
    }


app.include_router(parse.router)
app.include_router(score.router)
app.include_router(rag.router)
app.include_router(interview.router)
app.include_router(salary.router)
app.include_router(agents.router)
