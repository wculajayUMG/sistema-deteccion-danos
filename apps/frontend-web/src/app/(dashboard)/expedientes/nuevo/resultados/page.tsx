'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Info,
  RefreshCw,
} from 'lucide-react';
import BoundingBoxOverlay from '@/components/ia/BoundingBoxOverlay';
import TablaDetecciones from '@/components/ia/TablaDetecciones';
import StepperNav from '@/components/ui/StepperNav';
import { useFotografiasConDetecciones } from '@/hooks/useDetecciones';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useNuevoSiniestroStore } from '@/stores/nuevo-siniestro-store';
import type { FotografiaConDeteccion, PiezaDanada } from '@/types/siniestro';

const ACCION_LABEL: Record<string, string> = {
  // acciones legacy
  GOLPE_PEQUEÑO: 'Golpe Pequeño',
  GOLPE_MEDIANO: 'Golpe Mediano',
  GOLPE_GRANDE:  'Golpe Grande',
  CAMBIO_PIEZA:  'Cambio de Pieza',
  // acciones nuevas del modelo de 36 clases
  'reparar':            'Reparar',
  'enderezar y pintar': 'Enderezar y pintar',
  'reemplazar':         'Reemplazar',
  'reparar y pintar':   'Reparar y pintar',
};

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (message) return message;
  }
  return error instanceof Error
    ? error.message
    : 'No se pudo guardar el cambio manual.';
}

function hasBoundingBox(
  piece: PiezaDanada,
): piece is PiezaDanada & {
  bboxX: number;
  bboxY: number;
  bboxAncho: number;
  bboxAlto: number;
} {
  return (
    typeof piece.bboxX === 'number' &&
    Number.isFinite(piece.bboxX) &&
    typeof piece.bboxY === 'number' &&
    Number.isFinite(piece.bboxY) &&
    typeof piece.bboxAncho === 'number' &&
    Number.isFinite(piece.bboxAncho) &&
    typeof piece.bboxAlto === 'number' &&
    Number.isFinite(piece.bboxAlto)
  );
}

