"""Raccords Belle Saison dans les fichiers d'Horizon (belle-saison/horizon).

À relancer après une mise à jour d'Horizon. Chaque raccord est repéré par « Belle Saison » et
n'est appliqué qu'une fois ; si le texte d'Horizon attendu a changé, le script s'arrête.
- layout/theme.liquid : {% render 'bs-head' %} (polices, couleurs, bs-base.css, bs-theme.js) ;
- config/settings_schema.json : groupe de réglages « Belle Saison » (settings-belle-saison.json) ;
- snippets/price.liquid : sur les cartes produit, prix de base hors échantillon, avec son unité
  (« À partir de 39,00 € / m² », « 89,00 € le rouleau »), comme sur les cartes Belle Saison ;
- snippets/cart-products.liquid : quantité non modifiable pour une ligne au m², dont la surface
  est calculée depuis les dimensions du mur (panier et tiroir du panier).
Usage (depuis tools/) : npm run horizon:build
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
HORIZON = ROOT / 'horizon'
MARK = 'Belle Saison'


def patch(name, anchor, replacement, marker):
    path = HORIZON / name
    text = path.read_text()
    if marker in text:
        return
    assert text.count(anchor) == 1, f'{name} : texte d’Horizon introuvable ou en double :\n{anchor}'
    path.write_text(text.replace(anchor, replacement))
    print('raccord', name)


patch(
    'layout/theme.liquid',
    "    {%- render 'color-palette' -%}\n",
    "    {%- render 'color-palette' -%}\n    {%- render 'bs-head' -%}\n",
    "render 'bs-head'",
)

group = (pathlib.Path(__file__).parent / 'settings-belle-saison.json').read_text().strip()
schema = HORIZON / 'config' / 'settings_schema.json'
text = schema.read_text()
if f'"name": "{MARK}"' not in text:
    body = text.rstrip()
    assert body.endswith(']')
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
    if bs_parts[0] == 'm2'
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
