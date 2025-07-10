// src/middlewares/metrics.js
// Middleware pour les métriques Prometheus du service IA

const promClient = require('prom-client');

// Compteurs personnalisés pour le service IA
const aiCallsTotal = new promClient.Counter({
  name: 'ai_calls_total',
  help: 'Nombre total d\'appels aux agents IA',
  labelNames: ['agent_type', 'status', 'cached']
});

const aiResponseTime = new promClient.Histogram({
  name: 'ai_response_time_seconds',
  help: 'Temps de réponse des agents IA',
  labelNames: ['agent_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

const aiCacheHitRate = new promClient.Gauge({
  name: 'ai_cache_hit_rate',
  help: 'Taux de hit du cache IA',
  labelNames: ['agent_type']
});

const dashboardGenerations = new promClient.Counter({
  name: 'dashboard_generations_total',
  help: 'Nombre total de dashboards générés',
  labelNames: ['status', 'template_used']
});

const opsAssistantQueries = new promClient.Counter({
  name: 'ops_assistant_queries_total',
  help: 'Nombre total de requêtes à l\'assistant opérationnel',
  labelNames: ['query_type', 'status']
});

// Fonctions utilitaires pour incrémenter les métriques
const metrics = {
  recordAICall: (agentType, status, cached = false) => {
    aiCallsTotal.labels(agentType, status, cached ? 'true' : 'false').inc();
  },
  
  recordResponseTime: (agentType, duration) => {
    aiResponseTime.labels(agentType).observe(duration);
  },
  
  updateCacheHitRate: (agentType, hitRate) => {
    aiCacheHitRate.labels(agentType).set(hitRate);
  },
  
  recordDashboardGeneration: (status, templateUsed = 'custom') => {
    dashboardGenerations.labels(status, templateUsed).inc();
  },
  
  recordOpsQuery: (queryType, status) => {
    opsAssistantQueries.labels(queryType, status).inc();
  }
};

module.exports = { metrics }; 