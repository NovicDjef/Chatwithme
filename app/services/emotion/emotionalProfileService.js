// services/emotion/emotionalProfileService.js - Gestion des profils émotionnels utilisateurs

import {
  UserEmotionalProfile,
  EmotionalState,
  EmotionalCompatibility,
  EmotionHistory,
  BASIC_EMOTIONS,
  EMOTION_INTENSITY
} from '../../types/emotion.types.js';

import { localStorageService } from '../storage/localStorage.js';
import { advancedEmotionService } from './advancedEmotionAnalysis.js';

class EmotionalProfileService {
  constructor() {
    this.profiles = new Map(); // Cache en mémoire
    this.states = new Map(); // États actuels
    this.compatibilityCache = new Map();
    this.updateInterval = 5 * 60 * 1000; // 5 minutes
    this.cleanupInterval = 60 * 60 * 1000; // 1 heure
    
    this.startPeriodicCleanup();
  }

  /**
   * Gestion des profils émotionnels
   */
  async createEmotionalProfile(userId, initialData = {}) {
    try {
      const profile = new UserEmotionalProfile({
        userId,
        baselineEmotions: initialData.baselineEmotions || this.getDefaultBaselineEmotions(),
        emotionalTraits: initialData.emotionalTraits || this.getDefaultEmotionalTraits(),
        communicationStyle: initialData.communicationStyle || 'neutral',
        preferredLanguages: initialData.preferredLanguages || ['fr'],
        culturalBackground: initialData.culturalBackground || 'western',
        emotionalSensitivity: initialData.emotionalSensitivity || 0.5,
        privacySettings: initialData.privacySettings || this.getDefaultPrivacySettings()
      });

      // Sauvegarde locale
      await localStorageService.storeEmotionalProfile(userId, profile);
      
      // Cache en mémoire
      this.profiles.set(userId, profile);

      return profile;
    } catch (error) {
      console.error('Erreur création profil émotionnel:', error);
      return null;
    }
  }

  async getEmotionalProfile(userId) {
    try {
      // Vérification du cache
      if (this.profiles.has(userId)) {
        return this.profiles.get(userId);
      }

      // Récupération depuis le stockage local
      const stored = await localStorageService.getEmotionalProfile(userId);
      if (stored) {
        const profile = new UserEmotionalProfile(stored);
        this.profiles.set(userId, profile);
        return profile;
      }

      // Création d'un nouveau profil si inexistant
      return await this.createEmotionalProfile(userId);
    } catch (error) {
      console.error('Erreur récupération profil émotionnel:', error);
      return null;
    }
  }

  async updateEmotionalProfile(userId, updates) {
    try {
      const profile = await this.getEmotionalProfile(userId);
      if (!profile) return null;

      // Fusion des mises à jour
      Object.keys(updates).forEach(key => {
        if (profile.hasOwnProperty(key)) {
          profile[key] = updates[key];
        }
      });

      profile.lastUpdated = new Date();

      // Sauvegarde
      await localStorageService.storeEmotionalProfile(userId, profile);
      this.profiles.set(userId, profile);

      return profile;
    } catch (error) {
      console.error('Erreur mise à jour profil émotionnel:', error);
      return null;
    }
  }

  /**
   * Gestion des états émotionnels temporaires
   */
  async setEmotionalState(userId, emotionData, context = {}) {
    try {
      const state = new EmotionalState({
        userId,
        currentEmotions: emotionData.emotions || {},
        mood: this.determineMood(emotionData.emotions),
        energy: context.energy || 0.5,
        stress: context.stress || 0.5,
        availability: context.availability || 'available',
        context: context.additionalContext || {}
      });

      // Sauvegarde
      await localStorageService.storeEmotionalState(userId, state);
      this.states.set(userId, state);

      // Mise à jour de l'historique
      await this.addToEmotionHistory(userId, state);

      return state;
    } catch (error) {
      console.error('Erreur définition état émotionnel:', error);
      return null;
    }
  }

  async getEmotionalState(userId) {
    try {
      // Cache mémoire
      if (this.states.has(userId)) {
        const state = this.states.get(userId);
        if (state.expiresAt > new Date()) {
          return state;
        } else {
          this.states.delete(userId);
        }
      }

      // Stockage local
      const stored = await localStorageService.getEmotionalState(userId);
      if (stored && new Date(stored.expiresAt) > new Date()) {
        const state = new EmotionalState(stored);
        this.states.set(userId, state);
        return state;
      }

      return null;
    } catch (error) {
      console.error('Erreur récupération état émotionnel:', error);
      return null;
    }
  }

  async analyzeAndUpdateEmotionalState(userId, text, context = {}) {
    try {
      // Analyse du texte
      const analysis = await advancedEmotionService.analyzeEmotion(text);
      
      if (!analysis || analysis.confidence < 0.5) {
        return null;
      }

      // Mise à jour de l'état
      const state = await this.setEmotionalState(userId, analysis, context);

      // Apprentissage du profil
      await this.learnFromInteraction(userId, analysis);

      return {
        state,
        analysis
      };
    } catch (error) {
      console.error('Erreur analyse et mise à jour état:', error);
      return null;
    }
  }

