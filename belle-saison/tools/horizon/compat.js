// Contrôle de compatibilité des sections Belle Saison dans Horizon.
//
// Les sections « BS · … » gardent leur propre feuille de style (bs-base.css, limitée à la
// classe « bs »). Horizon charge aussi la sienne (base.css et les {% stylesheet %} de ses
// sections, blocs et snippets) : ce script cherche chaque propriété CSS qu'une règle d'Horizon
// impose à un élément d'une section Belle Saison sans que bs-base.css ne la redéfinisse.
// La valeur des variables d'Horizon n'intervient pas : seule la cascade est examinée.
//
// Usage (depuis tools/) : npm run horizon:compat [-- index product …]
// Sortie : liste des fuites (code 1 s'il y en a), captures preview-out/horizon-<page>-<largeur>.png.
const fs = require('fs');
const path = require('path');
const { calculate } = require('@bramus/specificity').default;
const launch = require('../browser');

const tools = path.resolve(__dirname, '..');
const out = path.join(tools, 'preview-out');
const horizon = path.resolve(tools, '..', 'horizon');

// Feuille « bundle » : tous les {% stylesheet %} d'Horizon, comme Shopify les assemble.
const bundle = [];
for (const dir of ['sections', 'blocks', 'snippets']) {
  for (const f of fs.readdirSync(path.join(horizon, dir))) {
    if (f.startsWith('bs-')) continue;
    const m = fs.readFileSync(path.join(horizon, dir, f), 'utf8').match(/\{%-?\s*stylesheet\s*-?%\}([\s\S]*?)\{%-?\s*endstylesheet\s*-?%\}/);
    if (m) bundle.push(`/* ${dir}/${f} */\n${m[1]}`);
  }
}
fs.writeFileSync(path.join(out, 'horizon-bundle.css'), bundle.join('\n'));
fs.copyFileSync(path.join(horizon, 'assets', 'base.css'), path.join(out, 'horizon-base.css'));
fs.copyFileSync(path.join(horizon, 'assets', 'bs-base.css'), path.join(out, 'assets', 'bs-base.css'));

// Page de référence (thème Belle Saison seul) et même contenu dans la structure d'Horizon :
// en-tête et pied de page retirés, feuilles d'Horizon puis bs-base.css à la place de base.css.
// Feuilles intégrées dans la page : en file://, Chromium refuse de lire les règles d'une feuille liée.
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ['index', 'product', 'product-rouleau'];
const css = (file) => fs.readFileSync(file, 'utf8');
// Classes communes à Horizon renommées « bs-… », comme le fait port-sections.py.
const renamed = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'classes.json'), 'utf8')));
const buildPage = (name) => {
  const ref = fs.readFileSync(path.join(out, `${name}.html`), 'utf8');
  const head = ref.slice(0, ref.indexOf('</head>'))
    .replace('<html lang="fr" class="no-js">', '<html lang="fr" class="js">')
    .replace(/<style>/, '<style data-origin="bs">')
    .replace('<link rel="stylesheet" href="assets/base.css">', () => `<style data-origin="horizon">${css(path.join(out, 'horizon-base.css'))}</style>
  <style data-origin="horizon">${css(path.join(out, 'horizon-bundle.css'))}</style>
  <style data-origin="bs">${css(path.join(out, 'assets', 'bs-base.css'))}</style>`);
  const mainHtml = ref.slice(ref.indexOf('>', ref.indexOf('<main')) + 1, ref.indexOf('</main>'))
    .replace(/class="([^"]*)"/g, (_, v) => `class="${v.split(/\s+/).map((c) => (renamed.has(c) ? `bs-${c}` : c)).join(' ')}"`)
    .replace(/class="shopify-section /g, 'class="shopify-section bs ');
  const tail = ref.slice(ref.indexOf('</footer>', ref.indexOf('</main>')));
  const inlineScripts = (tail.match(/<script>[\s\S]*?<\/script>/g) || []).join('\n');
  const page = `${head}</head><body class="page-width-normal card-hover-effect-none"><div class="page-wrapper"><div id="header-group"><header style="height:80px"></header></div>
  <main id="MainContent" class="content-for-layout" role="main">${mainHtml}</main><footer></footer></div>${inlineScripts}</body></html>`;
  fs.writeFileSync(path.join(out, `horizon-${name}.html`), page);
};
PAGES.forEach(buildPage);

// Règles d'Horizon acceptées : barres de défilement (même aspect que sur le reste du site) et
// enveloppe de section (jamais focalisable, sans bordure ni marge intérieure ; la dernière
// section s'étire jusqu'au pied de page, comme dans Horizon).
const accepted = ({ prop, pseudo, state, wrapper }) =>
  /::-webkit-scrollbar/.test(pseudo) || (wrapper && (state || ['box-sizing', 'flex-grow'].includes(prop)));
