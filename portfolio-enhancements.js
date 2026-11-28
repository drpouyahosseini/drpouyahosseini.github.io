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
 const list=document.querySelector('.track-list');
 if(list){
  const tracks=[...list.querySelectorAll('.track')];
  const search=document.createElement('div');search.className='recording-search';
  const label=document.createElement('label');label.htmlFor='recording-query';label.textContent='Find a recording';
  const input=document.createElement('input');input.type='search';input.id='recording-query';input.placeholder='Search by title';
  const output=document.createElement('output');output.setAttribute('aria-live','polite');output.htmlFor='recording-query';
  function filter(){const term=input.value.trim().toLocaleLowerCase();let shown=0;for(const track of tracks){const match=track.firstElementChild.textContent.toLocaleLowerCase().includes(term);track.closest('li').hidden=!match;if(match)shown++;}output.textContent=shown?shown+' of '+tracks.length+' recordings':'No matching recordings';}
  search.append(label,input,output);list.querySelector('.list-heading').after(search);input.addEventListener('input',filter);filter();
 }
})();
