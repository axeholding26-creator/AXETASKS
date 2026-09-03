export type UserRole = 'admin' | 'member';
export type WorkspaceRole = 'admin' | 'member';
export type WorkspaceMemberRole = 'admin' | 'member';

export type TaskStatus = 'a_faire' | 'en_cours' | 'en_revision' | 'termine' | 'bloque';
export type TaskPriority = 'basse' | 'normale' | 'haute' | 'urgente';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  created_at?: string;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
  member_count?: number;
  active_tasks_count?: number;
  completed_tasks_count?: number;
  total_tasks_count?: number;
  projects_count?: number;
  my_role?: WorkspaceMemberRole;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
  joined_at: string;
  user?: User;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'planned' | 'completed';
  deadline?: string;
  created_at: string;
  workspace?: Workspace;
  tasks_count?: number;
  active_tasks_count?: number;
  completed_tasks_count?: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  workspace_id: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position?: number;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
}

export interface Attachment {
  id: string;
  task_id: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  uploaded_by: string;
  created_at: string;
  uploader?: User;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  duration_minutes: number;
  note?: string;
  date: string;
  created_at: string;
  user?: User;
  task?: {
    id: string;
    title: string;
    project_id: string;
    project_name?: string;
    workspace_id?: string;
    workspace_name?: string;
    workspace_color?: string;
  };
}

export interface Task {
  id: string;
  project_id: string;
  workspace_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string | null;
  due_date?: string | null;
  created_by: string;
  position: number;
  created_at: string;
  updated_at: string;
  
  // Joins / nested data
  assignee?: User | null;
  creator?: User | null;
  project?: Project;
  workspace?: Workspace;
  subtasks?: Subtask[];
  comments?: Comment[];
  attachments?: Attachment[];
  time_entries?: TimeEntry[];
  tags?: Tag[];
  total_time_minutes?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: User;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  name?: string | null;
  created_at: string;
  participants: User[];
  last_message?: Message | null;
  unread_count: number;
}

export interface DashboardStats {
  total_assigned: number;
  due_today: number;
  overdue: number;
  in_progress: number;
  completed: number;
  blocked: number;
  total_logged_minutes_week: number;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'task_comment'
  | 'task_due_today'
  | 'task_overdue'
  | 'workspace_added'
  | 'workspace_removed'
  | 'workspace_role_changed';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  task_id?: string | null;
  workspace_id?: string | null;
  is_read: boolean;
  created_at: string;
  task?: { id: string; title: string } | null;
  workspace?: { id: string; name: string } | null;
}
