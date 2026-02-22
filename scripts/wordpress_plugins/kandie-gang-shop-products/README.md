# Kandie Gang Shop Products — WordPress Plugin

Registers the `shop_product` custom post type with ACF fields, WPGraphQL support, and Stripe price ID fields for up to 10 product variants.

## Installation

Copy the plugin folder to `wp-content/plugins/kandie-gang-shop-products/` and activate it in the WordPress admin. Requires ACF Pro and WPGraphQL.

## GraphQL fields

All fields live under `productFields { }` on the `ShopProduct` type:

| Field | Type | Notes |
|---|---|---|
| `imageUrl` | String | Fallback image if no featured image is set |
| `inventory` | Int | Top-level inventory (used when no variants exist) |
| `sku` | String | |
| `membersOnly` | Boolean | |
| `variants` | [ShopProductVariant] | Computed from V1–V10 slots; only slots with a label are included |
| `inStock` | Boolean | `true` if top-level inventory > 0, or any variant inventory > 0 |

Each `ShopProductVariant` has: `label`, `pricePublic`, `priceMember`, `stripePriceIdPublic`, `stripePriceIdMember`, `sku`, `inventory`.

## Debugging

If `variants` or `inStock` return `null`/`false` unexpectedly, the most likely cause is that the custom resolver cannot extract the post ID from `$source`.

### Root cause (solved in v7.0)

WPGraphQL passes `$source` to `ProductFields` custom resolvers as an **array**, not an object:

```
[
  'node'            => WPGraphQL\Model\Post  (databaseId, data->ID, ...)
  'acf_field_group' => [ ... ACF field group config ... ]
]
```

Earlier versions checked `$source->databaseId` (object access on an array → `null`) or checked for `$source['ID']` (key doesn't exist in this shape → `null`), so `get_post_meta()` was called with `post_id = null` and returned empty strings/zeros.

**Fix (v7.0):** `$get_post_id` now checks `is_array($source)` first and reads `$source['node']->databaseId`.

### How the source shape was confirmed

Add a temporary `graphql_debug()` call inside the resolver:

```php
graphql_debug('KG source: ' . var_export($source, true));
```

Then run a GraphQL query with `?XDEBUG_SESSION=1` or check `extensions.debug` in the response JSON (WPGraphQL exposes debug messages there when `GRAPHQL_DEBUG` is enabled or the request includes the debug header).
