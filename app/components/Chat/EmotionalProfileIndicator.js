// components/Chat/EmotionalProfileIndicator.js - Indicateur de profil émotionnel

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';

import { EMOTION_COLORS, EMOTION_ICONS } from '../../types/emotion.types.js';
import { emotionalProfileService } from '../../services/emotion/emotionalProfileService.js';

const { width } = Dimensions.get('window');

const EmotionalProfileIndicator = ({
  userId,
  recipientId,
  style,
  onProfilePress,
  showCompatibility = true,
  compact = false
}) => {
  const [profile, setProfile] = useState(null);
  const [currentState, setCurrentState] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadEmotionalData();
    startPulseAnimation();

    const interval = setInterval(loadEmotionalData, 2 * 60 * 1000); // 2 minutes
    return () => clearInterval(interval);
  }, [userId, recipientId]);

  const loadEmotionalData = async () => {
    try {
      setIsLoading(true);

      // Chargement du profil utilisateur
      const userProfile = await emotionalProfileService.getEmotionalProfile(userId);
      setProfile(userProfile);

      // Chargement de l'état émotionnel actuel
      const currentState = await emotionalProfileService.getEmotionalState(recipientId);
      setCurrentState(currentState);

      // Calcul de compatibilité si demandé
      if (showCompatibility && recipientId) {
        const compatibilityScore = await emotionalProfileService.calculateEmotionalCompatibility(
          userId, 
          recipientId
        );
        setCompatibility(compatibilityScore);
      }

    } catch (error) {
      console.error('Erreur chargement données émotionnelles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const getDominantEmotion = () => {
    if (!currentState?.currentEmotions) return null;
    
    const emotions = currentState.currentEmotions;
    return Object.keys(emotions).reduce((a, b) => 
      emotions[a] > emotions[b] ? a : b
    );
  };

  const getCompatibilityColor = (score) => {
    if (score >= 0.8) return '#4CAF50'; // Vert
    if (score >= 0.6) return '#FF9800'; // Orange
    if (score >= 0.4) return '#FFC107'; // Jaune
    return '#F44336'; // Rouge
  };

  const getCompatibilityText = (score) => {
    if (score >= 0.8) return 'Excellente';
    if (score >= 0.6) return 'Bonne';
    if (score >= 0.4) return 'Moyenne';
    return 'Faible';
  };

  const getMoodRecommendation = () => {
    if (!currentState) return null;
    
    if (currentState.availability === 'do_not_disturb') {
      return { 
        text: '🔕 Ne pas déranger', 
        color: '#F44336',
        recommendation: 'Attendez un meilleur moment'
      };
    }
    
    if (currentState.stress > 0.7) {
      return { 
        text: '😤 Stressé(e)', 
        color: '#FF5722',
        recommendation: 'Soyez patient et compréhensif'
      };
    }
    
    if (currentState.energy < 0.3) {
      return { 
        text: '😴 Fatigué(e)', 
        color: '#607D8B',
        recommendation: 'Gardez vos messages courts'
      };
    }
    
    if (currentState.mood === 'happy') {
      return { 
        text: '😊 De bonne humeur', 
        color: '#4CAF50',
        recommendation: 'Excellent moment pour discuter'
      };
    }
    
    return { 
      text: '😐 Humeur neutre', 
      color: '#9E9E9E',
      recommendation: 'Communication normale'
    };
  };

  const renderCompactView = () => {
    const dominantEmotion = getDominantEmotion();
    const mood = getMoodRecommendation();
    
    return (
      <TouchableOpacity 
        style={[styles.compactContainer, style]}
        onPress={onProfilePress}
      >
        <Animated.View 
          style={[
            styles.emotionIndicator,
            { 
              backgroundColor: dominantEmotion ? EMOTION_COLORS[dominantEmotion] : '#9E9E9E',
              transform: [{ scale: pulseAnim }]
            }
          ]}
        >
          <Text style={styles.emotionIcon}>
            {dominantEmotion ? EMOTION_ICONS[dominantEmotion] : '😐'}
          </Text>
        </Animated.View>
        
        {showCompatibility && compatibility && (
          <View style={[
            styles.compatibilityBadge,
            { backgroundColor: getCompatibilityColor(compatibility.overallScore) }
          ]}>
            <Text style={styles.compatibilityText}>
              {Math.round(compatibility.overallScore * 100)}%
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFullView = () => {
    const mood = getMoodRecommendation();
    
    return (
      <TouchableOpacity 
        style={[styles.fullContainer, style]}
        onPress={onProfilePress}
      >
        {/* Header avec état principal */}
        <View style={styles.header}>
          <View style={styles.moodIndicator}>
            <Text style={styles.moodText}>{mood?.text || '😐 Neutre'}</Text>
            <Text style={styles.recommendationText}>{mood?.recommendation}</Text>
          </View>
          
          {currentState && (
            <View style={styles.energyIndicator}>
              <Text style={styles.energyLabel}>Énergie</Text>
              <View style={styles.energyBar}>
                <View 
                  style={[
                    styles.energyFill,
                    { 
                      width: `${currentState.energy * 100}%`,
                      backgroundColor: currentState.energy > 0.6 ? '#4CAF50' : 
                                     currentState.energy > 0.3 ? '#FF9800' : '#F44336'
                    }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>

        {/* Émotions détaillées */}
        {currentState?.currentEmotions && (
          <View style={styles.emotionsGrid}>
            {Object.entries(currentState.currentEmotions)
              .filter(([_, value]) => value > 0.1)
              .sort(([_, a], [__, b]) => b - a)
              .slice(0, 4)
              .map(([emotion, intensity]) => (
                <View key={emotion} style={styles.emotionItem}>
                  <Text style={styles.emotionItemIcon}>
                    {EMOTION_ICONS[emotion]}
                  </Text>
                  <View 
                    style={[
                      styles.emotionBar,
                      { backgroundColor: EMOTION_COLORS[emotion] + '20' }
                    ]}
                  >
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
                  <Text style={styles.emotionLabel}>
                    {Math.round(intensity * 100)}%
                  </Text>
                </View>
              ))
            }
          </View>
        )}

        {/* Compatibilité */}
        {showCompatibility && compatibility && (
          <View style={styles.compatibilitySection}>
            <Text style={styles.compatibilityTitle}>Compatibilité émotionnelle</Text>
            <View style={styles.compatibilityRow}>
              <View style={[
                styles.compatibilityScore,
                { backgroundColor: getCompatibilityColor(compatibility.overallScore) }
              ]}>
                <Text style={styles.compatibilityScoreText}>
                  {Math.round(compatibility.overallScore * 100)}%
                </Text>
                <Text style={styles.compatibilityScoreLabel}>
                  {getCompatibilityText(compatibility.overallScore)}
                </Text>
              </View>
              
              <View style={styles.compatibilityDetails}>
                <Text style={styles.compatibilityDetail}>
                  💬 Communication: {Math.round(compatibility.communicationScore * 100)}%
                </Text>
                <Text style={styles.compatibilityDetail}>
                  🤝 Empathie: {Math.round(compatibility.empathyScore * 100)}%
                </Text>
                <Text style={styles.compatibilityDetail}>
                  ⚡ Énergie: {Math.round(compatibility.energyAlignment * 100)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Timing recommandé */}
        {compatibility?.recommendedTiming && (
          <View style={styles.timingSection}>
            <Text style={styles.timingTitle}>⏰ Meilleurs moments</Text>
            <View style={styles.timingTags}>
              {compatibility.recommendedTiming.map((time, index) => (
                <View key={index} style={styles.timingTag}>
                  <Text style={styles.timingTagText}>{time}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <Text style={styles.loadingText}>Analyse en cours...</Text>
      </View>
    );
  }

  return compact ? renderCompactView() : renderFullView();
};

const styles = StyleSheet.create({
  // Vue compacte
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    position: 'relative',
  },
  emotionIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  emotionIcon: {
    fontSize: 18,
  },
  compatibilityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  compatibilityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Vue complète
  fullContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  moodIndicator: {
    flex: 1,
  },
  moodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  energyIndicator: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  energyLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  energyBar: {
    width: 60,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  energyFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Grille d'émotions
  emotionsGrid: {
    marginBottom: 16,
  },
  emotionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emotionItemIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  emotionBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  emotionBarFill: {
    height: '100%',
  },
  emotionLabel: {
    fontSize: 12,
    color: '#666',
    width: 35,
    textAlign: 'right',
  },

  // Section compatibilité
  compatibilitySection: {
    marginBottom: 12,
  },
  compatibilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  compatibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compatibilityScore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compatibilityScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  compatibilityScoreLabel: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.9,
  },
  compatibilityDetails: {
    flex: 1,
  },
  compatibilityDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },

  // Section timing
  timingSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  timingTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  timingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timingTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  timingTagText: {
    fontSize: 12,
    color: '#1976d2',
  },

  // Loading
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
});

export default EmotionalProfileIndicator;