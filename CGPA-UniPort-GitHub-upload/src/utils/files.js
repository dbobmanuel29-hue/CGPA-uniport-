export function safeExternalUrl(value) {
  const url = new URL(value, location.origin);
  if (!['https:', 'http:'].includes(url.protocol) || (url.protocol === 'http:' && url.origin !== location.origin)) throw new Error('Unsupported external URL.');
  return url.href;
}
export function downloadReportFile(file, name = 'CGPA-Academic-Report.pdf') {
  const a = document.createElement('a');
  const isBlob = file instanceof Blob;
  a.href = isBlob ? URL.createObjectURL(file) : safeExternalUrl(file.url || file);
  a.download = name;
  a.rel = 'noopener';
  a.target = '_blank';
  document.body.append(a); a.click(); a.remove();
  if (isBlob) setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}