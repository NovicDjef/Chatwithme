// app/store/services/storage.js - Service de stockage persistant
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clés de stockage
const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  SESSION_TIMESTAMP: 'sessionTimestamp',
  REFRESH_TOKEN: 'refreshToken',
};

// Service de stockage persistant
export class StorageService {
  // ==========================================================================
  // TOKEN MANAGEMENT
  // ==========================================================================

  // Sauvegarder le token d'authentification
  static async saveAuthToken(token) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      // Sauvegarder/renouveler timestamp de session
      await AsyncStorage.setItem(
        STORAGE_KEYS.SESSION_TIMESTAMP,
        Date.now().toString()
      );
      console.log('🔑 Token saved successfully with updated timestamp');
    } catch (error) {
      console.error('❌ Error saving auth token:', error);
    }
  }

  // Renouveler le timestamp de session (appelé quand le token est vérifié)
  static async renewSessionTimestamp() {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SESSION_TIMESTAMP,
        Date.now().toString()
      );
      console.log('🔄 Session timestamp renewed');
    } catch (error) {
      console.error('❌ Error renewing session timestamp:', error);
    }
  }

  // Récupérer le token d'authentification
  static async getAuthToken() {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return token;
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return null;
    }
  }

  // Supprimer le token d'authentification
  static async removeAuthToken() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);
      console.log('🗑️ Token removed successfully');
    } catch (error) {
      console.error('❌ Error removing auth token:', error);
    }
  }

  // ==========================================================================
  // USER DATA MANAGEMENT
  // ==========================================================================

  // Sauvegarder les données utilisateur
  static async saveUserData(userData) {
    try {
      const userDataString = JSON.stringify(userData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, userDataString);
      console.log('👤 User data saved successfully');
    } catch (error) {
      console.error('❌ Error saving user data:', error);
    }
  }

  // Récupérer les données utilisateur
  static async getUserData() {
    try {
      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userDataString) {
        return JSON.parse(userDataString);
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting user data:', error);
      return null;
    }
  }

  // Supprimer les données utilisateur
  static async removeUserData() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      console.log('🗑️ User data removed successfully');
    } catch (error) {
      console.error('❌ Error removing user data:', error);
    }
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  // Sauvegarder une session complète (token + user data)
  static async saveSession(sessionData) {
    try {
      const { token, user } = sessionData;

      // Sauvegarder en parallèle pour optimiser
      await Promise.all([
        StorageService.saveAuthToken(token),
        StorageService.saveUserData(user),
      ]);

      console.log('💾 Session saved successfully');
    } catch (error) {
      console.error('❌ Error saving session:', error);
    }
  }

  // Récupérer une session complète
  static async getSession() {
    try {
      const [token, userData] = await Promise.all([
        StorageService.getAuthToken(),
        StorageService.getUserData(),
      ]);

      if (token && userData) {
        return {
          token,
          user: userData,
          isValid: true,
        };
      }

      return {
        token: null,
        user: null,
        isValid: false,
      };
    } catch (error) {
      console.error('❌ Error getting session:', error);
      return {
        token: null,
        user: null,
        isValid: false,
      };
    }
  }

  // Supprimer une session complète
  static async clearSession() {
    try {
      await Promise.all([
        StorageService.removeAuthToken(),
        StorageService.removeUserData(),
      ]);

      console.log('🧹 Session cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing session:', error);
    }
  }

  // ==========================================================================
  // SESSION VALIDATION
  // ==========================================================================

  // Vérifier si une session est valide (basé sur le timestamp et la durée du token)
  static async isSessionValid(maxAgeInDays = 30) {
    try {
      const timestampString = await AsyncStorage.getItem(
        STORAGE_KEYS.SESSION_TIMESTAMP
      );

      if (!timestampString) {
        return false;
      }

      const sessionTimestamp = parseInt(timestampString, 10);
      const currentTimestamp = Date.now();

      // Utiliser 30 jours par défaut (durée typique d'un refresh token)
      // Le token JWT sera vérifié avec le serveur pour la vraie validation
      const maxAgeInMs = maxAgeInDays * 24 * 60 * 60 * 1000;

      const isValid = currentTimestamp - sessionTimestamp < maxAgeInMs;

      if (!isValid) {
        console.log('⏰ Local session expired (30 days), clearing...');
        await StorageService.clearSession();
      }

      return isValid;
    } catch (error) {
      console.error('❌ Error validating session:', error);
      return false;
    }
  }

  // Obtenir les informations de session
  static async getSessionInfo() {
    try {
      const timestampString = await AsyncStorage.getItem(
        STORAGE_KEYS.SESSION_TIMESTAMP
      );

      if (!timestampString) {
        return null;
      }

      const sessionTimestamp = parseInt(timestampString, 10);
      const currentTimestamp = Date.now();
      const sessionAge = currentTimestamp - sessionTimestamp;

      return {
        createdAt: new Date(sessionTimestamp),
        age: sessionAge,
        ageInDays: Math.floor(sessionAge / (24 * 60 * 60 * 1000)),
        ageInHours: Math.floor(sessionAge / (60 * 60 * 1000)),
      };
    } catch (error) {
      console.error('❌ Error getting session info:', error);
      return null;
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  // Obtenir toutes les clés de stockage de l'app
  static async getAllStorageKeys() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter(key => Object.values(STORAGE_KEYS).includes(key));
    } catch (error) {
      console.error('❌ Error getting storage keys:', error);
      return [];
    }
  }

  // Debug: Afficher toutes les données stockées
  static async debugStorageContent() {
    try {
      const keys = await StorageService.getAllStorageKeys();
      const items = await AsyncStorage.multiGet(keys);

      console.log('🔍 Storage Content:');
      items.forEach(([key, value]) => {
        console.log(`  ${key}:`, value?.substring(0, 100) + (value?.length > 100 ? '...' : ''));
      });

      const sessionInfo = await StorageService.getSessionInfo();
      if (sessionInfo) {
        console.log('📅 Session Info:', sessionInfo);
      }
    } catch (error) {
      console.error('❌ Error debugging storage:', error);
    }
  }
}

// Exports par défaut
export default StorageService;

// Export des clés pour réutilisation
export { STORAGE_KEYS };