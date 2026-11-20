/**
 * NefroCalc — preferenze NON cliniche.
 * È l'unico modulo che usa localStorage: tema e soglia di correzione della sodiemia predefinita.
 * Nessun dato del paziente passa da qui.
 */

const KEY = 'nefrocalc.prefs';
const DEFAULTS = {theme: 'auto', naThreshold: 10};

/**
 * Legge le preferenze salvate, con i valori di default per quelle mancanti.
 * @returns {{theme:'auto'|'light'|'dark', naThreshold:number}} preferenze
 */
export function load() {
  try { return {...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}')}; } catch (e) { return {...DEFAULTS}; }
}

/**
 * Salva una preferenza.
 * @param {string} key nome della preferenza
 * @param {*} value valore
 */
export function save(key, value) {
  const p = load();
  p[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* storage non disponibile: resta il default */ }
}

/** Applica il tema salvato alla radice del documento. */
export function applyTheme() {
  const t = load().theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
