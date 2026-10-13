'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Presupuesto } from '@/types/presupuesto';

export function usePresupuesto(idSiniestro: number | null) {
  return useQuery({
    queryKey: ['presupuesto', idSiniestro],
    queryFn: async () => {
      const { data } = await apiClient.get<Presupuesto>(
        `/api/v1/presupuestos/siniestro/${idSiniestro}`,
      );
      return data;
    },
    enabled: !!idSiniestro,
    retry: false,
  });
}

export function useGenerarPresupuesto(idSiniestro: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<Presupuesto>(
        `/api/v1/presupuestos/generar/${idSiniestro}`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuesto', idSiniestro] });
    },
  });
}

export function useUpdateLinea(idPresupuesto: number | null, idSiniestro: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      idLinea,
      costoRepuestoGtq,
      costoManoObraGtq,
      justificacion,
    }: {
      idLinea: number;
      costoRepuestoGtq: number;
      costoManoObraGtq: number;
      justificacion: string;
    }) => {
      const { data } = await apiClient.patch(
        `/api/v1/presupuestos/${idPresupuesto}/lineas/${idLinea}`,
        {
          costoRepuestoGtq,
          costoManoObraGtq,
          justificacion,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuesto', idSiniestro] });
    },
  });
}

export function useAprobarPresupuesto(idPresupuesto: number | null, idSiniestro: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (observaciones: string) => {
      const { data } = await apiClient.post(
        `/api/v1/presupuestos/${idPresupuesto}/aprobar`,
        { observaciones },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuesto', idSiniestro] });
      queryClient.invalidateQueries({ queryKey: ['siniestro'] });
    },
  });
}
