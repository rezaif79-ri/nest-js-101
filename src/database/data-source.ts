import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * Standalone DataSource used by the TypeORM CLI for migrations. The Nest
 * runtime configures TypeORM separately (see app.module.ts); this exists only
 * so `migration:generate` / `migration:run` have a connection + entity/migration
 * globs to work from. Env is loaded via `dotenv/config` since the CLI runs
 * outside the Nest DI container.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Resolve from source so the CLI sees decorators without a build step.
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  // Migrations own the schema; never let the CLI auto-sync.
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
