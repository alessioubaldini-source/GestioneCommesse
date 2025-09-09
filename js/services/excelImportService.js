'use strict';

import { state } from '../state.js';
import * as data from '../data.js';
import { generateId } from '../utils.js';
import { showToast } from '../notifications.js';
import { showSpinner, hideSpinner } from '../spinner.js';
import * as ui from '../ui.js';

const TEMPLATE_SHEETS = {
  INFO: 'Info Commessa',
  BUDGET: 'Budget',
  ORDINI: 'Ordini',
  FATTURE: 'Fatture',
  FORECAST: 'Forecast Margini',
};

/**
 * Parses a flexible date input (Date object, 'DD/MM/YYYY', or 'YYYY-MM-DD')
 * and returns it in 'YYYY-MM-DD' format.
 * @param {Date|string|number} dateInput The date to parse.
 * @returns {string|null} The formatted date string or null.
 */
function parseAndFormatDate(dateInput) {
  if (!dateInput) return null;

  // If it's already a Date object from xlsx parsing (cellDates:true)
  if (dateInput instanceof Date && !isNaN(dateInput)) {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof dateInput !== 'string') return null;

  // Try parsing DD/MM/YYYY
  let parts = dateInput.split('/');
  if (parts.length === 3) {
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    if (day.length === 2 && month.length === 2 && year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }

  // Assume YYYY-MM-DD if it contains dashes and is valid
  parts = dateInput.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return dateInput;
  }

  return null; // Invalid format
}

/**
 * Creates and downloads an Excel template for importing a new project.
 */
