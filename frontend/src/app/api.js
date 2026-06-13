const BASE_URL = 'http://localhost:8000/api/v1'

const getHeaders = (isMultipart = false) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const headers = {}
  
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json'
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

const handleResponse = async (res) => {
  if (!res.ok) {
    let errorDetail = 'API Request failed'
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') {
        errorDetail = data.detail
      } else if (data.detail) {
        errorDetail = JSON.stringify(data.detail)
      } else {
        errorDetail = JSON.stringify(data)
      }
    } catch (e) {
      errorDetail = await res.text()
    }
    throw new Error(errorDetail)
  }
  
  // Handled for 204 or empty responses
  if (res.status === 204) return null
  try {
    return await res.json()
  } catch (e) {
    return null
  }
}

export const api = {
  auth: {
    signup: (email, fullName, password) => 
      fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, full_name: fullName, password })
      }).then(handleResponse),
      
    login: (username, password) => {
      return fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email: username, password })
      }).then(handleResponse)
    },
    
    me: () => 
      fetch(`${BASE_URL}/auth/me`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse)
  },

  workspaces: {
    list: () => 
      fetch(`${BASE_URL}/workspaces`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    create: (id, name) => 
      fetch(`${BASE_URL}/workspaces`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ id, name })
      }).then(handleResponse),
      
    delete: (workspaceId) =>
      fetch(`${BASE_URL}/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: getHeaders()
      }).then(handleResponse),
      
    get: (workspaceId) =>
      fetch(`${BASE_URL}/workspaces/${workspaceId}`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    invite: (workspaceId, email, role = 'Member') => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/invite`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, role })
      }).then(handleResponse),
      
    join: (workspaceId, email, fullName, password) =>
      fetch(`${BASE_URL}/workspaces/${workspaceId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, password })
      }).then(handleResponse),
      
    invitations: (workspaceId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/invitations`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    search: (workspaceId, query) =>
      fetch(`${BASE_URL}/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    deleteInvitation: (workspaceId, invitationId) =>
      fetch(`${BASE_URL}/workspaces/${workspaceId}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: getHeaders()
      }).then(handleResponse),
      
    members: (workspaceId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/members`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    removeMember: (workspaceId, userId) =>
      fetch(`${BASE_URL}/workspaces/${workspaceId}/members/${userId}`, {
        method: 'DELETE',
        headers: getHeaders()
      }).then(handleResponse)
  },

  projects: {
    list: (workspaceId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/projects`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    create: (workspaceId, name, description) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/projects`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, description })
      }).then(handleResponse),
      
    tasks: (workspaceId, projectId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    createTask: (workspaceId, projectId, title, description, status = 'To Do', assigneeId = null) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title, description, status, assignee_id: assigneeId })
      }).then(handleResponse),
      
    updateTaskStatus: (workspaceId, taskId, status) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/projects/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status })
      }).then(handleResponse),
      
    updateTaskAssignee: (workspaceId, taskId, assigneeId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/projects/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ assignee_id: assigneeId })
      }).then(handleResponse)
  },

  chat: {
    channels: (workspaceId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/channels`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    createChannel: (workspaceId, name, description, isPrivate = false) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/channels`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, description, is_private: isPrivate })
      }).then(handleResponse),
      
    messages: (workspaceId, channelId, limit = 50) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/channels/${channelId}/messages?limit=${limit}`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    thread: (workspaceId, channelId, messageId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/thread`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    editMessage: (workspaceId, channelId, messageId, content) =>
      fetch(`${BASE_URL}/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ content })
      }).then(handleResponse),
      
    deleteMessage: (workspaceId, channelId, messageId) =>
      fetch(`${BASE_URL}/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: getHeaders()
      }).then(res => {
        if (!res.ok) throw new Error('Delete failed')
        return res
      }),
      
    getWsUrl: (workspaceId, token) => {
      return `ws://localhost:8000/api/v1/workspaces/${workspaceId}/channels/ws?token=${token}`
    },
    
    markRead: (workspaceId, channelId) =>
      fetch(`${BASE_URL}/workspaces/${workspaceId}/channels/${channelId}/read`, {
        method: 'POST',
        headers: getHeaders()
      }).then(handleResponse),
    
    uploadFile: (workspaceId, channelId, formData) => {
      const token = localStorage.getItem('access_token')
      return fetch(`${BASE_URL}/workspaces/${workspaceId}/channels/${channelId}/messages/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }).then(handleResponse)
    }
  },

  documents: {
    list: (workspaceId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/documents`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    upload: (workspaceId, file, title, category, isPublic = true, viewerIds = []) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)
      formData.append('category', category || 'General')
      formData.append('is_public', isPublic)
      formData.append('viewer_ids', JSON.stringify(viewerIds))
      
      return fetch(`${BASE_URL}/workspaces/${workspaceId}/documents`, {
        method: 'POST',
        headers: getHeaders(true),
        body: formData
      }).then(handleResponse)
    },
    
    versions: (workspaceId, docId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/documents/${docId}/versions`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    getDownloadUrl: (workspaceId, docId, versionNum) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : ''
      return `${BASE_URL}/workspaces/${workspaceId}/documents/${docId}/download?version_number=${versionNum}&token=${token}`
    },
    
    getViewUrl: (workspaceId, docId, versionNum) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : ''
      return `${BASE_URL}/workspaces/${workspaceId}/documents/${docId}/download?version_number=${versionNum}&inline=true&token=${token}`
    },
    
    updateAccess: (workspaceId, documentId, isPublic, viewerIds) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/documents/${documentId}/access`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ is_public: isPublic, viewer_ids: viewerIds })
      }).then(handleResponse)
  },

  meetings: {
    create: (workspaceId, title, description, scheduledAt, duration) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/meetings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title, description, scheduled_at: scheduledAt, duration_minutes: duration })
      }).then(handleResponse),
      
    list: (workspaceId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/meetings`, { headers: getHeaders() }).then(handleResponse),

    startMeeting: (workspaceId, meetingId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/meetings/${meetingId}/start`, {
        method: 'POST',
        headers: getHeaders()
      }).then(handleResponse),

    endMeeting: (workspaceId, meetingId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: getHeaders(),
      }).then(handleResponse),
    delete: (workspaceId, meetingId) =>
      fetch(`${BASE_URL}/workspaces/${workspaceId}/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }).then(handleResponse),
      
    update: (workspaceId, meetingId, scheduledAt) =>
      fetch(`${BASE_URL}/workspaces/${workspaceId}/meetings/${meetingId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ scheduled_at: scheduledAt })
      }).then(handleResponse),
      
    uploadTranscript: (workspaceId, meetingId, transcript) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/meetings/${meetingId}/transcript`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ transcript })
      }).then(handleResponse),
      
    summarize: (workspaceId, meetingId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/meetings/${meetingId}/summarize`, {
        method: 'POST',
        headers: getHeaders()
      }).then(handleResponse)
  },

  ai: {
    query: (workspaceId, question) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/ai/query`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ question })
      }).then(handleResponse)
  },

  dashboard: {
    workload: (workspaceId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/dashboard`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    aiReport: (workspaceId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/dashboard/ai-report`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse)
  },

  notifications: {
    list: (workspaceId, unreadOnly = false) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/notifications?unread_only=${unreadOnly}`, {
        method: 'GET',
        headers: getHeaders()
      }).then(handleResponse),
      
    read: (workspaceId, notificationId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: getHeaders()
      }).then(handleResponse),
      
    readAll: (workspaceId) => 
      fetch(`${BASE_URL}/workspaces/${workspaceId}/notifications/read-all`, {
        method: 'POST',
        headers: getHeaders()
      }).then(handleResponse)
  }
}
