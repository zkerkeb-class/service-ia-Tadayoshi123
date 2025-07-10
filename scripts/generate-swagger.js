// service-ia-Tadayoshi123/scripts/generate-swagger.js
// Script pour générer le fichier swagger.json

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const packageJson = require('../package.json');

const options = {
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'SupervIA - AI Service API',
      version: packageJson.version,
      description: "API du service d'intelligence artificielle de SupervIA. Il expose deux agents principaux : le **Dashboard Agent** pour la génération de tableaux de bord, et l'**Ops Assistant** pour le diagnostic et l'assistance opérationnelle via un chat interactif.",
      contact: {
        name: "SupervIA Team",
        url: "https://github.com/zkerkeb-class/service-ia-Tadayoshi123",
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3004}`,
        description: 'Serveur de développement local'
      },
      {
        url: 'http://localhost:8080/api/v1/ai',
        description: 'Via la passerelle API Nginx'
      }
    ],
    tags: [
        { name: 'Dashboard Agent', description: "Agent IA pour la génération et la gestion intelligentes de dashboards." },
        { name: 'Ops Assistant', description: "Assistant IA pour la supervision, le diagnostic et l'optimisation des opérations." },
        { name: 'Cache', description: "Gestion du cache Redis pour les réponses de l'IA." },
        { name: 'Health', description: "Endpoints de vérification de l'état de santé du service." },
    ],
    components: {
        securitySchemes: {
            UserAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: "Token d'accès JWT (RS256) pour l'authentification des utilisateurs finaux."
            }
        },
        schemas: {
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string' },
                    code: { type: 'string', nullable: true },
                    errors: { type: 'array', items: { type: 'object' }, nullable: true }
                },
                required: ['success', 'message']
            },
            
            // --- Dashboard Schemas ---
            DashboardBlock: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', description: 'ID unique du bloc.' },
                    type: { type: 'string', enum: ['line-chart', 'bar-chart', 'pie-chart', 'gauge', 'metric', 'table', 'text', 'status', 'alert-list'], description: 'Type de visualisation du bloc.' },
                    title: { type: 'string', description: 'Titre du bloc.' },
                    layout: {
                        type: 'object',
                        properties: {
                            x: { type: 'integer', description: 'Position en X sur la grille.' },
                            y: { type: 'integer', description: 'Position en Y sur la grille.' },
                            w: { type: 'integer', description: 'Largeur du bloc en unités de grille.' },
                            h: { type: 'integer', description: 'Hauteur du bloc en unités de grille.' }
                        }
                    },
                    dataSource: { type: 'object', description: 'Configuration de la source de données (Prometheus, API, statique).' },
                    config: { type: 'object', description: 'Configuration spécifique à la visualisation.' }
                },
                required: ['id', 'type', 'title', 'layout']
            },
            DashboardConfig: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Titre du dashboard.' },
                    description: { type: 'string', nullable: true, description: 'Description du dashboard.' },
                    blocks: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/DashboardBlock' }
                    }
                },
                required: ['title', 'blocks']
            },
            DashboardContext: {
                type: 'object',
                description: 'Contexte optionnel d\'un dashboard existant pour guider la génération.',
                properties: {
                    dashboardTitle: { type: 'string' },
                    existingBlocks: { type: 'array', items: { type: 'object' } },
                    preferredMetrics: { type: 'array', items: { type: 'string' } }
                }
            },

            // --- Ops Assistant Schemas ---
            ChatRequest: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string', format: 'uuid', nullable: true, description: "ID de session pour conserver le contexte. Si non fourni, une nouvelle session est créée." },
                    message: { type: 'string', description: "Message de l'utilisateur.", minLength: 1, maxLength: 2000 },
                    context: { type: 'object', nullable: true, description: "Contexte additionnel (par exemple, le dashboard actuel consulté par l'utilisateur)." }
                },
                required: ['message']
            },
            ChatResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    sessionId: { type: 'string', format: 'uuid' },
                    message: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            role: { type: 'string', example: 'assistant' },
                            content: { type: 'string', description: "Réponse textuelle de l'assistant." },
                            timestamp: { type: 'string', format: 'date-time' }
                        }
                    },
                    metadata: {
                        type: 'object',
                        properties: {
                            toolsUsedCount: { type: 'integer', description: "Nombre d'outils appelés par l'IA pour formuler sa réponse." }
                        }
                    }
                }
            },

            // --- Health & Cache Schemas ---
            HealthStatus: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'UP' },
                    timestamp: { type: 'string', format: 'date-time' },
                    dependencies: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                status: { type: 'string' }
                            }
                        }
                    }
                }
            },
            CacheStats: {
                type: 'object',
                properties: {
                    keys: { type: 'integer' },
                    hits: { type: 'integer' },
                    misses: { type: 'integer' },
                    hitRate: { type: 'number', format: 'float' },
                    memoryUsage: { type: 'string' }
                }
            }
        }
    }
  },
  apis: ['./src/routes/*.js'],
};

try {
  const specs = swaggerJsdoc(options);
  fs.writeFileSync(
    path.join(__dirname, '../src/swagger.json'),
    JSON.stringify(specs, null, 2)
  );
  console.log('✅ Documentation Swagger générée avec succès dans src/swagger.json');
} catch (error) {
  console.error('❌ Erreur lors de la génération de la documentation Swagger:', error);
} 