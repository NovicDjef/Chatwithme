// services/emotion/advancedEmotionAnalysis.js - Service d'analyse émotionnelle avec APIs avancées

import {
  EMOTION_PROVIDERS,
  EmotionAnalysisConfig,
  EmotionAnalysisResult,
  EmotionValidators
} from '../../types/emotion.types.js';

class AdvancedEmotionAnalysisService {
  constructor() {
    this.config = new EmotionAnalysisConfig();
    this.cache = new Map();
    this.apiKeys = {
      azure: process.env.AZURE_TEXT_ANALYTICS_KEY,
      google: process.env.GOOGLE_CLOUD_API_KEY,
      aws: process.env.AWS_ACCESS_KEY_ID,
      openai: process.env.OPENAI_API_KEY
    };
    this.rateLimits = {
      azure: { requests: 0, windowStart: Date.now(), limit: 1000 },
      google: { requests: 0, windowStart: Date.now(), limit: 600 },
      openai: { requests: 0, windowStart: Date.now(), limit: 3000 }
    };
    this.fallbackChain = [
      EMOTION_PROVIDERS.AZURE_TEXT_ANALYTICS,
      EMOTION_PROVIDERS.GOOGLE_NATURAL_LANGUAGE,
      EMOTION_PROVIDERS.OPENAI_GPT,
      EMOTION_PROVIDERS.LOCAL_BASIC
    ];
  }

