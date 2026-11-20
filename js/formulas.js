/**
 * NefroCalc — formule.
 *
 * Funzioni pure: nessun accesso al DOM, nessuno stato, nessuna rete.
 * Unità fisse in ingresso, le conversioni le fa l'interfaccia:
 *   creatinina mg/dL · urea (azotemia) mg/dL · glucosio mg/dL · albumina g/dL
 *   calcio e fosforo mg/dL · Na, K, Cl, HCO3 mEq/L · cistatina C mg/L
 *   peso kg · altezza cm · età anni · sesso 'M' | 'F'
 *
 * In fondo al file c'è FORMULE: i metadati che generano la pagina "Formule di riferimento".
 * Ogni funzione ha la sua voce lì; se cambio una formula aggiorno entrambe nello stesso commit.
 */

/* ============ Area 1 · Bilancio idro-elettrolitico e acido-base ============ */

/**
 * Stima l'acqua corporea totale come frazione del peso, per sesso ed età.
 * @param {number} weight peso in kg
 * @param {'M'|'F'} sex sesso
 * @param {number} age età in anni (da 65 in su uso le frazioni dell'anziano)
 * @returns {{value:number, fraction:number}} TBW in litri e frazione usata
 */
export function tbw(weight, sex, age) {
  const elderly = age >= 65;
  const fraction = sex === 'M' ? (elderly ? 0.5 : 0.6) : (elderly ? 0.45 : 0.5);
  return {value: weight * fraction, fraction};
}

/**
 * Corregge la sodiemia per l'iperglicemia con i fattori di Katz (1,6) e Hillier (2,4).
 * Sotto 100 mg/dL di glicemia non applico correzione.
 * @param {number} na sodio sierico misurato (mEq/L)
 * @param {number} glucose glicemia (mg/dL)
 * @returns {{katz:number, hillier:number, excess:number}} sodio corretto con i due fattori ed eccesso glicemico in centinaia di mg/dL
 */
export function naGlucoseCorrection(na, glucose) {
  const excess = Math.max(0, glucose - 100) / 100;
  return {katz: na + 1.6 * excess, hillier: na + 2.4 * excess, excess};
}

/**
 * Variazione attesa della sodiemia dopo 1 L di infusione (Adrogué-Madias).
 * @param {number} naSerum sodio sierico (mEq/L)
 * @param {number} infNa sodio della soluzione (mEq/L)
 * @param {number} infK potassio della soluzione (mEq/L)
 * @param {number} tbwL acqua corporea totale (L)
 * @returns {number} ΔNa in mEq/L per litro infuso
 */
export function adrogueMadias(naSerum, infNa, infK, tbwL) {
  return (infNa + infK - naSerum) / (tbwL + 1);
}

/**
 * Clearance dell'acqua libera da elettroliti.
 * @param {number} urineVolMl diuresi nel periodo (mL)
 * @param {number} uNa sodio urinario (mEq/L)
 * @param {number} uK potassio urinario (mEq/L)
 * @param {number} pNa sodio plasmatico (mEq/L)
 * @returns {number} mL nello stesso periodo della diuresi (positivo = perdita di acqua libera)
 */
export function electrolyteFreeWaterClearance(urineVolMl, uNa, uK, pNa) {
  return urineVolMl * (1 - (uNa + uK) / pNa);
}

/**
 * Deficit di acqua libera per portare la sodiemia al valore indicato.
 * @param {number} na sodio sierico attuale (mEq/L)
 * @param {number} tbwL acqua corporea totale (L)
 * @param {number} [target=140] sodiemia da raggiungere (mEq/L)
 * @returns {number} litri di acqua libera
 */
export function freeWaterDeficit(na, tbwL, target = 140) {
  return tbwL * (na / target - 1);
}

/**
 * Escrezione frazionata del sodio.
 * @param {number} pNa sodio sierico (mEq/L)
 * @param {number} uNa sodio urinario (mEq/L)
 * @param {number} pCr creatinina sierica (mg/dL)
 * @param {number} uCr creatinina urinaria (mg/dL)
 * @returns {number} FENa in %
 */
export function fena(pNa, uNa, pCr, uCr) {
  return (uNa * pCr) / (pNa * uCr) * 100;
}

/**
 * Escrezione frazionata dell'urea. Le unità dell'urea si semplificano: serve solo che siano uguali.
 * @param {number} pUrea urea sierica (mg/dL)
 * @param {number} uUrea urea urinaria (mg/dL)
 * @param {number} pCr creatinina sierica (mg/dL)
 * @param {number} uCr creatinina urinaria (mg/dL)
 * @returns {number} FEUrea in %
 */
export function feurea(pUrea, uUrea, pCr, uCr) {
  return (uUrea * pCr) / (pUrea * uCr) * 100;
}

/**
 * Gap anionico senza potassio.
 * @param {number} na sodio (mEq/L)
 * @param {number} cl cloro (mEq/L)
 * @param {number} hco3 bicarbonato (mEq/L)
 * @returns {number} gap anionico (mEq/L)
 */
export function anionGap(na, cl, hco3) {
  return na - (cl + hco3);
}

/**
 * Gap anionico corretto per l'albumina (Figge).
 * @param {number} ag gap anionico (mEq/L)
 * @param {number} alb albumina sierica (g/dL)
 * @returns {number} gap anionico corretto (mEq/L)
 */
