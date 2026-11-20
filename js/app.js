/**
 * NefroCalc — avvio, navigazione e viste principali (home e calcolatore).
 * Navigazione con hash: '' home · #c-<id> calcolatore · #info · #formule · #f-<id> formula.
 */
import * as S from './session.js';
import * as P from './prefs.js';
import {F, SESSION_FIELDS} from './fields.js';
import {fieldHtml, bindFields, readValues, resultsHtml, confirmDialog, toast, copyText, esc} from './ui.js';
import {CALCS as A1} from './calc/idroelettrolitico.js';
import {CALCS as A2} from './calc/renale.js';
import {CALCS as A3} from './calc/trapianto.js';
import {CALCS as A4} from './calc/vasculiti.js';
import {renderInfo} from './pages/info.js';
import {renderFormule} from './pages/formule.js';

/** Aree cliniche con il colore usato in home, calcolatori e formule. */
const AREAS = [
  {id: 'idro', name: 'Bilancio idro-elettrolitico e acido-base', color: '--a1'},
  {id: 'renale', name: 'Funzione renale', color: '--a2'},
  {id: 'trapianto', name: 'Trapianto renale', color: '--a3'},
  {id: 'vasculiti', name: 'Vasculiti e glomerulonefriti', color: '--a4'}
];
const CALCS = [...A1, ...A2, ...A3, ...A4];
const BY_ID = Object.fromEntries(CALCS.map(c => [c.id, c]));
const AREA = Object.fromEntries(AREAS.map(a => [a.id, a]));

const main = document.getElementById('main');
let navigated = false; // true dopo la prima navigazione interna: il tasto indietro può usare la cronologia
let homeQuery = '';    // testo di ricerca della home, solo in memoria

/** Crea un contenitore nuovo per la vista (così i listener della vista precedente spariscono). */
function freshView() {
  main.innerHTML = '';
  const v = document.createElement('div');
  v.className = 'view';
  main.appendChild(v);
  return v;
}

/** Aggiorna il badge del pulsante Reset con il numero di dati in sessione. */
function updateBadge() {
  const n = S.count(), b = document.getElementById('reset-n');
  b.textContent = n ? String(n) : '';
  b.hidden = !n;
}

/* ================= Home ================= */

/** Disegna la home: dati base di sessione, ricerca e calcolatori per area. */
function homeView() {
  const v = freshView();
  v.innerHTML = `<section class="block session">
      <h2>Dati base di sessione</h2>
      <p class="hint">Precompilano tutti i calcolatori. Restano solo in memoria fino al Reset.</p>
      <div class="grid">${SESSION_FIELDS.map(f => fieldHtml(f)).join('')}</div>
    </section>
    <div class="search"><input type="search" id="q" placeholder="Cerca: FENa, KFRE, BVAS, sodio…" aria-label="Cerca un calcolatore" autocomplete="off" value="${esc(homeQuery)}"></div>
    <div id="areas"></div>`;
  bindFields(v.querySelector('.session'), updateBadge);
  const draw = () => {
    const q = homeQuery.trim().toLowerCase();
    const match = c => !q || `${c.code} ${c.name} ${c.short}`.toLowerCase().includes(q);
    v.querySelector('#areas').innerHTML = AREAS.map(a => {
      const list = CALCS.filter(c => c.area === a.id && match(c));
      if (!list.length) return '';
      return `<section class="area" style="--ac:var(${a.color})"><h2><span class="dot"></span>${esc(a.name)}</h2>
        <div class="list">${list.map(c => `<a class="calc" href="#c-${c.id}"><span class="code">${c.code}</span>
          <span class="t"><b>${esc(c.name)}</b><small>${esc(c.short)}</small></span><span class="chev" aria-hidden="true">${c.link ? '↗' : '›'}</span></a>`).join('')}</div></section>`;
    }).join('') || '<p class="empty">Nessun calcolatore corrisponde alla ricerca.</p>';
  };
  v.querySelector('#q').addEventListener('input', e => { homeQuery = e.target.value; draw(); });
  draw();
}

/* ================= Calcolatore ================= */

/**
 * Disegna un calcolatore: campi obbligatori, risultati, campi facoltativi, formule usate.
 * @param {object} c definizione del calcolatore
 */