// Écarts attendus sur l'enveloppe : elle reçoit les règles du corps de page de Belle Saison
// (fond, débordement horizontal) et devient un élément flexible du <main> d'Horizon.
const WRAPPER_DIFFS = new Set(['background-color', 'overflow-x', 'min-height', 'min-width', 'flex-grow']);
const INHERITED = new Set(['color', 'font-family', 'font-size', 'font-style', 'font-weight', 'font-variant', 'font-stretch', 'font-feature-settings', 'font-variation-settings', 'font-kerning', 'font-optical-sizing', 'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-transform', 'text-indent', 'text-shadow', 'text-rendering', 'white-space', 'white-space-collapse', 'text-wrap', 'text-wrap-mode', 'text-wrap-style', 'word-break', 'overflow-wrap', 'hyphens', 'list-style-type', 'list-style-position', 'list-style-image', 'visibility', 'cursor', 'direction', 'quotes', 'tab-size', 'caret-color', 'accent-color', '-webkit-font-smoothing', 'text-underline-offset', 'text-decoration-skip-ink', 'font-synthesis', 'color-scheme']);
const PHYSICAL = { 'block-start': 'top', 'block-end': 'bottom', 'inline-start': 'left', 'inline-end': 'right' };
const physical = (p) => p
  .replace(/^inset-(block|inline)-(start|end)$/, (_, a, b) => PHYSICAL[`${a}-${b}`])
  .replace(/-(block|inline)-(start|end)(?=-|$)/, (_, a, b) => `-${PHYSICAL[`${a}-${b}`]}`)
  .replace(/^(min-|max-)?inline-size$/, '$1width').replace(/^(min-|max-)?block-size$/, '$1height');


// Valeurs calculées de chaque élément des sections (même ordre dans les deux pages).
const snapshot = (tab) => tab.evaluate(async () => {
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.append(still);
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const skip = /^(transition|animation|view-transition|-webkit-locale|d$|perspective-origin|transform-origin|block-size|inline-size|min-block-size|min-inline-size|max-block-size|max-inline-size|inset-|border-(block|inline)|margin-(block|inline)|padding-(block|inline)|scroll-padding|scroll-margin|overflow-(block|inline)|contain-intrinsic-(block|inline))/;
  return [...document.querySelectorAll('main .shopify-section, main .shopify-section *')].filter((el) => !el.matches('input[type="hidden"], script, style, template')).map((el) => {
    const cs = getComputedStyle(el);
    const o = {};
    for (let i = 0; i < cs.length; i++) if (!skip.test(cs[i]) && !cs[i].startsWith('--')) o[cs[i]] = cs.getPropertyValue(cs[i]);
    o['#wrapper'] = el.classList.contains('shopify-section');
    o['@'] = `${el.closest('.shopify-section').id.replace('shopify-section-', '')} > ${el.tagName.toLowerCase()}${[...el.classList].filter((c) => c !== 'bs').slice(0, 2).map((c) => `.${c.replace(/^bs-/, '')}`).join('')}`;
    return o;
  });
});

