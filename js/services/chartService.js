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

  // Aggregate margini by month
  state.dati.margini
    .filter((m) => commesse.some((c) => c.id === m.commessaId))
    .forEach((margine) => {
      const month = margine.mese;
      if (!monthlyData[month]) {
        monthlyData[month] = { ricavi: 0, costi: 0 };
      }
      monthlyData[month].costi += margine.costoConsuntivi;
    });

  const sortedMonths = Object.keys(monthlyData).sort();

  return {
    labels: sortedMonths,
    ricavi: sortedMonths.map((month) => monthlyData[month].ricavi),
    costi: sortedMonths.map((month) => monthlyData[month].costi),
  };
}

export function getBudgetVsConsuntivoData(commesse) {
  const data = commesse.map((commessa) => {
    const budget = calcolaTotaleBudgetRecent(commessa.id);
    const consuntivo = state.dati.margini.filter((m) => m.commessaId === commessa.id).reduce((sum, m) => sum + m.costoConsuntivi, 0);

    return { label: commessa.nome, budget, consuntivo };
  });

  return {
    labels: data.map((d) => d.label),
    budget: data.map((d) => d.budget),
    consuntivo: data.map((d) => d.consuntivo),
  };
}

export function getMarginiDistributionData(commesse) {
  const { sogliaMargineCritico, sogliaMargineAttenzione, sogliaMargineEccellente } = state.config;

  const rangeLabels = {
    critico: `Critico (< ${sogliaMargineCritico}%)`,
    attenzione: `Attenzione (${sogliaMargineCritico}-${sogliaMargineAttenzione}%)`,
    buono: `Buono (${sogliaMargineAttenzione}-${sogliaMargineEccellente}%)`,
    eccellente: `Eccellente (> ${sogliaMargineEccellente}%)`,
  };

  const ranges = { [rangeLabels.critico]: 0, [rangeLabels.attenzione]: 0, [rangeLabels.buono]: 0, [rangeLabels.eccellente]: 0 };

  commesse.forEach((commessa) => {
    const margine = calcolaMarginRealeCommessa(commessa.id);
    if (margine < sogliaMargineCritico) ranges[rangeLabels.critico]++;
    else if (margine < sogliaMargineAttenzione) ranges[rangeLabels.attenzione]++;
    else if (margine < sogliaMargineEccellente) ranges[rangeLabels.buono]++;
    else ranges[rangeLabels.eccellente]++;
  });

  return { labels: Object.keys(ranges), values: Object.values(ranges) };
}
