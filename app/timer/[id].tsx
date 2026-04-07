import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform, View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Recipe, RecipeStep, getRecipeById } from '../../db';
import { Audio } from 'expo-av';
import { addLog } from '../../db';
import CircularProgress from '@/components/CircularProgress';
import { useTheme } from '@/context/ThemeContext';
import { deriveTimerState } from '@/utils/deriveTimerState';
import {
  ensureAndroidTimerNotificationPermission,
  getAndroidForegroundTimerState,
  pauseAndroidForegroundTimer,
  startAndroidForegroundTimer,
  stopAndroidForegroundTimer,
} from '@/utils/androidTimerService';
import {
  cancelIosTimerNotification,
  scheduleIosTimerCompletionNotification,
} from '@/utils/iosTimerNotifications';
import {
  endIosLiveActivity,
  isIosLiveActivitySupported,
  startIosLiveActivity,
  updateIosLiveActivity,
} from '@/utils/iosLiveActivity';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

type TimerState = 'idle' | 'countdown' | 'running' | 'paused';

export default function TimerScreen() {
  const { id } = useLocalSearchParams();
  const rawId = Array.isArray(id) ? id[0] : id;
  const recipeId = Number(rawId);
  const hasValidId = Number.isInteger(recipeId) && recipeId > 0;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMissing, setIsMissing] = useState(false);

  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [countdown, setCountdown] = useState(3);

  const sound = useRef(new Audio.Sound());
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const previousTimerStateRef = useRef<TimerState>('idle');
  const previousIosTimerStateRef = useRef<TimerState>('idle');
  const iosCompletionNotificationIdRef = useRef<string | null>(null);
  const backgroundedAtMsRef = useRef<number | null>(null);
  const secondsRef = useRef(0);
  const iosLiveActivityStartedRef = useRef(false);
  const iosLiveActivitySupportedRef = useRef<boolean | null>(null);

  const { colors } = useTheme();

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    let isMounted = true;

    const fetchRecipe = async () => {
      if (!hasValidId) {
        if (isMounted) {
          setIsMissing(true);
          setIsLoading(false);
        }
        return;
      }

      const data = await getRecipeById(recipeId);
      if (!isMounted) return;

      if (data) {
        setRecipe(data);
        setIsMissing(false);
      } else {
        setRecipe(null);
        setIsMissing(true);
      }

      setIsLoading(false);
    };

    fetchRecipe();
    return () => {
      isMounted = false;
    };
  }, [hasValidId, recipeId]);

  const derivedTimerState = useMemo(
    () => deriveTimerState(recipe?.steps ?? [], seconds, recipe?.totalTime),
    [recipe, seconds]
  );

  const applyElapsedSeconds = useCallback(
    (elapsedSeconds: number) => {
      if (!recipe) return;

      const clampedSeconds = Math.max(0, Math.min(recipe.totalTime, elapsedSeconds));
      setSeconds(clampedSeconds);
    },
    [recipe]
  );

  const totalWaterPoured = useMemo(() => {
    if (!recipe) return 0;
    if (derivedTimerState.isFinished) {
      return recipe.totalWater;
    }

    return recipe.steps
      .slice(0, derivedTimerState.currentStepIndex + 1)
      .reduce((acc, step) => acc + step.waterAmount, 0);
  }, [recipe, derivedTimerState.currentStepIndex, derivedTimerState.isFinished]);

  const currentStepProgress = useMemo(() => {
    if (!recipe) return 0;
    if (derivedTimerState.currentStepDurationSec <= 0) return 1;

    return Math.min(
      derivedTimerState.currentStepElapsedSec / derivedTimerState.currentStepDurationSec,
      1
    );
  }, [recipe, derivedTimerState.currentStepDurationSec, derivedTimerState.currentStepElapsedSec]);

  const getForegroundSubtitle = useCallback(() => {
    if (!recipe) return '';
    return '';
  }, [recipe]);

  const syncFromForegroundTimer = useCallback(async () => {
    if (!recipe || Platform.OS !== 'android') return;

    try {
      const state = await getAndroidForegroundTimerState();
      if (!state) return;
      if (!state.isRunning && !state.isPaused) return;

      const remainingSeconds = Math.ceil(Math.max(0, state.totalRemainingMs) / 1000);
      const elapsedSeconds = Math.max(0, Math.min(recipe.totalTime, recipe.totalTime - remainingSeconds));
      applyElapsedSeconds(elapsedSeconds);

      const restoredState: TimerState = state.isRunning ? 'running' : 'paused';
      previousTimerStateRef.current = restoredState;
      setTimerState(restoredState);
    } catch (error) {
      console.log('Foreground timer sync failed', error);
    }
  }, [applyElapsedSeconds, recipe]);

  useEffect(() => {
    const loadSound = async () => {
      try {
        await sound.current.loadAsync(require('../../assets/sounds/countdown_3sec.mp3'));
      } catch (error) {
        console.log('사운드 로딩 오류', error);
      }
    };

    loadSound();
    return () => {
      sound.current.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (!recipe) return;
    void syncFromForegroundTimer();
  }, [recipe, syncFromForegroundTimer]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appState.current;
      const isGoingBackground = nextState === 'inactive' || nextState === 'background';

      if (isGoingBackground && timerState === 'running') {
        backgroundedAtMsRef.current = Date.now();
      }

      appState.current = nextState;
      const wasBackground = previousState === 'inactive' || previousState === 'background';

      if (!wasBackground || nextState !== 'active') {
        return;
      }

      if (Platform.OS === 'android') {
        void syncFromForegroundTimer();
        return;
      }

      if (Platform.OS === 'ios' && timerState === 'running' && recipe) {
        const backgroundedAt = backgroundedAtMsRef.current;
        backgroundedAtMsRef.current = null;

        if (!backgroundedAt) {
          return;
        }

        const elapsedBackgroundSeconds = Math.floor((Date.now() - backgroundedAt) / 1000);
        if (elapsedBackgroundSeconds <= 0) {
          return;
        }

        applyElapsedSeconds(secondsRef.current + elapsedBackgroundSeconds);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [applyElapsedSeconds, recipe, syncFromForegroundTimer, timerState]);

  useEffect(() => {
    if (timerState !== 'countdown') return;

    const playSoundOnce = async () => {
      try {
        await sound.current.replayAsync();
      } catch (e) {
        console.log(e);
      }
    };
    playSoundOnce();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        const nextCountdown = prev - 1;
        if (nextCountdown > 0) {
          return nextCountdown;
        }

        clearInterval(interval);
        setTimerState('running');
        return 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState]);

  useEffect(() => {
    if (timerState !== 'running' || !recipe) return;

    const interval = setInterval(() => {
      setSeconds((prev) => Math.min(prev + 1, recipe.totalTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState, recipe]);

  useEffect(() => {
    if (timerState !== 'running' || !recipe || derivedTimerState.isFinished) return;

    const currentStepEndTime = derivedTimerState.currentStepEndSec;
    if (currentStepEndTime === undefined) {
      return;
    }

    const timeUntilNextStep = currentStepEndTime - seconds;
    if (timeUntilNextStep === 3) {
      sound.current.replayAsync().catch((e) => console.log(e));
    }
  }, [timerState, recipe, derivedTimerState.isFinished, derivedTimerState.currentStepEndSec, seconds]);

  useEffect(() => {
    if (!recipe || Platform.OS !== 'android') return;

    const previousState = previousTimerStateRef.current;
    if (previousState === timerState) return;

    previousTimerStateRef.current = timerState;

    const syncBackgroundService = async () => {
      try {
        if (timerState === 'running') {
          const granted = await ensureAndroidTimerNotificationPermission();
          if (!granted) return;

          if (derivedTimerState.totalRemainingSec <= 0 || derivedTimerState.isFinished) {
            await stopAndroidForegroundTimer();
            return;
          }

          await startAndroidForegroundTimer({
            totalDurationMs: recipe.totalTime * 1000,
            totalRemainingMs: derivedTimerState.totalRemainingSec * 1000,
            stepEndTimesMs: derivedTimerState.stepEndTimes.map((time) => time * 1000),
            currentStepIndex: derivedTimerState.currentStepIndex,
            title: recipe.name,
            subtitle: getForegroundSubtitle(),
          });
          return;
        }

        if (timerState === 'paused') {
          await pauseAndroidForegroundTimer();
          return;
        }

        if (timerState === 'idle') {
          await stopAndroidForegroundTimer();
        }
      } catch (error) {
        console.log('Foreground timer bridge error', error);
      }
    };

    void syncBackgroundService();
  }, [timerState, recipe, derivedTimerState, getForegroundSubtitle]);

  useEffect(() => {
    if (Platform.OS !== 'android' || timerState !== 'running' || !derivedTimerState.isFinished) return;

    void stopAndroidForegroundTimer();
  }, [timerState, derivedTimerState.isFinished]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !recipe) return;

    let cancelled = false;
    const stepLabels = recipe.steps.map((step, index) => {
      if (step.instruction.trim().length > 0) {
        return step.instruction;
      }

      return `단계 ${index + 1}`;
    });

    const syncLiveActivity = async () => {
      if (iosLiveActivitySupportedRef.current === null) {
        iosLiveActivitySupportedRef.current = await isIosLiveActivitySupported();
      }

      if (!iosLiveActivitySupportedRef.current) {
        return;
      }

      const shouldKeepLiveActivity =
        (timerState === 'running' || timerState === 'paused') && !derivedTimerState.isFinished;
      if (shouldKeepLiveActivity) {
        const payload = {
          title: recipe.name,
          stepLabels,
          stepEndTimes: derivedTimerState.stepEndTimes,
          totalSeconds: recipe.totalTime,
          elapsedSeconds: derivedTimerState.totalElapsedSec,
          isPaused: timerState === 'paused',
        };

        if (!iosLiveActivityStartedRef.current) {
          const started = await startIosLiveActivity(payload);
          if (!cancelled) {
            iosLiveActivityStartedRef.current = started;
          }
        } else {
          await updateIosLiveActivity(payload);
        }

        return;
      }

      if (iosLiveActivityStartedRef.current) {
        await endIosLiveActivity(
          derivedTimerState.isFinished
            ? { finalTitle: `${recipe.name} 추출 완료`, finalSubtitle: '브루잉 타이머가 완료되었습니다.' }
            : { finalTitle: `${recipe.name} 타이머 종료`, finalSubtitle: '타이머가 중지되었습니다.' }
        );

        if (!cancelled) {
          iosLiveActivityStartedRef.current = false;
        }
      }
    };

    void syncLiveActivity();

    return () => {
      cancelled = true;
    };
  }, [timerState, derivedTimerState.isFinished, recipe]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !recipe) return;

    const previousState = previousIosTimerStateRef.current;
    previousIosTimerStateRef.current = timerState;

    const syncIosNotification = async () => {
      if (timerState !== 'running' || derivedTimerState.isFinished) {
        await cancelIosTimerNotification(iosCompletionNotificationIdRef.current);
        iosCompletionNotificationIdRef.current = null;
        return;
      }

      if (previousState === 'running') {
        return;
      }

      const remainingSeconds = Math.max(0, derivedTimerState.totalRemainingSec);
      if (remainingSeconds <= 0) {
        return;
      }

      await cancelIosTimerNotification(iosCompletionNotificationIdRef.current);
      iosCompletionNotificationIdRef.current = await scheduleIosTimerCompletionNotification(
        `${recipe.name} 추출 완료`,
        '브루잉 타이머가 완료되었습니다.',
        remainingSeconds
      );
    };

    void syncIosNotification();
  }, [timerState, derivedTimerState.isFinished, derivedTimerState.totalRemainingSec, recipe]);

  useEffect(() => {
    return () => {
      void stopAndroidForegroundTimer();
      void cancelIosTimerNotification(iosCompletionNotificationIdRef.current);
      iosCompletionNotificationIdRef.current = null;
      void endIosLiveActivity({ finalTitle: '브루잉 타이머 종료' });
    };
  }, []);

  if (isLoading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  if (isMissing || !recipe) {
    return (
      <View style={[styles.emptyStateContainer, { backgroundColor: colors.background }]}> 
        <Stack.Screen
          options={{
            title: '레시피 없음',
            headerStyle: { backgroundColor: colors.card },
            headerTitleStyle: { color: colors.text },
            headerTintColor: colors.text,
          }}
        />
        <Text style={[styles.emptyStateText, { color: colors.text }]}>브루잉할 레시피를 찾을 수 없습니다.</Text>
        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>홈으로 돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  const handleMainButtonPress = () => {
    if (derivedTimerState.isFinished) {
      return;
    }

    if (timerState === 'idle') {
      setTimerState('countdown');
    } else if (timerState === 'running') {
      setTimerState('paused');
    } else if (timerState === 'paused') {
      setTimerState('running');
    }
  };

  const resetTimer = () => {
    setTimerState('idle');
    setSeconds(0);
    setCountdown(3);
    void stopAndroidForegroundTimer();
    void cancelIosTimerNotification(iosCompletionNotificationIdRef.current);
    iosCompletionNotificationIdRef.current = null;
    void endIosLiveActivity({ finalTitle: `${recipe.name} 타이머 초기화` });
    iosLiveActivityStartedRef.current = false;
  };

  const handleComplete = async () => {
    if (seconds > 10) {
      try {
        await addLog({
          recipe_name: recipe.name,
          bean: recipe.bean,
          dripper: recipe.dripper,
          grinder: recipe.grinder,
          grind_size: recipe.grindSize,
          total_time: seconds,
        });
        console.log('브루잉 로그가 성공적으로 저장되었습니다.');
      } catch (e) {
        console.error('로그 저장 실패', e);
      }
    }

    await stopAndroidForegroundTimer();
    await cancelIosTimerNotification(iosCompletionNotificationIdRef.current);
    iosCompletionNotificationIdRef.current = null;
    await endIosLiveActivity({
      finalTitle: `${recipe.name} 추출 완료`,
      finalSubtitle: '브루잉 타이머가 완료되었습니다.',
    });
    iosLiveActivityStartedRef.current = false;
    router.replace('/');
  };

  const getButtonText = () => {
    if (derivedTimerState.isFinished) {
      return '완료';
    }

    switch (timerState) {
      case 'idle':
        return '시작';
      case 'countdown':
        return '준비중...';
      case 'running':
        return '일시정지';
      case 'paused':
        return '계속';
    }
  };

  const currentStep: RecipeStep | undefined = recipe.steps[derivedTimerState.currentStepIndex];
  const currentStepWaterAmount = currentStep?.waterAmount ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: `${recipe.name} 브루잉`,
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.text,
        }}
      />
      <View style={styles.timerContainer}>
        <CircularProgress
          size={300}
          strokeWidth={15}
          progress={currentStepProgress}
          backgroundColor={colors.border}
          progressColor={colors.primary}
        />
        <View style={StyleSheet.absoluteFillObject}>
          <Text style={[styles.timerText, { color: colors.text }]}>
            {timerState === 'countdown'
              ? String(countdown)
              : formatTime(derivedTimerState.currentStepRemainingSec)}
          </Text>
        </View>
      </View>
      <View style={styles.instructionContainer}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {derivedTimerState.isFinished ? '추출 완료' : currentStep?.instruction || '브루잉 완료!'}
        </Text>
        <Text style={[styles.stepDetail, { color: colors.subtext }]}>
          {derivedTimerState.isFinished
            ? `총 사용량: ${totalWaterPoured}g`
            : `이번 단계: ${currentStepWaterAmount}g / 총 ${totalWaterPoured}g`}
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleMainButtonPress}
          disabled={timerState === 'countdown' || derivedTimerState.isFinished}
        >
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </Pressable>
        {derivedTimerState.isFinished ? (
          <Pressable style={[styles.button, styles.completeButton]} onPress={handleComplete}>
            <Text style={styles.buttonText}> 완료 </Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.button, styles.resetButton]} onPress={resetTimer}>
            <Text style={styles.buttonText}>초기화</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    marginBottom: 20,
  },
  timerContainer: { borderWidth: 5, borderColor: '#A47551', width: 300, height: 300, borderRadius: 150, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  timerText: { fontSize: 72, fontWeight: 'bold', color: '#333', textAlign: 'center', lineHeight: 300 },
  instructionContainer: { marginBottom: 40, alignItems: 'center' },
  stepTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  stepDetail: { fontSize: 20, color: '#555', marginTop: 8 },
  buttonContainer: { flexDirection: 'row' },
  button: { backgroundColor: '#A47551', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 10, marginHorizontal: 10 },
  resetButton: { backgroundColor: '#888' },
  completeButton: {
    backgroundColor: '#34a853',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
