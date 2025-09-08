'use strict';

import { showSpinner, hideSpinner } from './spinner.js';
import { state } from './state.js';

export function formatCurrency(amount) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
}

export function generateId(array) {
  return array.length > 0 ? Math.max(...array.map((item) => item.id)) + 1 : 1;
}

export function getFilteredCommesse() {
  let filtered = [...state.dati.commesse];

  // Filter by period
  if (state.filters.period !== 'all') {
    const now = new Date();
    let startDate, endDate;

    switch (state.filters.period) {
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
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        endDate = now;
        break;
    }

    if (startDate && endDate) {
      filtered = filtered.filter((c) => {
        const commessaDate = new Date(c.dataInizio);
        return commessaDate >= startDate && commessaDate <= endDate;
      });
    }
  }

  // Filter by client
  if (state.filters.client !== 'all') {
    filtered = filtered.filter((c) => c.cliente === state.filters.client);
  }

  // Filter by status
  if (state.filters.status !== 'all') {
    filtered = filtered.filter((c) => c.stato === state.filters.status);
  }

  // Filter by search
  if (state.filters.search) {
    const search = state.filters.search.toLowerCase();
    filtered = filtered.filter((c) => c.nome.toLowerCase().includes(search) || c.cliente.toLowerCase().includes(search) || c.stato.toLowerCase().includes(search));
  }

  return filtered;
}

export function calcolaTotaleBudget(commessaId) {
  const budgetMasters = state.dati.budgetMaster?.filter((bm) => bm.commessaId === commessaId) || [];
  let total = 0;
  budgetMasters.forEach((master) => {
    const details = state.dati.budget?.filter((b) => b.budgetMasterId === master.id) || [];
    total += details.reduce((sum, b) => sum + b.tariffa * b.giorni, 0);
  });
  return total;
}

export function calcolaTotaleBudgetRecent(commessaId) {
  const budgetMasters = state.dati.budgetMaster?.filter((bm) => bm.commessaId === commessaId) || [];
  if (budgetMasters.length === 0) return 0;

  const latestMaster = budgetMasters.reduce((latest, current) => {
    return current.meseCompetenza > latest.meseCompetenza ? current : latest;
  });

  const details = state.dati.budget?.filter((b) => b.budgetMasterId === latestMaster.id) || [];
  return details.reduce((sum, b) => sum + b.tariffa * b.giorni, 0);
}

export function calcolaMarginCommessa(commessaId) {
  const ricavi = calcolaTotaleBudgetRecent(commessaId);
  const costi = state.dati.margini.filter((m) => m.commessaId === commessaId).reduce((sum, m) => sum + m.costoConsuntivi, 0);

  if (ricavi === 0) return 0;
  return ((ricavi - costi) / ricavi) * 100;
}

export function calcolaMarginRealeCommessa(commessaId) {
  const ricaviReali = calcolaMontanteFatture(commessaId);
  const costiReali = state.dati.margini.filter((m) => m.commessaId === commessaId).reduce((sum, m) => sum + m.costoConsuntivi, 0);

  if (ricaviReali === 0) return 0;
  return ((ricaviReali - costiReali) / ricaviReali) * 100;
}

export function getBudgetMasterData(commessaId) {
  const budgetMasters = state.dati.budgetMaster?.filter((bm) => bm.commessaId === commessaId) || [];

  return budgetMasters
    .map((master) => {
      const details = state.dati.budget?.filter((b) => b.budgetMasterId === master.id) || [];
      const totale = details.reduce((sum, b) => sum + b.tariffa * b.giorni, 0);

      return {
        ...master,
        items: details,
        totale: totale,
      };
    })
    .sort((a, b) => b.meseCompetenza.localeCompare(a.meseCompetenza));
}

export function calcolaTotaleOrdini(commessaId) {
  return state.dati.ordini.filter((o) => o.commessaId === commessaId).reduce((sum, o) => sum + o.importo, 0);
}

