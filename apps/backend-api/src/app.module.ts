import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { DatabaseModule } from './database/database.module.js';
import { AppCacheModule } from './cache/cache.module.js';
import { StorageModule } from './storage/storage.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClientesModule } from './clientes/clientes.module.js';
import { SiniestrosModule } from './siniestros/siniestros.module.js';
import { FotografiasModule } from './fotografias/fotografias.module.js';
import { CatalogosModule } from './catalogos/catalogos.module.js';
import { PresupuestosModule } from './presupuestos/presupuestos.module.js';
import { UsuariosAdminModule } from './usuarios-admin/usuarios-admin.module.js';
import { IaModule } from './ia/ia.module.js';
import { DeteccionesModule } from './detecciones/detecciones.module.js';
import { PiezasDanadasModule } from './piezas-danadas/piezas-danadas.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [configuration],
    }),
    DatabaseModule,
    AppCacheModule,
    StorageModule,
    AuthModule,
    ClientesModule,
    SiniestrosModule,
    FotografiasModule,
    CatalogosModule,
    PresupuestosModule,
    UsuariosAdminModule,
    IaModule,
    DeteccionesModule,
    PiezasDanadasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
