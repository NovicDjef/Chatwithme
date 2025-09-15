// DirectVoiceRecorder.js - Enregistrement vocal direct avec animation perfectionnée
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceRecording } from '../../hooks/audio/useVoiceRecording';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DirectVoiceRecorder = ({
  onSendVoiceNote,
  onCancel,
  language = 'fr',
  isVisible,
}) => {
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    cancelRecording,
    transcribeAudio,
    hasAudioPermission,
    requestAudioPermission,
  } = useVoiceRecording();

  const [recordingTime, setRecordingTime] = useState(0);
  const [isLongPress, setIsLongPress] = useState(false);

  // Animations pour les ondes
  const waveAnimations = useRef(
    Array.from({ length: 30 }, () => ({
      height: new Animated.Value(4),
      opacity: new Animated.Value(0.3),
    }))
  ).current;

  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  // Timer pour l'enregistrement
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(time => time + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Animation des ondes pendant l'enregistrement
  useEffect(() => {
    if (isRecording) {
      // Animation de pulsation du bouton central
      const pulseLoop = () => {
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(pulseLoop);
      };
      pulseLoop();

      // Animation des ondes
      const animateWaves = () => {
        const animations = waveAnimations.map((wave, index) => {
          const delay = index * 50;
          const maxHeight = 30 + Math.sin(index * 0.5) * 20;

          return Animated.loop(
            Animated.sequence([
              Animated.delay(delay),
              Animated.parallel([
                Animated.timing(wave.height, {
                  toValue: maxHeight,
                  duration: 400 + Math.random() * 300,
                  useNativeDriver: false,
                }),
                Animated.timing(wave.opacity, {
                  toValue: 0.8 + Math.random() * 0.2,
                  duration: 300,
                  useNativeDriver: false,
                }),
              ]),
              Animated.parallel([
                Animated.timing(wave.height, {
                  toValue: 4 + Math.random() * 8,
                  duration: 300 + Math.random() * 200,
                  useNativeDriver: false,
                }),
                Animated.timing(wave.opacity, {
                  toValue: 0.3 + Math.random() * 0.3,
                  duration: 400,
                  useNativeDriver: false,
                }),
              ]),
            ]),
            { iterations: -1 }
          );
        });

        Animated.parallel(animations).start();
      };

      animateWaves();
    } else {
      // Arrêter les animations
      pulseAnimation.stopAnimation();
      waveAnimations.forEach(wave => {
        wave.height.stopAnimation();
        wave.opacity.stopAnimation();
        Animated.parallel([
          Animated.timing(wave.height, {
            toValue: 4,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(wave.opacity, {
            toValue: 0.3,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      });
    }
  }, [isRecording]);

  // Démarrer l'enregistrement
  const handleStartRecording = useCallback(async () => {
    if (!hasAudioPermission) {
      await requestAudioPermission();
      return;
    }

    Animated.spring(scaleAnimation, {
      toValue: 1.1,
      useNativeDriver: true,
    }).start();

    await startRecording();
  }, [hasAudioPermission, requestAudioPermission, startRecording, scaleAnimation]);

  // Arrêter et envoyer
  const handleStopAndSend = useCallback(async () => {
    try {
      Animated.spring(scaleAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      const result = await stopRecording();

      if (result?.audioUri) {
        // Transcription avec durée réelle
        const transcribedText = await transcribeAudio(result.audioUri, language, recordingTime);

        // Envoyer directement sans afficher de modal
        if (onSendVoiceNote) {
          onSendVoiceNote({
            type: 'voice',
            audioUri: result.audioUri,
            transcription: transcribedText,
            duration: recordingTime,
            language: language
          });
        }
      }
    } catch (error) {
      console.error('Error processing voice note:', error);
    }
  }, [stopRecording, transcribeAudio, language, recordingTime, onSendVoiceNote, scaleAnimation]);

  // Annuler l'enregistrement
  const handleCancel = useCallback(async () => {
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    await cancelRecording();
    if (onCancel) {
      onCancel();
    }
  }, [cancelRecording, onCancel, scaleAnimation]);

  // Gestion du long press pour démarrer/arrêter
  const handlePressIn = useCallback(() => {
    setIsLongPress(true);
    handleStartRecording();
  }, [handleStartRecording]);

  const handlePressOut = useCallback(() => {
    if (isLongPress && isRecording) {
      setIsLongPress(false);
      handleStopAndSend();
    }
  }, [isLongPress, isRecording, handleStopAndSend]);

  // Formater le temps
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  if (isTranscribing) {
    return (
      <View style={styles.transcribingContainer}>
        <View style={styles.transcribingContent}>
          <Animated.View style={[styles.transcribingIcon, { transform: [{ scale: pulseAnimation }] }]}>
            <Ionicons name="mic" size={24} color="#ffffff" />
          </Animated.View>
          <Text style={styles.transcribingText}>Traitement en cours...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animation des ondes de fond */}
      <View style={styles.waveBackground}>
        {waveAnimations.map((wave, index) => (
          <Animated.View
            key={index}
            style={[
              styles.waveBar,
              {
                height: wave.height,
                opacity: wave.opacity,
                marginHorizontal: 1,
              },
            ]}
          />
        ))}
      </View>

      {/* Overlay avec informations */}
      <View style={styles.overlay}>
        {/* Timer */}
        <View style={styles.timerContainer}>
          <View style={styles.recordingDot} />
          <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
        </View>

        {/* Instructions */}
        <Text style={styles.instructionText}>
          Relâchez pour envoyer • Glissez ← pour annuler
        </Text>

        {/* Bouton principal avec long press */}
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <Animated.View
            style={[
              styles.recordButton,
              {
                transform: [
                  { scale: Animated.multiply(scaleAnimation, pulseAnimation) }
                ],
              },
            ]}
          >
            <Ionicons name="mic" size={32} color="#ffffff" />
          </Animated.View>
        </TouchableOpacity>

        {/* Bouton d'annulation */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  waveBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  waveBar: {
    width: 3,
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
    minHeight: 4,
  },

  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },

  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 40,
  },

  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 10,
  },

  timerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'monospace',
  },

  instructionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 60,
    paddingHorizontal: 40,
  },

  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },

  cancelButton: {
    position: 'absolute',
    top: 60,
    right: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  transcribingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  transcribingContent: {
    alignItems: 'center',
  },

  transcribingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  transcribingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default DirectVoiceRecorder;