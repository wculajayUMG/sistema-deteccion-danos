'use client';

import { create } from 'zustand';

export interface DatosCliente {
  tipoCliente: 'ASEGURADO' | 'TERCERO';
  nombreCliente: string;
  apellidoCliente: string;
  dpiCliente: string;
  telefonoCliente: string;
  correoCliente: string;
  direccionCliente: string;
}

export interface DatosSiniestro {
  numeroPoliza: string;
  fechaSiniestro: string;
  lugarSiniestro: string;
  descripcion: string;
}

export interface DatosVehiculo {
  idMarca: number;
  nombreMarca: string;
  idModelo: number;
  nombreModelo: string;
  anio: number;
  placa: string;
  tipoVehiculo: string;
  color: string;
  numeroChasis: string;
  numeroMotor: string;
}

interface NuevoSiniestroState {
  idSiniestro: number | null;
  numeroReclamo: string | null;
  cliente: DatosCliente | null;
  siniestro: DatosSiniestro | null;
  vehiculo: DatosVehiculo | null;
  zonasAfectadas: string[];
  pasoActual: number;
  setPasoActual: (paso: number) => void;
  setDatosCliente: (cliente: DatosCliente, siniestro: DatosSiniestro) => void;
  setDatosVehiculo: (vehiculo: DatosVehiculo) => void;
  setSiniestroCreado: (id: number, reclamo: string) => void;
  setZonasAfectadas: (zonas: string[]) => void;
  reset: () => void;
}

const initialState = {
  idSiniestro: null,
  numeroReclamo: null,
  cliente: null,
  siniestro: null,
  vehiculo: null,
  zonasAfectadas: [] as string[],
  pasoActual: 1,
};

export const useNuevoSiniestroStore = create<NuevoSiniestroState>((set) => ({
  ...initialState,
  setPasoActual: (pasoActual) => set({ pasoActual }),
  setDatosCliente: (cliente, siniestro) =>
    set({ cliente, siniestro, pasoActual: 2 }),
  setDatosVehiculo: (vehiculo) => set({ vehiculo, pasoActual: 3 }),
  setSiniestroCreado: (idSiniestro, numeroReclamo) =>
    set({ idSiniestro, numeroReclamo }),
  setZonasAfectadas: (zonasAfectadas) => set({ zonasAfectadas }),
  reset: () => set(initialState),
}));