  /**
   * Calcul de compatibilité émotionnelle
   */
  async calculateEmotionalCompatibility(user1Id, user2Id) {
    try {
      // Vérification du cache
      const cacheKey = `${user1Id}_${user2Id}`;
      if (this.compatibilityCache.has(cacheKey)) {
        const cached = this.compatibilityCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 30 * 60 * 1000) { // 30 min
          return cached.compatibility;
        }
      }

      // Récupération des profils
      const profile1 = await this.getEmotionalProfile(user1Id);
      const profile2 = await this.getEmotionalProfile(user2Id);

      if (!profile1 || !profile2) {
        return null;
      }

      // Calcul des scores
      const communicationScore = this.calculateCommunicationCompatibility(profile1, profile2);
      const empathyScore = this.calculateEmpathyCompatibility(profile1, profile2);
      const energyAlignment = this.calculateEnergyAlignment(user1Id, user2Id);
      
      const overallScore = (communicationScore + empathyScore + energyAlignment) / 3;

      const compatibility = new EmotionalCompatibility({
        user1Id,
        user2Id,
        overallScore,
        communicationScore,
        empathyScore,
        energyAlignment,
        recommendedTiming: this.getRecommendedTiming(profile1, profile2),
        factors: {
          languageAlignment: this.calculateLanguageAlignment(profile1, profile2),
          culturalAlignment: this.calculateCulturalAlignment(profile1, profile2),
          communicationStyleMatch: this.calculateStyleMatch(profile1, profile2)
        }
      });

      // Mise en cache
      this.compatibilityCache.set(cacheKey, {
        compatibility,
        timestamp: Date.now()
      });

      return compatibility;
    } catch (error) {
      console.error('Erreur calcul compatibilité:', error);
      return null;
    }
  }

  /**
   * Gestion de l'historique émotionnel
   */
  async addToEmotionHistory(userId, emotionalState) {
    try {
      const history = await this.getEmotionHistory(userId);
      
      history.entries.push(emotionalState);
      
      // Limitation à 1000 entrées max
      if (history.entries.length > 1000) {
        history.entries = history.entries.slice(-1000);
      }

      // Mise à jour des patterns
      history.patterns = await this.analyzeEmotionalPatterns(history.entries);
      
      // Génération d'insights
      history.insights = await this.generateEmotionalInsights(history.entries, history.patterns);

      // Sauvegarde
      await localStorageService.storeEmotionHistory(userId, history);

      return history;
    } catch (error) {
      console.error('Erreur ajout historique émotionnel:', error);
      return null;
    }
  }

  async getEmotionHistory(userId, period = 'week') {
    try {
      const stored = await localStorageService.getEmotionHistory(userId);
      
      if (stored) {
        return new EmotionHistory(stored);
      }

      return new EmotionHistory({
        userId,
        period,
        entries: [],
        patterns: {},
        insights: []
      });
    } catch (error) {
      console.error('Erreur récupération historique émotionnel:', error);
      return new EmotionHistory({ userId, period });
    }
  }

  /**
   * Apprentissage et adaptation
   */
  async learnFromInteraction(userId, analysis) {
    try {
      const profile = await this.getEmotionalProfile(userId);
      if (!profile) return;

      // Adaptation du profil basé sur les interactions
      const learningRate = 0.1;
      
      Object.keys(analysis.emotions).forEach(emotion => {
        if (profile.baselineEmotions[emotion]) {
          profile.baselineEmotions[emotion] = 
            profile.baselineEmotions[emotion] * (1 - learningRate) + 
            analysis.emotions[emotion] * learningRate;
        } else {
          profile.baselineEmotions[emotion] = analysis.emotions[emotion] * learningRate;
        }
      });

      await this.updateEmotionalProfile(userId, {
        baselineEmotions: profile.baselineEmotions
      });

    } catch (error) {
      console.error('Erreur apprentissage profil:', error);
    }
  }

  /**
   * Méthodes utilitaires privées
   */
  getDefaultBaselineEmotions() {
    return {
      joy: 0.3,
      sadness: 0.1,
      anger: 0.05,
      fear: 0.1,
      surprise: 0.15,
      disgust: 0.05,
      trust: 0.25,
      anticipation: 0.2
    };
  }

  getDefaultEmotionalTraits() {
    return {
      empathy: 0.5,
      expressiveness: 0.5,
      emotional_stability: 0.5,
      optimism: 0.5,
      sociability: 0.5
    };
  }

  getDefaultPrivacySettings() {
    return {
      shareEmotionalState: true,
      allowMoodAnalysis: true,
      shareWithContacts: false,
      dataRetention: '30_days'
    };
  }

  determineMood(emotions) {
    if (!emotions || Object.keys(emotions).length === 0) {
      return 'neutral';
    }

    const dominant = Object.keys(emotions).reduce((a, b) => 
      emotions[a] > emotions[b] ? a : b
    );

    const moodMap = {
      joy: 'happy',
      sadness: 'sad',
      anger: 'angry',
      fear: 'anxious',
      surprise: 'surprised',
      trust: 'confident',
      anticipation: 'excited'
    };

    return moodMap[dominant] || 'neutral';
  }

  calculateCommunicationCompatibility(profile1, profile2) {
    const styleCompatibility = {
      'formal-formal': 0.9,
      'casual-casual': 0.9,
      'expressive-expressive': 0.9,
      'formal-casual': 0.6,
      'formal-expressive': 0.4,
      'casual-expressive': 0.7
    };

    const key = `${profile1.communicationStyle}-${profile2.communicationStyle}`;
    return styleCompatibility[key] || 0.5;
  }

  calculateEmpathyCompatibility(profile1, profile2) {
    const empathy1 = profile1.emotionalTraits.empathy || 0.5;
    const empathy2 = profile2.emotionalTraits.empathy || 0.5;
    
    // Plus les niveaux d'empathie sont proches, meilleure est la compatibilité
    return 1 - Math.abs(empathy1 - empathy2);
  }

  calculateEnergyAlignment(user1Id, user2Id) {
    const state1 = this.states.get(user1Id);
    const state2 = this.states.get(user2Id);
    
    if (!state1 || !state2) return 0.5;
    
    return 1 - Math.abs(state1.energy - state2.energy);
  }

  calculateLanguageAlignment(profile1, profile2) {
    const commonLanguages = profile1.preferredLanguages.filter(lang =>
      profile2.preferredLanguages.includes(lang)
    );
    
    const totalLanguages = new Set([
      ...profile1.preferredLanguages,
      ...profile2.preferredLanguages
    ]).size;
    
    return commonLanguages.length / totalLanguages;
  }

  calculateCulturalAlignment(profile1, profile2) {
    return profile1.culturalBackground === profile2.culturalBackground ? 1.0 : 0.7;
  }

  calculateStyleMatch(profile1, profile2) {
    return profile1.communicationStyle === profile2.communicationStyle ? 1.0 : 0.5;
  }

  getRecommendedTiming(profile1, profile2) {
    // Logique simple basée sur les traits
    const timing = [];
    
    if (profile1.emotionalTraits.energy > 0.7 && profile2.emotionalTraits.energy > 0.7) {
      timing.push('morning');
    }
    
    if (profile1.emotionalTraits.sociability > 0.6 && profile2.emotionalTraits.sociability > 0.6) {
      timing.push('evening');
    }
    
    return timing.length > 0 ? timing : ['anytime'];
  }

  async analyzeEmotionalPatterns(entries) {
    if (entries.length < 7) return {};

    const patterns = {};
    
    // Analyse par jour de la semaine
    patterns.weeklyPattern = this.analyzeWeeklyPattern(entries);
    
    // Analyse par heure
    patterns.hourlyPattern = this.analyzeHourlyPattern(entries);
    
    // Tendances émotionnelles
    patterns.emotionalTrends = this.analyzeEmotionalTrends(entries);
    
    return patterns;
  }

  analyzeWeeklyPattern(entries) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const pattern = {};
    
    days.forEach(day => {
      pattern[day] = { averageMood: 'neutral', averageEnergy: 0.5 };
    });
    
    // Analyse basique - à améliorer
    entries.forEach(entry => {
      const day = days[new Date(entry.timestamp).getDay()];
      // Logique de calcul...
    });
    
    return pattern;
  }

  analyzeHourlyPattern(entries) {
    // Retourne les patterns d'humeur par heure de la journée
    return {};
  }

  analyzeEmotionalTrends(entries) {
    // Analyse des tendances sur les dernières semaines
    return {};
  }

  async generateEmotionalInsights(entries, patterns) {
    // Génération d'insights basés sur les patterns détectés
    const insights = [];
    
    if (patterns.weeklyPattern) {
      insights.push({
        type: 'weekly_pattern',
        message: 'Votre humeur semble plus positive en fin de semaine',
        confidence: 0.7
      });
    }
    
    return insights;
  }

  /**
   * Nettoyage périodique
   */
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupExpiredStates();
      this.cleanupCompatibilityCache();
    }, this.cleanupInterval);
  }

  cleanupExpiredStates() {
    const now = new Date();
    for (const [userId, state] of this.states.entries()) {
      if (state.expiresAt < now) {
        this.states.delete(userId);
      }
    }
  }

  cleanupCompatibilityCache() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 heure
    
    for (const [key, cached] of this.compatibilityCache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.compatibilityCache.delete(key);
      }
    }
  }
}

// Instance singleton
export const emotionalProfileService = new EmotionalProfileService();

// Interface publique
export const createEmotionalProfile = (userId, data) => {
  return emotionalProfileService.createEmotionalProfile(userId, data);
};

export const getEmotionalProfile = (userId) => {
  return emotionalProfileService.getEmotionalProfile(userId);
};

export const analyzeAndUpdateState = (userId, text, context) => {
  return emotionalProfileService.analyzeAndUpdateEmotionalState(userId, text, context);
};

export const calculateCompatibility = (user1Id, user2Id) => {
  return emotionalProfileService.calculateEmotionalCompatibility(user1Id, user2Id);
};

export default emotionalProfileService;