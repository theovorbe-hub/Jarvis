"""Ajoute les textes Belle Saison (theme/locales/fr.default.json) sous la clé « bs » de chaque
fichier de langue d'Horizon (horizon/locales/*.json, hors *.schema.json).

Les fichiers d'Horizon contiennent des commentaires : le bloc est inséré tel quel avant la
dernière accolade, et remplacé s'il existe déjà (relancer le script après avoir modifié nos textes).
Les textes restent en français dans toutes les langues : la boutique est vendue en français.
Usage (depuis tools/) : npm run horizon:build, ou python3 horizon/locales.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = json.loads((ROOT / 'theme' / 'locales' / 'fr.default.json').read_text())
MARKER = ',\n  "bs": {'
block = json.dumps(SOURCE, ensure_ascii=False, indent=2).replace('\n', '\n  ')

for path in sorted((ROOT / 'horizon' / 'locales').glob('*.json')):
    if path.name.endswith('.schema.json'):
        continue
    text = path.read_text()
    if MARKER in text:
        text = text[: text.index(MARKER)] + '\n}\n'
    body = text.rstrip()
    assert body.endswith('}'), path
    path.write_text(body[:-1].rstrip() + MARKER[:-1] + block + '\n}\n')
    print(path.name)
