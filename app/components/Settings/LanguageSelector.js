// LanguageSelector.js - Composant pour changer la langue utilisateur
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Redux
import { useAppDispatch } from '../../hooks/redux/useAppDispatch';
import { useAppSelector } from '../../hooks/redux/useAppSelector';
import { changeUserLanguage, selectUser, selectIsLoading } from '../../store/slices/authSlice';

const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
];

const LanguageSelector = ({ compact = false }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isLoading = useAppSelector(selectIsLoading);

  const [showModal, setShowModal] = useState(false);

  const currentLanguage = LANGUAGES.find(lang => lang.code === user?.language) || LANGUAGES[0];

  const handleLanguageChange = async (languageCode) => {
    if (!user?.id) {
      Alert.alert('Erreur', 'Impossible de changer la langue');
      return;
    }

    if (languageCode === user.language) {
      setShowModal(false);
      return;
    }

    try {
      await dispatch(changeUserLanguage({
        userId: user.id,
        language: languageCode
      })).unwrap();

      setShowModal(false);
      Alert.alert('Succès', 'Langue changée avec succès !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de changer la langue');
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactButton}
        onPress={() => setShowModal(true)}
        disabled={isLoading}
      >
        <Text style={styles.flag}>{currentLanguage.flag}</Text>
        <Ionicons name="chevron-down" size={16} color="#6b7280" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.languageButton}
        onPress={() => setShowModal(true)}
        disabled={isLoading}
      >
        <View style={styles.languageInfo}>
          <Text style={styles.flag}>{currentLanguage.flag}</Text>
          <Text style={styles.languageName}>{currentLanguage.name}</Text>
        </View>

        <View style={styles.rightSection}>
          {isLoading && <ActivityIndicator size="small" color="#8b5cf6" />}
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir la langue</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.languageList}>
              {LANGUAGES.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    language.code === user?.language && styles.selectedLanguage
                  ]}
                  onPress={() => handleLanguageChange(language.code)}
                  disabled={isLoading}
                >
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <Text style={[
                    styles.languageText,
                    language.code === user?.language && styles.selectedLanguageText
                  ]}>
                    {language.name}
                  </Text>
                  {language.code === user?.language && (
                    <Ionicons name="checkmark" size={20} color="#8b5cf6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area padding
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  languageList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedLanguage: {
    backgroundColor: '#f8fafc',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  selectedLanguageText: {
    fontWeight: '600',
    color: '#8b5cf6',
  },
});

export default LanguageSelector;