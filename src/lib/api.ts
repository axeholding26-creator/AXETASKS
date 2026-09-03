import {
  User,
  Workspace,
  WorkspaceMember,
  Project,
  Task,
  Subtask,
  Comment,
  Attachment,
  TimeEntry,
  Tag,
  TaskStatus,
  TaskPriority,
  Conversation,
  Message,
  AppNotification
} from '../types';

const TOKEN_KEY = 'axetask_jwt_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const isAuthEndpoint = url.startsWith('/api/auth/login') || url.startsWith('/api/auth/signup');
    
    // Only treat 401 as an expired session for authenticated routes (not login/signup)
    if (response.status === 401 && !isAuthEndpoint) {
      removeStoredToken();
      window.dispatchEvent(new Event('auth_expired'));
      throw new Error(data.error || 'Votre session a expiré. Veuillez vous reconnecter.');
    }

    throw new Error(data.error || `Erreur de communication (${response.status})`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    fetchWithAuth<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (name: string, email: string, password: string) =>
    fetchWithAuth<{ user: User; token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  getMe: () => fetchWithAuth<{ user: User }>('/api/auth/me'),

  updateProfile: (name: string, avatar_url?: string) =>
    fetchWithAuth<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, avatar_url }),
    }),

  getUsers: () => fetchWithAuth<User[]>('/api/users'),

  createUser: (data: { name: string; email: string; password?: string; role?: 'admin' | 'member' }) =>
    fetchWithAuth<{ user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUserRole: (userId: string, role: 'admin' | 'member') =>
    fetchWithAuth<{ user: User }>(`/api/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  deleteUser: (userId: string) =>
    fetchWithAuth<{ success: boolean; message?: string }>(`/api/users/${userId}`, {
      method: 'DELETE',
    }),

  // Workspaces
  getWorkspaces: () => fetchWithAuth<Workspace[]>('/api/workspaces'),

  createWorkspace: (data: { name: string; color?: string; icon?: string } | string, color?: string, icon?: string) => {
    const payload = typeof data === 'string' 
      ? { name: data, color: color || '#F59E0B', icon: icon || 'Briefcase' }
      : { name: data.name, color: data.color || '#F59E0B', icon: data.icon || 'Briefcase' };
    return fetchWithAuth<Workspace>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateWorkspace: (id: string, updates: Partial<Workspace>) =>
    fetchWithAuth<Workspace>(`/api/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteWorkspace: (id: string) =>
    fetchWithAuth<{ success: boolean }>(`/api/workspaces/${id}`, {
      method: 'DELETE',
    }),

  // Workspace Members
  getWorkspaceMembers: (workspaceId: string) =>
    fetchWithAuth<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`),

  addWorkspaceMember: (workspaceId: string, emailOrUserId: string, role: 'admin' | 'member' = 'member') =>
    fetchWithAuth<WorkspaceMember>(`/api/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify(
        emailOrUserId.includes('@')
          ? { email: emailOrUserId, role }
          : { user_id: emailOrUserId, role }
      ),
    }),

  updateWorkspaceMember: (memberId: string, role: 'admin' | 'member') =>
    fetchWithAuth<WorkspaceMember>(`/api/workspace-members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  removeWorkspaceMember: (memberId: string) =>
    fetchWithAuth<{ success: boolean }>(`/api/workspace-members/${memberId}`, {
      method: 'DELETE',
    }),

  // Workspace Tags
  getWorkspaceTags: (workspaceId: string) =>
    fetchWithAuth<Tag[]>(`/api/workspaces/${workspaceId}/tags`),

  createWorkspaceTag: (workspaceId: string, name: string, color: string) =>
    fetchWithAuth<Tag>(`/api/workspaces/${workspaceId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    }),

  deleteWorkspaceTag: (tagId: string) =>
    fetchWithAuth<{ success: boolean }>(`/api/tags/${tagId}`, {
      method: 'DELETE',
    }),

  // Projects
  getWorkspaceProjects: (workspaceId: string) =>
    fetchWithAuth<Project[]>(`/api/workspaces/${workspaceId}/projects`),

  getProject: (projectId: string) =>
    fetchWithAuth<Project>(`/api/projects/${projectId}`),

  createProject: (workspaceId: string, data: { name: string; description?: string; deadline?: string; status?: string }) =>
    fetchWithAuth<Project>(`/api/workspaces/${workspaceId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProject: (projectId: string, updates: Partial<Project>) =>
    fetchWithAuth<Project>(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteProject: (projectId: string) =>
    fetchWithAuth<{ success: boolean }>(`/api/projects/${projectId}`, {
      method: 'DELETE',
    }),

  // Tasks
  getProjectTasks: (projectId: string) =>
    fetchWithAuth<Task[]>(`/api/projects/${projectId}/tasks`),

  getDashboardTasks: () =>
    fetchWithAuth<Task[]>('/api/tasks/dashboard'),

  getTask: (taskId: string) =>
    fetchWithAuth<Task>(`/api/tasks/${taskId}`),

  createTask: (projectId: string, data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee_id?: string | null;
    due_date?: string | null;
    tag_ids?: string[];
  }) =>
    fetchWithAuth<Task>(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (taskId: string, updates: Partial<Task> & { tag_ids?: string[] }) =>
    fetchWithAuth<Task>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  reorderTasks: (items: { id: string; status: TaskStatus; position: number }[]) =>
    fetchWithAuth<{ success: boolean }>('/api/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  deleteTask: (taskId: string) =>
    fetchWithAuth<{ success: boolean }>(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  // Subtasks
  addSubtask: (taskId: string, title: string) =>
    fetchWithAuth<Subtask>(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  updateSubtask: (subtaskId: string, updates: Partial<Subtask>) =>
    fetchWithAuth<Subtask>(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteSubtask: (subtaskId: string) =>
    fetchWithAuth<{ success: boolean }>(`/api/subtasks/${subtaskId}`, {
      method: 'DELETE',
    }),

  // Comments
  addComment: (taskId: string, content: string) =>
    fetchWithAuth<Comment>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (commentId: string) =>
    fetchWithAuth<{ success: boolean }>(`/api/comments/${commentId}`, {
      method: 'DELETE',
    }),

  // Attachments
  addAttachment: (taskId: string, data: { file_name: string; file_url: string; file_size?: number; file_type?: string }) =>
    fetchWithAuth<Attachment>(`/api/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteAttachment: (attachmentId: string) =>
    fetchWithAuth<{ success: boolean }>(`/api/attachments/${attachmentId}`, {
      method: 'DELETE',
    }),

  // Time Entries
  logTime: (taskId: string, duration_minutes: number, note?: string, date?: string) =>
    fetchWithAuth<TimeEntry>(`/api/tasks/${taskId}/time-entries`, {
      method: 'POST',
      body: JSON.stringify({ duration_minutes, note, date }),
    }),

  deleteTimeEntry: (entryId: string) =>
    fetchWithAuth<{ success: boolean }>(`/api/time-entries/${entryId}`, {
      method: 'DELETE',
    }),

  getTimeEntries: (params?: { workspace_id?: string; project_id?: string; user_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.workspace_id) query.set('workspace_id', params.workspace_id);
    if (params?.project_id) query.set('project_id', params.project_id);
    if (params?.user_id) query.set('user_id', params.user_id);
    const qs = query.toString();
    return fetchWithAuth<TimeEntry[]>(`/api/time-entries${qs ? `?${qs}` : ''}`);
  },

  // Messaging
  getConversations: () => fetchWithAuth<Conversation[]>('/api/conversations'),

  startConversation: (userId: string) =>
    fetchWithAuth<Conversation>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  getMessages: (conversationId: string, before?: string) => {
    const qs = before ? `?before=${encodeURIComponent(before)}` : '';
    return fetchWithAuth<Message[]>(`/api/conversations/${conversationId}/messages${qs}`);
  },

  sendMessage: (conversationId: string, content: string) =>
    fetchWithAuth<Message>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  markConversationRead: (conversationId: string) =>
    fetchWithAuth<{ success: boolean }>(`/api/conversations/${conversationId}/read`, {
      method: 'POST',
    }),

  // Notifications
  getNotifications: () => fetchWithAuth<AppNotification[]>('/api/notifications'),

  getUnreadNotificationCount: () => fetchWithAuth<{ count: number }>('/api/notifications/unread-count'),

  markNotificationRead: (id: string) =>
    fetchWithAuth<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' }),

  markAllNotificationsRead: () =>
    fetchWithAuth<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' }),

  deleteNotification: (id: string) =>
    fetchWithAuth<{ success: boolean }>(`/api/notifications/${id}`, { method: 'DELETE' }),

  clearAllNotifications: () =>
    fetchWithAuth<{ success: boolean }>('/api/notifications', { method: 'DELETE' }),
};