export function anionGapAlbumin(ag, alb) {
  return ag + 2.5 * (4 - alb);
}

/**
 * Rapporto delta-delta (ΔAG / ΔHCO3).
 * @param {number} ag gap anionico, corretto se disponibile (mEq/L)
 * @param {number} hco3 bicarbonato (mEq/L)
 * @param {number} [agNormal=12] gap anionico normale di riferimento
 * @param {number} [hco3Normal=24] bicarbonato normale di riferimento
 * @returns {number|null} rapporto, null se il bicarbonato non è ridotto
 */
export function deltaDelta(ag, hco3, agNormal = 12, hco3Normal = 24) {
  if (hco3 >= hco3Normal) return null; // senza calo del bicarbonato il rapporto non ha senso
  return (ag - agNormal) / (hco3Normal - hco3);
}

/**
 * Converte l'urea (azotemia) in azoto ureico (BUN).
 * @param {number} urea urea in mg/dL
 * @returns {number} BUN in mg/dL
 */
export function ureaToBun(urea) {
  return urea / 2.14;
}

/**
 * Osmolalità sierica calcolata: 2·Na + glucosio/18 + BUN/2,8 + etanolo/3,7.
 * @param {number} na sodio (mEq/L)
 * @param {number} glucose glicemia (mg/dL)
 * @param {number} urea urea (mg/dL), convertita in BUN
 * @param {number} [ethanol=0] etanolo (mg/dL)
 * @returns {number} osmolalità calcolata (mOsm/kg)
 */
export function calculatedOsm(na, glucose, urea, ethanol = 0) {
  return 2 * na + glucose / 18 + ureaToBun(urea) / 2.8 + ethanol / 3.7;
}

/**
 * Calcio corretto per l'albumina (Payne).
 * @param {number} ca calcio totale (mg/dL)
 * @param {number} alb albumina (g/dL)
 * @returns {number} calcio corretto (mg/dL)
 */
export function calciumPayne(ca, alb) {
  return ca + 0.8 * (4 - alb);
}

/**
 * Stima empirica della kaliemia riportata a pH 7,40.
 * @param {number} k potassio misurato (mEq/L)
 * @param {number} ph pH ematico
 * @param {number} [factor=0.6] mEq/L di K per 0,1 unità di pH (in letteratura da 0,2 a 1,7)
 * @returns {number} potassio stimato a pH 7,40 (mEq/L)
 */
export function potassiumAtNormalPh(k, ph, factor = 0.6) {
  return k - factor * (7.40 - ph) / 0.1;
}

/**
 * Stima grossolana del deficit corporeo di potassio: 200-400 mEq per ogni mEq/L sotto 4.
 * @param {number} k potassio di riferimento (mEq/L), meglio se già riportato a pH 7,40
 * @returns {{min:number, max:number}|null} intervallo in mEq, null se K ≥ 4
 */
export function potassiumDeficit(k) {
  if (k >= 4) return null;
  const d = 4 - k;
  return {min: d * 200, max: d * 400};
}

/* ============ Area 2 · Funzione renale ============ */

/**
 * eGFR CKD-EPI 2021 con creatinina, senza coefficiente razziale.
 * @param {number} scr creatinina sierica (mg/dL, metodo IDMS)
 * @param {number} age età (anni)
 * @param {'M'|'F'} sex sesso
 * @returns {number} eGFR (mL/min/1,73 m²)
 */
export function ckdEpi2021Cr(scr, age, sex) {
  const f = sex === 'F', k = f ? 0.7 : 0.9, a = f ? -0.241 : -0.302, x = scr / k;
  return 142 * Math.min(x, 1) ** a * Math.max(x, 1) ** -1.2 * 0.9938 ** age * (f ? 1.012 : 1);
}

/**
 * eGFR CKD-EPI 2021 con creatinina e cistatina C.
 * @param {number} scr creatinina sierica (mg/dL)
 * @param {number} scys cistatina C (mg/L)
 * @param {number} age età (anni)
 * @param {'M'|'F'} sex sesso
 * @returns {number} eGFR (mL/min/1,73 m²)
 */
export function ckdEpi2021CrCys(scr, scys, age, sex) {
  const f = sex === 'F', k = f ? 0.7 : 0.9, a = f ? -0.219 : -0.144, x = scr / k, y = scys / 0.8;
  return 135 * Math.min(x, 1) ** a * Math.max(x, 1) ** -0.544 * Math.min(y, 1) ** -0.323 * Math.max(y, 1) ** -0.778
    * 0.9961 ** age * (f ? 0.963 : 1);
}

/**
 * eGFR CKD-EPI 2012 con sola cistatina C.
 * @param {number} scys cistatina C (mg/L)
 * @param {number} age età (anni)
 * @param {'M'|'F'} sex sesso
 * @returns {number} eGFR (mL/min/1,73 m²)
 */
export function ckdEpi2012Cys(scys, age, sex) {
  const y = scys / 0.8;
  return 133 * Math.min(y, 1) ** -0.499 * Math.max(y, 1) ** -1.328 * 0.996 ** age * (sex === 'F' ? 0.932 : 1);
}

/**
 * eGFR MDRD a 4 variabili, versione IDMS (175), senza coefficiente razziale.
 * @param {number} scr creatinina sierica (mg/dL)
 * @param {number} age età (anni)
 * @param {'M'|'F'} sex sesso
 * @returns {number} eGFR (mL/min/1,73 m²)
 */
