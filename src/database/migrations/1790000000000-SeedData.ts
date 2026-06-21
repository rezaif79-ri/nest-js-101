import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * Development seed data: a category tree, an admin, a handful of sellers and
 * pure customers, and a catalog of products spread across the categories.
 *
 * Conventions that keep this safe to run (and re-run) on any environment:
 *  - Every row uses a fixed UUID so foreign keys are stable and `ON CONFLICT
 *    (id) DO NOTHING` makes each INSERT idempotent.
 *  - Passwords are real bcrypt hashes (same 12 rounds as AuthService) so the
 *    seeded accounts can actually log in. Every account shares the password
 *    `Password123!`.
 *  - Sellers follow the app's "hybrid start" model: each seller user also owns
 *    a customer profile, exactly as a real registration → activation flow would
 *    leave it.
 *
 * `down()` removes only what this migration inserted, in FK-dependency order.
 */
export class SeedData1790000000000 implements MigrationInterface {
  name = 'SeedData1790000000000';

  // --- Fixed identifiers (referenced across tables) ---
  private static readonly USERS = {
    admin: '0a000000-0000-4000-a000-000000000001',
    sellerNimbus: '51000000-0000-4000-a000-000000000001',
    sellerHearth: '51000000-0000-4000-a000-000000000002',
    sellerThread: '51000000-0000-4000-a000-000000000003',
    custAlice: 'c1000000-0000-4000-a000-000000000001',
    custBob: 'c1000000-0000-4000-a000-000000000002',
    custCarol: 'c1000000-0000-4000-a000-000000000003',
    custDave: 'c1000000-0000-4000-a000-000000000004',
  };

  private static readonly SELLERS = {
    nimbus: '5e000000-0000-4000-a000-000000000001',
    hearth: '5e000000-0000-4000-a000-000000000002',
    thread: '5e000000-0000-4000-a000-000000000003',
  };

  private static readonly CUSTOMERS = {
    // Customer profiles for the seller users (hybrid start).
    nimbus: 'ca000000-0000-4000-a000-000000000001',
    hearth: 'ca000000-0000-4000-a000-000000000002',
    thread: 'ca000000-0000-4000-a000-000000000003',
    // Pure customers.
    alice: 'cb000000-0000-4000-a000-000000000001',
    bob: 'cb000000-0000-4000-a000-000000000002',
    carol: 'cb000000-0000-4000-a000-000000000003',
    dave: 'cb000000-0000-4000-a000-000000000004',
  };

