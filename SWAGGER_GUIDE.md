# 📚 Guide de Génération Swagger - Service IA SupervIA

## 🎯 Vue d'Ensemble

Ce guide explique comment générer et maintenir la documentation API Swagger pour le service IA SupervIA.

## 🚀 Génération Rapide

### Commande Simple

```bash
# Depuis le répertoire racine du service IA
npm run swagger:gen
```

### Commande Alternative

```bash
# Commande directe Node.js
node scripts/generate-swagger.js
```

## 📋 Résultat de la Génération

La commande génère un fichier `src/swagger.json` contenant la documentation complète de **15 endpoints** :

### 🤖 Assistant Opérationnel IA (8 endpoints)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/chat` | POST | Chat interactif avec l'assistant |
| `/quick-status` | POST | Vérification rapide du système |
| `/auto-diagnose` | POST | Diagnostic automatique complet |
| `/performance-insights` | POST | Insights de performance |
| `/smart-dashboard` | POST | Génération intelligente de dashboards |
| `/analyze-metrics` | POST | Analyse de métriques |
| `/diagnose-issue` | POST | Diagnostic de problèmes |
| `/explain-metric` | POST | Explication de métriques |

### 🎨 Générateur de Dashboards IA (7 endpoints)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/generate` | POST | Génération de dashboards |
| `/validate` | POST | Validation de configurations |
| `/optimize` | POST | Optimisation de dashboards |
| `/suggest-templates` | POST | Suggestions de templates |
| `/recommend-blocks` | POST | Recommandations de blocs |
| `/templates` | GET | Liste des templates disponibles |
| `/explain` | POST | Explication de configurations |

## 🔧 Configuration

### Variables d'Environnement

Le script utilise ces variables pour la génération :

```bash
# URL de base de l'API
API_URL=http://localhost:3004

# Port du service
PORT=3004

# Version du service (depuis package.json)
VERSION=1.0.0
```

### Fichier de Configuration

Le script lit la configuration depuis `scripts/generate-swagger.js` :

