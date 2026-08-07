from fastapi import Header, HTTPException, status

from app.config import settings


def verify_service_token(
    x_service_token: str = Header(..., alias="X-Service-Token"),
) -> str:
    if x_service_token != settings.ai_service_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid AI service token",
        )
    return x_service_token
