export type EstadoPresupuesto = 'PRELIMINAR' | 'REVISADO' | 'APROBADO';

export interface LineaPresupuesto {
  idLinea: number;
  descripcion: string | null;
  costoRepuestoGtq: number;
  costoManoObraGtq: number;
  subtotalGtq: number;
  modificadoManualmente: boolean;
  piezaDanada: {
    idPiezaDanada: number;
    accionTecnica: string;
    confianza: number | null;
    severidad: {
      nivel: string;
    };
    catalogoPieza: {
      nombrePieza: string;
    };
  };
  baremo: {
    idBaremo: number;
    tipoGolpe: string;
    costoManoObraGtq: number;
  } | null;
  repuesto: {
    idRepuesto: number;
    costoGtq: number;
    proveedor: string | null;
  } | null;
}

export interface Presupuesto {
  idPresupuesto: number;
  totalGtq: number;
  estado: EstadoPresupuesto;
  fechaGeneracion: string;
  fechaAprobacion: string | null;
  observaciones: string | null;
  usuario: {
    nombre: string;
    apellido: string;
    rol: { nombreRol: string };
  };
  lineas: LineaPresupuesto[];
}
