// Prépare la feuille de style Belle Saison pour Horizon : chaque règle est limitée aux
// sections Belle Saison (classe « bs » posée sur l'enveloppe de section), pour ne pas
// toucher au reste du thème Horizon.
// Les classes qui existent aussi dans Horizon (classes.json, produit par classes.js) sont
// renommées « bs-<nom> », comme dans le Liquid (port-sections.py).
// Usage (depuis tools/) : npm run horizon:build, ou node horizon/prefix-css.js <base.css> <sortie.css>
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');

const [, , input, output] = process.argv;
const SCOPE = '.bs';
const keyframes = new Map();
const renamed = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'classes.json'), 'utf8')));
const rename = selectorParser((s) => s.walkClasses((c) => { if (renamed.has(c.value)) c.value = `bs-${c.value}`; }));

const scopeSelector = (selector) => {
  const s = selector.trim();
  if (/^\.no-js\b/.test(s) || /^\.main:/.test(s)) return null;
  // Sélecteurs qui partent de l'enveloppe de section (.shopify-section, .section-<nom> + …) ou de
  // <main> : l'enveloppe porte elle-même la classe « bs », et <main> s'appelle .content-for-layout.
  if (/^(\.main\s*>|\.shopify-section\b|\.section-[\w-]+\s*\+)/.test(s)) {
    return s
      .replace(/^\.main\b/, '.content-for-layout')
      .replace(/\.shopify-section\b/g, '.shopify-section.bs')
      .replace(/(^|\+\s*)\.section-([\w-]+)/g, '$1.bs.section-$2');
  }
  if (s === ':root' || s === 'html' || s === 'body') return SCOPE;
  if (/^(html|body)\s+/.test(s)) return `${SCOPE} ${s.replace(/^(html|body)\s+/, '')}`;
  // « .js X » gardait une classe de plus que « X » : « .bs.bs X » conserve cet écart.
  if (/^\.js\s+/.test(s)) return `${SCOPE}${SCOPE} ${s.replace(/^\.js\s+/, '')}`;
  return `${SCOPE} ${s}`;
};

const root = postcss.parse(fs.readFileSync(input, 'utf8'));
root.walkAtRules('keyframes', (rule) => {
  const name = `bs-${rule.params}`;
  keyframes.set(rule.params, name);
  rule.params = name;
});
root.walkRules((rule) => {
  if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
  rule.selector = rename.processSync(rule.selector);
  const selectors = rule.selectors.map(scopeSelector).filter(Boolean);
  if (!selectors.length) return rule.remove();
  rule.selectors = [...new Set(selectors)];
});
// Hauteur de l'en-tête : celle mesurée par Horizon (--header-height, --header-group-height),
// avec les valeurs de Belle Saison en secours.
root.walkDecls('--header-height', (decl) => decl.remove());
root.walkDecls((decl) => {
  decl.value = decl.value
    .replace(/var\(--header-height\) - 38px/g, 'var(--bs-header-group-height)')
    .replace(/var\(--header-height\)/g, 'var(--bs-header-height)');
});
root.prepend(postcss.parse(fs.readFileSync(path.join(__dirname, 'reset.css'), 'utf8')));
root.prepend(postcss.parse(`${SCOPE} {\n  --bs-header-height: var(--header-height, 80px);\n  --bs-header-group-height: var(--header-group-height, 80px);\n}\n`));
root.walkDecls(/^animation(-name)?$/, (decl) => {
  for (const [from, to] of keyframes) decl.value = decl.value.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
});
const banner = '/* Belle Saison dans Horizon : feuille de style générée par tools/horizon/prefix-css.js depuis\n   theme/assets/base.css. Ne pas modifier à la main : modifier la source puis relancer. */\n';
fs.writeFileSync(output, banner + root.toString());
console.log(`${output} : ${root.nodes.length} règles, animations renommées : ${[...keyframes.values()].join(', ')}`);
