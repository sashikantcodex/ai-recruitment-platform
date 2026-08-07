from pathlib import Path

from docx import Document
from fastapi import HTTPException, status
from pypdf import PdfReader


def extract_text(file_path: str, mime_type: str) -> str:
    path = Path(file_path)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume file not found: {file_path}",
        )

    suffix = path.suffix.lower()
    mime = (mime_type or "").lower()

    try:
        if mime == "application/pdf" or suffix == ".pdf":
            reader = PdfReader(str(path))
            return "\n".join((page.extract_text() or "") for page in reader.pages).strip()

        if (
            mime
            in {
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/msword",
            }
            or suffix in {".docx", ".doc"}
        ):
            doc = Document(str(path))
            return "\n".join(p.text for p in doc.paragraphs if p.text).strip()

        # Plain text / unknown: read as utf-8
        return path.read_text(encoding="utf-8", errors="ignore").strip()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to extract resume text: {exc}",
        ) from exc
