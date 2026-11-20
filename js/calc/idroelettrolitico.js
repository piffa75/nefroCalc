/**
 * Area 1 — Bilancio idro-elettrolitico e acido-base (calcolatori 1.1–1.5).
 *
 * Contratto di ogni calcolatore:
 *   req/opt: campi obbligatori e facoltativi · compute(v) → {missing} oppure {cards}
 *   cards: {title, value, unit, sub, steps[], note, level ('warn'|'info'), formula (id in FORMULE)}
 */
import * as M from '../formulas.js';
import {F} from '../fields.js';
import {fmt, missingOf, step} from '../ui.js';
import * as P from '../prefs.js';

/** Composizione delle soluzioni infusive: [Na, K] in mEq/L. */
const SOLUTIONS = {g5: [0, 0, 'Glucosata 5%'], nacl045: [77, 0, 'NaCl 0,45%'], nacl09: [154, 0, 'NaCl 0,9%'],
  nacl3: [513, 0, 'NaCl 3%'], ringer: [130, 4, 'Ringer lattato']};

/**
 * Card dell'acqua corporea totale, comune a 1.1 e 1.2.
 * @param {object} v valori di sessione
 * @returns {{t:object, card:object}} TBW calcolata e card
 */
function tbwCard(v) {
  const t = M.tbw(v.weight, v.sex, v.age);
  return {t, card: {title: 'Acqua corporea totale (TBW)', value: fmt(t.value), unit: 'L', formula: 'tbw',
    sub: `Frazione ${fmt(t.fraction, 2)} (${v.sex === 'M' ? 'uomo' : 'donna'}, ${v.age >= 65 ? '65 anni e oltre' : 'sotto 65 anni'})`,
    steps: [step('TBW', `${fmt(v.weight)} kg × ${fmt(t.fraction, 2)}`, fmt(t.value), 'L')]}};
}

/**
 * Soglia di variazione della sodiemia: quella del calcolo o quella delle preferenze.
 * @param {object} v valori di sessione
 * @returns {number} mEq/L in 24 h
 */
const thresholdOf = v => v.threshold ?? P.load().naThreshold;

