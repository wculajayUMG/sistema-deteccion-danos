'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { num: 1, label: 'Cliente y Siniestro' },
  { num: 2, label: 'Vehículo' },
  { num: 3, label: 'Fotografías e IA' },
  { num: 4, label: 'Presupuesto' },
];

export default function StepperNav({ pasoActual }: { pasoActual: number }) {
  return (
    <div className="w-full">
      <div className="hidden items-center justify-center gap-0 sm:flex">
        {STEPS.map((step, index) => {
          const done = pasoActual > step.num;
          const active = pasoActual === step.num;
          const last = index === STEPS.length - 1;
          return (
            <div key={step.num} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-200',
                    done
                      ? 'bg-brand-secondary text-white'
                      : active
                        ? 'bg-brand-primary text-white ring-4 ring-brand-primary/20'
                        : 'bg-gray-200 text-gray-400',
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : step.num}
                </div>
                <span
                  className={cn(
                    'max-w-[80px] whitespace-nowrap text-center text-xs font-medium',
                    active
                      ? 'text-brand-primary'
                      : done
                        ? 'text-brand-secondary'
                        : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!last && (
                <div
                  className={cn(
                    'mx-2 mb-5 h-0.5 w-16 transition-colors lg:w-24',
                    done ? 'bg-brand-secondary' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 py-1 sm:hidden">
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className={cn(
                'h-1.5 rounded-full transition-all',
                pasoActual === step.num
                  ? 'w-6 bg-brand-primary'
                  : pasoActual > step.num
                    ? 'w-3 bg-brand-secondary'
                    : 'w-3 bg-gray-200',
              )}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-gray-500">
          Paso {pasoActual} de {STEPS.length}:{' '}
          <span className="font-semibold text-brand-primary">
            {STEPS[pasoActual - 1]?.label}
          </span>
        </span>
      </div>
    </div>
  );
}
