// src/controllers/ops-assistant.controller.js
// Contrôleur pour l'assistant opérationnel IA

const openAIService = require('../services/openai.service');
const logger = require('../config/logger');
const { metrics } = require('../middlewares/metrics');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { tools, availableTools } = require('../services/tool.service');

const METRICS_SERVICE_URL = process.env.METRICS_SERVICE_URL || 'http://localhost:3003';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3004'; // Added for dashboard generation

// Stockage global des sessions de chat
const chatSessions = new Map();

// ===== FONCTIONS DE PROMPT MANQUANTES =====

const buildMetricsAnalysisPrompt = (metrics, timeRange, severity) => {
  return `Analyse les métriques système suivantes pour la période ${timeRange || '24h'}:

Métriques disponibles: ${JSON.stringify(metrics)}

Fournis une analyse structurée avec:
- **Résumé exécutif** des performances
- **Diagnostic** des problèmes potentiels
- **Recommandations** d'optimisation
- **Actions prioritaires** à entreprendre

Niveau de détail: ${severity || 'info'}`;
};

const buildDiagnosticPrompt = (symptoms, urgency, affectedServices) => {
  return `Diagnostique le problème suivant:

**Symptômes:** ${symptoms}
**Urgence:** ${urgency || 'medium'}
**Services affectés:** ${affectedServices?.join(', ') || 'inconnus'}

Fournis:
- **Diagnostic probable** avec niveau de confiance
- **Causes possibles** par ordre de probabilité
- **Actions de résolution** immédiates
- **Actions préventives** pour éviter la récurrence`;
};

const buildAlertSuggestionPrompt = (context, metrics, currentAlerts) => {
  return `Suggère des alertes pour le contexte suivant:

**Contexte:** ${context}
**Métriques disponibles:** ${JSON.stringify(metrics)}
**Alertes actuelles:** ${JSON.stringify(currentAlerts)}

Propose:
- **Alertes critiques** pour les seuils importants
- **Alertes préventives** pour anticiper les problèmes
- **Configuration** des seuils recommandés`;
};

const buildCapacityPlanningPrompt = (currentUsage, growthRate, timeHorizon) => {
  return `Planifie la capacité pour:

**Usage actuel:** ${JSON.stringify(currentUsage)}
**Taux de croissance:** ${growthRate || '10%'}
**Horizon temporel:** ${timeHorizon || '6 mois'}

Fournis:
- **Analyse des tendances** actuelles
- **Projections** de croissance
- **Recommandations** de scaling
- **Risques** à surveiller`;
};

const buildPerformanceAnalysisPrompt = (metrics, timeRange, focus) => {
  return `Analyse les performances avec focus sur ${focus || 'général'}:

**Métriques:** ${JSON.stringify(metrics)}
**Période:** ${timeRange || '24h'}

Fournis:
- **État actuel** des performances
- **Corrélations** entre métriques
- **Optimisations** possibles
- **Monitoring** recommandé`;
};

const buildMetricExplanationPrompt = (metricName, language) => {
  return `Explique la métrique "${metricName}" en ${language || 'français'}:

Fournis:
- **Définition** claire et simple
- **Signification** dans le contexte monitoring
- **Seuils** typiques (normal, warning, critical)
- **Actions** à prendre selon les valeurs`;
};

// ===== FONCTIONS UTILITAIRES =====

const buildChatPrompt = (history) => {
  const systemPrompt = {
    role: 'system',
    content: `You are SupervIA, an expert-level AI operations assistant for a microservices monitoring platform.

## Your Capabilities
You have access to powerful tools that let you:
- Query real-time metrics from Prometheus
- Get historical performance data
- Check service health status
- Monitor active alerts
- Generate custom dashboards
- Perform automated diagnostics
- Analyze system performance

## Your Personality
- You are helpful, professional, and technically precise
- You speak in clear, actionable terms
- You provide context and explanations for your findings
- You prioritize critical issues and suggest solutions
- You can work in both French and English

## How to Use Your Tools
1. **For current metrics**: Use \`prometheusQuery\` for instant values (CPU, memory, error rates, etc.)
2. **For trends and charts**: Use \`prometheusRangeQuery\` for time-series analysis
3. **For system status**: Use \`getServiceHealth\` to check if services are running
4. **For issues**: Use \`getActiveAlerts\` to see what needs attention
5. **For dashboards**: Use \`generateDashboard\` when users want to create monitoring views
6. **For analysis**: Use \`analyzePerformance\` for comprehensive performance insights
7. **For troubleshooting**: Use \`diagnoseIssue\` when users report problems

## Response Strategy
- ALWAYS use tools when you need data. Don't guess or use outdated information
- If a user asks about performance, check actual metrics
- If they report issues, investigate the current system state
- If they want dashboards, offer to generate them
- Provide actionable insights and recommendations
- When appropriate, suggest follow-up actions or monitoring

## Common Scenarios
- **"How is the system performing?"** → Check health, get key metrics, analyze trends
- **"I'm seeing errors"** → Check alerts, query error rates, diagnose issues
- **"Create a dashboard for X"** → Generate a custom dashboard configuration
- **"What's wrong with service Y?"** → Check health, analyze performance, look for alerts
- **"Show me trends"** → Use range queries to get historical data

Remember: You are the eyes and brain of the monitoring system. Use your tools to provide accurate, real-time insights.`
  };
  return [systemPrompt, ...history];
};

