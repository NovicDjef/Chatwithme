// ChatNavigator.js - Navigateur entre la liste des chats et l'écran de chat
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import ChatListScreen from './ChatListScreen';
import BilingualChatScreen from './BilingualChatScreen';

const ChatNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState('list'); // 'list' ou 'chat'
  const [selectedChat, setSelectedChat] = useState(null);

  // Fonction pour ouvrir un chat
  const handleChatSelect = (chatData) => {
    setSelectedChat(chatData);
    setCurrentScreen('chat');
  };

  // Fonction pour revenir à la liste
  const handleBackToList = () => {
    setCurrentScreen('list');
    setSelectedChat(null);
  };

  // Mock navigation et route pour le BilingualChatScreen
  const mockNavigation = {
    navigate: () => {},
    goBack: handleBackToList,
    setOptions: () => {},
  };

  const mockRoute = {
    params: selectedChat ? {
      recipientId: selectedChat.recipientId,
      recipientName: selectedChat.recipientName,
      recipientLanguage: selectedChat.recipientLanguage,
      recipientFlag: selectedChat.recipientFlag,
      recipientAvatar: selectedChat.recipientAvatar,
    } : {
      recipientId: 'demo-user',
      recipientName: 'Demo Chat',
      recipientLanguage: 'fr',
      recipientFlag: '🇫🇷',
      recipientAvatar: '👤',
    }
  };

  return (
    <View style={styles.container}>
      {currentScreen === 'list' ? (
        <ChatListScreen onChatSelect={handleChatSelect} />
      ) : (
        <BilingualChatScreen
          route={mockRoute}
          navigation={mockNavigation}
          onBackPress={handleBackToList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ChatNavigator;