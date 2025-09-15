import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Redux Provider
import ReduxProvider from './providers/ReduxProvider';

// Redux hooks et actions
import { useAppDispatch } from './hooks/redux/useAppDispatch';
import { useAppSelector } from './hooks/redux/useAppSelector';
import { restoreSession, selectUser, selectIsInitialized } from './store/slices/authSlice';

// Hooks personnalisés
import { useSessionRenewal } from './hooks/auth/useSessionRenewal';

// Composants
import AuthScreen from './components/Auth/AuthScreen';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Composant interne pour initialiser et vérifier l'authentification
function AppInitializer({ children }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isInitialized = useAppSelector(selectIsInitialized);

  // Activer le renouvellement automatique de session
  useSessionRenewal();

  useEffect(() => {
    // Restaurer la session au démarrage de l'app
    console.log('🚀 Initializing app - restoring session...');
    dispatch(restoreSession());
  }, [dispatch]);

  // Si pas encore initialisé, afficher un écran de chargement
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#667eea' }}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: '#ffffff', fontSize: 18, marginTop: 20, fontWeight: '600' }}>
          ChatWithMe
        </Text>
      </View>
    );
  }

  // Si pas d'utilisateur connecté, afficher l'écran d'authentification
  if (!user) {
    return <AuthScreen />;
  }

  // Si utilisateur connecté, afficher l'application normale
  return children;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ReduxProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppInitializer>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen
              name="fullstack-chat"
              options={{
                headerShown: false,
                presentation: 'card',
                title: 'Chat'
              }}
            />
            <Stack.Screen
              name="auth"
              options={{
                headerShown: false,
                presentation: 'fullScreenModal'
              }}
            />
          </Stack>
        </AppInitializer>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ReduxProvider>
  );
}
