# Dicionário de dados

> **Gerado automaticamente** por `supabase/tools/build-dictionary.mjs` a partir das migrations em `supabase/migrations/`. Não edite à mão: altere a migration e rode `npm run docs` em `supabase/tools`.

- **49 tabelas**, 4 views, 10 funções, 140 políticas de RLS (todas as tabelas com RLS ligado).
- Colunas marcadas com **PK** são chave primária; **→ tabela** indica chave estrangeira.
- Para o mapa de telas, perfis e jornadas que usam estas tabelas, veja [Mapeamento_Telas_e_Dados.md](./Mapeamento_Telas_e_Dados.md).

**Views:** `v_inventory_alerts`, `v_product_listing`, `v_public_units`, `v_sales_daily`
**Funções:** `_release_order_stock`, `cancel_order`, `confirm_payment`, `create_order_from_cart`, `effective_price`, `expire_pending_orders`, `handle_new_user`, `has_any_role`, `is_staff`, `touch_updated_at`

## Usuários e acesso

### `profiles`  _(4 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não |  | PK → users |
| full_name | text | não |  |  |
| email | text | não |  |  |
| phone | text | sim |  |  |
| document_hint | text | sim |  |  |
| avatar_url | text | sim |  |  |
| is_active | boolean | não | `true` |  |
| created_at | timestamptz | não | `now()` |  |
| updated_at | timestamptz | não | `now()` |  |

### `user_roles`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| user_id | uuid | não |  | PK → profiles |
| role | app_role | não |  | PK |
| granted_by | uuid | sim |  | → profiles |
| granted_at | timestamptz | não | `now()` |  |

### `addresses`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| user_id | uuid | não |  | → profiles |
| label | text | não | `'Casa'::text` |  |
| recipient | text | não |  |  |
| phone | text | sim |  |  |
| cep | text | não |  |  |
| street | text | não |  |  |
| number | text | não |  |  |
| complement | text | sim |  |  |
| district | text | não |  |  |
| city | text | não |  |  |
| state | character | não |  |  |
| is_default | boolean | não | `false` |  |
| created_at | timestamptz | não | `now()` |  |

## Catálogo

### `categories`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| slug | text | não |  |  |
| name | text | não |  |  |
| position | integer | não | `0` |  |
| image_url | text | sim |  |  |
| seo_title | text | sim |  |  |
| seo_description | text | sim |  |  |
| is_active | boolean | não | `true` |  |

### `collections`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| slug | text | não |  |  |
| name | text | não |  |  |
| description | text | sim |  |  |
| status | publish_status | não | `'published'::publish_status` |  |
| position | integer | não | `0` |  |

### `collection_products`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| collection_id | uuid | não |  | PK → collections |
| product_id | uuid | não |  | PK → products |
| position | integer | não | `0` |  |

### `products`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| slug | text | não |  |  |
| sku | text | não |  |  |
| name | text | não |  |  |
| category_id | uuid | não |  | → categories |
| condition | product_condition | não | `'novo'::product_condition` |  |
| status | publish_status | não | `'draft'::publish_status` |  |
| brand | text | sim |  |  |
| tagline | text | sim |  |  |
| description | text | sim |  |  |
| badge | text | sim |  |  |
| warranty_months | integer | não | `12` |  |
| warranty_text | text | sim |  |  |
| highlights | jsonb | não | `'[]'::jsonb` |  |
| specs | jsonb | não | `'[]'::jsonb` |  |
| in_box | jsonb | não | `'[]'::jsonb` |  |
| faq | jsonb | não | `'[]'::jsonb` |  |
| seo_title | text | sim |  |  |
| seo_description | text | sim |  |  |
| sold_count | integer | não | `0` |  |
| rating | numeric(2,1) | sim |  |  |
| published_at | timestamptz | sim |  |  |
| created_at | timestamptz | não | `now()` |  |
| updated_at | timestamptz | não | `now()` |  |

