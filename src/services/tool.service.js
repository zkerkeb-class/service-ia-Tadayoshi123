// src/services/tool.service.js
const axios = require('axios');
const logger = require('../config/logger');

const METRICS_SERVICE_URL = process.env.METRICS_SERVICE_URL || 'http://localhost:3003';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3004';

const tools = [
  {
    type: 'function',
    function: {
      name: 'prometheusQuery',
      description: 'Executes a PromQL query to get current metrics from the monitoring system. Use this for instant values like current CPU usage, error rates, etc.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The PromQL query string to execute. Examples: `rate(http_requests_total{job="auth-service"}[5m])`, `process_cpu_seconds_total{job="db-service"}`, `up{job="ai-service"}`'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'prometheusRangeQuery',
      description: 'Executes a PromQL range query to get metrics over time for charts and trend analysis. Use this for time-series data like performance trends, usage patterns, etc.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The PromQL query string to execute'
          },
          start: {
            type: 'string',
            description: 'Start time (RFC3339 or Unix timestamp). Example: "2024-01-01T00:00:00Z" or "-1h"'
          },
          end: {
            type: 'string',
            description: 'End time (RFC3339 or Unix timestamp). Example: "2024-01-01T01:00:00Z" or "now"'
          },
          step: {
            type: 'string',
            description: 'Query resolution step width. Examples: "15s", "1m", "5m", "1h"'
          }
        },
        required: ['query', 'start', 'end', 'step']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getServiceHealth',
      description: 'Gets the health status of all monitored services. Use this to check if services are running properly.',
      parameters: {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            description: 'Optional: specific service name to check. If not provided, returns health of all services.',
            enum: ['auth-service', 'db-service', 'ai-service', 'metrics-service', 'notification-service', 'payment-service']
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getActiveAlerts',
      description: 'Retrieves currently active alerts from the monitoring system. Use this to see what issues need attention.',
      parameters: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            description: 'Filter alerts by severity level',
            enum: ['critical', 'warning', 'info']
          },
          state: {
            type: 'string',
            description: 'Filter alerts by state',
            enum: ['firing', 'pending', 'resolved']
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generateDashboard',
      description: 'Generates a new dashboard configuration based on user requirements. Use this when users want to create monitoring dashboards.',
      parameters: {
        type: 'object',
        properties: {
          requirements: {
            type: 'string',
            description: 'User requirements for the dashboard. Be specific about what metrics and visualizations they want.'
          },
          templateType: {
            type: 'string',
            description: 'Type of dashboard template to use',
            enum: ['overview', 'performance', 'errors', 'custom']
          },
          complexity: {
            type: 'string',
            description: 'Complexity level of the dashboard',
            enum: ['simple', 'medium', 'complex']
          }
        },
        required: ['requirements']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyzePerformance',
      description: 'Performs a comprehensive performance analysis using multiple metrics. Use this for detailed performance insights.',
      parameters: {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            description: 'Service to analyze',
            enum: ['auth-service', 'db-service', 'ai-service', 'metrics-service', 'notification-service', 'payment-service', 'all']
          },
          timeRange: {
            type: 'string',
            description: 'Time range for analysis',
            enum: ['1h', '6h', '24h', '7d', '30d']
          },
          analysisType: {
            type: 'string',
            description: 'Type of analysis to perform',
            enum: ['overview', 'detailed', 'trends', 'bottlenecks']
          }
        },
        required: ['service']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'diagnoseIssue',
      description: 'Performs automated issue diagnosis based on symptoms and current system state. Use this when users report problems.',
      parameters: {
        type: 'object',
        properties: {
          symptoms: {
            type: 'string',
            description: 'Description of the symptoms or issues being experienced'
          },
          affectedServices: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'List of services that might be affected'
          },
          urgency: {
            type: 'string',
            description: 'Urgency level of the issue',
            enum: ['low', 'medium', 'high', 'critical']
          }
        },
        required: ['symptoms']
      }
    }
  }
];

async function prometheusQuery({ query }) {
  try {
    logger.info(`Executing tool "prometheusQuery" with query: ${query}`);
    const response = await axios.post(`${METRICS_SERVICE_URL}/api/v1/metrics/prometheus/query`, { query });
    
    if (response.data && response.data.success) {
      return JSON.stringify(response.data.data);
    } else {
      throw new Error(response.data.message || 'Failed to execute Prometheus query');
    }
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    logger.error(`Error in prometheusQuery tool: ${errorMessage}`);
    return `Error executing query: ${errorMessage}`;
  }
}

async function prometheusRangeQuery({ query, start, end, step }) {
  try {
    logger.info(`Executing tool "prometheusRangeQuery" with query: ${query}, start: ${start}, end: ${end}, step: ${step}`);
    const response = await axios.post(`${METRICS_SERVICE_URL}/api/v1/metrics/prometheus/query_range`, { 
      query, start, end, step 
    });
    
    if (response.data && response.data.success) {
      return JSON.stringify(response.data.data);
    } else {
      throw new Error(response.data.message || 'Failed to execute Prometheus range query');
    }
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    logger.error(`Error in prometheusRangeQuery tool: ${errorMessage}`);
    return `Error executing range query: ${errorMessage}`;
  }
}

