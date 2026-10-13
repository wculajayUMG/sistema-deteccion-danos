import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EstadoSiniestro } from '../common/enums/estado-siniestro.enum.js';
import { Cliente } from '../database/entities/cliente.entity.js';
import { Presupuesto } from '../database/entities/presupuesto.entity.js';
import { Siniestro } from '../database/entities/siniestro.entity.js';
import { Usuario } from '../database/entities/usuario.entity.js';
import { Vehiculo } from '../database/entities/vehiculo.entity.js';
import { VehiculoMarca } from '../database/entities/vehiculo-marca.entity.js';
import { VehiculoModelo } from '../database/entities/vehiculo-modelo.entity.js';
import { CreateSiniestroDto } from './dto/create-siniestro.dto.js';
import { UpdateSiniestroDto } from './dto/update-siniestro.dto.js';

interface ReclamoRow {
  max: string | null;
}

@Injectable()
export class SiniestrosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Siniestro)
    private readonly siniestros: Repository<Siniestro>,
    @InjectRepository(Cliente)
    private readonly clientes: Repository<Cliente>,
    @InjectRepository(Vehiculo)
    private readonly vehiculos: Repository<Vehiculo>,
    @InjectRepository(VehiculoMarca)
    private readonly marcas: Repository<VehiculoMarca>,
    @InjectRepository(VehiculoModelo)
    private readonly modelos: Repository<VehiculoModelo>,
    @InjectRepository(Presupuesto)
    private readonly presupuestos: Repository<Presupuesto>,
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
  ) {}

  async create(dto: CreateSiniestroDto, idUsuario: number): Promise<Siniestro> {
    return this.dataSource.transaction(async (manager) => {
      const year = new Date().getFullYear();
      await manager.query('SELECT pg_advisory_xact_lock($1)', [
        year + 20260000,
      ]);

      const clients = manager.getRepository(Cliente);
      const vehicles = manager.getRepository(Vehiculo);
      const claims = manager.getRepository(Siniestro);
      const users = manager.getRepository(Usuario);
      const makes = manager.getRepository(VehiculoMarca);
      const models = manager.getRepository(VehiculoModelo);

      let cliente = dto.dpiCliente
        ? await clients.findOneBy({ dpi: dto.dpiCliente })
        : null;
      if (!cliente) {
        cliente = await clients.save(
          clients.create({
            tipoCliente: dto.tipoCliente,
            nombre: dto.nombreCliente,
            apellido: dto.apellidoCliente,
            dpi: dto.dpiCliente ?? null,
            telefono: dto.telefonoCliente ?? null,
            correo: dto.correoCliente ?? null,
            direccion: dto.direccionCliente ?? null,
          }),
        );
      }

      let vehiculo = await vehicles.findOne({
        where: { placa: dto.placa },
        relations: { cliente: true },
      });
      if (vehiculo && vehiculo.cliente.idCliente !== cliente.idCliente) {
        throw new ConflictException(
          'La placa indicada ya está asociada a otro cliente',
        );
      }
      if (!vehiculo) {
        const marca = await makes.findOneBy({ idMarca: dto.idMarca });
        if (!marca) throw new NotFoundException('Marca de vehículo no encontrada');
        const modelo = await models.findOne({
          where: { idModelo: dto.idModelo },
          relations: { marca: true },
        });
        if (!modelo || modelo.marca.idMarca !== marca.idMarca) {
          throw new NotFoundException(
            'El modelo indicado no pertenece a la marca seleccionada',
          );
        }
        vehiculo = await vehicles.save(
          vehicles.create({
            cliente,
            marca,
            modelo,
            placa: dto.placa,
            anio: dto.anio,
            tipoVehiculo: dto.tipoVehiculo,
            color: dto.color ?? null,
            numeroChasis: dto.numeroChasis ?? null,
            numeroMotor: dto.numeroMotor ?? null,
          }),
        );
      }

      const prefix = `RCL-${year}-`;
      const [row] = (await manager.query(
        'SELECT MAX(numero_reclamo) AS max FROM siniestro WHERE numero_reclamo LIKE $1',
        [`${prefix}%`],
      )) as ReclamoRow[];
      const sequence = row?.max
        ? Number.parseInt(row.max.slice(prefix.length), 10) + 1
        : 1;
      if (!Number.isSafeInteger(sequence) || sequence > 99999) {
        throw new ConflictException('Se agotó la numeración anual de reclamos');
      }

      const usuario = await users.findOneBy({ idUsuario, estado: true });
      if (!usuario) throw new NotFoundException('Usuario autenticado no encontrado');
      return claims.save(
        claims.create({
          cliente,
          vehiculo,
          usuario,
          numeroReclamo: `${prefix}${String(sequence).padStart(5, '0')}`,
          numeroPoliza: dto.numeroPoliza,
          fechaSiniestro: new Date(`${dto.fechaSiniestro}T00:00:00.000Z`),
          lugarSiniestro: dto.lugarSiniestro ?? null,
          descripcion: dto.descripcion ?? null,
          estado: EstadoSiniestro.ABIERTO,
        }),
      );
    }).then((claim) => this.findOne(claim.idSiniestro));
  }

  async findAll(
    page = 1,
    limit = 10,
    estado?: EstadoSiniestro,
    fechaDesde?: string,
    fechaHasta?: string,
  ): Promise<{
    data: Siniestro[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException('page debe ser un entero positivo');
    }
    if (!Number.isInteger(limit) || limit < 1) {
      throw new BadRequestException('limit debe ser un entero positivo');
    }
    if (
      (fechaDesde && Number.isNaN(Date.parse(fechaDesde))) ||
      (fechaHasta && Number.isNaN(Date.parse(fechaHasta)))
    ) {
      throw new BadRequestException('Las fechas deben tener formato ISO válido');
    }
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      throw new BadRequestException('fechaDesde no puede ser posterior a fechaHasta');
    }
    const query = this.siniestros
      .createQueryBuilder('siniestro')
      .leftJoinAndSelect('siniestro.cliente', 'cliente')
      .leftJoinAndSelect('siniestro.vehiculo', 'vehiculo')
      .leftJoinAndSelect('vehiculo.marca', 'marca')
      .leftJoinAndSelect('vehiculo.modelo', 'modelo')
      .leftJoinAndSelect('siniestro.usuario', 'usuario')
      .leftJoinAndSelect('siniestro.presupuesto', 'presupuesto');

    if (estado) query.andWhere('siniestro.estado = :estado', { estado });
    if (fechaDesde) {
      query.andWhere('siniestro.fechaSiniestro >= :fechaDesde', { fechaDesde });
    }
    if (fechaHasta) {
      query.andWhere('siniestro.fechaSiniestro <= :fechaHasta', { fechaHasta });
    }

    const [data, total] = await query
      .orderBy('siniestro.fechaRegistro', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();
    return {
      data,
      total,
      page: safePage,
      lastPage: Math.ceil(total / safeLimit),
    };
  }

  async findOne(id: number): Promise<Siniestro> {
    const siniestro = await this.siniestros.findOne({
      where: { idSiniestro: id },
      relations: {
        cliente: true,
        vehiculo: { marca: true, modelo: true },
        usuario: true,
        fotografias: {
          deteccion: {
            piezasDanadas: {
              severidad: true,
              catalogoPieza: true,
            },
          },
        },
        presupuesto: { lineas: true },
      },
    });
    if (!siniestro) {
      throw new NotFoundException(`Siniestro ${id} no encontrado`);
    }
    return siniestro;
  }

  async update(id: number, dto: UpdateSiniestroDto): Promise<Siniestro> {
    const siniestro = await this.siniestros.findOneBy({ idSiniestro: id });
    if (!siniestro) throw new NotFoundException(`Siniestro ${id} no encontrado`);
    Object.assign(siniestro, dto);
    await this.siniestros.save(siniestro);
    return this.findOne(id);
  }

  async getEstadisticas(): Promise<{
    total: number;
    abiertos: number;
    enProceso: number;
    cerrados: number;
    totalGtq: number;
  }> {
    const counts = await this.siniestros
      .createQueryBuilder('siniestro')
      .select('COUNT(*)', 'total')
      .addSelect(
        'COUNT(*) FILTER (WHERE siniestro.estado = :abierto)',
        'abiertos',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE siniestro.estado = :enProceso)',
        'enProceso',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE siniestro.estado = :cerrado)',
        'cerrados',
      )
      .setParameters({
        abierto: EstadoSiniestro.ABIERTO,
        enProceso: EstadoSiniestro.EN_PROCESO,
        cerrado: EstadoSiniestro.CERRADO,
      })
      .getRawOne<Record<string, string>>();
    const estimate = await this.presupuestos
      .createQueryBuilder('presupuesto')
      .select('COALESCE(SUM(presupuesto.totalGtq), 0)', 'total')
      .getRawOne<{ total: string }>();
    return {
      total: Number(counts?.total ?? 0),
      abiertos: Number(counts?.abiertos ?? 0),
      enProceso: Number(counts?.enProceso ?? 0),
      cerrados: Number(counts?.cerrados ?? 0),
      totalGtq: Number(estimate?.total ?? 0),
    };
  }
}