### `product_media`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| product_id | uuid | não |  | → products |
| kind | text | não | `'image'::text` |  |
| url | text | não |  |  |
| alt | text | não | `''::text` |  |
| position | integer | não | `0` |  |
| crop | text | sim |  |  |

### `product_facets`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| product_id | uuid | não |  | PK → products |
| facet_key | text | não |  | PK |
| facet_value | text | não |  | PK |

### `product_options`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| product_id | uuid | não |  | → products |
| code | text | não |  |  |
| name | text | não |  |  |
| position | integer | não | `0` |  |

### `product_option_values`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| option_id | uuid | não |  | → product_options |
| label | text | não |  |  |
| position | integer | não | `0` |  |

### `product_variants`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| product_id | uuid | não |  | → products |
| sku | text | não |  |  |
| option_values | jsonb | não | `'{}'::jsonb` |  |
| price | numeric(12,2) | não |  |  |
| compare_at | numeric(12,2) | sim |  |  |
| max_installments | integer | não | `10` |  |
| weight_grams | integer | sim |  |  |
| width_mm | integer | sim |  |  |
| height_mm | integer | sim |  |  |
| length_mm | integer | sim |  |  |
| is_active | boolean | não | `true` |  |
| created_at | timestamptz | não | `now()` |  |
| updated_at | timestamptz | não | `now()` |  |

### `kits`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| base_product_id | uuid | não |  | → products |
| name | text | não |  |  |
| status | publish_status | não | `'draft'::publish_status` |  |

### `kit_components`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| kit_id | uuid | não |  | → kits |
| product_id | uuid | não |  | → products |
| slot | text | não |  |  |
| is_required | boolean | não | `false` |  |
| extra_price | numeric(12,2) | não | `0` |  |

## Estoque

### `stock_locations`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| code | text | não |  |  |
| name | text | não |  |  |
| is_pickup | boolean | não | `false` |  |

### `inventory_levels`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| variant_id | uuid | não |  | PK → product_variants |
| location_id | uuid | não |  | PK → stock_locations |
| on_hand | integer | não | `0` |  |
| reserved | integer | não | `0` |  |
| min_level | integer | não | `0` |  |
| updated_at | timestamptz | não | `now()` |  |

### `inventory_units`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| product_id | uuid | não |  | → products |
| variant_id | uuid | não |  | → product_variants |
| location_id | uuid | sim |  | → stock_locations |
| serial | text | sim |  |  |
| status | unit_status | não | `'disponivel'::unit_status` |  |
| grade | text | não |  |  |
| report | jsonb | não | `'{}'::jsonb` |  |
| photos | jsonb | não | `'[]'::jsonb` |  |
| warranty_days | integer | não | `90` |  |
| cost | numeric(12,2) | sim |  |  |
| acquired_at | timestamptz | sim |  |  |
| created_at | timestamptz | não | `now()` |  |
| updated_at | timestamptz | não | `now()` |  |

### `inventory_movements`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | bigint | não |  | PK |
| variant_id | uuid | sim |  | → product_variants |
| unit_id | uuid | sim |  | → inventory_units |
| location_id | uuid | sim |  | → stock_locations |
| type | movement_type | não |  |  |
| quantity | integer | não |  |  |
| reason | text | sim |  |  |
| order_id | uuid | sim |  | → orders |
| actor_id | uuid | sim |  | → profiles |
| created_at | timestamptz | não | `now()` |  |

## Carrinho, pedido, pagamento e envio

### `carts`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| user_id | uuid | sim |  | → profiles |
| status | text | não | `'open'::text` |  |
| created_at | timestamptz | não | `now()` |  |
| updated_at | timestamptz | não | `now()` |  |

### `cart_items`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| cart_id | uuid | não |  | → carts |
| variant_id | uuid | não |  | → product_variants |
| unit_id | uuid | sim |  | → inventory_units |
| quantity | integer | não | `1` |  |
| created_at | timestamptz | não | `now()` |  |

