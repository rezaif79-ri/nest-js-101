import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lights up the storefront on top of the base seed:
 *  - gives every seeded product a small gallery of placeholder images
 *    (stable picsum URLs stored as the image `objectKey`; StorageService
 *    passes absolute URLs through unchanged),
 *  - flags a curated handful as `featured` for the homepage strip,
 *  - backfills any product left without a category so category navigation is
 *    never empty.
 *
 * Fixed UUIDs + `ON CONFLICT DO NOTHING` keep it safe to re-run, mirroring the
 * base SeedData migration.
 */
export class SeedImagesFeaturedBackfill1790000100000 implements MigrationInterface {
  name = 'SeedImagesFeaturedBackfill1790000100000';

  // Seeded product ids are d0000000-…-000000000001 .. 15 (see SeedData).
  private static productId(n: number): string {
    return `d0000000-0000-4000-a000-0000000000${n.toString().padStart(2, '0')}`;
  }

  // [productNo, slug, title]
  private static readonly PRODUCTS: [number, string, string][] = [
    [1, 'aerolite-14-laptop', 'Aerolite 14 Laptop'],
    [2, 'aerolite-16-pro-laptop', 'Aerolite 16 Pro Laptop'],
    [3, 'pulse-7-smartphone', 'Pulse 7 Smartphone'],
    [4, 'echobuds-wireless-earbuds', 'EchoBuds Wireless Earbuds'],
    [5, 'soundwave-bookshelf-speakers', 'SoundWave Bookshelf Speakers'],
    [6, 'nordic-oak-dining-table', 'Nordic Oak Dining Table'],
    [7, 'cloud-lounge-sofa', 'Cloud Lounge Sofa'],
    [8, 'brewmaster-coffee-machine', 'BrewMaster Coffee Machine'],
    [9, 'aerochef-air-fryer', 'AeroChef Air Fryer'],
    [10, 'lumen-floor-lamp', 'Lumen Floor Lamp'],
    [11, 'heritage-denim-jacket', 'Heritage Denim Jacket'],
    [12, 'everyday-cotton-tee-3-pack', 'Everyday Cotton Tee (3-pack)'],
    [13, 'aurora-wrap-dress', 'Aurora Wrap Dress'],
    [14, 'the-cartographers-tale-hardcover', "The Cartographer's Tale"],
    [15, 'mindful-mornings-journal', 'Mindful Mornings Journal'],
  ];

  // Curated featured set (active products only).
  private static readonly FEATURED = [1, 3, 6, 8, 11, 13, 14];

  // Fallback leaf-ish category for any uncategorised product (Books).
  private static readonly FALLBACK_CATEGORY =
    'e0000000-0000-4000-a000-000000000004';

  private static imageId(productNo: number, index: number): string {
    const suffix = `${productNo.toString().padStart(2, '0')}${index}`.padStart(
      12,
      '0',
    );
    return `f0000000-0000-4000-a000-${suffix}`;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const S = SeedImagesFeaturedBackfill1790000100000;

    // Two placeholder images per product (positions 0 and 1).
    for (const [productNo, slug, title] of S.PRODUCTS) {
      const productId = S.productId(productNo);
      for (let i = 0; i < 2; i++) {
        await queryRunner.query(
          `INSERT INTO "product_image"
             ("id", "productId", "objectKey", "position", "altText",
              "width", "height", "contentType")
           VALUES ($1, $2, $3, $4, $5, 1200, 1200, 'image/jpeg')
           ON CONFLICT ("id") DO NOTHING`,
          [
            S.imageId(productNo, i),
            productId,
            `https://picsum.photos/seed/${slug}-${i}/1200/1200`,
            i,
            i === 0 ? title : `${title} (view ${i + 1})`,
          ],
        );
      }
    }

    // Curated featured strip.
    const featuredIds = S.FEATURED.map((n) => S.productId(n));
    await queryRunner.query(
      `UPDATE "product" SET "featured" = true WHERE "id" = ANY($1)`,
      [featuredIds],
    );

    // Ensure every product has a category so navigation is never empty.
    await queryRunner.query(
      `UPDATE "product" SET "categoryId" = $1 WHERE "categoryId" IS NULL`,
      [S.FALLBACK_CATEGORY],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const S = SeedImagesFeaturedBackfill1790000100000;

    const imageIds: string[] = [];
    for (const [productNo] of S.PRODUCTS) {
      imageIds.push(S.imageId(productNo, 0), S.imageId(productNo, 1));
    }
    await queryRunner.query(
      `DELETE FROM "product_image" WHERE "id" = ANY($1)`,
      [imageIds],
    );

    const featuredIds = S.FEATURED.map((n) => S.productId(n));
    await queryRunner.query(
      `UPDATE "product" SET "featured" = false WHERE "id" = ANY($1)`,
      [featuredIds],
    );
    // The category backfill is intentionally not reversed (original NULLs are
    // unknown).
  }
}
