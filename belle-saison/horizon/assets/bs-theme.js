/* Belle Saison dans Horizon : comportements des sections Belle Saison (copie de theme/assets/theme.js, configuration lue dans window.bsTheme). Aucune dépendance externe. */
(() => {
  const theme = window.bsTheme || { routes: {}, strings: {} };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WISHLIST_KEY = 'belle-saison:favoris';

  const formatMoney = (cents) =>
    new Intl.NumberFormat(theme.locale || 'fr', {
      style: 'currency',
      currency: theme.currency || 'EUR',
    }).format(cents / 100);

  const formatNumber = (value, digits = 2) =>
    new Intl.NumberFormat(theme.locale || 'fr', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(value);

  const fill = (template, values) =>
    Object.entries(values).reduce((text, [key, value]) => text.split(`[${key}]`).join(value), template || '');

  const parseDecimal = (value) => {
    const n = parseFloat(String(value || '').replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };

  /* ------------------------------------------------------------------
     Apparitions au défilement
     ------------------------------------------------------------------ */
  let revealObserver = null;
  const initReveal = (root = document) => {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('js-reveal');
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
      );
    }
    root.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => revealObserver.observe(el));
  };

  /* ------------------------------------------------------------------
     Menus, recherche, tiroirs (balises <details>)
     ------------------------------------------------------------------ */
  const closeDetails = (details) => {
    if (details && details.open) details.open = false;
  };

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document
      .querySelectorAll('[data-menu-drawer][open], [data-search][open], [data-dropdown][open], [data-facets-drawer][open]')
      .forEach((details) => {
        closeDetails(details);
        details.querySelector('summary')?.focus();
      });
  });

  document.addEventListener('click', (event) => {
    document.querySelectorAll('[data-dropdown][open], [data-search][open]').forEach((details) => {
      if (!details.contains(event.target)) closeDetails(details);
    });
    const drawer = document.querySelector('[data-menu-drawer][open]');
    if (drawer && !drawer.querySelector('.menu-drawer__panel').contains(event.target) && !drawer.querySelector('summary').contains(event.target)) {
      closeDetails(drawer);
    }
    const facets = event.target.closest('[data-facets-close]');
    if (facets) closeDetails(facets.closest('[data-facets-drawer]'));
  });

  document.addEventListener(
    'toggle',
    (event) => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement)) return;
      if (details.matches('[data-menu-drawer], [data-facets-drawer]')) {
        document.documentElement.style.overflow = details.open ? 'hidden' : '';
      }
      if (details.matches('[data-search]') && details.open) {
        details.querySelector('input[type="search"]')?.focus();
      }
      if (details.matches('[data-dropdown]') && details.open) {
        document.querySelectorAll('[data-dropdown][open]').forEach((other) => {
          if (other !== details) closeDetails(other);
        });
      }
    },
    true
  );

  /* ------------------------------------------------------------------
     Vidéos d'ambiance : lecture muette quand elles sont visibles,
     jamais automatique si le visiteur réduit les animations.
     ------------------------------------------------------------------ */
  const setVideoPaused = (container, paused) => container.classList.toggle('is-paused', paused);

  const playBackgroundVideo = (container) => {
    const video = container.querySelector('video');
    if (!video || container.dataset.userPaused === 'true') return;
    const slide = container.closest('[data-slide]');
    if (slide && !slide.classList.contains('is-active')) return;
    video.muted = true;
    video.playsInline = true;
    const attempt = video.play();
    if (attempt) attempt.catch(() => setVideoPaused(container, true));
  };

  const pauseBackgroundVideo = (container) => container.querySelector('video')?.pause();

  let videoObserver = null;
  const initBackgroundVideos = (root = document) => {
    root.querySelectorAll('[data-bg-video]').forEach((container) => {
      if (container.dataset.ready) return;
      const video = container.querySelector('video');
      if (!video) return;
      container.dataset.ready = 'true';
      video.addEventListener('play', () => setVideoPaused(container, false));
      video.addEventListener('pause', () => setVideoPaused(container, true));
      container.querySelector('[data-video-toggle]')?.addEventListener('click', () => {
        if (video.paused) {
          container.dataset.userPaused = 'false';
          playBackgroundVideo(container);
        } else {
          container.dataset.userPaused = 'true';
          video.pause();
        }
      });
      if (reduceMotion) {
        container.dataset.userPaused = 'true';
        return;
      }
      if (!('IntersectionObserver' in window)) {
        playBackgroundVideo(container);
        return;
      }
      if (!videoObserver) {
        videoObserver = new IntersectionObserver(
          (entries) =>
            entries.forEach((entry) =>
              entry.isIntersecting ? playBackgroundVideo(entry.target) : pauseBackgroundVideo(entry.target)
            ),
          { threshold: 0.25 }
        );
      }
      videoObserver.observe(container);
    });
  };

  /* ------------------------------------------------------------------
     Ouverture vidéo : la vidéo est créée après le chargement de la page,
     dans la taille adaptée à l'écran, sauf si le visiteur réduit les
     animations ou économise ses données. L'image de couverture reste en
     place tant que la vidéo ne joue pas, et si elle échoue.
     ------------------------------------------------------------------ */
  const saveData = () => {
    const connection = navigator.connection || {};
    return connection.saveData === true || /(^|-)2g$/.test(connection.effectiveType || '');
  };

  const pickSource = (container) => {
    const json = container.querySelector('[data-video-sources]');
    if (!json) return null;
    let sources;
    try {
      sources = JSON.parse(json.textContent);
    } catch (error) {
      return null;
    }
    const portrait = window.matchMedia('(max-width: 749px) and (orientation: portrait)').matches;
    const list = (portrait && sources.mobile.length ? sources.mobile : sources.desktop).filter((s) => s.url && s.width);
    if (!list.length) return null;
    const box = container.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    list.sort((a, b) => a.width - b.width);
    // Plus petite version assez nette pour couvrir la zone (object-fit: cover), sinon la plus grande.
    const boxRatio = box.width / Math.max(box.height, 1);
    const fits = list.find((s) =>
      s.width / s.height > boxRatio ? s.height >= box.height * ratio * 0.9 : s.width >= box.width * ratio * 0.9
    );
    return fits || list[list.length - 1];
  };

  const hydrateLazyVideos = (root = document) => {
    if (reduceMotion || saveData()) return;
    root.querySelectorAll('[data-lazy-video]:not([data-hydrated])').forEach((container) => {
      container.dataset.hydrated = 'true';
      const source = pickSource(container);
      if (!source) return;
      const video = document.createElement('video');
      video.className = 'bg-video__media video-hero__video';
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('aria-hidden', 'true');
      video.tabIndex = -1;
      video.src = source.url.startsWith('//') ? `https:${source.url}` : source.url;
      video.addEventListener('playing', () => container.classList.add('is-playing'), { once: true });
      video.addEventListener('error', () => {
        container.classList.remove('is-playing');
        video.remove();
      });
      container.querySelector('.media-toggle').before(video);
      initBackgroundVideos(container.parentElement);
    });
  };

  const scheduleLazyVideos = (root = document) => {
    const run = () => hydrateLazyVideos(root);
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });
  };

  /* ------------------------------------------------------------------
     Carrousel d'avis : défilement natif (glisser au doigt, molette),
     flèches pour avancer d'une carte ; flèches masquées si tout tient.
     ------------------------------------------------------------------ */
  const initCarousel = (root) => {
    if (root.dataset.ready) return;
    const track = root.querySelector('[data-carousel-track]');
    const prev = root.querySelector('[data-carousel-prev]');
    const next = root.querySelector('[data-carousel-next]');
    if (!track || !prev || !next) return;
    root.dataset.ready = 'true';
    const nav = prev.parentElement;
    const step = () => {
      const card = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      nav.hidden = max <= 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max - 2;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step() }));
    next.addEventListener('click', () => track.scrollBy({ left: step() }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  };

  /* ------------------------------------------------------------------
     Diaporama d'ouverture
     ------------------------------------------------------------------ */
  const initSlideshow = (root) => {
    const slides = [...root.querySelectorAll('[data-slide]')];
    if (slides.length < 2 || root.dataset.ready) return;
    root.dataset.ready = 'true';
    const dots = [...root.querySelectorAll('[data-slide-to]')];
    let index = 0;
    let timer = null;

    const show = (next) => {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        slide.querySelectorAll('a, button').forEach((el) => (el.tabIndex = active ? 0 : -1));
        const videoContainer = slide.querySelector('[data-bg-video]');
        if (videoContainer) {
          if (active && !reduceMotion) playBackgroundVideo(videoContainer);
          else pauseBackgroundVideo(videoContainer);
        }
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === index);
        if (i === index) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    };

    const stop = () => {
      clearInterval(timer);
      timer = null;
    };
    const start = () => {
      if (root.dataset.autoplay !== 'true' || reduceMotion) return;
      stop();
      timer = setInterval(() => show(index + 1), (parseInt(root.dataset.speed, 10) || 7) * 1000);
    };

    root.querySelector('[data-slide-prev]')?.addEventListener('click', () => {
      show(index - 1);
      start();
    });
    root.querySelector('[data-slide-next]')?.addEventListener('click', () => {
      show(index + 1);
      start();
    });
    dots.forEach((dot) =>
      dot.addEventListener('click', () => {
        show(parseInt(dot.dataset.slideTo, 10));
        start();
      })
    );
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('shopify:block:select', (event) => {
      const i = slides.indexOf(event.target.closest('[data-slide]'));
      if (i >= 0) show(i);
      stop();
    });
    show(0);
    start();
  };

  /* ------------------------------------------------------------------
     Vidéo dans une fenêtre
     ------------------------------------------------------------------ */
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-video-open]');
    if (opener) {
      const dialog = document.getElementById(opener.dataset.videoOpen);
      if (!dialog || typeof dialog.showModal !== 'function') return;
      const frame = dialog.querySelector('[data-video-frame]');
      frame.innerHTML = `<iframe src="${dialog.dataset.embedUrl}" title="${opener.textContent.trim()}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
      dialog.showModal();
      return;
    }
    const dialog = event.target.closest('.video-dialog');
    if (dialog && (event.target === dialog || event.target.closest('[data-video-close]'))) dialog.close();
  });

  document.addEventListener(
    'close',
    (event) => {
      if (event.target.matches?.('.video-dialog')) event.target.querySelector('[data-video-frame]').innerHTML = '';
    },
    true
  );

  /* ------------------------------------------------------------------
     Panier : compteur, notification, ajout sans rechargement
     ------------------------------------------------------------------ */
  let toastTimer = null;
  const showToast = (message, withLink = true) => {
    const toast = document.querySelector('[data-toast]');
    if (!toast) return;
    toast.querySelector('[data-toast-message]').textContent = message;
    toast.querySelector('.toast__link').hidden = !withLink;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 5000);
  };

  const refreshCartCount = async () => {
    try {
      const response = await fetch(`${theme.routes.cartUrl}.js`, { headers: { Accept: 'application/json' } });
      const cart = await response.json();
      document.querySelectorAll('[data-cart-count]').forEach((el) => {
        el.textContent = cart.item_count;
        el.hidden = cart.item_count === 0;
      });
    } catch (error) {
      /* Le compteur se mettra à jour au prochain chargement de page. */
    }
  };

  const addToCart = async (formData) => {
    // Horizon : l'icône et le tiroir du panier écoutent l'événement CartLinesUpdateEvent
    // (@shopify/events) ; la réponse contient le nouveau rendu des sections du panier.
    const sectionIds = [...document.querySelectorAll('cart-items-component[data-section-id]')].map((el) => el.dataset.sectionId);
    if (sectionIds.length) formData.append('sections', sectionIds.join(','));
    let events = null;
    try {
      events = await import('@shopify/events');
    } catch (error) {
      /* Hors d'Horizon : le panier se mettra à jour au prochain chargement de page. */
    }
    const quantity = Number(formData.get('quantity')) || 1;
    const deferred = events ? events.CartLinesUpdateEvent.createPromise() : null;
    if (deferred) {
      document.dispatchEvent(
        new events.CartLinesUpdateEvent({
          action: 'add',
          context: 'product',
          lines: [{ merchandiseId: String(formData.get('id')), quantity }],
          promise: deferred.promise,
        })
      );
    }
    try {
      const response = await fetch(`${theme.routes.cartAddUrl}.js`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.description || data.message || theme.strings.addError);
      if (deferred) {
        const cart = await (await fetch(`${theme.routes.cartUrl}.js`, { headers: { Accept: 'application/json' } })).json();
        deferred.resolve({
          cart: events.CartLinesUpdateEvent.createCartFromAjaxResponse(cart),
          detail: { items: cart.items, source: 'bs-product', itemCount: quantity, sections: data.sections, didError: false },
        });
      }
      return data;
    } catch (error) {
      if (deferred) deferred.reject(error);
      throw error;
    }
  };

  /* ------------------------------------------------------------------
     Fiche produit
     ------------------------------------------------------------------ */
  const initProduct = (root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    const json = root.querySelector('[data-product-json]');
    const variants = json ? JSON.parse(json.textContent).variants : [];
    const form = root.querySelector('[data-product-form]');
    if (!form) return;
    const saleMode = root.dataset.saleMode;
    const idInput = form.querySelector('[data-variant-id]');
    const addButton = form.querySelector('[data-add-button]');
    const errorBox = form.querySelector('[data-form-error]');
    const qtyInput = form.querySelector('[data-quantity-input]');
    const priceEl = root.querySelector('[data-price]');
    const compareEl = root.querySelector('[data-compare-price]');
    const perM2El = root.querySelector('[data-price-per-m2]');
    const configurator = root.querySelector('[data-configurator]');
    const calculator = root.querySelector('[data-calculator]');

    let current = variants.find((v) => String(v.id) === idInput.value) || variants.find((v) => !v.sample) || variants[0];
    let configValid = saleMode !== 'm2' || !configurator;

    const setButtonState = () => {
      if (!addButton || !current) return;
      const available = current.available;
      addButton.disabled = !available;
      addButton.textContent = available ? theme.strings.addToCart : theme.strings.soldOut;
    };

    const renderPerM2 = () => {
      if (!perM2El || !current) return;
      const area = (parseDecimal(perM2El.dataset.stripWidth) / 100) * parseDecimal(perM2El.dataset.rollLength);
      perM2El.textContent = area > 0 ? fill(theme.strings.perSquareMeter, { price: formatMoney(Math.round(current.price / area)) }) : '';
    };

    /* Sur mesure : largeur x hauteur -> surface facturée au m² entamé */
    const updateConfigurator = () => {
      if (!configurator || !current) return;
      const w = parseDecimal(configurator.querySelector('[data-wall-width]').value);
      const h = parseDecimal(configurator.querySelector('[data-wall-height]').value);
      const error = configurator.querySelector('[data-configurator-error]');
      const summary = configurator.querySelector('[data-configurator-summary]');
      const props = {
        width: configurator.querySelector('[data-property-width]'),
        height: configurator.querySelector('[data-property-height]'),
        area: configurator.querySelector('[data-property-area]'),
      };
      const limits = {
        minW: parseDecimal(configurator.dataset.minWidth) || 1,
        maxW: parseDecimal(configurator.dataset.maxWidth) || 5000,
        minH: parseDecimal(configurator.dataset.minHeight) || 1,
        maxH: parseDecimal(configurator.dataset.maxHeight) || 1000,
      };

      const filled = !Number.isNaN(w) && !Number.isNaN(h);
      const inRange = filled && w >= limits.minW && w <= limits.maxW && h >= limits.minH && h <= limits.maxH;
      configValid = inRange;

      if (!filled) {
        error.hidden = true;
        summary.hidden = true;
      } else if (!inRange) {
        error.textContent = fill(theme.strings.dimensionsRange, {
          min_width: limits.minW,
          max_width: limits.maxW,
          min_height: limits.minH,
          max_height: limits.maxH,
        });
        error.hidden = false;
        summary.hidden = true;
      } else {
        const area = (w * h) / 10000;
        const billed = Math.max(1, Math.ceil(area - 1e-9));
        error.hidden = true;
        summary.hidden = false;
        summary.querySelector('[data-area]').textContent = `${formatNumber(area)} m² (${billed} m² facturés)`;
        summary.querySelector('[data-total]').textContent = formatMoney(current.price * billed);
        if (qtyInput) qtyInput.value = billed;
        props.width.value = `${formatNumber(w, 1)} cm`;
        props.height.value = `${formatNumber(h, 1)} cm`;
        props.area.value = `${formatNumber(area)} m²`;
      }
      Object.values(props).forEach((input) => (input.disabled = !inRange));
      setButtonState();
    };

    /* Au rouleau : nombre de lés puis de rouleaux */
    const updateCalculator = () => {
      if (!calculator) return null;
      const result = calculator.querySelector('[data-calc-result]');
      const apply = calculator.querySelector('[data-calc-apply]');
      const width = parseDecimal(calculator.querySelector('[data-calc-width]').value);
      const height = parseDecimal(calculator.querySelector('[data-calc-height]').value);
      apply.hidden = true;
      if (!(width > 0) || !(height > 0)) {
        result.innerHTML = '';
        return null;
      }
      const stripWidth = parseDecimal(calculator.dataset.stripWidth) / 100;
      const rollLength = parseDecimal(calculator.dataset.rollLength);
      const repeat = (parseDecimal(calculator.dataset.repeat) || 0) / 100;
      const trim = (parseDecimal(calculator.dataset.trim) || 0) / 100;
      if (!(stripWidth > 0) || !(rollLength > 0)) {
        result.textContent = theme.strings.calcInvalid;
        return null;
      }
      const stripLength = height + repeat + trim;
      const perRoll = Math.floor(rollLength / stripLength);
      if (perRoll < 1) {
        result.textContent = theme.strings.calcTooHigh;
        return null;
      }
      const strips = Math.ceil(width / stripWidth - 1e-9);
      const rolls = Math.ceil(strips / perRoll);
      const label = fill(rolls > 1 ? theme.strings.rollsOther : theme.strings.rollsOne, { count: rolls });
      result.innerHTML = '';
      const strong = document.createElement('strong');
      strong.textContent = label;
      const detail = document.createElement('p');
      detail.textContent = fill(theme.strings.calcDetail, {
        strips,
        length: formatNumber(stripLength),
        per_roll: perRoll,
      });
      result.append(strong, detail);
      apply.textContent = fill(theme.strings.calcAdd, { count: label });
      apply.hidden = false;
      apply.dataset.rolls = rolls;
      return rolls;
    };

    const selectVariant = (variant) => {
      if (!variant) return;
      current = variant;
      idInput.value = variant.id;
      if (priceEl) priceEl.textContent = formatMoney(variant.price);
      if (compareEl) {
        compareEl.hidden = !(variant.compare_at_price > variant.price);
        compareEl.textContent = formatMoney(variant.compare_at_price);
      }
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
      if (variant.media_id) {
        const media = root.querySelector(`[data-media-id="${variant.media_id}"]`);
        media?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'start' });
      }
      renderPerM2();
      updateConfigurator();
      setButtonState();
    };

    root.querySelectorAll('[data-variant-radio]').forEach((radio) =>
      radio.addEventListener('change', () => selectVariant(variants.find((v) => String(v.id) === radio.value)))
    );

    configurator?.addEventListener('input', updateConfigurator);
    calculator?.addEventListener('input', updateCalculator);
    calculator?.querySelector('[data-calc-apply]').addEventListener('click', (event) => {
      if (qtyInput) qtyInput.value = event.currentTarget.dataset.rolls;
      form.requestSubmit();
    });

    root.querySelector('[data-quantity-minus]')?.addEventListener('click', () => {
      qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
    });
    root.querySelector('[data-quantity-plus]')?.addEventListener('click', () => {
      qtyInput.value = (parseInt(qtyInput.value, 10) || 0) + 1;
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!configValid) {
        const error = configurator.querySelector('[data-configurator-error]');
        if (error.hidden) {
          error.textContent = theme.strings.dimensionsRequired;
          error.hidden = false;
        }
        configurator.querySelector('[data-wall-width]').focus();
        return;
      }
      errorBox.hidden = true;
      addButton.disabled = true;
      addButton.setAttribute('aria-busy', 'true');
      try {
        await addToCart(new FormData(form));
        showToast(theme.strings.addedToCart);
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      } finally {
        addButton.removeAttribute('aria-busy');
        setButtonState();
      }
    });

    root.querySelector('[data-sample-add]')?.addEventListener('click', async (event) => {
      event.preventDefault();
      const link = event.currentTarget;
      if (link.getAttribute('aria-disabled') === 'true') return;
      const data = new FormData();
      data.append('id', link.dataset.sampleAdd);
      data.append('quantity', '1');
      link.setAttribute('aria-busy', 'true');
      try {
        await addToCart(data);
        showToast(theme.strings.addedToCart);
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      } finally {
        link.removeAttribute('aria-busy');
      }
    });

    /* Barre d'achat fixe : visible quand le bouton principal est passé au-dessus de l'écran */
    const sticky = root.querySelector('[data-product-sticky]');
    if (sticky && addButton && 'IntersectionObserver' in window) {
      const stickyButton = sticky.querySelector('[data-sticky-add]');
      const stickyPrice = sticky.querySelector('[data-sticky-price]');
      const show = (visible) => {
        sticky.classList.toggle('is-visible', visible);
        sticky.setAttribute('aria-hidden', String(!visible));
        stickyButton.tabIndex = visible ? 0 : -1;
        if (!visible) return;
        stickyButton.disabled = addButton.disabled;
        stickyButton.textContent = addButton.textContent;
        if (stickyPrice && priceEl) stickyPrice.textContent = priceEl.textContent;
      };
      // L'écran est prolongé vers le bas : le bouton n'en sort que par le haut, même après un défilement rapide.
      new IntersectionObserver(([entry]) => show(!entry.isIntersecting), { rootMargin: '0px 0px 100000px 0px' }).observe(addButton);
      stickyButton.addEventListener('click', () => {
        if (!addButton.disabled) form.requestSubmit(addButton);
      });
    }

    renderPerM2();
    updateConfigurator();
    setButtonState();
  };

  /* ------------------------------------------------------------------
     Recommandations
     ------------------------------------------------------------------ */
  const initRecommendations = async (root) => {
    if (root.dataset.ready || !root.dataset.url) return;
    root.dataset.ready = 'true';
    try {
      const response = await fetch(root.dataset.url);
      const html = await response.text();
      const fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-recommendations]');
      if (fresh && fresh.innerHTML.trim()) {
        root.innerHTML = fresh.innerHTML;
        syncWishlistButtons(root);
      }
    } catch (error) {
      /* Section facultative : rien à afficher en cas d'erreur réseau. */
    }
  };

  /* ------------------------------------------------------------------
     Filtres et tri, panier
     ------------------------------------------------------------------ */
  document.addEventListener('change', (event) => {
    if (event.target.matches('[data-sort]')) event.target.form.requestSubmit();
    if (event.target.matches('[data-cart-quantity]')) {
      const form = event.target.closest('[data-cart-form]');
      const update = document.createElement('input');
      update.type = 'hidden';
      update.name = 'update';
      update.value = '1';
      form.append(update);
      form.submit();
    }
  });

  /* ------------------------------------------------------------------
     Favoris (enregistrés dans le navigateur)
     ------------------------------------------------------------------ */
  const readWishlist = () => {
    try {
      return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
    } catch (error) {
      return [];
    }
  };

  const writeWishlist = (list) => {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
    } catch (error) {
      /* Stockage indisponible (navigation privée) : les favoris restent le temps de la page. */
    }
  };

  const syncWishlistButtons = (root = document) => {
    const list = readWishlist();
    root.querySelectorAll('[data-wishlist-toggle][data-handle]').forEach((button) => {
      const active = list.includes(button.dataset.handle);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-wishlist-count]').forEach((el) => {
      el.textContent = list.length;
      el.hidden = list.length === 0;
    });
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-wishlist-toggle]');
    if (!button) return;
    event.preventDefault();
    const handle = button.dataset.handle;
    if (!handle) return;
    const list = readWishlist();
    const next = list.includes(handle) ? list.filter((h) => h !== handle) : [...list, handle];
    writeWishlist(next);
    syncWishlistButtons();
    const favorites = button.closest('[data-favorites]');
    if (favorites && !next.includes(handle)) {
      button.closest('li')?.remove();
      favorites.querySelector('[data-favorites-empty]').hidden = next.length > 0;
    }
  });

  const initFavorites = async (root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    const grid = root.querySelector('[data-favorites-grid]');
    const empty = root.querySelector('[data-favorites-empty]');
    const template = root.querySelector('[data-favorites-template]');
    const list = readWishlist();
    if (list.length === 0) {
      empty.hidden = false;
      return;
    }
    const products = await Promise.all(
      list.map((handle) =>
        fetch(`${window.Shopify?.routes?.root || '/'}products/${encodeURIComponent(handle)}.js`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );
    const found = products.filter(Boolean);
    found.forEach((product) => {
      const node = template.content.cloneNode(true);
      node.querySelector('[data-fav-link]').href = product.url;
      const img = node.querySelector('[data-fav-image]');
      if (product.featured_image) {
        img.src = `${product.featured_image}${product.featured_image.includes('?') ? '&' : '?'}width=700`;
        img.alt = product.title;
      } else {
        img.remove();
      }
      node.querySelector('[data-fav-title]').textContent = product.title;
      node.querySelector('[data-wishlist-toggle]').dataset.handle = product.handle;
      grid.append(node);
    });
    writeWishlist(found.map((p) => p.handle));
    empty.hidden = found.length > 0;
    syncWishlistButtons();
  };

  /* ------------------------------------------------------------------
     Initialisation (et rechargement dans l'éditeur de thème)
     ------------------------------------------------------------------ */
  const init = (root = document) => {
    initReveal(root);
    initBackgroundVideos(root);
    scheduleLazyVideos(root);
    root.querySelectorAll('[data-slideshow]').forEach(initSlideshow);
    root.querySelectorAll('[data-carousel]').forEach(initCarousel);
    root.querySelectorAll('[data-product]').forEach(initProduct);
    root.querySelectorAll('[data-recommendations]').forEach(initRecommendations);
    root.querySelectorAll('[data-favorites]').forEach(initFavorites);
    syncWishlistButtons(root);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();

  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
