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
      ['Nome Commessa', 'Cliente', 'Data Inizio (DD/MM/YYYY)', 'Stato', 'Tipologia'],
      ['Nuovo Progetto Fantastico', 'Nuovo Cliente SPA', '01/10/2024', 'Pianificazione', 'T&M'],
      ['Manutenzione Sistema Legacy', 'Cliente Esistente SRL', '01/01/2024', 'Attivo', 'Canone'],
      ['Progetto a Corpo Esempio', 'Cliente Esistente SRL', '01/05/2024', 'Attivo', 'Corpo'],
    ];
    const infoWS = XLSX.utils.aoa_to_sheet(infoData);
    infoWS['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, infoWS, TEMPLATE_SHEETS.INFO);

    // Sheet: Budget
    const budgetData = [
      ['Nome Commessa', 'ID Budget', 'Mese Competenza (YYYY-MM)', 'Figura', 'Tariffa', 'Giorni', 'Importo Totale (se non dettagliato)'],
      ['Nuovo Progetto Fantastico', 'BUDGET_01', '2024-10', 'Senior Developer', 500, 20.5, ''],
      ['Nuovo Progetto Fantastico', 'BUDGET_01', '2024-10', 'Junior Developer', 300, 15.25, ''],
      ['Manutenzione Sistema Legacy', 'BUDGET_02', '2024-11', '', '', '', 50000],
    ];
    const budgetWS = XLSX.utils.aoa_to_sheet(budgetData);
    budgetWS['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, budgetWS, TEMPLATE_SHEETS.BUDGET);

    // Sheet: Ordini
    const ordiniData = [
      ['Nome Commessa', 'Numero Ordine', 'Data (DD/MM/YYYY)', 'Importo'],
      ['Nuovo Progetto Fantastico', 'ORD-2024-XYZ', '15/09/2024', 50000],
      ['Manutenzione Sistema Legacy', 'ORD-2024-ABC', '10/01/2024', 75000],
    ];
    const ordiniWS = XLSX.utils.aoa_to_sheet(ordiniData);
    ordiniWS['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ordiniWS, TEMPLATE_SHEETS.ORDINI);

    // Sheet: Fatture
    const fattureData = [
      ['Nome Commessa', 'Mese Competenza (YYYY-MM)', 'Data Invio Consuntivo (DD/MM/YYYY)', 'Importo'],
      ['Nuovo Progetto Fantastico', '2024-10', '05/11/2024', 25000],
      ['Manutenzione Sistema Legacy', '2024-01', '05/02/2024', 6000],
    ];
    const fattureWS = XLSX.utils.aoa_to_sheet(fattureData);
    fattureWS['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 35 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, fattureWS, TEMPLATE_SHEETS.FATTURE);

    // Sheet: Forecast
    const forecastData = [
      ['Nome Commessa', 'Mese (YYYY-MM)', 'Costo Consuntivi', 'HH Consuntivo (per T&M/Canone)', 'GG da Fare (per Corpo)', 'Costo Medio HH (per Corpo)'],
      ['Nuovo Progetto Fantastico', '2024-10', 18000, 300, '', ''],
      ['Manutenzione Sistema Legacy', '2024-01', 5000, 100, '', ''],
      ['Progetto a Corpo Esempio', '2024-05', 25000, '', 50, 65],
    ];
    const forecastWS = XLSX.utils.aoa_to_sheet(forecastData);
    forecastWS['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, forecastWS, TEMPLATE_SHEETS.FORECAST);

    XLSX.writeFile(wb, 'Template_Import_Commesse.xlsx');
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

    // --- 2. Create New Commesse ---
    const newCommesse = [];
    const commesseMap = new Map(); // Map<commessaName, commessaObject>
    for (let i = 1; i < infoData.length; i++) {
      const row = infoData[i];
      const commessaInfo = {
        nome: row[0],
        cliente: row[1],
        dataInizio: parseAndFormatDate(row[2]),
        stato: row[3],
        tipologia: ['T&M', 'Corpo', 'Canone'].includes(row[4]) ? row[4] : 'T&M',
      };
      if (!commessaInfo.nome || !commessaInfo.cliente || !commessaInfo.dataInizio || !commessaInfo.stato) {
        showToast(`Dati mancanti o non validi alla riga ${i + 1} della sheet "Info Commessa". Riga saltata.`, 'warning', 5000);
        continue;
      }
      if (commesseMap.has(commessaInfo.nome)) {
        showToast(`Nome commessa duplicato: "${commessaInfo.nome}". Riga ${i + 1} saltata.`, 'warning', 5000);
        continue;
      }
      const newCommessa = { id: generateId(state.dati.commesse.concat(newCommesse)), ...commessaInfo };
      newCommesse.push(newCommessa);
      commesseMap.set(newCommessa.nome, newCommessa);
    }

    if (newCommesse.length === 0) {
      throw new Error('Nessuna commessa valida da importare trovata nel file.');
    }

    // --- 3. Parse and Process Related Data ---
    const newBudgetMasters = [];
    const newBudgetDetails = [];
    const newOrdini = [];
    const newFatture = [];
    const newMargini = [];

    // Helper to find commessa by name
    const getCommessaId = (nomeCommessa) => {
      const commessa = commesseMap.get(nomeCommessa);
      if (!commessa) {
        showToast(`Commessa "${nomeCommessa}" non trovata in "Info Commessa". Record saltato.`, 'warning', 5000);
        return null;
      }
      return commessa.id;
    };

    // Budget
    const budgetSheet = wb.Sheets[TEMPLATE_SHEETS.BUDGET];
    if (budgetSheet) {
      const budgetData = XLSX.utils.sheet_to_json(budgetSheet);
      const budgetMasterMap = new Map();
      const totalBudgets = new Map();

      // First pass: find total-based budgets
      budgetData.forEach((row) => {
        const importoTotale = row['Importo Totale (se non dettagliato)'];
        if (importoTotale && parseFloat(importoTotale) > 0) {
          const masterKey = `${row['Nome Commessa']}-${row['ID Budget']}-${row['Mese Competenza (YYYY-MM)']}`;
          totalBudgets.set(masterKey, { nomeCommessa: row['Nome Commessa'], budgetId: row['ID Budget'], meseCompetenza: row['Mese Competenza (YYYY-MM)'], importo: parseFloat(importoTotale) });
        }
      });

      // Create total-based masters
      totalBudgets.forEach((value, key) => {
        const commessaId = getCommessaId(value.nomeCommessa);
        if (!commessaId) return;

        const newMaster = {
          id: generateId(state.dati.budgetMaster.concat(newBudgetMasters)),
          commessaId: commessaId,
          budgetId: value.budgetId,
          meseCompetenza: value.meseCompetenza,
          type: 'total',
          importo: value.importo,
        };
        newBudgetMasters.push(newMaster);
        budgetMasterMap.set(key, newMaster.id); // Mark as processed
      });

      // Second pass: process detail-based budgets
      budgetData.forEach((row) => {
        const masterKey = `${row['Nome Commessa']}-${row['ID Budget']}-${row['Mese Competenza (YYYY-MM)']}`;
        // Skip if it's a total-based budget or if there's no detail data
        if (totalBudgets.has(masterKey) || !row['Figura'] || !row['Tariffa'] || !row['Giorni']) {
          return;
        }

        const commessaId = getCommessaId(row['Nome Commessa']);
        if (!commessaId) return;

        if (!budgetMasterMap.has(masterKey)) {
          const newMaster = {
            id: generateId(state.dati.budgetMaster.concat(newBudgetMasters)),
            commessaId: commessaId,
            budgetId: row['ID Budget'],
            meseCompetenza: row['Mese Competenza (YYYY-MM)'],
            type: 'detail',
            importo: null,
          };
          newBudgetMasters.push(newMaster);
          budgetMasterMap.set(masterKey, newMaster.id);
        }
        const newDetail = {
          id: generateId(state.dati.budget.concat(newBudgetDetails)),
          budgetMasterId: budgetMasterMap.get(masterKey),
          figura: row['Figura'],
          tariffa: parseFloat(row['Tariffa']) || 0,
          giorni: parseFloat(row['Giorni']) || 0,
        };
        newBudgetDetails.push(newDetail);
      });
    }

    // Ordini
    const ordiniSheet = wb.Sheets[TEMPLATE_SHEETS.ORDINI];
    if (ordiniSheet) {
      XLSX.utils.sheet_to_json(ordiniSheet).forEach((row) => {
        const commessaId = getCommessaId(row['Nome Commessa']);
        if (!commessaId) return;
        newOrdini.push({
          id: generateId(state.dati.ordini.concat(newOrdini)),
          commessaId: commessaId,
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
        const commessaId = getCommessaId(row['Nome Commessa']);
        if (!commessaId) return;
        newFatture.push({
          id: generateId(state.dati.fatture.concat(newFatture)),
          commessaId: commessaId,
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
        const commessa = commesseMap.get(row['Nome Commessa']);
        if (!commessa) {
          showToast(`Commessa "${row['Nome Commessa']}" non trovata in "Info Commessa" per il record di Forecast. Record saltato.`, 'warning', 5000);
          return;
        }

        const newMargine = {
          id: generateId(state.dati.margini.concat(newMargini)),
          commessaId: commessa.id,
          mese: row['Mese (YYYY-MM)'],
          costoConsuntivi: parseFloat(row['Costo Consuntivi']) || 0,
          hhConsuntivo: 0,
          ggDaFare: 0,
          costoMedioHH: 0,
        };

        if (commessa.tipologia === 'Corpo') {
          newMargine.ggDaFare = parseFloat(row['GG da Fare (per Corpo)']) || 0;
          newMargine.costoMedioHH = parseFloat(row['Costo Medio HH (per Corpo)']) || 0;
        } else {
          newMargine.hhConsuntivo = parseFloat(row['HH Consuntivo (per T&M/Canone)']) || 0;
        }

        newMargini.push(newMargine);
      });
    }

    // --- 4. Update State and Save ---
    state.dati.commesse.push(...newCommesse);
    state.dati.budgetMaster.push(...newBudgetMasters);
    state.dati.budget.push(...newBudgetDetails);
    state.dati.ordini.push(...newOrdini);
    state.dati.fatture.push(...newFatture);
    state.dati.margini.push(...newMargini);

    data.saveData();
    showToast(`${newCommesse.length} commesse importate con successo!`, 'success');
    ui.update();
  } catch (error) {
    console.error("Errore durante l'importazione:", error);
    showToast(error.message, 'error', 8000);
  } finally {
    hideSpinner();
  }
}
