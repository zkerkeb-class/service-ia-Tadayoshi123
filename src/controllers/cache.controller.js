// src/controllers/cache.controller.js
// Contrôleur de gestion du cache pour le service IA

const { redisClient, aiCache } = require('../config/redis');
const logger = require('../config/logger');

class CacheController {
  /**
   * Statistiques du cache IA
   */
  async getStats(req, res, next) {
    try {
      const info = await redisClient.info('memory');
      const keyCount = await this.getAIKeyCount();
      const hitRate = await this.calculateHitRate();

      const stats = {
        keys: {
          total: keyCount.total,
          dashboard: keyCount.dashboard,
          opsAssistant: keyCount.opsAssistant
        },
        hitRate: hitRate,
        memory: this.parseMemoryInfo(info),
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      logger.error('Erreur récupération stats cache:', error);
      next(error);
    }
  }

  /**
   * Vider le cache IA
   */
  async flushCache(req, res, next) {
    try {
      const flushed = await aiCache.flush();
      
      if (flushed) {
        logger.info('Cache IA vidé par utilisateur:', req.user.id);
        res.json({
          success: true,
          message: 'Cache IA vidé avec succès',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erreur lors du vidage du cache'
        });
      }

    } catch (error) {
      logger.error('Erreur vidage cache:', error);
      next(error);
    }
  }

  /**
   * Lister les clés du cache
   */
  async getKeys(req, res, next) {
    try {
      const { pattern, limit } = req.query;
      const searchPattern = pattern || 'ai:*';
      const maxKeys = parseInt(limit) || 100;

      const keys = await redisClient.keys(searchPattern);
      const limitedKeys = keys.slice(0, maxKeys);

      // Récupération des informations détaillées pour chaque clé
      const keyDetails = await Promise.all(
        limitedKeys.map(async (key) => {
          try {
            const ttl = await redisClient.ttl(key);
            const size = await redisClient.memory('usage', key);
            
            return {
              key,
              ttl: ttl === -1 ? 'permanent' : ttl,
              size: size || 'unknown',
              type: this.getKeyType(key)
            };
          } catch (error) {
            return {
              key,
              ttl: 'error',
              size: 'error',
              type: this.getKeyType(key),
              error: error.message
            };
          }
        })
      );

      res.json({
        success: true,
        keys: keyDetails,
        totalFound: keys.length,
        showing: limitedKeys.length,
        pattern: searchPattern
      });

    } catch (error) {
      logger.error('Erreur récupération clés cache:', error);
      next(error);
    }
  }

  /**
   * Supprimer une clé spécifique
   */
  async deleteKey(req, res, next) {
    try {
      const { key } = req.params;

      // Vérification que c'est bien une clé IA
      if (!key.startsWith('ai:')) {
        return res.status(400).json({
          success: false,
          message: 'Seules les clés IA peuvent être supprimées via cette API'
        });
      }

      const deleted = await redisClient.del(key);

      if (deleted > 0) {
        logger.info('Clé cache supprimée:', { key, user: req.user.id });
        res.json({
          success: true,
          message: 'Clé supprimée avec succès',
          key
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Clé non trouvée',
          key
        });
      }

    } catch (error) {
      logger.error('Erreur suppression clé cache:', error);
      next(error);
    }
  }

  // === MÉTHODES UTILITAIRES ===

  async getAIKeyCount() {
    try {
      const allKeys = await redisClient.keys('ai:*');
      const dashboardKeys = allKeys.filter(key => key.includes(':dashboard:'));
      const opsKeys = allKeys.filter(key => key.includes(':opsAssistant:'));

      return {
        total: allKeys.length,
        dashboard: dashboardKeys.length,
        opsAssistant: opsKeys.length
      };
    } catch (error) {
      logger.error('Erreur comptage clés:', error);
      return { total: 0, dashboard: 0, opsAssistant: 0 };
    }
  }

  async calculateHitRate() {
    // Approximation du taux de hit basée sur les métriques Prometheus
    // En réalité, il faudrait tracker cela dans Redis ou une autre base
    try {
      // Pour l'instant, on retourne une valeur par défaut
      // TODO: Implémenter un vrai tracking des hits/misses
      return {
        dashboard: 'N/A',
        opsAssistant: 'N/A',
        overall: 'N/A',
        note: 'Tracking en cours de développement'
      };
    } catch (error) {
      return {
        dashboard: 'error',
        opsAssistant: 'error',
        overall: 'error'
      };
    }
  }

  parseMemoryInfo(memoryInfo) {
    try {
      const lines = memoryInfo.split('\r\n');
      const memory = {};

      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          if (key === 'used_memory_human') memory.used = value;
          if (key === 'used_memory_peak_human') memory.peak = value;
          if (key === 'used_memory_rss_human') memory.rss = value;
        }
      });

      return memory;
    } catch (error) {
      return { error: 'Impossible de parser les infos mémoire' };
    }
  }

  getKeyType(key) {
    if (key.includes(':dashboard:')) return 'dashboard';
    if (key.includes(':opsAssistant:')) return 'ops-assistant';
    return 'unknown';
  }
}

module.exports = new CacheController(); 