export function downloadImportTemplate() {
  try {
    const wb = XLSX.utils.book_new();

    // Sheet: Info Commessa
    const infoData = [
      ['Nome Commessa', 'Cliente', 'Data Inizio (DD/MM/YYYY)', 'Stato'],
      ['Nuovo Progetto Fantastico', 'Nuovo Cliente SPA', '01/10/2024', 'Pianificazione'],
    ];
    const infoWS = XLSX.utils.aoa_to_sheet(infoData);
    infoWS['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, infoWS, TEMPLATE_SHEETS.INFO);

    // Sheet: Budget
    const budgetData = [
      ['ID Budget', 'Mese Competenza (YYYY-MM)', 'Figura', 'Tariffa', 'Giorni'],
      ['BUDGET_01', '2024-10', 'Senior Developer', 500, 20],
      ['BUDGET_01', '2024-10', 'Junior Developer', 300, 15],
      ['BUDGET_02', '2024-11', 'Senior Developer', 500, 22],
    ];
    const budgetWS = XLSX.utils.aoa_to_sheet(budgetData);
    budgetWS['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, budgetWS, TEMPLATE_SHEETS.BUDGET);

    // Sheet: Ordini
    const ordiniData = [
      ['Numero Ordine', 'Data (DD/MM/YYYY)', 'Importo'],
      ['ORD-2024-XYZ', '15/09/2024', 50000],
    ];
    const ordiniWS = XLSX.utils.aoa_to_sheet(ordiniData);
    ordiniWS['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ordiniWS, TEMPLATE_SHEETS.ORDINI);

    // Sheet: Fatture
    const fattureData = [
      ['Mese Competenza (YYYY-MM)', 'Data Invio Consuntivo (DD/MM/YYYY)', 'Importo'],
      ['2024-10', '05/11/2024', 25000],
    ];
    const fattureWS = XLSX.utils.aoa_to_sheet(fattureData);
    fattureWS['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, fattureWS, TEMPLATE_SHEETS.FATTURE);

    // Sheet: Forecast
    const forecastData = [
      ['Mese (YYYY-MM)', 'Costo Consuntivi', 'HH Consuntivo'],
      ['2024-10', 18000, 300],
    ];
    const forecastWS = XLSX.utils.aoa_to_sheet(forecastData);
    forecastWS['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, forecastWS, TEMPLATE_SHEETS.FORECAST);

    XLSX.writeFile(wb, 'Template_Import_Commessa.xlsx');
    showToast('Template scaricato con successo!', 'success');
  } catch (error) {
    console.error('Errore durante la creazione del template:', error);
    showToast('Errore durante la creazione del template.', 'error');
  }
}

/**
 * Imports a new project from an Excel file.
 * @param {File} file The Excel file to import.
 */
export async function importCommessaFromExcel(file) {
  if (!file) return;
  showSpinner();

  try {
    const dataArrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(dataArrayBuffer, { cellDates: true });

    // --- 1. Parse and Validate Commessa Info ---
    const infoSheet = wb.Sheets[TEMPLATE_SHEETS.INFO];
    if (!infoSheet) throw new Error(`Sheet "${TEMPLATE_SHEETS.INFO}" non trovata.`);
    const infoData = XLSX.utils.sheet_to_json(infoSheet, { header: 1 });
    if (infoData.length < 2) throw new Error(`Sheet "${TEMPLATE_SHEETS.INFO}" non contiene dati.`);
    const commessaInfo = {
      nome: infoData[1][0],
      cliente: infoData[1][1],
      dataInizio: parseAndFormatDate(infoData[1][2]),
      stato: infoData[1][3],
    };
    if (!commessaInfo.nome || !commessaInfo.cliente || !commessaInfo.dataInizio || !commessaInfo.stato) {
      throw new Error('Dati mancanti o non validi nella sheet "Info Commessa".');
    }

    // --- 2. Create New Commessa ---
    const newCommessa = { id: generateId(state.dati.commesse), ...commessaInfo };

    // --- 3. Parse and Process Related Data ---
    const newBudgetMasters = [];
    const newBudgetDetails = [];
    const newOrdini = [];
    const newFatture = [];
    const newMargini = [];

    // Budget
    const budgetSheet = wb.Sheets[TEMPLATE_SHEETS.BUDGET];
    if (budgetSheet) {
      const budgetData = XLSX.utils.sheet_to_json(budgetSheet);
      const budgetMasterMap = new Map();
      budgetData.forEach((row) => {
        const masterKey = `${row['ID Budget']}-${row['Mese Competenza (YYYY-MM)']}`;
        if (!budgetMasterMap.has(masterKey)) {
          const newMaster = {
            id: generateId(state.dati.budgetMaster.concat(newBudgetMasters)),
            commessaId: newCommessa.id,
            budgetId: row['ID Budget'],
            meseCompetenza: row['Mese Competenza (YYYY-MM)'],
          };
          newBudgetMasters.push(newMaster);
          budgetMasterMap.set(masterKey, newMaster.id);
        }
        const newDetail = {
          id: generateId(state.dati.budget.concat(newBudgetDetails)),
          budgetMasterId: budgetMasterMap.get(masterKey),
          figura: row['Figura'],
          tariffa: parseFloat(row['Tariffa']),
          giorni: parseInt(row['Giorni']),
        };
        newBudgetDetails.push(newDetail);
      });
    }

    // Ordini
    const ordiniSheet = wb.Sheets[TEMPLATE_SHEETS.ORDINI];
    if (ordiniSheet) {
      XLSX.utils.sheet_to_json(ordiniSheet).forEach((row) => {
        newOrdini.push({
          id: generateId(state.dati.ordini.concat(newOrdini)),
          commessaId: newCommessa.id,
          numeroOrdine: row['Numero Ordine'],
          data: parseAndFormatDate(row['Data (DD/MM/YYYY)']),
          importo: parseFloat(row['Importo']),
        });
      });
    }

    // Fatture
    const fattureSheet = wb.Sheets[TEMPLATE_SHEETS.FATTURE];
    if (fattureSheet) {
      XLSX.utils.sheet_to_json(fattureSheet).forEach((row) => {
        newFatture.push({
          id: generateId(state.dati.fatture.concat(newFatture)),
          commessaId: newCommessa.id,
          meseCompetenza: row['Mese Competenza (YYYY-MM)'],
          dataInvioConsuntivo: parseAndFormatDate(row['Data Invio Consuntivo (DD/MM/YYYY)']),
          importo: parseFloat(row['Importo']),
        });
      });
    }

    // Forecast Margini
    const forecastSheet = wb.Sheets[TEMPLATE_SHEETS.FORECAST];
    if (forecastSheet) {
      XLSX.utils.sheet_to_json(forecastSheet).forEach((row) => {
        newMargini.push({
          id: generateId(state.dati.margini.concat(newMargini)),
          commessaId: newCommessa.id,
          mese: row['Mese (YYYY-MM)'],
          costoConsuntivi: parseFloat(row['Costo Consuntivi']),
          hhConsuntivo: parseFloat(row['HH Consuntivo']),
        });
      });
    }

    // --- 4. Update State and Save ---
    state.dati.commesse.push(newCommessa);
    state.dati.budgetMaster.push(...newBudgetMasters);
    state.dati.budget.push(...newBudgetDetails);
    state.dati.ordini.push(...newOrdini);
    state.dati.fatture.push(...newFatture);
    state.dati.margini.push(...newMargini);

    data.saveData();
    showToast(`Commessa "${newCommessa.nome}" importata con successo!`, 'success');
    ui.update();
  } catch (error) {
    console.error("Errore durante l'importazione:", error);
    showToast(error.message, 'error', 8000);
  } finally {
    hideSpinner();
  }
}
