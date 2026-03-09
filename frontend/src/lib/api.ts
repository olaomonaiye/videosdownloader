import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7500';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await api.post('/admin/auth/refresh');
        return api(originalRequest);
      } catch {
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Public API helpers
export const publicApi = {
  getSettings: () => api.get('/settings/public').then(r => r.data.data),
  getPlatforms: (params?: any) => api.get('/platforms', { params }).then(r => r.data),
  getPlatform: (slug: string) => api.get(`/platforms/${slug}`).then(r => r.data.data),
  getPlatformCount: () => api.get('/platforms/count').then(r => r.data.data),
  getBlogPosts: (params?: any) => api.get('/blog/posts', { params }).then(r => r.data),
  getBlogPost: (slug: string) => api.get(`/blog/posts/${slug}`).then(r => r.data.data),
  getCategories: () => api.get('/blog/categories').then(r => r.data.data),
  getTags: () => api.get('/blog/tags').then(r => r.data.data),
  getPage: (slug: string) => api.get(`/pages/${slug}`).then(r => r.data.data),
  getNavPages: () => api.get('/pages').then(r => r.data.data),
  analyzeUrl: (url: string) => api.post('/downloads/analyze', { url }).then(r => r.data.data),
  initiateDownload: (data: any) => api.post('/downloads/initiate', data).then(r => r.data.data),
  getDownloadStatus: (id: string) => api.get(`/downloads/${id}/status`).then(r => r.data.data),
};

// Admin API helpers
export const adminApi = {
  login: (data: { email: string; password: string }) => api.post('/admin/auth/login', data).then(r => r.data.data),
  logout: () => api.post('/admin/auth/logout'),
  getMe: () => api.get('/admin/auth/me').then(r => r.data.data),
  refresh: () => api.post('/admin/auth/refresh').then(r => r.data.data),
  // Dashboard
  getDashboardStats: (params?: any) => api.get('/admin/dashboard/stats', { params }).then(r => r.data.data),
  getChartDownloads: (params?: any) => api.get('/admin/dashboard/charts/downloads', { params }).then(r => r.data.data),
  getChartPlatforms: () => api.get('/admin/dashboard/charts/platforms').then(r => r.data.data),
  getActivityLogs: (params?: any) => api.get('/admin/dashboard/activity-logs', { params }).then(r => r.data),
  // Posts
  getPosts: (params?: any) => api.get('/admin/posts', { params }).then(r => r.data),
  getPost: (id: string) => api.get(`/admin/posts/${id}`).then(r => r.data.data),
  createPost: (data: any) => api.post('/admin/posts', data).then(r => r.data.data),
  updatePost: (id: string, data: any) => api.put(`/admin/posts/${id}`, data).then(r => r.data.data),
  deletePost: (id: string) => api.delete(`/admin/posts/${id}`),
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/posts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },
  // Categories
  getCategories: () => api.get('/admin/categories').then(r => r.data.data),
  createCategory: (data: any) => api.post('/admin/categories', data).then(r => r.data.data),
  updateCategory: (id: string, data: any) => api.put(`/admin/categories/${id}`, data).then(r => r.data.data),
  deleteCategory: (id: string) => api.delete(`/admin/categories/${id}`),
  // Tags
  getTags: () => api.get('/admin/tags').then(r => r.data.data),
  deleteTag: (id: string) => api.delete(`/admin/tags/${id}`),
  // Pages
  getPages: (params?: any) => api.get('/admin/pages', { params }).then(r => r.data),
  getPage: (id: string) => api.get(`/admin/pages/${id}`).then(r => r.data.data),
  createPage: (data: any) => api.post('/admin/pages', data).then(r => r.data.data),
  updatePage: (id: string, data: any) => api.put(`/admin/pages/${id}`, data).then(r => r.data.data),
  deletePage: (id: string) => api.delete(`/admin/pages/${id}`),
  // Platforms
  getPlatforms: (params?: any) => api.get('/admin/platforms', { params }).then(r => r.data),
  getPlatform: (id: string) => api.get(`/admin/platforms/${id}`).then(r => r.data.data),
  createPlatform: (data: any) => api.post('/admin/platforms', data).then(r => r.data.data),
  updatePlatform: (id: string, data: any) => api.put(`/admin/platforms/${id}`, data).then(r => r.data.data),
  deletePlatform: (id: string) => api.delete(`/admin/platforms/${id}`),
  // Settings
  getSettings: (group?: string) => api.get('/admin/settings', { params: { group } }).then(r => r.data.data),
  updateSettings: (data: Array<{ key: string; value: string }>) => api.put('/admin/settings', data).then(r => r.data.data),
  // yt-dlp
  getYtdlpStatus: () => api.get('/admin/yt-dlp/status').then(r => r.data),
  updateYtdlp: () => api.post('/admin/yt-dlp/update').then(r => r.data),
  // Users
  getUsers: () => api.get('/admin/users').then(r => r.data.data),
  createUser: (data: any) => api.post('/admin/users', data).then(r => r.data.data),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data).then(r => r.data.data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  // Sitemaps
  regenerateSitemaps: () => api.post('/admin/sitemaps/regenerate').then(r => r.data),
};

export default api;
