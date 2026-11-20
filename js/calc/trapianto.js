/**
 * Area 3 — Trapianto renale (calcolatori 3.1–3.3).
 * 3.3 KDPI non è calcolato: rimanda al calcolatore ufficiale OPTN (mapping aggiornato ogni anno).
 */
import * as M from '../formulas.js';
import {F} from '../fields.js';
import {fmt, missingOf, step, esc, parseNum} from '../ui.js';

/**
 * Editor di righe numeriche (prelievi AUC, valori storici).
 * @param {Array<object>} rows righe correnti
 * @param {Array<[string,string,string]>} cols colonne [chiave, etichetta, unità]
 * @param {string} addLabel testo del pulsante di aggiunta
 * @returns {string} HTML dell'editor
 */
function rowsHtml(rows, cols, addLabel) {
  return `<div class="rows">${rows.map((r, i) => `<div class="row" data-i="${i}">
    ${cols.map(([k, l, u]) => `<label class="mini"><span>${esc(l)}</span><span class="inp"><input type="text" inputmode="decimal" autocomplete="off" data-col="${k}" value="${esc(r[k] ?? '')}">${u ? `<span class="unit">${esc(u)}</span>` : ''}</span></label>`).join('')}
    <button type="button" class="icon del" data-del="${i}" aria-label="Elimina riga">×</button></div>`).join('')}
    <button type="button" class="btn small" data-add>${esc(addLabel)}</button></div>`;
}

/**
 * Collega l'editor di righe allo stato del calcolatore.
 * @param {HTMLElement} el contenitore dell'editor
 * @param {{rows:Array}} state stato con l'array rows
 * @param {Function} refresh ridisegna i risultati
 * @param {Function} redraw ridisegna l'editor (dopo aggiunta o eliminazione)
 */
function bindRows(el, state, refresh, redraw) {
  el.addEventListener('input', e => {
    const row = e.target.closest('.row');
    if (!row || !e.target.dataset.col) return;
    state.rows[+row.dataset.i][e.target.dataset.col] = e.target.value;
    refresh();
  });
  el.addEventListener('click', e => {
    if (e.target.closest('[data-add]')) { state.rows.push({}); redraw(); refresh(); }
    const d = e.target.closest('[data-del]');
    if (d) { state.rows.splice(+d.dataset.del, 1); redraw(); refresh(); }
  });
}

