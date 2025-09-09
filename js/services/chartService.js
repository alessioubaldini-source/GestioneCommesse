'use strict';

import { state } from '../state.js';
import { calcolaTotaleBudgetRecent, calcolaMarginRealeCommessa } from './calculationService.js';

export function getMonthlyTrendData(commesse) {
  const monthlyData = {};

  // Aggregate fatture by month
  state.dati.fatture
    .filter((f) => commesse.some((c) => c.id === f.commessaId))
    .forEach((fattura) => {
      const month = fattura.meseCompetenza;
      if (!monthlyData[month]) {
        monthlyData[month] = { ricavi: 0, costi: 0 };
      }
      monthlyData[month].ricavi += fattura.importo;
    });

  // Group margini by commessa to calculate monthly delta
  const marginiByCommessa = state.dati.margini.reduce((acc, m) => {
    if (commesse.some((c) => c.id === m.commessaId)) {
      if (!acc[m.commessaId]) {
        acc[m.commessaId] = [];
      }
      acc[m.commessaId].push(m);
    }
    return acc;
  }, {});

  // Calculate monthly costs and aggregate
  for (const commessaId in marginiByCommessa) {
    const commessaMargini = marginiByCommessa[commessaId].sort((a, b) => a.mese.localeCompare(b.mese));
    for (let i = 0; i < commessaMargini.length; i++) {
      const current = commessaMargini[i];
      const previous = commessaMargini[i - 1];
      const monthlyCost = previous ? current.costoConsuntivi - previous.costoConsuntivi : current.costoConsuntivi;

      if (!monthlyData[current.mese]) monthlyData[current.mese] = { ricavi: 0, costi: 0 };
      monthlyData[current.mese].costi += monthlyCost;
    }
  }

  const sortedMonths = Object.keys(monthlyData).sort();

  return {
    labels: sortedMonths,
    ricavi: sortedMonths.map((month) => monthlyData[month].ricavi),
    costi: sortedMonths.map((month) => monthlyData[month].costi),
  };
}

export function getBudgetVsConsuntivoData(commesse, startDate, endDate) {
  const data = commesse.map((commessa) => {
    const budget = calcolaTotaleBudgetRecent(commessa.id);

    let consuntivoPeriodo = 0;
    const commessaMargini = state.dati.margini.filter((m) => m.commessaId === commessa.id).sort((a, b) => a.mese.localeCompare(b.mese)); // Sort ascending

    for (let i = 0; i < commessaMargini.length; i++) {
      const current = commessaMargini[i];
      const itemDate = new Date(current.mese + '-02');

      if (!startDate || !endDate || (itemDate >= startDate && itemDate <= endDate)) {
        const previous = commessaMargini[i - 1];
        const monthlyCost = previous ? current.costoConsuntivi - previous.costoConsuntivi : current.costoConsuntivi;
        consuntivoPeriodo += monthlyCost;
      }
    }

    return { label: commessa.nome, budget, consuntivo: consuntivoPeriodo };
  });

  return {
    labels: data.map((d) => d.label),
    budget: data.map((d) => d.budget),
    consuntivo: data.map((d) => d.consuntivo),
  };
}
