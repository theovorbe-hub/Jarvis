// Valide le thème avec Shopify Theme Check (mêmes règles que la CLI Shopify).
// Usage : npm run check
const path = require('path');
const { themeCheckRun } = require('@shopify/theme-check-node');

const root = path.resolve(__dirname, '../theme');
const SEVERITY = ['erreur', 'avertissement', 'info'];

(async () => {
  const result = await themeCheckRun(root, undefined, () => {});
  const offenses = result.offenses || result;
  for (const o of offenses) {
    const file = o.uri.replace(`file://${root}/`, '');
    const line = o.start ? o.start.line + 1 : '';
    console.log(`[${SEVERITY[o.severity] || o.severity}] ${o.check} ${file}:${line} ${o.message}`);
  }
  console.log(`${offenses.length} problème(s) trouvé(s).`);
  process.exit(offenses.some((o) => o.severity === 0) ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