export const CALCS = [
  {
    id: 'cd', code: '3.1', area: 'trapianto', name: 'Esposizione agli immunosoppressori',
    short: 'Rapporto C/D, dose per peso, AUC da profilo',
    req: [F.c0, F.dailyDose],
    opt: [F.drug, F.weight],
    extra: {
      pos: 'opt', title: 'Prelievi per AUC (facoltativi)',
      init: () => ({rows: [{t: '0'}, {t: '1'}, {t: '3'}]}),
      /** @param {object} s stato @returns {string} HTML */
      html: s => rowsHtml(s.rows, [['t', 'Tempo', 'h'], ['c', 'Concentrazione', 'ng/mL']], 'Aggiungi prelievo'),
      bind: bindRows
    },
    /**
     * @param {object} v valori di sessione
     * @param {object} x stato dei prelievi
     * @returns {object} risultato
     */
    compute(v, x) {
      const missing = missingOf(v, this.req);
      if (missing.length) return {missing};
      const cd = M.cdRatio(v.c0, v.dailyDose);
      const cards = [{title: `Rapporto C/D${v.drug === 'tac' ? ' tacrolimus' : v.drug === 'csa' ? ' ciclosporina' : ''}`, value: fmt(cd, 2), unit: '(ng/mL)/(mg/die)', formula: 'cd-ratio',
        steps: [step('C/D', `${fmt(v.c0, 1)} / ${fmt(v.dailyDose, 2)}`, fmt(cd, 2))]}];
      if (v.weight != null) {
        const pk = v.dailyDose / v.weight;
        cards[0].sub = `Dose per peso: <b>${fmt(pk, 3)} mg/kg/die</b>`;
        cards[0].steps.push(step('Dose/peso', `${fmt(v.dailyDose, 2)} / ${fmt(v.weight)}`, fmt(pk, 3), 'mg/kg/die'));
      }
      const pts = (x.rows || []).map(r => ({t: parseNum(r.t), c: parseNum(r.c)})).filter(p => Number.isFinite(p.t) && Number.isFinite(p.c));
      const auc = M.aucTrapezoid(pts);
      if (auc != null) {
        const sorted = [...pts].sort((a, b) => a.t - b.t);
        cards.push({title: `AUC ${fmt(sorted[0].t, 1)}–${fmt(sorted[sorted.length - 1].t, 1)} h`, value: fmt(auc, 1), unit: 'ng·h/mL', formula: 'auc',
          sub: `${pts.length} prelievi, regola dei trapezi`,
          steps: sorted.slice(1).map((p, i) => step(`Trapezio ${i + 1}`, `(${fmt(p.t, 1)} − ${fmt(sorted[i].t, 1)}) × (${fmt(p.c, 1)} + ${fmt(sorted[i].c, 1)}) / 2`, fmt((p.t - sorted[i].t) * (p.c + sorted[i].c) / 2, 1))),
          note: 'Area tra il primo e l\'ultimo prelievo inseriti, senza estrapolazione.'});
      }
      return {cards};
    }
  },
  {
    id: 'graft', code: '3.2', area: 'trapianto', name: 'Variazione funzionale del graft',
    short: 'Delta assoluto e percentuale rispetto al basale',
    req: [F.graftMode, F.graftNow, F.graftBase],
    opt: [F.graftProt],
    extra: {
      pos: 'opt', title: 'Valori intermedi recenti (dal più vecchio)',
      init: () => ({rows: []}),
      /** @param {object} s stato @returns {string} HTML */
      html: s => rowsHtml(s.rows, [['v', 'Valore', '']], 'Aggiungi valore'),
      bind: bindRows
    },
    /**
     * @param {object} v valori di sessione
     * @param {object} x stato dei valori intermedi
     * @returns {object} risultato
     */
    compute(v, x) {
      const missing = missingOf(v, this.req);
      if (missing.length) return {missing};
      const unit = v.graftMode === 'cr' ? 'mg/dL' : 'mL/min/1,73 m²', d = v.graftMode === 'cr' ? 2 : 0;
      const ch = M.deltaChange(v.graftNow, v.graftBase);
      const worse = v.graftMode === 'cr' ? ch.abs > 0 : ch.abs < 0;
      const cards = [{title: `Variazione ${v.graftMode === 'cr' ? 'della creatinina' : 'dell\'eGFR'}`, value: `${ch.pct >= 0 ? '+' : ''}${fmt(ch.pct, 1)}%`,
        sub: `Δ assoluto ${ch.abs >= 0 ? '+' : ''}${fmt(ch.abs, d)} ${unit} (da ${fmt(v.graftBase, d)} a ${fmt(v.graftNow, d)}) — ${ch.abs === 0 ? 'invariato' : worse ? 'peggioramento' : 'miglioramento'}`,
        formula: 'delta-graft',
        steps: [step('Δ', `${fmt(v.graftNow, d)} − ${fmt(v.graftBase, d)}`, fmt(ch.abs, d), unit), step('Δ%', `${fmt(ch.abs, d)} / ${fmt(v.graftBase, d)} × 100`, fmt(ch.pct, 1), '%')]}];
      const hist = (x.rows || []).map(r => parseNum(r.v)).filter(Number.isFinite);
      if (hist.length) {
        const seq = [v.graftBase, ...hist, v.graftNow];
        cards.push({title: 'Andamento rispetto al basale', formula: 'delta-graft',
          html: `<table class="tbl"><thead><tr><th>Punto</th><th class="num">Valore</th><th class="num">Δ% vs basale</th></tr></thead><tbody>${seq.map((val, i) =>
            `<tr><td>${i === 0 ? 'Basale' : i === seq.length - 1 ? 'Attuale' : `Intermedio ${i}`}</td><td class="num">${fmt(val, d)}</td><td class="num">${i === 0 ? '—' : `${M.deltaChange(val, v.graftBase).pct >= 0 ? '+' : ''}${fmt(M.deltaChange(val, v.graftBase).pct, 1)}%`}</td></tr>`).join('')}</tbody></table>`});
      }
      if (v.graftProt != null) cards.push({title: 'Proteinuria attuale', value: fmt(v.graftProt, 0), unit: 'mg/g', note: 'Riportata nel riepilogo, non entra nel calcolo della variazione.'});
      cards.push({title: 'Nota', note: 'Le equazioni eGFR sono meno accurate nel paziente trapiantato.'});
      return {cards};
    }
  },
  {
    id: 'kdpi', code: '3.3', area: 'trapianto', name: 'KDPI / KDRI', link: true,
    short: 'Calcolatore ufficiale OPTN (esterno)',
    req: [], opt: [],
    /** @returns {object} risultato con solo il rimando */
    compute() {
      return {cards: [{title: 'Perché non è calcolato qui',
        html: `<p>Il KDPI converte il KDRI in percentile con una tabella che OPTN aggiorna ogni anno, e dall'ottobre 2024 la formula non include più etnia e stato HCV del donatore. Un valore calcolato qui invecchierebbe senza avvisi.</p>
          <p><a class="btn primary" href="https://www.hrsa.gov/optn/data-calculators/allocation-calculators/kdpi-calculator" target="_blank" rel="noopener noreferrer">Apri il calcolatore OPTN</a></p>
          <p class="note">Si apre il sito OPTN: i dati inseriti lì escono dal telefono.</p>`}]};
    }
  }
];
