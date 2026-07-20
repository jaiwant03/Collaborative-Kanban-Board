import api from './api';

const activityService = {
  /**
   * Get activity log for a specific task.
   * GET /activity/task/:taskId?workspaceId=&page=&limit=
   */
  getTaskActivity(taskId, workspaceId, page = 1, limit = 30) {
    return api.get(`/activity/task/${taskId}`, {
      params: { workspaceId, page, limit },
    });
  },

  /**
   * Get workspace-wide activity feed.
   * GET /activity/workspace/:workspaceId?page=&limit=
   */
  getWorkspaceActivity(workspaceId, page = 1, limit = 50) {
    return api.get(`/activity/workspace/${workspaceId}`, {
      params: { page, limit },
    });
  },
};

export default activityService;
