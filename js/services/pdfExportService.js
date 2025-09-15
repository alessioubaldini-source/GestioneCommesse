'use strict';

import { state } from '../state.js';
import * as calc from './calculationService.js';
import { formatCurrency } from '../utils.js';
import { showSpinner, hideSpinner } from '../spinner.js';
import { showToast } from '../notifications.js';

// --- Funzioni di supporto ---

function addHeader(doc, commessa) {
  doc.setFontSize(18);
  doc.setTextColor('#2d3748'); // gray-800
  doc.text(`${commessa.nome}`, 14, 20);

  doc.setFontSize(11);
  doc.setTextColor('#4a5568'); // gray-700
  doc.text(`Cliente: ${commessa.cliente}`, 14, 28);

  const ricaviReali = calc.calcolaMontanteFatture(commessa.id);
  const margineUltimo = calc.calcolaMargineUltimoForecast(commessa.id);

  doc.autoTable({
    startY: 32,
    body: [
      ['Stato', 'Tipologia', 'Ricavi Fatturati', 'Margine Ultimo Forecast %'],
      [commessa.stato, commessa.tipologia, formatCurrency(ricaviReali), margineUltimo !== null ? `${margineUltimo.toFixed(2)}%` : 'N/A'],
    ],
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: '#edf2f7', // gray-200
      textColor: '#2d3748', // gray-800
      fontStyle: 'bold',
    },
    bodyStyles: {
      fillColor: '#ffffff',
    },
    margin: { left: 14, right: 14 },
  });

  return doc.autoTable.previous.finalY + 10;
}