  /**
   * Analyse émotionnelle principale avec fallback automatique
   */
  async analyzeEmotion(text, config = null) {
    const analysisConfig = config || this.config;
    
    // Validation des entrées
    if (!text || typeof text !== 'string' || text.trim().length < 2) {
      return this.createEmptyResult('Texte invalide ou trop court');
    }

    // Vérification du cache
    const cacheKey = this.generateCacheKey(text, analysisConfig);
    if (analysisConfig.enableCaching && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (this.isCacheValid(cached)) {
        return { ...cached.result, fromCache: true };
      }
    }

    let result = null;
    let errors = [];

    // Tentative avec les providers dans l'ordre de fallback
    for (const provider of this.fallbackChain) {
      try {
        if (!this.isProviderAvailable(provider)) continue;
        
        if (await this.checkRateLimit(provider)) {
          result = await this.analyzeWithProvider(text, provider, analysisConfig);
          
          if (result && result.confidence >= analysisConfig.confidenceThreshold) {
            break;
          }
        }
      } catch (error) {
        console.warn(`Échec analyse avec ${provider}:`, error.message);
        errors.push({ provider, error: error.message });
        continue;
      }
    }

    // Si aucun provider n'a fonctionné
    if (!result) {
      result = this.createEmptyResult('Tous les providers ont échoué', errors);
    }

    // Mise en cache si configuré
    if (analysisConfig.enableCaching && result.confidence > 0.5) {
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000 // 24h
      });
    }

    return result;
  }

  /**
   * Analyse avec Azure Text Analytics
   */
  async analyzeWithAzure(text, config) {
    if (!this.apiKeys.azure) {
      throw new Error('Clé API Azure manquante');
    }

    const response = await fetch(
      `https://${process.env.AZURE_TEXT_ANALYTICS_ENDPOINT}/text/analytics/v3.1/sentiment`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKeys.azure,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documents: [{
            id: '1',
            language: config.language,
            text: text
          }]
        }),
        timeout: config.timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Azure API error: ${response.status}`);
    }

    const data = await response.json();
    const doc = data.documents[0];

    if (doc.error) {
      throw new Error(`Azure analysis error: ${doc.error.message}`);
    }

    // Conversion du format Azure vers notre format
    const emotions = this.convertAzureToEmotions(doc);
    const dominantEmotion = this.findDominantEmotion(emotions);

    return new EmotionAnalysisResult({
      emotions,
      dominantEmotion,
      confidence: doc.confidenceScores[doc.sentiment],
      intensity: this.calculateIntensity(emotions),
      sentiment: {
        polarity: doc.sentiment,
        score: doc.sentiment === 'positive' ? doc.confidenceScores.positive :
               doc.sentiment === 'negative' ? -doc.confidenceScores.negative : 0
      },
      provider: EMOTION_PROVIDERS.AZURE_TEXT_ANALYTICS,
      culturalContext: config.culturalContext,
      metadata: {
        rawResponse: doc,
        language: config.language
      }
    });
  }

  /**
   * Analyse avec Google Natural Language
   */
  async analyzeWithGoogle(text, config) {
    if (!this.apiKeys.google) {
      throw new Error('Clé API Google manquante');
    }

    // Analyse de sentiment
    const sentimentResponse = await fetch(
      `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${this.apiKeys.google}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: {
            type: 'PLAIN_TEXT',
            language: config.language,
            content: text
          },
          encodingType: 'UTF8'
        }),
        timeout: config.timeout
      }
    );

    if (!sentimentResponse.ok) {
      throw new Error(`Google Sentiment API error: ${sentimentResponse.status}`);
    }

    const sentimentData = await sentimentResponse.json();

    // Analyse d'entités pour détecter les émotions
    const entityResponse = await fetch(
      `https://language.googleapis.com/v1/documents:analyzeEntitySentiment?key=${this.apiKeys.google}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: {
            type: 'PLAIN_TEXT',
            language: config.language,
            content: text
          },
          encodingType: 'UTF8'
        })
      }
    );

    const entityData = entityResponse.ok ? await entityResponse.json() : null;

    // Conversion vers notre format
    const emotions = this.convertGoogleToEmotions(sentimentData, entityData);
    const dominantEmotion = this.findDominantEmotion(emotions);

    return new EmotionAnalysisResult({
      emotions,
      dominantEmotion,
      confidence: Math.abs(sentimentData.documentSentiment.magnitude) / 2, // Normalisé 0-1
      intensity: Math.abs(sentimentData.documentSentiment.score),
      sentiment: {
        polarity: sentimentData.documentSentiment.score > 0.1 ? 'positive' :
                 sentimentData.documentSentiment.score < -0.1 ? 'negative' : 'neutral',
        score: sentimentData.documentSentiment.score
      },
      provider: EMOTION_PROVIDERS.GOOGLE_NATURAL_LANGUAGE,
      culturalContext: config.culturalContext,
      metadata: {
        magnitude: sentimentData.documentSentiment.magnitude,
        entities: entityData?.entities || []
      }
    });
  }

  /**
   * Analyse avec OpenAI GPT (approche créative)
   */
  async analyzeWithOpenAI(text, config) {
    if (!this.apiKeys.openai) {
      throw new Error('Clé API OpenAI manquante');
    }

    const prompt = this.createEmotionAnalysisPrompt(text, config);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKeys.openai}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en analyse émotionnelle. Réponds uniquement avec du JSON valide.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      }),
      timeout: config.timeout
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    // Validation et conversion
    const emotions = this.validateAndNormalizeEmotions(analysis.emotions);
    const dominantEmotion = this.findDominantEmotion(emotions);

    return new EmotionAnalysisResult({
      emotions,
      dominantEmotion,
      confidence: analysis.confidence || 0.8,
      intensity: analysis.intensity || this.calculateIntensity(emotions),
      sentiment: analysis.sentiment,
      provider: EMOTION_PROVIDERS.OPENAI_GPT,
      culturalContext: config.culturalContext,
      metadata: {
        reasoning: analysis.reasoning,
        culturalNotes: analysis.culturalNotes
      }
    });
  }

  /**
   * Création du prompt pour OpenAI
   */
  createEmotionAnalysisPrompt(text, config) {
    return `
Analyse les émotions dans ce texte en ${config.language} avec le contexte culturel ${config.culturalContext}:

"${text}"

Retourne un JSON avec cette structure exacte:
{
  "emotions": {
    "joy": 0.0-1.0,
    "sadness": 0.0-1.0,
    "anger": 0.0-1.0,
    "fear": 0.0-1.0,
    "surprise": 0.0-1.0,
    "disgust": 0.0-1.0,
    "trust": 0.0-1.0,
    "anticipation": 0.0-1.0
  },
  "confidence": 0.0-1.0,
  "intensity": 0.0-1.0,
  "sentiment": {"polarity": "positive|negative|neutral", "score": -1.0 to 1.0},
  "reasoning": "explication courte",
  "culturalNotes": "observations culturelles pertinentes"
}
`;
  }

  /**
   * Analyse avec provider spécifique
   */
  async analyzeWithProvider(text, provider, config) {
    switch (provider) {
      case EMOTION_PROVIDERS.AZURE_TEXT_ANALYTICS:
        return await this.analyzeWithAzure(text, config);
      case EMOTION_PROVIDERS.GOOGLE_NATURAL_LANGUAGE:
        return await this.analyzeWithGoogle(text, config);
      case EMOTION_PROVIDERS.OPENAI_GPT:
        return await this.analyzeWithOpenAI(text, config);
      case EMOTION_PROVIDERS.LOCAL_BASIC:
        return await this.analyzeWithLocal(text, config);
      default:
        throw new Error(`Provider ${provider} non supporté`);
    }
  }

  /**
   * Analyse locale basique (fallback)
   */
  async analyzeWithLocal(text, config) {
    // Import du service local existant
    const { emotionAnalysisService } = await import('./emotionAnalysis.js');
    const result = await emotionAnalysisService.analyzeTextEmotion(text);
    
    // Conversion vers le nouveau format
    return new EmotionAnalysisResult({
      emotions: result.emotions || {},
      dominantEmotion: this.findDominantEmotion(result.emotions || {}),
      confidence: result.confidence || 0.4,
      intensity: this.calculateIntensity(result.emotions || {}),
      sentiment: result.overallSentiment,
      provider: EMOTION_PROVIDERS.LOCAL_BASIC,
      warnings: result.warnings || [],
      culturalContext: config.culturalContext
    });
  }

  /**
   * Utilitaires de conversion des formats API
   */
  convertAzureToEmotions(azureDoc) {
    const emotions = {};
    
    // Azure fournit sentiment général, on infère les émotions
    if (azureDoc.sentiment === 'positive') {
      emotions.joy = azureDoc.confidenceScores.positive;
      emotions.trust = azureDoc.confidenceScores.positive * 0.7;
    } else if (azureDoc.sentiment === 'negative') {
      emotions.sadness = azureDoc.confidenceScores.negative * 0.6;
      emotions.anger = azureDoc.confidenceScores.negative * 0.4;
    }
    
    emotions.surprise = azureDoc.confidenceScores.neutral * 0.5;
    
    return this.normalizeEmotions(emotions);
  }

  convertGoogleToEmotions(sentimentData, entityData) {
    const emotions = {};
    const score = sentimentData.documentSentiment.score;
    const magnitude = sentimentData.documentSentiment.magnitude;
    
    if (score > 0.1) {
      emotions.joy = score * magnitude;
      emotions.trust = score * 0.7;
    } else if (score < -0.1) {
      emotions.sadness = Math.abs(score) * magnitude * 0.6;
      emotions.anger = Math.abs(score) * magnitude * 0.4;
    }
    
    emotions.surprise = magnitude * 0.3;
    
    return this.normalizeEmotions(emotions);
  }

  /**
   * Utilitaires généraux
   */
  normalizeEmotions(emotions) {
    const normalized = {};
    const total = Object.values(emotions).reduce((sum, val) => sum + val, 0);
    
    if (total === 0) return emotions;
    
    Object.keys(emotions).forEach(emotion => {
      if (EmotionValidators.isValidEmotion(emotion)) {
        normalized[emotion] = Math.min(emotions[emotion] / total, 1);
      }
    });
    
    return normalized;
  }

  findDominantEmotion(emotions) {
    if (!emotions || Object.keys(emotions).length === 0) return null;
    
    return Object.keys(emotions).reduce((a, b) => 
      emotions[a] > emotions[b] ? a : b
    );
  }

  calculateIntensity(emotions) {
    if (!emotions || Object.keys(emotions).length === 0) return 0;
    
    const values = Object.values(emotions);
    return Math.max(...values);
  }

  validateAndNormalizeEmotions(emotions) {
    const validated = {};
    
    Object.keys(emotions || {}).forEach(emotion => {
      if (EmotionValidators.isValidEmotion(emotion) && 
          EmotionValidators.isValidIntensity(emotions[emotion])) {
        validated[emotion] = emotions[emotion];
      }
    });
    
    return validated;
  }

  /**
   * Gestion du cache et rate limiting
   */
  generateCacheKey(text, config) {
    const textHash = this.simpleHash(text.toLowerCase().trim());
    return `emotion_${config.provider}_${config.language}_${textHash}`;
  }

  isCacheValid(cached) {
    return cached && (Date.now() - cached.timestamp) < cached.ttl;
  }

  async checkRateLimit(provider) {
    const limit = this.rateLimits[provider];
    if (!limit) return true;

    const now = Date.now();
    const windowDuration = 60 * 1000; // 1 minute

    // Reset du compteur si nouvelle fenêtre
    if (now - limit.windowStart > windowDuration) {
      limit.requests = 0;
      limit.windowStart = now;
    }

    if (limit.requests >= limit.limit) {
      return false;
    }

    limit.requests++;
    return true;
  }

  isProviderAvailable(provider) {
    switch (provider) {
      case EMOTION_PROVIDERS.AZURE_TEXT_ANALYTICS:
        return !!this.apiKeys.azure;
      case EMOTION_PROVIDERS.GOOGLE_NATURAL_LANGUAGE:
        return !!this.apiKeys.google;
      case EMOTION_PROVIDERS.OPENAI_GPT:
        return !!this.apiKeys.openai;
      case EMOTION_PROVIDERS.LOCAL_BASIC:
        return true;
      default:
        return false;
    }
  }

  createEmptyResult(message, errors = []) {
    return new EmotionAnalysisResult({
      emotions: {},
      confidence: 0,
      warnings: [message],
      metadata: { errors }
    });
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Configuration et méthodes publiques
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  clearCache() {
    this.cache.clear();
  }

  getUsageStats() {
    return {
      cacheSize: this.cache.size,
      rateLimits: this.rateLimits,
      availableProviders: this.fallbackChain.filter(p => this.isProviderAvailable(p))
    };
  }
}

// Instance singleton
export const advancedEmotionService = new AdvancedEmotionAnalysisService();

// Interface publique simplifiée
export const analyzeEmotionAdvanced = (text, config) => {
  return advancedEmotionService.analyzeEmotion(text, config);
};

export default advancedEmotionService;