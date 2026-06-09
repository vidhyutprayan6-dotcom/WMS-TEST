/** Client-side invoice PDF generation (no backend changes). */
(function (global) {
  function money(n) {
    return '$' + Number(n ?? 0).toFixed(2);
  }

  function buildInvoicePdf(invoice) {
    const { jsPDF } = global.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const d = invoice.data || invoice;
    const client = d.client || {};
    const totals = d.totals || {};
    const lineItems = d.lineItems || [];

    doc.setFontSize(18);
    doc.setTextColor(26, 58, 92);
    doc.text('3PL Storage Invoice', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Client: ${client.name || '—'}`, 14, 30);
    doc.text(`Billing type: ${client.billingType || '—'}`, 14, 36);
    doc.text(`Invoice month: ${d.month || '—'}`, 14, 42);
    doc.text(`Invoice ID: ${d.invoiceId || '—'}`, 14, 48);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 54);

    const rows = lineItems.map((item) => [
      item.description,
      String(item.quantity),
      money(item.rate),
      money(item.amount),
    ]);

    doc.autoTable({
      startY: 62,
      head: [['Description', 'Qty', 'Rate', 'Amount']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [26, 58, 92], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 3: { halign: 'right' }, 2: { halign: 'right' } },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Storage total:    ${money(totals.storage)}`, 120, finalY);
    doc.text(`Inbound total:    ${money(totals.inbound)}`, 120, finalY + 6);
    doc.text(`Outbound total:   ${money(totals.outbound)}`, 120, finalY + 12);
    doc.setFont(undefined, 'bold');
    doc.text(`Grand total:      ${money(totals.grandTotal)}`, 120, finalY + 20);

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
          <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
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
    previewUrl(invoice) {
      const blob = buildInvoicePdf(invoice).output('blob');
      return URL.createObjectURL(blob);
    },
    renderHtml: renderInvoiceHtml,
  };
})(window);
