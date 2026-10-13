import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { CatalogoPieza } from '../database/entities/catalogo-pieza.entity.js';
import { DeteccionIa } from '../database/entities/deteccion-ia.entity.js';
import { Fotografia } from '../database/entities/fotografia.entity.js';
import { PiezaDanada } from '../database/entities/pieza-danada.entity.js';
import { Severidad } from '../database/entities/severidad.entity.js';
import { IaModule } from '../ia/ia.module.js';
import { DeteccionesController } from './detecciones.controller.js';
import { DeteccionesService } from './detecciones.service.js';

@Module({
  imports: [
    AuthModule,
    IaModule,
    TypeOrmModule.forFeature([
      CatalogoPieza,
      DeteccionIa,
      Fotografia,
      PiezaDanada,
      Severidad,
    ]),
  ],
  controllers: [DeteccionesController],
  providers: [DeteccionesService],
})
export class DeteccionesModule {}
