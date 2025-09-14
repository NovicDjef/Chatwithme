// components/Chat/EmotionalProfileIndicatorSimple.js - Version simplifiée

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated
} from 'react-native';

const EmotionalProfileIndicatorSimple = ({
  userId,
  recipientId,
  style,
  onProfilePress,
  showCompatibility = true,
  compact = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Simulation de chargement
    setTimeout(() => setIsLoading(false), 1000);
    
    // Animation de pulsation
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
  }, [pulseAnim]);

  const mockCompatibility = {
    overallScore: 0.75,
    communicationScore: 0.8,
    empathyScore: 0.7,
    energyAlignment: 0.75
  };

  const getCompatibilityColor = (score) => {
    if (score >= 0.8) return '#4CAF50';
    if (score >= 0.6) return '#FF9800';
    return '#F44336';
  };

  const renderCompactView = () => (
    <TouchableOpacity 
      style={[styles.compactContainer, style]}
      onPress={onProfilePress}
    >
      <Animated.View 
        style={[
          styles.emotionIndicator,
          { 
            backgroundColor: '#FFD700',
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        <Text style={styles.emotionIcon}>:)</Text>
      </Animated.View>
      
      {showCompatibility && (
        <View style={[
          styles.compatibilityBadge,
          { backgroundColor: getCompatibilityColor(mockCompatibility.overallScore) }
        ]}>
          <Text style={styles.compatibilityText}>
            {Math.round(mockCompatibility.overallScore * 100)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFullView = () => (
    <TouchableOpacity 
      style={[styles.fullContainer, style]}
      onPress={onProfilePress}
    >
      <View style={styles.header}>
        <View style={styles.moodIndicator}>
          <Text style={styles.moodText}>😊 De bonne humeur</Text>
          <Text style={styles.recommendationText}>Excellent moment pour discuter</Text>
        </View>
        
        <View style={styles.energyIndicator}>
          <Text style={styles.energyLabel}>Énergie</Text>
          <View style={styles.energyBar}>
            <View 
              style={[
                styles.energyFill,
                { 
                  width: '75%',
                  backgroundColor: '#4CAF50'
                }
              ]} 
            />
          </View>
        </View>
      </View>

      {showCompatibility && (
        <View style={styles.compatibilitySection}>
          <Text style={styles.compatibilityTitle}>Compatibilité émotionnelle</Text>
          <View style={styles.compatibilityRow}>
            <View style={[
              styles.compatibilityScore,
              { backgroundColor: getCompatibilityColor(mockCompatibility.overallScore) }
            ]}>
              <Text style={styles.compatibilityScoreText}>
                {Math.round(mockCompatibility.overallScore * 100)}%
              </Text>
              <Text style={styles.compatibilityScoreLabel}>Bonne</Text>
            </View>
            
            <View style={styles.compatibilityDetails}>
              <Text style={styles.compatibilityDetail}>
                💬 Communication: {Math.round(mockCompatibility.communicationScore * 100)}%
              </Text>
              <Text style={styles.compatibilityDetail}>
                🤝 Empathie: {Math.round(mockCompatibility.empathyScore * 100)}%
              </Text>
              <Text style={styles.compatibilityDetail}>
                ⚡ Énergie: {Math.round(mockCompatibility.energyAlignment * 100)}%
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

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

export default EmotionalProfileIndicatorSimple;