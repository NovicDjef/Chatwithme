// app/store/services/api.js - Service API centralisé
import axios from 'axios';
import StorageService from './storage';

// Configuration de base
const BASE_URL = 'http://192.168.1.86:3001';

// Instance Axios principale
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Instance pour les uploads multipart
export const uploadClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // Plus long pour les uploads
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Intercepteur pour ajouter le token automatiquement
const addTokenInterceptor = (client) => {
  client.interceptors.request.use(
    async (config) => {
      try {
        const token = await StorageService.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔑 Token added to request:', config.method?.toUpperCase(), config.url);
        } else {
          console.log('🚫 No token found for request:', config.method?.toUpperCase(), config.url);
        }
        console.log('📤 API Request:', config.method?.toUpperCase(), config.baseURL + config.url);
        return config;
      } catch (error) {
        console.error('❌ Error getting token:', error);
        return config;
      }
    },
    (error) => {
      console.error('❌ Request interceptor error:', error);
      return Promise.reject(error);
    }
  );
};

// Intercepteur de réponse pour gerer les erreurs
const addResponseInterceptor = (client) => {
  client.interceptors.response.use(
    (response) => {
      console.log('✅ API Response SUCCESS:', response.status, response.config.url);
      console.log('✅ Response data:', response.data);
      return response;
    },
    async (error) => {
      console.error('❌ API Error Details:');
      console.error('  - Status:', error.response?.status);
      console.error('  - URL:', error.config?.url);
      console.error('  - Data sent:', error.config?.data);
      console.error('  - Response data:', error.response?.data);
      console.error('  - Full error:', error.message);

      // Si token expiré (401), nettoyer la session
      if (error.response?.status === 401) {
        await StorageService.clearSession();
        console.log('🔓 Session cleared due to 401 error');
      }

      return Promise.reject(error);
    }
  );
};

// Appliquer les intercepteurs
addTokenInterceptor(apiClient);
addTokenInterceptor(uploadClient);
addResponseInterceptor(apiClient);
addResponseInterceptor(uploadClient);

// =============================================================================
// AUTH SERVICES
// =============================================================================

export const authAPI = {
  // Inscription
  signup: async (userData) => {
    const formData = new FormData();

    // Ajouter les données texte
    Object.keys(userData).forEach(key => {
      if (key !== 'avatar') {
        formData.append(key, userData[key]);
      }
    });

    // Ajouter l'avatar si présent
    if (userData.avatar) {
      formData.append('avatar', {
        uri: userData.avatar,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });
    }

    const response = await uploadClient.post('/auth/signup', formData);

    // Sauvegarder la session complète
    if (response.data.token && response.data.user) {
      await StorageService.saveSession({
        token: response.data.token,
        user: response.data.user
      });
    }

    return response.data;
  },

  // Connexion
  login: async (credentials) => {
    // Essayer d'abord avec JSON
    try {
      const response = await apiClient.post('/auth/login', credentials);

      // Sauvegarder la session complète
      if (response.data.token && response.data.user) {
        await StorageService.saveSession({
          token: response.data.token,
          user: response.data.user
        });
      }

      return response.data;
    } catch (error) {
      // Si ça échoue avec JSON, essayer avec FormData comme signup
      console.log('🔄 Login JSON failed, trying FormData...');

      const formData = new FormData();
      Object.keys(credentials).forEach(key => {
        formData.append(key, credentials[key]);
      });

      const response = await uploadClient.post('/auth/login', formData);

      // Sauvegarder la session complète
      if (response.data.token && response.data.user) {
        await StorageService.saveSession({
          token: response.data.token,
          user: response.data.user
        });
      }

      return response.data;
    }
  },

  // Vérifier le token
  verifyToken: async () => {
    const response = await apiClient.post('/auth/verify');
    return response.data;
  },

  // Authentification sociale (Google, Facebook, etc.)
  socialAuth: async (socialData) => {
    const response = await apiClient.post('/auth/social', socialData);

    // Sauvegarder la session complète
    if (response.data.token && response.data.user) {
      await StorageService.saveSession({
        token: response.data.token,
        user: response.data.user
      });
    }

    return response.data;
  },

  // Déconnexion
  logout: async () => {
    await StorageService.clearSession();
    return { success: true };
  },
};

// =============================================================================
// USER SERVICES
// =============================================================================

