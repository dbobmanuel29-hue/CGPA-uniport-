// Backend-supplied rules are the only source of institutional classifications.
export const OFFICIAL_GRADING = null;
export const PLANNING_SCALE = Object.freeze({
  maxPoint: 5,
  label: '5-point planning scale',
  disclaimer: 'An illustrative planning scale, not a verified UniPort grading policy. Enter grade points from your own result sheet.',
  classifications: [],
});

export function classify(value, rules = OFFICIAL_GRADING) {
  if (value == null || !Number.isFinite(Number(value))) return 'Calculate to view classification';
  if (!rules?.classifications?.length) return 'Awaiting grading policy';
  return [...rules.classifications].sort((a, b) => b.min - a.min).find(b => value >= b.min)?.label || 'Not classified';
}

export function planningClassification(value, rules, maxPoint) {
  if (rules?.maxPoint && Number(rules.maxPoint) !== Number(maxPoint)) return 'Planning scale differs from academic policy';
  return classify(value, rules);
}