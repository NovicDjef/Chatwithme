// hooks/chat/useMessageQueue.js - Hook pour gérer la queue de messages

import { useState, useCallback } from 'react';

export const useMessageQueue = () => {
  const [pendingMessages] = useState([]);
  
  const queueMessage = useCallback((message) => {
    console.log('Message mis en queue:', message);
    // Implémentation basique pour la démo
  }, []);

  const sendQueuedMessages = useCallback(async () => {
    console.log('Envoi des messages en queue');
    // Implémentation basique pour la démo
  }, []);

  return {
    queueMessage,
    sendQueuedMessages,
    pendingCount: pendingMessages.length
  };
};