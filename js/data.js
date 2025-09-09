'use strict';

import { showToast } from './notifications.js';
import { state } from './state.js';
import { generateId } from './utils.js';

function loadConfig() {
  const savedConfig = localStorage.getItem('gestionaleConfig');
  if (savedConfig) {
    try {
      const parsedConfig = JSON.parse(savedConfig);
      // Merge saved config with defaults to ensure new properties are added
      state.config = { ...state.config, ...parsedConfig };
    } catch (e) {
      console.error('Error parsing saved config, using defaults.', e);
    }
  }
  // Apply default filters to the active filters at startup
  state.filters.period = state.config.defaultFilters.period || 'all';
  state.filters.client = state.config.defaultFilters.client || 'all';
  state.filters.status = state.config.defaultFilters.status || 'all';
}

export function saveConfig() {
  localStorage.setItem('gestionaleConfig', JSON.stringify(state.config));
}

export function loadData() {
  loadConfig();
  const savedData = localStorage.getItem('gestionaleCommesseData');
  if (savedData) {
    try {
      state.dati = JSON.parse(savedData);
      // Ensure activityRules exists, otherwise load defaults
      if (!state.dati.activityRules) {
        state.dati.activityRules = getDefaultData().activityRules;
      } else {
        // Migration for old color values to ensure visibility
        state.dati.activityRules.forEach((rule) => {
          if (rule.color === 'bg-orange-100' || rule.color === 'bg-orange-200') {
            rule.color = 'bg-purple-200';
          } else if (rule.color === 'bg-cyan-100' || rule.color === 'bg-cyan-200') {
            rule.color = 'bg-sky-200';
          }
        });
      }
      console.log('Dati caricati dal localStorage:', state.dati);
    } catch (error) {
      console.error('Errore nel caricamento dal localStorage:', error);
      state.dati = getDefaultData();
    }
  } else {
    console.log('localStorage vuoto, caricamento dati di esempio');
    state.dati = getDefaultData();
    saveData();
  }

  if (state.dati.commesse.length > 0) {
    state.selectedCommessa = state.dati.commesse[0].id;
  }
}

export function saveActivityRules(rules) {
  state.dati.activityRules = rules;
  saveData();
}

export function saveData() {
  try {
    localStorage.setItem('gestionaleCommesseData', JSON.stringify(state.dati));
    console.log('Dati salvati nel localStorage:', state.dati);
  } catch (error) {
    console.error('Errore nel salvataggio nel localStorage:', error);
    showToast('Errore nel salvataggio dei dati.', 'error');
  }
}

