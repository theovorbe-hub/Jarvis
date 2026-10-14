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
  assert.equal(await page.$eval('.usp-bar__list--copy', (l) => getComputedStyle(l).display), 'none', 'bandeau fixe sur grand écran');

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await phone.goto(`file://${path.join(outDir, 'index.html')}`);
  await phone.waitForSelector('.video-hero video', { timeout: 5000 });
  assert.match(await phone.$eval('.video-hero video', (v) => v.getAttribute('src')), /mobile\.(mp4|webm)$/, 'version verticale sur mobile');
  // Même site sur mobile et sur ordinateur : rien de masqué, tout reste visible.
  const phoneWidth = await phone.evaluate(() => document.documentElement.clientWidth);
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth), phoneWidth, 'pas de défilement horizontal');
  const cards = await phone.$$eval('.collection-card', (els) => els.map((e) => e.getBoundingClientRect()).map((r) => r.left >= 0 && r.right <= window.innerWidth + 1));
  assert.ok(cards.length === 5 && cards.every(Boolean), 'les cinq collections visibles sur mobile');
  assert.equal(await phone.$eval('.usp-bar__list--copy', (l) => getComputedStyle(l).display), 'flex', 'messages du bandeau en défilement');
  assert.notEqual(await phone.$eval('.usp-bar__list', (l) => getComputedStyle(l).animationName), 'none');
  assert.notEqual(await phone.$eval('.testimonials__nav', (n) => getComputedStyle(n).display), 'none', 'flèches des avis sur mobile');
  await phone.close();

  // Repli : une vidéo illisible est retirée, l'image de couverture reste et le bouton pause disparaît.
  const fallback = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await fallback.goto(`file://${path.join(outDir, 'index-repli.html')}`);
  await fallback.waitForTimeout(2500);
  assert.equal(await fallback.$('.video-hero video'), null, 'la vidéo illisible doit être retirée');
  assert.ok(await fallback.$eval('.video-hero__poster', (img) => img.getBoundingClientRect().width > 0), 'l’image reste visible');
  assert.equal(await fallback.$eval('.video-hero .media-toggle', (b) => getComputedStyle(b).display), 'none');
  await fallback.close();

  // Avis clients. L'accueil ne contient plus de section qui évoque les doutes du client.
  await page.goto(`file://${path.join(outDir, 'index.html')}`);
  assert.equal(await page.$('.reassurance'), null, 'pas de section « questions » sur l’accueil');
  assert.doesNotMatch(await page.textContent('main'), /hésiter|Et si /, 'aucune formulation qui fait douter');
  assert.equal(await page.$$eval('.testimonial', (els) => els.length), 4);
  assert.equal(await page.$$eval('.testimonial__verified', (els) => els.length), 2, 'badge seulement sur les avis cochés');
  assert.equal(await page.$eval('.testimonial__verified', (el) => el.textContent.trim()), 'Vérifié');
  assert.equal(await page.$eval('.testimonial__signature', (el) => el.textContent.trim()), 'Exemple A., Lyon, octobre 2026');
  // Moyenne de 5, 4, 5, 5 = 4,75 arrondie à 4,8 ; deux avis sur quatre seulement sont vérifiés.
  assert.equal(await page.$eval('.testimonials__summary', (el) => el.textContent.trim()), 'Noté 4,8/5 sur la base de 4 avis.');
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
  assert.equal(await direct.$eval('.testimonials__summary', (el) => el.textContent.trim()), 'Noté 4,8/5 sur la base de 4 avis vérifiés.');
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

  await testSimulator();
  console.log('Configurateur, calculateur, ouverture vidéo et vidéos : tous les tests passent.');
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

