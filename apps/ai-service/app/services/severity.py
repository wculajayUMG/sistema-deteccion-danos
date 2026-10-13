"""Mapeo de las 36 clases YOLOv8 a acción técnica y severidad."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ClasificacionBaremo:
    accion_tecnica: str
    severidad: str
    descripcion: str


# Piezas del vehículo (detección de zona, sin daño explícito)
_PIEZA = lambda desc: ClasificacionBaremo(  # noqa: E731
    accion_tecnica="reparar",
    severidad="pieza",
    descripcion=desc,
)

CLASE_A_BAREMO: dict[str, ClasificacionBaremo] = {
    # ── Piezas ──────────────────────────────────────────────────────────────
    "aro_delantero_der":        _PIEZA("Aro delantero derecho"),
    "aro_delantero_izq":        _PIEZA("Aro delantero izquierdo"),
    "aro_trasero_der":          _PIEZA("Aro trasero derecho"),
    "aro_trasero_izq":          _PIEZA("Aro trasero izquierdo"),
    "bumper_frontal":           _PIEZA("Bumper frontal"),
    "bumper_trasero":           _PIEZA("Bumper trasero"),
    "capo":                     _PIEZA("Capó"),
    "estribo":                  _PIEZA("Estribo"),
    "faldon_derecho":           _PIEZA("Faldón derecho"),
    "faldon_izquierdo":         _PIEZA("Faldón izquierdo"),
    "lodera_derecha":           _PIEZA("Lodera derecha"),
    "lodera_izquierda":         _PIEZA("Lodera izquierda"),
    "moldura_puerta_del_der":   _PIEZA("Moldura puerta delantera derecha"),
    "moldura_puerta_del_izq":   _PIEZA("Moldura puerta delantera izquierda"),
    "moldura_puerta_tras_der":  _PIEZA("Moldura puerta trasera derecha"),
    "moldura_puerta_tras_izq":  _PIEZA("Moldura puerta trasera izquierda"),
    "persiana_frontal":         _PIEZA("Persiana frontal"),
    "puerta_delantera_der":     _PIEZA("Puerta delantera derecha"),
    "puerta_delantera_izq":     _PIEZA("Puerta delantera izquierda"),
    "puerta_trasera_der":       _PIEZA("Puerta trasera derecha"),
    "puerta_trasera_izq":       _PIEZA("Puerta trasera izquierda"),
    "rejilla_bumper_frontal":   _PIEZA("Rejilla bumper frontal"),
    "retrovisor_derecho":       _PIEZA("Retrovisor derecho"),
    "retrovisor_izquierdo":     _PIEZA("Retrovisor izquierdo"),
    "silvin_derecho":           _PIEZA("Silvin derecho"),
    "silvin_izquierdo":         _PIEZA("Silvin izquierdo"),
    "stop_derecho":             _PIEZA("Stop derecho"),
    "stop_izquierdo":           _PIEZA("Stop izquierdo"),
    "tapa_de_baul":             _PIEZA("Tapa de baúl"),
    "techo":                    _PIEZA("Techo"),
    "vidrio_frontal":           _PIEZA("Vidrio frontal"),
    "vidrio_trasero":           _PIEZA("Vidrio trasero"),

    # ── Daños ────────────────────────────────────────────────────────────────
    "golpe_grande": ClasificacionBaremo(
        accion_tecnica="enderezar y pintar",
        severidad="grave",
        descripcion="Abolladura grande con deformación visible que requiere reparación extensa",
    ),
    "golpe_mediano": ClasificacionBaremo(
        accion_tecnica="enderezar y pintar",
        severidad="moderado",
        descripcion="Abolladura mediana visible sin comprometer la estructura de la pieza",
    ),
    "rayadura_profunda": ClasificacionBaremo(
        accion_tecnica="reparar y pintar",
        severidad="moderado",
        descripcion="Rayadura profunda con afectación del color base",
    ),
    "golpe_pequeno": ClasificacionBaremo(
        accion_tecnica="reparar y pintar",
        severidad="leve",
        descripcion="Rayones superficiales o marcas menores sin deformación estructural",
    ),
    "rayadura": ClasificacionBaremo(
        accion_tecnica="reparar y pintar",
        severidad="leve",
        descripcion="Rayadura superficial sin pérdida de pintura base",
    ),
    # Clases de ruptura: siempre Reemplazar, independiente de confianza o área
    "ruptura_cambio": ClasificacionBaremo(
        accion_tecnica="reemplazar",
        severidad="grave",
        descripcion="Rotura estructural que requiere sustitución completa de la pieza",
    ),
    "ruptura": ClasificacionBaremo(
        accion_tecnica="reemplazar",
        severidad="grave",
        descripcion="Rotura que requiere sustitución completa de la pieza",
    ),
}


def clasificar_por_confianza(
    confianza: float,
    bbox_area: float,
) -> ClasificacionBaremo:
    """Clasificación aproximada para el modelo genérico de respaldo."""
    if bbox_area >= 0.25:
        return CLASE_A_BAREMO["ruptura_cambio"]
    if bbox_area >= 0.15 or confianza >= 0.85:
        return CLASE_A_BAREMO["golpe_grande"]
    if bbox_area >= 0.08 or confianza >= 0.65:
        return CLASE_A_BAREMO["golpe_mediano"]
    return CLASE_A_BAREMO["golpe_pequeno"]


_CLASES_RUPTURA = frozenset({"ruptura", "ruptura_cambio"})


def get_clasificacion(
    clase: str,
    confianza: float,
    bbox_area: float,
    es_fallback: bool = False,
) -> ClasificacionBaremo:
    # Las clases de ruptura siempre implican Reemplazar, sin excepción.
    if clase in _CLASES_RUPTURA:
        return CLASE_A_BAREMO["ruptura_cambio"]
    if not es_fallback and clase in CLASE_A_BAREMO:
        return CLASE_A_BAREMO[clase]
    return clasificar_por_confianza(confianza, bbox_area)
