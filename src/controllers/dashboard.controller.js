// src/controllers/dashboard.controller.js
// Contrôleur pour l'agent générateur de dashboards

const openAIService = require('../services/openai.service');
const dashboardTemplates = require('../data/dashboard-templates');
const logger = require('../config/logger');
const { metrics } = require('../middlewares/metrics');
const axios = require('axios');

const METRICS_SERVICE_URL = process.env.METRICS_SERVICE_URL || 'http://localhost:3003';

const buildDashboardPrompt = (requirements, templateType, complexity, context) => {
  const validBlockTypes = [
    "line-chart", "bar-chart", "pie-chart", "gauge",
    "metric", "table", "text", "status", "alert-list"
  ];

  let prompt = `You are an expert dashboard generator for a monitoring platform called SupervIA. Your task is to create a complete JSON configuration for a supervision dashboard based on user requirements.

**User Requirements:**
"${requirements}"
`;

  if (context) {
    prompt += `
**Existing Dashboard Context:**
- Title: ${context.dashboardTitle || 'N/A'}
- Existing Blocks: ${context.existingBlocks ? context.existingBlocks.map(b => `${b.title} (${b.type})`).join(', ') : 'None'}
- Preferred Metrics: ${context.preferredMetrics ? context.preferredMetrics.join(', ') : 'None specified'}

Please generate new blocks that complement the existing ones. Do not repeat existing blocks unless specifically asked.
`;
  }

  prompt += `
**CRITICAL INSTRUCTIONS:**

1.  **JSON Structure:**
    - Generate a single JSON object with a root key: "dashboard".
    - The "dashboard" object must contain "title", "description", and an array of "blocks".
    - Each block object MUST have "id" (unique string), "type" (from the valid list), "title", and a "layout" object ({x, y, w, h}).

2.  **Valid Block Types:**
    - You MUST use one of the following types for each block: ${validBlockTypes.join(", ")}.

3.  **Data Source (dataSource object):**
    - Every block needs a dataSource object. This is how blocks get their data.
    - The dataSource.type MUST be one of: "prometheus", "api", or "static".
    - **For "prometheus":**
        - You MUST invent a valid PromQL query in dataSource.params.query.
        - The query should be based on standard metrics like http_requests_total, process_cpu_seconds_total, process_resident_memory_bytes, etc.
        - Use labels like {job="<service-name>"} where service names can be auth-service, db-service, ai-service, etc.
        - For time-series blocks (like line-chart), you must also include "start", "end", and "step" in dataSource.params. For example: "start": "-1h", "end": "now", "step": "60s".
        - **Example:** To get the CPU usage of auth-service, you would create the query: rate(process_cpu_seconds_total{job="auth-service"}[5m]) * 100.
    - **For "api":**
        - Provide an API endpoint in dataSource.params.endpoint.
    - **For "static":**
        - Provide the data directly in dataSource.data. Use this for titles or static content.

4.  **Block Configuration (config object):**
    - Add a config object to each block based on its type.
    - line-chart, bar-chart: must include xKey, yKeys.
    - pie-chart: must include nameKey, dataKey.
    - metric, gauge: can include unit, precision, prefix, suffix.

**EXAMPLE OF A PERFECT BLOCK:**

\`\`\`json
{
  "id": "cpu-usage-chart",
  "type": "line-chart",
  "title": "CPU Usage - Auth Service",
  "layout": { "x": 0, "y": 0, "w": 6, "h": 4 },
  "dataSource": {
    "type": "prometheus",
    "params": {
      "query": "rate(process_cpu_seconds_total{job=\\"auth-service\\"}[5m]) * 100",
      "start": "-1h",
      "end": "now",
      "step": "60s"
    }
  },
  "config": {
    "xKey": "time",
    "yKeys": ["value"],
    "unit": "%"
  }
}
\`\`\`
`;

  if (templateType) {
    prompt += `\n**Template Hint:** The user mentioned wanting a '${templateType}' style dashboard.`;
  }

  if (complexity) {
    prompt += `\n**Complexity Level:** ${complexity}.`;
  }

  prompt += `\n\nNow, generate the complete dashboard JSON configuration based on the user's request. Your response must be a valid JSON object.`;

  return prompt;
};

