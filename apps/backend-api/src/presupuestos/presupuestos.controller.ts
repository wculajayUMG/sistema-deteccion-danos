import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UpdateLineaDto } from './dto/update-linea.dto.js';
import { PresupuestosService } from './presupuestos.service.js';

@Controller('api/v1/presupuestos')
@UseGuards(JwtAuthGuard)
export class PresupuestosController {
  constructor(private readonly presupuestos: PresupuestosService) {}

  @Get('siniestro/:idSiniestro')
  findBySiniestro(@Param('idSiniestro', ParseIntPipe) id: number) {
    return this.presupuestos.findBySiniestro(id);
  }

  @Get(':id/pdf')
  async descargarPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.presupuestos.generarPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="dictamen-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Post('generar/:idSiniestro')
  generar(
    @Param('idSiniestro', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.presupuestos.generarPresupuesto(id, user.idUsuario);
  }

  @Patch(':id/lineas/:idLinea')
  updateLinea(
    @Param('id', ParseIntPipe) id: number,
    @Param('idLinea', ParseIntPipe) idLinea: number,
    @Body() dto: UpdateLineaDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.presupuestos.updateLinea(
      id,
      idLinea,
      dto,
      user.idUsuario,
      request.ip ?? 'unknown',
    );
  }

  @Post(':id/aprobar')
  aprobar(
    @Param('id', ParseIntPipe) id: number,
    @Body('observaciones') observaciones: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.presupuestos.aprobar(
      id,
      user.idUsuario,
      request.ip ?? 'unknown',
      observaciones,
    );
  }
}
