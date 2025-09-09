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

export function updateCharts() {
  const filteredCommesse = calcService.getFilteredCommesse();

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
  const budgetConsuntivoData = chartService.getBudgetVsConsuntivoData(filteredCommesse);
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
    // Usa il montante delle fatture per i ricavi reali per cliente.
    const revenue = calcService.calcolaMontanteFatture(commessa.id);
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
  const marginiData = chartService.getMarginiDistributionData(filteredCommesse);
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
