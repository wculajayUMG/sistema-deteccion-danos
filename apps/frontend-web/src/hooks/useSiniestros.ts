'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Estadisticas,
  SiniestrosPaginados,
} from '@/types/siniestro';

export interface SiniestrosParams {
  page?: number;
  limit?: number;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export function useSiniestros(params: SiniestrosParams) {
  return useQuery({
    queryKey: ['siniestros', params],
    queryFn: async () => {
      const { data } = await apiClient.get<SiniestrosPaginados>(
        '/api/v1/siniestros',
        { params },
      );
      return data;
    },
  });
}

export function useEstadisticas() {
  return useQuery({
    queryKey: ['siniestros', 'estadisticas'],
    queryFn: async () => {
      const { data } = await apiClient.get<Estadisticas>(
        '/api/v1/siniestros/estadisticas',
      );
      return data;
    },
  });
}
