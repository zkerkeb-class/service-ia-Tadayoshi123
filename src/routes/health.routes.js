// src/routes/health.routes.js
// Routes de santé pour le service IA

const express = require('express');
const HealthController = require('../controllers/health.controller');

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check simple
 *     tags: [Health]
 *     description: "Retourne un statut de base pour indiquer que le service est en vie (liveness probe). Ne vérifie pas les dépendances."
 *     responses:
 *       200:
 *         description: Service opérationnel.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: "AI Service is running"
 */
router.get('/', HealthController.getLiveness);

/**
 * @swagger
 * /api/health/details:
 *   get:
 *     summary: Health check détaillé (readiness probe)
 *     tags: [Health]
 *     description: "Retourne un statut détaillé de santé, incluant les dépendances comme Redis et OpenAI. Idéal pour un readiness probe."
 *     responses:
 *       200:
 *         description: Service et dépendances sont prêts à recevoir du trafic.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       503:
 *         description: Une ou plusieurs dépendances critiques sont hors service.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/details', HealthController.getDetailedHealth);

// GET /api/health/readiness
// Vérification de préparation pour Kubernetes
router.get('/readiness', HealthController.getReadiness);

module.exports = router; 