### `orders`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| number | text | não | `('DB-'::text \|\| nextval('order_number_seq'::re` |  |
| user_id | uuid | sim |  | → profiles |
| guest_email | text | sim |  |  |
| status | order_status | não | `'pending_payment'::order_status` |  |
| coupon_id | uuid | sim |  | → coupons |
| subtotal | numeric(12,2) | não |  |  |
| discount_total | numeric(12,2) | não | `0` |  |
| shipping_total | numeric(12,2) | não | `0` |  |
| total | numeric(12,2) | não |  |  |
| shipping_address | jsonb | não |  |  |
| shipping_method | text | não |  |  |
| shipping_eta_days | integer | sim |  |  |
| notes | text | sim |  |  |
| placed_at | timestamptz | não | `now()` |  |
| paid_at | timestamptz | sim |  |  |
| cancelled_at | timestamptz | sim |  |  |
| cancel_reason | text | sim |  |  |
| updated_at | timestamptz | não | `now()` |  |

### `order_items`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| order_id | uuid | não |  | → orders |
| product_id | uuid | sim |  | → products |
| variant_id | uuid | sim |  | → product_variants |
| unit_id | uuid | sim |  | → inventory_units |
| quantity | integer | não |  |  |
| unit_price | numeric(12,2) | não |  |  |
| snapshot | jsonb | não |  |  |

### `order_events`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | bigint | não |  | PK |
| order_id | uuid | não |  | → orders |
| type | text | não |  |  |
| from_status | text | sim |  |  |
| to_status | text | sim |  |  |
| message | text | sim |  |  |
| actor_id | uuid | sim |  | → profiles |
| created_at | timestamptz | não | `now()` |  |

### `payments`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| order_id | uuid | não |  | → orders |
| method | payment_method | não |  |  |
| status | payment_status | não | `'pending'::payment_status` |  |
| amount | numeric(12,2) | não |  |  |
| installments | integer | não | `1` |  |
| provider | text | sim |  |  |
| provider_ref | text | sim |  |  |
| pix_expires_at | timestamptz | sim |  |  |
| paid_at | timestamptz | sim |  |  |
| created_at | timestamptz | não | `now()` |  |
| updated_at | timestamptz | não | `now()` |  |

### `shipments`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| order_id | uuid | não |  | → orders |
| status | shipment_status | não | `'pending'::shipment_status` |  |
| carrier | text | sim |  |  |
| service | text | sim |  |  |
| tracking_code | text | sim |  |  |
| label_url | text | sim |  |  |
| shipped_at | timestamptz | sim |  |  |
| delivered_at | timestamptz | sim |  |  |
| events | jsonb | não | `'[]'::jsonb` |  |
| created_at | timestamptz | não | `now()` |  |

### `return_requests`  _(4 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| order_id | uuid | não |  | → orders |
| order_item_id | uuid | sim |  | → order_items |
| user_id | uuid | sim |  | → profiles |
| kind | text | não |  |  |
| status | return_status | não | `'requested'::return_status` |  |
| reason | text | não |  |  |
| resolution | text | sim |  |  |
| created_at | timestamptz | não | `now()` |  |
| updated_at | timestamptz | não | `now()` |  |

## Promoções e cupons

### `promotions`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| name | text | não |  |  |
| kind | discount_kind | não |  |  |
| value | numeric(12,2) | não |  |  |
| scope | text | não |  |  |
| collection_id | uuid | sim |  | → collections |
| category_id | uuid | sim |  | → categories |
| starts_at | timestamptz | não |  |  |
| ends_at | timestamptz | não |  |  |
| status | publish_status | não | `'draft'::publish_status` |  |
| show_countdown | boolean | não | `false` |  |

### `promotion_products`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| promotion_id | uuid | não |  | PK → promotions |
| product_id | uuid | não |  | PK → products |

