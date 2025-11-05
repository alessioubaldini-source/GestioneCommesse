'use strict';

import { state } from '../state.js';
import { elements } from '../dom.js';

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
    case 'custom-range':
      const startDateInput = document.getElementById('start-date-filter');
      const endDateInput = document.getElementById('end-date-filter');
      startDate = startDateInput && startDateInput.value ? new Date(startDateInput.value) : null;
      endDate = endDateInput && endDateInput.value ? new Date(endDateInput.value) : null;
      if (endDate) endDate.setHours(23, 59, 59, 999); // Include the whole end day
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

export function calcolaCostoMedioOrarioBudget(commessaId) {
  const budgetMasters = state.dati.budgetMaster?.filter((bm) => bm.commessaId === commessaId) || [];
  if (budgetMasters.length === 0) return 0;

  const latestMaster = budgetMasters.reduce((latest, current) => {
    return current.meseCompetenza > latest.meseCompetenza ? current : latest;
  });

  // Il costo medio orario può essere calcolato solo da un budget dettagliato
  if (latestMaster.type === 'total') {
    return 0;
  }

  const details = state.dati.budget?.filter((b) => b.budgetMasterId === latestMaster.id) || [];
  if (details.length === 0) return 0;

  // Il costo è dato dalla tariffa giornaliera per i giorni
  const totalCost = details.reduce((sum, b) => sum + b.tariffa * b.giorni, 0);
  // Le ore sono i giorni per 8
  const totalHours = details.reduce((sum, b) => sum + b.giorni, 0) * 8;

  if (totalHours === 0) return 0;

  return totalCost / totalHours;
}

export function calcolaMargineUltimoForecast(commessaId) {
  const marginiCommessa = state.dati.margini.filter((m) => m.commessaId === commessaId);
  if (marginiCommessa.length === 0) {
    return null;
  }

  const latestForecast = marginiCommessa.reduce((latest, current) => (current.mese > latest.mese ? current : latest));
  const commessa = state.dati.commesse.find((c) => c.id === commessaId);

  if (commessa.tipologia === 'Corpo') {
    const costoMedioOrario = latestForecast.costoMedioHH > 0 ? latestForecast.costoMedioHH : calcolaCostoMedioOrarioBudget(commessaId);
    const ricavoTotaleBudget = calcolaTotaleBudgetRecent(commessaId);

    if (ricavoTotaleBudget === 0 || costoMedioOrario === 0) return 0;

    const costoConsCum = latestForecast.costoConsuntivi;
    const ggDaFare = latestForecast.ggDaFare || 0;
    const hhDaFare = ggDaFare * 8;
    const costoDaFare = hhDaFare * costoMedioOrario;
    const costoTotaleEAC = costoDaFare + costoConsCum;

    return ((ricavoTotaleBudget - costoTotaleEAC) / ricavoTotaleBudget) * 100;
  } else {
    // Logica per T&M e Canone
    const ricavoConsuntivoUltimoMese = calcolaMontanteFattureFinoAlMese(commessaId, latestForecast.mese);

    if (ricavoConsuntivoUltimoMese > 0) {
      return ((ricavoConsuntivoUltimoMese - latestForecast.costoConsuntivi) / ricavoConsuntivoUltimoMese) * 100;
    }
    return 0;
  }
}

