// app/store/slices/authSlice.js - Gestion de l'authentification
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI, userAPI } from '../services/api';
import { socketService } from '../services/socket';
import StorageService from '../services/storage';

// =============================================================================
// THUNKS ASYNCHRONES
// =============================================================================

// Inscription
export const signup = createAsyncThunk(
  'auth/signup',
  async (userData, { rejectWithValue }) => {
    try {
      console.log('Redux: Starting signup...');
      const result = await authAPI.signup(userData);

      // Connecter au WebSocket après inscription
      await socketService.connect();

      return result;
    } catch (error) {
      console.error('Signup error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// Connexion
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      console.log('Redux: Starting login...');
      const result = await authAPI.login(credentials);

      // Connecter au WebSocket après connexion
      await socketService.connect();

      return result;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// Vérifier le token au démarrage de l'app
export const verifyToken = createAsyncThunk(
  'auth/verifyToken',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Redux: Verifying token...');
      const result = await authAPI.verifyToken();

      // Connecter au WebSocket si token valide
      await socketService.connect();

      return result;
    } catch (error) {
      console.error('Token verification error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// Restaurer la session depuis le stockage
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Restoring session from storage...');

      // Vérifier si la session est valide
      const isValid = await StorageService.isSessionValid();
      if (!isValid) {
        console.log('❌ Session expired or invalid');
        return rejectWithValue({ message: 'Session expirée' });
      }

      // Récupérer les données de session
      const session = await StorageService.getSession();
      if (!session.isValid) {
        console.log('❌ No valid session found');
        return rejectWithValue({ message: 'Aucune session valide trouvée' });
      }

      console.log('✅ Session restored successfully');

      // Essayer de vérifier le token avec le serveur
      try {
        await authAPI.verifyToken();
        console.log('✅ Token verified with server');

        // Renouveler le timestamp de session puisque le token est encore valide
        await StorageService.renewSessionTimestamp();

        // Connecter le WebSocket
        await socketService.connect();
      } catch (error) {
        console.log('⚠️ Token verification failed:', error.response?.status);

        // Si c'est une erreur 401 (token expiré), nettoyer la session
        if (error.response?.status === 401) {
          console.log('🔓 Token expired, clearing session');
          await StorageService.clearSession();
          return rejectWithValue({ message: 'Session expirée' });
        }

        // Pour les autres erreurs (réseau, serveur), garder la session locale
        console.log('🌐 Network/server error, keeping local session');
      }

      return {
        user: session.user,
        token: session.token,
      };
    } catch (error) {
      console.error('Session restoration error:', error);
      // Nettoyer le stockage en cas d'erreur
      await StorageService.clearSession();
      return rejectWithValue({ message: error.message });
    }
  }
);

// Changer la langue de l'utilisateur
export const changeUserLanguage = createAsyncThunk(
  'auth/changeLanguage',
  async ({ userId, language }, { rejectWithValue }) => {
    try {
      console.log('Redux: Changing user language to:', language);

      const result = await userAPI.changeLanguage({ id: userId, language });
      console.log('Language change result:', result);

      return { language };
    } catch (error) {
      console.error('Change language error:', error);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// Déconnexion
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Redux: Starting logout...');

      // Déconnecter du WebSocket
      socketService.disconnect();

      const result = await authAPI.logout();
      return result;
    } catch (error) {
      console.error('Logout error:', error);
      return rejectWithValue({ message: error.message });
    }
  }
);

// =============================================================================
// SLICE
// =============================================================================

const initialState = {
  // Utilisateur connecté
  user: null,
  token: null,

  // États de chargement
  isLoading: false,
  isInitialized: false, // Pour savoir si on a vérifié le token au démarrage

  // Erreurs
  error: null,

  // États spécifiques
  isSigningUp: false,
  isLoggingIn: false,
  isVerifying: false,
  isLoggingOut: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Nettoyer les erreurs
    clearError: (state) => {
      state.error = null;
    },

    // Reset l'état complet
    resetAuth: () => initialState,

    // Mettre à jour le profil utilisateur
    updateProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    // Marquer comme initialisé (appelé après vérification token)
    setInitialized: (state) => {
      state.isInitialized = true;
    },
  },
  extraReducers: (builder) => {
    // =======================================================================
    // SIGNUP
    // =======================================================================
    builder
      .addCase(signup.pending, (state) => {
        state.isLoading = true;
        state.isSigningUp = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSigningUp = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
        state.isInitialized = true;

        // Sauvegarder la session après inscription
        StorageService.saveSession({
          token: action.payload.token,
          user: action.payload.user
        }).catch(error => {
          console.error('Error saving session after signup:', error);
        });
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false;
        state.isSigningUp = false;
        state.error = action.payload?.message || 'Erreur lors de l\'inscription';
      });

    // =======================================================================
    // LOGIN
    // =======================================================================
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.isLoggingIn = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoggingIn = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
        state.isInitialized = true;

        // Sauvegarder la session après connexion
        StorageService.saveSession({
          token: action.payload.token,
          user: action.payload.user
        }).catch(error => {
          console.error('Error saving session after login:', error);
        });
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoggingIn = false;
        state.error = action.payload?.message || 'Erreur lors de la connexion';
      });

    // =======================================================================
    // VERIFY TOKEN
    // =======================================================================
    builder
      .addCase(verifyToken.pending, (state) => {
        state.isVerifying = true;
        state.error = null;
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.isVerifying = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
        state.isInitialized = true;
      })
      .addCase(verifyToken.rejected, (state, action) => {
        state.isVerifying = false;
        state.user = null;
        state.token = null;
        state.error = null; // Ne pas afficher l'erreur de token invalide
        state.isInitialized = true;
      });

    // =======================================================================
    // RESTORE SESSION
    // =======================================================================
    builder
      .addCase(restoreSession.pending, (state) => {
        state.isVerifying = true;
        state.error = null;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.isVerifying = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
        state.isInitialized = true;
      })
      .addCase(restoreSession.rejected, (state, action) => {
        state.isVerifying = false;
        state.user = null;
        state.token = null;
        state.error = null; // Ne pas afficher l'erreur de session expirée
        state.isInitialized = true;
      });

    // =======================================================================
    // LOGOUT
    // =======================================================================
    builder
      .addCase(logout.pending, (state) => {
        state.isLoggingOut = true;
        state.error = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoggingOut = false;
        state.user = null;
        state.token = null;
        state.error = null;

        // Nettoyer le stockage lors de la déconnexion
        StorageService.clearSession().catch(error => {
          console.error('Error clearing session on logout:', error);
        });
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoggingOut = false;
        // Même en cas d'erreur, on déconnecte l'utilisateur localement
        state.user = null;
        state.token = null;
        state.error = action.payload?.message || 'Erreur lors de la déconnexion';
      });

    // =======================================================================
    // CHANGE LANGUAGE
    // =======================================================================
    builder
      .addCase(changeUserLanguage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changeUserLanguage.fulfilled, (state, action) => {
        state.isLoading = false;

        // Mettre à jour la langue dans le profil utilisateur
        if (state.user) {
          state.user.language = action.payload.language;

          // Sauvegarder les données utilisateur mises à jour
          StorageService.saveUserData(state.user).catch(error => {
            console.error('Error saving updated user data:', error);
          });
        }

        state.error = null;
      })
      .addCase(changeUserLanguage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Erreur lors du changement de langue';
      });
  },
});

// =============================================================================
// ACTIONS ET SÉLECTEURS
// =============================================================================

export const { clearError, resetAuth, updateProfile, setInitialized } = authSlice.actions;

// Sélecteurs
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => !!state.auth.user && !!state.auth.token;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectIsInitialized = (state) => state.auth.isInitialized;
export const selectAuthError = (state) => state.auth.error;

// Sélecteurs spécifiques
export const selectIsSigningUp = (state) => state.auth.isSigningUp;
export const selectIsLoggingIn = (state) => state.auth.isLoggingIn;
export const selectIsVerifying = (state) => state.auth.isVerifying;
export const selectIsLoggingOut = (state) => state.auth.isLoggingOut;

export default authSlice.reducer;