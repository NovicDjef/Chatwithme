# 🐛 Guide de Debug - Erreur Network

## 🔍 Problème identifié

**Erreur**: `Network Error` lors de la connexion
**Cause**: Le backend répond avec "Erreur interne du serveur"

## ✅ Vérifications effectuées

1. **Serveur backend** : ✅ Actif sur port 3001
2. **URL API corrigée** : ✅ `http://localhost:3001`
3. **Logs détaillés ajoutés** : ✅ Pour debugging

## 🚨 Problèmes côté serveur détectés

### Test API direct :
```bash
curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{"email": "alice@example.com", "password": "1234!"}'
```
**Résultat** : `{"success":false,"message":"Erreur interne du serveur"}`

### Test signup :
```bash
curl -X POST http://localhost:3001/auth/signup -H "Content-Type: application/json" -d '{"email": "test@example.com", "password": "123456", "firstName": "Test", "lastName": "User", "username": "testuser", "language": "fr"}'
```
**Résultat** : `{"error":"Token d'authentification requis"}`

## 🔧 Actions à effectuer côté serveur

### 1. Vérifiez les routes d'authentification
- Route `/api/auth/login` doit être accessible SANS token
- Route `/api/auth/signup` doit être accessible SANS token

### 2. Vérifiez les middlewares
Assurez-vous que les routes d'auth sont **avant** le middleware d'authentification :

```javascript
// ✅ Correct
app.use('/api/auth', authRoutes); // SANS middleware auth
app.use('/api', authenticateToken); // Middleware auth APRÈS
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);

// ❌ Incorrect
app.use('/api', authenticateToken); // Bloque TOUT
app.use('/api/auth', authRoutes); // Jamais atteint
```

### 3. Vérifiez la base de données
- L'utilisateur `alice@example.com` existe-t-il ?
- Le mot de passe est-il correctement hashé ?

### 4. Logs serveur
Ajoutez des logs dans votre contrôleur de login pour voir l'erreur exacte :

```javascript
// Dans votre route login
console.log('📧 Login attempt:', req.body.email);
console.log('🔍 User found:', user);
console.log('✅ Password valid:', isValidPassword);
```

## 📱 Logs React Native améliorés

L'application affichera maintenant des logs détaillés :

```
🚫 No token found
📤 API Request: POST http://localhost:3001/auth/login
📤 Request data: {"email":"alice@example.com","password":"1234!"}
❌ API Error Details:
  - Status: 500
  - URL: /auth/login
  - Data sent: {"email":"alice@example.com","password":"1234!"}
  - Response data: {"success":false,"message":"Erreur interne du serveur"}
```

## 🎯 Solutions immédiates

### Option 1 : Créer un utilisateur de test
Utilisez directement votre interface d'admin ou base de données pour créer un utilisateur test.

### Option 2 : Corriger les routes
Réorganisez vos routes pour que l'authentification ne bloque pas signup/login.

### Option 3 : Vérifier l'utilisateur
Vérifiez si l'utilisateur `alice@example.com` existe avec le bon mot de passe.

## 🔄 Étapes de test

1. **Corrigez le serveur**
2. **Redémarrez le serveur**
3. **Testez avec curl** :
   ```bash
   curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{"email": "alice@example.com", "password": "1234!"}'
   ```
4. **Si curl fonctionne**, testez dans l'app React Native

## 📋 Checklist serveur

- [ ] Routes `/api/auth/*` accessibles sans token
- [ ] Utilisateur de test existe en base
- [ ] Mot de passe correctement hashé
- [ ] Logs d'erreur côté serveur ajoutés
- [ ] Middleware d'auth placé après les routes d'auth

Une fois ces points corrigés, l'app React Native devrait se connecter correctement ! 🎊