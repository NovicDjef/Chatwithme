// app/components/Auth/AuthScreen.js - Écran d'authentification
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Redux
import { useAppDispatch } from '../../hooks/redux/useAppDispatch';
import { useAppSelector } from '../../hooks/redux/useAppSelector';
import {
  login,
  signup,
  selectIsLoggingIn,
  selectIsSigningUp,
  selectAuthError,
} from '../../store/slices/authSlice';

const AuthScreen = () => {
  const dispatch = useAppDispatch();
  const isLoggingIn = useAppSelector(selectIsLoggingIn);
  const isSigningUp = useAppSelector(selectIsSigningUp);
  const authError = useAppSelector(selectAuthError);

  // États locaux
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [focusedInput, setFocusedInput] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    username: '',
    language: 'fr',
  });

  // Mise à jour des champs
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Connexion
  const handleLogin = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      await dispatch(login({
        email: formData.email.trim(),
        password: formData.password,
      })).unwrap();

      console.log('Login successful');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Erreur de connexion', error.message || 'Échec de la connexion');
    }
  };

  // Inscription
  const handleSignup = async () => {
    const { email, password, firstName, lastName, username, language } = formData;

    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim() || !username.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      await dispatch(signup({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        language,
      })).unwrap();

      console.log('Signup successful');
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Erreur d\'inscription', error.message || 'Échec de l\'inscription');
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons name="chatbubbles" size={40} color="#ffffff" style={styles.titleIcon} />
              <Text style={styles.title}>ChatWithMe</Text>
            </View>
            <Text style={styles.subtitle}>
              {isLoginMode ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Champs pour inscription */}
            {!isLoginMode && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Prénom *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedInput === 'firstName' && styles.inputFocused
                    ]}
                    placeholder="Votre prénom"
                    value={formData.firstName}
                    onChangeText={(text) => updateField('firstName', text)}
                    onFocus={() => setFocusedInput('firstName')}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="words"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nom *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedInput === 'lastName' && styles.inputFocused
                    ]}
                    placeholder="Votre nom"
                    value={formData.lastName}
                    onChangeText={(text) => updateField('lastName', text)}
                    onFocus={() => setFocusedInput('lastName')}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="words"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nom d'utilisateur *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedInput === 'username' && styles.inputFocused
                    ]}
                    placeholder="@votre_pseudo"
                    value={formData.username}
                    onChangeText={(text) => updateField('username', text)}
                    onFocus={() => setFocusedInput('username')}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="none"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </>
            )}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'email' && styles.inputFocused
                ]}
                placeholder="votre@email.com"
                value={formData.email}
                onChangeText={(text) => updateField('email', text)}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe *</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'password' && styles.inputFocused
                ]}
                placeholder={isLoginMode ? 'Votre mot de passe' : 'Au moins 6 caractères'}
                value={formData.password}
                onChangeText={(text) => updateField('password', text)}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Langue (inscription seulement) */}
            {!isLoginMode && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Langue préférée</Text>
                <View style={styles.languageContainer}>
                  {[
                    { code: 'fr', name: 'Français' },
                    { code: 'en', name: 'English' },
                    { code: 'es', name: 'Español' },
                    { code: 'de', name: 'Deutsch' },
                  ].map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.languageButton,
                        formData.language === lang.code && styles.languageButtonActive
                      ]}
                      onPress={() => updateField('language', lang.code)}
                    >
                      <Text style={[
                        styles.languageText,
                        formData.language === lang.code && styles.languageTextActive
                      ]}>
                        {lang.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Bouton principal */}
            <TouchableOpacity
              onPress={isLoginMode ? handleLogin : handleSignup}
              disabled={isLoggingIn || isSigningUp}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  (isLoggingIn || isSigningUp)
                    ? ['#d1d5db', '#d1d5db']
                    : ['#8b5cf6', '#a855f7']
                }
                style={styles.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {(isLoggingIn || isSigningUp) ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isLoginMode ? 'Se connecter' : 'S\'inscrire'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Basculer entre connexion/inscription */}
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsLoginMode(!isLoginMode)}
              disabled={isLoggingIn || isSigningUp}
            >
              <Text style={styles.switchText}>
                {isLoginMode
                  ? "Vous n'avez pas de compte ? S'inscrire"
                  : 'Vous avez déjà un compte ? Se connecter'
                }
              </Text>
            </TouchableOpacity>

            {/* Erreur */}
            {authError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleIcon: {
    marginRight: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginHorizontal: 4,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#1f2937',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  inputFocused: {
    borderColor: '#8b5cf6',
    backgroundColor: '#ffffff',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  languageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  languageButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    minWidth: 80,
    alignItems: 'center',
  },
  languageButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
    transform: [{ scale: 1.05 }],
  },
  languageText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  languageTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  primaryButton: {
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
});

export default AuthScreen;