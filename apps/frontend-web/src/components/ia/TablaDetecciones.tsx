'use client';

import { useState } from 'react';
import { AlertTriangle, Edit2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PiezaDanada } from '@/types/siniestro';

const ACCION_CONFIG: Record<string, { label: string; className: string }> = {
  // acciones legacy
  GOLPE_PEQUEÑO: {
    label: 'Golpe Pequeño',
    className: 'border border-blue-200 bg-blue-100 text-blue-700',
  },
  GOLPE_MEDIANO: {
    label: 'Golpe Mediano',
    className: 'border border-brand-secondary/30 bg-brand-secondary/10 text-brand-secondary',
  },
  GOLPE_GRANDE: {
    label: 'Golpe Grande',
    className: 'border border-brand-primary/30 bg-brand-primary/10 text-brand-primary',
  },
  CAMBIO_PIEZA: {
    label: 'Cambio de Pieza',
    className: 'border border-red-200 bg-red-100 text-red-700',
  },
  // acciones nuevas del modelo de 36 clases
  'reparar': {
    label: 'Reparar',
    className: 'border border-blue-200 bg-blue-100 text-blue-700',
  },
  'enderezar y pintar': {
    label: 'Enderezar y pintar',
    className: 'border border-orange-200 bg-orange-100 text-orange-700',
  },
  'reemplazar': {
    label: 'Reemplazar',
    className: 'border border-red-200 bg-red-100 text-red-700',
  },
  'reparar y pintar': {
    label: 'Reparar y pintar',
    className: 'border border-yellow-200 bg-yellow-100 text-yellow-700',
  },
};

const ACCIONES = Object.keys(ACCION_CONFIG);

const SEVERIDAD_CONFIG: Record<string, { label: string; className: string }> = {
  // valores legacy (mayúsculas)
  LEVE:    { label: 'Leve',     className: 'border border-yellow-200 bg-yellow-50 text-yellow-700' },
  MODERADO:{ label: 'Moderado', className: 'border border-amber-200 bg-amber-100 text-amber-700' },
  SEVERO:  { label: 'Severo',   className: 'border border-red-200 bg-red-100 text-red-700' },
  // valores nuevos (minúsculas)
  leve:    { label: 'Leve',     className: 'border border-yellow-200 bg-yellow-50 text-yellow-700' },
  moderado:{ label: 'Moderado', className: 'border border-amber-200 bg-amber-100 text-amber-700' },
  grave:   { label: 'Grave',    className: 'border border-red-200 bg-red-100 text-red-700' },
  pieza:   { label: 'Pieza',    className: 'border border-gray-200 bg-gray-100 text-gray-600' },
};

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-2 py-0.5',
        'text-xs font-semibold',
        className,
      )}
    >
      {text}
    </span>
  );
}

interface Props {
  piezas: PiezaDanada[];
  onEditPieza: (
    idPieza: number,
    accionTecnica: string,
    justificacion: string,
  ) => Promise<void>;
}

export default function TablaDetecciones({ piezas, onEditPieza }: Props) {
  const [editando, setEditando] = useState<number | null>(null);
  const [accionEdit, setAccionEdit] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleEdit = (pieza: PiezaDanada) => {
    setEditando(pieza.idPiezaDanada);
    setAccionEdit(pieza.accionTecnica);
    setJustificacion('');
    setSaveError('');
  };

  const handleSave = async (idPieza: number) => {
    if (!justificacion.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      await onEditPieza(idPieza, accionEdit, justificacion.trim());
      setEditando(null);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el cambio de clasificación.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!piezas.length) {
    return (
      <div className="py-8 text-center">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-amber-400" />
        <p className="text-sm text-gray-500">Sin piezas dañadas detectadas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['#', 'Pieza', 'Confianza', 'Severidad', 'Acción Baremo', 'Acciones'].map(
                (heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {piezas.map((pieza, index) => {
              const accionCfg =
                ACCION_CONFIG[pieza.accionTecnica] ??
                ACCION_CONFIG.GOLPE_PEQUEÑO;
              const severidadCfg = SEVERIDAD_CONFIG[pieza.severidad?.nivel];
              const isEditing = editando === pieza.idPiezaDanada;
              const confianza = pieza.confianza ?? 0;
              const confidenceColor =
                confianza >= 0.8
                  ? 'bg-green-500'
                  : confianza >= 0.6
                    ? 'bg-amber-500'
                    : 'bg-red-400';

              return (
                <tr
                  key={pieza.idPiezaDanada}
                  className={cn(
                    'transition-colors',
                    isEditing ? 'bg-amber-50' : 'hover:bg-gray-50',
                  )}
                >
                  <td className="px-3 py-3 font-mono text-sm text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-medium text-brand-text">
                      {pieza.catalogoPieza?.nombrePieza ?? 'Zona dañada'}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    {pieza.confianza === null ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-gray-200">
                          <div
                            className={cn('h-1.5 rounded-full', confidenceColor)}
                            style={{ width: `${confianza * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {(confianza * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      text={severidadCfg?.label ?? '—'}
                      className={severidadCfg?.className ?? ''}
                    />
                  </td>
                  <td className="px-3 py-3">
                    {isEditing ? (
                      <select
                        aria-label="Acción técnica"
                        value={accionEdit}
                        onChange={(event) => setAccionEdit(event.target.value)}
                        className="rounded border border-brand-secondary bg-white px-2 py-1 text-xs outline-none"
                      >
                        {ACCIONES.map((action) => (
                          <option key={action} value={action}>
                            {ACCION_CONFIG[action].label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge text={accionCfg.label} className={accionCfg.className} />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleSave(pieza.idPiezaDanada)}
                          disabled={!justificacion.trim() || saving}
                          className="rounded bg-green-500 p-1.5 text-white transition-colors hover:bg-green-600 disabled:opacity-40"
                          title="Guardar"
                          aria-label="Guardar clasificación"
                        >
                          <Save className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando(null)}
                          className="rounded bg-gray-200 p-1.5 text-gray-600 transition-colors hover:bg-gray-300"
                          title="Cancelar"
                          aria-label="Cancelar edición"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEdit(pieza)}
                        className="rounded p-1.5 text-amber-600 transition-colors hover:bg-amber-50"
                        title="Editar clasificación"
                        aria-label={`Editar clasificación de ${pieza.catalogoPieza?.nombrePieza ?? `pieza ${index + 1}`}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editando !== null && (
        <div className="px-3 pb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Justificación del ajuste manual
            <span className="ml-1 text-red-500">*</span>
            <textarea
              required
              value={justificacion}
              onChange={(event) => setJustificacion(event.target.value)}
              rows={2}
              placeholder="Describa el motivo del ajuste manual..."
              className="mt-1 w-full resize-none rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </label>
          <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            El cambio y su justificación quedarán registrados en el Audit Trail.
          </p>
          {saveError && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {saveError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
