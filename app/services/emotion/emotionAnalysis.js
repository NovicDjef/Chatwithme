// services/emotion/emotionAnalysis.js - Version réaliste avec limitations explicites

class EmotionAnalysisService {
  constructor() {
    this.isEnabled = false;
    this.accuracy = 0.6; // Précision réaliste actuelle de l'IA
    this.confidenceThreshold = 0.8;
    this.apiCosts = {
      textAnalysis: 0.001, // $ par analyse
      audioAnalysis: 0.01,  // $ par minute d'audio
      faceAnalysis: 0.005   // $ par image
    };
    this.monthlyBudget = 50; // $ par mois
    this.currentMonthSpent = 0;
    
    // Mise en garde importante
    console.warn(`
      ⚠️  ATTENTION: L'analyse émotionnelle IA a des limitations importantes:
      - Précision maximale actuelle: ~60-70%
      - Biais culturels et linguistiques
      - Risques de faux positifs/négatifs
      - Coûts significatifs à grande échelle
      Ne pas utiliser pour des communications critiques ou sensibles.
    `);
  }

  // Analyse textuelle avec limitations explicites
  async analyzeTextEmotion(text, options = {}) {
    if (!this.canAffordAnalysis('text')) {
      return this.getFallbackAnalysis(text);
    }

    try {
      // Vérifications préalables
      if (!text || text.length < 3) {
        return this.getEmptyAnalysis();
      }

      if (text.length > 500) {
        console.warn('Texte trop long, analyse risque d\'être imprécise');
      }

      // Simulation d'appel API réel (remplacer par vraie API)
      const result = await this.callEmotionAPI(text, 'text');
      
      // Ajustement de confiance basé sur les limites connues
      const adjustedResult = this.applyRealisticConfidence(result);
      
      // Ajout des avertissements appropriés
      return this.addSafetyWarnings(adjustedResult, text);

    } catch (error) {
      console.error('Erreur analyse émotionnelle:', error);
      
      // Fallback vers analyse basique
      return this.getFallbackAnalysis(text);
    }
  }

  // Simulation d'appel API (à remplacer par vraie API comme Azure Text Analytics)
  async callEmotionAPI(text, type) {
    // IMPORTANT: Ceci est une simulation pour démonstration
    // En production, utiliser Azure Cognitive Services, Google Cloud Natural Language,
    // ou AWS Comprehend pour des résultats plus fiables
    
    await this.simulateAPIDelay();
    
    // Coût simulé
    this.currentMonthSpent += this.apiCosts[type + 'Analysis'];
    
    // Analyse basique avec patterns améliorés (mais toujours limités)
    const emotions = this.basicEmotionDetection(text);
    
    // Simulation de confiance réaliste (60-75%)
    const confidence = 0.6 + Math.random() * 0.15;
    
    return {
      emotions,
      overallSentiment: this.calculateSentiment(emotions),
      confidence,
      provider: 'simulated',
      cost: this.apiCosts[type + 'Analysis']
    };
  }

