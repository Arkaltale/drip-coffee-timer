import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

type NativeTimerState = {
  isRunning: boolean;
  isPaused: boolean;
  totalDurationMs: number;
  totalRemainingMs: number;
  currentStepRemainingMs: number;
  currentStepIndex: number;
  totalSteps: number;
  endElapsedRealtimeMs: number;
  title: string;
  subtitle: string;
  promotionRequested: boolean;
  canPostPromoted: boolean;
};

type AndroidForegroundTimerOptions = {
  totalDurationMs: number;
  totalRemainingMs: number;
  stepEndTimesMs: number[];
  currentStepIndex: number;
  title?: string;
  subtitle?: string;
};

type NativeTimerForegroundModule = {
  startTimer(options: AndroidForegroundTimerOptions): Promise<boolean>;
  updateTimer(options: Partial<AndroidForegroundTimerOptions>): Promise<boolean>;
  pauseTimer(): Promise<boolean>;
  stopTimer(): Promise<boolean>;
  getState(): Promise<NativeTimerState>;
};

const promotedPermission = 'android.permission.POST_PROMOTED_NOTIFICATIONS';

const timerModule = NativeModules.TimerForeground as NativeTimerForegroundModule | undefined;

const isAvailable = () => Platform.OS === 'android' && Boolean(timerModule);

export async function ensureAndroidTimerNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (Platform.Version >= 33) {
    const postPermission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (postPermission !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

  if (Platform.Version >= 36) {
    try {
      await PermissionsAndroid.request(promotedPermission as any);
    } catch {
      // Ignore: promoted notifications are optional and permission may not exist on this device.
    }
  }

  return true;
}

export async function startAndroidForegroundTimer(options: AndroidForegroundTimerOptions): Promise<void> {
  if (!isAvailable() || !timerModule) return;
  await timerModule.startTimer(options);
}

export async function updateAndroidForegroundTimer(options: Partial<AndroidForegroundTimerOptions>): Promise<void> {
  if (!isAvailable() || !timerModule) return;
  await timerModule.updateTimer(options);
}

export async function pauseAndroidForegroundTimer(): Promise<void> {
  if (!isAvailable() || !timerModule) return;
  await timerModule.pauseTimer();
}

export async function stopAndroidForegroundTimer(): Promise<void> {
  if (!isAvailable() || !timerModule) return;
  await timerModule.stopTimer();
}

export async function getAndroidForegroundTimerState(): Promise<NativeTimerState | null> {
  if (!isAvailable() || !timerModule) return null;
  return timerModule.getState();
}

