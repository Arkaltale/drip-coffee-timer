import { ThemeProvider } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDB } from '../db';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    initDB();

    if (error) {
      // 폰트 로딩 실패 시에도 앱을 계속 실행합니다.
      SplashScreen.hideAsync();
      return;
    }

    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) {
    return null;
  }

  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="recipe/[id]"
          options={{ title: '레시피 상세' }}
        />
        <Stack.Screen
          name="timer/[id]"
          options={{ presentation: 'modal', title: '브루잉 타이머' }}
        />
      </Stack>
    </ThemeProvider>
  );
}