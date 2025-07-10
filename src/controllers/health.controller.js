// src/controllers/health.controller.js
// Contrôleur de santé pour le service IA

const { redisClient } = require('../config/redis');
const openAIService = require('../services/openai.service');
const logger = require('../config/logger');

/**
 * Vérifie la disponibilité de l'API OpenAI
 */
const checkOpenAIHealth = async () => {
  try {
    // Test rapide sans cache
    await openAIService.client.models.list();
    return 'available';
  } catch (error) {
    logger.warn('OpenAI non disponible:', error.message);
    return 'unavailable';
  }
};

class HealthController {
  /**
   * Vérification de base de la santé du service
   */
  async getHealth(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'ai-service',
        version: '1.0.0',
        uptime: process.uptime(),
        dependencies: {
          redis: openAIService.useCache ? (redisClient.isOpen ? 'connected' : 'disconnected') : 'disabled',
          openai: await checkOpenAIHealth()
        },
        cache: {
          enabled: openAIService.useCache,
          type: openAIService.useCache ? 'redis' : 'disabled'
        }
      };

      // Le service est considéré en santé même si Redis est désactivé
      const statusCode = health.dependencies.openai === 'available' ? 200 : 503;
      res.status(statusCode).json(health);

    } catch (error) {
      logger.error('Erreur vérification santé:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  /**
   * Vérification détaillée incluant les dépendances
   */
  async getDetailedHealth(req, res) {
    try {
      const checks = await Promise.allSettled([
        openAIService.useCache ? this.checkRedis() : { status: 'disabled', message: 'Cache Redis désactivé' },
        this.checkOpenAI(),
        this.checkMemory(),
        this.checkDisk()
      ]);

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'ai-service',
        version: '1.0.0',
        uptime: process.uptime(),
        checks: {
          redis: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'error', error: checks[0].reason },
          openai: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'error', error: checks[1].reason },
          memory: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'error', error: checks[2].reason },
          disk: checks[3].status === 'fulfilled' ? checks[3].value : { status: 'error', error: checks[3].reason }
        }
      };

      // Détermine le statut global (Redis désactivé n'est pas considéré comme une erreur)
      const hasErrors = Object.entries(health.checks).some(([key, check]) => 
        key !== 'redis' && check.status === 'error'
      );
      health.status = hasErrors ? 'degraded' : 'healthy';

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);

    } catch (error) {
      logger.error('Erreur vérification santé détaillée:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  /**
   * Vérification de préparation pour Kubernetes
   */
  async getReadiness(req, res) {
    try {
      // Le service est prêt si OpenAI est disponible (Redis est optionnel)
      const isReady = await checkOpenAIHealth() === 'available';
      
      if (isReady) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          dependencies: {
            redis: openAIService.useCache ? redisClient.isOpen : 'disabled',
            openai: await checkOpenAIHealth() === 'available'
          }
        });
      }

    } catch (error) {
      logger.error('Erreur vérification readiness:', error);
      res.status(503).json({
        status: 'not ready',
        error: error.message
      });
    }
  }

  /**
   * Vérification de vivacité pour Kubernetes
   */
  async getLiveness(req, res) {
    try {
      // Vérification basique que le service répond
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });

    } catch (error) {
      logger.error('Erreur vérification liveness:', error);
      res.status(503).json({
        status: 'dead',
        error: error.message
      });
    }
  }

  // === MÉTHODES DE VÉRIFICATION ===

  async checkRedis() {
    try {
      if (!redisClient.isOpen) {
        return { status: 'error', message: 'Redis déconnecté' };
      }

      // Test simple ping
      await redisClient.ping();
      
      return {
        status: 'healthy',
        message: 'Redis connecté et opérationnel',
        connected: true
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Erreur Redis: ' + error.message,
        connected: false
      };
    }
  }

  async checkOpenAI() {
    try {
      // Test simple avec un prompt minimal
      const testResponse = await openAIService.callOpenAI(
        'Test de connectivité - réponds juste "OK"',
        'opsAssistant',
        { temperature: 0, maxTokens: 10, cacheTTL: 60 }
      );

      return {
        status: 'healthy',
        message: 'OpenAI API accessible',
        available: true,
        model: testResponse.model || 'gpt-4o-mini',
        cached: !!testResponse.cached
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Erreur OpenAI: ' + error.message,
        available: false
      };
    }
  }

  async checkMemory() {
    try {
      const usage = process.memoryUsage();
      const totalMB = Math.round(usage.rss / 1024 / 1024);
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);

      // Seuil d'alerte à 80% de heap utilisé
      const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
      const status = heapUsagePercent > 80 ? 'warning' : 'healthy';

      return {
        status,
        message: `Mémoire: ${totalMB}MB RSS, ${heapUsedMB}MB/${heapTotalMB}MB heap`,
        metrics: {
          rss: totalMB,
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          heapUsagePercent: Math.round(heapUsagePercent)
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Erreur vérification mémoire: ' + error.message
      };
    }
  }

  async checkDisk() {
    try {
      // Vérification simple de l'espace disque (approximative)
      const fs = require('fs');
      const stats = fs.statSync('.');
      
      return {
        status: 'healthy',
        message: 'Espace disque accessible',
        accessible: true
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Erreur accès disque: ' + error.message,
        accessible: false
      };
    }
  }
}

module.exports = new HealthController(); 