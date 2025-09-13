// hooks/emotion/useEmotionAnalysis.js - Hook pour l'analyse �motionnelle avanc�e

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';

import { advancedEmotionService } from '../../services/emotion/advancedEmotionAnalysis.js';
import { emotionalProfileService } from '../../services/emotion/emotionalProfileService.js';
import { 
  EmotionAnalysisConfig, 
  EMOTION_PROVIDERS,
  EmotionValidators 
} from '../../types/emotion.types.js';

export const useEmotionAnalysis = (userId, recipientId = null, config = {}) => {
  // �tats principaux
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [currentState, setCurrentState] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState(null);
  const [error, setError] = useState(null);

  // Configuration
  const [analysisConfig, setAnalysisConfig] = useState(
    new EmotionAnalysisConfig(config)
  );

  // R�f�rences pour �viter les re-renders
  const lastAnalysisRef = useRef(null);
  const analysisQueueRef = useRef([]);
  const isProcessingRef = useRef(false);

  // Initialisation
  useEffect(() => {
    if (userId) {
      initializeEmotionalData();
    }

    // �coute des changements d'�tat de l'app
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && userId) {
        refreshEmotionalState();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [userId]);

  // Rechargement des donn�es de compatibilit� quand le destinataire change
  useEffect(() => {
    if (userId && recipientId) {
      loadCompatibilityData();
    }
  }, [userId, recipientId]);

  /**
   * Initialisation des donn�es �motionnelles
   */
  const initializeEmotionalData = async () => {
    try {
      // Chargement du profil utilisateur
      const profile = await emotionalProfileService.getEmotionalProfile(userId);
      setCurrentProfile(profile);

      // Chargement de l'�tat �motionnel actuel
      const state = await emotionalProfileService.getEmotionalState(userId);
      setCurrentState(state);

      // Chargement de l'historique
      const history = await emotionalProfileService.getEmotionHistory(userId);
      setEmotionHistory(history);

    } catch (error) {
      console.error('Erreur initialisation donn�es �motionnelles:', error);
      setError(error.message);
    }
  };

  /**
   * Chargement des donn�es de compatibilit�
   */
  const loadCompatibilityData = async () => {
    if (!userId || !recipientId) return;

    try {
      const compatibilityData = await emotionalProfileService.calculateEmotionalCompatibility(
        userId, 
        recipientId
      );
      setCompatibility(compatibilityData);
    } catch (error) {
      console.error('Erreur chargement compatibilit�:', error);
    }
  };

  /**
   * Analyse d'un message avec mise � jour du profil
   */
  const analyzeMessage = useCallback(async (text, context = {}) => {
    if (!text || !userId || isProcessingRef.current) {
      return lastAnalysisRef.current;
    }

    // Validation des entr�es
    if (typeof text !== 'string' || text.trim().length < 2) {
      return {
        error: 'Texte invalide pour l\'analyse',
        confidence: 0
      };
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      isProcessingRef.current = true;

      // Ajout � la queue si plusieurs analyses simultan�es
      if (analysisQueueRef.current.length > 0) {
        analysisQueueRef.current.push({ text, context });
        return lastAnalysisRef.current;
      }

      // Analyse principale
      const result = await emotionalProfileService.analyzeAndUpdateEmotionalState(
        userId, 
        text, 
        context
      );

      if (result) {
        // Mise � jour des �tats locaux
        setCurrentState(result.state);
        lastAnalysisRef.current = result.analysis;

        // Recharge de l'historique si n�cessaire
        if (result.analysis.confidence > 0.7) {
          const updatedHistory = await emotionalProfileService.getEmotionHistory(userId);
          setEmotionHistory(updatedHistory);
        }

        // Mise � jour de la compatibilit� si destinataire pr�sent
        if (recipientId && result.analysis.confidence > 0.6) {
          loadCompatibilityData();
        }

        return result.analysis;
      }

      return lastAnalysisRef.current;

    } catch (error) {
      console.error('Erreur analyse message:', error);
      setError(error.message);
      
      return {
        error: error.message,
        confidence: 0,
        emotions: {},
        warnings: ['Analyse �chou�e']
      };

    } finally {
      setIsAnalyzing(false);
      isProcessingRef.current = false;

      // Traitement de la queue
      if (analysisQueueRef.current.length > 0) {
        const next = analysisQueueRef.current.shift();
        setTimeout(() => analyzeMessage(next.text, next.context), 100);
      }
    }
  }, [userId, recipientId, analysisConfig]);

  /**
   * Analyse rapide sans mise � jour du profil
   */
  const analyzeTextQuick = useCallback(async (text) => {
    if (!text || typeof text !== 'string') return null;

    try {
      const result = await advancedEmotionService.analyzeEmotion(text, analysisConfig);
      return result;
    } catch (error) {
      console.error('Erreur analyse rapide:', error);
      return null;
    }
  }, [analysisConfig]);

  /**
   * Mise � jour manuelle de l'�tat �motionnel
   */
  const updateEmotionalState = useCallback(async (newState) => {
    if (!userId || !newState) return false;

    try {
      const state = await emotionalProfileService.setEmotionalState(
        userId, 
        { emotions: newState.emotions }, 
        newState.context || {}
      );
      
      if (state) {
        setCurrentState(state);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erreur mise � jour �tat �motionnel:', error);
      setError(error.message);
      return false;
    }
  }, [userId]);

  /**
   * Rafra�chissement des donn�es
   */
  const refreshEmotionalState = useCallback(async () => {
    if (!userId) return;

    try {
      await initializeEmotionalData();
      
      if (recipientId) {
        await loadCompatibilityData();
      }
    } catch (error) {
      console.error('Erreur rafra�chissement:', error);
    }
  }, [userId, recipientId]);

  /**
   * Configuration de l'analyse
   */
  const updateAnalysisConfig = useCallback((newConfig) => {
    setAnalysisConfig(prev => new EmotionAnalysisConfig({ ...prev, ...newConfig }));
  }, []);

  /**
   * Nettoyage et optimisation
   */
  const clearCache = useCallback(async () => {
    try {
      await advancedEmotionService.clearCache();
      lastAnalysisRef.current = null;
      analysisQueueRef.current = [];
    } catch (error) {
      console.error('Erreur nettoyage cache:', error);
    }
  }, []);

  /**
   * Statistiques d'usage
   */
  const getUsageStats = useCallback(async () => {
    try {
      const stats = await advancedEmotionService.getUsageStats();
      return {
        ...stats,
        profileLoaded: !!currentProfile,
        stateActive: !!currentState,
        compatibilityCalculated: !!compatibility,
        historyEntries: emotionHistory?.entries?.length || 0
      };
    } catch (error) {
      console.error('Erreur r�cup�ration stats:', error);
      return null;
    }
  }, [currentProfile, currentState, compatibility, emotionHistory]);

  /**
   * Recommandations d'interaction
   */
  const getInteractionRecommendations = useCallback(() => {
    if (!currentState || !compatibility) {
      return {
        timing: 'normal',
        tone: 'neutral',
        approach: 'standard',
        warnings: []
      };
    }

    const recommendations = {
      timing: 'normal',
      tone: 'neutral',
      approach: 'standard',
      warnings: []
    };

    // Analyse de l'�tat �motionnel
    if (currentState.availability === 'do_not_disturb') {
      recommendations.timing = 'avoid';
      recommendations.warnings.push('L\'utilisateur ne souhaite pas �tre d�rang�');
    } else if (currentState.stress > 0.7) {
      recommendations.tone = 'gentle';
      recommendations.approach = 'supportive';
      recommendations.warnings.push('Niveau de stress �lev� d�tect�');
    } else if (currentState.energy < 0.3) {
      recommendations.approach = 'brief';
      recommendations.warnings.push('Niveau d\'�nergie faible');
    }

    // Analyse de la compatibilit�
    if (compatibility.overallScore < 0.4) {
      recommendations.tone = 'formal';
      recommendations.approach = 'careful';
      recommendations.warnings.push('Compatibilit� �motionnelle faible');
    } else if (compatibility.overallScore > 0.8) {
      recommendations.tone = 'friendly';
      recommendations.approach = 'natural';
    }

    return recommendations;
  }, [currentState, compatibility]);

  // Donn�es de retour optimis�es
  const moodData = currentState ? {
    mood: currentState.mood,
    energy: currentState.energy,
    stress: currentState.stress,
    availability: currentState.availability,
    dominantEmotion: currentState.currentEmotions ? 
      Object.keys(currentState.currentEmotions).reduce((a, b) => 
        currentState.currentEmotions[a] > currentState.currentEmotions[b] ? a : b
      ) : null
  } : null;

  return {
    // Fonctions principales
    analyzeMessage,
    analyzeTextQuick,
    updateEmotionalState,
    refreshEmotionalState,
    
    // �tats
    isAnalyzing,
    currentProfile,
    currentState,
    moodData,
    compatibility,
    emotionHistory,
    error,
    
    // Configuration
    analysisConfig,
    updateAnalysisConfig,
    
    // Utilitaires
    clearCache,
    getUsageStats,
    getInteractionRecommendations,
    
    // Validateurs
    isValidEmotion: EmotionValidators.isValidEmotion,
    isValidIntensity: EmotionValidators.isValidIntensity,
    
    // �tat de disponibilit�
    isReady: !!currentProfile && !isProcessingRef.current
  };
};

export default useEmotionAnalysis;