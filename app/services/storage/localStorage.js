// services/storage/localStorage.js - Gestion du stockage local avec AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';

class LocalStorageService {
  constructor() {
    this.prefix = 'chatwithme_';
    this.maxCacheSize = 50 * 1024 * 1024; // 50MB
    this.compressionEnabled = true;
  }

  /**
   * Stockage générique avec gestion d'erreurs
   */
  async store(key, data, options = {}) {
    try {
      const fullKey = this.prefix + key;
      const serialized = this.serialize(data, options);
      
      // Vérification de la taille
      if (serialized.length > 6 * 1024 * 1024) { // 6MB limit per item
        console.warn(`Données trop volumineuses pour la clé ${key}: ${serialized.length} bytes`);
        return false;
      }

      await AsyncStorage.setItem(fullKey, serialized);
      
      // Ajout des métadonnées si configuré
      if (options.withMetadata) {
        await this.storeMetadata(key, {
          timestamp: Date.now(),
          size: serialized.length,
          type: typeof data,
          ttl: options.ttl
        });
      }

      return true;
    } catch (error) {
      console.error(`Erreur stockage localStorage ${key}:`, error);
      return false;
    }
  }

  /**
   * Récupération avec validation et expiration
   */
  async retrieve(key, options = {}) {
    try {
      const fullKey = this.prefix + key;
      const serialized = await AsyncStorage.getItem(fullKey);
      
      if (!serialized) return null;

      // Vérification de l'expiration si métadonnées disponibles
      if (options.checkExpiry) {
        const metadata = await this.getMetadata(key);
        if (metadata && metadata.ttl && 
            Date.now() - metadata.timestamp > metadata.ttl) {
          await this.remove(key);
          return null;
        }
      }

      return this.deserialize(serialized);
    } catch (error) {
      console.error(`Erreur récupération localStorage ${key}:`, error);
      return null;
    }
  }

  /**
   * Suppression avec nettoyage des métadonnées
   */
  async remove(key) {
    try {
      const fullKey = this.prefix + key;
      await AsyncStorage.removeItem(fullKey);
      await this.removeMetadata(key);
      return true;
    } catch (error) {
      console.error(`Erreur suppression localStorage ${key}:`, error);
      return false;
    }
  }

  /**
   * Stockage de données émotionnelles spécifique
   */
  async storeEmotionalProfile(userId, profile) {
    const key = `emotion_profile_${userId}`;
    return await this.store(key, profile, {
      withMetadata: true,
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 jours
    });
  }

  async getEmotionalProfile(userId) {
    const key = `emotion_profile_${userId}`;
    return await this.retrieve(key, { checkExpiry: true });
  }

  async storeEmotionalState(userId, state) {
    const key = `emotion_state_${userId}`;
    return await this.store(key, state, {
      withMetadata: true,
      ttl: 4 * 60 * 60 * 1000 // 4 heures
    });
  }

  async getEmotionalState(userId) {
    const key = `emotion_state_${userId}`;
    return await this.retrieve(key, { checkExpiry: true });
  }

  /**
   * Sérialisation/désérialisation
   */
  serialize(data, options = {}) {
    return JSON.stringify(data);
  }

  deserialize(serialized) {
    try {
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Erreur désérialisation:', error);
      return null;
    }
  }

  /**
   * Gestion des métadonnées
   */
  async storeMetadata(key, metadata) {
    const metaKey = `meta_${key}`;
    await AsyncStorage.setItem(this.prefix + metaKey, JSON.stringify(metadata));
  }

  async getMetadata(key) {
    try {
      const metaKey = `meta_${key}`;
      const metadata = await AsyncStorage.getItem(this.prefix + metaKey);
      return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
      return null;
    }
  }

  async removeMetadata(key) {
    const metaKey = `meta_${key}`;
    await AsyncStorage.removeItem(this.prefix + metaKey);
  }

  /**
   * Nettoyage des données expirées
   */
  async cleanExpiredData() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const ourKeys = allKeys.filter(key => key.startsWith(this.prefix));
      
      let cleanedCount = 0;
      
      for (const fullKey of ourKeys) {
        const key = fullKey.replace(this.prefix, '');
        
        if (key.startsWith('meta_')) continue;
        
        const metadata = await this.getMetadata(key);
        if (metadata && metadata.ttl && 
            Date.now() - metadata.timestamp > metadata.ttl) {
          await this.remove(key);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Erreur nettoyage localStorage:', error);
      return 0;
    }
  }
}

// Instance singleton
export const localStorageService = new LocalStorageService();
export default localStorageService;