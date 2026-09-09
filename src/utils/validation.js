export const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
export function validatePassword(value) {
  return value.length >= 8 ? '' : 'Use at least 8 characters.';
}
export function validateCourses(rows, maxPoint = 5) {
  if (!rows.length) return 'Add at least one course to calculate.';
  const seen = new Set();
  for (const [i, row] of rows.entries()) {
    if (!row.code.trim()) return `Enter a course code for row ${i + 1}.`;
    const code = row.code.trim().toUpperCase();
    if (seen.has(code)) return `Course ${code} appears more than once.`;
    seen.add(code);
    if (row.credits === '' || Number(row.credits) <= 0 || !Number.isInteger(Number(row.credits))) return `Enter positive whole credit units for ${code}.`;
    if (row.points === '' || !Number.isFinite(Number(row.points)) || Number(row.points) < 0 || Number(row.points) > maxPoint) return `Grade points for ${code} must be between 0 and ${maxPoint}.`;
  }
  return '';
}