// Fonction utilitaire pour enrichir un dashboard
const enrichDashboard = async (dashboardConfig, templateType) => {
  // Enrichissement avec des données par défaut si nécessaire
  if (!dashboardConfig.dashboard.metadata) {
    dashboardConfig.dashboard.metadata = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      templateType: templateType || 'custom'
    };
  }

  return dashboardConfig;
};

class DashboardController {
  /**
   * Génère un dashboard complet basé sur les besoins utilisateur
   * NOTE: Utilise responseFormat car on veut du JSON structuré pour la configuration
   */
  async generateDashboard(req, res, next) {
    try {
      const { requirements, templateType, complexity, context } = req.body;
      const userId = req.user?.id || 'anonymous-dev';

      logger.info({
        message: 'Génération de dashboard demandée',
        userId,
        templateType,
        complexity,
        requirementsLength: requirements.length
      });

      // Construction du prompt
      const prompt = buildDashboardPrompt(requirements, templateType, complexity, context);

      // Options spécifiques pour la génération de dashboard
      // Utilise responseFormat car on veut du JSON structuré
      const options = {
        responseFormat: { type: 'json_object' },
        temperature: 0.3, // Plus créatif pour la génération
        cacheTTL: 7200 // 2 heures de cache
      };

      // Appel au service OpenAI
      const aiResponse = await openAIService.callOpenAI(prompt, 'dashboard', options);

      // Validation du JSON généré
      let dashboardConfig;
      if (aiResponse.fallback) {
        dashboardConfig = JSON.parse(aiResponse.content);
      } else {
        const validation = DashboardController.validateDashboardStructure(aiResponse.content);
        if (!validation.valid) {
          logger.error('JSON généré invalide:', validation.error);
          throw new Error('Configuration dashboard générée invalide');
        }
        dashboardConfig = validation.data;
      }

      // Enrichissement avec des données contextuelles
      const enrichedDashboard = await enrichDashboard(dashboardConfig, templateType);

      // Métriques
      metrics.recordDashboardGeneration('success', templateType || 'custom');

      res.json({
        success: true,
        dashboard: enrichedDashboard.dashboard,
        recommendations: enrichedDashboard.recommendations,
        explanation: enrichedDashboard.explanation,
        metadata: {
          generated: true,
          templateType: templateType || 'custom',
          complexity: complexity || 'medium',
          cached: aiResponse.fallback ? false : !!aiResponse.cached,
          model: aiResponse.model,
          timestamp: aiResponse.timestamp
        }
      });

    } catch (error) {
      logger.error('Erreur génération dashboard:', error);
      metrics.recordDashboardGeneration('error', req.body.templateType || 'custom');
      next(error);
    }
  }

  /**
   * Suggère une disposition optimale pour un ensemble de métriques
   * NOTE: Utilise responseFormat car on veut du JSON structuré pour la disposition
   */
  async suggestLayout(req, res, next) {
    try {
      const { metrics: userMetrics, screenSize, priority } = req.body;

      const prompt = `Analyse ces métriques et suggère une disposition optimale au format JSON:

Métriques: ${JSON.stringify(userMetrics)}
Taille d'écran: ${screenSize || 'desktop'}
Priorité: ${priority || 'performance'}

Considère:
- La lisibilité et l'ergonomie
- La hiérarchie visuelle selon l'importance
- Les bonnes pratiques UX pour les dashboards
- L'optimisation pour la taille d'écran spécifiée

Retourne ta réponse au format JSON avec la structure suivante:
{
  "layout": {
    "type": "grid",
    "columns": 12,
    "blocks": [...]
  },
  "recommendations": [...]
}

Ta réponse doit être un objet JSON valide.`;

      // Utilise responseFormat car on veut du JSON structuré
      const aiResponse = await openAIService.callOpenAI(prompt, 'dashboard', {
        responseFormat: { type: 'json_object' },
        temperature: 0.4
      });

      let layoutSuggestion;
      if (aiResponse.fallback) {
        layoutSuggestion = DashboardController.getDefaultLayout(userMetrics);
      } else {
        layoutSuggestion = JSON.parse(aiResponse.content);
      }

      res.json({
        success: true,
        layout: layoutSuggestion,
        metadata: {
          cached: !!aiResponse.cached,
          screenSize: screenSize || 'desktop',
          priority: priority || 'performance'
        }
      });

    } catch (error) {
      logger.error('Erreur suggestion layout:', error);
      next(error);
    }
  }

