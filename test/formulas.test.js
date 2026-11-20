/**
 * Test delle formule di NefroCalc. Si lanciano dalla cartella del progetto con:  node --test test/
 * Valori attesi calcolati a mano dalle equazioni originali (o con implementazione indipendente per KFRE).
 * Nella fase di test conviene aggiungere casi confrontati con i calcolatori ufficiali.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../js/formulas.js';
import {BVAS_SYSTEMS} from '../js/bvas-data.js';

/**
 * Verifica che due numeri coincidano entro una tolleranza.
 * @param {number} actual valore calcolato
 * @param {number} expected valore atteso
 * @param {number} [tol=0.05] tolleranza assoluta
 */
const near = (actual, expected, tol = 0.05) =>
  assert.ok(Math.abs(actual - expected) <= tol, `atteso ${expected}, ottenuto ${actual}`);

test('TBW per sesso ed età', () => {
  near(F.tbw(70, 'M', 50).value, 42);
  near(F.tbw(70, 'F', 50).value, 35);
  near(F.tbw(70, 'M', 70).value, 35);
  near(F.tbw(60, 'F', 80).value, 27);
});

test('Sodio corretto Katz e Hillier', () => {
  const r = F.naGlucoseCorrection(130, 600);
  near(r.katz, 138);
  near(r.hillier, 142);
  near(F.naGlucoseCorrection(135, 90).katz, 135); // sotto 100 mg/dL nessuna correzione
});

test('Adrogué-Madias', () => {
  near(F.adrogueMadias(120, 513, 0, 42), 9.14, 0.01);      // NaCl 3%
  near(F.adrogueMadias(160, 0, 0, 35), -4.44, 0.01);       // glucosata 5%
  near(F.adrogueMadias(120, 130, 4, 42), 0.326, 0.001);    // Ringer lattato
});

test('Clearance acqua libera da elettroliti e deficit di acqua', () => {
  near(F.electrolyteFreeWaterClearance(2000, 50, 30, 160), 1000);
  near(F.freeWaterDeficit(160, 35), 5);
  near(F.freeWaterDeficit(160, 35, 150), 2.333, 0.001);
});

test('FENa e FEUrea', () => {
  near(F.fena(140, 20, 2, 100), 0.2857, 0.0001);
  near(F.feurea(100, 500, 2, 100), 10);
});

test('Gap anionico, albumina, delta-delta, osmolare', () => {
  near(F.anionGap(140, 100, 24), 16);
  near(F.anionGapAlbumin(16, 2), 21);
  near(F.deltaDelta(24, 12), 1);
  assert.equal(F.deltaDelta(14, 26), null);
  near(F.calculatedOsm(140, 90, 30), 290.01, 0.01);
  near(F.calculatedOsm(140, 90, 30, 37), 300.01, 0.01);
});

test('Calcio e potassio', () => {
  near(F.calciumPayne(8, 2), 9.6);
  near(F.potassiumAtNormalPh(6, 7.2), 4.8);
  near(F.potassiumAtNormalPh(3, 7.5), 3.6);
  assert.deepEqual(F.potassiumDeficit(3), {min: 200, max: 400});
  assert.equal(F.potassiumDeficit(4.2), null);
});

test('CKD-EPI 2021 creatinina', () => {
  near(F.ckdEpi2021Cr(1.0, 50, 'M'), 91.7, 0.1);
  near(F.ckdEpi2021Cr(0.8, 60, 'F'), 84.3, 0.1);
  near(F.ckdEpi2021Cr(0.6, 40, 'F'), 116.3, 0.05); // ramo sotto κ (calcolo a mano: 142 × 1,0379 × 0,7798 × 1,012)
});

test('CKD-EPI cistatina C', () => {
  // Con Scr = κ e Scys = 0,8 restano solo costante, età e sesso
  near(F.ckdEpi2021CrCys(0.9, 0.8, 50, 'M'), 135 * 0.9961 ** 50, 0.01);
  near(F.ckdEpi2012Cys(0.8, 50, 'F'), 133 * 0.996 ** 50 * 0.932, 0.01);
});

test('MDRD, Cockcroft-Gault, BSA, pesi', () => {
  near(F.mdrd(1.0, 50, 'M'), 79.1, 0.1);
  near(F.cockcroftGault(60, 70, 1.0, 'M'), 77.78, 0.01);
  near(F.cockcroftGault(60, 70, 1.0, 'F'), 66.11, 0.01);
  near(F.bsaDuBois(70, 170), 1.810, 0.002);
  near(F.ibwDevine(175, 'M'), 70.47, 0.01);
  near(F.adjustedBodyWeight(110, 70), 86);
  near(F.deindexEgfr(60, 2.0), 69.36, 0.01);
});