export function getDataUltimoForecast(commessaId) {
  const marginiCommessa = state.dati.margini.filter((m) => m.commessaId === commessaId);
  if (marginiCommessa.length === 0) {
    return null;
  }

  // Find the forecast with the most recent month
  const latestForecast = marginiCommessa.reduce((latest, current) => (current.mese > latest.mese ? current : latest));

  // The 'mese' property is in 'YYYY-MM' format.
  return latestForecast.mese;
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
 * Calcola tutte le metriche derivate per un singolo record di forecast.
 * Centralizza la logica di calcolo per T&M e Corpo.
 * @param {object} margine Il record di margine/forecast.
 * @param {object} commessa La commessa associata.
 * @param {object} prevMargine Il record di margine del mese precedente (per calcoli delta).
 * @returns {object} Un oggetto contenente tutte le metriche calcolate.
 */
export function getForecastMetrics(margine, commessa, prevMargine = null) {
  const commessaId = commessa.id;

  if (commessa.tipologia === 'Corpo') {
    const ricavoTotaleBudget = calcolaTotaleBudgetRecent(commessaId);
    const costoMedioOrarioUsato = margine.costoMedioHH > 0 ? margine.costoMedioHH : calcolaCostoMedioOrarioBudget(commessaId);
    const isCostoMedioFromBudget = !(margine.costoMedioHH > 0);

    if (costoMedioOrarioUsato === 0 && (margine.ggDaFare || 0) > 0) {
      return { error: 'Costo medio orario non disponibile.' };
    }

    const ggDaFare = margine.ggDaFare || 0;
    const hhDaFare = ggDaFare * 8;
    const costoETC = hhDaFare * costoMedioOrarioUsato;
    const costoTotaleEAC = costoETC + margine.costoConsuntivi;
    const marginePerc = ricavoTotaleBudget > 0 ? ((ricavoTotaleBudget - costoTotaleEAC) / ricavoTotaleBudget) * 100 : 0;
    const percentualeAvanzamento = costoTotaleEAC > 0 ? (margine.costoConsuntivi / costoTotaleEAC) * 100 : 0;
    const ricavoMaturato = ricavoTotaleBudget * (percentualeAvanzamento / 100);
    const etcRevenue = ricavoTotaleBudget - ricavoMaturato;

    return {
      costoConsCum: margine.costoConsuntivi,
      ggDaFare,
      costoMedioOrarioUsato,
      isCostoMedioFromBudget,
      hhDaFare,
      costoETC,
      costoTotaleEAC,
      marginePerc,
      percentualeAvanzamento,
      ricavoMaturato,
      etcRevenue,
    };
  } else {
    // Logica per T&M e Canone
    const costoMensile = prevMargine ? (margine.costoConsuntivi || 0) - (prevMargine.costoConsuntivi || 0) : margine.costoConsuntivi || 0;
    const hhMensile = prevMargine ? (margine.hhConsuntivo || 0) - (prevMargine.hhConsuntivo || 0) : margine.hhConsuntivo || 0;
    const ricavoConsuntivo = calcolaMontanteFattureFinoAlMese(commessaId, margine.mese);
    const costoMedioHH = margine.hhConsuntivo > 0 ? margine.costoConsuntivi / margine.hhConsuntivo : 0;
    const marginePerc = ricavoConsuntivo > 0 ? ((ricavoConsuntivo - margine.costoConsuntivi) / ricavoConsuntivo) * 100 : 0;
    const ricavoBudgetTotale = calcolaTotaleBudgetRecent(commessaId);
    const costoBudgetTotaleEAC = ricavoBudgetTotale > 0 ? ricavoBudgetTotale * (1 - marginePerc / 100) : 0;
    const costoStimaAFinireETC = costoBudgetTotaleEAC > 0 ? costoBudgetTotaleEAC - margine.costoConsuntivi : 0;
    const oreStimaAFinireETC = costoMedioHH > 0 ? costoStimaAFinireETC / costoMedioHH : 0;
    const percentualeAvanzamentoCosti = costoBudgetTotaleEAC > 0 ? (margine.costoConsuntivi / costoBudgetTotaleEAC) * 100 : 0;
    const ricavoMaturato = ricavoBudgetTotale * (percentualeAvanzamentoCosti / 100);
    const etcRevenue = ricavoBudgetTotale - ricavoMaturato;

    return {
      costoConsCum: margine.costoConsuntivi,
      costoMensile,
      hhConsuntivo: margine.hhConsuntivo,
      hhMensile,
      costoMedioHH,
      ricavoConsuntivo,
      marginePerc,
      ricavoBudgetTotale,
      costoBudgetTotaleEAC,
      costoStimaAFinireETC,
      oreStimaAFinireETC,
      percentualeAvanzamentoCosti,
      ricavoMaturato,
      etcRevenue,
    };
  }
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
    case 'custom-range':
      const endMonthCustom = endDate.toLocaleString('it-IT', { month: 'long' });
      const endYearCustom = endDate.getFullYear();
      return `dal ${startDate.toLocaleDateString('it-IT')} al ${endDate.toLocaleDateString('it-IT')}`;
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

  // Ripristino logica corretta: i costi del periodo sono la somma dei costi *mensili* per i mesi che cadono nel periodo.
  // Poiché i dati di forecast sono cumulativi, il costo mensile va calcolato come differenza dal mese precedente.
  let costi = 0;
  commesseIds.forEach((id) => {
    // Prende tutti i forecast per la commessa, ordinati cronologicamente
    const commessaMargini = state.dati.margini.filter((m) => m.commessaId === id).sort((a, b) => a.mese.localeCompare(b.mese));

    for (let i = 0; i < commessaMargini.length; i++) {
      const current = commessaMargini[i];
      // Controlla se il record di forecast corrente rientra nel periodo selezionato
      if (filterByDate(current)) {
        const previous = commessaMargini[i - 1];
        // Il costo del mese è la differenza con il cumulativo precedente. Per il primo record, è il suo valore.
        const monthlyCost = previous ? (current.costoConsuntivi || 0) - (previous.costoConsuntivi || 0) : current.costoConsuntivi || 0;
        costi += monthlyCost;
      }
    }
  });

  return { ricavi, costi };
}
