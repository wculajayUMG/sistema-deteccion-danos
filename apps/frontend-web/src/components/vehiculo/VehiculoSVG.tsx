'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

const PIEZA_A_ZONA: Record<string, string> = {
  capo: 'frontal',
  parabrisas_frontal: 'frontal',
  parachoques_frontal: 'frontal',
  guardafango_izq: 'frontal',
  guardafango_der: 'frontal',
  espejo_izq: 'frontal',
  espejo_der: 'frontal',
  maletero: 'trasera',
  parabrisas_trasero: 'trasera',
  parachoques_trasero: 'trasera',
  puerta_del_izq: 'lateral_izquierda',
  puerta_tras_izq: 'lateral_izquierda',
  puerta_del_der: 'lateral_derecha',
  puerta_tras_der: 'lateral_derecha',
};

interface Pieza {
  id: string;
  nombre: string;
  path: string;
}

const PIEZAS: Pieza[] = [
  { id: 'parachoques_frontal', nombre: 'Parachoques Frontal',
    path: 'M 100,16 L 200,16 L 220,36 L 80,36 Z' },
  { id: 'capo', nombre: 'Capó',
    path: 'M 82,38 L 218,38 L 234,90 L 66,90 Z' },
  { id: 'guardafango_izq', nombre: 'Guardafango Izq.',
    path: 'M 54,92 L 74,92 L 78,132 L 52,128 L 52,104 Z' },
  { id: 'guardafango_der', nombre: 'Guardafango Der.',
    path: 'M 226,92 L 246,92 L 248,104 L 248,128 L 222,132 Z' },
  { id: 'parabrisas_frontal', nombre: 'Parabrisas Frontal',
    path: 'M 76,92 L 224,92 L 220,132 L 80,132 Z' },
  { id: 'espejo_izq', nombre: 'Espejo Izq.',
    path: 'M 33,148 L 52,148 L 52,175 L 33,175 Z' },
  { id: 'espejo_der', nombre: 'Espejo Der.',
    path: 'M 248,148 L 267,148 L 267,175 L 248,175 Z' },
  { id: 'puerta_del_izq', nombre: 'Puerta Del. Izq.',
    path: 'M 51,135 L 85,135 L 85,231 L 51,231 Z' },
  { id: 'puerta_del_der', nombre: 'Puerta Del. Der.',
    path: 'M 215,135 L 249,135 L 249,231 L 215,231 Z' },
  { id: 'techo', nombre: 'Techo',
    path: 'M 87,135 L 213,135 L 213,318 L 87,318 Z' },
  { id: 'puerta_tras_izq', nombre: 'Puerta Tras. Izq.',
    path: 'M 51,233 L 85,233 L 85,318 L 51,318 Z' },
  { id: 'puerta_tras_der', nombre: 'Puerta Tras. Der.',
    path: 'M 215,233 L 249,233 L 249,318 L 215,318 Z' },
  { id: 'parabrisas_trasero', nombre: 'Parabrisas Trasero',
    path: 'M 80,320 L 220,320 L 224,364 L 76,364 Z' },
  { id: 'maletero', nombre: 'Maletero',
    path: 'M 68,366 L 232,366 L 218,433 L 82,433 Z' },
  { id: 'parachoques_trasero', nombre: 'Parachoques Trasero',
    path: 'M 82,435 L 218,435 L 200,446 L 100,446 Z' },
];

interface Props {
  seleccionadas: string[];
  onToggle: (id: string, nombre: string) => void;
  onZonasChange?: (zonas: string[]) => void;
}

