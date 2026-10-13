'use client';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  stats?: Array<{
    label: string;
    value: string | number;
    color?: string;
  }>;
  onAdd?: () => void;
  addLabel?: string;
  extraActions?: React.ReactNode;
}

export default function AdminPageHeader({
  title,
  description,
  stats,
  onAdd,
  addLabel,
  extraActions,
}: Props) {
  return (
    <div className="bg-white rounded-card shadow-card p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-text">{title}</h1>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
          {stats && (
            <div className="flex flex-wrap gap-2 mt-3">
              {stats.map((s) => (
                <span
                  key={s.label}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold',
                    s.color ?? 'bg-brand-secondary/10 text-brand-secondary',
                  )}
                >
                  {s.value} {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {extraActions}
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 bg-brand-secondary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              {addLabel ?? 'Agregar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
