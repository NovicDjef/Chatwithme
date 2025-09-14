// types/emotion.types.js - Définitions TypeScript pour le système émotionnel

/**
 * Émotions de base reconnues par le système
 */
export const BASIC_EMOTIONS = {
  JOY: 'joy',
  SADNESS: 'sadness', 
  ANGER: 'anger',
  FEAR: 'fear',
  SURPRISE: 'surprise',
  DISGUST: 'disgust',
  TRUST: 'trust',
  ANTICIPATION: 'anticipation'
};

/**
 * Niveaux d'intensité émotionnelle
 */
export const EMOTION_INTENSITY = {
  VERY_LOW: 0.1,
  LOW: 0.3,
  MEDIUM: 0.5,
  HIGH: 0.7,
  VERY_HIGH: 0.9
};

/**
 * Providers d'analyse émotionnelle supportés
 */
export const EMOTION_PROVIDERS = {
  AZURE_TEXT_ANALYTICS: 'azure_text',
  GOOGLE_NATURAL_LANGUAGE: 'google_nl',
  AWS_COMPREHEND: 'aws_comprehend',
  OPENAI_GPT: 'openai',
  LOCAL_BASIC: 'local_basic'
};

/**
 * Structure d'un résultat d'analyse émotionnelle
 */
export class EmotionAnalysisResult {
  constructor({
    emotions = {},
    dominantEmotion = null,
    confidence = 0,
    intensity = 0,
    sentiment = null,
    culturalContext = 'western',
    provider = 'local_basic',
    timestamp = new Date(),
    warnings = [],
    metadata = {}
  } = {}) {
    this.emotions = emotions; // { joy: 0.8, sadness: 0.2, ... }
    this.dominantEmotion = dominantEmotion; // 'joy'
    this.confidence = confidence; // 0.0 - 1.0
    this.intensity = intensity; // 0.0 - 1.0
    this.sentiment = sentiment; // { polarity: 'positive', score: 0.8 }
    this.culturalContext = culturalContext;
    this.provider = provider;
    this.timestamp = timestamp;
    this.warnings = warnings;
    this.metadata = metadata;
  }
}

/**
 * Configuration d'analyse émotionnelle
 */
export class EmotionAnalysisConfig {
  constructor({
    provider = EMOTION_PROVIDERS.LOCAL_BASIC,
    language = 'fr',
    culturalContext = 'western',
    confidenceThreshold = 0.6,
    enableCaching = true,
    enableFallback = true,
    maxRetries = 2,
    timeout = 5000
  } = {}) {
    this.provider = provider;
    this.language = language;
    this.culturalContext = culturalContext;
    this.confidenceThreshold = confidenceThreshold;
    this.enableCaching = enableCaching;
    this.enableFallback = enableFallback;
    this.maxRetries = maxRetries;
    this.timeout = timeout;
  }
}

/**
 * Profil émotionnel d'un utilisateur
 */
export class UserEmotionalProfile {
  constructor({
    userId,
    baselineEmotions = {},
    emotionalTraits = {},
    communicationStyle = 'neutral',
    preferredLanguages = ['fr'],
    culturalBackground = 'western',
    emotionalSensitivity = 0.5,
    privacySettings = {},
    lastUpdated = new Date()
  } = {}) {
    this.userId = userId;
    this.baselineEmotions = baselineEmotions; // Émotions habituelles
    this.emotionalTraits = emotionalTraits; // { empathy: 0.8, expressiveness: 0.6 }
    this.communicationStyle = communicationStyle; // 'formal', 'casual', 'expressive'
    this.preferredLanguages = preferredLanguages;
    this.culturalBackground = culturalBackground;
    this.emotionalSensitivity = emotionalSensitivity; // 0.0 - 1.0
    this.privacySettings = privacySettings;
    this.lastUpdated = lastUpdated;
  }
}

/**
 * État émotionnel temporaire d'un utilisateur
 */
export class EmotionalState {
  constructor({
    userId,
    currentEmotions = {},
    mood = 'neutral',
    energy = 0.5,
    stress = 0.5,
    availability = 'available',
    context = {},
    timestamp = new Date(),
    expiresAt = null
  } = {}) {
    this.userId = userId;
    this.currentEmotions = currentEmotions;
    this.mood = mood; // 'happy', 'sad', 'neutral', 'excited', etc.
    this.energy = energy; // 0.0 (exhausted) - 1.0 (energized)
    this.stress = stress; // 0.0 (relaxed) - 1.0 (very stressed)
    this.availability = availability; // 'available', 'busy', 'do_not_disturb'
    this.context = context; // { location: 'work', activity: 'meeting' }
    this.timestamp = timestamp;
    this.expiresAt = expiresAt || new Date(Date.now() + 4 * 60 * 60 * 1000); // 4h par défaut
  }
}

/**
 * Score de compatibilité émotionnelle entre utilisateurs
 */
export class EmotionalCompatibility {
  constructor({
    user1Id,
    user2Id,
    overallScore = 0,
    communicationScore = 0,
    empathyScore = 0,
    energyAlignment = 0,
    recommendedTiming = [],
    factors = {},
    calculatedAt = new Date()
  } = {}) {
    this.user1Id = user1Id;
    this.user2Id = user2Id;
    this.overallScore = overallScore; // 0.0 - 1.0
    this.communicationScore = communicationScore;
    this.empathyScore = empathyScore;
    this.energyAlignment = energyAlignment;
    this.recommendedTiming = recommendedTiming; // ['morning', 'evening']
    this.factors = factors; // Détails du calcul
    this.calculatedAt = calculatedAt;
  }
}

/**
 * Historique émotionnel
 */
export class EmotionHistory {
  constructor({
    userId,
    entries = [],
    patterns = {},
    insights = [],
    period = 'week'
  } = {}) {
    this.userId = userId;
    this.entries = entries; // Array of EmotionalState
    this.patterns = patterns; // Tendances détectées
    this.insights = insights; // Observations générées par IA
    this.period = period; // 'day', 'week', 'month'
  }
}

/**
 * Utilitaires de validation
 */
export const EmotionValidators = {
  isValidEmotion: (emotion) => Object.values(BASIC_EMOTIONS).includes(emotion),
  isValidIntensity: (intensity) => intensity >= 0 && intensity <= 1,
  isValidProvider: (provider) => Object.values(EMOTION_PROVIDERS).includes(provider),
  isValidSentiment: (sentiment) => sentiment && 
    ['positive', 'negative', 'neutral'].includes(sentiment.polarity) &&
    sentiment.score >= -1 && sentiment.score <= 1
};

/**
 * Constantes pour l'UI
 */
export const EMOTION_COLORS = {
  joy: '#FFD700',
  sadness: '#4169E1', 
  anger: '#DC143C',
  fear: '#9932CC',
  surprise: '#FF8C00',
  disgust: '#228B22',
  trust: '#20B2AA',
  anticipation: '#FF1493'
};

export const EMOTION_ICONS = {
  joy: '🙂',
  sadness: '😢',
  anger: '😠',
  fear: '😰',
  surprise: '😲',
  disgust: '🤢',
  trust: '😊',
  anticipation: '🤔'
};