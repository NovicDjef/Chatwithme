// useVoiceRecording.js - Hook pour l'enregistrement vocal et la transcription
import { useCallback, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { Alert, Platform } from 'react-native';
import RecordingManager from '../../utils/RecordingManager';

export const useVoiceRecording = () => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [audioUri, setAudioUri] = useState(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  // Simuler la transcription en temps réel pendant l'enregistrement
  const transcriptionTimer = useRef(null);

  // Simuler la transcription progressive
  const simulateRealtimeTranscription = useCallback((language = 'fr') => {
    const sampleTexts = {
      fr: [
        "Bonjour",
        "Bonjour comment",
        "Bonjour comment allez",
        "Bonjour comment allez-vous",
        "Bonjour comment allez-vous aujourd'hui"
      ],
      en: [
        "Hello",
        "Hello how",
        "Hello how are",
        "Hello how are you",
        "Hello how are you today"
      ],
      es: [
        "Hola",
        "Hola cómo",
        "Hola cómo estás",
        "Hola cómo estás hoy"
      ]
    };

    const texts = sampleTexts[language] || sampleTexts.fr;
    let currentIndex = 0;

    transcriptionTimer.current = setInterval(() => {
      if (currentIndex < texts.length) {
        setTranscription(texts[currentIndex]);
        currentIndex++;
      } else {
        if (transcriptionTimer.current) {
          clearInterval(transcriptionTimer.current);
        }
      }
    }, 1500);
  }, []);

  // Démarrer l'enregistrement
  const startRecording = useCallback(async () => {
    try {
      console.log('useVoiceRecording: startRecording called');
      console.log('Permission status:', permissionResponse?.status);

      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission...');
        const result = await requestPermission();
        console.log('Permission request result:', result);

        if (!result.granted) {
          Alert.alert(
            'Permission requise',
            'L\'accès au microphone est nécessaire pour enregistrer des notes vocales.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      console.log('Starting recording using RecordingManager...');
      const newRecording = await RecordingManager.startRecording();
      console.log('RecordingManager returned:', newRecording ? 'Recording object' : 'null');

      setRecording(newRecording);
      setIsRecording(true);
      setTranscription('');

      // Simuler la transcription en temps réel
      console.log('Starting real-time transcription simulation...');
      simulateRealtimeTranscription('fr');

      console.log('useVoiceRecording: Recording started successfully');

    } catch (err) {
      console.error('useVoiceRecording: Failed to start recording', err);
      console.error('Error details:', err.message, err.code);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement: ' + err.message);
      // Reset states en cas d'erreur
      setRecording(null);
      setIsRecording(false);
    }
  }, [permissionResponse, requestPermission, simulateRealtimeTranscription]);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(async () => {
    try {
      console.log('Stopping recording using RecordingManager...');
      setIsRecording(false);

      // Arrêter le timer de transcription
      if (transcriptionTimer.current) {
        clearInterval(transcriptionTimer.current);
        transcriptionTimer.current = null;
      }

      const result = await RecordingManager.stopRecording();

      if (result?.audioUri) {
        setAudioUri(result.audioUri);
        console.log('Recording stored at', result.audioUri);
      }

      // Nettoyer l'état local
      setRecording(null);

      return {
        audioUri: result?.audioUri,
        transcription: transcription
      };
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Erreur', 'Impossible d\'arrêter l\'enregistrement');
      return null;
    }
  }, [transcription]);

  // Annuler l'enregistrement
  const cancelRecording = useCallback(async () => {
    try {
      console.log('Canceling recording using RecordingManager...');

      // Arrêter le timer de transcription
      if (transcriptionTimer.current) {
        clearInterval(transcriptionTimer.current);
        transcriptionTimer.current = null;
      }

      await RecordingManager.cancelRecording();

      // Reset tous les états locaux
      setRecording(null);
      setIsRecording(false);
      setIsTranscribing(false);
      setTranscription('');
      setAudioUri(null);
    } catch (error) {
      console.error('Failed to cancel recording', error);
      // Force le reset des états même en cas d'erreur
      setRecording(null);
      setIsRecording(false);
      setIsTranscribing(false);
      setTranscription('');
      setAudioUri(null);
    }
  }, []);

  // Lire l'enregistrement
  const playRecording = useCallback(async (uri) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();

      // Nettoyer après la lecture
      setTimeout(async () => {
        await sound.unloadAsync();
      }, 5000); // Assume max 5 secondes
    } catch (error) {
      console.error('Failed to play recording', error);
    }
  }, []);

  // Transcription manuelle avec simulation basée sur la durée d'enregistrement
  const transcribeAudio = useCallback(async (audioUri, language = 'fr', recordingDuration = 0) => {
    setIsTranscribing(true);

    try {
      // Simulation de transcription basée sur la durée
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Messages adaptés à la durée d'enregistrement
      const getTranscriptionByDuration = (duration, lang) => {
        const transcriptions = {
          fr: {
            short: [  // 0-3 secondes
              "Salut !",
              "Merci",
              "Oui",
              "Non",
              "D'accord",
              "Parfait"
            ],
            medium: [ // 3-8 secondes
              "Bonjour, comment ça va ?",
              "Merci beaucoup pour votre aide",
              "Je suis d'accord avec vous",
              "Pouvez-vous m'aider ?",
              "C'est une bonne idée"
            ],
            long: [   // 8+ secondes
              "Bonjour, j'espère que vous allez bien aujourd'hui",
              "Je voudrais vous expliquer quelque chose d'important",
              "Merci beaucoup pour tout ce que vous avez fait pour moi",
              "Pouvez-vous me dire quand nous pourrons nous rencontrer ?",
              "C'est vraiment une excellente proposition que vous me faites"
            ]
          },
          en: {
            short: [
              "Hello!",
              "Thanks",
              "Yes",
              "No",
              "Okay",
              "Perfect"
            ],
            medium: [
              "Hello, how are you?",
              "Thank you very much for your help",
              "I agree with you",
              "Can you help me?",
              "That's a good idea"
            ],
            long: [
              "Hello, I hope you're doing well today",
              "I would like to explain something important to you",
              "Thank you very much for everything you've done for me",
              "Can you tell me when we could meet?",
              "This is really an excellent proposal you're making"
            ]
          },
          es: {
            short: [
              "¡Hola!",
              "Gracias",
              "Sí",
              "No",
              "Vale",
              "Perfecto"
            ],
            medium: [
              "Hola, ¿cómo estás?",
              "Muchas gracias por tu ayuda",
              "Estoy de acuerdo contigo",
              "¿Puedes ayudarme?",
              "Es una buena idea"
            ],
            long: [
              "Hola, espero que estés bien hoy",
              "Me gustaría explicarte algo importante",
              "Muchas gracias por todo lo que has hecho por mí",
              "¿Puedes decirme cuándo podríamos encontrarnos?",
              "Esta es realmente una excelente propuesta que me haces"
            ]
          }
        };

        const langTranscriptions = transcriptions[lang] || transcriptions.fr;

        let category;
        if (duration <= 3) {
          category = langTranscriptions.short;
        } else if (duration <= 8) {
          category = langTranscriptions.medium;
        } else {
          category = langTranscriptions.long;
        }

        return category[Math.floor(Math.random() * category.length)];
      };

      const finalTranscription = getTranscriptionByDuration(recordingDuration, language);
      setTranscription(finalTranscription);

      console.log(`Audio transcrit (${recordingDuration}s): ${finalTranscription}`);
      return finalTranscription;

    } catch (error) {
      console.error('Transcription failed:', error);
      throw new Error('Échec de la transcription');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  return {
    // États
    isRecording,
    isTranscribing,
    transcription,
    audioUri,

    // Fonctions
    startRecording,
    stopRecording,
    cancelRecording,
    playRecording,
    transcribeAudio,

    // Utilitaires
    hasAudioPermission: permissionResponse?.status === 'granted',
    requestAudioPermission: requestPermission,
  };
};

export default useVoiceRecording;