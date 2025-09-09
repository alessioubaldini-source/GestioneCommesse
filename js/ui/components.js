'use strict';

import { state } from '../state.js';
import { elements } from '../dom.js';
import { activityRules } from './calendar.js';
import * as utils from '../utils.js';
import * as calcService from '../services/calculationService.js';

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
  // Get commesse filtered by client, status, search. The period filter here is now only for the list of commesse, not the KPIs.
  const filteredCommesse = calcService.getFilteredCommesse();
  const filteredCommesseIds = new Set(filteredCommesse.map((c) => c.id));

  // --- CURRENT PERIOD KPIs ---
  // The main KPIs are now correctly calculated based on the financial data's date, not the project start date.
  const { startDate: currentStartDate, endDate: currentEndDate } = calcService.getPeriodDateRange(state.filters.period);
  const { ricavi: totalRicavi, costi: totalCosti } = calcService.calculateKpisForPeriod(filteredCommesseIds, currentStartDate, currentEndDate);

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
  const { sogliaMargineAttenzione, sogliaMargineCritico } = state.config;

  margineCard.classList.remove('margin-ok', 'margin-warning', 'margin-critical'); // Rimuove le classi dinamiche per un colore più neutro
  if (marginePerc >= sogliaMargineAttenzione) {
    elements.margineTrend.textContent = '✅ Sopra soglia';
  } else if (marginePerc >= sogliaMargineCritico) {
    elements.margineTrend.textContent = '⚠️ Sotto soglia';
  } else {
    elements.margineTrend.textContent = '🚨 Critico';
  }

  // --- TREND CALCULATION ---
  const { startDate: prevStartDate, endDate: prevEndDate } = calcService.getPreviousPeriodDateRange(state.filters.period) || {};
  let ricaviTrendHTML = 'N/A';
  let costiTrendHTML = 'N/A';

  if (prevStartDate && prevEndDate) {
    const prevKpis = calcService.calculateKpisForPeriod(filteredCommesseIds, prevStartDate, prevEndDate);

    // Ricavi Trend
    if (prevKpis.ricavi > 0) {
      const ricaviPercChange = ((totalRicavi - prevKpis.ricavi) / prevKpis.ricavi) * 100;
      const arrow = ricaviPercChange >= 0 ? '↗️' : '↘️';
      ricaviTrendHTML = `${arrow} ${ricaviPercChange.toFixed(1)}% vs periodo prec.`;
    } else if (totalRicavi > 0) {
      ricaviTrendHTML = '↗️ N/A vs periodo prec.';
    }

    // Costi Trend
    if (prevKpis.costi > 0) {
      const costiPercChange = ((totalCosti - prevKpis.costi) / prevKpis.costi) * 100;
      const arrow = costiPercChange >= 0 ? '↗️' : '↘️';
      costiTrendHTML = `${arrow} ${costiPercChange.toFixed(1)}% vs periodo prec.`;
    } else if (totalCosti > 0) {
      costiTrendHTML = '↗️ N/A vs periodo prec.';
    }
  }
  elements.ricaviTrend.textContent = ricaviTrendHTML;
  elements.costiTrend.textContent = costiTrendHTML;
}

