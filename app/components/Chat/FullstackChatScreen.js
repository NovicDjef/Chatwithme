// app/components/Chat/FullstackChatScreen.js - Chat fullstack avec backend réel
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';

// Redux hooks
import { useAppDispatch } from '../../hooks/redux/useAppDispatch';
import { useAppSelector } from '../../hooks/redux/useAppSelector';

// Redux actions et sélecteurs
import {
  fetchOrCreateConversation,
  sendTextMessage,
  sendMediaMessage,
  markConversationAsRead,
  setCurrentConversation,
  selectCurrentConversation,
  selectIsLoadingMessages,
  selectIsSendingMessage,
  selectOnlineUsers,
  selectTypingUsers,
  selectChatError,
} from '../../store/slices/chatSlice';

import {
  selectUser,
  selectIsAuthenticated,
  selectToken,
} from '../../store/slices/authSlice';

// Composants
import InlineVoiceRecorder from './InlineVoiceRecorder';
import ImagePicker from './ImagePicker';
import MessageBubble from './MessageBubble';
import ConnectionStatus from './ConnectionStatus';

// Services
import { socketService } from '../../store/services/socket';
import StorageService from '../../store/services/storage';

const FullstackChatScreen = ({ route }) => {
  // Props depuis la navigation (Expo Router ou React Navigation)
  const params = useLocalSearchParams();
  const { otherUserId, otherUser } = route?.params || params || {};

  // Parse otherUser si c'est une string JSON
  const parsedOtherUser = typeof otherUser === 'string' ?
    JSON.parse(otherUser) : otherUser;

  // Vérifier que les paramètres nécessaires sont présents
  useEffect(() => {
    if (!otherUserId || !parsedOtherUser) {
      console.warn('⚠️ Missing chat parameters, redirecting...');
      Alert.alert(
        'Erreur',
        'Paramètres de conversation manquants',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [otherUserId, parsedOtherUser]);

  // Si pas de paramètres, afficher un écran de chargement
  if (!otherUserId || !parsedOtherUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Chargement de la conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Redux state
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authToken = useAppSelector(selectToken);
  const currentConversation = useAppSelector(selectCurrentConversation);
  const isLoadingMessages = useAppSelector(selectIsLoadingMessages);
  const isSendingMessage = useAppSelector(selectIsSendingMessage);
  const onlineUsers = useAppSelector(selectOnlineUsers);
  const typingUsers = useAppSelector(selectTypingUsers(currentConversation?.id));
  const chatError = useAppSelector(selectChatError);

  // États locaux
  const [inputText, setInputText] = useState('');
  const [isRecordingInline, setIsRecordingInline] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const scrollViewRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // =============================================================================
  // EFFETS
  // =============================================================================

  // Charger la conversation au montage
  useEffect(() => {
    if (!isAuthenticated || !authToken || !otherUserId) {
      if (!isAuthenticated) {
        Alert.alert('Erreur', 'Vous devez être connecté pour accéder au chat');
        router.back();
      } else if (!authToken) {
        console.log('⏳ Waiting for auth token to be available...');
        // Ne pas faire d'erreur, juste attendre que le token arrive
      }
      return;
    }

    console.log('FullstackChat: Loading conversation with user:', otherUserId);
    console.log('✅ Auth token available in Redux');
    dispatch(fetchOrCreateConversation(otherUserId));

    // Nettoyage au démontage
    return () => {
      dispatch(setCurrentConversation(null));
    };
  }, [dispatch, otherUserId, isAuthenticated, authToken]);

  // Marquer les messages comme lus quand la conversation change
  useEffect(() => {
    if (currentConversation?.id) {
      dispatch(markConversationAsRead(currentConversation.id));
    }
  }, [dispatch, currentConversation?.id]);

  // Scroll automatique vers le bas
  useEffect(() => {
    if (currentConversation?.messages?.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentConversation?.messages?.length]);

  // Gestion des erreurs
  useEffect(() => {
    if (chatError) {
      Alert.alert('Erreur', chatError);
    }
  }, [chatError]);

  // =============================================================================
  // GESTION DES MESSAGES
  // =============================================================================

  // Envoyer message texte
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !currentConversation?.id || isSendingMessage) {
      return;
    }

    const messageText = inputText.trim();
    setInputText('');

    // Arrêter l'indicateur de frappe
    if (isTyping) {
      setIsTyping(false);
      socketService.stopTyping({ conversationId: currentConversation.id });
    }

    try {
      await dispatch(sendTextMessage({
        conversationId: currentConversation.id,
        content: messageText
      })).unwrap();

      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(messageText); // Restaurer le texte en cas d'erreur
    }
  }, [inputText, currentConversation?.id, isSendingMessage, dispatch, isTyping]);

  // Gestion de l'enregistrement vocal
  const handleSendVoiceNote = useCallback(async (voiceData) => {
    if (!currentConversation?.id) return;

    console.log('Sending voice note:', voiceData);

    try {
      const mediaData = {
        uri: voiceData.audioUri,
        type: 'audio/m4a',
        name: `voice_${Date.now()}.m4a`,
        duration: voiceData.duration,
        content: voiceData.transcription || `Note vocale (${voiceData.duration}s)`,
        messageType: 'voice',
      };

      await dispatch(sendMediaMessage({
        conversationId: currentConversation.id,
        mediaData
      })).unwrap();

      console.log('Voice note sent successfully');
    } catch (error) {
      console.error('Error sending voice note:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la note vocale');
    }
  }, [dispatch, currentConversation?.id]);

  // Gestion des images
  const handleSendImage = useCallback(async (imageData) => {
    if (!currentConversation?.id) return;

    console.log('Sending image:', imageData);

    try {
      const mediaData = {
        uri: imageData.uri,
        type: 'image/jpeg',
        name: `image_${Date.now()}.jpg`,
        content: 'Photo',
      };

      await dispatch(sendMediaMessage({
        conversationId: currentConversation.id,
        mediaData
      })).unwrap();

      setShowImagePicker(false);
      console.log('Image sent successfully');
    } catch (error) {
      console.error('Error sending image:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'image');
    }
  }, [dispatch, currentConversation?.id]);

  // =============================================================================
  // INDICATEURS DE FRAPPE
  // =============================================================================

  // Gestion de la frappe
  const handleTextChange = useCallback((text) => {
    setInputText(text);

    if (!currentConversation?.id) return;

    // Démarrer l'indicateur de frappe si pas déjà actif
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socketService.startTyping({ conversationId: currentConversation.id });
    }

    // Réinitialiser le timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Arrêter la frappe après 2 secondes d'inactivité
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socketService.stopTyping({ conversationId: currentConversation.id });
      }
    }, 2000);
  }, [currentConversation?.id, isTyping]);

  // Nettoyage du timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // =============================================================================
  // HELPERS
  // =============================================================================

  // Vérifier si l'autre utilisateur est en ligne
  const isOtherUserOnline = onlineUsers.includes(otherUserId);

  // Obtenir la liste des utilisateurs qui tapent (exclus l'utilisateur actuel)
  const activeTypingUsers = typingUsers.filter(userId => userId !== currentUser?.id);

  // =============================================================================
  // RENDU
  // =============================================================================

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Vous devez être connecté</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoadingMessages) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Chargement de la conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {parsedOtherUser?.firstName} {parsedOtherUser?.lastName}
            </Text>
            <Text style={styles.userStatus}>
              {isOtherUserOnline ? 'En ligne' : 'Hors ligne'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <ConnectionStatus />
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {currentConversation?.messages?.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender.id === currentUser?.id}
              currentUser={currentUser}
            />
          ))}

          {/* Indicateur de frappe */}
          {activeTypingUsers.length > 0 && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>
                {activeTypingUsers.length === 1 ? 'L\'utilisateur tape...' : 'Plusieurs utilisateurs tapent...'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Zone de saisie */}
        <View style={styles.inputContainer}>
          {isRecordingInline ? (
            /* Mode enregistrement - Pleine largeur */
            <InlineVoiceRecorder
              onSendVoiceNote={handleSendVoiceNote}
              onCancel={() => setIsRecordingInline(false)}
              language={currentUser?.language || 'fr'}
              onRecordingStateChange={setIsRecordingInline}
            />
          ) : (
            /* Mode normal - Layout standard */
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowImagePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={24} color="#6b7280" />
              </TouchableOpacity>

              <InlineVoiceRecorder
                onSendVoiceNote={handleSendVoiceNote}
                onCancel={() => setIsRecordingInline(false)}
                language={currentUser?.language || 'fr'}
                onRecordingStateChange={setIsRecordingInline}
              />

              <TextInput
                style={styles.textInput}
                placeholder="Écrivez votre message..."
                value={inputText}
                onChangeText={handleTextChange}
                multiline
                maxLength={500}
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !inputText.trim() && styles.sendButtonDisabled
                ]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isSendingMessage}
                activeOpacity={0.8}
              >
                {isSendingMessage ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="send" size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Sélecteur d'images */}
        <ImagePicker
          visible={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onSendImage={handleSendImage}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  userStatus: {
    fontSize: 14,
    color: '#6b7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesContent: {
    padding: 16,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    alignItems: 'flex-end',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 120,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default FullstackChatScreen;