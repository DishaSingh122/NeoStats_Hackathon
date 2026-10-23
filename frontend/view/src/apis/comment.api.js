import apiClient from './client.js';

export const commentApi = {
  deleteComment: (id) => apiClient.delete(`/comments/${id}`),
};
