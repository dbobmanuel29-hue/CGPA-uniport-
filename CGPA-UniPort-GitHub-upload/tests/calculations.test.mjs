import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateQualityPoint, calculateGPA, calculateCGPA, calculateProjectedCGPA,
  calculateRequiredGPA, calculateMaximumAchievableCGPA, calculateProgress, targetOutlook,
} from '../src/utils/calculations.js';
import { validateCourses } from '../src/utils/validation.js';
import { classify, planningClassification } from '../src/data/grading.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('quality points multiply supplied credits and supplied grade points', () => {
  assert.equal(calculateQualityPoint(3, 5), 15);
  close(calculateQualityPoint(3, 3.67), 11.01);
});
test('GPA is credit-weighted, not an average of course grades', () => {
  const result = calculateGPA([{ credits: 3, points: 5 }, { credits: 1, points: 3 }]);
  assert.equal(result.gpa, 4.5);
  assert.equal(result.totalCreditUnits, 4);
  assert.equal(result.totalQualityPoints, 18);
  assert.equal(result.totalCourses, 2);
});
test('the clearly labelled homepage example totals 4.75', () => {
  const result = calculateGPA([{ credits: 3, points: 5 }, { credits: 2, points: 4 }, { credits: 3, points: 5 }]);
  assert.equal(result.gpa, 4.75);
  assert.equal(result.totalCreditUnits, 8);
  assert.equal(result.totalQualityPoints, 38);
});
test('an empty calculation does not manufacture a zero GPA', () => {
  assert.equal(calculateGPA([]).gpa, null);
  assert.equal(calculateCGPA(0, 0), null);
});
test('zero grades remain valid input', () => {
  assert.equal(calculateGPA([{ credits: 3, points: 0 }]).gpa, 0);
});
test('CGPA preserves precision until display formatting', () => {
  close(calculateCGPA(110, 30), 11 / 3);
});
test('invalid, negative and out-of-scale numbers are rejected', () => {
  assert.throws(() => calculateQualityPoint(-1, 4), RangeError);
  assert.throws(() => calculateQualityPoint(2, 6), RangeError);
  assert.throws(() => calculateQualityPoint('', 4), RangeError);
  assert.throws(() => calculateQualityPoint('  ', 4), RangeError);
  assert.throws(() => calculateQualityPoint(true, 4), RangeError);
  assert.throws(() => calculateCGPA(10, 0), RangeError);
  assert.throws(() => calculateCGPA(40, 5), RangeError);
  assert.throws(() => calculateGPA([{ credits: 3, points: NaN }]), RangeError);
});
test('projection combines current and future credit-weighted points', () => {
  assert.equal(calculateProjectedCGPA(3.5, 60, 4.5, 60), 4);
  assert.equal(calculateProjectedCGPA(4, 100, 0, 0), 4);
});
test('required GPA and maximum CGPA detect an impossible target', () => {
  assert.equal(calculateRequiredGPA(3.5, 60, 60, 4.5), 5.5);
  assert.equal(calculateMaximumAchievableCGPA(3.5, 60, 60), 4.25);
  assert.equal(targetOutlook(5.5).label, 'Impossible');
});
test('a mathematically secured target never produces negative required GPA', () => {
  assert.equal(calculateRequiredGPA(5, 100, 20, 4), 0);
});
test('no remaining credits is handled without dividing by zero', () => {
  assert.equal(calculateRequiredGPA(4, 100, 0, 4), 0);
  assert.equal(calculateRequiredGPA(4, 100, 0, 5), Infinity);
  assert.throws(() => calculateRequiredGPA(0, 0, 0, 4), RangeError);
  assert.throws(() => calculateRequiredGPA(3, 20, 20, 4, NaN), RangeError);
});
test('difficulty is planning guidance relative to the selected scale', () => {
  assert.equal(targetOutlook(4.5).label, 'Achievable');
  assert.equal(targetOutlook(4.6).label, 'Difficult');
  assert.equal(targetOutlook(3.7, 4).label, 'Difficult');
});
test('progress remains bounded and unknown requirements stay unknown', () => {
  close(calculateProgress(2, 3), 200 / 3);
  assert.equal(calculateProgress(150, 100), 100);
  assert.equal(calculateProgress(0, 0), null);
});
test('course validation detects duplicate codes and invalid credits', () => {
  assert.notEqual(validateCourses([{ code: 'TEST', credits: 3, points: 4 }, { code: 'test', credits: 3, points: 4 }]), '');
  assert.notEqual(validateCourses([{ code: 'TEST', credits: 1.5, points: 4 }]), '');
  assert.equal(validateCourses([{ code: 'TEST', credits: '3', points: '0' }]), '');
});
test('classifications are never invented or applied to the wrong scale', () => {
  assert.equal(classify(4.75), 'Awaiting grading policy');
  const fixture = { maxPoint: 5, classifications: [{ min: 4, label: 'Test classification' }] };
  assert.equal(planningClassification(3.8, fixture, 4), 'Planning scale differs from academic policy');
  assert.equal(classify(null, fixture), 'Calculate to view classification');
});