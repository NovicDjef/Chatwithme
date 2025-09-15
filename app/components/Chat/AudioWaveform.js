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
      // Créer plusieurs couches d'ondes pour plus de complexité
      const phase1 = (i / barCount) * Math.PI * 6;  // Onde principale
      const phase2 = (i / barCount) * Math.PI * 2.3; // Onde secondaire
      const phase3 = (i / barCount) * Math.PI * 12;  // Détails fins

      // Combiner plusieurs sinusoïdes
      const wave1 = Math.sin(phase1) * 0.5;
      const wave2 = Math.sin(phase2) * 0.3;
      const wave3 = Math.sin(phase3) * 0.2;
      const noise = (Math.random() - 0.5) * 0.1; // Bruit léger

      const combinedWave = wave1 + wave2 + wave3 + noise;
      const normalizedAmplitude = (combinedWave + 1) / 2; // Normaliser entre 0 et 1

      // Facteur basé sur la durée avec courbe non-linéaire
      const durationFactor = Math.pow(Math.min(duration / 15, 1), 0.7);

      // Variation d'intensité selon la position (plus fort au centre)
      const positionFactor = 1 - Math.pow(Math.abs((i - barCount/2) / (barCount/2)), 2) * 0.3;

      const height = minHeight + (maxHeight - minHeight) * normalizedAmplitude * durationFactor * positionFactor;

      pattern.push(Math.max(minHeight, Math.min(maxHeight, height)));
    }
    return pattern;
  };

  const staticHeights = generateWavePattern();

  // Animation de lecture
  useEffect(() => {
    if (isPlaying) {
      // Animation de "lecture" qui traverse l'onde avec effet de vague
      const playAnimation = () => {
        const animationPromises = animations.map((animation, index) => {
          const delay = index * 80; // Délai pour effet de vague
          const intensityMultiplier = 1.3 + Math.sin(index * 0.5) * 0.4; // Variation d'intensité

          return Animated.sequence([
            Animated.delay(delay),
            // Montée plus douce
            Animated.timing(animation, {
              toValue: staticHeights[index] * intensityMultiplier,
              duration: 150,
              useNativeDriver: false,
            }),
            // Maintien court
            Animated.delay(50),
            // Descente avec rebond
            Animated.spring(animation, {
              toValue: staticHeights[index],
              tension: 100,
              friction: 8,
              useNativeDriver: false,
            }),
          ]);
        });

        Animated.stagger(30, animationPromises).start(() => {
          // Animation continue pendant la lecture
          if (isPlaying) {
            setTimeout(playAnimation, 500);
          }
        });
      };

      playAnimation();
    } else {
      // État statique - définir les hauteurs fixes avec transition douce
      animations.forEach((animation, index) => {
        Animated.spring(animation, {
          toValue: staticHeights[index],
          tension: 120,
          friction: 8,
          useNativeDriver: false,
        }).start();
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
    borderRadius: 2,
    backgroundColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default AudioWaveform;