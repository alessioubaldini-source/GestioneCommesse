'use strict';

import * as data from './data.js';
import { state } from './state.js';
import { elements } from './dom.js';
import * as utils from './utils.js';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function update() {
  updateKPI();
  updateTables();
  updateCharts();
  updateCommessaSelect();
  updateCommessaHeader();
  updateFilterOptions();
  updateButtonStates();
  updateCommesseMonitorate();
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

function createEmptyStateHTML(message, buttonText, modalType) {
  return `
    <tr>
      <td colspan="14" class="p-6">
        <div class="empty-state-container">
          <svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <p class="text-gray-500 mb-4">${message}</p>
          <button data-modal-type="${modalType}" class="btn-primary bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto">
            ${buttonText}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </td>
    </tr>`;
}

export function updateCommesseMonitorate() {
  const listContainer = document.getElementById('commesse-monitorate-list');
  const commesseDaMonitorare = [];

  const filteredCommesse = utils.getFilteredCommesse();

  filteredCommesse.forEach((commessa) => {
    const margineReale = utils.calcolaMarginRealeCommessa(commessa.id);
    if (margineReale < 35) {
      commesseDaMonitorare.push({ ...commessa, margine: margineReale });
    }
  });

  // Sort by margin, lowest first
  commesseDaMonitorare.sort((a, b) => a.margine - b.margine);

  if (commesseDaMonitorare.length === 0) {
    listContainer.innerHTML = `
          <div class="text-center py-4 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 mx-auto text-green-500 mb-2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Ottimo! Nessuna commessa con margine sotto la soglia di attenzione.</p>
          </div>`;
    return;
  }

  listContainer.innerHTML = commesseDaMonitorare
    .map((commessa) => {
      const isCritical = commessa.margine < 30;
      const bgColor = isCritical ? 'bg-red-50' : 'bg-yellow-50';
      const borderColor = isCritical ? 'border-red-400' : 'border-yellow-400';
      const textColor = isCritical ? 'text-red-800' : 'text-yellow-800';
      const label = isCritical ? 'Critico' : 'Attenzione';

      return `
          <div class="p-3 rounded-lg ${bgColor} border-l-4 ${borderColor} flex justify-between items-center">
              <div>
                  <button class="text-blue-600 hover:underline font-semibold commessa-link-btn text-left" data-commessa-id="${commessa.id}">${commessa.nome}</button>
                  <p class="text-xs text-gray-600">${commessa.cliente}</p>
              </div>
              <div class="text-right">
                  <p class="font-bold text-lg ${textColor}">${commessa.margine.toFixed(1)}%</p>
                  <p class="text-xs ${textColor}">${label}</p>
              </div>
          </div>
      `;
    })
    .join('');
}

export function applyFilters() {
  updateKPI();
  updateTables();
  updateCharts();
  data.saveData(); // Save filters state on change
}

export function filterCommesseTable(searchTerm) {
  const rows = elements.commesseTable.querySelectorAll('tr');
  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    const shouldShow = text.includes(searchTerm.toLowerCase());
    row.style.display = shouldShow ? '' : 'none';
  });
}

export function sortCommesseTable(sortBy) {
  const commesse = [...state.dati.commesse];

  commesse.sort((a, b) => {
    switch (sortBy) {
      case 'nome':
        return a.nome.localeCompare(b.nome);
      case 'cliente':
        return a.cliente.localeCompare(b.cliente);
      case 'ricavi':
        return utils.calcolaMontanteFatture(b.id) - utils.calcolaMontanteFatture(a.id);
      case 'margine':
        return utils.calcolaMarginRealeCommessa(b.id) - utils.calcolaMarginRealeCommessa(a.id);
      case 'data':
        return new Date(a.dataInizio) - new Date(b.dataInizio);
      default:
        return 0;
    }
  });

  state.dati.commesse = commesse;
  updateTables();
}

