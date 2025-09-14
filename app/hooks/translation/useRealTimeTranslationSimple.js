// hooks/translation/useRealTimeTranslationSimple.js - Version simplifiée pour la démo

import { useState, useCallback } from 'react';

export const useRealTimeTranslation = () => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);

  const translateText = useCallback(async (text, fromLang, toLang) => {
    setIsTranslating(true);
    setTranslationError(null);

    try {
      // Simulation d'une traduction avec des exemples réalistes
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Exemples de traductions simulées
      const translations = {
        'fr-en': {
          'Bonjour': 'Hello',
          'Comment allez-vous?': 'How are you?',
          'Merci beaucoup': 'Thank you very much',
          'Au revoir': 'Goodbye',
          'Je ne comprends pas': 'I don\'t understand',
        },
        'en-fr': {
          'Hello': 'Bonjour',
          'How are you?': 'Comment allez-vous?',
          'Thank you very much': 'Merci beaucoup',
          'Goodbye': 'Au revoir',
          'I don\'t understand': 'Je ne comprends pas',
        },
        'fr-es': {
          'Bonjour': 'Hola',
          'Comment allez-vous?': '¿Cómo estás?',
          'Merci beaucoup': 'Muchas gracias',
        },
        'en-es': {
          'Hello': 'Hola',
          'How are you?': '¿Cómo estás?',
          'Thank you': 'Gracias',
        }
      };

      const langPair = `${fromLang}-${toLang}`;
      const exactMatch = translations[langPair]?.[text];

      if (exactMatch) {
        return exactMatch;
      } else {
        // Traduction générique avec indication de la langue
        const langNames = {
          fr: 'français', en: 'anglais', es: 'espagnol',
          de: 'allemand', it: 'italien', pt: 'portugais',
          ar: 'arabe', zh: 'chinois', ja: 'japonais', ko: 'coréen'
        };
        return `[${langNames[toLang] || toLang}] ${text}`;
      }
    } catch (error) {
      setTranslationError(error.message);
      throw error;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  return {
    translateText,
    isTranslating,
    translationError,
    supportedLanguages: ['fr', 'en', 'es', 'de', 'it', 'pt', 'ar', 'zh', 'ja', 'ko']
  };
};