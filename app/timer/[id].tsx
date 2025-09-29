import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Recipe, RecipeStep, getRecipeById } from '../../db';
import { Audio } from 'expo-av';
import { addLog } from '../../db';
import CircularProgress from '@/components/CircularProgress';
import { useTheme } from '@/context/ThemeContext';


const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function TimerScreen() {
    const { id } = useLocalSearchParams();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    type TimerState = 'idle' | 'countdown' | 'running' | 'paused';
    const [timerState, setTimerState] = useState<TimerState>('idle');
    const [seconds, setSeconds] = useState(0);
    const [countdown, setCountdown] = useState(3);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isBrewingFinished, setIsBrewingFinished] = useState(false);
    const sound = useRef(new Audio.Sound());
    const { colors } = useTheme();
    const recipeId = parseInt(id as string, 10);

    useEffect(() => {
        if (recipeId) {
            const fetchRecipe = async () => {
                const data = await getRecipeById(recipeId);
                setRecipe(data);
            };
            fetchRecipe();
        }
    }, [id]);

    const stepEndTimes = useMemo(() => {
        if (!recipe) return [];
        let cumulativeTime = 0;
        return recipe?.steps.map(step => {
            cumulativeTime += step.duration;
            return cumulativeTime;
        }) || [];
    }, [recipe]);

    const totalWaterPoured = useMemo(() => {
        if (!recipe) return 0;
        if (isBrewingFinished) {
            return recipe.totalWater;
        }
        return recipe.steps.slice(0, currentStepIndex + 1).reduce((acc, step) => acc + step.waterAmount, 0);
    }, [recipe, currentStepIndex, isBrewingFinished]);

    // 현재 단계의 진행률(0~1)을 계산하는 로직
    const currentStepProgress = useMemo(() => {
        if (!recipe) return 0;

        // 이전 단계들까지의 총 소요 시간
        const previousStepsDuration = recipe.steps
            .slice(0, currentStepIndex)
            .reduce((acc, step) => acc + step.duration, 0);

        const currentStep = recipe.steps[currentStepIndex];
        if (!currentStep) return 1; // 모든 단계 완료 시 1

        const elapsedInStep = seconds - previousStepsDuration;
        if (currentStep.duration === 0) return 1;

        return Math.min(elapsedInStep / currentStep.duration, 1);
    }, [seconds, currentStepIndex, recipe]);

    // 사운드 로딩 useEffect
    useEffect(() => {
        const loadSound = async () => {
            try {
                await sound.current.loadAsync(require('../../assets/sounds/countdown_3sec.mp3'));
            } catch (error) { console.log('사운드 로딩 오류', error); }
        };
        loadSound();
        return () => { sound.current.unloadAsync(); };
    }, []);

    // 시작 카운트다운 useEffect
    useEffect(() => {
        if (timerState !== 'countdown') return;
        const playSoundOnce = async () => {
            try { await sound.current.replayAsync(); } catch (e) { console.log(e); }
        };
        playSoundOnce();

        const interval = setInterval(() => {
            setCountdown(prev => {
                const nextCountdown = prev - 1;
                if (nextCountdown > 0) {
                    return nextCountdown;
                } else {
                    clearInterval(interval);
                    setTimerState('running');
                    return 0;
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timerState]);

    // 메인 타이머 useEffect
    useEffect(() => {
        if (timerState !== 'running') return;

        const interval = setInterval(async () => {
            const nextSecond = seconds + 1;

            if (!isBrewingFinished) {
                if (nextSecond >= stepEndTimes[currentStepIndex]) {
                    if (currentStepIndex < recipe!.steps.length - 1) {
                        setCurrentStepIndex(prev => prev + 1);
                    } else {
                        setIsBrewingFinished(true);
                    }
                }

                const timeUntilNextStep = stepEndTimes[currentStepIndex] - nextSecond;
                if (timeUntilNextStep === 3) {
                    try {
                        await sound.current.replayAsync();
                    } catch (e) { console.log(e); }
                }
            }

            setSeconds(nextSecond);
        }, 1000);

        return () => clearInterval(interval);
    }, [timerState, seconds, currentStepIndex, isBrewingFinished]);


    if (!recipe) {
        return <ActivityIndicator size="large" style={{ flex: 1 }} />;
    }

    const handleMainButtonPress = () => { if (timerState === 'idle') { setTimerState('countdown'); } else if (timerState === 'running') { setTimerState('paused'); } else if (timerState === 'paused') { setTimerState('running'); } };

    const resetTimer = () => {
        setTimerState('idle');
        setSeconds(0);
        setCountdown(3);
        setCurrentStepIndex(0);
        setIsBrewingFinished(false);
    };

    const handleComplete = async () => {
        // 10초 이상 진행된 유의미한 기록일 경우에만 로그 저장
        if (seconds > 10) {
            try {
                await addLog({
                    recipe_name: recipe!.name,
                    bean: recipe!.bean,
                    dripper: recipe!.dripper,
                    grinder: recipe!.grinder,
                    grind_size: recipe!.grindSize,
                    total_time: seconds,
                });
                console.log('브루잉 로그가 성공적으로 저장되었습니다.');
            } catch (e) {
                console.error('로그 저장 실패', e);
            }
        }
        router.replace("/");
    };

    const getButtonText = () => { switch (timerState) { case 'idle': return '시작'; case 'countdown': return '준비중...'; case 'running': return '일시정지'; case 'paused': return '계속'; } };

    const currentStep: RecipeStep | undefined = recipe.steps[currentStepIndex];

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
                    <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(seconds)}</Text>
                </View>
            </View>
            <View style={styles.instructionContainer}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>{isBrewingFinished ? '추출 완료' : (currentStep?.instruction || '브루잉 완료!')}</Text>
                <Text style={[styles.stepDetail, { color: colors.subtext }]}>{isBrewingFinished ? `총 사용량: ${totalWaterPoured}g` : `이번 단계: ${currentStep.waterAmount}g / 총 ${totalWaterPoured}g`}</Text>
            </View>
            <View style={styles.buttonContainer}>
                <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleMainButtonPress} disabled={timerState === 'countdown'}><Text style={styles.buttonText}>{getButtonText()}</Text></Pressable>
                {isBrewingFinished ? (
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
    timerContainer: { borderWidth: 5, borderColor: '#A47551', width: 300, height: 300, borderRadius: 150, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
    timerText: { fontSize: 72, fontWeight: 'bold', color: '#333', textAlign: 'center', lineHeight: 300 },
    countdownText: { fontSize: 120, fontWeight: 'bold', color: '#A47551' },
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