export function mdrd(scr, age, sex) {
  return 175 * scr ** -1.154 * age ** -0.203 * (sex === 'F' ? 0.742 : 1);
}

/**
 * Superficie corporea secondo Du Bois.
 * @param {number} weight peso (kg)
 * @param {number} height altezza (cm)
 * @returns {number} BSA (m²)
 */
export function bsaDuBois(weight, height) {
  return 0.007184 * weight ** 0.425 * height ** 0.725;
}

/**
 * Indice di massa corporea.
 * @param {number} weight peso (kg)
 * @param {number} height altezza (cm)
 * @returns {number} BMI (kg/m²)
 */
export function bmi(weight, height) {
  return weight / (height / 100) ** 2;
}

/**
 * Peso ideale secondo Devine.
 * @param {number} height altezza (cm)
 * @param {'M'|'F'} sex sesso
 * @returns {number} peso ideale (kg)
 */
export function ibwDevine(height, sex) {
  return (sex === 'M' ? 50 : 45.5) + 2.3 * (height / 2.54 - 60);
}

/**
 * Peso aggiustato: ideale + 0,4 × (reale − ideale).
 * @param {number} weight peso reale (kg)
 * @param {number} ibw peso ideale (kg)
 * @returns {number} peso aggiustato (kg)
 */
export function adjustedBodyWeight(weight, ibw) {
  return ibw + 0.4 * (weight - ibw);
}

/**
 * Clearance della creatinina stimata con Cockcroft-Gault.
 * @param {number} age età (anni)
 * @param {number} weight peso usato (kg)
 * @param {number} scr creatinina sierica (mg/dL)
 * @param {'M'|'F'} sex sesso
 * @returns {number} clearance (mL/min, non indicizzata)
 */
export function cockcroftGault(age, weight, scr, sex) {
  return (140 - age) * weight / (72 * scr) * (sex === 'F' ? 0.85 : 1);
}

/**
 * Riporta un eGFR indicizzato alla superficie corporea reale.
 * @param {number} egfr eGFR (mL/min/1,73 m²)
 * @param {number} bsa superficie corporea (m²)
 * @returns {number} GFR non indicizzato (mL/min)
 */
export function deindexEgfr(egfr, bsa) {
  return egfr * bsa / 1.73;
}

/** Coefficienti KFRE (Tangri 2011) e sopravvivenza basale con calibrazione non nordamericana (Tangri 2016). */
const KFRE = {
  4: {age: -0.2201, male: 0.2467, egfr: -0.5567, lnacr: 0.4510, s0: {2: 0.9832, 5: 0.9365}},
  8: {age: -0.1992, male: 0.1602, egfr: -0.4919, lnacr: 0.3364, alb: -0.3441, phos: 0.2604, hco3: -0.07354, ca: -0.2228,
      s0: {2: 0.9827, 5: 0.9245}}
};

/**
 * Kidney Failure Risk Equation, calibrazione non nordamericana.
 * @param {object} p parametri: age, sex, egfr (mL/min/1,73 m²), acr (mg/g); per 8 variabili anche ca (mg/dL), phos (mg/dL), hco3 (mEq/L), alb (g/dL)
 * @param {4|8} vars numero di variabili del modello
 * @param {2|5} years orizzonte temporale
 * @returns {number} rischio in % di insufficienza renale trattata (dialisi o trapianto)
 */
export function kfre(p, vars, years) {
  const c = KFRE[vars];
  let lp = c.age * (p.age / 10 - 7.036) + c.male * ((p.sex === 'M' ? 1 : 0) - 0.5642)
    + c.egfr * (p.egfr / 5 - 7.222) + c.lnacr * (Math.log(p.acr) - 5.137);
  if (vars === 8) {
    lp += c.alb * (p.alb - 3.997) + c.phos * (p.phos - 3.916) + c.hco3 * (p.hco3 - 25.57) + c.ca * (p.ca - 9.355);
  }
  return (1 - c.s0[years] ** Math.exp(lp)) * 100;
}

/**
 * Rapporto proteine/creatinina urinarie.
 * @param {number} prot proteine urinarie (mg/dL)
 * @param {number} ucr creatinina urinaria (mg/dL)
 * @returns {number} uPCR (mg/g)
 */
export function upcr(prot, ucr) {
  return prot / ucr * 1000;
}

/**
 * Rapporto albumina/creatinina urinarie.
 * @param {number} albMgL albumina urinaria (mg/L)
 * @param {number} ucr creatinina urinaria (mg/dL)
 * @returns {number} uACR (mg/g)
 */
export function uacr(albMgL, ucr) {
  return albMgL / ucr * 100; // mg/L ÷ (mg/dL × 10) × 1000
}

/**
 * Escrezione giornaliera di creatinina attesa (Ix 2011, equazione senza fosforo, termine razziale escluso).
 * @param {number} weight peso (kg)
 * @param {number} age età (anni)
 * @param {'M'|'F'} sex sesso
 * @returns {number} creatinina attesa (mg/24 h)
 */
export function ixCreatinineExcretion(weight, age, sex) {
  return 879.89 + 12.51 * weight - 6.19 * age - (sex === 'F' ? 379.42 : 0);
}

/* ============ Area 3 · Trapianto renale ============ */

