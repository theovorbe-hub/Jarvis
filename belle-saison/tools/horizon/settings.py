"""Réglages généraux d'Horizon aux couleurs de Belle Saison (config/settings_data.json).
Usage (depuis tools/) : python3 horizon/settings.py
"""
import json, pathlib

P = pathlib.Path(__file__).resolve().parents[2] / 'horizon' / 'config' / 'settings_data.json'
raw = P.read_text()
header, body = (raw[: raw.index('*/') + 2] + '\n', raw[raw.index('*/') + 2 :]) if raw.lstrip().startswith('/*') else ('', raw)
data = json.loads(body)
cur = data['current']
cur.update({
    # Typographie : Garamond pour les titres et le texte, Geist (petites capitales) pour boutons et surtitres
    'type_body_font': 'garamond_n4',
    'type_subheading_font': 'geist_n5',
    'type_heading_font': 'garamond_n4',
    'type_accent_font': 'geist_n5',
    'type_size_paragraph': '18',
    'type_line_height_paragraph': 'body-normal',
    'type_case_h5': 'uppercase',
    'type_case_h6': 'uppercase',
    'page_width': 'normal',
    # Palette : crème, texte presque noir, vert forêt, surface lin, bordure, texte discret
    'color_palette': {
        'background': '#F9F5F0',
        'foreground': '#1E211C',
        'color1': '#2D3829',
        'color2': '#F2ECE3',
        'color3': '#E2DBD1',
        'color4': '#6B655C',
    },
    'palette_primary_button_background': '{{ settings.color_palette.color1 }}',
    'palette_primary_button_text': '{{ settings.color_palette.background }}',
    'palette_primary_button_border': '{{ settings.color_palette.color1 }}',
    'palette_secondary_button_background': '{{ settings.color_palette.background }}',
    'palette_secondary_button_text': '{{ settings.color_palette.color1 }}',
    'palette_secondary_button_border': '{{ settings.color_palette.color1 }}',
    # Bordures (tiroirs, champs, fenêtres, variantes) : couleur 3, la couleur 2 étant le fond lin
    'drawer_border_color': '{{ settings.color_palette.color3 }}',
    'palette_input_border': '{{ settings.color_palette.color3 }}',
    'popover_border_color': '{{ settings.color_palette.color3 }}',
    'palette_variant_border': '{{ settings.color_palette.color3 }}',
    'palette_selected_variant_background': '{{ settings.color_palette.color1 }}',
    'palette_selected_variant_border': '{{ settings.color_palette.color1 }}',
    # Boutons en petites capitales, coins presque droits partout
    'type_font_button_primary': 'accent',
    'type_font_button_secondary': 'accent',
    'button_text_case_primary': 'uppercase',
    'button_text_case_secondary': 'uppercase',
    'badge_text_transform': 'uppercase',
    'button_border_radius_primary': 2,
    'button_border_radius_secondary': 2,
    'inputs_border_radius': 2,
    'popover_border_radius': 2,
    'badge_corner_radius': 2,
    'card_corner_radius': 2,
    'product_corner_radius': 0,
    'variant_button_radius': 2,
    'variant_swatch_radius': 2,
    'pills_border_radius': 2,
    # Belle Saison : vente au m², favoris
    # Catalogue actuel vendu au rouleau (chaque produit a aussi son métachamp papier_peint.mode_vente)
    'default_sale_mode': 'rouleau',
    'sample_option_label': 'Échantillon',
    'show_price_per_m2': True,
    'wishlist_enabled': True,
    'wishlist_page': 'favoris',
})
P.write_text(header + json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print('settings_data.json : réglages Belle Saison appliqués')
