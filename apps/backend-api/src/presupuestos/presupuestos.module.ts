import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditTrail } from '../database/entities/audit-trail.entity.js';
import { BaremoPrecio } from '../database/entities/baremo-precio.entity.js';
import { LineaPresupuesto } from '../database/entities/linea-presupuesto.entity.js';
import { PiezaDanada } from '../database/entities/pieza-danada.entity.js';
import { Presupuesto } from '../database/entities/presupuesto.entity.js';
import { Repuesto } from '../database/entities/repuesto.entity.js';
import { Siniestro } from '../database/entities/siniestro.entity.js';
import { Usuario } from '../database/entities/usuario.entity.js';
import { PresupuestosController } from './presupuestos.controller.js';
import { PresupuestosService } from './presupuestos.service.js';
import { PdfService } from './pdf.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Presupuesto,
      LineaPresupuesto,
      PiezaDanada,
      BaremoPrecio,
      Repuesto,
      Siniestro,
      Usuario,
      AuditTrail,
    ]),
  ],
  controllers: [PresupuestosController],
  providers: [PresupuestosService, PdfService],
  exports: [PresupuestosService],
})
export class PresupuestosModule {}
