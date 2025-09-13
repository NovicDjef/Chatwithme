// services/translation/translationService.js - Version production avec gestion d'erreurs
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/lib';

class TranslationService {
  constructor() {
    this.cache = new Map();
    this.apiKeys = {
      google: process.env.GOOGLE_TRANSLATE_API_KEY,
      azure: process.env.AZURE_TRANSLATOR_KEY,
      libre: process.env.LIBRETRANSLATE_API_URL
    };
    this.requestQueue = [];
    this.isProcessing = false;
    this.rateLimits = {
      google: { limit: 100, window: 60000, requests: [] },
      azure: { limit: 500, window: 60000, requests: [] }
    };
    this.fallbackChain = ['google', 'azure', 'libre'];
  }

  // Traduction principale avec fallback et cache
  async translateText(text, fromLang, toLang, options = {}) {
    // Validation des entrées
    if (!text || !fromLang || !toLang) {
      throw new Error('Paramètres de traduction invalides');
    }

    // Pas de traduction nécessaire
    if (fromLang === toLang) {
      return { text, confidence: 1.0, provider: 'none' };
    }

    // Vérification du cache
    const cacheKey = this.generateCacheKey(text, fromLang, toLang);
    const cached = await this.getCachedTranslation(cacheKey);
    if (cached && !options.forceRefresh) {
      return { ...cached, fromCache: true };
    }

    try {
      // Vérification de la connexion
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        return await this.handleOfflineTranslation(text, fromLang, toLang);
      }

      // Tentative de traduction avec fallback
      const result = await this.translateWithFallback(text, fromLang, toLang, options);
      
      // Mise en cache si succès
      if (result.confidence > 0.8) {
        await this.cacheTranslation(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Erreur traduction:', error);
      
      // Tentative de traduction offline en dernier recours
      const offlineResult = await this.handleOfflineTranslation(text, fromLang, toLang);
      if (offlineResult) {
        return offlineResult;
      }

      throw new Error(`Traduction échouée: ${error.message}`);
    }
  }

  // Système de fallback entre providers
  async translateWithFallback(text, fromLang, toLang, options) {
    let lastError;
    
    for (const provider of this.fallbackChain) {
      try {
        // Vérification des limites de taux
        if (await this.checkRateLimit(provider)) {
          const result = await this.callTranslationAPI(provider, text, fromLang, toLang, options);
          
          if (result && result.confidence > 0.6) {
            return { ...result, provider };
          }
        }
      } catch (error) {
        console.warn(`Échec provider ${provider}:`, error.message);
        lastError = error;
        continue;
      }
    }

    throw new Error(`Tous les providers ont échoué. Dernière erreur: ${lastError?.message}`);
  }

  // Appel API spécifique par provider
  async callTranslationAPI(provider, text, fromLang, toLang, options) {
    switch (provider) {
      case 'google':
        return await this.translateWithGoogle(text, fromLang, toLang, options);
      case 'azure':
        return await this.translateWithAzure(text, fromLang, toLang, options);
      case 'libre':
        return await this.translateWithLibreTranslate(text, fromLang, toLang, options);
      default:
        throw new Error(`Provider ${provider} non supporté`);
    }
  }

  // Google Translate API
  async translateWithGoogle(text, fromLang, toLang, options) {
    if (!this.apiKeys.google) {
      throw new Error('Clé API Google manquante');
    }

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${this.apiKeys.google}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: fromLang,
          target: toLang,
          format: 'text'
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google API: ${error.error?.message || 'Erreur inconnue'}`);
    }

    const data = await response.json();
    const translation = data.data.translations[0];

    return {
      text: translation.translatedText,
      confidence: this.calculateGoogleConfidence(text, translation.translatedText),
      detectedLanguage: translation.detectedSourceLanguage || fromLang,
      provider: 'google'
    };
  }

  // Azure Translator API  
  async translateWithAzure(text, fromLang, toLang, options) {
    if (!this.apiKeys.azure) {
      throw new Error('Clé API Azure manquante');
    }

    const response = await fetch(
      `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${fromLang}&to=${toLang}`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKeys.azure,
          'Ocp-Apim-Subscription-Region': process.env.AZURE_REGION || 'westeurope',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ Text: text }])
      }
    );

    if (!response.ok) {
      throw new Error(`Azure API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const translation = data[0].translations[0];

    return {
      text: translation.text,
      confidence: translation.confidence || 0.9,
      detectedLanguage: data[0].detectedLanguage?.language || fromLang,
      provider: 'azure'
    };
  }

  // LibreTranslate (solution self-hosted/gratuite)
  async translateWithLibreTranslate(text, fromLang, toLang, options) {
    if (!this.apiKeys.libre) {
      throw new Error('URL LibreTranslate manquante');
    }

    const response = await fetch(`${this.apiKeys.libre}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: fromLang,
        target: toLang,
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      text: data.translatedText,
      confidence: 0.8, // LibreTranslate ne fournit pas de score de confiance
      detectedLanguage: fromLang,
      provider: 'libre'
    };
  }

  // Détection automatique de langue
  async detectLanguage(text) {
    try {
      // Utilisation de Google Detect en priorité
      if (this.apiKeys.google) {
        const response = await fetch(
          `https://translation.googleapis.com/language/translate/v2/detect?key=${this.apiKeys.google}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: text })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const detection = data.data.detections[0][0];
          
          return {
            language: detection.language,
            confidence: detection.confidence,
            isReliable: detection.confidence > 0.8
          };
        }
      }

      // Fallback: détection locale simple
      return await this.detectLanguageLocally(text);
    } catch (error) {
      console.error('Erreur détection langue:', error);
      return await this.detectLanguageLocally(text);
    }
  }

  // Détection locale basique (pour le mode offline)
  async detectLanguageLocally(text) {
    // Patterns basiques pour les langues communes
    const patterns = {
      'fr': /\b(le|la|les|de|du|des|et|est|une|dans|pour|que|qui|avec|sont|être|avoir)\b/gi,
      'en': /\b(the|and|is|are|was|were|will|would|could|should|have|has|had|do|does|did)\b/gi,
      'es': /\b(el|la|los|las|de|del|en|es|son|ser|estar|con|por|para|que|como)\b/gi,
      'it': /\b(il|la|lo|gli|le|di|del|in|è|sono|essere|avere|con|per|che|come)\b/gi,
      'de': /\b(der|die|das|den|des|dem|und|ist|sind|war|waren|haben|hat|hatte|wird)\b/gi
    };

    let bestMatch = { language: 'en', confidence: 0.3 };
    
    Object.keys(patterns).forEach(lang => {
      const matches = text.match(patterns[lang]) || [];
      const confidence = Math.min(matches.length / text.split(' ').length * 2, 1);
      
      if (confidence > bestMatch.confidence) {
        bestMatch = { language: lang, confidence };
      }
    });

    return {
      ...bestMatch,
      isReliable: bestMatch.confidence > 0.6
    };
  }

  // Gestion du mode offline
  async handleOfflineTranslation(text, fromLang, toLang) {
    // Vérification du cache local
    const cacheKey = this.generateCacheKey(text, fromLang, toLang);
    const cached = await this.getCachedTranslation(cacheKey);
    
    if (cached) {
      return { ...cached, fromCache: true, offline: true };
    }

    // Dictionnaire de traduction basique pour les phrases communes
    const offlineDictionary = await this.loadOfflineDictionary(fromLang, toLang);
    const offlineResult = this.translateWithOfflineDictionary(text, offlineDictionary);
    
    if (offlineResult) {
      return { ...offlineResult, offline: true, provider: 'offline' };
    }

    throw new Error('Traduction impossible en mode offline');
  }

  // Gestion du cache
  generateCacheKey(text, fromLang, toLang) {
    const textHash = this.simpleHash(text.toLowerCase().trim());
    return `translation_${fromLang}_${toLang}_${textHash}`;
  }

  async getCachedTranslation(cacheKey) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        
        // Vérification de l'expiration (24h)
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return data.translation;
        } else {
          AsyncStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn('Erreur lecture cache:', error);
    }
    return null;
  }

  async cacheTranslation(cacheKey, translation) {
    try {
      const cacheData = {
        translation,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Erreur écriture cache:', error);
    }
  }

  // Gestion des limites de taux
  async checkRateLimit(provider) {
    const limit = this.rateLimits[provider];
    if (!limit) return true;

    const now = Date.now();
    
    // Nettoyage des anciennes requêtes
    limit.requests = limit.requests.filter(
      timestamp => now - timestamp < limit.window
    );

    // Vérification de la limite
    if (limit.requests.length >= limit.limit) {
      return false;
    }

    // Ajout de la requête actuelle
    limit.requests.push(now);
    return true;
  }

  // Calcul de confiance pour Google (approximatif)
  calculateGoogleConfidence(original, translated) {
    // Heuristique basique - à améliorer avec de vrais modèles
    if (original === translated) return 0.3;
    if (translated.length === 0) return 0;
    
    const lengthRatio = Math.min(translated.length / original.length, 
                                original.length / translated.length);
    
    return Math.min(0.9, 0.7 + lengthRatio * 0.2);
  }

  // Fonction de hash simple
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // Nettoyage du cache
  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const translationKeys = keys.filter(key => key.startsWith('translation_'));
      await AsyncStorage.multiRemove(translationKeys);
    } catch (error) {
      console.error('Erreur nettoyage cache:', error);
    }
  }

  // Statistiques d'utilisation
  async getUsageStats() {
    // Implémentation des statistiques de traduction
    return {
      totalTranslations: 0,
      cacheHitRate: 0,
      favoriteLanguagePairs: [],
      providersUsage: {}
    };
  }
}

// Instance singleton
export const translationService = new TranslationService();

// Fonction utilitaire pour usage simple
export const translateText = (text, fromLang, toLang, options) => {
  return translationService.translateText(text, fromLang, toLang, options);
};

export const detectLanguage = (text) => {
  return translationService.detectLanguage(text);
};