import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, Link } from 'expo-router';
import { getRecipeById, deleteRecipe, Recipe } from '../../db';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export default function RecipeDetailScreen() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
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

  const handleDelete = () => {
    Alert.alert(
      "레시피 삭제",
      `'${recipe?.name}' 레시피를 정말로 삭제하시겠습니까?`,
      [
        {
          text: "취소",
          style: "cancel"
        },
        {
          text: "삭제",
          onPress: async () => {
            try {
              await deleteRecipe(recipeId);
              Alert.alert("성공", "레시피가 삭제되었습니다.");
              router.back();
            } catch (error) {
              Alert.alert("오류", "레시피를 삭제하는 중 오류가 발생했습니다.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };


  if (!recipe) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  const startBrewing = () => {
    router.push(`/timer/${id}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: recipe.name,
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text }, 
          headerTintColor: colors.text,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 20 }}>
                <Link href={`/edit-recipe/${recipeId}`} asChild>
                    <Pressable> 
                        <FontAwesome name="pencil" size={24} color={colors.icon} />
                    </Pressable>
                </Link>
                <Pressable onPress={handleDelete}>
                    <FontAwesome name="trash" size={24} color="#ff4d4d" />
                </Pressable>
            </View>
          )
        }} 
      />
      
      <View style={styles.infoContainer}>
        <Text style={[styles.label, { color: colors.text }]}>원두:</Text>
        <Text style={[styles.infoText, { color: colors.subtext }]}>{recipe.bean}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.label, { color: colors.text }]}>그라인더:</Text>
        <Text style={[styles.infoText, { color: colors.subtext }]}>{`${recipe.grinder} (${recipe.grindSize}클릭)`}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.label, { color: colors.text }]}>드리퍼:</Text>
        <Text style={[styles.infoText, { color: colors.subtext }]}>{recipe.dripper}</Text>
      </View>
      
      <View style={[styles.stepsContainer, { borderTopColor: colors.border }]}>
        <Text style={[styles.stepsTitle, { color: colors.text }]}>브루잉 순서</Text>
        {recipe.steps.map((step, index) => (
          <View key={index} style={styles.stepItem}>
            <Text style={[styles.stepText, { color: colors.subtext }]}>{`${index + 1}. ${step.instruction}: ${step.waterAmount}g, ${step.duration}초`}</Text>
          </View>
        ))}
      </View>

      <Pressable style={[styles.startButton, { backgroundColor: colors.primary }]} onPress={startBrewing}>
        <Text style={styles.startButtonText}>브루잉 시작하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  infoContainer: { flexDirection: 'row', marginBottom: 10 },
  label: { fontSize: 16, fontWeight: 'bold', width: 80 },
  infoText: { fontSize: 16, flex: 1 },
  stepsContainer: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
  stepsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  stepItem: { paddingVertical: 8 },
  stepText: { fontSize: 16 },
  startButton: { marginTop: 30, backgroundColor: '#A47551', padding: 20, borderRadius: 10, alignItems: 'center' },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});