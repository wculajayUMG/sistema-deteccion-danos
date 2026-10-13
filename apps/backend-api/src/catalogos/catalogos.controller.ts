import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CatalogosService } from './catalogos.service.js';

@Controller('api/v1/catalogos')
@UseGuards(JwtAuthGuard)
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Get('marcas')
  getMarcas() {
    return this.catalogos.getMarcas();
  }

  @Get('marcas/:id/modelos')
  getModelos(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.getModelos(id);
  }

  @Get('piezas')
  getPiezas() {
    return this.catalogos.getPiezas();
  }
}
