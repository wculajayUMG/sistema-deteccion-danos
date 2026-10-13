'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface BBoxData {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  label: string;
  confianza: number;
  severidad: string;
  accionTecnica: string;
}

interface Props {
  imageSrc: string;
  detecciones: BBoxData[];
  className?: string;
}

interface SeveridadColors {
  stroke: string;
  fill: string;
}

const SEVERIDAD_COLOR: Record<string, SeveridadColors> = {
  SEVERO:  { stroke: '#EF4444', fill: 'rgba(239,68,68,0.18)' },
  MODERADO:{ stroke: '#F97316', fill: 'rgba(249,115,22,0.18)' },
  LEVE:    { stroke: '#EAB308', fill: 'rgba(234,179,8,0.18)' },
  grave:   { stroke: '#EF4444', fill: 'rgba(239,68,68,0.18)' },
  moderado:{ stroke: '#F97316', fill: 'rgba(249,115,22,0.18)' },
  leve:    { stroke: '#EAB308', fill: 'rgba(234,179,8,0.18)' },
  pieza:   { stroke: '#6B7280', fill: 'rgba(107,114,128,0.18)' },
};

const ACCION_LABEL: Record<string, string> = {
  GOLPE_PEQUEÑO:        'Golpe Pequeño',
  GOLPE_MEDIANO:        'Golpe Mediano',
  GOLPE_GRANDE:         'Golpe Grande',
  CAMBIO_PIEZA:         'Cambio de Pieza',
  'reparar':            'Reparar',
  'enderezar y pintar': 'Enderezar y pintar',
  'reemplazar':         'Reemplazar',
  'reparar y pintar':   'Reparar y pintar',
};

const FALLBACK: SeveridadColors = { stroke: '#EAB308', fill: 'rgba(234,179,8,0.18)' };

function drawBoxes(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  boxes: BBoxData[],
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cw = canvas.width;
  const ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);

  if (!boxes.length || !img.naturalWidth || !img.naturalHeight) return;

  // Calcula el área de renderizado real dentro del canvas
  // (object-contain deja barras cuando el aspect ratio no coincide)
  const imgAspect    = img.naturalWidth / img.naturalHeight;
  const canvasAspect = cw / ch;
  let renderedW: number;
  let renderedH: number;
  let offsetX: number;
  let offsetY: number;

  if (imgAspect > canvasAspect) {
    // Imagen más ancha → llena ancho, barras arriba/abajo
    renderedW = cw;
    renderedH = cw / imgAspect;
    offsetX   = 0;
    offsetY   = (ch - renderedH) / 2;
  } else {
    // Imagen más alta o cuadrada → llena alto, barras a los lados
    renderedH = ch;
    renderedW = ch * imgAspect;
    offsetX   = (cw - renderedW) / 2;
    offsetY   = 0;
  }

  ctx.save();
  ctx.font         = 'bold 11px system-ui, sans-serif';
  ctx.textBaseline = 'top';

  for (const box of boxes) {
    const colors = SEVERIDAD_COLOR[box.severidad] ?? FALLBACK;

    // Bbox normalizado centrado → coordenadas de esquina en píxeles del canvas
    const bx = offsetX + (box.x - box.ancho / 2) * renderedW;
    const by = offsetY + (box.y - box.alto  / 2) * renderedH;
    const bw = box.ancho * renderedW;
    const bh = box.alto  * renderedH;

    // Relleno semitransparente
    ctx.fillStyle = colors.fill;
    ctx.fillRect(bx, by, bw, bh);

    // Borde
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth   = 2;
    ctx.strokeRect(bx, by, bw, bh);

    // Etiqueta "Acción 91%"
    const text      = `${ACCION_LABEL[box.accionTecnica] ?? box.accionTecnica} ${(box.confianza * 100).toFixed(0)}%`;
    const textWidth = ctx.measureText(text).width;
    const labelW    = textWidth + 8;
    const labelH    = 16;
    const labelY    = by >= labelH + 2 ? by - labelH - 2 : by + 2;

    ctx.fillStyle = colors.stroke;
    ctx.fillRect(bx, labelY, labelW, labelH);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, bx + 4, labelY + 2);
  }

  ctx.restore();
}

export default function BoundingBoxOverlay({ imageSrc, detecciones, className }: Props) {
  const imgRef    = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const redraw = useCallback(() => {
    const img    = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    if (!img.complete || !img.naturalWidth) return;

    // Usa las dimensiones reales del elemento img en el layout
    const w = img.clientWidth;
    const h = img.clientHeight;
    if (w === 0 || h === 0) return;

    canvas.width  = w;
    canvas.height = h;
    drawBoxes(canvas, img, detecciones);
  }, [detecciones]);

  // Redibujar cuando la imagen cambia de tamaño (responsive)
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const observer = new ResizeObserver(redraw);
    observer.observe(img);
    return () => observer.disconnect();
  }, [redraw]);

  // Redibujar cuando cambia el src o las detecciones
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    // Si la imagen ya estaba cargada en caché, onLoad no vuelve a disparar
    if (img.complete && img.naturalWidth) redraw();
  }, [imageSrc, detecciones, redraw]);

  return (
    // El contenedor hereda el tamaño del <img> que tiene su propia altura
    <div className={`relative ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        key={imageSrc}
        src={imageSrc}
        alt="Evidencia fotográfica"
        // max-h en el <img> directamente (no en el padre) para que el layout funcione
        className="block max-h-[400px] w-full object-contain"
        onLoad={redraw}
      />
      <canvas
        ref={canvasRef}
        // absolute top-0 left-0: se superone al <img> con el mismo origen
        className="pointer-events-none absolute left-0 top-0"
        aria-hidden="true"
      />
    </div>
  );
}
