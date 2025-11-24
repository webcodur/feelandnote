import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BO_API_URL || 'http://localhost:3002';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Dashboard APIs
export const dashboardApi = {
  getStats: () => api.get('/api/dashboard/stats'),
  getRecentActivity: (limit?: number) => api.get(`/api/dashboard/recent-activity${limit ? `?limit=${limit}` : ''}`),
  getPopularContents: () => api.get('/api/dashboard/popular-contents'),
};

// Contents APIs
export const contentsApi = {
  getList: (params?: { page?: number; limit?: number; type?: string; search?: string }) =>
    api.get('/api/contents', { params }),
  getById: (id: string) => api.get(`/api/contents/${id}`),
  getStats: (id: string) => api.get(`/api/contents/${id}/stats`),
  update: (id: string, data: any) => api.patch(`/api/contents/${id}`, data),
  delete: (id: string) => api.delete(`/api/contents/${id}`),
};

// Users APIs
export const usersApi = {
  getList: () => api.get('/api/users'),
  getById: (id: string) => api.get(`/api/users/${id}`),
  ban: (id: string) => api.patch(`/api/users/${id}/ban`),
  unban: (id: string) => api.patch(`/api/users/${id}/unban`),
  delete: (id: string) => api.delete(`/api/users/${id}`),
};

// Records APIs
export const recordsApi = {
  getList: (params?: { 
    page?: number; 
    limit?: number; 
    type?: string; 
    search?: string;
    part?: string;
    subtype?: string;
    is_public?: string;
  }) =>
    api.get('/api/records', { params }),
  getById: (id: string) => api.get(`/api/records/${id}`),
  getByContentId: (contentId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/api/records/content/${contentId}`, { params }),
  delete: (id: string) => api.delete(`/api/records/${id}`),
  deleteByUserId: (userId: string) => api.delete(`/api/records/user/${userId}`),
};

// Health check
export const healthCheck = () => api.get('/health');
