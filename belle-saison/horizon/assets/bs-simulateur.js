/* Simulateur « Voir sur mon mur » (Belle Saison).
 *
 * 1. Réalité augmentée, sur les téléphones compatibles (Android avec ARCore dans Chrome, iPhone
 *    avec Quick Look) : un panneau 3D aux dimensions du mur, texturé avec le papier peint, se pose
 *    contre le mur (sur iPhone, il apparaît debout et se fait glisser contre le mur). Le modèle
 *    est construit dans le navigateur (fichier GLB) et affiché par model-viewer, chargé
 *    uniquement à l'ouverture du simulateur.
 * 2. Caméra en direct ou photo du mur, sur tous les appareils : le client place les quatre coins
 *    de son mur ; le papier peint s'applique en perspective (homographie), à l'échelle réelle
 *    (largeur du motif rapportée à la largeur du mur), en gardant les ombres de la pièce
 *    (mélange « produit »). L'image composée peut être enregistrée ou partagée.
 * 3. Vignettes des autres papiers peints : un clic change le motif sur le mur (photo, caméra et
 *    réalité augmentée), le titre, le lien vers la fiche, l'image enregistrée et le partage.
 *
 * Rien ne quitte l'appareil du client.
 */
(() => {
  const MAX_DPR = 2;
  const GRID_LIVE = 8;
  const GRID_STILL = 14;
  const EXPORT_MAX = 2400;
  const TEXTURE_WIDTH = 1600;

  /* ------------------------------------------------------------------
     Géométrie
     ------------------------------------------------------------------ */
  // Résout A·x = b (élimination de Gauss avec pivot partiel).
  const solve = (A, b) => {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c += 1) {
      let pivot = c;
      for (let r = c + 1; r < n; r += 1) if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) pivot = r;
      [M[c], M[pivot]] = [M[pivot], M[c]];
      if (Math.abs(M[c][c]) < 1e-12) return null;
      for (let r = c + 1; r < n; r += 1) {
        const f = M[r][c] / M[c][c];
        for (let k = c; k <= n; k += 1) M[r][k] -= f * M[c][k];
      }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r -= 1) {
      let sum = M[r][n];
      for (let k = r + 1; k < n; k += 1) sum -= M[r][k] * x[k];
      x[r] = sum / M[r][r];
    }
    return x;
  };

  // Homographie qui envoie les 4 points src sur les 4 points dst.
  const homography = (src, dst) => {
    const A = [];
    const b = [];
    for (let i = 0; i < 4; i += 1) {
      const [x, y] = src[i];
      const [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
      b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
      b.push(v);
    }
    const h = solve(A, b);
    return h ? [...h, 1] : null;
  };

  const project = (H, x, y) => {
    const w = H[6] * x + H[7] * y + H[8];
    return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
  };

  // Dessine le triangle source (s0, s1, s2) de l'image sur le triangle destination (d0, d1, d2).
  // La zone découpée est légèrement agrandie pour éviter les filets entre triangles.
  const drawTriangle = (ctx, image, s, d, rect) => {
    const [[x0, y0], [x1, y1], [x2, y2]] = s;
    const [[u0, v0], [u1, v1], [u2, v2]] = d;
    const det = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
    if (Math.abs(det) < 1e-9) return;
    const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / det;
    const c = (x0 * (u1 - u2) + x1 * (u2 - u0) + x2 * (u0 - u1)) / det;
    const e = (x0 * (y1 * u2 - y2 * u1) + x1 * (y2 * u0 - y0 * u2) + x2 * (y0 * u1 - y1 * u0)) / det;
    const b = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / det;
    const dd = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / det;
    const f = (x0 * (y1 * v2 - y2 * v1) + x1 * (y2 * v0 - y0 * v2) + x2 * (y0 * v1 - y1 * v0)) / det;
    const cx = (u0 + u1 + u2) / 3;
    const cy = (v0 + v1 + v2) / 3;
    const grow = (px, py) => {
      const dx = px - cx;
      const dy = py - cy;
      const len = Math.hypot(dx, dy) || 1;
      return [px + (dx / len) * 0.7, py + (dy / len) * 0.7];
    };
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(...grow(u0, v0));
    ctx.lineTo(...grow(u1, v1));
    ctx.lineTo(...grow(u2, v2));
    ctx.closePath();
    ctx.clip();
    ctx.transform(a, b, c, dd, e, f);
    ctx.drawImage(image, rect[0], rect[1], rect[2], rect[3], rect[0], rect[1], rect[2], rect[3]);
    ctx.restore();
  };

  // Plaque la texture (rectangle w × h) sur le quadrilatère quad, en perspective.
  const drawPerspective = (ctx, texture, quad, grid) => {
    const w = texture.width;
    const h = texture.height;
    const H = homography([[0, 0], [w, 0], [w, h], [0, h]], quad);
    if (!H) return;
    ctx.save();
    ctx.beginPath();
    quad.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    const cw = w / grid;
    const ch = h / grid;
    for (let j = 0; j < grid; j += 1) {
      for (let i = 0; i < grid; i += 1) {
        const sx0 = i * cw;
        const sy0 = j * ch;
        const sx1 = sx0 + cw;
        const sy1 = sy0 + ch;
        const p00 = project(H, sx0, sy0);
        const p10 = project(H, sx1, sy0);
        const p11 = project(H, sx1, sy1);
        const p01 = project(H, sx0, sy1);
        const rx = Math.max(0, Math.floor(sx0) - 1);
        const ry = Math.max(0, Math.floor(sy0) - 1);
        const rect = [rx, ry, Math.min(w, Math.ceil(sx1) + 1) - rx, Math.min(h, Math.ceil(sy1) + 1) - ry];
        drawTriangle(ctx, texture, [[sx0, sy0], [sx1, sy0], [sx1, sy1]], [p00, p10, p11], rect);
        drawTriangle(ctx, texture, [[sx0, sy0], [sx1, sy1], [sx0, sy1]], [p00, p11, p01], rect);
      }
    }
    ctx.restore();
  };

  /* ------------------------------------------------------------------
     Texture du mur : panoramique ajusté au mur, ou motif répété à l'échelle
     ------------------------------------------------------------------ */
  const buildWallTexture = (image, wallCm, tileCm, maxWidth = TEXTURE_WIDTH) => {
    const ratio = wallCm.height / wallCm.width;
    const width = Math.round(maxWidth);
    const height = Math.max(1, Math.round(width * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#efe8dc';
    ctx.fillRect(0, 0, width, height);
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    if (tileCm > 0) {
      // Motif répété : sa largeur réelle est rapportée à celle du mur.
      const tileW = Math.max(8, (width * tileCm) / wallCm.width);
      const tileH = (tileW * ih) / iw;
      for (let y = 0; y < height; y += tileH) {
        for (let x = 0; x < width; x += tileW) ctx.drawImage(image, x, y, tileW, tileH);
      }
    } else {
      // Panoramique sur mesure : le visuel est adapté au mur (cadrage centré).
      const scale = Math.max(width / iw, height / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
    }
    return canvas;
  };

  /* ------------------------------------------------------------------
     Modèle 3D (GLB) : un panneau de largeur × hauteur mètres, texturé
     ------------------------------------------------------------------ */
  const buildGlb = (jpegBytes, widthM, heightM) => {
    const w2 = widthM / 2;
    const positions = new Float32Array([-w2, 0, 0, w2, 0, 0, w2, heightM, 0, -w2, heightM, 0]);
    const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    const pad4 = (n) => (n + 3) & ~3;
    const parts = [positions, normals, uvs, indices, jpegBytes];
    const offsets = [];
    let length = 0;
    parts.forEach((part) => {
      offsets.push(length);
      length = pad4(length + part.byteLength);
    });
    const bin = new Uint8Array(length);
    parts.forEach((part, i) => bin.set(new Uint8Array(part.buffer || part, part.byteOffset || 0, part.byteLength), offsets[i]));
    const view = (i, target) => ({ buffer: 0, byteOffset: offsets[i], byteLength: parts[i].byteLength, ...(target ? { target } : {}) });
    const json = {
      asset: { version: '2.0', generator: 'Belle Saison' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, name: 'Mur' }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
      materials: [{ name: 'Papier peint', doubleSided: true, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.92 } }],
      textures: [{ source: 0, sampler: 0 }],
      samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
      images: [{ bufferView: 4, mimeType: 'image/jpeg' }],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 4, type: 'VEC3', min: [-w2, 0, 0], max: [w2, heightM, 0] },
        { bufferView: 1, componentType: 5126, count: 4, type: 'VEC3' },
        { bufferView: 2, componentType: 5126, count: 4, type: 'VEC2' },
        { bufferView: 3, componentType: 5123, count: 6, type: 'SCALAR' },
      ],
      bufferViews: [view(0, 34962), view(1, 34962), view(2, 34962), view(3, 34963), view(4)],
      buffers: [{ byteLength: length }],
    };
    let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    const jsonLength = pad4(jsonBytes.byteLength);
    const padded = new Uint8Array(jsonLength).fill(0x20);
    padded.set(jsonBytes);
    jsonBytes = padded;
    const total = 12 + 8 + jsonLength + 8 + length;
    const out = new ArrayBuffer(total);
    const dv = new DataView(out);
    dv.setUint32(0, 0x46546c67, true);
    dv.setUint32(4, 2, true);
    dv.setUint32(8, total, true);
    dv.setUint32(12, jsonLength, true);
    dv.setUint32(16, 0x4e4f534a, true);
    new Uint8Array(out, 20, jsonLength).set(jsonBytes);
    dv.setUint32(20 + jsonLength, length, true);
    dv.setUint32(24 + jsonLength, 0x004e4942, true);
    new Uint8Array(out, 28 + jsonLength, length).set(bin);
    return out;
  };

  const canvasToBlob = (canvas, type = 'image/jpeg', quality = 0.88) =>
    new Promise((resolve) => canvas.toBlob(resolve, type, quality));

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src.startsWith('//') ? `https:${src}` : src;
    });

  let modelViewerPromise = null;
  const loadModelViewer = (src) => {
    if (customElements.get('model-viewer')) return Promise.resolve();
    if (!modelViewerPromise) {
      modelViewerPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = src.startsWith('//') ? `https:${src}` : src;
        script.onerror = reject;
        document.head.append(script);
        customElements.whenDefined('model-viewer').then(resolve);
      });
    }
    return modelViewerPromise;
  };

  const supportsAR = async () => {
    const quickLook = document.createElement('a').relList?.supports?.('ar') === true;
    if (quickLook) return true;
    if (navigator.xr?.isSessionSupported) {
      try {
        return await navigator.xr.isSessionSupported('immersive-ar');
      } catch (error) {
        return false;
      }
    }
    return false;
  };

  /* ------------------------------------------------------------------
     Simulateur
     ------------------------------------------------------------------ */
  class WallSimulator {
    constructor(dialog) {
      this.dialog = dialog;
      this.strings = JSON.parse(dialog.querySelector('[data-sim-strings]').textContent);
      this.tileCm = parseFloat(dialog.dataset.tileCm) || 0;
      this.el = (name) => dialog.querySelector(`[data-sim-${name}]`);
      this.stage = this.el('stage');
      this.canvas = this.el('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.layer = document.createElement('canvas');
      this.video = this.el('video');
      this.handles = [...dialog.querySelectorAll('[data-sim-handle]')];
      this.swatches = [...dialog.querySelectorAll('[data-sim-swatch]')];
      this.images = new Map();
      this.widthInput = this.el('width');
      this.heightInput = this.el('height');
      // Coins du mur en coordonnées normalisées de l'image (0 à 1) : haut gauche, haut droit,
      // bas droit, bas gauche.
      this.quad = [[0.2, 0.14], [0.8, 0.14], [0.8, 0.86], [0.2, 0.86]];
      this.media = null;
      this.stream = null;
      this.frame = null;
      this.texture = null;
      this.textureKey = '';
      this.urls = [];
      this.handles.forEach((handle, i) => handle.setAttribute('aria-label', this.strings.corners[i]));
      this.bind();
    }

    bind() {
      this.el('close').addEventListener('click', () => this.dialog.close());
      this.dialog.addEventListener('click', (event) => {
        if (event.target === this.dialog) this.dialog.close();
      });
      this.dialog.addEventListener('close', () => this.reset());
      this.el('camera').addEventListener('click', () => this.startCamera());
      this.el('file').addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) this.usePhoto(file);
      });
      this.el('freeze').addEventListener('click', () => this.freeze());
      this.el('restart').addEventListener('click', () => this.showStart());
      this.el('save').addEventListener('click', () => this.save());
      this.el('share').addEventListener('click', () => this.share());
      [this.widthInput, this.heightInput].forEach((input) =>
        input.addEventListener('input', () => {
          this.render();
          this.scheduleModelUpdate();
        })
      );
      // Entrée dans un champ : ne rien envoyer, juste mettre à jour.
      this.dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.matches('input')) event.preventDefault();
      });
      this.handles.forEach((handle, i) => this.bindHandle(handle, i));
      this.swatches.forEach((swatch) => swatch.addEventListener('click', () => this.choose(swatch)));
      new ResizeObserver(() => this.resize()).observe(this.stage);
    }

    open() {
      const fromConfigurator = (selector) => parseFloat(document.querySelector(selector)?.value) || 0;
      this.widthInput.value = fromConfigurator('[data-wall-width]') || this.dialog.dataset.defaultWidth;
      this.heightInput.value = fromConfigurator('[data-wall-height]') || this.dialog.dataset.defaultHeight;
      this.showStart();
      this.dialog.showModal();
      if (!this.visuelPromise) this.useVisuel(this.dialog.dataset.visuel);
      this.prepareAR();
    }

    // Charge un visuel (une seule fois par image) ; le dernier demandé remplace le motif affiché.
    useVisuel(src) {
      if (!this.images.has(src)) this.images.set(src, loadImage(src));
      const promise = this.images.get(src);
      this.visuelPromise = promise;
      promise
        .then((image) => {
          if (this.visuelPromise !== promise) return;
          this.visuel = image;
          this.render();
          this.scheduleModelUpdate();
        })
        .catch(() => {});
    }

    // Essaie un autre papier peint : motif, échelle, titre, lien vers sa fiche et partage.
    choose(swatch) {
      const { visuel, tileCm, title, handle, url, shareUrl } = swatch.dataset;
      this.swatches.forEach((button) => button.setAttribute('aria-pressed', String(button === swatch)));
      Object.assign(this.dialog.dataset, { title, handle, shareUrl });
      this.tileCm = parseFloat(tileCm) || 0;
      this.el('product').textContent = title;
      const link = this.el('product-link');
      link.href = url;
      link.hidden = swatch === this.swatches[0];
      this.viewer?.setAttribute('alt', title);
      this.useVisuel(visuel);
    }

    wallCm() {
      const clamp = (value, min, max, fallback) => (value >= min && value <= max ? value : fallback);
      return {
        width: clamp(parseFloat(this.widthInput.value), 50, 2000, 300),
        height: clamp(parseFloat(this.heightInput.value), 50, 800, 250),
      };
    }

    showStart() {
      this.stopCamera();
      this.media = null;
      this.el('start').hidden = false;
      this.el('work').hidden = true;
    }

    showWork() {
      this.el('start').hidden = true;
      this.el('work').hidden = false;
      this.el('message').hidden = true;
      this.el('share').hidden = !(navigator.canShare && navigator.share);
      requestAnimationFrame(() => {
        this.resize();
        this.handles[0].focus({ preventScroll: true });
      });
    }

    message(text) {
      const node = this.el('message');
      node.textContent = text;
      node.hidden = false;
    }

    async startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        this.message(this.strings.cameraUnavailable);
        return;
      }
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      } catch (error) {
        this.message(this.strings.cameraUnavailable);
        return;
      }
      this.video.srcObject = this.stream;
      await this.video.play().catch(() => {});
      if (!this.video.videoWidth) await new Promise((resolve) => this.video.addEventListener('loadedmetadata', resolve, { once: true }));
      this.media = this.video;
      this.el('freeze').hidden = false;
      this.el('hint').textContent = this.strings.live;
      this.showWork();
      const loop = () => {
        if (this.media !== this.video) return;
        this.render();
        this.frame = requestAnimationFrame(loop);
      };
      loop();
    }

    freeze() {
      if (this.media !== this.video) return;
      const still = document.createElement('canvas');
      still.width = this.video.videoWidth;
      still.height = this.video.videoHeight;
      still.getContext('2d').drawImage(this.video, 0, 0);
      this.stopCamera();
      this.media = still;
      this.el('freeze').hidden = true;
      this.el('hint').textContent = this.strings.place;
      this.render();
    }

    stopCamera() {
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = null;
      if (this.stream) this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
      this.video.srcObject = null;
    }

    async usePhoto(file) {
      try {
        this.media = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(async () => {
          const url = URL.createObjectURL(file);
          this.urls.push(url);
          return loadImage(url);
        });
      } catch (error) {
        this.message(this.strings.photoUnreadable);
        return;
      }
      this.el('freeze').hidden = true;
      this.el('hint').textContent = this.strings.place;
      this.showWork();
    }

    reset() {
      this.stopCamera();
      this.media = null;
      this.urls.forEach((url) => URL.revokeObjectURL(url));
      this.urls = [];
    }

    /* ---------- Mise en page de l'image dans la scène ---------- */
    resize() {
      const rect = this.stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      this.dpr = dpr;
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);
      this.layer.width = this.canvas.width;
      this.layer.height = this.canvas.height;
      this.render();
    }

    mediaSize() {
      const m = this.media;
      if (!m) return null;
      const w = m.videoWidth || m.naturalWidth || m.width;
      const h = m.videoHeight || m.naturalHeight || m.height;
      return w && h ? { w, h } : null;
    }

    // Rectangle (en pixels du canevas) où l'image est affichée, entière et centrée.
    mediaRect(canvasW, canvasH) {
      const size = this.mediaSize();
      if (!size) return null;
      const scale = Math.min(canvasW / size.w, canvasH / size.h);
      const w = size.w * scale;
      const h = size.h * scale;
      return { x: (canvasW - w) / 2, y: (canvasH - h) / 2, w, h };
    }

    quadIn(rect) {
      return this.quad.map(([nx, ny]) => [rect.x + nx * rect.w, rect.y + ny * rect.h]);
    }

    /* ---------- Rendu ---------- */
    ensureTexture() {
      if (!this.visuel) return null;
      const wall = this.wallCm();
      const key = `${this.visuel.src}|${this.tileCm}|${wall.width}x${wall.height}`;
      if (this.textureKey !== key) {
        this.texture = buildWallTexture(this.visuel, wall, this.tileCm);
        this.textureKey = key;
      }
      return this.texture;
    }

    compose(ctx, layer, width, height, grid, withGuides) {
      ctx.fillStyle = '#1d1f1a';
      ctx.fillRect(0, 0, width, height);
      const rect = this.mediaRect(width, height);
      if (!rect) return null;
      ctx.drawImage(this.media, rect.x, rect.y, rect.w, rect.h);
      const quad = this.quadIn(rect);
      const texture = this.ensureTexture();
      if (texture) {
        const lctx = layer.getContext('2d');
        lctx.clearRect(0, 0, layer.width, layer.height);
        drawPerspective(lctx, texture, quad, grid);
        // Le papier peint prend les ombres et la lumière de la pièce, puis retrouve ses couleurs.
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(layer, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.38;
        ctx.drawImage(layer, 0, 0);
        ctx.restore();
      }
      if (withGuides) {
        ctx.save();
        ctx.strokeStyle = 'rgba(251, 248, 243, 0.9)';
        ctx.lineWidth = 1.5 * (this.dpr || 1);
        ctx.setLineDash([6 * (this.dpr || 1), 5 * (this.dpr || 1)]);
        ctx.beginPath();
        quad.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
      return rect;
    }

    render() {
      if (!this.media || this.el('work').hidden) return;
      const live = this.media === this.video;
      const rect = this.compose(this.ctx, this.layer, this.canvas.width, this.canvas.height, live ? GRID_LIVE : GRID_STILL, true);
      if (!rect) return;
      const dpr = this.dpr || 1;
      this.quadIn(rect).forEach(([x, y], i) => {
        this.handles[i].style.left = `${x / dpr}px`;
        this.handles[i].style.top = `${y / dpr}px`;
      });
    }

    /* ---------- Coins déplaçables (souris, doigt, clavier) ---------- */
    bindHandle(handle, i) {
      const move = (clientX, clientY) => {
        const stageRect = this.stage.getBoundingClientRect();
        const dpr = this.dpr || 1;
        const rect = this.mediaRect(this.canvas.width, this.canvas.height);
        if (!rect) return;
        const x = (clientX - stageRect.left) * dpr;
        const y = (clientY - stageRect.top) * dpr;
        const nx = Math.min(1.1, Math.max(-0.1, (x - rect.x) / rect.w));
        const ny = Math.min(1.1, Math.max(-0.1, (y - rect.y) / rect.h));
        this.quad[i] = [nx, ny];
        if (this.media !== this.video) this.render();
      };
      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        handle.setPointerCapture(event.pointerId);
        handle.classList.add('is-dragging');
      });
      handle.addEventListener('pointermove', (event) => {
        if (handle.hasPointerCapture(event.pointerId)) move(event.clientX, event.clientY);
      });
      const end = (event) => {
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
        handle.classList.remove('is-dragging');
      };
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
      handle.addEventListener('keydown', (event) => {
        const step = event.shiftKey ? 0.02 : 0.005;
        const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
        if (!delta) return;
        event.preventDefault();
        this.quad[i] = [this.quad[i][0] + delta[0], this.quad[i][1] + delta[1]];
        this.render();
      });
    }

    /* ---------- Enregistrer et partager ---------- */
    async exportBlob() {
      if (this.media === this.video) this.freeze();
      const size = this.mediaSize();
      if (!size) return null;
      const scale = Math.min(1, EXPORT_MAX / Math.max(size.w, size.h));
      const out = document.createElement('canvas');
      out.width = Math.round(size.w * scale);
      out.height = Math.round(size.h * scale);
      const layer = document.createElement('canvas');
      layer.width = out.width;
      layer.height = out.height;
      // Le motif choisi en dernier, même s'il finit à peine de se charger.
      if (this.visuelPromise) this.visuel = (await this.visuelPromise.catch(() => null)) || this.visuel;
      this.compose(out.getContext('2d'), layer, out.width, out.height, GRID_STILL, false);
      return canvasToBlob(out, 'image/jpeg', 0.9);
    }

    fileName() {
      return `belle-saison-${this.dialog.dataset.handle || 'papier-peint'}.jpg`;
    }

    async save() {
      const blob = await this.exportBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.fileName();
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      this.el('hint').textContent = this.strings.saved;
    }

    async share() {
      const blob = await this.exportBlob();
      if (!blob) return;
      const file = new File([blob], this.fileName(), { type: 'image/jpeg' });
      const text = this.strings.shareText.replace('[title]', this.dialog.dataset.title);
      const data = { files: [file], title: this.dialog.dataset.title, text: `${text} ${this.dialog.dataset.shareUrl}` };
      try {
        if (navigator.canShare?.(data)) await navigator.share(data);
        else await navigator.share({ title: data.title, text: data.text, url: this.dialog.dataset.shareUrl });
      } catch (error) {
        /* partage annulé par le client */
      }
    }

    /* ---------- Réalité augmentée ---------- */
    async prepareAR() {
      if (this.arChecked) return;
      this.arChecked = true;
      if (!(await supportsAR())) return;
      const panel = this.el('ar');
      const button = this.el('ar-button');
      const label = this.el('ar-label');
      const idleLabel = label.textContent;
      label.textContent = this.strings.arLoading;
      panel.hidden = false;
      try {
        await loadModelViewer(this.dialog.dataset.modelViewerSrc);
        this.visuel ||= await this.visuelPromise;
        const viewer = document.createElement('model-viewer');
        viewer.setAttribute('alt', this.dialog.dataset.title);
        viewer.setAttribute('ar', '');
        viewer.setAttribute('ar-modes', 'webxr quick-look');
        viewer.setAttribute('ar-placement', 'wall');
        viewer.setAttribute('ar-scale', 'fixed');
        viewer.setAttribute('camera-controls', '');
        viewer.setAttribute('disable-zoom', '');
        viewer.setAttribute('interaction-prompt', 'none');
        viewer.setAttribute('shadow-intensity', '0');
        viewer.setAttribute('camera-orbit', '-20deg 80deg auto');
        viewer.addEventListener('load', () => {
          button.disabled = !viewer.canActivateAR;
          label.textContent = idleLabel;
          if (!viewer.canActivateAR) panel.hidden = true;
        });
        this.el('preview').append(viewer);
        this.viewer = viewer;
        await this.updateModel();
        button.addEventListener('click', () => viewer.activateAR());
      } catch (error) {
        panel.hidden = true;
      }
    }

    scheduleModelUpdate() {
      if (!this.viewer) return;
      clearTimeout(this.modelTimer);
      this.modelTimer = setTimeout(() => this.updateModel(), 500);
    }

    async updateModel() {
      if (!this.viewer || !this.visuel) return;
      const wall = this.wallCm();
      const texture = buildWallTexture(this.visuel, wall, this.tileCm, 1536);
      const jpeg = await canvasToBlob(texture, 'image/jpeg', 0.86);
      const glb = buildGlb(new Uint8Array(await jpeg.arrayBuffer()), wall.width / 100, wall.height / 100);
      const url = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
      if (this.modelUrl) URL.revokeObjectURL(this.modelUrl);
      this.modelUrl = url;
      this.viewer.src = url;
    }
  }

  const instances = new WeakMap();
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-simulator-open]');
    if (!opener) return;
    const dialog = document.getElementById(opener.dataset.simulatorOpen);
    if (!dialog || typeof dialog.showModal !== 'function') return;
    if (!instances.has(dialog)) instances.set(dialog, new WallSimulator(dialog));
    instances.get(dialog).open();
  });

  // Exposé pour les tests de l'aperçu local.
  window.BelleSaisonSimulator = { homography, project, buildGlb, buildWallTexture };
})();