/**
 * Rapporto concentrazione/dose dell'immunosoppressore.
 * @param {number} c0 concentrazione pre-dose (ng/mL)
 * @param {number} dose dose giornaliera totale (mg/die)
 * @returns {number} C/D in (ng/mL)/(mg/die)
 */
export function cdRatio(c0, dose) {
  return c0 / dose;
}

/**
 * Area sotto la curva con il metodo dei trapezi lineari.
 * @param {Array<{t:number,c:number}>} points prelievi: tempo (h) e concentrazione (ng/mL)
 * @returns {number|null} AUC tra il primo e l'ultimo prelievo (ng·h/mL), null con meno di 2 punti
 */
export function aucTrapezoid(points) {
  const p = points.filter(x => Number.isFinite(x.t) && Number.isFinite(x.c)).sort((a, b) => a.t - b.t);
  if (p.length < 2) return null;
  let auc = 0;
  for (let i = 1; i < p.length; i++) auc += (p[i].t - p[i - 1].t) * (p[i].c + p[i - 1].c) / 2;
  return auc;
}

/**
 * Variazione assoluta e percentuale rispetto a un valore di riferimento.
 * @param {number} current valore attuale
 * @param {number} baseline valore basale
 * @returns {{abs:number, pct:number}} differenza e variazione %
 */
export function deltaChange(current, baseline) {
  return {abs: current - baseline, pct: (current - baseline) / baseline * 100};
}

/* ============ Area 4 · Vasculiti ============ */

/**
 * Calcola il BVAS v3.
 * Regola: se è la prima valutazione, se non è spuntato "persistente" o se c'è un item incompatibile
 * con la persistenza, tutti gli item si pesano come nuovi/peggiorati.
 * @param {Array} systems sistemi del BVAS con items [{id, p, n}] e massimi {maxP, maxN}
 * @param {Set<string>} selected id degli item presenti
 * @param {{persistent:boolean, firstVisit:boolean}} opts opzioni del modulo
 * @returns {{total:number, mode:'new'|'persistent', bySystem:Array<{id:string,name:string,raw:number,score:number,max:number}>}}
 */
export function bvas(systems, selected, opts) {
  const forcedNew = systems.some(s => s.items.some(i => selected.has(i.id) && i.p == null));
  const mode = opts.firstVisit || !opts.persistent || forcedNew ? 'new' : 'persistent';
  const bySystem = systems.map(s => {
    const raw = s.items.filter(i => selected.has(i.id)).reduce((a, i) => a + (mode === 'new' ? i.n : i.p), 0);
    const max = mode === 'new' ? s.maxN : s.maxP;
    return {id: s.id, name: s.name, raw, score: Math.min(raw, max), max};
  });
  return {total: bySystem.reduce((a, s) => a + s.score, 0), mode, bySystem};
}

/**
 * Dose cumulativa di più schemi di somministrazione.
 * @param {Array<{dose:number, times:number}>} lines dose (mg) per somministrazione e numero di somministrazioni
 * @param {number} [previousMg=0] dose cumulativa già ricevuta (mg)
 * @returns {number} dose totale (mg)
 */
export function cumulativeDose(lines, previousMg = 0) {
  return lines.reduce((a, l) => a + l.dose * l.times, previousMg);
}

/**
 * Scompone una dose in compresse intere o mezze (se divisibili), preferendo le intere:
 * ogni compressa intera "costa" 1, ogni mezza 2, e scelgo la combinazione di costo minimo.
 * @param {number} dose dose in mg
 * @param {Array<{mg:number, half:boolean}>} tablets compresse disponibili
 * @returns {Array<{mg:number, count:number, half:boolean}>|null} pezzi usati, null se la dose non è componibile
 */
export function tabletBreakdown(dose, tablets) {
  // Lavoro in decimi di mg per evitare errori di arrotondamento
  const pieces = [];
  tablets.forEach(t => {
    pieces.push({mg: t.mg, half: false, u: Math.round(t.mg * 10), cost: 1});
    if (t.half) pieces.push({mg: t.mg, half: true, u: Math.round(t.mg * 5), cost: 2});
  });
  const target = Math.round(dose * 10);
  if (target === 0) return [];
  const best = new Array(target + 1).fill(Infinity), from = new Array(target + 1).fill(-1);
  best[0] = 0;
  for (let a = 1; a <= target; a++) {
    pieces.forEach((p, i) => {
      if (p.u <= a && best[a - p.u] + p.cost < best[a]) { best[a] = best[a - p.u] + p.cost; from[a] = i; }
    });
  }
  if (!Number.isFinite(best[target])) return null;
  const count = new Map();
  for (let a = target; a > 0; a -= pieces[from[a]].u) count.set(from[a], (count.get(from[a]) || 0) + 1);
  return [...count.entries()].map(([i, c]) => ({mg: pieces[i].mg, half: pieces[i].half, count: c}))
    .sort((x, y) => y.mg - x.mg || Number(x.half) - Number(y.half));
}