export default function ResultadosPage() {
  const router = useRouter();
  const { idSiniestro, vehiculo } = useNuevoSiniestroStore();
  const [fotoActual, setFotoActual] = useState(0);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (idSiniestro === null) {
      router.replace('/expedientes/nuevo/cliente');
    }
  }, [idSiniestro, router]);

  const {
    data: fotografias,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useFotografiasConDetecciones(idSiniestro);

  const currentPhoto: FotografiaConDeteccion | undefined =
    fotografias?.[fotoActual];
  const allDamagedParts: PiezaDanada[] = (fotografias ?? []).flatMap(
    (photo) => photo.deteccion?.piezasDanadas ?? [],
  );
  const totalDetecciones = allDamagedParts.length;
  const fotosAnalizadas = (fotografias ?? []).filter(
    (photo) => photo.deteccion !== null,
  ).length;
  const confidenceValues = allDamagedParts
    .map((part) => part.confianza)
    .filter((value): value is number => value !== null);
  const confianzaPromedio = confidenceValues.length
    ? confidenceValues.reduce((sum, confidence) => sum + confidence, 0) /
      confidenceValues.length
    : 0;
  const modoFallback = (fotografias ?? []).some((photo) =>
    photo.deteccion?.modeloVersion === 'yolov8n.pt',
  );

  const bboxes = (currentPhoto?.deteccion?.piezasDanadas ?? [])
    .filter(hasBoundingBox)
    .map((part) => ({
      x: part.bboxX,
      y: part.bboxY,
      ancho: part.bboxAncho,
      alto: part.bboxAlto,
      label: part.catalogoPieza?.nombrePieza ?? 'Daño',
      confianza: part.confianza ?? 0,
      severidad: part.severidad?.nivel ?? 'LEVE',
      accionTecnica: part.accionTecnica,
    }));

  const handleEditPieza = useCallback(
    async (
      idPieza: number,
      accionTecnica: string,
      justificacion: string,
    ) => {
      setEditError('');
      try {
        await apiClient.patch(`/api/v1/pieza-danada/${idPieza}`, {
          accionTecnica,
          justificacion,
        });
        await refetch();
      } catch (requestError) {
        const message = getErrorMessage(requestError);
        setEditError(message);
        throw new Error(message);
      }
    },
    [refetch],
  );

  if (idSiniestro === null) return null;

  return (
      <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">
        <div className="rounded-card bg-white p-4 shadow-card md:p-6">
          <StepperNav pasoActual={4} />
        </div>

        {isLoading ? (
          <div className="space-y-4" role="status" aria-label="Cargando resultados">
            {[1, 2].map((index) => (
              <div
                key={index}
                className="animate-pulse rounded-card bg-white p-6 shadow-card"
              >
                <div className="mb-4 h-4 w-1/3 rounded bg-gray-200" />
                <div className="h-48 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <section className="rounded-card bg-white p-8 text-center shadow-card">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-500" />
            <h1 className="font-bold text-brand-text">
              No se pudieron cargar los resultados
            </h1>
            <p role="alert" className="mt-2 text-sm text-red-600">
              {getErrorMessage(error)}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Reintentar
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-card bg-brand-primary p-4 text-white md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold md:text-lg">
                      Análisis IA Completado
                    </h1>
                    <p className="mt-0.5 text-xs text-white/70">
                      Siniestro #{idSiniestro}
                      {vehiculo &&
                        ` · ${vehiculo.nombreMarca} ${vehiculo.nombreModelo} ${vehiculo.anio}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                    {totalDetecciones} daño{totalDetecciones !== 1 ? 's' : ''}{' '}
                    detectado{totalDetecciones !== 1 ? 's' : ''}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                    {fotosAnalizadas} foto{fotosAnalizadas !== 1 ? 's' : ''}{' '}
                    analizada{fotosAnalizadas !== 1 ? 's' : ''}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                    {(confianzaPromedio * 100).toFixed(0)}% confianza
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-secondary px-3 py-1 text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    INFERENCIA EXITOSA
                  </span>
                </div>
              </div>
              {modoFallback && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/20 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <p className="text-xs text-amber-100">
                    Se usó el modelo genérico yolov8n.pt. Las clasificaciones de
                    daños son aproximadas; no representan una evaluación
                    definitiva.
                  </p>
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">
              <section className="space-y-4 lg:col-span-3">
                <div className="overflow-hidden rounded-card bg-white shadow-card">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <h2 className="text-sm font-bold text-brand-text">
                      Evidencia Fotográfica con Detecciones
                    </h2>
                    <button
                      type="button"
                      onClick={() => void refetch()}
                      disabled={isFetching}
                      className="rounded-lg p-1.5 transition-colors hover:bg-gray-50 disabled:opacity-50"
                      title="Actualizar resultados"
                      aria-label="Actualizar resultados"
                    >
                      <RefreshCw
                        className={cn(
                          'h-4 w-4 text-gray-400',
                          isFetching && 'animate-spin',
                        )}
                      />
                    </button>
                  </div>

                  {fotografias && fotografias.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-2">
                      {fotografias.map((photo, index) => (
                        <button
                          key={photo.idFotografia}
                          type="button"
                          onClick={() => setFotoActual(index)}
                          aria-label={`Mostrar fotografía ${index + 1}: ${photo.nombreArchivo}`}
                          aria-pressed={fotoActual === index}
                          className={cn(
                            'h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                            fotoActual === index
                              ? 'border-brand-secondary'
                              : 'border-gray-200 hover:border-gray-300',
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.urlCloudflare}
                            alt={photo.nombreArchivo}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="relative bg-gray-900">
                    {currentPhoto ? (
                      <BoundingBoxOverlay
                        imageSrc={currentPhoto.urlCloudflare}
                        detecciones={bboxes}
                        className="w-full"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center">
                        <p className="text-sm text-gray-400">
                          Sin fotografías para este siniestro
                        </p>
                      </div>
                    )}
                  </div>

                  {fotografias && fotografias.length > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setFotoActual((current) => Math.max(0, current - 1))}
                        disabled={fotoActual === 0}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </button>
                      <span className="text-xs text-gray-400">
                        {fotoActual + 1} / {fotografias.length}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFotoActual((current) =>
                            Math.min((fotografias?.length ?? 1) - 1, current + 1),
                          )
                        }
                        disabled={fotoActual === fotografias.length - 1}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 border-t border-gray-100 px-4 py-2">
                    {[
                      { color: '#FF4444', label: 'Severo' },
                      { color: '#FFC700', label: 'Moderado' },
                      { color: '#00B5E2', label: 'Leve' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <span
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-gray-500">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-4 lg:col-span-2">
                <div className="overflow-hidden rounded-card bg-white shadow-card">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <h2 className="text-sm font-bold text-brand-text">
                      Resumen de Daños
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {totalDetecciones} daño
                      {totalDetecciones !== 1 ? 's' : ''} detectado
                      {totalDetecciones !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {editError && (
                    <p role="alert" className="px-4 pt-3 text-xs text-red-600">
                      {editError}
                    </p>
                  )}
                  <TablaDetecciones
                    piezas={allDamagedParts}
                    onEditPieza={handleEditPieza}
                  />
                </div>

                <div className="flex items-start gap-2 rounded-card border border-gray-200 bg-gray-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-gray-500">
                    Las modificaciones manuales y su justificación se registran
                    en el Audit Trail.
                  </p>
                </div>

                {totalDetecciones > 0 && (
                  <div className="rounded-card bg-white p-4 shadow-card">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Resumen por Acción
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(ACCION_LABEL).map(([action, label]) => {
                        const count = allDamagedParts.filter(
                          (part) => part.accionTecnica === action,
                        ).length;
                        if (!count) return null;
                        return (
                          <div
                            key={action}
                            className="flex items-center justify-between"
                          >
                            <span className="text-xs text-gray-600">{label}</span>
                            <span className="text-xs font-bold text-brand-primary">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push('/expedientes/nuevo/fotografias')}
                className="order-3 rounded-lg border border-brand-primary px-5 py-2.5 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary/5 sm:order-1"
              >
                ← Volver a Fotografías
              </button>
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="order-2 flex items-center justify-center gap-2 rounded-lg border border-brand-secondary px-5 py-2.5 text-sm font-medium text-brand-secondary transition-colors hover:bg-brand-secondary/5 disabled:opacity-50"
              >
                <RefreshCw
                  className={cn('h-4 w-4', isFetching && 'animate-spin')}
                />
                Re-ejecutar Análisis
              </button>
              <button
                type="button"
                onClick={() => router.push(`/expedientes/${idSiniestro}`)}
                className="order-1 flex items-center justify-center gap-2 rounded-lg bg-brand-secondary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:order-3"
              >
                Continuar → Ver Expediente
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
  );
}
