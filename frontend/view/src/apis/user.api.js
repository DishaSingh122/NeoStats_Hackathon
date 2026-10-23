import apiClient from './client.js';

export const userApi = {
  getUsers: (params) => apiClient.get('/users', { params }),
  createUser: (data) => apiClient.post('/users', data),
  getUserById: (id) => apiClient.get(`/users/${id}`),
  updateUser: (id, data) => apiClient.patch(`/users/${id}`, data),
  updateUserStatus: (id, isActive) => apiClient.patch(`/users/${id}/status`, { isActive }),
};
