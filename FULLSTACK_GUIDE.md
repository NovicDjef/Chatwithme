# 🚀 Guide d'utilisation - Architecture Fullstack ChatWithMe

Votre application React Native est maintenant complètement intégrée avec votre backend ! Plus de simulation côté client - tout passe par votre serveur Node.js.

## 📁 Structure créée

```
app/
├── store/                          # Redux Store
│   ├── index.js                   # Configuration du store
│   ├── slices/
│   │   ├── authSlice.js          # Authentification
│   │   └── chatSlice.js          # Chat temps réel
│   └── services/
│       ├── api.js                # Services API avec Axios
│       └── socket.js             # WebSocket service
├── providers/
│   └── ReduxProvider.js          # Provider Redux
├── hooks/redux/
│   ├── useAppDispatch.js         # Hook dispatch
│   └── useAppSelector.js         # Hook sélecteur
├── components/
│   ├── Auth/
│   │   └── AuthScreen.js         # Écran de connexion/inscription
│   └── Chat/
│       ├── FullstackChatScreen.js # Chat fullstack
│       └── ...                   # Vos composants existants
└── _layout.tsx                    # Layout mis à jour avec Redux
```

## 🔧 Configuration automatique

### ✅ Redux Toolkit configuré
- **Store central** pour gérer l'état global
- **Slices** pour l'auth et le chat
- **Middleware** pour les actions asynchrones

### ✅ Axios intégré
- **Intercepteurs** pour l'ajout automatique du token
- **Gestion d'erreur** centralisée
- **Support multipart** pour les uploads

### ✅ WebSocket temps réel
- **Connexion automatique** après authentification
- **Événements** en temps réel (messages, statuts, frappe)
- **Reconnexion automatique**

## 🚨 Étapes pour utiliser

### 1. **Démarrer votre serveur backend**
```bash
# Assurez-vous que votre serveur Node.js tourne sur localhost:5000
cd votre-projet-backend
npm start
```

### 2. **Utiliser le nouveau composant chat**
```javascript
// Pour naviguer vers le chat fullstack
import { router } from 'expo-router';

// Navigation vers le chat
router.push({
  pathname: '/fullstack-chat',
  params: {
    otherUserId: 'user-id-here',
    otherUser: JSON.stringify({
      firstName: 'John',
      lastName: 'Doe',
      username: 'john_doe'
    })
  }
});
```

### 3. **Authentification**
```javascript
// Dans votre composant
import { useAppDispatch } from '../hooks/redux/useAppDispatch';
import { login, signup } from '../store/slices/authSlice';

const dispatch = useAppDispatch();

// Connexion
dispatch(login({
  email: 'user@example.com',
  password: 'password123'
}));

// Inscription
dispatch(signup({
  email: 'user@example.com',
  username: 'john_doe',
  firstName: 'John',
  lastName: 'Doe',
  password: 'password123',
  language: 'fr'
}));
```

## 🎯 Fonctionnalités disponibles

### 💬 **Messages temps réel**
- ✅ Envoi/réception instantané via WebSocket
- ✅ Messages texte, vocaux, images
- ✅ Traductions automatiques côté serveur
- ✅ Indicateurs de frappe
- ✅ Statuts de lecture

### 👥 **Gestion des utilisateurs**
- ✅ Inscription/Connexion sécurisée
- ✅ Gestion des tokens JWT
- ✅ Statuts en ligne/hors ligne
- ✅ Langues multiples

### 🔊 **Messages vocaux**
- ✅ Enregistrement avec `InlineVoiceRecorder`
- ✅ Upload automatique vers le serveur
- ✅ Transcription côté serveur
- ✅ Traduction automatique

### 🖼️ **Partage d'images**
- ✅ Sélection galerie/appareil photo
- ✅ Upload multipart vers le serveur
- ✅ Affichage optimisé

## 🔌 Services disponibles

### API Service (`app/store/services/api.js`)
```javascript
import { authAPI, userAPI, chatAPI } from '../store/services/api';

// Authentification
await authAPI.login({ email, password });
await authAPI.signup(userData);

// Utilisateurs
await userAPI.getUsers();
await userAPI.changeLanguage('en');

// Chat
await chatAPI.conversation.sendMessage(convId, 'Hello');
await chatAPI.conversation.sendMedia(convId, mediaData);
```

### WebSocket Service (`app/store/services/socket.js`)
```javascript
import { socketService } from '../store/services/socket';

// Le service se connecte automatiquement après l'auth
// Les événements sont gérés par Redux automatiquement

// Événements disponibles :
socketService.on('new_message', (message) => {
  // Message reçu en temps réel
});
```

## 🎨 Composants prêts à l'emploi

### AuthScreen
- Écran de connexion/inscription complet
- Gestion des erreurs
- Validation des champs
- Sélection de langue

### FullstackChatScreen
- Chat temps réel complet
- Integration Redux/WebSocket
- Messages vocaux et images
- Indicateurs de frappe et statuts

## ⚙️ Configuration réseau

### Développement local
```javascript
// app/store/services/api.js
const BASE_URL = 'http://localhost:5000/api';

// app/store/services/socket.js
this.socket = io('http://localhost:5000', { /* ... */ });
```

### Production
```javascript
// Remplacez par votre domaine
const BASE_URL = 'https://votre-api.com/api';
const SOCKET_URL = 'https://votre-api.com';
```

## 🔄 Migration depuis l'ancienne version

### Remplacer BilingualChatScreen par FullstackChatScreen
```javascript
// Ancien
<BilingualChatScreen
  route={route}
  navigation={navigation}
/>

// Nouveau
<FullstackChatScreen
  route={route}
  navigation={navigation}
/>
```

### Utiliser les hooks Redux
```javascript
// Ancien
const [user, setUser] = useState(null);

// Nouveau
import { useAppSelector } from '../hooks/redux/useAppSelector';
import { selectUser } from '../store/slices/authSlice';

const user = useAppSelector(selectUser);
```

## 🐛 Debugging

### Logs utiles
```javascript
// Connexion WebSocket
console.log('Socket connected:', socketService.isSocketConnected());

// État Redux
console.log('Auth state:', store.getState().auth);
console.log('Chat state:', store.getState().chat);
```

### Erreurs communes
1. **Serveur backend non démarré** → Vérifiez localhost:5000
2. **Token expiré** → L'app se déconnecte automatiquement
3. **Permissions audio** → Configurées dans app.json

## 🎊 Prêt à utiliser !

Votre application est maintenant **100% fullstack** avec :
- ✅ Backend réel (pas de simulation)
- ✅ WebSocket temps réel
- ✅ Redux pour l'état global
- ✅ Authentification sécurisée
- ✅ Upload de médias
- ✅ Chat multilingue

**Lancez votre serveur backend et testez !** 🚀