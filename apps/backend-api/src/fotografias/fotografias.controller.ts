import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FotografiasService } from './fotografias.service.js';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class FotografiasController {
  constructor(private readonly fotografias: FotografiasService) {}

  @Post('siniestros/:idSiniestro/fotografias')
  @UseInterceptors(FilesInterceptor('fotos', 10))
  async upload(
    @Param('idSiniestro', ParseIntPipe) idSiniestro: number,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    if (!files?.length) {
      throw new BadRequestException('Debe adjuntar al menos una fotografía');
    }
    const firstOrder = (await this.fotografias.findBySiniestro(idSiniestro))
      .length + 1;
    return Promise.all(
      files.map((file, index) =>
        this.fotografias.uploadFotografia(idSiniestro, file, firstOrder + index),
      ),
    );
  }

  @Get('siniestros/:idSiniestro/fotografias')
  findAll(@Param('idSiniestro', ParseIntPipe) idSiniestro: number) {
    return this.fotografias.findBySiniestro(idSiniestro);
  }

  @Delete('fotografias/:id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.fotografias.delete(id);
  }
}
