import { BadRequestException, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { memoryStorage } from 'multer';
import { Fotografia } from '../database/entities/fotografia.entity.js';
import { Siniestro } from '../database/entities/siniestro.entity.js';
import { StorageModule } from '../storage/storage.module.js';
import { FotografiasController } from './fotografias.controller.js';
import { FotografiasService } from './fotografias.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Fotografia, Siniestro]),
    StorageModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 10 },
      fileFilter: (_request, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          callback(
            new BadRequestException('Solo se permiten imágenes JPG, PNG o WEBP'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  ],
  controllers: [FotografiasController],
  providers: [FotografiasService],
  exports: [FotografiasService],
})
export class FotografiasModule {}