export default function VehiculoSVG({ seleccionadas, onToggle, onZonasChange }: Props) {
  useEffect(() => {
    if (!onZonasChange) return;
    const zonas = new Set<string>();
    for (const id of seleccionadas) {
      const zona = PIEZA_A_ZONA[id];
      if (zona) zonas.add(zona);
    }
    onZonasChange([...zonas]);
  }, [seleccionadas, onZonasChange]);
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p className="text-center text-xs text-gray-500">
        Toca las piezas dañadas para marcarlas en amarillo
      </p>
      <div className="mx-auto w-full max-w-[220px]">
        <svg
          viewBox="0 0 300 480"
          className="h-auto w-full drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Selector de piezas del vehículo visto desde arriba"
        >
          {/* ── Ruedas (detrás de la carrocería) ─────────────── */}
          {([
            { x: 36, y: 124 },
            { x: 244, y: 124 },
            { x: 36, y: 281 },
            { x: 244, y: 281 },
          ] as const).map((w) => (
            <rect
              key={`w-${w.x}-${w.y}`}
              x={w.x} y={w.y} width={20} height={60} rx={5}
              fill="#1E293B" stroke="#0F172A" strokeWidth="1"
              pointerEvents="none"
            />
          ))}

          {/* ── Silueta principal de la carrocería ────────────── */}
          {/* Forma más realista: estrecha en frontal/trasero, ancha en cabina */}
          <path
            d="M 100,16 L 200,16
               L 222,36 L 236,90
               L 250,134 L 252,148
               L 252,318 L 250,334
               L 234,376 L 220,435
               L 200,447 L 100,447
               L 80,435 L 66,376
               L 50,334 L 48,318
               L 48,148 L 50,134
               L 64,90 L 78,36 Z"
            fill="#E2E8F0"
            stroke="#94A3B8"
            strokeWidth="1.5"
            pointerEvents="none"
          />

          {/* ── Zona capó (tono diferente al techo) ───────────── */}
          <path
            d="M 84,38 L 216,38 L 234,88 L 66,88 Z"
            fill="#D1DCE8"
            stroke="#94A3B8"
            strokeWidth="1"
            pointerEvents="none"
          />

          {/* ── Zona maletero (tono diferente al techo) ───────── */}
          <path
            d="M 68,366 L 232,366 L 218,433 L 82,433 Z"
            fill="#D1DCE8"
            stroke="#94A3B8"
            strokeWidth="1"
            pointerEvents="none"
          />

          {/* ── Parabrisas frontal (vidrio azul) ──────────────── */}
          <path
            d="M 72,91 L 228,91 L 222,131 L 78,131 Z"
            fill="#BFDBFE"
            stroke="#93C5FD"
            strokeWidth="1"
            pointerEvents="none"
          />

          {/* ── Parabrisas trasero (vidrio azul) ──────────────── */}
          <path
            d="M 78,321 L 222,321 L 228,363 L 72,363 Z"
            fill="#BFDBFE"
            stroke="#93C5FD"
            strokeWidth="1"
            pointerEvents="none"
          />

          {/* ── Ventanas laterales (franjas de vidrio) ─────────── */}
          <rect x="50" y="137" width="14" height="179"
            fill="#BFDBFE" stroke="#93C5FD" strokeWidth="0.5"
            pointerEvents="none" />
          <rect x="236" y="137" width="14" height="179"
            fill="#BFDBFE" stroke="#93C5FD" strokeWidth="0.5"
            pointerEvents="none" />

          {/* ── Pilares A (límite capó / cabina) ──────────────── */}
          <line x1="64" y1="91" x2="78" y2="134"
            stroke="#94A3B8" strokeWidth="2" pointerEvents="none" />
          <line x1="236" y1="91" x2="222" y2="134"
            stroke="#94A3B8" strokeWidth="2" pointerEvents="none" />

          {/* ── Pilares C (límite cabina / maletero) ──────────── */}
          <line x1="50" y1="320" x2="78" y2="365"
            stroke="#94A3B8" strokeWidth="2" pointerEvents="none" />
          <line x1="250" y1="320" x2="222" y2="365"
            stroke="#94A3B8" strokeWidth="2" pointerEvents="none" />

          {/* ── Divisoria entre puerta delantera y trasera ────── */}
          <line x1="50" y1="232" x2="86" y2="232"
            stroke="#94A3B8" strokeWidth="1.5" pointerEvents="none" />
          <line x1="214" y1="232" x2="250" y2="232"
            stroke="#94A3B8" strokeWidth="1.5" pointerEvents="none" />

          {/* ── Línea central del techo (referencia visual) ───── */}
          <line x1="150" y1="135" x2="150" y2="318"
            stroke="#94A3B8" strokeWidth="0.75"
            strokeDasharray="5 4" opacity="0.45"
            pointerEvents="none" />

          {/* ── Piezas interactivas ───────────────────────────── */}
          {PIEZAS.map((pieza) => {
            const selected = seleccionadas.includes(pieza.id);
            return (
              <path
                key={pieza.id}
                d={pieza.path}
                fill={selected ? '#FFC700' : 'transparent'}
                stroke={selected ? '#D97706' : '#94A3B8'}
                strokeWidth={selected ? 2 : 0.75}
                className={cn(
                  'cursor-pointer transition-colors',
                  !selected && 'hover:fill-yellow-200',
                )}
                role="checkbox"
                aria-label={pieza.nombre}
                aria-checked={selected}
                tabIndex={0}
                onClick={() => onToggle(pieza.id, pieza.nombre)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onToggle(pieza.id, pieza.nombre);
                  }
                }}
              >
                <title>{pieza.nombre}</title>
              </path>
            );
          })}

          {/* ── Etiqueta orientación ──────────────────────────── */}
          <text
            x="150" y="474"
            textAnchor="middle"
            fill="#6B7280"
            fontSize="13"
            fontFamily="system-ui"
            pointerEvents="none"
          >
            ▲ FRONTAL
          </text>
        </svg>
      </div>
      {seleccionadas.length > 0 && (
        <p className="text-center text-xs font-medium text-amber-700">
          {seleccionadas.length} pieza{seleccionadas.length === 1 ? '' : 's'} seleccionada
          {seleccionadas.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}
