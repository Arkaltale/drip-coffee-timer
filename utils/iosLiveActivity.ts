import { NativeModules, Platform } from 'react-native';

type IosLiveActivityPayload = {
  title: string;
  stepLabels: string[];
  stepEndTimes: number[];
  totalSeconds: number;
  elapsedSeconds: number;
  isPaused: boolean;
};

type IosLiveActivityEndPayload = {
  finalTitle?: string;
  finalSubtitle?: string;
};

type IosLiveActivityModule = {
  isAvailable(): Promise<boolean>;
  startActivity(payload: IosLiveActivityPayload): Promise<boolean>;
  updateActivity(payload: IosLiveActivityPayload): Promise<boolean>;
  endActivity(payload: IosLiveActivityEndPayload): Promise<boolean>;
};

const iosLiveActivityModule = NativeModules.IosLiveActivity as IosLiveActivityModule | undefined;

function hasModule(): boolean {
  return Platform.OS === 'ios' && Boolean(iosLiveActivityModule);
}

export async function isIosLiveActivitySupported(): Promise<boolean> {
  if (!hasModule() || !iosLiveActivityModule) {
    return false;
  }

  try {
    return await iosLiveActivityModule.isAvailable();
  } catch {
    return false;
  }
}

export async function startIosLiveActivity(payload: IosLiveActivityPayload): Promise<boolean> {
  if (!hasModule() || !iosLiveActivityModule) {
    return false;
  }

  try {
    return await iosLiveActivityModule.startActivity(payload);
  } catch {
    return false;
  }
}

export async function updateIosLiveActivity(payload: IosLiveActivityPayload): Promise<boolean> {
  if (!hasModule() || !iosLiveActivityModule) {
    return false;
  }

  try {
    return await iosLiveActivityModule.updateActivity(payload);
  } catch {
    return false;
  }
}

export async function endIosLiveActivity(payload?: IosLiveActivityEndPayload): Promise<boolean> {
  if (!hasModule() || !iosLiveActivityModule) {
    return false;
  }

  try {
    return await iosLiveActivityModule.endActivity(payload ?? {});
  } catch {
    return false;
  }
}
