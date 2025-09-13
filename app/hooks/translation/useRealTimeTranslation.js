// hooks/translation/useRealTimeTranslation.js
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { translationService } from '../../services/translation/translationService';
import { useNetworkStatus } from '../common/useNetworkStatus';

export const useRealTimeTranslation = (options = {}) => {
  const {
    debounceDelay = 800,
    maxCacheSize = 100,
    enableBatching = true,
    enablePredictive = false
  } = options;

  // États principaux
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [translationStats, setTranslationStats] = useState({
    totalTranslations: 0,
    successRate: 100,
    avgResponseTime: 0,
    cacheHitRate: 0
  });

  // Références pour éviter les re-créations
  const translationQueue = useRef(new Map());
  const activeRequests = useRef(new Set());
  const statsRef = useRef({ ...translationStats });
  const cacheRef = useRef(new Map());
  
  // Hook de statut réseau
  const { isConnected, connectionType } = useNetworkStatus();

  // Initialisation des langues supportées
  useEffect(() => {
    const loadSupportedLanguages = async () => {
      try {
        // Langues communes supportées par la plupart des providers
        const languages = [
          { code: 'fr', name: 'Français', flag: '🇫🇷' },
          { code: 'en', name: 'English', flag: '🇺🇸' },
          { code: 'es', name: 'Español', flag: '🇪🇸' },
          { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
          { code: 'it', name: 'Italiano', flag: '🇮🇹' },
          { code: 'pt', name: 'Português', flag: '🇵🇹' },
          { code: 'ru', name: 'Русский', flag: '🇷🇺' },
          { code: 'ja', name: '日本語', flag: '🇯🇵' },
          { code: 'ko', name: '한국어', flag: '🇰🇷' },
          { code: 'zh', name: '中文', flag: '🇨🇳' },
          { code: 'ar', name: 'العربية', flag: '🇸🇦' },
          { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' }
        ];
        setSupportedLanguages(languages);
      } catch (error) {
        console.error('Erreur chargement langues:', error);
        setSupportedLanguages([]);
      }
    };

    loadSupportedLanguages();
  }, []);

  // Fonction principale de traduction avec optimisations
  const translateMessage = useCallback(async (text, fromLang, toLang, options = {}) => {
    if (!text?.trim() || fromLang === toLang) {
      return { text, confidence: 1.0, cached: false };
    }

    // Génération d'un ID unique pour cette requête
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      setIsTranslating(true);
      setTranslationError(null);
      
      // Ajout à la queue des requêtes actives
      activeRequests.current.add(requestId);

      // Vérification du cache local d'abord
      const cacheKey = `${text}_${fromLang}_${toLang}`;
      const cached = cacheRef.current.get(cacheKey);
      
      if (cached && !options.forceRefresh) {
        updateStats('cache_hit');
        return { ...cached, cached: true };
      }

      const startTime = Date.now();
      
      // Traduction via le service
      const result = await translationService.translateText(
        text,
        fromLang,
        toLang,
        {
          ...options,
          timeout: isConnected ? 10000 : 5000 // Timeout adaptatif
        }
      );

      const duration = Date.now() - startTime;

      // Mise à jour du cache local
      if (result.confidence > 0.8 && cacheRef.current.size < maxCacheSize) {
        cacheRef.current.set(cacheKey, result);
      }

      // Mise à jour des statistiques
      updateStats('success', duration);

      return { ...result, cached: false };

    } catch (error) {
      console.error('Erreur traduction:', error);
      
      // Mise à jour des statistiques d'erreur
      updateStats('error');
      
      // Tentative de récupération gracieuse
      const fallbackResult = await handleTranslationError(error, text, fromLang, toLang);
      
      if (fallbackResult) {
        return fallbackResult;
      }

      setTranslationError(error.message);
      throw error;

    } finally {
      activeRequests.current.delete(requestId);
      
      // Désactivation du loading si plus de requêtes actives
      if (activeRequests.current.size === 0) {
        setIsTranslating(false);
      }
    }
  }, [isConnected, maxCacheSize]);

  // Traduction avec debouncing pour les inputs temps réel
  const translateWithDebounce = useMemo(
    () => debounce(translateMessage, debounceDelay),
    [translateMessage, debounceDelay]
  );

  // Traduction par lot pour optimiser les performances
  const translateBatch = useCallback(async (messages) => {
    if (!enableBatching || messages.length === 0) {
      return Promise.all(messages.map(msg => 
        translateMessage(msg.text, msg.fromLang, msg.toLang)
      ));
    }

    try {
      setIsTranslating(true);
      
      // Groupement par paire de langues
      const languagePairs = new Map();
      messages.forEach((msg, index) => {
        const key = `${msg.fromLang}_${msg.toLang}`;
        if (!languagePairs.has(key)) {
          languagePairs.set(key, []);
        }
        languagePairs.get(key).push({ ...msg, originalIndex: index });
      });

      // Traduction par lot pour chaque paire de langues
      const results = new Array(messages.length);
      
      for (const [langPair, batch] of languagePairs) {
        const batchResults = await Promise.allSettled(
          batch.map(msg => translateMessage(msg.text, msg.fromLang, msg.toLang))
        );

        batchResults.forEach((result, batchIndex) => {
          const originalIndex = batch[batchIndex].originalIndex;
          results[originalIndex] = result.status === 'fulfilled' ? 
            result.value : 
            { error: result.reason, text: batch[batchIndex].text };
        });
      }

      return results;

    } catch (error) {
      console.error('Erreur traduction par lot:', error);
      throw error;
    } finally {
      setIsTranslating(false);
    }
  }, [translateMessage, enableBatching]);

  // Prédiction de traduction (optionnel)
  const predictTranslation = useCallback(async (text, fromLang, toLang) => {
    if (!enablePredictive || !text || text.length < 10) return null;

    try {
      // Logique de prédiction basée sur l'historique
      // Ici on pourrait utiliser un modèle ML local léger
      const cacheKey = `predict_${text.substring(0, 20)}_${fromLang}_${toLang}`;
      return cacheRef.current.get(cacheKey) || null;
    } catch (error) {
      console.warn('Erreur prédiction:', error);
      return null;
    }
  }, [enablePredictive]);

  // Détection automatique de langue
  const detectLanguage = useCallback(async (text) => {
    if (!text || text.length < 3) return null;

    try {
      const detection = await translationService.detectLanguage(text);
      
      if (detection && detection.confidence > 0.8) {
        return {
          language: detection.language,
          confidence: detection.confidence,
          isReliable: detection.isReliable
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erreur détection langue:', error);
      return null;
    }
  }, []);

  // Gestion des erreurs avec récupération gracieuse
  const handleTranslationError = useCallback(async (error, text, fromLang, toLang) => {
    // Tentative avec le cache si disponible
    const cacheKey = `${text}_${fromLang}_${toLang}`;
    const cachedFallback = cacheRef.current.get(cacheKey);
    
    if (cachedFallback) {
      return { ...cachedFallback, cached: true, fallback: true };
    }

    // Si pas de réseau, proposer un message d'attente
    if (!isConnected) {
      return {
        text: `[Traduction en attente: ${text}]`,
        confidence: 0.1,
        offline: true,
        originalText: text
      };
    }

    return null;
  }, [isConnected]);

  // Mise à jour des statistiques
  const updateStats = useCallback((type, duration = 0) => {
    const currentStats = statsRef.current;
    
    switch (type) {
      case 'success':
        currentStats.totalTranslations++;
        currentStats.avgResponseTime = 
          (currentStats.avgResponseTime + duration) / 2;
        break;
      case 'error':
        currentStats.totalTranslations++;
        currentStats.successRate = Math.max(0, currentStats.successRate - 1);
        break;
      case 'cache_hit':
        currentStats.cacheHitRate = Math.min(100, currentStats.cacheHitRate + 0.1);
        break;
    }

    // Mise à jour périodique de l'état (pas à chaque call pour éviter re-renders)
    if (currentStats.totalTranslations % 10 === 0) {
      setTranslationStats({ ...currentStats });
    }
  }, []);

  // Nettoyage et optimisation du cache
  const optimizeCache = useCallback(() => {
    const cache = cacheRef.current;
    
    if (cache.size >= maxCacheSize) {
      // Suppression des entrées les moins utilisées (LRU simulation)
      const entries = Array.from(cache.entries());
      const toRemove = entries.slice(0, Math.floor(maxCacheSize * 0.3));
      
      toRemove.forEach(([key]) => cache.delete(key));
    }
  }, [maxCacheSize]);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      activeRequests.current.clear();
      if (translateWithDebounce.cancel) {
        translateWithDebounce.cancel();
      }
    };
  }, [translateWithDebounce]);

  // Optimisation périodique du cache
  useEffect(() => {
    const interval = setInterval(optimizeCache, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [optimizeCache]);

  // Retour des fonctions et états utiles
  return {
    // Fonctions principales
    translateMessage,
    translateWithDebounce,
    translateBatch,
    detectLanguage,
    predictTranslation,
    
    // États
    isTranslating,
    translationError,
    supportedLanguages,
    translationStats,
    
    // Informations utiles
    isOnline: isConnected,
    connectionType,
    cacheSize: cacheRef.current.size,
    activeRequestsCount: activeRequests.current.size,
    
    // Fonctions utilitaires
    clearCache: () => {
      cacheRef.current.clear();
      setTranslationStats(prev => ({ ...prev, cacheHitRate: 0 }));
    },
    
    // Contrôle des erreurs
    clearError: () => setTranslationError(null),
    
    // Configuration dynamique
    updateConfig: (newConfig) => {
      Object.assign(options, newConfig);
    }
  };
};