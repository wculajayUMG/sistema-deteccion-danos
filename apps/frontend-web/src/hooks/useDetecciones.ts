'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { FotografiaConDeteccion, Siniestro } from '@/types/siniestro';

export function useFotografiasConDetecciones(
  idSiniestro: number | null,
) {
  return useQuery({
    queryKey: ['fotografias-detecciones', idSiniestro],
    queryFn: async () => {
      const { data } = await apiClient.get<FotografiaConDeteccion[]>(
        `/api/v1/siniestros/${idSiniestro}/fotografias`,
      );
      return data;
    },
    enabled: idSiniestro !== null,
    refetchInterval: false,
  });
}

export function useSiniestroCompleto(idSiniestro: number | null) {
  return useQuery({
    queryKey: ['siniestro', idSiniestro],
    queryFn: async () => {
      const { data } = await apiClient.get<Siniestro>(
        `/api/v1/siniestros/${idSiniestro}`,
      );
      return data;
    },
    enabled: idSiniestro !== null,
  });
}
