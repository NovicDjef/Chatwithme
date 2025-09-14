// ChatScreen.js - Version avec design moderne et intuitif
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Hooks personnalisés
import { useMessageQueue } from '../../hooks/chat/useMessageQueue.js';
import { useNetworkStatus } from '../../hooks/common/useNetworkStatus.js';
import { useEmotionAnalysis } from '../../hooks/emotion/useEmotionAnalysisSimple.js';
import { useRealTimeTranslation } from '../../hooks/translation/useRealTimeTranslationSimple.js';

// Composants modulaires
import ErrorBoundary from '../UI/ErrorBoundary.js';
import ChatHeader from './ChatHeader.js';
import ConnectionStatus from './ConnectionStatus.js';
import EmotionalProfileIndicator from './EmotionalProfileIndicatorSimple.js';
import MessageInput from './MessageInput.js';
import MessagesList from './MessagesList.js';
import TranslationIndicator from './TranslationIndicator.js';

// Services
import { chatService } from '../../services/chat/chatService.js';
import { notificationService } from '../../services/notification/notificationService.js';

// Design System - Tokens de design
const COLORS = {
  // Palette principale
  primary: '#007AFF',      // Bleu iOS standard
  secondary: '#5856D6',    // Violet moderne
  success: '#34C759',      // Vert succès
  warning: '#FF9500',      // Orange warning
  error: '#FF3B30',        // Rouge erreur
  
  // Backgrounds
  background: '#F2F2F7',   // Background principal iOS
  surface: '#FFFFFF',      // Surface des cartes
  elevated: '#FFFFFF',     // Surface élevée
  
  // Text colors
  textPrimary: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  
  // System colors
  separator: '#C6C6C8',
  overlay: 'rgba(0, 0, 0, 0.4)',
  
  // Notification colors
  notificationInfo: '#E3F2FD',
  notificationWarning: '#FFF8E1',
  notificationError: '#FFEBEE',
  
  // Gradients
  gradientPrimary: ['#007AFF', '#5856D6'],
  gradientBackground: ['#F2F2F7', '#E5E5EA'],
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const TYPOGRAPHY = {
  // Font sizes
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  
  // Font weights
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

const ChatScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  
  // Valeurs par défaut si route.params n'est pas défini (pour les tests)
  const params = route?.params || {};
  const {
    recipientId = 'demo-user',
    recipientName = 'Demo Chat',
    recipientLanguage = 'fr'
  } = params;
  
  // États principaux
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  // Références
  const messagesRef = useRef([]);
  const chatSocketRef = useRef(null);
  
  // Hooks personnalisés
  const { isConnected, connectionType } = useNetworkStatus();
  const { queueMessage, sendQueuedMessages, pendingCount } = useMessageQueue();
  const { 
    translateMessage, 
    isTranslating, 
    translationError,
    supportedLanguages 
  } = useRealTimeTranslation();
  const { 
    analyzeMessage, 
    moodData,
    compatibility,
    getInteractionRecommendations,
    isAnalyzing,
    error: emotionError
  } = useEmotionAnalysis('current_user_id', recipientId);

  // Initialisation de la connexion chat
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setConnectionStatus('connecting');
        
        // Connexion au service de chat
        chatSocketRef.current = await chatService.connect({
          userId: 'current_user_id', // À récupérer du contexte auth
          recipientId,
          onMessage: handleIncomingMessage,
          onTyping: handleTypingIndicator,
          onConnectionChange: setConnectionStatus
        });
        
        // Chargement de l'historique
        const history = await chatService.loadHistory(recipientId, 50);
        setMessages(history);
        messagesRef.current = history;
        
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Erreur initialisation chat:', error);
        setConnectionStatus('error');
        Alert.alert('Erreur', 'Impossible de se connecter au chat');
      }
    };

    initializeChat();

    // Nettoyage à la fermeture
    return () => {
      if (chatSocketRef.current) {
        chatService.disconnect(chatSocketRef.current);
      }
    };
  }, [recipientId]);

  // Gestion du retour réseau
  useEffect(() => {
    if (isConnected && pendingCount > 0) {
      sendQueuedMessages();
    }
  }, [isConnected, pendingCount]);

  // Gestion du back button Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pendingCount > 0) {
        Alert.alert(
          'Messages non envoyés',
          `Vous avez ${pendingCount} message(s) en attente. Voulez-vous vraiment quitter ?`,
          [
            { text: 'Rester', style: 'cancel' },
            { text: 'Quitter', onPress: () => navigation.goBack() }
          ]
        );
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [pendingCount]);

  // Gestion des messages entrants
  const handleIncomingMessage = useCallback(async (message) => {
    try {
      // Traduction automatique si nécessaire
      let processedMessage = message;
      if (message.language && message.language !== getUserLanguage()) {
        const translation = await translateMessage(
          message.text, 
          message.language, 
          getUserLanguage()
        );
        processedMessage = {
          ...message,
          translatedText: translation.text,
          translationConfidence: translation.confidence
        };
      }

      // Analyse émotionnelle
      const emotionData = await analyzeMessage(processedMessage.text);
      processedMessage.emotion = emotionData;

      // Mise à jour de la liste
      const updatedMessages = [...messagesRef.current, processedMessage];
      setMessages(updatedMessages);
      messagesRef.current = updatedMessages;

      // Notification si l'app est en arrière-plan
      if (AppState.currentState !== 'active') {
        notificationService.showIncomingMessage(recipientName, message.text);
      }
    } catch (error) {
      console.error('Erreur traitement message entrant:', error);
    }
  }, [translateMessage, analyzeMessage, recipientName]);

  // Envoi de message
  const handleSendMessage = useCallback(async (messageData) => {
    try {
      const { text, type, audioPath, duration } = messageData;
      
      if (!text?.trim() && !audioPath) return;

      // Création du message local
      const localMessage = {
        id: `temp_${Date.now()}`,
        text: text || '',
        type: type || 'text',
        audioPath,
        duration,
        sender: 'user',
        timestamp: new Date(),
        language: getUserLanguage(),
        status: 'sending'
      };

      // Ajout immédiat à la liste (UX optimiste)
      const updatedMessages = [...messagesRef.current, localMessage];
      setMessages(updatedMessages);
      messagesRef.current = updatedMessages;

      // Traduction si nécessaire
      let translationData = null;
      if (recipientLanguage !== getUserLanguage()) {
        translationData = await translateMessage(
          text, 
          getUserLanguage(), 
          recipientLanguage
        );
      }

      // Analyse émotionnelle
      const emotionData = await analyzeMessage(text);

      // Préparation du message final
      const finalMessage = {
        ...localMessage,
        id: generateMessageId(),
        translatedText: translationData?.text,
        translationConfidence: translationData?.confidence,
        emotion: emotionData,
        status: 'pending'
      };

      // Envoi via queue (gère automatiquement offline/online)
      if (isConnected) {
        await chatService.sendMessage(chatSocketRef.current, finalMessage);
        updateMessageStatus(finalMessage.id, 'sent');
      } else {
        queueMessage(finalMessage);
        updateMessageStatus(finalMessage.id, 'queued');
      }

    } catch (error) {
      console.error('Erreur envoi message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      // Marquer le message comme échoué
      // updateMessageStatus(localMessage.id, 'failed');
    }
  }, [isConnected, recipientLanguage, translateMessage, analyzeMessage, queueMessage]);

  // Indicateur de frappe
  const handleTypingIndicator = useCallback((isTyping) => {
    setIsTyping(isTyping);
  }, []);

  // Fonction utilitaire pour mettre à jour le statut d'un message
  const updateMessageStatus = useCallback((messageId, status) => {
    const updatedMessages = messagesRef.current.map(msg =>
      msg.id === messageId ? { ...msg, status } : msg
    );
    setMessages(updatedMessages);
    messagesRef.current = updatedMessages;
  }, []);

  // Fonctions utilitaires
  const getUserLanguage = () => {
    // À récupérer des préférences utilisateur ou détecter automatiquement
    return 'fr';
  };

  const generateMessageId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Composant pour les notifications inline
  const NotificationBanner = ({ type, message, icon }) => (
    <View style={[styles.notificationBanner, styles[`notification${type}`]]}>
      <Text style={styles.notificationIcon}>{icon}</Text>
      <Text style={[styles.notificationText, styles[`notification${type}Text`]]}>
        {message}
      </Text>
    </View>
  );

  // Rendu conditionnel si pas de connexion
  if (connectionStatus === 'error') {
    return (
      <ErrorBoundary 
        error="Impossible de se connecter au chat"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Configuration de la status bar */}
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.surface}
          translucent={false}
        />

        {/* Header avec design moderne */}
        <View style={styles.headerContainer}>
          <ChatHeader
            recipientName={recipientName}
            recipientLanguage={recipientLanguage}
            connectionStatus={connectionStatus}
            isTyping={isTyping}
            onLanguageChange={(newLang) => {
              // Logique changement de langue
            }}
          />
        </View>

        {/* Zone des indicateurs de statut */}
        <View style={styles.statusContainer}>
          {/* Indicateur de statut réseau */}
          <ConnectionStatus
            isConnected={isConnected}
            connectionType={connectionType}
            pendingMessages={pendingCount}
          />

          {/* Indicateur de traduction active */}
          {(isTranslating || translationError) && (
            <TranslationIndicator
              isActive={isTranslating}
              error={translationError}
            />
          )}

          {/* Notification d'erreur d'analyse émotionnelle */}
          {emotionError && (
            <NotificationBanner
              type="Warning"
              icon="⚠️"
              message={`Analyse émotionnelle limitée: ${emotionError}`}
            />
          )}
        </View>

        {/* Indicateur de profil émotionnel avec nouveau design */}
        <View style={styles.emotionalProfileContainer}>
          <EmotionalProfileIndicator
            userId="current_user_id"
            recipientId={recipientId}
            showCompatibility={true}
            compact={false}
            onProfilePress={() => {
              // Navigation vers les détails du profil émotionnel
              console.log('Navigation vers profil émotionnel');
            }}
          />
        </View>

        {/* Zone principale des messages */}
        <View style={styles.messagesContainer}>
          <MessagesList
            messages={messages}
            onRetryMessage={(messageId) => {
              // Logique de renvoi de message
            }}
            onTranslateMessage={async (messageId, targetLang) => {
              // Logique de traduction à la demande
            }}
          />
        </View>

        {/* Zone de saisie avec design moderne */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
          <MessageInput
            onSendMessage={handleSendMessage}
            isDisabled={connectionStatus === 'connecting' || isTranslating}
            recipientLanguage={recipientLanguage}
            currentMood={moodData}
            interactionRecommendations={getInteractionRecommendations()}
            compatibility={compatibility}
          />
        </View>
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  // Layout principal
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  headerContainer: {
    backgroundColor: COLORS.warning,
    ...SHADOWS.small,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
    marginTop: SPACING.lg,
  },
  
  // Zone des status
  statusContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  
  // Profil émotionnel
  emotionalProfileContainer: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: 12,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  
  // Zone messages
  messagesContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Zone de saisie
  inputContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    ...SHADOWS.medium,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.separator,
  },
  
  // Notifications banner
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: SPACING.sm,
    marginVertical: SPACING.xs,
    ...SHADOWS.small,
  },
  
  notificationInfo: {
    backgroundColor: COLORS.notificationInfo,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  
  notificationWarning: {
    backgroundColor: COLORS.notificationWarning,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  
  notificationError: {
    backgroundColor: COLORS.notificationError,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  
  notificationIcon: {
    fontSize: TYPOGRAPHY.md,
    marginRight: SPACING.sm,
  },
  
  notificationText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
  
  notificationInfoText: {
    color: COLORS.primary,
  },
  
  notificationWarningText: {
    color: '#B8860B', // Couleur dorée pour le warning
  },
  
  notificationErrorText: {
    color: COLORS.error,
  },
});

export default ChatScreen;