const parseAnalysisResponse = (content) => {
  // Structure basique de l'analyse
  return {
    summary: extractSection(content, 'Analyse') || 'Analyse en cours...',
    diagnosis: extractSection(content, 'Diagnostic') || 'Diagnostic disponible',
    recommendations: extractListSection(content, 'Recommandations') || [],
    actions: extractListSection(content, 'Actions') || [],
    rawContent: content
  };
};

const parseAlertSuggestions = (content) => {
  return {
    critical: extractListSection(content, 'Alertes Critiques') || [],
    preventive: extractListSection(content, 'Alertes Préventives') || [],
    configuration: extractSection(content, 'Configuration') || '',
    rawContent: content
  };
};

const parseCapacityPlan = (content) => {
  return {
    trends: extractSection(content, 'Tendances') || '',
    projections: extractSection(content, 'Projections') || '',
    recommendations: extractListSection(content, 'Recommandations') || [],
    risks: extractListSection(content, 'Risques') || [],
    rawContent: content
  };
};

const parsePerformanceAnalysis = (content) => {
  return {
    currentState: extractSection(content, 'État Actuel') || '',
    correlations: extractSection(content, 'Corrélations') || '',
    optimizations: extractListSection(content, 'Optimisations') || [],
    monitoring: extractListSection(content, 'Monitoring') || [],
    rawContent: content
  };
};

