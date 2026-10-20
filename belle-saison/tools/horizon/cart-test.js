// Teste l'ajout au panier depuis la fiche produit Belle Saison dans Horizon : bs-theme.js doit
// annoncer l'ajout avec l'événement CartLinesUpdateEvent de @shopify/events (que l'icône et le
// tiroir du panier d'Horizon écoutent) et demander le rendu des sections du panier.
// @shopify/events et le panier de Shopify sont simulés.
// Usage (depuis tools/) : npm run horizon:compat (produit preview-out/horizon-product.html), puis
// node horizon/cart-test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const launch = require('../browser');

const out = path.join(__dirname, '..', 'preview-out');
fs.copyFileSync(path.join(__dirname, '..', '..', 'horizon', 'assets', 'bs-theme.js'), path.join(out, 'assets', 'bs-theme.js'));

const stub = `export class CartLinesUpdateEvent extends Event {
  constructor(data) { super('shopify:cart:lines-update', { bubbles: true }); Object.assign(this, data); window.__cartEvents.push(this); }
  static createPromise() { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
  static createCartFromAjaxResponse(cart) { return { totalQuantity: cart.item_count }; }
}`;
const importMap = `<script type="importmap">${JSON.stringify({ imports: { '@shopify/events': `data:text/javascript,${encodeURIComponent(stub)}` } })}</script>`;
const html = fs.readFileSync(path.join(out, 'horizon-product.html'), 'utf8')
  .replace('<head>', `<head>\n${importMap}`)
  .replace('<script src="assets/theme.js" defer></script>', '<script src="assets/bs-theme.js" defer></script>')
  .replace('</main>', '</main><cart-items-component data-section-id="cart-drawer"></cart-items-component>')
  .replace('</body>', '<script>window.bsTheme = window.theme;</script></body>');
fs.writeFileSync(path.join(out, 'horizon-product-panier.html'), html);

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__cartEvents = [];
    window.__requests = [];
    window.fetch = async (url, options = {}) => {
      const body = options.body instanceof FormData ? Object.fromEntries(options.body.entries()) : null;
      window.__requests.push({ url: String(url), body });
      const json = (data) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (String(url).endsWith('/cart/add.js')) return json({ id: 1, quantity: Number(body.quantity), sections: { 'cart-drawer': '<p>panier</p>' } });
      if (String(url).endsWith('/cart.js')) return json({ item_count: 9, items: [{ id: 1, quantity: 9 }] });
      return new Response('', { status: 404 });
    };
  });
  await page.goto(`file://${path.join(out, 'horizon-product-panier.html')}`);
  await page.fill('[data-wall-width]', '320');
  await page.fill('[data-wall-height]', '262');
  await page.click('[data-add-button]');
  await page.waitForFunction(() => window.__cartEvents.length > 0, null, { timeout: 5000 });
  const result = await page.evaluate(async () => {
    const event = window.__cartEvents[0];
    const resolved = await event.promise;
    return { action: event.action, lines: event.lines, resolved, requests: window.__requests };
  });
  assert.equal(result.action, 'add');
  assert.equal(result.lines[0].quantity, 9, 'quantité = surface facturée (9 m²)');
  const add = result.requests.find((r) => r.url.endsWith('/cart/add.js'));
  assert.equal(add.body.sections, 'cart-drawer', 'rendu de la section du tiroir demandé');
  assert.equal(add.body['properties[Surface]'], '8,38 m²');
  assert.deepEqual(result.resolved.detail.sections, { 'cart-drawer': '<p>panier</p>' });
  assert.equal(result.resolved.cart.totalQuantity, 9);
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('Ajout au panier dans Horizon : événement CartLinesUpdateEvent et sections du panier, test réussi.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
