// components/Chat/ConnectionStatus.js - Statut de connexion (version démo)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ConnectionStatus = ({ isConnected, connectionType, pendingMessages }) => {
  if (isConnected && pendingMessages === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {!isConnected ? 'Hors ligne' : `${pendingMessages} messages en attente`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFA500',
    padding: 8,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 12,
  },
});

export default ConnectionStatus;