export function saveForm(formData) {
  const { editingId, currentModalType, selectedCommessa } = state;

  if (editingId !== null) {
    // Logic for editing existing record
    switch (currentModalType) {
      case 'commessa':
        const commessaIndex = state.dati.commesse.findIndex((c) => c.id === editingId);
        if (commessaIndex > -1) {
          state.dati.commesse[commessaIndex] = {
            ...state.dati.commesse[commessaIndex],
            ...formData,
          };
        }
        break;
      case 'budget':
        if (editingId !== null) {
          // In modifica - aggiorna sia budget detail che budget master se necessario
          const budgetIndex = state.dati.budget.findIndex((b) => b.id === editingId);
          if (budgetIndex > -1) {
            const currentBudget = state.dati.budget[budgetIndex];

            // Aggiorna il budget detail
            state.dati.budget[budgetIndex] = {
              ...currentBudget,
              figura: formData.figura,
              tariffa: parseFloat(formData.tariffa),
              giorni: parseInt(formData.giorni),
            };

            // Se sono stati modificati ID Budget o Mese, aggiorna anche il budget master
            if (formData.budgetId || formData.meseCompetenza) {
              const masterIndex = state.dati.budgetMaster.findIndex((bm) => bm.id === currentBudget.budgetMasterId);
              if (masterIndex > -1) {
                if (formData.budgetId) {
                  state.dati.budgetMaster[masterIndex].budgetId = formData.budgetId;
                }
                if (formData.meseCompetenza) {
                  state.dati.budgetMaster[masterIndex].meseCompetenza = formData.meseCompetenza;
                }
              }
            }
          }
        }
        break;
      case 'ordine':
        const ordineIndex = state.dati.ordini.findIndex((o) => o.id === editingId);
        if (ordineIndex > -1) {
          state.dati.ordini[ordineIndex] = {
            ...state.dati.ordini[ordineIndex],
            ...formData,
            importo: parseFloat(formData.importo),
          };
        }
        break;
      case 'fattura':
        const fatturaIndex = state.dati.fatture.findIndex((f) => f.id === editingId);
        if (fatturaIndex > -1) {
          state.dati.fatture[fatturaIndex] = {
            ...state.dati.fatture[fatturaIndex],
            ...formData,
            importo: parseFloat(formData.importo),
          };
        }
        break;
      case 'margine':
        const margineIndex = state.dati.margini.findIndex((m) => m.id === editingId);
        if (margineIndex > -1) {
          state.dati.margini[margineIndex] = {
            ...state.dati.margini[margineIndex],
            ...formData,
            costoConsuntivi: parseFloat(formData.costoConsuntivi),
            hhConsuntivo: parseFloat(formData.hhConsuntivo),
          };
        }
        break;
    }
  } else {
    // Logic for creating new record
    switch (currentModalType) {
      case 'commessa':
        const newCommessa = { id: generateId(state.dati.commesse), ...formData };
        state.dati.commesse.push(newCommessa);
        state.selectedCommessa = newCommessa.id;
        break;
      case 'budget':
        const budgetMasterSelect = document.getElementById('budget-master-select');
        const selectedMasterId = budgetMasterSelect ? budgetMasterSelect.value : null;

        if (selectedMasterId === 'new') {
          const newBudgetMaster = {
            id: generateId(state.dati.budgetMaster || []),
            commessaId: selectedCommessa,
            budgetId: formData.budgetId,
            meseCompetenza: formData.meseCompetenza,
          };

          if (!state.dati.budgetMaster) state.dati.budgetMaster = [];
          state.dati.budgetMaster.push(newBudgetMaster);

          const newBudgetDetail = {
            id: generateId(state.dati.budget || []),
            budgetMasterId: newBudgetMaster.id,
            figura: formData.figura,
            tariffa: parseFloat(formData.tariffa),
            giorni: parseInt(formData.giorni),
          };

          if (!state.dati.budget) state.dati.budget = [];
          state.dati.budget.push(newBudgetDetail);
        } else {
          const newBudgetDetail = {
            id: generateId(state.dati.budget || []),
            budgetMasterId: parseInt(selectedMasterId),
            figura: formData.figura,
            tariffa: parseFloat(formData.tariffa),
            giorni: parseInt(formData.giorni),
          };

          if (!state.dati.budget) state.dati.budget = [];
          state.dati.budget.push(newBudgetDetail);
        }
        break;
      case 'ordine':
        const newOrdine = { id: generateId(state.dati.ordini), commessaId: selectedCommessa, ...formData, importo: parseFloat(formData.importo) };
        state.dati.ordini.push(newOrdine);
        break;
      case 'fattura':
        const newFattura = { id: generateId(state.dati.fatture), commessaId: selectedCommessa, ...formData, importo: parseFloat(formData.importo) };
        state.dati.fatture.push(newFattura);
        break;
      case 'margine':
        const newMargine = { id: generateId(state.dati.margini), commessaId: selectedCommessa, ...formData, costoConsuntivi: parseFloat(formData.costoConsuntivi), hhConsuntivo: parseFloat(formData.hhConsuntivo) };
        state.dati.margini.push(newMargine);
        break;
    }
  }

  saveData();
}

export function deleteRecord(type, id) {
  const typeMap = {
    budget: { array: 'budget', name: 'budget detail' },
    budgetMaster: { array: 'budgetMaster', name: 'budget master' },
    ordini: { array: 'ordini', name: 'ordine' },
    fatture: { array: 'fatture', name: 'fattura' },
    margini: { array: 'margini', name: 'margine' },
  };

  const config = typeMap[type];
  if (!config) return false;

  const record = state.dati[config.array]?.find((item) => item.id === id);
  if (!record) return false;

  if (type === 'budgetMaster') {
    if (confirm(`Sei sicuro di voler eliminare questo ${config.name}?\nVerranno eliminati anche tutti i dettagli collegati.`)) {
      state.dati.budgetMaster = state.dati.budgetMaster.filter((item) => item.id !== id);
      if (state.dati.budget) {
        state.dati.budget = state.dati.budget.filter((item) => item.budgetMasterId !== id);
      }
      saveData();
      showToast(`${config.name.charAt(0).toUpperCase() + config.name.slice(1)} eliminato con successo!`);
      return true;
    }
  } else {
    if (confirm(`Sei sicuro di voler eliminare questo ${config.name}?`)) {
      state.dati[config.array] = state.dati[config.array].filter((item) => item.id !== id);
      saveData();
      showToast(`${config.name.charAt(0).toUpperCase() + config.name.slice(1)} eliminato con successo!`);
      return true;
    }
  }
  return false;
}

export function duplicateBudget(masterId) {
  const originalMaster = state.dati.budgetMaster?.find((bm) => bm.id === masterId);
  if (!originalMaster) {
    showToast('Errore: Budget originale non trovato.', 'error');
    return false;
  }

  const originalDetails = state.dati.budget?.filter((b) => b.budgetMasterId === masterId) || [];

  const newBudgetId = prompt('Inserisci il nuovo ID per il budget duplicato:', `${originalMaster.budgetId}_COPIA`);
  if (!newBudgetId) return false; // User cancelled

  const newMeseCompetenza = prompt('Inserisci il nuovo Mese di Competenza (YYYY-MM):', new Date().toISOString().slice(0, 7));
  if (!newMeseCompetenza) return false; // User cancelled

  // Create new master
  const newMaster = {
    ...originalMaster,
    id: generateId(state.dati.budgetMaster),
    budgetId: newBudgetId,
    meseCompetenza: newMeseCompetenza,
  };
  state.dati.budgetMaster.push(newMaster);

  // Create new details
  originalDetails.forEach((detail) => {
    const newDetail = {
      ...detail,
      id: generateId(state.dati.budget),
      budgetMasterId: newMaster.id,
    };
    state.dati.budget.push(newDetail);
  });

  saveData();
  showToast('Budget duplicato con successo!');
  return true;
}