const extractSection = (content, sectionName) => {
  const regex = new RegExp(`###?\\s*${sectionName}[\\s\\S]*?(?=###|$)`, 'i');
  const match = content.match(regex);
  return match ? match[0].replace(/###?\s*\w+/, '').trim() : null;
};

const extractListSection = (content, sectionName) => {
  const section = extractSection(content, sectionName);
  if (!section) return [];
  
  return section
    .split('\n')
    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
    .map(line => line.replace(/^[\s\-•]+/, '').trim())
    .filter(line => line.length > 0);
};

const extractSeverity = (content) => {
  const severityIndicators = {
    'critique': 'critical',
    'urgent': 'high', 
    'important': 'medium',
    'mineur': 'low'
  };

  for (const [keyword, level] of Object.entries(severityIndicators)) {
    if (content.toLowerCase().includes(keyword)) {
      return level;
    }
  }
  return 'medium';
};

// Classe principale
class OpsAssistantController {
  constructor() {
    logger.debug('OpsAssistantController initialisé');
  }

  /**
   * Analyse des métriques système et recommandations
   */
  async analyzeMetrics(req, res, next) {
    try {
      const { timeRange, severity } = req.body;
      const userId = req.user?.id || 'anonymous-dev';

      // Récupération dynamique des métriques
      let availableMetrics = [];
      try {
        const metricsResponse = await axios.get(`${METRICS_SERVICE_URL}/api/metrics/list`);
        if (metricsResponse.data && metricsResponse.data.metrics) {
          availableMetrics = metricsResponse.data.metrics;
        }
      } catch (error) {
        logger.warn('Impossible de récupérer les métriques pour l\'analyse. L\'analyse pourrait être incomplète.', { error: error.message });
        // Ne pas bloquer si le service de métriques est indisponible
      }

      logger.info({
        message: 'Analyse de métriques demandée',
        userId,
        metricsCount: availableMetrics.length,
        timeRange,
        severity
      });

      const prompt = buildMetricsAnalysisPrompt(availableMetrics, timeRange, severity);

      const aiResponse = await openAIService.callOpenAI(prompt, 'opsAssistant', {
        temperature: 0.2, // Factuel pour l'analyse
        cacheTTL: 1800 // 30 minutes
      });

      // Structuration de la réponse
      const analysis = parseAnalysisResponse(aiResponse.content);

      // Métriques
      if (metrics && typeof metrics.recordOpsQuery === 'function') {
      metrics.recordOpsQuery('metrics_analysis', 'success');
      }

      res.json({
        success: true,
        analysis,
        metadata: {
          analyzedMetrics: availableMetrics.length,
          timeRange: timeRange || '24h',
          severity: severity || 'info',
          cached: !!aiResponse.cached,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Erreur analyse métriques:', error);
      if (metrics && typeof metrics.recordOpsQuery === 'function') {
      metrics.recordOpsQuery('metrics_analysis', 'error');
      }
      next(error);
    }
  }

  /**
   * Diagnostic d'un problème système
   */
  async diagnoseIssue(req, res, next) {
    try {
      const { symptoms, affectedServices, errorLogs, urgency } = req.body;
      const userId = req.user?.id || 'anonymous-dev';

      logger.info({
        message: 'Diagnostic de problème demandé',
        userId,
        urgency,
        symptomsLength: symptoms.length,
        affectedServicesCount: affectedServices?.length || 0
      });

      const prompt = buildDiagnosticPrompt(symptoms, urgency, affectedServices);

      const aiResponse = await openAIService.callOpenAI(prompt, 'opsAssistant', {
        temperature: 0.1, // Très factuel pour le diagnostic
        cacheTTL: 900 // 15 minutes pour les diagnostics
      });

      // Métriques
      if (metrics && typeof metrics.recordOpsQuery === 'function') {
      metrics.recordOpsQuery('issue_diagnosis', 'success');
      }

      res.json({
        success: true,
        diagnosis: {
          summary: extractSection(aiResponse.content, 'Analyse des Symptômes') || 'Analyse en cours...',
          causes: extractListSection(aiResponse.content, 'Hypothèses') || [],
          actions: extractListSection(aiResponse.content, 'Plan d\'Action') || [],
          rawContent: aiResponse.content
        },
        metadata: {
          urgency: urgency || 'medium',
          affectedServices: affectedServices?.length || 0,
          hasErrorLogs: !!(errorLogs && errorLogs.length > 0),
          cached: !!aiResponse.cached,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Erreur diagnostic:', error);
      if (metrics && typeof metrics.recordOpsQuery === 'function') {
      metrics.recordOpsQuery('issue_diagnosis', 'error');
      }
      next(error);
    }
  }

  /**
   * Suggère des règles d'alertes basées sur les métriques
   */
  async suggestAlerts(req, res, next) {
    try {
      const { metrics: systemMetrics, baseline, sensitivity } = req.body;

      const prompt = buildAlertSuggestionPrompt('Contexte système', systemMetrics, []);

      const aiResponse = await openAIService.callOpenAI(prompt, 'opsAssistant', {
        temperature: 0.3,
        cacheTTL: 3600 // 1 heure
      });

      const alertSuggestions = parseAlertSuggestions(aiResponse.content);

      if (metrics && typeof metrics.recordOpsQuery === 'function') {
      metrics.recordOpsQuery('alert_suggestions', 'success');
      }

      res.json({
        success: true,
        alerts: alertSuggestions,
        metadata: {
          metricsAnalyzed: systemMetrics.length,
          sensitivity: sensitivity || 'medium',
          hasBaseline: !!baseline,
          cached: !!aiResponse.cached
        }
      });

    } catch (error) {
      logger.error('Erreur suggestions alertes:', error);
      if (metrics && typeof metrics.recordOpsQuery === 'function') {
      metrics.recordOpsQuery('alert_suggestions', 'error');
      }
      next(error);
    }
  }

  /**
   * Analyse de planification de capacité
   */
  async capacityPlanning(req, res, next) {
    try {
      const { historicalData, growthRate, horizon } = req.body;

      const prompt = buildCapacityPlanningPrompt(historicalData, growthRate, horizon);

      const aiResponse = await openAIService.callOpenAI(prompt, 'opsAssistant', {
        temperature: 0.2,
        cacheTTL: 7200 // 2 heures
      });

      const capacityPlan = parseCapacityPlan(aiResponse.content);

      if (metrics && typeof metrics.recordOpsQuery === 'function') {
      metrics.recordOpsQuery('capacity_planning', 'success');
      }

      res.json({
        success: true,
        capacityPlan,
        metadata: {
          dataPoints: historicalData.length,
          growthRate: growthRate || 'auto-detected',
          horizon: horizon || '6months',
          cached: !!aiResponse.cached
        }
      });

    } catch (error) {
      logger.error('Erreur planification capacité:', error);
      if (metrics && typeof metrics.recordOpsQuery === 'function') {
      metrics.recordOpsQuery('capacity_planning', 'error');
      }
      next(error);
    }
  }

  /**
   * Analyse de performance détaillée
   */
  async performanceAnalysis(req, res, next) {
    try {
      const { systemMetrics, applicationMetrics, analysisType } = req.body;

      const prompt = buildPerformanceAnalysisPrompt(systemMetrics, '24h', analysisType);

      const aiResponse = await openAIService.callOpenAI(prompt, 'opsAssistant', {
        temperature: 0.2,
        cacheTTL: 1800 // 30 minutes
      });

      const performanceAnalysis = parsePerformanceAnalysis(aiResponse.content);

      if (metrics && typeof metrics.recordOpsQuery === 'function') {
      metrics.recordOpsQuery('performance_analysis', 'success');
      }

      res.json({
        success: true,
        analysis: performanceAnalysis,
        metadata: {
          analysisType: analysisType || 'realtime',
          hasApplicationMetrics: !!applicationMetrics,
          cached: !!aiResponse.cached
        }
      });

    } catch (error) {
      logger.error('Erreur analyse performance:', error);
      if (metrics && typeof metrics.recordOpsQuery === 'function') {
      metrics.recordOpsQuery('performance_analysis', 'error');
      }
      next(error);
    }
  }

  /**
   * Explique une métrique spécifique
   */
  async explainMetric(req, res, next) {
    try {
      const { metricName, value, context, language } = req.body;
      const userId = req.user?.id || 'anonymous-dev';

      logger.info({
        message: 'Explication de métrique demandée',
        userId,
        metricName,
        language
      });

      const prompt = buildMetricExplanationPrompt(metricName, language);

      const aiResponse = await openAIService.callOpenAI(prompt, 'metricExplanation', {
        temperature: 0.3,
        cacheTTL: 3600 // 1 heure pour les explications
      });

      if (metrics && typeof metrics.recordOpsQuery === 'function') {
        metrics.recordOpsQuery('explainMetric', 'success');
      }

      res.json({
        success: true,
        explanation: aiResponse.content,
        metadata: {
          metricName,
          language: language || 'fr',
          cached: !!aiResponse.cached,
          model: aiResponse.model
        }
      });

    } catch (error) {
      logger.error('Erreur explication métrique:', error);
      if (metrics && typeof metrics.recordOpsQuery === 'function') {
        metrics.recordOpsQuery('explainMetric', 'error');
      }
      next(error);
    }
  }

  /**
   * Vérification rapide du statut système
   */
  async quickStatus(req, res, next) {
    try {
      const { includeMetrics = true, includeAlerts = true } = req.body;
      const userId = req.user?.id || 'anonymous-dev';

      logger.info({
        message: 'Vérification rapide du statut système',
        userId,
        includeMetrics,
        includeAlerts
      });

      // Construire un prompt pour une vérification rapide
      const prompt = `Effectue une vérification rapide de l'état du système. 
${includeMetrics ? 'Inclus les métriques de performance clés.' : ''} 
${includeAlerts ? 'Vérifie les alertes actives.' : ''} 
Fournis un résumé bref et professionnel.`;

      // Appel standard sans tools pour éviter les erreurs
      const aiResponse = await openAIService.callOpenAI(prompt, `quick-status-${userId}`, {
        temperature: 0.1
      });

      if (metrics && typeof metrics.recordOpsQuery === 'function') {
        metrics.recordOpsQuery('quick_status', 'success');
      }

      res.json({
        success: true,
        status: aiResponse.content,
        toolsUsed: [], // Pas d'outils utilisés dans cette version simplifiée
        metadata: {
          includeMetrics,
          includeAlerts,
          cached: !!aiResponse.cached
        }
      });

    } catch (error) {
      logger.error('Erreur vérification rapide:', error);
      if (metrics && typeof metrics.recordOpsQuery === 'function') {
        metrics.recordOpsQuery('quick_status', 'error');
      }
      next(error);
    }
  }

  /**
   * Diagnostic automatique du système
   */
  async autoDiagnose(req, res, next) {
    try {
      const { focus = 'all', timeRange = '24h' } = req.body;
      const userId = req.user?.id || 'anonymous-dev';

      logger.info({
        message: 'Diagnostic automatique demandé',
        userId,
        focus,
        timeRange
      });

      const prompt = `Effectue un diagnostic automatique du système avec focus sur: ${focus}. 
Analyse les dernières ${timeRange}. 
Fournis des résultats détaillés, identifie les problèmes et suggère des solutions.`;

      // Appel standard sans tools pour éviter les erreurs
      const aiResponse = await openAIService.callOpenAI(prompt, `auto-diagnose-${userId}`, {
        temperature: 0.1
      });

      if (metrics && typeof metrics.recordOpsQuery === 'function') {
        metrics.recordOpsQuery('auto_diagnosis', 'success');
      }

      res.json({
        success: true,
        diagnosis: aiResponse.content,
        toolsUsed: [], // Pas d'outils utilisés dans cette version simplifiée
        metadata: {
          focus,
          timeRange,
          cached: !!aiResponse.cached
        }
      });

    } catch (error) {
      logger.error('Erreur diagnostic automatique:', error);
      if (metrics && typeof metrics.recordOpsQuery === 'function') {
        metrics.recordOpsQuery('auto_diagnosis', 'error');
      }
      next(error);
    }
  }

  /**
   * Insights de performance automatisés
   */
  async performanceInsights(req, res, next) {
    try {
      const { service, timeRange = '24h', analysisType = 'overview' } = req.body;
      const userId = req.user?.id || 'anonymous-dev';

      logger.info({
        message: 'Insights de performance demandés',
        userId,
        service,
        timeRange,
        analysisType
      });

      // Simplification: ne pas utiliser l'outil analyzePerformance directement
      const prompt = `Analyse les performances du service ${service} sur les dernières ${timeRange} 
et fournis des insights au format ${analysisType}.
Inclus des recommandations concrètes et des points d'attention.`;

      const aiResponse = await openAIService.callOpenAI(prompt, `performance-insights-${userId}`, {
        temperature: 0.2
      });

      if (metrics && typeof metrics.recordOpsQuery === 'function') {
        metrics.recordOpsQuery('performance_insights', 'success');
      }

      res.json({
        success: true,
        insights: aiResponse.content,
        // Pas de rawData car nous n'utilisons pas l'outil analyzePerformance
        metadata: {
          service,
          timeRange,
          analysisType,
          cached: !!aiResponse.cached
        }
      });

    } catch (error) {
      logger.error('Erreur insights de performance:', error);
      if (metrics && typeof metrics.recordOpsQuery === 'function') {
        metrics.recordOpsQuery('performance_insights', 'error');
      }
      next(error);
    }
  }

  /**
   * Génération intelligente de dashboard
   */
  async smartDashboard(req, res, next) {
    try {
      const { purpose, focus = 'overview', complexity = 'medium' } = req.body;
      const userId = req.user?.id || 'anonymous-dev';

      logger.info({
        message: 'Génération intelligente de dashboard',
        userId,
        purpose,
        focus,
        complexity
      });

      // Appel direct à l'API de génération de dashboard au lieu d'utiliser l'outil
      try {
        // Essayer d'appeler directement l'API dashboard
        const dashboardResponse = await axios.post(`${AI_SERVICE_URL}/api/dashboard-agent/generate`, {
          requirements: purpose,
          templateType: focus,
          complexity
        });
        
        if (dashboardResponse.data && dashboardResponse.data.success) {
          if (metrics && typeof metrics.recordOpsQuery === 'function') {
            metrics.recordOpsQuery('smart_dashboard', 'success');
          }
          
          return res.json({
            success: true,
            dashboard: dashboardResponse.data.dashboard,
            metadata: {
              purpose,
              focus,
              complexity,
              generated: true
            }
          });
        }
      } catch (apiError) {
        logger.warn(`Erreur appel API dashboard, fallback vers génération texte: ${apiError.message}`);
        // Continuer avec le fallback en cas d'erreur
      }

      // Fallback: générer une description textuelle du dashboard
      const prompt = `Décris un dashboard pour "${purpose}" avec focus sur "${focus}" 
et complexité "${complexity}". Explique quels blocs et métriques seraient utiles.`;

      const aiResponse = await openAIService.callOpenAI(prompt, `dashboard-${userId}`, {
        temperature: 0.3
      });

      if (metrics && typeof metrics.recordOpsQuery === 'function') {
        metrics.recordOpsQuery('smart_dashboard', 'success');
      }

      res.json({
        success: true,
        description: aiResponse.content,
        metadata: {
          purpose,
          focus,
          complexity,
          generated: false,
          fallback: true
        }
      });

    } catch (error) {
      logger.error('Erreur génération dashboard intelligent:', error);
      if (metrics && typeof metrics.recordOpsQuery === 'function') {
        metrics.recordOpsQuery('smart_dashboard', 'error');
      }
      next(error);
    }
  }

  /**
   * Interface de chat avec l'assistant ops
   */
  async chat(req, res, next) {
    try {
      const { sessionId, message, context } = req.body;
      const userId = req.user?.id || 'anonymous-dev';
      const currentSessionId = sessionId || uuidv4();

      if (!chatSessions.has(currentSessionId)) {
        chatSessions.set(currentSessionId, []);
      }
      const history = chatSessions.get(currentSessionId);

      history.push({ role: 'user', content: message });

      const prompt = buildChatPrompt(history);

      const options = {
        temperature: 0.1,
        tools: tools,
        toolChoice: 'auto',
      };

      let responseMessage = await openAIService.callOpenAI(prompt, `chat-${userId}`, options);

      const maxToolCalls = 5;
      let executionCount = 0;

      // Boucle tant que l'IA demande des outils
      while (
        responseMessage.tool_calls &&
        responseMessage.tool_calls.length > 0 &&
        executionCount < maxToolCalls
      ) {
        executionCount++;
        logger.info(`[Appel Outil #${executionCount}] L'IA demande les outils : ${responseMessage.tool_calls.map(t => t.function.name).join(', ')}`, { userId, sessionId: currentSessionId });

        // Ajoute la demande de l'assistant à l'historique
        history.push({ role: 'assistant', tool_calls: responseMessage.tool_calls });

        // Exécute les outils
        const toolPromises = responseMessage.tool_calls.map(async (toolCall) => {
          const functionName = toolCall.function.name;
          const functionToCall = availableTools[functionName];
          if (functionToCall) {
            try {
              const functionArgs = JSON.parse(toolCall.function.arguments);
              const output = await functionToCall(functionArgs);
              return {
                tool_call_id: toolCall.id,
                role: 'tool',
                name: functionName,
                content: typeof output === 'string' ? output : JSON.stringify(output),
              };
            } catch (error) {
              logger.error(`Erreur lors de l'exécution de l'outil ${functionName}:`, error);
              return {
                tool_call_id: toolCall.id,
                role: 'tool',
                name: functionName,
                content: `Erreur: ${error.message}`
              };
            }
          }
          return {
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: `Erreur: outil ${functionName} non trouvé`
          };
        });

        const toolOutputs = await Promise.all(toolPromises);
        toolOutputs.forEach(output => history.push(output));
        
        // Appelle à nouveau OpenAI avec les résultats des outils
        const nextPrompt = buildChatPrompt(history);
        responseMessage = await openAIService.callOpenAI(nextPrompt, `chat-${userId}`, options);
      }

      if (executionCount >= maxToolCalls) {
        logger.warn('Nombre maximum d\'appels d\'outils atteint. Retour d\'un message d\'erreur.', { userId, sessionId: currentSessionId });
        responseMessage.content = "J'ai rencontré des difficultés techniques pour répondre à votre demande. Pourriez-vous la reformuler ? ";
      }

      if (!responseMessage || !responseMessage.content) {
        logger.error('Réponse finale d\'OpenAI invalide après les appels d\'outils.', { service: 'ai-service', response: responseMessage });
        throw new Error('Réponse OpenAI invalide');
      }

      history.push({ role: 'assistant', content: responseMessage.content });
      
      chatSessions.set(currentSessionId, history);

      const assistantMessageForFrontend = {
        id: uuidv4(),
        role: 'assistant',
        content: responseMessage.content,
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        sessionId: currentSessionId,
        message: assistantMessageForFrontend,
        metadata: {
          messageCount: Math.ceil(history.length / 2),
          hasContext: !!context,
          cached: !!responseMessage.cached,
          toolsUsedCount: executionCount
        }
      });

    } catch (error) {
      logger.error('Erreur dans le chat de l\'assistant:', error);
      if (metrics && typeof metrics.recordChatInteraction === 'function') {
        metrics.recordChatInteraction('error');
      }
      next(error);
    }
  }
}

// Créer une instance unique du contrôleur
const opsAssistantController = new OpsAssistantController();

// Exporter l'instance
module.exports = opsAssistantController; 