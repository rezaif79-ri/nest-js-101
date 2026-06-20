import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline schema: the original identity + catalog tables that were previously
 * created by TypeORM `synchronize`. With synchronize disabled, this migration
 * is the single source of truth for the starting schema; the CatalogAndProfiles
 * migration then layers the richer catalog/profile fields on top.
 *
 * Run order on a fresh database: this migration, then CatalogAndProfiles.
 */
export class InitialSchema1750377500000 implements MigrationInterface {
  name = 'InitialSchema1750377500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // uuid_generate_v4() backs every uuid primary key.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // --- user (central identity) ---
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "isAdmin" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user" PRIMARY KEY ("id")
      )
    `);

    // --- customer (1:1 with user) ---
    await queryRunner.query(`
      CREATE TABLE "customer" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "registeredAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        CONSTRAINT "UQ_customer_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_customer" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "customer"
      ADD CONSTRAINT "FK_customer_user"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // --- seller (1:1 with user) ---
    await queryRunner.query(`
      CREATE TABLE "seller" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "registeredAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        CONSTRAINT "UQ_seller_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_seller" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "seller"
      ADD CONSTRAINT "FK_seller_user"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // --- product (owned by seller) ---
    await queryRunner.query(`
      CREATE TABLE "product" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "stock" integer NOT NULL DEFAULT 0,
        "sellerId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "product"
      ADD CONSTRAINT "FK_product_seller"
      FOREIGN KEY ("sellerId") REFERENCES "seller"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_product_seller"`,
    );
    await queryRunner.query(`DROP TABLE "product"`);
    await queryRunner.query(
      `ALTER TABLE "seller" DROP CONSTRAINT "FK_seller_user"`,
    );
    await queryRunner.query(`DROP TABLE "seller"`);
    await queryRunner.query(
      `ALTER TABLE "customer" DROP CONSTRAINT "FK_customer_user"`,
    );
    await queryRunner.query(`DROP TABLE "customer"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
