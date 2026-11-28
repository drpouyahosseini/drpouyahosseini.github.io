(() => {
  const root = document.querySelector('#bibliography');
  const query = document.querySelector('#publication-query');
  const yearSelect = document.querySelector('#publication-year');
  const kind = document.querySelector('#publication-kind');
  const count = document.querySelector('#publication-count');
  const reset = document.querySelector('#publication-reset');
  if (!root || !query || !yearSelect || !kind || !count || !reset) return;
  const groups = [...root.querySelectorAll('ol.bibliography')].map(list => ({list, heading: list.previousElementSibling, items: [...list.children]}));
  for (const {heading} of groups) yearSelect.add(new Option(heading.textContent, heading.textContent));
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().trim();
  function update() {
    const terms = normalize(query.value).split(/\s+/).filter(Boolean);
    let shown = 0, total = 0;
    for (const {list, heading, items} of groups) {
      let visible = 0;
      for (const item of items) {
        total++;
        const type = normalize(item.querySelector('.pub-kind')?.textContent || 'project article');
        const text = normalize(heading.textContent + ' ' + item.textContent + ' ' + (item.querySelector('a')?.href || ''));
        const matches = terms.every(term => text.includes(term)) && (!kind.value || type.startsWith(kind.value)) && (!yearSelect.value || heading.textContent === yearSelect.value);
        item.hidden = !matches;
        if (matches) { visible++; shown++; }
      }
      list.hidden = heading.hidden = !visible;
    }
    count.textContent = shown ? shown + ' of ' + total + ' records' : 'No matching publications. Try a different search or clear the filters.';
  }
  query.addEventListener('input', update);
  kind.addEventListener('change', update);
  yearSelect.addEventListener('change', update);
  reset.addEventListener('click', () => {query.value = kind.value = yearSelect.value = ''; update(); query.focus();});
  root.querySelector('.publication-controls').hidden = false;
  update();
})();
