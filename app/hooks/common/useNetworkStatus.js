// hooks/common/useNetworkStatus.js - Hook pour surveiller l'�tat du r�seau

import { useState, useEffect } from 'react';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState('wifi');

  useEffect(() => {
    // Impl�mentation basique pour la d�mo
    // En production, utiliser @react-native-community/netinfo
    console.log('Surveillance r�seau initialis�e');
  }, []);

  return {
    isConnected,
    connectionType
  };
};