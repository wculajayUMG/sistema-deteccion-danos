from fastapi import APIRouter

from app.config import settings
from app.models.schemas import HealthResponse
from app.services.yolo_service import yolo_service

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        modelo_cargado=yolo_service.is_loaded(),
        modelo_path=settings.model_path,
        dispositivo=yolo_service.get_device(),
        clases=settings.class_names,
    )