export function calcolaMontanteFatture(commessaId) {
  return state.dati.fatture.filter((f) => f.commessaId === commessaId).reduce((sum, f) => sum + f.importo, 0);
}

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

    return {
      label: commessa.nome,
      budget,
      consuntivo,
    };
  });

  return {
    labels: data.map((d) => d.label),
    budget: data.map((d) => d.budget),
    consuntivo: data.map((d) => d.consuntivo),
  };
}

export function getMarginiDistributionData(commesse) {
  const ranges = {
    'Critico (< 30%)': 0,
    'Attenzione (30-35%)': 0,
    'Buono (35-45%)': 0,
    'Eccellente (> 45%)': 0,
  };

  commesse.forEach((commessa) => {
    const margine = calcolaMarginRealeCommessa(commessa.id);

    if (margine < 30) ranges['Critico (< 30%)']++;
    else if (margine < 35) ranges['Attenzione (30-35%)']++;
    else if (margine < 45) ranges['Buono (35-45%)']++;
    else ranges['Eccellente (> 45%)']++;
  });

  return {
    labels: Object.keys(ranges),
    values: Object.values(ranges),
  };
}

export function exportToExcel() {
  showSpinner();
  try {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Dashboard KPI
    const dashboardData = [
      ['DASHBOARD KPI', '', '', ''],
      ['Indicatore', 'Valore', 'Unità', 'Note'],
      ['Ricavi Totali', state.dati.commesse.reduce((acc, c) => acc + calcolaTotaleBudgetRecent(c.id), 0), '€', 'Somma budget di tutte le commesse'],
      ['Costi Totali', state.dati.margini.reduce((acc, m) => acc + m.costoConsuntivi, 0), '€', 'Somma costi consuntivi'],
      ['Margine Totale', '=B3-B4', '€', 'Formula: Ricavi - Costi'],
      ['Margine %', '=IF(B3>0,B5/B3*100,0)', '%', 'Formula: (Ricavi-Costi)/Ricavi*100'],
      ['Commesse Attive', state.dati.commesse.filter((c) => c.stato === 'Attivo').length, 'n.', 'Commesse con stato "Attivo"'],
      ['Fatturato Mese Corrente', state.dati.fatture.filter((f) => f.meseCompetenza === new Date().toISOString().slice(0, 7)).reduce((sum, f) => sum + f.importo, 0), '€', 'Fatture del mese corrente'],
    ];
    const dashboardWS = XLSX.utils.aoa_to_sheet(dashboardData);

    // Formattazione dashboard
    dashboardWS['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 40 }];

    XLSX.utils.book_append_sheet(wb, dashboardWS, 'Dashboard');

    // Sheet 2: Commesse con formule
    const commesseData = [
      ['GESTIONE COMMESSE', '', '', '', '', '', ''],
      ['Nome', 'Cliente', 'Data Inizio', 'Stato', 'Budget Totale €', 'Costi Totali €', 'Margine %'],
      ...state.dati.commesse.map((c, index) => {
        const row = index + 3;
        return [
          c.nome,
          c.cliente,
          c.dataInizio,
          c.stato,
          calcolaTotaleBudgetRecent(c.id),
          state.dati.margini.filter((m) => m.commessaId === c.id).reduce((sum, m) => sum + m.costoConsuntivi, 0),
          `=IF(E${row}>0,(E${row}-F${row})/E${row}*100,0)`, // Formula per margine %
        ];
      }),
    ];

    // Aggiungi riga totali con formule
    const totalRow = commesseData.length + 1;
    commesseData.push(['TOTALI', '', '', '', `=SUM(E3:E${totalRow - 1})`, `=SUM(F3:F${totalRow - 1})`, `=IF(E${totalRow}>0,(E${totalRow}-F${totalRow})/E${totalRow}*100,0)`]);

    const commesseWS = XLSX.utils.aoa_to_sheet(commesseData);
    commesseWS['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];

    XLSX.utils.book_append_sheet(wb, commesseWS, 'Commesse');

    // Sheet 3: Budget dettagliato con formule
    const budgetData = [
      ['BUDGET DETTAGLIATO', '', '', '', '', '', '', ''],
      ['Commessa', 'Budget ID', 'Mese', 'Figura', 'Tariffa €', 'Giorni', 'Importo €', 'Note'],
    ];

    let budgetRowIndex = 3;
    state.dati.budgetMaster?.forEach((master) => {
      const commessa = state.dati.commesse.find((c) => c.id === master.commessaId);
      const details = state.dati.budget?.filter((b) => b.budgetMasterId === master.id) || [];

      // Header del budget
      budgetData.push([commessa?.nome || '', master.budgetId, master.meseCompetenza, 'TOTALE BUDGET', '', '', `=SUM(G${budgetRowIndex + 1}:G${budgetRowIndex + details.length})`, 'Somma automatica dettagli']);
      budgetRowIndex++;

      details.forEach((detail) => {
        budgetData.push([
          '',
          '',
          '',
          detail.figura,
          detail.tariffa,
          detail.giorni,
          `=E${budgetRowIndex}*F${budgetRowIndex}`, // Formula tariffa * giorni
          'Calcolato automaticamente',
        ]);
        budgetRowIndex++;
      });

      budgetData.push(['', '', '', '', '', '', '', '']); // Riga vuota
      budgetRowIndex++;
    });

    const budgetWS = XLSX.utils.aoa_to_sheet(budgetData);
    budgetWS['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 25 }];

    XLSX.utils.book_append_sheet(wb, budgetWS, 'Budget');

    // Sheet 4: Analisi Margini con formule complesse
    const marginiData = [
      ['ANALISI MARGINI DETTAGLIATA', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Commessa', 'Mese', 'Costo Cons. €', 'HH Cons.', 'Costo/HH €', 'Ricavo Cons. €', 'Margine %', 'Budget Tot. €', 'Costo EAC €', 'Costo ETC €', 'Ore ETC', '% Avanz.', 'Ricavo Mat. €', 'ETC Rev. €'],
    ];

    state.dati.margini.forEach((margine, index) => {
      const commessa = state.dati.commesse.find((c) => c.id === margine.commessaId);
      const row = index + 3;
      const ricavoConsuntivo = calcolaMontanteFatture(margine.commessaId);
      const ricavoBudgetTotale = calcolaTotaleBudgetRecent(margine.commessaId);

      marginiData.push([
        commessa?.nome || '',
        margine.mese,
        margine.costoConsuntivi,
        margine.hhConsuntivo,
        `=IF(D${row}>0,C${row}/D${row},0)`, // Costo/HH
        ricavoConsuntivo,
        `=IF(F${row}>0,(F${row}-C${row})/F${row}*100,0)`, // Margine %
        ricavoBudgetTotale,
        `=H${row}*(1-G${row}/100)`, // Costo EAC
        `=I${row}-C${row}`, // Costo ETC
        `=IF(E${row}>0,J${row}/E${row},0)`, // Ore ETC (corretto: ETC/Costo per HH)
        `=IF(I${row}>0,C${row}/I${row}*100,0)`, // % Avanzamento
        `=H${row}*(L${row}/100)`, // Ricavo Maturato
        `=H${row}-M${row}`, // ETC Revenue
      ]);
    });

    const marginiWS = XLSX.utils.aoa_to_sheet(marginiData);
    marginiWS['!cols'] = Array(14).fill({ wch: 12 });

    XLSX.utils.book_append_sheet(wb, marginiWS, 'Analisi Margini');

    // Sheet 5: Ordini e Fatture
    const ordiniFattureData = [
      ['ORDINI E FATTURE', '', '', '', '', '', ''],
      ['ORDINI', '', '', 'FATTURE', '', '', ''],
      ['Commessa', 'Numero', 'Data', 'Commessa', 'Mese', 'Data Invio', 'Importo €'],
    ];

    const maxRows = Math.max(state.dati.ordini.length, state.dati.fatture.length);

    for (let i = 0; i < maxRows; i++) {
      const ordine = state.dati.ordini[i];
      const fattura = state.dati.fatture[i];

      ordiniFattureData.push([
        ordine ? state.dati.commesse.find((c) => c.id === ordine.commessaId)?.nome || '' : '',
        ordine ? ordine.numeroOrdine : '',
        ordine ? ordine.data : '',
        fattura ? state.dati.commesse.find((c) => c.id === fattura.commessaId)?.nome || '' : '',
        fattura ? fattura.meseCompetenza : '',
        fattura ? fattura.dataInvioConsuntivo : '',
        fattura ? fattura.importo : '',
      ]);
    }

    // Aggiungi totali
    const totaliRow = ordiniFattureData.length + 1;
    ordiniFattureData.push(['', '', '', 'TOTALE FATTURE:', '', '', `=SUM(G4:G${totaliRow - 1})`]);

    const ordiniFattureWS = XLSX.utils.aoa_to_sheet(ordiniFattureData);
    ordiniFattureWS['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, ordiniFattureWS, 'Ordini e Fatture');

    // Sheet 6: Pivot Summary
    const pivotData = [
      ['RIEPILOGO PIVOT', '', '', ''],
      ['Cliente', 'Ricavi Totali €', 'Costi Totali €', 'Margine %'],
    ];

    const clientiMap = {};
    state.dati.commesse.forEach((c) => {
      if (!clientiMap[c.cliente]) {
        clientiMap[c.cliente] = { ricavi: 0, costi: 0 };
      }
      clientiMap[c.cliente].ricavi += calcolaTotaleBudgetRecent(c.id);
      clientiMap[c.cliente].costi += state.dati.margini.filter((m) => m.commessaId === c.id).reduce((sum, m) => sum + m.costoConsuntivi, 0);
    });

    Object.entries(clientiMap).forEach(([cliente, data], index) => {
      const row = index + 3;
      pivotData.push([cliente, data.ricavi, data.costi, `=IF(B${row}>0,(B${row}-C${row})/B${row}*100,0)`]);
    });

    const pivotWS = XLSX.utils.aoa_to_sheet(pivotData);
    pivotWS['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];

    XLSX.utils.book_append_sheet(wb, pivotWS, 'Riepilogo Clienti');

    // Metadati
    const metaData = [
      ['METADATI EXPORT', '', ''],
      ['Data Export', new Date().toLocaleString('it-IT'), ''],
      ['Numero Commesse', state.dati.commesse.length, ''],
      ['Numero Budget', (state.dati.budget || []).length, ''],
      ['Numero Ordini', state.dati.ordini.length, ''],
      ['Numero Fatture', state.dati.fatture.length, ''],
      ['Numero Margini', state.dati.margini.length, ''],
      ['', '', ''],
      ['LEGENDA FORMULE', '', ''],
      ['Margine %', '(Ricavi-Costi)/Ricavi*100', ''],
      ['Costo EAC', 'Budget*(1-Margine%/100)', ''],
      ['Ore ETC', 'Costo ETC / Costo per HH', 'FORMULA CORRETTA'],
      ['% Avanzamento', 'Costi Consuntivi/Costo EAC*100', ''],
    ];

    const metaWS = XLSX.utils.aoa_to_sheet(metaData);
    metaWS['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, metaWS, 'Info');

    // Save file
    const fileName = `Gestionale_Commesse_Completo_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    alert('Export Excel avanzato completato con successo!\n\nIl file include:\n- Dashboard KPI\n- Commesse con formule\n- Budget dettagliato\n- Analisi margini corretta\n- Ordini e fatture\n- Riepilogo clienti\n- Metadati e legenda');
  } catch (error) {
    console.error("Errore durante l'export:", error);
    alert("Errore durante l'export Excel. Controlla la console per i dettagli.");
  } finally {
    hideSpinner();
  }
}
