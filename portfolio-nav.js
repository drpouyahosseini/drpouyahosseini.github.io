// Keep the homepage audio element mounted while reading the CV in this tab.
const homeMain = document.querySelector('main');
const homeHero = document.querySelector('.hero');
const homeTitle = document.title;
const cvURL = new URL(document.querySelector('.nav-cv').href);
const homeURL = new URL(ui('./', 'index-de.html', 'index-fa.html'), location.href);
const cvLink = navigation.querySelector('.nav-cv');
const homeLinks = [...navigation.querySelectorAll('a[href^="#"]')];
const sectionsByLink = homeLinks.map(link => document.querySelector(link.hash));
const miniLink = mini.querySelector('a');
const cvStyles = document.querySelector('#cv-styles');
let cvContent;
let cvRequest;
let navigationVersion = 0;

async function prepareCV() {
  const response = await fetch(cvURL.pathname + '?v=20261121d');
  if (!response.ok) throw new Error('CV unavailable');
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  const hero = doc.querySelector('.cv-intro');
  const main = doc.querySelector('main');
  if (!hero || !main) throw new Error('Incomplete CV');
  main.id = 'cv-main';
  hero.hidden = main.hidden = true;
  homeHero.after(hero);
  homeMain.after(main);
  const script = document.createElement('script');
  script.src = 'cv.js';
  document.head.append(script);
  return { hero, main, title: doc.title };
}

function updateNav() {
  const onCV = document.body.classList.contains('cv-page');
  let active = onCV ? cvLink : null;
  if (!onCV) {
    sectionsByLink.forEach((section, index) => {
      if (section.getBoundingClientRect().top <= 120) active = homeLinks[index];
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) active = homeLinks.at(-1);
  }
  for (const link of [...homeLinks, cvLink]) {
    if (link === active) link.setAttribute('aria-current', onCV ? 'page' : 'location');
    else link.removeAttribute('aria-current');
  }
  menu.querySelector('span:last-child').textContent = active === cvLink ? ui('CV', 'Lebenslauf', 'رزومه') : active?.textContent || ui('Menu', 'Menü', 'فهرست');
}

async function navigatePortfolio(url, push) {
  const version = ++navigationVersion;
  const onCV = url.pathname === cvURL.pathname;
  if (onCV && !cvContent) {
    try {
      cvRequest ||= prepareCV();
      cvContent = await cvRequest;
    } catch {
      if (version === navigationVersion) location.assign(url);
      return;
    }
  }
  if (version !== navigationVersion) return;
  if (push && location.href !== url.href) history.pushState(null, '', url);
  updateLanguageLinks(onCV);
  homeHero.hidden = homeMain.hidden = onCV;
  if (cvContent) cvContent.hero.hidden = cvContent.main.hidden = !onCV;
  cvStyles.media = onCV ? 'all' : 'not all';
  document.body.classList.toggle('cv-page', onCV);
  document.title = onCV ? cvContent.title : homeTitle;
  document.querySelector('.skip').href = onCV ? '#cv-main' : '#main';
  document.querySelector('.brand').href = homeURL;
  homeLinks.forEach((link, index) => { link.href = homeURL.href + '#' + sectionsByLink[index].id; });
  miniLink.href = homeURL.href + '#recordings';
  setMenu(false);
  const target = document.getElementById(url.hash.slice(1)) || (onCV ? cvContent.hero : homeHero);
  if (url.hash) target.scrollIntoView();
  else window.scrollTo({top: 0, behavior: 'instant'});
  target.setAttribute('tabindex', '-1');
  target.focus({preventScroll: true});
  updateNav();
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || link.hasAttribute('download')) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin) {
    if (!player.paused && !link.target && /^https?:$/.test(url.protocol)) {
      link.target = '_blank';
      link.relList.add('noopener');
    }
    return;
  }
  if (link.target || ![cvURL.pathname, homeURL.pathname, siteLanguage === 'en' ? new URL('index.html', homeURL).pathname : homeURL.pathname].includes(url.pathname)) return;
  if (url.pathname === location.pathname && url.hash) return;
  event.preventDefault();
  navigatePortfolio(url, true);
});
window.addEventListener('popstate', () => navigatePortfolio(new URL(location.href), false));
let pendingFrame = false;
window.addEventListener('scroll', () => {
  if (!pendingFrame) {
    pendingFrame = true;
    requestAnimationFrame(() => { pendingFrame = false; updateNav(); });
  }
}, {passive:true});
updateNav();
