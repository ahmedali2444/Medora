export function exportToCsv(filename, headers, rows) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('url' in window ? 'a' : 'a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function printToPdf(title, headers, rows, dir = 'rtl') {
  const printWindow = window.open('', '', 'height=600,width=800');
  
  if (!printWindow) {
    alert("Please allow popups for this site to print.");
    return;
  }

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          ${headers.map(h => `<th style="border: 1px solid #ddd; padding: 8px; text-align: ${dir === 'rtl' ? 'right' : 'left'};">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${row.map(cell => `<td style="border: 1px solid #ddd; padding: 8px;">${cell}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  printWindow.document.write('<html><head><title>' + title + '</title>');
  printWindow.document.write('<style>body{ font-family: sans-serif; padding: 20px; direction: ' + dir + '; }</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write('<h2 style="text-align:center;">' + title + '</h2>');
  printWindow.document.write(tableHtml);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
}
