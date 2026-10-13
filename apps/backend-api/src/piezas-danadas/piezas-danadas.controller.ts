import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { EditarPiezaDanadaDto } from './dto/editar-pieza-danada.dto.js';
import { PiezasDanadasService } from './piezas-danadas.service.js';

@Controller('api/v1/pieza-danada')
@UseGuards(JwtAuthGuard)
export class PiezasDanadasController {
  constructor(private readonly piezasDanadas: PiezasDanadasService) {}

  @Patch(':id')
  editar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarPiezaDanadaDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.piezasDanadas.editar(
      id,
      dto,
      user.idUsuario,
      request.ip ?? 'unknown',
    );
  }
}
