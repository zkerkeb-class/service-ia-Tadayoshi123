# Documentation du Contrôleur Dashboard

## Vue d'ensemble

Le contrôleur `dashboard.controller.js` est responsable de la génération et de la gestion des dashboards dans SupervIA. Il utilise l'IA pour créer, optimiser et valider des configurations de dashboard basées sur les besoins des utilisateurs.

## Points clés pour l'utilisation de l'API OpenAI

### Utilisation de `responseFormat`

Lorsque nous utilisons l'option `responseFormat: { type: 'json_object' }` avec l'API OpenAI, il est **ESSENTIEL** de respecter ces règles :

1. Le prompt doit explicitement mentionner que la réponse doit être en JSON
2. Le prompt doit inclure le mot "JSON" pour indiquer clairement le format attendu
3. Il est recommandé d'ajouter une phrase comme "Ta réponse doit être un objet JSON valide" à la fin du prompt

### Méthodes utilisant `responseFormat: { type: 'json_object' }`

Les méthodes suivantes utilisent cette option car elles nécessitent une structure JSON précise :

- `generateDashboard` : Génère une configuration complète de dashboard
- `suggestLayout` : Suggère une disposition optimale pour les métriques
- `validateDashboard` : Valide une configuration existante
- `optimizeDashboard` : Optimise un dashboard existant
- `suggestTemplates` : Suggère des templates appropriés
- `recommendBlocks` : Recommande des blocs supplémentaires

### Méthodes utilisant le format texte standard

La méthode suivante n'utilise PAS `responseFormat` car elle doit générer du texte explicatif :

- `explainDashboard` : Fournit une explication en langage naturel d'une configuration

## Structure des prompts

Tous les prompts suivent une structure similaire :

1. Contexte et objectif
2. Données d'entrée (exigences, configuration existante, etc.)
3. Instructions spécifiques
4. Format de sortie attendu avec exemple
5. Rappel explicite que la réponse doit être en JSON (pour les méthodes utilisant `responseFormat`)

## Gestion des erreurs

Le contrôleur inclut :

- Validation technique des configurations
- Fallbacks en cas d'échec de l'IA
- Logging détaillé
- Métriques pour suivre les performances

## Bonnes pratiques

1. Toujours inclure le mot "JSON" dans les prompts utilisant `responseFormat`
2. Fournir des exemples clairs de la structure attendue
3. Utiliser des températures appropriées (plus basses pour les validations, plus hautes pour la créativité)
4. Mettre en cache les réponses pour les opérations coûteuses

## Dépannage

Si vous rencontrez des erreurs "Invalid JSON" avec l'API OpenAI :
- Vérifiez que le prompt mentionne explicitement le format JSON
- Assurez-vous que l'exemple fourni est un JSON valide
- Ajoutez une instruction claire à la fin du prompt 