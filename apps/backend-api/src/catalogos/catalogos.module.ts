import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaremoPrecio } from '../database/entities/baremo-precio.entity.js';
import { CatalogoPieza } from '../database/entities/catalogo-pieza.entity.js';
import { Repuesto } from '../database/entities/repuesto.entity.js';
import { VehiculoMarca } from '../database/entities/vehiculo-marca.entity.js';
import { VehiculoModelo } from '../database/entities/vehiculo-modelo.entity.js';
import { AdminCatalogosController } from './admin-catalogos.controller.js';
import { CatalogosController } from './catalogos.controller.js';
import { CatalogosService } from './catalogos.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VehiculoMarca,
      VehiculoModelo,
      CatalogoPieza,
      BaremoPrecio,
      Repuesto,
    ]),
  ],
  controllers: [CatalogosController, AdminCatalogosController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
