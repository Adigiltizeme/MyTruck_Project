# Guide d'utilisation de `role-helpers.ts`

## 🎯 Problème résolu

Au lieu de dupliquer `user?.role === 'admin' || user?.role === 'direction'` partout dans le code, utilisez les fonctions utilitaires centralisées.

## ✅ Utilisation

### Import

```typescript
import { isAdminRole, isMagasinRole, isChauffeurRole, hasPermission } from '../utils/role-helpers';
```

### Exemples de remplacement

#### ❌ AVANT (à éviter)
```typescript
// Vérifier si admin
if (user?.role === 'admin' || user?.role === 'direction') {
    // Code admin
}

// Vérifier si pas admin
if (user?.role !== 'admin' && user?.role !== 'direction') {
    // Code non-admin
}

// Rendu conditionnel
{(user?.role === 'admin' || user?.role === 'direction') && (
    <AdminPanel />
)}
```

#### ✅ APRÈS (recommandé)
```typescript
import { isAdminRole } from '../utils/role-helpers';

// Vérifier si admin
if (isAdminRole(user?.role)) {
    // Code admin
}

// Vérifier si pas admin
if (!isAdminRole(user?.role)) {
    // Code non-admin
}

// Rendu conditionnel
{isAdminRole(user?.role) && (
    <AdminPanel />
)}
```

### Autres fonctions disponibles

```typescript
// Vérifier si magasin
if (isMagasinRole(user?.role)) {
    // Code spécifique magasin
}

// Vérifier si chauffeur
if (isChauffeurRole(user?.role)) {
    // Code spécifique chauffeur
}

// Vérification de permission avancée
if (hasPermission(user?.role, ['admin', 'magasin'])) {
    // Accessible par admin, direction ET magasin
}

// Obtenir le label d'affichage
const label = getRoleLabel(user?.role); // "Administrateur", "Direction", etc.

// Badge coloré
const badgeColor = getRoleBadgeColor(user?.role); // "bg-red-100 text-red-800"
```

## 🚀 Exemple complet

```typescript
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole, getRoleLabel, getRoleBadgeColor } from '../utils/role-helpers';

export default function DashboardHeader() {
    const { user } = useAuth();

    return (
        <div>
            <h1>Dashboard</h1>

            {/* Badge du rôle */}
            <span className={`px-2 py-1 rounded ${getRoleBadgeColor(user?.role)}`}>
                {getRoleLabel(user?.role)}
            </span>

            {/* Menu admin */}
            {isAdminRole(user?.role) && (
                <nav>
                    <a href="/admins">Gérer admins</a>
                    <a href="/magasins">Gérer magasins</a>
                    <a href="/chauffeurs">Gérer chauffeurs</a>
                </nav>
            )}

            {/* Menu magasin */}
            {isMagasinRole(user?.role) && (
                <nav>
                    <a href="/commandes">Mes commandes</a>
                    <a href="/clients">Mes clients</a>
                </nav>
            )}
        </div>
    );
}
```

## 📝 Avantages

1. **Centralisation** : Un seul endroit pour modifier la logique des rôles
2. **Lisibilité** : Code plus clair et intention évidente
3. **Maintenabilité** : Ajouter un nouveau rôle "direction" ne nécessite que de modifier `role-helpers.ts`
4. **Type safety** : TypeScript détecte les erreurs de typage
5. **Réutilisabilité** : Fonctions disponibles dans toute l'application

## 🔄 Migration progressive

Vous n'avez **PAS besoin** de tout migrer d'un coup. Utilisez `isAdminRole()` :
- ✅ Dans les **nouveaux fichiers**
- ✅ Quand vous **modifiez** un fichier existant
- ❌ Pas besoin de refactor tout le code existant immédiatement

Le code ancien avec `user?.role === 'admin'` continuera de fonctionner, mais utilisez les helpers progressivement.
