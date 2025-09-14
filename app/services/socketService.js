// services/socketService.js - Service WebSocket côté client
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageQueue = [];
    this.eventListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  // Connexion au serveur WebSocket
  async connect(userId, language = 'fr') {
    try {
      const serverUrl = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';
      
      this.socket = io(serverUrl, {
        transports: ['websocket'],
        timeout: 10000,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });

      // Gestion des événements de connexion
      this.socket.on('connect', () => {
        console.log('✅ Connecté au serveur WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Authentification automatique
        this.socket.emit('join_chat', { userId, language });
        
        // Traitement de la queue des messages en attente
        this.processMessageQueue();
      });

      this.socket.on('connection_success', (data) => {
        console.log('🎉 Authentification réussie:', data);
        this.notifyListeners('connection_success', data);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Déconnecté du serveur:', reason);
        this.isConnected = false;
        this.notifyListeners('disconnect', { reason });
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Erreur de connexion:', error);
        this.isConnected = false;
        this.handleReconnection();
        this.notifyListeners('connection_error', { error: error.message });
      });

      // Gestion des messages entrants
      this.socket.on('new_message', (message) => {
        console.log('📨 Nouveau message reçu:', message);
        this.notifyListeners('new_message', message);
      });

      this.socket.on('message_sent', (message) => {
        console.log('✅ Message envoyé confirmé:', message);
        this.notifyListeners('message_sent', message);
      });

      this.socket.on('message_error', (error) => {
        console.error('❌ Erreur message:', error);
        this.notifyListeners('message_error', error);
      });

      // Indicateur de frappe
      this.socket.on('user_typing', (data) => {
        this.notifyListeners('user_typing', data);
      });

      // Gestion des erreurs générales
      this.socket.on('error', (error) => {
        console.error('❌ Erreur socket:', error);
        this.notifyListeners('error', error);
      });

      return true;

    } catch (error) {
      console.error('❌ Erreur lors de la connexion:', error);
      this.notifyListeners('connection_error', { error: error.message });
      return false;
    }
  }

  // Envoi de message avec traduction automatique côté serveur
  async sendMessage(messageData) {
    const message = {
      content: messageData.text || messageData.content,
      toUserId: messageData.toUserId || messageData.recipientId,
      type: messageData.type || 'text',
      messageId: messageData.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (this.isConnected && this.socket) {
      try {
        this.socket.emit('send_message', message);
        console.log('📤 Message envoyé au serveur:', message);
        return true;
      } catch (error) {
        console.error('❌ Erreur envoi message:', error);
        this.queueMessage(message);
        return false;
      }
    } else {
      console.log('📦 Connexion fermée, message mis en queue');
      this.queueMessage(message);
      return false;
    }
  }

  // Gestion de l'indicateur de frappe
  startTyping(toUserId) {
    if (this.isConnected && this.socket) {
      this.socket.emit('typing_start', { toUserId });
    }
  }

  stopTyping(toUserId) {
    if (this.isConnected && this.socket) {
      this.socket.emit('typing_stop', { toUserId });
    }
  }

  // Gestion de la queue des messages hors ligne
  queueMessage(message) {
    this.messageQueue.push({
      ...message,
      queuedAt: Date.now()
    });
    
    // Sauvegarde persistante
    this.saveQueueToStorage();
  }

  async processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`📦 Traitement de ${this.messageQueue.length} messages en queue`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      try {
        await this.sendMessage(message);
        await new Promise(resolve => setTimeout(resolve, 100)); // Délai entre messages
      } catch (error) {
        console.error('❌ Erreur traitement queue:', error);
        this.queueMessage(message); // Remettre en queue si échec
      }
    }

    this.saveQueueToStorage();
  }

  // Persistance de la queue
  async saveQueueToStorage() {
    try {
      await AsyncStorage.setItem('messageQueue', JSON.stringify(this.messageQueue));
    } catch (error) {
      console.error('❌ Erreur sauvegarde queue:', error);
    }
  }

  async loadQueueFromStorage() {
    try {
      const saved = await AsyncStorage.getItem('messageQueue');
      if (saved) {
        this.messageQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('❌ Erreur chargement queue:', error);
    }
  }

  // Gestion de la reconnexion automatique
  handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms`);
      
      setTimeout(() => {
        if (!this.isConnected && this.socket) {
          this.socket.connect();
        }
      }, delay);
    }
  }

  // Système d'événements
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  removeEventListener(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  notifyListeners(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Erreur listener ${event}:`, error);
        }
      });
    }
  }

  // Déconnexion propre
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.eventListeners.clear();
  }

  // Getter pour le statut de connexion
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length
    };
  }
}

// Instance singleton
export const socketService = new SocketService();

// Hook React pour utiliser le service WebSocket
import { useCallback, useEffect, useState } from 'react';

export const useSocket = (userId, language = 'fr') => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [queuedMessages, setQueuedMessages] = useState(0);

  useEffect(() => {
    const handleConnectionSuccess = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectionError = (error) => {
      setConnectionError(error.error);
      setIsConnected(false);
    };

    // Enregistrement des listeners
    socketService.addEventListener('connection_success', handleConnectionSuccess);
    socketService.addEventListener('disconnect', handleDisconnect);
    socketService.addEventListener('connection_error', handleConnectionError);

    // Connexion initiale
    if (userId) {
      socketService.loadQueueFromStorage().then(() => {
        socketService.connect(userId, language);
      });
    }

    // Mise à jour périodique du statut
    const statusInterval = setInterval(() => {
      const status = socketService.getConnectionStatus();
      setIsConnected(status.isConnected);
      setQueuedMessages(status.queuedMessages);
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      socketService.removeEventListener('connection_success', handleConnectionSuccess);
      socketService.removeEventListener('disconnect', handleDisconnect);
      socketService.removeEventListener('connection_error', handleConnectionError);
    };
  }, [userId, language]);

  const sendMessage = useCallback(async (messageData) => {
    return await socketService.sendMessage(messageData);
  }, []);

  const startTyping = useCallback((toUserId) => {
    socketService.startTyping(toUserId);
  }, []);

  const stopTyping = useCallback((toUserId) => {
    socketService.stopTyping(toUserId);
  }, []);

  return {
    isConnected,
    connectionError,
    queuedMessages,
    sendMessage,
    startTyping,
    stopTyping,
    socketService
  };
};