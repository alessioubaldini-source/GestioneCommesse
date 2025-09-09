'use strict';

import * as data from './data.js';
import { state } from './state.js';
import { elements } from './dom.js';
import * as calcService from './services/calculationService.js';

// Import new UI modules
import * as components from './ui/components.js';
import * as tables from './ui/tables.js';
import * as charts from './ui/charts.js';
import * as calendar from './ui/calendar.js';

// Re-export functions needed by other modules (like events.js) to keep the public API stable
export { updateCharts } from './ui/charts.js';
export { sortCommesseTable, filterCommesseTable, updateCommessaSpecificTables, updateTables } from './ui/tables.js';
export { updateCommessaSelect, updateCommessaHeader } from './ui/components.js';

export function update() {
  components.updateKPI();
  tables.updateTables();
  charts.updateCharts();
  calendar.renderCalendar();
  calendar.renderCalendarLegend();
  components.updateCommessaSelect();
  components.updateCommessaHeader();
  components.updateFilterOptions();
  components.updateButtonStates();
  components.updateCommesseMonitorate();
}

export function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach((el) => el.classList.add('hidden'));
  document.getElementById(tabName + '-content').classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-400', 'dark:border-blue-400');
    btn.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
  });
  document.getElementById('tab-' + tabName).classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-400', 'dark:border-blue-400');
}

export function switchSubTab(tabName) {
  document.querySelectorAll('.sub-content').forEach((el) => el.classList.add('hidden'));
  document.getElementById(tabName + '-section').classList.remove('hidden');
  // Animation for fade-in
  document.getElementById(tabName + '-section').classList.add('fade-in');

  document.querySelectorAll('.sub-tab-btn').forEach((btn) => {
    btn.classList.remove('border-blue-500', 'text-blue-600');
    btn.classList.add('border-transparent', 'text-gray-500');
  });
  document.getElementById('sub-' + tabName).classList.add('border-blue-500', 'text-blue-600');
}

export function applyFilters() {
  components.updateKPI();
  tables.updateTables();
  charts.updateCharts();
  data.saveData(); // Save filters state on change
}

