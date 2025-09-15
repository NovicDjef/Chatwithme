// app/store/slices/chatSlice.js - Gestion du chat temps réel
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { chatAPI } from '../services/api';
import { socketService } from '../services/socket';

// =============================================================================
// THUNKS ASYNCHRONES
// =============================================================================

// Récupérer toutes les conversations
export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Redux: Fetching conversations...');
      const result = await chatAPI.conversation.getAll();
      return result;
    } catch (error) {
      console.error('Fetch conversations error:', error);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// Récupérer/Créer une conversation avec un utilisateur
export const fetchOrCreateConversation = createAsyncThunk(
  'chat/fetchOrCreateConversation',
  async (otherUserId, { rejectWithValue }) => {
    try {
      console.log('Redux: Fetching conversation with user:', otherUserId);
      const result = await chatAPI.conversation.getOrCreate(otherUserId);

      // Rejoindre la conversation sur WebSocket
      if (result.conversation?.id) {
        socketService.joinConversation(result.conversation.id);
      }

      return result;
    } catch (error) {
      console.error('Fetch conversation error:', error);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// Envoyer un message texte
export const sendTextMessage = createAsyncThunk(
  'chat/sendTextMessage',
  async ({ conversationId, content }, { rejectWithValue }) => {
    try {
      console.log('Redux: Sending text message...');

      // Envoyer via API uniquement - le message sera ajouté par le reducer
      const result = await chatAPI.conversation.sendMessage(conversationId, content);
      console.log('API result:', result);

      // Note: Ne pas envoyer via WebSocket pour éviter les doublons
      // Le serveur se chargera de notifier les autres utilisateurs

      return result;
    } catch (error) {
      console.error('Send message error:', error);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// Envoyer un message média (image, voice, file)
export const sendMediaMessage = createAsyncThunk(
  'chat/sendMediaMessage',
  async ({ conversationId, mediaData }, { rejectWithValue }) => {
    try {
      console.log('Redux: Sending media message...');

      // Envoyer via API pour upload - le message sera ajouté par le reducer
      const result = await chatAPI.conversation.sendMedia(conversationId, mediaData);

      // Note: Ne pas envoyer via WebSocket pour éviter les doublons
      // Le serveur se chargera de notifier les autres utilisateurs

      return result;
    } catch (error) {
      console.error('Send media message error:', error);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// Marquer les messages comme lus
export const markConversationAsRead = createAsyncThunk(
  'chat/markAsRead',
  async (conversationId, { rejectWithValue }) => {
    try {
      console.log('Redux: Marking conversation as read:', conversationId);

      // API call
      const result = await chatAPI.conversation.markAsRead(conversationId);

      // WebSocket notification
      socketService.markMessagesRead({ conversationId });

      return { conversationId, ...result };
    } catch (error) {
      console.error('Mark as read error:', error);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// Récupérer tous les groupes
export const fetchGroups = createAsyncThunk(
  'chat/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Redux: Fetching groups...');
      const result = await chatAPI.group.getAll();
      return result;
    } catch (error) {
      console.error('Fetch groups error:', error);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// Créer un groupe
export const createGroup = createAsyncThunk(
  'chat/createGroup',
  async (groupData, { rejectWithValue }) => {
    try {
      console.log('Redux: Creating group...');
      const result = await chatAPI.group.create(groupData);
      return result;
    } catch (error) {
      console.error('Create group error:', error);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// =============================================================================
// SLICE
// =============================================================================

const initialState = {
  // Conversations 1-to-1
  conversations: [],
  currentConversation: null,

  // Groupes
  groups: [],
  currentGroup: null,

  // Messages en temps réel
  realtimeMessages: {}, // { conversationId: [messages] }

  // États de chargement
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,

  // Utilisateurs en ligne
  onlineUsers: new Set(),

  // Indicateurs de frappe
  typingUsers: {}, // { conversationId: [userIds] }

  // Erreurs
  error: null,

  // WebSocket status
  isSocketConnected: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Nettoyer les erreurs
    clearError: (state) => {
      state.error = null;
    },

    // === WEBSOCKET EVENTS ===

    // Nouvel message reçu en temps réel
    addRealtimeMessage: (state, action) => {
      const message = action.payload;
      const conversationId = message.conversationId;

      // Valider le message avant de l'ajouter
      if (!message || !message.id || !conversationId) {
        console.warn('Invalid message received:', message);
        return;
      }

      if (!state.realtimeMessages[conversationId]) {
        state.realtimeMessages[conversationId] = [];
      }

      // Éviter les doublons
      const existingMessage = state.realtimeMessages[conversationId].find(
        m => m.id === message.id
      );

      if (!existingMessage) {
        state.realtimeMessages[conversationId].push(message);

        // Mettre à jour aussi la conversation courante
        if (state.currentConversation?.id === conversationId) {
          // Vérifier que messages existe
          if (!state.currentConversation.messages) {
            state.currentConversation.messages = [];
          }

          // Éviter les doublons dans la conversation courante aussi
          const existingInCurrent = state.currentConversation.messages.find(
            m => m.id === message.id
          );

          if (!existingInCurrent) {
            state.currentConversation.messages.push(message);
          }
        }
      }
    },

    // Mettre à jour le statut de connexion WebSocket
    setSocketConnectionStatus: (state, action) => {
      state.isSocketConnected = action.payload;
    },

    // Utilisateur en ligne
    setUserOnline: (state, action) => {
      state.onlineUsers.add(action.payload.id);
    },

    // Utilisateur hors ligne
    setUserOffline: (state, action) => {
      state.onlineUsers.delete(action.payload.id);
    },

    // Utilisateur commence à taper
    setUserTyping: (state, action) => {
      const { conversationId, userId } = action.payload;

      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }

      if (!state.typingUsers[conversationId].includes(userId)) {
        state.typingUsers[conversationId].push(userId);
      }
    },

    // Utilisateur arrête de taper
    setUserStopTyping: (state, action) => {
      const { conversationId, userId } = action.payload;

      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
          id => id !== userId
        );
      }
    },

    // Définir la conversation actuelle
    setCurrentConversation: (state, action) => {
      state.currentConversation = action.payload;
    },

    // Définir le groupe actuel
    setCurrentGroup: (state, action) => {
      state.currentGroup = action.payload;
    },

    // Messages marqués comme lus
    markMessagesAsRead: (state, action) => {
      const { conversationId } = action.payload;

      // Mettre à jour dans la conversation courante
      if (state.currentConversation?.id === conversationId) {
        state.currentConversation.messages.forEach(message => {
          if (!message.isRead) {
            message.isRead = true;
          }
        });
      }

      // Mettre à jour dans la liste des conversations
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.unreadCount = 0;
      }
    },
  },
  extraReducers: (builder) => {
    // =======================================================================
    // FETCH CONVERSATIONS
    // =======================================================================
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.isLoadingConversations = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoadingConversations = false;
        state.conversations = action.payload.conversations || [];
        state.error = null;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoadingConversations = false;
        state.error = action.payload?.message || 'Erreur lors du chargement des conversations';
      });

    // =======================================================================
    // FETCH/CREATE CONVERSATION
    // =======================================================================
    builder
      .addCase(fetchOrCreateConversation.pending, (state) => {
        state.isLoadingMessages = true;
        state.error = null;
      })
      .addCase(fetchOrCreateConversation.fulfilled, (state, action) => {
        state.isLoadingMessages = false;
        state.currentConversation = action.payload.conversation;

        // Ajouter à la liste si pas déjà présent
        const existingIndex = state.conversations.findIndex(
          c => c.id === action.payload.conversation.id
        );

        if (existingIndex >= 0) {
          state.conversations[existingIndex] = action.payload.conversation;
        } else {
          state.conversations.unshift(action.payload.conversation);
        }

        state.error = null;
      })
      .addCase(fetchOrCreateConversation.rejected, (state, action) => {
        state.isLoadingMessages = false;
        state.error = action.payload?.message || 'Erreur lors du chargement de la conversation';
      });

    // =======================================================================
    // SEND TEXT MESSAGE
    // =======================================================================
    builder
      .addCase(sendTextMessage.pending, (state) => {
        state.isSendingMessage = true;
        state.error = null;
      })
      .addCase(sendTextMessage.fulfilled, (state, action) => {
        state.isSendingMessage = false;
        state.error = null;

        // Ajouter le message immédiatement à la conversation actuelle
        if (action.payload.message && state.currentConversation) {
          // Éviter les doublons
          const existingMessage = state.currentConversation.messages.find(
            m => m.id === action.payload.message.id
          );

          if (!existingMessage) {
            state.currentConversation.messages.push(action.payload.message);
          }
        }
      })
      .addCase(sendTextMessage.rejected, (state, action) => {
        state.isSendingMessage = false;
        state.error = action.payload?.message || 'Erreur lors de l\'envoi du message';
      });

    // =======================================================================
    // SEND MEDIA MESSAGE
    // =======================================================================
    builder
      .addCase(sendMediaMessage.pending, (state) => {
        state.isSendingMessage = true;
        state.error = null;
      })
      .addCase(sendMediaMessage.fulfilled, (state, action) => {
        state.isSendingMessage = false;
        state.error = null;

        // Ajouter le message média immédiatement à la conversation actuelle
        if (action.payload.message && state.currentConversation) {
          // Éviter les doublons
          const existingMessage = state.currentConversation.messages.find(
            m => m.id === action.payload.message.id
          );

          if (!existingMessage) {
            state.currentConversation.messages.push(action.payload.message);
          }
        }
      })
      .addCase(sendMediaMessage.rejected, (state, action) => {
        state.isSendingMessage = false;
        state.error = action.payload?.message || 'Erreur lors de l\'envoi du média';
      });

    // =======================================================================
    // MARK AS READ
    // =======================================================================
    builder
      .addCase(markConversationAsRead.fulfilled, (state, action) => {
        // Géré dans le reducer markMessagesAsRead
      });

    // =======================================================================
    // GROUPS
    // =======================================================================
    builder
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.groups = action.payload.groups || [];
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.groups.unshift(action.payload.group);
      });
  },
});

// =============================================================================
// ACTIONS ET SÉLECTEURS
// =============================================================================

export const {
  clearError,
  addRealtimeMessage,
  setSocketConnectionStatus,
  setUserOnline,
  setUserOffline,
  setUserTyping,
  setUserStopTyping,
  setCurrentConversation,
  setCurrentGroup,
  markMessagesAsRead,
} = chatSlice.actions;

// Sélecteurs
export const selectChat = (state) => state.chat;
export const selectConversations = (state) => state.chat.conversations;
export const selectCurrentConversation = (state) => state.chat.currentConversation;
export const selectGroups = (state) => state.chat.groups;
export const selectCurrentGroup = (state) => state.chat.currentGroup;
export const selectIsLoadingConversations = (state) => state.chat.isLoadingConversations;
export const selectIsLoadingMessages = (state) => state.chat.isLoadingMessages;
export const selectIsSendingMessage = (state) => state.chat.isSendingMessage;
export const selectOnlineUsers = (state) => Array.from(state.chat.onlineUsers);
export const selectTypingUsers = (conversationId) => (state) =>
  state.chat.typingUsers[conversationId] || [];
export const selectIsSocketConnected = (state) => state.chat.isSocketConnected;
export const selectChatError = (state) => state.chat.error;

export default chatSlice.reducer;