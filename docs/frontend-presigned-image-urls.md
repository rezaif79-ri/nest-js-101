# Product Image URLs Are Now Presigned

## What changed

All `url` fields on product image objects are now **presigned S3/MinIO GET URLs** instead of plain bucket paths. This affects every endpoint that returns product images.

## Affected endpoints

| Endpoint | Changed field |
|---|---|
| `GET /catalog` | `items[].primaryImage.url` |
| `GET /catalog/:id` | `images[].url`, `primaryImage.url` |
| `GET /catalog/slug/:slug` | `images[].url`, `primaryImage.url` |
| `GET /seller/products/:id` (seller dashboard) | `images[].url`, `primaryImage.url` |
| `GET /products/:productId/images` (seller) | `[].url` |
| `POST /products/:productId/images/confirm` (seller) | `url` |

## Key behaviour

- **TTL: 1 hour (3600 s).** The URL is signed for 3600 seconds from the time the API response was generated.
- **Do not cache or persist `url` values.** Re-fetch the resource when you need to display the image again after the TTL window.
- The catalog Redis cache TTL is 60 s by default, so presigned URLs in cached responses always have at least ~3540 s left — safe to use immediately after receiving them.

## What you should do

**Render images directly** from the `url` field — no auth headers needed, the signature is in the URL query string.

```ts
// ✅ correct — use the url as-is
<img src={product.primaryImage.url} />

// ❌ wrong — don't store url in localStorage / long-lived state
localStorage.setItem('productImageUrl', product.primaryImage.url)
```

**If you cache API responses client-side** (SWR, React Query, etc.), keep the cache TTL well under 3600 s. The default 60 s stale-while-revalidate window is fine.

## Response shape (unchanged except url value)

```json
{
  "id": "uuid",
  "productId": "uuid",
  "objectKey": "products/uuid/uuid.jpg",
  "url": "http://minio:9000/shop/products/uuid/uuid.jpg?X-Amz-Algorithm=...&X-Amz-Expires=3600&...",
  "position": 0,
  "altText": null,
  "width": 800,
  "height": 600,
  "contentType": "image/jpeg"
}
```

The `objectKey` field is still present but is the raw storage key — only use `url` for display.
