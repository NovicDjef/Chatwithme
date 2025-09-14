// services/chat/chatService.js - Service de chat (version démo)

class ChatService {
  async connect({ userId, recipientId, onMessage, onTyping, onConnectionChange }) {
    // Simulation de connexion
    setTimeout(() => onConnectionChange('connected'), 1000);
    
    return {
      userId,
      recipientId,
      connected: true
    };
  }

  async disconnect(connection) {
    console.log('Déconnexion chat:', connection);
  }

  async loadHistory(recipientId, limit = 50) {
    // Messages de démonstration
    return [
      {
        id: 'msg_1',
        text: 'Salut ! Comment ça va ?',
        sender: 'other',
        timestamp: new Date(Date.now() - 60000),
        emotion: { dominantEmotion: 'joy', confidence: 0.8 }
      },
      {
        id: 'msg_2', 
        text: 'Ça va bien merci ! Et toi ?',
        sender: 'user',
        timestamp: new Date(Date.now() - 30000),
        emotion: { dominantEmotion: 'joy', confidence: 0.7 }
      }
    ];
  }

  async sendMessage(connection, message) {
    console.log('Envoi message:', message);
    // Simulation d'envoi
    return true;
  }
}

export const chatService = new ChatService();