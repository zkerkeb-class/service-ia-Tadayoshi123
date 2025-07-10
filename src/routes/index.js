// src/routes/index.js
// Routes principales du service IA

const express = require('express');
const dashboardRoutes = require('./dashboard.routes');
const opsAssistantRoutes = require('./ops-assistant.routes');
const cacheRoutes = require('./cache.routes');
const healthRoutes = require('./health.routes');

const router = express.Router();

// Routes de santé
router.use('/health', healthRoutes);

// Routes de gestion du cache
router.use('/cache', cacheRoutes);

// Routes pour l'agent générateur de dashboards
router.use('/dashboard', dashboardRoutes);

// Routes pour l'assistant opérationnel
router.use('/ops-assistant', opsAssistantRoutes);

// Route d'information générale du service
router.get('/', (req, res) => {
  res.json({
    service: 'SupervIA AI Service',
    version: '1.0.0',
    description: 'Service IA double pour génération de dashboards et assistance supervision',
    endpoints: {
      'dashboard': '/api/dashboard',
      'ops-assistant': '/api/ops-assistant',
      'health': '/api/health',
      'cache': '/api/cache'
    },
    agents: {
      'dashboard-generator': {
        description: 'Génère des configurations de dashboard et conseils CMS',
        model: 'gpt-4o-mini'
      },
      'ops-assistant': {
        description: 'Assistant expert infrastructure - interprète métriques et alertes',
        model: 'gpt-4o-mini'
      }
    },
    documentation: '/api-docs'
  });
});

module.exports = router; 