"""Pages natives d'Horizon aux couleurs de Belle Saison (horizon/templates).

Les modèles d'Horizon que Belle Saison ne remplace pas gardent la version de la boutique,
enregistrée dans horizon/templates (récupérer la version de la boutique avant de les modifier :
l'éditeur du thème les change). Ce script y pose les textes en français, à la place des textes
anglais d'origine, et guide le client vers les papiers peints :
- panier : titre « Votre panier », suggestions tirées de « Tous nos papiers peints » (au lieu de
  tout le catalogue, échantillons compris) ;
- page introuvable : textes en français, bouton et suggestions vers « Tous nos papiers peints » ;
- contact : bouton « Envoyer » ;
- liste des collections (/collections) : les collections choisies, dans l'ordre du menu, au lieu
  de toutes les collections publiées (dont « Page d'accueil », vide).
Usage (depuis tools/) : npm run horizon:build
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
TEMPLATES = ROOT / 'horizon' / 'templates'
ALL_WALLPAPERS = 'tous-nos-papiers-peints'
COLLECTIONS = [ALL_WALLPAPERS, 'fleurs-et-feuillages', 'les-rayures', 'vichy-et-carreaux', 'la-collection-enfant',
               'les-essentiels', 'les-motifs', 'les-echantillons']


def load(name):
    raw = (TEMPLATES / name).read_text()
    end = raw.index('*/') + 2 if raw.lstrip().startswith('/*') else 0
    return raw[:end], json.loads(raw[end:])


def save(name, header, data):
    (TEMPLATES / name).write_text(header + '\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print('modèle', name)


def of_type(template, kind):
    return next(section for section in template['sections'].values() if section['type'] == kind)


def product_list(template, heading, button=None):
    section = of_type(template, 'product-list')
    section['settings']['collection'] = ALL_WALLPAPERS
    for block in section['blocks']['static-header']['blocks'].values():
        if block['type'] in ('_product-list-text', 'text'):
            tag = 'h3' if block['settings']['text'].startswith('<h3>') else 'p'
            block['settings']['text'] = f'<{tag}>{heading}</{tag}>'
        elif block['type'] == '_product-list-button':
            block['settings']['label'] = button


header, cart = load('cart.json')
of_type(cart, 'main-cart')['blocks']['cart-page-title']['settings']['title'] = 'Votre panier'
product_list(cart, 'Vous aimerez aussi', 'Tout voir')
save('cart.json', header, cart)

header, page = load('404.json')
blocks = of_type(page, 'main-404')['blocks']
texts = [block for block in blocks.values() if block['type'] == 'text']
texts[0]['settings']['text'] = '<h1>Page introuvable</h1>'
texts[1]['settings']['text'] = '<p>Cette adresse ne correspond à aucune page. Nos papiers peints vous attendent.</p>'
button = next(block for block in blocks.values() if block['type'] == 'button')['settings']
button.update({'label': 'Voir nos papiers peints', 'link': f'shopify://collections/{ALL_WALLPAPERS}'})
product_list(page, 'Nos papiers peints')
save('404.json', header, page)

header, contact = load('page.contact.json')
form = next(block for block in contact['sections']['form']['blocks'].values() if block['type'] == 'contact-form')
form['blocks']['submit-button']['settings']['label'] = 'Envoyer'
save('page.contact.json', header, contact)

header, listing = load('list-collections.json')
section = next(iter(listing['sections'].values()))
section['type'] = 'collection-list'
section['settings'].update({'collection_list': COLLECTIONS, 'columns': 4, 'mobile_columns': '2'})
heading = next(block for block in section['blocks'].values() if block['type'] == 'group')
next(iter(heading['blocks'].values()))['settings']['text'] = '<h1>Nos collections</h1>'
save('list-collections.json', header, listing)
