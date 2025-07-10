// src/routes/dashboard.routes.js
// Routes pour l'agent générateur de dashboards

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const DashboardController = require('../controllers/dashboard.controller');
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
 *   name: Dashboard Agent
 *   description: Agent IA pour la génération et la gestion de dashboards.
 */

/**
 * @swagger
 * /api/dashboard-agent/generate:
 *   post:
 *     summary: Génère un dashboard complet
 *     tags: [Dashboard Agent]
 *     description: Crée une configuration de dashboard JSON complète basée sur les exigences de l'utilisateur, les métriques disponibles et des templates optionnels.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateDashboardRequest'
 *     responses:
 *       200:
 *         description: Dashboard généré avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 dashboard:
 *                   $ref: '#/components/schemas/DashboardConfig'
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: "Suggestions pour améliorer le dashboard."
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
router.post('/generate',
  authMiddlewareToUse,
  [
    body('requirements')
      .notEmpty()
      .withMessage('Les exigences du dashboard sont requises')
      .isLength({ min: 10, max: 2000 })
      .withMessage('Les exigences doivent contenir entre 10 et 2000 caractères'),
    body('context')
      .optional()
      .isObject()
      .withMessage('Le contexte doit être un objet'),
    body('templateType')
      .optional()
      .isIn(['infrastructure', 'application', 'business', 'custom'])
      .withMessage('Type de template invalide'),
    body('complexity')
      .optional()
      .isIn(['simple', 'medium', 'advanced'])
      .withMessage('Niveau de complexité invalide')
  ],
  handleValidationErrors,
  DashboardController.generateDashboard
);

/**
 * @swagger
 * /api/dashboard-agent/suggest-layout:
 *   post:
 *     summary: Suggère une disposition de dashboard
 *     tags: [Dashboard Agent]
 *     description: Propose une disposition de grille optimale pour un ensemble de métriques donné.
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
 *                   type: string
 *                 description: "Liste des noms de métriques à inclure."
 *                 example: ["cpu_usage", "memory_usage", "api_latency"]
 *               screenSize:
 *                 type: string
 *                 enum: [mobile, tablet, desktop, large]
 *                 description: "La taille d'écran cible pour l'optimisation."
 *                 example: "desktop"
 *               priority:
 *                 type: string
 *                 enum: [performance, aesthetics, density]
 *                 description: "Le critère principal pour l'optimisation de la disposition."
 *                 example: "performance"
 *     responses:
 *       200:
 *         description: Suggestion de disposition générée.
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
router.post('/suggest-layout',
  authMiddlewareToUse,
  [
    body('metrics')
      .isArray({ min: 1 })
      .withMessage('Au moins une métrique est requise'),
    body('screenSize')
      .optional()
      .isIn(['mobile', 'tablet', 'desktop', 'large'])
      .withMessage('Taille d\'écran invalide'),
    body('priority')
      .optional()
      .isIn(['performance', 'aesthetics', 'density'])
      .withMessage('Priorité invalide')
  ],
  handleValidationErrors,
  DashboardController.suggestLayout
);

/**
 * @swagger
 * /api/dashboard-agent/optimize:
 *   post:
 *     summary: Optimise un dashboard existant
 *     tags: [Dashboard Agent]
 *     description: Analyse une configuration de dashboard existante et propose des optimisations pour améliorer les performances et l'expérience utilisateur.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentDashboard:
 *                 type: object
 *                 description: "La configuration JSON du dashboard à optimiser."
 *                 example: {
 *                   "dashboard": {
 *                     "title": "Mon Dashboard",
 *                     "blocks": [
 *                       {"id": "block1", "type": "metric", "title": "CPU Usage"}
 *                     ]
 *                   }
 *                 }
 *               optimizationGoals:
 *                 type: object
 *                 description: "Objectifs d'optimisation spécifiques (optionnel)."
 *                 example: {
 *                   "performance": true,
 *                   "usability": true,
 *                   "readability": true
 *                 }
 *     responses:
 *       200:
 *         description: Optimisations proposées.
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
router.post('/optimize',
  authMiddlewareToUse,
  [
    body('currentDashboard')
      .isObject()
      .withMessage('Configuration actuelle requise'),
    body('optimizationGoals')
      .optional()
      .isObject()
      .withMessage('Objectifs d\'optimisation invalides')
  ],
  handleValidationErrors,
  DashboardController.optimizeDashboard
);

/**
 * @swagger
 * /api/dashboard-agent/validate:
 *   post:
 *     summary: Valide une configuration de dashboard
 *     tags: [Dashboard Agent]
 *     description: Valide la structure et la cohérence d'une configuration de dashboard avec des recommandations d'amélioration.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dashboardConfig:
 *                 type: object
 *                 description: "Configuration du dashboard à valider"
 *                 example: {
 *                   "dashboard": {
 *                     "title": "Dashboard Test",
 *                     "blocks": [
 *                       {
 *                         "id": "metric1",
 *                         "type": "metric",
 *                         "title": "CPU Usage",
 *                         "layout": {"x": 0, "y": 0, "w": 6, "h": 4}
 *                       }
 *                     ]
 *                   }
 *                 }
 *     responses:
 *       200:
 *         description: Validation terminée avec succès.
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
router.post('/validate',
  authMiddlewareToUse,
  [
    body('dashboardConfig')
      .isObject()
      .withMessage('Configuration de dashboard requise')
  ],
  handleValidationErrors,
  DashboardController.validateDashboard
);

/**
 * @swagger
 * /api/dashboard-agent/suggest-templates:
 *   post:
 *     summary: Suggère des templates de dashboard
 *     tags: [Dashboard Agent]
 *     description: Suggère des templates appropriés selon le cas d'usage et les préférences utilisateur.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               useCase:
 *                 type: string
 *                 description: "Cas d'usage du dashboard"
 *                 example: "Surveillance des performances d'une application web"
 *                 minLength: 5
 *                 maxLength: 200
 *               complexity:
 *                 type: string
 *                 enum: [simple, medium, complex]
 *                 description: "Complexité souhaitée"
 *                 example: "medium"
 *               preferences:
 *                 type: object
 *                 description: "Préférences utilisateur (optionnel)"
 *                 example: {
 *                   "focus": "performance",
 *                   "style": "modern",
 *                   "metrics": ["cpu", "memory", "latency"]
 *                 }
 *     responses:
 *       200:
 *         description: Suggestions générées avec succès.
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
router.post('/suggest-templates',
  authMiddlewareToUse,
  [
    body('useCase')
      .notEmpty()
      .withMessage('Cas d\'usage requis')
      .isLength({ min: 5, max: 200 })
      .withMessage('Cas d\'usage entre 5 et 200 caractères'),
    body('complexity')
      .optional()
      .isIn(['simple', 'medium', 'complex'])
      .withMessage('Complexité invalide'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Préférences invalides')
  ],
  handleValidationErrors,
  DashboardController.suggestTemplates
);

/**
 * @swagger
 * /api/dashboard-agent/recommend-blocks:
 *   post:
 *     summary: Recommande des blocs pour un dashboard
 *     tags: [Dashboard Agent]
 *     description: Suggère des blocs supplémentaires pour améliorer un dashboard existant selon son objectif.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dashboardPurpose:
 *                 type: string
 *                 description: "Objectif du dashboard"
 *                 example: "Surveillance des performances d'une API"
 *                 minLength: 5
 *                 maxLength: 200
 *               existingBlocks:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: "Blocs existants dans le dashboard"
 *                 example: [
 *                   {
 *                     "id": "cpu-block",
 *                     "type": "metric",
 *                     "title": "CPU Usage"
 *                   }
 *                 ]
 *               focus:
 *                 type: string
 *                 description: "Focus du dashboard (optionnel)"
 *                 example: "performance"
 *     responses:
 *       200:
 *         description: Recommandations générées avec succès.
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
router.post('/recommend-blocks',
  authMiddlewareToUse,
  [
    body('dashboardPurpose')
      .notEmpty()
      .withMessage('Objectif du dashboard requis')
      .isLength({ min: 5, max: 200 })
      .withMessage('Objectif entre 5 et 200 caractères'),
    body('existingBlocks')
      .optional()
      .isArray()
      .withMessage('Blocs existants doivent être un tableau'),
    body('focus')
      .optional()
      .isString()
      .withMessage('Focus invalide')
  ],
  handleValidationErrors,
  DashboardController.recommendBlocks
);

/**
 * @swagger
 * /api/dashboard-agent/templates:
 *   get:
 *     summary: Récupère les templates disponibles
 *     tags: [Dashboard Agent]
 *     description: Retourne la liste des templates de dashboard disponibles avec filtrage optionnel.
 *     security:
 *       - UserAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: "Filtrer par catégorie de template"
 *         example: "infrastructure"
 *       - in: query
 *         name: complexity
 *         schema:
 *           type: string
 *           enum: [simple, medium, complex]
 *         description: "Filtrer par niveau de complexité"
 *         example: "medium"
 *     responses:
 *       200:
 *         description: Templates récupérés avec succès.
 *       500:
 *         description: Erreur interne du serveur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/templates',
  authMiddlewareToUse,
  DashboardController.getTemplates
);

/**
 * @swagger
 * /api/dashboard-agent/explain:
 *   post:
 *     summary: Explique une configuration de dashboard
 *     tags: [Dashboard Agent]
 *     description: Fournit une explication détaillée d'une configuration de dashboard complexe.
 *     security:
 *       - UserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dashboardConfig:
 *                 type: object
 *                 description: "Configuration du dashboard à expliquer"
 *                 example: {
 *                   "dashboard": {
 *                     "title": "Dashboard Complexe",
 *                     "blocks": [
 *                       {"id": "block1", "type": "line-chart", "title": "Graphique"}
 *                     ]
 *                   }
 *                 }
 *               language:
 *                 type: string
 *                 enum: [fr, en]
 *                 description: "Langue de l'explication"
 *                 default: "fr"
 *                 example: "fr"
 *     responses:
 *       200:
 *         description: Explication générée avec succès.
 *       500:
 *         description: Erreur interne du serveur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/explain',
  authMiddlewareToUse,
  [
    body('dashboardConfig')
      .isObject()
      .withMessage('Configuration de dashboard requise'),
    body('language')
      .optional()
      .isIn(['fr', 'en'])
      .withMessage('Langue invalide')
  ],
  handleValidationErrors,
  DashboardController.explainDashboard
);

module.exports = router; 