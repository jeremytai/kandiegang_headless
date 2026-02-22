<?php
/**
 * Plugin Name: Kandie Gang Shop Products
 * Description: Shop Products CPT with 10 Variants + WPGraphQL + Stripe Support + Featured Images
 * Version: 6.3
 */

if (!defined('ABSPATH')) exit;

/*
|--------------------------------------------------------------------------
| 0. Enable Featured Images for WPGraphQL
|--------------------------------------------------------------------------
*/
add_action('after_setup_theme', function() {
    add_theme_support('post-thumbnails');
});


/*
|--------------------------------------------------------------------------
| 1. Register Post Type
|--------------------------------------------------------------------------
*/
add_action('init', function () {

    register_post_type('shop_product', [
        'labels' => [
            'name' => 'Kandie Gang Shop Products',
            'singular_name' => 'Product'
        ],
        'public' => true,
        'has_archive' => true,
        'rewrite' => ['slug' => 'shop'],
        'menu_icon' => 'dashicons-cart',
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail'],

        // REST + GraphQL
        'show_in_rest' => true,
        'show_in_graphql' => true,
        'graphql_single_name' => 'shopProduct',
        'graphql_plural_name' => 'shopProducts',
    ]);
});


/*
|--------------------------------------------------------------------------
| 2. ACF Fields
|--------------------------------------------------------------------------
*/
add_action('acf/init', function () {

    if (!function_exists('acf_add_local_field_group')) return;

    $fields = [
        [
            'key' => 'field_image_url',
            'label' => 'Image URL (fallback if no Featured Image)',
            'name' => 'image_url',
            'type' => 'text',
            'show_in_graphql' => true
        ],
        [
            'key' => 'field_inventory',
            'label' => 'Inventory',
            'name' => 'inventory',
            'type' => 'number',
            'show_in_graphql' => true
        ],
        [
            'key' => 'field_sku',
            'label' => 'SKU',
            'name' => 'sku',
            'type' => 'text',
            'show_in_graphql' => true
        ],
        [
            'key' => 'field_members_only',
            'label' => 'Members Only?',
            'name' => 'members_only',
            'type' => 'true_false',
            'ui' => 1,
            'show_in_graphql' => true
        ],
    ];

    // 10 Variant Slots
    for ($i = 1; $i <= 10; $i++) {

        $fields[] = [
            'key' => "f_v{$i}_lab",
            'label' => "V{$i} Label",
            'name' => "variant{$i}Label",
            'type' => 'text',
            'show_in_graphql' => true
        ];

        $fields[] = [
            'key' => "f_v{$i}_pri",
            'label' => "V{$i} Public Price",
            'name' => "variant{$i}PricePublic",
            'type' => 'number',
            'show_in_graphql' => true
        ];

        $fields[] = [
            'key' => "f_v{$i}_pri_mem",
            'label' => "V{$i} Member Price",
            'name' => "variant{$i}PriceMember",
            'type' => 'number',
            'show_in_graphql' => true
        ];

        $fields[] = [
            'key' => "f_v{$i}_stripe_pub",
            'label' => "V{$i} Stripe Public Price ID",
            'name' => "variant{$i}StripePriceIdPublic",
            'type' => 'text',
            'show_in_graphql' => true
        ];

        $fields[] = [
            'key' => "f_v{$i}_stripe_mem",
            'label' => "V{$i} Stripe Member Price ID",
            'name' => "variant{$i}StripePriceIdMember",
            'type' => 'text',
            'show_in_graphql' => true
        ];

        $fields[] = [
            'key' => "f_v{$i}_sku",
            'label' => "V{$i} SKU",
            'name' => "variant{$i}Sku",
            'type' => 'text',
            'show_in_graphql' => true
        ];

        $fields[] = [
            'key' => "f_v{$i}_inv",
            'label' => "V{$i} Inventory",
            'name' => "variant{$i}Inventory",
            'type' => 'number',
            'show_in_graphql' => true
        ];
    }

    acf_add_local_field_group([
        'key' => 'group_shop_product_fields',
        'title' => 'Product Details',
        'fields' => $fields,
        'location' => [
            [
                [
                    'param' => 'post_type',
                    'operator' => '==',
                    'value' => 'shop_product'
                ]
            ]
        ],
        'show_in_graphql' => true,
        'graphql_field_name' => 'productFields',
    ]);
});


/*
|--------------------------------------------------------------------------
| 3. GraphQL Variant Object + Resolvers
|--------------------------------------------------------------------------
*/
add_action('graphql_register_types', function () {

    if (!function_exists('register_graphql_object_type')) return;

    register_graphql_object_type('ShopProductVariant', [
        'description' => 'Product variant',
        'fields' => [
            'label' => ['type' => 'String'],
            'pricePublic' => ['type' => 'Float'],
            'priceMember' => ['type' => 'Float'],
            'stripePriceIdPublic' => ['type' => 'String'],
            'stripePriceIdMember' => ['type' => 'String'],
            'sku' => ['type' => 'String'],
            'inventory' => ['type' => 'Int'],
        ],
    ]);

    $acf_type = 'ProductFields';

    register_graphql_field($acf_type, 'variants', [
        'type' => ['list_of' => 'ShopProductVariant'],
        'resolve' => function ($source) {

            $post_id = $source->databaseId ?? $source->ID ?? null;

            if (!$post_id) return null;

            $variants = [];

            for ($i = 1; $i <= 10; $i++) {

                $label = get_post_meta($post_id, "variant{$i}Label", true);

                if ($label) {
                    $variants[] = [
                        'label' => $label,
                        'pricePublic' => (float) get_post_meta($post_id, "variant{$i}PricePublic", true),
                        'priceMember' => get_post_meta($post_id, "variant{$i}PriceMember", true) !== ''
                            ? (float) get_post_meta($post_id, "variant{$i}PriceMember", true)
                            : null,
                        'stripePriceIdPublic' => get_post_meta($post_id, "variant{$i}StripePriceIdPublic", true),
                        'stripePriceIdMember' => get_post_meta($post_id, "variant{$i}StripePriceIdMember", true),
                        'sku' => get_post_meta($post_id, "variant{$i}Sku", true),
                        'inventory' => (int) get_post_meta($post_id, "variant{$i}Inventory", true),
                    ];
                }
            }

            return !empty($variants) ? $variants : null;
        }
    ]);

    register_graphql_field($acf_type, 'inStock', [
        'type' => 'Boolean',
        'resolve' => function ($source) {
            $post_id = $source->databaseId ?? $source->ID ?? null;
            if (!$post_id) return false;
            return (int) get_post_meta($post_id, 'inventory', true) > 0;
        }
    ]);
});