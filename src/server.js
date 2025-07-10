// src/server.js
// Service IA principal pour SupervIA - Générateur de dashboards et assistant supervision


const express = require('express');

const helmet = require('helmet');

const cors = require('cors');

const compression = require('compression');

const morgan = require('morgan');

const promBundle = require('express-prom-bundle');

const swaggerUi = require('swagger-ui-express');

const rateLimit = require('express-rate-limit');

require('dotenv').config();


const logger = require('./config/logger');

const { redisClient } = require('./config/redis');

const routes = require('./routes');

const errorHandler = require('./middlewares/errorHandler');

const swaggerDocument = require('./swagger.json');


const app = express();

const PORT = process.env.PORT || 3005;

// Trust proxy settings pour déploiement derrière reverse proxy
app.set('trust proxy', 1);


// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));


// Configuration CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
  allowedHeaders: 'Content-Type,Authorization,x-client,x-environment,*'
};

app.use(cors(corsOptions));


// Compression middleware
app.use(compression());


// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite à 100 requêtes par fenêtre par IP
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);


// Prometheus metrics middleware
// Note: all custom metrics are automatically collected
app.use(promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  promClient: {
    collectDefaultMetrics: {}
  },
}));


// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// API routes
app.use('/api', routes);


// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: 'La route demandée n\'existe pas',
    path: req.originalUrl
  });
});


// Error handling middleware (doit être en dernier)
app.use(errorHandler);


// Graceful shutdown
process.on('SIGTERM', async () => {

  logger.info('SIGTERM reçu, arrêt du serveur...');
  try {
    await redisClient.quit();
 
    logger.info('Connexion Redis fermée');
  } catch (error) {
    console.error('[IA Service] Erreur fermeture Redis:', error);
    logger.error('Erreur lors de la fermeture de Redis:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {

  logger.info('SIGINT reçu, arrêt du serveur...');
  try {
    await redisClient.quit();

    logger.info('Connexion Redis fermée');
  } catch (error) {
    console.error('[IA Service] Erreur fermeture Redis:', error);
    logger.error('Erreur lors de la fermeture de Redis:', error);
  }
  process.exit(0);
});



// Démarrage du serveur
app.listen(PORT, () => {
  logger.info(`🤖 Service IA démarré sur le port ${PORT}`);
  logger.info(`📊 Métriques disponibles sur http://localhost:${PORT}/metrics`);
  logger.info(`📖 Documentation API disponible sur http://localhost:${PORT}/api-docs`);
}); 