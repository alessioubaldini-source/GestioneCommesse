'use strict';

export const state = {
  dati: null,
  selectedCommessa: null,
  currentModalType: '',
  editingId: null,
  filters: {
    period: 'all',
    client: 'all',
    status: 'all',
    tipologia: 'all',
    search: '',
  },
  charts: {
    clientChart: null,
    revenueChart: null,
    trendChart: null,
    budgetVsConsuntivoChart: null,
    marginiChart: null,
  },
  pagination: {
    commesse: {
      currentPage: 1,
      itemsPerPage: 10,
      totalPages: 1,
    },
  },
  config: {
    sogliaMargineAttenzione: 35,
    sogliaMargineCritico: 30,
    sogliaMargineEccellente: 45,
    defaultFilters: {
      period: 'all',
      client: 'all',
      status: 'all',
      tipologia: 'all',
    },
  },
  calendar: {
    currentDate: new Date(),
  },
};
