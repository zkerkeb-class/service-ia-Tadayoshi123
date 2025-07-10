# Dockerfile pour le Service IA SupervIA
# Multi-stage Dockerfile optimisé pour la production

# ===================================
# 🏗️ STAGE 1: BUILDER
# Installe toutes les dépendances nécessaires.
# ===================================
FROM node:20-alpine AS builder

WORKDIR /app

# Installer les outils de compilation (temporairement)
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++

# Copier les fichiers de dépendances et installer
COPY package*.json ./
RUN npm install

# Nettoyer les outils de compilation
RUN apk del .build-deps

# ===================================
# 🚀 STAGE 2: PRODUCTION
# Construit l'image finale, légère et sécurisée.
# ===================================
FROM node:20-alpine

ENV NODE_ENV=production

# Mise à jour et installation de curl et dumb-init pour le healthcheck et le démarrage
RUN apk add --no-cache curl dumb-init

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodeuser

WORKDIR /app

# Copier les dépendances de l'étape 'builder'
COPY --from=builder /app/node_modules ./node_modules

# Copier les fichiers de configuration et de définition de projet
COPY --chown=nodeuser:nodejs package.json package-lock.json ./

# Supprimer les dépendances de développement
RUN npm prune --production

# Copier le code source de l'application et les fichiers associés
COPY --chown=nodeuser:nodejs src ./src

# Créer le répertoire de logs
RUN mkdir -p logs && \
    chown -R nodeuser:nodejs logs

# Variables d'environnement
ENV PORT=3004

# Exposition du port
EXPOSE 3004

# Passage à l'utilisateur non-root
USER nodeuser

# Health check pour l'orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3004/api/health || exit 1

# Point d'entrée avec dumb-init pour gérer les signaux correctement
ENTRYPOINT ["dumb-init", "--"]

# Commande de démarrage du service
CMD ["node", "src/server.js"] 