'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Cpu,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import BoundingBoxOverlay from '@/components/ia/BoundingBoxOverlay';
import TablaDetecciones from '@/components/ia/TablaDetecciones';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type {
  FotografiaConDeteccion,
  PiezaDanada,
} from '@/types/siniestro';

export default function ResultadosPorIdPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [fotoActual, setFotoActual] = useState(0);

  const {
    data: fotografias,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['fotografias-detecciones', id],
    queryFn: async () => {
      const { data } = await apiClient.get<FotografiaConDeteccion[]>(
        `/api/v1/siniestros/${id}/fotografias`,
      );
      return data;
    },
    enabled: !!id,
  });

  const { data: siniestro } = useQuery({
    queryKey: ['siniestro', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/v1/siniestros/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const foto: FotografiaConDeteccion | undefined = fotografias?.[fotoActual];

  const todasLasPiezas: PiezaDanada[] = (fotografias ?? []).flatMap(
    (f) => f.deteccion?.piezasDanadas ?? [],
  );

  const totalDetecciones = todasLasPiezas.length;

  const fotosAnalizadas = (fotografias ?? []).filter(
    (f) => f.deteccion !== null,
  ).length;

  const confianzaPromedio =
    totalDetecciones > 0
      ? todasLasPiezas.reduce((sum, p) => sum + (p.confianza ?? 0), 0) /
        totalDetecciones
      : 0;

  const bboxes = (foto?.deteccion?.piezasDanadas ?? [])
    .filter(
      (pieza): pieza is PiezaDanada & {
        bboxX: number;
        bboxY: number;
        bboxAncho: number;
        bboxAlto: number;
      } =>
        typeof pieza.bboxX === 'number' &&
        typeof pieza.bboxY === 'number' &&
        typeof pieza.bboxAncho === 'number' &&
        typeof pieza.bboxAlto === 'number',
    )
    .map((pieza) => ({
      x: pieza.bboxX,
      y: pieza.bboxY,
      ancho: pieza.bboxAncho,
      alto: pieza.bboxAlto,
      label: pieza.catalogoPieza?.nombrePieza ?? 'Daño',
      confianza: pieza.confianza ?? 0,
      severidad: pieza.severidad?.nivel ?? 'LEVE',
      accionTecnica: pieza.accionTecnica,
    }));

  async function handleEditPieza(
    idPieza: number,
    accionTecnica: string,
    justificacion: string,
  ) {
    await apiClient.patch(`/api/v1/pieza-danada/${idPieza}`, {
      accionTecnica,
      justificacion,
    });
    await refetch();
  }

  const modoFallback = (fotografias ?? []).some(
    (f) => f.deteccion?.modeloVersion?.includes('yolov8n') ?? false,
  );

  const numeroReclamo = siniestro?.numeroReclamo ?? `#${id}`;
  const vehiculoLabel = siniestro?.vehiculo
    ? `${siniestro.vehiculo.marca.nombreMarca} ${siniestro.vehiculo.modelo.nombreModelo} ${siniestro.vehiculo.anio}`
    : '';

  return (
    <AppLayout breadcrumb={['Expedientes', numeroReclamo, 'Resultados IA']}>
      <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-card bg-white p-6 shadow-card"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="rounded-card bg-brand-primary p-4 text-white md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/expedientes/${id}`)}
                    className="rounded-lg bg-white/10 p-2 transition-colors hover:bg-white/20"
                  >
                    <ArrowLeft className="h-4 w-4 text-white" />
                  </button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Cpu className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold md:text-lg">Resultados IA</h2>
                    <p className="mt-0.5 text-xs text-white/70">
                      {numeroReclamo}
                      {vehiculoLabel && ` · ${vehiculoLabel}`}
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
                  {totalDetecciones > 0 && (
                    <span className="rounded-full bg-brand-secondary px-3 py-1 text-xs font-semibold">
                      ✓ INFERENCIA EXITOSA
                    </span>
                  )}
                </div>
              </div>

              {modoFallback && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/20 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <p className="text-xs text-amber-100">
                    Usando modelo fallback (yolov8n.pt). Las clasificaciones son aproximadas.
                  </p>
                </div>
              )}
            </div>

            {totalDetecciones === 0 && !isLoading ? (
              <div className="rounded-card bg-white p-8 text-center shadow-card">
                <Cpu className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p className="mb-1 font-medium text-gray-500">Sin detecciones registradas</p>
                <p className="mb-4 text-sm text-gray-400">
                  Este expediente no tiene análisis IA completado aún.
                </p>
                <button
                  type="button"
                  onClick={() => router.push(`/expedientes/${id}`)}
                  className="text-sm font-medium text-brand-secondary hover:underline"
                >
                  ← Volver al expediente
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <div className="overflow-hidden rounded-card bg-white shadow-card">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <h3 className="text-sm font-bold text-brand-text">
                        Evidencia Fotográfica
                      </h3>
                      <button
                        type="button"
                        onClick={() => void refetch()}
                        className="rounded-lg p-1.5 hover:bg-gray-50"
                      >
                        <RefreshCw className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>

                    {fotografias && fotografias.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-2">
                        {fotografias.map((f, idx) => (
                          <button
                            key={f.idFotografia}
                            type="button"
                            onClick={() => setFotoActual(idx)}
                            className={cn(
                              'h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                              fotoActual === idx ? 'border-brand-secondary' : 'border-gray-200',
                            )}
                          >
                            <img
                              src={f.urlCloudflare}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="relative bg-gray-900">
                      {foto ? (
                        <BoundingBoxOverlay
                          imageSrc={foto.urlCloudflare}
                          detecciones={bboxes}
                          className="w-full"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center">
                          <p className="text-sm text-gray-500">Sin fotografías</p>
                        </div>
                      )}
                    </div>

                    {fotografias && fotografias.length > 1 && (
                      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setFotoActual((p) => Math.max(0, p - 1))}
                          disabled={fotoActual === 0}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                            setFotoActual((p) => Math.min((fotografias?.length ?? 1) - 1, p + 1))
                          }
                          disabled={fotoActual === (fotografias?.length ?? 1) - 1}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <TablaDetecciones
                    piezas={todasLasPiezas}
                    onEditPieza={handleEditPieza}
                  />
                </div>
              </div>
            )}

            {!fotografias?.length && !isLoading && (
              <div className="rounded-card bg-white p-8 text-center shadow-card">
                <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p className="text-gray-500">No hay fotografías para analizar</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