export function updateFilterOptions() {
  // Update client filter
  const clients = [...new Set(state.dati.commesse.map((c) => c.cliente))];
  elements.clientFilter.innerHTML = '<option value="all">Tutti i clienti</option>' + clients.map((client) => `<option value="${client}">${client}</option>`).join('');

  // Restore filter values from state
  elements.periodFilter.value = state.filters.period;
  elements.clientFilter.value = state.filters.client;
  elements.statusFilter.value = state.filters.status;
  elements.globalSearch.value = state.filters.search;
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
        const budgetMasters = utils.getBudgetMasterData(state.selectedCommessa);
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

function animateCountUp(element, endValue, isCurrency = true) {
  const startValue = parseFloat(element.dataset.value || '0');
  if (startValue === endValue) return;

  element.dataset.value = endValue;
  const duration = 1000;
  let startTime = null;

  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const currentValue = startValue + (endValue - startValue) * progress;
    element.textContent = isCurrency ? utils.formatCurrency(currentValue) : Math.floor(currentValue).toString();
    if (progress < 1) requestAnimationFrame(animation);
  }
  requestAnimationFrame(animation);
}

export function updateKPI() {
  const filteredCommesse = utils.getFilteredCommesse();
  const filteredCommesseIds = new Set(filteredCommesse.map((c) => c.id));

  // Calcola i ricavi totali basandosi sulle fatture emesse per le commesse filtrate (non sul budget).
  // Questo rende il KPI coerente con i "Costi Totali" che sono basati su dati consuntivi.
  const totalRicavi = state.dati.fatture.filter((f) => filteredCommesseIds.has(f.commessaId)).reduce((acc, f) => acc + f.importo, 0);

  // Calcola i costi totali basandosi sui consuntivi per le commesse filtrate.
  const totalCosti = state.dati.margini.filter((m) => filteredCommesseIds.has(m.commessaId)).reduce((acc, m) => acc + m.costoConsuntivi, 0);

  const margineAssoluto = totalRicavi - totalCosti;
  const marginePerc = totalRicavi > 0 ? (margineAssoluto / totalRicavi) * 100 : 0;

  const commesseAttive = filteredCommesse.filter((c) => c.stato === 'Attivo').length;

  // Calcolo fatturato mensile corrente per le commesse filtrate
  const currentMonth = new Date().toISOString().slice(0, 7);
  const fatturatoMensile = state.dati.fatture.filter((f) => f.meseCompetenza === currentMonth && filteredCommesseIds.has(f.commessaId)).reduce((sum, f) => sum + f.importo, 0);

  animateCountUp(elements.totalRicavi, totalRicavi);
  animateCountUp(elements.totalCosti, totalCosti);
  elements.margineMedio.textContent = marginePerc.toFixed(1) + '%';
  animateCountUp(elements.commesseAttive, commesseAttive, false);
  elements.fatturatoMensile.textContent = `Fatturato mese: ${utils.formatCurrency(fatturatoMensile)}`;

  // Update KPI card style based on margin
  const margineCard = document.getElementById('margine-kpi-card');
  margineCard.classList.remove('margin-ok', 'margin-warning', 'margin-critical'); // Rimuove le classi dinamiche del bordo per un colore più neutro
  if (marginePerc >= 35) {
    elements.margineTrend.textContent = '✅ Sopra soglia';
  } else if (marginePerc >= 20) {
    elements.margineTrend.textContent = '⚠️ Sotto soglia';
  } else {
    elements.margineTrend.textContent = '🚨 Critico';
  }

  // Trend indicators (simplified)
  elements.ricaviTrend.textContent = '↗️ +5.2% vs mese precedente';
  elements.costiTrend.textContent = '↘️ -2.1% vs mese precedente';
  elements.margineTrend.textContent = marginePerc >= 35 ? '✅ Sopra soglia' : '⚠️ Sotto soglia';
}