(async () => {
  const browser = await launch();
  const leaks = new Map();
  const diffs = new Map();
  for (const name of PAGES) for (const width of [1440, 390]) {
    const refTab = await browser.newPage({ viewport: { width, height: 900 } });
    await refTab.goto(`file://${path.join(out, `${name}.html`)}`);
    await refTab.waitForTimeout(300);
    // Hauteur de l'en-tête de la page de référence (bandeau de 38 px compris), qu'Horizon mesure.
    const headerHeight = await refTab.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')));
    // Même hauteur au-dessus de <main> que dans la page de référence (éléments positionnés par rapport à la page).
    const mainTop = await refTab.evaluate(() => document.querySelector('main').getBoundingClientRect().top + window.scrollY);
    const tab = await browser.newPage({ viewport: { width, height: 900 } });
    await tab.goto(`file://${path.join(out, `horizon-${name}.html`)}`);
    await tab.evaluate(([h, top]) => {
      document.body.style.setProperty('--header-height', `${h}px`);
      document.body.style.setProperty('--header-group-height', `${h + 38}px`);
      document.querySelector('#header-group header').style.height = `${top}px`;
    }, [headerHeight, mainTop]);
    await tab.waitForTimeout(300);
    const data = await tab.evaluate(() => {
      const splitList = (s) => {
        const parts = []; let depth = 0; let cur = '';
        for (const ch of s) {
          if (ch === '(' || ch === '[') depth++;
          if (ch === ')' || ch === ']') depth--;
          if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
        }
        if (cur.trim()) parts.push(cur.trim());
        return parts;
      };
      const resolve = (sel, parent) => (!parent ? sel : sel.includes('&') ? sel.replace(/&/g, `:is(${parent})`) : `:is(${parent}) ${sel}`);
      const rules = [];
      const walk = (list, parent, origin, layered) => {
        for (const r of list) {
          if (r instanceof CSSMediaRule) { if (matchMedia(r.media.mediaText).matches) walk(r.cssRules, parent, origin, layered); }
          else if (r instanceof CSSSupportsRule) { if (CSS.supports(r.conditionText)) walk(r.cssRules, parent, origin, layered); }
          else if (window.CSSLayerBlockRule && r instanceof CSSLayerBlockRule) walk(r.cssRules, parent, origin, true);
          else if (window.CSSContainerRule && r instanceof CSSContainerRule) walk(r.cssRules, parent, origin, layered);
          else if (window.CSSScopeRule && r instanceof CSSScopeRule) walk(r.cssRules, parent, origin, layered);
          else if (r instanceof CSSStyleRule) {
            const sels = splitList(r.selectorText).map((s) => resolve(s, parent));
            const decls = [];
            for (let i = 0; i < r.style.length; i++) { const p = r.style[i]; decls.push([p, r.style.getPropertyValue(p), r.style.getPropertyPriority(p)]); }
            rules.push({ sels, decls, origin, layered, order: rules.length });
            if (r.cssRules && r.cssRules.length) walk(r.cssRules, sels.join(', '), origin, layered);
          } else if (window.CSSNestedDeclarations && r instanceof CSSNestedDeclarations) {
            const decls = [];
            for (let i = 0; i < r.style.length; i++) { const p = r.style[i]; decls.push([p, r.style.getPropertyValue(p), r.style.getPropertyPriority(p)]); }
            rules.push({ sels: splitList(parent), decls, origin, layered, order: rules.length });
          }
        }
      };
      for (const sheet of document.styleSheets) walk(sheet.cssRules, '', sheet.ownerNode.dataset.origin, false);
      const PSEUDO = /::?(before|after|placeholder|marker|selection|backdrop|file-selector-button|-webkit-[a-z-]+|-moz-[a-z-]+)\b(\([^)]*\))?/g;
      const STATE = /:(hover|focus-visible|focus-within|focus|active)\b/g;
      const els = [...document.querySelectorAll('main .shopify-section.bs, main .shopify-section.bs *')].filter((el) => !el.matches('input[type="hidden"], script, style, template'));
      els.forEach((el, i) => (el.dataset.k = i));
      const hits = els.map(() => []);
      for (const rule of rules) {
        rule.sels.forEach((sel) => {
          const pseudo = (sel.match(PSEUDO) || []).join('');
          const state = /:(hover|focus-visible|focus-within|focus|active)\b/.test(sel);
          // L'élément d'origine d'un pseudo-élément, et l'état survol/focus considéré comme actif.
          const test = sel.replace(PSEUDO, ':is(*)').replace(STATE, ':is(*)');
          let matched;
          try { matched = els.filter((el) => el.matches(test)); } catch { return; }
          for (const el of matched) hits[el.dataset.k].push({ r: rule.order, sel, pseudo, state });
        });
      }
      const desc = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${[...el.classList].slice(0, 3).map((c) => `.${c}`).join('')}`;
      const ancestors = [];
      for (let a = els[0] && els[0].parentElement; a; a = a.parentElement) ancestors.push(a);
      const ancestorHits = [];
      for (const rule of rules) if (rule.origin === 'horizon') rule.sels.forEach((sel) => { try { if (ancestors.some((a) => a.matches(sel))) ancestorHits.push({ r: rule.order, sel }); } catch {} });
      return { rules, hits, names: els.map(desc), wrappers: els.map((el) => el.classList.contains('shopify-section')), section: els.map((el) => desc(el.closest('.shopify-section'))), ancestorHits };
    });

    const { rules, hits } = data;
    const bsVarsUsed = new Set((fs.readFileSync(path.join(out, 'assets', 'bs-base.css'), 'utf8').match(/var\(--[\w-]+/g) || []).map((v) => v.slice(4)));
    const record = (key, info) => {
      if (!leaks.has(key)) leaks.set(key, { ...info, widths: new Set(), elements: new Set() });
      leaks.get(key).widths.add(width);
      leaks.get(key).elements.add(info.element);
    };
    const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
    hits.forEach((list, k) => {
      for (const pseudo of new Set(list.map((h) => h.pseudo))) {
        for (const state of [false, true]) {
          const cand = new Map();
          for (const h of list) {
            if (h.pseudo !== pseudo || (h.state && !state)) continue;
            const rule = rules[h.r];
            const spec = calculate(h.sel)[0].value;
            for (const [p0, value, prio] of rule.decls) {
              const p = physical(p0);
              if (p.startsWith('--') && !bsVarsUsed.has(p)) continue;
              const important = prio === 'important';
              const rank = [important ? 1 : 0, important === rule.layered ? 1 : 0, spec.a, spec.b, spec.c, rule.order];
              const best = cand.get(p);
              if (!best || cmp(rank, best.rank) > 0) cand.set(p, { rank, value, origin: rule.origin, sel: h.sel, state: h.state });
            }
          }
          // ::before et ::after n'existent que si « content » a une valeur : sinon rien à afficher.
          if (/::(before|after)$/.test(pseudo)) {
            const content = cand.get('content');
            if (!content || /^(none|normal)$/.test(content.value)) continue;
          }
          for (const [p, win] of cand) {
            // Au repos : règles sans :hover/:focus ; au survol : seulement les gagnantes propres à cet état.
            if (win.origin !== 'horizon' || win.state !== state) continue;
            if (accepted({ prop: p, pseudo, state, wrapper: data.wrappers[k] })) continue;
            record(`${win.sel} | ${p}`, { sel: win.sel, prop: p, value: win.value, state, element: `${name} : ${data.section[k]} > ${data.names[k]}${pseudo}` });
          }
        }
      }
      // Propriétés héritées : sur l'enveloppe de section, celles qu'Horizon pose sur un parent
      // (body, main…) et que bs-base.css ne redéfinit pas sur l'enveloppe.
      if (data.wrappers[k]) {
        const own = new Set(list.filter((h) => !h.pseudo && !h.state && rules[h.r].origin === 'bs').flatMap((h) => rules[h.r].decls.map(([q]) => physical(q))));
        for (const a of data.ancestorHits) for (const [p0, value] of rules[a.r].decls) {
          const p = physical(p0);
          const inheritedVar = p.startsWith('--') && bsVarsUsed.has(p) && !['--header-height', '--header-group-height'].includes(p);
          if ((INHERITED.has(p) || inheritedVar) && !own.has(p)) record(`(parent) ${a.sel} | ${p}`, { sel: `(parent) ${a.sel}`, prop: p, value, element: data.names[k] });
        }
      }
    });
    // Comparaison avec la page de référence (même largeur).
    const [a, b] = [await snapshot(refTab), await snapshot(tab)];
    await refTab.close();
    if (a.length !== b.length) console.log(`[${name} ${width}px] nombre d'éléments différent : ${a.length} / ${b.length}`);
    a.forEach((ea, i) => {
      const eb = b[i] || {};
      for (const p of Object.keys(ea)) {
        if (p === '@' || p === '#wrapper' || ea[p] === eb[p] || (ea['#wrapper'] && WRAPPER_DIFFS.has(p))) continue;
        const key = `${p}`;
        if (!diffs.has(key)) diffs.set(key, { count: 0, examples: [] });
        const d = diffs.get(key);
        d.count++;
        if (d.examples.length < 3) d.examples.push(`[${name} ${width}] ${ea['@']} : ${ea[p]} → ${eb[p]}`);
      }
    });
    await tab.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      window.scrollTo(0, 0);
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
    });
    await tab.waitForTimeout(600);
    await tab.screenshot({ path: path.join(out, `horizon-${name}-${width}.png`), fullPage: true });
    const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) console.log(`[${name} ${width}px] débordement horizontal de ${overflow}px`);
    await tab.close();
  }
  await browser.close();
  const list = [...leaks.values()].sort((a, b) => a.sel.localeCompare(b.sel) || a.prop.localeCompare(b.prop));
  for (const l of list) {
    const els = [...l.elements];
    console.log(`${l.sel}${l.state ? ' (survol/focus)' : ''} { ${l.prop}: ${l.value} } [${[...l.widths].join('/')}] ${els.length} élément(s), ex. ${els[0]}`);
  }
  console.log(`${list.length} propriété(s) d'Horizon appliquée(s) aux sections Belle Saison.`);
  for (const [p, d] of [...diffs].sort((x, y) => y[1].count - x[1].count)) console.log(`≠ ${p} (${d.count}) ${d.examples.join(' | ')}`);
  console.log(`${diffs.size} propriété(s) calculée(s) différente(s) de la page de référence.`);
  process.exit(list.length || diffs.size ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
