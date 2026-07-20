import api from './api';

const commentService = {
  /**
   * Get comments for a task.
   * GET /comments/task/:taskId?workspaceId=&page=&limit=
   */
  getComments(taskId, workspaceId, page = 1, limit = 50) {
    return api.get(`/comments/task/${taskId}`, {
      params: { workspaceId, page, limit },
    });
  },

  /**
   * Add a comment.
   * POST /comments/task/:taskId
   */
  addComment(taskId, workspaceId, content) {
    return api.post(`/comments/task/${taskId}`, { workspaceId, content });
  },

  /**
   * Edit a comment.
   * PUT /comments/:id
   */
  editComment(commentId, workspaceId, content) {
    return api.put(`/comments/${commentId}`, { workspaceId, content });
  },

  /**
   * Delete a comment.
   * DELETE /comments/:id?workspaceId=
   */
  deleteComment(commentId, workspaceId) {
    return api.delete(`/comments/${commentId}`, { params: { workspaceId } });
  },
};

export default commentService;
