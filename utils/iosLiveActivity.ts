import * as LiveActivity from 'expo-live-activity';
import { NativeModulesProxy } from 'expo-modules-core';
import { Platform } from 'react-native';

type IosLiveActivityPayload = {
  title: string;
  subtitle?: string;
  totalSeconds: number;
  remainingSeconds: number;
  stepLabel?: string;
  isPaused?: boolean;
};

type IosLiveActivityEndPayload = {
  finalTitle?: string;
  finalSubtitle?: string;
};

const LIVE_ACTIVITY_CONFIG: LiveActivity.LiveActivityConfig = {
  backgroundColor: '#2A2018',
  titleColor: '#F8F2EA',
  subtitleColor: '#D7C8B4',
  progressViewTint: '#C78A4A',
  progressViewLabelColor: '#F8F2EA',
  timerType: 'digital',
};

let currentActivityId: string | null = null;

function parseIosVersion(): { major: number; minor: number } | null {
  if (Platform.OS !== 'ios') {
    return null;
  }

  if (typeof Platform.Version === 'number') {
    return { major: Platform.Version, minor: 0 };
  }

  const versionRaw = String(Platform.Version ?? '');
  const [majorPart = '0', minorPart = '0'] = versionRaw.split('.');
  const major = Number(majorPart);
  const minor = Number(minorPart);

  if (!Number.isFinite(major) || !Number.isFinite(minor)) {
    return null;
  }

  return { major, minor };
}

function isAtLeastIos16_2(): boolean {
  const version = parseIosVersion();
  if (!version) {
    return false;
  }

  return version.major > 16 || (version.major === 16 && version.minor >= 2);
}

function hasNativeLiveActivityModule(): boolean {
  return Boolean((NativeModulesProxy as Record<string, unknown>)?.ExpoLiveActivity);
}

function getProgress(totalSeconds: number, remainingSeconds: number): number {
  if (totalSeconds <= 0) {
    return 1;
  }

  const elapsedSeconds = totalSeconds - remainingSeconds;
  return Math.min(1, Math.max(0, elapsedSeconds / totalSeconds));
}

function buildLiveActivityState(payload: IosLiveActivityPayload): LiveActivity.LiveActivityState {
  const progress = getProgress(payload.totalSeconds, payload.remainingSeconds);
  const title = payload.title || 'Brew Timer';
  const subtitle = payload.subtitle ?? payload.stepLabel;

  return {
    title,
    subtitle,
    progressBar: payload.isPaused
      ? { progress }
      : { date: Date.now() + Math.max(0, payload.remainingSeconds) * 1000 },
  };
}

function buildFinalState(payload?: IosLiveActivityEndPayload): LiveActivity.LiveActivityState {
  return {
    title: payload?.finalTitle ?? 'Brew Timer Ended',
    subtitle: payload?.finalSubtitle,
    progressBar: { progress: 1 },
  };
}

export async function isIosLiveActivitySupported(): Promise<boolean> {
  return Platform.OS === 'ios' && isAtLeastIos16_2() && hasNativeLiveActivityModule();
}

export async function startIosLiveActivity(payload: IosLiveActivityPayload): Promise<boolean> {
  if (!(await isIosLiveActivitySupported())) {
    return false;
  }

  try {
    if (currentActivityId) {
      await LiveActivity.updateActivity(currentActivityId, buildLiveActivityState(payload));
      return true;
    }

    const activityId = LiveActivity.startActivity(buildLiveActivityState(payload), LIVE_ACTIVITY_CONFIG);
    if (!activityId) {
      return false;
    }

    currentActivityId = activityId;
    return true;
  } catch {
    return false;
  }
}

export async function updateIosLiveActivity(payload: IosLiveActivityPayload): Promise<boolean> {
  if (!(await isIosLiveActivitySupported())) {
    return false;
  }

  try {
    if (!currentActivityId) {
      const activityId = LiveActivity.startActivity(buildLiveActivityState(payload), LIVE_ACTIVITY_CONFIG);
      if (!activityId) {
        return false;
      }

      currentActivityId = activityId;
      return true;
    }

    await LiveActivity.updateActivity(currentActivityId, buildLiveActivityState(payload));
    return true;
  } catch {
    return false;
  }
}

export async function endIosLiveActivity(payload?: IosLiveActivityEndPayload): Promise<boolean> {
  if (!(await isIosLiveActivitySupported()) || !currentActivityId) {
    return false;
  }

  try {
    await LiveActivity.stopActivity(currentActivityId, buildFinalState(payload));
    currentActivityId = null;
    return true;
  } catch {
    return false;
  }
}
