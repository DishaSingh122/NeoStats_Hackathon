import apiClient, { setAuthToken } from './client.js';

export const authApi = {
  login: async (credentials) => {
    const res = await apiClient.post('/auth/login', credentials);
    if (res.token) {
      setAuthToken(res.token);
    }
    return res;
  },

  logout: async () => {
    const res = await apiClient.post('/auth/logout');
    setAuthToken(null);
    return res;
  },

  getMe: async () => {
    return apiClient.get('/auth/me');
  },
};
