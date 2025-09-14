// hooks/common/useNetworkStatus.js - Hook pour surveiller l'état du réseau

import { useState, useEffect } from 'react';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState('wifi');

  useEffect(() => {
    // Implémentation basique pour la démo
    // En production, utiliser @react-native-community/netinfo
    console.log('Surveillance réseau initialisée');
  }, []);

  return {
    isConnected,
    connectionType
  };
};