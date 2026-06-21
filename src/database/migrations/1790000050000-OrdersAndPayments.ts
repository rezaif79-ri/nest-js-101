import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Order/checkout data model: `order` (+ JSONB shipping address), `order_item`
 * (price snapshots so history stays accurate as the catalog changes), and a
 * one-per-order `payment` row carrying the gateway handles.
 */
export class OrdersAndPayments1790000050000 implements MigrationInterface {
  name = 'OrdersAndPayments1790000050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "order_status_enum" AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'paid', 'failed')`,
    );

    await queryRunner.query(`
      CREATE TABLE "order" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customerId" uuid NOT NULL,
        "status" "order_status_enum" NOT NULL DEFAULT 'pending',
        "email" character varying(320) NOT NULL,
        "shippingAddress" jsonb NOT NULL,
        "subtotal" numeric(12,2) NOT NULL,
        "currency" character(3) NOT NULL DEFAULT 'USD',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_order_customerId" ON "order" ("customerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_status" ON "order" ("status")`,
    );
    await queryRunner.query(`
      ALTER TABLE "order"
      ADD CONSTRAINT "FK_order_customer"
      FOREIGN KEY ("customerId") REFERENCES "customer"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "order_item" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "productId" uuid,
        "title" character varying NOT NULL,
        "unitPrice" numeric(12,2) NOT NULL,
        "quantity" integer NOT NULL,
        CONSTRAINT "PK_order_item" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_order_item_orderId" ON "order_item" ("orderId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "order_item"
      ADD CONSTRAINT "FK_order_item_order"
      FOREIGN KEY ("orderId") REFERENCES "order"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "order_item"
      ADD CONSTRAINT "FK_order_item_product"
      FOREIGN KEY ("productId") REFERENCES "product"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "payment" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "provider" character varying(50) NOT NULL,
        "status" "payment_status_enum" NOT NULL DEFAULT 'pending',
        "amount" numeric(12,2) NOT NULL,
        "currency" character(3) NOT NULL DEFAULT 'USD',
        "snapToken" character varying,
        "redirectUrl" character varying,
        "externalId" character varying,
        "rawResponse" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_orderId" UNIQUE ("orderId")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "payment"
      ADD CONSTRAINT "FK_payment_order"
      FOREIGN KEY ("orderId") REFERENCES "order"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payment"`);
    await queryRunner.query(`DROP TABLE "order_item"`);
    await queryRunner.query(`DROP TABLE "order"`);
    await queryRunner.query(`DROP TYPE "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "order_status_enum"`);
  }
}
