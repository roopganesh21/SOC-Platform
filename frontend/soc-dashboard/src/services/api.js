import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const API_KEY = process.env.REACT_APP_API_KEY;
const CSRF_TOKEN = process.env.REACT_APP_CSRF_TOKEN;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

export default {
  uploadLogs,
  getIncidents,
  getIncidentById,
  generateExplanation,
  updateStatus,
  getStats,
  getTrends,
  getTopIps,
};
