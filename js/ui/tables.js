'use strict';

import { state } from '../state.js';
import { elements } from '../dom.js';
import * as utils from '../utils.js';
import * as calcService from '../services/calculationService.js';

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
      case 'tipologia':
        return (a.tipologia || '').localeCompare(b.tipologia || '');
      case 'ricavi':
        return calcService.calcolaMontanteFatture(b.id) - calcService.calcolaMontanteFatture(a.id);
      case 'margine':
        const margineA = calcService.calcolaMargineUltimoForecast(a.id);
        const margineB = calcService.calcolaMargineUltimoForecast(b.id);
        // Ordina le commesse senza forecast alla fine
        if (margineA === null && margineB === null) return 0;
        if (margineA === null) return 1; // a is greater (comes last)
        if (margineB === null) return -1; // b is greater (comes last)
        return margineB - margineA; // Sort descending by margin
      case 'data':
        return new Date(a.dataInizio) - new Date(b.dataInizio);
      case 'ultimo-forecast':
        const forecastA = calcService.getDataUltimoForecast(a.id);
        const forecastB = calcService.getDataUltimoForecast(b.id);
        if (forecastA === null && forecastB === null) return 0;
        if (forecastA === null) return 1; // a is greater (comes last)
        if (forecastB === null) return -1; // b is greater (comes last)
        return forecastB.localeCompare(forecastA); // Sort descending by date string 'YYYY-MM'
      default:
        return 0;
    }
  });

  state.dati.commesse = commesse;
  updateTables();
}