function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor('#718096'); // gray-600
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Pagina ${i} di ${pageCount}`, doc.internal.pageSize.width / 2, 287, { align: 'center' });
    doc.text(`Report generato il: ${new Date().toLocaleDateString('it-IT')}`, 14, 287);
  }
}

function addSectionTitle(doc, title, y) {
  doc.setFontSize(14);
  doc.setTextColor('#2d3748');
  doc.text(title, 14, y);
  return y + 8;
}

// --- Funzione Principale di Esportazione ---

export function exportCommessaToPdf(commessaId) {
  if (!commessaId) {
    showToast('Nessuna commessa selezionata.', 'error');
    return;
  }

  const commessa = state.dati.commesse.find((c) => c.id === commessaId);
  if (!commessa) {
    showToast('Commessa non trovata.', 'error');
    return;
  }

  showSpinner();

  // Usa un timeout per permettere allo spinner di essere renderizzato
  setTimeout(() => {
    try {
      // Controlla che le librerie PDF siano state caricate correttamente dal CDN
      if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error('Libreria jsPDF non caricata. Controlla che lo script tag per "jspdf.umd.min.js" sia presente e corretto in index.html.');
        showToast('Errore: la libreria per l-esportazione PDF non è stata caricata.', 'error');
        hideSpinner();
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Controlla che anche il plugin per le tabelle sia carico
      if (typeof doc.autoTable !== 'function') {
        console.error('Plugin jsPDF-AutoTable non caricato. Controlla che lo script per "jspdf.plugin.autotable.js" sia incluso in index.html e che sia posizionato DOPO lo script di jsPDF.');
        showToast('Errore: il plugin per le tabelle PDF non è stato caricato.', 'error');
        hideSpinner();
        return;
      }
      let y = addHeader(doc, commessa);

      // --- Sezione Budget ---
      y = addSectionTitle(doc, 'Budget', y);
      const budgetMasterData = calc.getBudgetMasterData(commessaId);
      const budgetBody = [];
      budgetMasterData.forEach((master) => {
        budgetBody.push([{ content: `Budget: ${master.budgetId} | Mese: ${master.meseCompetenza} | Totale: ${formatCurrency(master.totale)}`, colSpan: 4, styles: { fontStyle: 'bold', fillColor: '#ebf8ff' } }]);
        if (master.type === 'detail') {
          master.items.forEach((item) => {
            budgetBody.push([item.figura, formatCurrency(item.tariffa), item.giorni, formatCurrency(item.tariffa * item.giorni)]);
          });
        }
      });

      if (budgetBody.length > 0) {
        doc.autoTable({
          startY: y,
          head: [['Figura', 'Tariffa', 'Giorni', 'Importo']],
          body: budgetBody,
          theme: 'striped',
          headStyles: { fillColor: '#4299e1' }, // blue-500
          margin: { left: 14, right: 14 },
        });
        y = doc.autoTable.previous.finalY + 10;
      } else {
        doc.setFontSize(10).text('Nessun budget definito.', 14, y);
        y += 10;
      }

      // --- Sezioni Ordini & Fatture ---
      const ordini = state.dati.ordini.filter((o) => o.commessaId === commessaId);
      if (ordini.length > 0) {
        y = addSectionTitle(doc, 'Ordini', y);
        doc.autoTable({
          startY: y,
          head: [['Numero Ordine', 'Data', 'Importo']],
          body: ordini.map((o) => [o.numeroOrdine, new Date(o.data).toLocaleDateString('it-IT'), formatCurrency(o.importo)]),
          theme: 'striped',
          headStyles: { fillColor: '#4299e1' },
          margin: { left: 14, right: 14 },
        });
        y = doc.autoTable.previous.finalY + 10;
      }

      const fatture = state.dati.fatture.filter((f) => f.commessaId === commessaId);
      if (fatture.length > 0) {
        y = addSectionTitle(doc, 'Fatture', y);
        doc.autoTable({
          startY: y,
          head: [['Mese Competenza', 'Data Invio', 'Importo']],
          body: fatture.map((f) => [f.meseCompetenza, new Date(f.dataInvioConsuntivo).toLocaleDateString('it-IT'), formatCurrency(f.importo)]),
          theme: 'striped',
          headStyles: { fillColor: '#4299e1' },
          margin: { left: 14, right: 14 },
        });
        y = doc.autoTable.previous.finalY + 10;
      }

      // --- Sezione Forecast Margini ---
      const margini = state.dati.margini.filter((m) => m.commessaId === commessaId).sort((a, b) => a.mese.localeCompare(b.mese));
      if (margini.length > 0) {
        if (y > 180) {
          // Controlla se c'è abbastanza spazio, altrimenti aggiunge una nuova pagina
          doc.addPage();
          y = 20;
        }
        y = addSectionTitle(doc, 'Forecast Margini', y);

        const marginiBody = margini.map((margine, index) => {
          const prevMargine = index > 0 ? margini[index - 1] : null;
          const costoMensile = prevMargine ? margine.costoConsuntivi - prevMargine.costoConsuntivi : margine.costoConsuntivi;
          const ricavoConsuntivo = calc.calcolaMontanteFattureFinoAlMese(commessaId, margine.mese);
          const marginePerc = ricavoConsuntivo > 0 ? ((ricavoConsuntivo - margine.costoConsuntivi) / ricavoConsuntivo) * 100 : 0;
          const ricavoBudgetTotale = calc.calcolaTotaleBudgetRecent(commessaId);
          const costoBudgetTotaleEAC = ricavoBudgetTotale * (1 - marginePerc / 100);
          const costoStimaAFinireETC = costoBudgetTotaleEAC - margine.costoConsuntivi;
          const percentualeAvanzamentoCosti = costoBudgetTotaleEAC > 0 ? (margine.costoConsuntivi / costoBudgetTotaleEAC) * 100 : 0;
          const ricavoMaturato = ricavoBudgetTotale * (percentualeAvanzamentoCosti / 100);

          return [margine.mese, formatCurrency(margine.costoConsuntivi), formatCurrency(costoMensile), `${marginePerc.toFixed(2)}%`, formatCurrency(costoStimaAFinireETC), `${percentualeAvanzamentoCosti.toFixed(2)}%`, formatCurrency(ricavoMaturato)];
        });

        doc.autoTable({
          startY: y,
          head: [['Mese', 'Costo Cons. Cum.', 'Costo Cons. Mensile', 'Margine %', 'Costo ETC', '% Avanz.', 'Ricavo Maturato']],
          body: marginiBody,
          theme: 'grid',
          headStyles: { fillColor: '#4299e1' },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });
      }

      addFooter(doc);

      const fileName = `Report_Commessa_${commessa.nome.replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);

      showToast('PDF esportato con successo!', 'success');
    } catch (error) {
      console.error('Errore durante la creazione del PDF:', error);
      showToast('Errore durante la creazione del PDF.', 'error');
    } finally {
      hideSpinner();
    }
  }, 50);
}