export function updateCommesseMonitorate() {
  const listContainer = document.getElementById('commesse-monitorate-list');
  const commesseDaMonitorare = [];

  const sogliaAttenzione = state.config.sogliaMargineAttenzione;
  const sogliaCritico = state.config.sogliaMargineCritico;

  const filteredCommesse = calcService.getFilteredCommesse();

  filteredCommesse.forEach((commessa) => {
    // Calcola entrambi i potenziali problemi
    const margineReale = calcService.calcolaMarginRealeCommessa(commessa.id);
    const haMargineBasso = margineReale < sogliaAttenzione;

    const montante = calcService.calcolaMontanteFatture(commessa.id);
    const totaleOrdini = calcService.calcolaTotaleOrdini(commessa.id);
    const residuo = totaleOrdini - montante;
    const fattureCommessa = state.dati.fatture.filter((f) => f.commessaId === commessa.id);
    let haResiduoBasso = false;
    let mediaFatture = 0;
    if (fattureCommessa.length > 0 && residuo > 0) {
      mediaFatture = montante / fattureCommessa.length;
      if (residuo < mediaFatture) {
        haResiduoBasso = true;
      }
    }

    // Se c'è almeno un problema, aggiungi la commessa alla lista
    if (haMargineBasso || haResiduoBasso) {
      // Salva i dati calcolati per non doverli ricalcolare dopo
      commesseDaMonitorare.push({ ...commessa, margine: margineReale, residuo, mediaFatture, motivoMonitoraggio: { margine: haMargineBasso, residuo: haResiduoBasso } });
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
      const { motivoMonitoraggio, margine, residuo, mediaFatture } = commessa;
      const isMarginCritical = margine < sogliaCritico;

      // Determina lo stile principale in base al problema più grave (margine)
      const bgColor = motivoMonitoraggio.margine ? (isMarginCritical ? 'bg-red-50' : 'bg-yellow-50') : 'bg-orange-50';
      const borderColor = motivoMonitoraggio.margine ? (isMarginCritical ? 'border-red-400' : 'border-yellow-400') : 'border-orange-400';

      let alertMargineHTML = '';
      if (motivoMonitoraggio.margine) {
        const textColor = isMarginCritical ? 'text-red-800' : 'text-yellow-800';
        const label = isMarginCritical ? `Critico (<${sogliaCritico}%)` : `Attenzione (<${sogliaAttenzione}%)`;
        alertMargineHTML = `
            <div class="text-right">
                <p class="font-bold text-lg ${textColor}">${margine.toFixed(1)}%</p>
                <p class="text-xs ${textColor}">${label}</p>
            </div>`;
      }

      let alertFatturazioneHTML = '';
      if (motivoMonitoraggio.residuo) {
        alertFatturazioneHTML = `
              <div class="text-right ${motivoMonitoraggio.margine ? 'mt-2' : ''}" title="Il residuo da fatturare (${utils.formatCurrency(residuo)}) è inferiore alla media delle fatture (${utils.formatCurrency(mediaFatture)})">
                  <p class="font-bold text-lg text-orange-700">${utils.formatCurrency(residuo)}</p>
                  <p class="text-xs text-orange-700">Residuo (Media Fatt.: ${utils.formatCurrency(mediaFatture)})</p>
              </div>
          `;
      }

      // Costruisci la stringa con la motivazione
      const motivi = [];
      if (motivoMonitoraggio.margine) motivi.push('Margine basso');
      if (motivoMonitoraggio.residuo) motivi.push('Residuo basso');
      const motivoText = motivi.join(' e ');

      const motivoHTML = `<p class="text-xs text-gray-500 mt-1">Motivo: <span class="font-medium text-gray-700">${motivoText}</span></p>`;

      return `
          <div class="p-3 rounded-lg ${bgColor} border-l-4 ${borderColor} flex justify-between items-center">
              <div>
                  <button class="text-blue-600 hover:underline font-semibold commessa-link-btn text-left" data-commessa-id="${commessa.id}">${commessa.nome}</button>
                  <p class="text-xs text-gray-600">${commessa.cliente}</p>
                  ${motivoHTML}
              </div>
              <div>
                ${alertMargineHTML}
                ${alertFatturazioneHTML}
              </div>
          </div>
      `;
    })
    .join('');
}

export function updateCurrentActivityPhase() {
  if (!elements.currentActivityPhase) return;

  const today = new Date();
  const todayDayOfMonth = today.getDate();
  const dayOfWeek = today.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const currentRule = activityRules.find((rule) => todayDayOfMonth >= rule.startDay && todayDayOfMonth <= rule.endDay);

  if (currentRule && !isWeekend) {
    elements.currentActivityPhase.innerHTML = `
      <div class="flex items-center gap-2 text-sm text-gray-800 p-2 rounded-lg ${currentRule.color} border border-gray-300">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-gray-600">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" />
        </svg>
        <span class="font-semibold">Fase Corrente:</span>
        <span class="text-gray-700">${currentRule.description}</span>
      </div>
    `;
    elements.currentActivityPhase.classList.remove('hidden');
  } else {
    elements.currentActivityPhase.innerHTML = '';
    elements.currentActivityPhase.classList.add('hidden');
  }
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
  const ricaviReali = calcService.calcolaMontanteFatture(commessa.id);
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
  const { sogliaMargineEccellente, sogliaMargineAttenzione, sogliaMargineCritico } = state.config;
  margineElement.classList.remove('text-green-300', 'text-blue-300', 'text-yellow-300', 'text-red-300');
  if (margineReale > sogliaMargineEccellente) {
    margineElement.classList.add('text-green-300'); // Eccellente
  } else if (margineReale >= sogliaMargineAttenzione) {
    margineElement.classList.add('text-blue-300'); // Buono
  } else if (margineReale >= sogliaMargineCritico) {
    margineElement.classList.add('text-yellow-300'); // Attenzione
  } else {
    margineElement.classList.add('text-red-300'); // Critico
  }
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

export function updateButtonStates() {
  elements.gestioneTab.disabled = false;

  const isCommessaSelected = state.selectedCommessa !== null;
  document.querySelectorAll('[data-modal-type]').forEach((btn) => {
    if (btn.dataset.modalType !== 'commessa') {
      btn.disabled = !isCommessaSelected;
    }
  });
}
