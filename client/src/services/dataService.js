import api from './api';

export const ladderService = {
  // Get ladder rankings
  getLadder: async (params = {}) => {
    const response = await api.get('/ladder', { params });
    return response.data;
  },

  // Search ladder
  searchLadder: async (query, season) => {
    const response = await api.get('/ladder/search', { 
      params: { query, season } 
    });
    return response.data;
  },

  // Get player ranking
  getPlayerRanking: async (id) => {
    const response = await api.get(`/ladder/${id}`);
    return response.data;
  },

  // Add/Update ranking
  updateRanking: async (data) => {
    const response = await api.post('/ladder', data);
    return response.data;
  },

  // Get player profile
  getProfile: async (battleTag) => {
    const response = await api.get('/ladder/profile', {
      params: { battleTag }
    });
    return response.data;
  }
};

export const postService = {
  // Get all posts
  getPosts: async (params = {}) => {
    const response = await api.get('/posts', { params });
    return response.data;
  },

  // Get single post
  getPost: async (id) => {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },

  // Create post
  createPost: async (data) => {
    const response = await api.post('/posts', data);
    return response.data;
  },

  // Update post
  updatePost: async (id, data) => {
    const response = await api.put(`/posts/${id}`, data);
    return response.data;
  },

  // Delete post
  deletePost: async (id) => {
    const response = await api.delete(`/posts/${id}`);
    return response.data;
  },

  // Like post
  likePost: async (id) => {
    const response = await api.post(`/posts/${id}/like`);
    return response.data;
  },

  // Add comment
  addComment: async (id, content) => {
    const response = await api.post(`/posts/${id}/comment`, { content });
    return response.data;
  },

  // Delete comment
  deleteComment: async (postId, commentId) => {
    const response = await api.delete(`/posts/${postId}/comment/${commentId}`);
    return response.data;
  }
};

export const clipService = {
  // Get all clips
  getClips: async (params = {}) => {
    const response = await api.get('/clips', { params });
    return response.data;
  },

  // Get single clip
  getClip: async (id) => {
    const response = await api.get(`/clips/${id}`);
    return response.data;
  },

  // Upload clip
  uploadClip: async (formData) => {
    const response = await api.post('/clips', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Delete clip
  deleteClip: async (id) => {
    const response = await api.delete(`/clips/${id}`);
    return response.data;
  },

  // Like clip
  likeClip: async (id) => {
    const response = await api.post(`/clips/${id}/like`);
    return response.data;
  },

  // Add comment to clip
  addClipComment: async (id, content) => {
    const response = await api.post(`/clips/${id}/comment`, { content });
    return response.data;
  },

  // Delete clip comment
  deleteClipComment: async (clipId, commentId) => {
    const response = await api.delete(`/clips/${clipId}/comment/${commentId}`);
    return response.data;
  },

  // Increment clip views
  incrementClipViews: async (id) => {
    const response = await api.post(`/clips/${id}/view`);
    return response.data;
  }
};
