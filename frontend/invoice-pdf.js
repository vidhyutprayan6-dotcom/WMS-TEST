/** Client-side invoice PDF generation — uses vendored jsPDF + pdf.js (no CDN). */
(function (global) {
  function money(n) {
    return '$' + Number(n ?? 0).toFixed(2);
  }

  function getJsPDF() {
    const lib = global.jspdf;
    if (!lib) {
      throw new Error('PDF library not loaded. Run npm run build in frontend/ and refresh.');
    }
    return lib.jsPDF || lib;
  }

  function getPdfJs() {
    const lib = global.pdfjsLib;
    if (!lib) {
      throw new Error('PDF preview library not loaded. Run npm run build in frontend/ and refresh.');
    }
    return lib;
  }

  function buildInvoicePdf(invoice) {
    const jsPDF = getJsPDF();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const d = invoice.data || invoice;
    const client = d.client || {};
    const totals = d.totals || {};
    const lineItems = d.lineItems || [];

    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text('3PL Storage Invoice', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Client: ${client.name || '—'}`, 14, 32);
    doc.text(`Billing type: ${client.billingType || '—'}`, 14, 38);
    doc.text(`Invoice month: ${d.month || '—'}`, 14, 44);
    doc.text(`Invoice ID: ${d.invoiceId || '—'}`, 14, 50);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 56);

    const rows = lineItems.map((item) => [
      item.description,
      String(item.quantity),
      money(item.rate),
      money(item.amount),
    ]);

    if (rows.length === 0) {
      rows.push(['No line items', '—', '—', '—']);
    }

    doc.autoTable({
      startY: 64,
      head: [['Description', 'Qty', 'Rate', 'Amount']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 90, halign: 'left' },
        1: { halign: 'right', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 35 },
      },
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Storage total:`, 120, finalY);
    doc.text(money(totals.storage), 190, finalY, { align: 'right' });
    doc.text(`Inbound total:`, 120, finalY + 7);
    doc.text(money(totals.inbound), 190, finalY + 7, { align: 'right' });
    doc.text(`Outbound total:`, 120, finalY + 14);
    doc.text(money(totals.outbound), 190, finalY + 14, { align: 'right' });

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont(undefined, 'bold');
    doc.text(`Grand total:`, 120, finalY + 24);
    doc.text(money(totals.grandTotal), 190, finalY + 24, { align: 'right' });

    return doc;
  }

  function renderInvoiceHtml(invoice) {
    const d = invoice.data || invoice;
    const client = d.client || {};
    const totals = d.totals || {};
    const rows = (d.lineItems || [])
      .map(
        (item) => `<tr>
          <td>${escape(item.description)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${money(item.rate)}</td>
          <td class="num">${money(item.amount)}</td>
        </tr>`
      )
      .join('');

    return `
      <div class="invoice-preview">
        <div class="invoice-preview-header">
          <h3>3PL Storage Invoice</h3>
          <p class="invoice-meta">${escape(client.name)} · ${escape(d.month || '')} · ${escape(client.billingType || '')}</p>
        </div>
        <table class="data-table invoice-table">
          <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4">No line items</td></tr>'}</tbody>
          <tfoot>
            <tr><td colspan="3">Storage</td><td class="num">${money(totals.storage)}</td></tr>
            <tr><td colspan="3">Inbound handling</td><td class="num">${money(totals.inbound)}</td></tr>
            <tr><td colspan="3">Outbound handling</td><td class="num">${money(totals.outbound)}</td></tr>
            <tr class="total-row"><td colspan="3"><strong>Grand total</strong></td><td class="num"><strong>${money(totals.grandTotal)}</strong></td></tr>
          </tfoot>
        </table>
      </div>`;
  }

  function escape(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function renderFirstPage(invoice) {
    const doc = buildInvoicePdf(invoice);
    const blob = doc.output('blob');
    const arrayBuffer = await blob.arrayBuffer();

    const pdfjs = getPdfJs();
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
    }

    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const scale = 1.6;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    return {
      blob,
      imageDataUrl: canvas.toDataURL('image/png'),
    };
  }

  global.InvoicePdf = {
    build: buildInvoicePdf,
    blob(invoice) {
      return buildInvoicePdf(invoice).output('blob');
    },
    download(invoice, filename) {
      const d = invoice.data || invoice;
      const name = filename || `invoice-${d.month || 'report'}.pdf`;
      buildInvoicePdf(invoice).save(name);
    },
    renderFirstPage,
    renderHtml: renderInvoiceHtml,
  };
})(window);
