// InlineVoiceRecorder.js - Enregistrement vocal intégré dans la zone de saisie
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useVoiceRecording } from '../../hooks/audio/useVoiceRecording';

const InlineVoiceRecorder = ({
  onSendVoiceNote,
  onCancel,
  language = 'fr',
  isRecording: isRecordingProp = false,
  onRecordingStateChange,
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
  const [showCancelButton, setShowCancelButton] = useState(false);

  // Animations pour les ondes
  const waveAnimations = useRef(
    Array.from({ length: 15 }, () => new Animated.Value(4))
  ).current;

  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;

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
      setShowCancelButton(true);

      // Animation de pulsation
      const pulseLoop = () => {
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
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
        const animations = waveAnimations.map((animation, index) => {
          const delay = index * 100;
          const maxHeight = 25 + Math.sin(index * 0.8) * 10;

          return Animated.loop(
            Animated.sequence([
              Animated.delay(delay),
              Animated.timing(animation, {
                toValue: maxHeight,
                duration: 400 + Math.random() * 300,
                useNativeDriver: false,
              }),
              Animated.timing(animation, {
                toValue: 4 + Math.random() * 6,
                duration: 300 + Math.random() * 200,
                useNativeDriver: false,
              }),
            ]),
            { iterations: -1 }
          );
        });

        Animated.parallel(animations).start();
      };

      // Slide animation pour montrer le bouton cancel
      Animated.spring(slideAnimation, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }).start();

      animateWaves();
    } else {
      // Arrêter les animations
      pulseAnimation.stopAnimation();
      waveAnimations.forEach(animation => {
        animation.stopAnimation();
        Animated.timing(animation, {
          toValue: 4,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });

      // Cacher le bouton cancel
      Animated.spring(slideAnimation, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }).start(() => {
        setShowCancelButton(false);
      });
    }
  }, [isRecording]);

  // Notify parent of recording state changes
  useEffect(() => {
    if (onRecordingStateChange) {
      onRecordingStateChange(isRecording);
    }
  }, [isRecording, onRecordingStateChange]);

  // Démarrer l'enregistrement
  const handleStartRecording = useCallback(async () => {
    console.log('InlineVoiceRecorder: Starting recording process...');
    console.log('Has audio permission:', hasAudioPermission);

    try {
      console.log('Calling startRecording...');
      await startRecording();
      console.log('startRecording completed');
    } catch (error) {
      console.error('Error in handleStartRecording:', error);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement');
    }
  }, [startRecording]);

  // Arrêter et envoyer
  const handleStopAndSend = useCallback(async () => {
    try {
      const result = await stopRecording();

      if (result?.audioUri) {
        // Transcription avec durée réelle
        const transcribedText = await transcribeAudio(result.audioUri, language, recordingTime);

        // Envoyer directement
        if (onSendVoiceNote) {
          onSendVoiceNote({
            type: 'voice',
            audioUri: result.audioUri,
            transcription: transcribedText,
            duration: recordingTime,
            language: language
          });
        }
      } else {
        console.error('Aucun enregistrement valide à envoyer');
        if (onCancel) {
          onCancel();
        }
      }
    } catch (error) {
      console.error('Error processing voice note:', error);
      if (onCancel) {
        onCancel();
      }
    }
  }, [stopRecording, transcribeAudio, language, recordingTime, onSendVoiceNote, onCancel]);

  // Annuler l'enregistrement
  const handleCancel = useCallback(async () => {
    await cancelRecording();
    if (onCancel) {
      onCancel();
    }
  }, [cancelRecording, onCancel]);

  // Formater le temps
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Removed transcription display during recording as requested

  if (!isRecording) {
    return (
      <TouchableOpacity
        style={styles.micButton}
        onPress={handleStartRecording}
        activeOpacity={0.8}
      >
        <MaterialIcons name="keyboard-voice" size={24} color="#8b5cf6" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.recordingContainer}>
      {/* Animation des ondes */}
      <View style={styles.waveContainer}>
        {waveAnimations.map((animation, index) => (
          <Animated.View
            key={index}
            style={[
              styles.waveBar,
              {
                height: animation,
                opacity: 0.6 + Math.sin(index * 0.5) * 0.3,
              },
            ]}
          />
        ))}
      </View>

      {/* Informations d'enregistrement */}
      <View style={styles.recordingInfo}>
        <View style={styles.recordingDot} />
        <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
      </View>

      {/* Bouton de fin d'enregistrement */}
      <TouchableOpacity
        style={styles.stopButton}
        onPress={handleStopAndSend}
        activeOpacity={0.8}
      >
        <Ionicons name="send" size={20} color="#ffffff" />
      </TouchableOpacity>

      {/* Bouton d'annulation avec animation */}
      {showCancelButton && (
        <Animated.View
          style={[
            styles.cancelButtonContainer,
            {
              transform: [{
                translateX: slideAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              }],
              opacity: slideAnimation,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={18} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },

  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#ef4444',
    flex: 1,
    marginHorizontal: 0,
  },

  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 30,
    marginRight: 12,
    flex: 1,
  },

  waveBar: {
    width: 2,
    backgroundColor: '#ef4444',
    borderRadius: 1,
    marginHorizontal: 1,
    minHeight: 4,
  },

  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },

  recordingTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    fontFamily: 'monospace',
    minWidth: 35,
  },

  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cancelButtonContainer: {
    position: 'absolute',
    right: -50,
    top: '50%',
    marginTop: -16,
  },

  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },

  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },

  transcribingIcon: {
    marginRight: 8,
  },

  transcribingText: {
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '500',
  },
});

export default InlineVoiceRecorder;