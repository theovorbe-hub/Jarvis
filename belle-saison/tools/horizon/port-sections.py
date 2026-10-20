"""Copie les sections et snippets Belle Saison dans Horizon (belle-saison/horizon).

Chaque fichier est renommé avec le préfixe « bs- » pour ne jamais écraser un fichier Horizon :
- les appels {% render 'x' %} vers nos snippets deviennent {% render 'bs-x' %} ;
- les textes de l'interface ('sections.x' | t) deviennent ('bs.sections.x' | t), rangés sous
  « bs » dans les fichiers de langue d'Horizon ;
- l'enveloppe de chaque section reçoit la classe « bs », à laquelle la feuille de style
  bs-base.css est limitée ;
- les classes qui existent aussi dans Horizon (tools/horizon/classes.json) deviennent « bs-<nom> » ;
- les scripts theme.js et simulateur.js sont copiés en bs-theme.js et bs-simulateur.js.
Usage (depuis tools/) : npm run horizon:build (classes.js d'abord, puis ce script)
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'theme'
DST = ROOT / 'horizon'

# Nom affiché dans l'éditeur (25 caractères au plus) : « BS » pour Belle Saison.
SECTIONS = {
    'hero-video': 'BS · Ouverture vidéo',
    'engagements': 'BS · Engagements',
    'collection-list': 'BS · Collections',
    'story': 'BS · Notre histoire',
    'featured-collection': 'BS · Produits phares',
    'testimonials': 'BS · Avis clients',
    'video-banner': 'BS · Vidéo plein écran',
    'inspiration': 'BS · Inspiration',
    'newsletter': 'BS · Lettre d’information',
    'main-product': 'BS · Fiche produit',
    'product-recommendations': 'BS · Recommandations',
    'main-favorites': 'BS · Favoris',
}
SNIPPETS = ['icon', 'background-video', 'section-head', 'video-trigger', 'product-card',
            'product-pricing', 'wishlist-button', 'product-specs', 'wall-simulator']
ASSETS = ['theme.js', 'simulateur.js', 'model-viewer.min.js', 'base.css']

RENAMED = json.loads((pathlib.Path(__file__).parent / 'classes.json').read_text())
ALT = '|'.join(map(re.escape, sorted(RENAMED, key=len, reverse=True)))
TOKEN = re.compile(r'(?<![\w{}.-])(%s)(?![\w-])' % ALT)

def rename_classes(value):
    # Ne renomme que les mots de la liste, hors balises Liquid ({{ … }} et {% … %}).
    parts = re.split(r'(\{\{.*?\}\}|\{%.*?%\})', value)
    return ''.join(part if part.startswith('{') else TOKEN.sub(r'bs-\1', part) for part in parts)

def convert(text):
    text = re.sub(r'(class=")([^"]*)(")', lambda m: m.group(1) + rename_classes(m.group(2)) + m.group(3), text)
    text = re.sub(r"((?:class|placeholder_svg_tag):\s*')([^']*)(')", lambda m: m.group(1) + rename_classes(m.group(2)) + m.group(3), text)
    text = re.sub(r"render '(%s)'" % '|'.join(map(re.escape, SNIPPETS)), r"render 'bs-\1'", text)
    text = re.sub(r"'(%s)'(\s*\|\s*asset_url)" % '|'.join(map(re.escape, ASSETS)), r"'bs-\1'\2", text)
    text = re.sub(r"'((?:general|accessibility|sections|products|collections|cart|search|contact|newsletter|favorites|blogs|gift_cards)\.[a-z0-9_.]+)'(\s*\|\s*t\b)", r"'bs.\1'\2", text)
    return text

for name, label in SECTIONS.items():
    text = convert((SRC / 'sections' / f'{name}.liquid').read_text())
    start = text.index('{% schema %}') + len('{% schema %}')
    end = text.index('{% endschema %}')
    schema = json.loads(text[start:end])
    schema['name'] = label
    schema['class'] = ('bs ' + schema.get('class', f'section-{name}')).strip()
    for preset in schema.get('presets', []):
        preset['name'] = label
    schema_text = json.dumps(schema, ensure_ascii=False, indent=2)
    text = text[:start] + '\n' + schema_text + '\n' + text[end:]
    if name == 'hero-video':
        # La hauteur « plein écran » retire celle de l'en-tête Horizon : on la fait mesurer
        # avant l'affichage (snippet fourni par Horizon).
        text = text.replace('<section class="video-hero', "{%- render 'measure-header-heights' -%}\n<section class=\"video-hero", 1)
    (DST / 'sections' / f'bs-{name}.liquid').write_text(text)
    print('section', f'bs-{name}.liquid')

for name in SNIPPETS:
    text = convert((SRC / 'snippets' / f'{name}.liquid').read_text())
    (DST / 'snippets' / f'bs-{name}.liquid').write_text(text)
    print('snippet', f'bs-{name}.liquid')

# Scripts : configuration lue dans window.bsTheme (bs-head.liquid). Un sélecteur ou une classe
# renommée dans un script doit être adapté à la main : on s'arrête plutôt que de le manquer.
JS_CLASS = re.compile(r'''(?:querySelector(?:All)?|closest|matches)\(\s*['"`][^'"`]*\.(%s)(?![\w-])|classList\.\w+\(\s*['"](%s)['"]|className\s*=\s*['"][^'"]*(?<![\w-])(%s)(?![\w-])''' % (ALT, ALT, ALT))
ADD_TO_CART = """  const addToCart = async (formData) => {
    const response = await fetch(`${theme.routes.cartAddUrl}.js`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.description || data.message || theme.strings.addError);
    await refreshCartCount();
    return data;
  };"""
# Dans Horizon, l'ajout au panier est annoncé à l'icône et au tiroir du panier d'Horizon
# (événement CartLinesUpdateEvent de @shopify/events, avec le rendu à jour des sections du panier).
HORIZON_ADD_TO_CART = """  const addToCart = async (formData) => {
    // Horizon : l'icône et le tiroir du panier écoutent l'événement CartLinesUpdateEvent
    // (@shopify/events) ; la réponse contient le nouveau rendu des sections du panier.
    const sectionIds = [...document.querySelectorAll('cart-items-component[data-section-id]')].map((el) => el.dataset.sectionId);
    if (sectionIds.length) formData.append('sections', sectionIds.join(','));
    let events = null;
    try {
      events = await import('@shopify/events');
    } catch (error) {
      /* Hors d'Horizon : le panier se mettra à jour au prochain chargement de page. */
    }
    const quantity = Number(formData.get('quantity')) || 1;
    const deferred = events ? events.CartLinesUpdateEvent.createPromise() : null;
    if (deferred) {
      document.dispatchEvent(
        new events.CartLinesUpdateEvent({
          action: 'add',
          context: 'product',
          lines: [{ merchandiseId: String(formData.get('id')), quantity }],
          promise: deferred.promise,
        })
      );
    }
    try {
      const response = await fetch(`${theme.routes.cartAddUrl}.js`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.description || data.message || theme.strings.addError);
      if (deferred) {
        const cart = await (await fetch(`${theme.routes.cartUrl}.js`, { headers: { Accept: 'application/json' } })).json();
        deferred.resolve({
          cart: events.CartLinesUpdateEvent.createCartFromAjaxResponse(cart),
          detail: { items: cart.items, source: 'bs-product', itemCount: quantity, sections: data.sections, didError: false },
        });
      }
      return data;
    } catch (error) {
      if (deferred) deferred.reject(error);
      throw error;
    }
  };"""

for src, dst, header in [
    ('theme.js', 'bs-theme.js', '/* Belle Saison dans Horizon : comportements des sections Belle Saison (copie de theme/assets/theme.js, configuration lue dans window.bsTheme). Aucune dépendance externe. */'),
    ('simulateur.js', 'bs-simulateur.js', None),
    ('model-viewer.min.js', 'bs-model-viewer.min.js', None),
]:
    text = (SRC / 'assets' / src).read_text()
    if src == 'theme.js':
        lines = text.split('\n')
        assert lines[0].startswith('/* Belle Saison'), lines[0]
        text = '\n'.join([header] + lines[1:]).replace('window.theme ||', 'window.bsTheme ||', 1)
        assert 'window.bsTheme ||' in text
        assert text.count(ADD_TO_CART) == 1, 'theme.js : fonction addToCart modifiée, adapter HORIZON_ADD_TO_CART'
        text = text.replace(ADD_TO_CART, HORIZON_ADD_TO_CART)
    found = JS_CLASS.search(text) if not src.endswith('.min.js') else None
    assert not found, f'{src} : classe renommée utilisée dans un script ({found.group(0)})'
    (DST / 'assets' / dst).write_text(text)
    print('script', dst)
