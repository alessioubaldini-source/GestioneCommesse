'use strict';

import { showToast } from './notifications.js';
import { state } from './state.js';
import { elements } from './dom.js';
import * as ui from './ui.js';
import * as data from './data.js';
import { exportToExcel } from './services/excelExportService.js';
import * as excelImportService from './services/excelImportService.js';
import { exportCommessaToPdf } from './services/pdfExportService.js';

export function initEventListeners() {
  // Tab navigation
  elements.dashboardTab.addEventListener('click', () => ui.switchTab('dashboard'));
  elements.gestioneTab.addEventListener('click', () => ui.switchTab('gestione'));

  // Sub-tabs
  elements.subTabs.forEach((btn) => {
    btn.addEventListener('click', () => ui.switchSubTab(btn.id.replace('sub-', '')));
  });

  // Filters
  elements.periodFilter.addEventListener('change', (e) => {
    state.pagination.commesse.currentPage = 1;
    state.filters.period = e.target.value;
    ui.applyFilters();
  });

  elements.clientFilter.addEventListener('change', (e) => {
    state.pagination.commesse.currentPage = 1;
    state.filters.client = e.target.value;
    ui.applyFilters();
  });

  elements.statusFilter.addEventListener('change', (e) => {
    state.pagination.commesse.currentPage = 1;
    state.filters.status = e.target.value;
    ui.applyFilters();
  });

  elements.typeFilter.addEventListener('change', (e) => {
    state.pagination.commesse.currentPage = 1;
    state.filters.tipologia = e.target.value;
    ui.applyFilters();
  });

  elements.globalSearch.addEventListener('input', (e) => {
    state.pagination.commesse.currentPage = 1;
    state.filters.search = e.target.value;
    ui.applyFilters();
  });

  elements.commesseSearch.addEventListener('input', (e) => {
    ui.filterCommesseTable(e.target.value);
  });

  elements.sortCommesse.addEventListener('change', (e) => {
    ui.sortCommesseTable(e.target.value);
  });

  elements.resetFilters.addEventListener('click', () => {
    state.pagination.commesse.currentPage = 1;
    // Reset to configured defaults, not hardcoded 'all'
    state.filters.period = state.config.defaultFilters.period;
    state.filters.client = state.config.defaultFilters.client;
    state.filters.status = state.config.defaultFilters.status;
    state.filters.tipologia = state.config.defaultFilters.tipologia;
    state.filters.search = ''; // Search always resets to empty

    ui.applyFilters();
  });

  // Listener per il dropdown del grafico "Ricavi per" per salvare la scelta
  const clientChartGroupBySelect = document.getElementById('client-chart-group-by');
  if (clientChartGroupBySelect) {
    clientChartGroupBySelect.addEventListener('change', (e) => {
      state.config.clientChartGroupBy = e.target.value;
      data.saveConfig();
      ui.updateCharts(); // Aggiorna solo i grafici, non è necessario riapplicare tutti i filtri
    });
  }

  // Export Excel
  elements.exportExcel.addEventListener('click', () => exportToExcel());

  // Import from Excel
  elements.downloadTemplateBtn?.addEventListener('click', () => {
    excelImportService.downloadImportTemplate();
  });
  elements.importCommessaBtn?.addEventListener('click', () => {
    elements.importFileInput.click();
  });
  elements.importFileInput?.addEventListener('change', (e) => {
    excelImportService.importCommessaFromExcel(e.target.files[0]);
    e.target.value = ''; // Reset input to allow re-importing the same file
  });

  // Export PDF
  elements.exportPdfBtn?.addEventListener('click', () => {
    exportCommessaToPdf(state.selectedCommessa);
  });

  // Modal events
  document.body.addEventListener('click', (e) => {
    const modalType = e.target.closest('[data-modal-type]')?.dataset.modalType;
    if (modalType) {
      ui.openModal(modalType);
    }
  });

  // Table events
  elements.commesseTable.addEventListener('click', (e) => {
    const editButton = e.target.closest('button[data-action="edit"]');
    const deleteButton = e.target.closest('button[data-action="delete"]');

    if (editButton) {
      const id = parseInt(editButton.dataset.id, 10);
      ui.openModal('commessa', id);
    }

    if (deleteButton) {
      const id = parseInt(deleteButton.dataset.id, 10);
      if (data.deleteCommessa(id)) {
        ui.update();
      }
    }
  });

  // Listener for delegated clicks within the dashboard content (for commessa links)
  elements.dashboardContent.addEventListener('click', (e) => {
    const linkButton = e.target.closest('.commessa-link-btn');
    if (linkButton) {
      const id = parseInt(linkButton.dataset.commessaId, 10);
      state.selectedCommessa = id;
      ui.switchTab('gestione');
      ui.updateCommessaSelect();
      ui.updateCommessaHeader();
      ui.updateCommessaSpecificTables();
    }
  });

  // Budget table events
  elements.budgetTable.addEventListener('click', (e) => {
    const editButton = e.target.closest('button[data-action="edit"]');
    const deleteButton = e.target.closest('button[data-action="delete"]');
    const duplicateButton = e.target.closest('button[data-action="duplicate"]');

    if (editButton) {
      const id = parseInt(editButton.dataset.id, 10);
      ui.openModal('budget', id);
    }

    if (deleteButton) {
      const id = parseInt(deleteButton.dataset.id, 10);
      const type = deleteButton.dataset.type || 'budget';
      if (data.deleteRecord(type, id)) {
        ui.update();
      }
    }

    if (duplicateButton) {
      const id = parseInt(duplicateButton.dataset.id, 10);
      if (data.duplicateBudget(id)) {
        ui.update();
      }
    }
  });

  // Other table events
  [
    { plural: 'ordini', singular: 'ordine' },
    { plural: 'fatture', singular: 'fattura' },
    { plural: 'margini', singular: 'margine' },
  ].forEach(({ plural, singular }) => {
    const table = elements[plural + 'Table'];
    if (table) {
      table.addEventListener('click', (e) => {
        const editButton = e.target.closest('button[data-action="edit"]');
        const deleteButton = e.target.closest('button[data-action="delete"]');

        if (editButton) {
          const id = parseInt(editButton.dataset.id, 10);
          ui.openModal(singular, id);
        }

        if (deleteButton) {
          const id = parseInt(deleteButton.dataset.id, 10);
          if (data.deleteRecord(plural, id)) {
            ui.update();
          }
        }
      });
    }
  });

  // Commessa selection
  elements.commessaSelect.addEventListener('change', (e) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue)) {
      state.selectedCommessa = newValue;
      ui.updateCommessaSpecificTables();
      ui.updateCommessaHeader();
    }
  });

  // Modal form submission
  elements.modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const dataObject = Object.fromEntries(formData.entries());

    if (state.currentModalType === 'configureRules') {
      const rulesContainer = document.getElementById('rules-container');
      const ruleRows = rulesContainer.querySelectorAll('.rule-row:not(:first-child)'); // Skip header row
      const newRules = Array.from(ruleRows)
        .map((row) => {
          const startDay = parseInt(row.querySelector('[name="startDay"]').value, 10);
          const endDay = parseInt(row.querySelector('[name="endDay"]').value, 10);
          const description = row.querySelector('[name="description"]').value;
          const color = row.querySelector('[name="color"]').value;
          return { startDay, endDay, description, color };
        })
        .filter((rule) => rule.startDay && rule.endDay && rule.description); // Filter out empty/invalid rows

      data.saveActivityRules(newRules);
      showToast('Regole del calendario aggiornate!', 'success');
      ui.closeModal();
      ui.update();
    } else if (state.currentModalType === 'settings') {
      state.config.sogliaMargineAttenzione = parseInt(dataObject.sogliaMargineAttenzione, 10);
      state.config.sogliaMargineCritico = parseInt(dataObject.sogliaMargineCritico, 10);
      state.config.defaultFilters.period = dataObject.defaultPeriod;
      state.config.defaultFilters.client = dataObject.defaultClient;
      state.config.defaultFilters.status = dataObject.defaultStatus;
      state.config.defaultFilters.tipologia = dataObject.defaultTipologia;

      data.saveConfig();
      showToast('Impostazioni salvate con successo!', 'success');
      ui.closeModal();
      ui.update(); // Update UI to reflect new thresholds
    } else {
      const isEditing = state.editingId !== null;

      data.saveForm(dataObject);
      ui.closeModal();
      ui.update();

      const successMessage = isEditing ? 'Modifiche salvate con successo!' : 'Elemento creato con successo!';
      showToast(successMessage, 'success');
    }
  });

  // Modal close events
  elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal || e.target.closest('.close-modal-btn')) {
      ui.closeModal();
    }
  });

  // Listener for dynamic elements inside the modal
  elements.modal.addEventListener('click', (e) => {
    // Add new rule row
    if (e.target.id === 'add-rule-btn') {
      const container = document.getElementById('rules-container');
      const newRow = document.createElement('div');
      newRow.innerHTML = ui.createRuleRowHTML({});
      container.appendChild(newRow.firstElementChild);
    }

    // Delete rule row
    const deleteBtn = e.target.closest('.delete-rule-btn');
    if (deleteBtn) {
      deleteBtn.closest('.rule-row').remove();
    }
  });

  // Chart Modal close events
  elements.chartModal.addEventListener('click', (e) => {
    if (e.target === elements.chartModal || e.target.closest('#close-chart-modal-btn')) {
      ui.closeChartModal();
    }
  });

  // Legend Toggles
  document.body.addEventListener('click', (e) => {
    const legendToggle = e.target.closest('.legend-toggle');
    if (legendToggle) {
      // Find the legend content relative to the button
      const parentContainer = legendToggle.closest('.bg-white, .sub-content');
      if (parentContainer) {
        const legendContent = parentContainer.querySelector('.legend-content');
        if (legendContent) {
          legendContent.classList.toggle('hidden');
        }
      }
    }

    const enlargeBtn = e.target.closest('.enlarge-chart-btn');
    if (enlargeBtn) {
      ui.openChartModal(enlargeBtn.dataset.chartId);
    }
  });

  // Pagination Events
  const paginationContainer = document.getElementById('commesse-pagination');
  if (paginationContainer) {
    paginationContainer.addEventListener('click', (e) => {
      const pageButton = e.target.closest('[data-page]');
      if (pageButton && !pageButton.disabled) {
        state.pagination.commesse.currentPage = parseInt(pageButton.dataset.page, 10);
        ui.updateTables();
      }
    });
  }

  // Listen for theme changes to update charts
  window.addEventListener('themeChanged', () => {
    // A small delay to ensure the DOM has updated before redrawing charts
    setTimeout(() => {
      ui.updateCharts();
    }, 50);
  });
}
