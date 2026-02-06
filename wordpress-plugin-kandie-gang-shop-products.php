<?php
/**
 * Plugin Name: Kandie Gang Shop Products
 * Description: 10 Variant Slots + Universal GraphQL Resolver with Stripe Integration (v4.0)
 * Version: 4.0
 */

if (!defined('ABSPATH')) exit;

/*
|--------------------------------------------------------------------------
| 1. Post Type Registration
|--------------------------------------------------------------------------
*/
add_action('init', function() {

    register_post_type('shop_product', array(
        'labels' => array(
            'name' => 'Shop Products',
            'singular_name' => 'Product'
        ),
        'public' => true,
        'show_in_rest' => true,
        'show_in_graphql' => true,
        'graphql_single_name' => 'shopProduct',
        'graphql_plural_name' => 'shopProducts',
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'menu_icon' => 'dashicons-cart',
    ));

});


/*
|--------------------------------------------------------------------------
| 2. ACF Fields
|--------------------------------------------------------------------------
*/
add_action('acf/init', function() {

    $fields = array(

        array(
            'key' => 'field_has_variants',
            'label' => 'Has Variants?',
            'name' => 'has_variants',
            'type' => 'true_false',
            'ui' => 1,
            'show_in_graphql' => true
        ),

        array(
            'key' => 'field_price_pub',
            'label' => 'Price',
            'name' => 'price_public',
            'type' => 'number',
            'show_in_graphql' => true
        ),

        array(
            'key' => 'field_price_mem',
            'label' => 'Member Price',
            'name' => 'price_member',
            'type' => 'number',
            'show_in_graphql' => true
        ),

        array(
            'key' => 'field_stripe_price_id_public',
            'label' => 'Stripe Price ID (Public)',
            'name' => 'stripe_price_id_public',
            'type' => 'text',
            'instructions' => 'Stripe Price ID for non-member purchases (e.g., price_xxxxx)',
            'show_in_graphql' => true
        ),

        array(
            'key' => 'field_stripe_price_id_member',
            'label' => 'Stripe Price ID (Member)',
            'name' => 'stripe_price_id_member',
            'type' => 'text',
            'instructions' => 'Stripe Price ID for member purchases (e.g., price_xxxxx)',
            'show_in_graphql' => true
        ),

        array(
            'key' => 'field_members_only',
            'label' => 'Members Only?',
            'name' => 'members_only',
            'type' => 'true_false',
            'ui' => 1,
            'instructions' => 'Check if this product is only available to members',
            'show_in_graphql' => true
        ),

        array(
            'key' => 'field_sku',
            'label' => 'SKU',
            'name' => 'sku',
            'type' => 'text',
            'show_in_graphql' => true
        ),

        array(
            'key' => 'field_inventory',
            'label' => 'Inventory',
            'name' => 'inventory',
            'type' => 'number',
            'show_in_graphql' => true
        ),
    );

    // Add 10 variant slots
    for ($i = 1; $i <= 10; $i++) {

        $fields[] = array(
            'key' => "f_v{$i}_lab",
            'label' => "V{$i} Label",
            'name' => "variant_{$i}_label",
            'type' => 'text',
            'show_in_graphql' => true
        );

        $fields[] = array(
            'key' => "f_v{$i}_pri",
            'label' => "V{$i} Price",
            'name' => "variant_{$i}_price_public",
            'type' => 'number',
            'show_in_graphql' => true
        );

        $fields[] = array(
            'key' => "f_v{$i}_pri_mem",
            'label' => "V{$i} Member Price",
            'name' => "variant_{$i}_price_member",
            'type' => 'number',
            'show_in_graphql' => true
        );

        $fields[] = array(
            'key' => "f_v{$i}_stripe_pub",
            'label' => "V{$i} Stripe Price ID (Public)",
            'name' => "variant_{$i}_stripe_price_id_public",
            'type' => 'text',
            'instructions' => 'Stripe Price ID for this variant (public)',
            'show_in_graphql' => true
        );

        $fields[] = array(
            'key' => "f_v{$i}_stripe_mem",
            'label' => "V{$i} Stripe Price ID (Member)",
            'name' => "variant_{$i}_stripe_price_id_member",
            'type' => 'text',
            'instructions' => 'Stripe Price ID for this variant (member)',
            'show_in_graphql' => true
        );

        $fields[] = array(
            'key' => "f_v{$i}_sku",
            'label' => "V{$i} SKU",
            'name' => "variant_{$i}_sku",
            'type' => 'text',
            'show_in_graphql' => true
        );

        $fields[] = array(
            'key' => "f_v{$i}_inv",
            'label' => "V{$i} Inventory",
            'name' => "variant_{$i}_inventory",
            'type' => 'number',
            'show_in_graphql' => true
        );
    }

    acf_add_local_field_group(array(
        'key' => 'group_shop_product_fields',
        'title' => 'Product Details',
        'fields' => $fields,
        'location' => array(
            array(
                array(
                    'param' => 'post_type',
                    'operator' => '==',
                    'value' => 'shop_product'
                )
            )
        ),
        'show_in_graphql' => true,
        'graphql_field_name' => 'productFields',
    ));
});


