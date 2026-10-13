import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ProcesarDeteccionDto } from './dto/procesar-deteccion.dto.js';
import { DeteccionesService } from './detecciones.service.js';

@Controller('api/v1/detecciones')
@UseGuards(JwtAuthGuard)
export class DeteccionesController {
  constructor(private readonly detecciones: DeteccionesService) {}

  @Post('procesar')
  procesar(
    @Body() dto: ProcesarDeteccionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.detecciones.procesar(dto.id_fotografia, user.idUsuario);
  }
}
