// components/Chat/ChatHeader.js - En-tête du chat (version démo)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ChatHeader = ({ recipientName, connectionStatus }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{recipientName}</Text>
      <Text style={styles.status}>{connectionStatus}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  status: {
    fontSize: 12,
    color: '#E0E0E0',
  },
});

export default ChatHeader;