### `coupons`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| code | text | não |  |  |
| kind | discount_kind | não |  |  |
| value | numeric(12,2) | não |  |  |
| min_subtotal | numeric(12,2) | não | `0` |  |
| max_uses | integer | sim |  |  |
| max_uses_per_user | integer | não | `1` |  |
| starts_at | timestamptz | sim |  |  |
| ends_at | timestamptz | sim |  |  |
| is_active | boolean | não | `true` |  |
| created_at | timestamptz | não | `now()` |  |

### `coupon_redemptions`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| coupon_id | uuid | não |  | → coupons |
| order_id | uuid | não |  | → orders |
| user_id | uuid | sim |  | → profiles |
| discount | numeric(12,2) | não |  |  |
| created_at | timestamptz | não | `now()` |  |

## Venda de usados

### `used_requests`  _(4 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| protocol | text | não | `('US-'::text \|\| lpad((nextval('used_protocol_s` |  |
| user_id | uuid | sim |  | → profiles |
| contact_name | text | não |  |  |
| contact_email | text | não |  |  |
| contact_phone | text | sim |  |  |
| item_description | text | não |  |  |
| category_id | uuid | sim |  | → categories |
| declared_condition | text | não |  |  |
| accessories | text | sim |  |  |
| status | used_status | não | `'new'::used_status` |  |
| assigned_to | uuid | sim |  | → profiles |
| terms_accepted_at | timestamptz | não |  |  |
| created_at | timestamptz | não | `now()` |  |
| updated_at | timestamptz | não | `now()` |  |

### `used_request_photos`  _(4 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| request_id | uuid | não |  | → used_requests |
| storage_path | text | não |  |  |
| uploaded_at | timestamptz | não | `now()` |  |

### `used_offers`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| request_id | uuid | não |  | → used_requests |
| amount | numeric(12,2) | não |  |  |
| kind | text | não | `'dinheiro'::text` |  |
| message | text | sim |  |  |
| decision | text | não | `'pending'::text` |  |
| created_by | uuid | sim |  | → profiles |
| created_at | timestamptz | não | `now()` |  |

### `used_request_events`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | bigint | não |  | PK |
| request_id | uuid | não |  | → used_requests |
| type | text | não |  |  |
| message | text | sim |  |  |
| actor_id | uuid | sim |  | → profiles |
| created_at | timestamptz | não | `now()` |  |

## Conteúdo da loja

### `banners`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| placement | banner_placement | não |  |  |
| title | text | não |  |  |
| eyebrow | text | sim |  |  |
| description | text | sim |  |  |
| cta_label | text | sim |  |  |
| href | text | sim |  |  |
| image_url | text | não |  |  |
| image_mobile_url | text | sim |  |  |
| position | integer | não | `0` |  |
| status | publish_status | não | `'draft'::publish_status` |  |
| starts_at | timestamptz | sim |  |  |
| ends_at | timestamptz | sim |  |  |

### `pages`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| slug | text | não |  |  |
| title | text | não |  |  |
| kind | text | não | `'institutional'::text` |  |
| body_md | text | não | `''::text` |  |
| status | publish_status | não | `'draft'::publish_status` |  |
| seo_title | text | sim |  |  |
| seo_description | text | sim |  |  |
| noindex | boolean | não | `false` |  |
| published_at | timestamptz | sim |  |  |
| updated_at | timestamptz | não | `now()` |  |

### `nav_items`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| menu | text | não |  |  |
| parent_id | uuid | sim |  | → nav_items |
| label | text | não |  |  |
| href | text | sim |  |  |
| position | integer | não | `0` |  |
| is_active | boolean | não | `true` |  |

### `redirects`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| from_path | text | não |  |  |
| to_path | text | não |  |  |
| status_code | integer | não | `301` |  |
| note | text | sim |  |  |

