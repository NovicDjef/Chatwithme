// app/store/index.js - Configuration du store Redux
import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';

// Reducers
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';

// Services
import { socketService } from './services/socket';

// =============================================================================
// CONFIGURATION DU STORE
// =============================================================================

const rootReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignorer ces actions car elles contiennent des fonctions ou des objets non-sérialisables
        ignoredActions: [
          'chat/setUserOnline',
          'chat/setUserOffline',
          'persist/PERSIST',
          'persist/REHYDRATE',
        ],
        // Ignorer ces paths dans l'état
        ignoredPaths: ['chat.onlineUsers'],
      },
    }),
  devTools: __DEV__, // Activer les DevTools seulement en développement
});

// =============================================================================
// CONFIGURATION WEBSOCKET AVEC REDUX
// =============================================================================

// Fonction pour configurer les listeners WebSocket avec le store
export const setupSocketListeners = (store) => {
  const { dispatch } = store;

  // Import des actions (évite les imports circulaires)
  const {
    addRealtimeMessage,
    setSocketConnectionStatus,
    setUserOnline,
    setUserOffline,
    setUserTyping,
    setUserStopTyping,
    markMessagesAsRead,
  } = require('./slices/chatSlice');

  console.log('📡 Setting up WebSocket listeners with Redux...');

  // === STATUT DE CONNEXION ===
  socketService.on('connection_status', (data) => {
    console.log('Socket connection status:', data.connected);
    dispatch(setSocketConnectionStatus(data.connected));
  });

  // === MESSAGES EN TEMPS RÉEL ===
  socketService.on('new_message', (message) => {
    console.log('📨 Realtime message received:', message);
    dispatch(addRealtimeMessage(message));
  });

  socketService.on('new_group_message', (message) => {
    console.log('📨 Realtime group message received:', message);
    dispatch(addRealtimeMessage(message));
  });

  // === STATUTS UTILISATEURS ===
  socketService.on('user_online', (user) => {
    console.log(`🟢 User ${user.username} is online`);
    dispatch(setUserOnline(user));
  });

  socketService.on('user_offline', (user) => {
    console.log(`🔴 User ${user.username} is offline`);
    dispatch(setUserOffline(user));
  });

  // === INDICATEURS DE FRAPPE ===
  socketService.on('user_typing', (data) => {
    console.log(`✏️ ${data.username} is typing...`);
    dispatch(setUserTyping({
      conversationId: data.conversationId,
      userId: data.userId
    }));
  });

  socketService.on('user_stop_typing', (data) => {
    console.log(`⏹️ User ${data.userId} stopped typing`);
    dispatch(setUserStopTyping({
      conversationId: data.conversationId,
      userId: data.userId
    }));
  });

  // === MESSAGES LUS ===
  socketService.on('messages_read', (data) => {
    console.log('✅ Messages marked as read:', data);
    dispatch(markMessagesAsRead(data));
  });

  // === ERREURS DE CONNEXION ===
  socketService.on('connection_error', (error) => {
    console.error('Socket connection error:', error);
    dispatch(setSocketConnectionStatus(false));
  });

  console.log('✅ WebSocket listeners configured with Redux');
};

// =============================================================================
// HELPERS POUR L'APPLICATION
// =============================================================================

// Obtenir l'état actuel du store
export const getStoreState = () => store.getState();

// Obtenir le dispatch du store
export const getStoreDispatch = () => store.dispatch;

// Vérifier si l'utilisateur est connecté
export const isUserAuthenticated = () => {
  const state = getStoreState();
  return !!state.auth.user && !!state.auth.token;
};

// Obtenir l'utilisateur connecté
export const getCurrentUser = () => {
  const state = getStoreState();
  return state.auth.user;
};

// Obtenir la conversation actuelle
export const getCurrentConversation = () => {
  const state = getStoreState();
  return state.chat.currentConversation;
};

// =============================================================================
// TYPES POUR TYPESCRIPT (optionnel)
// =============================================================================

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

// =============================================================================
// EXPORT PAR DÉFAUT
// =============================================================================

export default store;