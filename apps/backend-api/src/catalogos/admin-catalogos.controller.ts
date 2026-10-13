import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Rol } from '../common/enums/rol.enum.js';
import {
  CatalogosService,
} from './catalogos.service.js';
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

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminCatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  // ── MARCAS ────────────────────────────────────────────────────────────────

  @Get('marcas')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR, Rol.PERITO)
  listMarcas() {
    return this.catalogos.getMarcas();
  }

  @Post('marcas')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR)
  createMarca(@Body() dto: CreateMarcaDto) {
    return this.catalogos.createMarca(dto);
  }

  @Patch('marcas/:id')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR)
  updateMarca(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarcaDto,
  ) {
    return this.catalogos.updateMarca(id, dto);
  }

  @Delete('marcas/:id')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR)
  deleteMarca(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.deleteMarca(id);
  }

  // ── MODELOS ───────────────────────────────────────────────────────────────

  @Post('modelos')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR)
  createModelo(@Body() dto: CreateModeloDto) {
    return this.catalogos.createModelo(dto);
  }

  @Patch('modelos/:id')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR)
  updateModelo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateModeloDto,
  ) {
    return this.catalogos.updateModelo(id, dto);
  }

  @Delete('modelos/:id')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR)
  deleteModelo(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.deleteModelo(id);
  }

  // ── BAREMOS ───────────────────────────────────────────────────────────────

  @Get('baremos')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR, Rol.PERITO)
  listBaremos() {
    return this.catalogos.listBaremos();
  }

  @Post('baremos')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR)
  createBaremo(@Body() dto: CreateBaremoDto) {
    return this.catalogos.createBaremo(dto);
  }

  @Patch('baremos/:id')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR)
  updateBaremo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBaremoDto,
  ) {
    return this.catalogos.updateBaremo(id, dto);
  }

  @Delete('baremos/:id')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR)
  deleteBaremo(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.deleteBaremo(id);
  }

  // ── REPUESTOS ─────────────────────────────────────────────────────────────

  @Get('repuestos')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR, Rol.PERITO)
  listRepuestos() {
    return this.catalogos.listRepuestos();
  }

  @Post('repuestos')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR)
  createRepuesto(@Body() dto: CreateRepuestoDto) {
    return this.catalogos.createRepuesto(dto);
  }

  @Patch('repuestos/:id')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR)
  updateRepuesto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRepuestoDto,
  ) {
    return this.catalogos.updateRepuesto(id, dto);
  }

  @Delete('repuestos/:id')
  @Roles(Rol.ADMINISTRADOR_TI, Rol.SUPERVISOR)
  deleteRepuesto(@Param('id', ParseIntPipe) id: number) {
    return this.catalogos.deleteRepuesto(id);
  }
}
