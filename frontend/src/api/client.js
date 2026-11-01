import axios from 'axios';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set Auth Token
export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Token ${token}`;
    localStorage.setItem('tone_token', token);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('tone_token');
  }
};

// Initialize stored token on load
const storedToken = localStorage.getItem('tone_token');
if (storedToken) {
  apiClient.defaults.headers.common['Authorization'] = `Token ${storedToken}`;
}

export const singlePredict = (text) => apiClient.post('/analysis/predict/', { text });

export const batchPredict = (formData) => apiClient.post('/analysis/batch-predict/', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

export const youtubePredict = (url, apiKey = '') => apiClient.post('/analysis/youtube-predict/', { url, api_key: apiKey });

export const submitFeedback = (id, sentiment) => apiClient.patch(`/analysis/feedback/${id}/`, { sentiment });

export const getDashboardStats = () => apiClient.get('/analysis/dashboard-stats/');

export const getBatchList = () => apiClient.get('/analysis/batches/');

export const getBatchDetail = (id) => apiClient.get(`/analysis/batches/${id}/`);

export const deleteBatch = (id) => apiClient.delete(`/analysis/batches/${id}/`);

export const getModelMetrics = () => apiClient.get('/analysis/model-metrics/');

export const loginUser = (username, password) => apiClient.post('/account/login/', { username, password });

export const registerUser = (userData) => apiClient.post('/account/register/', userData);

export const getUserProfile = () => apiClient.get('/account/profile/');
