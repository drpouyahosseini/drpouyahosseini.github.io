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
    copyStatus.textContent = 'Link copied.';
  } catch {
    shareInput.select();
    copyStatus.textContent = 'Select and copy the link above.';
  }
});
document.querySelector('#close-share').addEventListener('click', () => shareDialog.close());
