export function safeExternalUrl(value) {
  const url = new URL(value, location.origin);
  if (!['https:', 'http:'].includes(url.protocol) || (url.protocol === 'http:' && url.origin !== location.origin)) throw new Error('Unsupported external URL.');
  return url.href;
}

function pdfEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7E]/g, '?');
}

function textBlobToPdf(blob) {
  return blob.text().then(text => {
    const lines = text.split(/\r?\n/).flatMap(line => {
      const value = String(line);
      if (value.length <= 92) return [value];
      const chunks = [];
      for (let i = 0; i < value.length; i += 92) chunks.push(value.slice(i, i + 92));
      return chunks;
    }).slice(0, 46);
    const commands = ['BT', '/F1 10 Tf', '50 760 Td', '12 TL'];
    lines.forEach((line, index) => { if (index) commands.push('T*'); commands.push(`(${pdfEscape(line)}) Tj`); });
    commands.push('ET');
    const stream = commands.join('\n');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    ];
    let pdf = '%PDF-1.4\n%CGPA+\n';
    const offsets = [0];
    objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([pdf], { type: 'application/pdf' });
  });
}

export function downloadReportFile(file, name = 'CGPA-Academic-Report.pdf') {
  const finish = pdfFile => {
    const a = document.createElement('a');
    const isBlob = pdfFile instanceof Blob;
    a.href = isBlob ? URL.createObjectURL(pdfFile) : safeExternalUrl(pdfFile.url || pdfFile);
    a.download = name;
    a.rel = 'noopener';
    a.target = '_blank';
    document.body.append(a); a.click(); a.remove();
    if (isBlob) setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  if (file instanceof Blob && file.type === 'text/plain') {
    textBlobToPdf(file).then(finish);
    return;
  }
  finish(file);
}