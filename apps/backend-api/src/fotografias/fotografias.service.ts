import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fotografia } from '../database/entities/fotografia.entity.js';
import { Siniestro } from '../database/entities/siniestro.entity.js';
import { StorageService } from '../storage/storage.service.js';

@Injectable()
export class FotografiasService {
  constructor(
    @InjectRepository(Fotografia)
    private readonly fotografias: Repository<Fotografia>,
    @InjectRepository(Siniestro)
    private readonly siniestros: Repository<Siniestro>,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  async uploadFotografia(
    idSiniestro: number,
    file: Express.Multer.File,
    orden: number,
  ): Promise<Fotografia> {
    const siniestro = await this.siniestros.findOneBy({ idSiniestro });
    if (!siniestro) {
      throw new NotFoundException(`Siniestro ${idSiniestro} no encontrado`);
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('El archivo de imagen está vacío');
    }
    const key = this.storage.generateKey(
      idSiniestro,
      `${orden}-${file.originalname}`,
    );
    const url = await this.storage.uploadFile(file.buffer, key, file.mimetype);
    try {
      return await this.fotografias.save(
        this.fotografias.create({
          siniestro,
          urlCloudflare: url,
          nombreArchivo: file.originalname.split(/[\\/]/).at(-1) ?? 'imagen',
          tamanioKb: Math.round(file.size / 1024),
          orden,
        }),
      );
    } catch (error) {
      await this.storage.deleteFile(key);
      throw error;
    }
  }

  async findBySiniestro(idSiniestro: number): Promise<Fotografia[]> {
    if (!(await this.siniestros.existsBy({ idSiniestro }))) {
      throw new NotFoundException(`Siniestro ${idSiniestro} no encontrado`);
    }
    return this.fotografias.find({
      where: { siniestro: { idSiniestro } },
      relations: {
        deteccion: {
          piezasDanadas: {
            severidad: true,
            catalogoPieza: true,
          },
        },
      },
      order: { orden: 'ASC', fechaCarga: 'ASC' },
    });
  }

  async delete(id: number): Promise<void> {
    const fotografia = await this.fotografias.findOneBy({
      idFotografia: id,
    });
    if (!fotografia) {
      throw new NotFoundException(`Fotografía ${id} no encontrada`);
    }

    const publicUrl = this.config.get<string>('CF_R2_PUBLIC_URL')?.replace(
      /\/+$/,
      '',
    );
    if (!publicUrl || !fotografia.urlCloudflare.startsWith(`${publicUrl}/`)) {
      throw new BadRequestException(
        'La URL de la fotografía no coincide con el origen público configurado de R2',
      );
    }
    const encodedKey = fotografia.urlCloudflare.slice(publicUrl.length + 1);
    const key = encodedKey
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/');
    await this.storage.deleteFile(key);
    await this.fotografias.remove(fotografia);
  }
}
