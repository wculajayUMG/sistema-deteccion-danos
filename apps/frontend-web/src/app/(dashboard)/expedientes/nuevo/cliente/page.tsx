'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlertCircle, FileText, User } from 'lucide-react';
import StepperNav from '@/components/ui/StepperNav';
import { cn } from '@/lib/utils';
import { useNuevoSiniestroStore } from '@/stores/nuevo-siniestro-store';

const today = new Date().toLocaleDateString('en-CA');

const schema = z.object({
  tipoCliente: z.enum(['ASEGURADO', 'TERCERO']),
  nombreCliente: z.string().min(2, 'Mínimo 2 caracteres'),
  apellidoCliente: z.string().min(2, 'Mínimo 2 caracteres'),
  dpiCliente: z.string().optional(),
  telefonoCliente: z.string().optional(),
  correoCliente: z.string().email('Correo inválido').optional().or(z.literal('')),
  direccionCliente: z.string().optional(),
  numeroPoliza: z.string().min(5, 'Ingrese un número de póliza válido'),
  fechaSiniestro: z.string()
    .min(1, 'Seleccione la fecha')
    .refine((value) => value <= today, 'La fecha no puede ser futura'),
  lugarSiniestro: z.string().optional(),
  descripcion: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-brand-text">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {children}
      </label>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500" role="alert">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = cn(
  'mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition',
  'placeholder:text-gray-400 focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20',
);
const errorInputClass = cn(inputClass, 'border-red-300 focus:border-red-400 focus:ring-red-100');

export default function ClientePage() {
  const router = useRouter();
  const { setDatosCliente, cliente, siniestro } = useNuevoSiniestroStore();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipoCliente: cliente?.tipoCliente ?? 'ASEGURADO',
      nombreCliente: cliente?.nombreCliente ?? '',
      apellidoCliente: cliente?.apellidoCliente ?? '',
      dpiCliente: cliente?.dpiCliente ?? '',
      telefonoCliente: cliente?.telefonoCliente ?? '',
      correoCliente: cliente?.correoCliente ?? '',
      direccionCliente: cliente?.direccionCliente ?? '',
      numeroPoliza: siniestro?.numeroPoliza ?? '',
      fechaSiniestro: siniestro?.fechaSiniestro ?? '',
      lugarSiniestro: siniestro?.lugarSiniestro ?? '',
      descripcion: siniestro?.descripcion ?? '',
    },
  });

  const onSubmit = (data: FormData) => {
    setSubmitting(true);
    setDatosCliente(
      {
        tipoCliente: data.tipoCliente,
        nombreCliente: data.nombreCliente.trim(),
        apellidoCliente: data.apellidoCliente.trim(),
        dpiCliente: data.dpiCliente ?? '',
        telefonoCliente: data.telefonoCliente ?? '',
        correoCliente: data.correoCliente ?? '',
        direccionCliente: data.direccionCliente ?? '',
      },
      {
        numeroPoliza: data.numeroPoliza.trim(),
        fechaSiniestro: data.fechaSiniestro,
        lugarSiniestro: data.lugarSiniestro ?? '',
        descripcion: data.descripcion ?? '',
      },
    );
    router.push('/expedientes/nuevo/vehiculo');
    setSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
      <div className="rounded-card bg-white p-4 shadow-card md:p-6">
        <StepperNav pasoActual={1} />
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-6">
          <section className="space-y-4 rounded-card bg-white p-4 shadow-card md:p-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10">
                <User className="h-4 w-4 text-brand-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-brand-text">Datos del Cliente</h2>
                <p className="text-xs text-gray-400">Asegurado o tercero afectado</p>
              </div>
            </div>
            <Field label="Tipo de Cliente" required error={errors.tipoCliente?.message}>
              <select {...register('tipoCliente')} className={errors.tipoCliente ? errorInputClass : inputClass}>
                <option value="ASEGURADO">Asegurado</option>
                <option value="TERCERO">Tercero Afectado</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre" required error={errors.nombreCliente?.message}>
                <input {...register('nombreCliente')} autoComplete="given-name" placeholder="Carlos" className={errors.nombreCliente ? errorInputClass : inputClass} />
              </Field>
              <Field label="Apellido" required error={errors.apellidoCliente?.message}>
                <input {...register('apellidoCliente')} autoComplete="family-name" placeholder="Méndez" className={errors.apellidoCliente ? errorInputClass : inputClass} />
              </Field>
            </div>
            <Field label="DPI / Identificación" error={errors.dpiCliente?.message}>
              <input {...register('dpiCliente')} inputMode="numeric" placeholder="1234567890101" className={inputClass} />
            </Field>
            <Field label="Teléfono" error={errors.telefonoCliente?.message}>
              <input {...register('telefonoCliente')} type="tel" autoComplete="tel" placeholder="+502 5555-5555" className={inputClass} />
            </Field>
            <Field label="Correo Electrónico" error={errors.correoCliente?.message}>
              <input {...register('correoCliente')} type="email" autoComplete="email" placeholder="cliente@email.com" className={errors.correoCliente ? errorInputClass : inputClass} />
            </Field>
            <Field label="Dirección" error={errors.direccionCliente?.message}>
              <textarea {...register('direccionCliente')} rows={2} placeholder="Ciudad de Guatemala..." className={cn(inputClass, 'resize-none')} />
            </Field>
          </section>

          <section className="space-y-4 rounded-card bg-white p-4 shadow-card md:p-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-secondary/10">
                <FileText className="h-4 w-4 text-brand-secondary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-brand-text">Datos del Siniestro</h2>
                <p className="text-xs text-gray-400">Información del reclamo</p>
              </div>
            </div>
            <Field label="Número de Id">
              <input readOnly value="Se generará automáticamente" className={cn(inputClass, 'cursor-not-allowed bg-gray-50 text-gray-400')} />
            </Field>
            <Field label="Número de Reclamo" required error={errors.numeroPoliza?.message}>
              <input {...register('numeroPoliza')} placeholder="POL-2026-001" className={errors.numeroPoliza ? errorInputClass : inputClass} />
            </Field>
            <Field label="Fecha del Siniestro" required error={errors.fechaSiniestro?.message}>
              <input {...register('fechaSiniestro')} type="date" max={today} className={errors.fechaSiniestro ? errorInputClass : inputClass} />
            </Field>
            <Field label="Estado del Expediente">
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-brand-secondary/30 bg-brand-secondary/10 px-3 py-2.5">
                <span className="h-2 w-2 rounded-full bg-brand-secondary" />
                <span className="text-sm font-semibold text-brand-secondary">ABIERTO</span>
              </div>
            </Field>
            <Field label="Lugar del Siniestro" error={errors.lugarSiniestro?.message}>
              <input {...register('lugarSiniestro')} placeholder="Zona 4, Ciudad de Guatemala" className={inputClass} />
            </Field>
            <Field label="Descripción del Siniestro" error={errors.descripcion?.message}>
              <textarea {...register('descripcion')} rows={4} placeholder="Describa cómo ocurrió el siniestro..." className={cn(inputClass, 'resize-none')} />
            </Field>
          </section>
        </div>
        <div className="mt-4 flex flex-col justify-between gap-3 md:mt-6 sm:flex-row">
          <button type="button" onClick={() => router.push('/expedientes')} className="order-2 rounded-lg border border-brand-primary px-6 py-2.5 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary/5 sm:order-1">
            ← Cancelar
          </button>
          <button type="submit" disabled={submitting} className="order-1 rounded-lg bg-brand-secondary px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:order-2">
            {submitting ? 'Guardando...' : 'Continuar → Información del Vehículo'}
          </button>
        </div>
      </form>
    </div>
  );
}