test('KFRE non nordamericana (valori da implementazione indipendente)', () => {
  const p = {age: 65, sex: 'M', egfr: 30, acr: 300, alb: 4.0, phos: 4.0, hco3: 22, ca: 9.0};
  near(F.kfre(p, 4, 2), 5.268, 0.005);
  near(F.kfre(p, 4, 5), 18.907, 0.005);
  near(F.kfre(p, 8, 2), 6.391, 0.005);
  near(F.kfre(p, 8, 5), 25.700, 0.005);
});

test('uPCR, uACR, creatinina attesa', () => {
  near(F.upcr(50, 100), 500);
  near(F.uacr(30, 100), 30);
  near(F.ixCreatinineExcretion(70, 50, 'M'), 1446.09, 0.01);
  near(F.ixCreatinineExcretion(60, 50, 'F'), 941.57, 0.01);
});

test('Trapianto: C/D, AUC, delta', () => {
  near(F.cdRatio(8, 4), 2);
  near(F.aucTrapezoid([{t: 2, c: 10}, {t: 0, c: 10}, {t: 1, c: 20}]), 30);
  assert.equal(F.aucTrapezoid([{t: 0, c: 5}]), null);
  near(F.deltaChange(1.5, 1.2).pct, 25);
});

test('BVAS: struttura e punteggi', () => {
  const items = BVAS_SYSTEMS.flatMap(s => s.items);
  assert.equal(items.length, 56);
  near(BVAS_SYSTEMS.reduce((a, s) => a + s.maxN, 0), 63, 0);
  near(BVAS_SYSTEMS.reduce((a, s) => a + s.maxP, 0), 33, 0);
  // Nuovo: febbre 2 + porpora 2 + ematuria 6 + proteinuria 4 = 14
  const sel = new Set(['gen3', 'cut2', 'ren3', 'ren2']);
  assert.equal(F.bvas(BVAS_SYSTEMS, sel, {persistent: false, firstVisit: false}).total, 14);
  // Persistente: 2 + 1 + 3 + 2 = 8
  assert.equal(F.bvas(BVAS_SYSTEMS, sel, {persistent: true, firstVisit: false}).total, 8);
  // Tetto per sistema: rene nuovo con ipertensione 4 + proteinuria 4 + ematuria 6 = 14 → 12
  assert.equal(F.bvas(BVAS_SYSTEMS, new Set(['ren1', 'ren2', 'ren3']), {persistent: false, firstVisit: false}).total, 12);
  // Un item incompatibile con la persistenza forza i pesi nuovo/peggiorato
  const r = F.bvas(BVAS_SYSTEMS, new Set(['gen3', 'che2']), {persistent: true, firstVisit: false});
  assert.equal(r.mode, 'new');
  assert.equal(r.total, 5);
});

test('Compresse e piano di scalaggio', () => {
  const pred = [{mg: 25, half: true}, {mg: 5, half: true}];
  assert.deepEqual(F.tabletBreakdown(7.5, pred), [{mg: 5, half: false, count: 1}, {mg: 5, half: true, count: 1}]);
  assert.deepEqual(F.tabletBreakdown(50, pred), [{mg: 25, half: false, count: 2}]);
  assert.equal(F.tabletBreakdown(1, pred), null);
  // Preferisco compresse intere: 20 mg = 4 cp da 5, non ½ da 25 + 1 da 5 + ½ da 5
  assert.deepEqual(F.tabletBreakdown(20, pred), [{mg: 5, half: false, count: 4}]);
  assert.deepEqual(F.tabletBreakdown(12.5, pred), [{mg: 25, half: true, count: 1}]);
  const plan = F.taperPlan({start: 25, target: 5, rules: [{above: 0, step: 5, every: 7}], unit: 2.5});
  assert.deepEqual(plan.steps.map(s => [s.day, s.dose]), [[0, 25], [7, 20], [14, 15], [21, 10], [28, 5]]);
  const two = F.taperPlan({start: 60, target: 5, rules: [{above: 20, step: 10, every: 7}, {above: 0, step: 2.5, every: 14}], unit: 2.5});
  assert.deepEqual(two.steps.map(s => s.dose), [60, 50, 40, 30, 20, 17.5, 15, 12.5, 10, 7.5, 5]);
});

test('Ogni formula citata ha metadati completi', () => {
  F.FORMULE.forEach(f => {
    assert.ok(f.id && f.name && f.eq && f.ref && f.area, `metadati incompleti: ${f.id}`);
  });
  assert.equal(new Set(F.FORMULE.map(f => f.id)).size, F.FORMULE.length);
});
