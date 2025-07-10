// src/services/openai.service.js
// Service OpenAI principal pour les agents IA

const OpenAI = require('openai');
const logger = require('../config/logger');
const { aiCache } = require('../config/redis');
const { metrics } = require('../middlewares/metrics');

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY non configurée');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 2000;
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
    this.useCache = process.env.USE_CACHE !== 'false'; // Désactivable via variable d'environnement
  }

  /**
   * Appel générique à OpenAI avec gestion du cache et des erreurs
   */
  async callOpenAI(prompt, agentType, options = {}) {
    const startTime = Date.now();
    let cacheKey;
    
    try {
      // Génération de la clé de cache
      if (typeof prompt === 'string') {
        cacheKey = aiCache.generateCacheKey(prompt, agentType);
      } else if (Array.isArray(prompt)) {
        // Si prompt est un tableau de messages, utiliser une clé basée sur le contenu
        const promptString = JSON.stringify(prompt);
        cacheKey = aiCache.generateCacheKey(promptString, agentType);
      } else {
        throw new Error('Format de prompt invalide');
      }
      
      // Vérification du cache si activé
      if (this.useCache) {
        try {
          const cached = await aiCache.get(cacheKey);
          if (cached) {
            logger.info(`Cache hit pour ${agentType}`);
            metrics.recordAICall(agentType, 'success', true);
            return cached;
          }
        } catch (cacheError) {
          logger.warn(`Erreur cache pour ${agentType}, utilisation directe API:`, cacheError.message);
        }
      }

      // Configuration de la requête
      let messages;
      if (typeof prompt === 'string') {
        messages = [
          {
            role: 'system',
            content: this.getSystemPrompt(agentType)
          },
          {
            role: 'user',
            content: prompt
          }
        ];
      } else if (Array.isArray(prompt)) {
        messages = prompt;
      } else {
        throw new Error('Format de prompt invalide');
      }

      const requestConfig = {
        model: options.model || this.model,
        messages: messages,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature
      };

      // Ajouter responseFormat si spécifié
      if (options.responseFormat) {
        requestConfig.response_format = options.responseFormat;
      }

      // Ajouter tools et tool_choice si spécifiés
      if (options.tools) {
        requestConfig.tools = options.tools;
        if (options.tool_choice) {
          requestConfig.tool_choice = options.tool_choice;
        }
      }

      // Appel à OpenAI
      logger.info(`Appel OpenAI pour ${agentType}`);
      const response = await this.client.chat.completions.create(requestConfig);

      // Vérification de la réponse
      if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('Réponse OpenAI invalide');
      }

      // Construction du résultat
      const result = {
        content: response.choices[0].message.content,
        choices: response.choices,
        model: response.model,
        usage: response.usage,
        timestamp: new Date().toISOString(),
        agentType
      };

      // Mise en cache du résultat si activé
      if (this.useCache) {
        try {
          const ttl = options.cacheTTL || 3600; // 1 heure par défaut
          await aiCache.set(cacheKey, result, ttl);
        } catch (cacheError) {
          logger.warn(`Erreur mise en cache pour ${agentType}:`, cacheError.message);
        }
      }

      // Métriques
      const duration = (Date.now() - startTime) / 1000;
      metrics.recordAICall(agentType, 'success', false);
      metrics.recordResponseTime(agentType, duration);

      logger.info({
        message: 'Réponse OpenAI reçue',
        agentType,
        duration,
        tokens: response.usage.total_tokens,
        cached: false
      });

      return result;

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      metrics.recordAICall(agentType, 'error', false);
      metrics.recordResponseTime(agentType, duration);

      logger.error({
        message: 'Erreur OpenAI',
        agentType,
        error: error.message,
        duration
      });

      // Gestion des erreurs spécifiques
      if (error.code === 'rate_limit_exceeded') {
        throw new Error('Limite de taux API dépassée. Veuillez réessayer plus tard.');
      }

      if (error.code === 'insufficient_quota') {
        throw new Error('Quota API insuffisant.');
      }

      if (error.code === 'invalid_request_error') {
        throw new Error('Requête invalide: ' + error.message);
      }

      // Fallback vers les réponses statiques en cas d'erreur
      return this.getFallbackResponse(agentType, prompt);
    }
  }

  /**
   * Obtient le prompt système approprié selon l'agent
   */
  getSystemPrompt(agentType) {
    const prompts = {
      dashboard: `Tu es un expert en génération de dashboards pour SupervIA, une plateforme de supervision d'infrastructure.

Ton rôle est de:
1. Analyser les besoins de supervision exprimés par l'utilisateur
2. Proposer des métriques pertinentes à partir de la liste fournie
3. Générer des configurations JSON VALIDES pour les dashboards
4. Proposer des layouts optimaux et esthétiques

Tu dois TOUJOURS répondre en JSON valide avec la structure suivante. Ne fournis AUCUN texte en dehors de ce JSON.

{
  "dashboard": {
    "title": "Titre du Dashboard (string)",
    "description": "Description du dashboard (string)",
    "layout": "grid",
    "blocks": [
      {
        "id": "identifiant-unique-pour-le-bloc (string)",
        "type": "type-de-bloc (string, l'un de : 'MetricBlock', 'LineChartBlock', 'BarChartBlock', 'TableBlock', 'AlertListBlock', 'StatusBlock', 'TextBlock')",
        "title": "Titre du bloc (string)",
        "description": "Description du bloc (optionnel, string)",
        "position": {"x": 0, "y": 0, "w": 4, "h": 3},
        "config": {}
      }
    ]
  },
  "recommendations": ["Recommandation 1 (string)", "Recommandation 2 (string)"],
  "explanation": "Explication de haut niveau du dashboard généré (string)"
}

Voici la structure de l'objet "config" pour chaque "type" de bloc :

- Pour "MetricBlock":
  "config": {
    "value": 123.45,
    "previousValue": 120.10,
    "unit": "%",
    "precision": 2,
    "showChange": true,
    "thresholds": {"warning": 80, "critical": 95},
    "inverse": false
  }

- Pour "LineChartBlock" ou "BarChartBlock":
  "config": {
    "data": [
      {"name": "Jan", "value": 30},
      {"name": "Fev", "value": 45},
      {"name": "Mar", "value": 60}
    ],
    "dataKey": "value",
    "categoryKey": "name",
    "unit": "ms"
  }

- Pour "TableBlock":
  "config": {
    "headers": ["Nom du Service", "Statut", "Latence (ms)"],
    "rows": [
      ["auth-service", "UP", 54],
      ["payment-service", "DEGRADED", 210]
    ]
  }

Analyse la demande utilisateur et les métriques fournies pour générer la configuration JSON la plus pertinente possible.`,

      opsAssistant: `Tu es un expert en infrastructure et supervision opérationnelle pour SupervIA.

Ton rôle est de:
1. Analyser les métriques système et applications
2. Diagnostiquer les problèmes de performance
3. Recommander des optimisations
4. Suggérer des règles d'alertes pertinentes
5. Aider à la planification de capacité
6. Expliquer les métriques complexes en termes simples

Tu dois être précis, actionnable et toujours proposer des solutions concrètes.
Réponds en français clair et technique quand approprié.
Structure tes réponses avec des sections: Analyse, Diagnostic, Recommandations, Actions.

Pour les métriques, considère toujours:
- Les seuils normaux vs anormaux
- Les tendances temporelles
- L'impact business
- La criticité des services affectés`
    };

    return prompts[agentType] || prompts.opsAssistant;
  }

  /**
   * Réponses de fallback en cas d'erreur API
   */
  getFallbackResponse(agentType, prompt) {
    const fallbacks = {
      dashboard: {
        content: JSON.stringify({
          dashboard: {
            title: "Dashboard par défaut",
            description: "Configuration générée en mode dégradé",
            layout: "grid",
            blocks: [
              {
                id: "default-metric",
                type: "metric",
                title: "Métriques système",
                position: { x: 0, y: 0, w: 6, h: 3 },
                config: { metric: "cpu_usage" },
                datasource: "prometheus"
              }
            ]
          },
          recommendations: ["Vérifiez la configuration des métriques"],
          explanation: "Dashboard généré en mode dégradé suite à une erreur API"
        }),
        fallback: true
      },
      opsAssistant: {
        content: "Je rencontre actuellement des difficultés techniques. Veuillez vérifier:\n\n• L'état des services critiques\n• Les métriques de base (CPU, mémoire, stockage)\n• Les logs d'erreur récents\n\nContactez l'équipe technique si le problème persiste.",
        fallback: true
      },
      "chat": {
        content: "Je suis désolé, mais je rencontre des difficultés techniques pour traiter votre demande. Essayez de reformuler votre question ou contactez l'équipe technique si le problème persiste.",
        fallback: true
      },
      "quick-status": {
        content: "Statut système: Indisponible. Impossible d'accéder aux métriques en temps réel. Veuillez vérifier manuellement l'état des services ou réessayer ultérieurement.",
        fallback: true
      },
      "performance-insights": {
        content: "Analyse de performance indisponible. Le service de métriques semble inaccessible. Vérifiez l'état des services et les connexions réseau avant de réessayer.",
        fallback: true
      }
    };

    logger.warn(`Utilisation du fallback pour ${agentType}`);
    
    // Trouver le fallback le plus approprié
    let fallbackResponse = fallbacks[agentType];
    
    // Si pas de fallback spécifique pour cet agent, utiliser le fallback générique
    if (!fallbackResponse) {
      if (agentType.includes('chat')) {
        fallbackResponse = fallbacks.chat;
      } else if (agentType.includes('dashboard')) {
        fallbackResponse = fallbacks.dashboard;
      } else {
        fallbackResponse = fallbacks.opsAssistant;
      }
    }
    
    return fallbackResponse;
  }

  /**
   * Validation du JSON généré pour les dashboards
   */
  validateDashboardJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Validation basique de la structure
      if (!parsed.dashboard || !parsed.dashboard.title || !parsed.dashboard.blocks) {
        throw new Error('Structure de dashboard invalide');
      }

      // Validation des blocs
      if (!Array.isArray(parsed.dashboard.blocks)) {
        throw new Error('Les blocs doivent être un tableau');
      }

      for (const block of parsed.dashboard.blocks) {
        if (!block.id || !block.type || !block.title || !block.position) {
          throw new Error('Bloc invalide: propriétés manquantes');
        }
      }

      return { valid: true, data: parsed };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = new OpenAIService(); 