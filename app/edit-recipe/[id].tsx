import { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, Pressable, ScrollView,
    Alert, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { getRecipeById, updateRecipe, Recipe } from '../../db';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

type RecipeFormData = {
    name: string;
    bean: string;
    grinder: string;
    dripper: string;
    grindSize: string | number;
    steps: {
        instruction: string;
        duration: string | number;
        waterAmount: string | number;
    }[];
};

export default function EditRecipeScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const recipeId = parseInt(id as string, 10);
    const { colors } = useTheme();

    const [formData, setFormData] = useState<RecipeFormData | null>(null);

    useEffect(() => {
        const fetchRecipe = async () => {
            const existingRecipe = await getRecipeById(recipeId);
            if (existingRecipe) {
                setFormData({
                    ...existingRecipe,
                    grindSize: existingRecipe.grindSize.toString(),
                    steps: existingRecipe.steps.map(s => ({
                        ...s,
                        duration: s.duration.toString(),
                        waterAmount: s.waterAmount.toString()
                    }))
                });
            }
        };
        fetchRecipe();
    }, [recipeId]);

    const handleMainInfoChange = (field: keyof Omit<RecipeFormData, 'steps'>, value: string) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleStepChange = (index: number, field: keyof RecipeFormData['steps'][0], value: string) => {
        if (!formData) return;
        const newSteps = [...formData.steps];
        // @ts-ignore
        newSteps[index][field] = value;
        setFormData(prev => ({ ...prev!, steps: newSteps }));
    };

    const addStep = () => {
        if (!formData) return;
        setFormData(prev => ({
            ...prev!,
            steps: [...prev!.steps, { instruction: '', duration: '', waterAmount: '' }]
        }));
    };

    const removeStep = (index: number) => {
        if (!formData || formData.steps.length <= 1) {
            Alert.alert("알림", "최소 한 개 이상의 단계가 필요합니다.");
            return;
        }
        const newSteps = formData.steps.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev!, steps: newSteps }));
    };

    const handleSave = async () => {
        if (!formData || !formData.name.trim()) {
            Alert.alert("오류", "레시피 이름을 입력해주세요.");
            return;
        }

        const stepsWithNumbers = formData.steps.map(step => ({
            instruction: step.instruction,
            duration: Number(step.duration) || 0,
            waterAmount: Number(step.waterAmount) || 0,
        }));

        const totalWater = stepsWithNumbers.reduce((sum, step) => sum + step.waterAmount, 0);
        const totalTime = stepsWithNumbers.reduce((sum, step) => sum + step.duration, 0);

        const recipeToSave: Omit<Recipe, 'id'> = {
            name: formData.name,
            bean: formData.bean,
            grinder: formData.grinder,
            dripper: formData.dripper,
            grindSize: Number(formData.grindSize) || 0,
            steps: stepsWithNumbers,
            totalWater,
            totalTime,
        };

        try {
            await updateRecipe(recipeId, recipeToSave);
            Alert.alert("성공", "레시피가 성공적으로 수정되었습니다.");
            router.back();
        } catch (error) {
            Alert.alert("오류", "레시피 수정 중 오류가 발생했습니다.");
        }
    };

    if (!formData) {
        return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
            <Stack.Screen
                options={{
                    title: '레시피 수정',
                    headerStyle: { backgroundColor: colors.card },
                    headerTitleStyle: { color: colors.text },
                    headerTintColor: colors.text,
                }}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[styles.container, { backgroundColor: colors.background }]}
                keyboardVerticalOffset={90}
            >
                <ScrollView
                    style={[styles.scrollContainer, { backgroundColor: colors.background }]}
                    contentInsetAdjustmentBehavior="never"
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={[styles.label, { color: colors.text }]}>레시피 이름</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        value={formData.name}
                        onChangeText={(text) => handleMainInfoChange('name', text)}
                        placeholder="예: 하리오 V60 데일리"
                        placeholderTextColor={colors.subtext}
                    />

                    <Text style={[styles.label, { color: colors.text }]}>원두 정보</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        value={formData.bean}
                        onChangeText={(text) => handleMainInfoChange('bean', text)}
                        placeholder="예: 에티오피아 예가체프 G2"
                        placeholderTextColor={colors.subtext}
                    />

                    <Text style={[styles.label, { color: colors.text }]}>그라인더 정보</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        value={formData.grinder}
                        onChangeText={(text) => handleMainInfoChange('grinder', text)}
                        placeholder="예: 코만단테 C40"
                        placeholderTextColor={colors.subtext}
                    />

                    <Text style={[styles.label, { color: colors.text }]}>드리퍼 정보</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        value={formData.dripper}
                        onChangeText={(text) => handleMainInfoChange('dripper', text)}
                        placeholder="예: 하리오 V60"
                        placeholderTextColor={colors.subtext}
                    />

                    <Text style={[styles.label, { color: colors.text }]}>분쇄도 (클릭)</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        value={formData.grindSize.toString()}
                        onChangeText={(text) => handleMainInfoChange('grindSize', text)}
                        keyboardType="numeric"
                        placeholderTextColor={colors.subtext}
                    />

                    <View style={styles.stepsHeader}>
                        <Text style={[styles.label, { color: colors.text }]}>추출 단계</Text>
                        <Pressable onPress={addStep} style={styles.addStepButton}>
                            <Text style={styles.addStepButtonText}>단계 추가</Text>
                        </Pressable>
                    </View>

                    {formData.steps.map((step, index) => (
                        <View key={index} style={[styles.stepContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, styles.stepInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                value={step.instruction}
                                onChangeText={(text) => handleStepChange(index, 'instruction', text)}
                                placeholder="단계 설명 (예: 뜸들이기)"
                                placeholderTextColor={colors.subtext}
                            />
                            <TextInput
                                style={[styles.input, styles.stepInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                value={step.duration.toString()}
                                onChangeText={(text) => handleStepChange(index, 'duration', text)}
                                placeholder="시간(초)"
                                keyboardType="numeric"
                                placeholderTextColor={colors.subtext}
                            />
                            <TextInput
                                style={[styles.input, styles.stepInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                value={step.waterAmount.toString()}
                                onChangeText={(text) => handleStepChange(index, 'waterAmount', text)}
                                placeholder="물 양(g)"
                                keyboardType="numeric"
                                placeholderTextColor={colors.subtext}
                            />
                            <Pressable onPress={() => removeStep(index)} style={styles.removeButton}>
                                <FontAwesome name="trash" size={20} color="#ff4d4d" />
                            </Pressable>
                        </View>
                    ))}
                    <View style={[styles.saveButtonContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                        <Pressable style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>수정 완료</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        paddingHorizontal: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 8
    },
    input: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 8,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },
    stepsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    addStepButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#eef',
        borderRadius: 8
    },
    addStepButtonText: {
        color: '#44f',
        fontWeight: 'bold'
    },
    stepContainer: {
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
        marginBottom: 10,
        borderColor: '#ddd',
        borderWidth: 1,
    },
    stepInput: {
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    removeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
    },
    saveButtonContainer: {
        padding: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
    },
    saveButton: {
        backgroundColor: '#A47551',
        paddingVertical: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
});