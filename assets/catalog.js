const search = document.querySelector('#tool-search');
const links = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('[data-tool]')];
const empty = document.querySelector('#empty');

function updateCatalog() {
  const requested = location.hash.slice(1) || 'theoretische-spielereien';
  const active = links.some(link => link.dataset.filter === requested) ? requested : 'alle';
  const query = search.value.trim().toLocaleLowerCase('de');
  for (const link of links) {
    if (link.dataset.filter === active) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
  let count = 0;
  for (const card of cards) {
    const categories = card.dataset.filters.split(' ');
    card.hidden = (active !== 'alle' && !categories.includes(active)) ||
      !card.textContent.toLocaleLowerCase('de').includes(query) &&
      !card.dataset.keywords.toLocaleLowerCase('de').includes(query);
    if (!card.hidden) count++;
  }
  document.querySelector('#result-count').textContent = `${count} ${count === 1 ? 'Werkzeug' : 'Werkzeuge'}`;
  empty.hidden = count !== 0;
  for (const group of document.querySelectorAll('[data-group]')) {
    group.hidden = ![...group.querySelectorAll('[data-tool]')].some(card => !card.hidden);
  }
}
window.addEventListener('hashchange', updateCatalog);
search.addEventListener('input', updateCatalog);
updateCatalog();
