import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { EstadoSiniestro } from '../common/enums/estado-siniestro.enum.js';
import { CreateSiniestroDto } from './dto/create-siniestro.dto.js';
import { UpdateSiniestroDto } from './dto/update-siniestro.dto.js';
import { SiniestrosService } from './siniestros.service.js';

@Controller('api/v1/siniestros')
@UseGuards(JwtAuthGuard)
export class SiniestrosController {
  constructor(private readonly siniestros: SiniestrosService) {}

  @Post()
  create(
    @Body() dto: CreateSiniestroDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.siniestros.create(dto, user.idUsuario);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado', new ParseEnumPipe(EstadoSiniestro, { optional: true }))
    estado?: EstadoSiniestro,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.siniestros.findAll(
      page === undefined ? 1 : Number(page),
      limit === undefined ? 10 : Number(limit),
      estado,
      fechaDesde,
      fechaHasta,
    );
  }

  @Get('estadisticas')
  getEstadisticas() {
    return this.siniestros.getEstadisticas();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.siniestros.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSiniestroDto,
  ) {
    return this.siniestros.update(id, dto);
  }
}
