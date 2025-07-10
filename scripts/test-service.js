#!/usr/bin/env node
// scripts/test-service.js
// Script de test simple pour vérifier le fonctionnement du service IA

const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3005';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'your-test-jwt-token';

const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg)
};

async function testHealth() {
  try {
    log.info('Test de santé du service...');
    const response = await axios.get(`${BASE_URL}/api/health`);
    
    if (response.status === 200) {
      log.success('Service en bonne santé');
      console.log('  Uptime:', Math.round(response.data.uptime), 'secondes');
      console.log('  Redis:', response.data.dependencies?.redis || 'unknown');
      console.log('  OpenAI:', response.data.dependencies?.openai || 'unknown');
      return true;
    }
  } catch (error) {
    log.error('Service non disponible:', error.message);
    return false;
  }
}

async function testDashboardGeneration() {
  try {
    log.info('Test de génération de dashboard...');
    
    const testPayload = {
      requirements: 'Je veux surveiller les performances de base de mon infrastructure web avec CPU, mémoire et temps de réponse',
      metrics: ['cpu_usage_percent', 'memory_usage_percent', 'http_response_time'],
      templateType: 'infrastructure',
      complexity: 'simple'
    };

    const response = await axios.post(
      `${BASE_URL}/api/dashboard-agent/generate`,
      testPayload,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200 && response.data.success) {
      log.success('Dashboard généré avec succès');
      console.log('  Titre:', response.data.dashboard?.title || 'N/A');
      console.log('  Blocs:', response.data.dashboard?.blocks?.length || 0);
      console.log('  Cached:', response.data.metadata?.cached || false);
      return true;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      log.warn('Token JWT manquant ou invalide pour le test de dashboard');
    } else {
      log.error('Erreur génération dashboard:', error.response?.data?.error || error.message);
    }
    return false;
  }
}

async function testOpsAssistant() {
  try {
    log.info('Test de l\'assistant opérationnel...');

    const testPayload = {
      metrics: [
        { name: 'cpu_usage_percent', value: 85, timestamp: new Date().toISOString() },
        { name: 'memory_usage_percent', value: 78, timestamp: new Date().toISOString() },
        { name: 'disk_usage_percent', value: 45, timestamp: new Date().toISOString() }
      ],
      timeRange: '1h',
      severity: 'warning'
    };

    const response = await axios.post(
      `${BASE_URL}/api/ops-assistant/analyze-metrics`,
      testPayload,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200 && response.data.success) {
      log.success('Analyse de métriques réussie');
      console.log('  Métriques analysées:', response.data.metadata?.analyzedMetrics || 0);
      console.log('  Cached:', response.data.metadata?.cached || false);
      return true;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      log.warn('Token JWT manquant ou invalide pour le test ops assistant');
    } else {
      log.error('Erreur analyse métriques:', error.response?.data?.error || error.message);
    }
    return false;
  }
}

async function testChat() {
  try {
    log.info('Test du chat assistant...');

    const testPayload = {
      message: 'Bonjour, peux-tu m\'expliquer ce que signifie un CPU à 85% ?',
      context: {
        currentCPU: 85,
        currentMemory: 78
      }
    };

    const response = await axios.post(
      `${BASE_URL}/api/ops-assistant/chat`,
      testPayload,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200 && response.data.success) {
      log.success('Chat assistant fonctionnel');
      console.log('  Session ID:', response.data.sessionId?.substring(0, 8) + '...' || 'N/A');
      console.log('  Réponse length:', response.data.response?.length || 0, 'caractères');
      return true;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      log.warn('Token JWT manquant ou invalide pour le test chat');
    } else {
      log.error('Erreur chat assistant:', error.response?.data?.error || error.message);
    }
    return false;
  }
}

async function testMetrics() {
  try {
    log.info('Test des métriques Prometheus...');
    const response = await axios.get(`${BASE_URL}/metrics`);
    
    if (response.status === 200) {
      const metrics = response.data;
      const hasAIMetrics = metrics.includes('ai_calls_total') || 
                          metrics.includes('ai_response_time');
      
      if (hasAIMetrics) {
        log.success('Métriques Prometheus exposées');
        return true;
      } else {
        log.warn('Métriques de base trouvées mais pas les métriques IA spécifiques');
        return false;
      }
    }
  } catch (error) {
    log.error('Erreur métriques:', error.message);
    return false;
  }
}

async function testServiceInfo() {
  try {
    log.info('Test des informations du service...');
    const response = await axios.get(`${BASE_URL}/api/`);
    
    if (response.status === 200) {
      log.success('Informations service récupérées');
      console.log('  Service:', response.data.service);
      console.log('  Version:', response.data.version);
      console.log('  Agents:', Object.keys(response.data.agents || {}).join(', '));
      return true;
    }
  } catch (error) {
    log.error('Erreur informations service:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log(chalk.bold.blue('\n🤖 Test du Service IA SupervIA\n'));
  console.log('URL de base:', BASE_URL);
  console.log('JWT Token:', JWT_TOKEN ? 'Configuré' : 'Non configuré');
  console.log('');

  const tests = [
    { name: 'Santé du service', fn: testHealth, required: true },
    { name: 'Informations service', fn: testServiceInfo, required: true },
    { name: 'Métriques Prometheus', fn: testMetrics, required: false },
    { name: 'Génération dashboard', fn: testDashboardGeneration, required: false },
    { name: 'Assistant opérationnel', fn: testOpsAssistant, required: false },
    { name: 'Chat assistant', fn: testChat, required: false }
  ];

  const results = [];
  
  for (const test of tests) {
    console.log(chalk.dim('─'.repeat(50)));
    const success = await test.fn();
    results.push({ name: test.name, success, required: test.required });
    console.log('');
  }

  // Résumé
  console.log(chalk.dim('─'.repeat(50)));
  console.log(chalk.bold('\n📊 Résumé des tests:\n'));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const requiredFailed = results.filter(r => !r.success && r.required).length;

  results.forEach(result => {
    const icon = result.success ? '✓' : '✗';
    const color = result.success ? 'green' : (result.required ? 'red' : 'yellow');
    const status = result.required ? '' : ' (optionnel)';
    console.log(chalk[color](icon), result.name + status);
  });

  console.log('\n' + chalk.bold(`Total: ${passed} réussis, ${failed} échoués`));

  if (requiredFailed > 0) {
    console.log(chalk.red('\n❌ Tests critiques échoués - Service non opérationnel'));
    process.exit(1);
  } else if (failed === 0) {
    console.log(chalk.green('\n🎉 Tous les tests sont réussis - Service opérationnel'));
    process.exit(0);
  } else {
    console.log(chalk.yellow('\n⚠️  Tests optionnels échoués - Service partiellement opérationnel'));
    console.log(chalk.dim('Vérifiez la configuration JWT pour les tests authentifiés'));
    process.exit(0);
  }
}

// Gestion des erreurs globales
process.on('unhandledRejection', (reason, promise) => {
  log.error('Erreur non gérée:', reason);
  process.exit(1);
});

// Lancement des tests
if (require.main === module) {
  runAllTests().catch(error => {
    log.error('Erreur lors des tests:', error.message);
    process.exit(1);
  });
}

module.exports = {
  testHealth,
  testDashboardGeneration,
  testOpsAssistant,
  testChat,
  testMetrics,
  testServiceInfo
}; 