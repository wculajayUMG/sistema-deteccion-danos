import type { ValueTransformer } from 'typeorm';

export const decimalNumberTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null): number | null =>
    value === null ? null : Number(value),
};
