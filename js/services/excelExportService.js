'use strict';

import { showSpinner, hideSpinner } from '../spinner.js';
import { showToast } from '../notifications.js';
import { state } from '../state.js';
import { getFilteredCommesse } from './calculationService.js';

const TEMPLATE_SHEETS = {
  INFO: 'Info Commessa',
  BUDGET: 'Budget',
  ORDINI: 'Ordini',
  FATTURE: 'Fatture',
  FORECAST: 'Forecast Margini',
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

/**
 * Formats a date string 'YYYY-MM-DD' into 'DD/MM/YYYY'.
 * @param {string} dateString The date string in 'YYYY-MM-DD'.
 * @returns {string} The formatted date string or an empty string.
 */
function formatToItalianDate(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function createInfoSheet(wb, { commesseToExport }) {
  const infoData = [['Nome Commessa', 'Cliente', 'Data Inizio (DD/MM/YYYY)', 'Stato', 'Tipologia'], ...commesseToExport.map((c) => [c.nome, c.cliente, formatToItalianDate(c.dataInizio), c.stato, c.tipologia])];
  const infoWS = XLSX.utils.aoa_to_sheet(infoData);
  infoWS['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, infoWS, TEMPLATE_SHEETS.INFO);
}

function createBudgetSheet(wb, { commesseToExport, budgetMasterToExport, budgetDetailsToExport }) {
  const budgetData = [['Nome Commessa', 'ID Budget', 'Mese Competenza (YYYY-MM)', 'Figura', 'Tariffa', 'Giorni', 'Importo Totale (se non dettagliato)']];

  budgetMasterToExport.forEach((master) => {
    const commessa = commesseToExport.find((c) => c.id === master.commessaId);
    if (!commessa) return;

    if (master.type === 'total') {
      budgetData.push([commessa.nome, master.budgetId, master.meseCompetenza, '', '', '', master.importo]);
    } else {
      const details = budgetDetailsToExport.filter((b) => b.budgetMasterId === master.id);
      if (details.length > 0) {
        details.forEach((detail) => {
          budgetData.push([commessa.nome, master.budgetId, master.meseCompetenza, detail.figura, detail.tariffa, detail.giorni, '']);
        });
      } else {
        // Add master even if it has no details, to preserve it
        budgetData.push([commessa.nome, master.budgetId, master.meseCompetenza, '', '', '', '']);
      }
    }
  });

  const budgetWS = XLSX.utils.aoa_to_sheet(budgetData);
  budgetWS['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, budgetWS, TEMPLATE_SHEETS.BUDGET);
}

function createOrdiniSheet(wb, { commesseToExport, ordiniToExport }) {
  const ordiniData = [
    ['Nome Commessa', 'Numero Ordine', 'Data (DD/MM/YYYY)', 'Importo'],
    ...ordiniToExport.map((ordine) => {
      const commessa = commesseToExport.find((c) => c.id === ordine.commessaId);
      return [commessa?.nome || '', ordine.numeroOrdine, formatToItalianDate(ordine.data), ordine.importo];
    }),
  ];
  const ordiniWS = XLSX.utils.aoa_to_sheet(ordiniData);
  ordiniWS['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ordiniWS, TEMPLATE_SHEETS.ORDINI);
}

function createFattureSheet(wb, { commesseToExport, fattureToExport }) {
  const fattureData = [
    ['Nome Commessa', 'Mese Competenza (YYYY-MM)', 'Data Invio Consuntivo (DD/MM/YYYY)', 'Importo'],
    ...fattureToExport.map((fattura) => {
      const commessa = commesseToExport.find((c) => c.id === fattura.commessaId);
      return [commessa?.nome || '', fattura.meseCompetenza, formatToItalianDate(fattura.dataInvioConsuntivo), fattura.importo];
    }),
  ];
  const fattureWS = XLSX.utils.aoa_to_sheet(fattureData);
  fattureWS['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 35 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, fattureWS, TEMPLATE_SHEETS.FATTURE);
}

function createForecastSheet(wb, { commesseToExport, marginiToExport }) {
  const forecastData = [
    ['Nome Commessa', 'Mese (YYYY-MM)', 'Costo Consuntivi', 'HH Consuntivo (per T&M/Canone)', 'GG da Fare (per Corpo)', 'Costo Medio HH (per Corpo)'],
    ...marginiToExport.map((margine) => {
      const commessa = commesseToExport.find((c) => c.id === margine.commessaId);
      if (!commessa) return [];

      const isCorpo = commessa.tipologia === 'Corpo';
      return [commessa.nome, margine.mese, margine.costoConsuntivi, isCorpo ? '' : margine.hhConsuntivo, isCorpo ? margine.ggDaFare : '', isCorpo ? margine.costoMedioHH : ''];
    }),
  ];
  const forecastWS = XLSX.utils.aoa_to_sheet(forecastData);
  forecastWS['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, forecastWS, TEMPLATE_SHEETS.FORECAST);
}

export function exportToExcel() {
  const useFilteredData = confirm("Vuoi esportare solo i dati filtrati visualizzati nella dashboard?\n\n- 'OK' per esportare la vista corrente.\n- 'Annulla' per esportare tutti i dati.");

  showSpinner();
  setTimeout(() => {
    try {
      const wb = XLSX.utils.book_new();

      const exportData = getExportData(useFilteredData);

      // Create sheets with the same structure as the import template
      createInfoSheet(wb, exportData);
      createBudgetSheet(wb, exportData);
      createOrdiniSheet(wb, exportData);
      createFattureSheet(wb, exportData);
      createForecastSheet(wb, exportData);

      const fileName = `Export_Commesse_${useFilteredData ? 'Filtrato_' : ''}${new Date().toISOString().slice(0, 10)}.xlsx`;
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
