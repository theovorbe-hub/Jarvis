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

  // Ouverture vidéo : image de couverture d'abord, vidéo chargée ensuite, en boucle et sans son.
  await page.goto(`file://${path.join(outDir, 'index.html')}`);
  await page.waitForSelector('.video-hero video', { timeout: 5000 });
  await page.waitForFunction(() => document.querySelector('.video-hero__media').classList.contains('is-playing'), null, { timeout: 8000 });
  const hero = await page.$eval('.video-hero video', (v) => ({ muted: v.muted, loop: v.loop, paused: v.paused, src: v.currentSrc }));
  assert.ok(hero.muted && hero.loop && !hero.paused, 'la vidéo d’ouverture doit jouer en boucle sans son');
  assert.match(hero.src, /(ouverture|demo)\.(mp4|webm)$/);
  assert.ok(await page.$('.video-hero__poster'), 'l’image de couverture doit rester en place');

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await phone.goto(`file://${path.join(outDir, 'index.html')}`);
  await phone.waitForSelector('.video-hero video', { timeout: 5000 });
  assert.match(await phone.$eval('.video-hero video', (v) => v.getAttribute('src')), /mobile\.(mp4|webm)$/, 'version verticale sur mobile');
  await phone.close();

  // Repli : une vidéo illisible est retirée, l'image de couverture reste et le bouton pause disparaît.
  const fallback = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await fallback.goto(`file://${path.join(outDir, 'index-repli.html')}`);
  await fallback.waitForTimeout(2500);
  assert.equal(await fallback.$('.video-hero video'), null, 'la vidéo illisible doit être retirée');
  assert.ok(await fallback.$eval('.video-hero__poster', (img) => img.getBoundingClientRect().width > 0), 'l’image reste visible');
  assert.equal(await fallback.$eval('.video-hero .media-toggle', (b) => getComputedStyle(b).display), 'none');
  await fallback.close();

  // Vos questions et avis clients.
  await page.goto(`file://${path.join(outDir, 'index.html')}`);
  assert.equal(await page.$$eval('.reassurance__item', (els) => els.length), 7, 'sept questions attendues');
  assert.equal(await page.$$eval('.testimonial', (els) => els.length), 4);
  assert.equal(await page.$$eval('.testimonial__verified', (els) => els.length), 2, 'badge seulement sur les avis cochés');
  await page.locator('.testimonials').scrollIntoViewIfNeeded();
  const before = await page.$eval('[data-carousel-track]', (t) => t.scrollLeft);
  assert.equal(await page.$eval('[data-carousel-prev]', (b) => b.disabled), true);
  await page.click('[data-carousel-next]');
  await page.waitForTimeout(700);
  assert.ok((await page.$eval('[data-carousel-track]', (t) => t.scrollLeft)) > before, 'la flèche fait défiler les avis');

  // Liens directs : mêmes vidéos, fournies par URL au lieu du sélecteur de fichiers Shopify.
  const direct = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await direct.goto(`file://${path.join(outDir, 'index-lien.html')}`);
  await direct.waitForFunction(() => document.querySelector('.video-hero__media').classList.contains('is-playing'), null, { timeout: 8000 });
  await direct.locator('.story [data-bg-video]').scrollIntoViewIfNeeded();
  await direct.waitForTimeout(800);
  assert.equal(await direct.$eval('.story video', (v) => v.paused), false, 'la vidéo « Notre histoire » par lien direct doit jouer');
  assert.match(await direct.$eval('.story video', (v) => v.currentSrc), /demo\.webm$/);
  await direct.close();

  const calmHero = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await calmHero.goto(`file://${path.join(outDir, 'index.html')}`);
  await calmHero.waitForTimeout(1500);
  assert.equal(await calmHero.$('.video-hero video'), null, 'aucune vidéo chargée en mouvement réduit');
  await calmHero.close();

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
  console.log('Configurateur, calculateur, ouverture vidéo et vidéos : tous les tests passent.');
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
