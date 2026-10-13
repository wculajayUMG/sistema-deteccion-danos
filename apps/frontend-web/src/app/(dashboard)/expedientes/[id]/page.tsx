'use client';

import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Camera,
  Car,
  FileText,
  Loader2,
  MapPin,
  Sparkles,
  User,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { apiClient } from '@/lib/api-client';
import type { Siniestro } from '@/types/siniestro';

interface DeteccionProcesada {
  total_detecciones: number;
  detecciones: {
    accion_tecnica: string;
    severidad: string;
    confianza: number;
  }[];
  modo_fallback: boolean;
  mensaje: string | null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (message) return message;
  }
  return error instanceof Error ? error.message : fallback;
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card bg-white p-4 shadow-card md:p-5">
      <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/10">
          <Icon className="h-3.5 w-3.5 text-brand-primary" />
        </div>
        <h2 className="text-sm font-bold text-brand-text">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-50 py-1.5 last:border-0 sm:flex-row sm:items-center">
      <span className="shrink-0 text-xs text-gray-400 sm:w-36">{label}</span>
      <span className="break-words text-sm font-medium text-brand-text">{value || '—'}</span>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
}

export default function ExpedienteDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [processingPhotoId, setProcessingPhotoId] = useState<number | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [photoNotice, setPhotoNotice] = useState('');
  const [detectionResults, setDetectionResults] = useState<
    Record<number, DeteccionProcesada>
  >({});
  const id = params.id;
  const validId = /^\d+$/.test(id);

  const {
    data: siniestro,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['siniestro', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Siniestro>(
        `/api/v1/siniestros/${id}`,
      );
      return data;
    },
    enabled: validId,
  });

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length || !siniestro) return;
    setPhotoError('');
    setPhotoNotice('');
    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      Array.from(files).slice(0, 10).forEach((file) => {
        formData.append('fotos', file, file.name);
      });
      const { data } = await apiClient.post(
        `/api/v1/siniestros/${siniestro.idSiniestro}/fotografias`,
        formData,
      );
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('El servidor no confirmó el registro de las fotografías.');
      }
      await queryClient.invalidateQueries({ queryKey: ['siniestro', id] });
      setPhotoNotice(
        `${data.length} fotografía(s) guardada(s) en ${siniestro.numeroReclamo}.`,
      );
    } catch (error) {
      setPhotoError(getErrorMessage(error, 'No se pudieron guardar las fotografías.'));
    } finally {
      setUploadingPhotos(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  async function processPhoto(idFotografia: number) {
    setPhotoError('');
    setPhotoNotice('');
    setProcessingPhotoId(idFotografia);
    try {
      const { data } = await apiClient.post<DeteccionProcesada>(
        '/api/v1/detecciones/procesar',
        { id_fotografia: idFotografia },
      );
      setDetectionResults((current) => ({
        ...current,
        [idFotografia]: data,
      }));
      setPhotoNotice(
        data.total_detecciones
          ? `Análisis terminado: ${data.total_detecciones} daño(s) detectado(s).`
          : 'Análisis terminado: no se detectaron daños.',
      );
    } catch (error) {
      setPhotoError(getErrorMessage(error, 'No se pudo analizar la fotografía.'));
    } finally {
      setProcessingPhotoId(null);
    }
  }

  if (isLoading && validId) {
    return (
      <AppLayout breadcrumb={['Expedientes', 'Detalle']}>
        <div className="mx-auto max-w-5xl animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 rounded-card bg-white p-6 shadow-card" />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!validId || isError || !siniestro) {
    return (
      <AppLayout breadcrumb={['Expedientes', 'No encontrado']}>
        <div className="mx-auto max-w-5xl rounded-card bg-white p-8 text-center shadow-card">
          <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">Expediente no encontrado</p>
          <button
            type="button"
            onClick={() => router.push('/expedientes')}
            className="mt-4 text-sm font-medium text-brand-secondary hover:underline"
          >
            ← Volver a expedientes
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumb={['Expedientes', siniestro.numeroReclamo]}>
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
        <section className="rounded-card bg-brand-primary p-4 text-white md:p-6">
          <button
            type="button"
            onClick={() => router.push('/expedientes')}
            className="mb-4 flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a expedientes
          </button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-medium text-white/60">EXPEDIENTE</p>
              <h1 className="font-mono text-xl font-bold md:text-2xl">
                {siniestro.numeroReclamo}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-white/70">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(siniestro.fechaSiniestro)}
                {siniestro.lugarSiniestro && (
                  <>
                    <span className="mx-1">·</span>
                    <MapPin className="h-3.5 w-3.5" />
                    {siniestro.lugarSiniestro}
                  </>
                )}
              </p>
            </div>
            <StatusBadge estado={siniestro.estado} />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoCard icon={User} title="Información del Cliente">
            <InfoRow label="Nombre completo" value={`${siniestro.cliente.nombre} ${siniestro.cliente.apellido}`} />
            <InfoRow label="DPI" value={siniestro.cliente.dpi} />
            <InfoRow label="Teléfono" value={siniestro.cliente.telefono} />
          </InfoCard>
          <InfoCard icon={Car} title="Información del Vehículo">
            <InfoRow label="Vehículo" value={`${siniestro.vehiculo.marca.nombreMarca} ${siniestro.vehiculo.modelo.nombreModelo} ${siniestro.vehiculo.anio}`} />
            <InfoRow label="Placa" value={siniestro.vehiculo.placa} />
            <InfoRow label="Color" value={siniestro.vehiculo.color} />
          </InfoCard>
          <InfoCard icon={FileText} title="Datos del Siniestro">
            <InfoRow label="Número de póliza" value={siniestro.numeroPoliza} />
            <InfoRow label="Ajustador" value={`${siniestro.usuario.nombre} ${siniestro.usuario.apellido}`} />
            <InfoRow label="Descripción" value={siniestro.descripcion} />
          </InfoCard>
          <InfoCard icon={Camera} title="Fotografías y Análisis IA">
            <div className="space-y-3">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(event) => void uploadPhotos(event.target.files)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/expedientes/${id}/inspeccion`)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-xs font-semibold text-white"
                >
                  <Camera className="h-4 w-4" />
                  Inspeccionar vehículo
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/expedientes/${id}/resultados`)}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-primary/20 bg-brand-primary/5 px-3 py-2 text-xs font-semibold text-brand-primary"
                >
                  <Sparkles className="h-4 w-4" />
                  Ver resultados IA
                </button>
              </div>
              {photoError && (
                <p role="alert" className="text-xs text-red-600">{photoError}</p>
              )}
              {photoNotice && (
                <p role="status" className="text-xs text-green-700">{photoNotice}</p>
              )}
              {siniestro.fotografias?.length ? (
                <ul className="divide-y divide-gray-100">
                  {siniestro.fotografias.map((photo) => {
                    const result = detectionResults[photo.idFotografia];
                    const savedDetection = photo.deteccion;
                    return (
                      <li key={photo.idFotografia} className="space-y-2 py-3 first:pt-1">
                        <div className="flex items-center justify-between gap-3">
                          <a
                            href={photo.urlCloudflare}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-xs font-medium text-brand-secondary hover:underline"
                          >
                            {photo.nombreArchivo}
                          </a>
                          <button
                            type="button"
                            onClick={() => void processPhoto(photo.idFotografia)}
                            disabled={
                              savedDetection !== null ||
                              processingPhotoId !== null ||
                              uploadingPhotos
                            }
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-brand-primary/20 px-2 py-1.5 text-xs font-semibold text-brand-primary disabled:opacity-60"
                          >
                            {processingPhotoId === photo.idFotografia ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            {savedDetection
                              ? 'Análisis guardado'
                              : 'Analizar daños'}
                          </button>
                        </div>
                        {savedDetection && (
                          <div className="rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                            <p>
                              {savedDetection.piezasDanadas.length
                                ? `${savedDetection.piezasDanadas.length} daño(s) detectado(s)`
                                : 'Análisis completado: sin daños detectados'}
                              {' · '}{savedDetection.modeloVersion}
                            </p>
                            {savedDetection.piezasDanadas.map((part) => (
                              <p key={part.idPiezaDanada}>
                                {part.accionTecnica} · {part.severidad.nivel}
                                {part.confianza !== null
                                  ? ` · ${Math.round(part.confianza * 100)}% confianza`
                                  : ''}
                              </p>
                            ))}
                          </div>
                        )}
                        {result && (
                          <div className="rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                            <p>
                              {result.total_detecciones
                                ? `${result.total_detecciones} detección(es)`
                                : 'Sin daños detectados'}
                              {result.modo_fallback ? ' · modelo genérico aproximado' : ''}
                            </p>
                            {result.detecciones.map((item, index) => (
                              <p key={`${item.accion_tecnica}-${index}`}>
                                {item.accion_tecnica} · {item.severidad} ·{' '}
                                {Math.round(item.confianza * 100)}% confianza
                              </p>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">Sin fotografías registradas en este expediente.</p>
              )}
            </div>
          </InfoCard>
        </div>

        {siniestro.presupuesto ? (
          <InfoCard icon={FileText} title="Presupuesto">
            <InfoRow label="Estado" value={siniestro.presupuesto.estado} />
            <InfoRow
              label="Total GTQ"
              value={new Intl.NumberFormat('es-GT', {
                style: 'currency',
                currency: 'GTQ',
              }).format(siniestro.presupuesto.totalGtq)}
            />
            <div className="pt-3">
              <button
                type="button"
                onClick={() => router.push(`/expedientes/${id}/presupuesto`)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <FileText className="h-4 w-4" />
                Ver presupuesto
              </button>
            </div>
          </InfoCard>
        ) : (
          <div className="rounded-card bg-white p-4 text-center shadow-card">
            <p className="mb-3 text-sm text-gray-400">Sin presupuesto generado aún</p>
            <button
              type="button"
              onClick={() => router.push(`/expedientes/${id}/presupuesto`)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <FileText className="h-4 w-4" />
              Generar presupuesto
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
