import {
  CACHE_MANAGER,
} from '@nestjs/cache-manager';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AccionTecnica } from '../common/enums/accion-tecnica.enum.js';
import { EstadoPresupuesto } from '../common/enums/estado-presupuesto.enum.js';
import { EstadoSiniestro } from '../common/enums/estado-siniestro.enum.js';
import { TipoGolpe } from '../common/enums/tipo-golpe.enum.js';
import { AuditTrail } from '../database/entities/audit-trail.entity.js';
import { BaremoPrecio } from '../database/entities/baremo-precio.entity.js';
import { LineaPresupuesto } from '../database/entities/linea-presupuesto.entity.js';
import { PiezaDanada } from '../database/entities/pieza-danada.entity.js';
import { Presupuesto } from '../database/entities/presupuesto.entity.js';
import { Repuesto } from '../database/entities/repuesto.entity.js';
import { Siniestro } from '../database/entities/siniestro.entity.js';
import { Usuario } from '../database/entities/usuario.entity.js';
import { UpdateLineaDto } from './dto/update-linea.dto.js';
import { PdfService } from './pdf.service.js';

@Injectable()
export class PresupuestosService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    @InjectRepository(Presupuesto)
    private readonly presupuestos: Repository<Presupuesto>,
    private readonly pdfService: PdfService,
  ) {}

  async findBySiniestro(idSiniestro: number): Promise<Presupuesto> {
    const presupuesto = await this.presupuestos.findOne({
      where: { siniestro: { idSiniestro } },
      relations: {
        siniestro: true,
        usuario: true,
        lineas: {
          piezaDanada: { catalogoPieza: true, severidad: true },
          baremo: true,
          repuesto: true,
        },
      },
    });
    if (!presupuesto) {
      throw new NotFoundException(
        `No hay presupuesto para el siniestro ${idSiniestro}`,
      );
    }
    return presupuesto;
  }

  async generarPresupuesto(
    idSiniestro: number,
    idUsuario: number,
  ): Promise<Presupuesto> {
    return this.dataSource.transaction(async (manager) => {
      const claimRepo = manager.getRepository(Siniestro);
      const damageRepo = manager.getRepository(PiezaDanada);
      const estimateRepo = manager.getRepository(Presupuesto);
      const lineRepo = manager.getRepository(LineaPresupuesto);
      const claim = await claimRepo.findOne({
        where: { idSiniestro },
        relations: { vehiculo: { marca: true, modelo: true } },
      });
      if (!claim) throw new NotFoundException(`Siniestro ${idSiniestro} no encontrado`);
      if (
        await estimateRepo.existsBy({ siniestro: { idSiniestro } })
      ) {
        throw new ConflictException(
          `El siniestro ${idSiniestro} ya tiene un presupuesto`,
        );
      }
      const damageParts = await damageRepo
        .createQueryBuilder('pieza')
        .innerJoinAndSelect('pieza.deteccion', 'deteccion')
        .innerJoinAndSelect('deteccion.fotografia', 'fotografia')
        .innerJoin('fotografia.siniestro', 'siniestro')
        .leftJoinAndSelect('pieza.severidad', 'severidad')
        .leftJoinAndSelect('pieza.catalogoPieza', 'catalogoPieza')
        .where('siniestro.idSiniestro = :idSiniestro', { idSiniestro })
        .getMany();
      if (!damageParts.length) {
        throw new ConflictException(
          'No se puede generar un presupuesto sin piezas detectadas',
        );
      }

      const user = await manager.getRepository(Usuario).findOneBy({
        idUsuario,
        estado: true,
      });
      if (!user) throw new NotFoundException('Usuario autenticado no encontrado');

      const lineSpecs: Array<{
        pieza: PiezaDanada;
        baremo: BaremoPrecio;
        repuesto: Repuesto | null;
        costoRepuesto: number;
        costoManoObra: number;
      }> = [];

      for (const pieza of damageParts) {
        const ACCION_A_TIPO: Record<AccionTecnica, TipoGolpe> = {
          [AccionTecnica.GOLPE_PEQUENO]:    TipoGolpe.GOLPE_PEQUENO,
          [AccionTecnica.GOLPE_MEDIANO]:    TipoGolpe.GOLPE_MEDIANO,
          [AccionTecnica.GOLPE_GRANDE]:     TipoGolpe.GOLPE_GRANDE,
          [AccionTecnica.CAMBIO_PIEZA]:     TipoGolpe.GOLPE_GRANDE,
          [AccionTecnica.REPARAR]:          TipoGolpe.GOLPE_PEQUENO,
          [AccionTecnica.REPARAR_PINTAR]:   TipoGolpe.GOLPE_PEQUENO,
          [AccionTecnica.ENDEREZAR_PINTAR]: TipoGolpe.GOLPE_MEDIANO,
          [AccionTecnica.REEMPLAZAR]:       TipoGolpe.GOLPE_GRANDE,
        };
        const tipoGolpe = ACCION_A_TIPO[pieza.accionTecnica] ?? TipoGolpe.GOLPE_MEDIANO;
        const baremoKey = `baremo:${pieza.catalogoPieza.idPiezaCatalogo}:${tipoGolpe}`;
        let baremo = await this.cache.get<BaremoPrecio>(baremoKey);
        if (!baremo) {
          baremo = await manager.getRepository(BaremoPrecio).findOne({
            where: {
              catalogoPieza: {
                idPiezaCatalogo: pieza.catalogoPieza.idPiezaCatalogo,
              },
              tipoGolpe,
              estado: true,
            },
          }) ?? undefined;
          if (baremo) await this.cache.set(baremoKey, baremo);
        }
        if (!baremo) {
          throw new NotFoundException(
            `No existe baremo para la pieza ${pieza.catalogoPieza.idPiezaCatalogo} y ${tipoGolpe}`,
          );
        }

        let repuesto: Repuesto | null = null;
        let costoRepuesto = 0;
        if (pieza.accionTecnica === AccionTecnica.CAMBIO_PIEZA) {
          repuesto = await manager
            .getRepository(Repuesto)
            .createQueryBuilder('repuesto')
            .where('repuesto.id_pieza_catalogo = :idPieza', {
              idPieza: pieza.catalogoPieza.idPiezaCatalogo,
            })
            .andWhere('repuesto.id_marca = :idMarca', {
              idMarca: claim.vehiculo.marca.idMarca,
            })
            .andWhere('repuesto.id_modelo = :idModelo', {
              idModelo: claim.vehiculo.modelo.idModelo,
            })
            .andWhere('repuesto.anio_desde <= :anio', {
              anio: claim.vehiculo.anio,
            })
            .andWhere('repuesto.anio_hasta >= :anio', {
              anio: claim.vehiculo.anio,
            })
            .andWhere('repuesto.estado = true')
            .getOne();
          costoRepuesto = repuesto?.costoGtq ?? 0;
        }

        lineSpecs.push({
          pieza,
          baremo,
          repuesto,
          costoRepuesto,
          costoManoObra: baremo.costoManoObraGtq,
        });
      }

      const total = lineSpecs.reduce(
        (sum, line) => sum + line.costoRepuesto + line.costoManoObra,
        0,
      );
      const estimate = await estimateRepo.save(
        estimateRepo.create({
          siniestro: claim,
          usuario: user,
          totalGtq: total,
          estado: EstadoPresupuesto.PRELIMINAR,
          fechaAprobacion: null,
          observaciones: null,
        }),
      );

      await lineRepo.save(
        lineSpecs.map((line) =>
          lineRepo.create({
            presupuesto: estimate,
            piezaDanada: line.pieza,
            baremo: line.baremo,
            repuesto: line.repuesto,
            descripcion: line.pieza.catalogoPieza.nombrePieza,
            costoRepuestoGtq: line.costoRepuesto,
            costoManoObraGtq: line.costoManoObra,
            subtotalGtq: line.costoRepuesto + line.costoManoObra,
            modificadoManualmente: false,
          }),
        ),
      );
      return estimate;
    }).then((estimate) => this.findBySiniestro(estimate.siniestro.idSiniestro));
  }

  async updateLinea(
    idPresupuesto: number,
    idLinea: number,
    dto: UpdateLineaDto,
    idUsuario: number,
    ip: string,
  ): Promise<LineaPresupuesto> {
    return this.dataSource.transaction(async (manager) => {
      const estimateRepo = manager.getRepository(Presupuesto);
      const lineRepo = manager.getRepository(LineaPresupuesto);
      const estimate = await estimateRepo.findOneBy({
        idPresupuesto,
      });
      if (!estimate) {
        throw new NotFoundException(`Presupuesto ${idPresupuesto} no encontrado`);
      }
      if (estimate.estado === EstadoPresupuesto.APROBADO) {
        throw new ForbiddenException('No se puede editar un presupuesto aprobado');
      }
      const line = await lineRepo.findOne({
        where: { idLinea, presupuesto: { idPresupuesto } },
        relations: { presupuesto: true },
      });
      if (!line) throw new NotFoundException(`Línea ${idLinea} no encontrada`);
      const previous = {
        costoRepuestoGtq: line.costoRepuestoGtq,
        costoManoObraGtq: line.costoManoObraGtq,
        subtotalGtq: line.subtotalGtq,
        descripcion: line.descripcion,
      };
      if (dto.costoRepuestoGtq !== undefined) {
        line.costoRepuestoGtq = dto.costoRepuestoGtq;
      }
      if (dto.costoManoObraGtq !== undefined) {
        line.costoManoObraGtq = dto.costoManoObraGtq;
      }
      if (dto.descripcion !== undefined) line.descripcion = dto.descripcion;
      line.subtotalGtq = line.costoRepuestoGtq + line.costoManoObraGtq;
      line.modificadoManualmente = true;
      await lineRepo.save(line);

      estimate.totalGtq =
        (await lineRepo.sum('subtotalGtq', {
          presupuesto: { idPresupuesto },
        })) ?? 0;
      await estimateRepo.save(estimate);

      const usuario = await manager.getRepository(Usuario).findOneBy({
        idUsuario,
      });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');
      await manager.getRepository(AuditTrail).save(
        manager.getRepository(AuditTrail).create({
          tablaAfectada: 'linea_presupuesto',
          campoModificado: Object.keys(dto).join(',') || 'costos',
          valorAnterior: JSON.stringify(previous),
          valorNuevo: JSON.stringify(dto),
          ipOrigen: ip,
          usuario,
          presupuesto: estimate,
        }),
      );
      return line;
    });
  }

  async aprobar(
    idPresupuesto: number,
    idUsuario: number,
    ip: string,
    observaciones?: string,
  ): Promise<Presupuesto> {
    return this.dataSource.transaction(async (manager) => {
      const estimates = manager.getRepository(Presupuesto);
      const estimate = await estimates.findOne({
        where: { idPresupuesto },
        relations: { siniestro: true },
      });
      if (!estimate) {
        throw new NotFoundException(`Presupuesto ${idPresupuesto} no encontrado`);
      }
      if (estimate.estado === EstadoPresupuesto.APROBADO) {
        throw new ConflictException('El presupuesto ya está aprobado');
      }
      const user = await manager.getRepository(Usuario).findOneBy({ idUsuario });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      const previousStatus = estimate.estado;
      estimate.estado = EstadoPresupuesto.APROBADO;
      estimate.fechaAprobacion = new Date();
      estimate.observaciones = observaciones ?? estimate.observaciones;
      await estimates.save(estimate);
      await manager.getRepository(AuditTrail).save(
        manager.getRepository(AuditTrail).create({
          tablaAfectada: 'presupuesto',
          campoModificado: 'estado',
          valorAnterior: previousStatus,
          valorNuevo: EstadoPresupuesto.APROBADO,
          ipOrigen: ip,
          usuario: user,
          presupuesto: estimate,
        }),
      );
      await manager.getRepository(Siniestro).update(
        estimate.siniestro.idSiniestro,
        { estado: EstadoSiniestro.CERRADO },
      );
      return estimates.findOneOrFail({
        where: { idPresupuesto },
        relations: {
          siniestro: true,
          usuario: true,
          lineas: {
            piezaDanada: { catalogoPieza: true, severidad: true },
            baremo: true,
            repuesto: true,
          },
        },
      });
    });
  }

  async generarPdf(idPresupuesto: number): Promise<Buffer> {
    const presupuesto = await this.presupuestos.findOne({
      where: { idPresupuesto },
      relations: {
        siniestro: {
          cliente: true,
          vehiculo: {
            marca: true,
            modelo: true,
          },
          usuario: true,
        },
        lineas: {
          piezaDanada: {
            severidad: true,
            catalogoPieza: true,
          },
        },
        usuario: true,
      },
    });

    if (!presupuesto) {
      throw new NotFoundException(`Presupuesto ${idPresupuesto} no encontrado`);
    }

    const s = presupuesto.siniestro;
    const v = s.vehiculo;

    return this.pdfService.generarDictamen({
      numeroReclamo: s.numeroReclamo,
      fechaGeneracion: presupuesto.fechaGeneracion.toISOString(),
      fechaAprobacion: presupuesto.fechaAprobacion?.toISOString() ?? null,
      cliente: {
        nombre: s.cliente.nombre,
        apellido: s.cliente.apellido,
        dpi: s.cliente.dpi ?? null,
        telefono: s.cliente.telefono ?? null,
      },
      vehiculo: {
        marca: v.marca.nombreMarca,
        modelo: v.modelo.nombreModelo,
        anio: v.anio,
        placa: v.placa,
        color: v.color ?? null,
      },
      ajustador: {
        nombre: presupuesto.usuario.nombre,
        apellido: presupuesto.usuario.apellido,
      },
      lineas: presupuesto.lineas.map((l) => ({
        descripcion:
          l.descripcion ??
          l.piezaDanada?.catalogoPieza?.nombrePieza ??
          'Zona dañada',
        accionTecnica: l.piezaDanada?.accionTecnica ?? '',
        severidad: l.piezaDanada?.severidad?.nivel ?? 'LEVE',
        costoRepuestoGtq: Number(l.costoRepuestoGtq),
        costoManoObraGtq: Number(l.costoManoObraGtq),
        subtotalGtq: Number(l.subtotalGtq),
        modificadoManualmente: l.modificadoManualmente,
      })),
      totalGtq: Number(presupuesto.totalGtq),
      estado: presupuesto.estado,
      observaciones: presupuesto.observaciones ?? null,
    });
  }
}
