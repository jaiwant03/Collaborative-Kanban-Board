import api from './api';

const dashboardService = {
  getStats: (workspaceId) => api.get('/dashboard', { params: { workspaceId } }),
};

export default dashboardService;
