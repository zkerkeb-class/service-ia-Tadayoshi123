// src/config/redis.js
// Configuration Redis pour le cache des réponses IA (mode mémoire)

const logger = require('./logger');

// Cache en mémoire pour remplacer Redis temporairement
const memoryCache = new Map();

// Client Redis simulé
const redisClient = {
  isOpen: true,
  connect: async () => {
    logger.info('✅ Mode cache mémoire activé (Redis désactivé)');
    return true;
  },
  ping: async () => {
    return 'PONG';
  },
  get: async (key) => {
    return memoryCache.get(key);
  },
  setEx: async (key, ttl, value) => {
    memoryCache.set(key, value);
    return 'OK';
  },
  del: async (key) => {
    if (Array.isArray(key)) {
      let count = 0;
      for (const k of key) {
        if (memoryCache.delete(k)) count++;
      }
      return count;
    }
    return memoryCache.delete(key) ? 1 : 0;
  },
  keys: async (pattern) => {
    const keys = [];
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }
    return keys;
  },
  ttl: async () => {
    return -1; // Pas d'expiration en mode mémoire
  },
  memory: async () => {
    return '0'; // Pas de mesure de mémoire en mode mémoire
  },
  info: async () => {
    return 'used_memory_human:0\r\nused_memory_peak_human:0\r\nused_memory_rss_human:0\r\n';
  },
  quit: async () => {
    memoryCache.clear();
    return 'OK';
  }
};

// Fonctions utilitaires pour le cache IA
const aiCache = {
  // Génère une clé de cache basée sur le hash du prompt
  generateCacheKey: (prompt, agentType) => {
    const crypto = require('crypto');
    // S'assurer que prompt est une chaîne
    const promptStr = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    const hash = crypto.createHash('md5').update(promptStr).digest('hex');
    return `ai:${agentType}:${hash}`;
  },

  // Récupère une réponse depuis le cache
  get: async (key) => {
    try {
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Erreur lecture cache mémoire:', error);
      return null;
    }
  },

  // Stocke une réponse dans le cache avec TTL
  set: async (key, data, ttlSeconds = 3600) => {
    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Erreur écriture cache mémoire:', error);
      return false;
    }
  },

  // Supprime une entrée du cache
  del: async (key) => {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Erreur suppression cache mémoire:', error);
      return false;
    }
  },

  // Vide tout le cache IA
  flush: async () => {
    try {
      const keys = await redisClient.keys('ai:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Erreur vidage cache mémoire:', error);
      return false;
    }
  }
};

// Initialisation
(async () => {
  await redisClient.connect();
})();

module.exports = { redisClient, aiCache }; 