/**
 * NefroCalc — componenti di interfaccia: campi, risultati, dialog di conferma, avvisi.
 */
import * as S from './session.js';
import {F} from './fields.js';

/**
 * Formatta un numero all'italiana con decimali fissi.
 * @param {number} x valore
 * @param {number} [d=1] decimali
 * @returns {string} numero formattato o trattino se non valido
 */
export function fmt(x, d = 1) {
  return Number.isFinite(x) ? x.toLocaleString('it-IT', {minimumFractionDigits: d, maximumFractionDigits: d}) : '—';
}

/**
 * Converte il testo digitato in numero, accettando virgola o punto.
 * @param {string} s testo
 * @returns {number} numero o NaN
 */
export function parseNum(s) {
  if (s == null) return NaN;
  const t = String(s).trim().replace(',', '.');
  return t === '' || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(t) ? NaN : Number(t);
}

/**
 * Escapa il testo da inserire in HTML.
 * @param {*} s testo
 * @returns {string} testo sicuro
 */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}

/**
 * Legge tutti i valori di sessione convertiti nel tipo giusto.
 * I numeri non validi o non positivi (dove servono positivi) diventano undefined.
 * @returns {object} chiave → numero o stringa
 */
export function readValues() {
  const v = {};
  Object.values(F).forEach(f => {
    const raw = S.get(f.key);
    if (raw == null) return;
    if (f.type && f.type !== 'num') { v[f.key] = raw; return; }
    const n = parseNum(raw);
    if (Number.isFinite(n) && (n > 0 || (f.range && f.range[0] <= 0 && n >= 0))) v[f.key] = n;
  });
  return v;
}

/**
 * Elenca le etichette dei campi obbligatori mancanti.
 * @param {object} v valori letti
 * @param {Array<object>} fields campi obbligatori
 * @returns {string[]} etichette mancanti
 */
export function missingOf(v, fields) {
  return fields.filter(f => v[f.key] == null).map(f => f.label);
}

/**
 * Genera l'HTML di un campo legato alla sessione.
 * @param {object} f definizione del campo
 * @param {boolean} [req=false] true se obbligatorio
 * @returns {string} HTML del campo
 */
export function fieldHtml(f, req = false) {
  const val = S.get(f.key) ?? '';
  const tag = req ? '<b class="req">obbligatorio</b>' : '';
  const hint = f.hint ? `<small class="hint">${esc(f.hint)}</small>` : '';
  if (f.type === 'sex' || f.type === 'select') {
    const opts = f.type === 'sex' ? [['M', 'Uomo'], ['F', 'Donna']] : f.options;
    return `<div class="fld wide" data-f="${f.key}"><span class="lab">${esc(f.label)}${tag}</span>
      <div class="seg" role="radiogroup" aria-label="${esc(f.label)}">${opts.map(([k, l]) =>
        `<button type="button" role="radio" data-key="${f.key}" data-v="${k}" aria-checked="${val === k}">${esc(l)}</button>`).join('')}</div></div>`;
  }
  const common = `data-key="${f.key}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${esc(val)}"`;
  const input = f.type === 'date' ? `<input type="date" ${common}>`
    : f.type === 'text' ? `<input type="text" maxlength="40" placeholder="${esc(f.placeholder || '')}" ${common}>`
    : `<input type="text" inputmode="decimal" enterkeyhint="next" ${common}>`;
  return `<label class="fld" data-f="${f.key}"><span class="lab">${esc(f.label)}${tag}</span>
    <span class="inp">${input}${f.unit ? `<span class="unit">${esc(f.unit)}</span>` : ''}</span>${hint}<small class="msg" aria-live="polite"></small></label>`;
}

/**
 * Controlla un campo numerico e mostra l'avviso sotto (numero non valido o fuori range).
 * @param {HTMLElement} root contenitore in cui cercare il campo
 * @param {string} key chiave del campo
 */
export function validateField(root, key) {
  const f = F[key], box = root.querySelector(`[data-f="${key}"]`);
  if (!f || !box || (f.type && f.type !== 'num')) return;
  const raw = S.get(key), n = parseNum(raw), msg = box.querySelector('.msg');
  let text = '', cls = '';
  if (raw != null && !Number.isFinite(n)) { text = 'Numero non valido'; cls = 'err'; }
  else if (Number.isFinite(n) && f.range && (n < f.range[0] || n > f.range[1])) {
    text = `Valore insolito (di solito ${fmt(f.range[0], 0)}–${fmt(f.range[1], 0)} ${f.unit || ''})`; cls = 'warn';
  }
  msg.textContent = text;
  box.classList.toggle('err', cls === 'err');
  box.classList.toggle('warn', cls === 'warn');
}