// Simulateur « Voir sur mon mur » : servi en HTTP (la caméra et les images CORS l'exigent),
// avec une caméra simulée par Chromium.
async function testSimulator() {
  const http = require('http');
  const fs = require('fs');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webm': 'video/webm', '.mp4': 'video/mp4' };
  const server = http.createServer((req, res) => {
    const file = path.join(outDir, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${base}/product.html`);
  await page.click('[data-simulator-open]');
  assert.equal(await page.$eval('[data-simulator]', (d) => d.open), true, 'la fenêtre du simulateur s’ouvre');
  assert.equal(await page.$eval('[data-sim-ar]', (d) => d.hidden), true, 'pas de réalité augmentée sur ordinateur');
  assert.equal(await page.inputValue('[data-sim-width]'), '300');

  // Géométrie : l'homographie envoie bien les quatre coins.
  const corners = await page.evaluate(() => {
    const { homography, project } = window.BelleSaisonSimulator;
    const dst = [[10, 20], [300, 40], [280, 260], [30, 240]];
    const H = homography([[0, 0], [100, 0], [100, 50], [0, 50]], dst);
    return [[0, 0], [100, 0], [100, 50], [0, 50]].map(([x, y], i) => Math.hypot(project(H, x, y)[0] - dst[i][0], project(H, x, y)[1] - dst[i][1]));
  });
  assert.ok(corners.every((d) => d < 1e-6), 'homographie exacte aux coins');

  // Photo du mur : le papier peint s'affiche dans le quadrilatère, pas en dehors.
  await page.setInputFiles('[data-sim-file]', path.join(outDir, 'img', 'mur-test.jpg'));
  await page.waitForFunction(() => !document.querySelector('[data-sim-work]').hidden);
  await page.waitForTimeout(800);
  const pixels = await page.evaluate(() => {
    const canvas = document.querySelector('[data-sim-canvas]');
    const ctx = canvas.getContext('2d');
    const at = (fx, fy) => Array.from(ctx.getImageData(Math.round(canvas.width * fx), Math.round(canvas.height * fy), 1, 1).data);
    return { inside: at(0.5, 0.45), outside: at(0.5, 0.06) };
  });
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  assert.ok(distance(pixels.inside, [226, 219, 206]) > 25, `papier peint visible sur le mur (${pixels.inside})`);
  assert.ok(distance(pixels.outside, [226, 219, 206]) < 12, `photo intacte hors du mur (${pixels.outside})`);

  // Coins déplaçables à la souris et au clavier.
  const handle = await page.$('[data-sim-handle="0"]');
  const before = await handle.boundingBox();
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + 80, before.y + 60, { steps: 4 });
  await page.mouse.up();
  const after = await handle.boundingBox();
  assert.ok(after.x - before.x > 40 && after.y - before.y > 25, 'le coin suit la souris');
  const second = await page.$('[data-sim-handle="1"]');
  const keyBefore = await second.boundingBox();
  await second.focus();
  await page.keyboard.press('Shift+ArrowLeft');
  assert.ok((await second.boundingBox()).x < keyBefore.x - 5, 'le coin se règle au clavier');

  // Enregistrer l'image composée.
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-sim-save]')]);
  assert.equal(download.suggestedFilename(), 'belle-saison-motif-1.jpg');
  assert.ok(fs.statSync(await download.path()).size > 20000, 'image enregistrée');

  // Caméra en direct, puis photo figée.
  await page.click('[data-sim-restart]');
  await page.click('[data-sim-camera]');
  await page.waitForFunction(() => !document.querySelector('[data-sim-freeze]').hidden, null, { timeout: 8000 });
  await page.click('[data-sim-freeze]');
  assert.equal(await page.$eval('[data-sim-freeze]', (b) => b.hidden), true, 'la photo est prise');
  await page.click('[data-sim-close]');
  assert.equal(await page.$eval('[data-simulator]', (d) => d.open), false);

  // Modèle 3D de réalité augmentée : un panneau aux dimensions du mur, lisible par model-viewer.
  const model = await page.evaluate(async () => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'assets/model-viewer.min.js';
    document.head.append(script);
    await customElements.whenDefined('model-viewer');
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    canvas.getContext('2d').fillRect(0, 0, 64, 64);
    const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg'));
    const glb = window.BelleSaisonSimulator.buildGlb(new Uint8Array(await jpeg.arrayBuffer()), 3, 2.5);
    const viewer = document.createElement('model-viewer');
    viewer.setAttribute('loading', 'eager');
    viewer.style.cssText = 'position:fixed;top:0;left:0;width:300px;height:300px;z-index:10';
    document.body.append(viewer);
    const status = await new Promise((resolve) => {
      viewer.addEventListener('load', () => resolve('load'));
      viewer.addEventListener('error', () => resolve('error'));
      setTimeout(() => resolve('timeout'), 20000);
      viewer.src = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
    });
    return { status, size: viewer.getDimensions() };
  });
  assert.equal(model.status, 'load', 'le modèle 3D se charge');
  assert.deepEqual([model.size.x, model.size.y], [3, 2.5], 'panneau de 3 m sur 2,5 m');

  assert.deepEqual(errors, []);
  await browser.close();
  server.close();
  console.log('Simulateur « Voir sur mon mur » : tous les tests passent.');
}

