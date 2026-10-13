import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from '../database/entities/cliente.entity.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
import { UpdateClienteDto } from './dto/update-cliente.dto.js';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clientes: Repository<Cliente>,
  ) {}

  async create(dto: CreateClienteDto): Promise<Cliente> {
    if (dto.dpi) {
      const existing = await this.findByDpi(dto.dpi);
      if (existing) return existing;
    }
    return this.clientes.save(
      this.clientes.create({
        ...dto,
        dpi: dto.dpi ?? null,
        telefono: dto.telefono ?? null,
        correo: dto.correo ?? null,
        direccion: dto.direccion ?? null,
      }),
    );
  }

  findAll(): Promise<Cliente[]> {
    return this.clientes.find({ order: { fechaRegistro: 'DESC' } });
  }

  async findOne(id: number): Promise<Cliente> {
    const cliente = await this.clientes.findOne({ where: { idCliente: id } });
    if (!cliente) throw new NotFoundException(`Cliente ${id} no encontrado`);
    return cliente;
  }

  findByDpi(dpi: string): Promise<Cliente | null> {
    return this.clientes.findOneBy({ dpi });
  }

  async update(id: number, dto: UpdateClienteDto): Promise<Cliente> {
    const cliente = await this.findOne(id);
    if (dto.dpi && dto.dpi !== cliente.dpi) {
      const duplicate = await this.findByDpi(dto.dpi);
      if (duplicate) {
        throw new ConflictException('Ya existe un cliente con ese DPI');
      }
    }
    Object.assign(cliente, dto);
    return this.clientes.save(cliente);
  }
}
