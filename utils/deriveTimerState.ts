export type TimerStepLike = {
  duration: number;
  instruction?: string;
};

export type DerivedTimerState = {
  stepEndTimes: number[];
  totalElapsedSec: number;
  totalDurationSec: number;
  totalRemainingSec: number;
  totalSteps: number;
  currentStepIndex: number;
  currentStepStartSec: number;
  currentStepEndSec: number;
  currentStepDurationSec: number;
  currentStepElapsedSec: number;
  currentStepRemainingSec: number;
  isFinished: boolean;
};

export function getStepEndTimes(steps: TimerStepLike[]): number[] {
  let cumulativeTime = 0;

  return steps.map((step) => {
    cumulativeTime += Math.max(0, step.duration);
    return cumulativeTime;
  });
}

export function getStepIndexFromElapsed(stepEndTimes: number[], elapsedSeconds: number): number {
  if (stepEndTimes.length === 0) {
    return 0;
  }

  for (let index = 0; index < stepEndTimes.length; index += 1) {
    if (elapsedSeconds < stepEndTimes[index]) {
      return index;
    }
  }

  return stepEndTimes.length - 1;
}

export function deriveTimerState(
  steps: TimerStepLike[],
  elapsedSeconds: number,
  totalDurationOverride?: number
): DerivedTimerState {
  const stepEndTimes = getStepEndTimes(steps);
  const computedTotalDuration = stepEndTimes[stepEndTimes.length - 1] ?? 0;
  const totalDurationSec = Math.max(computedTotalDuration, totalDurationOverride ?? 0);
  const clampedElapsedSec = Math.max(0, Math.min(totalDurationSec, elapsedSeconds));
  const totalRemainingSec = Math.max(0, totalDurationSec - clampedElapsedSec);
  const isFinished = steps.length === 0 || clampedElapsedSec >= totalDurationSec;

  const currentStepIndex =
    steps.length === 0 ? 0 : getStepIndexFromElapsed(stepEndTimes, clampedElapsedSec);
  const currentStepEndSec = stepEndTimes[currentStepIndex] ?? totalDurationSec;
  const currentStepStartSec = currentStepIndex > 0 ? stepEndTimes[currentStepIndex - 1] ?? 0 : 0;
  const currentStepDurationSec = Math.max(0, currentStepEndSec - currentStepStartSec);

  const currentStepElapsedSec = isFinished
    ? currentStepDurationSec
    : Math.max(0, Math.min(currentStepDurationSec, clampedElapsedSec - currentStepStartSec));

  const currentStepRemainingSec = isFinished
    ? 0
    : Math.max(0, currentStepEndSec - clampedElapsedSec);

  return {
    stepEndTimes,
    totalElapsedSec: clampedElapsedSec,
    totalDurationSec,
    totalRemainingSec,
    totalSteps: steps.length,
    currentStepIndex,
    currentStepStartSec,
    currentStepEndSec,
    currentStepDurationSec,
    currentStepElapsedSec,
    currentStepRemainingSec,
    isFinished,
  };
}
