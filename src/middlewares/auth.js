// src/middlewares/auth.js
// Middleware d'authentification JWT pour le service IA

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const logger = require('../config/logger');

const client = jwksClient({
  jwksUri: `${process.env.AUTH_SERVICE_URL}/api/v1/auth/jwks.json`
});

function getKey(header, callback){
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      logger.error('Erreur lors de la récupération de la clé de signature JWKS', { error: err });
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token d'authentification manquant ou mal formé.",
      code: 'MISSING_TOKEN',
    });
  }

  jwt.verify(token, getKey, {
    algorithms: ['RS256'],
    issuer: process.env.AUTH_SERVICE_URL,
    audience: process.env.FRONTEND_URL
  }, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        logger.warn({ message: "Tentative d'accès avec un token expiré.", token, ip: req.ip });
        return res.status(401).json({
          success: false,
          message: 'Le token a expiré.',
          code: 'TOKEN_EXPIRED',
        });
      }
      logger.warn({ message: "Tentative d'accès avec un token invalide.", error: err.message, token, ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'Token invalide.',
        code: 'INVALID_TOKEN',
        details: {
            success: false,
            message: err.message,
            code: err.name,
        }
      });
    }
    req.user = decoded;
    next();
  });
};

const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) {
    return next();
  }
  // Si un header d'authentification est présent, on le valide.
  authMiddleware(req, res, next);
};

// Middleware de vérification des rôles
const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    const userRoles = req.user.roles || [];
    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes',
        requiredRoles,
        userRoles
      });
    }

    next();
  };
};

// Middleware de vérification des permissions
const requirePermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes',
        requiredPermissions,
        userPermissions
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  optionalAuth,
  requireRole,
  requirePermission
}; 