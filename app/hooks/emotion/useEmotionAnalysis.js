// hooks/emotion/useEmotionAnalysis.js
import { useCallback, useEffect, useRef, useState } from 'react';
import emotionAnalysisService from '../../services/emotion/advancedEmotionAnalysis.js';
import {
  BASIC_EMOTIONS,
  EmotionAnalysisConfig
} from '../../types/emotion.types.js';

export const useEmotionAnalysis = (initialConfig = {}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  
  // Référence pour éviter les re-renders inutiles
  const configRef = useRef(new EmotionAnalysisConfig(initialConfig));
  const abortControllerRef = useRef(null);

  // Mettre à jour la config si nécessaire
  useEffect(() => {
    configRef.current = new EmotionAnalysisConfig({ 
      ...configRef.current, 
      ...initialConfig 
    });
  }, [initialConfig]);

  /**
   * Analyser un texte
   */
  const analyzeText = useCallback(async (text, options = {}) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      const error = new Error('Le texte à analyser ne peut pas être vide');
      setError(error);
      return null;
    }

    // Annuler l'analyse précédente si en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsAnalyzing(true);
    setError(null);

    try {
      const config = { ...configRef.current, ...options };
      const result = await emotionAnalysisService.analyzeEmotion(text, config);
      
      // Vérifier si l'analyse n'a pas été annulée
      if (!abortControllerRef.current?.signal.aborted) {
        setLastResult(result);
        setHistory(prev => [...prev.slice(-9), result]); // Garder les 10 derniers
        return result;
      }
      
      return null;
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Erreur analyse émotionnelle:', err);
        setError(err);
      }
      return null;
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsAnalyzing(false);
      }
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Analyser en mode batch (plusieurs textes)
   */
  const analyzeBatch = useCallback(async (texts, options = {}) => {
    if (!Array.isArray(texts) || texts.length === 0) {
      const error = new Error('La liste de textes ne peut pas être vide');
      setError(error);
      return [];
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        texts.map(text => analyzeText(text, { ...options, enableCaching: true }))
      );

      const successfulResults = results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);

      const failedCount = results.length - successfulResults.length;
      if (failedCount > 0) {
        console.warn(`${failedCount} analyses ont échoué sur ${texts.length}`);
      }

      return successfulResults;
    } catch (err) {
      console.error('Erreur analyse batch:', err);
      setError(err);
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeText]);

  /**
   * Analyser en temps réel avec debounce
   */
  const analyzeRealTime = useCallback(async (text, options = {}) => {
    if (text && text.length > 3) { // Seuil minimum
      return await analyzeText(text, options);
    }
    return null;
  }, [analyzeText]);

  /**
   * Obtenir l'émotion dominante du dernier résultat
   */
  const getDominantEmotion = useCallback(() => {
    return lastResult?.dominantEmotion || null;
  }, [lastResult]);

  /**
   * Obtenir le sentiment du dernier résultat
   */
  const getSentiment = useCallback(() => {
    return lastResult?.sentiment || null;
  }, [lastResult]);

  /**
   * Obtenir les émotions formatées pour l'UI
   */
  const getEmotionsForUI = useCallback(() => {
    if (!lastResult?.emotions) return [];

    return Object.entries(lastResult.emotions)
      .map(([emotion, intensity]) => ({
        emotion,
        intensity,
        label: getEmotionLabel(emotion),
        color: getEmotionColor(emotion),
        icon: getEmotionIcon(emotion)
      }))
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 5); // Top 5
  }, [lastResult]);

  /**
   * Obtenir les tendances émotionnelles
   */
  const getEmotionalTrends = useCallback(() => {
    if (history.length < 2) return null;

    const recent = history.slice(-5);
    const trends = {};

    Object.values(BASIC_EMOTIONS).forEach(emotion => {
      const values = recent.map(result => result.emotions[emotion] || 0);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const trend = values.length > 1 ? values[values.length - 1] - values[0] : 0;
      
      trends[emotion] = {
        average: avg,
        trend: trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable',
        change: Math.abs(trend)
      };
    });

    return trends;
  }, [history]);

  /**
   * Réinitialiser l'état
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAnalyzing(false);
    setLastResult(null);
    setError(null);
    setHistory([]);
  }, []);

  /**
   * Mettre à jour la configuration
   */
  const updateConfig = useCallback((newConfig) => {
    configRef.current = new EmotionAnalysisConfig({
      ...configRef.current,
      ...newConfig
    });
  }, []);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // État
    isAnalyzing,
    lastResult,
    error,
    history,
    
    // Actions
    analyzeText,
    analyzeBatch,
    analyzeRealTime,
    reset,
    updateConfig,
    
    // Getters
    getDominantEmotion,
    getSentiment,
    getEmotionsForUI,
    getEmotionalTrends,
    
    // Configuration actuelle
    config: configRef.current
  };
};

// Utilitaires helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function getEmotionLabel(emotion) {
  const labels = {
    [BASIC_EMOTIONS.JOY]: 'Joie',
    [BASIC_EMOTIONS.SADNESS]: 'Tristesse',
    [BASIC_EMOTIONS.ANGER]: 'Colère',
    [BASIC_EMOTIONS.FEAR]: 'Peur',
    [BASIC_EMOTIONS.SURPRISE]: 'Surprise',
    [BASIC_EMOTIONS.DISGUST]: 'Dégoût',
    [BASIC_EMOTIONS.TRUST]: 'Confiance',
    [BASIC_EMOTIONS.ANTICIPATION]: 'Attente'
  };
  return labels[emotion] || emotion;
}

function getEmotionColor(emotion) {
  const colors = {
    [BASIC_EMOTIONS.JOY]: '#FFD700',
    [BASIC_EMOTIONS.SADNESS]: '#4169E1',
    [BASIC_EMOTIONS.ANGER]: '#DC143C',
    [BASIC_EMOTIONS.FEAR]: '#9932CC',
    [BASIC_EMOTIONS.SURPRISE]: '#FF8C00',
    [BASIC_EMOTIONS.DISGUST]: '#228B22',
    [BASIC_EMOTIONS.TRUST]: '#20B2AA',
    [BASIC_EMOTIONS.ANTICIPATION]: '#FF1493'
  };
  return colors[emotion] || '#808080';
}

function getEmotionIcon(emotion) {
  const icons = {
    [BASIC_EMOTIONS.JOY]: '😊',
    [BASIC_EMOTIONS.SADNESS]: '😢',
    [BASIC_EMOTIONS.ANGER]: '😠',
    [BASIC_EMOTIONS.FEAR]: '😰',
    [BASIC_EMOTIONS.SURPRISE]: '😮',
    [BASIC_EMOTIONS.DISGUST]: '🤢',
    [BASIC_EMOTIONS.TRUST]: '🤝',
    [BASIC_EMOTIONS.ANTICIPATION]: '⏳'
  };
  return icons[emotion] || '😐';
}

export default useEmotionAnalysis;