import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the curated `featured` flag to products so the storefront homepage can
 * show an intentional "Featured" strip (filtered via the public catalog) rather
 * than just the first page. Indexed because the catalog filters on it.
 */
export class ProductFeatured1790000060000 implements MigrationInterface {
  name = 'ProductFeatured1790000060000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" ADD "featured" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_featured" ON "product" ("featured")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_product_featured"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "featured"`);
  }
}
