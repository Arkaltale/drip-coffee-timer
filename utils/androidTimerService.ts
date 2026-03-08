import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

type NativeTimerState = {
  isRunning: boolean;
  isPaused: boolean;
  remainingMs: number;
  endElapsedRealtimeMs: number;
  title: string;
  subtitle: string;
  promotionRequested: boolean;
  canPostPromoted: boolean;
};

type NativeTimerForegroundModule = {
  startTimer(options: { remainingMs: number; title?: string; subtitle?: string }): Promise<boolean>;
  updateTimer(options: { title?: string; subtitle?: string }): Promise<boolean>;
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

export async function startAndroidForegroundTimer(remainingMs: number, title?: string, subtitle?: string): Promise<void> {
  if (!isAvailable() || !timerModule) return;
  await timerModule.startTimer({ remainingMs, title, subtitle });
}

export async function updateAndroidForegroundTimer(title?: string, subtitle?: string): Promise<void> {
  if (!isAvailable() || !timerModule) return;
  await timerModule.updateTimer({ title, subtitle });
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

