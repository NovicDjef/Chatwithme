// app/store/services/socket.js - Service WebSocket pour le temps réel
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
  }

  // Connexion au serveur WebSocket
  async connect() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found, cannot connect to socket');
        return false;
      }

      console.log('Connecting to WebSocket server...');

      this.socket = io('http://192.168.1.86:3001', {
        auth: {
          token: token
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventListeners();
      return true;
    } catch (error) {
      console.error('Socket connection error:', error);
      return false;
    }
  }

  // Configuration des listeners d'événements
  setupEventListeners() {
    if (!this.socket) return;

    // Connexion réussie
    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection_status', { connected: true });
    });

    // Déconnexion
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
      this.isConnected = false;
      this.emit('connection_status', { connected: false, reason });
    });

    // Erreurs de connexion
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      this.emit('connection_error', { error, attempts: this.reconnectAttempts });
    });

    // === ÉVÉNEMENTS DE CHAT ===

    // Nouveau message 1-to-1
    this.socket.on('new_message', (message) => {
      console.log('📨 New message received:', message);
      this.emit('new_message', message);
    });

    // Nouveau message de groupe
    this.socket.on('new_group_message', (message) => {
      console.log('📨 New group message received:', message);
      this.emit('new_group_message', message);
    });

    // === STATUTS UTILISATEURS ===

    // Utilisateur en ligne
    this.socket.on('user_online', (user) => {
      console.log(`🟢 ${user.username} is online`);
      this.emit('user_online', user);
    });

    // Utilisateur hors ligne
    this.socket.on('user_offline', (user) => {
      console.log(`🔴 ${user.username} is offline`);
      this.emit('user_offline', user);
    });

    // === INDICATEURS DE FRAPPE ===

    // Utilisateur en train de taper
    this.socket.on('user_typing', (data) => {
      console.log(`✏️ ${data.username} is typing...`);
      this.emit('user_typing', data);
    });

    // Utilisateur arrête de taper
    this.socket.on('user_stop_typing', (data) => {
      console.log(`⏹️ ${data.userId} stopped typing`);
      this.emit('user_stop_typing', data);
    });

    // === MESSAGES LUS ===

    // Messages marqués comme lus
    this.socket.on('messages_read', (data) => {
      console.log('✅ Messages marked as read:', data);
      this.emit('messages_read', data);
    });
  }

  // Déconnexion
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting from WebSocket server...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // === MÉTHODES D'ENVOI ===

  // Rejoindre une conversation
  joinConversation(conversationId) {
    if (!this.isConnected) return;
    console.log('Joining conversation:', conversationId);
    this.socket.emit('join_conversation', { conversationId });
  }

  // Rejoindre un groupe
  joinGroup(groupId) {
    if (!this.isConnected) return;
    console.log('Joining group:', groupId);
    this.socket.emit('join_group', { groupId });
  }

  // Envoyer message texte
  sendMessage(data) {
    if (!this.isConnected) return;
    console.log('Sending message:', data);
    this.socket.emit('send_message', data);
  }

  // Envoyer message de groupe
  sendGroupMessage(data) {
    if (!this.isConnected) return;
    console.log('Sending group message:', data);
    this.socket.emit('send_group_message', data);
  }

  // Commencer à taper
  startTyping(data) {
    if (!this.isConnected) return;
    this.socket.emit('typing_start', data);
  }

  // Arrêter de taper
  stopTyping(data) {
    if (!this.isConnected) return;
    this.socket.emit('typing_stop', data);
  }

  // Marquer messages comme lus
  markMessagesRead(data) {
    if (!this.isConnected) return;
    console.log('Marking messages as read:', data);
    this.socket.emit('mark_messages_read', data);
  }

  // === SYSTÈME D'ÉVÉNEMENTS ===

  // Ajouter un listener
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Supprimer un listener
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Émettre un événement aux listeners locaux
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in socket listener:', error);
        }
      });
    }
  }

  // Vérifier l'état de connexion
  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  // Reconnecter manuellement
  async reconnect() {
    if (this.socket) {
      this.disconnect();
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await this.connect();
  }
}

// Instance singleton
export const socketService = new SocketService();

// Helpers pour usage direct
export const connectSocket = () => socketService.connect();
export const disconnectSocket = () => socketService.disconnect();
export const isSocketConnected = () => socketService.isSocketConnected();

// Helpers pour les messages
export const joinConversation = (conversationId) => socketService.joinConversation(conversationId);
export const joinGroup = (groupId) => socketService.joinGroup(groupId);
export const sendSocketMessage = (data) => socketService.sendMessage(data);
export const sendGroupSocketMessage = (data) => socketService.sendGroupMessage(data);

// Helpers pour la frappe
export const startTyping = (data) => socketService.startTyping(data);
export const stopTyping = (data) => socketService.stopTyping(data);

// Helpers pour marquer comme lu
export const markMessagesRead = (data) => socketService.markMessagesRead(data);

export default socketService;