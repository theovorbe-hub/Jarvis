"""En-tête et pied de page d'Horizon aux couleurs de Belle Saison (sections/*-group.json).

Part des fichiers tels qu'installés dans la boutique et y applique :
- en-tête : logo centré, menu « menu-horizon » en texte (Garamond, 18 px), sans sélecteur de pays
  ni de langue, filet sous l'en-tête ; bandeau d'annonces repris du thème Belle Saison (quatre
  engagements), masqué comme la cliente l'a fait dans le thème Belle Saison le 19 octobre 2026 ;
- pied de page : présentation Belle Saison à la place de l'inscription à la lettre d'information
  (déjà présente sur l'accueil), menus « Boutique » (menu-gauche) et « Aide » (menu-aide-horizon :
  Contact, Mes favoris, Rechercher ; l'en-tête d'Horizon n'a pas d'icône Favoris), liens vers les
  réseaux sociaux de démonstration retirés.
Usage (depuis tools/) : npm run horizon:build
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
SECTIONS = ROOT / 'horizon' / 'sections'
ANNOUNCEMENTS = ['Échantillon offert', 'Adaptation sur mesure incluse', 'Impression européenne haut de gamme',
                 'Livraison sous 5 à 7 jours']
MENU_BLOCK = {'menu_spacing': 12, 'show_as_accordion': False, 'accordion_icon': 'plus', 'accordion_dividers': False,
              'heading_preset': 'paragraph', 'link_preset': 'paragraph', 'padding-block-start': 0,
              'padding-block-end': 0, 'padding-inline-start': 0, 'padding-inline-end': 0}


def load(name):
    raw = (SECTIONS / name).read_text()
    end = raw.index('*/') + 2 if raw.lstrip().startswith('/*') else 0
    return raw[:end], json.loads(raw[end:])


def save(name, header, data):
    (SECTIONS / name).write_text(header + '\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print('groupe', name)


def of_type(section, kind):
    return next(key for key, value in section['sections'].items() if value['type'] == kind)


header, group = load('header-group.json')
bar = group['sections'][of_type(group, 'header-announcements')]
model = next(b for b in bar['blocks'].values() if b['type'] == '_announcement')['settings']
bar['blocks'] = {
    f'announcement_bs{i}': {'type': '_announcement', 'settings': {**model, 'text': text, 'font': 'var(--font-accent--family)',
                            'font_size': '0.75rem', 'letter_spacing': 'loose', 'case': 'uppercase'}, 'blocks': {}}
    for i, text in enumerate(ANNOUNCEMENTS, 1)
}
bar['block_order'] = list(bar['blocks'])
bar['settings']['divider_color'] = '{{ settings.color_palette.color3 }}'
bar['disabled'] = True
head = group['sections'][of_type(group, 'header')]
head['blocks']['header-menu']['settings'].update({
    'menu': 'menu-horizon', 'type_font_primary_size': '1.125rem', 'menu_font_style': 'regular',
    'type_font_primary_link': 'body', 'type_case_primary_link': 'none', 'menu_style': 'text',
})
head['settings'].update({
    'logo_position': 'center', 'menu_position': 'left', 'show_country': False, 'show_language': False,
    'divider_width': 1, 'divider_size': 'full-width', 'divider_color': '{{ settings.color_palette.color3 }}',
})
save('header-group.json', header, group)

header, group = load('footer-group.json')
footer = group['sections'][of_type(group, 'footer')]
blocks = footer['blocks']
for key in [k for k, b in blocks.items() if b['type'] == 'email-signup']:
    del blocks[key]
    footer['block_order'].remove(key)
intro = next(b for b in blocks.values() if b['type'] == 'group')
texts = [intro['blocks'][k] for k in intro['block_order'] if intro['blocks'][k]['type'] == 'text']
texts[0]['settings']['text'] = '<h2>Belle Saison</h2>'
texts[1]['settings']['text'] = '<p>Papiers peints d’exception, en rouleaux et en échantillons.</p>'
for key in [k for k, b in intro['blocks'].items() if b['type'] == 'email-signup']:
    del intro['blocks'][key]
    intro['block_order'].remove(key)
for key, menu, heading in [('menu_main', 'menu-gauche', 'Boutique'), ('menu_footer', 'menu-aide-horizon', 'Aide')]:
    blocks.setdefault(key, {'type': 'menu', 'settings': dict(MENU_BLOCK), 'blocks': {}})
    blocks[key]['settings'].update({'menu': menu, 'heading': heading})
footer['block_order'] = [k for k in footer['block_order'] if k not in ('menu_main', 'menu_footer')] + ['menu_main', 'menu_footer']
utilities = group['sections'][of_type(group, 'footer-utilities')]
utilities['settings']['divider_color'] = '{{ settings.color_palette.color3 }}'
for block in utilities['blocks'].values():
    if block['type'] == 'social-links':
        for key in block['settings']:
            if key.endswith('_url'):
                block['settings'][key] = ''
save('footer-group.json', header, group)