function calcView(c) {
  const v = freshView();
  const a = AREA[c.area];
  v.style.setProperty('--ac', `var(${a.color})`);
  // Prima apertura del tapering: propongo la data di oggi
  const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  c.req.concat(c.opt).filter(f => f.type === 'date' && !S.get(f.key)).forEach(f => S.set(f.key, today));
  const x = c.extra ? S.getExtra(c.id, c.extra.init) : null;
  const extraBox = pos => c.extra && c.extra.pos === pos
    ? `<div class="extra">${c.extra.title ? `<h3>${esc(c.extra.title)}</h3>` : ''}<div id="extra-body"></div></div>` : '';
  const optOpen = c.opt.some(f => S.get(f.key) != null);
  v.innerHTML = `<header class="chead"><span class="code">${c.code} · ${esc(a.name)}</span><h1>${esc(c.name)}</h1><p>${esc(c.short)}</p></header>
    ${c.req.length || (c.extra && c.extra.pos === 'req') ? `<section class="block" id="req"><h2>Dati obbligatori</h2>
      ${c.reqNote ? `<p class="hint">${esc(c.reqNote)}</p>` : ''}
      ${c.req.length ? `<div class="grid">${c.req.map(f => fieldHtml(f)).join('')}</div>` : ''}${extraBox('req')}</section>` : ''}
    <section class="block results"><h2>${c.link ? 'Calcolatore esterno' : 'Risultati'}</h2><div id="res" aria-live="polite"></div></section>
    ${c.opt.length || (c.extra && c.extra.pos === 'opt') ? `<details class="block opt" ${optOpen ? 'open' : ''}><summary><h2>Dati facoltativi</h2><span class="hint">affinano il risultato o attivano calcoli aggiuntivi</span></summary>
      ${c.opt.length ? `<div class="grid">${c.opt.map(f => fieldHtml(f)).join('')}</div>` : ''}${extraBox('opt')}</details>` : ''}
    <p class="used"><a href="#formule">Tutte le formule di riferimento</a></p>`;
  const res = v.querySelector('#res');

  /** Ricalcola e ridisegna i risultati. */
  const refresh = () => {
    const vals = readValues();
    if (c.extra && c.extra.sync && c.extra.sync(x, vals)) drawExtra();
    res.innerHTML = resultsHtml(c.compute(vals, x));
    updateBadge();
  };
  /** Ridisegna l'editor strutturato (BVAS, righe, regole). */
  const drawExtra = () => {
    const body = v.querySelector('#extra-body');
    if (body) body.innerHTML = c.extra.html(x);
  };
  if (c.extra) {
    c.extra.sync && c.extra.sync(x, readValues());
    drawExtra();
    c.extra.bind(v.querySelector('#extra-body'), x, refresh, drawExtra);
  }
  bindFields(v, refresh);
  refresh();
}

/* ================= Navigazione ================= */

/** Mostra la vista corrispondente all'hash corrente. */
function route() {
  const h = location.hash.slice(1);
  const home = !h || (h.startsWith('c-') && !BY_ID[h.slice(2)]);
  document.getElementById('back').hidden = home;
  if (h.startsWith('c-') && BY_ID[h.slice(2)]) calcView(BY_ID[h.slice(2)]);
  else if (h === 'info') renderInfo(freshView());
  else if (h === 'formule' || h.startsWith('f-')) renderFormule(freshView(), AREAS, h.startsWith('f-') ? h.slice(2) : null);
  else homeView();
  if (!h.startsWith('f-')) window.scrollTo(0, 0);
  updateBadge();
}

document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (a) navigated = true;
  const cp = e.target.closest('[data-copy]');
  if (cp) copyText(cp.dataset.copy);
});

document.getElementById('back').addEventListener('click', () => {
  if (navigated && history.length > 1) history.back(); else location.hash = '';
});

document.getElementById('reset').addEventListener('click', async () => {
  if (!S.hasData()) { toast('Nessun dato da azzerare'); return; }
  const ok = await confirmDialog({title: 'Azzerare la sessione?', text: 'Vuoi azzerare tutti i dati inseriti nella sessione corrente? Campi e risultati torneranno vuoti.',
    ok: 'Conferma reset', cancel: 'Annulla', danger: true});
  if (ok) S.clear();
});

S.onReset(() => { homeQuery = ''; route(); toast('Sessione azzerata'); });
S.initPrivacy(() => toast('Dati azzerati dopo 15 minuti in background'));
window.addEventListener('hashchange', route);
P.applyTheme();
route();

// Service worker per l'uso offline: solo su https e fuori dal sandbox di anteprima
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