/**
 * Genera un piano di scalaggio a gradini.
 * Ogni regola vale quando la dose corrente è sopra la sua soglia: tengo la dose per "every" giorni,
 * poi scendo di "step" mg, arrotondando al multiplo di "unit" e senza scendere sotto il target.
 * @param {object} p parametri
 * @param {number} p.start dose iniziale (mg/die)
 * @param {number} p.target dose finale di mantenimento (mg/die)
 * @param {Array<{above:number, step:number, every:number}>} p.rules regole di scalaggio
 * @param {number} p.unit incremento minimo componibile con le compresse (mg)
 * @returns {{steps:Array<{day:number, days:number|null, dose:number}>, error?:string}} gradini dal giorno 0
 */
export function taperPlan({start, target, rules, unit}) {
  const valid = rules.filter(r => r.step > 0 && r.every > 0).sort((a, b) => b.above - a.above);
  if (!valid.length) return {steps: [], error: 'Serve almeno una regola con riduzione e durata maggiori di zero.'};
  if (target >= start) return {steps: [{day: 0, days: null, dose: start}]};
  const roundTo = x => Math.round(x / unit) * unit;
  const steps = [];
  let dose = start, day = 0;
  for (let guard = 0; dose > target && guard < 400; guard++) {
    const rule = valid.find(r => dose > r.above) || valid[valid.length - 1];
    steps.push({day, days: rule.every, dose});
    day += rule.every;
    let next = roundTo(dose - rule.step);
    if (next >= dose) next = dose - unit; // l'arrotondamento non deve mai bloccare la discesa
    dose = Math.max(target, +next.toFixed(3));
  }
  steps.push({day, days: null, dose}); // ultimo gradino: mantenimento a tempo indeterminato
  return {steps};
}

/* ============ Metadati per la pagina "Formule di riferimento" ============ */

/**
 * Voci della pagina Formule. id = ancora usata dai calcolatori per il collegamento "Formula".
 * eq: equazione leggibile; params: [simbolo, significato, unità]; ref: fonte originale.
 */