  /**
   * Valide une configuration de dashboard
   * NOTE: Utilise responseFormat car on veut du JSON structuré pour la validation
   */
  async validateDashboard(req, res, next) {
    try {
      const { dashboardConfig } = req.body;
      const userId = req.user?.id || 'anonymous-dev';

      logger.info({
        message: 'Validation de dashboard demandée',
        userId,
        configSize: JSON.stringify(dashboardConfig).length
      });

      // Validation technique
      const technicalValidation = DashboardController.validateDashboardStructure(dashboardConfig);
      
      // Validation par IA
      const prompt = `Valide cette configuration de dashboard et fournis des recommandations d'amélioration au format JSON:

Configuration: ${JSON.stringify(dashboardConfig, null, 2)}

Analyse:
- Cohérence des blocs
- Optimisation de la disposition
- Pertinence des métriques
- Bonnes pratiques UX

Retourne ta réponse au format JSON avec la structure suivante:
{
  "valid": true,
  "recommendations": ["recommandation 1", "recommandation 2"],
  "warnings": ["avertissement 1"],
  "score": 85
}

Ta réponse doit être un objet JSON valide.`;

      // Utilise responseFormat car on veut du JSON structuré
      const aiResponse = await openAIService.callOpenAI(prompt, 'dashboardValidation', {
        responseFormat: { type: 'json_object' },
        temperature: 0.2
      });

      const aiValidation = aiResponse.fallback 
        ? DashboardController.getDefaultValidation() 
        : JSON.parse(aiResponse.content);

      const finalValidation = {
        ...technicalValidation,
        aiRecommendations: aiValidation.recommendations || [],
        complexity: DashboardController.calculateDashboardComplexity(dashboardConfig)
      };

      metrics.recordDashboardGeneration('validation', 'custom');

      res.json({
        success: true,
        validation: finalValidation,
        metadata: {
          cached: !!aiResponse.cached,
          model: aiResponse.model
        }
      });

    } catch (error) {
      logger.error('Erreur validation dashboard:', error);
      metrics.recordDashboardGeneration('validation_error', 'custom');
      next(error);
    }
  }

  /**
   * Optimise un dashboard existant
   * NOTE: Utilise responseFormat car on veut du JSON structuré pour la configuration optimisée
   */
  async optimizeDashboard(req, res, next) {
    try {
      const { currentDashboard, optimizationGoals } = req.body;
      const userId = req.user?.id || 'anonymous-dev';

      logger.info({
        message: 'Optimisation de dashboard demandée',
        userId,
        goals: optimizationGoals
      });

      const prompt = `Optimise cette configuration de dashboard selon les objectifs spécifiés au format JSON:

Dashboard actuel: ${JSON.stringify(currentDashboard, null, 2)}
Objectifs d'optimisation: ${JSON.stringify(optimizationGoals, null, 2)}

Fournis une version optimisée qui:
- Améliore la performance de chargement
- Optimise l'expérience utilisateur
- Améliore la lisibilité des données
- Respecte les objectifs spécifiés

Retourne la configuration optimisée au format JSON avec la structure suivante:
{
  "dashboard": {
    "title": "Dashboard Optimisé",
    "blocks": [...]
  },
  "optimizations": ["optimisation 1", "optimisation 2"]
}

Ta réponse doit être un objet JSON valide.`;

      // Utilise responseFormat car on veut du JSON structuré
      const aiResponse = await openAIService.callOpenAI(prompt, 'dashboardOptimization', {
        responseFormat: { type: 'json_object' },
        temperature: 0.3
      });

      const optimizedConfig = aiResponse.fallback 
        ? DashboardController.getDefaultOptimizedConfig(currentDashboard)
        : JSON.parse(aiResponse.content);

      metrics.recordDashboardGeneration('optimization', 'custom');

      res.json({
        success: true,
        optimizedDashboard: optimizedConfig,
        improvements: DashboardController.calculateImprovements(currentDashboard, optimizedConfig),
        metadata: {
          cached: !!aiResponse.cached,
          model: aiResponse.model
        }
      });

    } catch (error) {
      logger.error('Erreur optimisation dashboard:', error);
      metrics.recordDashboardGeneration('optimization_error', 'custom');
      next(error);
    }
  }

