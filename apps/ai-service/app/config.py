from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        protected_namespaces=("settings_",),
    )

    app_name: str = "Seguros El Roble — IA Service"
    app_version: str = "1.0.0"
    debug: bool = False

    model_path: str = str(BASE_DIR / "weights" / "best.pt")
    model_fallback: str = "yolov8n.pt"
    confidence_threshold: float = Field(default=0.10, gt=0, le=1)
    iou_threshold: float = Field(default=0.45, gt=0, le=1)
    image_size: int = Field(default=640, gt=0)
    max_image_bytes: int = Field(default=20 * 1024 * 1024, gt=0)
    class_names: list[str] = Field(
        default_factory=lambda: [
            "aro_delantero_der",
            "aro_delantero_izq",
            "aro_trasero_der",
            "aro_trasero_izq",
            "bumper_frontal",
            "bumper_trasero",
            "capo",
            "estribo",
            "faldon_derecho",
            "faldon_izquierdo",
            "golpe_grande",
            "golpe_mediano",
            "golpe_pequeno",
            "lodera_derecha",
            "lodera_izquierda",
            "moldura_puerta_del_der",
            "moldura_puerta_del_izq",
            "moldura_puerta_tras_der",
            "moldura_puerta_tras_izq",
            "persiana_frontal",
            "puerta_delantera_der",
            "puerta_delantera_izq",
            "puerta_trasera_der",
            "puerta_trasera_izq",
            "rejilla_bumper_frontal",
            "retrovisor_derecho",
            "retrovisor_izquierdo",
            "ruptura_cambio",
            "silvin_derecho",
            "silvin_izquierdo",
            "stop_derecho",
            "stop_izquierdo",
            "tapa_de_baul",
            "techo",
            "vidrio_frontal",
            "vidrio_trasero",
        ]
    )
    backend_url: str = "http://localhost:3001"


settings = Settings()