export function updateCommessaHeader() {
  if (!state.selectedCommessa) {
    elements.selectedCliente.textContent = '-';
    elements.selectedStato.textContent = '-';
    elements.selectedBudget.textContent = '€0';
    elements.selectedMargine.textContent = '0%';
    return;
  }

  const commessa = state.dati.commesse.find((c) => c.id === state.selectedCommessa);
  if (!commessa) return;

  // Correzione: Calcolo i ricavi basandomi sulle fatture reali invece che sul budget totale per questo header.
  // Questo rende i KPI (Ricavi e Margine) in questa sezione coerenti tra loro.
  const ricaviReali = utils.calcolaMontanteFatture(commessa.id);
  const costiReali = state.dati.margini.filter((m) => m.commessaId === commessa.id).reduce((sum, m) => sum + m.costoConsuntivi, 0);
  const margineReale = ricaviReali > 0 ? ((ricaviReali - costiReali) / ricaviReali) * 100 : 0;

  elements.selectedCliente.textContent = commessa.cliente;
  elements.selectedStato.innerHTML = `<span class="inline-block px-2 py-1 text-xs rounded-full ${
    commessa.stato === 'Attivo' ? 'bg-green-100 text-green-800' : commessa.stato === 'Completato' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
  }">${commessa.stato}</span>`;
  elements.selectedBudget.textContent = utils.formatCurrency(ricaviReali);
  elements.selectedMargine.textContent = margineReale.toFixed(1) + '%';

  // Dynamic color for margin in header
  const margineElement = elements.selectedMargine;
  margineElement.classList.remove('text-green-300', 'text-blue-300', 'text-yellow-300', 'text-red-300');
  if (margineReale > 45) {
    margineElement.classList.add('text-green-300'); // Eccellente
  } else if (margineReale >= 35) {
    margineElement.classList.add('text-blue-300'); // Buono
  } else if (margineReale >= 30) {
    margineElement.classList.add('text-yellow-300'); // Attenzione
  } else {
    margineElement.classList.add('text-red-300'); // Critico
  }
}

export function updateTables() {
  const pagination = state.pagination.commesse;
  const filteredCommesse = utils.getFilteredCommesse();

  // Pagination logic
  pagination.totalPages = Math.ceil(filteredCommesse.length / pagination.itemsPerPage);
  if (pagination.currentPage > pagination.totalPages) {
    pagination.currentPage = pagination.totalPages || 1;
  }
  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
  const endIndex = startIndex + pagination.itemsPerPage;
  const paginatedCommesse = filteredCommesse.slice(startIndex, endIndex);

  if (filteredCommesse.length === 0) {
    elements.commesseTable.innerHTML = createEmptyStateHTML('Nessuna commessa trovata.', 'Crea Nuova Commessa', 'commessa');
  } else {
    elements.commesseTable.innerHTML = paginatedCommesse
      .map((commessa) => {
        const ricaviReali = utils.calcolaMontanteFatture(commessa.id);
        const margineReale = utils.calcolaMarginRealeCommessa(commessa.id);
        const margineClass = margineReale < 35 ? 'text-red-600 font-bold alert-warning' : 'text-green-600';

        return `
              <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm font-medium">
                    <button class="text-blue-600 hover:underline font-semibold commessa-link-btn text-left" data-commessa-id="${commessa.id}">${commessa.nome}</button>
                  </td>
                  <td class="px-4 py-3 text-sm">${commessa.cliente}</td>
                  <td class="px-4 py-3 text-sm">${new Date(commessa.dataInizio).toLocaleDateString()}</td>
                  <td class="px-4 py-3 text-sm"><span class="inline-block px-2 py-1 text-xs rounded-full ${
                    commessa.stato === 'Attivo' ? 'bg-green-100 text-green-800' : commessa.stato === 'Completato' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                  }">${commessa.stato}</span></td>
                  <td class="px-4 py-3 text-sm text-right">${utils.formatCurrency(ricaviReali)}</td>
                  <td class="px-4 py-3 text-sm text-right ${margineClass}">${margineReale.toFixed(1)}%</td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button data-action="edit" data-id="${commessa.id}" class="text-blue-600 hover:text-blue-800" title="Modifica">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                      </button>
                      <button data-action="delete" data-id="${commessa.id}" class="text-red-600 hover:text-red-800" title="Elimina">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    </div>
                  </td>
              </tr>`;
      })
      .join('');
  }

  renderPaginationControls('commesse', pagination.totalPages);
  updateCommessaSpecificTables();
}

