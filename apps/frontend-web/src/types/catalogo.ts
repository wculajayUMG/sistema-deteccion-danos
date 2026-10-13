export interface VehiculoMarca {
  idMarca: number;
  nombreMarca: string;
  estado: boolean;
}

export interface VehiculoModelo {
  idModelo: number;
  nombreModelo: string;
  linea: string | null;
  estado: boolean;
}
