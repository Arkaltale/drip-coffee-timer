import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { Switch } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { colors, isDarkMode, toggleTheme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTitleStyle: {
          color: colors.text,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '레시피',
          tabBarIcon: ({ color }) => <TabBarIcon name="coffee" color={color} />,
          headerRight: () => (
            <Switch
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={"#f4f3f4"}
              ios_backgroundColor="#3e3e40"
              onValueChange={toggleTheme}
              value={isDarkMode}
              style={{ marginRight: 15 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: '나의 기록',
          tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
        }}
      />
    </Tabs>
  );
}