'use strict';

import { state } from '../state.js';
import { elements } from '../dom.js';
import { getFilteredCommesse } from '../services/calculationService.js';

export const CALENDAR_COLOR_OPTIONS = [
  { name: 'Giallo', value: 'bg-yellow-100' },
  { name: 'Verde', value: 'bg-green-100' },
  { name: 'Indaco', value: 'bg-indigo-100' },
  { name: 'Viola', value: 'bg-purple-200' },
  { name: 'Rosso', value: 'bg-red-100' },
  { name: 'Azzurro', value: 'bg-sky-200' },
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
            <div class="flex items-center space-x-2">
                <button id="prev-month-btn" class="p-1 rounded-full hover:bg-gray-200" title="Mese precedente">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <button id="today-btn" class="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200" title="Vai a oggi">Oggi</button>
                <button id="next-month-btn" class="p-1 rounded-full hover:bg-gray-200" title="Mese successivo">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
                <button data-modal-type="configureRules" class="p-1 rounded-full hover:bg-gray-200" title="Configura Regole Calendario">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995s.145.755.438.995l1.003.827c.48.398.668 1.05.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.127c-.331.183-.581.495-.644.87l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-.995s-.145-.755-.437-.995l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.127.332-.183.582-.495.644-.87l.213-1.281z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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

  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    const dayEvents = events.filter((e) => e.day === day);
    const eventTooltips = dayEvents.map((e) => e.title);

    let dayClasses = 'py-2 rounded-lg relative cursor-default text-center';
    let eventHTML = '';

    const dayDate = new Date(year, month, day);
    const dayOfWeek = dayDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Domenica, 6 = Sabato

    // Cerca una regola di attività corrispondente per il giorno corrente
    const matchingRule = state.dati.activityRules?.find((rule) => day >= rule.startDay && day <= rule.endDay);

    // Imposta stile in base al fatto che sia oggi o un giorno di attività
    if (isToday) {
      dayClasses += ' bg-blue-600 text-white font-bold';
    } else if (matchingRule && !isWeekend) {
      // Se non è oggi, c'è una regola e non è un weekend, applica lo sfondo dell'attività
      dayClasses += ` ${matchingRule.color}`;
    }

    if (dayEvents.length > 0) {
      // Se c'è un evento di tipo fattura o ordine, il puntino è blu. Altrimenti usa il colore del primo evento.
      const hasFinancialEvent = dayEvents.some((e) => e.type === 'fattura' || e.type === 'ordine');
      const dotColor = hasFinancialEvent ? 'bg-blue-600' : dayEvents[0].color;
      // Il tooltip viene ora gestito dal div genitore per unificare le informazioni
      eventHTML = `<div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 ${dotColor} rounded-full"></div>`;
    }

    // Costruisci il tooltip finale, includendo la regola di attività se presente
    const tooltipParts = [...eventTooltips];
    if (matchingRule && !isWeekend) {
      tooltipParts.push(`Attività: ${matchingRule.description}`);
    }
    const finalTooltip = tooltipParts.filter(Boolean).join('&#10;');

    calendarHTML += `<div class="${dayClasses}" ${finalTooltip ? `data-tooltip="${finalTooltip}"` : ''}>${day}${eventHTML}</div>`;
  }

  calendarHTML += `</div>`;
  elements.calendarContainer.innerHTML = calendarHTML;

  // Attach event listeners for calendar navigation
  document.getElementById('prev-month-btn')?.addEventListener('click', () => {
    state.calendar.currentDate.setMonth(state.calendar.currentDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('today-btn')?.addEventListener('click', () => {
    state.calendar.currentDate = new Date();
    renderCalendar();
  });
  document.getElementById('next-month-btn')?.addEventListener('click', () => {
    state.calendar.currentDate.setMonth(state.calendar.currentDate.getMonth() + 1);
    renderCalendar();
  });

  // --- Custom Tooltip Logic ---
  const tooltipElement = document.getElementById('custom-tooltip');
  if (!tooltipElement) return; // Safety check

  const calendarGrid = elements.calendarContainer.querySelector('.grid.grid-cols-7');
  if (!calendarGrid) return;

  calendarGrid.addEventListener('mouseover', (e) => {
    const dayCell = e.target.closest('[data-tooltip]');
    if (dayCell && dayCell.dataset.tooltip) {
      // Sostituisce il carattere a-capo (\n) con un tag <br> per il rendering HTML
      const tooltipText = dayCell.dataset.tooltip.replace(/\n/g, '<br>');
      tooltipElement.innerHTML = tooltipText;
      tooltipElement.classList.remove('hidden');
    }
  });

  calendarGrid.addEventListener('mousemove', (e) => {
    // Muove il tooltip solo se è visibile
    if (!tooltipElement.classList.contains('hidden')) {
      // Posiziona il tooltip con un leggero offset rispetto al cursore
      tooltipElement.style.left = `${e.pageX + 15}px`;
      tooltipElement.style.top = `${e.pageY + 15}px`;
    }
  });

  calendarGrid.addEventListener('mouseout', () => {
    tooltipElement.classList.add('hidden');
  });
}

export function renderCalendarLegend() {
  if (!elements.calendarLegend) return;

  let legendHTML = `
    <h4 class="font-semibold text-sm mb-2 text-gray-700">Legenda Attività Mensili</h4>
  `;

  state.dati.activityRules?.forEach((rule) => {
    legendHTML += `
      <div class="flex items-center gap-2 text-gray-600">
        <span class="w-3 h-3 rounded-sm ${rule.color} border border-gray-300"></span>
        <span>${rule.description}</span>
      </div>
    `;
  });

  elements.calendarLegend.innerHTML = legendHTML;
}
