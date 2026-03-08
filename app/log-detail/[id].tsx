import { formatDate } from '@/utils/date';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { BrewingLog, deleteLog, getLogById, updateLog } from '../../db';

const StarRatingInput = ({ rating, setRating }: { rating: number, setRating: (r: number) => void }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => setRating(star)}>
          <FontAwesome
            name={star <= rating ? 'star' : 'star-o'}
            size={32}
            color={star <= rating ? '#ffc107' : colors.subtext}
          />
        </Pressable>
      ))}
    </View>
  );
};

export default function LogDetailScreen() {
  const { id } = useLocalSearchParams();
  const rawId = Array.isArray(id) ? id[0] : id;
  const logId = Number(rawId);
  const hasValidId = Number.isInteger(logId) && logId > 0;
  const router = useRouter();
  const { colors } = useTheme();

  const [log, setLog] = useState<BrewingLog | null>(null);
  const [rating, setRating] = useState(0);
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMissing, setIsMissing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchLog = async () => {
      if (!hasValidId) {
        if (isMounted) {
          setIsMissing(true);
          setIsLoading(false);
        }
        return;
      }

      const data = await getLogById(logId);
      if (!isMounted) return;

      if (data) {
        setLog(data);
        setRating(data.rating || 0);
        setMemo(data.memo || '');
        setIsMissing(false);
      } else {
        setLog(null);
        setIsMissing(true);
      }

      setIsLoading(false);
    };

    fetchLog();
    return () => {
      isMounted = false;
    };
  }, [hasValidId, logId]);

  const handleSave = async () => {
    if (!hasValidId) return;

    try {
      await updateLog(logId, rating, memo);
      Alert.alert('성공', '기록이 저장되었습니다.');
      router.back();
    } catch (error) {
      Alert.alert('오류', '저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = () => {
    if (!hasValidId) return;

    Alert.alert(
      '기록 삭제',
      '이 브루잉 기록을 정말로 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          onPress: async () => {
            try {
              await deleteLog(logId);
              Alert.alert('성공', '기록이 삭제되었습니다.');
              router.back();
            } catch (error) {
              Alert.alert('오류', '기록을 삭제하는 중 오류가 발생했습니다.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (isLoading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  if (isMissing || !log) {
    return (
      <SafeAreaView style={[styles.container, styles.emptyStateContainer, { backgroundColor: colors.background }]}> 
        <Stack.Screen
          options={{
            title: '기록 없음',
            headerStyle: { backgroundColor: colors.card },
            headerTitleStyle: { color: colors.text },
            headerTintColor: colors.text,
          }}
        />
        <Text style={[styles.emptyStateText, { color: colors.text }]}>기록을 찾을 수 없습니다.</Text>
        <Pressable style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.saveButtonText}>목록으로 돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <Stack.Screen
        options={{
          title: formatDate(log.created_at) + '의 기록',
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.text,
          headerRight: () => (
            <Pressable onPress={handleDelete}>
              <FontAwesome name="trash" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.title, { color: colors.text }]}>{log.recipe_name}</Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>커피 종류: {log.bean}</Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>드리퍼: {log.dripper}</Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>그라인더: {log.grinder}</Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>분쇄도: {log.grind_size}클릭</Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>추출 시간: {log.total_time}초</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.label, { color: colors.text }]}>나의 평가</Text>
            <StarRatingInput rating={rating} setRating={setRating} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.label, { color: colors.text }]}>테이스팅 노트</Text>
            <TextInput
              style={[styles.memoInput, { color: colors.text, borderColor: colors.border }]}
              value={memo}
              onChangeText={setMemo}
              placeholder="맛, 향, 개선점 등을 자유롭게 기록하세요."
              placeholderTextColor={colors.subtext}
              multiline
            />
          </View>
        </ScrollView>
        <View style={[styles.saveButtonContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}> 
          <Pressable style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
            <Text style={styles.saveButtonText}>기록 저장</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyStateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    marginBottom: 20,
  },
  scrollContainer: { padding: 20 },
  card: { padding: 20, borderRadius: 8, borderWidth: 1, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginTop: 4 },
  label: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  starContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  memoInput: {
    height: 150,
    textAlignVertical: 'top',
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  saveButtonContainer: { padding: 20, paddingTop: 10, borderTopWidth: 1 },
  saveButton: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
