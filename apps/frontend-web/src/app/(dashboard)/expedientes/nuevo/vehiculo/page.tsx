'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { AlertCircle, Car, CheckCircle2, MapPin } from 'lucide-react';
import StepperNav from '@/components/ui/StepperNav';
import VehiculoSVG from '@/components/vehiculo/VehiculoSVG';
import { useMarcas, useModelos } from '@/hooks/useCatalogos';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useNuevoSiniestroStore } from '@/stores/nuevo-siniestro-store';

const ZONA_LABEL: Record<string, string> = {
  frontal:           'Frontal',
  trasera:           'Trasera',
  lateral_izquierda: 'Lateral Izquierda',
  lateral_derecha:   'Lateral Derecha',
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1990 + 1 }, (_, index) => currentYear - index);
const vehicleTypes = [
  { value: 'SEDAN', label: 'Sedán' },
  { value: 'SUV', label: 'SUV' },
  { value: 'PICKUP', label: 'Pickup' },
  { value: 'VAN', label: 'Van' },
  { value: 'MOTO', label: 'Moto' },
] as const;

type VehicleType = (typeof vehicleTypes)[number]['value'];

function isVehicleType(value: string): value is VehicleType {
  return vehicleTypes.some((type) => type.value === value);
}

const schema = z.object({
  idMarca: z.number().int().min(1, 'Seleccione una marca'),
  idModelo: z.number().int().min(1, 'Seleccione un modelo'),
  anio: z.number().int().min(1990).max(currentYear),
  tipoVehiculo: z.enum(['SEDAN', 'SUV', 'PICKUP', 'VAN', 'MOTO']),
  placa: z.string().trim().min(3, 'Ingrese la placa'),
  color: z.string().optional(),
  numeroChasis: z.string().optional(),
  numeroMotor: z.string().optional(),
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
        <p className="mt-1 flex items-center gap-1 text-xs text-red-500" role="alert">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = cn(
  'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition',
  'focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20',
);
const errorInputClass = cn(inputClass, 'border-red-300 focus:border-red-400 focus:ring-red-100');

export default function VehiculoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    cliente,
    siniestro,
    vehiculo,
    setDatosVehiculo,
    setSiniestroCreado,
    setZonasAfectadas,
    zonasAfectadas,
  } = useNuevoSiniestroStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [piezasSeleccionadas, setPiezas] = useState<string[]>([]);
  const [piezasNombres, setPiezasNombres] = useState<Record<string, string>>({});

  const handleTogglePieza = useCallback((id: string, nombre: string) => {
    setPiezas((current) =>
      current.includes(id) ? current.filter((p) => p !== id) : [...current, id],
    );
    setPiezasNombres((current) => ({ ...current, [id]: nombre }));
  }, []);

  const handleZonasChange = useCallback(
    (zonas: string[]) => { setZonasAfectadas(zonas); },
    [setZonasAfectadas],
  );
  const savedVehicleType = vehiculo?.tipoVehiculo;

  useEffect(() => {
    if (!cliente || !siniestro) {
      router.replace('/expedientes/nuevo/cliente');
    }
  }, [cliente, router, siniestro]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      idMarca: vehiculo?.idMarca ?? 0,
      idModelo: vehiculo?.idModelo ?? 0,
      anio: vehiculo?.anio ?? Math.min(2024, currentYear),
      tipoVehiculo: savedVehicleType && isVehicleType(savedVehicleType)
        ? savedVehicleType
        : 'SEDAN',
      placa: vehiculo?.placa ?? '',
      color: vehiculo?.color ?? '',
      numeroChasis: vehiculo?.numeroChasis ?? '',
      numeroMotor: vehiculo?.numeroMotor ?? '',
    },
  });

  const idMarca = useWatch({ control, name: 'idMarca' });
  const idModelo = useWatch({ control, name: 'idModelo' });
  const anio = useWatch({ control, name: 'anio' });
  const { data: marcas, isLoading: marcasLoading, isError: marcasError } = useMarcas();
  const { data: modelos, isLoading: modelosLoading, isError: modelosError } = useModelos(idMarca || undefined);
  const selectedBrand = marcas?.find((item) => item.idMarca === idMarca);
  const selectedModel = modelos?.find((item) => item.idModelo === idModelo);
  const compatibility = selectedBrand && selectedModel
    ? `${selectedBrand.nombreMarca} ${selectedModel.nombreModelo} ${anio}`
    : null;

  const onSubmit = async (data: FormData) => {
    if (!cliente || !siniestro) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const marca = marcas?.find((item) => item.idMarca === data.idMarca);
      const modelo = modelos?.find((item) => item.idModelo === data.idModelo);
      if (!marca || !modelo) {
        throw new Error('Seleccione una marca y un modelo disponibles.');
      }

      const { data: created } = await apiClient.post<{
        idSiniestro: number;
        numeroReclamo: string;
      }>('/api/v1/siniestros', {
        tipoCliente: cliente.tipoCliente,
        nombreCliente: cliente.nombreCliente,
        apellidoCliente: cliente.apellidoCliente,
        dpiCliente: cliente.dpiCliente || undefined,
        telefonoCliente: cliente.telefonoCliente || undefined,
        correoCliente: cliente.correoCliente || undefined,
        direccionCliente: cliente.direccionCliente || undefined,
        idMarca: data.idMarca,
        idModelo: data.idModelo,
        anio: data.anio,
        placa: data.placa.toUpperCase(),
        tipoVehiculo: data.tipoVehiculo,
        color: data.color || undefined,
        numeroChasis: data.numeroChasis || undefined,
        numeroMotor: data.numeroMotor || undefined,
        numeroPoliza: siniestro.numeroPoliza,
        fechaSiniestro: siniestro.fechaSiniestro,
        lugarSiniestro: siniestro.lugarSiniestro || undefined,
        descripcion: siniestro.descripcion || undefined,
      });

      if (!Number.isInteger(created.idSiniestro) || !created.numeroReclamo) {
        throw new Error('El servidor devolvió datos incompletos del siniestro creado.');
      }

      setDatosVehiculo({
        idMarca: data.idMarca,
        nombreMarca: marca.nombreMarca,
        idModelo: data.idModelo,
        nombreModelo: modelo.nombreModelo,
        anio: data.anio,
        placa: data.placa.toUpperCase(),
        tipoVehiculo: data.tipoVehiculo,
        color: data.color ?? '',
        numeroChasis: data.numeroChasis ?? '',
        numeroMotor: data.numeroMotor ?? '',
      });
      setSiniestroCreado(created.idSiniestro, created.numeroReclamo);
      await queryClient.invalidateQueries({ queryKey: ['siniestros'] });
      router.push('/expedientes/nuevo/fotografias');
    } catch (cause) {
      const axiosError = cause as {
        response?: { data?: { message?: string | string[] } };
      };
      const apiMessage = axiosError.response?.data?.message;
      setSubmitError(
        Array.isArray(apiMessage)
          ? apiMessage.join('. ')
          : apiMessage ?? (cause instanceof Error ? cause.message : 'Error al crear el siniestro.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!cliente || !siniestro) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
      <div className="rounded-card bg-white p-4 shadow-card md:p-6">
        <StepperNav pasoActual={2} />
      </div>
      {(submitError || marcasError || modelosError) && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="text-sm text-red-800">
            <p className="font-medium">
              {submitError ? 'Error al crear el siniestro' : 'No se pudo cargar el catálogo vehicular'}
            </p>
            <p className="mt-1 text-red-700">
              {submitError || 'Verifique la conexión con el servicio e inténtelo de nuevo.'}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4 md:space-y-6">
          <section className="space-y-4 rounded-card bg-white p-4 shadow-card md:p-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10">
                <Car className="h-4 w-4 text-brand-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-brand-text">Catálogo del Vehículo</h2>
                <p className="text-xs text-gray-400">Seleccione marca, modelo y año</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Marca" required error={errors.idMarca?.message}>
                <Controller
                  name="idMarca"
                  control={control}
                  render={({ field }) => (
                    <select
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) => {
                        field.onChange(Number(event.target.value));
                        setValue('idModelo', 0, { shouldValidate: true });
                      }}
                      className={errors.idMarca ? errorInputClass : inputClass}
                      disabled={marcasLoading || marcasError}
                    >
                      <option value={0}>
                        {marcasLoading ? 'Cargando marcas...' : 'Seleccione marca'}
                      </option>
                      {marcas?.map((marca) => (
                        <option key={marca.idMarca} value={marca.idMarca}>
                          {marca.nombreMarca}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </Field>
              <Field label="Modelo" required error={errors.idModelo?.message}>
                <Controller
                  name="idModelo"
                  control={control}
                  render={({ field }) => (
                    <select
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                      className={errors.idModelo ? errorInputClass : inputClass}
                      disabled={!idMarca || modelosLoading || modelosError}
                    >
                      <option value={0}>
                        {!idMarca
                          ? 'Seleccione marca primero'
                          : modelosLoading
                            ? 'Cargando modelos...'
                            : 'Seleccione modelo'}
                      </option>
                      {modelos?.map((modelo) => (
                        <option key={modelo.idModelo} value={modelo.idModelo}>
                          {modelo.nombreModelo}{modelo.linea ? ` — ${modelo.linea}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </Field>
              <Field label="Año" required error={errors.anio?.message}>
                <Controller
                  name="anio"
                  control={control}
                  render={({ field }) => (
                    <select
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                      className={errors.anio ? errorInputClass : inputClass}
                    >
                      {years.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  )}
                />
              </Field>
            </div>
            {compatibility && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                <p className="text-sm font-medium text-green-700">{compatibility}</p>
              </div>
            )}
            <p className="text-xs italic text-gray-400">
              El sistema cruzará automáticamente este vehículo con el catálogo de repuestos disponibles.
            </p>
          </section>

          <section className="space-y-4 rounded-card bg-white p-4 shadow-card md:p-6">
            <h2 className="border-b border-gray-100 pb-3 text-sm font-bold text-brand-text">
              Datos Físicos del Vehículo
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tipo de Vehículo" required error={errors.tipoVehiculo?.message}>
                <select {...register('tipoVehiculo')} className={errors.tipoVehiculo ? errorInputClass : inputClass}>
                  {vehicleTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </Field>
              <Field label="Color" error={errors.color?.message}>
                <input {...register('color')} placeholder="Blanco, Negro..." className={inputClass} />
              </Field>
              <Field label="Placa" required error={errors.placa?.message}>
                <input {...register('placa')} placeholder="P-123ABC" className={cn(errors.placa ? errorInputClass : inputClass, 'uppercase')} />
              </Field>
              <Field label="Número de Chasis / VIN" error={errors.numeroChasis?.message}>
                <input {...register('numeroChasis')} placeholder="17 caracteres" maxLength={50} className={inputClass} />
              </Field>
              <Field label="Número de Motor" error={errors.numeroMotor?.message}>
                <input {...register('numeroMotor')} placeholder="Motor ID" className={inputClass} />
              </Field>
            </div>
          </section>

          <section className="rounded-card bg-white p-4 shadow-card md:p-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent/20">
                <MapPin className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-brand-text">Zonas dañadas</h2>
                <p className="text-xs text-gray-400">
                  Toca las piezas afectadas para orientar la cámara guiada
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <VehiculoSVG
                seleccionadas={piezasSeleccionadas}
                onToggle={handleTogglePieza}
                onZonasChange={handleZonasChange}
              />
              <div className="flex flex-col justify-center gap-3">
                {zonasAfectadas.length > 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-2 text-xs font-semibold text-amber-800">
                      Zonas afectadas:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {zonasAfectadas.map((zona) => (
                        <span
                          key={zona}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800"
                        >
                          <MapPin className="h-3 w-3" />
                          {ZONA_LABEL[zona] ?? zona}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-amber-600">
                      En el paso de fotografías se activará la cámara guiada para cada zona.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    Selecciona las piezas dañadas en el diagrama para habilitar la cámara guiada en el paso siguiente.
                  </p>
                )}
                {piezasSeleccionadas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {piezasSeleccionadas.map((id) => (
                      <span
                        key={id}
                        className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500"
                      >
                        {piezasNombres[id] ?? id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <details className="group rounded-card bg-white p-4 shadow-card md:p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-brand-text">
              <span>Resumen — Cliente y Siniestro</span>
              <span className="text-xs text-gray-400 group-open:hidden">Ver datos</span>
              <span className="hidden text-xs text-gray-400 group-open:block">Ocultar</span>
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-xs sm:grid-cols-3">
              <div>
                <p className="text-gray-400">Cliente</p>
                <p className="mt-0.5 font-medium text-brand-text">{cliente.nombreCliente} {cliente.apellidoCliente}</p>
              </div>
              <div>
                <p className="text-gray-400">Póliza</p>
                <p className="mt-0.5 font-medium text-brand-text">{siniestro.numeroPoliza}</p>
              </div>
              <div>
                <p className="text-gray-400">Fecha Siniestro</p>
                <p className="mt-0.5 font-medium text-brand-text">{siniestro.fechaSiniestro}</p>
              </div>
            </div>
          </details>
        </div>
        <div className="mt-4 flex flex-col justify-between gap-3 md:mt-6 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push('/expedientes/nuevo/cliente')}
            className="order-2 rounded-lg border border-brand-primary px-6 py-2.5 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary/5 sm:order-1"
          >
            ← Volver a Cliente
          </button>
          <button
            type="submit"
            disabled={submitting || marcasLoading || marcasError || modelosError}
            className="order-1 rounded-lg bg-brand-secondary px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:order-2"
          >
            {submitting ? 'Creando siniestro...' : 'Continuar → Captura de Fotografías'}
          </button>
        </div>
      </form>
    </div>
  );
}
