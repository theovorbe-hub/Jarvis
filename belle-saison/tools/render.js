// Rendu local approximatif du thème avec liquidjs et des données fictives.
// Ce n'est pas le moteur de Shopify : il sert à vérifier la mise en page avant
// un envoi. Usage : npm run preview:images (une fois), puis npm run preview.
const path = require('path');
const fs = require('fs');
const toolsDir = __dirname;
const themeDir = path.resolve(__dirname, '../theme');
const outDir = path.join(__dirname, 'preview-out');
const { Liquid, Tag } = require('liquidjs');

const read = (p) => fs.readFileSync(path.join(themeDir, p), 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const locale = JSON.parse(read('locales/fr.default.json'));
const settingsSchema = JSON.parse(read('config/settings_schema.json'));

// ---------- Polices locales (aperçu seulement) ----------
const fontDir = path.join(toolsDir, 'node_modules/@fontsource');
const fonts = {
  garamond: { family: "'EB Garamond'", fallback_families: 'Garamond, serif', style: 'normal', weight: 400, file: 'eb-garamond/files/eb-garamond-latin-400-normal.woff2' },
  geist: { family: "'Geist'", fallback_families: 'sans-serif', style: 'normal', weight: 500, file: 'geist-sans/files/geist-sans-latin-500-normal.woff2' },
};
const fontFor = (handle) => (handle.startsWith('geist') ? { ...fonts.geist } : { ...fonts.garamond });

// ---------- Réglages par défaut ----------
const settings = {};
for (const group of settingsSchema) for (const s of group.settings || []) if (s.id && 'default' in s) settings[s.id] = s.default;
for (const k of ['type_heading_font', 'type_body_font', 'type_accent_font']) settings[k] = fontFor(settings[k]);
settings.wishlist_page = { url: '/pages/favoris' };

// ---------- Données fictives ----------
const img = (name, w = 1200, h = 1200, alt = '') => ({ __image: true, src: `img/${name}.jpg`, width: w, height: h, alt, aspect_ratio: w / h });
const variant = (id, title, price, extra = {}) => ({ id, title, price, compare_at_price: null, available: true, sku: `BS-${id}`, url: `/products/x?variant=${id}`, featured_media: null, ...extra });
const mkProduct = (i, title, images, mode = 'm2') => {
  const variants =
    mode === 'm2'
      ? [variant(i * 10 + 1, 'Intissé premium', 4900), variant(i * 10 + 2, 'Intissé texturé lin', 5900), variant(i * 10 + 3, 'Échantillon A4', 0)]
      : [variant(i * 10 + 1, 'Rouleau', 8900), variant(i * 10 + 3, 'Échantillon A4', 0)];
  const media = images.map((n, k) => ({ ...img(n, 900, 900, title), id: i * 100 + k, media_type: 'image', preview_image: img(n, 900, 900, title) }));
  return {
    id: i, handle: `motif-${i}`, title, url: `/products/motif-${i}`, vendor: 'Belle Saison', available: true,
    price: variants[0].price, price_min: Math.min(...variants.map((v) => v.price)), price_varies: true,
    compare_at_price_min: 0, has_only_default_variant: false, options: ['Papier'],
    variants, selected_or_first_available_variant: variants[0], media, featured_media: media[0],
    description: '<p>Un feuillage dessiné à la main, imprimé sur un intissé mat qui laisse respirer les couleurs. Le visuel est adapté aux dimensions exactes de votre mur.</p>',
    metafields: { papier_peint: mode === 'm2'
      ? { mode_vente: { value: 'm2' }, matiere: { value: 'Intissé premium 190 g/m²' }, raccord: { value: 0 }, pose: { value: 'Encollage du mur' }, entretien: { value: 'Lessivable' } }
      : { mode_vente: { value: 'rouleau' }, matiere: { value: 'Intissé' }, largeur_le: { value: 53 }, longueur_rouleau: { value: 10.05 }, raccord: { value: 32 }, type_raccord: { value: 'Raccord droit' }, pose: { value: 'Encollage du mur' } } },
  };
};
const products = [
  mkProduct(1, 'Feuillage Albâtre', ['ins3', 'col2']),
  mkProduct(2, 'Rayure Bergère', ['col1', 'ins2']),
  mkProduct(3, 'Vallée de Provence', ['col3', 'ins1'], 'm2'),
  mkProduct(4, 'Toile Châtelaine', ['col4', 'ins5'], 'rouleau'),
];
const collection = {
  id: 1, handle: 'les-motifs', title: 'Les motifs', url: '/collections/les-motifs',
  description: '<p>Feuillages, fleurs et ornements dessinés pour les maisons de caractère.</p>',
  products, products_count: products.length, all_products_count: 4,
  featured_image: img('col2'), image: img('col2'),
  sort_by: 'manual', default_sort_by: 'manual',
  sort_options: [{ value: 'manual', name: 'En vedette' }, { value: 'price-ascending', name: 'Prix croissant' }, { value: 'created-descending', name: 'Nouveautés' }],
  filters: [
    { label: 'Couleur', type: 'list', param_name: 'filter.p.m.custom.couleur', active_values: [], values: [{ label: 'Vert sauge', value: 'vert', param_name: 'filter.v.option.couleur', count: 3, active: false }, { label: 'Crème', value: 'creme', param_name: 'filter.v.option.couleur', count: 2, active: false }] },
    { label: 'Prix', type: 'price_range', param_name: 'filter.v.price', range_max: 8900, active_values: [], min_value: { param_name: 'filter.v.price.gte', value: null }, max_value: { param_name: 'filter.v.price.lte', value: null } },
  ],
};
const colNames = ['Les essentiels', 'Les motifs', 'Les paysages', 'Les toiles', 'La collection enfant'];
const collections = colNames.map((t, i) => ({ ...collection, id: i + 1, title: t, handle: `c${i}`, url: `/collections/c${i}`, featured_image: img(`col${i + 1}`) }));
const linklists = {
  'menu-gauche': { links: [{ title: 'Collections', url: '/collections', links: collections.map((c) => ({ title: c.title, url: c.url, links: [] })) }, { title: 'Papiers peints', url: '/collections/all', links: [] }, { title: 'Inspiration', url: '/blogs/inspiration', links: [] }] },
  'menu-droite': { links: [{ title: 'Notre histoire', url: '/pages/notre-histoire', links: [] }, { title: 'Nos engagements', url: '/pages/nos-engagements', links: [] }] },
  footer: { links: [{ title: 'Contact', url: '/pages/contact', links: [] }, { title: 'Livraison', url: '/policies/shipping-policy', links: [] }, { title: 'Rechercher', url: '/search', links: [] }] },
};
const cartItems = [
  { index: 0, url: products[0].url, image: img('ins3'), product: products[0], variant: products[0].variants[0], quantity: 9, final_price: 4900, final_line_price: 44100, url_to_remove: '#', line_level_discount_allocations: [], properties: { 'Largeur du mur': '320 cm', 'Hauteur du mur': '262 cm', Surface: '8,38 m²' } },
  { index: 1, url: products[1].url, image: img('col1'), product: products[1], variant: products[1].variants[2], quantity: 1, final_price: 0, final_line_price: 0, url_to_remove: '#', line_level_discount_allocations: [], properties: {} },
];

// ---------- Moteur ----------
const engine = new Liquid({ root: [path.join(themeDir, 'snippets')], partials: [path.join(themeDir, 'snippets')], extname: '.liquid', strictFilters: true, jsTruthy: false });

const kw = (args) => {
  const o = {};
  for (const a of args) if (Array.isArray(a)) o[a[0]] = a[1];
  return o;
};
const lookup = (key) => key.split('.').reduce((o, k) => (o ? o[k] : undefined), locale);
const money = (c) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((Number(c) || 0) / 100).replace(/ /g, ' ');
const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`).join(' ');

engine.registerFilter('t', (key, ...args) => {
  const o = kw(args);
  let v = lookup(key);
  if (v && typeof v === 'object') v = o.count === 1 ? v.one : v.other;
  if (v === undefined) return `translation missing: ${key}`;
  return String(v).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (o[k] !== undefined ? o[k] : ''));
});
engine.registerFilter('money', money);
engine.registerFilter('money_with_currency', (c) => `${money(c)} EUR`);
engine.registerFilter('money_without_currency', (c) => ((Number(c) || 0) / 100).toFixed(2).replace('.', ','));
engine.registerFilter('image_url', (image, ...args) => (image && image.__image ? { ...image, __url: image.src } : image ? String(image) : ''));
engine.registerFilter('image_tag', (image, ...args) => {
  const o = kw(args);
  const src = image && image.__url ? image.__url : String(image);
  return `<img ${attrs({ src, alt: o.alt ?? image.alt ?? '', class: o.class, loading: o.loading, sizes: o.sizes, width: image.width, height: image.height, fetchpriority: o.fetchpriority })}>`;
});
engine.registerFilter('placeholder_svg_tag', (name, cls) => `<svg class="${cls || ''}" viewBox="0 0 525 525" preserveAspectRatio="xMidYMid slice"><rect width="525" height="525"/></svg>`);
engine.registerFilter('asset_url', (f) => `assets/${f}`);
engine.registerFilter('stylesheet_tag', (u) => `<link rel="stylesheet" href="${u}">`);
engine.registerFilter('font_face', (font) => `@font-face{font-family:${font.family};font-weight:${font.weight};font-style:${font.style};src:url('${path.join(fontDir, font.file)}') format('woff2');}`);
engine.registerFilter('font_modify', (font, prop, val) => {
  const f = { ...font };
  if (prop === 'weight') { f.weight = 700; if (font.file.includes('garamond')) f.file = 'eb-garamond/files/eb-garamond-latin-700-normal.woff2'; }
  if (prop === 'style') { f.style = 'italic'; if (font.file.includes('garamond')) f.file = 'eb-garamond/files/eb-garamond-latin-400-italic.woff2'; }
  return f;
});
engine.registerFilter('payment_type_svg_tag', () => '<svg class="footer__payment-icon" viewBox="0 0 38 24"><rect width="38" height="24" rx="3" fill="#ffffff22"/></svg>');
engine.registerFilter('payment_terms', () => '');
engine.registerFilter('time_tag', (d) => '11 octobre 2026');
engine.registerFilter('format_code', (c) => c);
engine.registerFilter('default_errors', () => '');
engine.registerFilter('video_tag', (video, ...args) => {
  const o = kw(args);
  if (!video || !video.src) return '';
  const flags = ['muted', 'loop', 'playsinline', 'controls', 'autoplay'].filter((f) => o[f]).join(' ');
  return `<video class="${o.class || ''}" ${flags} preload="${o.preload || 'metadata'}" poster="${video.poster}"><source src="${video.src}" type="video/mp4"></video>`;
});
engine.registerFilter('external_video_tag', () => '');
engine.registerFilter('media_tag', () => '');
engine.registerFilter('handle', (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'));
engine.registerFilter('json', (v) => JSON.stringify(v ?? null));

class NoopBlock extends Tag {
  constructor(tagToken, remainTokens, liquid, name) {
    super(tagToken, remainTokens, liquid);
    const end = `end${name}`;
    while (remainTokens.length) { const t = remainTokens.shift(); if (t.name === end) return; }
  }
  * render() { return ''; }
}
engine.registerTag('schema', class extends NoopBlock { constructor(a, b, c) { super(a, b, c, 'schema'); } });
engine.registerTag('layout', class extends Tag { * render() { return ''; } });

const blockTag = (name, render) =>
  class extends Tag {
    constructor(tagToken, remainTokens, liquid) {
      super(tagToken, remainTokens, liquid);
      this.args = tagToken.args;
      this.tpls = [];
      const stream = liquid.parser.parseStream(remainTokens).on(`tag:end${name}`, () => stream.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error(`tag ${name} not closed`); });
      stream.start();
    }
    * render(ctx, emitter) { yield* render.call(this, ctx, emitter); }
  };

engine.registerTag('form', blockTag('form', function* (ctx, emitter) {
  const type = (this.args.match(/'([^']+)'/) || [])[1];
  const idm = this.args.match(/id:\s*'([^']+)'/); const clm = this.args.match(/class:\s*'([^']+)'/);
  ctx.push({ form: { 'posted_successfully?': false, errors: null } });
  emitter.write(`<form method="post" action="/${type}" ${attrs({ id: idm && idm[1], class: clm && clm[1] })} ${this.args.includes('data-product-form') ? 'data-product-form' : ''} ${this.args.includes('novalidate') ? 'novalidate' : ''}>`);
  yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
  emitter.write('</form>');
  ctx.pop();
}));
engine.registerTag('paginate', blockTag('paginate', function* (ctx, emitter) {
  ctx.push({ paginate: { pages: 1, current_page: 1, parts: [], previous: null, next: null } });
  yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
  ctx.pop();
}));

// ---------- Sections ----------
const schemaOf = (src) => { const m = src.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/); return m ? JSON.parse(m[1]) : {}; };
const resolveSetting = (def, value) => {
  if (value === undefined) value = def.default;
  if (def.type === 'collection') return value ? collections.find((c) => c.handle === value) || collection : null;
  if (def.type === 'image_picker') return value ? img(value, 1600, 1200) : null;
  if (def.type === 'video_url') return value ? { type: 'youtube', id: 'dQw4w9WgXcQ' } : null;
  if (def.type === 'video') {
    if (!value) return null;
    const mobile = value.includes('mobile');
    const [width, height] = mobile ? [720, 1280] : [1920, 1080];
    // Le Chromium de test ne lit que le WebM : on l'utilise s'il existe, sauf pour la page de repli.
    const webm = !forceMp4 && fs.existsSync(path.join(outDir, 'img', `${value}.webm`));
    const url = `img/${value}.${webm ? 'webm' : 'mp4'}`;
    return { src: url, poster: 'img/hero.jpg', preview_image: img('hero'), sources: [{ format: 'mp4', url, width, height }] };
  }
  if (def.type === 'page') return value ? { url: '/pages/x', content: '' } : null;
  return value ?? null;
};
let sectionIndex = 0;
let forceMp4 = false;
const renderSection = async (id, data, scope) => {
  const src = read(`sections/${data.type}.liquid`);
  const schema = schemaOf(src);
  const s = {};
  for (const d of schema.settings || []) if (d.id) s[d.id] = resolveSetting(d, data.settings?.[d.id]);
  const blocks = (data.block_order || Object.keys(data.blocks || {})).map((bid) => {
    const b = data.blocks[bid];
    const bs = (schema.blocks || []).find((x) => x.type === b.type) || {};
    const settings = {};
    for (const d of bs.settings || []) if (d.id) settings[d.id] = resolveSetting(d, b.settings?.[d.id]);
    return { id: bid, type: b.type, settings, shopify_attributes: '' };
  });
  sectionIndex += 1;
  const section = { id, settings: s, blocks, index: sectionIndex };
  const html = await engine.parseAndRender(src, { ...scope, section });
  return `<div id="shopify-section-${id}" class="shopify-section ${schema.class || ''}">${html}</div>`;
};
const renderGroup = async (name, scope, overrides = {}) => {
  const g = JSON.parse(stripComments(read(`sections/${name}.json`)));
  let out = '';
  for (const id of g.order) {
    const data = JSON.parse(JSON.stringify(g.sections[id]));
    Object.assign(data.settings, overrides[id] || {});
    out += await renderSection(id, data, scope);
  }
  return out;
};

const pages = {
  index: { template: 'index', page_type: 'index', title: 'Belle Saison' },
  'index-repli': { template: 'index', page_type: 'index', title: 'Belle Saison', forceMp4: true },
  product: { template: 'product', page_type: 'product', title: products[0].title, product: products[0] },
  'product-rouleau': { template: 'product', page_type: 'product', title: products[3].title, product: products[3] },
  collection: { template: 'collection', page_type: 'collection', title: collection.title, collection },
  cart: { template: 'cart', page_type: 'cart', title: 'Panier', cart: { item_count: 10, items: cartItems, total_price: 44100, taxes_included: true, cart_level_discount_applications: [], note: '', currency: { iso_code: 'EUR' } } },
  '404': { template: '404', page_type: '404', title: 'Page introuvable' },
};

// Réglages de démonstration pour l'accueil (images issues de la maquette)
const indexOverrides = (t) => {
  // Ouverture vidéo : vraie vidéo si elle a été produite (make-hero-video.py), sinon la démo.
  const real = fs.existsSync(path.join(outDir, 'img', 'ouverture.mp4'));
  t.sections.hero_video.settings.video = real ? 'ouverture' : 'demo';
  t.sections.hero_video.settings.video_mobile = real ? 'ouverture-mobile' : 'demo-mobile';
  t.sections.hero_video.settings.poster = real ? 'ouverture-couverture' : 'hero';
  t.sections.collections.block_order.forEach((id, i) => { t.sections.collections.blocks[id].settings.collection = `c${i}`; });
  t.sections.story.settings.image = 'story';
  t.sections.story.settings.background_video = 'demo';
  t.sections.video.settings.video = 'demo';
  t.sections.story.settings.video_url = 'youtube';
  t.sections.featured.settings.collection = 'c1';
  t.sections.inspiration.block_order.forEach((id, i) => { t.sections.inspiration.blocks[id].settings.image = `ins${i + 1}`; });
  return t;
};

(async () => {
  fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });
  for (const f of fs.readdirSync(path.join(themeDir, 'assets'))) fs.copyFileSync(path.join(themeDir, 'assets', f), path.join(outDir, 'assets', f));
  for (const [name, p] of Object.entries(pages)) {
    sectionIndex = 0;
    forceMp4 = Boolean(p.forceMp4);
    const scope = {
      settings, linklists, collections, shop: { name: 'BELLE SAISON', customer_accounts_enabled: true, policies: [{ title: 'Mentions légales', url: '#' }, { title: 'CGV', url: '#' }], enabled_payment_types: ['visa', 'master', 'apple_pay'] },
      routes: { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', search_url: '/search', collections_url: '/collections', all_products_collection_url: '/collections/all', account_url: '/account', product_recommendations_url: '/recommendations/products' },
      request: { locale: { iso_code: 'fr' }, page_type: p.page_type, origin: 'https://belle-saison.example', design_mode: false },
      cart: p.cart || { item_count: 2, currency: { iso_code: 'EUR' }, taxes_included: true },
      template: { name: p.template }, page_title: p.title, canonical_url: '#', content_for_header: '', current_page: 1,
      product: p.product, collection: p.collection, recommendations: { performed: true, products_count: 4, products },
    };
    engine.options.globals = scope;
    const header = await renderGroup('header-group', scope);
    let tpl = JSON.parse(read(`templates/${p.template}.json`));
    if (p.template === 'index') tpl = indexOverrides(tpl);
    let body = '';
    for (const id of tpl.order) body += await renderSection(id, tpl.sections[id], scope);
    const footer = await renderGroup('footer-group', scope);
    const layout = read('layout/theme.liquid')
      .replace("{% sections 'header-group' %}", '@@HEADER@@')
      .replace("{% sections 'footer-group' %}", '@@FOOTER@@')
      .replace('{{ content_for_layout }}', '@@BODY@@');
    const html = (await engine.parseAndRender(layout, scope))
      .replace('@@HEADER@@', () => header).replace('@@FOOTER@@', () => footer).replace('@@BODY@@', () => body);
    fs.writeFileSync(path.join(outDir, `${name}.html`), html);
    console.log(`page rendue : ${name}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
