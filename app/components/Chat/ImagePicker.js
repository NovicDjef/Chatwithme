// ImagePicker.js - Composant pour la sélection et envoi d'images
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePickerExpo from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const ImagePicker = ({ visible, onClose, onSendImage }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Fonction pour demander les permissions
  const requestPermissions = async () => {
    const { status } = await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission nécessaire',
        'Nous avons besoin d\'accéder à votre galerie pour envoyer des images.'
      );
      return false;
    }
    return true;
  };

  // Fonction pour demander les permissions caméra
  const requestCameraPermissions = async () => {
    const { status } = await ImagePickerExpo.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission nécessaire',
        'Nous avons besoin d\'accéder à votre caméra pour prendre des photos.'
      );
      return false;
    }
    return true;
  };

  // Sélectionner depuis la galerie
  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePickerExpo.launchImageLibraryAsync({
        mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        onSendImage({
          uri: image.uri,
          type: 'image',
          width: image.width,
          height: image.height,
          fileSize: image.fileSize || 0,
        });
        onClose();
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    } finally {
      setIsLoading(false);
    }
  };

  // Prendre une photo
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePickerExpo.launchCameraAsync({
        mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        onSendImage({
          uri: image.uri,
          type: 'image',
          width: image.width,
          height: image.height,
          fileSize: image.fileSize || 0,
        });
        onClose();
      }
    } catch (error) {
      console.error('Erreur prise photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Envoyer une image</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[styles.option, isLoading && styles.optionDisabled]}
              onPress={takePhoto}
              disabled={isLoading}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="camera" size={32} color="#4f46e5" />
              </View>
              <Text style={styles.optionText}>Prendre une photo</Text>
              <Text style={styles.optionSubtext}>Utiliser l'appareil photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, isLoading && styles.optionDisabled]}
              onPress={pickImageFromGallery}
              disabled={isLoading}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="images" size={32} color="#059669" />
              </View>
              <Text style={styles.optionText}>Choisir depuis la galerie</Text>
              <Text style={styles.optionSubtext}>Sélectionner une image existante</Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Traitement en cours...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  optionsContainer: {
    paddingHorizontal: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  optionSubtext: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    paddingTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});

export default ImagePicker;