import { relations } from 'drizzle-orm';
import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('member'), // 'admin' | 'member'
  avatar_url: text('avatar_url'),
  password_hash: text('password_hash'),
  created_at: timestamp('created_at').defaultNow(),
});

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#2563EB'),
  icon: text('icon').notNull().default('Briefcase'),
  created_by: text('created_by').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
});

export const workspaceMembers = pgTable('workspace_members', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // 'admin' | 'member'
  joined_at: timestamp('joined_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('en_cours'),
  deadline: text('deadline'),
  created_at: timestamp('created_at').defaultNow(),
});

export const tags = pgTable('tags', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#2563EB'),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  project_id: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('a_faire'),
  priority: text('priority').notNull().default('normale'),
  assignee_id: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  due_date: text('due_date'),
  position: integer('position').default(0),
  created_by: text('created_by').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
});

export const taskTags = pgTable('task_tags', {
  id: text('id').primaryKey(),
  task_id: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tag_id: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
});

export const subtasks = pgTable('subtasks', {
  id: text('id').primaryKey(),
  task_id: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  completed: boolean('completed').default(false),
  created_at: timestamp('created_at').defaultNow(),
});

export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  task_id: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const attachments = pgTable('attachments', {
  id: text('id').primaryKey(),
  task_id: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id),
  file_name: text('file_name').notNull(),
  file_url: text('file_url').notNull(),
  file_size: integer('file_size'),
  file_type: text('file_type'),
  created_at: timestamp('created_at').defaultNow(),
});

export const timeEntries = pgTable('time_entries', {
  id: text('id').primaryKey(),
  task_id: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id),
  duration_minutes: integer('duration_minutes').notNull(),
  note: text('note'),
  date: text('date').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  is_group: boolean('is_group').notNull().default(false),
  name: text('name'),
  created_by: text('created_by').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
});

export const conversationParticipants = pgTable('conversation_participants', {
  id: text('id').primaryKey(),
  conversation_id: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joined_at: timestamp('joined_at').defaultNow(),
  last_read_at: timestamp('last_read_at'),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversation_id: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  sender_id: text('sender_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  workspacesCreated: many(workspaces),
  workspaceMemberships: many(workspaceMembers),
  assignedTasks: many(tasks),
  comments: many(comments),
  timeEntries: many(timeEntries),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  creator: one(users, {
    fields: [workspaces.created_by],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  projects: many(projects),
  tags: many(tags),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspace_id],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.user_id],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspace_id],
    references: [workspaces.id],
  }),
  tasks: many(tasks),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [tags.workspace_id],
    references: [workspaces.id],
  }),
  taskTags: many(taskTags),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.project_id],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignee_id],
    references: [users.id],
  }),
  subtasks: many(subtasks),
  comments: many(comments),
  attachments: many(attachments),
  timeEntries: many(timeEntries),
  taskTags: many(taskTags),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, {
    fields: [taskTags.task_id],
    references: [tasks.id],
  }),
  tag: one(tags, {
    fields: [taskTags.tag_id],
    references: [tags.id],
  }),
}));

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  task: one(tasks, {
    fields: [subtasks.task_id],
    references: [tasks.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, {
    fields: [comments.task_id],
    references: [tasks.id],
  }),
  author: one(users, {
    fields: [comments.user_id],
    references: [users.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  task: one(tasks, {
    fields: [attachments.task_id],
    references: [tasks.id],
  }),
  uploader: one(users, {
    fields: [attachments.user_id],
    references: [users.id],
  }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  task: one(tasks, {
    fields: [timeEntries.task_id],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [timeEntries.user_id],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(messages),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversation_id],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationParticipants.user_id],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversation_id],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.sender_id],
    references: [users.id],
  }),
}));
