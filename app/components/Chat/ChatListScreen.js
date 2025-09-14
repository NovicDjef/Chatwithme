// ChatListScreen.js - Interface style WhatsApp pour la liste des conversations
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
} from 'react-native';

// Données simulées des conversations
const MOCK_CONVERSATIONS = [
  {
    id: 1,
    userName: 'Marie Dupont',
    userLanguage: 'fr',
    userFlag: '🇫🇷',
    lastMessage: 'Salut ! Comment ça va ?',
    lastMessageTime: '10:30',
    unreadCount: 2,
    isOnline: true,
    avatar: '👩‍💼',
  },
  {
    id: 2,
    userName: 'John Smith',
    userLanguage: 'en',
    userFlag: '🇺🇸',
    lastMessage: 'Thanks for the help!',
    lastMessageTime: '09:15',
    unreadCount: 0,
    isOnline: false,
    avatar: '👨‍💻',
  },
  {
    id: 3,
    userName: 'Carlos Rodriguez',
    userLanguage: 'es',
    userFlag: '🇪🇸',
    lastMessage: '¡Hasta luego!',
    lastMessageTime: 'Hier',
    unreadCount: 1,
    isOnline: true,
    avatar: '👨‍🎨',
  },
  {
    id: 4,
    userName: 'Anna Mueller',
    userLanguage: 'de',
    userFlag: '🇩🇪',
    lastMessage: 'Guten Morgen!',
    lastMessageTime: 'Hier',
    unreadCount: 0,
    isOnline: false,
    avatar: '👩‍🔬',
  },
  {
    id: 5,
    userName: 'Liu Wei',
    userLanguage: 'zh',
    userFlag: '🇨🇳',
    lastMessage: '你好！',
    lastMessageTime: 'Sam',
    unreadCount: 3,
    isOnline: true,
    avatar: '👨‍🏫',
  },
];

// Utilisateurs disponibles pour nouvelles conversations
const AVAILABLE_USERS = [
  { id: 6, name: 'Sophie Martin', language: 'fr', flag: '🇫🇷', avatar: '👩‍🎤', isOnline: true },
  { id: 7, name: 'David Brown', language: 'en', flag: '🇺🇸', avatar: '👨‍⚕️', isOnline: false },
  { id: 8, name: 'Paolo Rossi', language: 'it', flag: '🇮🇹', avatar: '👨‍🍳', isOnline: true },
  { id: 9, name: 'Yuki Tanaka', language: 'ja', flag: '🇯🇵', avatar: '👩‍💼', isOnline: true },
  { id: 10, name: 'Ahmed Hassan', language: 'ar', flag: '🇸🇦', avatar: '👨‍🎓', isOnline: false },
];

const ChatListScreen = ({ onChatSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);

  // Filtrer les conversations selon la recherche
  const filteredConversations = conversations.filter(conv =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Démarrer une nouvelle conversation
  const startNewChat = useCallback((user) => {
    const newConversation = {
      id: Date.now(),
      userName: user.name,
      userLanguage: user.language,
      userFlag: user.flag,
      lastMessage: '',
      lastMessageTime: 'Maintenant',
      unreadCount: 0,
      isOnline: user.isOnline,
      avatar: user.avatar,
    };

    setConversations(prev => [newConversation, ...prev]);
    setShowNewChatModal(false);
    onChatSelect({
      recipientId: user.id.toString(),
      recipientName: user.name,
      recipientLanguage: user.language,
      recipientFlag: user.flag,
      recipientAvatar: user.avatar,
    });
  }, [onChatSelect]);

  // Composant pour un élément de conversation
  const ConversationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => onChatSelect({
        recipientId: item.id.toString(),
        recipientName: item.userName,
        recipientLanguage: item.userLanguage,
        recipientFlag: item.userFlag,
        recipientAvatar: item.avatar,
      })}
      activeOpacity={0.8}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatar}>{item.avatar}</Text>
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.userName}>
            {item.userName} {item.userFlag}
          </Text>
          <Text style={styles.lastMessageTime}>{item.lastMessageTime}</Text>
        </View>

        <View style={styles.conversationFooter}>
          <Text style={[
            styles.lastMessage,
            item.unreadCount > 0 && styles.unreadMessage
          ]} numberOfLines={1}>
            {item.lastMessage || 'Aucun message'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Composant pour un utilisateur disponible
  const AvailableUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.availableUserItem}
      onPress={() => startNewChat(item)}
      activeOpacity={0.8}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatar}>{item.avatar}</Text>
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.name} {item.flag}
        </Text>
        <Text style={styles.userStatus}>
          {item.isOnline ? '🟢 En ligne' : '⚫ Hors ligne'}
        </Text>
      </View>

      <TouchableOpacity style={styles.startChatButton}>
        <Text style={styles.startChatText}>💬</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Conversations</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => setShowNewChatModal(true)}
        >
          <Text style={styles.newChatIcon}>✏️</Text>
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher une conversation..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Liste des conversations */}
      {filteredConversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>💭</Text>
          <Text style={styles.emptyStateTitle}>Aucune conversation</Text>
          <Text style={styles.emptyStateSubtext}>
            {searchQuery ? 'Aucun résultat pour votre recherche' : 'Commencez une nouvelle conversation !'}
          </Text>
          <TouchableOpacity
            style={styles.startNewChatButton}
            onPress={() => setShowNewChatModal(true)}
          >
            <Text style={styles.startNewChatText}>✏️ Nouvelle conversation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ConversationItem item={item} />}
          style={styles.conversationsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal pour nouvelle conversation */}
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowNewChatModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nouvelle Conversation</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <Text style={styles.modalSubtitle}>
            👥 Choisissez un utilisateur pour démarrer une conversation multilingue
          </Text>

          <FlatList
            data={AVAILABLE_USERS}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <AvailableUserItem item={item} />}
            style={styles.availableUsersList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.5,
  },
  newChatButton: {
    backgroundColor: '#4f46e5',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  newChatIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    fontSize: 50,
    width: 60,
    height: 60,
    textAlign: 'center',
    lineHeight: 60,
    backgroundColor: '#f3f4f6',
    borderRadius: 30,
    overflow: 'hidden',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    backgroundColor: '#10b981',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.3,
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#374151',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  startNewChatButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#4f46e5',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  startNewChatText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalPlaceholder: {
    width: 36,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  availableUsersList: {
    flex: 1,
  },
  availableUserItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userStatus: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  startChatButton: {
    backgroundColor: '#10b981',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startChatText: {
    fontSize: 18,
  },
});

export default ChatListScreen;