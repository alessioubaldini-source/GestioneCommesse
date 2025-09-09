'use strict';

import { state } from '../state.js';
import { elements } from '../dom.js';
import { getFilteredCommesse } from '../services/calculationService.js';

/**
 * Regole per evidenziare periodi di attività nel calendario.
 * Ogni regola definisce un intervallo di giorni del mese, una descrizione e un colore di sfondo.
 */
const activityRules = [
  { startDay: 1, endDay: 3, description: 'Quadratura TS e invio consuntivi', color: 'bg-yellow-100' },
  { startDay: 4, endDay: 12, description: 'Invio fatture e revisione forecast', color: 'bg-green-100' },
  { startDay: 16, endDay: 18, description: 'Controllo ricavi e approvazione forecast', color: 'bg-indigo-100' },
];

/**
 * Parses a date string in YYYY-MM-DD format reliably, avoiding timezone issues.
 * @param {string} dateString The date string to parse.
 * @returns {Date | null}
 */
function parseDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.split('-');
  if (parts.length !== 3) return null;
  // new Date(year, monthIndex, day)
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getEventsForMonth(year, month) {
  const events = [];
  // Use the same filtered commesse as the rest of the dashboard for consistency
  const filteredCommesse = getFilteredCommesse();
  const commesseIds = new Set(filteredCommesse.map((c) => c.id));

  // Date di invio fatture
  state.dati.fatture?.forEach((fattura) => {
    if (!commesseIds.has(fattura.commessaId)) return;
    const eventDate = parseDate(fattura.dataInvioConsuntivo);
    if (eventDate && eventDate.getFullYear() === year && eventDate.getMonth() === month) {
      const commessa = state.dati.commesse.find((c) => c.id === fattura.commessaId);
      events.push({
        day: eventDate.getDate(),
        type: 'fattura',
        title: `Invio Fattura: ${commessa?.nome || 'N/A'}`,
        color: 'bg-blue-600',
      });
    }
  });

  // Date ricezione ordini
  state.dati.ordini?.forEach((ordine) => {
    if (!commesseIds.has(ordine.commessaId)) return;
    const eventDate = parseDate(ordine.data);
    if (eventDate && eventDate.getFullYear() === year && eventDate.getMonth() === month) {
      const commessa = state.dati.commesse.find((c) => c.id === ordine.commessaId);
      events.push({
        day: eventDate.getDate(),
        type: 'ordine',
        title: `Ricevuto Ordine: ${commessa?.nome || 'N/A'}`,
        color: 'bg-blue-600',
      });
    }
  });

  // Date di inizio commessa
  filteredCommesse.forEach((commessa) => {
    const eventDate = parseDate(commessa.dataInizio);
    if (eventDate && eventDate.getFullYear() === year && eventDate.getMonth() === month) {
      events.push({
        day: eventDate.getDate(),
        type: 'commessa',
        title: `Inizio Commessa: ${commessa.nome}`,
        color: 'bg-green-600',
      });
    }
  });

  return events;
}

export function renderCalendar() {
  if (!elements.calendarContainer) return;

  const { currentDate } = state.calendar;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('it-IT', { month: 'long' });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const events = getEventsForMonth(year, month);

  let calendarHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">${capitalizedMonthName} ${year}</h3>
            <div class="flex space-x-2">
                <button id="prev-month-btn" class="p-1 rounded-full hover:bg-gray-200" title="Mese precedente">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <button id="next-month-btn" class="p-1 rounded-full hover:bg-gray-200" title="Mese successivo">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center text-sm">
    `;

  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  daysOfWeek.forEach((day) => {
    calendarHTML += `<div class="font-medium text-gray-600 py-2">${day}</div>`;
  });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Aggiusta per far iniziare la settimana di Lunedì
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  for (let i = 0; i < startingDay; i++) {
    calendarHTML += `<div></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const today = new Date();
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    const dayEvents = events.filter((e) => e.day === day);
    const eventTooltips = dayEvents.map((e) => e.title);

    let dayClasses = 'py-2 rounded-lg relative cursor-default text-center';
    let eventHTML = '';

    // Cerca una regola di attività corrispondente per il giorno corrente
    const matchingRule = activityRules.find((rule) => day >= rule.startDay && day <= rule.endDay);

    // Imposta stile in base al fatto che sia oggi o un giorno di attività
    if (isToday) {
      dayClasses += ' bg-blue-600 text-white font-bold';
    } else if (matchingRule) {
      // Se non è oggi MA c'è una regola, applica lo sfondo dell'attività
      dayClasses += ` ${matchingRule.color}`;
    }

    if (dayEvents.length > 0) {
      // Se c'è un evento di tipo fattura o ordine, il puntino è blu. Altrimenti usa il colore del primo evento.
      const hasFinancialEvent = dayEvents.some((e) => e.type === 'fattura' || e.type === 'ordine');
      const dotColor = hasFinancialEvent ? 'bg-blue-600' : dayEvents[0].color;
      // Il tooltip viene ora gestito dal div genitore per unificare le informazioni
      eventHTML = `<div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 ${dotColor} rounded-full"></div>`;
    }

    // Il tooltip ora mostra solo gli eventi specifici del giorno (fatture, ordini, etc.)
    const finalTooltip = eventTooltips.filter(Boolean).join(' | ');

    calendarHTML += `<div class="${dayClasses}" ${finalTooltip ? `title="${finalTooltip}"` : ''}>${day}${eventHTML}</div>`;
  }

  calendarHTML += `</div>`;
  elements.calendarContainer.innerHTML = calendarHTML;
}

export function renderCalendarLegend() {
  if (!elements.calendarLegend) return;

  let legendHTML = `
    <h4 class="font-semibold text-sm mb-2 text-gray-700">Legenda Attività</h4>
  `;

  activityRules.forEach((rule) => {
    legendHTML += `
      <div class="flex items-center gap-2 text-gray-600">
        <span class="w-3 h-3 rounded-sm ${rule.color} border border-gray-300"></span>
        <span>${rule.description}</span>
      </div>
    `;
  });

  elements.calendarLegend.innerHTML = legendHTML;
}
