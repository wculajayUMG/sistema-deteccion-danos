import asyncio
import base64
import ipaddress
import logging
import math
import socket
import time
from threading import Lock
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

import cv2
import httpx
import numpy as np
from PIL import Image, UnidentifiedImageError

from app.config import settings
from app.models.schemas import BoundingBox, DetectResponse, Deteccion, PiezaCercana
from app.services.severity import get_clasificacion

DAMAGE_CLASSES = {"golpe_grande", "golpe_mediano", "golpe_pequeno", "ruptura_cambio"}
_MAX_PAIR_DISTANCE = 0.3

logger = logging.getLogger(__name__)


class YoloService:
    """Loads one YOLO model per process and uses it for image inference."""

    def __init__(self) -> None:
        self._model = None
        self._model_version = "not_loaded"
        self._using_fallback = False
        self._inference_lock = Lock()

    @property
    def using_fallback(self) -> bool:
        return self._using_fallback

    def load_model(self) -> None:
        from ultralytics import YOLO

        weights_path = Path(settings.model_path)
        if weights_path.is_file():
            logger.info("Loading custom YOLO model: %s", weights_path)
            self._model = YOLO(str(weights_path))
            self._model_version = "custom_v1"
            self._using_fallback = False
            logger.info("Custom model classes: %s", self._model.names)
            return

        logger.warning(
            "Custom weights not found at %s; loading fallback %s",
            weights_path,
            settings.model_fallback,
        )
        self._model = YOLO(settings.model_fallback)
        self._model_version = settings.model_fallback
        self._using_fallback = True

    def is_loaded(self) -> bool:
        return self._model is not None

    def get_device(self) -> str:
        if self._model is None:
            return "not_loaded"
        import torch

        return "cuda" if torch.cuda.is_available() else "cpu"

    @staticmethod
    def _preprocess_image(image: Image.Image) -> Image.Image:
        """CLAHE contrast enhancement + bilateral noise reduction before inference."""
        arr = np.array(image)  # RGB uint8
        bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
        lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
        l_chan, a_chan, b_chan = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_chan = clahe.apply(l_chan)
        lab = cv2.merge([l_chan, a_chan, b_chan])
        bgr = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        bgr = cv2.bilateralFilter(bgr, d=9, sigmaColor=75, sigmaSpace=75)
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        return Image.fromarray(rgb)

    async def detect(
        self,
        url_image: str | None = None,
        base64_image: str | None = None,
        id_fotografia: int | None = None,
    ) -> DetectResponse:
        if self._model is None:
            raise RuntimeError("El modelo YOLO no está cargado")

        image = await self._load_image(url_image, base64_image)
        image = self._preprocess_image(image)
        started_at = time.perf_counter()
        results = await asyncio.to_thread(
            self._predict,
            source=image,
            conf=settings.confidence_threshold,
            iou=settings.iou_threshold,
            imgsz=settings.image_size,
            verbose=False,
        )
        detections = self._convert_result(results[0])

        if not detections:
            logger.info(
                "No detections at confidence threshold %.2f; retrying at 0.05",
                settings.confidence_threshold,
            )
            retry_results = await asyncio.to_thread(
                self._predict,
                source=image,
                conf=0.05,
                iou=settings.iou_threshold,
                imgsz=settings.image_size,
                verbose=False,
            )
            detections = self._convert_result(retry_results[0], max_detections=3)

        elapsed_ms = int((time.perf_counter() - started_at) * 1000)
        average_confidence = (
            sum(item.confianza for item in detections) / len(detections)
            if detections
            else 0.0
        )
        return DetectResponse(
            id_fotografia=id_fotografia,
            modelo_version=self._model_version,
            tiempo_ms=elapsed_ms,
            confianza_promedio=round(average_confidence, 4),
            total_detecciones=len(detections),
            detecciones=detections,
            modo_fallback=self._using_fallback,
            mensaje=(
                "Modelo genérico de respaldo: las clases de daño son aproximadas. "
                "Entrene best.pt con las cuatro clases del baremo para producción."
                if self._using_fallback
                else None
            ),
        )

    def _predict(self, **options: object) -> object:
        with self._inference_lock:
            return self._model.predict(**options)

    def _convert_result(
        self,
        result: object,
        max_detections: int | None = None,
    ) -> list[Deteccion]:
        boxes = getattr(result, "boxes", None)
        if boxes is None or len(boxes) == 0:
            return []

        model_names = self._model.names
        all_detections: list[Deteccion] = []
        limit = len(boxes) if max_detections is None else min(len(boxes), max_detections)

        for index in range(limit):
            confidence = float(boxes.conf[index])
            class_id = int(boxes.cls[index])
            if self._using_fallback:
                class_name = "objeto_detectado"
            elif isinstance(model_names, dict):
                class_name = str(model_names.get(class_id, "clase_desconocida"))
            else:
                class_name = str(model_names[class_id])

            x1, y1, x2, y2 = (float(value) for value in boxes.xyxyn[index].tolist())
            width = max(0.0, x2 - x1)
            height = max(0.0, y2 - y1)
            classification = get_clasificacion(
                clase=class_name,
                confianza=confidence,
                bbox_area=width * height,
                es_fallback=self._using_fallback,
            )
            all_detections.append(
                Deteccion(
                    clase=class_name,
                    clase_id=class_id,
                    confianza=round(confidence, 4),
                    accion_tecnica=classification.accion_tecnica,
                    severidad=classification.severidad,
                    bbox=BoundingBox(
                        x=round((x1 + x2) / 2, 4),
                        y=round((y1 + y2) / 2, 4),
                        ancho=round(width, 4),
                        alto=round(height, 4),
                        x1=round(x1, 4),
                        y1=round(y1, 4),
                        x2=round(x2, 4),
                        y2=round(y2, 4),
                    ),
                )
            )

        # ── Co-detección daño ↔ pieza ────────────────────────────────────────
        damages = [d for d in all_detections if d.clase in DAMAGE_CLASSES]
        pieces  = [d for d in all_detections if d.clase not in DAMAGE_CLASSES]

        if not damages:
            return []

        paired: list[Deteccion] = []
        for damage in damages:
            nearest: Deteccion | None = None
            min_dist = float("inf")
            for piece in pieces:
                dist = math.sqrt(
                    (damage.bbox.x - piece.bbox.x) ** 2
                    + (damage.bbox.y - piece.bbox.y) ** 2
                )
                if dist < min_dist:
                    min_dist = dist
                    nearest = piece

            if nearest is not None and min_dist <= _MAX_PAIR_DISTANCE:
                paired.append(damage.model_copy(update={
                    "pieza_afectada": nearest.clase,
                    "pieza": PiezaCercana(
                        clase=nearest.clase,
                        confianza=nearest.confianza,
                        bbox=nearest.bbox,
                    ),
                }))
            else:
                paired.append(damage)

        return paired

    @staticmethod
    async def _load_image(
        url: str | None,
        image_base64: str | None,
    ) -> Image.Image:
        if image_base64:
            encoded_image = image_base64.split(",", maxsplit=1)[-1]
            try:
                image_bytes = base64.b64decode(encoded_image, validate=True)
            except ValueError as error:
                raise ValueError("base64_image no contiene una imagen Base64 válida") from error
            if len(image_bytes) > settings.max_image_bytes:
                raise ValueError("La imagen supera el tamaño máximo permitido")
            return YoloService._decode_image(image_bytes)

        if not url:
            raise ValueError("Se requiere url_cloudflare o base64_image")
        await YoloService._validate_public_https_url(url)
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=False) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                content_type = response.headers.get("content-type", "").split(";", 1)[0]
                if not content_type.startswith("image/"):
                    raise ValueError("La URL no devolvió un recurso de imagen")
                content_length = response.headers.get("content-length")
                if content_length and int(content_length) > settings.max_image_bytes:
                    raise ValueError("La imagen supera el tamaño máximo permitido")
                chunks: list[bytes] = []
                total_size = 0
                async for chunk in response.aiter_bytes():
                    total_size += len(chunk)
                    if total_size > settings.max_image_bytes:
                        raise ValueError("La imagen supera el tamaño máximo permitido")
                    chunks.append(chunk)
        return YoloService._decode_image(b"".join(chunks))

    @staticmethod
    async def _validate_public_https_url(url: str) -> None:
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username:
            raise ValueError("La URL de imagen debe ser HTTPS y no incluir credenciales")

        try:
            records = await asyncio.to_thread(
                socket.getaddrinfo,
                parsed.hostname,
                parsed.port or 443,
                type=socket.SOCK_STREAM,
            )
        except OSError as error:
            raise ValueError("No se pudo resolver el host de la imagen") from error
        addresses = {record[4][0] for record in records}
        if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
            raise ValueError("La URL de imagen debe apuntar a una dirección pública")

    @staticmethod
    def _decode_image(image_bytes: bytes) -> Image.Image:
        try:
            with Image.open(BytesIO(image_bytes)) as image:
                image.verify()
            with Image.open(BytesIO(image_bytes)) as image:
                image.load()
                return image.convert("RGB")
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
            raise ValueError("El contenido recibido no es una imagen válida") from error


yolo_service = YoloService()
