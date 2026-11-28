(() => {
 const toggle=document.querySelector('.standalone-toggle'), nav=document.querySelector('#standalone-menu');
 if(toggle && nav){
  const narrow=matchMedia('(max-width:46rem)');
  function setOpen(open){toggle.setAttribute('aria-expanded',String(open));nav.hidden=narrow.matches&&!open;}
  function fit(){toggle.hidden=!narrow.matches;setOpen(false);}
  toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setOpen(false);toggle.focus();}});
  if(narrow.addEventListener)narrow.addEventListener('change',fit);else narrow.addListener(fit);
  fit();
 }
})();

(() => {
  function revealLinkedPublication() {
    if (!location.hash) return;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    let opened = false;
    for (let node = target; node; node = node.parentElement) {
      if (node.tagName === 'DETAILS' && !node.open) { node.open = true; opened = true; }
    }
    if (opened) requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
  }
  revealLinkedPublication();
  window.addEventListener('hashchange', revealLinkedPublication);
})();
