// ChatScreen.js - Version refactorisée avec séparation des responsabilités
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    AppState,
    BackHandler,
    StyleSheet,
    View
} from 'react-native';

// Hooks personnalisés
import { useMessageQueue } from '../hooks/chat/useMessageQueue';
import { useNetworkStatus } from '../hooks/common/useNetworkStatus';
import { useEmotionAnalysis } from '../../hooks/emotion/useEmotionAnalysis.js';
import { useRealTimeTranslation } from '../hooks/translation/useRealTimeTranslation';

// Composants modulaires
import ChatHeader from '../components/Chat/ChatHeader';
import ConnectionStatus from '../components/Chat/ConnectionStatus';
import EmotionalProfileIndicator from './EmotionalProfileIndicator.js';
import MessageInput from '../components/Chat/MessageInput';
import MessagesList from '../components/Chat/MessagesList';
import TranslationIndicator from '../components/Chat/TranslationIndicator';
import ErrorBoundary from '../components/UI/ErrorBoundary';

// Services
import { chatService } from '../services/chat/chatService';
import { notificationService } from '../services/notification/notificationService';

const ChatScreen = ({ route, navigation }) => {
  const { recipientId, recipientName, recipientLanguage } = route.params;
  
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
      updateMessageStatus(localMessage.id, 'failed');
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
      <View style={styles.container}>
        {/* Header avec infos du destinataire et statut */}
        <ChatHeader
          recipientName={recipientName}
          recipientLanguage={recipientLanguage}
          connectionStatus={connectionStatus}
          isTyping={isTyping}
          onLanguageChange={(newLang) => {
            // Logique changement de langue
          }}
        />

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

        {/* Indicateur d'erreur d'analyse émotionnelle */}
        {emotionError && (
          <View style={styles.errorIndicator}>
            <Text style={styles.errorText}>
              ⚠️ Analyse émotionnelle limitée: {emotionError}
            </Text>
          </View>
        )}

        {/* Indicateur de profil émotionnel du destinataire */}
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

        {/* Liste des messages */}
        <MessagesList
          messages={messages}
          onRetryMessage={(messageId) => {
            // Logique de renvoi de message
          }}
          onTranslateMessage={async (messageId, targetLang) => {
            // Logique de traduction à la demande
          }}
        />

        {/* Zone de saisie */}
        <MessageInput
          onSendMessage={handleSendMessage}
          isDisabled={connectionStatus === 'connecting' || isTranslating}
          recipientLanguage={recipientLanguage}
          currentMood={moodData}
          interactionRecommendations={getInteractionRecommendations()}
          compatibility={compatibility}
        />
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorIndicator: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    margin: 8,
  },
  errorText: {
    color: '#856404',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ChatScreen;