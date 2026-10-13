import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../database/entities/cliente.entity.js';
import { Presupuesto } from '../database/entities/presupuesto.entity.js';
import { Siniestro } from '../database/entities/siniestro.entity.js';
import { Usuario } from '../database/entities/usuario.entity.js';
import { Vehiculo } from '../database/entities/vehiculo.entity.js';
import { VehiculoMarca } from '../database/entities/vehiculo-marca.entity.js';
import { VehiculoModelo } from '../database/entities/vehiculo-modelo.entity.js';
import { SiniestrosController } from './siniestros.controller.js';
import { SiniestrosService } from './siniestros.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Siniestro,
      Cliente,
      Vehiculo,
      VehiculoMarca,
      VehiculoModelo,
      Presupuesto,
      Usuario,
    ]),
  ],
  controllers: [SiniestrosController],
  providers: [SiniestrosService],
  exports: [SiniestrosService],
})
export class SiniestrosModule {}
