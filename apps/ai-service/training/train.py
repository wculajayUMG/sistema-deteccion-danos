"""Train and promote the four-class vehicle-damage YOLOv8 model."""

import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any

import yaml

BASE_DIR = Path(__file__).resolve().parent.parent
TRAINING_DIR = BASE_DIR / "training"
DATASET_DIR = TRAINING_DIR / "dataset"
DATA_CONFIG = TRAINING_DIR / "data.yaml"
WEIGHTS_DIR = BASE_DIR / "weights"
RUNS_DIR = TRAINING_DIR / "runs"
REQUIRED_CLASSES = [
    "golpe_pequeno",
    "golpe_mediano",
    "golpe_grande",
    "cambio_pieza",
]
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def _class_names(value: Any) -> list[str]:
    if isinstance(value, dict):
        try:
            return [str(value[index]) for index in range(len(value))]
        except KeyError:
            return []
    if isinstance(value, list):
        return [str(name) for name in value]
    return []


def validar_dataset() -> bool:
    required_paths = [
        DATASET_DIR / "train" / "images",
        DATASET_DIR / "train" / "labels",
        DATASET_DIR / "valid" / "images",
        DATASET_DIR / "valid" / "labels",
        DATA_CONFIG,
    ]
    missing = [path for path in required_paths if not path.exists()]
    if missing:
        print("Dataset incompleto. Faltan:")
        for path in missing:
            print(f"  - {path}")
        print(
            "\nPrepare the Roboflow YOLOv8 export with these exact classes: "
            + ", ".join(REQUIRED_CLASSES)
        )
        return False

    with DATA_CONFIG.open("r", encoding="utf-8") as data_file:
        data_config = yaml.safe_load(data_file)
    if not isinstance(data_config, dict):
        print(f"{DATA_CONFIG} debe contener un mapa YAML.")
        return False

    names = _class_names(data_config.get("names"))
    if names != REQUIRED_CLASSES:
        print(f"Clases esperadas: {REQUIRED_CLASSES}")
        print(f"Clases encontradas: {names}")
        return False
    if data_config.get("nc") != len(REQUIRED_CLASSES):
        print(f"nc debe ser {len(REQUIRED_CLASSES)}.")
        return False

    train_images = [
        path
        for path in (DATASET_DIR / "train" / "images").iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    ]
    valid_images = [
        path
        for path in (DATASET_DIR / "valid" / "images").iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    ]
    print("Dataset validado:")
    print(f"  Clases: {names}")
    print(f"  Entrenamiento: {len(train_images)} imágenes")
    print(f"  Validación: {len(valid_images)} imágenes")
    if not train_images or not valid_images:
        print("Agregue imágenes a los conjuntos train y valid antes de entrenar.")
        return False
    return True


def _gpu_available() -> bool:
    import torch

    return torch.cuda.is_available()


def entrenar() -> Any:
    from ultralytics import YOLO

    device = "0" if _gpu_available() else "cpu"
    model = YOLO("yolov8n.pt")
    with DATA_CONFIG.open("r", encoding="utf-8") as data_file:
        data_config = yaml.safe_load(data_file)
    data_config["path"] = str(DATASET_DIR.resolve())
    with tempfile.TemporaryDirectory(prefix=".train-config-", dir=TRAINING_DIR) as temp_dir:
        runtime_config = Path(temp_dir) / "data.yaml"
        with runtime_config.open("w", encoding="utf-8") as data_file:
            yaml.safe_dump(data_config, data_file, allow_unicode=True, sort_keys=False)
        results = model.train(
            data=str(runtime_config),
            epochs=100,
            imgsz=640,
            batch=16 if device == "0" else 8,
            patience=20,
            project=str(RUNS_DIR),
            name="danos_vehiculares_v1",
            pretrained=True,
            optimizer="AdamW",
            lr0=0.001,
            lrf=0.01,
            momentum=0.937,
            weight_decay=0.0005,
            warmup_epochs=3,
            augment=True,
            mixup=0.1,
            degrees=15.0,
            fliplr=0.5,
            flipud=0.0,
            hsv_h=0.015,
            hsv_s=0.7,
            hsv_v=0.4,
            translate=0.1,
            scale=0.5,
            save=True,
            save_period=10,
            val=True,
            plots=True,
            verbose=True,
            device=device,
        )

    best_weights = RUNS_DIR / "danos_vehiculares_v1" / "weights" / "best.pt"
    if not best_weights.is_file():
        raise FileNotFoundError(f"Entrenamiento no generó los pesos esperados: {best_weights}")
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    destination = WEIGHTS_DIR / "best.pt"
    shutil.copy2(best_weights, destination)
    print(f"Modelo guardado en {destination}")
    return results


def mostrar_metricas(results: Any) -> None:
    metrics = getattr(results, "results_dict", {})
    map50 = metrics.get("metrics/mAP50(B)")
    map50_95 = metrics.get("metrics/mAP50-95(B)")
    precision = metrics.get("metrics/precision(B)")
    recall = metrics.get("metrics/recall(B)")
    print("\nMétricas de entrenamiento:")
    print(f"  mAP50: {map50}")
    print(f"  mAP50-95: {map50_95}")
    print(f"  Precisión: {precision}")
    print(f"  Recall: {recall}")


if __name__ == "__main__":
    if not validar_dataset():
        sys.exit(1)
    mostrar_metricas(entrenar())
