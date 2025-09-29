import { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, FlatList } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { getRecipes, Recipe } from '../../db';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

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
            <FontAwesome name="plus" size={24} color="#A47551" />
          </Pressable>
        </Link>
      </View>

      {recipes.length > 0 ? (
        <FlatList
          data={recipes}
          keyExtractor={item => item.id!.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Link href={`/recipe/${item.id}`} asChild>
              <Pressable>
              <View style={[styles.recipeItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.recipeText, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.recipeSubText, { color: colors.subtext }]}>{item.bean}</Text>
                </View>
              </Pressable>
            </Link>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>저장된 레시피가 없습니다.</Text>
          <Text style={styles.emptySubText}>오른쪽 위 '+' 버튼을 눌러 새 레시피를 추가해 보세요!</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#fff',
    padding: 20,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  recipeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  recipeSubText: {
    fontSize: 14,
    color: '#666',
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