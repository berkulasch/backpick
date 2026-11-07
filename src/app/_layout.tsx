import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LibraryProvider } from '../library/LibraryProvider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LibraryProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerTintColor: '#111827', contentStyle: { backgroundColor: '#e9ecf1' } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="playbook/community/[id]" options={{ title: '', headerBackTitle: 'Back' }} />
            <Stack.Screen name="team-play/[id]" options={{ title: '', headerBackTitle: 'My Team' }} />
          </Stack>
        </LibraryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
