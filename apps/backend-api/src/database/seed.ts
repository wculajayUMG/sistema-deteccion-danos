import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { NivelSeveridad } from '../common/enums/nivel-severidad.enum.js';
import { Rol as RolEnum } from '../common/enums/rol.enum.js';
import { TipoGolpe } from '../common/enums/tipo-golpe.enum.js';
import { ALL_ENTITIES } from './database.module.js';
import { BaremoPrecio } from './entities/baremo-precio.entity.js';
import { CatalogoPieza } from './entities/catalogo-pieza.entity.js';
import { Rol } from './entities/rol.entity.js';
import { Severidad } from './entities/severidad.entity.js';
import { Usuario } from './entities/usuario.entity.js';
import { VehiculoMarca } from './entities/vehiculo-marca.entity.js';
import { VehiculoModelo } from './entities/vehiculo-modelo.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/backend-api/.env', '.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      name: 'seed',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = Number(config.get<string | number>('DATABASE_PORT', 5432));
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          throw new Error('DATABASE_PORT must be a valid TCP port');
        }

        return {
          type: 'postgres' as const,
          host: config.get<string>('DATABASE_HOST', 'localhost'),
          port,
          username: config.get<string>('DATABASE_USER', 'postgres'),
          password: config.get<string>('DATABASE_PASSWORD', 'postgres'),
          database: config.get<string>(
            'DATABASE_NAME',
            'seguros_elroble_ia',
          ),
          entities: ALL_ENTITIES,
          synchronize: false,
          logging: false,
        };
      },
    }),
    TypeOrmModule.forFeature(
      [
        Rol,
        Usuario,
        Severidad,
        VehiculoMarca,
        VehiculoModelo,
        CatalogoPieza,
        BaremoPrecio,
      ],
      'seed',
    ),
  ],
})
class SeedModule {}

