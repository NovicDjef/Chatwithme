// hooks/emotion/useEmotionAnalysisSimple.js - Version simplifiée pour la démo

import { useState, useCallback } from 'react';

export const useEmotionAnalysis = (userId, recipientId) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [moodData, setMoodData] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [error, setError] = useState(null);

  const analyzeMessage = useCallback(async (text) => {
    if (!text || text.trim().length < 2) return null;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Simulation d'analyse émotionnelle pour la démo
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Analyse basique par mots-clés
      const emotions = analyzeBasicEmotions(text);
      const dominantEmotion = findDominantEmotion(emotions);

      const result = {
        emotions,
        dominantEmotion,
        confidence: 0.75,
        sentiment: {
          polarity: dominantEmotion === 'joy' || dominantEmotion === 'trust' ? 'positive' :
                   dominantEmotion === 'sadness' || dominantEmotion === 'anger' ? 'negative' : 'neutral',
          score: emotions[dominantEmotion] || 0
        },
        provider: 'local_demo'
      };

      // Mise à jour de l'état émotionnel
      setMoodData({
        mood: dominantEmotion,
        energy: Math.random() * 0.5 + 0.5,
        stress: Math.random() * 0.3,
        availability: 'available',
        dominantEmotion
      });

      // Simulation de compatibilité
      setCompatibility({
        overallScore: Math.random() * 0.3 + 0.6,
        communicationScore: Math.random() * 0.4 + 0.6,
        empathyScore: Math.random() * 0.4 + 0.5,
        energyAlignment: Math.random() * 0.5 + 0.4
      });

      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const getInteractionRecommendations = useCallback(() => {
    if (!moodData) {
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

    if (moodData.stress > 0.7) {
      recommendations.tone = 'gentle';
      recommendations.approach = 'supportive';
      recommendations.warnings.push('Niveau de stress élevé détecté');
    } else if (moodData.energy < 0.3) {
      recommendations.approach = 'brief';
      recommendations.warnings.push('Niveau d\'énergie faible');
    }

    return recommendations;
  }, [moodData]);

  return {
    analyzeMessage,
    moodData,
    compatibility,
    getInteractionRecommendations,
    isAnalyzing,
    error
  };
};

// Fonctions utilitaires
function analyzeBasicEmotions(text) {
  const emotionKeywords = {
    joy: ['heureux', 'joyeux', 'content', 'génial', 'super', 'fantastique', ':)', '😊'],
    sadness: ['triste', 'déprimé', 'mal', 'difficile', 'peine', ':(', '😢'],
    anger: ['énervé', 'furieux', 'colère', 'agacé', 'irrité', 'déteste', '😠'],
    fear: ['peur', 'anxieux', 'inquiet', 'stress', 'angoisse', 'nerveux', '😰'],
    surprise: ['surpris', 'étonné', 'wow', 'incroyable', 'choqué', '😮'],
    trust: ['confiance', 'sûr', 'fiable', 'merci', 'génial', '👍'],
    anticipation: ['bientôt', 'attendre', 'espérer', 'futur', 'demain']
  };

  const emotions = {};
  const textLower = text.toLowerCase();
  let totalMatches = 0;

  Object.keys(emotionKeywords).forEach(emotion => {
    let matches = 0;
    emotionKeywords[emotion].forEach(keyword => {
      if (textLower.includes(keyword)) {
        matches++;
      }
    });
    emotions[emotion] = matches;
    totalMatches += matches;
  });

  // Normalisation
  if (totalMatches > 0) {
    Object.keys(emotions).forEach(emotion => {
      emotions[emotion] = emotions[emotion] / totalMatches;
    });
  } else {
    // Valeurs par défaut si aucun mot-clé détecté
    emotions.joy = 0.3;
    emotions.trust = 0.2;
    emotions.anticipation = 0.2;
    emotions.surprise = 0.1;
  }

  return emotions;
}

function findDominantEmotion(emotions) {
  let maxEmotion = 'joy';
  let maxValue = 0;

  Object.keys(emotions).forEach(emotion => {
    if (emotions[emotion] > maxValue) {
      maxValue = emotions[emotion];
      maxEmotion = emotion;
    }
  });

  return maxEmotion;
}

export default useEmotionAnalysis;