function renderPaginationControls(type, totalPages) {
  const paginationContainer = document.getElementById(`${type}-pagination`);
  if (!paginationContainer) return;

  const currentPage = state.pagination[type].currentPage;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let html = `<button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Precedente</button>`;
  html += `<span class="px-4 py-2 text-sm text-gray-700">Pagina ${currentPage} di ${totalPages}</span>`;
  html += `<button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Successiva</button>`;

  paginationContainer.innerHTML = html;
}

function renderBudgetTable(commessaId) {
  const budgetMasterData = utils.getBudgetMasterData(commessaId);
  let budgetHTML = '';

  if (budgetMasterData.length === 0) {
    budgetHTML = createEmptyStateHTML('Nessun budget definito per questa commessa.', 'Aggiungi Budget', 'budget');
  } else {
    budgetMasterData.forEach((master) => {
      budgetHTML += `
              <tr class="bg-blue-50 border-b-2 border-blue-200">
                <td colspan="7" class="px-4 py-3">
                  <div class="flex justify-between items-center">
                    <div class="flex gap-4">
                      <span class="font-bold text-blue-900">Budget: ${master.budgetId}</span>
                      <span class="text-blue-700">Mese: ${master.meseCompetenza}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-blue-900">Totale: ${utils.formatCurrency(master.totale)}</span>
                      <button data-action="duplicate" data-id="${master.id}" class="text-green-600 hover:text-green-800 bg-green-100 px-2 py-1 rounded text-xs flex items-center gap-1" title="Duplica Budget">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                        Duplica
                      </button>
                      <button data-action="delete" data-id="${master.id}" data-type="budgetMaster" class="text-red-600 hover:text-red-800 bg-red-100 px-2 py-1 rounded text-xs flex items-center gap-1" title="Elimina Intero Budget">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Elimina
                      </button>
                    </div>
                  </div>
                </td>
              </tr>`;

      master.items.forEach((item) => {
        budgetHTML += `
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm pl-8">-</td>
                  <td class="px-4 py-3 text-sm">-</td>
                  <td class="px-4 py-3 text-sm font-medium">${item.figura}</td>
                  <td class="px-4 py-3 text-sm text-right">${utils.formatCurrency(item.tariffa)}</td>
                  <td class="px-4 py-3 text-sm text-right">${item.giorni}</td>
                  <td class="px-4 py-3 text-sm text-right font-medium">${utils.formatCurrency(item.tariffa * item.giorni)}</td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button data-action="edit" data-id="${item.id}" class="text-blue-600 hover:text-blue-800" title="Modifica Riga">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                      </button>
                      <button data-action="delete" data-id="${item.id}" class="text-red-600 hover:text-red-800" title="Elimina Riga">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>`;
      });
    });
  }

  elements.budgetTable.innerHTML = budgetHTML;
}

function renderOrdiniTable(commessaId) {
  const ordiniCommessa = state.dati.ordini.filter((o) => o.commessaId === commessaId);
  if (ordiniCommessa.length > 0) {
    elements.ordiniTable.innerHTML = ordiniCommessa
      .map(
        (ordine) => `
              <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm font-medium">${ordine.numeroOrdine}</td>
                  <td class="px-4 py-3 text-sm">${new Date(ordine.data).toLocaleDateString()}</td>
                  <td class="px-4 py-3 text-sm text-right">${utils.formatCurrency(ordine.importo)}</td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button data-action="edit" data-id="${ordine.id}" class="text-blue-600 hover:text-blue-800" title="Modifica">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                      </button>
                      <button data-action="delete" data-id="${ordine.id}" class="text-red-600 hover:text-red-800" title="Elimina">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    </div>
                  </td>
              </tr>`
      )
      .join('');
  } else {
    elements.ordiniTable.innerHTML = createEmptyStateHTML('Nessun ordine per questa commessa.', 'Aggiungi Ordine', 'ordine');
  }
  elements.ordiniTotal.textContent = utils.formatCurrency(utils.calcolaTotaleOrdini(commessaId));
}

