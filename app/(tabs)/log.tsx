import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Switch, Pressable, Modal, TouchableOpacity } from 'react-native';
import { Link, Stack, useFocusEffect } from 'expo-router';
import { getLogs, BrewingLog, LogSortOption, Recipe, getRecipes } from '../../db';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';

const StarDisplay = ({ rating }: { rating: number }) => {
  return (
    <View style={{ flexDirection: 'row', marginTop: 8 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <FontAwesome
          key={star}
          name={star <= rating ? 'star' : 'star-o'}
          size={16}
          color={star <= rating ? '#ffc107' : '#ccc'}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );
};

export default function MyLogScreen() {
  const [logs, setLogs] = useState<BrewingLog[]>([]);
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [sortOption, setSortOption] = useState<LogSortOption>('latest');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

  useEffect(() => {
    const loadRecipesForFilter = async () => {
      const recipes = await getRecipes();
      setAvailableRecipes(recipes);
    };
    loadRecipesForFilter();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchLogs = async () => {
        const data = await getLogs({ sortBy: sortOption, filterByRecipe: selectedRecipe });
        setLogs(data);
      };
      fetchLogs();
    }, [sortOption, selectedRecipe])
  );

  const handleSelectRecipeFilter = (recipeName: string | null) => {
    setSelectedRecipe(recipeName);
    setFilterModalVisible(false);
  };

  const renderItem = ({ item }: { item: BrewingLog }) => (
    <Link href={`/log-detail/${item.id}`} asChild>
      <Pressable>
        <View style={[styles.logItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View>
            <Text style={[styles.logTitle, { color: colors.text }]}>{item.recipe_name}</Text>
            <Text style={[styles.logSubtitle, { color: colors.subtext }]}>{item.bean}</Text>
            <Text style={[styles.logInfo, { color: colors.subtext }]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          {item.rating ? <StarDisplay rating={item.rating} /> : null}
        </View>
      </Pressable>
    </Link>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Switch
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={isDarkMode ? "#f4f3f4" : "#f4f3f4"}
              ios_backgroundColor="#3e3e40"
              onValueChange={toggleTheme}
              value={isDarkMode}
              style={{ marginRight: 15 }}
            />
          ),
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text },
        }}
      />
      <View style={styles.sortContainer}>
        <Pressable
          style={[styles.sortButton, sortOption === 'latest' && { backgroundColor: colors.primary }]}
          onPress={() => setSortOption('latest')}
        >
          <Text style={[styles.sortButtonText, { color: sortOption === 'latest' ? '#fff' : colors.subtext }]}>최신순</Text>
        </Pressable>
        <Pressable
          style={[styles.sortButton, sortOption === 'rating_desc' && { backgroundColor: colors.primary }]}
          onPress={() => setSortOption('rating_desc')}
        >
          <Text style={[styles.sortButtonText, { color: sortOption === 'rating_desc' ? '#fff' : colors.subtext }]}>별점 높은 순</Text>
        </Pressable>
        <Pressable
          style={[styles.sortButton, sortOption === 'rating_asc' && { backgroundColor: colors.primary }]}
          onPress={() => setSortOption('rating_asc')}
        >
          <Text style={[styles.sortButtonText, { color: sortOption === 'rating_asc' ? '#fff' : colors.subtext }]}>별점 낮은 순</Text>
        </Pressable>
        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
          <FontAwesome name="filter" size={15} color={colors.primary} />
          <Text style={[styles.filterButtonText, { color: colors.primary }]}>
            {selectedRecipe || '전체'}
          </Text>
        </TouchableOpacity>
      </View>
      {logs.length > 0 ? (
        <FlatList
          data={logs}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>아직 브루잉 기록이 없습니다.</Text>
        </View>
      )}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>레시피 필터</Text>
            <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectRecipeFilter(null)}>
              <Text style={[styles.modalItemText, { color: colors.primary }]}>- 전체 보기 -</Text>
            </TouchableOpacity>
            {availableRecipes.map(recipe => (
              <TouchableOpacity key={recipe.id} style={styles.modalItem} onPress={() => handleSelectRecipeFilter(recipe.name)}>
                <Text style={[styles.modalItemText, { color: colors.text }]}>{recipe.name}</Text>
              </TouchableOpacity>
            ))}
            <Pressable style={styles.closeButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  sortButtonText: {
    fontWeight: 'bold',
  },
  logItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  logSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  logInfo: {
    fontSize: 12,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  filterButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'auto' },
  filterButtonText: { fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '80%', borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 18, textAlign: 'center' },
  closeButton: { marginTop: 20, padding: 10 },
  closeButtonText: { fontSize: 16, color: '#aaa', textAlign: 'center' },
});