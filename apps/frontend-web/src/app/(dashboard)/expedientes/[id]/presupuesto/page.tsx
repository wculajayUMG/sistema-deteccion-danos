'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Download,
  Edit2,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  TrendingUp,
  X,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { LineaPresupuesto, Presupuesto } from '@/types/presupuesto';

function formatGtq(amount: number): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

const ACCION_CONFIG: Record<string, { label: string; className: string }> = {
  // acciones legacy
  GOLPE_PEQUEÑO: { label: 'Golpe Pequeño',   className: 'border border-blue-200 bg-blue-50 text-blue-700' },
  GOLPE_MEDIANO: { label: 'Golpe Mediano',   className: 'border border-cyan-200 bg-cyan-50 text-cyan-700' },
  GOLPE_GRANDE:  { label: 'Golpe Grande',    className: 'border border-indigo-200 bg-indigo-50 text-indigo-700' },
  CAMBIO_PIEZA:  { label: 'Cambio de Pieza', className: 'border border-red-200 bg-red-50 text-red-700' },
  // acciones nuevas (modelo 36 clases)
  'reparar':            { label: 'Reparar',            className: 'border border-blue-200 bg-blue-50 text-blue-700' },
  'enderezar y pintar': { label: 'Enderezar y pintar', className: 'border border-orange-200 bg-orange-50 text-orange-700' },
  'reemplazar':         { label: 'Reemplazar',         className: 'border border-red-200 bg-red-50 text-red-700' },
  'reparar y pintar':   { label: 'Reparar y pintar',   className: 'border border-yellow-200 bg-yellow-50 text-yellow-700' },
};

const SEV_CONFIG: Record<string, { label: string; className: string }> = {
  // valores legacy (mayúsculas)
  LEVE:    { label: 'Leve',     className: 'border border-yellow-200 bg-yellow-50 text-yellow-700' },
  MODERADO:{ label: 'Moderado', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  SEVERO:  { label: 'Severo',   className: 'border border-red-200 bg-red-50 text-red-700' },
  // valores nuevos (minúsculas)
  leve:    { label: 'Leve',     className: 'border border-yellow-200 bg-yellow-50 text-yellow-700' },
  moderado:{ label: 'Moderado', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  grave:   { label: 'Grave',    className: 'border border-red-200 bg-red-50 text-red-700' },
  pieza:   { label: 'Pieza',    className: 'border border-gray-200 bg-gray-50 text-gray-600' },
};

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
        className,
      )}
    >
      {text}
    </span>
  );
}

