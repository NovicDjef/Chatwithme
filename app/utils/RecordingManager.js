// RecordingManager.js - Gestionnaire singleton pour les enregistrements
import { Audio } from 'expo-av';

class RecordingManager {
  constructor() {
    this.currentRecording = null;
    this.isRecording = false;
  }

  async startRecording() {
    try {
      // Forcer l'arrêt de tout enregistrement existant
      await this.forceStopAll();

      // Configurer le mode audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('RecordingManager: Creating new recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.currentRecording = recording;
      this.isRecording = true;

      console.log('RecordingManager: Recording started successfully');
      return recording;
    } catch (error) {
      console.error('RecordingManager: Failed to start recording', error);
      await this.cleanup();
      throw error;
    }
  }

  async stopRecording() {
    try {
      if (!this.currentRecording || !this.isRecording) {
        console.log('RecordingManager: No active recording to stop');
        return null;
      }

      console.log('RecordingManager: Stopping recording...');

      // Obtenir l'URI avant d'arrêter
      const uri = this.currentRecording.getURI();

      // Arrêter l'enregistrement
      await this.currentRecording.stopAndUnloadAsync();

      // Réinitialiser le mode audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const result = { audioUri: uri };

      // Nettoyer
      this.currentRecording = null;
      this.isRecording = false;

      console.log('RecordingManager: Recording stopped successfully');
      return result;
    } catch (error) {
      console.error('RecordingManager: Error stopping recording', error);
      await this.cleanup();
      return null;
    }
  }

  async cancelRecording() {
    try {
      console.log('RecordingManager: Canceling recording...');
      await this.forceStopAll();
      console.log('RecordingManager: Recording canceled successfully');
    } catch (error) {
      console.error('RecordingManager: Error canceling recording', error);
    }
  }

  async forceStopAll() {
    try {
      if (this.currentRecording) {
        console.log('RecordingManager: Force stopping existing recording...');
        try {
          await this.currentRecording.stopAndUnloadAsync();
        } catch (stopError) {
          console.log('RecordingManager: Error during force stop (expected):', stopError.message);
        }
      }
    } catch (error) {
      console.log('RecordingManager: Error during force stop:', error.message);
    } finally {
      // Toujours nettoyer l'état
      this.currentRecording = null;
      this.isRecording = false;

      // Réinitialiser le mode audio
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch (audioError) {
        console.log('RecordingManager: Error resetting audio mode:', audioError.message);
      }
    }
  }

  async cleanup() {
    await this.forceStopAll();
  }

  getStatus() {
    return {
      isRecording: this.isRecording,
      hasRecording: !!this.currentRecording
    };
  }
}

// Singleton instance
const recordingManager = new RecordingManager();

export default recordingManager;