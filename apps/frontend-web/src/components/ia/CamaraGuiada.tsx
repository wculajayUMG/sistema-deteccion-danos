'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Camera, X } from 'lucide-react';

export type ZonaCamara = 'frontal' | 'trasera' | 'lateral_izquierda' | 'lateral_derecha';

const ZONA_INSTRUCCION: Record<ZonaCamara, string> = {
  frontal:           'Encuadra la parte frontal del vehículo',
  trasera:           'Encuadra la parte trasera del vehículo',
  lateral_izquierda: 'Encuadra el lateral izquierdo del vehículo',
  lateral_derecha:   'Encuadra el lateral derecho del vehículo',
};

function drawSilhouette(canvas: HTMLCanvasElement, zona: ZonaCamara) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.lineJoin = 'round';

  if (zona === 'frontal') {
    const bx = w * 0.12, by = h * 0.22, bw = w * 0.76, bh = h * 0.52;
    ctx.strokeRect(bx, by, bw, bh);
    // Faros izquierdo y derecho
    ctx.strokeRect(bx + bw * 0.05, by + bh * 0.06, bw * 0.22, bh * 0.22);
    ctx.strokeRect(bx + bw * 0.73, by + bh * 0.06, bw * 0.22, bh * 0.22);
    // Parrilla
    const gx = bx + bw * 0.3, gw = bw * 0.4, gy = by + bh * 0.36, gh = bh * 0.36;
    ctx.strokeRect(gx, gy, gw, gh);
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(gx, gy + (gh / 3) * i);
      ctx.lineTo(gx + gw, gy + (gh / 3) * i);
      ctx.stroke();
    }
    // Bumper inferior
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.04, by + bh + bh * 0.06);
    ctx.lineTo(bx + bw + bw * 0.04, by + bh + bh * 0.06);
    ctx.stroke();

  } else if (zona === 'trasera') {
    const bx = w * 0.12, by = h * 0.22, bw = w * 0.76, bh = h * 0.52;
    ctx.strokeRect(bx, by, bw, bh);
    // Stops izquierdo y derecho
    ctx.strokeRect(bx + bw * 0.04, by + bh * 0.05, bw * 0.2, bh * 0.18);
    ctx.strokeRect(bx + bw * 0.76, by + bh * 0.05, bw * 0.2, bh * 0.18);
    // Línea de cajuela
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.08, by + bh * 0.32);
    ctx.lineTo(bx + bw * 0.92, by + bh * 0.32);
    ctx.stroke();
    // Placa / cajuela inferior
    ctx.strokeRect(bx + bw * 0.32, by + bh * 0.55, bw * 0.36, bh * 0.25);
    // Bumper inferior
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.04, by + bh + bh * 0.06);
    ctx.lineTo(bx + bw + bw * 0.04, by + bh + bh * 0.06);
    ctx.stroke();

  } else {
    // Vista lateral — lateral_derecha es espejo de lateral_izquierda
    const mirror = zona === 'lateral_derecha';
    const bx = w * 0.06, by = h * 0.3, bw = w * 0.88, bh = h * 0.32;
    const wheelR = Math.min(h * 0.1, bh * 0.45);

    // Piso
    ctx.beginPath();
    ctx.moveTo(bx, by + bh);
    ctx.lineTo(bx + bw, by + bh);
    ctx.stroke();

    // Silueta carrocería
    ctx.beginPath();
    if (!mirror) {
      ctx.moveTo(bx,           by + bh);
      ctx.lineTo(bx,           by + bh * 0.55);
      ctx.lineTo(bx + bw * 0.17, by);
      ctx.lineTo(bx + bw * 0.65, by);
      ctx.lineTo(bx + bw * 0.84, by + bh * 0.3);
      ctx.lineTo(bx + bw * 0.95, by + bh * 0.55);
      ctx.lineTo(bx + bw,      by + bh * 0.72);
    } else {
      ctx.moveTo(bx + bw,        by + bh);
      ctx.lineTo(bx + bw,        by + bh * 0.55);
      ctx.lineTo(bx + bw * 0.83, by);
      ctx.lineTo(bx + bw * 0.35, by);
      ctx.lineTo(bx + bw * 0.16, by + bh * 0.3);
      ctx.lineTo(bx + bw * 0.05, by + bh * 0.55);
      ctx.lineTo(bx,             by + bh * 0.72);
    }
    ctx.stroke();

    // Ventanas (2)
    const rw = bw * 0.27, rh = bh * 0.38;
    if (!mirror) {
      ctx.strokeRect(bx + bw * 0.19, by + bh * 0.06, rw, rh);
      ctx.strokeRect(bx + bw * 0.48, by + bh * 0.06, rw, rh);
    } else {
      ctx.strokeRect(bx + bw * 0.54, by + bh * 0.06, rw, rh);
      ctx.strokeRect(bx + bw * 0.25, by + bh * 0.06, rw, rh);
    }

    // Ruedas
    const rearX  = mirror ? bx + bw * 0.76 : bx + bw * 0.24;
    const frontX = mirror ? bx + bw * 0.24 : bx + bw * 0.76;
    [rearX, frontX].forEach((cx) => {
      ctx.beginPath();
      ctx.arc(cx, by + bh, wheelR, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
}

interface Props {
  zona: ZonaCamara;
  onCaptura: (base64: string) => void;
  onCancelar: () => void;
}

export default function CamaraGuiada({ zona, onCaptura, onCancelar }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  // Inicia la cámara trasera al montar
  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        // Fallback a cámara frontal si la trasera no está disponible
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then((stream) => {
            if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
          })
          .catch(() => { /* sin cámara disponible */ });
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Dibuja la silueta cuando el video empieza a reproducirse
  const handleVideoPlay = useCallback(() => {
    const canvas = overlayRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    canvas.width  = video.videoWidth  || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;
    drawSilhouette(canvas, zona);
  }, [zona]);

  // Redibujar silueta si el contenedor cambia de tamaño
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      if (videoRef.current) {
        canvas.width  = videoRef.current.clientWidth;
        canvas.height = videoRef.current.clientHeight;
        drawSilhouette(canvas, zona);
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [zona]);

  const handleCapturar = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const capture = document.createElement('canvas');
    capture.width  = video.videoWidth  || video.clientWidth;
    capture.height = video.videoHeight || video.clientHeight;
    capture.getContext('2d')?.drawImage(video, 0, 0);
    const base64 = capture.toDataURL('image/jpeg', 0.9);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCaptura(base64);
  }, [onCaptura]);

  const handleCancelar = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancelar();
  }, [onCancelar]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Instrucción */}
      <div className="relative z-10 bg-black/70 px-4 py-3 text-center">
        <p className="text-sm font-semibold text-brand-accent">
          {ZONA_INSTRUCCION[zona]}
        </p>
        <p className="mt-0.5 text-xs text-white/60">
          Mantén el vehículo dentro de la silueta guía
        </p>
      </div>

      {/* Video + overlay */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
          onPlay={handleVideoPlay}
        />
        <canvas
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between bg-black/80 px-6 py-5">
        <button
          type="button"
          onClick={handleCancelar}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10"
          aria-label="Cancelar"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={handleCapturar}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg transition-transform active:scale-95"
          aria-label="Capturar fotografía"
        >
          <Camera className="h-7 w-7 text-gray-900" />
        </button>

        {/* Espacio para simetría */}
        <div className="h-12 w-12" />
      </div>
    </div>
  );
}