  /**
   * Suggère des templates de dashboard
   * NOTE: Utilise responseFormat car on veut du JSON structuré pour les suggestions
   */
  async suggestTemplates(req, res, next) {
    try {
      const { useCase, complexity, preferences } = req.body;
      const userId = req.user?.id || 'anonymous-dev';

      logger.info({
        message: 'Suggestion de templates demandée',
        userId,
        useCase,
        complexity
      });

      const prompt = `Suggère des templates de dashboard appropriés pour ce cas d'usage au format JSON:

Cas d'usage: ${useCase}
Complexité: ${complexity}
Préférences: ${JSON.stringify(preferences, null, 2)}

Fournis 3-5 suggestions de templates avec:
- Nom et description
- Cas d'usage approprié
- Complexité estimée
- Métriques clés incluses
- Avantages et inconvénients

Retourne ta réponse au format JSON avec la structure suivante:
{
  "templates": [
    {
      "name": "Template 1",
      "description": "Description du template",
      "useCase": "Cas d'usage",
      "complexity": "medium",
      "keyMetrics": ["metric1", "metric2"],
      "pros": ["avantage 1"],
      "cons": ["inconvénient 1"]
    }
  ]
}

Ta réponse doit être un objet JSON valide.`;

      // Utilise responseFormat car on veut du JSON structuré
      const aiResponse = await openAIService.callOpenAI(prompt, 'templateSuggestion', {
        responseFormat: { type: 'json_object' },
        temperature: 0.4
      });

      const suggestions = aiResponse.fallback 
        ? DashboardController.getDefaultTemplateSuggestions(useCase)
        : JSON.parse(aiResponse.content);

      res.json({
        success: true,
        suggestions: suggestions.templates || [],
        metadata: {
          useCase,
          complexity,
          cached: !!aiResponse.cached,
          model: aiResponse.model
        }
      });

    } catch (error) {
      logger.error('Erreur suggestion templates:', error);
      next(error);
    }
  }

  /**
   * Recommande des blocs pour un dashboard
   * NOTE: Utilise responseFormat car on veut du JSON structuré pour les recommandations
   */
  async recommendBlocks(req, res, next) {
    try {
      const { dashboardPurpose, existingBlocks, focus } = req.body;
      const userId = req.user?.id || 'anonymous-dev';

      logger.info({
        message: 'Recommandation de blocs demandée',
        userId,
        purpose: dashboardPurpose,
        focus
      });

      const prompt = `Recommandes des blocs supplémentaires pour ce dashboard au format JSON:

Objectif: ${dashboardPurpose}
Blocs existants: ${JSON.stringify(existingBlocks, null, 2)}
Focus: ${focus}

Suggère des blocs qui:
- Complètent les blocs existants
- Ajoutent de la valeur selon l'objectif
- Suivent les bonnes pratiques
- Sont cohérents avec le focus

Pour chaque bloc suggéré, fournis:
- Type de bloc
- Titre suggéré
- Métriques à afficher
- Justification

Retourne ta réponse au format JSON avec la structure suivante:
{
  "blocks": [
    {
      "type": "line-chart",
      "title": "Titre du bloc",
      "metrics": ["metric1", "metric2"],
      "justification": "Justification du bloc"
    }
  ]
}

Ta réponse doit être un objet JSON valide.`;

      const aiResponse = await openAIService.callOpenAI(prompt, 'blockRecommendation', {
        responseFormat: { type: 'json_object' },
        temperature: 0.3
      });

      const recommendations = aiResponse.fallback 
        ? DashboardController.getDefaultBlockRecommendations(dashboardPurpose)
        : JSON.parse(aiResponse.content);

      res.json({
        success: true,
        recommendations: recommendations.blocks || [],
        metadata: {
          purpose: dashboardPurpose,
          focus,
          cached: !!aiResponse.cached,
          model: aiResponse.model
        }
      });

    } catch (error) {
      logger.error('Erreur recommandation blocs:', error);
      next(error);
    }
  }

