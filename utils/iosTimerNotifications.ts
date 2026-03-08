import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let isConfigured = false;

function ensureConfigured() {
  if (Platform.OS !== 'ios' || isConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  isConfigured = true;
}

export async function ensureIosTimerNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }

  ensureConfigured();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
      allowProvisional: true,
    },
  });

  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function scheduleIosTimerCompletionNotification(
  title: string,
  body: string,
  secondsFromNow: number
): Promise<string | null> {
  if (Platform.OS !== 'ios') {
    return null;
  }

  if (secondsFromNow <= 0) {
    return null;
  }

  const granted = await ensureIosTimerNotificationPermission();
  if (!granted) {
    return null;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.floor(secondsFromNow)),
    },
  });

  return id;
}

export async function cancelIosTimerNotification(id: string | null | undefined): Promise<void> {
  if (Platform.OS !== 'ios' || !id) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(id);
}
