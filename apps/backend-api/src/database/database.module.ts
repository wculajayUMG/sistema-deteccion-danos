import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditTrail } from './entities/audit-trail.entity.js';
import { BaremoPrecio } from './entities/baremo-precio.entity.js';
import { CatalogoPieza } from './entities/catalogo-pieza.entity.js';
import { Cliente } from './entities/cliente.entity.js';
import { DeteccionIa } from './entities/deteccion-ia.entity.js';
import { Fotografia } from './entities/fotografia.entity.js';
import { LineaPresupuesto } from './entities/linea-presupuesto.entity.js';
import { PiezaDanada } from './entities/pieza-danada.entity.js';
import { Presupuesto } from './entities/presupuesto.entity.js';
import { Repuesto } from './entities/repuesto.entity.js';
import { Rol } from './entities/rol.entity.js';
import { Severidad } from './entities/severidad.entity.js';
import { Siniestro } from './entities/siniestro.entity.js';
import { Usuario } from './entities/usuario.entity.js';
import { Vehiculo } from './entities/vehiculo.entity.js';
import { VehiculoMarca } from './entities/vehiculo-marca.entity.js';
import { VehiculoModelo } from './entities/vehiculo-modelo.entity.js';

export const ALL_ENTITIES = [
  Rol,
  Severidad,
  CatalogoPieza,
  VehiculoMarca,
  VehiculoModelo,
  Usuario,
  Cliente,
  Vehiculo,
  Siniestro,
  Fotografia,
  DeteccionIa,
  PiezaDanada,
  BaremoPrecio,
  Repuesto,
  Presupuesto,
  LineaPresupuesto,
  AuditTrail,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.getOrThrow<string>('DATABASE_HOST'),
        port: config.getOrThrow<number>('DATABASE_PORT'),
        username: config.getOrThrow<string>('DATABASE_USER'),
        password: config.getOrThrow<string>('DATABASE_PASSWORD'),
        database: config.getOrThrow<string>('DATABASE_NAME'),
        entities: ALL_ENTITIES,
        synchronize: config.get<boolean>('DATABASE_SYNC', false),
        logging: config.get<boolean>('DATABASE_LOGGING', false),
        autoLoadEntities: false,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