  /**
   * Récupère les templates de dashboard disponibles
   */
  async getTemplates(req, res, next) {
    try {
      const { category, complexity } = req.query;

      let templates = dashboardTemplates.getAll();

      // Filtrage par catégorie
      if (category) {
        templates = templates.filter(t => t.category === category);
      }

      // Filtrage par complexité
      if (complexity) {
        templates = templates.filter(t => t.complexity === complexity);
      }

      res.json({
        success: true,
        templates,
        categories: dashboardTemplates.getCategories(),
        totalCount: templates.length
      });

    } catch (error) {
      logger.error('Erreur récupération templates:', error);
      next(error);
    }
  }

  /**
   * Explique une configuration de dashboard complexe
   * NOTE: Cette méthode n'utilise PAS responseFormat car elle doit générer du texte explicatif,
   * pas du JSON structuré
   */
  async explainDashboard(req, res, next) {
    try {
      const { dashboardConfig, language } = req.body;

      const prompt = `Explique cette configuration de dashboard de manière claire et pédagogique${language === 'en' ? ' en anglais' : ' en français'}:

${JSON.stringify(dashboardConfig)}

Structure ton explication avec:
- Vue d'ensemble du dashboard
- Explication de chaque bloc/métrique
- Objectifs et cas d'usage
- Conseils d'utilisation

Fournis une explication détaillée et accessible.`;

      // Pas de responseFormat ici car on veut du texte libre, pas du JSON
      const aiResponse = await openAIService.callOpenAI(prompt, 'dashboard', {
        temperature: 0.5
      });

      res.json({
        success: true,
        explanation: aiResponse.content,
        language: language || 'fr',
        metadata: {
          cached: !!aiResponse.cached,
          complexity: DashboardController.calculateDashboardComplexity(dashboardConfig)
        }
      });

    } catch (error) {
      logger.error('Erreur explication dashboard:', error);
      next(error);
    }
  }

  // === MÉTHODES UTILITAIRES ===

  static getDefaultLayout(metrics) {
    // Layout par défaut simple
    return {
      layout: {
        type: 'grid',
        columns: 12,
        rows: 'auto',
        blocks: metrics.map((metric, index) => ({
          id: `metric-${index}`,
          position: {
            x: (index % 3) * 4,
            y: Math.floor(index / 3) * 4,
            w: 4,
            h: 3
          },
          metric: metric.name || metric
        }))
      },
      recommendations: ['Layout généré automatiquement', 'Personnalisez selon vos besoins']
    };
  }

  static getDefaultOptimizations() {
    return {
      optimizations: [
        'Réduire le nombre de métriques affichées simultanément',
        'Grouper les métriques similaires',
        'Utiliser des couleurs cohérentes',
        'Optimiser les intervalles de rafraîchissement'
      ],
      priority: 'high',
      estimatedImprovement: '15-30%'
    };
  }

  static extractValidationRecommendations(aiContent) {
    // Extraction simple des recommandations du texte IA
    const lines = aiContent.split('\n');
    return lines.filter(line => 
      line.includes('recommand') || 
      line.includes('conseil') || 
      line.includes('améliorer')
    ).slice(0, 5);
  }

