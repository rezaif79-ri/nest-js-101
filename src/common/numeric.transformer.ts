import { ValueTransformer } from 'typeorm';

/**
 * Keeps Postgres `numeric` columns as JS numbers across the boundary. TypeORM
 * returns `numeric` as a string by default (to avoid float precision loss);
 * this transformer parses it back to a number on read while writing it through
 * unchanged. Mirrors the inline transformer on `Product.price`.
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};
