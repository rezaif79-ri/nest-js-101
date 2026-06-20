import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds an index on product.categoryId to back the public catalog's
 * category filter. The category table and the FK already exist; this only
 * adds the supporting index (kept idempotent with IF [NOT] EXISTS so it is
 * safe regardless of whether TypeORM had previously auto-created one).
 */
export class ProductCategoryIndex1781974024056 implements MigrationInterface {
  name = 'ProductCategoryIndex1781974024056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_product_categoryId" ON "product" ("categoryId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_product_categoryId"`,
    );
  }
}