```javascript
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SupervIA AI Service API',
      version: packageJson.version || '1.0.0',
      description: "Service IA double pour SupervIA : génération de dashboards et assistance à la supervision.",
      contact: {
        name: 'SupervIA Team',
        email: 'contact@supervia.com'
      }
    },
    servers: [
      {
        url: process.env.API_URL || `http://localhost:${process.env.PORT || 3004}`,
        description: 'Serveur de développement'
      }
    ],
    components: {
      securitySchemes: {
        ServiceAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: "Authentification JWT inter-services."
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};
```

## 📖 Accès à la Documentation

### Fichier JSON

Une fois générée, la documentation est disponible dans :
```
src/swagger.json
```

### Interface Swagger UI

Si configurée, accessible via :
```
http://localhost:3004/api-docs
```

## 🛠️ Personnalisation

### Ajouter un Nouvel Endpoint

1. **Créer la route** dans `src/routes/` :

```javascript
/**
 * @swagger
 * /api/ops-assistant/nouveau-endpoint:
 *   post:
 *     summary: Description courte
 *     tags: [Ops Assistant]
 *     description: Description détaillée de l'endpoint.
 *     security:
 *       - ServiceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               param1:
 *                 type: string
 *                 description: "Description du paramètre"
 *                 example: "valeur exemple"
 *     responses:
 *       200:
 *         description: Succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         description: Erreurs de validation.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.post('/nouveau-endpoint',
  authMiddlewareToUse,
  [
    body('param1')
      .notEmpty()
      .withMessage('Paramètre requis')
  ],
  handleValidationErrors,
  Controller.nouvelleMethode
);
```

2. **Implémenter le contrôleur** dans `src/controllers/`
3. **Générer la documentation** : `npm run swagger:gen`

### Modifier un Endpoint Existant

1. **Éditer l'annotation Swagger** dans le fichier de route
2. **Générer la documentation** : `npm run swagger:gen`

### Exemple d'Annotation Complète

```javascript
/**
 * @swagger
 * /api/ops-assistant/chat:
 *   post:
 *     summary: Interagit avec l'assistant via le chat
 *     tags: [Ops Assistant]
 *     description: Envoie un message à l'assistant IA et reçoit une réponse contextuelle basée sur les outils disponibles.
 *     security:
 *       - ServiceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: "Le message de l'utilisateur à l'assistant"
 *                 example: "Quelles sont les alertes critiques en ce moment ?"
 *                 minLength: 1
 *                 maxLength: 2000
 *               sessionId:
 *                 type: string
 *                 description: "ID de session pour conserver le contexte (optionnel)"
 *                 example: "session-12345"
 *               context:
 *                 type: object
 *                 description: "Contexte additionnel (optionnel)"
 *                 example: {
 *                   "currentDashboard": "dashboard-1",
 *                   "userRole": "admin"
 *                 }
 *     responses:
 *       200:
 *         description: Réponse de l'assistant avec contexte.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 response:
 *                   type: string
 *                   description: "Réponse de l'assistant IA"
 *                   example: "J'ai vérifié le système. Il y a actuellement 2 alertes critiques..."
 *                 sessionId:
 *                   type: string
 *                   description: "ID de session pour la conversation"
 *                   example: "session-12345"
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     messageCount:
 *                       type: number
 *                       description: "Nombre de messages dans la session"
 *                       example: 5
 *                     hasContext:
 *                       type: boolean
 *                       description: "Si du contexte a été fourni"
 *                       example: true
 *                     cached:
 *                       type: boolean
 *                       description: "Si la réponse vient du cache"
 *                       example: false
 *                     toolsUsed:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: "Outils IA utilisés"
 *                       example: ["getServiceHealth", "getActiveAlerts"]
 *       400:
 *         description: Erreurs de validation des paramètres.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Erreurs de validation"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Token d'authentification invalide ou manquant.
 *       500:
 *         description: Erreur interne du serveur.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Erreur interne du serveur"
 */
```

## 🔍 Validation de la Documentation

### Vérifier la Syntaxe

```bash
# Générer et vérifier qu'il n'y a pas d'erreurs
npm run swagger:gen

# Vérifier que le fichier JSON est valide
node -e "JSON.parse(require('fs').readFileSync('src/swagger.json', 'utf8')); console.log('✅ JSON valide');"
```

### Tester avec Swagger UI

1. **Démarrer le service** : `npm run dev`
2. **Ouvrir** : `http://localhost:3004/api-docs`
3. **Tester les endpoints** directement depuis l'interface

## 🚨 Dépannage

### Erreurs Courantes

#### 1. "Cannot find module 'swagger-jsdoc'"

```bash
# Installer la dépendance manquante
npm install swagger-jsdoc --save-dev
```

#### 2. "SyntaxError: Unexpected token"

- Vérifier la syntaxe des annotations `@swagger`
- S'assurer que les backticks sont correctement échappés
- Vérifier la structure JSON des exemples

#### 3. "File not found"

```bash
# Vérifier que les fichiers de routes existent
ls src/routes/

# Vérifier les chemins dans generate-swagger.js
cat scripts/generate-swagger.js
```

### Logs de Débogage

```bash
# Générer avec plus de détails
DEBUG=swagger-jsdoc npm run swagger:gen
```

## 📈 Bonnes Pratiques

### 1. Documentation Complète

- **Toujours** inclure `summary`, `description`, `tags`
- **Décrire** tous les paramètres avec des exemples
- **Documenter** tous les codes de réponse possibles

### 2. Exemples Réalistes

```javascript
// ✅ Bon exemple
example: "rate(process_cpu_seconds_total{job=\"auth-service\"}[5m]) * 100"

// ❌ Exemple trop générique
example: "query"
```

### 3. Validation des Schémas

- **Utiliser** `required` pour les champs obligatoires
- **Spécifier** `minLength`, `maxLength` pour les chaînes
- **Définir** `enum` pour les valeurs limitées

### 4. Organisation

- **Grouper** les endpoints par tags logiques
- **Maintenir** une structure cohérente
- **Mettre à jour** régulièrement la documentation

## 🔄 Workflow de Développement

### 1. Développement d'un Nouvel Endpoint

```bash
# 1. Créer la route avec documentation Swagger
# 2. Implémenter le contrôleur
# 3. Tester l'endpoint
# 4. Générer la documentation
npm run swagger:gen

# 5. Vérifier la documentation
cat src/swagger.json | jq '.paths | keys'
```

### 2. Modification d'un Endpoint

```bash
# 1. Modifier l'annotation Swagger
# 2. Mettre à jour le code
# 3. Régénérer la documentation
npm run swagger:gen

# 4. Tester via Swagger UI
```

### 3. Intégration Continue

```bash
# Script pour CI/CD
#!/bin/bash
npm run swagger:gen
if [ $? -eq 0 ]; then
    echo "✅ Documentation Swagger générée avec succès"
    exit 0
else
    echo "❌ Erreur lors de la génération Swagger"
    exit 1
fi
```

## 📞 Support

Pour toute question sur la documentation Swagger :

- **Documentation officielle** : [Swagger JSDoc](https://github.com/Surnet/swagger-jsdoc)
- **Spécification OpenAPI** : [OpenAPI 3.0](https://swagger.io/specification/)
- **Exemples** : Voir les fichiers dans `src/routes/`

---

**🎯 Objectif** : Maintenir une documentation API complète, à jour et facilement accessible pour tous les développeurs utilisant le service IA SupervIA. 