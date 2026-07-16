"""Medicine image OCR endpoint.

Used by the medicine catalog page's "scan medicine" feature: the client uploads
a photo of a medicine and gets back the recognized name to search the catalog
with. The AI service only reads the image; catalog availability is resolved by
the caller against the main backend.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import enforce_rate_limit, get_container
from app.exceptions import ModelUnavailableError
from app.schemas.chat import OcrMedicineRequest, OcrMedicineResponse
from app.security.auth import Identity
from app.security.sanitization import validate_attached_image
from app.services.container import ServiceContainer
from app.settings import ApiSettings, get_settings

router = APIRouter(tags=["ai"])

MAX_DRUG_NAME_LENGTH = 120


@router.post("/ocr/medicine", response_model=OcrMedicineResponse)
def ocr_medicine(
    payload: OcrMedicineRequest,
    _identity: Identity = Depends(enforce_rate_limit),
    container: ServiceContainer = Depends(get_container),
    settings: ApiSettings = Depends(get_settings),
) -> OcrMedicineResponse:
    try:
        image = validate_attached_image(payload.image, max_bytes=settings.max_image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not image:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An image is required.")

    if not container.openai_service.is_available:
        # Vision requires the model; surface the standard fallback envelope.
        raise ModelUnavailableError("Vision model is not configured.")

    raw_name = container.openai_service.extract_drug_name(image)
    name = raw_name[:MAX_DRUG_NAME_LENGTH].strip()
    return OcrMedicineResponse(query=name, recognized=bool(name))
