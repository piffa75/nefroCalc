/**
 * Pagina "Formule di riferimento": generata dai metadati FORMULE di formulas.js,
 * così la documentazione resta allineata al codice dei calcoli.
 */
import {FORMULE} from '../formulas.js';
import {esc} from '../ui.js';

/**
 * Disegna la pagina delle formule raggruppate per area.
 * @param {HTMLElement} root contenitore della vista
 * @param {Array<{id:string,name:string}>} areas aree cliniche in ordine
 * @param {string|null} focus id della formula da mostrare (scroll e evidenza)
 */
export function renderFormule(root, areas, focus) {
  root.innerHTML = `<header class="chead"><span class="code">Trasparenza</span><h1>Formule di riferimento</h1>
    <p>Tutte le formule usate dai calcolatori, con parametri, unità e fonte originale.</p></header>
    <nav class="toc" aria-label="Indice delle formule">${areas.map(a => `<div><b>${esc(a.name)}</b>${FORMULE.filter(f => f.area === a.id)
      .map(f => `<a href="#f-${f.id}">${esc(f.name)}</a>`).join('')}</div>`).join('')}</nav>
    ${areas.map(a => `<section class="farea" style="--ac:var(${a.color})"><h2><span class="dot"></span>${esc(a.name)}</h2>
      ${FORMULE.filter(f => f.area === a.id).map(f => `<article class="formula ${f.id === focus ? 'focus' : ''}" id="f-${f.id}">
        <h3>${esc(f.name)}</h3><p class="use">${esc(f.use)}</p>
        <pre class="eq">${esc(f.eq)}</pre>
        ${f.params && f.params.length ? `<table class="tbl"><thead><tr><th>Parametro</th><th>Significato</th><th>Unità</th></tr></thead><tbody>${f.params
          .map(([s, m, u]) => `<tr><td>${esc(s)}</td><td>${esc(m)}</td><td class="nw">${esc(u)}</td></tr>`).join('')}</tbody></table>` : ''}
        ${f.notes ? `<p class="note">${esc(f.notes)}</p>` : ''}
        <p class="ref">${esc(f.ref)}</p></article>`).join('')}</section>`).join('')}`;
  if (focus) {
    const el = root.querySelector(`#f-${CSS.escape(focus)}`);
    if (el) requestAnimationFrame(() => el.scrollIntoView({block: 'start'}));
  }
}
