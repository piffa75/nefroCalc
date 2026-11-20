/**
 * Area 4 — Vasculiti e glomerulonefriti (calcolatori 4.1–4.3).
 */
import * as M from '../formulas.js';
import {F} from '../fields.js';
import {BVAS_SYSTEMS} from '../bvas-data.js';
import {fmt, missingOf, step, esc, parseNum} from '../ui.js';

/** Compresse disponibili per steroide (mg, divisibile a metà). Modificabili nel calcolatore. */
const TABLETS = {
  pred: [{mg: 25, half: true}, {mg: 5, half: true}],
  mpred: [{mg: 16, half: true}, {mg: 4, half: true}],
  prednisolone: [{mg: 25, half: true}, {mg: 5, half: true}],
  defla: [{mg: 30, half: true}, {mg: 6, half: true}]
};
const STEROID_NAMES = {pred: 'Prednisone', mpred: 'Metilprednisolone', prednisolone: 'Prednisolone', defla: 'Deflazacort'};

/**
 * Descrive in parole una combinazione di compresse, unendo intere e mezze dello stesso dosaggio.
 * @param {Array<{mg:number,half:boolean,count:number}>|null} parts pezzi
 * @returns {string} es. "1½ cp da 25 mg + 1 cp da 5 mg"
 */
function tabletsText(parts) {
  if (parts == null) return 'non componibile';
  if (!parts.length) return '—';
  // Sommo per dosaggio: le mezze valgono 0,5 compresse
  const by = new Map();
  parts.forEach(p => by.set(p.mg, (by.get(p.mg) || 0) + p.count * (p.half ? 0.5 : 1)));
  return [...by.entries()].sort((a, b) => b[0] - a[0]).map(([mg, n]) => {
    const whole = Math.floor(n), half = n % 1 ? '½' : '';
    return `${whole || ''}${half} cp da ${fmt(mg, mg % 1 ? 1 : 0)} mg`;
  }).join(' + ');
}

/**
 * Aggiunge giorni a una data ISO e la formatta in italiano.
 * @param {string} iso data di partenza (aaaa-mm-gg)
 * @param {number} days giorni da aggiungere
 * @returns {string} data formattata, es. "lun 24/11/26"
 */
