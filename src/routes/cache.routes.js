// src/routes/cache.routes.js
// Routes de gestion du cache pour le service IA

const express = require('express');
const { query, validationResult, param } = require('express-validator');
const CacheController = require('../controllers/cache.controller');
const { authMiddleware, requireRole } = require('../middlewares/auth');

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

const adminOnly = [authMiddleware, requireRole(['admin'])];

/**
 * @swagger
 * /api/cache/stats:
 *   get:
 *     summary: Obtenir les statistiques du cache Redis
 *     tags: [Cache]
 *     security:
 *       - UserAuth: []
 *     description: "Retourne des statistiques d'utilisation du cache Redis, comme le nombre de clés, le taux de succès (hit rate) et l'utilisation de la mémoire. Nécessite des droits d'administrateur."
 *     responses:
 *       200:
 *         description: Statistiques du cache récupérées avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CacheStats'
 *       401:
 *         description: Non autorisé.
 *       403:
 *         description: Permissions insuffisantes.
 */
router.get('/stats',
  ...adminOnly,
  CacheController.getStats
);

/**
 * @swagger
 * /api/cache/flush:
 *   delete:
 *     summary: Vider complètement le cache Redis
 *     tags: [Cache]
 *     security:
 *       - UserAuth: []
 *     description: "Supprime toutes les clés du cache Redis pour la base de données configurée. Opération destructive. Nécessite des droits d'administrateur."
 *     responses:
 *       200:
 *         description: Cache vidé avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Cache flushed successfully"
 *       401:
 *         description: Non autorisé.
 *       403:
 *         description: Permissions insuffisantes.
 */
router.delete('/flush',
  ...adminOnly,
  [
    query('confirm')
      .equals('true')
      .withMessage('Confirmation requise pour vider le cache')
  ],
  handleValidationErrors,
  CacheController.flushCache
);

/**
 * @swagger
 * /api/cache/keys:
 *   get:
 *     summary: Lister les clés du cache
 *     tags: [Cache]
 *     security:
 *       - UserAuth: []
 *     description: "Récupère une liste paginée de toutes les clés actuellement dans le cache Redis. Nécessite des droits d'administrateur."
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: integer
 *           default: 0
 *         description: "Le curseur pour la pagination (obtenu depuis la réponse précédente)."
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           default: 100
 *         description: "Le nombre de clés à retourner par page."
 *     responses:
 *       200:
 *         description: Liste de clés récupérée.
 *       401:
 *         description: Non autorisé.
 *       403:
 *         description: Permissions insuffisantes.
 */
router.get('/keys',
  ...adminOnly,
  [
    query('pattern')
      .optional()
      .isLength({ min: 1 })
      .withMessage('Pattern de recherche invalide'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limite entre 1 et 1000')
  ],
  handleValidationErrors,
  CacheController.getKeys
);

/**
 * @swagger
 * /api/cache/keys/{key}:
 *   delete:
 *     summary: Supprimer une clé spécifique du cache
 *     tags: [Cache]
 *     security:
 *       - UserAuth: []
 *     description: "Supprime une clé unique du cache Redis. Nécessite des droits d'administrateur."
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: "La clé à supprimer (doit être encodée en URL si elle contient des caractères spéciaux)."
 *     responses:
 *       200:
 *         description: Clé supprimée avec succès.
 *       401:
 *         description: Non autorisé.
 *       403:
 *         description: Permissions insuffisantes.
 *       404:
 *         description: Clé non trouvée.
 */
router.delete('/keys/:key',
  ...adminOnly,
  [
    param('key').notEmpty().withMessage('La clé est requise.')
  ],
  handleValidationErrors,
  CacheController.deleteKey
);

module.exports = router; 