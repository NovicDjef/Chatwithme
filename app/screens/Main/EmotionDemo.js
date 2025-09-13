// screens/Main/EmotionDemo.js - Démo du système d'analyse émotionnelle

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';

import { useEmotionAnalysis } from '../../hooks/emotion/useEmotionAnalysis.js';
import EmotionalProfileIndicator from '../../components/Chat/EmotionalProfileIndicator.js';
import { EMOTION_COLORS, EMOTION_ICONS } from '../../types/emotion.types.js';

const EmotionDemo = () => {
  const [inputText, setInputText] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [demoUserId] = useState('demo_user_123');
  const [demoRecipientId] = useState('demo_recipient_456');

  const {
    analyzeMessage,
    analyzeTextQuick,
    moodData,
    compatibility,
    getInteractionRecommendations,
    isAnalyzing,
    currentProfile,
    error
  } = useEmotionAnalysis(demoUserId, demoRecipientId);

  // Exemples de textes prédéfinis
  const exampleTexts = [
    "Je suis super content de te parler aujourd'hui ! 😊",
    "J'ai passé une journée difficile au travail...",
    "Tu me manques beaucoup, j'ai hâte qu'on se revoie",
    "Je suis vraiment stressé par ce projet",
    "Ça va bien et toi ? Comment s'est passé ta semaine ?",
    "Félicitations pour ta promotion ! C'est fantastique !"
  ];

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un texte à analyser');
      return;
    }

    try {
      const result = await analyzeMessage(inputText, {
        context: { source: 'demo', timestamp: new Date() }
      });
      setAnalysisResult(result);
    } catch (error) {
      Alert.alert('Erreur', 'Échec de l\'analyse: ' + error.message);
    }
  };

  const handleQuickAnalyze = async (text) => {
    setInputText(text);
    try {
      const result = await analyzeTextQuick(text);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Erreur analyse rapide:', error);
    }
  };

  const renderEmotionBar = (emotion, intensity) => (
    <View key={emotion} style={styles.emotionBarContainer}>
      <View style={styles.emotionHeader}>
        <Text style={styles.emotionIcon}>{EMOTION_ICONS[emotion]}</Text>
        <Text style={styles.emotionName}>{emotion}</Text>
        <Text style={styles.emotionValue}>{Math.round(intensity * 100)}%</Text>
      </View>
      <View style={styles.emotionBar}>
        <View 
          style={[
            styles.emotionBarFill,
            { 
              width: `${intensity * 100}%`,
              backgroundColor: EMOTION_COLORS[emotion]
            }
          ]} 
        />
      </View>
    </View>
  );

  const renderAnalysisResult = () => {
    if (!analysisResult) return null;

    const recommendations = getInteractionRecommendations();

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Résultat de l'analyse</Text>
        
        {/* Score de confiance */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Confiance</Text>
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceBarFill,
                { 
                  width: `${analysisResult.confidence * 100}%`,
                  backgroundColor: analysisResult.confidence > 0.7 ? '#4CAF50' : 
                                 analysisResult.confidence > 0.4 ? '#FF9800' : '#F44336'
                }
              ]} 
            />
          </View>
          <Text style={styles.confidenceValue}>
            {Math.round(analysisResult.confidence * 100)}%
          </Text>
        </View>

        {/* Émotions détectées */}
        {analysisResult.emotions && Object.keys(analysisResult.emotions).length > 0 && (
          <View style={styles.emotionsSection}>
            <Text style={styles.sectionTitle}>Émotions détectées</Text>
            {Object.entries(analysisResult.emotions)
              .filter(([_, intensity]) => intensity > 0.1)
              .sort(([_, a], [__, b]) => b - a)
              .map(([emotion, intensity]) => renderEmotionBar(emotion, intensity))
            }
          </View>
        )}

        {/* Sentiment global */}
        {analysisResult.sentiment && (
          <View style={styles.sentimentSection}>
            <Text style={styles.sectionTitle}>Sentiment global</Text>
            <View style={styles.sentimentContainer}>
              <Text style={[
                styles.sentimentText,
                { 
                  color: analysisResult.sentiment.polarity === 'positive' ? '#4CAF50' :
                         analysisResult.sentiment.polarity === 'negative' ? '#F44336' : '#9E9E9E'
                }
              ]}>
                {analysisResult.sentiment.polarity === 'positive' ? '😊 Positif' :
                 analysisResult.sentiment.polarity === 'negative' ? '😞 Négatif' : '😐 Neutre'}
              </Text>
              <Text style={styles.sentimentScore}>
                Score: {Math.round(analysisResult.sentiment.score * 100)}
              </Text>
            </View>
          </View>
        )}

        {/* Recommandations d'interaction */}
        {recommendations && (
          <View style={styles.recommendationsSection}>
            <Text style={styles.sectionTitle}>Recommandations</Text>
            <Text style={styles.recommendationText}>
              🎯 Approche: {recommendations.approach}
            </Text>
            <Text style={styles.recommendationText}>
              🎨 Ton: {recommendations.tone}
            </Text>
            <Text style={styles.recommendationText}>
              ⏰ Timing: {recommendations.timing}
            </Text>
            {recommendations.warnings.length > 0 && (
              <View style={styles.warningsContainer}>
                {recommendations.warnings.map((warning, index) => (
                  <Text key={index} style={styles.warningText}>
                    ⚠️ {warning}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Avertissements */}
        {analysisResult.warnings && analysisResult.warnings.length > 0 && (
          <View style={styles.warningsSection}>
            <Text style={styles.sectionTitle}>Avertissements</Text>
            {analysisResult.warnings.map((warning, index) => (
              <Text key={index} style={styles.warningText}>
                ⚠️ {warning}
              </Text>
            ))}
          </View>
        )}

        {/* Métadonnées */}
        <View style={styles.metadataSection}>
          <Text style={styles.metadataText}>
            Provider: {analysisResult.provider} | 
            Langue: {analysisResult.metadata?.language || 'auto'} |
            Cache: {analysisResult.fromCache ? 'Oui' : 'Non'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧠 Démo Analyse Émotionnelle</Text>
        <Text style={styles.subtitle}>Phase 1 - Intelligence Émotionnelle Textuelle</Text>
      </View>

      {/* Indicateur de profil émotionnel */}
      <EmotionalProfileIndicator
        userId={demoUserId}
        recipientId={demoRecipientId}
        showCompatibility={true}
        compact={false}
        style={styles.profileIndicator}
      />

      {/* Zone de saisie */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Tapez votre message :</Text>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Exprimez vos émotions ici..."
          multiline
          numberOfLines={3}
        />
        
        <TouchableOpacity 
          style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
          onPress={handleAnalyze}
          disabled={isAnalyzing}
        >
          <Text style={styles.analyzeButtonText}>
            {isAnalyzing ? 'Analyse en cours...' : '🔍 Analyser'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Exemples prédéfinis */}
      <View style={styles.examplesSection}>
        <Text style={styles.examplesTitle}>Exemples à tester :</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {exampleTexts.map((text, index) => (
            <TouchableOpacity
              key={index}
              style={styles.exampleButton}
              onPress={() => handleQuickAnalyze(text)}
            >
              <Text style={styles.exampleButtonText}>{text.substring(0, 30)}...</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Résultats */}
      {renderAnalysisResult()}

      {/* Informations de débogage */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erreur: {error}</Text>
        </View>
      )}

      {/* État actuel */}
      {moodData && (
        <View style={styles.currentStateContainer}>
          <Text style={styles.sectionTitle}>État émotionnel actuel</Text>
          <Text style={styles.stateText}>
            Humeur: {moodData.mood} | Énergie: {Math.round(moodData.energy * 100)}% | 
            Stress: {Math.round(moodData.stress * 100)}%
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  profileIndicator: {
    margin: 16,
  },
  inputSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginVertical: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  analyzeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  analyzeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  examplesSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginVertical: 4,
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  exampleButton: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
    minWidth: 120,
  },
  exampleButtonText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  resultContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginVertical: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 40,
    textAlign: 'right',
  },
  emotionsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emotionBarContainer: {
    marginBottom: 8,
  },
  emotionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  emotionIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  emotionName: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  emotionValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  emotionBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  emotionBarFill: {
    height: '100%',
  },
  sentimentSection: {
    marginBottom: 16,
  },
  sentimentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sentimentText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sentimentScore: {
    fontSize: 14,
    color: '#666',
  },
  recommendationsSection: {
    marginBottom: 16,
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  warningsContainer: {
    marginTop: 8,
  },
  warningsSection: {
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginBottom: 2,
  },
  metadataSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  metadataText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  currentStateContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginVertical: 8,
  },
  stateText: {
    fontSize: 14,
    color: '#666',
  },
});

export default EmotionDemo;