/*
|--------------------------------------------------------------------------
| 3. GraphQL Types + Resolvers
|--------------------------------------------------------------------------
*/
add_action('graphql_register_types', function() {

    // Define variant object type with all fields
    register_graphql_object_type('ShopProductVariant', array(
        'description' => 'Product variant with pricing and Stripe integration',
        'fields' => array(
            'label' => array(
                'type' => 'String',
                'description' => 'Variant label (e.g., "Black", "Gradient")'
            ),
            'pricePublic' => array(
                'type' => 'Float',
                'description' => 'Public price for this variant'
            ),
            'priceMember' => array(
                'type' => 'Float',
                'description' => 'Member price for this variant (optional)'
            ),
            'stripePriceIdPublic' => array(
                'type' => 'String',
                'description' => 'Stripe Price ID for public purchases'
            ),
            'stripePriceIdMember' => array(
                'type' => 'String',
                'description' => 'Stripe Price ID for member purchases (optional)'
            ),
            'sku' => array(
                'type' => 'String',
                'description' => 'SKU for this variant'
            ),
            'inventory' => array(
                'type' => 'Int',
                'description' => 'Inventory count for this variant'
            ),
        ),
    ));

    // Possible ACF GraphQL type names (depends on WPGraphQL for ACF version)
    $possible_types = array(
        'ProductFields',
        'ShopProduct_Productfields',
        'ShopProduct_ProductFields'
    );

    foreach ($possible_types as $type_name) {

        /*
        |--------------------------------------------------------------------------
        | variants resolver
        |--------------------------------------------------------------------------
        */
        register_graphql_field($type_name, 'variants', array(
            'type' => array('list_of' => 'ShopProductVariant'),
            'description' => 'Array of product variants',
            'resolve' => function($source) {

                $post_id = null;

                if (is_object($source) && isset($source->ID)) {
                    $post_id = $source->ID;
                } elseif (is_object($source) && isset($source->databaseId)) {
                    $post_id = $source->databaseId;
                } elseif (is_array($source) && isset($source['post_id'])) {
                    $post_id = $source['post_id'];
                } elseif (is_array($source) && isset($source['ID'])) {
                    $post_id = $source['ID'];
                }

                if (!$post_id) return null;

                $variants = array();

                for ($i = 1; $i <= 10; $i++) {

                    $label = get_post_meta($post_id, "variant_{$i}_label", true);

                    if ($label) {
                        $price_public = get_post_meta($post_id, "variant_{$i}_price_public", true);
                        $price_member = get_post_meta($post_id, "variant_{$i}_price_member", true);
                        $stripe_public = get_post_meta($post_id, "variant_{$i}_stripe_price_id_public", true);
                        $stripe_member = get_post_meta($post_id, "variant_{$i}_stripe_price_id_member", true);
                        $sku = get_post_meta($post_id, "variant_{$i}_sku", true);
                        $inventory = get_post_meta($post_id, "variant_{$i}_inventory", true);

                        $variants[] = array(
                            'label' => $label,
                            'pricePublic' => $price_public ? (float) $price_public : 0.0,
                            'priceMember' => $price_member ? (float) $price_member : null,
                            'stripePriceIdPublic' => $stripe_public ?: '',
                            'stripePriceIdMember' => $stripe_member ?: null,
                            'sku' => $sku ?: null,
                            'inventory' => $inventory ? (int) $inventory : 0,
                        );
                    }
                }

                return !empty($variants) ? $variants : null;
            }
        ));

        /*
        |--------------------------------------------------------------------------
        | inStock computed field
        |--------------------------------------------------------------------------
        */
        register_graphql_field($type_name, 'inStock', array(
            'type' => 'Boolean',
            'description' => 'Whether the product is in stock',
            'resolve' => function($source) {
                $post_id = null;

                if (is_object($source) && isset($source->ID)) {
                    $post_id = $source->ID;
                } elseif (is_object($source) && isset($source->databaseId)) {
                    $post_id = $source->databaseId;
                } elseif (is_array($source) && isset($source['post_id'])) {
                    $post_id = $source['post_id'];
                } elseif (is_array($source) && isset($source['ID'])) {
                    $post_id = $source['ID'];
                }

                if (!$post_id) {
                    return false;
                }

                // Check if product has variants
                $has_variants = get_post_meta($post_id, 'has_variants', true);
                
                if ($has_variants) {
                    // For products with variants, check if ANY variant has inventory > 0
                    for ($i = 1; $i <= 10; $i++) {
                        $label = get_post_meta($post_id, "variant_{$i}_label", true);
                        if ($label) {
                            $inventory = (int) get_post_meta($post_id, "variant_{$i}_inventory", true);
                            if ($inventory > 0) {
                                return true; // At least one variant is in stock
                            }
                        }
                    }
                    return false; // No variants or all variants out of stock
                } else {
                    // For simple products, check product-level inventory
                    $inventory = (int) get_post_meta($post_id, 'inventory', true);
                    return $inventory > 0;
                }
            }
        )
        );

    } // End foreach

});
