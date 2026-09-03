import { eq, and, desc, asc, inArray, ne, isNull, sql } from 'drizzle-orm';
import { db } from './index.ts';
import * as schema from './schema.ts';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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
  WorkspaceMemberRole,
  Conversation,
  Message,
  AppNotification,
  NotificationType
} from '../types.ts';

function generateId(prefix: string = ''): string {
  return prefix ? `${prefix}_${crypto.randomBytes(8).toString('hex')}` : crypto.randomUUID();
}

const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

// Legacy unsalted SHA-256 hashes (pre-bcrypt migration) are 64 hex chars.
function isLegacySha256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!hash) return false;
  if (isLegacySha256Hash(hash)) {
    return crypto.createHash('sha256').update(password).digest('hex') === hash;
  }
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

// ----------------- USERS -----------------

export async function getAllUsers(): Promise<User[]> {
  try {
    const rows = await db.select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      avatar_url: schema.users.avatar_url,
      created_at: schema.users.created_at,
    }).from(schema.users);

    return rows.map(r => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role as 'admin' | 'member',
      avatar_url: r.avatar_url || undefined,
      created_at: r.created_at ? r.created_at.toISOString() : undefined,
    }));
  } catch (error) {
    console.error('Failed to get users:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserById(id: string) {
  try {
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Failed to get user by id:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserByEmail(email: string) {
  try {
    const rows = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase().trim())).limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Failed to get user by email:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createUser(email: string, password: string, name: string): Promise<User> {
  try {
    const id = generateId('usr');
    const password_hash = hashPassword(password);
    const [created] = await db.insert(schema.users).values({
      id,
      uid: id,
      email: email.toLowerCase().trim(),
      name,
      role: 'member',
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=2563EB`,
      password_hash,
    }).returning();

    return {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role as 'admin' | 'member',
      avatar_url: created.avatar_url || undefined,
      created_at: created.created_at ? created.created_at.toISOString() : undefined,
    };
  } catch (error) {
    console.error('Failed to create user:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateUserProfile(id: string, updates: { name?: string; avatar_url?: string }): Promise<User> {
  try {
    const [updated] = await db.update(schema.users)
      .set({
        ...(updates.name ? { name: updates.name } : {}),
        ...(updates.avatar_url !== undefined ? { avatar_url: updates.avatar_url } : {}),
      })
      .where(eq(schema.users.id, id))
      .returning();

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as 'admin' | 'member',
      avatar_url: updated.avatar_url || undefined,
      created_at: updated.created_at ? updated.created_at.toISOString() : undefined,
    };
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateUserRole(id: string, role: 'admin' | 'member'): Promise<User> {
  try {
    const [updated] = await db.update(schema.users)
      .set({ role })
      .where(eq(schema.users.id, id))
      .returning();

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as 'admin' | 'member',
      avatar_url: updated.avatar_url || undefined,
      created_at: updated.created_at ? updated.created_at.toISOString() : undefined,
    };
  } catch (error) {
    console.error('Failed to update user role:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createUserWithRole(email: string, password: string, name: string, role: 'admin' | 'member' = 'member'): Promise<User> {
  try {
    const id = generateId('usr');
    const password_hash = hashPassword(password);
    const [created] = await db.insert(schema.users).values({
      id,
      uid: id,
      email: email.toLowerCase().trim(),
      name,
      role,
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=2563EB`,
      password_hash,
    }).returning();

    return {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role as 'admin' | 'member',
      avatar_url: created.avatar_url || undefined,
      created_at: created.created_at ? created.created_at.toISOString() : undefined,
    };
  } catch (error) {
    console.error('Failed to create user with role:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    // 1. Nullify created_by on workspaces
    await db.update(schema.workspaces)
      .set({ created_by: null })
      .where(eq(schema.workspaces.created_by, id));

    // 2. Nullify created_by and assignee_id on tasks
    await db.update(schema.tasks)
      .set({ created_by: null })
      .where(eq(schema.tasks.created_by, id));

    await db.update(schema.tasks)
      .set({ assignee_id: null })
      .where(eq(schema.tasks.assignee_id, id));

    // 3. Delete comments by this user
    await db.delete(schema.comments).where(eq(schema.comments.user_id, id));

    // 4. Delete attachments uploaded by this user
    await db.delete(schema.attachments).where(eq(schema.attachments.user_id, id));

    // 5. Delete time entries logged by this user
    await db.delete(schema.timeEntries).where(eq(schema.timeEntries.user_id, id));

    // 6. Delete all workspace memberships for this user
    await db.delete(schema.workspaceMembers).where(eq(schema.workspaceMembers.user_id, id));

    // 7. Delete messages sent by this user, then their conversation memberships
    await db.delete(schema.messages).where(eq(schema.messages.sender_id, id));
    await db.delete(schema.conversationParticipants).where(eq(schema.conversationParticipants.user_id, id));

    // 8. Delete the user record
    await db.delete(schema.users).where(eq(schema.users.id, id));

    return true;
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ----------------- WORKSPACES -----------------

export async function getUserWorkspaces(userId: string, isGlobalAdmin: boolean = false): Promise<Workspace[]> {
  try {
    let wsList: typeof schema.workspaces.$inferSelect[] = [];
    let memberships: typeof schema.workspaceMembers.$inferSelect[] = [];

    if (isGlobalAdmin) {
      wsList = await db.select().from(schema.workspaces);
      memberships = await db.select().from(schema.workspaceMembers);
    } else {
      memberships = await db.select().from(schema.workspaceMembers).where(eq(schema.workspaceMembers.user_id, userId));
      const wsIds = memberships.map(m => m.workspace_id);
      if (wsIds.length === 0) return [];
      wsList = await db.select().from(schema.workspaces).where(inArray(schema.workspaces.id, wsIds));
    }

    const allProjects = await db.select().from(schema.projects);
    const allTasks = await db.select().from(schema.tasks);
    const allMembers = await db.select().from(schema.workspaceMembers);

    return wsList.map(ws => {
      const wsMembers = allMembers.filter(m => m.workspace_id === ws.id);
      const wsProjects = allProjects.filter(p => p.workspace_id === ws.id);
      const projectIds = wsProjects.map(p => p.id);
      const wsTasks = allTasks.filter(t => projectIds.includes(t.project_id));
      
      const userMembership = wsMembers.find(m => m.user_id === userId);
      const myRole: WorkspaceMemberRole = isGlobalAdmin ? 'admin' : (userMembership?.role as WorkspaceMemberRole || 'member');

      return {
        id: ws.id,
        name: ws.name,
        color: ws.color,
        icon: ws.icon,
        created_at: ws.created_at ? ws.created_at.toISOString() : new Date().toISOString(),
        member_count: wsMembers.length,
        projects_count: wsProjects.length,
        total_tasks_count: wsTasks.length,
        active_tasks_count: wsTasks.filter(t => t.status !== 'termine').length,
        completed_tasks_count: wsTasks.filter(t => t.status === 'termine').length,
        my_role: myRole,
      };
    });
  } catch (error) {
    console.error('Failed to get user workspaces:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  try {
    const rows = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, id)).limit(1);
    const ws = rows[0];
    if (!ws) return null;
    return {
      id: ws.id,
      name: ws.name,
      color: ws.color,
      icon: ws.icon,
      created_at: ws.created_at ? ws.created_at.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to get workspace by id:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createWorkspace(name: string, color: string = '#2563EB', icon: string = 'Briefcase', creatorId: string): Promise<Workspace> {
  try {
    const id = generateId('ws');
    const [ws] = await db.insert(schema.workspaces).values({
      id,
      name,
      color,
      icon,
      created_by: creatorId,
    }).returning();

    // Add creator as workspace admin
    await db.insert(schema.workspaceMembers).values({
      id: generateId('wm'),
      workspace_id: id,
      user_id: creatorId,
      role: 'admin',
    });

    return {
      id: ws.id,
      name: ws.name,
      color: ws.color,
      icon: ws.icon,
      created_at: ws.created_at ? ws.created_at.toISOString() : new Date().toISOString(),
      member_count: 1,
      projects_count: 0,
      total_tasks_count: 0,
      active_tasks_count: 0,
      completed_tasks_count: 0,
      my_role: 'admin',
    };
  } catch (error) {
    console.error('Failed to create workspace:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateWorkspace(id: string, updates: Partial<{ name: string; color: string; icon: string }>): Promise<Workspace | null> {
  try {
    const [updated] = await db.update(schema.workspaces)
      .set({
        ...(updates.name ? { name: updates.name } : {}),
        ...(updates.color ? { color: updates.color } : {}),
        ...(updates.icon ? { icon: updates.icon } : {}),
      })
      .where(eq(schema.workspaces.id, id))
      .returning();

    if (!updated) return null;
    return {
      id: updated.id,
      name: updated.name,
      color: updated.color,
      icon: updated.icon,
      created_at: updated.created_at ? updated.created_at.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to update workspace:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  try {
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, id));
    return true;
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ----------------- WORKSPACE MEMBERS -----------------

export async function userCanAccessWorkspace(userId: string, workspaceId: string, isGlobalAdmin: boolean = false): Promise<boolean> {
  if (isGlobalAdmin) return true;
  try {
    const rows = await db.select().from(schema.workspaceMembers)
      .where(and(eq(schema.workspaceMembers.workspace_id, workspaceId), eq(schema.workspaceMembers.user_id, userId)))
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    console.error('Failed to check workspace access:', error);
    return false;
  }
}

export async function userIsWorkspaceAdmin(userId: string, workspaceId: string, isGlobalAdmin: boolean = false): Promise<boolean> {
  if (isGlobalAdmin) return true;
  try {
    const rows = await db.select().from(schema.workspaceMembers)
      .where(and(eq(schema.workspaceMembers.workspace_id, workspaceId), eq(schema.workspaceMembers.user_id, userId), eq(schema.workspaceMembers.role, 'admin')))
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    console.error('Failed to check workspace admin:', error);
    return false;
  }
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  try {
    const members = await db.select().from(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.workspace_id, workspaceId));

    const allUsers = await getAllUsers();

    return members.map(m => {
      const u = allUsers.find(user => user.id === m.user_id);
      return {
        id: m.id,
        workspace_id: m.workspace_id,
        user_id: m.user_id,
        role: m.role as WorkspaceMemberRole,
        joined_at: m.joined_at ? m.joined_at.toISOString() : new Date().toISOString(),
        user: u,
      };
    });
  } catch (error) {
    console.error('Failed to get workspace members:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function addWorkspaceMember(workspaceId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<WorkspaceMember> {
  try {
    const existing = await db.select().from(schema.workspaceMembers)
      .where(and(eq(schema.workspaceMembers.workspace_id, workspaceId), eq(schema.workspaceMembers.user_id, userId)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(schema.workspaceMembers)
        .set({ role })
        .where(eq(schema.workspaceMembers.id, existing[0].id))
        .returning();
      const u = await getUserById(userId);
      return {
        id: updated.id,
        workspace_id: updated.workspace_id,
        user_id: updated.user_id,
        role: updated.role as WorkspaceMemberRole,
        joined_at: updated.joined_at ? updated.joined_at.toISOString() : new Date().toISOString(),
        user: u ? {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role as 'admin' | 'member',
          avatar_url: u.avatar_url || undefined,
        } : undefined,
      };
    }

    const [created] = await db.insert(schema.workspaceMembers).values({
      id: generateId('wm'),
      workspace_id: workspaceId,
      user_id: userId,
      role,
    }).returning();

    const u = await getUserById(userId);

    return {
      id: created.id,
      workspace_id: created.workspace_id,
      user_id: created.user_id,
      role: created.role as WorkspaceMemberRole,
      joined_at: created.joined_at ? created.joined_at.toISOString() : new Date().toISOString(),
      user: u ? {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as 'admin' | 'member',
        avatar_url: u.avatar_url || undefined,
      } : undefined,
    };
  } catch (error) {
    console.error('Failed to add workspace member:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
  try {
    await db.delete(schema.workspaceMembers)
      .where(and(eq(schema.workspaceMembers.workspace_id, workspaceId), eq(schema.workspaceMembers.user_id, userId)));
    return true;
  } catch (error) {
    console.error('Failed to remove workspace member:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateWorkspaceMemberById(memberId: string, role: 'admin' | 'member'): Promise<WorkspaceMember | null> {
  try {
    const [updated] = await db.update(schema.workspaceMembers)
      .set({ role })
      .where(eq(schema.workspaceMembers.id, memberId))
      .returning();

    if (!updated) return null;
    const u = await getUserById(updated.user_id);
    return {
      id: updated.id,
      workspace_id: updated.workspace_id,
      user_id: updated.user_id,
      role: updated.role as WorkspaceMemberRole,
      joined_at: updated.joined_at ? updated.joined_at.toISOString() : new Date().toISOString(),
      user: u ? {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as 'admin' | 'member',
        avatar_url: u.avatar_url || undefined,
      } : undefined,
    };
  } catch (error) {
    console.error('Failed to update workspace member by id:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function removeWorkspaceMemberById(memberId: string): Promise<boolean> {
  try {
    await db.delete(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.id, memberId));
    return true;
  } catch (error) {
    console.error('Failed to remove workspace member by id:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ----------------- PROJECTS -----------------

export async function getWorkspaceProjects(workspaceId: string): Promise<Project[]> {
  try {
    const prjs = await db.select().from(schema.projects)
      .where(eq(schema.projects.workspace_id, workspaceId))
      .orderBy(desc(schema.projects.created_at));

    const prjIds = prjs.map(p => p.id);
    let allTasks: typeof schema.tasks.$inferSelect[] = [];
    if (prjIds.length > 0) {
      allTasks = await db.select().from(schema.tasks).where(inArray(schema.tasks.project_id, prjIds));
    }

    const [ws] = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, workspaceId)).limit(1);

    return prjs.map(p => {
      const pTasks = allTasks.filter(t => t.project_id === p.id);
      return {
        id: p.id,
        workspace_id: p.workspace_id,
        name: p.name,
        description: p.description || undefined,
        status: p.status as 'active' | 'archived' | 'planned' | 'completed',
        deadline: p.deadline || undefined,
        created_at: p.created_at ? p.created_at.toISOString() : new Date().toISOString(),
        tasks_count: pTasks.length,
        active_tasks_count: pTasks.filter(t => t.status !== 'termine').length,
        completed_tasks_count: pTasks.filter(t => t.status === 'termine').length,
        workspace: ws ? {
          id: ws.id,
          name: ws.name,
          color: ws.color,
          icon: ws.icon,
          created_at: ws.created_at ? ws.created_at.toISOString() : new Date().toISOString(),
        } : undefined,
      };
    });
  } catch (error) {
    console.error('Failed to get workspace projects:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const [p] = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
    if (!p) return null;

    const [ws] = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, p.workspace_id)).limit(1);
    const pTasks = await db.select().from(schema.tasks).where(eq(schema.tasks.project_id, p.id));

    return {
      id: p.id,
      workspace_id: p.workspace_id,
      name: p.name,
      description: p.description || undefined,
      status: p.status as 'active' | 'archived' | 'planned' | 'completed',
      deadline: p.deadline || undefined,
      created_at: p.created_at ? p.created_at.toISOString() : new Date().toISOString(),
      tasks_count: pTasks.length,
      active_tasks_count: pTasks.filter(t => t.status !== 'termine').length,
      completed_tasks_count: pTasks.filter(t => t.status === 'termine').length,
      workspace: ws ? {
        id: ws.id,
        name: ws.name,
        color: ws.color,
        icon: ws.icon,
        created_at: ws.created_at ? ws.created_at.toISOString() : new Date().toISOString(),
      } : undefined,
    };
  } catch (error) {
    console.error('Failed to get project by id:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createProject(workspaceId: string, name: string, description?: string, deadline?: string, status: string = 'en_cours'): Promise<Project> {
  try {
    const id = generateId('prj');
    const [created] = await db.insert(schema.projects).values({
      id,
      workspace_id: workspaceId,
      name,
      description,
      deadline,
      status,
    }).returning();

    return {
      id: created.id,
      workspace_id: created.workspace_id,
      name: created.name,
      description: created.description || undefined,
      status: created.status as 'active' | 'archived' | 'planned' | 'completed',
      deadline: created.deadline || undefined,
      created_at: created.created_at ? created.created_at.toISOString() : new Date().toISOString(),
      tasks_count: 0,
      active_tasks_count: 0,
      completed_tasks_count: 0,
    };
  } catch (error) {
    console.error('Failed to create project:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateProject(id: string, updates: Partial<{ name: string; description: string; status: string; deadline: string }>): Promise<Project | null> {
  try {
    const [updated] = await db.update(schema.projects)
      .set({
        ...(updates.name ? { name: updates.name } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.deadline !== undefined ? { deadline: updates.deadline } : {}),
      })
      .where(eq(schema.projects.id, id))
      .returning();

    if (!updated) return null;
    return getProjectById(id);
  } catch (error) {
    console.error('Failed to update project:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    await db.delete(schema.projects).where(eq(schema.projects.id, id));
    return true;
  } catch (error) {
    console.error('Failed to delete project:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ----------------- TAGS -----------------

export async function getWorkspaceTags(workspaceId: string): Promise<Tag[]> {
  try {
    const rows = await db.select().from(schema.tags).where(eq(schema.tags.workspace_id, workspaceId));
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      color: r.color,
      workspace_id: r.workspace_id,
    }));
  } catch (error) {
    console.error('Failed to get workspace tags:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createTag(workspaceId: string, name: string, color: string = '#2563EB'): Promise<Tag> {
  try {
    const id = generateId('tag');
    const [created] = await db.insert(schema.tags).values({
      id,
      workspace_id: workspaceId,
      name,
      color,
    }).returning();

    return {
      id: created.id,
      name: created.name,
      color: created.color,
      workspace_id: created.workspace_id,
    };
  } catch (error) {
    console.error('Failed to create tag:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteTag(id: string): Promise<boolean> {
  try {
    await db.delete(schema.tags).where(eq(schema.tags.id, id));
    return true;
  } catch (error) {
    console.error('Failed to delete tag:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ----------------- TASKS -----------------

async function populateTaskDetails(t: typeof schema.tasks.$inferSelect): Promise<Task> {
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, t.project_id)).limit(1);
  let workspace: typeof schema.workspaces.$inferSelect | undefined;
  if (project) {
    const [ws] = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, project.workspace_id)).limit(1);
    workspace = ws;
  }

  const assignee = t.assignee_id ? await getUserById(t.assignee_id) : null;
  const creator = t.created_by ? await getUserById(t.created_by) : null;

  const subtasksList = await db.select().from(schema.subtasks).where(eq(schema.subtasks.task_id, t.id)).orderBy(asc(schema.subtasks.created_at));
  const commentsList = await db.select().from(schema.comments).where(eq(schema.comments.task_id, t.id)).orderBy(desc(schema.comments.created_at));
  const attachmentsList = await db.select().from(schema.attachments).where(eq(schema.attachments.task_id, t.id)).orderBy(desc(schema.attachments.created_at));
  const timeEntriesList = await db.select().from(schema.timeEntries).where(eq(schema.timeEntries.task_id, t.id)).orderBy(desc(schema.timeEntries.created_at));
  
  // Task tags
  const taskTagsList = await db.select().from(schema.taskTags).where(eq(schema.taskTags.task_id, t.id));
  const tagIds = taskTagsList.map(tt => tt.tag_id);
  let tagsList: Tag[] = [];
  if (tagIds.length > 0) {
    const rawTags = await db.select().from(schema.tags).where(inArray(schema.tags.id, tagIds));
    tagsList = rawTags.map(rt => ({
      id: rt.id,
      name: rt.name,
      color: rt.color,
      workspace_id: rt.workspace_id,
    }));
  }

  const allUsers = await getAllUsers();
  const totalMinutes = timeEntriesList.reduce((sum, te) => sum + te.duration_minutes, 0);

  return {
    id: t.id,
    project_id: t.project_id,
    workspace_id: project?.workspace_id,
    title: t.title,
    description: t.description || undefined,
    status: t.status as TaskStatus,
    priority: t.priority as TaskPriority,
    assignee_id: t.assignee_id,
    due_date: t.due_date,
    created_by: t.created_by || '',
    position: t.position || 0,
    created_at: t.created_at ? t.created_at.toISOString() : new Date().toISOString(),
    updated_at: t.created_at ? t.created_at.toISOString() : new Date().toISOString(),
    assignee: assignee ? {
      id: assignee.id,
      email: assignee.email,
      name: assignee.name,
      role: assignee.role as 'admin' | 'member',
      avatar_url: assignee.avatar_url || undefined,
    } : null,
    creator: creator ? {
      id: creator.id,
      email: creator.email,
      name: creator.name,
      role: creator.role as 'admin' | 'member',
      avatar_url: creator.avatar_url || undefined,
    } : null,
    project: project ? {
      id: project.id,
      workspace_id: project.workspace_id,
      name: project.name,
      description: project.description || undefined,
      status: project.status as any,
      deadline: project.deadline || undefined,
      created_at: project.created_at ? project.created_at.toISOString() : new Date().toISOString(),
    } : undefined,
    workspace: workspace ? {
      id: workspace.id,
      name: workspace.name,
      color: workspace.color,
      icon: workspace.icon,
      created_at: workspace.created_at ? workspace.created_at.toISOString() : new Date().toISOString(),
    } : undefined,
    subtasks: subtasksList.map(s => ({
      id: s.id,
      task_id: s.task_id,
      title: s.title,
      completed: !!s.completed,
      created_at: s.created_at ? s.created_at.toISOString() : new Date().toISOString(),
    })),
    comments: commentsList.map(c => ({
      id: c.id,
      task_id: c.task_id,
      user_id: c.user_id,
      content: c.content,
      created_at: c.created_at ? c.created_at.toISOString() : new Date().toISOString(),
      user: allUsers.find(u => u.id === c.user_id),
    })),
    attachments: attachmentsList.map(a => ({
      id: a.id,
      task_id: a.task_id,
      file_url: a.file_url,
      file_name: a.file_name,
      file_size: a.file_size || undefined,
      file_type: a.file_type || undefined,
      uploaded_by: a.user_id,
      created_at: a.created_at ? a.created_at.toISOString() : new Date().toISOString(),
      uploader: allUsers.find(u => u.id === a.user_id),
    })),
    time_entries: timeEntriesList.map(te => ({
      id: te.id,
      task_id: te.task_id,
      user_id: te.user_id,
      duration_minutes: te.duration_minutes,
      note: te.note || undefined,
      date: te.date,
      created_at: te.created_at ? te.created_at.toISOString() : new Date().toISOString(),
      user: allUsers.find(u => u.id === te.user_id),
    })),
    tags: tagsList,
    total_time_minutes: totalMinutes,
  };
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  try {
    const rawTasks = await db.select().from(schema.tasks)
      .where(eq(schema.tasks.project_id, projectId))
      .orderBy(asc(schema.tasks.position), desc(schema.tasks.created_at));

    const tasks = await Promise.all(rawTasks.map(t => populateTaskDetails(t)));
    return tasks;
  } catch (error) {
    console.error('Failed to get project tasks:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserDashboardTasks(userId: string, isGlobalAdmin: boolean = false): Promise<Task[]> {
  try {
    const allWorkspaces = await getUserWorkspaces(userId, isGlobalAdmin);
    const wsIds = allWorkspaces.map(w => w.id);
    if (wsIds.length === 0) return [];

    const wsProjects = await db.select().from(schema.projects).where(inArray(schema.projects.workspace_id, wsIds));
    const prjIds = wsProjects.map(p => p.id);
    if (prjIds.length === 0) return [];

    let rawTasks: typeof schema.tasks.$inferSelect[] = [];
    if (isGlobalAdmin) {
      rawTasks = await db.select().from(schema.tasks).where(inArray(schema.tasks.project_id, prjIds)).orderBy(desc(schema.tasks.created_at));
    } else {
      rawTasks = await db.select().from(schema.tasks)
        .where(and(inArray(schema.tasks.project_id, prjIds), eq(schema.tasks.assignee_id, userId)))
        .orderBy(desc(schema.tasks.created_at));
    }

    return Promise.all(rawTasks.map(t => populateTaskDetails(t)));
  } catch (error) {
    console.error('Failed to get dashboard tasks:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getTaskById(id: string): Promise<Task | null> {
  try {
    const [t] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).limit(1);
    if (!t) return null;
    return populateTaskDetails(t);
  } catch (error) {
    console.error('Failed to get task by id:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createTask(data: {
  project_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string | null;
  due_date?: string | null;
  created_by: string;
  tag_ids?: string[];
}): Promise<Task> {
  try {
    const id = generateId('tsk');
    const existing = await db.select().from(schema.tasks).where(eq(schema.tasks.project_id, data.project_id));
    const maxPosition = existing.reduce((max, t) => Math.max(max, t.position || 0), -1);

    const [created] = await db.insert(schema.tasks).values({
      id,
      project_id: data.project_id,
      title: data.title,
      description: data.description,
      status: data.status || 'a_faire',
      priority: data.priority || 'normale',
      assignee_id: data.assignee_id || null,
      due_date: data.due_date || null,
      position: maxPosition + 1,
      created_by: data.created_by,
    }).returning();

    if (data.tag_ids && data.tag_ids.length > 0) {
      for (const tagId of data.tag_ids) {
        await db.insert(schema.taskTags).values({
          id: generateId('tt'),
          task_id: id,
          tag_id: tagId,
        });
      }
    }

    const fullTask = await getTaskById(id);
    if (!fullTask) throw new Error('Task created but could not be retrieved');
    return fullTask;
  } catch (error) {
    console.error('Failed to create task:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateTask(id: string, updates: Partial<{
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  tag_ids: string[];
  position: number;
}>): Promise<Task | null> {
  try {
    const setPayload: any = {};
    if (updates.title !== undefined) setPayload.title = updates.title;
    if (updates.description !== undefined) setPayload.description = updates.description;
    if (updates.status !== undefined) setPayload.status = updates.status;
    if (updates.priority !== undefined) setPayload.priority = updates.priority;
    if (updates.assignee_id !== undefined) setPayload.assignee_id = updates.assignee_id;
    if (updates.due_date !== undefined) setPayload.due_date = updates.due_date;
    if (updates.position !== undefined) setPayload.position = updates.position;

    if (Object.keys(setPayload).length > 0) {
      await db.update(schema.tasks).set(setPayload).where(eq(schema.tasks.id, id));
    }

    if (updates.tag_ids !== undefined) {
      await db.delete(schema.taskTags).where(eq(schema.taskTags.task_id, id));
      for (const tagId of updates.tag_ids) {
        await db.insert(schema.taskTags).values({
          id: generateId('tt'),
          task_id: id,
          tag_id: tagId,
        });
      }
    }

    return getTaskById(id);
  } catch (error) {
    console.error('Failed to update task:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function reorderTasks(items: Array<{ id: string; status: TaskStatus; position: number }>): Promise<void> {
  try {
    for (const item of items) {
      await db.update(schema.tasks)
        .set({ status: item.status, position: item.position })
        .where(eq(schema.tasks.id, item.id));
    }
  } catch (error) {
    console.error('Failed to reorder tasks:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
    return true;
  } catch (error) {
    console.error('Failed to delete task:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ----------------- SUBTASKS -----------------

export async function addSubtask(taskId: string, title: string): Promise<Subtask> {
  try {
    const id = generateId('sub');
    const [created] = await db.insert(schema.subtasks).values({
      id,
      task_id: taskId,
      title,
      completed: false,
    }).returning();

    return {
      id: created.id,
      task_id: created.task_id,
      title: created.title,
      completed: !!created.completed,
      created_at: created.created_at ? created.created_at.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to add subtask:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateSubtask(id: string, updates: { completed?: boolean; title?: string }): Promise<Subtask | null> {
  try {
    const [updated] = await db.update(schema.subtasks)
      .set({
        ...(updates.completed !== undefined ? { completed: updates.completed } : {}),
        ...(updates.title ? { title: updates.title } : {}),
      })
      .where(eq(schema.subtasks.id, id))
      .returning();

    if (!updated) return null;
    return {
      id: updated.id,
      task_id: updated.task_id,
      title: updated.title,
      completed: !!updated.completed,
      created_at: updated.created_at ? updated.created_at.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to update subtask:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteSubtask(id: string): Promise<boolean> {
  try {
    await db.delete(schema.subtasks).where(eq(schema.subtasks.id, id));
    return true;
  } catch (error) {
    console.error('Failed to delete subtask:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ----------------- COMMENTS -----------------

export async function addComment(taskId: string, userId: string, content: string): Promise<Comment> {
  try {
    const id = generateId('com');
    const [created] = await db.insert(schema.comments).values({
      id,
      task_id: taskId,
      user_id: userId,
      content,
    }).returning();

    const u = await getUserById(userId);

    return {
      id: created.id,
      task_id: created.task_id,
      user_id: created.user_id,
      content: created.content,
      created_at: created.created_at ? created.created_at.toISOString() : new Date().toISOString(),
      user: u ? {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as 'admin' | 'member',
        avatar_url: u.avatar_url || undefined,
      } : undefined,
    };
  } catch (error) {
    console.error('Failed to add comment:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteComment(id: string): Promise<boolean> {
  try {
    await db.delete(schema.comments).where(eq(schema.comments.id, id));
    return true;
  } catch (error) {
    console.error('Failed to delete comment:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ----------------- ATTACHMENTS -----------------

export async function addAttachment(taskId: string, userId: string, fileName: string, fileUrl: string, fileSize?: number, fileType?: string): Promise<Attachment> {
  try {
    const id = generateId('att');
    const [created] = await db.insert(schema.attachments).values({
      id,
      task_id: taskId,
      user_id: userId,
      file_name: fileName,
      file_url: fileUrl,
      file_size: fileSize,
      file_type: fileType,
    }).returning();

    const u = await getUserById(userId);

    return {
      id: created.id,
      task_id: created.task_id,
      file_name: created.file_name,
      file_url: created.file_url,
      file_size: created.file_size || undefined,
      file_type: created.file_type || undefined,
      uploaded_by: created.user_id,
      created_at: created.created_at ? created.created_at.toISOString() : new Date().toISOString(),
      uploader: u ? {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as 'admin' | 'member',
        avatar_url: u.avatar_url || undefined,
      } : undefined,
    };
  } catch (error) {
    console.error('Failed to add attachment:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteAttachment(id: string): Promise<boolean> {
  try {
    await db.delete(schema.attachments).where(eq(schema.attachments.id, id));
    return true;
  } catch (error) {
    console.error('Failed to delete attachment:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ----------------- TIME TRACKING -----------------

export async function logTime(taskId: string, userId: string, durationMinutes: number, note?: string, date?: string): Promise<TimeEntry> {
  try {
    const id = generateId('te');
    const [created] = await db.insert(schema.timeEntries).values({
      id,
      task_id: taskId,
      user_id: userId,
      duration_minutes: durationMinutes,
      note,
      date: date || new Date().toISOString().split('T')[0],
    }).returning();

    const u = await getUserById(userId);

    return {
      id: created.id,
      task_id: created.task_id,
      user_id: created.user_id,
      duration_minutes: created.duration_minutes,
      note: created.note || undefined,
      date: created.date,
      created_at: created.created_at ? created.created_at.toISOString() : new Date().toISOString(),
      user: u ? {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as 'admin' | 'member',
        avatar_url: u.avatar_url || undefined,
      } : undefined,
    };
  } catch (error) {
    console.error('Failed to log time:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteTimeEntry(id: string): Promise<boolean> {
  try {
    await db.delete(schema.timeEntries).where(eq(schema.timeEntries.id, id));
    return true;
  } catch (error) {
    console.error('Failed to delete time entry:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getTimeEntries(
  userId: string, 
  isGlobalAdmin: boolean = false, 
  filters: { workspace_id?: string; project_id?: string; user_id?: string } = {}
): Promise<TimeEntry[]> {
  try {
    const allWorkspaces = await getUserWorkspaces(userId, isGlobalAdmin);
    const accessibleWsIds = allWorkspaces.map(w => w.id);
    if (accessibleWsIds.length === 0) return [];

    const wsFilter = filters.workspace_id && filters.workspace_id !== 'all' 
      ? [filters.workspace_id] 
      : accessibleWsIds;

    const allProjects = await db.select().from(schema.projects).where(inArray(schema.projects.workspace_id, wsFilter));
    const prjFilter = filters.project_id && filters.project_id !== 'all'
      ? allProjects.filter(p => p.id === filters.project_id)
      : allProjects;

    const prjIds = prjFilter.map(p => p.id);
    if (prjIds.length === 0) return [];

    const allTasks = await db.select().from(schema.tasks).where(inArray(schema.tasks.project_id, prjIds));
    const taskIds = allTasks.map(t => t.id);
    if (taskIds.length === 0) return [];

    let entries = await db.select().from(schema.timeEntries)
      .where(inArray(schema.timeEntries.task_id, taskIds))
      .orderBy(desc(schema.timeEntries.date), desc(schema.timeEntries.created_at));

    if (filters.user_id) {
      entries = entries.filter(e => e.user_id === filters.user_id);
    }

    const allUsers = await getAllUsers();

    return entries.map(e => {
      const task = allTasks.find(t => t.id === e.task_id);
      const prj = task ? allProjects.find(p => p.id === task.project_id) : undefined;
      const ws = prj ? allWorkspaces.find(w => w.id === prj.workspace_id) : undefined;

      return {
        id: e.id,
        task_id: e.task_id,
        user_id: e.user_id,
        duration_minutes: e.duration_minutes,
        note: e.note || undefined,
        date: e.date,
        created_at: e.created_at ? e.created_at.toISOString() : new Date().toISOString(),
        user: allUsers.find(u => u.id === e.user_id),
        task: task ? {
          id: task.id,
          title: task.title,
          project_id: task.project_id,
          project_name: prj?.name,
          workspace_id: prj?.workspace_id,
          workspace_name: ws?.name,
          workspace_color: ws?.color,
        } : undefined,
      };
    });
  } catch (error) {
    console.error('Failed to get time entries:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// Ensures the single owner admin account exists on boot. Never overwrites an
// existing account's password/role — that would silently undo a real password
// change. It only creates the account the first time the database is empty,
// and only if ADMIN_EMAIL/ADMIN_PASSWORD are set — the password is never
// hardcoded in source so it never ends up in git history.
export async function ensureAdminUser(): Promise<void> {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return;
  }

  try {
    const existing = await getUserByEmail(ADMIN_EMAIL);
    if (!existing) {
      await createUserWithRole(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, 'admin');
      console.log(`[AxeTask DB] Created initial admin account ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.warn('[AxeTask DB] Could not ensure admin account:', err);
  }
}

// ----------------- CONVERSATIONS & MESSAGES -----------------

async function hydrateConversation(conversationId: string, currentUserId: string): Promise<Conversation | null> {
  const [conv] = await db.select().from(schema.conversations).where(eq(schema.conversations.id, conversationId)).limit(1);
  if (!conv) return null;

  const participantRows = await db.select().from(schema.conversationParticipants)
    .where(eq(schema.conversationParticipants.conversation_id, conversationId));

  const allUsers = await getAllUsers();
  const participants = participantRows
    .map(p => allUsers.find(u => u.id === p.user_id))
    .filter((u): u is User => !!u);

  const [lastMessageRow] = await db.select().from(schema.messages)
    .where(eq(schema.messages.conversation_id, conversationId))
    .orderBy(desc(schema.messages.created_at))
    .limit(1);

  const myParticipant = participantRows.find(p => p.user_id === currentUserId);
  let unread_count = 0;
  if (myParticipant) {
    const unreadWhere = myParticipant.last_read_at
      ? and(
          eq(schema.messages.conversation_id, conversationId),
          ne(schema.messages.sender_id, currentUserId),
          sql`${schema.messages.created_at} > ${myParticipant.last_read_at}`
        )
      : and(
          eq(schema.messages.conversation_id, conversationId),
          ne(schema.messages.sender_id, currentUserId)
        );
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.messages).where(unreadWhere);
    unread_count = count || 0;
  }

  return {
    id: conv.id,
    is_group: !!conv.is_group,
    name: conv.name,
    created_at: conv.created_at ? conv.created_at.toISOString() : new Date().toISOString(),
    participants,
    last_message: lastMessageRow ? {
      id: lastMessageRow.id,
      conversation_id: lastMessageRow.conversation_id,
      sender_id: lastMessageRow.sender_id,
      content: lastMessageRow.content,
      created_at: lastMessageRow.created_at ? lastMessageRow.created_at.toISOString() : new Date().toISOString(),
    } : null,
    unread_count,
  };
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  try {
    const myParticipations = await db.select().from(schema.conversationParticipants)
      .where(eq(schema.conversationParticipants.user_id, userId));

    const conversations = await Promise.all(
      myParticipations.map(p => hydrateConversation(p.conversation_id, userId))
    );

    const valid = conversations.filter((c): c is Conversation => !!c);
    valid.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
    return valid;
  } catch (error) {
    console.error('Failed to get user conversations:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function userIsConversationParticipant(userId: string, conversationId: string): Promise<boolean> {
  try {
    const rows = await db.select().from(schema.conversationParticipants)
      .where(and(eq(schema.conversationParticipants.conversation_id, conversationId), eq(schema.conversationParticipants.user_id, userId)))
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    console.error('Failed to check conversation membership:', error);
    return false;
  }
}

export async function findOrCreateDirectConversation(userId: string, otherUserId: string): Promise<Conversation> {
  if (userId === otherUserId) {
    throw new Error('Impossible de démarrer une conversation avec soi-même.');
  }
  try {
    const myConvIds = (await db.select().from(schema.conversationParticipants)
      .where(eq(schema.conversationParticipants.user_id, userId)))
      .map(p => p.conversation_id);

    if (myConvIds.length > 0) {
      const candidateParticipants = await db.select().from(schema.conversationParticipants)
        .where(and(inArray(schema.conversationParticipants.conversation_id, myConvIds), eq(schema.conversationParticipants.user_id, otherUserId)));

      for (const cp of candidateParticipants) {
        const [conv] = await db.select().from(schema.conversations).where(eq(schema.conversations.id, cp.conversation_id)).limit(1);
        if (conv && !conv.is_group) {
          const hydrated = await hydrateConversation(conv.id, userId);
          if (hydrated) return hydrated;
        }
      }
    }

    const id = generateId('conv');
    await db.insert(schema.conversations).values({
      id,
      is_group: false,
      created_by: userId,
    });
    await db.insert(schema.conversationParticipants).values([
      { id: generateId('cp'), conversation_id: id, user_id: userId },
      { id: generateId('cp'), conversation_id: id, user_id: otherUserId },
    ]);

    const hydrated = await hydrateConversation(id, userId);
    if (!hydrated) throw new Error('Conversation created but could not be retrieved');
    return hydrated;
  } catch (error) {
    console.error('Failed to find or create direct conversation:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getConversationMessages(conversationId: string, limit: number = 50, before?: string): Promise<Message[]> {
  try {
    const whereClause = before
      ? and(eq(schema.messages.conversation_id, conversationId), sql`${schema.messages.created_at} < ${new Date(before)}`)
      : eq(schema.messages.conversation_id, conversationId);

    const rows = await db.select().from(schema.messages)
      .where(whereClause)
      .orderBy(desc(schema.messages.created_at))
      .limit(limit);

    const allUsers = await getAllUsers();

    return rows.reverse().map(m => ({
      id: m.id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at ? m.created_at.toISOString() : new Date().toISOString(),
      sender: allUsers.find(u => u.id === m.sender_id),
    }));
  } catch (error) {
    console.error('Failed to get conversation messages:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
  try {
    const id = generateId('msg');
    const [created] = await db.insert(schema.messages).values({
      id,
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
    }).returning();

    const u = await getUserById(senderId);

    return {
      id: created.id,
      conversation_id: created.conversation_id,
      sender_id: created.sender_id,
      content: created.content,
      created_at: created.created_at ? created.created_at.toISOString() : new Date().toISOString(),
      sender: u ? {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as 'admin' | 'member',
        avatar_url: u.avatar_url || undefined,
      } : undefined,
    };
  } catch (error) {
    console.error('Failed to send message:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  try {
    await db.update(schema.conversationParticipants)
      .set({ last_read_at: new Date() })
      .where(and(eq(schema.conversationParticipants.conversation_id, conversationId), eq(schema.conversationParticipants.user_id, userId)));
  } catch (error) {
    console.error('Failed to mark conversation read:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ----------------- NOTIFICATIONS -----------------

function formatNotification(
  row: typeof schema.notifications.$inferSelect,
  task?: { id: string; title: string } | null,
  workspace?: { id: string; name: string } | null
): AppNotification {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    task_id: row.task_id,
    workspace_id: row.workspace_id,
    is_read: row.is_read ?? false,
    created_at: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
    task: task || undefined,
    workspace: workspace || undefined,
  };
}

export async function createNotification(data: {
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  task_id?: string;
  workspace_id?: string;
}): Promise<AppNotification> {
  try {
    const [created] = await db.insert(schema.notifications).values({
      id: generateId('ntf'),
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      task_id: data.task_id,
      workspace_id: data.workspace_id,
    }).returning();
    return formatNotification(created);
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserNotifications(userId: string, limit: number = 50): Promise<AppNotification[]> {
  try {
    const rows = await db.select().from(schema.notifications)
      .where(eq(schema.notifications.user_id, userId))
      .orderBy(desc(schema.notifications.created_at))
      .limit(limit);

    const taskIds = [...new Set(rows.map(r => r.task_id).filter(Boolean))] as string[];
    const wsIds = [...new Set(rows.map(r => r.workspace_id).filter(Boolean))] as string[];

    const tasksList = taskIds.length > 0
      ? await db.select({ id: schema.tasks.id, title: schema.tasks.title }).from(schema.tasks).where(inArray(schema.tasks.id, taskIds))
      : [];
    const wsList = wsIds.length > 0
      ? await db.select({ id: schema.workspaces.id, name: schema.workspaces.name }).from(schema.workspaces).where(inArray(schema.workspaces.id, wsIds))
      : [];

    return rows.map(r => formatNotification(
      r,
      r.task_id ? tasksList.find(t => t.id === r.task_id) || null : null,
      r.workspace_id ? wsList.find(w => w.id === r.workspace_id) || null : null,
    ));
  } catch (error) {
    console.error('Failed to get user notifications:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const rows = await db.select({ id: schema.notifications.id }).from(schema.notifications)
      .where(and(eq(schema.notifications.user_id, userId), eq(schema.notifications.is_read, false)));
    return rows.length;
  } catch (error) {
    console.error('Failed to get unread notification count:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function markNotificationRead(id: string, userId: string): Promise<boolean> {
  try {
    const result = await db.update(schema.notifications)
      .set({ is_read: true })
      .where(and(eq(schema.notifications.id, id), eq(schema.notifications.user_id, userId)))
      .returning();
    return result.length > 0;
  } catch (error) {
    console.error('Failed to mark notification read:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    await db.update(schema.notifications)
      .set({ is_read: true })
      .where(and(eq(schema.notifications.user_id, userId), eq(schema.notifications.is_read, false)));
  } catch (error) {
    console.error('Failed to mark all notifications read:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteNotification(id: string, userId: string): Promise<boolean> {
  try {
    const result = await db.delete(schema.notifications)
      .where(and(eq(schema.notifications.id, id), eq(schema.notifications.user_id, userId)))
      .returning();
    return result.length > 0;
  } catch (error) {
    console.error('Failed to delete notification:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  try {
    await db.delete(schema.notifications).where(eq(schema.notifications.user_id, userId));
  } catch (error) {
    console.error('Failed to delete all notifications:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// Scans active tasks for due-today / overdue deadlines and notifies their
// assignee, at most once per task per type per day (checked against
// notifications already created today). Meant to be called by a daily cron.
export async function createDueDateNotifications(): Promise<{ created: number }> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const dueTasks = await db.select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      due_date: schema.tasks.due_date,
      assignee_id: schema.tasks.assignee_id,
    }).from(schema.tasks)
      .where(and(
        ne(schema.tasks.status, 'termine'),
        sql`${schema.tasks.due_date} IS NOT NULL`,
        sql`${schema.tasks.due_date} <= ${today}`,
      ));

    const relevant = dueTasks.filter(t => t.assignee_id);
    if (relevant.length === 0) return { created: 0 };

    const taskIds = relevant.map(t => t.id);
    const existingToday = await db.select({
      task_id: schema.notifications.task_id,
      type: schema.notifications.type,
    }).from(schema.notifications)
      .where(and(
        inArray(schema.notifications.task_id, taskIds),
        sql`${schema.notifications.created_at} >= CURRENT_DATE`,
      ));

    const alreadyNotified = new Set(existingToday.map(n => `${n.task_id}:${n.type}`));

    let created = 0;
    for (const task of relevant) {
      const isOverdue = task.due_date! < today;
      const type: NotificationType = isOverdue ? 'task_overdue' : 'task_due_today';
      const key = `${task.id}:${type}`;
      if (alreadyNotified.has(key)) continue;

      await createNotification({
        user_id: task.assignee_id!,
        type,
        title: isOverdue ? 'Tâche en retard' : "Échéance aujourd'hui",
        message: isOverdue
          ? `"${task.title}" a dépassé son échéance.`
          : `"${task.title}" est à rendre aujourd'hui.`,
        task_id: task.id,
      });
      created++;
    }

    return { created };
  } catch (error) {
    console.error('Failed to create due date notifications:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
