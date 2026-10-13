import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import DetectRequest, DetectResponse
from app.services.yolo_service import yolo_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["Detection"])


@router.post("/detect", response_model=DetectResponse)
async def detect_damage(body: DetectRequest) -> DetectResponse:
    try:
        response = await yolo_service.detect(
            url_image=body.url_cloudflare,
            base64_image=body.base64_image,
            id_fotografia=body.id_fotografia,
        )
        if response.total_detecciones == 0:
            return response.model_copy(update={
                "mensaje": "No se detectaron daños visibles en la carrocería."
            })
        return response
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        logger.exception("Error during YOLO inference")
        raise HTTPException(
            status_code=500,
            detail="Error interno durante la inferencia",
        ) from error


@router.post("/detect/batch", response_model=list[DetectResponse])
async def detect_batch(bodies: list[DetectRequest]) -> list[DetectResponse]:
    if not bodies or len(bodies) > 10:
        raise HTTPException(
            status_code=400,
            detail="El batch debe contener entre 1 y 10 imágenes",
        )
    try:
        return [
            await yolo_service.detect(
                url_image=body.url_cloudflare,
                base64_image=body.base64_image,
                id_fotografia=body.id_fotografia,
            )
            for body in bodies
        ]
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        logger.exception("Error during batch YOLO inference")
        raise HTTPException(
            status_code=500,
            detail="Error interno durante la inferencia por lotes",
        ) from error
