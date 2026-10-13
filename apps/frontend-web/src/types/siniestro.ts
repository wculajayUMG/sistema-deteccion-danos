export type EstadoSiniestro = 'ABIERTO' | 'EN_PROCESO' | 'CERRADO';

export interface PiezaCercana {
  clase: string;
  confianza: number;
  bbox: {
    x: number;
    y: number;
    ancho: number;
    alto: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export interface PiezaDanada {
  idPiezaDanada: number;
  confianza: number | null;
  bboxX: number | null;
  bboxY: number | null;
  bboxAncho: number | null;
  bboxAlto: number | null;
  accionTecnica: string;
  pieza_afectada: string | null;
  pieza: PiezaCercana | null;
  severidad: {
    nivel: string;
    factorCosto: number;
  };
  catalogoPieza: {
    idPiezaCatalogo: number;
    nombrePieza: string;
  };
}

export interface DeteccionIA {
  idDeteccion: number;
  modeloVersion: string;
  tiempoInferenciaMs: number | null;
  confianzaPromedio: number | null;
  estado: string;
  piezasDanadas: PiezaDanada[];
}

export interface FotografiaConDeteccion {
  idFotografia: number;
  urlCloudflare: string;
  nombreArchivo: string;
  tamanioKb: number | null;
  orden: number;
  deteccion: DeteccionIA | null;
}

export interface Siniestro {
  idSiniestro: number;
  numeroReclamo: string;
  numeroPoliza: string;
  fechaSiniestro: string;
  fechaRegistro: string;
  lugarSiniestro: string | null;
  descripcion: string | null;
  estado: EstadoSiniestro;
  cliente: {
    idCliente: number;
    nombre: string;
    apellido: string;
    dpi: string | null;
    telefono: string | null;
  };
  vehiculo: {
    idVehiculo: number;
    placa: string;
    anio: number;
    color: string | null;
    marca: { nombreMarca: string };
    modelo: { nombreModelo: string };
  };
  usuario: {
    idUsuario: number;
    nombre: string;
    apellido: string;
  };
  fotografias: FotografiaConDeteccion[];
  presupuesto: {
    idPresupuesto: number;
    totalGtq: number;
    estado: string;
  } | null;
}

export interface SiniestrosPaginados {
  data: Siniestro[];
  total: number;
  page: number;
  lastPage: number;
}

export interface Estadisticas {
  total: number;
  abiertos: number;
  enProceso: number;
  cerrados: number;
  totalGtq: number;
}

export interface FotoUpload {
  id: string;
  file: File;
  preview: string;
  sizeKb: number;
  angulo: string;
  estado: 'pendiente' | 'comprimiendo' | 'subiendo' | 'completado' | 'error';
  urlCloudflare?: string;
  idFotografia?: number;
  error?: string;
}
