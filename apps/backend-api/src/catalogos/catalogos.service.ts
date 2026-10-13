import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaremoPrecio } from '../database/entities/baremo-precio.entity.js';
import { CatalogoPieza } from '../database/entities/catalogo-pieza.entity.js';
import { Repuesto } from '../database/entities/repuesto.entity.js';
import { VehiculoMarca } from '../database/entities/vehiculo-marca.entity.js';
import { VehiculoModelo } from '../database/entities/vehiculo-modelo.entity.js';
import {
  CreateBaremoDto,
  CreateMarcaDto,
  CreateModeloDto,
  CreateRepuestoDto,
  UpdateBaremoDto,
  UpdateMarcaDto,
  UpdateModeloDto,
  UpdateRepuestoDto,
} from './dto/catalogo.dto.js';

@Injectable()
export class CatalogosService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    @InjectRepository(VehiculoMarca)
    private readonly marcas: Repository<VehiculoMarca>,
    @InjectRepository(VehiculoModelo)
    private readonly modelos: Repository<VehiculoModelo>,
    @InjectRepository(CatalogoPieza)
    private readonly piezas: Repository<CatalogoPieza>,
    @InjectRepository(BaremoPrecio)
    private readonly baremos: Repository<BaremoPrecio>,
    @InjectRepository(Repuesto)
    private readonly repuestos: Repository<Repuesto>,
  ) {}

  getMarcas(): Promise<VehiculoMarca[]> {
    return this.marcas.find({
      where: { estado: true },
      order: { nombreMarca: 'ASC' },
    });
  }

  getModelos(idMarca: number): Promise<VehiculoModelo[]> {
    return this.modelos.find({
      where: { marca: { idMarca }, estado: true },
      order: { nombreModelo: 'ASC' },
    });
  }

  getPiezas(): Promise<CatalogoPieza[]> {
    return this.piezas.find({
      where: { estado: true },
      order: { nombrePieza: 'ASC' },
    });
  }

  async createMarca(dto: CreateMarcaDto): Promise<VehiculoMarca> {
    const existing = await this.marcas.findOneBy({
      nombreMarca: dto.nombreMarca.trim(),
    });
    if (existing) throw new ConflictException('La marca ya existe');
    return this.marcas.save(
      this.marcas.create({ nombreMarca: dto.nombreMarca.trim() }),
    );
  }

  async updateMarca(id: number, dto: UpdateMarcaDto): Promise<VehiculoMarca> {
    const marca = await this.findMarca(id);
    if (dto.nombreMarca) {
      const existing = await this.marcas.findOneBy({
        nombreMarca: dto.nombreMarca.trim(),
      });
      if (existing && existing.idMarca !== id) {
        throw new ConflictException('La marca ya existe');
      }
      marca.nombreMarca = dto.nombreMarca.trim();
    }
    return this.marcas.save(marca);
  }

  async deleteMarca(id: number): Promise<void> {
    const marca = await this.findMarca(id);
    marca.estado = false;
    await this.marcas.save(marca);
  }

  async createModelo(dto: CreateModeloDto): Promise<VehiculoModelo> {
    const marca = await this.findMarca(dto.idMarca);
    return this.modelos.save(
      this.modelos.create({
        marca,
        nombreModelo: dto.nombreModelo,
        linea: dto.linea ?? null,
      }),
    );
  }

  async updateModelo(id: number, dto: UpdateModeloDto): Promise<VehiculoModelo> {
    const modelo = await this.findModelo(id);
    if (dto.idMarca !== undefined) modelo.marca = await this.findMarca(dto.idMarca);
    if (dto.nombreModelo !== undefined) modelo.nombreModelo = dto.nombreModelo;
    if (dto.linea !== undefined) modelo.linea = dto.linea;
    return this.modelos.save(modelo);
  }

  async deleteModelo(id: number): Promise<void> {
    const modelo = await this.findModelo(id);
    modelo.estado = false;
    await this.modelos.save(modelo);
  }

  listBaremos(): Promise<BaremoPrecio[]> {
    return this.baremos.find({
      where: { estado: true },
      relations: { catalogoPieza: true },
      order: { idBaremo: 'ASC' },
    });
  }

  async createBaremo(dto: CreateBaremoDto): Promise<BaremoPrecio> {
    const pieza = await this.piezas.findOneBy({
      idPiezaCatalogo: dto.idPiezaCatalogo,
    });
    if (!pieza) throw new NotFoundException('Pieza de catálogo no encontrada');
    const exists = await this.baremos.findOne({
      where: {
        catalogoPieza: { idPiezaCatalogo: pieza.idPiezaCatalogo },
        tipoGolpe: dto.tipoGolpe,
      },
    });
    if (exists) throw new ConflictException('Ya existe un baremo para esa pieza y tipo de golpe');
    const saved = await this.baremos.save(
      this.baremos.create({
        catalogoPieza: pieza,
        tipoGolpe: dto.tipoGolpe,
        costoManoObraGtq: dto.costoManoObraGtq,
        fechaVigencia: new Date(dto.fechaVigencia),
      }),
    );
    await this.invalidateBaremo(
      saved.catalogoPieza.idPiezaCatalogo,
      saved.tipoGolpe,
    );
    return saved;
  }

  async updateBaremo(id: number, dto: UpdateBaremoDto): Promise<BaremoPrecio> {
    const baremo = await this.findBaremo(id);
    const previousPieceId = baremo.catalogoPieza.idPiezaCatalogo;
    const previousType = baremo.tipoGolpe;
    if (dto.idPiezaCatalogo !== undefined) {
      const pieza = await this.piezas.findOneBy({
        idPiezaCatalogo: dto.idPiezaCatalogo,
      });
      if (!pieza) throw new NotFoundException('Pieza de catálogo no encontrada');
      baremo.catalogoPieza = pieza;
    }
    if (dto.tipoGolpe !== undefined) baremo.tipoGolpe = dto.tipoGolpe;
    if (dto.costoManoObraGtq !== undefined) {
      baremo.costoManoObraGtq = dto.costoManoObraGtq;
    }
    if (dto.fechaVigencia !== undefined) {
      baremo.fechaVigencia = new Date(dto.fechaVigencia);
    }
    const conflict = await this.baremos.findOne({
      where: {
        catalogoPieza: { idPiezaCatalogo: baremo.catalogoPieza.idPiezaCatalogo },
        tipoGolpe: baremo.tipoGolpe,
      },
    });
    if (conflict && conflict.idBaremo !== id) {
      throw new ConflictException('Ya existe un baremo para esa pieza y tipo de golpe');
    }
    const saved = await this.baremos.save(baremo);
    await Promise.all([
      this.invalidateBaremo(previousPieceId, previousType),
      this.invalidateBaremo(
        saved.catalogoPieza.idPiezaCatalogo,
        saved.tipoGolpe,
      ),
    ]);
    return saved;
  }

  async deleteBaremo(id: number): Promise<void> {
    const baremo = await this.findBaremo(id);
    baremo.estado = false;
    await this.baremos.save(baremo);
    await this.invalidateBaremo(
      baremo.catalogoPieza.idPiezaCatalogo,
      baremo.tipoGolpe,
    );
  }

  listRepuestos(): Promise<Repuesto[]> {
    return this.repuestos.find({
      where: { estado: true },
      relations: { catalogoPieza: true, marca: true, modelo: true },
      order: { idRepuesto: 'ASC' },
    });
  }

  async createRepuesto(dto: CreateRepuestoDto): Promise<Repuesto> {
    if (dto.anioHasta < dto.anioDesde) {
      throw new ConflictException('anioHasta debe ser mayor o igual a anioDesde');
    }
    const [pieza, marca, modelo] = await Promise.all([
      this.piezas.findOneBy({ idPiezaCatalogo: dto.idPiezaCatalogo }),
      this.findMarca(dto.idMarca),
      this.findModelo(dto.idModelo),
    ]);
    if (!pieza) throw new NotFoundException('Pieza de catálogo no encontrada');
    if (modelo.marca.idMarca !== marca.idMarca) {
      throw new ConflictException('El modelo no pertenece a la marca indicada');
    }
    return this.repuestos.save(
      this.repuestos.create({
        catalogoPieza: pieza,
        marca,
        modelo,
        anioDesde: dto.anioDesde,
        anioHasta: dto.anioHasta,
        costoGtq: dto.costoGtq,
        proveedor: dto.proveedor ?? null,
        fechaVigencia: new Date(dto.fechaVigencia),
      }),
    );
  }

  async updateRepuesto(id: number, dto: UpdateRepuestoDto): Promise<Repuesto> {
    const repuesto = await this.repuestos.findOne({
      where: { idRepuesto: id },
      relations: { catalogoPieza: true, marca: true, modelo: true },
    });
    if (!repuesto) throw new NotFoundException(`Repuesto ${id} no encontrado`);
    if (dto.idPiezaCatalogo !== undefined) {
      const pieza = await this.piezas.findOneBy({
        idPiezaCatalogo: dto.idPiezaCatalogo,
      });
      if (!pieza) throw new NotFoundException('Pieza de catálogo no encontrada');
      repuesto.catalogoPieza = pieza;
    }
    if (dto.idMarca !== undefined) repuesto.marca = await this.findMarca(dto.idMarca);
    if (dto.idModelo !== undefined) repuesto.modelo = await this.findModelo(dto.idModelo);
    if (dto.anioDesde !== undefined) repuesto.anioDesde = dto.anioDesde;
    if (dto.anioHasta !== undefined) repuesto.anioHasta = dto.anioHasta;
    if (repuesto.anioHasta < repuesto.anioDesde) {
      throw new ConflictException('anioHasta debe ser mayor o igual a anioDesde');
    }
    if (dto.costoGtq !== undefined) repuesto.costoGtq = dto.costoGtq;
    if (dto.proveedor !== undefined) repuesto.proveedor = dto.proveedor;
    if (dto.fechaVigencia !== undefined) {
      repuesto.fechaVigencia = new Date(dto.fechaVigencia);
    }
    if (repuesto.modelo.marca.idMarca !== repuesto.marca.idMarca) {
      throw new ConflictException('El modelo no pertenece a la marca indicada');
    }
    return this.repuestos.save(repuesto);
  }

  async deleteRepuesto(id: number): Promise<void> {
    const repuesto = await this.repuestos.findOneBy({ idRepuesto: id });
    if (!repuesto) throw new NotFoundException(`Repuesto ${id} no encontrado`);
    repuesto.estado = false;
    await this.repuestos.save(repuesto);
  }

  private async findMarca(id: number): Promise<VehiculoMarca> {
    const marca = await this.marcas.findOneBy({ idMarca: id });
    if (!marca) throw new NotFoundException(`Marca ${id} no encontrada`);
    return marca;
  }

  private async findModelo(id: number): Promise<VehiculoModelo> {
    const modelo = await this.modelos.findOne({
      where: { idModelo: id },
      relations: { marca: true },
    });
    if (!modelo) throw new NotFoundException(`Modelo ${id} no encontrado`);
    return modelo;
  }

  private async findBaremo(id: number): Promise<BaremoPrecio> {
    const baremo = await this.baremos.findOne({
      where: { idBaremo: id },
      relations: { catalogoPieza: true },
    });
    if (!baremo) throw new NotFoundException(`Baremo ${id} no encontrado`);
    return baremo;
  }

  private async invalidateBaremo(
    idPieza: number,
    tipoGolpe: string,
  ): Promise<void> {
    await this.cache.del(`baremo:${idPieza}:${tipoGolpe}`);
  }
}
