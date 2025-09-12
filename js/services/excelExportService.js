'use strict';

import { showSpinner, hideSpinner } from '../spinner.js';
import { showToast } from '../notifications.js';
import { state } from '../state.js';
import { getFilteredCommesse, calcolaMontanteFatture, calcolaTotaleBudgetRecent } from './calculationService.js';

// --- Stili e Formati per Excel ---
const excelStyles = {
  // NOTA: La stilizzazione avanzata (font, fill, etc.) è una feature della versione Pro di SheetJS.
  // Il codice è qui a scopo dimostrativo e funzionerà solo con una licenza Pro.
  header: { font: { bold: true, sz: 12, color: { rgb: 'FFFFFFFF' } }, fill: { fgColor: { rgb: 'FF4A5568' } } },
  title: { font: { bold: true, sz: 14 } },
  label: { font: { bold: true } },
  total: { font: { bold: true } },

  // Stili con formattazione numerica inclusa
  total_currency: { font: { bold: true }, numFmt: '€ #,##0.00' },
  total_percentage: { font: { bold: true }, numFmt: '0.00%;[Red]-0.00%' },

  header_highlight_green: {
    font: { bold: true, sz: 12, color: { rgb: 'FF276749' } }, // Testo simile a green-800
    fill: { fgColor: { rgb: 'FFF0FFF4' } }, // Sfondo simile a green-100
  },

  // Stili per colori (da abbinare ad altri stili)
  highlight_green: { fill: { fgColor: { rgb: 'FFF0FFF4' } } }, // Sfondo simile a green-100
  highlight_green_bold_currency: {
    font: { bold: true, color: { rgb: 'FF276749' } }, // Testo simile a green-800
    fill: { fgColor: { rgb: 'FFF0FFF4' } }, // Sfondo simile a green-100
    numFmt: '€ #,##0.00',
  },
  highlight_green_bold_integer: {
    font: { bold: true, color: { rgb: 'FF276749' } },
    fill: { fgColor: { rgb: 'FFF0FFF4' } },
    numFmt: '0',
  },

  // Formati numerici semplici
  currency: '€ #,##0.00',
  percentage: '0.00%;[Red]-0.00%', // Mostra i valori negativi in rosso
};

function getExportData(useFilteredData) {
  if (!useFilteredData) {
    return {
      commesseToExport: [...state.dati.commesse],
      budgetMasterToExport: [...(state.dati.budgetMaster || [])],
      budgetDetailsToExport: [...(state.dati.budget || [])],
      ordiniToExport: [...state.dati.ordini],
      fattureToExport: [...state.dati.fatture],
      marginiToExport: [...state.dati.margini],
    };
  }

  const commesseToExport = getFilteredCommesse();
  const commesseIdsToExport = new Set(commesseToExport.map((c) => c.id));

  const budgetMasterToExport = state.dati.budgetMaster?.filter((bm) => commesseIdsToExport.has(bm.commessaId)) || [];
  const budgetMasterIdsToExport = new Set(budgetMasterToExport.map((bm) => bm.id));
  const budgetDetailsToExport = state.dati.budget?.filter((b) => budgetMasterIdsToExport.has(b.budgetMasterId)) || [];
  const ordiniToExport = state.dati.ordini.filter((o) => commesseIdsToExport.has(o.commessaId));
  const fattureToExport = state.dati.fatture.filter((f) => commesseIdsToExport.has(f.commessaId));
  const marginiToExport = state.dati.margini.filter((m) => commesseIdsToExport.has(m.commessaId));

  return { commesseToExport, budgetMasterToExport, budgetDetailsToExport, ordiniToExport, fattureToExport, marginiToExport };
}

