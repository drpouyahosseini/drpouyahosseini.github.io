const siteLanguage = document.documentElement.lang;
function ui(english, german, persian) {
  return ({de: german, fa: persian})[siteLanguage] || english;
}
function updateLanguageLinks(onCV) {
  for (const link of document.querySelectorAll('.language-links a')) {
    const lang = link.hreflang;
    const suffix = lang === 'en' ? '' : '-' + lang;
    const hash = location.hash;
    link.href = (onCV ? 'cv' + suffix + '.html' : suffix ? 'index' + suffix + '.html' : './') + hash;
  }
}
updateLanguageLinks(document.body.classList.contains('cv-page'));
window.addEventListener('hashchange', () => updateLanguageLinks(document.body.classList.contains('cv-page')));
const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');
const smallScreen = window.matchMedia('(max-width: 46rem)');

function setMenu(open) {
  menu.setAttribute('aria-expanded', String(open));
  navigation.hidden = smallScreen.matches && !open;
}

function fitMenu() {
  menu.hidden = !smallScreen.matches;
  setMenu(false);
}

menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
navigation.addEventListener('click', event => {
  if (smallScreen.matches && event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menu.focus();
  }
});
smallScreen.addEventListener('change', fitMenu);
fitMenu();


const shareButton = document.querySelector('.share-page');
const shareDialog = document.querySelector('#share-dialog');
const shareInput = document.querySelector('#share-url');
const copyStatus = document.querySelector('#copy-status');
shareButton.hidden = false;
shareButton.addEventListener('click', async () => {
  const url = location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, url });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  shareInput.value = url;
  copyStatus.textContent = '';
  shareDialog.showModal();
  shareInput.select();
});
document.querySelector('#copy-url').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shareInput.value);
    copyStatus.textContent = ui('Link copied.', 'Link kopiert.', 'پیوند کپی شد.');
  } catch {
    shareInput.select();
    copyStatus.textContent = ui('Select and copy the link above.', 'Den obigen Link auswählen und kopieren.', 'پیوند بالا را انتخاب و کپی کنید.');
  }
});
document.querySelector('#close-share').addEventListener('click', () => shareDialog.close());

const figureLink = document.querySelector('#view-catalyst');
const figureViewer = document.querySelector('#figure-viewer');
if (figureLink && figureViewer?.showModal) {
  figureLink.setAttribute('aria-haspopup', 'dialog');
  figureLink.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    figureViewer.showModal();
  });
  figureViewer.addEventListener('click', event => {
    if (event.target !== figureViewer) return;
    const box = figureViewer.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right ||
        event.clientY < box.top || event.clientY > box.bottom) figureViewer.close();
  });
  figureViewer.addEventListener('close', () => figureLink.focus({ preventScroll: true }));
}

if ('IntersectionObserver' in window) {
  const revealSelector = '.section-heading, .method-link, .catalyst-figure, .project-card, .cv-section > h2';
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('entered-view');
      observer.unobserve(entry.target);
    }
  });
  const observeSections = root => root.querySelectorAll(revealSelector).forEach(el => observer.observe(el));
  observeSections(document);
  // The CV can be inserted while the homepage audio player stays mounted.
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeName === 'MAIN') observeSections(node);
      }
    }
  }).observe(document.querySelector('main').parentNode, {childList:true});
}

const portrait = document.querySelector('.hero-art .portrait');
if (portrait) {
  const images = [...portrait.querySelectorAll('img')];
  let active = 0;
  const toggle = portrait.querySelector('.portrait-toggle');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let cycling = !motion.matches;
  let timer;
  function schedulePortrait() {
    clearInterval(timer);
    toggle.hidden = false;
    toggle.textContent = cycling ? 'Ⅱ' : '▶';
    toggle.setAttribute('aria-label', cycling ? ui('Pause portrait slideshow', 'Porträtwechsel anhalten', 'توقف نمایش پیاپی پرتره\u200cها') : ui('Play portrait slideshow', 'Porträts abspielen', 'پخش پیاپی پرتره\u200cها'));
    if (cycling && !document.hidden) {
      timer = setInterval(() => {
        images[active].classList.remove('is-visible');
        images[active].setAttribute('aria-hidden', 'true');
        active = (active + 1) % images.length;
        images[active].classList.add('is-visible');
        images[active].removeAttribute('aria-hidden');
      }, 9500);
    }
  }
  Promise.all(images.map(image => image.decode())).then(() => {
    schedulePortrait();
    toggle.addEventListener('click', () => {cycling = !cycling; schedulePortrait();});
    motion.addEventListener('change', () => {cycling = !motion.matches; schedulePortrait();});
    document.addEventListener('visibilitychange', schedulePortrait);
  }).catch(() => {});
}
