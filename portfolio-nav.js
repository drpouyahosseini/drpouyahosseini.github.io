// Same-origin portfolio navigation: the recording audio and mini-player never leave the DOM.
(() => {
  const recording = window.portfolioRecording;
  if (!recording) return;
  const { audio, mini } = recording;
  const allowed = new Set(['/', '/index.html', '/research.html', '/publications.html',
    '/projects.html', '/music.html', '/about.html', '/cv.html', '/legal.html']);
  const path = url => url.pathname === '/index.html' ? '/' : url.pathname;
  let displayed = path(location), requestId = 0, pending, viewEvents;
  const stylesheetKey = link => new URL(link.href, location.href).pathname;
  const cache = new Map();
  function openAnchor(hash) {
    if (!hash) return null;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return null; }
    const target = document.getElementById(id);
    if (!target) return null;
    for (let node = target; node; node = node.parentElement) {
      if (node.tagName === 'DETAILS') node.open = true;
    }
    return target;
  }
  function showError() {
    let notice = document.querySelector('.portfolio-route-error');
    if (!notice) {
      notice = document.createElement('p');
      notice.className = 'portfolio-route-error'; notice.setAttribute('role', 'status');
      document.querySelector('main')?.prepend(notice);
    }
    notice.textContent = 'This page could not be loaded. Please try the link again. Your recording is still available.';
  }
  async function load(url, signal) {
    const key = path(url);
    if (cache.has(key)) return cache.get(key);
    const response = await fetch(url.pathname, { signal, credentials: 'same-origin' });
    if (!response.ok) throw Error('Page unavailable');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (!doc.querySelector('main') || !doc.querySelector('.nav-band')) throw Error('Incomplete page');
    cache.set(key, doc);
    return doc;
  }
  function applyHead(doc, url) {
    document.title = doc.title;
    const canonical = document.querySelector('link[rel=canonical]');
    const destinationCanonical = doc.querySelector('link[rel=canonical]');
    if (canonical) canonical.href = destinationCanonical?.getAttribute('href') || url.origin + url.pathname;
    for (const prop of ['description', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'twitter:title', 'twitter:description', 'twitter:image']) {
      const selector = 'meta[' + (prop.startsWith('og:') ? 'property' : 'name') + '="' + prop + '"]';
      const next = doc.querySelector(selector);
      const old = document.querySelector(selector);
      if (old && next) old.content = next.content;
    }
    // Preserve the newest shared CSS already loaded; switch page-specific styles by pathname.
    const wanted = new Map([...doc.querySelectorAll('link[rel=stylesheet]')].map(link => [stylesheetKey(link), link]));
    const active = new Map([...document.querySelectorAll('link[rel=stylesheet]')].map(link => [stylesheetKey(link), link]));
    for (const [key, link] of active) {
      link.media = wanted.has(key) ? wanted.get(key).media || 'all' : 'not all';
    }
    for (const [key, link] of wanted) if (!active.has(key)) document.head.append(document.importNode(link, true));
  }
  function initView() {
    viewEvents?.abort();
    viewEvents = new AbortController();
    const options = { signal: viewEvents.signal };
    const menu = document.querySelector('.menu-toggle, .standalone-toggle');
    const nav = document.querySelector('.site-nav');
    if (menu && nav) {
      const narrow = matchMedia('(max-width:46rem)');
      function setMenu(open) {
        menu.setAttribute('aria-expanded', String(open));
        nav.hidden = narrow.matches && !open;
      }
      const fit = () => { menu.hidden = !narrow.matches; setMenu(false); };
      fit();
      menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'), options);
      nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); }, options);
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); } }, options);
      narrow.addEventListener('change', fit, options);
    }
    const share = document.querySelector('.share-page'), dialog = document.querySelector('#share-dialog');
    if (share && dialog) {
      const input = dialog.querySelector('#share-url'), status = dialog.querySelector('#copy-status');
      share.hidden = false;
      share.addEventListener('click', async () => {
        if (navigator.share) {
          try { await navigator.share({ title: document.title, url: location.href }); return; }
          catch (e) { if (e.name === 'AbortError') return; }
        }
        input.value = location.href; status.textContent = ''; dialog.showModal(); input.select();
      }, options);
      dialog.querySelector('#copy-url')?.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(input.value); status.textContent = 'Link copied.'; }
        catch { input.select(); status.textContent = 'Select and copy the link above.'; }
      }, options);
      dialog.querySelector('#close-share')?.addEventListener('click', () => dialog.close(), options);
    }
    const figure = document.querySelector('#view-catalyst'), viewer = document.querySelector('#figure-viewer');
    if (figure && viewer?.showModal) {
      figure.setAttribute('aria-haspopup', 'dialog');
      figure.addEventListener('click', e => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault(); viewer.showModal();
      }, options);
      viewer.addEventListener('close', () => figure.focus({preventScroll:true}), options);
      viewer.addEventListener('click', e => {
        if (e.target !== viewer) return;
        const box = viewer.getBoundingClientRect();
        if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) viewer.close();
      }, options);
    }
    const print = document.querySelector('#print-cv');
    if (print) { print.hidden = false; print.addEventListener('click', () => window.print(), options); }
    const index = document.querySelector('.cv-index');
    if (index) {
      const compact = matchMedia('(max-width:48rem)');
      const links = [...index.querySelectorAll('nav a')];
      const fit = () => { index.open = !compact.matches; };
      const update = () => {
        let active = links[0];
        for (const link of links) {
          const section = document.getElementById(link.hash.slice(1));
          if (section && section.getBoundingClientRect().top <= Math.min(160, innerHeight * .23)) active = link;
        }
        if (Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1) active = links.at(-1);
        for (const link of links) { if (link === active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current'); }
      };
      fit(); update();
      compact.addEventListener('change', fit, options);
      index.addEventListener('click', e => { if (compact.matches && e.target.closest('a')) index.open = false; }, options);
      window.addEventListener('scroll', update, { ...options, passive: true });
    }
  }
  function updateHomeNav() {
    if (displayed !== '/') return;
    const nav = document.querySelector('#site-nav');
    if (!nav) return;
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    let active;
    for (const link of links) {
      const section = document.getElementById(link.hash.slice(1));
      if (section?.getBoundingClientRect().top <= 120) active = link;
    }
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) active = links.at(-1);
    for (const link of links) { if (link === active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current'); }
    const text = document.querySelector('.menu-toggle span:last-child');
    if (text) text.textContent = active?.textContent || 'Menu';
  }
  function swap(doc, url) {
    const fragment = document.createDocumentFragment();
    for (const node of doc.body.children) {
      if (node.matches('script, .mini-player, #persistent-recording-audio')) continue;
      fragment.append(document.importNode(node, true));
    }
    // Never call replaceChildren on the body: it would detach the live audio element.
    for (const node of [...document.body.childNodes]) if (node !== audio && node !== mini) node.remove();
    document.body.className = doc.body.className;
    document.body.id = doc.body.id || 'top';
    document.body.insertBefore(fragment, audio);
    displayed = path(url);
    applyHead(doc, url);
    initView();
    recording.mount();
  }
  function position(url, restore) {
    const target = openAnchor(url.hash);
    if (target) target.scrollIntoView({behavior:'instant', block:'start'});
    else window.scrollTo({top: restore ?? 0, behavior:'instant'});
    if (target && !target.matches('a,button,input,summary')) {
      target.setAttribute('tabindex','-1'); target.focus({preventScroll:true});
    }
    updateHomeNav();
  }
  async function navigate(url, push, restore) {
    const id = ++requestId;
    pending?.abort();
    pending = new AbortController();
    try {
      if (path(url) === displayed) {
        if (push && url.href !== location.href) {
          history.replaceState({...history.state, portfolioScroll: scrollY}, '', location.href);
          history.pushState({portfolioScroll: 0}, '', url.href);
        }
        position(url, restore); return;
      }
      const doc = await load(url, pending.signal);
      if (id !== requestId) return;
      if (push) {
        history.replaceState({...history.state, portfolioScroll: scrollY}, '', location.href);
        history.pushState({portfolioScroll: 0}, '', url.href);
      }
      swap(doc, url);
      position(url, restore);
    } catch (error) {
      if (id === requestId && error.name !== 'AbortError') showError();
    }
  }
  document.addEventListener('click', e => {
    const link = e.target.closest?.('a[href]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || !allowed.has(url.pathname)) return;
    if (path(url) === displayed && url.pathname === location.pathname && url.hash) {
      // Preserve native same-page anchors; also allow inbound links to closed disclosures.
      ++requestId; pending?.abort(); openAnchor(url.hash); return;
    }
    e.preventDefault();
    navigate(url, true);
  });
  window.addEventListener('popstate', e => {
    const url = new URL(location.href);
    if (path(url) === displayed) {
      ++requestId; pending?.abort();
      openAnchor(url.hash);
      // The browser restores scroll for native same-page history.
      return;
    }
    navigate(url, false, e.state?.portfolioScroll);
  });
  window.addEventListener('hashchange', () => openAnchor(location.hash));
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true; requestAnimationFrame(() => { scheduled = false; updateHomeNav(); });
    }
  }, {passive:true});
  openAnchor(location.hash);
  updateHomeNav();
})();
