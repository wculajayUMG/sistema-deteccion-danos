import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditTrail } from '../database/entities/audit-trail.entity.js';
import { PiezaDanada } from '../database/entities/pieza-danada.entity.js';
import { Presupuesto } from '../database/entities/presupuesto.entity.js';
import { Usuario } from '../database/entities/usuario.entity.js';
import { PiezasDanadasController } from './piezas-danadas.controller.js';
import { PiezasDanadasService } from './piezas-danadas.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditTrail, PiezaDanada, Presupuesto, Usuario]),
  ],
  controllers: [PiezasDanadasController],
  providers: [PiezasDanadasService],
})
export class PiezasDanadasModule {}
