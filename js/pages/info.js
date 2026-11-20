/**
 * Pagina "Info e trasparenza": finalità, gestione dei dati, limiti e preferenze non cliniche.
 */
import * as P from '../prefs.js';
import {AUTO_RESET_MS} from '../session.js';
import {esc} from '../ui.js';

/** Versione mostrata in fondo alla pagina; la aggiorno insieme alla cache del service worker. */
export const VERSION = '0.1.0';

/**
 * Disegna la pagina informativa e collega le preferenze.
 * @param {HTMLElement} root contenitore della vista
 */
export function renderInfo(root) {
  const p = P.load();
  root.innerHTML = `<header class="chead"><span class="code">Info</span><h1>Info e trasparenza</h1></header>
  <section class="block prose">
    <h2>Cosa fa l'app</h2>
    <p>NefroCalc applica formule già pubblicate e validate in letteratura. Non formula diagnosi, non suggerisce terapie e non sostituisce il giudizio clinico del medico: ogni risultato va interpretato nel contesto del paziente.</p>
    <p>Ogni risultato mostra i passaggi del calcolo e rimanda alla <a href="#formule">pagina delle formule</a>, con equazione, parametri, unità e fonte.</p>
  </section>
  <section class="block prose">
    <h2>Dati inseriti: modalità one-shot</h2>
    <ul>
      <li>I valori restano solo nella memoria dell'app finché è aperta. Non vengono scritti sul telefono, non vengono inviati a server e non esiste alcun database.</li>
      <li>L'app non fa richieste di rete durante l'uso: nessun font, libreria o servizio esterno.</li>
      <li>Il pulsante <b>Reset</b> azzera tutto dopo conferma. Chiudere l'app ha lo stesso effetto.</li>
      <li>Se l'app resta in background per più di ${Math.round(AUTO_RESET_MS / 60000)} minuti, al ritorno i dati sono già azzerati.</li>
      <li>Quando l'app va in background il contenuto viene coperto, ma Android potrebbe comunque catturarne l'anteprima tra le app recenti. Gli screenshot restano possibili.</li>
      <li>Sul telefono vengono salvate solo le preferenze qui sotto, che non riguardano il paziente.</li>
    </ul>
  </section>
  <section class="block prose">
    <h2>Unità e limiti</h2>
    <ul>
      <li>Unità fisse: creatinina, azotemia (urea), glicemia, calcio e fosforo in mg/dL; albumina in g/dL; elettroliti in mEq/L; cistatina C in mg/L. L'azotemia è trattata come urea e convertita in BUN (÷ 2,14) solo dove serve.</li>
      <li>Formule per adulti: non usare in età pediatrica, in gravidanza o con creatinina non stabile senza considerarne i limiti.</li>
      <li>La creatinina deve essere dosata con metodo standardizzato IDMS (enzimatico o Jaffé compensato).</li>
      <li>Le regole empiriche (potassio e pH, deficit di potassio) sono mostrate come intervalli indicativi.</li>
    </ul>
    <h2>Esclusi di proposito</h2>
    <ul>
      <li>KDPI/KDRI: la tabella di conversione OPTN cambia ogni anno; l'app rimanda al calcolatore ufficiale.</li>
      <li>Dosaggio dei singoli farmaci: richiede un database aggiornato ed è una scelta prescrittiva.</li>
      <li>Correzione del sodio per trigliceridi e proteine, correzione del tacrolimus per ematocrito, AUC con equazioni ad abbreviated sampling e schemi di scalaggio predefiniti: non esiste una formula unica consolidata.</li>
    </ul>
  </section>
  <section class="block">
    <h2>Preferenze</h2>
    <div class="fld wide"><span class="lab">Tema</span><div class="seg" role="radiogroup" aria-label="Tema">${[['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']]
      .map(([k, l]) => `<button type="button" role="radio" data-theme-opt="${k}" aria-checked="${p.theme === k}">${l}</button>`).join('')}</div></div>
    <label class="fld"><span class="lab">Soglia predefinita di variazione del sodio</span>
      <span class="inp"><input type="text" inputmode="decimal" id="pref-thr" autocomplete="off" value="${esc(p.naThreshold)}"><span class="unit">mEq/L in 24 h</span></span>
      <small class="hint">Usata nei calcolatori 1.1 e 1.2 quando non ne inserisci una nel singolo calcolo.</small></label>
  </section>
  <p class="ref center">NefroCalc ${VERSION}</p>`;
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-theme-opt]');
    if (!b) return;
    P.save('theme', b.dataset.themeOpt);
    P.applyTheme();
    root.querySelectorAll('[data-theme-opt]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
  });
  root.querySelector('#pref-thr').addEventListener('change', e => {
    const n = Number(String(e.target.value).replace(',', '.'));
    if (n >= 4 && n <= 15) P.save('naThreshold', n); else e.target.value = P.load().naThreshold;
  });
}