function LineaRow({
  linea,
  index,
  aprobada,
  onSave,
}: {
  linea: LineaPresupuesto;
  index: number;
  aprobada: boolean;
  onSave: (
    idLinea: number,
    repuesto: number,
    manoObra: number,
    justificacion: string,
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [repuesto, setRepuesto] = useState(linea.costoRepuestoGtq);
  const [manoObra, setManoObra] = useState(linea.costoManoObraGtq);
  const [justificacion, setJustificacion] = useState('');
  const [saving, setSaving] = useState(false);

  const accionCfg = ACCION_CONFIG[linea.piezaDanada?.accionTecnica ?? ''] ?? ACCION_CONFIG.GOLPE_PEQUEÑO;
  const sevCfg = SEV_CONFIG[linea.piezaDanada?.severidad?.nivel ?? 'LEVE'];

  const handleSave = async () => {
    if (!justificacion.trim()) return;
    setSaving(true);
    try {
      await onSave(linea.idLinea, Number(repuesto), Number(manoObra), justificacion);
      setEditing(false);
      setJustificacion('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <tr className={cn('transition-colors', editing ? 'bg-amber-50' : linea.modificadoManualmente ? 'bg-yellow-50/50' : 'hover:bg-gray-50')}>
        <td className="px-4 py-3 text-sm font-mono text-gray-400">{index + 1}</td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-brand-text">
            {linea.piezaDanada?.catalogoPieza?.nombrePieza ?? 'Zona dañada'}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {sevCfg && <Badge text={sevCfg.label} className={sevCfg.className} />}
            <Badge text={accionCfg.label} className={accionCfg.className} />
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          {editing ? (
            <input
              type="number"
              value={repuesto}
              onChange={(event) => setRepuesto(Number(event.target.value))}
              min={0}
              step={0.01}
              className="w-24 rounded-lg border border-amber-300 bg-white px-2 py-1 text-right text-sm outline-none focus:border-amber-500"
            />
          ) : (
            <span className={cn('text-sm', linea.costoRepuestoGtq > 0 ? 'font-semibold text-brand-text' : 'text-gray-400')}>
              {linea.costoRepuestoGtq > 0 ? formatGtq(linea.costoRepuestoGtq) : '—'}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {editing ? (
            <input
              type="number"
              value={manoObra}
              onChange={(event) => setManoObra(Number(event.target.value))}
              min={0}
              step={0.01}
              className="w-24 rounded-lg border border-amber-300 bg-white px-2 py-1 text-right text-sm outline-none focus:border-amber-500"
            />
          ) : (
            <span className="text-sm font-medium text-brand-text">{formatGtq(linea.costoManoObraGtq)}</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-bold text-brand-text">
            {editing ? formatGtq(Number(repuesto) + Number(manoObra)) : formatGtq(linea.subtotalGtq)}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {linea.modificadoManualmente ? (
            <span title="Modificado manualmente">⚠️</span>
          ) : (
            <span title="Generado por IA">
              <Lock className="mx-auto h-3.5 w-3.5 text-gray-300" />
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {!aprobada &&
            (editing ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!justificacion.trim() || saving}
                  className="rounded bg-green-500 p-1.5 text-white hover:bg-green-600 disabled:opacity-40"
                  title="Guardar"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setRepuesto(linea.costoRepuestoGtq);
                    setManoObra(linea.costoManoObraGtq);
                    setJustificacion('');
                  }}
                  className="rounded bg-gray-200 p-1.5 text-gray-600 hover:bg-gray-300"
                  title="Cancelar"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded p-1.5 text-amber-600 transition-colors hover:bg-amber-50"
                title="Editar"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            ))}
        </td>
      </tr>

      {editing && (
        <tr className="bg-amber-50">
          <td colSpan={7} className="px-4 pb-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-amber-800">Justificación del ajuste *</label>
              <textarea
                value={justificacion}
                onChange={(event) => setJustificacion(event.target.value)}
                rows={2}
                placeholder="Motivo del ajuste manual..."
                className="w-full resize-none rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500"
              />
              <p className="flex items-center gap-1 text-[10px] text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                Se registrará en el Audit Trail del sistema
              </p>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function PresupuestoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params?.id);
  const [observaciones, setObservaciones] = useState('');
  const [aprobada, setAprobada] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const { data: siniestro } = useQuery({
    queryKey: ['siniestro', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/v1/siniestros/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: presupuesto, isLoading, error, refetch } = useQuery({
    queryKey: ['presupuesto', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Presupuesto>(`/api/v1/presupuestos/siniestro/${id}`);
      return data;
    },
    enabled: !!id,
    retry: false,
  });

  const updateLinea = useCallback(
    async (idLinea: number, repuesto: number, manoObra: number, justificacion: string) => {
      if (!presupuesto?.idPresupuesto) return;

      await apiClient.patch(`/api/v1/presupuestos/${presupuesto.idPresupuesto}/lineas/${idLinea}`, {
        costoRepuestoGtq: repuesto,
        costoManoObraGtq: manoObra,
        justificacion,
      });
      await refetch();
    },
    [presupuesto?.idPresupuesto, refetch],
  );

  const handleGenerarPresupuesto = async () => {
    const { data } = await apiClient.post<Presupuesto>(`/api/v1/presupuestos/generar/${id}`);
    await refetch();
    return data;
  };

  const handleAprobar = async () => {
    if (!presupuesto?.idPresupuesto) return;
    await apiClient.post(`/api/v1/presupuestos/${presupuesto.idPresupuesto}/aprobar`, {
      observaciones,
    });
    setAprobada(true);
  };

  const handleDownloadPdf = async () => {
    if (!presupuesto?.idPresupuesto) return;
    setDownloadingPdf(true);
    try {
      const response = await apiClient.get(
        `/api/v1/presupuestos/${presupuesto.idPresupuesto}/pdf`,
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(
        new Blob([response.data as BlobPart], { type: 'application/pdf' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `dictamen-${presupuesto.idPresupuesto}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const subtotalRepuestos = (presupuesto?.lineas ?? []).reduce((sum, linea) => sum + (linea.costoRepuestoGtq ?? 0), 0);
  const subtotalManoObra = (presupuesto?.lineas ?? []).reduce((sum, linea) => sum + (linea.costoManoObraGtq ?? 0), 0);
  const numeroReclamo = siniestro?.numeroReclamo ?? `#${id}`;
  const presupuestoAprobado = presupuesto?.estado === 'APROBADO' || aprobada;

  if (!id || Number.isNaN(id)) {
    return (
      <AppLayout breadcrumb={['Expedientes', 'Presupuesto']}>
        <div className="mx-auto max-w-5xl rounded-card bg-white p-8 text-center shadow-card">
          <p className="text-gray-500">Expediente inválido</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumb={['Expedientes', numeroReclamo, 'Presupuesto']}>
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
        <div className="rounded-card bg-brand-primary p-4 text-white md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/expedientes/${id}`)}
                className="rounded-lg bg-white/10 p-2 transition-colors hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 text-white" />
              </button>
              <div>
                <p className="text-xs font-medium text-white/60">PRESUPUESTO PERICIAL</p>
                <h1 className="font-mono text-lg font-bold">{numeroReclamo}</h1>
              </div>
            </div>

            {presupuesto && (
              <div
                className={cn(
                  'rounded-lg px-4 py-2 text-center text-sm font-bold',
                  presupuestoAprobado ? 'bg-green-500 text-white' : presupuesto.estado === 'REVISADO' ? 'bg-brand-accent text-black' : 'bg-white/15 text-white',
                )}
              >
                {presupuestoAprobado ? '✓ APROBADO' : presupuesto.estado}
              </div>
            )}
          </div>
        </div>

        {!isLoading && (error || !presupuesto) && !presupuestoAprobado && (
          <div className="rounded-card bg-white p-8 text-center shadow-card">
            <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <h3 className="mb-2 font-bold text-brand-text">Sin presupuesto generado</h3>
            <p className="mb-6 text-sm text-gray-400">
              El sistema calculará automáticamente los costos cruzando las detecciones IA con el baremo de precios y el catálogo de repuestos.
            </p>
            <button
              type="button"
              onClick={() => void handleGenerarPresupuesto()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              <TrendingUp className="h-4 w-4" />
              Generar presupuesto
            </button>
          </div>
        )}

        {presupuesto && (
          <>
            <div className="overflow-hidden rounded-card bg-white shadow-card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['#', 'Pieza', 'Repuesto GTQ', 'Mano Obra GTQ', 'Subtotal GTQ', 'Estado', 'Acciones'].map((header) => (
                        <th
                          key={header}
                          className={cn(
                            'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500',
                            header.includes('GTQ') || header === 'Estado' ? 'text-right' : 'text-left',
                          )}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {presupuesto.lineas.map((linea, i) => (
                      <LineaRow
                        key={linea.idLinea}
                        linea={linea}
                        index={i}
                        aprobada={presupuestoAprobado}
                        onSave={updateLinea}
                      />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={2} className="px-4 py-2 text-xs text-gray-500">Subtotales</td>
                      <td className="px-4 py-2 text-right text-xs font-medium text-gray-600">{formatGtq(subtotalRepuestos)}</td>
                      <td className="px-4 py-2 text-right text-xs font-medium text-gray-600">{formatGtq(subtotalManoObra)}</td>
                      <td colSpan={3} className="px-4 py-2" />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="border-t border-gray-200 p-4 md:p-6">
                <div className="mx-auto max-w-sm rounded-xl border-2 border-brand-primary bg-white p-4 text-center md:p-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Total estimado de reparación</p>
                  <p className="text-3xl font-bold text-brand-primary md:text-4xl">{formatGtq(presupuesto.totalGtq)}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    Quetzales (GTQ) · {presupuestoAprobado ? 'Presupuesto Aprobado' : 'Presupuesto Preliminar'}
                  </p>
                </div>
              </div>
            </div>

            {!presupuestoAprobado && (
              <div className="space-y-4 rounded-card bg-white p-4 shadow-card md:p-6">
                <h3 className="border-b border-gray-100 pb-3 text-sm font-bold text-brand-text">Aprobación del Presupuesto</h3>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-brand-text">Observaciones del Perito</label>
                  <textarea
                    value={observaciones}
                    onChange={(event) => setObservaciones(event.target.value)}
                    rows={3}
                    placeholder="Ingrese observaciones o justificaciones sobre el presupuesto..."
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push(`/expedientes/${id}/resultados`)}
                    className="order-2 flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 sm:order-1"
                  >
                    <Cpu className="h-4 w-4" />
                    Ver Resultados IA
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleGenerarPresupuesto()}
                    className="order-3 flex items-center justify-center gap-2 rounded-lg border border-brand-secondary px-5 py-2.5 text-sm font-medium text-brand-secondary hover:bg-brand-secondary/5"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Re-calcular
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleAprobar()}
                    className="order-1 flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aprobar y Generar Dictamen
                  </button>
                </div>
              </div>
            )}

            {presupuestoAprobado && (
              <div className="space-y-4 rounded-card bg-white p-4 shadow-card md:p-6">
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">Presupuesto Aprobado y Dictamen Generado</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void handleDownloadPdf()}
                    disabled={downloadingPdf}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-secondary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {downloadingPdf ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {downloadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/expedientes')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-brand-primary px-5 py-2.5 text-sm font-medium text-brand-primary hover:bg-brand-primary/5"
                  >
                    ← Volver al Dashboard
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
