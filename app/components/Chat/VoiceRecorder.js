// VoiceRecorder.js - Composant d'enregistrement vocal
import React, { useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useVoiceRecording } from '../../hooks/audio/useVoiceRecording';
import SoundWaveAnimation from './SoundWaveAnimation';

const VoiceRecorder = ({
  onSendVoiceNote,
  onCancel,
  language = 'fr',
  style
}) => {
  const {
    isRecording,
    isTranscribing,
    transcription,
    startRecording,
    stopRecording,
    cancelRecording,
    transcribeAudio,
    hasAudioPermission,
    requestAudioPermission,
  } = useVoiceRecording();

  const [recordingTime, setRecordingTime] = useState(0);
  const [pulseAnimation] = useState(new Animated.Value(1));

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

  // Animation de pulsation pendant l'enregistrement
  useEffect(() => {
    if (isRecording) {
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
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isRecording]);

  // D�marrer l'enregistrement
  const handleStartRecording = async () => {
    if (!hasAudioPermission) {
      await requestAudioPermission();
      return;
    }
    await startRecording();
  };

  // Arr�ter et traiter l'enregistrement
  const handleStopRecording = async () => {
    try {
      const result = await stopRecording();

      if (result?.audioUri) {
        // Transcription de l'audio avec la durée réelle
        const transcribedText = await transcribeAudio(result.audioUri, language, recordingTime);

        // Envoyer le message vocal avec transcription
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
  };

  // Annuler l'enregistrement
  const handleCancel = async () => {
    await cancelRecording();
    if (onCancel) {
      onCancel();
    }
  };

  // Formater le temps d'enregistrement
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isTranscribing) {
    return (
      <View style={[styles.container, styles.transcribingContainer, style]}>
        <View style={styles.transcribingContent}>
          <Text style={styles.transcribingEmoji}>�</Text>
          <View style={styles.transcribingTextContainer}>
            <Text style={styles.transcribingTitle}>Transcription en cours...</Text>
            <Text style={styles.transcribingSubtitle}>
              Conversion de la voix en texte
            </Text>
          </View>
          <View style={styles.loadingDots}>
            <Animated.View style={[styles.dot, { opacity: pulseAnimation }]} />
            <Animated.View style={[styles.dot, { opacity: pulseAnimation }]} />
            <Animated.View style={[styles.dot, { opacity: pulseAnimation }]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {!isRecording ? (
        // �tat initial - Bouton pour d�marrer l'enregistrement
        <TouchableOpacity
          style={styles.startRecordButton}
          onPress={handleStartRecording}
          activeOpacity={0.8}
        >
          <Text style={styles.microphoneIcon}>�</Text>
          <Text style={styles.startRecordText}>
            Appuyer pour enregistrer
          </Text>
        </TouchableOpacity>
      ) : (
        // �tat d'enregistrement actif
        <View style={styles.recordingContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelIcon}></Text>
          </TouchableOpacity>

          <View style={styles.recordingInfo}>
            <View style={styles.recordingIndicatorContainer}>
              <Animated.View
                style={[
                  styles.recordingIndicator,
                  { transform: [{ scale: pulseAnimation }] }
                ]}
              >
                <Text style={styles.recordingIcon}>🎤</Text>
              </Animated.View>

              {/* Animation d'onde sonore */}
              <View style={styles.waveContainer}>
                <SoundWaveAnimation
                  isRecording={isRecording}
                  barCount={7}
                  barWidth={3}
                  maxHeight={30}
                  minHeight={6}
                  color="#ef4444"
                />
              </View>
            </View>

            <View style={styles.recordingDetails}>
              <Text style={styles.recordingLabel}>
                🔴 Enregistrement en cours...
              </Text>
              <Text style={styles.recordingTime}>
                {formatTime(recordingTime)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStopRecording}
            activeOpacity={0.8}
          >
            <Text style={styles.stopIcon}></Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Affichage de la transcription en temps r�el si disponible */}
      {transcription && isRecording && (
        <View style={styles.liveTranscription}>
          <Text style={styles.liveTranscriptionLabel}>
            =� Transcription en cours:
          </Text>
          <Text style={styles.liveTranscriptionText}>
            {transcription}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // �tat initial
  startRecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
  },
  microphoneIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  startRecordText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // �tat d'enregistrement
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
  stopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    fontSize: 18,
    color: '#ffffff',
  },

  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  recordingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  recordingIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  waveContainer: {
    marginLeft: 8,
  },
  recordingIcon: {
    fontSize: 24,
  },
  recordingDetails: {
    flex: 1,
  },
  recordingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  recordingTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
    fontFamily: 'monospace',
  },

  // �tat de transcription
  transcribingContainer: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
    borderWidth: 1,
  },
  transcribingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transcribingEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  transcribingTextContainer: {
    flex: 1,
  },
  transcribingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 4,
  },
  transcribingSubtitle: {
    fontSize: 14,
    color: '#0369a1',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0ea5e9',
    marginHorizontal: 2,
  },

  // Transcription en direct
  liveTranscription: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4f46e5',
  },
  liveTranscriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  liveTranscriptionText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
});

export default VoiceRecorder;