'use client';

import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Play,
  Upload,
  X,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import CamaraGuiada, { type ZonaCamara } from '@/components/ia/CamaraGuiada';
import { apiClient } from '@/lib/api-client';
import { compressImage } from '@/lib/compress-image';
import { cn } from '@/lib/utils';
import { useNuevoSiniestroStore } from '@/stores/nuevo-siniestro-store';
import type { FotoUpload } from '@/types/siniestro';

const ZONA_LABEL: Record<string, string> = {
  frontal:           'Frontal',
  trasera:           'Trasera',
  lateral_izquierda: 'Lateral Izquierda',
  lateral_derecha:   'Lateral Derecha',
};

const ZONA_ANGULO: Record<string, string> = {
  frontal:           'Frontal',
  trasera:           'Posterior',
  lateral_izquierda: 'Lateral Izquierdo',
  lateral_derecha:   'Lateral Derecho',
};

function base64ToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (message) return message;
  }
  return error instanceof Error ? error.message : fallback;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ANGULOS = [
  'Frontal', 'Posterior', 'Lateral Izquierdo', 'Lateral Derecho',
  'Zona Dañada', 'Interior', 'Motor', 'Otro',
];
const IA_STEPS = [
  'Imágenes comprimidas',
  'Subidas a Cloudflare R2',
  'Ejecutando modelo YOLOv8...',
  'Generando Bounding Boxes...',
  'Clasificando severidad...',
  'Calculando pre-presupuesto...',
];

interface UploadedFoto {
  idFotografia: number;
  urlCloudflare: string;
}

