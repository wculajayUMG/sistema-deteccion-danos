"""
Entrenamiento YOLOv8 — Seguros El Roble
Clases: golpe_pequeno, golpe_mediano, golpe_grande, cambio_pieza
"""

import argparse
from pathlib import Path
from ultralytics import YOLO


DEFAULT_DATA = Path(__file__).parent / "dataset" / "data.yaml"
DEFAULT_WEIGHTS = Path(__file__).parent / "weights"


def train(
    data: str = str(DEFAULT_DATA),
    epochs: int = 100,
    imgsz: int = 640,
    batch: int = 16,
    model: str = "yolov8n.pt",
    name: str = "elroble_v1",
    device: str = "",
):
    yolo = YOLO(model)

    results = yolo.train(
        data=data,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        name=name,
        device=device or None,
        patience=20,
        save=True,
        save_period=10,
        cache=False,
        workers=4,
        augment=True,
        degrees=10.0,
        flipud=0.1,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.1,
    )

    # Copiar best.pt al directorio de pesos del servicio
    best_src = Path(results.save_dir) / "weights" / "best.pt"
    DEFAULT_WEIGHTS.mkdir(exist_ok=True)
    dest = DEFAULT_WEIGHTS / "best.pt"

    if best_src.exists():
        import shutil
        shutil.copy2(best_src, dest)
        print(f"\n✓ Modelo guardado en: {dest}")
    else:
        print(f"\n⚠ No se encontró best.pt en {best_src}")

    print(f"  Resultados completos en: {results.save_dir}")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Entrenar YOLOv8 para detección de daños")
    parser.add_argument("--data",   default=str(DEFAULT_DATA), help="Ruta al data.yaml")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz",  type=int, default=640)
    parser.add_argument("--batch",  type=int, default=16)
    parser.add_argument("--model",  default="yolov8n.pt", help="Modelo base YOLOv8")
    parser.add_argument("--name",   default="elroble_v1",  help="Nombre del experimento")
    parser.add_argument("--device", default="",            help="cpu | 0 | 0,1 (vacío=auto)")
    args = parser.parse_args()

    train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        model=args.model,
        name=args.name,
        device=args.device,
    )
