import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the catalog data model (categories, product images, richer product
 * fields) and personal/storefront profile fields on customers and sellers.
 *
 * Written as a delta on top of the synchronize-created baseline. `product.slug`
 * is added nullable, backfilled (from the row id, which is guaranteed unique),
 * then promoted to NOT NULL + UNIQUE so existing rows don't violate the
 * constraint.
 */
export class CatalogAndProfiles1750377600000 implements MigrationInterface {
  name = 'CatalogAndProfiles1750377600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- category ---
    await queryRunner.query(`
      CREATE TABLE "category" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "parentId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_category_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_category" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "category"
      ADD CONSTRAINT "FK_category_parent"
      FOREIGN KEY ("parentId") REFERENCES "category"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // --- product: new columns ---
    await queryRunner.query(
      `CREATE TYPE "product_status_enum" AS ENUM ('draft', 'active', 'archived')`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD "slug" character varying`,
    );
    // Backfill slug for any pre-existing rows; id is unique so this is safe.
    await queryRunner.query(`UPDATE "product" SET "slug" = "id"::text WHERE "slug" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "product" ALTER COLUMN "slug" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "UQ_product_slug" UNIQUE ("slug")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD "shortDescription" character varying(300)`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD "currency" character(3) NOT NULL DEFAULT 'USD'`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD "status" "product_status_enum" NOT NULL DEFAULT 'draft'`,
    );
    await queryRunner.query(`ALTER TABLE "product" ADD "categoryId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_product_category" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_status" ON "product" ("status")`,
    );

    // --- product_image ---
    await queryRunner.query(`
      CREATE TABLE "product_image" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "productId" uuid NOT NULL,
        "objectKey" character varying NOT NULL,
        "position" integer NOT NULL DEFAULT 0,
        "altText" character varying(300),
        "width" integer,
        "height" integer,
        "sizeBytes" integer,
        "contentType" character varying(100),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_product_image_objectKey" UNIQUE ("objectKey"),
        CONSTRAINT "PK_product_image" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "product_image" ADD CONSTRAINT "FK_product_image_product" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_image_product_position" ON "product_image" ("productId", "position")`,
    );

    // --- customer: personal profile ---
    await queryRunner.query(`
      ALTER TABLE "customer"
        ADD "displayName" character varying(120),
        ADD "firstName" character varying(80),
        ADD "lastName" character varying(80),
        ADD "phone" character varying(30),
        ADD "avatarObjectKey" character varying,
        ADD "locale" character varying(10)
    `);

    // --- seller: personal profile + storefront ---
    await queryRunner.query(`
      ALTER TABLE "seller"
        ADD "displayName" character varying(120),
        ADD "firstName" character varying(80),
        ADD "lastName" character varying(80),
        ADD "phone" character varying(30),
        ADD "avatarObjectKey" character varying,
        ADD "locale" character varying(10),
        ADD "shopName" character varying(120),
        ADD "shopSlug" character varying(140),
        ADD "shopDescription" text,
        ADD "shopLogoObjectKey" character varying
    `);
    await queryRunner.query(
      `ALTER TABLE "seller" ADD CONSTRAINT "UQ_seller_shopName" UNIQUE ("shopName")`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller" ADD CONSTRAINT "UQ_seller_shopSlug" UNIQUE ("shopSlug")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seller" DROP CONSTRAINT "UQ_seller_shopSlug"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller" DROP CONSTRAINT "UQ_seller_shopName"`,
    );
    await queryRunner.query(`
      ALTER TABLE "seller"
        DROP COLUMN "shopLogoObjectKey",
        DROP COLUMN "shopDescription",
        DROP COLUMN "shopSlug",
        DROP COLUMN "shopName",
        DROP COLUMN "locale",
        DROP COLUMN "avatarObjectKey",
        DROP COLUMN "phone",
        DROP COLUMN "lastName",
        DROP COLUMN "firstName",
        DROP COLUMN "displayName"
    `);
    await queryRunner.query(`
      ALTER TABLE "customer"
        DROP COLUMN "locale",
        DROP COLUMN "avatarObjectKey",
        DROP COLUMN "phone",
        DROP COLUMN "lastName",
        DROP COLUMN "firstName",
        DROP COLUMN "displayName"
    `);

    await queryRunner.query(
      `ALTER TABLE "product_image" DROP CONSTRAINT "FK_product_image_product"`,
    );
    await queryRunner.query(`DROP TABLE "product_image"`);

    await queryRunner.query(`DROP INDEX "IDX_product_status"`);
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_product_category"`,
    );
    await queryRunner.query(`
      ALTER TABLE "product"
        DROP COLUMN "categoryId",
        DROP COLUMN "status",
        DROP COLUMN "currency",
        DROP COLUMN "shortDescription"
    `);
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "UQ_product_slug"`,
    );
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "slug"`);
    await queryRunner.query(`DROP TYPE "product_status_enum"`);

    await queryRunner.query(
      `ALTER TABLE "category" DROP CONSTRAINT "FK_category_parent"`,
    );
    await queryRunner.query(`DROP TABLE "category"`);
  }
}