export const FORMULE = [
  {id: 'tbw', area: 'idro', name: 'Acqua corporea totale (TBW)', use: 'Base per Adrogué-Madias e deficit di acqua libera.',
   eq: 'TBW = peso × f\nf = 0,6 uomo · 0,5 donna (sotto 65 anni)\nf = 0,5 uomo · 0,45 donna (65 anni e oltre)',
   params: [['peso', 'peso corporeo', 'kg'], ['f', 'frazione di acqua corporea', '—']],
   ref: 'Adrogué HJ, Madias NE. Hyponatremia. N Engl J Med 2000;342:1581-9.'},
  {id: 'na-glucosio', area: 'idro', name: 'Sodio corretto per glicemia (Katz, Hillier)', use: 'Pseudo-iponatriemia da iperglicemia.',
   eq: 'Na corretto (Katz) = Na + 1,6 × (glicemia − 100) / 100\nNa corretto (Hillier) = Na + 2,4 × (glicemia − 100) / 100',
   params: [['Na', 'sodio sierico misurato', 'mEq/L'], ['glicemia', 'glucosio sierico', 'mg/dL']],
   notes: 'Il fattore 2,4 descrive meglio la relazione per glicemie sopra 400 mg/dL. Sotto 100 mg/dL nessuna correzione.',
   ref: 'Katz MA. N Engl J Med 1973;289:843-4. · Hillier TA et al. Am J Med 1999;106:399-403.'},
  {id: 'adrogue', area: 'idro', name: 'Adrogué-Madias', use: 'Variazione attesa della sodiemia per 1 L di soluzione infusa.',
   eq: 'ΔNa = (Na inf + K inf − Na sierico) / (TBW + 1)',
   params: [['Na inf, K inf', 'sodio e potassio della soluzione', 'mEq/L'], ['TBW', 'acqua corporea totale', 'L']],
   notes: 'Non considera diuresi e perdite in corso: la correzione reale può essere più rapida. Soluzioni: glucosata 5% Na 0; NaCl 0,45% Na 77; NaCl 0,9% Na 154; NaCl 3% Na 513; Ringer lattato Na 130, K 4.',
   ref: 'Adrogué HJ, Madias NE. N Engl J Med 2000;342:1493-9 e 1581-9.'},
  {id: 'efwc', area: 'idro', name: 'Clearance dell\'acqua libera da elettroliti', use: 'Quota di acqua libera persa o trattenuta con le urine.',
   eq: 'EFWC = V × [1 − (Na u + K u) / Na p]',
   params: [['V', 'diuresi nel periodo', 'mL'], ['Na u, K u', 'sodio e potassio urinari', 'mEq/L'], ['Na p', 'sodio plasmatico', 'mEq/L']],
   notes: 'Valore positivo: le urine eliminano acqua libera (tende ad alzare la sodiemia). Negativo: la trattengono.',
   ref: 'Rose BD, Post TW. Clinical Physiology of Acid-Base and Electrolyte Disorders, 5ª ed. McGraw-Hill 2001.'},
  {id: 'deficit-acqua', area: 'idro', name: 'Deficit di acqua libera', use: 'Ipernatriemia.',
   eq: 'Deficit = TBW × (Na / Na target − 1)\nDeficit totale = deficit con Na target 140',
   params: [['Na', 'sodio sierico attuale', 'mEq/L'], ['Na target', 'sodiemia da raggiungere', 'mEq/L'], ['TBW', 'acqua corporea totale', 'L']],
   notes: 'Velocità oraria = (deficit + perdite insensibili nel periodo) / ore. Le perdite insensibili le inserisce l\'utente: l\'app non le stima.',
   ref: 'Adrogué HJ, Madias NE. Hypernatremia. N Engl J Med 2000;342:1493-9.'},
  {id: 'fena', area: 'idro', name: 'Escrezione frazionata del sodio (FENa)', use: 'Inquadramento del danno renale acuto.',
   eq: 'FENa (%) = (Na u × Cr p) / (Na p × Cr u) × 100',
   params: [['Na u, Na p', 'sodio urinario e sierico', 'mEq/L'], ['Cr u, Cr p', 'creatinina urinaria e sierica', 'mg/dL']],
   notes: 'Poco interpretabile in corso di diuretici: in quel caso è più utile la FEUrea.',
   ref: 'Espinel CH. JAMA 1976;236:579-81.'},
  {id: 'feurea', area: 'idro', name: 'Escrezione frazionata dell\'urea (FEUrea)', use: 'Alternativa alla FENa in corso di diuretici.',
   eq: 'FEUrea (%) = (Urea u × Cr p) / (Urea p × Cr u) × 100',
   params: [['Urea u, Urea p', 'urea urinaria e sierica (azotemia)', 'mg/dL'], ['Cr u, Cr p', 'creatinina urinaria e sierica', 'mg/dL']],
   ref: 'Carvounis CP, Nisar S, Guro-Razuman S. Kidney Int 2002;62:2223-9.'},
  {id: 'gap-anionico', area: 'idro', name: 'Gap anionico e correzione per albumina', use: 'Acidosi metabolica.',
   eq: 'AG = Na − (Cl + HCO3)\nAG corretto = AG + 2,5 × (4 − albumina)',
   params: [['Na, Cl, HCO3', 'elettroliti sierici', 'mEq/L'], ['albumina', 'albumina sierica', 'g/dL']],
   notes: 'Il valore normale dipende dal laboratorio (circa 8-12 mEq/L senza potassio).',
   ref: 'Figge J, Jabor A, Kazda A, Fencl V. Crit Care Med 1998;26:1807-10.'},
  {id: 'delta-delta', area: 'idro', name: 'Rapporto delta-delta', use: 'Disturbi acido-base misti.',
   eq: 'Δ/Δ = (AG − 12) / (24 − HCO3)',
   params: [['AG', 'gap anionico (corretto se disponibile l\'albumina)', 'mEq/L'], ['HCO3', 'bicarbonato', 'mEq/L']],
   notes: 'Calcolato solo con HCO3 sotto 24 mEq/L. Interpretazione orientativa: < 1 acidosi a gap normale associata; 1-2 acidosi a gap elevato pura; > 2 alcalosi metabolica associata.',
   ref: 'Wrenn K. Ann Emerg Med 1990;19:1310-3.'},
  {id: 'gap-osmolare', area: 'idro', name: 'Osmolalità calcolata e gap osmolare', use: 'Sospetto di osmoli non misurate (alcoli tossici).',
   eq: 'Osm calc = 2 × Na + glucosio / 18 + BUN / 2,8 + etanolo / 3,7\nBUN = urea / 2,14\nGap osmolare = Osm misurata − Osm calc',
   params: [['Na', 'sodio', 'mEq/L'], ['glucosio, urea, etanolo', 'concentrazioni sieriche', 'mg/dL'], ['Osm misurata', 'osmolalità sierica misurata', 'mOsm/kg']],
   notes: 'Il divisore 3,7 per l\'etanolo è quello derivato empiricamente; alcuni testi usano 4,6.',
   ref: 'Dorwart WV, Chalmers L. Clin Chem 1975;21:190-4. · Purssell RA et al. Ann Emerg Med 2001;38:653-9.'},
  {id: 'calcio-payne', area: 'idro', name: 'Calcio corretto per albumina (Payne)', use: 'Ipoalbuminemia.',
   eq: 'Ca corretto = Ca + 0,8 × (4 − albumina)',
   params: [['Ca', 'calcio totale', 'mg/dL'], ['albumina', 'albumina sierica', 'g/dL']],
   notes: 'Approssimazione: nei pazienti con CKD avanzata o critici è preferibile il calcio ionizzato misurato.',
   ref: 'Payne RB, Little AJ, Williams RB, Milner JR. BMJ 1973;4:643-6.'},
  {id: 'potassio-ph', area: 'idro', name: 'Potassio e pH (stima empirica)', use: 'Orientamento sulla kaliemia nelle alterazioni del pH.',
   eq: 'K a pH 7,40 ≈ K − 0,6 × (7,40 − pH) / 0,1\nIntervallo con fattore 0,2 e 1,7 mEq/L per 0,1 di pH\nDeficit ≈ (4 − K) × 200-400 mEq',
   params: [['K', 'potassio sierico', 'mEq/L'], ['pH', 'pH ematico', '—']],
   notes: 'Regola empirica con ampia variabilità individuale. Non vale nelle acidosi organiche (lattica, chetoacidosi). Il deficit è un ordine di grandezza, non una dose. Il magnesio non entra nel calcolo.',
   ref: 'Burnell JM et al. J Clin Invest 1956;35:935-9. · Adrogué HJ, Madias NE. Am J Med 1981;71:456-67. · Sterns RH et al. Medicine 1981;60:339-54.'},
  {id: 'ckdepi2021', area: 'renale', name: 'CKD-EPI 2021 creatinina', use: 'Stima del GFR nell\'adulto.',
   eq: 'eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^−1,200 × 0,9938^età × 1,012 [donna]\nκ = 0,7 donna · 0,9 uomo\nα = −0,241 donna · −0,302 uomo',
   params: [['Scr', 'creatinina sierica (IDMS)', 'mg/dL'], ['età', 'età', 'anni']],
   notes: 'Versione senza coefficiente razziale. Risultato in mL/min/1,73 m².',
   ref: 'Inker LA et al. N Engl J Med 2021;385:1737-49.'},
  {id: 'ckdepi2021-cys', area: 'renale', name: 'CKD-EPI 2021 creatinina-cistatina C', use: 'Stima del GFR combinata, più accurata.',
   eq: 'eGFR = 135 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^−0,544 × min(Scys/0,8, 1)^−0,323 × max(Scys/0,8, 1)^−0,778 × 0,9961^età × 0,963 [donna]\nκ = 0,7 donna · 0,9 uomo\nα = −0,219 donna · −0,144 uomo',
   params: [['Scr', 'creatinina sierica', 'mg/dL'], ['Scys', 'cistatina C', 'mg/L']],
   ref: 'Inker LA et al. N Engl J Med 2021;385:1737-49.'},
  {id: 'ckdepi2012-cys', area: 'renale', name: 'CKD-EPI 2012 cistatina C', use: 'Stima del GFR con sola cistatina C.',
   eq: 'eGFR = 133 × min(Scys/0,8, 1)^−0,499 × max(Scys/0,8, 1)^−1,328 × 0,996^età × 0,932 [donna]',
   params: [['Scys', 'cistatina C', 'mg/L']],
   ref: 'Inker LA et al. N Engl J Med 2012;367:20-9.'},
  {id: 'mdrd', area: 'renale', name: 'MDRD a 4 variabili (IDMS)', use: 'Stima storica del GFR, ancora presente in alcuni referti.',
   eq: 'eGFR = 175 × Scr^−1,154 × età^−0,203 × 0,742 [donna]',
   params: [['Scr', 'creatinina sierica (IDMS)', 'mg/dL']],
   notes: 'Coefficiente razziale omesso. Sottostima il GFR sopra 60 mL/min/1,73 m².',
   ref: 'Levey AS et al. Ann Intern Med 2006;145:247-54.'},
  {id: 'cockcroft', area: 'renale', name: 'Cockcroft-Gault', use: 'Clearance della creatinina, storicamente usata per il dosaggio dei farmaci.',
   eq: 'CrCl = (140 − età) × peso / (72 × Scr) × 0,85 [donna]\nPeso ideale (Devine) = 50 uomo / 45,5 donna + 2,3 × (altezza in pollici − 60)\nPeso aggiustato = ideale + 0,4 × (reale − ideale)',
   params: [['peso', 'peso reale o aggiustato', 'kg'], ['Scr', 'creatinina sierica', 'mg/dL'], ['altezza', 'per peso ideale (1 pollice = 2,54 cm)', 'cm']],
   notes: 'Risultato in mL/min, non indicizzato. Con BMI ≥ 30 l\'app mostra anche il valore con peso aggiustato.',
   ref: 'Cockcroft DW, Gault MH. Nephron 1976;16:31-41. · Devine BJ. Drug Intell Clin Pharm 1974;8:650-5. · Winter MA et al. Pharmacotherapy 2012;32:604-12.'},
  {id: 'bsa', area: 'renale', name: 'Superficie corporea (Du Bois) e eGFR non indicizzato', use: 'Dosaggio farmaci, dosi per m².',
   eq: 'BSA = 0,007184 × peso^0,425 × altezza^0,725\nGFR non indicizzato = eGFR × BSA / 1,73',
   params: [['peso', 'peso', 'kg'], ['altezza', 'altezza', 'cm']],
   ref: 'Du Bois D, Du Bois EF. Arch Intern Med 1916;17:863-71.'},
  {id: 'kfre', area: 'renale', name: 'Kidney Failure Risk Equation (KFRE)', use: 'Rischio a 2 e 5 anni di dialisi o trapianto nella CKD 3-5.',
   eq: 'Rischio = 1 − S0 ^ exp(Σ β × (x − media))\n4 variabili: −0,2201 × (età/10 − 7,036) + 0,2467 × (maschio − 0,5642) − 0,5567 × (eGFR/5 − 7,222) + 0,4510 × (ln ACR − 5,137)\nS0 non nordamericana: 0,9832 a 2 anni · 0,9365 a 5 anni\n8 variabili: −0,1992 età · 0,1602 maschio · −0,4919 eGFR · 0,3364 ln ACR · −0,3441 × (albumina − 3,997) · 0,2604 × (fosforo − 3,916) · −0,07354 × (HCO3 − 25,57) · −0,2228 × (calcio − 9,355)\nS0 non nordamericana: 0,9827 a 2 anni · 0,9245 a 5 anni',
   params: [['eGFR', 'mL/min/1,73 m²', ''], ['ACR', 'albumina/creatinina urinaria', 'mg/g'], ['albumina', 'sierica', 'g/dL'], ['fosforo, calcio', 'sierici', 'mg/dL'], ['HCO3', 'bicarbonato', 'mEq/L']],
   notes: 'Validata con eGFR tra 10 e 60 mL/min/1,73 m². L\'app usa la calibrazione per popolazioni non nordamericane, adatta a pazienti europei.',
   ref: 'Tangri N et al. JAMA 2011;305:1553-9. · Tangri N et al. JAMA 2016;315:164-74.'},
  {id: 'upcr', area: 'renale', name: 'uPCR, uACR e stima delle 24 ore', use: 'Quantificazione di proteinuria e albuminuria su campione singolo.',
   eq: 'uPCR (mg/g) = proteine u (mg/dL) / creatinina u (mg/dL) × 1000\nuACR (mg/g) = albumina u (mg/L) / creatinina u (mg/dL) × 100\nCreatinina attesa (mg/24 h) = 879,89 + 12,51 × peso − 6,19 × età − 379,42 [donna]\nStima 24 h = rapporto (mg/g) × creatinina attesa (g/24 h)',
   params: [['peso', 'peso', 'kg'], ['età', 'età', 'anni']],
   notes: 'Senza peso l\'app mostra la stima classica che assume 1 g di creatinina al giorno. Termine razziale dell\'equazione di Ix omesso.',
   ref: 'Ginsberg JM et al. N Engl J Med 1983;309:1543-6. · Ix JH et al. Clin J Am Soc Nephrol 2011;6:184-91.'},
  {id: 'cd-ratio', area: 'trapianto', name: 'Rapporto concentrazione/dose (C/D)', use: 'Esposizione a tacrolimus o ciclosporina rispetto alla dose.',
   eq: 'C/D = C0 / dose giornaliera totale\nDose per peso = dose / peso',
   params: [['C0', 'concentrazione pre-dose (trough)', 'ng/mL'], ['dose', 'dose totale giornaliera', 'mg/die']],
   notes: 'Per il tacrolimus un C/D basso indica metabolismo rapido.',
   ref: 'Thölking G et al. PLoS One 2014;9:e111128.'},
  {id: 'auc', area: 'trapianto', name: 'AUC con regola dei trapezi', use: 'Esposizione da profilo farmacocinetico con più prelievi.',
   eq: 'AUC = Σ (t i − t i−1) × (C i + C i−1) / 2',
   params: [['t', 'tempo dal dosaggio', 'h'], ['C', 'concentrazione', 'ng/mL']],
   notes: 'Calcolo esatto sui punti inseriti, tra il primo e l\'ultimo prelievo. Non usa equazioni ad abbreviated sampling né metodi bayesiani.',
   ref: 'Gibaldi M, Perrier D. Pharmacokinetics, 2ª ed. Marcel Dekker 1982.'},
  {id: 'delta-graft', area: 'trapianto', name: 'Variazione rispetto al basale', use: 'Andamento della funzione del graft.',
   eq: 'Δ assoluto = attuale − basale\nΔ% = (attuale − basale) / basale × 100',
   params: [['valori', 'creatinina (mg/dL) o eGFR (mL/min/1,73 m²)', '']],
   notes: 'Le equazioni eGFR sono meno accurate nel trapiantato che nella popolazione generale.',
   ref: 'Definizione aritmetica.'},
  {id: 'bvas', area: 'vasculiti', name: 'Birmingham Vasculitis Activity Score v3', use: 'Attività di malattia nelle vasculiti sistemiche.',
   eq: 'BVAS = Σ sistemi min(Σ pesi item presenti, massimo del sistema)\nPesi "persistente" solo se tutte le manifestazioni sono persistenti; altrimenti pesi "nuovo/peggiorato"',
   params: [['item', '56 manifestazioni in 9 sistemi', '—']],
   notes: 'Massimi nuovo/peggiorato: generale 3, cute 6, mucose/occhi 6, ORL 6, torace 6, cardiovascolare 6, addome 9, rene 12, sistema nervoso 9 (totale 63). Persistente: 2, 3, 3, 3, 3, 3, 4, 6, 6 (totale 33). Le fasce di creatinina si usano solo alla prima valutazione. Perdita visiva improvvisa, noduli o cavitazioni e aumento della creatinina > 30% sono incompatibili con la malattia persistente.',
   ref: 'Mukhtyar C et al. Ann Rheum Dis 2009;68:1827-32.'},
  {id: 'dose-cumulativa', area: 'vasculiti', name: 'Dose cumulativa', use: 'Esposizione totale a ciclofosfamide, steroidi o altri farmaci.',
   eq: 'Dose totale = Σ (dose × numero di somministrazioni) + dose pregressa\nPer superficie = dose totale / BSA (Du Bois)\nPer peso = dose totale / peso',
   params: [['dose', 'dose per somministrazione', 'mg'], ['BSA', 'superficie corporea', 'm²']],
   ref: 'Definizione aritmetica; BSA: Du Bois 1916.'},
  {id: 'tapering', area: 'vasculiti', name: 'Piano di scalaggio steroideo', use: 'Calendario di riduzione a gradini definito dall\'utente.',
   eq: 'Per ogni gradino: se dose > soglia della regola → mantieni per N giorni, poi dose = dose − riduzione\nArrotondamento al multiplo componibile con le compresse disponibili',
   params: [['dose', 'dose giornaliera', 'mg/die'], ['regole', 'soglia, riduzione, durata del gradino', 'mg, mg, giorni']],
   notes: 'L\'app non propone schemi: applica solo le regole inserite dal medico.',
   ref: 'Calcolo aritmetico.'}
];
