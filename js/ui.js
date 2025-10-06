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
  components.updateCurrentActivityPhase();
  components.updateCommesseMonitorate();
}

export function switchTab(tabName) {
  const activeTabId = tabName + '-content';
  const allTabs = document.querySelectorAll('.tab-content');
  let currentlyVisibleTab = null;

  allTabs.forEach((tab) => {
    if (!tab.classList.contains('hidden')) {
      currentlyVisibleTab = tab;
    }
  });

  const newTab = document.getElementById(activeTabId);

  // Do nothing if we are already on the correct tab
  if (currentlyVisibleTab && currentlyVisibleTab.id === activeTabId) {
    return;
  }

  const showNewTab = () => {
    newTab.classList.remove('hidden');
    newTab.classList.add('fade-in');
  };

  // If there is a visible tab, fade it out first
  if (currentlyVisibleTab) {
    currentlyVisibleTab.classList.add('fade-out');
    currentlyVisibleTab.addEventListener(
      'animationend',
      () => {
        currentlyVisibleTab.classList.add('hidden');
        currentlyVisibleTab.classList.remove('fade-out');
        showNewTab();
      },
      { once: true }
    );
  } else {
    // If no tab is visible, just fade in the new one
    showNewTab();
  }

  // Style the tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('border-blue-500', 'text-blue-600');
    btn.classList.add('border-transparent', 'text-gray-500');
  });
  document.getElementById('tab-' + tabName).classList.add('border-blue-500', 'text-blue-600');
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
  components.updateFilterOptions();
  components.updateKPI();
  tables.updateTables();
  charts.updateCharts();
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

  // Imposta la larghezza del modale
  const modalContent = elements.modal.querySelector('div');
  modalContent.classList.remove('max-w-md', 'max-w-3xl');
  if (type === 'configureRules' || type === 'settings') {
    modalContent.classList.add('max-w-3xl');
  } else {
    modalContent.classList.add('max-w-md');
  }

  // Get previous month for pre-filling date fields
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const prevMonthYYYYMM = now.toISOString().slice(0, 7);

  switch (type) {
    case 'configureRules':
      titleText = 'Configura Regole Calendario';
      const rules = state.dati.activityRules || [];

      const rulesHTML = rules.map((rule) => createRuleRowHTML(rule)).join('');

      fieldsHTML = `
        <div id="rules-container">
            <div class="rule-row mb-2 text-xs font-medium text-gray-500 px-1">
                <span>Dal Giorno</span><span>Al Giorno</span><span>Descrizione</span><span>Colore</span>
            </div>
            ${rulesHTML}
        </div>
        <button type="button" id="add-rule-btn" class="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium">+ Aggiungi Regola</button>`;
      break;
    case 'settings':
      titleText = 'Impostazioni Applicazione';
      const { sogliaMargineAttenzione, sogliaMargineCritico, defaultFilters } = state.config;

      const clientOptions = state.dati.commesse
        .map((c) => c.cliente)
        .filter((value, index, self) => self.indexOf(value) === index) // unique
        .map((client) => `<option value="${client}" ${defaultFilters.client === client ? 'selected' : ''}>${client}</option>`)
        .join('');

      fieldsHTML = `
        <h4 class="text-md font-semibold text-gray-800 border-b pb-2 mb-4">Soglie di Allarme Margine</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Soglia Attenzione (%)</label>
            <input type="number" name="sogliaMargineAttenzione" class="w-full border rounded-lg px-3 py-2" value="${sogliaMargineAttenzione}" required>
            <p class="text-xs text-gray-500 mt-1">Sotto questa soglia, il margine è considerato "da attenzionare".</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Soglia Critica (%)</label>
            <input type="number" name="sogliaMargineCritico" class="w-full border rounded-lg px-3 py-2" value="${sogliaMargineCritico}" required>
            <p class="text-xs text-gray-500 mt-1">Sotto questa soglia, il margine è "critico".</p>
          </div>
        </div>

        <h4 class="text-md font-semibold text-gray-800 border-b pb-2 mb-4">Filtri di Default</h4>
        <p class="text-sm text-gray-600 mb-4">Imposta i filtri predefiniti che verranno applicati all'avvio e al reset.</p>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
            <select name="defaultPeriod" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="all" ${defaultFilters.period === 'all' ? 'selected' : ''}>Tutti i periodi</option><option value="current-month" ${
        defaultFilters.period === 'current-month' ? 'selected' : ''
      }>Mese corrente</option><option value="current-quarter" ${defaultFilters.period === 'current-quarter' ? 'selected' : ''}>Trimestre corrente</option><option value="current-year" ${
        defaultFilters.period === 'current-year' ? 'selected' : ''
      }>Anno corrente</option><option value="last-3-months" ${defaultFilters.period === 'last-3-months' ? 'selected' : ''}>Ultimi 3 mesi</option></select>
          </div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Cliente</label><select name="defaultClient" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="all" ${
            defaultFilters.client === 'all' ? 'selected' : ''
          }>Tutti i clienti</option>${clientOptions}</select></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Stato</label><select name="defaultStatus" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="all" ${
            defaultFilters.status === 'all' ? 'selected' : ''
          }>Tutti gli stati</option><option value="Attivo" ${defaultFilters.status === 'Attivo' ? 'selected' : ''}>Attivo</option><option value="Pianificazione" ${
        defaultFilters.status === 'Pianificazione' ? 'selected' : ''
      }>Pianificazione</option><option value="Completato" ${defaultFilters.status === 'Completato' ? 'selected' : ''}>Completato</option><option value="Sospeso" ${defaultFilters.status === 'Sospeso' ? 'selected' : ''}>Sospeso</option></select></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Tipologia</label><select name="defaultTipologia" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="all" ${
            defaultFilters.tipologia === 'all' ? 'selected' : ''
          }>Tutte le tipologie</option><option value="T&M" ${defaultFilters.tipologia === 'T&M' ? 'selected' : ''}>T&M</option><option value="Corpo" ${defaultFilters.tipologia === 'Corpo' ? 'selected' : ''}>Corpo</option><option value="Canone" ${
        defaultFilters.tipologia === 'Canone' ? 'selected' : ''
      }>Canone</option></select></div>
        </div>`;
      break;
  }

  switch (type) {
    case 'commessa':
      titleText = id ? 'Modifica Commessa' : 'Nuova Commessa';
      fieldsHTML = `
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome Commessa</label><input type="text" name="nome" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cliente</label><input type="text" name="cliente" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data Inizio</label>
                  <input type="date" name="dataInizio" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipologia</label>
                  <select name="tipologia" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required>
                    <option value="T&M">T&M</option>
                    <option value="Corpo">Corpo</option>
                    <option value="Canone">Canone</option>
                  </select>
                </div>
              </div>
              <div class="mt-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stato</label><select name="stato" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required><option value="">Seleziona stato</option><option value="Pianificazione">Pianificazione</option><option value="Attivo">Attivo</option><option value="Completato">Completato</option><option value="Sospeso">Sospeso</option></select></div>`;
      break;
    case 'budget':
      titleText = id ? 'Modifica Budget Detail' : 'Nuovo Budget';
      if (!id) {
        const budgetMasters = calcService.getBudgetMasterData(state.selectedCommessa);
        let masterOptions = '<option value="new">+ Crea Nuovo Budget</option>';
        budgetMasters.forEach((master) => {
          if (master.type !== 'total') {
            masterOptions += `<option value="${master.id}">${master.budgetId} - ${master.meseCompetenza}</option>`;
          }
        });

        fieldsHTML = `
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo di Inserimento</label>
                  <div class="flex gap-4">
                      <label class="flex items-center"><input type="radio" name="budgetType" value="detail" class="mr-2" checked> Dettagliato</label>
                      <label class="flex items-center"><input type="radio" name="budgetType" value="total" class="mr-2"> Importo Totale</label>
                  </div>
                </div>

                <div id="new-budget-fields" class="hidden">
                  <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ID Nuovo Budget</label><input type="text" name="budgetId" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"></div>
                  <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mese Competenza</label><input type="month" name="meseCompetenza" value="${prevMonthYYYYMM}" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"></div>
                </div>

                <div id="budget-master-container">
                    <div class="mb-4">
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Budget Esistente (per dettagli)</label>
                      <select id="budget-master-select" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required>
                        ${masterOptions}
                      </select>
                    </div>
                </div>

                <div id="budget-detail-fields">
                    <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Figura</label><select name="figura" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required><option value="">Seleziona figura</option><option value="Senior Manager">Senior Manager</option><option value="Project Manager">Project Manager</option><option value="Software Engineer">Software Engineer</option><option value="Junior Developer">Junior Developer</option></select></div>
                    <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tariffa €</label><input type="number" step="0.01" name="tariffa" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
                    <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Giorni</label><input type="number" step="0.01" name="giorni" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
                </div>

                <div id="budget-total-field" class="hidden">
                    <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Importo Totale Budget €</label><input type="number" step="0.01" name="importo" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"></div>
                </div>`;
      } else {
        // Editing a budget detail line. Editing a total-based budget master is not yet supported through this modal.
        fieldsHTML = `
                <div class="mb-4">
                <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Figura</label><select name="figura" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required><option value="">Seleziona figura</option><option value="Senior Manager">Senior Manager</option><option value="Project Manager">Project Manager</option><option value="Software Engineer">Software Engineer</option><option value="Junior Developer">Junior Developer</option></select></div>
                <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tariffa €</label><input type="number" step="0.01" name="tariffa" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
                <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Giorni</label><input type="number" step="0.01" name="giorni" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>`;
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
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mese Competenza</label><input type="month" name="meseCompetenza" value="${prevMonthYYYYMM}" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data Invio Consuntivo</label><input type="date" name="dataInvioConsuntivo" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Importo €</label><input type="number" step="0.01" name="importo" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>`;
      break;
    case 'margine':
      titleText = id ? 'Modifica Forecast' : 'Nuovo Forecast';
      const commessa = state.dati.commesse.find((c) => c.id === state.selectedCommessa);

      if (commessa && commessa.tipologia === 'Corpo') {
        fieldsHTML = `
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mese</label><input type="month" name="mese" value="${prevMonthYYYYMM}" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Costo Cons. Cum. €</label><input type="number" step="0.01" name="costoConsuntivi" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GG da Fare</label><input type="number" step="0.01" name="ggDaFare" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Costo Medio HH €</label><input type="number" step="0.01" name="costoMedioHH" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" placeholder="Default da budget" title="Se lasciato vuoto, verrà usato il costo medio orario del budget."></div>
            `;
      } else {
        // Default for T&M, Canone, etc.
        fieldsHTML = `
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mese</label><input type="month" name="mese" value="${prevMonthYYYYMM}" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Costo Consuntivi Cum. €</label><input type="number" step="0.01" name="costoConsuntivi" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
              <div class="mb-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">HH Consuntivo Cum.</label><input type="number" step="0.01" name="hhConsuntivo" class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" required></div>
            `;
      }
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
  } else if (type === 'margine') {
    // Pre-fill logic for new forecast
    const commessa = state.dati.commesse.find((c) => c.id === state.selectedCommessa);
    if (commessa && commessa.tipologia === 'Corpo') {
      const lastForecast = state.dati.margini.filter((m) => m.commessaId === state.selectedCommessa).sort((a, b) => b.mese.localeCompare(a.mese))[0];

      if (lastForecast) {
        setTimeout(() => {
          const field = elements.modalForm.elements['costoMedioHH'];
          if (field) {
            field.value = lastForecast.costoMedioHH || '';
          }
        }, 100);
      }
    }
  }

  setTimeout(() => {
    const budgetTypeRadios = elements.modalForm.querySelectorAll('input[name="budgetType"]');
    if (budgetTypeRadios.length > 0) {
      const detailFields = document.getElementById('budget-detail-fields');
      const totalField = document.getElementById('budget-total-field');
      const masterContainer = document.getElementById('budget-master-container');
      const newBudgetFields = document.getElementById('new-budget-fields');
      const budgetMasterSelect = document.getElementById('budget-master-select');

      const handleNewBudgetFieldsVisibility = () => {
        const isDetailMode = elements.modalForm.querySelector('input[name="budgetType"]:checked').value === 'detail';
        if (!isDetailMode) {
          // Always show for 'total' mode
          newBudgetFields.classList.remove('hidden');
          newBudgetFields.querySelectorAll('input').forEach((el) => (el.required = true));
          return;
        }
        // In 'detail' mode, visibility depends on dropdown
        const show = budgetMasterSelect.value === 'new';
        newBudgetFields.classList.toggle('hidden', !show);
        newBudgetFields.querySelectorAll('input').forEach((el) => (el.required = show));
      };

      const handleBudgetTypeChange = (type) => {
        const isDetail = type === 'detail';
        detailFields.classList.toggle('hidden', !isDetail);
        totalField.classList.toggle('hidden', isDetail);
        masterContainer.classList.toggle('hidden', !isDetail);

        detailFields.querySelectorAll('input, select').forEach((el) => (el.required = isDetail));
        totalField.querySelector('input').required = !isDetail;

        handleNewBudgetFieldsVisibility();
      };

      budgetTypeRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => handleBudgetTypeChange(e.target.value));
      });

      budgetMasterSelect.addEventListener('change', handleNewBudgetFieldsVisibility);

      // Initial state
      handleBudgetTypeChange('detail');
    }
  }, 200);

  elements.modal.classList.remove('hidden');
}

export function createRuleRowHTML(rule = {}) {
  const colorOptions = calendar.CALENDAR_COLOR_OPTIONS;
  return `
    <div class="rule-row mb-2 items-center">
        <input type="number" name="startDay" class="w-full border rounded-lg px-2 py-1 text-sm" value="${rule.startDay || ''}" min="1" max="31" placeholder="Da" required>
        <input type="number" name="endDay" class="w-full border rounded-lg px-2 py-1 text-sm" value="${rule.endDay || ''}" min="1" max="31" placeholder="A" required>
        <input type="text" name="description" class="w-full border rounded-lg px-2 py-1 text-sm" value="${rule.description || ''}" placeholder="Descrizione attività" required>
        <select name="color" class="w-full border rounded-lg px-2 py-1 text-sm" required>
            ${colorOptions.map((opt) => `<option value="${opt.value}" ${rule.color === opt.value ? 'selected' : ''}>${opt.name}</option>`).join('')}
        </select>
        <button type="button" class="delete-rule-btn text-red-500 hover:text-red-700 p-1 flex justify-center items-center font-bold text-lg">×</button>
    </div>`;
}

export function openChartModal(chartId) {
  const originalChart = state.charts[chartId];
  if (!originalChart) {
    console.error('Chart instance not found:', chartId);
    return;
  }

  // Destroy previous enlarged chart if it exists
  if (state.charts.enlargedChart) {
    state.charts.enlargedChart.destroy();
  }

  const ctx = elements.enlargedChartCanvas.getContext('2d');
  const chartConfig = {
    type: originalChart.config.type,
    data: originalChart.config.data,
    options: {
      ...originalChart.config.options,
      maintainAspectRatio: false, // Important for modal resizing
    },
  };

  state.charts.enlargedChart = new Chart(ctx, chartConfig);

  const title = originalChart.canvas.parentElement.querySelector('h3').textContent;
  elements.chartModalTitle.textContent = title;
  elements.chartModal.classList.remove('hidden');
}

export function closeChartModal() {
  if (state.charts.enlargedChart) {
    state.charts.enlargedChart.destroy();
    state.charts.enlargedChart = null;
  }
  elements.chartModal.classList.add('hidden');
}

export function closeModal() {
  elements.modal.classList.add('hidden');
  state.editingId = null;
}
