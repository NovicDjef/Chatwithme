// BilingualChatScreen.js - Chat avec traduction automatique en temps réel
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Services de traduction
import { useRealTimeTranslation } from '../../hooks/translation/useRealTimeTranslationSimple.js';

// Composants de chat
import VoiceRecorder from './VoiceRecorder.js';
import AudioWaveform from './AudioWaveform.js';
import ImagePicker from './ImagePicker.js';

// Icônes
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';

// Langues supportées
const SUPPORTED_LANGUAGES = {
  fr: { name: 'Français', flag: '🇫🇷' },
  en: { name: 'English', flag: '🇺🇸' },
  es: { name: 'Español', flag: '🇪🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  pt: { name: 'Português', flag: '🇵🇹' },
  ar: { name: 'العربية', flag: '🇸🇦' },
  zh: { name: '中文', flag: '🇨🇳' },
  ja: { name: '日本語', flag: '🇯🇵' },
  ko: { name: '한국어', flag: '🇰🇷' },
};

const BilingualChatScreen = ({ route, navigation, onBackPress }) => {
  // États principaux
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState(1); // 1 ou 2
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);

  // Informations du chat depuis les paramètres de route
  const params = route?.params || {};
  const {
    recipientId = 'demo-user',
    recipientName = 'Demo Chat',
    recipientLanguage = 'en',
    recipientFlag = '🇺🇸',
    recipientAvatar = '👤'
  } = params;

  // Langues des utilisateurs
  const [user1Language, setUser1Language] = useState('fr');
  const [user2Language, setUser2Language] = useState(recipientLanguage);

  // États pour les menus déroulants
  const [user1DropdownOpen, setUser1DropdownOpen] = useState(false);
  const [user2DropdownOpen, setUser2DropdownOpen] = useState(false);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);

  // Hook de traduction
  const { translateText, isTranslating } = useRealTimeTranslation();

  // Fonction pour fermer tous les menus déroulants
  const closeAllDropdowns = useCallback(() => {
    setUser1DropdownOpen(false);
    setUser2DropdownOpen(false);
    setHamburgerMenuOpen(false);
  }, []);

  // Fonction pour envoyer un message vocal
  const handleSendVoiceNote = useCallback(async (voiceData) => {
    const { transcription, audioUri, duration, language } = voiceData;
    const senderLanguage = currentUser === 1 ? user1Language : user2Language;
    const receiverLanguage = currentUser === 1 ? user2Language : user1Language;

    // Message vocal avec transcription
    const voiceMessage = {
      id: Date.now(),
      sender: currentUser,
      originalText: transcription || 'Message vocal transcrit...',
      type: 'voice',
      audioUri: audioUri,
      duration: duration || 0,
      originalLanguage: senderLanguage,
      targetLanguage: receiverLanguage,
      translatedText: '🔄 Traduction...',
      timestamp: new Date(),
      isTranslating: true,
      translationError: false,
    };

    // Ajouter immédiatement à la liste
    setMessages(prev => [...prev, voiceMessage]);

    try {
      // Traduire la transcription
      const translatedText = await translateText(transcription || 'Message vocal', senderLanguage, receiverLanguage);

      // Mettre à jour avec la traduction
      setMessages(prev =>
        prev.map(msg =>
          msg.id === voiceMessage.id
            ? {
                ...msg,
                translatedText: translatedText || 'Traduction non disponible',
                isTranslating: false,
                translationError: false
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Erreur traduction message vocal:', error);
      // Mettre à jour pour indiquer l'échec de la traduction
      setMessages(prev =>
        prev.map(msg =>
          msg.id === voiceMessage.id
            ? {
                ...msg,
                translatedText: transcription || 'Message vocal',
                translationError: true,
                isTranslating: false
              }
            : msg
        )
      );
    }

    // Fermer l'enregistreur vocal
    setShowVoiceRecorder(false);
  }, [currentUser, user1Language, user2Language, translateText]);

  // Fonction pour envoyer une image
  const handleSendImage = useCallback(async (imageData) => {
    const { uri, width, height, fileSize } = imageData;
    const senderLanguage = currentUser === 1 ? user1Language : user2Language;
    const receiverLanguage = currentUser === 1 ? user2Language : user1Language;

    // Message image
    const imageMessage = {
      id: Date.now(),
      sender: currentUser,
      type: 'image',
      imageUri: uri,
      width: width,
      height: height,
      fileSize: fileSize,
      originalLanguage: senderLanguage,
      targetLanguage: receiverLanguage,
      timestamp: new Date(),
    };

    // Ajouter immédiatement à la liste
    setMessages(prev => [...prev, imageMessage]);
  }, [currentUser, user1Language, user2Language]);

  // Fonction pour envoyer un message
  const sendMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    const originalMessage = inputText.trim();
    const senderLanguage = currentUser === 1 ? user1Language : user2Language;
    const receiverLanguage = currentUser === 1 ? user2Language : user1Language;

    // Message temporaire (en cours de traduction)
    const tempMessage = {
      id: Date.now(),
      sender: currentUser,
      originalText: originalMessage,
      originalLanguage: senderLanguage,
      translatedText: '🔄 Traduction...',
      targetLanguage: receiverLanguage,
      timestamp: new Date(),
      isTranslating: true,
    };

    setMessages(prev => [...prev, tempMessage]);
    setInputText('');

    try {
      // Traduire le message
      const translatedText = await translateText(originalMessage, senderLanguage, receiverLanguage);

      // Mettre à jour avec la traduction
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempMessage.id
            ? { ...msg, translatedText, isTranslating: false }
            : msg
        )
      );
    } catch (error) {
      console.error('Erreur de traduction:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempMessage.id
            ? { ...msg, translatedText: '❌ Erreur de traduction', isTranslating: false }
            : msg
        )
      );
    }
  }, [inputText, currentUser, user1Language, user2Language, translateText]);

  // Composant pour changer de langue avec menu déroulant
  const LanguageSelector = ({ user, currentLanguage, onLanguageChange, isOpen, setIsOpen }) => (
    <View style={styles.languageSelector}>
      <TouchableOpacity
        style={styles.languageDropdownButton}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <View style={styles.languageDropdownContent}>
          <Text style={styles.languageLabel}>
            👤 Utilisateur {user}
          </Text>
          <View style={styles.currentLanguageDisplay}>
            <Text style={styles.languageFlag}>{SUPPORTED_LANGUAGES[currentLanguage].flag}</Text>
            <Text style={styles.currentLanguageText}>{SUPPORTED_LANGUAGES[currentLanguage].name}</Text>
            <Text style={styles.dropdownArrow}>{isOpen ? '▲' : '▼'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.languageDropdownMenu}>
          <ScrollView style={styles.languageMenuScroll} nestedScrollEnabled>
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.languageMenuItem,
                  currentLanguage === code && styles.selectedMenuItem
                ]}
                onPress={() => {
                  onLanguageChange(code);
                  setIsOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageMenuText,
                  currentLanguage === code && styles.selectedMenuText
                ]}>
                  {lang.name}
                </Text>
                {currentLanguage === code && (
                  <Text style={styles.checkMarkInMenu}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  // Composant de message
  const MessageBubble = ({ message }) => {
    const isCurrentUser = message.sender === currentUser;
    const displayText = isCurrentUser ? message.originalText : message.translatedText;
    const displayLanguage = isCurrentUser ? message.originalLanguage : message.targetLanguage;

    // Sécurité pour les langues manquantes
    const originalLang = SUPPORTED_LANGUAGES[message.originalLanguage] || { name: 'Inconnue', flag: '❓' };
    const displayLang = displayLanguage ? (SUPPORTED_LANGUAGES[displayLanguage] || { name: 'Inconnue', flag: '❓' }) : originalLang;

    return (
      <View style={[
        styles.messageBubble,
        message.sender === 1 ? styles.user1Bubble : styles.user2Bubble,
        message.type === 'voice' && styles.voiceMessage,
      ]}>
        <View style={styles.messageHeader}>
          <Text style={styles.userLabel}>
            Utilisateur {message.sender} {originalLang.flag}
            {message.type === 'voice' && ' 🎤'}
          </Text>
          <Text style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString()}
            {message.type === 'voice' && message.duration && ` • ${Math.floor(message.duration / 60)}:${(message.duration % 60).toString().padStart(2, '0')}`}
          </Text>
        </View>

        {message.type === 'voice' && (
          <View style={styles.voiceIndicator}>
            <TouchableOpacity
              style={styles.audioPlayerContainer}
              onPress={async () => {
                if (playingAudio === message.id) {
                  setPlayingAudio(null);
                  return;
                }

                setPlayingAudio(message.id);
                try {
                  const { Audio } = require('expo-av');
                  const { sound } = await Audio.Sound.createAsync({ uri: message.audioUri });
                  await sound.playAsync();
                  setTimeout(async () => {
                    await sound.unloadAsync();
                    setPlayingAudio(null);
                  }, (message.duration || 5) * 1000);
                } catch (error) {
                  console.error('Erreur lecture audio:', error);
                  setPlayingAudio(null);
                }
              }}
            >
              <View style={styles.playButtonContainer}>
                <Ionicons
                  name={playingAudio === message.id ? "pause" : "play"}
                  size={20}
                  color="#ffffff"
                />
              </View>

              <View style={styles.waveformContainer}>
                <AudioWaveform
                  duration={message.duration || 5}
                  isPlaying={playingAudio === message.id}
                  barCount={15}
                  maxHeight={25}
                  minHeight={3}
                  barWidth={2}
                  color="#8b5cf6"
                />
              </View>

              <Text style={styles.audioDuration}>
                {Math.floor((message.duration || 0) / 60)}:{((message.duration || 0) % 60).toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>

            <Text style={styles.transcriptionLabel}>Transcription:</Text>
          </View>
        )}

        {message.type === 'image' && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: message.imageUri }}
              style={[
                styles.messageImage,
                {
                  width: Math.min(250, message.width || 250),
                  height: Math.min(300, message.height || 200),
                }
              ]}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.imageInfo}>
              <Ionicons name="image" size={12} color="#6b7280" />
              <Text style={styles.imageInfoText}>
                {message.fileSize ? `${(message.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Image'}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.messageText}>{displayText || 'Message en cours de traitement...'}</Text>

        {!isCurrentUser && !message.translationError && displayLanguage && (
          <Text style={styles.translationInfo}>
            📝 Traduit de {originalLang.name} vers {displayLang.name}
          </Text>
        )}

        {message.translationError && (
          <Text style={styles.translationError}>
            ⚠️ Erreur de traduction
          </Text>
        )}

        {message.isTranslating && (
          <Text style={styles.translatingText}>⏳ Traduction en cours...</Text>
        )}
      </View>
    );
  };

  // Composant menu hamburger
  const HamburgerMenu = () => (
    <Modal
      visible={hamburgerMenuOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setHamburgerMenuOpen(false)}
    >
      <SafeAreaView style={styles.hamburgerMenuContainer}>
        {/* Header du menu */}
        <View style={styles.hamburgerMenuHeader}>
          <TouchableOpacity
            onPress={() => setHamburgerMenuOpen(false)}
            style={styles.menuCloseButton}
          >
            <Text style={styles.menuCloseText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.menuTitle}>⚙️ Paramètres du Chat</Text>
          <View style={styles.menuPlaceholder} />
        </View>

        {/* ScrollView pour tout le contenu */}
        <ScrollView
          style={styles.menuScrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >

        {/* Section sélection utilisateur */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>👤 Utilisateur Actif</Text>
          <Text style={styles.menuSectionSubtitle}>
            Choisissez quel utilisateur vous représentez dans la conversation
          </Text>

          <View style={styles.userSelectionContainer}>
            <TouchableOpacity
              style={[
                styles.userSelectionButton,
                currentUser === 1 && styles.userSelectionActive
              ]}
              onPress={() => setCurrentUser(1)}
              activeOpacity={0.8}
            >
              <View style={styles.userSelectionContent}>
                <Text style={styles.userSelectionEmoji}>👨‍💼</Text>
                <View style={styles.userSelectionInfo}>
                  <Text style={[
                    styles.userSelectionName,
                    currentUser === 1 && styles.userSelectionNameActive
                  ]}>
                    Utilisateur 1 (Vous)
                  </Text>
                  <Text style={styles.userSelectionLanguage}>
                    {SUPPORTED_LANGUAGES[user1Language].flag} {SUPPORTED_LANGUAGES[user1Language].name}
                  </Text>
                </View>
              </View>
              {currentUser === 1 && <Text style={styles.userSelectionCheck}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.userSelectionButton,
                currentUser === 2 && styles.userSelectionActive
              ]}
              onPress={() => setCurrentUser(2)}
              activeOpacity={0.8}
            >
              <View style={styles.userSelectionContent}>
                <Text style={styles.userSelectionEmoji}>👩‍💼</Text>
                <View style={styles.userSelectionInfo}>
                  <Text style={[
                    styles.userSelectionName,
                    currentUser === 2 && styles.userSelectionNameActive
                  ]}>
                    Utilisateur 2 ({recipientName})
                  </Text>
                  <Text style={styles.userSelectionLanguage}>
                    {SUPPORTED_LANGUAGES[user2Language].flag} {SUPPORTED_LANGUAGES[user2Language].name}
                  </Text>
                </View>
              </View>
              {currentUser === 2 && <Text style={styles.userSelectionCheck}>✓</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section langues */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>🌍 Langues de Conversation</Text>
          <Text style={styles.menuSectionSubtitle}>
            Configurez les langues pour chaque utilisateur
          </Text>

          {/* Langue utilisateur 1 */}
          <View style={styles.languageConfigContainer}>
            <Text style={styles.languageConfigLabel}>
              👨‍💼 Langue de l'Utilisateur 1
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScrollContainer}>
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.languageConfigButton,
                    user1Language === code && styles.languageConfigActive
                  ]}
                  onPress={() => setUser1Language(code)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.languageConfigFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageConfigText,
                    user1Language === code && styles.languageConfigTextActive
                  ]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Langue utilisateur 2 */}
          <View style={styles.languageConfigContainer}>
            <Text style={styles.languageConfigLabel}>
              👩‍💼 Langue de l'Utilisateur 2
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScrollContainer}>
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.languageConfigButton,
                    user2Language === code && styles.languageConfigActive
                  ]}
                  onPress={() => setUser2Language(code)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.languageConfigFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageConfigText,
                    user2Language === code && styles.languageConfigTextActive
                  ]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

          {/* Section informations */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>ℹ️ Informations</Text>
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                🔄 Les messages sont automatiquement traduits en temps réel
              </Text>
              <Text style={styles.infoText}>
                💬 L'utilisateur actif voit ses messages dans sa langue
              </Text>
              <Text style={styles.infoText}>
                🌍 L'autre utilisateur reçoit la traduction automatiquement
              </Text>
            </View>
          </View>

          {/* Espacement en bas pour éviter que le contenu soit caché */}
          <View style={styles.menuBottomSpacing} />

        </ScrollView>

        {/* Bouton de fermeture fixe en bas */}
        <View style={styles.menuButtonContainer}>
          <TouchableOpacity
            style={styles.menuApplyButton}
            onPress={() => setHamburgerMenuOpen(false)}
          >
            <Text style={styles.menuApplyText}>✅ Appliquer les paramètres</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      {/* Header amélioré style WhatsApp */}
      <View style={styles.chatHeader}>
        {onBackPress && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#4f46e5" />
          </TouchableOpacity>
        )}

        <View style={styles.recipientInfo}>
          <View style={styles.recipientAvatarContainer}>
            <Text style={styles.recipientAvatar}>{recipientAvatar}</Text>
            <View style={styles.onlineStatusIndicator} />
          </View>
          <View style={styles.recipientDetails}>
            <Text style={styles.recipientName}>
              {recipientName} {recipientFlag}
            </Text>
            <View style={styles.recipientStatusContainer}>
              <Text style={styles.recipientStatus}>
                🟢 En ligne
              </Text>
              <Text style={styles.recipientStatusSeparator}>•</Text>
              <Text style={styles.recipientLanguageStatus}>
                {SUPPORTED_LANGUAGES[recipientLanguage]?.name}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerButtons}>
          {/* Indicateur de l'utilisateur actuel */}
          <View style={styles.currentUserIndicatorHeader}>
            <Text style={styles.currentUserEmoji}>
              {currentUser === 1 ? '👨‍💼' : '👩‍💼'}
            </Text>
            <Text style={styles.currentUserLang}>
              {SUPPORTED_LANGUAGES[currentUser === 1 ? user1Language : user2Language].flag}
            </Text>
          </View>

          {/* Bouton hamburger */}
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => setHamburgerMenuOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="menu" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Indicateur compact de l'utilisateur actuel */}
      <View style={styles.compactUserIndicator}>
        <Text style={styles.compactUserText}>
          💬 Vous écrivez en tant que{' '}
          <Text style={styles.compactUserBold}>
            Utilisateur {currentUser} {SUPPORTED_LANGUAGES[currentUser === 1 ? user1Language : user2Language].flag}
          </Text>
        </Text>
        <TouchableOpacity
          style={styles.changeUserButton}
          onPress={() => setHamburgerMenuOpen(true)}
        >
          <Ionicons name="settings-outline" size={14} color="#4f46e5" />
          <Text style={styles.changeUserText}>Modifier</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <TouchableOpacity
        style={styles.messagesContainer}
        onPress={closeAllDropdowns}
        activeOpacity={1}
      >
        <ScrollView>
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                🌍 Chat multilingue prêt !
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Écrivez dans votre langue, l'autre utilisateur recevra automatiquement la traduction dans sa langue.
              </Text>
            </View>
          ) : (
            messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </ScrollView>
      </TouchableOpacity>

      {/* Enregistreur vocal */}
      {showVoiceRecorder && (
        <View style={styles.voiceRecorderContainer}>
          <VoiceRecorder
            onSendVoiceNote={handleSendVoiceNote}
            onCancel={() => setShowVoiceRecorder(false)}
            language={currentUser === 1 ? user1Language : user2Language}
          />
        </View>
      )}

      {/* Zone de saisie */}
      <View style={styles.inputContainer}>
        <View style={styles.inputActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowImagePicker(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={24} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowVoiceRecorder(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="keyboard-voice" size={24} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.textInput}
          placeholder={`Écrire en ${SUPPORTED_LANGUAGES[currentUser === 1 ? user1Language : user2Language].name}...`}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isTranslating}
          activeOpacity={0.8}
        >
          {isTranslating ? (
            <MaterialIcons name="sync" size={20} color="#ffffff" />
          ) : (
            <Ionicons name="send" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Sélecteur d'images */}
      <ImagePicker
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSendImage={handleSendImage}
      />

        {/* Menu hamburger */}
        <HamburgerMenu />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 40, // Ajouter du padding pour éviter le status bar
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#4f46e5',
    fontWeight: 'bold',
  },
  recipientInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  recipientAvatar: {
    fontSize: 36,
    width: 48,
    height: 48,
    textAlign: 'center',
    lineHeight: 48,
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
  },
  onlineStatusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    backgroundColor: '#10b981',
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  recipientDetails: {
    flex: 1,
  },
  recipientName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.2,
  },
  recipientStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  recipientStatus: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  recipientStatusSeparator: {
    fontSize: 11,
    color: '#6b7280',
    marginHorizontal: 4,
  },
  recipientLanguageStatus: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentUserIndicatorHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentUserEmoji: {
    fontSize: 16,
  },
  currentUserLang: {
    fontSize: 10,
    marginTop: 2,
  },
  hamburgerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  hamburgerIcon: {
    width: 18,
    height: 12,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#4f46e5',
    borderRadius: 1,
  },
  languageSelector: {
    marginHorizontal: 12,
    marginTop: 8,
    position: 'relative',
    zIndex: 1000,
  },
  languageDropdownButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  languageDropdownContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: 0.5,
  },
  currentLanguageDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  languageFlag: {
    fontSize: 18,
    marginRight: 8,
  },
  currentLanguageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginRight: 8,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  languageDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
  },
  languageMenuScroll: {
    maxHeight: 200,
  },
  languageMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedMenuItem: {
    backgroundColor: '#f0f9ff',
  },
  languageMenuText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  selectedMenuText: {
    color: '#0ea5e9',
    fontWeight: '700',
  },
  checkMarkInMenu: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: 'bold',
  },
  userSwitch: {
    padding: 16,
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userSwitchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userSwitchLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: 0.5,
  },
  currentUserIndicator: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeUser: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
    transform: [{ scale: 1.02 }],
  },
  userButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  activeUserText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  activeIndicator: {
    fontSize: 8,
    color: '#ffffff',
    marginLeft: 6,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  messageBubble: {
    marginVertical: 8,
    padding: 16,
    borderRadius: 24,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  user1Bubble: {
    backgroundColor: '#4f46e5',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 8,
  },
  user2Bubble: {
    backgroundColor: '#10b981',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  messageText: {
    fontSize: 17,
    color: '#ffffff',
    lineHeight: 24,
    fontWeight: '500',
  },
  translationInfo: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  translatingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    alignItems: 'flex-end',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 120,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#1f2937',
    fontWeight: '500',
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0.1,
  },
  sendButtonContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  // Styles pour l'indicateur compact
  compactUserIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  compactUserText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  compactUserBold: {
    fontWeight: '700',
    color: '#4f46e5',
  },
  changeUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  changeUserText: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '600',
    marginLeft: 4,
  },
  // Styles pour le menu hamburger
  hamburgerMenuContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  hamburgerMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuScrollContainer: {
    flex: 1,
  },
  menuCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCloseText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  menuPlaceholder: {
    width: 36,
  },
  menuSection: {
    backgroundColor: '#ffffff',
    margin: 12,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  menuSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  menuSectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  // Styles sélection utilisateur
  userSelectionContainer: {
    gap: 12,
  },
  userSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  userSelectionActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#3b82f6',
  },
  userSelectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userSelectionEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  userSelectionInfo: {
    flex: 1,
  },
  userSelectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  userSelectionNameActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  userSelectionLanguage: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  userSelectionCheck: {
    fontSize: 20,
    color: '#10b981',
    fontWeight: 'bold',
  },
  // Styles configuration langues
  languageConfigContainer: {
    marginBottom: 20,
  },
  languageConfigLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  languageScrollContainer: {
    flexGrow: 0,
  },
  languageConfigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  languageConfigActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  languageConfigFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  languageConfigText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  languageConfigTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  // Styles informations
  infoContainer: {
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  menuBottomSpacing: {
    height: 20,
  },
  menuButtonContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  menuApplyButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  menuApplyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },

  // Styles pour les messages vocaux
  voiceMessage: {
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f0ff',
    borderRadius: 12,
  },
  voiceIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  voiceLabel: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '600',
    flex: 1,
  },
  playButton: {
    marginLeft: 8,
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  playButtonText: {
    fontSize: 12,
    color: '#ffffff',
  },
  translationError: {
    fontSize: 12,
    color: '#dc2626',
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Styles pour l'enregistreur vocal
  voiceRecorderContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  // Styles pour les actions de saisie
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },

  // Styles pour les messages audio
  audioPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4,
  },
  playButtonContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  waveformContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  audioDuration: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  transcriptionLabel: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '600',
    marginTop: 8,
  },

  // Styles pour les images
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 4,
  },
  messageImage: {
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  imageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopLeftRadius: 8,
  },
  imageInfoText: {
    fontSize: 10,
    color: '#ffffff',
    marginLeft: 4,
  },
});

export default BilingualChatScreen;