  // Méthodes utilitaires privées
  /**
   * Valide la structure d'un dashboard
   */
  static validateDashboardStructure(config) {
    try {
      if (typeof config === 'string') {
        config = JSON.parse(config);
      }

      // Vérifications de base
      if (!config.dashboard) {
        return { valid: false, error: 'Clé "dashboard" manquante' };
      }

      const dashboard = config.dashboard;
      if (!dashboard.title || !dashboard.blocks || !Array.isArray(dashboard.blocks)) {
        return { valid: false, error: 'Structure dashboard invalide' };
      }

      // Validation des blocs
      for (const block of dashboard.blocks) {
        if (!block.id || !block.type || !block.title || !block.layout) {
          return { valid: false, error: `Bloc invalide: ${block.id || 'sans id'}` };
        }
      }

      return { valid: true, data: config };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Calcule la complexité d'un dashboard
   */
  static calculateDashboardComplexity(config) {
    const blocks = config.dashboard?.blocks || [];
    const blockCount = blocks.length;
    
    let complexity = 'simple';
    if (blockCount > 8) complexity = 'complex';
    else if (blockCount > 4) complexity = 'medium';
    
    return {
      level: complexity,
      score: blockCount,
      factors: {
        blockCount,
        hasCharts: blocks.some(b => ['line-chart', 'bar-chart', 'pie-chart'].includes(b.type)),
        hasRealTimeData: blocks.some(b => b.dataSource?.type === 'prometheus')
      }
    };
  }

  static getDefaultValidation() {
    return {
      recommendations: [
        'Ajoutez des titres descriptifs à tous les blocs',
        'Vérifiez la cohérence des métriques affichées',
        'Optimisez la disposition pour une meilleure lisibilité'
      ]
    };
  }

  static getDefaultOptimizedConfig(originalConfig) {
    return {
      ...originalConfig,
      dashboard: {
        ...originalConfig.dashboard,
        metadata: {
          ...originalConfig.dashboard.metadata,
          optimized: true,
          optimizedAt: new Date().toISOString()
        }
      }
    };
  }

  /**
   * Calcule les améliorations entre deux configurations
   */
  static calculateImprovements(original, optimized) {
    const originalComplexity = DashboardController.calculateDashboardComplexity(original);
    const optimizedComplexity = DashboardController.calculateDashboardComplexity(optimized);
    
    return {
      complexityReduction: originalComplexity.score - optimizedComplexity.score,
      performanceGain: 'estimated 15%',
      readabilityImprovement: 'estimated 25%',
      maintainabilityGain: 'estimated 20%'
    };
  }

  /**
   * Obtient des suggestions de templates par défaut
   */
  static getDefaultTemplateSuggestions(useCase) {
    const suggestions = {
      'Surveillance des performances d\'une application web': [
        {
          name: 'Performance Web',
          description: 'Dashboard optimisé pour surveiller les performances web',
          complexity: 'medium',
          blocks: ['cpu-usage', 'memory-usage', 'response-time', 'error-rate']
        }
      ],
      'Monitoring d\'infrastructure': [
        {
          name: 'Infrastructure Overview',
          description: 'Vue d\'ensemble de l\'infrastructure',
          complexity: 'simple',
          blocks: ['system-status', 'resource-usage', 'service-health']
        }
      ]
    };

    return suggestions[useCase] || [
      {
        name: 'Dashboard Générique',
        description: 'Configuration de base adaptable',
        complexity: 'simple',
        blocks: ['metric', 'chart', 'status']
      }
    ];
  }

  /**
   * Obtient des recommandations de blocs par défaut
   */
  static getDefaultBlockRecommendations(purpose) {
    const recommendations = {
      'Surveillance des performances d\'une API': [
        {
          type: 'line-chart',
          title: 'Temps de réponse',
          description: 'Graphique des temps de réponse de l\'API'
        },
        {
          type: 'metric',
          title: 'Taux d\'erreur',
          description: 'Pourcentage d\'erreurs HTTP'
        },
        {
          type: 'gauge',
          title: 'CPU Usage',
          description: 'Utilisation CPU du service'
        }
      ]
    };

    return recommendations[purpose] || [
      {
        type: 'metric',
        title: 'Métrique Principale',
        description: 'Métrique clé pour le monitoring'
      }
    ];
  }
}

module.exports = new DashboardController(); 