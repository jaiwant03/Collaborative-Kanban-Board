import api from './api';

const workspaceService = {
  getWorkspaces: () => api.get('/workspaces'),
  createWorkspace: (data) => api.post('/workspaces', data),
  joinWorkspace: (inviteCode) => api.post('/workspaces/join', { inviteCode }),
  leaveWorkspace: (id) => api.delete(`/workspaces/${id}/leave`),
  getMembers: (workspaceId) => api.get(`/workspaces/${workspaceId}/members`),
  updateMemberRole: (workspaceId, memberId, role) =>
    api.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role }),
};

export default workspaceService;
