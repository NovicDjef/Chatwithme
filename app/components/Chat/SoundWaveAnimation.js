// SoundWaveAnimation.js - Composant d'animation d'onde sonore
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const SoundWaveAnimation = ({
  isRecording,
  barCount = 5,
  barWidth = 4,
  maxHeight = 40,
  minHeight = 8,
  color = '#8b5cf6'
}) => {
  // Créer des animations pour chaque barre
  const animations = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(minHeight))
  ).current;

  useEffect(() => {
    let animationLoop;

    if (isRecording) {
      // Fonction pour créer l'animation d'une barre
      const animateBar = (animation, delay = 0) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animation, {
              toValue: maxHeight,
              duration: 300 + Math.random() * 400, // Durée variable pour plus de réalisme
              useNativeDriver: false,
            }),
            Animated.timing(animation, {
              toValue: minHeight + Math.random() * (maxHeight - minHeight) * 0.3,
              duration: 200 + Math.random() * 300,
              useNativeDriver: false,
            }),
            Animated.timing(animation, {
              toValue: maxHeight * 0.7 + Math.random() * (maxHeight * 0.3),
              duration: 250 + Math.random() * 350,
              useNativeDriver: false,
            }),
            Animated.timing(animation, {
              toValue: minHeight,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ]),
          { iterations: -1 }
        );
      };

      // Démarrer l'animation de chaque barre avec un délai différent
      const animationPromises = animations.map((animation, index) => {
        const delay = index * 100; // Délai progressif pour un effet de vague
        return animateBar(animation, delay);
      });

      animationLoop = Animated.stagger(50, animationPromises);
      animationLoop.start();
    } else {
      // Arrêter toutes les animations et revenir à la hauteur minimale
      animations.forEach(animation => {
        animation.stopAnimation();
        Animated.timing(animation, {
          toValue: minHeight,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      if (animationLoop) {
        animations.forEach(animation => animation.stopAnimation());
      }
    };
  }, [isRecording, animations, maxHeight, minHeight]);

  // Générer des hauteurs variables pour plus de réalisme même à l'arrêt
  const generateStaticHeights = () => {
    return animations.map((_, index) => {
      const baseHeight = minHeight + (index % 2 === 0 ? 2 : 0);
      return baseHeight;
    });
  };

  const staticHeights = generateStaticHeights();

  return (
    <View style={[styles.container, { height: maxHeight + 10 }]}>
      <View style={styles.waveContainer}>
        {animations.map((animation, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: isRecording ? animation : staticHeights[index],
                backgroundColor: color,
                marginHorizontal: 1,
                opacity: isRecording ? 1 : 0.3,
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
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 2,
    backgroundColor: '#8b5cf6',
  },
});

export default SoundWaveAnimation;