  private static readonly CATEGORIES = {
    electronics: 'e0000000-0000-4000-a000-000000000001',
    home: 'e0000000-0000-4000-a000-000000000002',
    fashion: 'e0000000-0000-4000-a000-000000000003',
    books: 'e0000000-0000-4000-a000-000000000004',
    laptops: 'e1000000-0000-4000-a000-000000000001',
    smartphones: 'e1000000-0000-4000-a000-000000000002',
    audio: 'e1000000-0000-4000-a000-000000000003',
    furniture: 'e1000000-0000-4000-a000-000000000004',
    appliances: 'e1000000-0000-4000-a000-000000000005',
    mensClothing: 'e1000000-0000-4000-a000-000000000006',
    womensClothing: 'e1000000-0000-4000-a000-000000000007',
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    const U = SeedData1790000000000.USERS;
    const S = SeedData1790000000000.SELLERS;
    const C = SeedData1790000000000.CUSTOMERS;
    const CAT = SeedData1790000000000.CATEGORIES;

    // Shared password for every seeded account: `Password123!`. Hashed here
    // with the same cost factor AuthService uses so login works as normal.
    const passwordHash = await bcrypt.hash('Password123!', 12);

    // --- users ---
    // [id, email, isAdmin]
    const users: [string, string, boolean][] = [
      [U.admin, 'admin@example.com', true],
      [U.sellerNimbus, 'nimbus@example.com', false],
      [U.sellerHearth, 'hearth@example.com', false],
      [U.sellerThread, 'thread@example.com', false],
      [U.custAlice, 'alice@example.com', false],
      [U.custBob, 'bob@example.com', false],
      [U.custCarol, 'carol@example.com', false],
      [U.custDave, 'dave@example.com', false],
    ];
    for (const [id, email, isAdmin] of users) {
      await queryRunner.query(
        `INSERT INTO "user" ("id", "email", "password", "isAdmin", "isActive")
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT ("id") DO NOTHING`,
        [id, email, passwordHash, isAdmin],
      );
    }

    // --- customer profiles ---
    // [id, userId, displayName, firstName, lastName, phone]
    const customers: [string, string, string, string, string, string][] = [
      [
        C.nimbus,
        U.sellerNimbus,
        'Nimbus Tech',
        'Nadia',
        'Imbus',
        '+1-202-555-0101',
      ],
      [
        C.hearth,
        U.sellerHearth,
        'Hearth & Home',
        'Henry',
        'Earth',
        '+1-202-555-0102',
      ],
      [
        C.thread,
        U.sellerThread,
        'Thread & Story',
        'Thea',
        'Reed',
        '+1-202-555-0103',
      ],
      [C.alice, U.custAlice, 'Alice', 'Alice', 'Anderson', '+1-202-555-0111'],
      [C.bob, U.custBob, 'Bob', 'Bob', 'Brown', '+1-202-555-0112'],
      [C.carol, U.custCarol, 'Carol', 'Carol', 'Clark', '+1-202-555-0113'],
      [C.dave, U.custDave, 'Dave', 'Dave', 'Davis', '+1-202-555-0114'],
    ];
    for (const [
      id,
      userId,
      displayName,
      firstName,
      lastName,
      phone,
    ] of customers) {
      await queryRunner.query(
        `INSERT INTO "customer"
           ("id", "userId", "displayName", "firstName", "lastName", "phone", "locale")
         VALUES ($1, $2, $3, $4, $5, $6, 'en-US')
         ON CONFLICT ("id") DO NOTHING`,
        [id, userId, displayName, firstName, lastName, phone],
      );
    }

    // --- seller profiles (storefronts) ---
    // [id, userId, displayName, shopName, shopSlug, shopDescription]
    const sellers: [string, string, string, string, string, string][] = [
      [
        S.nimbus,
        U.sellerNimbus,
        'Nimbus Tech',
        'Nimbus Tech',
        'nimbus-tech',
        'Laptops, phones and audio gear for people who care about the details.',
      ],
      [
        S.hearth,
        U.sellerHearth,
        'Hearth & Home',
        'Hearth & Home',
        'hearth-and-home',
        'Furniture and small appliances to make any space feel like home.',
      ],
      [
        S.thread,
        U.sellerThread,
        'Thread & Story',
        'Thread & Story',
        'thread-and-story',
        'Considered clothing and a small shelf of well-told books.',
      ],
    ];
    for (const [
      id,
      userId,
      displayName,
      shopName,
      shopSlug,
      shopDescription,
    ] of sellers) {
      await queryRunner.query(
        `INSERT INTO "seller"
           ("id", "userId", "displayName", "locale",
            "shopName", "shopSlug", "shopDescription")
         VALUES ($1, $2, $3, 'en-US', $4, $5, $6)
         ON CONFLICT ("id") DO NOTHING`,
        [id, userId, displayName, shopName, shopSlug, shopDescription],
      );
    }

    // --- categories ---
    // Parents first so the self-referential FK resolves.
    // [id, name, slug, parentId|null]
    const categories: [string, string, string, string | null][] = [
      [CAT.electronics, 'Electronics', 'electronics', null],
      [CAT.home, 'Home & Kitchen', 'home-kitchen', null],
      [CAT.fashion, 'Fashion', 'fashion', null],
      [CAT.books, 'Books', 'books', null],
      [CAT.laptops, 'Laptops', 'laptops', CAT.electronics],
      [CAT.smartphones, 'Smartphones', 'smartphones', CAT.electronics],
      [CAT.audio, 'Audio', 'audio', CAT.electronics],
      [CAT.furniture, 'Furniture', 'furniture', CAT.home],
      [CAT.appliances, 'Appliances', 'appliances', CAT.home],
      [CAT.mensClothing, "Men's Clothing", 'mens-clothing', CAT.fashion],
      [CAT.womensClothing, "Women's Clothing", 'womens-clothing', CAT.fashion],
    ];
    for (const [id, catName, slug, parentId] of categories) {
      await queryRunner.query(
        `INSERT INTO "category" ("id", "name", "slug", "parentId")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("id") DO NOTHING`,
        [id, catName, slug, parentId],
      );
    }

    // --- products ---
    // [id, sellerId, categoryId, title, slug, shortDescription, price, stock, status]
    const p = (n: number) =>
      `d0000000-0000-4000-a000-0000000000${n.toString().padStart(2, '0')}`;
    const products: [
      string,
      string,
      string,
      string,
      string,
      string,
      number,
      number,
      'draft' | 'active' | 'archived',
    ][] = [
      // Nimbus Tech
      [
        p(1),
        S.nimbus,
        CAT.laptops,
        'Aerolite 14 Laptop',
        'aerolite-14-laptop',
        'Featherweight 14" ultrabook with all-day battery.',
        1299.0,
        25,
        'active',
      ],
      [
        p(2),
        S.nimbus,
        CAT.laptops,
        'Aerolite 16 Pro Laptop',
        'aerolite-16-pro-laptop',
        'Creator-grade 16" laptop with a color-accurate display.',
        1899.0,
        12,
        'active',
      ],
      [
        p(3),
        S.nimbus,
        CAT.smartphones,
        'Pulse 7 Smartphone',
        'pulse-7-smartphone',
        'Flagship camera, three-day battery, clean software.',
        799.0,
        50,
        'active',
      ],
      [
        p(4),
        S.nimbus,
        CAT.audio,
        'EchoBuds Wireless Earbuds',
        'echobuds-wireless-earbuds',
        'Compact ANC earbuds with 30h total playback.',
        149.99,
        200,
        'active',
      ],
      [
        p(5),
        S.nimbus,
        CAT.audio,
        'SoundWave Bookshelf Speakers',
        'soundwave-bookshelf-speakers',
        'Warm, room-filling sound from a small footprint.',
        249.0,
        0,
        'draft',
      ],

      // Hearth & Home
      [
        p(6),
        S.hearth,
        CAT.furniture,
        'Nordic Oak Dining Table',
        'nordic-oak-dining-table',
        'Solid oak table that seats six comfortably.',
        649.0,
        8,
        'active',
      ],
      [
        p(7),
        S.hearth,
        CAT.furniture,
        'Cloud Lounge Sofa',
        'cloud-lounge-sofa',
        'Deep, modular three-seater with washable covers.',
        1199.0,
        5,
        'active',
      ],
      [
        p(8),
        S.hearth,
        CAT.appliances,
        'BrewMaster Coffee Machine',
        'brewmaster-coffee-machine',
        'Programmable drip brewer with a thermal carafe.',
        89.99,
        60,
        'active',
      ],
      [
        p(9),
        S.hearth,
        CAT.appliances,
        'AeroChef Air Fryer',
        'aerochef-air-fryer',
        '5.5L air fryer with eight one-touch presets.',
        129.0,
        40,
        'active',
      ],
      [
        p(10),
        S.hearth,
        CAT.home,
        'Lumen Floor Lamp',
        'lumen-floor-lamp',
        'Dimmable LED floor lamp with a brass finish.',
        74.5,
        30,
        'archived',
      ],

      // Thread & Story
      [
        p(11),
        S.thread,
        CAT.mensClothing,
        'Heritage Denim Jacket',
        'heritage-denim-jacket',
        'Rigid selvedge denim that breaks in beautifully.',
        119.0,
        35,
        'active',
      ],
      [
        p(12),
        S.thread,
        CAT.mensClothing,
        'Everyday Cotton Tee (3-pack)',
        'everyday-cotton-tee-3-pack',
        'Heavyweight organic cotton tees in core colors.',
        39.0,
        120,
        'active',
      ],
      [
        p(13),
        S.thread,
        CAT.womensClothing,
        'Aurora Wrap Dress',
        'aurora-wrap-dress',
        'Flowing wrap dress in a breathable viscose blend.',
        89.0,
        22,
        'active',
      ],
      [
        p(14),
        S.thread,
        CAT.books,
        "The Cartographer's Tale (Hardcover)",
        'the-cartographers-tale-hardcover',
        'A sweeping novel of maps, memory and migration.',
        24.99,
        75,
        'active',
      ],
      [
        p(15),
        S.thread,
        CAT.books,
        'Mindful Mornings Journal',
        'mindful-mornings-journal',
        'Undated guided journal for a calmer start.',
        18.5,
        0,
        'draft',
      ],
    ];
    for (const [
      id,
      sellerId,
      categoryId,
      title,
      slug,
      shortDescription,
      price,
      stock,
      status,
    ] of products) {
      await queryRunner.query(
        `INSERT INTO "product"
           ("id", "sellerId", "categoryId", "title", "slug",
            "shortDescription", "description", "price", "currency", "stock", "status")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'USD', $9, $10::product_status_enum)
         ON CONFLICT ("id") DO NOTHING`,
        [
          id,
          sellerId,
          categoryId,
          title,
          slug,
          shortDescription,
          shortDescription,
          price,
          stock,
          status,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const U = SeedData1790000000000.USERS;
    const S = SeedData1790000000000.SELLERS;
    const C = SeedData1790000000000.CUSTOMERS;
    const CAT = SeedData1790000000000.CATEGORIES;

    const productIds = Array.from(
      { length: 15 },
      (_, i) =>
        `d0000000-0000-4000-a000-0000000000${(i + 1).toString().padStart(2, '0')}`,
    );

    // Children-before-parents / dependents-before-owners.
    await queryRunner.query(`DELETE FROM "product" WHERE "id" = ANY($1)`, [
      productIds,
    ]);
    await queryRunner.query(`DELETE FROM "seller" WHERE "id" = ANY($1)`, [
      Object.values(S),
    ]);
    await queryRunner.query(`DELETE FROM "customer" WHERE "id" = ANY($1)`, [
      Object.values(C),
    ]);
    await queryRunner.query(`DELETE FROM "user" WHERE "id" = ANY($1)`, [
      Object.values(U),
    ]);
    await queryRunner.query(`DELETE FROM "category" WHERE "id" = ANY($1)`, [
      Object.values(CAT),
    ]);
  }
}
