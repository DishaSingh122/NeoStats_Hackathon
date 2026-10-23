import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Sends HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

let inMemoryToken = null;

export const setAuthToken = (token) => {
  inMemoryToken = token;
};

// Request interceptor to attach Bearer token if present in memory
apiClient.interceptors.request.use(
  (config) => {
    if (inMemoryToken) {
      config.headers.Authorization = `Bearer ${inMemoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors gracefully
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorResponse = error.response?.data || {
      success: false,
      message: error.message || 'Network error occurred. Is the backend server running?',
    };
    // Attach status code for caller inspection (especially 409 Conflict)
    errorResponse.status = error.response?.status;
    return Promise.reject(errorResponse);
  }
);

export default apiClient;
