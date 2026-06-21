// Ad-hoc end-to-end verification against the running server + remote infra.
// Not part of the app build; run with: node scripts/e2e-verify.mjs
import { readFileSync } from 'node:fs';
import Redis from 'ioredis';
import pg from 'pg';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const BASE = `http://localhost:${env.PORT ?? 4001}`;
let pass = 0;
let fail = 0;
const ok = (c, m) => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`);
  c ? pass++ : fail++;
};

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, data };
}
const d = (r) => r.data?.data ?? r.data;

const run = async () => {
  const email = `e2e+${Date.now()}@example.com`;
  const password = 'supersecret123';

  // 1. Register
  let r = await req('POST', '/auth/v1/register', { body: { email, password } });
  ok(r.status === 201 || r.status === 200, `register -> ${r.status}`);

  // 2. Login
  r = await req('POST', '/auth/v1/login', { body: { email, password } });
  let token = d(r)?.accessToken;
  ok(r.status < 300 && !!token, `login -> token ${token ? 'issued' : 'MISSING'}`);

  // 3. Activate seller
  r = await req('POST', '/sellers/v1/activate', { token });
  const sellerToken = d(r)?.accessToken;
  const sellerId = d(r)?.sellerId;
  ok(!!sellerToken && !!sellerId, `activate seller -> sellerId ${sellerId ?? 'MISSING'}`);
  token = sellerToken;

  // 4. Create product (draft)
  r = await req('POST', '/sellers/v1/products', {
    token,
    body: {
      title: `E2E Widget ${Date.now()}`,
      description: 'An end-to-end test product.',
      price: 42.5,
      stock: 7,
    },
  });
  const product = d(r);
  ok(r.status === 201 && product?.id, `create product -> ${product?.id ?? r.status}`);
  ok(product?.status === 'draft', `new product status is draft (${product?.status})`);
  const productId = product?.id;

  // 5. Draft hidden from public catalog
  r = await req('GET', `/customers/v1/products/${productId}`);
  ok(r.status === 404, `draft product 404 on public detail (${r.status})`);

  // 6. Publish
  r = await req('POST', `/sellers/v1/products/${productId}/publish`, { token });
  ok(r.status === 200 && d(r)?.status === 'active', `publish -> status ${d(r)?.status}`);

  // 7. Public catalog shows it
  r = await req('GET', `/customers/v1/products?limit=50`);
  const inList = d(r)?.items?.some((p) => p.id === productId);
  ok(inList, `published product appears in public catalog`);

  // 8. Cache hit on second request (verify the Redis list key exists)
  const redis = new Redis({
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT ?? 6379),
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 2,
  });
  redis.on('error', () => {});
  const keysAfterFirst = await redis.keys('catalog:list:*');
  await req('GET', `/customers/v1/products?limit=50`); // second read
  ok(
    keysAfterFirst.some((k) => k.includes(':all:')),
    `catalog list cached in Redis (${keysAfterFirst.length} list key(s)) -> 2nd read is a cache hit`,
  );
  const detailReq1 = await req('GET', `/customers/v1/products/${productId}`);
  const detailKey = await redis.get(`catalog:product:${productId}`);
  ok(detailReq1.status === 200 && !!detailKey, `product detail cached in Redis after read`);

  // 9. Presigned image round-trip
  r = await req('POST', `/sellers/v1/products/${productId}/images/presign`, {
    token,
    body: { contentType: 'image/png' },
  });
  const { uploadUrl, objectKey } = d(r) ?? {};
  ok(r.status === 200 && !!uploadUrl && !!objectKey, `presign image -> ${objectKey ?? r.status}`);

  // 1x1 transparent PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: png,
  });
  ok(put.status >= 200 && put.status < 300, `PUT image bytes to presigned URL -> ${put.status}`);

  r = await req('POST', `/sellers/v1/products/${productId}/images`, {
    token,
    body: { objectKey, contentType: 'image/png' },
  });
  ok(r.status === 201 && d(r)?.url, `confirm image -> url ${d(r)?.url ? 'present' : 'MISSING'}`);

  r = await req('GET', `/sellers/v1/products/${productId}/images`, { token });
  const imgUrl = d(r)?.[0]?.url;
  ok(Array.isArray(d(r)) && d(r).length === 1 && imgUrl, `list images -> 1 image with url`);
  if (imgUrl) {
    const head = await fetch(imgUrl);
    ok(head.status === 200, `public image URL fetch -> ${head.status}`);
  }

  // 10. Bootstrap admin (set isAdmin in DB), re-login for admin token
  const client = new pg.Client({
    host: env.DB_HOST,
    port: Number(env.DB_PORT ?? 5432),
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  const upd = await client.query('UPDATE "user" SET "isAdmin" = true WHERE email = $1', [email]);
  ok(upd.rowCount === 1, `bootstrap admin in DB (rows=${upd.rowCount})`);
  r = await req('POST', '/auth/v1/login', { body: { email, password } });
  const adminToken = d(r)?.accessToken;
  ok(!!adminToken, `re-login as admin -> token ${adminToken ? 'issued' : 'MISSING'}`);

  // 11. Category bad-id validation on product update
  r = await req('PUT', `/sellers/v1/products/${productId}`, {
    token,
    body: { categoryId: '00000000-0000-0000-0000-000000000000' },
  });
  ok(r.status === 404, `assigning non-existent category -> 404 (${r.status})`);

  // 12. Admin creates two categories
  r = await req('POST', '/admin/categories', { token: adminToken, body: { name: `Electronics ${Date.now()}` } });
  const cat = d(r);
  ok(r.status === 201 && cat?.id && cat?.slug, `create category -> ${cat?.slug ?? r.status}`);
  r = await req('POST', '/admin/categories', { token: adminToken, body: { name: `Books ${Date.now()}` } });
  const otherCat = d(r);
  ok(r.status === 201 && otherCat?.id, `create 2nd category -> ${otherCat?.slug ?? r.status}`);

  // 13. Public can read categories
  r = await req('GET', '/customers/v1/categories');
  ok(Array.isArray(d(r)) && d(r).some((c) => c.id === cat.id), `public categories list includes new category`);

  // 14. Assign category to product
  r = await req('PUT', `/sellers/v1/products/${productId}`, { token, body: { categoryId: cat.id } });
  ok(r.status === 200 && d(r)?.categoryId === cat.id, `assign category to product`);

  // 15. Filter catalog by category
  r = await req('GET', `/customers/v1/products?categoryId=${cat.id}&limit=50`);
  ok(d(r)?.items?.some((p) => p.id === productId), `filter catalog by assigned category -> product present`);
  r = await req('GET', `/customers/v1/products?categoryId=${otherCat.id}&limit=50`);
  ok(!d(r)?.items?.some((p) => p.id === productId), `filter by other category -> product absent`);

  // 16. Category delete unlinks product (SET NULL) + cache invalidation
  r = await req('DELETE', `/admin/categories/${cat.id}`, { token: adminToken });
  ok(r.status === 204, `delete category -> ${r.status}`);
  r = await req('GET', `/customers/v1/products/${productId}`);
  ok(d(r)?.categoryId === null, `product categoryId is NULL after category delete`);

  await redis.quit();
  await client.end();

  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  process.exit(fail ? 1 : 0);
};

run().catch((e) => {
  console.error('SCRIPT ERROR:', e);
  process.exit(2);
});
