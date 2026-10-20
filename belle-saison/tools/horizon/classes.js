// Liste les classes de Belle Saison (theme/assets/base.css et attributs class des sections et
// snippets de theme/) qui existent aussi dans Horizon
// (assets/base.css et {% stylesheet %} des sections, blocs et snippets). Elles sont renommées
// « bs-<nom> » dans la copie Horizon (prefix-css.js pour la feuille, port-sections.py pour le
// Liquid), pour qu'aucune règle d'Horizon ne s'applique aux sections Belle Saison.
// Usage (depuis tools/) : npm run horizon:build, ou node horizon/classes.js
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');

const root = path.resolve(__dirname, '..', '..');
const horizon = path.join(root, 'horizon');
const classesOf = (css) => {
  const found = new Set();
  postcss.parse(css).walkRules((rule) => {
    try {
      selectorParser((s) => s.walkClasses((c) => found.add(c.value))).processSync(rule.selector);
    } catch {}
  });
  return found;
};

let horizonCss = fs.readFileSync(path.join(horizon, 'assets', 'base.css'), 'utf8');
for (const dir of ['sections', 'blocks', 'snippets']) {
  for (const file of fs.readdirSync(path.join(horizon, dir))) {
    if (file.startsWith('bs-')) continue;
    const m = fs.readFileSync(path.join(horizon, dir, file), 'utf8').match(/\{%-?\s*stylesheet\s*-?%\}([\s\S]*?)\{%-?\s*endstylesheet\s*-?%\}/);
    if (m) horizonCss += `\n${m[1].replace(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g, 'x')}`;
  }
}
const theirs = classesOf(horizonCss);
// Classes posées par Shopify (enveloppe de section, boutons de paiement…) : jamais renommées.
const ours = classesOf(fs.readFileSync(path.join(root, 'theme', 'assets', 'base.css'), 'utf8'));
for (const dir of ['sections', 'snippets']) {
  for (const file of fs.readdirSync(path.join(root, 'theme', dir))) {
    const liquid = fs.readFileSync(path.join(root, 'theme', dir, file), 'utf8');
    for (const m of liquid.matchAll(/class="([^"]*)"|(?:class|placeholder_svg_tag):\s*'([^']*)'/g)) {
      (m[1] ?? m[2]).replace(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g, ' ').split(/\s+/).filter((c) => /^[a-z][\w-]*$/.test(c)).forEach((c) => ours.add(c));
    }
  }
}
const shared = [...ours]
  .filter((c) => theirs.has(c) && !c.startsWith('shopify-'))
  .sort();
fs.writeFileSync(path.join(__dirname, 'classes.json'), `${JSON.stringify(shared, null, 2)}\n`);
console.log(`${shared.length} classes communes renommées « bs-… » : ${shared.join(' ')}`);