export const userAPI = {
  // Liste des utilisateurs
  getUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  // Profil par ID
  getUserById: async (userId) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  // Changer la langue
  changeLanguage: async ({ id, language }) => {
    const response = await apiClient.put('/users/language', { id, language });
    return response.data;
  },

  // Mettre à jour le profil
  updateProfile: async (profileData) => {
    const formData = new FormData();

    // Ajouter les données texte
    Object.keys(profileData).forEach(key => {
      if (key !== 'avatar' && profileData[key] !== undefined) {
        formData.append(key, profileData[key]);
      }
    });

    // Ajouter l'avatar si présent
    if (profileData.avatar) {
      formData.append('avatar', {
        uri: profileData.avatar,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });
    }

    const response = await uploadClient.put('/users/profile', formData);
    return response.data;
  },

  // Enregistrer token push
  savePushToken: async (pushToken) => {
    const response = await apiClient.post('/users/push-token', { pushToken });
    return response.data;
  },
};

// =============================================================================
// CHAT SERVICES
// =============================================================================

export const chatAPI = {
  // Conversations 1-to-1
  conversation: {
    // Récupérer/Créer une conversation
    getOrCreate: async (otherUserId) => {
      const response = await apiClient.get(`/chat/conversations/${otherUserId}`);
      return response.data;
    },

    // Mes conversations
    getAll: async () => {
      const response = await apiClient.get('/chat/conversations');
      return response.data;
    },

    // Envoyer message texte
    sendMessage: async (conversationId, content) => {
      const response = await apiClient.post(`/chat/conversations/${conversationId}/messages`, {
        content
      });
      return response.data;
    },

    // Envoyer média (image, voice, file)
    sendMedia: async (conversationId, mediaData) => {
      const formData = new FormData();

      // Ajouter le fichier média
      formData.append('file', {
        uri: mediaData.uri,
        type: mediaData.type,
        name: mediaData.name,
      });

      // Ajouter les métadonnées selon la documentation backend
      formData.append('messageType', mediaData.messageType || 'media');
      if (mediaData.content) formData.append('content', mediaData.content);
      if (mediaData.duration) formData.append('duration', mediaData.duration.toString());

      const response = await uploadClient.post(`/chat/conversations/${conversationId}/messages/media`, formData);
      return response.data;
    },

    // Marquer comme lu
    markAsRead: async (conversationId) => {
      const response = await apiClient.put(`/chat/conversations/${conversationId}/read`);
      return response.data;
    },
  },

  // Groupes
  group: {
    // Mes groupes
    getAll: async () => {
      const response = await apiClient.get('/chat/groups');
      return response.data;
    },

    // Créer un groupe
    create: async (groupData) => {
      const response = await apiClient.post('/chat/groups', groupData);
      return response.data;
    },

    // Détails d'un groupe
    getById: async (groupId) => {
      const response = await apiClient.get(`/chat/groups/${groupId}`);
      return response.data;
    },

    // Envoyer message texte dans groupe
    sendMessage: async (groupId, content) => {
      const response = await apiClient.post(`/chat/groups/${groupId}/messages`, {
        content
      });
      return response.data;
    },

    // Envoyer média dans groupe
    sendMedia: async (groupId, mediaData) => {
      const formData = new FormData();

      // Ajouter le fichier média
      formData.append('file', {
        uri: mediaData.uri,
        type: mediaData.type,
        name: mediaData.name,
      });

      // Ajouter les métadonnées selon la documentation backend
      formData.append('messageType', mediaData.messageType || 'media');
      if (mediaData.content) formData.append('content', mediaData.content);
      if (mediaData.duration) formData.append('duration', mediaData.duration.toString());

      const response = await uploadClient.post(`/chat/groups/${groupId}/messages/media`, formData);
      return response.data;
    },

    // Ajouter membre
    addMember: async (groupId, userId) => {
      const response = await apiClient.post(`/chat/groups/${groupId}/members`, { userId });
      return response.data;
    },

    // Quitter un groupe
    leave: async (groupId) => {
      const response = await apiClient.delete(`/chat/groups/${groupId}/leave`);
      return response.data;
    },
  },
};

// =============================================================================
// UTILITAIRES
// =============================================================================

export const getToken = async () => {
  try {
    return await StorageService.getAuthToken();
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const isAuthenticated = async () => {
  const token = await getToken();
  return !!token;
};

export default {
  authAPI,
  userAPI,
  chatAPI,
  getToken,
  isAuthenticated,
  apiClient,
  uploadClient,
};