async function getServiceHealth({ service }) {
  try {
    logger.info(`Executing tool "getServiceHealth" for service: ${service || 'all'}`);
    const endpoint = service 
      ? `${METRICS_SERVICE_URL}/api/v1/metrics/health/${service}`
      : `${METRICS_SERVICE_URL}/api/v1/metrics/health`;
    
    const response = await axios.get(endpoint);
    return JSON.stringify(response.data);
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    logger.error(`Error in getServiceHealth tool: ${errorMessage}`);
    return `Error getting service health: ${errorMessage}`;
  }
}

async function getActiveAlerts({ severity, state }) {
  try {
    logger.info(`Executing tool "getActiveAlerts" with filters: severity=${severity}, state=${state}`);
    const params = {};
    if (severity) params.severity = severity;
    if (state) params.state = state;
    
    const response = await axios.get(`${METRICS_SERVICE_URL}/api/v1/alerts`, { params });
    return JSON.stringify(response.data);
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    logger.error(`Error in getActiveAlerts tool: ${errorMessage}`);
    return `Error getting alerts: ${errorMessage}`;
  }
}

async function generateDashboard({ requirements, templateType, complexity }) {
  try {
    logger.info(`Executing tool "generateDashboard" with requirements: ${requirements}`);
    const response = await axios.post(`${AI_SERVICE_URL}/api/v1/dashboard/generate`, {
      requirements,
      templateType: templateType || 'custom',
      complexity: complexity || 'medium'
    });
    
    if (response.data && response.data.success) {
      return JSON.stringify(response.data);
    } else {
      throw new Error(response.data.message || 'Failed to generate dashboard');
    }
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    logger.error(`Error in generateDashboard tool: ${errorMessage}`);
    return `Error generating dashboard: ${errorMessage}`;
  }
}

async function analyzePerformance({ service, timeRange, analysisType }) {
  try {
    logger.info(`Executing tool "analyzePerformance" for service: ${service}, timeRange: ${timeRange}, type: ${analysisType}`);
    
    // Get current metrics for the service
    const metrics = await prometheusQuery({ 
      query: `up{job="${service}"}` 
    });
    
    // Get performance metrics over time
    const end = new Date().toISOString();
    const start = new Date(Date.now() - getTimeRangeMs(timeRange || '24h')).toISOString();
    
    const cpuQuery = `rate(process_cpu_seconds_total{job="${service}"}[5m]) * 100`;
    const memoryQuery = `process_resident_memory_bytes{job="${service}"}`;
    const requestsQuery = `rate(http_requests_total{job="${service}"}[5m])`;
    
    const [cpuData, memoryData, requestsData] = await Promise.all([
      prometheusRangeQuery({ query: cpuQuery, start, end, step: '5m' }),
      prometheusRangeQuery({ query: memoryQuery, start, end, step: '5m' }),
      prometheusRangeQuery({ query: requestsQuery, start, end, step: '5m' })
    ]);
    
    const analysis = {
      service,
      timeRange: timeRange || '24h',
      analysisType: analysisType || 'overview',
      metrics: {
        cpu: JSON.parse(cpuData),
        memory: JSON.parse(memoryData),
        requests: JSON.parse(requestsData)
      },
      summary: `Performance analysis for ${service} over the last ${timeRange || '24h'}`
    };
    
    return JSON.stringify(analysis);
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    logger.error(`Error in analyzePerformance tool: ${errorMessage}`);
    return `Error analyzing performance: ${errorMessage}`;
  }
}

async function diagnoseIssue({ symptoms, affectedServices, urgency }) {
  try {
    logger.info(`Executing tool "diagnoseIssue" with symptoms: ${symptoms}`);
    
    // Get current system state
    const [healthData, alertsData] = await Promise.all([
      getServiceHealth({}),
      getActiveAlerts({})
    ]);
    
    const health = JSON.parse(healthData);
    const alerts = JSON.parse(alertsData);
    
    // Analyze symptoms against current state
    const diagnosis = {
      symptoms,
      affectedServices: affectedServices || [],
      urgency: urgency || 'medium',
      currentState: {
        health,
        alerts
      },
      analysis: `Diagnostic analysis based on symptoms: "${symptoms}"`,
      recommendations: [
        "Check service health status",
        "Review active alerts",
        "Monitor error rates",
        "Verify resource usage"
      ]
    };
    
    return JSON.stringify(diagnosis);
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    logger.error(`Error in diagnoseIssue tool: ${errorMessage}`);
    return `Error diagnosing issue: ${errorMessage}`;
  }
}

function getTimeRangeMs(timeRange) {
  const multipliers = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  return multipliers[timeRange] || multipliers['24h'];
}

const availableTools = {
  prometheusQuery,
  prometheusRangeQuery,
  getServiceHealth,
  getActiveAlerts,
  generateDashboard,
  analyzePerformance,
  diagnoseIssue
};

module.exports = {
  tools,
  availableTools
}; 