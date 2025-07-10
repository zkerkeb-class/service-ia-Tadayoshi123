// src/data/dashboard-templates.js
// Templates de dashboard prédéfinis pour le service IA

const dashboardTemplates = {
  infrastructure: {
    simple: {
      id: 'infra-simple',
      title: 'Infrastructure - Vue Simple',
      category: 'infrastructure',
      complexity: 'simple',
      description: 'Dashboard basique pour la supervision d\'infrastructure',
      dashboard: {
        title: 'Infrastructure Overview',
        description: 'Métriques essentielles de l\'infrastructure',
        layout: 'grid',
        blocks: [
          {
            id: 'cpu-usage',
            type: 'metric',
            title: 'CPU Usage',
            position: { x: 0, y: 0, w: 4, h: 3 },
            config: {
              metric: 'cpu_usage_percent',
              thresholds: { warning: 70, critical: 90 },
              unit: '%'
            },
            datasource: 'prometheus'
          },
          {
            id: 'memory-usage',
            type: 'metric',
            title: 'Memory Usage',
            position: { x: 4, y: 0, w: 4, h: 3 },
            config: {
              metric: 'memory_usage_percent',
              thresholds: { warning: 80, critical: 95 },
              unit: '%'
            },
            datasource: 'prometheus'
          },
          {
            id: 'disk-usage',
            type: 'metric',
            title: 'Disk Usage',
            position: { x: 8, y: 0, w: 4, h: 3 },
            config: {
              metric: 'disk_usage_percent',
              thresholds: { warning: 80, critical: 90 },
              unit: '%'
            },
            datasource: 'prometheus'
          },
          {
            id: 'network-io',
            type: 'chart',
            title: 'Network I/O',
            position: { x: 0, y: 3, w: 12, h: 4 },
            config: {
              chartType: 'line',
              metrics: ['network_receive_bytes', 'network_transmit_bytes'],
              timeRange: '1h'
            },
            datasource: 'prometheus'
          }
        ]
      }
    },
    medium: {
      id: 'infra-medium',
      title: 'Infrastructure - Vue Complète',
      category: 'infrastructure',
      complexity: 'medium',
      description: 'Dashboard intermédiaire avec métriques détaillées',
      dashboard: {
        title: 'Infrastructure Complete',
        description: 'Vue complète de l\'infrastructure avec alertes',
        layout: 'grid',
        blocks: [
          {
            id: 'system-overview',
            type: 'table',
            title: 'System Overview',
            position: { x: 0, y: 0, w: 8, h: 4 },
            config: {
              columns: ['Host', 'CPU %', 'Memory %', 'Disk %', 'Status'],
              sortable: true,
              filterable: true
            },
            datasource: 'prometheus'
          },
          {
            id: 'alerts-panel',
            type: 'alert',
            title: 'Active Alerts',
            position: { x: 8, y: 0, w: 4, h: 4 },
            config: {
              severity: ['critical', 'warning'],
              maxAlerts: 10
            },
            datasource: 'alertmanager'
          },
          {
            id: 'cpu-trend',
            type: 'chart',
            title: 'CPU Trend (24h)',
            position: { x: 0, y: 4, w: 6, h: 4 },
            config: {
              chartType: 'area',
              metric: 'cpu_usage_percent',
              timeRange: '24h',
              aggregation: 'avg'
            },
            datasource: 'prometheus'
          },
          {
            id: 'memory-trend',
            type: 'chart',
            title: 'Memory Trend (24h)',
            position: { x: 6, y: 4, w: 6, h: 4 },
            config: {
              chartType: 'area',
              metric: 'memory_usage_percent',
              timeRange: '24h',
              aggregation: 'avg'
            },
            datasource: 'prometheus'
          }
        ]
      }
    }
  },
  
  application: {
    simple: {
      id: 'app-simple',
      title: 'Application - Vue Simple',
      category: 'application',
      complexity: 'simple',
      description: 'Métriques essentielles d\'application',
      dashboard: {
        title: 'Application Monitoring',
        description: 'Surveillance des performances applicatives',
        layout: 'grid',
        blocks: [
          {
            id: 'response-time',
            type: 'metric',
            title: 'Response Time',
            position: { x: 0, y: 0, w: 4, h: 3 },
            config: {
              metric: 'http_request_duration_seconds',
              aggregation: 'avg',
              unit: 's',
              thresholds: { warning: 1, critical: 5 }
            },
            datasource: 'prometheus'
          },
          {
            id: 'request-rate',
            type: 'metric',
            title: 'Request Rate',
            position: { x: 4, y: 0, w: 4, h: 3 },
            config: {
              metric: 'http_requests_per_second',
              unit: 'req/s'
            },
            datasource: 'prometheus'
          },
          {
            id: 'error-rate',
            type: 'metric',
            title: 'Error Rate',
            position: { x: 8, y: 0, w: 4, h: 3 },
            config: {
              metric: 'http_error_rate_percent',
              unit: '%',
              thresholds: { warning: 1, critical: 5 }
            },
            datasource: 'prometheus'
          }
        ]
      }
    }
  },

  business: {
    simple: {
      id: 'business-simple',
      title: 'Business - KPIs Essentiels',
      category: 'business',
      complexity: 'simple',
      description: 'Indicateurs business principaux',
      dashboard: {
        title: 'Business KPIs',
        description: 'Métriques business essentielles',
        layout: 'grid',
        blocks: [
          {
            id: 'active-users',
            type: 'metric',
            title: 'Active Users',
            position: { x: 0, y: 0, w: 4, h: 3 },
            config: {
              metric: 'active_users_count',
              unit: 'users'
            },
            datasource: 'application'
          },
          {
            id: 'revenue',
            type: 'metric',
            title: 'Revenue (24h)',
            position: { x: 4, y: 0, w: 4, h: 3 },
            config: {
              metric: 'revenue_24h',
              unit: '€',
              format: 'currency'
            },
            datasource: 'business'
          },
          {
            id: 'conversion-rate',
            type: 'metric',
            title: 'Conversion Rate',
            position: { x: 8, y: 0, w: 4, h: 3 },
            config: {
              metric: 'conversion_rate_percent',
              unit: '%',
              thresholds: { warning: 2, critical: 1 }
            },
            datasource: 'analytics'
          }
        ]
      }
    }
  },

  security: {
    simple: {
      id: 'security-simple',
      title: 'Sécurité - Vue d\'ensemble',
      category: 'security',
      complexity: 'simple',
      description: 'Métriques de sécurité essentielles',
      dashboard: {
        title: 'Security Overview',
        description: 'Surveillance sécuritaire de base',
        layout: 'grid',
        blocks: [
          {
            id: 'failed-logins',
            type: 'metric',
            title: 'Failed Logins (1h)',
            position: { x: 0, y: 0, w: 4, h: 3 },
            config: {
              metric: 'failed_login_attempts_1h',
              thresholds: { warning: 10, critical: 50 }
            },
            datasource: 'security'
          },
          {
            id: 'suspicious-ips',
            type: 'metric',
            title: 'Suspicious IPs',
            position: { x: 4, y: 0, w: 4, h: 3 },
            config: {
              metric: 'suspicious_ip_count',
              thresholds: { warning: 5, critical: 20 }
            },
            datasource: 'security'
          },
          {
            id: 'cert-expiry',
            type: 'metric',
            title: 'Cert Expiry (days)',
            position: { x: 8, y: 0, w: 4, h: 3 },
            config: {
              metric: 'ssl_cert_expiry_days',
              unit: 'days',
              thresholds: { warning: 30, critical: 7 }
            },
            datasource: 'monitoring'
          }
        ]
      }
    }
  }
};

