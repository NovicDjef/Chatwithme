// MessageBubble.js - Composant pour afficher les messages dans le chat
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const MessageBubble = ({ message, isOwn, currentUser }) => {
  if (!message) {
    return null;
  }

  // Formater l'heure
  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  // Gérer les différents types de messages
  const renderMessageContent = () => {
    switch (message.messageType) {
      case 'TEXT':
        return (
          <Text style={[
            styles.messageText,
            isOwn ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.content}
          </Text>
        );

      case 'IMAGE':
        return (
          <View>
            {message.mediaUrl && (
              <Image
                source={{ uri: message.mediaUrl }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            )}
            {message.content && (
              <Text style={[
                styles.messageText,
                isOwn ? styles.ownMessageText : styles.otherMessageText
              ]}>
                {message.content}
              </Text>
            )}
          </View>
        );

      case 'VOICE':
        return (
          <View style={styles.voiceMessage}>
            <TouchableOpacity style={styles.playButton}>
              <Ionicons
                name="play"
                size={16}
                color={isOwn ? '#ffffff' : '#8b5cf6'}
              />
            </TouchableOpacity>
            <View style={styles.voiceWaveform}>
              {[...Array(8)].map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.waveBar,
                    {
                      height: 4 + Math.random() * 12,
                      backgroundColor: isOwn ? '#ffffff80' : '#8b5cf680'
                    }
                  ]}
                />
              ))}
            </View>
            <Text style={[
              styles.voiceDuration,
              isOwn ? styles.ownMessageText : styles.otherMessageText
            ]}>
              {message.duration ? `${message.duration}s` : '0:00'}
            </Text>
            {message.content && (
              <Text style={[
                styles.transcriptionText,
                isOwn ? styles.ownMessageText : styles.otherMessageText
              ]}>
                "{message.content}"
              </Text>
            )}
          </View>
        );

      case 'FILE':
        return (
          <View style={styles.fileMessage}>
            <MaterialIcons
              name="insert-drive-file"
              size={20}
              color={isOwn ? '#ffffff' : '#8b5cf6'}
            />
            <Text style={[
              styles.fileName,
              isOwn ? styles.ownMessageText : styles.otherMessageText
            ]}>
              {message.mediaName || 'Fichier'}
            </Text>
          </View>
        );

      default:
        return (
          <Text style={[
            styles.messageText,
            isOwn ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.content || 'Message'}
          </Text>
        );
    }
  };

  return (
    <View style={[
      styles.messageContainer,
      isOwn ? styles.ownMessageContainer : styles.otherMessageContainer
    ]}>
      {/* Avatar pour les autres utilisateurs */}
      {!isOwn && (
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {message.sender?.firstName?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        </View>
      )}

      <View style={[
        styles.messageBubble,
        isOwn ? styles.ownMessageBubble : styles.otherMessageBubble
      ]}>
        {/* Nom de l'expéditeur pour les autres utilisateurs */}
        {!isOwn && (
          <Text style={styles.senderName}>
            {message.sender?.firstName} {message.sender?.lastName}
          </Text>
        )}

        {/* Contenu du message */}
        {renderMessageContent()}

        {/* Heure et statut */}
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            isOwn ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {formatTime(message.createdAt)}
          </Text>

          {isOwn && (
            <View style={styles.messageStatus}>
              {message.isRead ? (
                <Ionicons name="checkmark-done" size={14} color="#ffffff80" />
              ) : (
                <Ionicons name="checkmark" size={14} color="#ffffff80" />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  ownMessageBubble: {
    backgroundColor: '#8b5cf6',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#1f2937',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 150,
  },
  playButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  voiceWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 16,
    flex: 1,
    marginRight: 8,
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
    marginHorizontal: 1,
    minHeight: 4,
  },
  voiceDuration: {
    fontSize: 12,
    minWidth: 30,
  },
  transcriptionText: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.8,
    marginTop: 4,
  },
  fileMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileName: {
    marginLeft: 8,
    fontSize: 14,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: '#ffffff80',
  },
  otherMessageTime: {
    color: '#6b7280',
  },
  messageStatus: {
    marginLeft: 4,
  },
});

export default MessageBubble;