export const CALCS = [
  {
    id: 'sodio', code: '1.1', area: 'idro', name: 'Correzione e variazione del sodio',
    short: 'Sodio corretto per glicemia, Adrogué-Madias, clearance dell\'acqua libera',
    req: [F.sex, F.age, F.weight, F.na, F.sol],
    opt: [F.glu, F.solNa, F.solK, F.plannedVol, F.hours, F.threshold, F.una, F.uk, F.diuresis],
    /**
     * @param {object} v valori di sessione
     * @returns {object} risultato
     */
    compute(v) {
      const missing = missingOf(v, this.req);
      if (v.sol === 'custom' && v.solNa == null) missing.push('Na della soluzione personalizzata');
      if (missing.length) return {missing};
      const cards = [];
      const {t, card} = tbwCard(v);
      cards.push(card);
      if (v.glu != null) {
        const g = M.naGlucoseCorrection(v.na, v.glu);
        cards.push({title: 'Sodio corretto per glicemia', value: `${fmt(g.katz)} · ${fmt(g.hillier)}`, unit: 'mEq/L',
          sub: 'Katz (1,6) · Hillier (2,4)', formula: 'na-glucosio',
          note: v.glu <= 100 ? 'Glicemia ≤ 100 mg/dL: nessuna correzione.' : '',
          steps: [step('Katz', `${fmt(v.na)} + 1,6 × (${fmt(v.glu, 0)} − 100) / 100`, fmt(g.katz), 'mEq/L'),
                  step('Hillier', `${fmt(v.na)} + 2,4 × (${fmt(v.glu, 0)} − 100) / 100`, fmt(g.hillier), 'mEq/L')]});
      }
      // Composizione della soluzione: standard o personalizzata, più eventuale K aggiunto
      const base = v.sol === 'custom' ? [v.solNa, 0, 'Soluzione personalizzata'] : SOLUTIONS[v.sol];
      const infNa = base[0], infK = base[1] + (v.solK ?? 0);
      const d = M.adrogueMadias(v.na, infNa, infK, t.value);
      const thr = thresholdOf(v);
      const am = {title: `ΔNa atteso per 1 L di ${base[2]}${v.solK ? ' + K' : ''}`, value: `${d >= 0 ? '+' : ''}${fmt(d, 2)}`, unit: 'mEq/L',
        sub: `Sodiemia attesa dopo 1 L: ${fmt(v.na + d)} mEq/L`, formula: 'adrogue',
        steps: [step('ΔNa', `(${fmt(infNa, 0)} + ${fmt(infK, 0)} − ${fmt(v.na)}) / (${fmt(t.value)} + 1)`, fmt(d, 2), 'mEq/L per litro')],
        note: 'La formula non considera diuresi e perdite in corso: ricontrolla la sodiemia a intervalli ravvicinati.'};
      if (Math.abs(d) > 0.001) {
        const litres = thr / Math.abs(d);
        am.steps.push(step(`Volume per ${fmt(thr, 0)} mEq/L`, `${fmt(thr, 0)} / ${fmt(Math.abs(d), 2)}`, fmt(litres, 2), 'L'));
        am.sub += `<br>Volume per una variazione di ${fmt(thr, 0)} mEq/L (soglia): <b>${fmt(litres, 2)} L</b>`;
        if (v.hours) {
          const rate = litres * 1000 / v.hours;
          am.sub += ` · in ${fmt(v.hours, 0)} h: <b>${fmt(rate, 0)} mL/h</b>`;
          am.steps.push(step('Velocità', `${fmt(litres * 1000, 0)} mL / ${fmt(v.hours, 0)} h`, fmt(rate, 0), 'mL/h'));
        }
      }
      if (v.plannedVol != null) {
        const proj = d * v.plannedVol;
        am.sub += `<br>Con ${fmt(v.plannedVol, 1)} L: ΔNa previsto <b>${proj >= 0 ? '+' : ''}${fmt(proj, 1)} mEq/L</b>`;
        if (Math.abs(proj) > thr) { am.level = 'warn'; am.sub += ` — supera la soglia di ${fmt(thr, 0)} mEq/L in 24 h`; }
      }
      cards.push(am);
      if (v.diuresis != null && v.una != null && v.uk != null) {
        const e = M.electrolyteFreeWaterClearance(v.diuresis, v.una, v.uk, v.na);
        cards.push({title: 'Clearance dell\'acqua libera da elettroliti', value: `${e >= 0 ? '+' : ''}${fmt(e, 0)}`, unit: 'mL/24 h', formula: 'efwc',
          sub: e >= 0 ? 'Le urine eliminano acqua libera: tendono ad alzare la sodiemia.' : 'Le urine trattengono acqua libera: tendono ad abbassare la sodiemia.',
          steps: [step('EFWC', `${fmt(v.diuresis, 0)} × [1 − (${fmt(v.una, 0)} + ${fmt(v.uk, 0)}) / ${fmt(v.na)}]`, fmt(e, 0), 'mL')]});
      }
      return {cards};
    }
  },
  {
    id: 'acqua', code: '1.2', area: 'idro', name: 'Deficit di acqua libera',
    short: 'Ipernatriemia: deficit totale, volume e velocità per il target',
    req: [F.sex, F.age, F.weight, F.na],
    opt: [F.naTarget, F.hours, F.insensible, F.threshold],
    /**
     * @param {object} v valori di sessione
     * @returns {object} risultato
     */
    compute(v) {
      const missing = missingOf(v, this.req);
      if (missing.length) return {missing};
      const {t, card} = tbwCard(v);
      const cards = [card];
      if (v.na <= 140) {
        cards.push({title: 'Deficit di acqua libera', value: '0', unit: 'L', formula: 'deficit-acqua',
          note: 'Sodiemia ≤ 140 mEq/L: nessun deficit secondo la formula.'});
        return {cards};
      }
      const tot = M.freeWaterDeficit(v.na, t.value);
      cards.push({title: 'Deficit totale di acqua libera', value: fmt(tot, 2), unit: 'L', sub: 'Per riportare la sodiemia a 140 mEq/L', formula: 'deficit-acqua',
        steps: [step('Deficit', `${fmt(t.value)} × (${fmt(v.na)} / 140 − 1)`, fmt(tot, 2), 'L')]});
      // Target: quello inserito, altrimenti sodiemia meno la soglia (mai sotto 140)
      const thr = thresholdOf(v), hours = v.hours ?? 24;
      const target = v.naTarget ?? Math.max(140, v.na - thr);
      if (target >= v.na) {
        cards.push({title: 'Piano verso il target', level: 'warn', note: 'Il sodio target deve essere inferiore alla sodiemia attuale.'});
        return {cards};
      }
      const vol = M.freeWaterDeficit(v.na, t.value, target);
      const losses = (v.insensible ?? 0) * hours / 24;
      const rate = (vol * 1000 + losses) / hours;
      const drop24 = (v.na - target) * 24 / hours;
      const plan = {title: `Verso ${fmt(target, 0)} mEq/L in ${fmt(hours, 0)} h`, value: fmt(rate, 0), unit: 'mL/h', formula: 'deficit-acqua',
        sub: `Acqua libera da reintegrare: <b>${fmt(vol, 2)} L</b>${losses ? ` + perdite insensibili ${fmt(losses, 0)} mL` : ''}`,
        steps: [step('Volume', `${fmt(t.value)} × (${fmt(v.na)} / ${fmt(target, 0)} − 1)`, fmt(vol, 2), 'L'),
                step('Velocità', `(${fmt(vol * 1000, 0)} + ${fmt(losses, 0)}) mL / ${fmt(hours, 0)} h`, fmt(rate, 0), 'mL/h')]};
      if (v.naTarget == null) plan.note = `Target non inserito: uso sodiemia − soglia (${fmt(thr, 0)} mEq/L), non sotto 140.`;
      if (drop24 > thr + 1e-9) { plan.level = 'warn'; plan.note = `Riduzione equivalente a ${fmt(drop24, 1)} mEq/L in 24 h: supera la soglia di ${fmt(thr, 0)}.`; }
      cards.push(plan);
      return {cards};
    }
  },
  {
    id: 'fe', code: '1.3', area: 'idro', name: 'FENa e FEUrea',
    short: 'Escrezione frazionata di sodio e urea',
    req: [F.na, F.una, F.scr, F.ucr],
    opt: [F.urea, F.uurea],
    /**
     * @param {object} v valori di sessione
     * @returns {object} risultato
     */
    compute(v) {
      const missing = missingOf(v, this.req);
      if (missing.length) return {missing};
      const fe = M.fena(v.na, v.una, v.scr, v.ucr);
      const cards = [{title: 'FENa', value: fmt(fe, 2), unit: '%', formula: 'fena',
        steps: [step('FENa', `(${fmt(v.una, 0)} × ${fmt(v.scr, 2)}) / (${fmt(v.na, 0)} × ${fmt(v.ucr, 0)}) × 100`, fmt(fe, 2), '%')],
        note: 'In corso di diuretici la FENa è poco interpretabile: valuta la FEUrea.'}];
      if (v.urea != null && v.uurea != null) {
        const fu = M.feurea(v.urea, v.uurea, v.scr, v.ucr);
        cards.push({title: 'FEUrea', value: fmt(fu, 1), unit: '%', formula: 'feurea',
          steps: [step('FEUrea', `(${fmt(v.uurea, 0)} × ${fmt(v.scr, 2)}) / (${fmt(v.urea, 0)} × ${fmt(v.ucr, 0)}) × 100`, fmt(fu, 1), '%')]});
      } else {
        cards.push({title: 'FEUrea', note: 'Inserisci azotemia e urea urinaria tra i dati facoltativi.'});
      }
      return {cards};
    }
  },
  {
    id: 'gap', code: '1.4', area: 'idro', name: 'Gap anionico e gap osmolare',
    short: 'Gap anionico, correzione per albumina, delta-delta, osmolalità',
    req: [F.na, F.cl, F.hco3],
    opt: [F.alb, F.glu, F.urea, F.osmMeas, F.etoh],
    /**
     * @param {object} v valori di sessione
     * @returns {object} risultato
     */
    compute(v) {
      const missing = missingOf(v, this.req);
      if (missing.length) return {missing};
      const ag = M.anionGap(v.na, v.cl, v.hco3);
      const card = {title: 'Gap anionico', value: fmt(ag, 1), unit: 'mEq/L', formula: 'gap-anionico',
        steps: [step('AG', `${fmt(v.na, 0)} − (${fmt(v.cl, 0)} + ${fmt(v.hco3, 0)})`, fmt(ag, 1), 'mEq/L')],
        note: 'Valore normale dipendente dal laboratorio (circa 8-12 mEq/L).'};
      let agUsed = ag;
      if (v.alb != null) {
        agUsed = M.anionGapAlbumin(ag, v.alb);
        card.sub = `Corretto per albumina: <b>${fmt(agUsed, 1)} mEq/L</b>`;
        card.steps.push(step('AG corretto', `${fmt(ag, 1)} + 2,5 × (4 − ${fmt(v.alb, 1)})`, fmt(agUsed, 1), 'mEq/L'));
      }
      const cards = [card];
      const dd = M.deltaDelta(agUsed, v.hco3);
      cards.push(dd == null
        ? {title: 'Rapporto delta-delta', formula: 'delta-delta', note: 'Non calcolato: il bicarbonato non è sotto 24 mEq/L.'}
        : {title: 'Rapporto delta-delta', value: fmt(dd, 2), formula: 'delta-delta',
           sub: `Calcolato con AG ${v.alb != null ? 'corretto' : 'non corretto'}`,
           steps: [step('Δ/Δ', `(${fmt(agUsed, 1)} − 12) / (24 − ${fmt(v.hco3, 0)})`, fmt(dd, 2))],
           note: 'Lettura orientativa: < 1 acidosi a gap normale associata · 1-2 acidosi a gap elevato · > 2 alcalosi metabolica associata.'});
      if (v.glu != null && v.urea != null) {
        const osm = M.calculatedOsm(v.na, v.glu, v.urea, v.etoh ?? 0);
        const bun = M.ureaToBun(v.urea);
        const c = {title: 'Osmolalità calcolata', value: fmt(osm, 0), unit: 'mOsm/kg', formula: 'gap-osmolare',
          steps: [step('BUN', `${fmt(v.urea, 0)} / 2,14`, fmt(bun, 1), 'mg/dL'),
                  step('Osm', `2 × ${fmt(v.na, 0)} + ${fmt(v.glu, 0)} / 18 + ${fmt(bun, 1)} / 2,8${v.etoh ? ` + ${fmt(v.etoh, 0)} / 3,7` : ''}`, fmt(osm, 1), 'mOsm/kg')]};
        if (v.osmMeas != null) {
          const gap = v.osmMeas - osm;
          c.sub = `Gap osmolare: <b>${fmt(gap, 0)} mOsm/kg</b>`;
          c.steps.push(step('Gap', `${fmt(v.osmMeas, 0)} − ${fmt(osm, 1)}`, fmt(gap, 1), 'mOsm/kg'));
        } else c.note = 'Per il gap osmolare inserisci l\'osmolalità misurata.';
        cards.push(c);
      } else {
        cards.push({title: 'Gap osmolare', note: 'Inserisci glicemia, azotemia e osmolalità misurata tra i dati facoltativi.'});
      }
      return {cards};
    }
  },
  {
    id: 'cak', code: '1.5', area: 'idro', name: 'Correzione di calcio e potassio',
    short: 'Calcio corretto per albumina, potassio e pH, deficit di K',
    req: [F.ca, F.alb, F.k, F.ph],
    reqNote: 'Basta una coppia: calcio + albumina, oppure potassio + pH.',
    anyOf: true,
    opt: [F.mg],
    /**
     * @param {object} v valori di sessione
     * @returns {object} risultato
     */
    compute(v) {
      const caOk = v.ca != null && v.alb != null, kOk = v.k != null && v.ph != null;
      if (!caOk && !kOk) return {missing: ['calcio + albumina, oppure potassio + pH']};
      const cards = [];
      if (caOk) {
        const c = M.calciumPayne(v.ca, v.alb);
        cards.push({title: 'Calcio corretto per albumina', value: fmt(c, 2), unit: 'mg/dL', formula: 'calcio-payne',
          steps: [step('Ca corretto', `${fmt(v.ca, 2)} + 0,8 × (4 − ${fmt(v.alb, 1)})`, fmt(c, 2), 'mg/dL')],
          note: 'Approssimazione: con CKD avanzata o paziente critico il calcio ionizzato misurato è più affidabile.'});
      }
      if (kOk) {
        const mid = M.potassiumAtNormalPh(v.k, v.ph), a = M.potassiumAtNormalPh(v.k, v.ph, 0.2), b = M.potassiumAtNormalPh(v.k, v.ph, 1.7);
        const lo = Math.min(a, b), hi = Math.max(a, b);
        const card = {title: 'Potassio stimato a pH 7,40', value: fmt(mid, 1), unit: 'mEq/L', level: 'info', formula: 'potassio-ph',
          sub: `Intervallo plausibile ${fmt(lo, 1)}–${fmt(hi, 1)} mEq/L (fattore 0,2–1,7 per 0,1 di pH)`,
          steps: [step('K a pH 7,40', `${fmt(v.k, 1)} − 0,6 × (7,40 − ${fmt(v.ph, 2)}) / 0,1`, fmt(mid, 1), 'mEq/L')],
          note: 'Stima empirica con grande variabilità individuale; non vale nelle acidosi organiche (lattica, chetoacidosi).'};
        const def = M.potassiumDeficit(mid);
        if (def) {
          card.sub += `<br>Deficit corporeo indicativo: <b>${fmt(def.min, 0)}–${fmt(def.max, 0)} mEq</b> (ordine di grandezza, non una dose)`;
          card.steps.push(step('Deficit', `(4 − ${fmt(mid, 1)}) × 200…400`, `${fmt(def.min, 0)}–${fmt(def.max, 0)}`, 'mEq'));
        }
        cards.push(card);
      }
      if (v.mg != null) cards.push({title: 'Magnesio', value: fmt(v.mg, 1), unit: 'mg/dL', note: 'Riportato per completezza: non entra in nessuna formula di questa pagina.'});
      return {cards};
    }
  }
];