function dateAfter(iso, days) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('it-IT', {weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit'});
}

export const CALCS = [
  {
    id: 'bvas', code: '4.1', area: 'vasculiti', name: 'BVAS v3',
    short: 'Birmingham Vasculitis Activity Score',
    req: [], opt: [],
    extra: {
      pos: 'req', title: 'Manifestazioni attive negli ultimi 28 giorni',
      init: () => ({sel: [], persistent: false, first: false}),
      /**
       * @param {object} s stato BVAS
       * @returns {string} HTML del modulo
       */
      html(s) {
        const sel = new Set(s.sel);
        return `<div class="switches">
          <label class="sw"><input type="checkbox" role="switch" data-opt="first" ${s.first ? 'checked' : ''}><span><b>Prima valutazione</b><small>Abilita le fasce di creatinina; pesi nuovo/peggiorato</small></span></label>
          <label class="sw"><input type="checkbox" role="switch" data-opt="persistent" ${s.persistent ? 'checked' : ''}><span><b>Solo malattia persistente</b><small>Tutte le manifestazioni presenti ma non nuove né peggiorate</small></span></label></div>
          ${BVAS_SYSTEMS.map(sys => {
            const n = sys.items.filter(i => sel.has(i.id)).length;
            return `<details class="sys" ${n ? 'open' : ''}><summary><span>${esc(sys.name)}</span><span class="cnt" data-cnt="${sys.id}">${n || ''}</span></summary>
              ${sys.items.map(i => {
                const dis = i.first && !s.first;
                return `<label class="chk ${dis ? 'dis' : ''}"><input type="checkbox" data-item="${i.id}" ${sel.has(i.id) ? 'checked' : ''} ${dis ? 'disabled' : ''}>
                  <span>${esc(i.label)}${i.p == null ? ' <em>solo nuovo</em>' : ''}${i.first ? ' <em>solo 1ª valutazione</em>' : ''}</span>
                  <span class="pts">${i.p ?? '–'}/${i.n}</span></label>`;
              }).join('')}</details>`;
          }).join('')}`;
      },
      /**
       * @param {HTMLElement} el contenitore
       * @param {object} s stato BVAS
       * @param {Function} refresh ricalcola i risultati
       * @param {Function} redraw ridisegna il modulo
       */
      bind(el, s, refresh, redraw) {
        el.addEventListener('change', e => {
          const t = e.target;
          if (t.dataset.opt) {
            s[t.dataset.opt] = t.checked;
            // Senza prima valutazione tolgo le fasce di creatinina già spuntate
            if (t.dataset.opt === 'first' && !t.checked) s.sel = s.sel.filter(id => !['ren4', 'ren5', 'ren6'].includes(id));
            redraw();
          } else if (t.dataset.item) {
            s.sel = t.checked ? [...s.sel, t.dataset.item] : s.sel.filter(id => id !== t.dataset.item);
            const sys = BVAS_SYSTEMS.find(x => x.items.some(i => i.id === t.dataset.item));
            const n = sys.items.filter(i => s.sel.includes(i.id)).length;
            el.querySelector(`[data-cnt="${sys.id}"]`).textContent = n || '';
          }
          refresh();
        });
      }
    },
    /**
     * @param {object} v valori di sessione (non usati)
     * @param {object} x stato BVAS
     * @returns {object} risultato
     */
    compute(v, x) {
      const r = M.bvas(BVAS_SYSTEMS, new Set(x.sel), {persistent: x.persistent, firstVisit: x.first});
      const labels = BVAS_SYSTEMS.flatMap(s => s.items).filter(i => x.sel.includes(i.id));
      const why = x.first ? 'prima valutazione' : !x.persistent ? 'manifestazioni nuove o peggiorate' : r.mode === 'new' ? 'presente un item incompatibile con la persistenza' : 'solo malattia persistente';
      const text = [`BVAS v3: ${r.total} (pesi ${r.mode === 'new' ? 'nuovo/peggiorato' : 'persistente'} — ${why})`,
        ...r.bySystem.filter(s => s.raw > 0).map(s => `- ${s.name}: ${s.score}${s.raw > s.score ? ` (grezzo ${s.raw}, massimo ${s.max})` : ''} — ${labels.filter(i => BVAS_SYSTEMS.find(y => y.id === s.id).items.includes(i)).map(i => i.label).join('; ')}`)].join('\n');
      return {cards: [{title: 'BVAS v3', value: String(r.total), unit: `/ ${r.mode === 'new' ? 63 : 33}`, formula: 'bvas',
        sub: `Pesi ${r.mode === 'new' ? 'nuovo/peggiorato' : 'persistente'} — ${why}`,
        html: `<table class="tbl"><thead><tr><th>Sistema</th><th class="num">Punti</th><th class="num">Max</th></tr></thead><tbody>${r.bySystem.map(s =>
          `<tr class="${s.raw ? '' : 'dim'}"><td>${esc(s.name)}</td><td class="num">${s.score}${s.raw > s.score ? '*' : ''}</td><td class="num">${s.max}</td></tr>`).join('')}</tbody></table>
          ${r.bySystem.some(s => s.raw > s.score) ? '<p class="note">* punteggio limitato al massimo del sistema.</p>' : ''}
          <pre class="copytext">${esc(text)}</pre><button type="button" class="btn small" data-copy="${esc(text)}">Copia riepilogo</button>`}]};
    }
  },
  {
    id: 'cumulativa', code: '4.2', area: 'vasculiti', name: 'Dosi cumulative',
    short: 'Ciclofosfamide, steroidi o altri: totale, per m² e per kg',
    req: [], opt: [F.drugName, F.prevDose, F.weight, F.height],
    extra: {
      pos: 'req', title: 'Schemi di somministrazione',
      init: () => ({rows: [{}]}),
      /**
       * @param {object} s stato con le righe
       * @returns {string} HTML
       */
      html: s => `<p class="hint">Una riga per schema: dose per somministrazione e numero di boli (o di giorni, per una dose giornaliera).</p>
        <div class="rows">${s.rows.map((r, i) => `<div class="row" data-i="${i}">
          <label class="mini"><span>Dose</span><span class="inp"><input type="text" inputmode="decimal" autocomplete="off" data-col="dose" value="${esc(r.dose ?? '')}"><span class="unit">mg</span></span></label>
          <label class="mini"><span>Boli o giorni</span><span class="inp"><input type="text" inputmode="numeric" autocomplete="off" data-col="n" value="${esc(r.n ?? '')}"><span class="unit">×</span></span></label>
          <button type="button" class="icon del" data-del="${i}" aria-label="Elimina riga">×</button></div>`).join('')}
          <button type="button" class="btn small" data-add>Aggiungi schema</button></div>`,
      /**
       * @param {HTMLElement} el contenitore
       * @param {object} s stato
       * @param {Function} refresh ricalcola
       * @param {Function} redraw ridisegna
       */
      bind(el, s, refresh, redraw) {
        el.addEventListener('input', e => {
          const row = e.target.closest('.row');
          if (row && e.target.dataset.col) { s.rows[+row.dataset.i][e.target.dataset.col] = e.target.value; refresh(); }
        });
        el.addEventListener('click', e => {
          if (e.target.closest('[data-add]')) { s.rows.push({}); redraw(); refresh(); }
          const d = e.target.closest('[data-del]');
          if (d) { s.rows.splice(+d.dataset.del, 1); redraw(); refresh(); }
        });
      }
    },
    /**
     * @param {object} v valori di sessione
     * @param {object} x stato con le righe
     * @returns {object} risultato
     */
    compute(v, x) {
      const lines = x.rows.map(r => ({dose: parseNum(r.dose), times: parseNum(r.n)})).filter(l => l.dose > 0 && l.times > 0);
      if (!lines.length) return {missing: ['almeno uno schema con dose e numero di somministrazioni']};
      const prev = (v.prevDose ?? 0) * 1000;
      const tot = M.cumulativeDose(lines, prev);
      const steps = lines.map((l, i) => step(`Schema ${i + 1}`, `${fmt(l.dose, 0)} mg × ${fmt(l.times, 0)}`, fmt(l.dose * l.times, 0), 'mg'));
      if (prev) steps.push(`Dose pregressa: ${fmt(prev, 0)} mg`);
      steps.push(step('Totale', lines.map(l => fmt(l.dose * l.times, 0)).concat(prev ? [fmt(prev, 0)] : []).join(' + '), fmt(tot, 0), 'mg'));
      const card = {title: `Dose cumulativa${v.drugName ? ' — ' + esc(v.drugName) : ''}`, value: fmt(tot / 1000, 2), unit: 'g', sub: `${fmt(tot, 0)} mg`, formula: 'dose-cumulativa', steps};
      if (v.weight != null) card.sub += ` · ${fmt(tot / v.weight, 1)} mg/kg`;
      if (v.weight != null && v.height != null) {
        const bsa = M.bsaDuBois(v.weight, v.height);
        card.sub += `<br>Per superficie: <b>${fmt(tot / 1000 / bsa, 2)} g/m²</b> (BSA Du Bois ${fmt(bsa, 2)} m²)`;
        steps.push(step('Per m²', `${fmt(tot / 1000, 2)} g / ${fmt(bsa, 3)} m²`, fmt(tot / 1000 / bsa, 2), 'g/m²'));
      }
      return {cards: [card]};
    }
  },
  {
    id: 'tapering', code: '4.3', area: 'vasculiti', name: 'Piano di tapering steroideo',
    short: 'Calendario di scalaggio con date e compresse',
    req: [F.steroid, F.startDose, F.startDate, F.targetDose], opt: [F.weight],
    extra: {
      pos: 'req', title: 'Regole di scalaggio',
      init: () => ({rows: [{}], tabs: null}),
      /**
       * @param {object} s stato con regole e compresse
       * @returns {string} HTML
       */
      html: s => `<p class="hint">Ogni regola vale finché la dose è sopra la soglia. Esempio: soglia 20, riduci 5 mg ogni 7 giorni; soglia 0, riduci 2,5 mg ogni 14 giorni.</p>
        <div class="rows">${s.rows.map((r, i) => `<div class="row" data-i="${i}">
          <label class="mini"><span>Se dose sopra</span><span class="inp"><input type="text" inputmode="decimal" autocomplete="off" data-col="above" value="${esc(r.above ?? '')}"><span class="unit">mg</span></span></label>
          <label class="mini"><span>Riduci di</span><span class="inp"><input type="text" inputmode="decimal" autocomplete="off" data-col="step" value="${esc(r.step ?? '')}"><span class="unit">mg</span></span></label>
          <label class="mini"><span>Ogni</span><span class="inp"><input type="text" inputmode="numeric" autocomplete="off" data-col="every" value="${esc(r.every ?? '')}"><span class="unit">gg</span></span></label>
          <button type="button" class="icon del" data-del="${i}" aria-label="Elimina regola">×</button></div>`).join('')}
          <button type="button" class="btn small" data-add>Aggiungi regola</button></div>
        <div class="tabs-box"><b>Compresse disponibili</b>${(s.tabs || []).map((t, i) => `<div class="tabrow">
          <label class="mini"><span>Compressa</span><span class="inp"><input type="text" inputmode="decimal" autocomplete="off" data-tab="${i}" value="${esc(t.mg)}"><span class="unit">mg</span></span></label>
          <label class="sw small"><input type="checkbox" role="switch" data-half="${i}" ${t.half ? 'checked' : ''}><span>divisibile</span></label></div>`).join('') || '<p class="hint">Scegli lo steroide.</p>'}</div>`,
      /**
       * @param {HTMLElement} el contenitore
       * @param {object} s stato
       * @param {Function} refresh ricalcola
       * @param {Function} redraw ridisegna
       */
      bind(el, s, refresh, redraw) {
        el.addEventListener('input', e => {
          const t = e.target, row = t.closest('.row');
          if (row && t.dataset.col) s.rows[+row.dataset.i][t.dataset.col] = t.value;
          else if (t.dataset.tab != null) s.tabs[+t.dataset.tab].mg = t.value;
          else return;
          refresh();
        });
        el.addEventListener('change', e => {
          if (e.target.dataset.half != null) { s.tabs[+e.target.dataset.half].half = e.target.checked; refresh(); }
        });
        el.addEventListener('click', e => {
          if (e.target.closest('[data-add]')) { s.rows.push({}); redraw(); refresh(); }
          const d = e.target.closest('[data-del]');
          if (d) { s.rows.splice(+d.dataset.del, 1); redraw(); refresh(); }
        });
      },
      /**
       * Aggiorna le compresse quando cambia lo steroide scelto.
       * @param {object} s stato
       * @param {object} v valori di sessione
       * @returns {boolean} true se serve ridisegnare l'editor
       */
      sync(s, v) {
        if (v.steroid && s.tabsFor !== v.steroid) {
          s.tabs = TABLETS[v.steroid].map(t => ({mg: String(t.mg), half: t.half}));
          s.tabsFor = v.steroid;
          return true;
        }
        return false;
      }
    },
    /**
     * @param {object} v valori di sessione
     * @param {object} x stato con regole e compresse
     * @returns {object} risultato
     */
    compute(v, x) {
      const missing = missingOf(v, this.req);
      const rules = x.rows.map(r => ({above: parseNum(r.above), step: parseNum(r.step), every: parseNum(r.every)}))
        .filter(r => Number.isFinite(r.above) && r.step > 0 && r.every > 0);
      if (!rules.length) missing.push('almeno una regola completa');
      if (missing.length) return {missing};
      const tabs = (x.tabs || []).map(t => ({mg: parseNum(t.mg), half: t.half})).filter(t => t.mg > 0);
      if (!tabs.length) return {missing: ['almeno una compressa disponibile']};
      const unit = Math.min(...tabs.map(t => t.half ? t.mg / 2 : t.mg));
      const plan = M.taperPlan({start: v.startDose, target: v.targetDose, rules, unit});
      if (plan.error) return {cards: [{title: 'Piano di scalaggio', level: 'warn', note: plan.error}]};
      const rows = plan.steps.map(s => ({
        from: dateAfter(v.startDate, s.day), to: s.days ? dateAfter(v.startDate, s.day + s.days - 1) : 'in poi',
        dose: s.dose, tabs: tabletsText(M.tabletBreakdown(s.dose, tabs))}));
      const name = STEROID_NAMES[v.steroid];
      const text = [`Scalaggio ${name} da ${fmt(v.startDose, 1)} a ${fmt(v.targetDose, 1)} mg/die`,
        ...rows.map(r => `${r.from} → ${r.to}: ${fmt(r.dose, 1)} mg/die (${r.tabs})`)].join('\n');
      const last = plan.steps[plan.steps.length - 1];
      const card = {title: `Piano ${name}`, value: String(plan.steps.length - 1), unit: 'gradini', formula: 'tapering',
        sub: `Target raggiunto dopo ${last.day} giorni, il ${dateAfter(v.startDate, last.day)}${v.weight ? ` · dose iniziale ${fmt(v.startDose / v.weight, 2)} mg/kg` : ''}`,
        html: `<div class="scroll"><table class="tbl"><thead><tr><th>Dal</th><th>Al</th><th class="num">mg/die</th><th>Compresse</th></tr></thead><tbody>${rows.map(r =>
          `<tr><td class="nw">${r.from}</td><td class="nw">${r.to}</td><td class="num">${fmt(r.dose, r.dose % 1 ? 1 : 0)}</td><td>${r.tabs}</td></tr>`).join('')}</tbody></table></div>
          <button type="button" class="btn small" data-copy="${esc(text)}">Copia il piano</button>`,
        note: 'Il piano applica solo le regole inserite. Le dosi sono arrotondate al multiplo componibile con le compresse indicate.'};
      if (rows.some(r => r.tabs === 'non componibile')) { card.level = 'warn'; card.note += ' Alcune dosi non sono componibili con le compresse indicate.'; }
      return {cards: [card]};
    }
  }
];
