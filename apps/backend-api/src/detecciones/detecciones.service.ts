import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AccionTecnica } from '../common/enums/accion-tecnica.enum.js';
import { EstadoDeteccion } from '../common/enums/estado-deteccion.enum.js';
import { NivelSeveridad } from '../common/enums/nivel-severidad.enum.js';
import { CatalogoPieza } from '../database/entities/catalogo-pieza.entity.js';
import { DeteccionIa } from '../database/entities/deteccion-ia.entity.js';
import { Fotografia } from '../database/entities/fotografia.entity.js';
import { PiezaDanada } from '../database/entities/pieza-danada.entity.js';
import { Severidad } from '../database/entities/severidad.entity.js';
import { Usuario } from '../database/entities/usuario.entity.js';
import { DetectIaResponse, DeteccionIA, IaService } from '../ia/ia.service.js';

@Injectable()
export class DeteccionesService {
  private readonly logger = new Logger(DeteccionesService.name);

  // Normaliza los valores de severidad del ai-service a los niveles
  // almacenados en la tabla `severidad` (que mantiene los valores legacy en mayúsculas).
  private static readonly SEVERITY_MAP: Record<string, NivelSeveridad> = {
    LEVE:     NivelSeveridad.LEVE,
    MODERADO: NivelSeveridad.MODERADO,
    SEVERO:   NivelSeveridad.SEVERO,
    leve:     NivelSeveridad.LEVE,
    moderado: NivelSeveridad.MODERADO,
    grave:    NivelSeveridad.SEVERO,
    pieza:    NivelSeveridad.LEVE,
  };

  private static readonly SEVERIDADES_VALIDAS = new Set<string>(
    Object.keys(DeteccionesService.SEVERITY_MAP),
  );

  private static readonly ACCIONES_VALIDAS = new Set<string>(
    Object.values(AccionTecnica),
  );

  // Rango de severidad por clase de daño: mayor número = más grave.
  // Permite descartar daños menores cuando la misma pieza tiene uno más grave.
  private static readonly DAMAGE_RANK: Record<string, number> = {
    golpe_grande:      3,
    ruptura_cambio:    3,
    ruptura:           3,
    golpe_mediano:     2,
    rayadura_profunda: 2,
    golpe_pequeno:     1,
    rayadura:          1,
  };

  /**
   * De cada grupo de detecciones que comparten pieza_afectada conserva
   * únicamente la de mayor rango de daño. Las detecciones sin pieza_afectada
   * se mantienen todas (no hay clave de agrupación).
   */
  private static deduplicarPorPieza(
    detecciones: DeteccionIA[],
  ): DeteccionIA[] {
    const best = new Map<string, DeteccionIA>();
    const sinPieza: DeteccionIA[] = [];

    for (const d of detecciones) {
      if (!d.pieza_afectada) {
        sinPieza.push(d);
        continue;
      }
      const prev = best.get(d.pieza_afectada);
      if (!prev) {
        best.set(d.pieza_afectada, d);
        continue;
      }
      const rankNew  = DeteccionesService.DAMAGE_RANK[d.clase]    ?? 0;
      const rankPrev = DeteccionesService.DAMAGE_RANK[prev.clase]  ?? 0;
      if (rankNew > rankPrev) {
        best.set(d.pieza_afectada, d);
      }
    }

    return [...best.values(), ...sinPieza];
  }

  constructor(
    private readonly dataSource: DataSource,
    private readonly ia: IaService,
    @InjectRepository(Fotografia)
    private readonly fotografias: Repository<Fotografia>,
  ) {}