function createDashboardSheet(wb, { commesseToExport, fattureToExport, marginiToExport }) {
  const totalRicavi = fattureToExport.reduce((acc, f) => acc + f.importo, 0);
  const totalCosti = marginiToExport.reduce((acc, m) => acc + m.costoConsuntivi, 0);
  const commesseAttive = commesseToExport.filter((c) => c.stato === 'Attivo').length;
  const fatturatoMeseCorrente = fattureToExport.filter((f) => f.meseCompetenza === new Date().toISOString().slice(0, 7)).reduce((sum, f) => sum + f.importo, 0);

  const dashboardData = [
    ['DASHBOARD KPI', '', '', ''],
    ['Indicatore', 'Valore', 'Unità', 'Note'],
    ['Ricavi Totali', totalRicavi, '€', 'Somma importi di tutte le fatture esportate'],
    ['Costi Totali', totalCosti, '€', 'Somma costi consuntivi esportati'],
    ['Margine Totale', { f: 'B3-B4' }, '€', 'Formula: Ricavi - Costi'],
    ['Margine %', { f: 'IF(B3>0,B5/B3,0)' }, '%', 'Formula: (Ricavi-Costi)/Ricavi'], // Formula corretta per formato %
    ['Commesse Attive', commesseAttive, 'n.', 'Commesse con stato "Attivo" tra quelle esportate'],
    ['Fatturato Mese Corrente', fatturatoMeseCorrente, '€', 'Fatture del mese corrente tra quelle esportate'],
  ];
  const dashboardWS = XLSX.utils.aoa_to_sheet(dashboardData);
  dashboardWS['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 45 }];

  // Applica stili e formati
  dashboardWS['A1'].s = excelStyles.title;
  ['A2', 'B2', 'C2', 'D2'].forEach((c) => (dashboardWS[c].s = excelStyles.header));
  // Rende le etichette in grassetto
  ['A3', 'A4', 'A5', 'A6', 'A7', 'A8'].forEach((c) => {
    if (dashboardWS[c]) dashboardWS[c].s = excelStyles.label;
  });
  dashboardWS['B3'].z = excelStyles.currency;
  dashboardWS['B4'].z = excelStyles.currency;
  dashboardWS['B5'].z = excelStyles.currency;
  dashboardWS['B6'].z = excelStyles.percentage;
  dashboardWS['B8'].z = excelStyles.currency;

  XLSX.utils.book_append_sheet(wb, dashboardWS, 'Dashboard');
}

function createCommesseSheet(wb, { commesseToExport, marginiToExport }) {
  const commesseData = [
    ['GESTIONE COMMESSE', '', '', '', '', '', '', ''],
    ['Nome', 'Cliente', 'Tipologia', 'Data Inizio', 'Stato', 'Ricavi Fatturati €', 'Costi Totali €', 'Margine %'],
    ...commesseToExport.map((c, index) => {
      const row = index + 3;
      const ricaviFatturati = calcolaMontanteFatture(c.id);
      const costiTotali = marginiToExport.filter((m) => m.commessaId === c.id).reduce((sum, m) => sum + m.costoConsuntivi, 0);
      return [c.nome, c.cliente, c.tipologia, new Date(c.dataInizio), c.stato, ricaviFatturati, costiTotali, { f: `=IF(F${row}>0,(F${row}-G${row})/F${row},0)` }];
    }),
  ];

  const totalRow = commesseData.length + 1;
  commesseData.push(['TOTALI', '', '', '', '', { f: `=SUM(F3:F${totalRow - 1})` }, { f: `=SUM(G3:G${totalRow - 1})` }, { f: `=IF(F${totalRow}>0,(F${totalRow}-G${totalRow})/F${totalRow},0)` }]);

  const commesseWS = XLSX.utils.aoa_to_sheet(commesseData, { cellDates: true });
  commesseWS['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 12 }];

  // Applica stili e formati
  const range = XLSX.utils.decode_range(commesseWS['!ref']);
  commesseWS['A1'].s = excelStyles.title;

  for (let C = range.s.c; C <= range.e.c; ++C) {
    commesseWS[XLSX.utils.encode_cell({ r: 1, c: C })].s = excelStyles.header;
  }

  // Applica stile alla riga dei totali
  commesseWS['A' + totalRow].s = excelStyles.total;
  commesseWS['F' + totalRow].s = excelStyles.total_currency;
  commesseWS['G' + totalRow].s = excelStyles.total_currency;
  commesseWS['H' + totalRow].s = excelStyles.total_percentage;

  for (let R = 2; R <= range.e.r; ++R) {
    const ricaviCell = commesseWS[XLSX.utils.encode_cell({ r: R, c: 5 })];
    if (ricaviCell) ricaviCell.z = excelStyles.currency;

    const costiCell = commesseWS[XLSX.utils.encode_cell({ r: R, c: 6 })];
    if (costiCell) costiCell.z = excelStyles.currency;

    const margineCell = commesseWS[XLSX.utils.encode_cell({ r: R, c: 7 })];
    if (margineCell) margineCell.z = excelStyles.percentage;
  }

  XLSX.utils.book_append_sheet(wb, commesseWS, 'Commesse');
}

function createBudgetSheet(wb, { commesseToExport, budgetMasterToExport, budgetDetailsToExport }) {
  const budgetData = [['BUDGET DETTAGLIATO'], ['Commessa', 'Budget ID', 'Mese', 'Figura', 'Tariffa €', 'Giorni', 'Importo €', 'Note']];

  let budgetRowIndex = 2;
  budgetMasterToExport
    .sort((a, b) => a.commessaId - b.commessaId || b.meseCompetenza.localeCompare(a.meseCompetenza))
    .forEach((master) => {
      const commessa = commesseToExport.find((c) => c.id === master.commessaId);
      const details = budgetDetailsToExport.filter((b) => b.budgetMasterId === master.id);
      if (details.length === 0) return;

      budgetRowIndex++;
      const headerRow = budgetRowIndex;
      budgetData.push([commessa?.nome || `ID ${master.commessaId}`, master.budgetId, master.meseCompetenza, 'TOTALE BUDGET', '', '', { f: `=SUM(G${headerRow + 1}:G${headerRow + details.length})` }, 'Somma automatica dettagli']);

      details.forEach((detail) => {
        budgetRowIndex++;
        budgetData.push(['', '', '', detail.figura, detail.tariffa, detail.giorni, { f: `=E${budgetRowIndex}*F${budgetRowIndex}` }, '']);
      });
    });

  const budgetWS = XLSX.utils.aoa_to_sheet(budgetData);
  budgetWS['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, budgetWS, 'Budget');
}

function createMarginiSheet(wb, { commesseToExport, marginiToExport }) {
  const marginiData = [
    ['ANALISI MARGINI DETTAGLIATA'],
    ['Commessa', 'Mese', 'Costo Cons. €', 'HH Cons.', 'Costo/HH €', 'Ricavo Cons. (Commessa) €', 'Margine % (su Ricavo Cons.)', 'Budget Tot. (Recente) €', 'Costo EAC €', 'Costo ETC €', 'Ore ETC', '% Avanz.', 'Ricavo Mat. €', 'ETC Rev. €'],
  ];

  marginiToExport
    .sort((a, b) => a.commessaId - b.commessaId || a.mese.localeCompare(b.mese))
    .forEach((margine, index) => {
      const commessa = commesseToExport.find((c) => c.id === margine.commessaId);
      const row = index + 3;
      const ricavoConsuntivoCommessa = calcolaMontanteFatture(margine.commessaId);
      const ricavoBudgetTotale = calcolaTotaleBudgetRecent(margine.commessaId);

      marginiData.push([
        commessa?.nome || `ID ${margine.commessaId}`,
        margine.mese,
        margine.costoConsuntivi,
        margine.hhConsuntivo,
        { f: `=IF(D${row}>0,C${row}/D${row},0)` },
        ricavoConsuntivoCommessa,
        { f: `=IF(F${row}>0,(F${row}-C${row})/F${row},0)` },
        ricavoBudgetTotale,
        { f: `=H${row}*(1-G${row})` }, // Corretto: G è già una frazione
        { f: `=I${row}-C${row}` },
        { f: `=IF(E${row}>0,J${row}/E${row},0)` },
        { f: `=IF(I${row}>0,C${row}/I${row},0)` }, // Corretto per %
        { f: `=H${row}*L${row}` }, // Corretto: L è già una frazione
        { f: `=H${row}-M${row}` },
      ]);
    });

  const marginiWS = XLSX.utils.aoa_to_sheet(marginiData);
  marginiWS['!cols'] = Array(14).fill({ wch: 15 });

  // Applica stili e formati
  const range = XLSX.utils.decode_range(marginiWS['!ref']);
  marginiWS['A1'].s = excelStyles.title;
  for (let C = 0; C < 14; ++C) {
    // Applica lo stile header a tutte le intestazioni
    marginiWS[XLSX.utils.encode_cell({ r: 1, c: C })].s = excelStyles.header;
  }

  // Colora le colonne ETC come nell'app
  const headerCostoEtc = XLSX.utils.encode_cell({ r: 1, c: 9 });
  const headerOreEtc = XLSX.utils.encode_cell({ r: 1, c: 10 });
  marginiWS[headerCostoEtc].s = excelStyles.header_highlight_green;
  marginiWS[headerOreEtc].s = excelStyles.header_highlight_green;

  for (let R = 2; R < range.e.r + 1; ++R) {
    // Applica stile highlight alle celle ETC
    const costoEtcCell = marginiWS[XLSX.utils.encode_cell({ r: R, c: 9 })];
    if (costoEtcCell) costoEtcCell.s = excelStyles.highlight_green_bold_currency;

    const oreEtcCell = marginiWS[XLSX.utils.encode_cell({ r: R, c: 10 })];
    if (oreEtcCell) oreEtcCell.s = excelStyles.highlight_green_bold_number_2dp;

    // Apply number formats to other columns
    const margineCell = marginiWS[XLSX.utils.encode_cell({ r: R, c: 6 })];
    if (margineCell) margineCell.z = excelStyles.percentage;

    const avanzCell = marginiWS[XLSX.utils.encode_cell({ r: R, c: 11 })];
    if (avanzCell) avanzCell.z = excelStyles.percentage;
  }

  XLSX.utils.book_append_sheet(wb, marginiWS, 'Analisi Margini');
}

function createOrdiniFattureSheet(wb, { commesseToExport, ordiniToExport, fattureToExport }) {
  const ordiniFattureData = [['ORDINI E FATTURE'], ['ORDINI', '', '', '', 'FATTURE', '', '', ''], ['Commessa', 'Numero', 'Data', 'Importo €', 'Commessa', 'Mese', 'Data Invio', 'Importo €']];

  const maxRows = Math.max(ordiniToExport.length, fattureToExport.length);

  for (let i = 0; i < maxRows; i++) {
    const ordine = ordiniToExport[i];
    const fattura = fattureToExport[i];
    const commessaOrdine = ordine ? commesseToExport.find((c) => c.id === ordine.commessaId) : null;
    const commessaFattura = fattura ? commesseToExport.find((c) => c.id === fattura.commessaId) : null;

    ordiniFattureData.push([
      commessaOrdine?.nome || '',
      ordine?.numeroOrdine || '',
      ordine ? new Date(ordine.data) : '',
      ordine?.importo || '',
      commessaFattura?.nome || '',
      fattura?.meseCompetenza || '',
      fattura ? new Date(fattura.dataInvioConsuntivo) : '',
      fattura?.importo || '',
    ]);
  }

  const totaliRow = ordiniFattureData.length + 1;
  ordiniFattureData.push(['TOTALI ORDINI:', '', '', { f: `=SUM(D4:D${totaliRow - 1})` }, 'TOTALI FATTURE:', '', '', { f: `=SUM(H4:H${totaliRow - 1})` }]);

  const ordiniFattureWS = XLSX.utils.aoa_to_sheet(ordiniFattureData, { cellDates: true });
  ordiniFattureWS['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];

  // Applica stili e formati
  ordiniFattureWS['A1'].s = excelStyles.title;
  ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3'].forEach((c) => (ordiniFattureWS[c].s = excelStyles.header));
  ordiniFattureWS['A' + totaliRow].s = excelStyles.total;
  ordiniFattureWS['D' + totaliRow].s = excelStyles.total_currency;
  ordiniFattureWS['E' + totaliRow].s = excelStyles.total;
  ordiniFattureWS['H' + totaliRow].s = excelStyles.total_currency;

  XLSX.utils.book_append_sheet(wb, ordiniFattureWS, 'Ordini e Fatture');
}

function createClientiSheet(wb, { commesseToExport, marginiToExport }) {
  const pivotData = [['RIEPILOGO CLIENTI'], ['Cliente', 'Ricavi Fatturati €', 'Costi Totali €', 'Margine %']];

  const clientiMap = new Map();
  commesseToExport.forEach((c) => {
    if (!clientiMap.has(c.cliente)) {
      clientiMap.set(c.cliente, { ricavi: 0, costi: 0, commesseIds: [] });
    }
    clientiMap.get(c.cliente).commesseIds.push(c.id);
  });

  clientiMap.forEach((data, cliente) => {
    data.ricavi = state.dati.fatture.filter((f) => data.commesseIds.includes(f.commessaId)).reduce((sum, f) => sum + f.importo, 0);
    data.costi = marginiToExport.filter((m) => data.commesseIds.includes(m.commessaId)).reduce((sum, m) => sum + m.costoConsuntivi, 0);
  });

  Array.from(clientiMap.entries()).forEach(([cliente, data], index) => {
    const row = index + 3;
    pivotData.push([cliente, data.ricavi, data.costi, { f: `=IF(B${row}>0,(B${row}-C${row})/B${row},0)` }]);
  });

  const pivotWS = XLSX.utils.aoa_to_sheet(pivotData);
  pivotWS['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 12 }];

  // Applica stili e formati
  const range = XLSX.utils.decode_range(pivotWS['!ref']);
  pivotWS['A1'].s = excelStyles.title;
  ['A2', 'B2', 'C2', 'D2'].forEach((c) => (pivotWS[c].s = excelStyles.header));

  for (let R = 2; R <= range.e.r; ++R) {
    const clientCell = pivotWS[XLSX.utils.encode_cell({ r: R, c: 0 })];
    if (clientCell) clientCell.s = excelStyles.label; // Rende il nome cliente in grassetto

    const ricaviCell = pivotWS[XLSX.utils.encode_cell({ r: R, c: 1 })];
    if (ricaviCell) ricaviCell.z = excelStyles.currency;
    const costiCell = pivotWS[XLSX.utils.encode_cell({ r: R, c: 2 })];
    if (costiCell) costiCell.z = excelStyles.currency;
    const margineCell = pivotWS[XLSX.utils.encode_cell({ r: R, c: 3 })];
    if (margineCell) margineCell.z = excelStyles.percentage;
  }

  XLSX.utils.book_append_sheet(wb, pivotWS, 'Riepilogo Clienti');
}

function createMetaSheet(wb, { commesseToExport, budgetDetailsToExport, ordiniToExport, fattureToExport, marginiToExport }) {
  const metaData = [
    ['METADATI EXPORT'],
    ['Data Export', new Date().toLocaleString('it-IT')],
    ['Numero Commesse', commesseToExport.length],
    ['Numero Budget (details)', budgetDetailsToExport.length],
    ['Numero Ordini', ordiniToExport.length],
    ['Numero Fatture', fattureToExport.length],
    ['Numero Margini (records)', marginiToExport.length],
    [],
    ['LEGENDA FORMULE'],
    ['Margine %', '(Ricavi-Costi)/Ricavi*100'],
    ['Costo EAC', 'Budget*(1-Margine%/100)'],
    ['Ore ETC', 'Costo ETC / Costo per HH'],
    ['% Avanzamento', 'Costi Consuntivi/Costo EAC*100'],
  ];

  const metaWS = XLSX.utils.aoa_to_sheet(metaData);
  metaWS['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, metaWS, 'Info');
}

export function exportToExcel() {
  const useFilteredData = confirm("Vuoi esportare solo i dati filtrati visualizzati nella dashboard?\n\n- 'OK' per esportare la vista corrente.\n- 'Annulla' per esportare tutti i dati.");

  showSpinner();
  setTimeout(() => {
    try {
      const wb = XLSX.utils.book_new();
      // Forza il ricalcolo di tutte le formule all'apertura del file in Excel.
      // Questo risolve il problema delle formule che appaiono come testo invece di essere calcolate.
      wb.Workbook = { WBProps: { fullCalcOnLoad: true } };

      const exportData = getExportData(useFilteredData);

      createDashboardSheet(wb, exportData);
      createCommesseSheet(wb, exportData);
      createBudgetSheet(wb, exportData);
      createMarginiSheet(wb, exportData);
      createOrdiniFattureSheet(wb, exportData);
      createClientiSheet(wb, exportData);
      createMetaSheet(wb, exportData);

      const fileName = `Gestionale_Commesse_${useFilteredData ? 'Filtrato_' : 'Completo_'}${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showToast('Export Excel completato con successo!', 'success', 5000);
    } catch (error) {
      console.error("Errore durante l'export:", error);
      showToast("Errore durante l'export Excel. Controlla la console per i dettagli.", 'error');
    } finally {
      hideSpinner();
    }
  }, 50);
}