function renderFattureTable(commessaId) {
  const fattureCommessa = state.dati.fatture.filter((f) => f.commessaId === commessaId);
  if (fattureCommessa.length > 0) {
    elements.fattureTable.innerHTML = fattureCommessa
      .map(
        (fattura) => `
              <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm">${fattura.meseCompetenza}</td>
                  <td class="px-4 py-3 text-sm">${new Date(fattura.dataInvioConsuntivo).toLocaleDateString()}</td>
                  <td class="px-4 py-3 text-sm text-right">${utils.formatCurrency(fattura.importo)}</td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button data-action="edit" data-id="${fattura.id}" class="text-blue-600 hover:text-blue-800" title="Modifica">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                      </button>
                      <button data-action="delete" data-id="${fattura.id}" class="text-red-600 hover:text-red-800" title="Elimina">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    </div>
                  </td>
              </tr>`
      )
      .join('');
  } else {
    elements.fattureTable.innerHTML = createEmptyStateHTML('Nessuna fattura per questa commessa.', 'Aggiungi Fattura', 'fattura');
  }
  const montante = utils.calcolaMontanteFatture(commessaId);
  const totaleOrdini = utils.calcolaTotaleOrdini(commessaId);
  const residuo = totaleOrdini - montante;
  elements.montanteFatture.textContent = utils.formatCurrency(montante);
  elements.totaleOrdiniFatture.textContent = utils.formatCurrency(totaleOrdini);
  elements.residuoFatture.textContent = utils.formatCurrency(residuo);
  elements.residuoFatture.className = `font-bold ml-2 ${residuo >= 0 ? 'text-green-600' : 'text-red-600'}`;
}