export default function FotografiasExpedientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { id } = params;
  const { zonasAfectadas } = useNuevoSiniestroStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef(new Set<string>());

  const [fotos, setFotos] = useState<FotoUpload[]>([]);
  const [showIAModal, setShowIAModal] = useState(false);
  const [iaStep, setIaStep] = useState(0);
  const [iaError, setIaError] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');
  const [zonaActiva, setZonaActiva] = useState<ZonaCamara | null>(null);
  const [zonasCompletadas, setZonasCompletadas] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (zonasAfectadas.length === 0) {
      router.replace(`/expedientes/${id}/inspeccion`);
    }
  }, [zonasAfectadas, id, router]);

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    },
    [],
  );

  const updateFoto = useCallback((fotoId: string, changes: Partial<FotoUpload>) => {
    setFotos((current) =>
      current.map((foto) => (foto.id === fotoId ? { ...foto, ...changes } : foto)),
    );
  }, []);

  const uploadFoto = useCallback(
    async (foto: FotoUpload) => {
      updateFoto(foto.id, { estado: 'comprimiendo', error: undefined });
      try {
        const compressed = await compressImage(foto.file);
        if (foto.preview.startsWith('blob:')) {
          URL.revokeObjectURL(foto.preview);
          previewUrlsRef.current.delete(foto.preview);
        }
        updateFoto(foto.id, {
          estado: 'subiendo',
          preview: compressed.preview,
          sizeKb: compressed.sizeKb,
        });

        const formData = new FormData();
        formData.append('fotos', compressed.blob, foto.file.name);
        const { data } = await apiClient.post<UploadedFoto[]>(
          `/api/v1/siniestros/${id}/fotografias`,
          formData,
        );
        const savedFoto = Array.isArray(data) ? data[0] : undefined;
        if (
          !savedFoto ||
          !Number.isInteger(savedFoto.idFotografia) ||
          typeof savedFoto.urlCloudflare !== 'string'
        ) {
          throw new Error('El servidor devolvió datos incompletos de la fotografía.');
        }
        updateFoto(foto.id, {
          estado: 'completado',
          idFotografia: savedFoto.idFotografia,
          urlCloudflare: savedFoto.urlCloudflare,
        });
      } catch (error) {
        updateFoto(foto.id, {
          estado: 'error',
          error: getErrorMessage(error, 'Error al subir la fotografía.'),
        });
      }
    },
    [id, updateFoto],
  );

  const procesarArchivos = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploadNotice('');
      const seleccionadas = Array.from(files);
      const validas = seleccionadas.filter(
        (file) => file.type.startsWith('image/') && file.size <= MAX_FILE_SIZE,
      );
      const invalidas = seleccionadas.length - validas.length;
      if (invalidas > 0) {
        setUploadNotice(
          `${invalidas} archivo(s) no se agregaron. Seleccione imágenes de hasta 10 MB.`,
        );
      }
      if (validas.length === 0) return;

      const nuevasFotos: FotoUpload[] = validas.map((file) => {
        const preview = URL.createObjectURL(file);
        previewUrlsRef.current.add(preview);
        return {
          id: makeId(),
          file,
          preview,
          sizeKb: Math.round(file.size / 1024),
          angulo: 'Zona Dañada',
          estado: 'pendiente',
        };
      });
      setFotos((current) => [...current, ...nuevasFotos]);
      for (const foto of nuevasFotos) {
        await uploadFoto(foto);
      }
    },
    [uploadFoto],
  );

  const handleCaptura = useCallback(
    async (base64: string, zona: ZonaCamara) => {
      setZonaActiva(null);
      const filename = `guiada_${zona}_${Date.now()}.jpg`;
      const file = base64ToFile(base64, filename);
      const newFoto: FotoUpload = {
        id: makeId(),
        file,
        preview: base64,
        sizeKb: Math.round(file.size / 1024),
        angulo: ZONA_ANGULO[zona] ?? 'Zona Dañada',
        estado: 'pendiente',
      };
      setFotos((current) => [...current, newFoto]);
      setZonasCompletadas((current) => new Set([...current, zona]));
      await uploadFoto(newFoto);
    },
    [uploadFoto],
  );

  const eliminarFoto = useCallback(async (foto: FotoUpload) => {
    if (foto.estado === 'comprimiendo' || foto.estado === 'subiendo') return;
    if (foto.idFotografia) {
      try {
        await apiClient.delete(`/api/v1/fotografias/${foto.idFotografia}`);
      } catch (error) {
        setUploadNotice(getErrorMessage(error, 'No se pudo eliminar la fotografía del servidor.'));
        return;
      }
    }
    if (foto.preview.startsWith('blob:')) {
      URL.revokeObjectURL(foto.preview);
      previewUrlsRef.current.delete(foto.preview);
    }
    setFotos((current) => current.filter((item) => item.id !== foto.id));
  }, []);

  const cambiarAngulo = useCallback((fotoId: string, angulo: string) => {
    setFotos((current) =>
      current.map((foto) => (foto.id === fotoId ? { ...foto, angulo } : foto)),
    );
  }, []);

  const iniciarAnalisisIA = useCallback(async () => {
    const fotosCompletadas = fotos.filter(
      (foto) => foto.estado === 'completado' && foto.idFotografia,
    );
    if (!fotosCompletadas.length || procesando) return;

    setShowIAModal(true);
    setIaStep(2);
    setIaError('');
    setProcesando(true);
    try {
      for (const foto of fotosCompletadas) {
        await apiClient.post('/api/v1/detecciones/procesar', {
          id_fotografia: foto.idFotografia,
        });
      }
      for (const step of [3, 4, 5, 6]) {
        setIaStep(step);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      router.push(`/expedientes/${id}/resultados`);
    } catch (error) {
      setIaError(getErrorMessage(error, 'Error al ejecutar el análisis IA.'));
      setProcesando(false);
    }
  }, [fotos, procesando, router, id]);

  const fotosCompletadas = fotos.filter((foto) => foto.estado === 'completado').length;
  const hayFotos = fotosCompletadas > 0;

  if (zonasAfectadas.length === 0) return null;

  return (
    <AppLayout breadcrumb={['Expedientes', `#${id}`, 'Fotografías']}>
      <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
        <section className="rounded-card bg-brand-primary p-4 text-white md:p-6">
          <button
            type="button"
            onClick={() => router.push(`/expedientes/${id}/inspeccion`)}
            className="mb-3 flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a inspección
          </button>
          <h1 className="text-lg font-bold">Fotografías del siniestro</h1>
          <p className="mt-0.5 text-sm text-white/70">
            Expediente #{id} · {zonasAfectadas.length} zona(s) identificada(s)
          </p>
        </section>

        {/* Cámara guiada por zona */}
        <section className="rounded-card bg-white p-4 shadow-card md:p-6">
          <h2 className="mb-4 text-sm font-bold text-brand-text">Cámara guiada por zona</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {zonasAfectadas.map((zona) => {
              const done = zonasCompletadas.has(zona);
              return (
                <button
                  key={zona}
                  type="button"
                  onClick={() => setZonaActiva(zona as ZonaCamara)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all',
                    done
                      ? 'border-green-300 bg-green-50'
                      : 'border-brand-secondary/30 bg-brand-secondary/5 hover:border-brand-secondary',
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  ) : (
                    <Camera className="h-8 w-8 text-brand-secondary" />
                  )}
                  <span className={cn('text-xs font-semibold', done ? 'text-green-700' : 'text-brand-text')}>
                    {ZONA_LABEL[zona] ?? zona}
                  </span>
                  <span className={cn('text-[10px]', done ? 'text-green-600' : 'text-gray-400')}>
                    {done ? '✓ Fotografiada' : 'Tomar foto'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Carga manual */}
        <section className="rounded-card bg-white p-4 shadow-card md:p-6">
          <h2 className="mb-4 text-sm font-bold text-brand-text">Captura y carga de fotografías</h2>
          <div
            className="cursor-pointer rounded-xl border-2 border-dashed border-brand-secondary/40 p-6 text-center transition-colors hover:border-brand-secondary hover:bg-brand-secondary/5 md:p-8"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void procesarArchivos(event.dataTransfer.files);
            }}
          >
            <Upload className="mx-auto mb-3 h-10 w-10 text-brand-secondary/50" />
            <p className="mb-4 text-sm text-gray-500">Arrastre las fotos aquí o seleccione una opción</p>
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <Camera className="h-4 w-4" />
                Abrir Cámara
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="flex items-center justify-center gap-2 rounded-lg border border-brand-secondary px-4 py-2 text-sm font-medium text-brand-secondary transition-colors hover:bg-brand-secondary/5"
              >
                <Upload className="h-4 w-4" />
                Seleccionar Archivos
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-400">JPG, PNG — Máx. 10 MB por archivo.</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              void procesarArchivos(event.target.files);
              event.currentTarget.value = '';
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              void procesarArchivos(event.target.files);
              event.currentTarget.value = '';
            }}
          />

          {uploadNotice && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="alert">
              {uploadNotice}
            </p>
          )}

          {fotos.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Fotografías cargadas
                </h3>
                <span className="text-xs font-medium text-brand-secondary">
                  {fotosCompletadas} / {fotos.length} completadas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {fotos.map((foto) => {
                  const busy = foto.estado === 'comprimiendo' || foto.estado === 'subiendo';
                  return (
                    <article
                      key={foto.id}
                      className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="relative aspect-video">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={foto.preview}
                          alt={`Fotografía ${foto.angulo}`}
                          className="h-full w-full object-cover"
                        />
                        {busy && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                            <span className="text-xs text-white">
                              {foto.estado === 'comprimiendo' ? 'Comprimiendo...' : 'Subiendo a R2...'}
                            </span>
                          </div>
                        )}
                        {foto.estado === 'error' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 p-2 text-center">
                            <AlertCircle className="h-5 w-5 text-red-300" />
                            <span className="text-xs text-white">Error al procesar</span>
                          </div>
                        )}
                        {foto.estado === 'completado' && (
                          <CheckCircle2 className="absolute left-1 top-1 h-5 w-5 text-green-500 drop-shadow" />
                        )}
                        <button
                          type="button"
                          aria-label={`Eliminar fotografía ${foto.angulo}`}
                          disabled={busy}
                          onClick={() => void eliminarFoto(foto)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {foto.error && (
                        <p className="px-2 pt-2 text-xs text-red-600" role="alert">{foto.error}</p>
                      )}
                      <div className="bg-white p-1.5">
                        <div className="relative">
                          <select
                            value={foto.angulo}
                            onChange={(event) => cambiarAngulo(foto.id, event.target.value)}
                            className="w-full appearance-none rounded border border-gray-200 bg-white py-1 pl-2 pr-6 text-xs outline-none"
                            aria-label={`Ángulo de la fotografía ${foto.angulo}`}
                          >
                            {ANGULOS.map((angulo) => (
                              <option key={angulo} value={angulo}>{angulo}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                        </div>
                        <p className="mt-0.5 text-right text-[10px] text-gray-400">{foto.sizeKb} KB</p>
                        {foto.estado === 'error' && (
                          <button
                            type="button"
                            onClick={() => void uploadFoto(foto)}
                            className="w-full py-1 text-xs font-medium text-brand-primary hover:underline"
                          >
                            Reintentar carga
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Botón de análisis IA */}
        <section className="rounded-card bg-white p-4 shadow-card">
          {hayFotos ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                <p className="text-sm font-medium text-green-700">
                  Sistema listo para ejecutar
                </p>
              </div>
              <button
                type="button"
                onClick={() => void iniciarAnalisisIA()}
                disabled={procesando}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {procesando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Iniciar Análisis
              </button>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-400">
                Cargue al menos 1 fotografía para activar el análisis IA
              </p>
              <button
                type="button"
                disabled
                className="mt-3 w-full cursor-not-allowed rounded-lg bg-gray-200 px-6 py-3 text-sm font-semibold text-gray-400"
              >
                Iniciar Análisis
              </button>
            </div>
          )}
        </section>

        {/* CamaraGuiada modal */}
        {zonaActiva && (
          <CamaraGuiada
            zona={zonaActiva}
            onCaptura={(base64) => void handleCaptura(base64, zonaActiva)}
            onCancelar={() => setZonaActiva(null)}
          />
        )}

        {/* Modal de progreso IA */}
        {showIAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="ia-modal-title"
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl md:p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary">
                  <span className="text-sm font-bold text-white">IA</span>
                </div>
                <div>
                  <h2 id="ia-modal-title" className="text-sm font-bold text-brand-text">
                    Seguros El Roble
                  </h2>
                  <p className="text-xs text-gray-400">Procesando análisis IA</p>
                </div>
              </div>
              <div className="mb-6 space-y-3">
                {IA_STEPS.map((step, index) => {
                  const done = iaStep > index;
                  const active = iaStep === index;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300',
                          done ? 'bg-brand-secondary' : active ? 'bg-brand-primary' : 'bg-gray-200',
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        ) : active ? (
                          <Loader2 className="h-3 w-3 animate-spin text-white" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-sm transition-colors',
                          done
                            ? 'font-medium text-brand-secondary'
                            : active
                              ? 'font-semibold text-brand-primary'
                              : 'text-gray-400',
                        )}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mb-4 h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-brand-secondary transition-all duration-500"
                  style={{ width: `${Math.round((iaStep / IA_STEPS.length) * 100)}%` }}
                />
              </div>
              {iaError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="flex items-center gap-2 text-sm text-red-700" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {iaError}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowIAModal(false); setIaError(''); }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={() => void iniciarAnalisisIA()}
                      className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs text-white hover:opacity-90"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-xs text-gray-400">
                  Enviando fotografías al servicio de análisis...
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