  async procesar(idFotografia: number, idUsuario: number) {
    const fotografia = await this.fotografias.findOne({
      where: { idFotografia },
      relations: { deteccion: true },
    });
    if (!fotografia) {
      throw new NotFoundException(`Fotografía ${idFotografia} no encontrada.`);
    }
    if (fotografia.deteccion) {
      throw new ConflictException(`La fotografía ${idFotografia} ya fue analizada.`);
    }

    const response = await this.ia.detectarDanos(
      fotografia.urlCloudflare,
      fotografia.idFotografia,
    );
    this.validarRespuesta(response, idFotografia);

    return this.dataSource.transaction(async (manager) => {
      const detectionRepository = manager.getRepository(DeteccionIa);
      const photoRepository = manager.getRepository(Fotografia);
      const userRepository = manager.getRepository(Usuario);
      const severityRepository = manager.getRepository(Severidad);
      const pieceRepository = manager.getRepository(CatalogoPieza);
      const damagedPartRepository = manager.getRepository(PiezaDanada);

      const currentPhoto = await photoRepository.findOne({
        where: { idFotografia },
        lock: { mode: 'pessimistic_write' },
      });
      if (!currentPhoto) {
        throw new NotFoundException(`Fotografía ${idFotografia} no encontrada.`);
      }
      const existingDetection = await detectionRepository.existsBy({
        fotografia: { idFotografia },
      });
      if (existingDetection) {
        throw new ConflictException(`La fotografía ${idFotografia} ya fue analizada.`);
      }
      const user = await userRepository.findOneBy({ idUsuario, estado: true });
      if (!user) {
        throw new NotFoundException('Usuario autenticado no encontrado.');
      }
      const defaultPart = await pieceRepository.findOneBy({
        idPiezaCatalogo: 1,
        estado: true,
      });
      if (!defaultPart) {
        throw new NotFoundException(
          'No existe la pieza predeterminada con id 1 en el catálogo de piezas.',
        );
      }

      // Pre-cargar todas las piezas con claseYolo para evitar N+1 queries
      const allPieces = await pieceRepository.find({ where: { estado: true } });
      const pieceByYoloClass = new Map<string, CatalogoPieza>(
        allPieces
          .filter((p) => p.claseYolo != null)
          .map((p) => [p.claseYolo as string, p]),
      );

      const detection = await detectionRepository.save(
        detectionRepository.create({
          fotografia: currentPhoto,
          usuario: user,
          modeloVersion: response.modelo_version,
          tiempoInferenciaMs: response.tiempo_ms,
          confianzaPromedio: response.confianza_promedio,
          estado: EstadoDeteccion.COMPLETADO,
        }),
      );

      const deteccionesFiltradas = DeteccionesService.deduplicarPorPieza(response.detecciones);
      const severityByLevel = new Map<NivelSeveridad, Severidad>();
      const damagedParts: PiezaDanada[] = [];
      for (const item of deteccionesFiltradas) {
        const severityLevel: NivelSeveridad =
          DeteccionesService.SEVERITY_MAP[item.severidad ?? ''] ??
          NivelSeveridad.LEVE;
        let severity = severityByLevel.get(severityLevel);
        if (!severity) {
          const found = await severityRepository.findOneBy({ nivel: severityLevel });
          if (!found) {
            throw new NotFoundException(
              `No está configurada la severidad ${severityLevel} en la base de datos.`,
            );
          }
          severity = found;
          severityByLevel.set(severityLevel, severity);
        }
        const catalogPart =
          (item.pieza_afectada != null && pieceByYoloClass.get(item.pieza_afectada)) ||
          defaultPart;
        damagedParts.push(
          damagedPartRepository.create({
            deteccion: detection,
            severidad: severity,
            catalogoPieza: catalogPart,
            confianza: item.confianza,
            bboxX: item.bbox.x,
            bboxY: item.bbox.y,
            bboxAncho: item.bbox.ancho,
            bboxAlto: item.bbox.alto,
            accionTecnica: item.accion_tecnica as AccionTecnica,
          }),
        );
      }
      const savedParts = damagedParts.length
        ? await damagedPartRepository.save(damagedParts)
        : [];

      this.logger.log(
        `Saved detection ${detection.idDeteccion} for photo ${idFotografia}: ${savedParts.length} damaged parts`,
      );
      return {
        id_deteccion: detection.idDeteccion,
        total_detecciones: savedParts.length,
        detecciones: savedParts.map((part) => ({
          id_pieza_danada: part.idPiezaDanada,
          confianza: part.confianza,
          bbox: {
            x: part.bboxX,
            y: part.bboxY,
            ancho: part.bboxAncho,
            alto: part.bboxAlto,
          },
          accion_tecnica: part.accionTecnica,
          severidad: part.severidad?.nivel,
        })),
        modo_fallback: response.modo_fallback,
        modelo_version: response.modelo_version,
        mensaje: response.mensaje ?? null,
      };
    });
  }

  private validarRespuesta(
    response: DetectIaResponse,
    idFotografia: number,
  ): asserts response is DetectIaResponse {
    if (
      !response ||
      !Array.isArray(response.detecciones) ||
      response.id_fotografia !== idFotografia ||
      typeof response.modelo_version !== 'string' ||
      response.modelo_version.length === 0 ||
      !Number.isInteger(response.tiempo_ms) ||
      response.tiempo_ms < 0 ||
      !Number.isFinite(response.confianza_promedio) ||
      response.confianza_promedio < 0 ||
      response.confianza_promedio > 1 ||
      !Number.isInteger(response.total_detecciones) ||
      response.total_detecciones !== response.detecciones.length ||
      typeof response.modo_fallback !== 'boolean'
    ) {
      throw new BadGatewayException('El servicio IA devolvió una respuesta inválida.');
    }
    for (const item of response.detecciones) {
      this.validarDeteccion(item);
    }
  }

  private validarDeteccion(item: DeteccionIA): void {
    if (!item || typeof item !== 'object') {
      throw new BadGatewayException(
        'El servicio IA devolvió una detección con formato inválido.',
      );
    }
    const boxValues = [
      item.bbox?.x,
      item.bbox?.y,
      item.bbox?.ancho,
      item.bbox?.alto,
      item.bbox?.x1,
      item.bbox?.y1,
      item.bbox?.x2,
      item.bbox?.y2,
    ];
    if (
      !Number.isInteger(item.clase_id) ||
      !Number.isFinite(item.confianza) ||
      item.confianza < 0 ||
      item.confianza > 1 ||
      (item.severidad != null &&
        !DeteccionesService.SEVERIDADES_VALIDAS.has(item.severidad)) ||
      !DeteccionesService.ACCIONES_VALIDAS.has(item.accion_tecnica) ||
      boxValues.some(
        (value) => !Number.isFinite(value) || value < 0 || value > 1,
      )
    ) {
      throw new BadGatewayException(
        'El servicio IA devolvió una detección con valores inválidos.',
      );
    }
  }
}
