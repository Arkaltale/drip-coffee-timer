import { useTheme } from '@/context/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecipes, Recipe } from '../../db';

export default function RecipeListScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      const fetchRecipes = async () => {
        const data = await getRecipes();
        setRecipes(data);
      };
      fetchRecipes();
    }, [])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>나의 레시피</Text>
        <Link href="/create-recipe" asChild>
          <Pressable>
            <FontAwesome name="plus" size={24} color={colors.primary} />
          </Pressable>
        </Link>
      </View>

      {recipes.length > 0 ? (
        <FlashList
          data={recipes}
          keyExtractor={(item: Recipe) => item.id!.toString()}
          contentContainerStyle={styles.list}
          estimatedItemSize={80}
          renderItem={({ item }: { item: Recipe }) => (
            <Link href={`/recipe/${item.id}`} asChild>
              <Pressable>
              <View style={[styles.recipeItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.recipeText, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.recipeSubText, { color: colors.subtext }]}>{item.bean}</Text>
                </View>
              </Pressable>
            </Link>
          )}
          extraData={colors}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>저장된 레시피가 없습니다.</Text>
          <Text style={[styles.emptySubText, { color: colors.subtext }]}>오른쪽 위 '+' 버튼을 눌러 새 레시피를 추가해 보세요!</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  list: {
    paddingHorizontal: 20,
  },
  recipeItem: {
    padding: 20,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  recipeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  recipeSubText: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
  },
  emptySubText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
  },
});