class DashboardTemplateManager {
  getAll() {
    const templates = [];
    
    Object.keys(dashboardTemplates).forEach(category => {
      Object.keys(dashboardTemplates[category]).forEach(complexity => {
        templates.push(dashboardTemplates[category][complexity]);
      });
    });
    
    return templates;
  }

  getByCategory(category) {
    return dashboardTemplates[category] ? 
      Object.values(dashboardTemplates[category]) : [];
  }

  getByComplexity(complexity) {
    const templates = [];
    
    Object.keys(dashboardTemplates).forEach(category => {
      if (dashboardTemplates[category][complexity]) {
        templates.push(dashboardTemplates[category][complexity]);
      }
    });
    
    return templates;
  }

  getById(id) {
    const all = this.getAll();
    return all.find(template => template.id === id);
  }

  getCategories() {
    return Object.keys(dashboardTemplates);
  }

  getComplexityLevels() {
    return ['simple', 'medium', 'advanced'];
  }

  // Génère un template personnalisé basé sur des métriques
  generateCustomTemplate(metrics, category = 'custom', complexity = 'medium') {
    const blockWidth = 12 / Math.min(metrics.length, 4);
    
    const blocks = metrics.map((metric, index) => ({
      id: `custom-${index}`,
      type: this.inferBlockType(metric),
      title: this.formatMetricTitle(metric.name || metric),
      position: {
        x: (index % 4) * blockWidth,
        y: Math.floor(index / 4) * 3,
        w: blockWidth,
        h: 3
      },
      config: {
        metric: metric.name || metric,
        ...metric.config
      },
      datasource: metric.datasource || 'prometheus'
    }));

    return {
      id: `custom-${Date.now()}`,
      title: 'Custom Dashboard',
      category,
      complexity,
      description: 'Dashboard généré automatiquement',
      dashboard: {
        title: 'Custom Dashboard',
        description: 'Généré à partir des métriques sélectionnées',
        layout: 'grid',
        blocks
      }
    };
  }

  inferBlockType(metric) {
    const name = (metric.name || metric).toLowerCase();
    
    if (name.includes('rate') || name.includes('duration') || name.includes('latency')) {
      return 'chart';
    }
    if (name.includes('count') || name.includes('total')) {
      return 'metric';
    }
    if (name.includes('status') || name.includes('state')) {
      return 'table';
    }
    if (name.includes('alert') || name.includes('error')) {
      return 'alert';
    }
    
    return 'metric'; // Par défaut
  }

  formatMetricTitle(metricName) {
    return metricName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}

module.exports = new DashboardTemplateManager(); 