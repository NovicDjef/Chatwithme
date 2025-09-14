// components/Chat/TranslationIndicator.js - Indicateur de traduction (version démo)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TranslationIndicator = ({ isActive, error }) => {
  if (!isActive && !error) return null;

  return (
    <View style={[styles.container, error && styles.errorContainer]}>
      <Text style={styles.text}>
        {error ? `Erreur traduction: ${error}` : 'Traduction en cours...'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2196F3',
    padding: 8,
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#F44336',
  },
  text: {
    color: 'white',
    fontSize: 12,
  },
});

export default TranslationIndicator;