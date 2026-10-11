// Captures d'écran de l'aperçu local (preview-out/*.html) et détection des débordements horizontaux.
// Usage : npm run preview  (ou node shoot.js index:1440 product:390 ...)
const path = require('path');
const launch = require('./browser');

const outDir = path.join(__dirname, 'preview-out');
const specs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['index:1440', 'index:390', 'product:1440', 'product:390', 'product-rouleau:1440', 'collection:1440', 'cart:1440', 'cart:390'];

(async () => {
  const browser = await launch();
  const problems = [];
  for (const spec of specs) {
    const [name, width] = spec.split(':');
    const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
    page.on('pageerror', (error) => problems.push(`${spec} : ${error.message}`));
    await page.goto(`file://${path.join(outDir, `${name}.html`)}`);
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      window.scrollTo(0, 0);
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
    });
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push(`${spec} : débordement horizontal de ${overflow}px`);
    await page.screenshot({ path: path.join(outDir, `${name}-${width}.png`), fullPage: true });
    await page.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : `Captures enregistrées dans ${outDir}, aucun problème détecté.`);
  process.exit(problems.length ? 1 : 0);
})();
