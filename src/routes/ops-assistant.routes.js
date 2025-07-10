// src/routes/ops-assistant.routes.js
// Routes pour l'assistant opérationnel IA

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const OpsAssistantController = require('../controllers/ops-assistant.controller');
const { authMiddleware, optionalAuth } = require('../middlewares/auth');

const router = express.Router();

// Middleware de validation des erreurs
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erreurs de validation',
      errors: errors.array()
    });
  }
  next();
};

// Pour le développement, utiliser optionalAuth au lieu de authMiddleware
// pour permettre les tests sans authentification
const authMiddlewareToUse = process.env.NODE_ENV === 'development' ? optionalAuth : authMiddleware;

/**
 * @swagger
 * tags:
 *   name: Ops Assistant
 *   description: Assistant IA pour la supervision, le diagnostic et l'optimisation des opérations.
 */

/**
 * @swagger
 * /api/ops-assistant/analyze-metrics:
 *   post:
 *     summary: Analyse un ensemble de métriques
 *     tags: [Ops Assistant]
 *     description: Fournit une analyse, un diagnostic et des recommandations basés sur un ensemble de métriques système.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: "Tableau d'objets de métriques à analyser."
 *               timeRange:
 *                 type: string
 *                 enum: [1h, 6h, 24h, 7d, 30d]
 *                 description: "Plage temporelle de l'analyse."
 *                 example: "24h"
 *               severity:
 *                 type: string
 *                 enum: [info, warning, error, critical]
 *                 description: "Seuil de sévérité pour l'analyse."
 *                 example: "warning"
 *     responses:
 *       200:
 *         description: Analyse des métriques réussie.
 *       400:
 *         description: Erreurs de validation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur interne du serveur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/analyze-metrics',
  authMiddlewareToUse,
  [
    body('metrics')
      .isArray({ min: 1 })
      .withMessage('Au moins une métrique est requise'),
    body('timeRange')
      .optional()
      .isIn(['1h', '6h', '24h', '7d', '30d'])
      .withMessage('Plage temporelle invalide'),
    body('severity')
      .optional()
      .isIn(['info', 'warning', 'error', 'critical'])
      .withMessage('Niveau de sévérité invalide')
  ],
  handleValidationErrors,
  OpsAssistantController.analyzeMetrics
);

/**
 * @swagger
 * /api/ops-assistant/diagnose-issue:
 *   post:
 *     summary: Diagnostique un problème système
 *     tags: [Ops Assistant]
 *     description: Analyse les symptômes, les services affectés et les logs pour diagnostiquer un problème.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symptoms:
 *                 type: string
 *                 description: "Description des symptômes observés."
 *                 example: "Le service de paiement répond avec des erreurs 503."
 *               affectedServices:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Liste des services impactés."
 *                 example: ["payment-service", "notification-service"]
 *               errorLogs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Extrait des logs d'erreurs pertinents."
 *               urgency:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 description: "Niveau d'urgence du problème."
 *                 example: "high"
 *     responses:
 *       200:
 *         description: Diagnostic généré avec succès.
 *       400:
 *         description: Erreurs de validation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur interne du serveur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/diagnose-issue',
  authMiddlewareToUse,
  [
    body('symptoms')
      .notEmpty()
      .withMessage('Description des symptômes requise')
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description entre 10 et 1000 caractères'),
    body('affectedServices')
      .optional()
      .isArray()
      .withMessage('Services affectés doivent être un tableau'),
    body('errorLogs')
      .optional()
      .isArray()
      .withMessage('Logs d\'erreur doivent être un tableau'),
    body('urgency')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Niveau d\'urgence invalide')
  ],
  handleValidationErrors,
  OpsAssistantController.diagnoseIssue
);

/**
 * @swagger
 * /api/ops-assistant/suggest-alerts:
 *   post:
 *     summary: Suggère des règles d'alertes
 *     tags: [Ops Assistant]
 *     description: Propose des règles d'alertes intelligentes basées sur un ensemble de métriques et une baseline optionnelle.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: "Les métriques pour lesquelles suggérer des alertes."
 *               baseline:
 *                 type: object
 *                 description: "Données de baseline pour comparaison (optionnel)."
 *               sensitivity:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 description: "Sensibilité des seuils d'alerte à suggérer."
 *                 example: "medium"
 *     responses:
 *       200:
 *         description: Suggestions d'alertes générées.
 *       400:
 *         description: Erreurs de validation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur interne du serveur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/suggest-alerts',
  authMiddlewareToUse,
  [
    body('metrics')
      .isArray({ min: 1 })
      .withMessage('Au moins une métrique est requise'),
    body('baseline')
      .optional()
      .isObject()
      .withMessage('Baseline doit être un objet'),
    body('sensitivity')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Sensibilité invalide')
  ],
  handleValidationErrors,
  OpsAssistantController.suggestAlerts
);

/**
 * @swagger
 * /api/ops-assistant/capacity-planning:
 *   post:
 *     summary: Aide à la planification de capacité
 *     tags: [Ops Assistant]
 *     description: Fournit des prévisions et des recommandations pour la planification de capacité future.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               historicalData:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: "Données historiques de consommation des ressources."
 *               growthRate:
 *                 type: number
 *                 description: "Taux de croissance attendu en pourcentage."
 *                 example: 15
 *               horizon:
 *                 type: string
 *                 enum: [1month, 3months, 6months, 1year]
 *                 description: "Horizon de temps pour la planification."
 *                 example: "6months"
 *     responses:
 *       200:
 *         description: Analyse de capacité générée.
 *       400:
 *         description: Erreurs de validation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur interne du serveur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/capacity-planning',
  authMiddlewareToUse,
  [
    body('historicalData')
      .isArray({ min: 1 })
      .withMessage('Données historiques requises'),
    body('growthRate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Taux de croissance entre 0 et 100%'),
    body('horizon')
      .optional()
      .isIn(['1month', '3months', '6months', '1year'])
      .withMessage('Horizon de planification invalide')
  ],
  handleValidationErrors,
  OpsAssistantController.capacityPlanning
);

/**
 * @swagger
 * /api/ops-assistant/performance-analysis:
 *   post:
 *     summary: Analyse détaillée de la performance
 *     tags: [Ops Assistant]
 *     description: Effectue une analyse de performance en corrélant métriques système et application.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               systemMetrics:
 *                 type: object
 *                 description: "Objet contenant les métriques système."
 *               applicationMetrics:
 *                 type: object
 *                 description: "Objet contenant les métriques applicatives (optionnel)."
 *               analysisType:
 *                 type: string
 *                 enum: [realtime, trend, comparison, prediction]
 *                 description: "Type d'analyse à effectuer."
 *                 example: "realtime"
 *     responses:
 *       200:
 *         description: Analyse de performance réussie.
 *       400:
 *         description: Erreurs de validation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur interne du serveur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/performance-analysis',
  authMiddlewareToUse,
  [
    body('systemMetrics')
      .isObject()
      .withMessage('Métriques système requises'),
    body('applicationMetrics')
      .optional()
      .isObject()
      .withMessage('Métriques application doivent être un objet'),
    body('analysisType')
      .optional()
      .isIn(['realtime', 'trend', 'comparison', 'prediction'])
      .withMessage('Type d\'analyse invalide')
  ],
  handleValidationErrors,
  OpsAssistantController.performanceAnalysis
);

/**
 * @swagger
 * /api/ops-assistant/chat:
 *   post:
 *     summary: Interagit avec l'assistant via le chat
 *     tags: [Ops Assistant]
 *     description: Envoie un message à l'assistant IA et reçoit une réponse contextuelle.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *     responses:
 *       200:
 *         description: Réponse de l'assistant.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         description: Erreurs de validation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur interne du serveur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/chat',
  authMiddlewareToUse,
  [
    body('message')
      .notEmpty()
      .withMessage('Le message ne peut pas être vide.')
      .isLength({ min: 1, max: 2000 })
      .withMessage('Le message doit contenir entre 1 et 2000 caractères.'),
    body('sessionId')
      .optional()
      .isString()
      .withMessage('L\'ID de session doit être une chaîne de caractères.'),
  ],
  handleValidationErrors,
  OpsAssistantController.chat
);

/**
 * @swagger
 * /api/ops-assistant/explain-metric:
 *   post:
 *     summary: Explique une métrique spécifique
 *     tags: [Ops Assistant]
 *     description: Fournit une explication détaillée d'une métrique, sa signification et son interprétation.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metricName:
 *                 type: string
 *                 description: "Nom de la métrique à expliquer."
 *                 example: "cpu_load_15m"
 *               value:
 *                 type: number
 *                 description: "Valeur actuelle de la métrique."
 *                 example: 0.75
 *               context:
 *                 type: object
 *                 description: "Contexte additionnel pour l'explication (optionnel)."
 *               language:
 *                 type: string
 *                 enum: [fr, en]
 *                 description: "Langue de l'explication."
 *                 default: "fr"
 *     responses:
 *       200:
 *         description: Explication de la métrique générée.
 *       400:
 *         description: Erreurs de validation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur interne du serveur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/explain-metric',
  authMiddlewareToUse,
  [
    body('metricName')
      .notEmpty()
      .withMessage('Nom de la métrique requis'),
    body('value')
      .isNumeric()
      .withMessage('Valeur de la métrique doit être numérique'),
    body('context')
      .optional()
      .isObject()
      .withMessage('Contexte doit être un objet'),
    body('language')
      .optional()
      .isIn(['fr', 'en'])
      .withMessage('Langue invalide')
  ],
  handleValidationErrors,
  OpsAssistantController.explainMetric
);

/**
 * @swagger
 * /api/ops-assistant/quick-status:
 *   post:
 *     summary: Vérification rapide du statut système
 *     tags: [Ops Assistant]
 *     description: Effectue une vérification rapide de l'état du système en utilisant les outils IA pour fournir un résumé concis et actionnable.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includeMetrics:
 *                 type: boolean
 *                 description: "Inclure les métriques de performance dans la vérification"
 *                 default: true
 *                 example: true
 *               includeAlerts:
 *                 type: boolean
 *                 description: "Inclure les alertes actives dans la vérification"
 *                 default: true
 *                 example: true
 *     responses:
 *       200:
 *         description: Statut système obtenu avec succès.
 *       500:
 *         description: Erreur interne du serveur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/quick-status',
  authMiddlewareToUse,
  OpsAssistantController.quickStatus
);

/**
 * @swagger
 * /api/ops-assistant/auto-diagnose:
 *   post:
 *     summary: Diagnostic automatique du système
 *     tags: [Ops Assistant]
 *     description: Effectue un diagnostic automatique complet en utilisant tous les outils disponibles pour identifier les problèmes et proposer des solutions.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               focus:
 *                 type: string
 *                 enum: [performance, errors, health, all]
 *                 description: "Focus du diagnostic - domaine spécifique à analyser"
 *                 default: "all"
 *                 example: "performance"
 *               timeRange:
 *                 type: string
 *                 enum: [1h, 6h, 24h, 7d]
 *                 description: "Période d'analyse pour le diagnostic"
 *                 default: "24h"
 *                 example: "24h"
 *     responses:
 *       200:
 *         description: Diagnostic automatique terminé.
 *       500:
 *         description: Erreur interne du serveur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/auto-diagnose',
  authMiddlewareToUse,
  OpsAssistantController.autoDiagnose
);

/**
 * @swagger
 * /api/ops-assistant/performance-insights:
 *   post:
 *     summary: Insights de performance automatisés
 *     tags: [Ops Assistant]
 *     description: Génère des insights de performance en analysant les métriques système pour fournir des recommandations d'optimisation.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service:
 *                 type: string
 *                 enum: [auth-service, db-service, ai-service, metrics-service, notification-service, payment-service, all]
 *                 description: "Service à analyser pour les insights de performance"
 *                 example: "auth-service"
 *               timeRange:
 *                 type: string
 *                 enum: [1h, 6h, 24h, 7d, 30d]
 *                 description: "Période d'analyse pour les insights"
 *                 default: "24h"
 *                 example: "24h"
 *               analysisType:
 *                 type: string
 *                 enum: [overview, detailed, trends, bottlenecks]
 *                 description: "Type d'analyse à effectuer"
 *                 default: "overview"
 *                 example: "detailed"
 *     responses:
 *       200:
 *         description: Insights de performance générés.
 *       400:
 *         description: Erreurs de validation.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.post('/performance-insights',
  authMiddlewareToUse,
  [
    body('service')
      .isIn(['auth-service', 'db-service', 'ai-service', 'metrics-service', 'notification-service', 'payment-service', 'all'])
      .withMessage('Service invalide'),
    body('timeRange')
      .optional()
      .isIn(['1h', '6h', '24h', '7d', '30d'])
      .withMessage('Période invalide'),
    body('analysisType')
      .optional()
      .isIn(['overview', 'detailed', 'trends', 'bottlenecks'])
      .withMessage('Type d\'analyse invalide')
  ],
  handleValidationErrors,
  OpsAssistantController.performanceInsights
);

/**
 * @swagger
 * /api/ops-assistant/smart-dashboard:
 *   post:
 *     summary: Génération intelligente de dashboard
 *     tags: [Ops Assistant]
 *     description: Génère un dashboard intelligent basé sur l'analyse du système actuel et les besoins spécifiés.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               purpose:
 *                 type: string
 *                 description: "Objectif du dashboard à générer"
 *                 example: "Surveillance des performances du service d'authentification"
 *                 minLength: 10
 *                 maxLength: 500
 *               focus:
 *                 type: string
 *                 enum: [overview, performance, errors, security, custom]
 *                 description: "Focus du dashboard à générer"
 *                 default: "overview"
 *                 example: "performance"
 *               complexity:
 *                 type: string
 *                 enum: [simple, medium, complex]
 *                 description: "Complexité du dashboard souhaitée"
 *                 default: "medium"
 *                 example: "medium"
 *     responses:
 *       200:
 *         description: Dashboard généré avec succès.
 *       400:
 *         description: Erreurs de validation.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.post('/smart-dashboard',
  authMiddlewareToUse,
  [
    body('purpose')
      .notEmpty()
      .withMessage('Objectif du dashboard requis')
      .isLength({ min: 10, max: 500 })
      .withMessage('Objectif entre 10 et 500 caractères'),
    body('focus')
      .optional()
      .isIn(['overview', 'performance', 'errors', 'security', 'custom'])
      .withMessage('Focus invalide'),
    body('complexity')
      .optional()
      .isIn(['simple', 'medium', 'complex'])
      .withMessage('Complexité invalide')
  ],
  handleValidationErrors,
  OpsAssistantController.smartDashboard
);

module.exports = router; 