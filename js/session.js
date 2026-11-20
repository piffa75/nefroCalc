/**
 * NefroCalc — stato di sessione.
 *
 * Tutti i dati clinici vivono SOLO qui, in variabili JavaScript: nessun localStorage,
 * sessionStorage, IndexedDB, cookie o rete. Se il sistema chiude l'app, i dati spariscono.
 */

const values = new Map();   // chiave campo → testo digitato (es. "1,2") o codice ("M", "nacl3")
const extra = new Map();    // stato strutturato dei calcolatori (BVAS, righe AUC, regole di scalaggio)
const resetListeners = new Set();

/** Dopo quanti millisecondi in background azzero la sessione. */
export const AUTO_RESET_MS = 15 * 60 * 1000;

/**
 * Legge il valore grezzo di un campo.
 * @param {string} key chiave del campo
 * @returns {string|undefined} testo salvato
 */
export function get(key) {
  return values.get(key);
}

/**
 * Salva il valore grezzo di un campo; una stringa vuota cancella la chiave.
 * @param {string} key chiave del campo
 * @param {string} value testo digitato o codice scelto
 */
export function set(key, value) {
  if (value === '' || value == null) values.delete(key); else values.set(key, String(value));
}

/**
 * Restituisce lo stato strutturato di un calcolatore, creandolo al primo accesso.
 * @param {string} id id del calcolatore
 * @param {Function} init funzione che crea lo stato iniziale
 * @returns {object} stato mutabile del calcolatore
 */
export function getExtra(id, init) {
  if (!extra.has(id)) extra.set(id, init());
  return extra.get(id);
}

/**
 * Indica se in sessione c'è almeno un dato inserito.
 * @returns {boolean} true se ci sono valori o stati strutturati
 */
export function hasData() {
  return values.size > 0 || extra.size > 0;
}

/**
 * Conta i campi compilati (per il badge sul pulsante Reset).
 * @returns {number} numero di valori in sessione
 */
export function count() {
  return values.size + extra.size;
}

/** Azzera tutta la sessione e avvisa chi è in ascolto. */
export function clear() {
  values.clear();
  extra.clear();
  resetListeners.forEach(fn => fn());
}

/**
 * Registra una funzione da chiamare dopo ogni reset.
 * @param {Function} fn callback
 */
export function onReset(fn) {
  resetListeners.add(fn);
}

/**
 * Attiva le protezioni di privacy: velo sul contenuto quando l'app va in background
 * e azzeramento automatico se resta in background più di AUTO_RESET_MS.
 * @param {Function} onAutoReset chiamata dopo un azzeramento automatico (per avvisare l'utente)
 */
export function initPrivacy(onAutoReset) {
  let hiddenAt = 0;
  const veil = on => document.body.classList.toggle('veil', on);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Copro subito il contenuto: riduce il rischio che l'anteprima delle app recenti mostri i dati
      hiddenAt = Date.now();
      veil(true);
      return;
    }
    if (hiddenAt && Date.now() - hiddenAt > AUTO_RESET_MS && hasData()) { clear(); onAutoReset(); }
    hiddenAt = 0;
    requestAnimationFrame(() => veil(false));
  });
  window.addEventListener('pagehide', () => veil(true));
  window.addEventListener('pageshow', () => veil(false));
}
