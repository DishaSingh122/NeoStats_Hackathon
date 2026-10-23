import apiClient from './client.js';

export const projectApi = {
  getProjects: (params) => apiClient.get('/projects', { params }),
  createProject: (data) => apiClient.post('/projects', data),
  getProjectById: (id) => apiClient.get(`/projects/${id}`),
  updateProject: (id, data) => apiClient.patch(`/projects/${id}`, data),
  archiveProject: (id) => apiClient.patch(`/projects/${id}/archive`),

  // Team members
  getProjectMembers: (projectId) => apiClient.get(`/projects/${projectId}/team`),
  addProjectMember: (projectId, data) => apiClient.post(`/projects/${projectId}/team`, data),
  updateMemberRole: (projectId, userId, role) => apiClient.patch(`/projects/${projectId}/team/${userId}`, { role }),
  removeProjectMember: (projectId, userId) => apiClient.delete(`/projects/${projectId}/team/${userId}`),

  // Tasks under project
  getProjectTasks: (projectId, params) => apiClient.get(`/projects/${projectId}/tasks`, { params }),
  createTask: (projectId, data) => apiClient.post(`/projects/${projectId}/tasks`, data),
};
