// app/components/Chat/UserListScreen.js - Liste des utilisateurs pour démarrer des conversations
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Redux
import { useAppDispatch } from '../../hooks/redux/useAppDispatch';
import { useAppSelector } from '../../hooks/redux/useAppSelector';
import { selectUser, logout } from '../../store/slices/authSlice';

// API
import { userAPI } from '../../store/services/api';

// Composants
import LanguageSelector from '../Settings/LanguageSelector';

const UserListScreen = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUser);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Charger la liste des utilisateurs
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUsers();

      // Filtrer l'utilisateur actuel de la liste
      const filteredUsers = response.users?.filter(user => user.id !== currentUser?.id) || [];
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  // Rafraîchir la liste
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  // Démarrer une conversation
  const startConversation = (otherUser) => {
    router.push({
      pathname: '/fullstack-chat',
      params: {
        otherUserId: otherUser.id,
        otherUser: JSON.stringify({
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          username: otherUser.username,
          avatar: otherUser.avatar,
        })
      }
    });
  };

  // Déconnexion
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: () => dispatch(logout())
        }
      ]
    );
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Rendu d'un utilisateur
  const renderUser = ({ item: user }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => startConversation(user)}
    >
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Text style={styles.avatarText}>
              {user.firstName?.[0]?.toUpperCase()}{user.lastName?.[0]?.toUpperCase()}
            </Text>
          ) : (
            <Text style={styles.avatarText}>
              {user.firstName?.[0]?.toUpperCase()}{user.lastName?.[0]?.toUpperCase()}
            </Text>
          )}
        </View>

        <View style={styles.userDetails}>
          <Text style={styles.userName}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.userUsername}>@{user.username}</Text>
          {user.language && (
            <Text style={styles.userLanguage}>
              🌐 {user.language?.toUpperCase()}
            </Text>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Bonjour, {currentUser?.firstName} ! 👋
          </Text>
          <Text style={styles.subtitleText}>
            Choisissez avec qui discuter
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Sélecteur de langue */}
      <View style={styles.languageSection}>
        <LanguageSelector />
      </View>

      {/* Liste des utilisateurs */}
      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>Aucun utilisateur disponible</Text>
          <Text style={styles.emptySubtext}>
            Invitez vos amis à rejoindre ChatWithMe !
          </Text>

          <TouchableOpacity style={styles.refreshButton} onPress={loadUsers}>
            <Text style={styles.refreshButtonText}>Actualiser</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id.toString()}
          style={styles.usersList}
          contentContainerStyle={styles.usersListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8b5cf6']}
              tintColor="#8b5cf6"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
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
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitleText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  languageSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  usersList: {
    flex: 1,
  },
  usersListContent: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  userLanguage: {
    fontSize: 12,
    color: '#8b5cf6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 24,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default UserListScreen;