  // Analyse basique améliorée (mais toujours limitée)
  basicEmotionDetection(text) {
    const emotionIndicators = {
      joy: {
        patterns: /\b(heureux|joyeux|content|génial|super|fantastique|merveilleux|excellent|parfait|😊|😄|🎉|❤️)\b/gi,
        intensity: /\b(très|trop|vraiment|extrêmement|incroyablement)\b/gi
      },
      sadness: {
        patterns: /\b(triste|déprimé|mal|difficile|dur|peine|chagrin|😢|😭|💔)\b/gi,
        intensity: /\b(très|tellement|profondément)\b/gi
      },
      anger: {
        patterns: /\b(énervé|furieux|colère|agacé|irrité|fou|rage|déteste|merde|😠|😡|🤬)\b/gi,
        intensity: /\b(vraiment|très|complètement|totalement)\b/gi
      },
      fear: {
        patterns: /\b(peur|anxieux|inquiet|stress|angoisse|nerveux|effrayé|😰|😱)\b/gi,
        intensity: /\b(très|tellement|vraiment)\b/gi
      },
      surprise: {
        patterns: /\b(surpris|étonné|wow|incroyable|choqué|😲|😮)\b/gi,
        intensity: /\b(vraiment|tellement|complètement)\b/gi
      }
    };

    const results = {};
    let totalScore = 0;

    Object.keys(emotionIndicators).forEach(emotion => {
      const matches = text.match(emotionIndicators[emotion].patterns) || [];
      const intensifiers = text.match(emotionIndicators[emotion].intensity) || [];
      
      let score = matches.length;
      score += intensifiers.length * 0.5; // Bonus pour intensificateurs
      
      results[emotion] = {
        score,
        confidence: Math.min(score / (text.split(' ').length / 10), 1),
        indicators: matches.length
      };
      
      totalScore += score;
    });

    // Normalisation
    if (totalScore > 0) {
      Object.keys(results).forEach(emotion => {
        results[emotion].percentage = results[emotion].score / totalScore;
      });
    }

    return results;
  }

  // Application de confiance réaliste
  applyRealisticConfidence(result) {
    // Facteurs qui réduisent la fiabilité
    const realityCheck = {
      culturalBias: 0.9,      // Biais culturels
      contextMissing: 0.85,   // Manque de contexte
      sarcasmDetection: 0.7,  // Détection du sarcasme
      languageNuances: 0.8    // Nuances linguistiques
    };

    const reliabilityFactor = Object.values(realityCheck)
      .reduce((acc, factor) => acc * factor, 1);

    // Réduction de la confiance selon les limites connues
    result.confidence *= reliabilityFactor;
    result.maxPossibleAccuracy = 0.75; // Limite technique actuelle
    result.actualReliability = Math.min(result.confidence, result.maxPossibleAccuracy);

    return result;
  }

  // Ajout d'avertissements de sécurité
  addSafetyWarnings(result, originalText) {
    const warnings = [];

    // Avertissement sur la fiabilité
    if (result.confidence < this.confidenceThreshold) {
      warnings.push('Confiance faible - résultats à prendre avec précaution');
    }

    // Avertissement pour textes courts
    if (originalText.length < 50) {
      warnings.push('Texte court - analyse moins fiable');
    }

    // Avertissement pour sarcasme potentiel
    if (this.detectPotentialSarcasm(originalText)) {
      warnings.push('Sarcasme potentiel détecté - interprétation risquée');
    }

    // Avertissement culturel
    warnings.push('Analyse basée sur des patterns culturels occidentaux');

    return {
      ...result,
      warnings,
      recommendedAction: this.getRecommendedAction(result),
      shouldDisplayToUser: result.confidence > 0.7
    };
  }

  // Détection basique de sarcasme (très limitée)
  detectPotentialSarcasm(text) {
    const sarcasmIndicators = [
      /\b(bien sûr|évidemment|clairement|parfait)\b.*\b(pas|jamais|rien)\b/gi,
      /\b(génial|super|fantastique)\b.*[.]{3,}/gi,
      /\b(merci|thanks)\b.*\b(beaucoup|much)\b.*[!]{2,}/gi
    ];

    return sarcasmIndicators.some(pattern => pattern.test(text));
  }

  // Analyse de fallback sans API
  getFallbackAnalysis(text) {
    const basicAnalysis = this.basicEmotionDetection(text);
    
    return {
      emotions: basicAnalysis,
      confidence: 0.4, // Confiance très basse pour analyse locale
      overallSentiment: this.calculateSentiment(basicAnalysis),
      warnings: [
        'Analyse locale basique utilisée',
        'Précision très limitée',
        'Ne pas utiliser pour des décisions importantes'
      ],
      provider: 'local_basic',
      cost: 0,
      shouldDisplayToUser: false // Ne pas afficher aux utilisateurs
    };
  }

