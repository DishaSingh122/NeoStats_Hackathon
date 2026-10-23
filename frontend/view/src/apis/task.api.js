import apiClient from './client.js';

export const taskApi = {
  getTaskById: (id) => apiClient.get(`/tasks/${id}`),
  updateTask: (id, data) => apiClient.patch(`/tasks/${id}`, data),
  deleteTask: (id) => apiClient.delete(`/tasks/${id}`),
  updateStatus: (id, { status, version }) => apiClient.patch(`/tasks/${id}/status`, { status, version }),
  updateAssignee: (id, { assignedTo, version }) => apiClient.patch(`/tasks/${id}/assignee`, { assignedTo, version }),

  // Comments for task
  getComments: (taskId) => apiClient.get(`/tasks/${taskId}/comments`),
  createComment: (taskId, data) => apiClient.post(`/tasks/${taskId}/comments`, data),
};
