# Debug Guide: SuperAdmin Login Issue

## Symptôme
Après le login SuperAdmin, l'utilisateur reste sur la page `/login` au lieu d'être redirigé vers `/`.

## Modifications Appliquées

### 1. Ajout de Logs de Débogage (`lib/auth.tsx`)
```typescript
const login = async (email: string, password: string) => {
  try {
    let response = await api.post('/auth/login', { email, password }).catch(async (employeeError) => {
      console.log('Employee login failed, trying SuperAdmin login...');
      try {
        const superAdminResponse = await api.post('/auth/super-admin/login', { email, password });
        console.log('SuperAdmin login successful');
        return superAdminResponse;
      } catch (superAdminError) {
        throw employeeError;
      }
    });

    const { access_token, user: userData } = response.data;
    console.log('Login successful, user:', userData);

    localStorage.setItem('token', access_token);
    setUser(userData);

    // Delay pour assurer que l'état est mis à jour
    setTimeout(() => {
      router.replace('/');
    }, 100);
  } catch (error: any) {
    console.error('Login failed:', error);
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};
```

## Tests à Effectuer

### Étape 1: Vérifier la Console du Navigateur
1. Ouvrir la console du navigateur (F12 → Console)
2. Aller sur http://localhost:3000/login
3. Se connecter avec:
   - Email: `admin@radiostaff.com`
   - Password: `SuperAdmin123!`
4. Observer les logs dans la console:
   - ✅ Devrait afficher: `Employee login failed, trying SuperAdmin login...`
   - ✅ Devrait afficher: `SuperAdmin login successful`
   - ✅ Devrait afficher: `Login successful, user: { isSuperAdmin: true, ... }`

### Étape 2: Vérifier localStorage
Après le login, dans la console du navigateur:
```javascript
// Vérifier le token
localStorage.getItem('token')
// Devrait retourner un JWT token

// Vérifier si le token est valide
JSON.parse(atob(localStorage.getItem('token').split('.')[1]))
// Devrait montrer { sub: "...", email: "admin@radiostaff.com", isSuperAdmin: true, ... }
```

### Étape 3: Vérifier le Contexte Auth
Dans la console React DevTools:
1. Chercher le composant `AuthProvider`
2. Vérifier les props/state:
   - `user` devrait contenir `{ id, email, fullName, isSuperAdmin: true }`
   - `loading` devrait être `false`
   - `isAuthenticated` devrait être `true`

### Étape 4: Vérifier le Router
Dans la console du navigateur après le login:
```javascript
// Vérifier l'URL actuelle
window.location.pathname
// Devrait être "/" après redirection

// Si bloqué sur "/login", vérifier:
window.location.href
```

## Scénarios Possibles

### Scénario 1: Erreur de Login (401)
**Symptôme**: Login échoue complètement
**Console**: Affiche "Login failed: ..."
**Solution**: Vérifier les credentials dans le backend

### Scénario 2: Token Stocké Mais Pas de Redirection
**Symptôme**: `localStorage.getItem('token')` retourne un token mais reste sur `/login`
**Console**: Affiche "Login successful" mais pas de navigation
**Cause Possible**:
- Le `setTimeout` ne fonctionne pas
- Le `router.replace('/')` échoue silencieusement
**Solution**: Vérifier si `_app.tsx` redirige immédiatement vers `/login`

### Scénario 3: User non défini dans Context
**Symptôme**: Token présent mais `user` est `null` dans AuthContext
**Console**: "Login successful" mais `user` reste null
**Cause Possible**: `setUser(userData)` ne met pas à jour correctement l'état
**Solution**:
```typescript
// Modifier le login pour utiliser une callback
setUser(userData);
router.events.on('routeChangeComplete', () => {
  // Navigation complete
});
```

### Scénario 4: `_app.tsx` Redirige Immédiatement
**Symptôme**: Navigation vers `/` puis retour immédiat à `/login`
**Console**: Voir des logs de redirection en boucle
**Cause**: `useEffect` dans `_app.tsx` vérifie `user` avant que l'état ne soit mis à jour
**Solution**: Le `setTimeout(100)` devrait résoudre ce problème

## Solutions Alternatives

### Solution 1: Window Location (Force Reload)
Si `router.replace()` ne fonctionne pas:
```typescript
// Dans lib/auth.tsx
window.location.href = '/';
```

### Solution 2: Router Events
Attendre explicitement la mise à jour de l'état:
```typescript
setUser(userData);
await new Promise(resolve => setTimeout(resolve, 50));
router.replace('/');
```

### Solution 3: Callback après setUser
```typescript
setUser(userData);
// Force re-render
setTimeout(() => {
  if (userData) {
    router.replace('/');
  }
}, 0);
```

## Vérification Backend

Le backend fonctionne correctement (testé avec curl):
```bash
# SuperAdmin login
curl -X POST http://localhost:4000/api/auth/super-admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "admin@radiostaff.com", "password": "SuperAdmin123!"}'

# Response: ✅
{
  "access_token": "eyJ...",
  "user": {
    "id": "43e00eb9-0a75-4c50-87d7-aeaa64c53ad8",
    "email": "admin@radiostaff.com",
    "fullName": "Platform Administrator",
    "isSuperAdmin": true
  }
}
```

## Prochaines Étapes

1. **Tester avec les console.logs**: Identifier exactement où le processus échoue
2. **Vérifier React DevTools**: S'assurer que le contexte Auth est correctement mis à jour
3. **Si setTimeout ne suffit pas**: Essayer `window.location.href = '/'` comme solution de repli
4. **Ajouter plus de logs**: Dans `_app.tsx` pour voir les cycles de redirection

## Notes Techniques

### Pourquoi setTimeout?
React met à jour l'état de manière asynchrone. Le `setTimeout` donne à React le temps de:
1. Mettre à jour l'état `user` via `setUser(userData)`
2. Re-render les composants qui dépendent de `user`
3. Permettre au router de naviguer avec le bon contexte

### Alternative: useRouter Callback
Next.js router est asynchrone. On peut utiliser:
```typescript
await router.replace('/');
// ou
router.replace('/', undefined, { shallow: false });
```

## Fichiers Modifiés
- ✅ `frontend/lib/auth.tsx` - Ajout logs de débogage + setTimeout
- ✅ Interface `User` - Support SuperAdmin (`isSuperAdmin`, `fullName`)
- ✅ `frontend/pages/index.tsx` - Dashboard conditionnel SuperAdmin/Employee
- ✅ `frontend/components/Navigation.tsx` - Menu conditionnel

## Commande de Test Rapide
```bash
# Frontend logs
tail -f /Users/kdev66/Desktop/nestjsProjects/radio-staff/frontend/.next/*.log

# Backend logs (déjà en cours d'exécution)
# Visible dans le terminal du serveur de développement
```