/**
 * Collega i campi di un contenitore alla sessione e richiama onChange a ogni modifica.
 * @param {HTMLElement} root contenitore con i campi
 * @param {Function} onChange callback dopo ogni modifica
 */
export function bindFields(root, onChange) {
  root.addEventListener('input', e => {
    const key = e.target.dataset && e.target.dataset.key;
    if (!key) return;
    S.set(key, e.target.value);
    validateField(root, key);
    onChange(key);
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('.seg button[data-key]');
    if (!b) return;
    const key = b.dataset.key, same = S.get(key) === b.dataset.v;
    S.set(key, same ? '' : b.dataset.v); // un secondo tocco deseleziona
    // Aggiorno tutti i selettori con la stessa chiave nella pagina
    root.querySelectorAll(`.seg button[data-key="${key}"]`).forEach(x => x.setAttribute('aria-checked', String(!same && x.dataset.v === b.dataset.v)));
    onChange(key);
  });
  root.querySelectorAll('input[data-key]').forEach(i => validateField(root, i.dataset.key));
}

/**
 * Genera l'HTML dei risultati di un calcolatore.
 * @param {{missing?:string[], cards?:Array}} out risultato di compute
 * @param {string} [missText] testo alternativo per i dati mancanti
 * @returns {string} HTML
 */
export function resultsHtml(out, missText) {
  if (out.missing && out.missing.length) {
    return `<div class="empty">${missText ? esc(missText) : `Per il risultato servono ancora: <b>${out.missing.map(esc).join(', ')}</b>.`}</div>`;
  }
  return (out.cards || []).map(c => `<article class="res ${c.level || ''}">
    <h4>${esc(c.title)}</h4>
    ${c.value != null ? `<p class="val">${c.value}${c.unit ? ` <span>${esc(c.unit)}</span>` : ''}</p>` : ''}
    ${c.sub ? `<p class="sub">${c.sub}</p>` : ''}
    ${c.html || ''}
    ${c.note ? `<p class="note">${c.note}</p>` : ''}
    ${c.steps && c.steps.length ? `<details class="steps"><summary>Passaggi</summary><ol>${c.steps.map(s => `<li>${s}</li>`).join('')}</ol></details>` : ''}
    ${c.formula ? `<a class="flink" href="#f-${c.formula}">Formula e fonte</a>` : ''}
  </article>`).join('');
}

/**
 * Mostra una finestra di conferma costruita nella pagina (niente confirm() di sistema).
 * @param {{title:string, text:string, ok:string, cancel?:string, danger?:boolean}} o testi del dialog
 * @returns {Promise<boolean>} true se l'utente conferma
 */
export function confirmDialog(o) {
  return new Promise(resolve => {
    const d = document.createElement('div');
    d.className = 'modal';
    d.innerHTML = `<div class="box" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-d">
      <h3 id="dlg-t">${esc(o.title)}</h3><p id="dlg-d">${esc(o.text)}</p>
      <div class="acts"><button class="btn" data-r="0">${esc(o.cancel || 'Annulla')}</button>
      <button class="btn ${o.danger ? 'danger' : 'primary'}" data-r="1">${esc(o.ok)}</button></div></div>`;
    const done = r => { d.remove(); document.removeEventListener('keydown', onKey); resolve(r); };
    const onKey = e => { if (e.key === 'Escape') done(false); };
    d.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (b) done(b.dataset.r === '1'); else if (e.target === d) done(false);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(d);
    d.querySelector('[data-r="0"]').focus();
  });
}

let toastTimer = 0;
/**
 * Mostra un avviso temporaneo in basso.
 * @param {string} text messaggio
 */
export function toast(text) {
  const t = document.getElementById('toast');
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 3500);
}

/**
 * Copia un testo negli appunti (solo su azione dell'utente).
 * @param {string} text testo da copiare
 */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copiato negli appunti'); }
  catch (e) { toast('Copia non riuscita: seleziona il testo a mano'); }
}

/**
 * Costruisce un passaggio di calcolo leggibile: "nome = espressione = risultato unità".
 * @param {string} name grandezza calcolata
 * @param {string} expr espressione con i numeri sostituiti
 * @param {string} result risultato formattato
 * @param {string} [unit] unità
 * @returns {string} HTML del passaggio
 */
export function step(name, expr, result, unit = '') {
  return `${esc(name)} = ${expr} = <b>${result}</b>${unit ? ' ' + esc(unit) : ''}`;
}
