import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5100/api';
const REQUEST_TIMEOUT_MS = parseInt(process.env.REACT_APP_API_TIMEOUT_MS || '8000', 10);
const API_KEY = process.env.REACT_APP_API_KEY;
const CSRF_TOKEN = process.env.REACT_APP_CSRF_TOKEN;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number.isFinite(REQUEST_TIMEOUT_MS) ? REQUEST_TIMEOUT_MS : 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (API_KEY) {
  apiClient.defaults.headers.common['X-API-Key'] = API_KEY;
}

if (CSRF_TOKEN) {
  apiClient.defaults.headers.common['X-CSRF-Token'] = CSRF_TOKEN;
}

export async function uploadLogs(file, config = {}) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post('/logs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    });
    return response.data;
  } catch (error) {
    console.error('uploadLogs error:', error);
    throw error;
  }
}

export async function getIncidents(filters = {}) {
  try {
    const response = await apiClient.get('/incidents', {
      params: filters,
    });
    return response.data;
  } catch (error) {
    console.error('getIncidents error:', error);
    throw error;
  }
}

export async function getIncidentById(id) {
  try {
    const response = await apiClient.get(`/incidents/${id}`);
    return response.data;
  } catch (error) {
    console.error('getIncidentById error:', error);
    throw error;
  }
}

export async function generateExplanation(id) {
  try {
    const response = await apiClient.post(`/incidents/${id}/explain`);
    return response.data;
  } catch (error) {
    console.error('generateExplanation error:', error);
    throw error;
  }
}

export async function updateStatus(id, status) {
  try {
    const response = await apiClient.patch(`/incidents/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('updateStatus error:', error);
    throw error;
  }
}

export async function getStats() {
  try {
    const response = await apiClient.get('/incidents/stats');
    return response.data;
  } catch (error) {
    console.error('getStats error:', error);
    throw error;
  }
}

export async function getTrends(days = 30) {
  try {
    const response = await apiClient.get('/stats/trends', {
      params: { days },
    });
    return response.data;
  } catch (error) {
    console.error('getTrends error:', error);
    throw error;
  }
}

export async function getTopIps(limit = 5) {
  try {
    const response = await apiClient.get('/stats/top-ips', {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error('getTopIps error:', error);
    throw error;
  }
}

// Log Generation APIs (Phase 9D/9E)

export async function getAvailableScenarios() {
  try {
    const response = await apiClient.get('/generate/scenarios');
    return response.data;
  } catch (error) {
    console.error('getAvailableScenarios error:', error);
    throw error;
  }
}

export async function generateLogs(scenarioType, count, autoIngest = false) {
  try {
    const payload = {
      scenarioType,
      // Only send count if provided, to allow backend defaults
      ...(typeof count === 'number' ? { count } : {}),
      autoIngest,
    };

    const response = await apiClient.post('/generate/logs', payload);
    return response.data;
  } catch (error) {
    console.error('generateLogs error:', error);
    throw error;
  }
}

export async function generateAndAnalyze(scenarioType, count) {
  try {
    const payload = {
      scenarioType,
      ...(typeof count === 'number' ? { count } : {}),
    };

    const response = await apiClient.post('/generate/logs/analyze', payload);
    return response.data;
  } catch (error) {
    console.error('generateAndAnalyze error:', error);
    throw error;
  }
}

export async function getGeneratedFiles() {
  try {
    const response = await apiClient.get('/generate/generated');
    return response.data;
  } catch (error) {
    console.error('getGeneratedFiles error:', error);
    throw error;
  }
}

export async function deleteGeneratedFile(filename) {
  try {
    const response = await apiClient.delete(`/generate/generated/${encodeURIComponent(filename)}`);
    return response.data;
  } catch (error) {
    console.error('deleteGeneratedFile error:', error);
    throw error;
  }
}

export default {
  uploadLogs,
  getIncidents,
  getIncidentById,
  generateExplanation,
  updateStatus,
  getStats,
  getTrends,
  getTopIps,
  getAvailableScenarios,
  generateLogs,
  generateAndAnalyze,
  getGeneratedFiles,
  deleteGeneratedFile,
};
