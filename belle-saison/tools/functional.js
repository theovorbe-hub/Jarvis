// Teste le configurateur sur mesure et le calculateur de rouleaux sur l'aperçu local.
// Usage : npm test
const path = require('path');
const assert = require('assert');
const launch = require('./browser');

const outDir = path.join(__dirname, 'preview-out');
const clean = (text) => text.replace(/\s+/g, ' ').trim();

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`file://${path.join(outDir, 'product.html')}`);
  await page.click('[data-add-button]');
  assert.match(await page.textContent('[data-configurator-error]'), /largeur et la hauteur/);

  await page.fill('[data-wall-width]', '320');
  await page.fill('[data-wall-height]', '262');
  assert.equal(clean(await page.textContent('[data-area]')), '8,38 m² (9 m² facturés)');
  assert.equal(clean(await page.textContent('[data-total]')), '441,00 €');
  assert.equal(await page.inputValue('[data-quantity-input]'), '9');
  assert.equal(await page.inputValue('[data-property-area]'), '8,38 m²');

  await page.click('.variant-option:nth-child(2)');
  assert.equal(clean(await page.textContent('[data-total]')), '531,00 €');

  await page.fill('[data-wall-width]', '5000');
  assert.match(await page.textContent('[data-configurator-error]'), /Largeur entre 50 et 1200 cm/);

  await page.goto(`file://${path.join(outDir, 'product-rouleau.html')}`);
  assert.equal(clean(await page.textContent('[data-price-per-m2]')), 'soit 16,71 € le m²');
  await page.click('.calculator__summary');
  await page.fill('[data-calc-width]', '4.2');
  await page.fill('[data-calc-height]', '2.5');
  assert.match(clean(await page.innerText('[data-calc-result]')), /^3 rouleaux 8 lés de 2,92 m, soit 3 lés par rouleau\.$/);

  // Vidéos d'ambiance : lecture quand visibles, bouton pause, rien en mouvement réduit.
  await page.goto(`file://${path.join(outDir, 'index.html')}`);
  await page.locator('.story [data-bg-video]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  assert.equal(await page.$eval('.story video', (v) => v.paused), false, 'la vidéo devrait jouer');
  await page.click('.story [data-video-toggle]');
  assert.equal(await page.$eval('.story video', (v) => v.paused), true, 'le bouton devrait mettre en pause');
  assert.equal(await page.$eval('.story [data-bg-video]', (el) => el.classList.contains('is-paused')), true);

  const calm = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await calm.goto(`file://${path.join(outDir, 'index.html')}`);
  await calm.locator('.story [data-bg-video]').scrollIntoViewIfNeeded();
  await calm.waitForTimeout(800);
  assert.equal(await calm.$eval('.story video', (v) => v.paused), true, 'pas de lecture auto en mouvement réduit');
  await calm.close();

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('Configurateur, calculateur et vidéos : tous les tests passent.');
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