### `store_settings`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| key | text | não |  | PK |
| value | jsonb | não |  |  |
| is_public | boolean | não | `false` |  |
| updated_at | timestamptz | não | `now()` |  |

## Relacionamento, privacidade e suporte

### `consents`  _(4 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| user_id | uuid | sim |  | → profiles |
| email | text | sim |  |  |
| channel | consent_channel | não |  |  |
| purpose | consent_purpose | não |  |  |
| granted | boolean | não |  |  |
| source | text | não |  |  |
| ip_hash | text | sim |  |  |
| created_at | timestamptz | não | `now()` |  |

### `privacy_requests`  _(4 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| user_id | uuid | sim |  | → profiles |
| contact_email | text | não |  |  |
| type | privacy_request_type | não |  |  |
| status | privacy_request_status | não | `'received'::privacy_request_status` |  |
| details | text | sim |  |  |
| due_at | timestamptz | sim |  |  |
| created_at | timestamptz | não | `now()` |  |
| resolved_at | timestamptz | sim |  |  |

### `contact_messages`  _(3 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| name | text | não |  |  |
| email | text | não |  |  |
| phone | text | sim |  |  |
| subject | text | sim |  |  |
| message | text | não |  |  |
| handled | boolean | não | `false` |  |
| created_at | timestamptz | não | `now()` |  |

### `back_in_stock_alerts`  _(4 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| product_id | uuid | não |  | → products |
| variant_id | uuid | sim |  | → product_variants |
| user_id | uuid | sim |  | → profiles |
| email | text | sim |  |  |
| notified_at | timestamptz | sim |  |  |
| created_at | timestamptz | não | `now()` |  |

### `product_reviews`  _(4 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| product_id | uuid | não |  | → products |
| user_id | uuid | sim |  | → profiles |
| order_item_id | uuid | sim |  | → order_items |
| rating | integer | não |  |  |
| body | text | sim |  |  |
| source | text | não | `'compra_verificada'::text` |  |
| status | publish_status | não | `'draft'::publish_status` |  |
| created_at | timestamptz | não | `now()` |  |

## Operação, integrações e auditoria

### `integrations`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| domain | text | não |  |  |
| provider | text | sim |  |  |
| status | integration_status | não | `'not_configured'::integration_status` |  |
| owner_name | text | sim |  |  |
| last_checked_at | timestamptz | sim |  |  |
| notes | text | sim |  |  |

### `integration_events`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| domain | text | não |  |  |
| provider | text | não |  |  |
| external_id | text | não |  |  |
| event_type | text | não |  |  |
| payload | jsonb | não | `'{}'::jsonb` |  |
| status | text | não | `'received'::text` |  |
| attempts | integer | não | `0` |  |
| error | text | sim |  |  |
| received_at | timestamptz | não | `now()` |  |
| processed_at | timestamptz | sim |  |  |

### `admin_notifications`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | uuid | não | `gen_random_uuid()` | PK |
| kind | text | não |  |  |
| title | text | não |  |  |
| body | text | sim |  |  |
| ref_table | text | sim |  |  |
| ref_id | text | sim |  |  |
| is_read | boolean | não | `false` |  |
| created_at | timestamptz | não | `now()` |  |

### `audit_log`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | bigint | não |  | PK |
| actor_id | uuid | sim |  | → profiles |
| action | text | não |  |  |
| entity | text | não |  |  |
| entity_id | text | sim |  |  |
| changes | jsonb | sim |  |  |
| created_at | timestamptz | não | `now()` |  |

### `analytics_events`  _(2 políticas RLS)_

| Coluna | Tipo | Nulo | Padrão | Chave |
| --- | --- | :-: | --- | --- |
| id | bigint | não |  | PK |
| event | text | não |  |  |
| session_id | text | sim |  |  |
| user_id | uuid | sim |  |  |
| props | jsonb | não | `'{}'::jsonb` |  |
| created_at | timestamptz | não | `now()` |  |
