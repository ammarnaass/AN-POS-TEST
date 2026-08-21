/**
 * AN POS Mobile — Root App Component
 * React Native 0.76 + React Navigation 7 + Nitro Modules
 *
 * Wrappers (outer → inner):
 *   GestureHandlerRootView  (react-native-gesture-handler)
 *   SafeAreaProvider        (react-native-safe-area-context)
 *   NavigationContainer
 *   Stack Navigator
 */
import React from 'react';
import { I18nManager, StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PairScreen from '@/features/pair/PairScreen';
import LoginScreen from '@/features/auth/LoginScreen';
import HomeTabs from '@/components/HomeTabs';

// Force RTL for Arabic UI
I18nManager.forceRTL(true);
I18nManager.allowRTL(true);

const Stack = createNativeStackNavigator();

export default function App() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Pair"
            screenOptions={{ animation: 'slide_from_right' }}
          >
            {/* Pair / Onboarding */}
            <Stack.Screen
              name="Pair"
              component={PairScreen}
              options={{ headerShown: false }}
            />

            {/* Auth */}
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />

            {/* Main app — bottom tabs */}
            <Stack.Screen
              name="Home"
              component={HomeTabs}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
