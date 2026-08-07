from fastapi import APIRouter, Depends

from app.core.security import verify_service_token
from app.models.schemas import ParseRequest, ParsedResume
from app.services.parser import parse_resume_file

router = APIRouter(prefix="/internal/v1", tags=["parse"])


@router.post("/parse", response_model=ParsedResume)
def parse_resume(
    payload: ParseRequest,
    _: str = Depends(verify_service_token),
) -> ParsedResume:
    return parse_resume_file(payload.filePath, payload.mimeType)