export function openModal(type, id = null) {
  if (type !== 'commessa' && state.selectedCommessa === null) {
    alert('Per favore, seleziona prima una commessa.');
    return;
  }

  state.currentModalType = type;
  state.editingId = id;
  elements.modalForm.reset();

  let titleText = '';
  let fieldsHTML = '';
  let itemToEdit = null;

  if (id) {
    switch (type) {
      case 'commessa':
        itemToEdit = state.dati.commesse.find((c) => c.id === id);
        break;
      case 'budget':
        itemToEdit = state.dati.budget?.find((b) => b.id === id);
        break;
      case 'ordine':
        itemToEdit = state.dati.ordini.find((o) => o.id === id);
        break;
      case 'fattura':
        itemToEdit = state.dati.fatture.find((f) => f.id === id);
        break;
      case 'margine':
        itemToEdit = state.dati.margini.find((m) => m.id === id);
        break;
    }
  }

  switch (type) {
    case 'commessa':
      titleText = id ? 'Modifica Commessa' : 'Nuova Commessa';
      fieldsHTML = `
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome Commessa</label><input type="text" name="nome" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cliente</label><input type="text" name="cliente" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data Inizio</label><input type="date" name="dataInizio" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stato</label><select name="stato" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required><option value="">Seleziona stato</option><option value="Pianificazione">Pianificazione</option><option value="Attivo">Attivo</option><option value="Completato">Completato</option><option value="Sospeso">Sospeso</option></select></div>`;
      break;
    case 'budget':
      titleText = id ? 'Modifica Budget Detail' : 'Nuovo Budget';
      if (!id) {
        const budgetMasters = calcService.getBudgetMasterData(state.selectedCommessa);
        let masterOptions = '<option value="new">+ Crea Nuovo Budget</option>';
        budgetMasters.forEach((master) => {
          masterOptions += `<option value="${master.id}">${master.budgetId} - ${master.meseCompetenza}</option>`;
        });

        fieldsHTML = `
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Budget</label>
                  <select id="budget-master-select" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required>
                    ${masterOptions}
                  </select>
                </div>
                <div id="new-budget-fields" class="hidden">
                  <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ID Budget</label><input type="text" name="budgetId" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"></div>
                  <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mese Competenza</label><input type="month" name="meseCompetenza" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"></div>
                </div>
                <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Figura</label><select name="figura" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required><option value="">Seleziona figura</option><option value="Senior Manager">Senior Manager</option><option value="Project Manager">Project Manager</option><option value="Software Engineer">Software Engineer</option><option value="Junior Developer">Junior Developer</option></select></div>
                <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tariffa €</label><input type="number" step="0.01" name="tariffa" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
                <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Giorni</label><input type="number" name="giorni" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>`;
      } else {
        fieldsHTML = `
                <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Figura</label><select name="figura" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required><option value="">Seleziona figura</option><option value="Senior Manager">Senior Manager</option><option value="Project Manager">Project Manager</option><option value="Software Engineer">Software Engineer</option><option value="Junior Developer">Junior Developer</option></select></div>
                <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tariffa €</label><input type="number" step="0.01" name="tariffa" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
                <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Giorni</label><input type="number" name="giorni" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>`;
      }
      break;
    case 'ordine':
      titleText = id ? 'Modifica Ordine' : 'Nuovo Ordine';
      fieldsHTML = `
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Numero Ordine</label><input type="text" name="numeroOrdine" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data</label><input type="date" name="data" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Importo €</label><input type="number" step="0.01" name="importo" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>`;
      break;
    case 'fattura':
      titleText = id ? 'Modifica Fattura' : 'Nuova Fattura';
      fieldsHTML = `
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mese Competenza</label><input type="month" name="meseCompetenza" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data Invio Consuntivo</label><input type="date" name="dataInvioConsuntivo" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Importo €</label><input type="number" step="0.01" name="importo" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>`;
      break;
    case 'margine':
      titleText = id ? 'Modifica Margine' : 'Nuovo Forecast Margine';
      fieldsHTML = `
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mese</label><input type="month" name="mese" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Costo Consuntivi €</label><input type="number" step="0.01" name="costoConsuntivi" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">HH Consuntivo</label><input type="number" name="hhConsuntivo" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>`;
      break;
  }

  elements.modalTitle.textContent = titleText;
  elements.formFields.innerHTML = fieldsHTML;

  if (itemToEdit) {
    setTimeout(() => {
      for (const key in itemToEdit) {
        const field = elements.modalForm.elements[key];
        if (field && itemToEdit[key] !== undefined) {
          field.value = itemToEdit[key];
        }
      }
    }, 100);
  }

  setTimeout(() => {
    const budgetMasterSelect = document.getElementById('budget-master-select');
    const newBudgetFields = document.getElementById('new-budget-fields');

    if (budgetMasterSelect && newBudgetFields) {
      // Se il select esiste, aggiungi l'event listener
      budgetMasterSelect.addEventListener('change', (e) => {
        if (e.target.value === 'new') {
          newBudgetFields.classList.remove('hidden');
          newBudgetFields.querySelectorAll('input').forEach((input) => (input.required = true));
        } else {
          newBudgetFields.classList.add('hidden');
          newBudgetFields.querySelectorAll('input').forEach((input) => (input.required = false));
        }
      });

      // Se il primo budget è "new", mostra subito i campi
      if (budgetMasterSelect.value === 'new') {
        newBudgetFields.classList.remove('hidden');
        newBudgetFields.querySelectorAll('input').forEach((input) => (input.required = true));
      }
    } else if (newBudgetFields && !budgetMasterSelect) {
      // Se non c'è il select ma ci sono i campi del nuovo budget, assicurati che siano visibili e required
      newBudgetFields.classList.remove('hidden');
      newBudgetFields.querySelectorAll('input').forEach((input) => (input.required = true));
    }
  }, 200);

  elements.modal.classList.remove('hidden');
}

export function closeModal() {
  elements.modal.classList.add('hidden');
  state.editingId = null;
}