export function updateTables() {
  const pagination = state.pagination.commesse;
  const filteredCommesse = calcService.getFilteredCommesse();

  // Pagination logic
  pagination.totalPages = Math.ceil(filteredCommesse.length / pagination.itemsPerPage);
  if (pagination.currentPage > pagination.totalPages) {
    pagination.currentPage = pagination.totalPages || 1;
  }
  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
  const endIndex = startIndex + pagination.itemsPerPage;
  const paginatedCommesse = filteredCommesse.slice(startIndex, endIndex);

  if (filteredCommesse.length === 0) {
    elements.commesseTable.innerHTML = createEmptyStateHTML('Nessuna commessa trovata.', 'Nuova Commessa', 'commessa');
  } else {
    elements.commesseTable.innerHTML = paginatedCommesse
      .map((commessa) => {
        const ricaviReali = calcService.calcolaMontanteFatture(commessa.id);
        const margineReale = calcService.calcolaMargineUltimoForecast(commessa.id);
        const margineText = margineReale !== null ? `${margineReale.toFixed(2)}%` : 'N/A';
        const margineClass = margineReale !== null && margineReale < state.config.sogliaMargineAttenzione ? 'text-red-600 font-bold alert-warning' : 'text-green-600';

        const ultimoForecast = calcService.getDataUltimoForecast(commessa.id);
        let ultimoForecastText = '<span class="text-gray-400">N/A</span>';
        if (ultimoForecast) {
          const [year, month] = ultimoForecast.split('-');
          const date = new Date(year, month - 1);
          // 'it-IT' for Italian month names, e.g., "gen"
          const formattedDate = date.toLocaleString('it-IT', { month: 'short', year: 'numeric' });
          ultimoForecastText = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1).replace('.', ''); // Rimuove il punto da "gen."
        }

        const truncatedNome = commessa.nome.length > 35 ? commessa.nome.substring(0, 35) + '...' : commessa.nome;
        const tipologiaClass =
          commessa.tipologia === 'T&M' ? 'bg-purple-100 text-purple-800' : commessa.tipologia === 'Corpo' ? 'bg-indigo-100 text-indigo-800' : commessa.tipologia === 'Canone' ? 'bg-sky-100 text-sky-800' : 'bg-gray-100 text-gray-800';

        return `
              <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm font-medium">
                    <button class="text-blue-600 hover:underline font-semibold commessa-link-btn text-left" data-commessa-id="${commessa.id}" title="${commessa.nome}">${truncatedNome}</button>
                  </td>
                  <td class="px-4 py-3 text-sm">${commessa.cliente}</td>
                  <td class="px-4 py-3 text-sm"><span class="inline-block px-2 py-1 text-xs font-medium rounded-full ${tipologiaClass}">${commessa.tipologia}</span></td>
                  <td class="px-4 py-3 text-sm">${new Date(commessa.dataInizio).toLocaleDateString()}</td>
                  <td class="px-4 py-3 text-sm"><span class="inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    commessa.stato === 'Attivo' ? 'bg-green-100 text-green-800' : commessa.stato === 'Completato' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                  }">${commessa.stato}</span></td>
                  <td class="px-4 py-3 text-sm">${ultimoForecastText}</td>
                  <td class="px-4 py-3 text-sm text-right">${utils.formatCurrency(ricaviReali)}</td>
                  <td class="px-4 py-3 text-sm text-right ${margineClass}">${margineText}</td>
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
  const budgetMasterData = calcService.getBudgetMasterData(commessaId);
  let budgetHTML = '';

  if (budgetMasterData.length === 0) {
    budgetHTML = createEmptyStateHTML('Nessun budget definito per questa commessa.', 'Nuovo Budget', 'budget');
  } else {
    budgetMasterData.sort((a, b) => b.meseCompetenza.localeCompare(a.meseCompetenza));
    budgetMasterData.forEach((master) => {
      if (master.type === 'total') {
        budgetHTML += `
                <tr class="bg-blue-50 border-b-2 border-blue-200">
                    <td colspan="7" class="px-4 py-3">
                        <div class="flex justify-between items-center">
                            <div class="flex gap-4 items-center">
                                <span class="font-bold text-blue-900">Budget: ${master.budgetId}</span>
                                <span class="text-blue-700">Mese: ${master.meseCompetenza}</span>
                                <span class="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">Importo Totale</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-blue-900">Totale: ${utils.formatCurrency(master.totale)}</span>
                                <button data-action="delete" data-id="${master.id}" data-type="budgetMaster" class="text-red-600 hover:text-red-800 bg-red-100 px-2 py-1 rounded text-xs flex items-center gap-1" title="Elimina Budget">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                    Elimina
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>`;
      } else {
        // Render detailed budget
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
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
                                    Duplica
                                </button>
                                <button data-action="delete" data-id="${master.id}" data-type="budgetMaster" class="text-red-600 hover:text-red-800 bg-red-100 px-2 py-1 rounded text-xs flex items-center gap-1" title="Elimina Intero Budget">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
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
                  <td class="px-4 py-3 text-sm text-right">${(item.giorni || 0).toFixed(2)}</td>
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
      }
    });
  }

  elements.budgetTable.innerHTML = budgetHTML;
}

function renderOrdiniTable(commessaId) {
  const ordiniCommessa = state.dati.ordini.filter((o) => o.commessaId === commessaId);
  if (ordiniCommessa.length > 0) {
    ordiniCommessa.sort((a, b) => b.data.localeCompare(a.data));
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
  elements.ordiniTotal.textContent = utils.formatCurrency(calcService.calcolaTotaleOrdini(commessaId));
}

function renderFattureTable(commessaId) {
  const fattureCommessa = state.dati.fatture.filter((f) => f.commessaId === commessaId);
  if (fattureCommessa.length > 0) {
    fattureCommessa.sort((a, b) => b.meseCompetenza.localeCompare(a.meseCompetenza));
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
  const montante = calcService.calcolaMontanteFatture(commessaId);
  const totaleOrdini = calcService.calcolaTotaleOrdini(commessaId);
  const residuo = totaleOrdini - montante;
  elements.montanteFatture.textContent = utils.formatCurrency(montante);
  elements.totaleOrdiniFatture.textContent = utils.formatCurrency(totaleOrdini);
  elements.residuoFatture.textContent = utils.formatCurrency(residuo);
  elements.residuoFatture.className = `font-bold ml-2 ${residuo >= 0 ? 'text-green-600' : 'text-red-600'}`;

  // Alert for low remaining amount
  const alertContainer = elements.residuoAlert;
  if (fattureCommessa.length > 0 && residuo > 0) {
    const mediaFatture = montante / fattureCommessa.length;
    if (residuo < mediaFatture) {
      alertContainer.innerHTML = `
        <div class="flex items-center text-yellow-800 bg-yellow-100 p-2 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.636-1.21 2.37-1.21 3.006 0l5.25 10.002c.636 1.21-.24 2.649-1.503 2.649H4.5c-1.263 0-2.139-1.439-1.503-2.649l5.25-10.002zM10 12a1 1 0 110-2 1 1 0 010 2zm0-3a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>Attenzione: il residuo da fatturare (${utils.formatCurrency(residuo)}) è inferiore alla media delle fatture (${utils.formatCurrency(mediaFatture)}).</span>
        </div>
      `;
      alertContainer.classList.remove('hidden');
    } else {
      alertContainer.classList.add('hidden');
    }
  } else {
    alertContainer.classList.add('hidden');
  }
}

function renderMarginiTableTM(commessaId, bodyEl, alertContainer) {
  const headerEl = document.getElementById('margini-table-header-container');
  headerEl.innerHTML = `
    <tr>
      <th class="px-3 py-3 text-left font-medium text-gray-900 whitespace-nowrap">Mese</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Costo Cons. Cum.</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Costo Cons. Mensile</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">HH Cons. Cum.</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">HH Cons. Mensile</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Costo/HH</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Ricavo Cons.</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Margine %</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Ricavo Budget Tot</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Costo Budget (EAC)</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900 bg-green-50">Costo ETC</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900 bg-green-50">Ore ETC</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">% Avanz.</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Ricavo Maturato</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">ETC Revenue</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Azioni</th>
    </tr>
  `;

  const marginiCommessa = state.dati.margini.filter((m) => m.commessaId === commessaId);
  if (marginiCommessa.length > 0) {
    marginiCommessa.sort((a, b) => b.mese.localeCompare(a.mese)); // Descending for display
    const marginiCommessaAsc = [...marginiCommessa].sort((a, b) => a.mese.localeCompare(b.mese)); // Ascending for calculation

    bodyEl.innerHTML = marginiCommessa
      .map((margine) => {
        const commessa = state.dati.commesse.find((c) => c.id === commessaId);
        const indexInAsc = marginiCommessaAsc.findIndex((m) => m.id === margine.id);
        const prevMargine = indexInAsc > 0 ? marginiCommessaAsc[indexInAsc - 1] : null;

        const metrics = calcService.getForecastMetrics(margine, commessa, prevMargine);

        return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-3 py-3 font-medium text-xs whitespace-nowrap">${margine.mese}</td>
                        <td class="px-2 py-3 text-center text-blue-600 font-bold text-xs">${utils.formatCurrency(metrics.costoConsCum)}</td>
                        <td class="px-2 py-3 text-center text-gray-600 font-medium text-xs">${utils.formatCurrency(metrics.costoMensile)}</td>
                        <td class="px-2 py-3 text-center text-blue-600 font-bold text-xs">${(metrics.hhConsuntivo || 0).toFixed(2)}</td>
                        <td class="px-2 py-3 text-center text-gray-600 font-medium text-xs">${(metrics.hhMensile || 0).toFixed(2)}</td>
                        <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(metrics.costoMedioHH)}</td>
                        <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(metrics.ricavoConsuntivo)}</td>
                        <td class="px-2 py-3 text-center text-xs">${metrics.marginePerc.toFixed(2)}%</td>
                        <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(metrics.ricavoBudgetTotale)}</td>
                        <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(metrics.costoBudgetTotaleEAC)}</td>
                        <td class="px-2 py-3 text-center text-xs bg-green-100 text-green-800 font-medium">${utils.formatCurrency(metrics.costoStimaAFinireETC)}</td>
                        <td class="px-2 py-3 text-center text-xs bg-green-100 text-green-800 font-medium">${metrics.oreStimaAFinireETC.toFixed(2)}</td>
                        <td class="px-2 py-3 text-center text-xs">${metrics.percentualeAvanzamentoCosti.toFixed(2)}%</td>
                        <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(metrics.ricavoMaturato)}</td>
                        <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(metrics.etcRevenue)}</td>
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
    bodyEl.innerHTML = createEmptyStateHTML('Nessun forecast inserito per questa commessa.', 'Aggiungi Forecast', 'margine');
  }
}

function renderMarginiTableCorpo(commessaId, bodyEl, alertContainer) {
  const headerEl = document.getElementById('margini-table-header-container');
  headerEl.innerHTML = `
    <tr>
      <th class="px-3 py-3 text-left font-medium text-gray-900 whitespace-nowrap">Mese</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Costo Cons. Cum.</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">GG da Fare</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Costo Medio HH</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">HH da Fare</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900 bg-green-50">Costo ETC</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Costo Totale (EAC)</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Margine %</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">% Avanz.</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Ricavo Maturato</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">ETC Revenue</th>
      <th class="px-2 py-3 text-center font-medium text-gray-900">Azioni</th>
    </tr>
  `;

  const marginiCommessa = state.dati.margini.filter((m) => m.commessaId === commessaId);
  if (marginiCommessa.length > 0) {
    marginiCommessa.sort((a, b) => b.mese.localeCompare(a.mese)); // Descending for display

    const ricavoTotaleBudget = calcService.calcolaTotaleBudgetRecent(commessaId);

    bodyEl.innerHTML = marginiCommessa
      .map((margine) => {
        const commessa = state.dati.commesse.find((c) => c.id === commessaId);
        const metrics = calcService.getForecastMetrics(margine, commessa);

        if (metrics.error) {
          return `<tr><td colspan="12" class="text-center text-xs text-red-600 p-2">Impossibile calcolare il forecast per ${margine.mese}: ${metrics.error}</td></tr>`;
        }

        return `
          <tr class="hover:bg-gray-50">
              <td class="px-3 py-3 font-medium text-xs whitespace-nowrap">${margine.mese}</td>
              <td class="px-2 py-3 text-center text-blue-600 font-bold text-xs">${utils.formatCurrency(metrics.costoConsCum)}</td>
              <td class="px-2 py-3 text-center text-xs">${metrics.ggDaFare}</td>
              <td class="px-2 py-3 text-center text-xs" title="${metrics.isCostoMedioFromBudget ? 'Calcolato dal budget' : 'Inserito manualmente'}">
                ${utils.formatCurrency(metrics.costoMedioOrarioUsato)}
                ${metrics.isCostoMedioFromBudget ? '<span class="text-gray-400">*</span>' : ''}
              </td>
              <td class="px-2 py-3 text-center text-xs">${metrics.hhDaFare.toFixed(0)}</td>
              <td class="px-2 py-3 text-center text-xs bg-green-100 text-green-800 font-medium">${utils.formatCurrency(metrics.costoETC)}</td>
              <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(metrics.costoTotaleEAC)}</td>
              <td class="px-2 py-3 text-center text-xs">${metrics.marginePerc.toFixed(2)}%</td>
              <td class="px-2 py-3 text-center text-xs">${metrics.percentualeAvanzamento.toFixed(2)}%</td>
              <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(metrics.ricavoMaturato)}</td>
              <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(metrics.etcRevenue)}</td>
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
          </tr>
        `;
      })
      .join('');
  } else {
    bodyEl.innerHTML = createEmptyStateHTML('Nessun forecast inserito per questa commessa.', 'Aggiungi Forecast', 'margine');
  }
}

function renderMarginiTable(commessaId) {
  const commessa = state.dati.commesse.find((c) => c.id === commessaId);
  const alertContainer = elements.margineAlert;
  const bodyEl = elements.marginiTable;
  const headerEl = document.getElementById('margini-table-header-container');

  alertContainer.classList.add('hidden'); // Hide by default

  // Alert for low margin based on the LATEST forecast record
  const margineUltimoForecast = calcService.calcolaMargineUltimoForecast(commessaId);
  if (margineUltimoForecast !== null) {
    const { sogliaMargineAttenzione, sogliaMargineCritico } = state.config;
    if (margineUltimoForecast < sogliaMargineAttenzione) {
      const isCritical = margineUltimoForecast < sogliaMargineCritico;
      const bgColor = isCritical ? 'bg-red-100' : 'bg-yellow-100';
      const textColor = isCritical ? 'text-red-800' : 'text-yellow-800';
      const iconColor = isCritical ? 'text-red-500' : 'text-yellow-500';
      const latestForecastMonth = state.dati.margini.filter((m) => m.commessaId === commessaId).reduce((latest, current) => (current.mese > latest.mese ? current : latest)).mese;
      const message = isCritical
        ? `Attenzione: il margine dell'ultimo forecast (${latestForecastMonth}) è ${margineUltimoForecast.toFixed(2)}%, a un livello critico (sotto il ${sogliaMargineCritico}%).`
        : `Attenzione: il margine dell'ultimo forecast (${latestForecastMonth}) è ${margineUltimoForecast.toFixed(2)}%, sotto la soglia di attenzione (${sogliaMargineAttenzione}%).`;

      alertContainer.innerHTML = `
        <div class="flex items-center ${textColor} ${bgColor} p-3 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 shrink-0 ${iconColor}" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.636-1.21 2.37-1.21 3.006 0l5.25 10.002c.636 1.21-.24 2.649-1.503 2.649H4.5c-1.263 0-2.139-1.439-1.503-2.649l5.25-10.002zM10 12a1 1 0 110-2 1 1 0 010 2zm0-3a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>${message}</span>
        </div>
      `;
      alertContainer.classList.remove('hidden');
    }
  }

  if (!commessa) {
    if (headerEl) headerEl.innerHTML = '';
    if (bodyEl) bodyEl.innerHTML = createEmptyStateHTML('Seleziona una commessa per vedere i forecast.', 'Nuova Commessa', 'commessa');
    return;
  }

  const legendTm = document.getElementById('margini-legend-tm');
  const legendCorpo = document.getElementById('margini-legend-corpo');

  if (commessa.tipologia === 'Corpo') {
    renderMarginiTableCorpo(commessaId, bodyEl, alertContainer);
    if (legendTm) legendTm.classList.add('hidden');
    if (legendCorpo) legendCorpo.classList.remove('hidden');
  } else {
    // Default to T&M logic for 'T&M', 'Canone', etc.
    renderMarginiTableTM(commessaId, bodyEl, alertContainer);
    if (legendTm) legendTm.classList.remove('hidden');
    if (legendCorpo) legendCorpo.classList.add('hidden');
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
