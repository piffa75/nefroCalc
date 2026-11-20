/**
 * BVAS v3: 56 item in 9 sistemi con pesi persistente (p) e nuovo/peggiorato (n).
 * p = null: item incompatibile con malattia persistente (asterisco nel modulo originale).
 * first: true = fascia di creatinina, si usa solo alla prima valutazione.
 * Fonte: Mukhtyar C et al. Ann Rheum Dis 2009;68:1827-32, glossario e punteggi BVAS v3.
 */
export const BVAS_SYSTEMS = [
  {id: 'gen', name: 'Generale', maxP: 2, maxN: 3, items: [
    {id: 'gen1', label: 'Mialgie', p: 1, n: 1},
    {id: 'gen2', label: 'Artralgie / artrite', p: 1, n: 1},
    {id: 'gen3', label: 'Febbre ≥ 38 °C', p: 2, n: 2},
    {id: 'gen4', label: 'Calo ponderale ≥ 2 kg', p: 2, n: 2}]},
  {id: 'cut', name: 'Cute', maxP: 3, maxN: 6, items: [
    {id: 'cut1', label: 'Infarto', p: 1, n: 2},
    {id: 'cut2', label: 'Porpora', p: 1, n: 2},
    {id: 'cut3', label: 'Ulcera', p: 1, n: 4},
    {id: 'cut4', label: 'Gangrena', p: 2, n: 6},
    {id: 'cut5', label: 'Altra vasculite cutanea', p: 1, n: 2}]},
  {id: 'muc', name: 'Mucose / occhi', maxP: 3, maxN: 6, items: [
    {id: 'muc1', label: 'Ulcere orali / granulomi', p: 1, n: 2},
    {id: 'muc2', label: 'Ulcere genitali', p: 1, n: 1},
    {id: 'muc3', label: 'Infiammazione degli annessi', p: 2, n: 4},
    {id: 'muc4', label: 'Proptosi significativa', p: 2, n: 4},
    {id: 'muc5', label: 'Sclerite / episclerite', p: 1, n: 2},
    {id: 'muc6', label: 'Congiuntivite / blefarite / cheratite', p: 1, n: 1},
    {id: 'muc7', label: 'Visione offuscata', p: 2, n: 3},
    {id: 'muc8', label: 'Perdita visiva improvvisa', p: null, n: 6},
    {id: 'muc9', label: 'Uveite', p: 2, n: 6},
    {id: 'muc10', label: 'Alterazioni retiniche (vasculite, trombosi, essudati, emorragie)', p: 2, n: 6}]},
  {id: 'ent', name: 'Orecchio, naso, gola', maxP: 3, maxN: 6, items: [
    {id: 'ent1', label: 'Secrezione nasale ematica / croste / ulcere / granulomi', p: 2, n: 4},
    {id: 'ent2', label: 'Interessamento dei seni paranasali', p: 1, n: 2},
    {id: 'ent3', label: 'Stenosi sottoglottica', p: 3, n: 6},
    {id: 'ent4', label: 'Ipoacusia trasmissiva', p: 1, n: 3},
    {id: 'ent5', label: 'Ipoacusia neurosensoriale', p: 2, n: 6}]},
  {id: 'che', name: 'Torace', maxP: 3, maxN: 6, items: [
    {id: 'che1', label: 'Respiro sibilante', p: 1, n: 2},
    {id: 'che2', label: 'Noduli o cavitazioni', p: null, n: 3},
    {id: 'che3', label: 'Versamento pleurico / pleurite', p: 2, n: 4},
    {id: 'che4', label: 'Infiltrato', p: 2, n: 4},
    {id: 'che5', label: 'Interessamento endobronchiale', p: 2, n: 4},
    {id: 'che6', label: 'Emottisi massiva / emorragia alveolare', p: 4, n: 6},
    {id: 'che7', label: 'Insufficienza respiratoria', p: 4, n: 6}]},
  {id: 'cvs', name: 'Cardiovascolare', maxP: 3, maxN: 6, items: [
    {id: 'cvs1', label: 'Assenza di polsi', p: 1, n: 4},
    {id: 'cvs2', label: 'Valvulopatia', p: 2, n: 4},
    {id: 'cvs3', label: 'Pericardite', p: 1, n: 3},
    {id: 'cvs4', label: 'Dolore cardiaco ischemico', p: 2, n: 4},
    {id: 'cvs5', label: 'Cardiomiopatia', p: 3, n: 6},
    {id: 'cvs6', label: 'Scompenso cardiaco congestizio', p: 3, n: 6}]},
  {id: 'abd', name: 'Addome', maxP: 4, maxN: 9, items: [
    {id: 'abd1', label: 'Peritonite', p: 3, n: 9},
    {id: 'abd2', label: 'Diarrea ematica', p: 3, n: 9},
    {id: 'abd3', label: 'Dolore addominale ischemico', p: 2, n: 6}]},
  {id: 'ren', name: 'Rene', maxP: 6, maxN: 12, items: [
    {id: 'ren1', label: 'Ipertensione', p: 1, n: 4},
    {id: 'ren2', label: 'Proteinuria', p: 2, n: 4},
    {id: 'ren3', label: 'Ematuria', p: 3, n: 6},
    {id: 'ren4', label: 'Creatinina 1,41-2,82 mg/dL (125-249 µmol/L)', p: 2, n: 4, first: true},
    {id: 'ren5', label: 'Creatinina 2,83-5,65 mg/dL (250-499 µmol/L)', p: 3, n: 6, first: true},
    {id: 'ren6', label: 'Creatinina ≥ 5,66 mg/dL (≥ 500 µmol/L)', p: 4, n: 8, first: true},
    {id: 'ren7', label: 'Aumento creatinina > 30% o calo clearance > 25%', p: null, n: 6}]},
  {id: 'ner', name: 'Sistema nervoso', maxP: 6, maxN: 9, items: [
    {id: 'ner1', label: 'Cefalea', p: 1, n: 1},
    {id: 'ner2', label: 'Meningite', p: 1, n: 3},
    {id: 'ner3', label: 'Confusione mentale organica', p: 1, n: 3},
    {id: 'ner4', label: 'Convulsioni (non ipertensive)', p: 3, n: 9},
    {id: 'ner5', label: 'Ictus', p: 3, n: 9},
    {id: 'ner6', label: 'Lesione midollare', p: 3, n: 9},
    {id: 'ner7', label: 'Paralisi di nervi cranici', p: 3, n: 6},
    {id: 'ner8', label: 'Neuropatia periferica sensitiva', p: 3, n: 6},
    {id: 'ner9', label: 'Mononeurite multipla', p: 3, n: 9}]}
];
