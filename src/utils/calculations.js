function finite(value, label, min = 0, max = Infinity) {
  const validType = typeof value === 'number' || typeof value === 'string' && value.trim() !== '';
  if (!validType || !Number.isFinite(Number(value))) throw new RangeError(`${label} must be a number.`);
  const n = Number(value);
  if (n < min || n > max) throw new RangeError(`${label} must be between ${min} and ${max === Infinity ? 'a valid positive value' : max}.`);
  return n;
}

export function calculateQualityPoint(creditUnits, gradePoint, maxPoint = 5) {
  return finite(creditUnits, 'Credit units', 0.01) * finite(gradePoint, 'Grade point', 0, finite(maxPoint, 'Maximum grade point', 1));
}

export function calculateGPA(courses, maxPoint = 5) {
  if (!courses.length) return { gpa: null, totalCourses: 0, totalCreditUnits: 0, totalQualityPoints: 0 };
  const totals = courses.reduce((acc, course) => {
    acc.totalCreditUnits += finite(course.credits, 'Credit units', 0.01);
    acc.totalQualityPoints += calculateQualityPoint(course.credits, course.points, maxPoint);
    return acc;
  }, { totalCreditUnits: 0, totalQualityPoints: 0 });
  return { ...totals, totalCourses: courses.length, gpa: calculateCGPA(totals.totalQualityPoints, totals.totalCreditUnits, maxPoint) };
}

export function calculateCGPA(totalQualityPoints, totalCreditUnits, maxPoint = 5) {
  const units = finite(totalCreditUnits, 'Credit units');
  const points = finite(totalQualityPoints, 'Quality points');
  if (!units) { if (points) throw new RangeError('Quality points require completed credit units.'); return null; }
  const average = points / units;
  if (average > finite(maxPoint, 'Maximum grade point', 1) + 1e-10) throw new RangeError('Quality points exceed the selected grading scale.');
  return average;
}

export function calculateProjectedCGPA(currentCGPA, completedCreditUnits, futureGPA, remainingCreditUnits, maxPoint = 5) {
  const maximum = finite(maxPoint, 'Maximum grade point', 1);
  const current = finite(currentCGPA, 'Current CGPA', 0, maximum);
  const completed = finite(completedCreditUnits, 'Completed units');
  const remaining = finite(remainingCreditUnits, 'Remaining units');
  const future = finite(futureGPA, 'Future GPA', 0, maximum);
  return calculateCGPA(current * completed + future * remaining, completed + remaining, maximum);
}

export function calculateRequiredGPA(currentCGPA, completedCreditUnits, remainingCreditUnits, targetCGPA, maxPoint = 5) {
  const maximum = finite(maxPoint, 'Maximum grade point', 1);
  const current = finite(currentCGPA, 'Current CGPA', 0, maximum);
  const target = finite(targetCGPA, 'Target CGPA', 0, maximum);
  const completed = finite(completedCreditUnits, 'Completed units');
  const remaining = finite(remainingCreditUnits, 'Remaining units');
  if (!completed && !remaining) throw new RangeError('Enter completed or remaining credit units.');
  if (!remaining) return current >= target ? 0 : Infinity;
  return Math.max(0, (target * (completed + remaining) - current * completed) / remaining);
}

export function calculateMaximumAchievableCGPA(currentCGPA, completedCreditUnits, remainingCreditUnits, maxPoint = 5) {
  return calculateProjectedCGPA(currentCGPA, completedCreditUnits, maxPoint, remainingCreditUnits, maxPoint);
}

export function calculateProgress(completed, required) {
  const c = finite(completed, 'Completed units');
  const r = finite(required, 'Required units');
  return r ? Math.min(100, c / r * 100) : null;
}

export function targetOutlook(required, maxPoint = 5) {
  if (!Number.isFinite(required) || required > maxPoint + 1e-10) return { label: 'Impossible', tone: 'danger', description: 'This target is above the maximum possible average for your remaining units.' };
  if (required > maxPoint * 0.9) return { label: 'Difficult', tone: 'warning', description: 'A stretch target. You would need to average above 90% of the planning scale.' };
  return { label: 'Achievable', tone: 'success', description: 'Mathematically achievable under your assumptions. It is not a guarantee of performance.' };
}