  // Vérification du budget
  canAffordAnalysis(type) {
    const cost = this.apiCosts[type + 'Analysis'];
    
    if (this.currentMonthSpent + cost > this.monthlyBudget) {
      console.warn(`Budget émotionnel épuisé: ${this.currentMonthSpent}/${this.monthlyBudget}$`);
      return false;
    }
    
    return true;
  }

  // Recommandations d'usage
  getRecommendedAction(result) {
    if (result.confidence < 0.6) {
      return 'Ne pas utiliser ces résultats pour prendre des décisions';
    } else if (result.confidence < 0.8) {
      return 'Utiliser comme indication générale uniquement';
    } else {
      return 'Résultats suffisamment fiables pour information générale';
    }
  }

  // Calcul de sentiment global
  calculateSentiment(emotions) {
    const positiveEmotions = ['joy', 'surprise'];
    const negativeEmotions = ['sadness', 'anger', 'fear'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveEmotions.forEach(emotion => {
      if (emotions[emotion]) {
        positiveScore += emotions[emotion].score;
      }
    });
    
    negativeEmotions.forEach(emotion => {
      if (emotions[emotion]) {
        negativeScore += emotions[emotion].score;
      }
    });
    
    const totalScore = positiveScore + negativeScore;
    if (totalScore === 0) return { polarity: 'neutral', confidence: 0.5 };
    
    const polarity = positiveScore > negativeScore ? 'positive' : 
                     negativeScore > positiveScore ? 'negative' : 'neutral';
    
    const confidence = Math.abs(positiveScore - negativeScore) / totalScore;
    
    return { polarity, confidence: Math.min(confidence, 0.8) };
  }

  // Simulation de délai API
  async simulateAPIDelay() {
    const delay = 800 + Math.random() * 1200; // 0.8-2s
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Configuration et statistiques
  async getUsageStats() {
    return {
      monthlySpent: this.currentMonthSpent,
      monthlyBudget: this.monthlyBudget,
      accuracy: this.accuracy,
      totalAnalyses: await this.getTotalAnalyses(),
      costEfficiency: this.calculateCostEfficiency(),
      warnings: [
        'L\'analyse émotionnelle IA n\'est pas une science exacte',
        'Risque de biais et d\'erreurs d\'interprétation',
        'À utiliser uniquement comme indication générale'
      ]
    };
  }

  // Désactivation d'urgence
  emergencyDisable() {
    this.isEnabled = false;
    console.warn('🚨 Analyse émotionnelle désactivée - utilisation inappropriée détectée');
  }

  // Analyse vide pour cas d'erreur
  getEmptyAnalysis() {
    return {
      emotions: {},
      confidence: 0,
      overallSentiment: { polarity: 'neutral', confidence: 0 },
      warnings: ['Impossible d\'analyser le contenu'],
      shouldDisplayToUser: false,
      provider: 'none',
      cost: 0
    };
  }
}

// Instance singleton avec garde-fous
export const emotionAnalysisService = new EmotionAnalysisService();

// Interface publique avec vérifications de sécurité
export const analyzeEmotion = async (text, options = {}) => {
  // Vérification de sécurité
  if (options.criticalCommunication) {
    console.error('🚫 Analyse émotionnelle interdite pour communications critiques');
    return null;
  }

  try {
    const result = await emotionAnalysisService.analyzeTextEmotion(text, options);
    
    // Log pour audit
    console.log(`Analyse émotionnelle: confiance=${result.confidence}, coût=${result.cost}$`);
    
    return result;
  } catch (error) {
    console.error('Erreur analyse émotionnelle:', error);
    return emotionAnalysisService.getEmptyAnalysis();
  }
};

// Export des limitations pour documentation
export const EMOTION_ANALYSIS_LIMITATIONS = {
  maxAccuracy: 0.75,
  culturalBias: 'Optimisé pour contexte occidental',
  languageLimitations: 'Précision variable selon les langues',
  costWarning: 'Coûts significatifs à grande échelle',
  usageRecommendation: 'Usage informatif uniquement, jamais pour décisions critiques',
  privacyConcerns: 'Analyse du contenu émotionnel = données sensibles'
};