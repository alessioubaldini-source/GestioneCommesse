'use strict';

import { state } from '../state.js';

export function getPeriodDateRange(periodFilter) {
  const now = new Date();
  let startDate, endDate;

  switch (periodFilter) {
    case 'current-month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'current-quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      break;
    case 'current-year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    case 'last-3-months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      endDate = now;
      break;
    default:
      return { startDate: null, endDate: null };
  }
  return { startDate, endDate };
}

export function getFilteredCommesse() {
  let filtered = [...state.dati.commesse];

  // Filter by client
  if (state.filters.client !== 'all') {
    filtered = filtered.filter((c) => c.cliente === state.filters.client);
  }

  // Filter by status
  if (state.filters.status !== 'all') {
    filtered = filtered.filter((c) => c.stato === state.filters.status);
  }

  // Filter by tipologia
  if (state.filters.tipologia && state.filters.tipologia !== 'all') {
    filtered = filtered.filter((c) => c.tipologia === state.filters.tipologia);
  }

  // Filter by search
  if (state.filters.search) {
    const search = state.filters.search.toLowerCase();
    filtered = filtered.filter((c) => c.nome.toLowerCase().includes(search) || c.cliente.toLowerCase().includes(search) || c.stato.toLowerCase().includes(search) || (c.tipologia && c.tipologia.toLowerCase().includes(search)));
  }

  return filtered;
}

export function calcolaTotaleBudgetRecent(commessaId) {
  const budgetMasters = state.dati.budgetMaster?.filter((bm) => bm.commessaId === commessaId) || [];
  if (budgetMasters.length === 0) return 0;

  const latestMaster = budgetMasters.reduce((latest, current) => {
    return current.meseCompetenza > latest.meseCompetenza ? current : latest;
  });

  if (latestMaster.type === 'total') {
    return latestMaster.importo || 0;
  }

  // For 'detail' type
  const details = state.dati.budget?.filter((b) => b.budgetMasterId === latestMaster.id) || [];
  return details.reduce((sum, b) => sum + b.tariffa * b.giorni, 0);
}

export function calcolaMarginRealeCommessa(commessaId) {
  const ricaviReali = calcolaMontanteFatture(commessaId);
  const costiReali = state.dati.margini.filter((m) => m.commessaId === commessaId).reduce((sum, m) => sum + m.costoConsuntivi, 0);

  if (ricaviReali === 0) return 0;
  return ((ricaviReali - costiReali) / ricaviReali) * 100;
}

export function calcolaMargineUltimoForecast(commessaId) {
  const marginiCommessa = state.dati.margini.filter((m) => m.commessaId === commessaId);
  if (marginiCommessa.length === 0) {
    return null;
  }

  const latestForecast = marginiCommessa.reduce((latest, current) => (current.mese > latest.mese ? current : latest));

  const ricavoConsuntivoUltimoMese = calcolaMontanteFattureFinoAlMese(commessaId, latestForecast.mese);

  if (ricavoConsuntivoUltimoMese > 0) {
    return ((ricavoConsuntivoUltimoMese - latestForecast.costoConsuntivi) / ricavoConsuntivoUltimoMese) * 100;
  }
  return 0;
}

export function getBudgetMasterData(commessaId) {
  const budgetMasters = state.dati.budgetMaster?.filter((bm) => bm.commessaId === commessaId) || [];

  return budgetMasters
    .map((master) => {
      if (master.type === 'total') {
        return { ...master, items: [], totale: master.importo || 0 };
      }
      // For 'detail' type
      const details = state.dati.budget?.filter((b) => b.budgetMasterId === master.id) || [];
      const totale = details.reduce((sum, b) => sum + b.tariffa * b.giorni, 0);

      return { ...master, items: details, totale };
    })
    .sort((a, b) => b.meseCompetenza.localeCompare(a.meseCompetenza));
}

