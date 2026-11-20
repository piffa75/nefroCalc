/**
 * Area 2 — Funzione renale (calcolatori 2.1–2.3).
 */
import * as M from '../formulas.js';
import {F} from '../fields.js';
import {fmt, missingOf, step} from '../ui.js';

/**
 * Categoria KDIGO del GFR.
 * @param {number} g eGFR (mL/min/1,73 m²)
 * @returns {string} categoria G1–G5
 */
function kdigoG(g) {
  return g >= 90 ? 'G1' : g >= 60 ? 'G2' : g >= 45 ? 'G3a' : g >= 30 ? 'G3b' : g >= 15 ? 'G4' : 'G5';
}

/**
 * Restituisce l'eGFR inserito oppure lo calcola con CKD-EPI 2021 dai dati di sessione.
 * @param {object} v valori di sessione
 * @returns {{value:number, computed:boolean}|null} eGFR e provenienza, null se non disponibile
 */
function egfrOf(v) {
  if (v.egfr != null) return {value: v.egfr, computed: false};
  if (v.scr != null && v.age != null && v.sex) return {value: M.ckdEpi2021Cr(v.scr, v.age, v.sex), computed: true};
  return null;
}

export const CALCS = [
  {
    id: 'egfr', code: '2.1', area: 'renale', name: 'Filtrato glomerulare multi-formula',
    short: 'CKD-EPI 2021, cistatina C, MDRD, Cockcroft-Gault, BSA',
    req: [F.sex, F.age, F.scr],
    opt: [F.weight, F.height, F.scys],
    /**
     * @param {object} v valori di sessione
     * @returns {object} risultato
     */
    compute(v) {
      const missing = missingOf(v, this.req);
      if (missing.length) return {missing};
      const sx = v.sex === 'F' ? ' × 1,012' : '';
      const k = v.sex === 'F' ? 0.7 : 0.9;
      const e21 = M.ckdEpi2021Cr(v.scr, v.age, v.sex);
      const cards = [{title: 'CKD-EPI 2021 (creatinina)', value: fmt(e21, 0), unit: 'mL/min/1,73 m²', sub: `Categoria KDIGO ${kdigoG(e21)}`, formula: 'ckdepi2021',
        steps: [`Scr/κ = ${fmt(v.scr, 2)} / ${fmt(k, 1)} = ${fmt(v.scr / k, 3)}`,
          step('eGFR', `142 × min(${fmt(v.scr / k, 3)}; 1)^${v.sex === 'F' ? '−0,241' : '−0,302'} × max(${fmt(v.scr / k, 3)}; 1)^−1,200 × 0,9938^${fmt(v.age, 0)}${sx}`, fmt(e21, 1), 'mL/min/1,73 m²')]}];
      if (v.scys != null) {
        const ec = M.ckdEpi2021CrCys(v.scr, v.scys, v.age, v.sex), ey = M.ckdEpi2012Cys(v.scys, v.age, v.sex);
        cards.push({title: 'CKD-EPI 2021 creatinina-cistatina C', value: fmt(ec, 0), unit: 'mL/min/1,73 m²', sub: `Categoria KDIGO ${kdigoG(ec)}`, formula: 'ckdepi2021-cys',
          steps: [`Scys/0,8 = ${fmt(v.scys / 0.8, 3)}`, step('eGFR cr-cys', 'vedi formula', fmt(ec, 1), 'mL/min/1,73 m²')]});
        cards.push({title: 'CKD-EPI 2012 cistatina C', value: fmt(ey, 0), unit: 'mL/min/1,73 m²', sub: `Categoria KDIGO ${kdigoG(ey)}`, formula: 'ckdepi2012-cys',
          steps: [step('eGFR cys', `133 × min(${fmt(v.scys / 0.8, 3)}; 1)^−0,499 × max(${fmt(v.scys / 0.8, 3)}; 1)^−1,328 × 0,996^${fmt(v.age, 0)}${v.sex === 'F' ? ' × 0,932' : ''}`, fmt(ey, 1), 'mL/min/1,73 m²')]});
      }
      const md = M.mdrd(v.scr, v.age, v.sex);
      cards.push({title: 'MDRD (IDMS)', value: fmt(md, 0), unit: 'mL/min/1,73 m²', formula: 'mdrd',
        steps: [step('eGFR', `175 × ${fmt(v.scr, 2)}^−1,154 × ${fmt(v.age, 0)}^−0,203${v.sex === 'F' ? ' × 0,742' : ''}`, fmt(md, 1), 'mL/min/1,73 m²')],
        note: 'Sottostima il GFR sopra 60 mL/min/1,73 m².'});
      if (v.weight != null) {
        const cg = M.cockcroftGault(v.age, v.weight, v.scr, v.sex);
        const c = {title: 'Cockcroft-Gault', value: fmt(cg, 0), unit: 'mL/min', sub: 'Peso reale, valore non indicizzato', formula: 'cockcroft',
          steps: [step('CrCl', `(140 − ${fmt(v.age, 0)}) × ${fmt(v.weight)} / (72 × ${fmt(v.scr, 2)})${v.sex === 'F' ? ' × 0,85' : ''}`, fmt(cg, 1), 'mL/min')]};
        if (v.height != null) {
          const b = M.bmi(v.weight, v.height);
          c.sub += ` · BMI ${fmt(b, 1)} kg/m²`;
          if (b >= 30) {
            const ibw = M.ibwDevine(v.height, v.sex), adj = M.adjustedBodyWeight(v.weight, ibw), cga = M.cockcroftGault(v.age, adj, v.scr, v.sex);
            c.sub += `<br>Con peso aggiustato (${fmt(adj, 1)} kg): <b>${fmt(cga, 0)} mL/min</b>`;
            c.steps.push(step('Peso ideale', `${v.sex === 'M' ? '50' : '45,5'} + 2,3 × (${fmt(v.height / 2.54, 1)} − 60)`, fmt(ibw, 1), 'kg'),
              step('Peso aggiustato', `${fmt(ibw, 1)} + 0,4 × (${fmt(v.weight)} − ${fmt(ibw, 1)})`, fmt(adj, 1), 'kg'),
              step('CrCl aggiustata', `(140 − ${fmt(v.age, 0)}) × ${fmt(adj, 1)} / (72 × ${fmt(v.scr, 2)})${v.sex === 'F' ? ' × 0,85' : ''}`, fmt(cga, 1), 'mL/min'));
          }
        }
        cards.push(c);
      }
      if (v.weight != null && v.height != null) {
        const bsa = M.bsaDuBois(v.weight, v.height), de = M.deindexEgfr(e21, bsa);
        cards.push({title: 'eGFR non indicizzato (CKD-EPI 2021)', value: fmt(de, 0), unit: 'mL/min', sub: `BSA Du Bois ${fmt(bsa, 2)} m²`, formula: 'bsa',
          steps: [step('BSA', `0,007184 × ${fmt(v.weight)}^0,425 × ${fmt(v.height, 0)}^0,725`, fmt(bsa, 3), 'm²'),
                  step('GFR', `${fmt(e21, 1)} × ${fmt(bsa, 3)} / 1,73`, fmt(de, 1), 'mL/min')]});
      } else {
        cards.push({title: 'Cockcroft-Gault e BSA', note: 'Inserisci peso e altezza tra i dati facoltativi per clearance, BSA ed eGFR non indicizzato.'});
      }
      return {cards};
    }
  },
  {
    id: 'kfre', code: '2.2', area: 'renale', name: 'Rischio di insufficienza renale (KFRE)',
    short: 'Probabilità a 2 e 5 anni di dialisi o trapianto',
    req: [F.sex, F.age, F.egfr, F.acr],
    reqNote: 'Se lasci vuoto l\'eGFR lo calcolo con CKD-EPI 2021 dalla creatinina di sessione.',
    soft: ['egfr'],
    opt: [F.scr, F.ca, F.phos, F.hco3, F.alb],
    /**
     * @param {object} v valori di sessione
     * @returns {object} risultato
     */
    compute(v) {
      const missing = missingOf(v, [F.sex, F.age, F.acr]);
      const g = egfrOf(v);
      if (!g) missing.push('eGFR (o creatinina sierica)');
      if (missing.length) return {missing};
      const p = {age: v.age, sex: v.sex, egfr: g.value, acr: v.acr, ca: v.ca, phos: v.phos, hco3: v.hco3, alb: v.alb};
      const r2 = M.kfre(p, 4, 2), r5 = M.kfre(p, 4, 5);
      const src = g.computed ? `eGFR ${fmt(g.value, 0)} calcolato con CKD-EPI 2021` : `eGFR ${fmt(g.value, 0)} inserito`;
      const card4 = {title: 'KFRE 4 variabili', value: `${fmt(r2, 1)}% · ${fmt(r5, 1)}%`, sub: `a 2 anni · a 5 anni — ${src}`, formula: 'kfre',
        steps: [`ln ACR = ln(${fmt(v.acr, 0)}) = ${fmt(Math.log(v.acr), 3)}`, `Calibrazione non nordamericana (S0 0,9832 e 0,9365)`]};
      const cards = [card4];
      if (g.value < 10 || g.value > 60) { card4.level = 'warn'; card4.note = 'eGFR fuori dall\'intervallo di validazione (10-60 mL/min/1,73 m²): stima poco affidabile.'; }
      if ([v.ca, v.phos, v.hco3, v.alb].every(x => x != null)) {
        const e2 = M.kfre(p, 8, 2), e5 = M.kfre(p, 8, 5);
        cards.push({title: 'KFRE 8 variabili', value: `${fmt(e2, 1)}% · ${fmt(e5, 1)}%`, sub: 'a 2 anni · a 5 anni', formula: 'kfre',
          steps: ['Aggiunge albumina, fosforo, bicarbonato e calcio sierici', 'Calibrazione non nordamericana (S0 0,9827 e 0,9245)']});
      } else {
        cards.push({title: 'KFRE 8 variabili', note: 'Inserisci calcio, fosforo, bicarbonato e albumina tra i dati facoltativi.'});
      }
      return {cards};
    }
  },
  {
    id: 'proteinuria', code: '2.3', area: 'renale', name: 'Rapporto proteinuria/creatininuria',
    short: 'uPCR, uACR e stima delle 24 ore',
    req: [F.ucr, F.uprot, F.ualb],
    reqNote: 'Creatinina urinaria più almeno uno tra proteine e albumina urinarie.',
    anyOf: true,
    opt: [F.weight, F.age, F.sex],
    /**
     * @param {object} v valori di sessione
     * @returns {object} risultato
     */
    compute(v) {
      if (v.ucr == null || (v.uprot == null && v.ualb == null)) return {missing: ['creatinina urinaria + proteine o albumina urinarie']};
      const ix = v.weight != null && v.age != null && v.sex ? M.ixCreatinineExcretion(v.weight, v.age, v.sex) : null;
      const cards = [];
      /**
       * Crea la card di un rapporto con la stima delle 24 ore.
       * @param {string} title titolo
       * @param {number} ratio rapporto in mg/g
       * @param {string} expr passaggio di calcolo del rapporto
       * @param {string} name nome breve (uPCR/uACR)
       */
      const add = (title, ratio, expr, name) => {
        const c = {title, value: fmt(ratio, 0), unit: 'mg/g', formula: 'upcr', steps: [step(name, expr, fmt(ratio, 0), 'mg/g')]};
        if (ix) {
          const day = ratio * ix / 1000;
          c.sub = `Stima 24 h: <b>${fmt(day / 1000, 2)} g/24 h</b> (creatinina attesa ${fmt(ix, 0)} mg/die)`;
          c.steps.push(step('Creatinina attesa', `879,89 + 12,51 × ${fmt(v.weight)} − 6,19 × ${fmt(v.age, 0)}${v.sex === 'F' ? ' − 379,42' : ''}`, fmt(ix, 0), 'mg/die'),
            step('Stima 24 h', `${fmt(ratio, 0)} × ${fmt(ix / 1000, 3)}`, fmt(day, 0), 'mg/24 h'));
        } else {
          c.sub = `Stima classica (1 g di creatinina al giorno): <b>${fmt(ratio / 1000, 2)} g/24 h</b>`;
          c.note = 'Con peso, età e sesso la stima delle 24 h usa la creatinina attesa individuale.';
        }
        cards.push(c);
      };
      if (v.uprot != null) add('uPCR', M.upcr(v.uprot, v.ucr), `${fmt(v.uprot, 0)} / ${fmt(v.ucr, 0)} × 1000`, 'uPCR');
      if (v.ualb != null) add('uACR', M.uacr(v.ualb, v.ucr), `${fmt(v.ualb, 0)} / ${fmt(v.ucr, 0)} × 100`, 'uACR');
      return {cards};
    }
  }
];
