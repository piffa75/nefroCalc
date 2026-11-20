/**
 * NefroCalc — definizioni dei campi.
 * La chiave è condivisa tra calcolatori: il sodio inserito nel calcolatore 1.1 è lo stesso del 1.4.
 * range = intervallo plausibile: fuori range avviso, ma calcolo lo stesso.
 * type: num (default), sex, select, date, text.
 */
export const F = {
  sex: {key: 'sex', label: 'Sesso', type: 'sex'},
  age: {key: 'age', label: 'Età', unit: 'anni', range: [18, 110]},
  weight: {key: 'weight', label: 'Peso', unit: 'kg', range: [30, 250]},
  height: {key: 'height', label: 'Altezza', unit: 'cm', range: [130, 220]},
  scr: {key: 'scr', label: 'Creatinina sierica', unit: 'mg/dL', range: [0.2, 20]},
  na: {key: 'na', label: 'Sodio sierico', unit: 'mEq/L', range: [100, 190]},
  k: {key: 'k', label: 'Potassio sierico', unit: 'mEq/L', range: [1.5, 9]},
  cl: {key: 'cl', label: 'Cloro', unit: 'mEq/L', range: [70, 140]},
  hco3: {key: 'hco3', label: 'Bicarbonato', unit: 'mEq/L', range: [2, 50]},
  alb: {key: 'alb', label: 'Albumina sierica', unit: 'g/dL', range: [1, 6]},
  glu: {key: 'glu', label: 'Glicemia', unit: 'mg/dL', range: [20, 2000]},
  urea: {key: 'urea', label: 'Azotemia (urea)', unit: 'mg/dL', range: [5, 400]},
  ca: {key: 'ca', label: 'Calcio totale', unit: 'mg/dL', range: [4, 18]},
  phos: {key: 'phos', label: 'Fosforo', unit: 'mg/dL', range: [1, 15]},
  mg: {key: 'mg', label: 'Magnesio', unit: 'mg/dL', range: [0.5, 6]},
  ph: {key: 'ph', label: 'pH ematico', unit: '', range: [6.8, 7.8]},
  scys: {key: 'scys', label: 'Cistatina C', unit: 'mg/L', range: [0.3, 10]},
  una: {key: 'una', label: 'Sodio urinario', unit: 'mEq/L', range: [1, 300]},
  uk: {key: 'uk', label: 'Potassio urinario', unit: 'mEq/L', range: [1, 200]},
  ucr: {key: 'ucr', label: 'Creatinina urinaria', unit: 'mg/dL', range: [5, 500]},
  uurea: {key: 'uurea', label: 'Urea urinaria', unit: 'mg/dL', range: [50, 5000]},
  uprot: {key: 'uprot', label: 'Proteine urinarie', unit: 'mg/dL', range: [1, 3000]},
  ualb: {key: 'ualb', label: 'Albumina urinaria', unit: 'mg/L', range: [1, 20000]},
  diuresis: {key: 'diuresis', label: 'Diuresi 24 h', unit: 'mL', range: [0, 15000]},
  hours: {key: 'hours', label: 'Ore previste per l\'infusione', unit: 'h', range: [1, 72]},
  threshold: {key: 'threshold', label: 'Soglia di variazione del Na', unit: 'mEq/L in 24 h', range: [4, 15], hint: 'default dalle preferenze'},
  plannedVol: {key: 'plannedVol', label: 'Volume che pensi di infondere', unit: 'L', range: [0.1, 10]},
  sol: {key: 'sol', label: 'Soluzione infusa', type: 'select', options: [
    ['g5', 'Glucosata 5%'], ['nacl045', 'NaCl 0,45%'], ['nacl09', 'NaCl 0,9%'], ['nacl3', 'NaCl 3%'], ['ringer', 'Ringer lattato'], ['custom', 'Personalizzata']]},
  solNa: {key: 'solNa', label: 'Na della soluzione personalizzata', unit: 'mEq/L', range: [0, 1000]},
  solK: {key: 'solK', label: 'K aggiunto alla soluzione', unit: 'mEq/L', range: [0, 80]},
  naTarget: {key: 'naTarget', label: 'Sodio target', unit: 'mEq/L', range: [130, 170]},
  insensible: {key: 'insensible', label: 'Perdite insensibili stimate', unit: 'mL/die', range: [0, 5000]},
  osmMeas: {key: 'osmMeas', label: 'Osmolalità sierica misurata', unit: 'mOsm/kg', range: [200, 450]},
  etoh: {key: 'etoh', label: 'Etanolo', unit: 'mg/dL', range: [0, 800]},
  egfr: {key: 'egfr', label: 'eGFR', unit: 'mL/min/1,73 m²', range: [2, 150], hint: 'se vuoto lo calcolo con CKD-EPI 2021 da creatinina, età e sesso'},
  acr: {key: 'acr', label: 'Albumina/creatinina urinaria (uACR)', unit: 'mg/g', range: [1, 20000]},
  drug: {key: 'drug', label: 'Farmaco', type: 'select', options: [['tac', 'Tacrolimus'], ['csa', 'Ciclosporina'], ['altro', 'Altro']]},
  c0: {key: 'c0', label: 'Concentrazione pre-dose (C0)', unit: 'ng/mL', range: [0.5, 1000]},
  dailyDose: {key: 'dailyDose', label: 'Dose giornaliera totale', unit: 'mg/die', range: [0.1, 1000]},
  graftMode: {key: 'graftMode', label: 'Parametro', type: 'select', options: [['cr', 'Creatinina'], ['egfr', 'eGFR']]},
  graftNow: {key: 'graftNow', label: 'Valore attuale', unit: '', range: [0.1, 150]},
  graftBase: {key: 'graftBase', label: 'Valore basale post-trapianto', unit: '', range: [0.1, 150]},
  graftProt: {key: 'graftProt', label: 'Proteinuria attuale (uPCR)', unit: 'mg/g', range: [0, 20000]},
  prevDose: {key: 'prevDose', label: 'Dose cumulativa pregressa nota', unit: 'g', range: [0, 200]},
  drugName: {key: 'drugName', label: 'Farmaco', type: 'text', placeholder: 'es. Ciclofosfamide'},
  steroid: {key: 'steroid', label: 'Steroide', type: 'select', options: [['pred', 'Prednisone'], ['mpred', 'Metilprednisolone'], ['prednisolone', 'Prednisolone'], ['defla', 'Deflazacort']]},
  startDose: {key: 'startDose', label: 'Dose iniziale', unit: 'mg/die', range: [1, 1000]},
  startDate: {key: 'startDate', label: 'Data di inizio', type: 'date'},
  targetDose: {key: 'targetDose', label: 'Dose target / mantenimento', unit: 'mg/die', range: [0, 100]}
};

/** Campi mostrati nel blocco "Dati base di sessione" della home. */
export const SESSION_FIELDS = [F.sex, F.age, F.weight, F.height, F.scr, F.na, F.alb];
