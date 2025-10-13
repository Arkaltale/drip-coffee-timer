import { useTheme } from '@/context/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addRecipe, Recipe } from '../db';

type StepForm = {
  instruction: string;
  duration: string;
  waterAmount: string;
};

type RecipeFormData = {
  name: string;
  bean: string;
  grinder: string;
  dripper: string;
  grindSize: string | number;
  steps: StepForm[];
};

export default function CreateRecipeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [formData, setFormData] = useState<RecipeFormData>({
    name: '',
    bean: '',
    grinder: '',
    dripper: '',
    grindSize: '',
    steps: [{ instruction: '', duration: '', waterAmount: '' }] 
  });

  const handleMainInfoChange = (field: keyof Omit<RecipeFormData, 'steps'>, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStepChange = (index: number, field: keyof StepForm, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index][field] = value;
    setFormData(prev => ({ ...prev, steps: newSteps }));
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, { instruction: '', duration: '', waterAmount: '' }]
    }));
  };

  const removeStep = (index: number) => {
    if (formData.steps.length <= 1) {
      Alert.alert("알림", "최소 한 개 이상의 단계가 필요합니다.");
      return;
    }
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, steps: newSteps }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("오류", "레시피 이름을 입력해주세요.");
      return;
    }

    const stepsWithNumbers = formData.steps.map(step => ({
      ...step,
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

    await addRecipe(recipeToSave);
    Alert.alert("성공", "레시피가 성공적으로 저장되었습니다.");
    router.back();
  };

  return (
    <SafeAreaView style={[styles.flexContainer, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: '새 레시피 만들기',
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.text,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.flexContainer, { backgroundColor: colors.background }]}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.label, { color: colors.text }]}>레시피 이름</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={formData.name}
            onChangeText={(text) => handleMainInfoChange('name', text)}
            placeholder="예: 데일리 모닝 레시피"
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
            placeholder="예: 35"
            placeholderTextColor={colors.subtext}
          />

          <View style={styles.stepsHeader}>
            <Text style={[styles.label, { color: colors.text }]}>추출 단계</Text>
            <Pressable onPress={addStep} style={styles.addStepButton}>
              <Text style={[styles.addStepButtonText, { color: colors.text }]}>단계 추가</Text>
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
                value={step.duration}
                onChangeText={(text) => handleStepChange(index, 'duration', text)}
                placeholder="시간(초)"
                keyboardType="numeric"
                placeholderTextColor={colors.subtext}
              />
              <TextInput
                style={[styles.input, styles.stepInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={step.waterAmount}
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
            <Text style={styles.saveButtonText}>레시피 저장하기</Text>
          </Pressable>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  container: { flex: 1, padding: 10 },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  input: {
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
  },
  stepsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addStepButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  addStepButtonText: { fontWeight: 'bold' },
  stepContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  stepInput: {
    marginBottom: 10,
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  saveButtonContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});