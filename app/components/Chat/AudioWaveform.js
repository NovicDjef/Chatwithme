// AudioWaveform.js - Composant de visualisation d'onde audio pour messages vocaux
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const AudioWaveform = ({
  duration = 5,
  isPlaying = false,
  barCount = 20,
  maxHeight = 30,
  minHeight = 4,
  barWidth = 2,
  barSpacing = 1,
  color = '#8b5cf6'
}) => {
  // Créer les animations pour chaque barre
  const animations = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(minHeight))
  ).current;

  // Générer des hauteurs statiques basées sur la "durée" pour simuler l'onde
  const generateWavePattern = () => {
    const pattern = [];
    for (let i = 0; i < barCount; i++) {
      // Créer un motif d'onde basé sur sin/cos pour un aspect réaliste
      const phase = (i / barCount) * Math.PI * 4;
      const amplitude = Math.sin(phase) * 0.7 + Math.cos(phase * 0.5) * 0.3;
      const normalizedAmplitude = (amplitude + 1) / 2; // Normaliser entre 0 et 1

      // Ajouter de la variation basée sur la durée
      const durationFactor = Math.min(duration / 10, 1); // Max à 10 secondes
      const height = minHeight + (maxHeight - minHeight) * normalizedAmplitude * durationFactor;

      pattern.push(Math.max(minHeight, Math.min(maxHeight, height)));
    }
    return pattern;
  };

  const staticHeights = generateWavePattern();

  // Animation de lecture
  useEffect(() => {
    if (isPlaying) {
      // Animation de "lecture" qui traverse l'onde
      const playAnimation = () => {
        const animationPromises = animations.map((animation, index) => {
          return Animated.sequence([
            Animated.delay(index * 100), // Délai progressif
            Animated.timing(animation, {
              toValue: staticHeights[index] * 1.5,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(animation, {
              toValue: staticHeights[index],
              duration: 200,
              useNativeDriver: false,
            }),
          ]);
        });

        Animated.parallel(animationPromises).start(() => {
          // Remettre toutes les barres à leur hauteur statique
          animations.forEach((animation, index) => {
            animation.setValue(staticHeights[index]);
          });
        });
      };

      playAnimation();
    } else {
      // État statique - définir les hauteurs fixes
      animations.forEach((animation, index) => {
        animation.setValue(staticHeights[index]);
      });
    }
  }, [isPlaying, animations, staticHeights]);

  return (
    <View style={styles.container}>
      <View style={[styles.waveContainer, { height: maxHeight + 5 }]}>
        {animations.map((animation, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: animation,
                backgroundColor: color,
                marginHorizontal: barSpacing / 2,
                opacity: isPlaying ? 0.9 : 0.7,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 1,
    backgroundColor: '#8b5cf6',
  },
});

export default AudioWaveform;