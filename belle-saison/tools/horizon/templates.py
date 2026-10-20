"""Modèles Belle Saison pour Horizon : accueil, fiche produit et page Favoris.

Chaque modèle reprend celui du thème Belle Saison (theme/templates) en remplaçant les sections
par leurs copies « bs-… ». Accueil : réglages faits par la cliente dans l'éditeur du thème
Belle Saison le 20 octobre 2026 (6 produits mis en avant, badge « Vérifié » décoché). Les
13 avis d'exemple restent cochés « Exemple » : visibles dans l'éditeur seulement, jamais
publiés comme de vrais avis.
Usage (depuis tools/) : npm run horizon:build
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'theme' / 'templates'
DST = ROOT / 'horizon' / 'templates'
PORTED = {'hero-video', 'engagements', 'collection-list', 'story', 'featured-collection', 'testimonials',
          'video-banner', 'inspiration', 'newsletter', 'main-product', 'product-recommendations', 'main-favorites'}

for name in ['index', 'product', 'page.favoris']:
    template = json.loads((SRC / f'{name}.json').read_text())
    for section in template['sections'].values():
        assert section['type'] in PORTED, f"{name}.json : section {section['type']} non portée"
        section['type'] = f"bs-{section['type']}"
    if name == 'index':
        template['sections']['featured']['settings']['products_to_show'] = 6
        for block in template['sections']['testimonials']['blocks'].values():
            if block['type'] == 'review':
                assert block['settings'].get('sample') is True, 'avis d’exemple non coché « Exemple »'
                block['settings']['verified'] = False
    (DST / f'{name}.json').write_text(json.dumps(template, ensure_ascii=False, indent=2) + '\n')
    print('modèle', f'{name}.json')
