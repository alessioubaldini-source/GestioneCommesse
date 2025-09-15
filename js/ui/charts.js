'use strict';

import { state } from '../state.js';
import { elements } from '../dom.js';
import * as utils from '../utils.js';
import * as chartService from '../services/chartService.js';
import * as calcService from '../services/calculationService.js';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

let clientChartListenerAdded = false;

export function updateCharts() {
  // Aggiunge l'event listener per il dropdown del grafico "Ricavi per", ma solo una volta.
  if (!clientChartListenerAdded) {
    const clientChartGroupBySelect = document.getElementById('client-chart-group-by');
    if (clientChartGroupBySelect) {
      // Quando il dropdown cambia, riesegue solo l'aggiornamento dei grafici.
      clientChartGroupBySelect.addEventListener('change', updateCharts);
      clientChartListenerAdded = true;
    }
  }

  const filteredCommesse = calcService.getFilteredCommesse();
  const { startDate, endDate } = calcService.getPeriodDateRange(state.filters.period);

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
  const monthlyData = chartService.getMonthlyTrendData(filteredCommesse);
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
  const budgetConsuntivoData = chartService.getBudgetVsConsuntivoData(filteredCommesse, startDate, endDate);
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
  const groupBy = document.getElementById('client-chart-group-by')?.value || 'cliente';
  const dataMap = new Map();
  filteredCommesse.forEach((commessa) => {
    let key;
    switch (groupBy) {
      case 'tipologia':
        key = commessa.tipologia;
        break;
      case 'cliente_tipologia':
        key = `${commessa.cliente} - ${commessa.tipologia}`;
        break;
      case 'cliente':
      default:
        key = commessa.cliente;
        break;
    }

    // Salta se la chiave non è valida (es. tipologia non definita o vuota)
    if (!key) return;

    const revenue = calcService.calcolaMontanteFatture(commessa.id);
    const currentInfo = dataMap.get(key) || { revenue: 0, count: 0 };
    currentInfo.revenue += revenue;
    currentInfo.count += 1;
    dataMap.set(key, currentInfo);
  });

  const clientData = Array.from(dataMap, ([label, data]) => ({ label, value: data.revenue, count: data.count })).filter((d) => d.value > 0); // Filtra clienti con ricavi > 0

  if (clientData.length === 0) {
    clientData.push({ label: 'Nessun dato', value: 1, count: 0 });
  }

  // Correzione: ripristinato getContext('2d') che era stato rimosso per errore
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
              const dataPoint = clientData[context.dataIndex];
              const commesseCount = dataPoint.count;
              const commesseLabel = commesseCount === 1 ? 'commessa' : 'commesse';
              return `${context.label}: ${utils.formatCurrency(context.raw)} (${commesseCount} ${commesseLabel})`;
            },
          },
        },
      },
    },
  });

  // Aggiorna la legenda testuale del grafico
  const legendTextEl = document.getElementById('client-chart-legend-text');
  if (legendTextEl) {
    const legendMap = { cliente: 'per ogni cliente.', tipologia: 'per ogni tipologia di commessa.', cliente_tipologia: 'per combinazione di cliente e tipologia.' };
    legendTextEl.textContent = `Mostra la distribuzione dei ricavi totali (somma delle fatture) ${legendMap[groupBy] || 'per ogni cliente.'}`;
  }

  // Margini Chart
  const { sogliaMargineEccellente, sogliaMargineAttenzione, sogliaMargineCritico } = state.config;

  const distributionCategories = {
    critico: { label: `Critico (<${sogliaMargineCritico}%)`, count: 0 },
    attenzione: { label: `Attenzione (${sogliaMargineCritico}-${sogliaMargineAttenzione}%)`, count: 0 },
    buono: { label: `Buono (${sogliaMargineAttenzione}-${sogliaMargineEccellente}%)`, count: 0 },
    eccellente: { label: `Eccellente (>${sogliaMargineEccellente}%)`, count: 0 },
  };

  filteredCommesse.forEach((commessa) => {
    const margine = calcService.calcolaMargineUltimoForecast(commessa.id);
    if (margine === null) return; // Skip commesse without forecast

    if (margine < sogliaMargineCritico) {
      distributionCategories.critico.count++;
    } else if (margine < sogliaMargineAttenzione) {
      distributionCategories.attenzione.count++;
    } else if (margine <= sogliaMargineEccellente) {
      distributionCategories.buono.count++;
    } else {
      distributionCategories.eccellente.count++;
    }
  });

  const marginiData = {
    labels: Object.values(distributionCategories).map((c) => c.label),
    values: Object.values(distributionCategories).map((c) => c.count),
  };
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
          // Aggiunge un po' di spazio sopra la barra più alta per l'etichetta.
          // Se il valore massimo è > 0, aggiunge 2, altrimenti imposta il massimo a 5 per dare respiro al grafico vuoto.
          suggestedMax: Math.max(...marginiData.values) > 0 ? Math.max(...marginiData.values) + 2 : 5,
        },
        x: {
          ticks: { color: labelColor },
          grid: { color: gridColor },
        },
      },
    },
    // Aggiungo il plugin per mostrare i valori sopra le barre
    plugins: [
      {
        id: 'custom_data_labels',
        afterDatasetsDraw: (chart) => {
          const { ctx } = chart;
          ctx.save();
          // Usa un colore leggibile e un font consistente
          ctx.font = '600 12px "Inter", sans-serif, system-ui';
          ctx.fillStyle = labelColor; // Usa lo stesso colore delle etichette degli assi
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          chart.getDatasetMeta(0).data.forEach((bar, index) => {
            const value = chart.data.datasets[0].data[index];
            if (value > 0) {
              // Posiziona il testo sopra la barra
              ctx.fillText(value, bar.x, bar.y - 5);
            }
          });
          ctx.restore();
        },
      },
    ],
  });
}
