'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { VehiculoMarca, VehiculoModelo } from '@/types/catalogo';

export function useMarcas() {
  return useQuery({
    queryKey: ['catalogos', 'marcas'],
    queryFn: async () => {
      const { data } = await apiClient.get<VehiculoMarca[]>(
        '/api/v1/catalogos/marcas',
      );
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useModelos(idMarca?: number) {
  return useQuery({
    queryKey: ['catalogos', 'modelos', idMarca],
    queryFn: async () => {
      if (!idMarca) return [];
      const { data } = await apiClient.get<VehiculoModelo[]>(
        `/api/v1/catalogos/marcas/${idMarca}/modelos`,
      );
      return data;
    },
    enabled: Boolean(idMarca),
    staleTime: 5 * 60 * 1000,
  });
}
