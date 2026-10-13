import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Rol } from '../common/enums/rol.enum.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import {
  BlockUserDto,
  ResetPasswordDto,
  UserFilterDto,
} from './dto/usuario-admin.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { UsuariosAdminService } from './usuarios-admin.service.js';

@Controller('api/v1/admin/usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMINISTRADOR_TI)
export class UsuariosAdminController {
  constructor(private readonly usuarios: UsuariosAdminService) {}

  @Get()
  findAll(@Query() filtros: UserFilterDto) {
    return this.usuarios.findAll({
      rol: filtros.rol,
      estado:
        filtros.estado === undefined ? undefined : filtros.estado === 'true',
    });
  }

  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuarios.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usuarios.update(id, dto, user.idUsuario);
  }

  @Post(':id/reset-password')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usuarios.resetPassword(id, dto.password);
  }

  @Patch(':id/bloquear')
  bloquear(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BlockUserDto,
  ) {
    return this.usuarios.bloquear(id, dto.motivo);
  }

  @Patch(':id/desactivar')
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.usuarios.desactivar(id);
  }
}
