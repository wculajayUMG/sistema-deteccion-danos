import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from '../database/entities/rol.entity.js';
import { Usuario } from '../database/entities/usuario.entity.js';
import { UsuariosAdminController } from './usuarios-admin.controller.js';
import { UsuariosAdminService } from './usuarios-admin.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Rol])],
  controllers: [UsuariosAdminController],
  providers: [UsuariosAdminService],
})
export class UsuariosAdminModule {}
