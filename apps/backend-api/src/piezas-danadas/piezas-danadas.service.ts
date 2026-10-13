import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccionTecnica } from '../common/enums/accion-tecnica.enum.js';
import { EstadoPresupuesto } from '../common/enums/estado-presupuesto.enum.js';
import { AuditTrail } from '../database/entities/audit-trail.entity.js';
import { PiezaDanada } from '../database/entities/pieza-danada.entity.js';
import { Presupuesto } from '../database/entities/presupuesto.entity.js';
import { Usuario } from '../database/entities/usuario.entity.js';
import { EditarPiezaDanadaDto } from './dto/editar-pieza-danada.dto.js';

@Injectable()
export class PiezasDanadasService {
  constructor(private readonly dataSource: DataSource) {}

  async editar(
    idPiezaDanada: number,
    dto: EditarPiezaDanadaDto,
    idUsuario: number,
    ipOrigen: string,
  ): Promise<PiezaDanada> {
    const justificacion = dto.justificacion.trim();
    if (justificacion.length < 5 || justificacion.length > 1000) {
      throw new BadRequestException(
        'La justificación debe contener entre 5 y 1000 caracteres.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const piezaRepository = manager.getRepository(PiezaDanada);
      const pieza = await piezaRepository.findOne({
        where: { idPiezaDanada },
        relations: {
          deteccion: {
            fotografia: { siniestro: true },
          },
        },
      });
      if (!pieza) {
        throw new NotFoundException(
          `Pieza dañada ${idPiezaDanada} no encontrada.`,
        );
      }

      const idSiniestro =
        pieza.deteccion.fotografia.siniestro.idSiniestro;
      const presupuestoRepository = manager.getRepository(Presupuesto);
      const presupuesto = await presupuestoRepository.findOne({
        where: { siniestro: { idSiniestro } },
      });
      if (presupuesto?.estado === EstadoPresupuesto.APROBADO) {
        throw new ForbiddenException(
          'No se puede cambiar la clasificación de una pieza en un presupuesto aprobado.',
        );
      }

      const usuario = await manager.getRepository(Usuario).findOneBy({
        idUsuario,
        estado: true,
      });
      if (!usuario) {
        throw new NotFoundException('Usuario autenticado no encontrado.');
      }

      const accionAnterior: AccionTecnica = pieza.accionTecnica;
      pieza.accionTecnica = dto.accionTecnica;
      await piezaRepository.save(pieza);

      const auditRepository = manager.getRepository(AuditTrail);
      await auditRepository.save(
        auditRepository.create({
          tablaAfectada: 'pieza_danada',
          campoModificado: 'accion_tecnica',
          valorAnterior: accionAnterior,
          valorNuevo: JSON.stringify({
            accionTecnica: dto.accionTecnica,
            justificacion,
          }),
          ipOrigen,
          usuario,
          presupuesto: presupuesto ?? null,
        }),
      );

      return piezaRepository.findOneOrFail({
        where: { idPiezaDanada },
        relations: {
          severidad: true,
          catalogoPieza: true,
          deteccion: true,
        },
      });
    });
  }
}
