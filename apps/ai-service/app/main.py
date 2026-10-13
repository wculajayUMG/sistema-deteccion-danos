import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import detect, health
from app.services.yolo_service import yolo_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    logger.info("Starting AI Service...")
    yolo_service.load_model()
    model_mode = "FALLBACK (yolov8n.pt)" if yolo_service.using_fallback else "CUSTOM (best.pt)"
    logger.info(
        "YOLO model loaded in %s mode. Classes: %s",
        model_mode,
        ", ".join(settings.class_names),
    )
    if yolo_service.using_fallback:
        logger.warning(
            "Fallback classifications are approximate. "
            "Add a labeled four-class dataset and run training/train.py."
        )
    yield
    logger.info("AI Service stopped.")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "YOLOv8 vehicle-damage detection mapped to the four technical actions "
        "used by the Seguros El Roble repair-price catalog."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://backend-api:3001"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(health.router)
app.include_router(detect.router)


@app.get("/")
async def root() -> dict[str, str | list[str]]:
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "clases_baremo": settings.class_names,
        "docs": "/docs",
        "health": "/health",
    }
