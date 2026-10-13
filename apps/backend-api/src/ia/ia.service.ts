import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';

export interface BoundingBox {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DeteccionIA {
  clase: string;
  clase_id: number;
  confianza: number;
  accion_tecnica: string;
  severidad: string;
  bbox: BoundingBox;
  pieza_afectada?: string | null;
}

export interface DetectIaResponse {
  id_fotografia: number | null;
  modelo_version: string;
  tiempo_ms: number;
  confianza_promedio: number;
  total_detecciones: number;
  detecciones: DeteccionIA[];
  modo_fallback: boolean;
  mensaje?: string | null;
}

@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);
  private readonly aiUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.aiUrl = config.get<string>('AI_SERVICE_URL', 'http://localhost:8000')
      .replace(/\/+$/, '');
  }

  async detectarDanos(
    urlCloudflare: string,
    idFotografia: number,
  ): Promise<DetectIaResponse> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<DetectIaResponse>(`${this.aiUrl}/api/v1/detect`, {
          url_cloudflare: urlCloudflare,
          id_fotografia: idFotografia,
        }),
      );
      this.logger.log(
        `AI service returned ${data.total_detecciones} detections for photo ${idFotografia} in ${data.tiempo_ms} ms`,
      );
      if (data.modo_fallback) {
        this.logger.warn('AI is using generic fallback weights; damage classes are approximate.');
      }
      return data;
    } catch (error: unknown) {
      if (axios.isAxiosError<{ detail?: string }>(error)) {
        if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT'
        ) {
          this.logger.error(`AI service unavailable: ${error.code}`);
          throw new ServiceUnavailableException('El servicio IA no está disponible.');
        }
        const detail = error.response?.data?.detail;
        this.logger.error(
          `AI service request failed with status ${error.response?.status ?? 'unknown'}`,
        );
        throw new BadGatewayException(
          typeof detail === 'string' ? detail : 'Error en el servicio IA',
        );
      }
      this.logger.error('Unexpected error calling AI service', error);
      throw new ServiceUnavailableException('No se pudo contactar el servicio IA.');
    }
  }
}