export function deleteCommessa(id) {
  const commessa = state.dati.commesse.find((c) => c.id === id);
  if (!commessa) return false;

  if (confirm(`Sei sicuro di voler eliminare la commessa "${commessa.nome}"?\nVerranno eliminati anche tutti i budget, ordini, fatture e margini collegati.`)) {
    state.dati.commesse = state.dati.commesse.filter((c) => c.id !== id);
    if (state.dati.budgetMaster) {
      const budgetMastersToDelete = state.dati.budgetMaster.filter((bm) => bm.commessaId === id);
      state.dati.budgetMaster = state.dati.budgetMaster.filter((bm) => bm.commessaId !== id);
      budgetMastersToDelete.forEach((bm) => {
        if (state.dati.budget) {
          state.dati.budget = state.dati.budget.filter((b) => b.budgetMasterId !== bm.id);
        }
      });
    }
    state.dati.ordini = state.dati.ordini.filter((o) => o.commessaId !== id);
    state.dati.fatture = state.dati.fatture.filter((f) => f.commessaId !== id);
    state.dati.margini = state.dati.margini.filter((m) => m.commessaId !== id);

    if (state.selectedCommessa === id) {
      state.selectedCommessa = state.dati.commesse.length > 0 ? state.dati.commesse[0].id : null;
    }

    saveData();
    showToast('Commessa eliminata con successo!');
    return true;
  }
  return false;
}

function getDefaultData() {
  return {
    commesse: [
      { id: 1, nome: 'Progetto Alpha', cliente: 'Cliente A', dataInizio: '2024-01-15', stato: 'Attivo' },
      { id: 2, nome: 'Budget Zero', cliente: 'Cliente B', dataInizio: '2024-12-31', stato: 'Pianificazione' },
      { id: 3, nome: 'Sistema Beta', cliente: 'Cliente C', dataInizio: '2024-06-01', stato: 'Attivo' },
    ],
    budgetMaster: [
      { id: 1, commessaId: 2, budgetId: 'BUD001', meseCompetenza: '2024-12' },
      { id: 2, commessaId: 3, budgetId: 'BUD002', meseCompetenza: '2024-06' },
    ],
    budget: [
      { id: 1, budgetMasterId: 1, figura: 'Senior Manager', tariffa: 700, giorni: 10 },
      { id: 2, budgetMasterId: 1, figura: 'Project Manager', tariffa: 596, giorni: 22 },
      { id: 3, budgetMasterId: 1, figura: 'Software Engineer', tariffa: 430, giorni: 70 },
      { id: 4, budgetMasterId: 2, figura: 'Senior Manager', tariffa: 720, giorni: 15 },
      { id: 5, budgetMasterId: 2, figura: 'Software Engineer', tariffa: 450, giorni: 60 },
    ],
    ordini: [
      { id: 1, commessaId: 2, numeroOrdine: 'ORD-2024-001', data: '2024-01-15', importo: 25000 },
      { id: 2, commessaId: 2, numeroOrdine: 'ORD-2024-002', data: '2024-06-15', importo: 30000 },
      { id: 3, commessaId: 3, numeroOrdine: 'ORD-2024-003', data: '2024-06-01', importo: 40000 },
    ],
    fatture: [
      { id: 1, commessaId: 2, meseCompetenza: '2024-01', dataInvioConsuntivo: '2024-02-05', importo: 12000 },
      { id: 2, commessaId: 2, meseCompetenza: '2024-02', dataInvioConsuntivo: '2024-03-05', importo: 8000 },
      { id: 3, commessaId: 3, meseCompetenza: '2024-06', dataInvioConsuntivo: '2024-07-05', importo: 15000 },
      { id: 4, commessaId: 3, meseCompetenza: '2024-07', dataInvioConsuntivo: '2024-08-05', importo: 18000 },
    ],
    margini: [
      { id: 1, commessaId: 2, mese: '2024-01', costoConsuntivi: 9000, hhConsuntivo: 200 },
      { id: 2, commessaId: 2, mese: '2024-02', costoConsuntivi: 6000, hhConsuntivo: 150 },
      { id: 3, commessaId: 3, mese: '2024-06', costoConsuntivi: 10000, hhConsuntivo: 220 },
      { id: 4, commessaId: 3, mese: '2024-07', costoConsuntivi: 14000, hhConsuntivo: 280 },
    ],
    activityRules: [
      { startDay: 1, endDay: 3, description: 'Quadratura TS e invio consuntivi', color: 'bg-yellow-100' },
      { startDay: 4, endDay: 12, description: 'Invio fatture e revisione forecast', color: 'bg-green-100' },
      { startDay: 16, endDay: 18, description: 'Controllo ricavi e approvazione forecast', color: 'bg-indigo-100' },
    ],
  };
}
