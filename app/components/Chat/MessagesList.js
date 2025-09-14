// components/Chat/MessagesList.js - Liste des messages (version démo)

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

const MessagesList = ({ messages }) => {
  return (
    <ScrollView style={styles.container}>
      {messages.map((message, index) => (
        <View key={index} style={[
          styles.messageContainer,
          message.sender === 'user' ? styles.userMessage : styles.otherMessage
        ]}>
          <Text style={styles.messageText}>{message.text}</Text>
          {message.emotion && (
            <Text style={styles.emotionText}>
              Humeur: {message.emotion.dominantEmotion}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#E0E0E0',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: 'white',
  },
  emotionText: {
    fontSize: 10,
    opacity: 0.8,
    marginTop: 4,
  },
});

export default MessagesList;