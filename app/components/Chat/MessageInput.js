// components/Chat/MessageInput.js - Zone de saisie des messages (version démo)

import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

const MessageInput = ({ onSendMessage, isDisabled, interactionRecommendations }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !isDisabled) {
      onSendMessage({ text: text.trim(), type: 'text' });
      setText('');
    }
  };

  return (
    <View style={styles.container}>
      {interactionRecommendations && interactionRecommendations.warnings.length > 0 && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            {interactionRecommendations.warnings[0]}
          </Text>
        </View>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Tapez votre message..."
          multiline
          editable={!isDisabled}
        />
        <TouchableOpacity 
          style={[styles.sendButton, isDisabled && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isDisabled || !text.trim()}
        >
          <Text style={styles.sendButtonText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    padding: 8,
  },
  warningText: {
    color: '#856404',
    fontSize: 12,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default MessageInput;