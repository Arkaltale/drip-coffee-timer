import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveTimerState } from '../utils/deriveTimerState';

const steps = [
  { duration: 30, instruction: 'Bloom' },
  { duration: 45, instruction: 'First pour' },
  { duration: 15, instruction: 'Finish' },
];

test('derives the first step immediately after the timer starts', () => {
  const derived = deriveTimerState(steps, 0);

  assert.equal(derived.currentStepIndex, 0);
  assert.equal(derived.currentStepRemainingSec, 30);
  assert.equal(derived.totalRemainingSec, 90);
  assert.equal(derived.isFinished, false);
});

test('derives a middle step countdown', () => {
  const derived = deriveTimerState(steps, 40);

  assert.equal(derived.currentStepIndex, 1);
  assert.equal(derived.currentStepStartSec, 30);
  assert.equal(derived.currentStepDurationSec, 45);
  assert.equal(derived.currentStepElapsedSec, 10);
  assert.equal(derived.currentStepRemainingSec, 35);
});

test('moves to the next step exactly on a step boundary', () => {
  const derived = deriveTimerState(steps, 30);

  assert.equal(derived.currentStepIndex, 1);
  assert.equal(derived.currentStepElapsedSec, 0);
  assert.equal(derived.currentStepRemainingSec, 45);
});

test('marks the timer as finished at the end of the recipe', () => {
  const derived = deriveTimerState(steps, 90);

  assert.equal(derived.currentStepIndex, 2);
  assert.equal(derived.currentStepRemainingSec, 0);
  assert.equal(derived.totalRemainingSec, 0);
  assert.equal(derived.isFinished, true);
});

test('skips over zero-duration steps without breaking the current step countdown', () => {
  const derived = deriveTimerState(
    [
      { duration: 0, instruction: 'Instant bloom' },
      { duration: 20, instruction: 'Pour' },
    ],
    0
  );

  assert.equal(derived.currentStepIndex, 1);
  assert.equal(derived.currentStepRemainingSec, 20);
  assert.equal(derived.currentStepDurationSec, 20);
});
