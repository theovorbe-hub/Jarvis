"""Raccords Belle Saison dans les fichiers d'Horizon (belle-saison/horizon).

À relancer après une mise à jour d'Horizon. Chaque fichier repart de sa version d'origine
(commit HORIZON_BASE du dépôt) avant d'être raccordé : relancer le script applique les raccords
à jour. Si le texte d'Horizon attendu a changé, le script s'arrête.
- layout/theme.liquid : {% render 'bs-head' %} (polices, couleurs, bs-base.css, bs-theme.js) ;
- config/settings_schema.json : groupe de réglages « Belle Saison » (settings-belle-saison.json) ;
- snippets/price.liquid : sur les cartes produit, prix de base hors échantillon, avec son unité
  (« À partir de 39,00 € / m² », « 89,00 € le rouleau »), comme sur les cartes Belle Saison ;
- snippets/cart-products.liquid : quantité non modifiable pour une ligne au m², dont la surface
  est calculée depuis les dimensions du mur (panier et tiroir du panier).
- snippets/cart-summary.liquid : progression vers la livraison offerte en France (« Plus que
  12,30 € pour la livraison offerte en France »), au-dessus du total, dans le tiroir et la page
  du panier (réglages « Belle Saison » > Panier).
Usage (depuis tools/) : npm run horizon:build
"""
import json, pathlib, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
HORIZON = ROOT / 'horizon'
MARK = 'Belle Saison'
# Commit du dépôt qui contient Horizon d'origine (« Horizon 4.3.0 d'origine »).
HORIZON_BASE = 'f8d6a82'


def original(name):
    return subprocess.run(['git', 'show', f'{HORIZON_BASE}:belle-saison/horizon/{name}'], cwd=ROOT,
                          check=True, capture_output=True, text=True).stdout


def patch(name, anchor, replacement, marker):
    text = original(name)
    assert text.count(anchor) == 1, f'{name} : texte d’Horizon introuvable ou en double :\n{anchor}'
    (HORIZON / name).write_text(text.replace(anchor, replacement))
    print('raccord', name)


patch(
    'layout/theme.liquid',
    "    {%- render 'color-palette' -%}\n",
    "    {%- render 'color-palette' -%}\n    {%- render 'bs-head' -%}\n",
    "render 'bs-head'",
)

group = (pathlib.Path(__file__).parent / 'settings-belle-saison.json').read_text().strip()
schema = HORIZON / 'config' / 'settings_schema.json'
body = original('config/settings_schema.json').rstrip()
assert body.endswith(']') and f'"name": "{MARK}"' not in body
schema.write_text(body[:-1].rstrip() + ',\n  ' + group.replace('\n', '\n  ') + '\n]\n')
json.loads(schema.read_text())
print('raccord', 'config/settings_schema.json')

patch(
    'snippets/price.liquid',
    '<div ref="priceContainer">\n  {% if has_volume_pricing %}',
    """{%- liquid
  # Belle Saison : sur une carte produit, prix de base hors échantillon avec son unité (m² ou rouleau)
  assign bs_price_html = blank
  if is_product_card and product_resource != blank
    capture bs_pricing
      render 'bs-product-pricing', product: product_resource
    endcapture
    assign bs_parts = bs_pricing | strip | split: '|'
    assign bs_price = bs_parts[1] | plus: 0
    if use_currency
      assign bs_money = bs_price | money_with_currency
    else
      assign bs_money = bs_price | money
    endif
    if bs_parts[0] == 'echantillon'
      assign bs_price_html = bs_money
    elsif bs_parts[0] == 'm2'
      assign bs_price_html = 'bs.products.product.from_per_m2_html' | t: price: bs_money
    elsif product_resource.price_varies
      assign bs_price_html = 'bs.products.product.from_per_roll_html' | t: price: bs_money
    else
      assign bs_price_html = 'bs.products.product.per_roll_html' | t: price: bs_money
    endif
  endif
-%}

<div ref="priceContainer">
  {% if bs_price_html != blank %}
    <span class="price"><bdi>{{ bs_price_html }}</bdi></span>
  {% elsif has_volume_pricing %}""",
    MARK,
)

patch(
    'snippets/cart-products.liquid',
    """                  {% assign can_update_quantity = item.instructions.can_update_quantity
                    | default: true, allow_false: true
                  %}
""",
    """                  {% assign can_update_quantity = item.instructions.can_update_quantity
                    | default: true, allow_false: true
                  %}
                  {%- liquid
                    # Belle Saison : ligne au m² (surface calculée depuis les dimensions du mur), quantité non modifiable
                    assign bs_area_key = 'bs.products.configurator.property_area' | t
                    if item.properties[bs_area_key] != blank
                      assign can_update_quantity = false
                    endif
                  -%}
""",
    MARK,
)

patch(
    'snippets/cart-summary.liquid',
    """{% render 'cart-typography-styles' %}

<div class="cart-totals">""",
    """{% render 'cart-typography-styles' %}

{%- liquid
  # Belle Saison : progression vers la livraison offerte (tarif d'expédition gratuit dès le seuil, en France)
  assign bs_threshold = settings.free_shipping_threshold | times: 100 | round
  assign bs_free_shipping = false
  if settings.free_shipping_bar and bs_threshold > 0 and cart.item_count > 0 and localization.country.iso_code == 'FR'
    assign bs_free_shipping = true
    assign bs_remaining = bs_threshold | minus: cart.total_price
    assign bs_remaining_money = bs_remaining | money
    assign bs_progress = cart.total_price | times: 100 | divided_by: bs_threshold | at_most: 100
  endif
-%}
{%- if bs_free_shipping -%}
  <div class="bs-free-shipping">
    <p class="bs-free-shipping__text">
      {%- if bs_remaining > 0 -%}
        {{ 'bs.cart.free_shipping_remaining_html' | t: amount: bs_remaining_money }}
      {%- else -%}
        {{ 'bs.cart.free_shipping_reached' | t }}
      {%- endif -%}
    </p>
    <div class="bs-free-shipping__bar" aria-hidden="true">
      <span style="width: {{ bs_progress }}%"></span>
    </div>
  </div>
{%- endif -%}

<div class="cart-totals">""",
    MARK,
)
