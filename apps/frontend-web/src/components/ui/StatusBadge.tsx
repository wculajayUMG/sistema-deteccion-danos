import { cn } from '@/lib/utils';
import type { EstadoSiniestro } from '@/types/siniestro';

const CONFIG: Record<EstadoSiniestro, {
  label: string;
  className: string;
}> = {
  ABIERTO: {
    label: 'Abierto',
    className: 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/30',
  },
  EN_PROCESO: {
    label: 'En Proceso',
    className: 'bg-brand-accent/10 text-amber-700 border border-brand-accent/30',
  },
  CERRADO: {
    label: 'Cerrado',
    className: 'bg-gray-100 text-gray-600 border border-gray-200',
  },
};

export default function StatusBadge({
  estado,
}: {
  estado: EstadoSiniestro;
}) {
  const { label, className } = CONFIG[estado];

  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className,
      )}
    >
      {label}
    </span>
  );
}