async function seed(): Promise<void> {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error(
      'Set SEED_ADMIN_PASSWORD to a local password of at least 12 characters before running the seed',
    );
  }

  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn'],
  });

  try {
    const rolRepo = app.get<Repository<Rol>>(getRepositoryToken(Rol, 'seed'));
    const usuarioRepo = app.get<Repository<Usuario>>(
      getRepositoryToken(Usuario, 'seed'),
    );
    const sevRepo = app.get<Repository<Severidad>>(
      getRepositoryToken(Severidad, 'seed'),
    );
    const marcaRepo = app.get<Repository<VehiculoMarca>>(
      getRepositoryToken(VehiculoMarca, 'seed'),
    );
    const modeloRepo = app.get<Repository<VehiculoModelo>>(
      getRepositoryToken(VehiculoModelo, 'seed'),
    );
    const piezaRepo = app.get<Repository<CatalogoPieza>>(
      getRepositoryToken(CatalogoPieza, 'seed'),
    );
    const baremoRepo = app.get<Repository<BaremoPrecio>>(
      getRepositoryToken(BaremoPrecio, 'seed'),
    );

    const roles: Array<Pick<Rol, 'nombreRol' | 'descripcion'>> = [
      {
        nombreRol: RolEnum.AJUSTADOR,
        descripcion: 'Ajustador de campo',
      },
      {
        nombreRol: RolEnum.PERITO,
        descripcion: 'Perito evaluador',
      },
      {
        nombreRol: RolEnum.SUPERVISOR,
        descripcion: 'Supervisor de siniestros',
      },
      {
        nombreRol: RolEnum.ADMINISTRADOR_TI,
        descripcion: 'Administrador del sistema',
      },
    ];

    for (const rol of roles) {
      const existe = await rolRepo.findOneBy({
        nombreRol: rol.nombreRol,
      });
      if (!existe) {
        await rolRepo.save(rolRepo.create(rol));
        console.info(`✓ Rol creado: ${rol.nombreRol}`);
      } else {
        console.info(`→ Rol ya existe: ${rol.nombreRol}`);
      }
    }

    const severidades: Array<
      Pick<Severidad, 'nivel' | 'descripcion' | 'factorCosto'>
    > = [
      {
        nivel: NivelSeveridad.LEVE,
        descripcion: 'Rayones superficiales o daños menores sin deformación',
        factorCosto: 1,
      },
      {
        nivel: NivelSeveridad.MODERADO,
        descripcion: 'Abolladuras visibles con afectación parcial de la pieza',
        factorCosto: 1.5,
      },
      {
        nivel: NivelSeveridad.SEVERO,
        descripcion: 'Deformación estructural grave que compromete la funcionalidad',
        factorCosto: 2,
      },
    ];

    for (const severidad of severidades) {
      const existe = await sevRepo.findOneBy({
        nivel: severidad.nivel,
      });
      if (!existe) {
        await sevRepo.save(sevRepo.create(severidad));
        console.info(`✓ Severidad creada: ${severidad.nivel}`);
      } else {
        console.info(`→ Severidad ya existe: ${severidad.nivel}`);
      }
    }

    const rolAdmin = await rolRepo.findOneBy({
      nombreRol: RolEnum.ADMINISTRADOR_TI,
    });
    if (!rolAdmin) {
      throw new Error(
        'Rol ADMINISTRADOR_TI no encontrado. Verifica que el seed de roles funcionó.',
      );
    }

    const adminEmail = 'admin@seguroselroble.com.gt';
    const adminExiste = await usuarioRepo.findOneBy({ correo: adminEmail });
    if (!adminExiste) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await usuarioRepo.save(
        usuarioRepo.create({
          nombre: 'Administrador',
          apellido: 'Sistema',
          correo: adminEmail,
          passwordHash: hash,
          rol: rolAdmin,
          estado: true,
          telefono: null,
          ultimoAcceso: null,
        }),
      );
      console.info('✓ Usuario administrador creado');
    } else {
      console.info('→ Usuario administrador ya existe');
    }

    const modelosPorMarca: Record<string, string[]> = {
      Toyota: ['Hilux', 'Corolla', 'RAV4', 'Land Cruiser', 'Fortuner', 'Yaris', 'Hiace'],
      Nissan: ['NP300', 'Sentra', 'X-Trail', 'Frontier', 'Versa', 'Pathfinder'],
      Hyundai: ['Tucson', 'Santa Fe', 'Accent', 'Elantra', 'Creta'],
      Kia: ['Sportage', 'Rio', 'Sorento', 'Seltos'],
      Chevrolet: ['Colorado', 'Spark', 'Tracker', 'Captiva'],
      Honda: ['Civic', 'CR-V', 'Fit', 'Pilot'],
      Mitsubishi: ['L200', 'Montero', 'ASX', 'Outlander'],
      Isuzu: ['D-Max', 'NPR', 'NQR'],
      Hino: ['300', '500', '700'],
      Yamaha: ['FZ', 'XTZ', 'NMAX'],
      Suzuki: ['Swift', 'Vitara', 'Jimny', 'Carry'],
      Mazda: ['BT-50', 'CX-5', 'Mazda 3', 'CX-30'],
      Ford: ['Ranger', 'Escape', 'Explorer', 'F-150'],
      Volkswagen: ['Amarok', 'Tiguan', 'Jetta', 'T-Cross'],
      Jeep: ['Wrangler', 'Compass', 'Grand Cherokee', 'Renegade'],
    };

    for (const [nombreMarca, nombresModelos] of Object.entries(modelosPorMarca)) {
      let marca = await marcaRepo.findOneBy({ nombreMarca });
      if (!marca) {
        marca = await marcaRepo.save(
          marcaRepo.create({ nombreMarca, estado: true }),
        );
        console.info(`✓ Marca creada: ${nombreMarca}`);
      }
      for (const nombreModelo of nombresModelos) {
        const exists = await modeloRepo.findOne({
          where: { marca: { idMarca: marca.idMarca }, nombreModelo },
        });
        if (!exists) {
          await modeloRepo.save(
            modeloRepo.create({
              marca,
              nombreModelo,
              linea: null,
              estado: true,
            }),
          );
        }
      }
    }

    const piezasIniciales: Array<{
      nombrePieza: string;
      categoria: string;
      claseYolo: string;
      base: number;
    }> = [
      // Carrocería principal
      { nombrePieza: 'Capó',                              categoria: 'Carrocería',  claseYolo: 'capo',                    base: 150 },
      { nombrePieza: 'Parachoques Frontal',               categoria: 'Carrocería',  claseYolo: 'bumper_frontal',          base: 150 },
      { nombrePieza: 'Parachoques Trasero',               categoria: 'Carrocería',  claseYolo: 'bumper_trasero',          base: 150 },
      { nombrePieza: 'Tapa de baúl',                      categoria: 'Carrocería',  claseYolo: 'tapa_de_baul',           base: 150 },
      { nombrePieza: 'Techo',                             categoria: 'Carrocería',  claseYolo: 'techo',                  base: 150 },
      // Puertas
      { nombrePieza: 'Puerta Delantera Izquierda',        categoria: 'Puertas',     claseYolo: 'puerta_delantera_izq',   base: 150 },
      { nombrePieza: 'Puerta Delantera Derecha',          categoria: 'Puertas',     claseYolo: 'puerta_delantera_der',   base: 150 },
      { nombrePieza: 'Puerta Trasera Izquierda',          categoria: 'Puertas',     claseYolo: 'puerta_trasera_izq',     base: 150 },
      { nombrePieza: 'Puerta Trasera Derecha',            categoria: 'Puertas',     claseYolo: 'puerta_trasera_der',     base: 150 },
      // Guardafangos / loderas
      { nombrePieza: 'Guardafango Delantero Izquierdo',   categoria: 'Carrocería',  claseYolo: 'lodera_izquierda',       base: 150 },
      { nombrePieza: 'Guardafango Delantero Derecho',     categoria: 'Carrocería',  claseYolo: 'lodera_derecha',         base: 150 },
      { nombrePieza: 'Faldón Izquierdo',                  categoria: 'Carrocería',  claseYolo: 'faldon_izquierdo',       base: 100 },
      { nombrePieza: 'Faldón Derecho',                    categoria: 'Carrocería',  claseYolo: 'faldon_derecho',         base: 100 },
      { nombrePieza: 'Estribo',                           categoria: 'Carrocería',  claseYolo: 'estribo',                base: 100 },
      // Aros
      { nombrePieza: 'Aro Delantero Izquierdo',           categoria: 'Aros',        claseYolo: 'aro_delantero_izq',      base:  80 },
      { nombrePieza: 'Aro Delantero Derecho',             categoria: 'Aros',        claseYolo: 'aro_delantero_der',      base:  80 },
      { nombrePieza: 'Aro Trasero Izquierdo',             categoria: 'Aros',        claseYolo: 'aro_trasero_izq',        base:  80 },
      { nombrePieza: 'Aro Trasero Derecho',               categoria: 'Aros',        claseYolo: 'aro_trasero_der',        base:  80 },
      // Molduras
      { nombrePieza: 'Moldura Puerta Del. Izquierda',     categoria: 'Molduras',    claseYolo: 'moldura_puerta_del_izq', base:  60 },
      { nombrePieza: 'Moldura Puerta Del. Derecha',       categoria: 'Molduras',    claseYolo: 'moldura_puerta_del_der', base:  60 },
      { nombrePieza: 'Moldura Puerta Tras. Izquierda',    categoria: 'Molduras',    claseYolo: 'moldura_puerta_tras_izq',base:  60 },
      { nombrePieza: 'Moldura Puerta Tras. Derecha',      categoria: 'Molduras',    claseYolo: 'moldura_puerta_tras_der',base:  60 },
      { nombrePieza: 'Silvin Izquierdo',                  categoria: 'Molduras',    claseYolo: 'silvin_izquierdo',       base:  60 },
      { nombrePieza: 'Silvin Derecho',                    categoria: 'Molduras',    claseYolo: 'silvin_derecho',         base:  60 },
      // Óptica delantera / trasera
      { nombrePieza: 'Persiana Frontal',                  categoria: 'Óptica',      claseYolo: 'persiana_frontal',       base: 120 },
      { nombrePieza: 'Rejilla Parachoques Frontal',       categoria: 'Óptica',      claseYolo: 'rejilla_bumper_frontal', base:  90 },
      { nombrePieza: 'Faro Trasero Izquierdo',            categoria: 'Óptica',      claseYolo: 'stop_izquierdo',         base: 100 },
      { nombrePieza: 'Faro Trasero Derecho',              categoria: 'Óptica',      claseYolo: 'stop_derecho',           base: 100 },
      // Espejos
      { nombrePieza: 'Espejo Retrovisor Izquierdo',       categoria: 'Espejos',     claseYolo: 'retrovisor_izquierdo',   base:  80 },
      { nombrePieza: 'Espejo Retrovisor Derecho',         categoria: 'Espejos',     claseYolo: 'retrovisor_derecho',     base:  80 },
      // Cristales
      { nombrePieza: 'Parabrisas Frontal',                categoria: 'Cristales',   claseYolo: 'vidrio_frontal',         base: 200 },
      { nombrePieza: 'Parabrisas Trasero',                categoria: 'Cristales',   claseYolo: 'vidrio_trasero',         base: 200 },
    ];

    for (const piezaSeed of piezasIniciales) {
      // Buscar primero por claseYolo (clave natural del modelo), luego por nombre como fallback
      let pieza = await piezaRepo.findOneBy({ claseYolo: piezaSeed.claseYolo });
      pieza ??= await piezaRepo.findOneBy({ nombrePieza: piezaSeed.nombrePieza });
      if (!pieza) {
        pieza = await piezaRepo.save(
          piezaRepo.create({
            nombrePieza: piezaSeed.nombrePieza,
            categoria: piezaSeed.categoria,
            claseYolo: piezaSeed.claseYolo,
            estado: true,
          }),
        );
        console.info(`✓ Pieza de catálogo creada: ${pieza.nombrePieza}`);
      } else if (pieza.nombrePieza !== piezaSeed.nombrePieza || pieza.claseYolo !== piezaSeed.claseYolo) {
        pieza = await piezaRepo.save({
          ...pieza,
          nombrePieza: piezaSeed.nombrePieza,
          claseYolo: piezaSeed.claseYolo,
        });
        console.info(`↺ Pieza actualizada: ${pieza.nombrePieza}`);
      }

      const tarifas: Array<{ tipoGolpe: TipoGolpe; factor: number }> = [
        { tipoGolpe: TipoGolpe.GOLPE_PEQUENO, factor: 1 },
        { tipoGolpe: TipoGolpe.GOLPE_MEDIANO, factor: 280 / 150 },
        { tipoGolpe: TipoGolpe.GOLPE_GRANDE, factor: 3 },
      ];
      for (const tarifa of tarifas) {
        const exists = await baremoRepo.findOne({
          where: {
            catalogoPieza: { idPiezaCatalogo: pieza.idPiezaCatalogo },
            tipoGolpe: tarifa.tipoGolpe,
          },
        });
        if (!exists) {
          await baremoRepo.save(
            baremoRepo.create({
              catalogoPieza: pieza,
              tipoGolpe: tarifa.tipoGolpe,
              costoManoObraGtq: Math.round(piezaSeed.base * tarifa.factor * 100) / 100,
              fechaVigencia: new Date('2026-12-31T00:00:00.000Z'),
              estado: true,
            }),
          );
        }
      }
    }

    console.info('\n✅ Seed completado exitosamente');
  } finally {
    await app.close();
  }
}

seed().catch((error: unknown) => {
  console.error('Database seed failed', error);
  process.exitCode = 1;
});