export function calcolaTotaleOrdini(commessaId) {
  return state.dati.ordini.filter((o) => o.commessaId === commessaId).reduce((sum, o) => sum + o.importo, 0);
}

export function calcolaMontanteFatture(commessaId) {
  return state.dati.fatture.filter((f) => f.commessaId === commessaId).reduce((sum, f) => sum + f.importo, 0);
}

export function calcolaMontanteFattureFinoAlMese(commessaId, mese) {
  return state.dati.fatture.filter((f) => f.commessaId === commessaId && f.meseCompetenza <= mese).reduce((sum, f) => sum + f.importo, 0);
}

/**
 * Returns a user-friendly description of a date range for tooltips.
 * @param {string} periodFilter - The filter that generated the range.
 * @param {Date} startDate - The start date of the period.
 * @param {Date} endDate - The end date of the period.
 * @returns {string}
 */
export function getPeriodDescription(periodFilter, startDate, endDate) {
  const startMonth = startDate.toLocaleString('it-IT', { month: 'long' });
  const startYear = startDate.getFullYear();

  switch (periodFilter) {
    case 'current-month':
      return `${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} ${startYear}`;
    case 'current-quarter':
      const endMonth = endDate.toLocaleString('it-IT', { month: 'long' });
      return `trimestre ${startMonth} - ${endMonth} ${startYear}`;
    case 'current-year':
      return `l'anno ${startYear}`;
    case 'last-3-months':
      const endMonth3m = endDate.toLocaleString('it-IT', { month: 'long' });
      return `3 mesi da ${startMonth} a ${endMonth3m} ${startYear}`;
    default:
      return '';
  }
}

/**
 * Returns the start and end date for the previous equivalent period based on a filter string.
 * @param {string} periodFilter - The current period filter (e.g., 'current-month').
 * @returns {{startDate: Date, endDate: Date}|null}
 */
export function getPreviousPeriodDateRange(periodFilter) {
  const now = new Date();
  let startDate, endDate;

  switch (periodFilter) {
    case 'current-month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'current-quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      endDate = new Date(now.getFullYear(), currentQuarter * 3, 0);
      break;
    case 'current-year':
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31);
      break;
    case 'last-3-months':
      // The 3 months before the "last 3 months"
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      endDate = new Date(now.getFullYear(), now.getMonth() - 2, 0);
      break;
    default:
      return null;
  }
  return { startDate, endDate };
}

/**
 * Calculates KPIs for a given set of commesse within a specific date range.
 * @param {Set<number>} commesseIds - A set of commessa IDs to consider.
 * @param {Date} startDate - The start of the period.
 * @param {Date} endDate - The end of the period.
 * @returns {{ricavi: number, costi: number}}
 */
export function calculateKpisForPeriod(commesseIds, startDate, endDate) {
  const filterByDate = (item) => {
    if (!startDate || !endDate) return true; // 'all' periods
    // Use 'mese' for margini and 'meseCompetenza' for fatture
    const monthString = item.mese || item.meseCompetenza;
    if (!monthString) return false;
    const itemDate = new Date(monthString + '-02'); // Use day 2 to avoid timezone issues
    return itemDate >= startDate && itemDate <= endDate;
  };

  const ricavi = state.dati.fatture.filter((f) => commesseIds.has(f.commessaId) && filterByDate(f)).reduce((acc, f) => acc + f.importo, 0);

  let costi = 0;
  commesseIds.forEach((id) => {
    const commessaMargini = state.dati.margini.filter((m) => m.commessaId === id).sort((a, b) => a.mese.localeCompare(b.mese)); // Sort ascending

    for (let i = 0; i < commessaMargini.length; i++) {
      const current = commessaMargini[i];
      if (filterByDate(current)) {
        const previous = commessaMargini[i - 1];
        const monthlyCost = previous ? current.costoConsuntivi - previous.costoConsuntivi : current.costoConsuntivi;
        costi += monthlyCost;
      }
    }
  });

  return { ricavi, costi };
}
