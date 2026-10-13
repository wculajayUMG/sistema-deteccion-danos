"""Evaluate custom YOLO weights on a local image or HTTPS image URL."""

import argparse
import sys
import time
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
WEIGHTS = BASE_DIR / "weights" / "best.pt"
ACTION_TO_SEVERITY = {
    "golpe_pequeno": ("GOLPE_PEQUEÑO", "LEVE"),
    "golpe_mediano": ("GOLPE_MEDIANO", "MODERADO"),
    "golpe_grande": ("GOLPE_GRANDE", "MODERADO"),
    "cambio_pieza": ("CAMBIO_PIEZA", "SEVERO"),
}


def load_image(image_path: str | None, image_url: str | None) -> Image.Image:
    if image_url:
        with httpx.Client(timeout=15, follow_redirects=False) as client:
            response = client.get(image_url)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "").split(";", 1)[0]
            if not content_type.startswith("image/"):
                raise ValueError("La URL no devolvió una imagen.")
            return Image.open(BytesIO(response.content)).convert("RGB")
    if not image_path:
        raise ValueError("Indique --image o --url.")
    return Image.open(image_path).convert("RGB")


def evaluate(image_path: str | None, image_url: str | None) -> int:
    if not WEIGHTS.is_file():
        print(f"No existe el modelo custom: {WEIGHTS}")
        return 1

    from ultralytics import YOLO

    image = load_image(image_path, image_url)
    model = YOLO(str(WEIGHTS))
    started = time.perf_counter()
    results = model.predict(
        source=image,
        conf=0.35,
        iou=0.45,
        imgsz=640,
        verbose=False,
    )
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    boxes = results[0].boxes
    print(f"Tiempo: {elapsed_ms} ms")
    print(f"Detecciones: {len(boxes) if boxes is not None else 0}")

    if boxes is not None:
        for index in range(len(boxes)):
            class_id = int(boxes.cls[index])
            class_name = str(model.names[class_id])
            action, severity = ACTION_TO_SEVERITY.get(
                class_name,
                ("ACCIÓN_DESCONOCIDA", "DESCONOCIDA"),
            )
            confidence = float(boxes.conf[index])
            print(
                f"{index + 1}. {class_name} ({confidence:.2%}) "
                f"→ {action} / {severity}"
            )

    output_path = BASE_DIR / "training" / "eval_resultado.jpg"
    results[0].save(filename=str(output_path))
    print(f"Imagen anotada: {output_path}")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--image")
    source.add_argument("--url")
    arguments = parser.parse_args()
    try:
        sys.exit(evaluate(arguments.image, arguments.url))
    except (OSError, ValueError, httpx.HTTPError) as error:
        print(f"No se pudo evaluar la imagen: {error}", file=sys.stderr)
        sys.exit(1)
