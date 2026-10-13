from typing import Literal

from pydantic import BaseModel, Field, model_validator


class BoundingBox(BaseModel):
    x: float = Field(ge=0, le=1, description="Centro X normalizado 0-1")
    y: float = Field(ge=0, le=1, description="Centro Y normalizado 0-1")
    ancho: float = Field(ge=0, le=1, description="Ancho normalizado 0-1")
    alto: float = Field(ge=0, le=1, description="Alto normalizado 0-1")
    x1: float = Field(ge=0, le=1, description="Esquina superior izquierda X")
    y1: float = Field(ge=0, le=1, description="Esquina superior izquierda Y")
    x2: float = Field(ge=0, le=1, description="Esquina inferior derecha X")
    y2: float = Field(ge=0, le=1, description="Esquina inferior derecha Y")

    @model_validator(mode="after")
    def validate_corners(self) -> "BoundingBox":
        if self.x1 > self.x2 or self.y1 > self.y2:
            raise ValueError("Las coordenadas de la caja están invertidas")
        return self


Severidad = Literal["leve", "moderado", "grave", "pieza"]


class PiezaCercana(BaseModel):
    clase: str
    confianza: float = Field(ge=0, le=1)
    bbox: BoundingBox


class Deteccion(BaseModel):
    clase: str
    clase_id: int
    confianza: float = Field(ge=0, le=1)
    accion_tecnica: str
    severidad: Severidad | None = None
    bbox: BoundingBox
    pieza_afectada: str | None = None
    pieza: PiezaCercana | None = None


class DetectRequest(BaseModel):
    url_cloudflare: str | None = None
    id_fotografia: int | None = Field(default=None, gt=0)
    base64_image: str | None = None

    @model_validator(mode="after")
    def require_image_source(self) -> "DetectRequest":
        if not self.url_cloudflare and not self.base64_image:
            raise ValueError("Se requiere url_cloudflare o base64_image")
        return self


class DetectResponse(BaseModel):
    id_fotografia: int | None = None
    modelo_version: str
    tiempo_ms: int
    confianza_promedio: float
    total_detecciones: int
    detecciones: list[Deteccion]
    modo_fallback: bool = False
    mensaje: str | None = None


class HealthResponse(BaseModel):
    status: str
    version: str
    modelo_cargado: bool
    modelo_path: str
    dispositivo: str
    clases: list[str]
