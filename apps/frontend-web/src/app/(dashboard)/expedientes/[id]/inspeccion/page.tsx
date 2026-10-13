'use client';

import { useCallback, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import VehiculoSVG from '@/components/vehiculo/VehiculoSVG';
import { apiClient } from '@/lib/api-client';
import { useNuevoSiniestroStore } from '@/stores/nuevo-siniestro-store';
import type { Siniestro } from '@/types/siniestro';

const ZONA_LABEL: Record<string, string> = {
  frontal:           'Frontal',
  trasera:           'Trasera',
  lateral_izquierda: 'Lateral Izquierda',
  lateral_derecha:   'Lateral Derecha',
};

export default function InspeccionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { id } = params;
  const { setZonasAfectadas, zonasAfectadas } = useNuevoSiniestroStore();
  const [piezasSeleccionadas, setPiezas] = useState<string[]>([]);
  const [piezasNombres, setPiezasNombres] = useState<Record<string, string>>({});

  const { data: siniestro } = useQuery({
    queryKey: ['siniestro', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Siniestro>(`/api/v1/siniestros/${id}`);
      return data;
    },
    enabled: /^\d+$/.test(id),
  });

  const handleTogglePieza = useCallback((piezaId: string, nombre: string) => {
    setPiezas((current) =>
      current.includes(piezaId)
        ? current.filter((p) => p !== piezaId)
        : [...current, piezaId],
    );
    setPiezasNombres((current) => ({ ...current, [piezaId]: nombre }));
  }, []);

  const handleZonasChange = useCallback(
    (zonas: string[]) => { setZonasAfectadas(zonas); },
    [setZonasAfectadas],
  );

  const numeroReclamo = siniestro?.numeroReclamo ?? `#${id}`;

  return (
    <AppLayout breadcrumb={['Expedientes', numeroReclamo, 'Inspección']}>
      <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
        <section className="rounded-card bg-brand-primary p-4 text-white md:p-6">
          <button
            type="button"
            onClick={() => router.push(`/expedientes/${id}`)}
            className="mb-3 flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al expediente
          </button>
          <h1 className="text-lg font-bold">Inspección de daños</h1>
          <p className="mt-0.5 text-sm text-white/70">{numeroReclamo}</p>
        </section>

        <section className="rounded-card bg-white p-4 shadow-card md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent/20">
              <MapPin className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-brand-text">Zonas dañadas</h2>
              <p className="text-xs text-gray-400">
                Selecciona las piezas afectadas para activar la cámara guiada
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <VehiculoSVG
              seleccionadas={piezasSeleccionadas}
              onToggle={handleTogglePieza}
              onZonasChange={handleZonasChange}
            />
            <div className="flex flex-col justify-center gap-3">
              {zonasAfectadas.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-amber-800">Zonas afectadas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {zonasAfectadas.map((zona) => (
                      <span
                        key={zona}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800"
                      >
                        <MapPin className="h-3 w-3" />
                        {ZONA_LABEL[zona] ?? zona}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  Toca las piezas dañadas en el diagrama para identificar las zonas
                  que se fotografiarán.
                </p>
              )}
              {piezasSeleccionadas.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {piezasSeleccionadas.map((piezaId) => (
                    <span
                      key={piezaId}
                      className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500"
                    >
                      {piezasNombres[piezaId] ?? piezaId}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-col justify-between gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push(`/expedientes/${id}`)}
            className="rounded-lg border border-brand-primary px-6 py-2.5 text-sm font-medium text-brand-primary hover:bg-brand-primary/5"
          >
            ← Volver
          </button>
          <button
            type="button"
            disabled={zonasAfectadas.length === 0}
            onClick={() => router.push(`/expedientes/${id}/fotografias`)}
            className="rounded-lg bg-brand-secondary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            Continuar a fotografías →
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
