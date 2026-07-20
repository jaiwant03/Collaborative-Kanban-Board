import api from './api';

const chatService = {
  /**
   * Fetch message history for a workspace.
   * @param {string} workspaceId
   * @param {object} [params] - { limit, before } for pagination
   */
  getMessages: (workspaceId, params = {}) =>
    api.get(`/chat/${workspaceId}`, { params }),
};

export default chatService;