function renderMarginiTable(commessaId) {
  const marginiCommessa = state.dati.margini.filter((m) => m.commessaId === commessaId);
  if (marginiCommessa.length > 0) {
    elements.marginiTable.innerHTML = marginiCommessa
      .map((margine) => {
        const ricavoConsuntivo = utils.calcolaMontanteFatture(commessaId);
        const costoMedioHH = margine.hhConsuntivo > 0 ? margine.costoConsuntivi / margine.hhConsuntivo : 0;
        const marginePerc = ricavoConsuntivo > 0 ? ((ricavoConsuntivo - margine.costoConsuntivi) / ricavoConsuntivo) * 100 : 0;

        const ricavoBudgetTotale = utils.calcolaTotaleBudgetRecent(commessaId);
        const costoBudgetTotaleEAC = ricavoBudgetTotale * (1 - marginePerc / 100);
        const costoStimaAFinireETC = costoBudgetTotaleEAC - margine.costoConsuntivi;
        const oreStimaAFinireETC = costoMedioHH > 0 ? costoStimaAFinireETC / costoMedioHH : 0;
        const percentualeAvanzamentoCosti = costoBudgetTotaleEAC > 0 ? (margine.costoConsuntivi / costoBudgetTotaleEAC) * 100 : 0;
        const ricavoMaturato = ricavoBudgetTotale * (percentualeAvanzamentoCosti / 100);
        const etcRevenue = ricavoBudgetTotale - ricavoMaturato;

        return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-2 py-3 font-medium text-xs">${margine.mese}</td>
                        <td class="px-2 py-3 text-center text-blue-600 font-medium text-xs">${utils.formatCurrency(margine.costoConsuntivi)}</td>
                        <td class="px-2 py-3 text-center text-blue-600 font-medium text-xs">${margine.hhConsuntivo}</td>
                        <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(costoMedioHH)}</td>
                        <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(ricavoConsuntivo)}</td>
                        <td class="px-2 py-3 text-center text-xs">${marginePerc.toFixed(1)}%</td>
                        <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(ricavoBudgetTotale)}</td>
                        <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(costoBudgetTotaleEAC)}</td>
                        <td class="px-2 py-3 text-center text-xs bg-green-100 text-green-800 font-medium">${utils.formatCurrency(costoStimaAFinireETC)}</td>
                        <td class="px-2 py-3 text-center text-xs bg-green-100 text-green-800 font-medium">${oreStimaAFinireETC.toFixed(0)}</td>
                        <td class="px-2 py-3 text-center text-xs">${percentualeAvanzamentoCosti.toFixed(1)}%</td>
                        <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(ricavoMaturato)}</td>
                        <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(etcRevenue)}</td>
                        <td class="px-2 py-3 text-center">
                          <div class="flex items-center justify-center gap-1">
                            <button data-action="edit" data-id="${margine.id}" class="text-blue-600 hover:text-blue-800" title="Modifica">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                            </button>
                            <button data-action="delete" data-id="${margine.id}" class="text-red-600 hover:text-red-800" title="Elimina">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                            </button>
                          </div>
                        </td>
                    </tr>`;
      })
      .join('');
  } else {
    elements.marginiTable.innerHTML = createEmptyStateHTML('Nessun dato di margine per questa commessa.', 'Aggiungi Forecast', 'margine');
  }
}

export function updateCommessaSpecificTables() {
  const commessaId = state.selectedCommessa;

  if (state.dati.commesse.length === 0) {
    // Clear all tables if there are no commesse
    elements.budgetTable.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">Nessuna commessa disponibile.</td></tr>';
    elements.ordiniTable.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">Nessuna commessa disponibile.</td></tr>';
    elements.fattureTable.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">Nessuna commessa disponibile.</td></tr>';
    elements.marginiTable.innerHTML = '<tr><td colspan="14" class="text-center py-4 text-gray-500">Nessuna commessa disponibile.</td></tr>';
    return;
  }

  const commessaExists = state.dati.commesse.some((c) => c.id === commessaId);
  if (!commessaExists) {
    state.selectedCommessa = state.dati.commesse[0].id;
    return updateCommessaSpecificTables();
  }

  if (commessaId === null) return;

  // Render all tables for the selected commessa
  renderBudgetTable(commessaId);
  renderOrdiniTable(commessaId);
  renderFattureTable(commessaId);
  renderMarginiTable(commessaId);
}

export function updateCommessaSelect() {
  const select = elements.commessaSelect;

  if (state.dati.commesse.length === 0) {
    select.innerHTML = '<option value="">Nessuna commessa disponibile</option>';
    state.selectedCommessa = null;
    return;
  }

  const commessaExists = state.dati.commesse.some((c) => c.id === state.selectedCommessa);
  if (!commessaExists) {
    state.selectedCommessa = state.dati.commesse[0].id;
  }

  select.innerHTML = state.dati.commesse.map((c) => `<option value="${c.id}" ${c.id === state.selectedCommessa ? 'selected' : ''}>${c.nome} - ${c.cliente}</option>`).join('');

  select.value = state.selectedCommessa;
}

export function updateButtonStates() {
  elements.gestioneTab.disabled = false;

  const isCommessaSelected = state.selectedCommessa !== null;
  document.querySelectorAll('[data-modal-type]').forEach((btn) => {
    if (btn.dataset.modalType !== 'commessa') {
      btn.disabled = !isCommessaSelected;
    }
  });
}

export function updateCharts() {
  const filteredCommesse = utils.getFilteredCommesse();

  // Define a consistent and accessible color palette from CSS variables
  const colors = {
    primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
    success: getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim(),
    warning: getComputedStyle(document.documentElement).getPropertyValue('--color-warning').trim(),
    danger: getComputedStyle(document.documentElement).getPropertyValue('--color-danger').trim(),
    secondary: getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim(),
  };

  const gridColor = 'rgba(0, 0, 0, 0.1)';
  const labelColor = '#334155';
  const legendColor = '#475569';

  Chart.defaults.color = labelColor;

  // Trend Chart
  const monthlyData = utils.getMonthlyTrendData(filteredCommesse);
  const ctx1 = elements.trendChartCanvas.getContext('2d');
  if (state.charts.trendChart) state.charts.trendChart.destroy();
  state.charts.trendChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: monthlyData.labels,
      datasets: [
        {
          label: 'Ricavi',
          data: monthlyData.ricavi,
          borderColor: colors.primary,
          backgroundColor: hexToRgba(colors.primary, 0.1),
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Costi',
          data: monthlyData.costi,
          borderColor: colors.warning,
          backgroundColor: hexToRgba(colors.warning, 0.1),
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: legendColor,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.dataset.label + ': ' + utils.formatCurrency(context.raw);
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: labelColor,
            callback: function (value) {
              return utils.formatCurrency(value);
            },
          },
          grid: {
            color: gridColor,
          },
        },
        x: {
          ticks: { color: labelColor },
          grid: { color: gridColor },
        },
      },
    },
  });

  // Budget vs Consuntivo Chart
  const budgetConsuntivoData = utils.getBudgetVsConsuntivoData(filteredCommesse);
  const ctx2 = elements.budgetVsConsuntivoChartCanvas.getContext('2d');
  if (state.charts.budgetVsConsuntivoChart) state.charts.budgetVsConsuntivoChart.destroy();
  state.charts.budgetVsConsuntivoChart = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: budgetConsuntivoData.labels,
      datasets: [
        {
          label: 'Budget',
          data: budgetConsuntivoData.budget,
          backgroundColor: hexToRgba(colors.secondary, 0.7),
          borderColor: colors.secondary,
          borderWidth: 1,
        },
        {
          label: 'Consuntivo',
          data: budgetConsuntivoData.consuntivo,
          backgroundColor: hexToRgba(colors.primary, 0.7),
          borderColor: colors.primary,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: legendColor,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.dataset.label + ': ' + utils.formatCurrency(context.raw);
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: labelColor,
            callback: function (value) {
              return utils.formatCurrency(value);
            },
          },
          grid: {
            color: gridColor,
          },
        },
        x: {
          ticks: { color: labelColor },
          grid: { color: gridColor },
        },
      },
    },
  });

  // Client Chart
  const clientRevenueMap = new Map();
  filteredCommesse.forEach((commessa) => {
    // Usa il montante delle fatture per i ricavi reali per cliente, come richiesto.
    const revenue = utils.calcolaMontanteFatture(commessa.id);
    const currentRevenue = clientRevenueMap.get(commessa.cliente) || 0;
    clientRevenueMap.set(commessa.cliente, currentRevenue + revenue);
  });

  const clientData = Array.from(clientRevenueMap, ([label, value]) => ({ label, value })).filter((d) => d.value > 0); // Filtra clienti con ricavi > 0

  if (clientData.length === 0) {
    clientData.push({ label: 'Nessun dato', value: 1 });
  }

  const ctx3 = elements.clientChartCanvas.getContext('2d');
  if (state.charts.clientChart) state.charts.clientChart.destroy();
  state.charts.clientChart = new Chart(ctx3, {
    type: 'doughnut',
    data: {
      labels: clientData.map((d) => d.label),
      datasets: [
        {
          data: clientData.map((d) => d.value),
          backgroundColor: [
            colors.primary, // blue-500
            '#14b8a6', // teal-500
            colors.secondary, // slate-500
            '#4f46e5', // indigo-600
            '#0891b2', // cyan-600
            '#a1a1aa', // zinc-400
          ],
          borderColor: '#fff',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: legendColor,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              if (context.label === 'Nessun dato') return 'Nessun dato disponibile';
              return context.label + ': ' + utils.formatCurrency(context.raw);
            },
          },
        },
      },
    },
  });

  // Margini Chart
  const marginiData = utils.getMarginiDistributionData(filteredCommesse);
  const ctx4 = elements.marginiChartCanvas.getContext('2d');
  if (state.charts.marginiChart) state.charts.marginiChart.destroy();
  state.charts.marginiChart = new Chart(ctx4, {
    type: 'bar',
    data: {
      labels: marginiData.labels,
      datasets: [
        {
          label: 'Numero Commesse',
          data: marginiData.values,
          backgroundColor: function (context) {
            const label = marginiData.labels[context.dataIndex];
            if (label.includes('Critico')) return colors.danger;
            if (label.includes('Attenzione')) return colors.warning;
            if (label.includes('Buono')) return colors.primary;
            if (label.includes('Eccellente')) return colors.success;
            return colors.secondary; // Fallback
          },
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: labelColor,
            stepSize: 1,
          },
          grid: {
            color: gridColor,
          },
        },
        x: {
          ticks: { color: labelColor },
          grid: { color: gridColor },
        },
      },
    },
  });
}
