import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import cors from 'cors';
import * as db from '../db/queries.ts';
import { User } from '../types.ts';

// Resolved lazily (not at module load time) so a missing JWT_SECRET surfaces
// as a normal per-request 500 error instead of crashing the whole serverless
// function at import time, which Vercel reports as an opaque
// FUNCTION_INVOCATION_FAILED with no diagnostic detail.
let cachedJwtSecret: string | null = null;

function getJwtSecret(): string {
  if (cachedJwtSecret) return cachedJwtSecret;

  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) {
    cachedJwtSecret = fromEnv;
    return cachedJwtSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production.');
  }
  console.warn('[AxeTask] JWT_SECRET is not set — using an insecure development default. Set it in .env.');
  cachedJwtSecret = 'axetask-dev-only-insecure-secret';
  return cachedJwtSecret;
}

function createToken(user: User): string {
  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', getJwtSecret()).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token: string): { id: string; email: string; role: 'admin' | 'member'; name: string } | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;
  const expectedSig = crypto.createHmac('sha256', getJwtSecret()).update(encodedPayload).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

interface AuthenticatedRequest extends Request {
  user?: User;
}

async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié. Token manquant.' });
  }

  const token = authHeader.split(' ')[1];
  let payload: ReturnType<typeof verifyToken>;
  try {
    payload = verifyToken(token);
  } catch (err: any) {
    console.error('Auth token verification error:', err);
    return res.status(500).json({ error: err.message || 'Erreur de configuration du serveur.' });
  }
  if (!payload) {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }

  try {
    const dbUser = await db.getUserById(payload.id);
    if (!dbUser) {
      return res.status(401).json({ error: 'Utilisateur introuvable.' });
    }

    const { password_hash, ...safeUser } = dbUser;
    req.user = {
      id: safeUser.id,
      email: safeUser.email,
      name: safeUser.name,
      role: safeUser.role as 'admin' | 'member',
      avatar_url: safeUser.avatar_url || undefined,
      created_at: safeUser.created_at ? safeUser.created_at.toISOString() : undefined,
    };
    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    return res.status(500).json({ error: 'Erreur lors de la vérification de session.' });
  }
}

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '15mb' }));

  // --- CORS ---
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.APP_URL,
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server, same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS policy: origin '${origin}' not allowed.`));
    },
    credentials: true,
  }));

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'postgres', time: new Date().toISOString() });
  });

  // Auth: Login
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const user = await db.getUserByEmail(cleanEmail);
      if (!user || !db.verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      }

      const { password_hash, ...safeUser } = user;
      const formattedUser: User = {
        id: safeUser.id,
        email: safeUser.email,
        name: safeUser.name,
        role: safeUser.role as 'admin' | 'member',
        avatar_url: safeUser.avatar_url || undefined,
        created_at: safeUser.created_at ? safeUser.created_at.toISOString() : undefined,
      };
      const token = createToken(formattedUser);
      res.json({ user: formattedUser, token });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la connexion.' });
    }
  });

  // Auth: Signup
  app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nom, email et mot de passe requis.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 6 caractères.' });
    }

    try {
      const existing = await db.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'Un compte avec cette adresse email existe déjà.' });
      }

      const newUser = await db.createUser(email, password, name);
      const token = createToken(newUser);
      res.status(201).json({ user: newUser, token });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la création de compte.' });
    }
  });

  // Auth: Me
  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // Auth: Update Profile
  app.put('/api/auth/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const { name, avatar_url } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Le nom ne peut pas être vide.' });
    }
    try {
      const updated = await db.updateUserProfile(req.user!.id, { name, avatar_url });
      res.json({ user: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la mise à jour du profil.' });
    }
  });

  // Users List (for assignment & inviting & admin management & messaging)
  app.get('/api/users', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await db.getAllUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la récupération des membres.' });
    }
  });

  // Admin: Create User
  app.post('/api/users', authMiddleware, async (req: AuthenticatedRequest, res) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Action réservée aux administrateurs.' });
    }
    const { name, email, password, role } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nom et adresse email requis.' });
    }

    try {
      const existing = await db.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'Un compte avec cette adresse email existe déjà.' });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Un mot de passe d’au moins 6 caractères est requis.' });
      }
      const newUser = await db.createUserWithRole(email, password, name, role || 'member');
      res.status(201).json({ user: newUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la création du profil utilisateur.' });
    }
  });

  // Admin: Update User Role
  app.patch('/api/users/:id/role', authMiddleware, async (req: AuthenticatedRequest, res) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Action réservée aux administrateurs.' });
    }
    const targetUserId = req.params.id;
    const { role } = req.body;

    if (!role || (role !== 'admin' && role !== 'member')) {
      return res.status(400).json({ error: 'Rôle invalide (doit être "admin" ou "member").' });
    }

    try {
      const updated = await db.updateUserRole(targetUserId, role);
      res.json({ user: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la modification du rôle.' });
    }
  });

  // Admin: Delete User Profile
  app.delete('/api/users/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Action réservée aux administrateurs.' });
    }
    const targetUserId = req.params.id;

    if (targetUserId === req.user!.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte administrateur actif.' });
    }

    try {
      const targetUser = await db.getUserById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: 'Profil utilisateur introuvable.' });
      }

      await db.deleteUser(targetUserId);
      res.json({ success: true, message: `Profil utilisateur ${targetUser.name} supprimé avec succès.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la suppression du profil.' });
    }
  });

  // Workspaces: List all accessible by current user
  app.get('/api/workspaces', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const isGlobalAdmin = user.role === 'admin';
    try {
      const workspaces = await db.getUserWorkspaces(user.id, isGlobalAdmin);
      res.json(workspaces);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la récupération des workspaces.' });
    }
  });

  // Workspaces: Create new workspace
  app.post('/api/workspaces', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const { name, color, icon } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Le nom du workspace est requis.' });
    }
    try {
      const ws = await db.createWorkspace(name, color, icon, req.user!.id);
      res.status(201).json(ws);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la création du workspace.' });
    }
  });

  // Workspaces: Update workspace
  app.put('/api/workspaces/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const wsId = req.params.id;
    const isGlobalAdmin = req.user!.role === 'admin';
    try {
      const canAdmin = await db.userIsWorkspaceAdmin(req.user!.id, wsId, isGlobalAdmin);
      if (!canAdmin) {
        return res.status(403).json({ error: 'Accès refusé : vous devez être administrateur du workspace.' });
      }
      const { name, color, icon } = req.body;
      const updated = await db.updateWorkspace(wsId, { name, color, icon });
      if (!updated) return res.status(404).json({ error: 'Workspace introuvable.' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la modification du workspace.' });
    }
  });

  // Workspaces: Delete workspace
  app.delete('/api/workspaces/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const wsId = req.params.id;
    const isGlobalAdmin = req.user!.role === 'admin';
    try {
      const canAdmin = await db.userIsWorkspaceAdmin(req.user!.id, wsId, isGlobalAdmin);
      if (!canAdmin) {
        return res.status(403).json({ error: 'Accès refusé : vous devez être administrateur du workspace.' });
      }
      await db.deleteWorkspace(wsId);
      res.json({ success: true, message: 'Workspace supprimé avec succès.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la suppression du workspace.' });
    }
  });

  // Workspace Members: Get
  app.get('/api/workspaces/:id/members', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const wsId = req.params.id;
    const isGlobalAdmin = req.user!.role === 'admin';
    try {
      const canAccess = await db.userCanAccessWorkspace(req.user!.id, wsId, isGlobalAdmin);
      if (!canAccess) {
        return res.status(403).json({ error: 'Accès refusé à ce workspace.' });
      }
      const members = await db.getWorkspaceMembers(wsId);
      res.json(members);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la récupération des membres.' });
    }
  });

  // Workspace Members: Add / Invite
  app.post('/api/workspaces/:id/members', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const wsId = req.params.id;
    const isGlobalAdmin = req.user!.role === 'admin';
    try {
      const canAdmin = await db.userIsWorkspaceAdmin(req.user!.id, wsId, isGlobalAdmin);
      if (!canAdmin) {
        return res.status(403).json({ error: 'Seul un administrateur du workspace peut ajouter des membres.' });
      }
      const { user_id, role } = req.body;
      if (!user_id) {
        return res.status(400).json({ error: 'user_id est requis.' });
      }
      const member = await db.addWorkspaceMember(wsId, user_id, role || 'member');
      res.status(201).json(member);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de l ajout de membre.' });
    }
  });

  // Workspace Members: Remove
  app.delete('/api/workspaces/:id/members/:userId', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const wsId = req.params.id;
    const targetUserId = req.params.userId;
    const isGlobalAdmin = req.user!.role === 'admin';
    try {
      const canAdmin = await db.userIsWorkspaceAdmin(req.user!.id, wsId, isGlobalAdmin);
      if (!canAdmin && req.user!.id !== targetUserId) {
        return res.status(403).json({ error: 'Action non autorisée.' });
      }
      await db.removeWorkspaceMember(wsId, targetUserId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors du retrait du membre.' });
    }
  });

  // Workspace Member: Update Role by Member ID
  app.put('/api/workspace-members/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const memberId = req.params.id;
    const { role } = req.body;
    try {
      const updated = await db.updateWorkspaceMemberById(memberId, role || 'member');
      if (!updated) return res.status(404).json({ error: 'Membre introuvable.' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la modification du rôle de membre.' });
    }
  });

  // Workspace Member: Remove by Member ID
  app.delete('/api/workspace-members/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const memberId = req.params.id;
    try {
      await db.removeWorkspaceMemberById(memberId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors du retrait du membre.' });
    }
  });

  // Workspace Projects: Get
  app.get('/api/workspaces/:id/projects', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const wsId = req.params.id;
    const isGlobalAdmin = req.user!.role === 'admin';
    try {
      const canAccess = await db.userCanAccessWorkspace(req.user!.id, wsId, isGlobalAdmin);
      if (!canAccess) {
        return res.status(403).json({ error: 'Accès refusé à ce workspace.' });
      }
      const projects = await db.getWorkspaceProjects(wsId);
      res.json(projects);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la récupération des projets.' });
    }
  });

  // Workspace Projects: Create
  app.post('/api/workspaces/:id/projects', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const wsId = req.params.id;
    const isGlobalAdmin = req.user!.role === 'admin';
    try {
      const canAccess = await db.userCanAccessWorkspace(req.user!.id, wsId, isGlobalAdmin);
      if (!canAccess) {
        return res.status(403).json({ error: 'Accès refusé à ce workspace.' });
      }
      const { name, description, deadline, status } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Le nom du projet est requis.' });
      }
      const project = await db.createProject(wsId, name, description, deadline, status);
      res.status(201).json(project);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la création du projet.' });
    }
  });

  // Projects: Get Single
  app.get('/api/projects/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const project = await db.getProjectById(req.params.id);
      if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
      const isGlobalAdmin = req.user!.role === 'admin';
      const canAccess = await db.userCanAccessWorkspace(req.user!.id, project.workspace_id, isGlobalAdmin);
      if (!canAccess) {
        return res.status(403).json({ error: 'Accès refusé à ce projet.' });
      }
      res.json(project);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la récupération du projet.' });
    }
  });

  // Projects: Update
  app.put('/api/projects/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const project = await db.getProjectById(req.params.id);
      if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
      const isGlobalAdmin = req.user!.role === 'admin';
      const canAccess = await db.userCanAccessWorkspace(req.user!.id, project.workspace_id, isGlobalAdmin);
      if (!canAccess) {
        return res.status(403).json({ error: 'Accès refusé à ce projet.' });
      }
      const { name, description, status, deadline } = req.body;
      const updated = await db.updateProject(req.params.id, { name, description, status, deadline });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la modification du projet.' });
    }
  });

  // Projects: Delete
  app.delete('/api/projects/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const project = await db.getProjectById(req.params.id);
      if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
      const isGlobalAdmin = req.user!.role === 'admin';
      const canAdmin = await db.userIsWorkspaceAdmin(req.user!.id, project.workspace_id, isGlobalAdmin);
      if (!canAdmin) {
        return res.status(403).json({ error: 'Seul un administrateur du workspace peut supprimer un projet.' });
      }
      await db.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la suppression du projet.' });
    }
  });

  // Workspace Tags: Get & Create
  app.get('/api/workspaces/:id/tags', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const wsId = req.params.id;
    const isGlobalAdmin = req.user!.role === 'admin';
    try {
      const canAccess = await db.userCanAccessWorkspace(req.user!.id, wsId, isGlobalAdmin);
      if (!canAccess) {
        return res.status(403).json({ error: 'Accès refusé à ce workspace.' });
      }
      const tags = await db.getWorkspaceTags(wsId);
      res.json(tags);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la récupération des tags.' });
    }
  });

  app.post('/api/workspaces/:id/tags', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const wsId = req.params.id;
    const isGlobalAdmin = req.user!.role === 'admin';
    try {
      const canAccess = await db.userCanAccessWorkspace(req.user!.id, wsId, isGlobalAdmin);
      if (!canAccess) {
        return res.status(403).json({ error: 'Accès refusé à ce workspace.' });
      }
      const { name, color } = req.body;
      if (!name) return res.status(400).json({ error: 'Le nom du tag est requis.' });
      const tag = await db.createTag(wsId, name, color);
      res.status(201).json(tag);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la création du tag.' });
    }
  });

  app.delete('/api/tags/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      await db.deleteTag(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la suppression du tag.' });
    }
  });

  // Project Tasks: Get & Create
  app.get('/api/projects/:id/tasks', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const project = await db.getProjectById(req.params.id);
      if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
      const isGlobalAdmin = req.user!.role === 'admin';
      const canAccess = await db.userCanAccessWorkspace(req.user!.id, project.workspace_id, isGlobalAdmin);
      if (!canAccess) {
        return res.status(403).json({ error: 'Accès refusé à ce projet.' });
      }
      const tasks = await db.getProjectTasks(req.params.id);
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la récupération des tâches.' });
    }
  });

  app.post('/api/projects/:id/tasks', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const project = await db.getProjectById(req.params.id);
      if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
      const isGlobalAdmin = req.user!.role === 'admin';
      const canAccess = await db.userCanAccessWorkspace(req.user!.id, project.workspace_id, isGlobalAdmin);
      if (!canAccess) {
        return res.status(403).json({ error: 'Accès refusé à ce projet.' });
      }
      const { title, description, status, priority, assignee_id, due_date, tag_ids } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Le titre de la tâche est requis.' });
      }
      const task = await db.createTask({
        project_id: req.params.id,
        title,
        description,
        status: status || 'a_faire',
        priority: priority || 'normale',
        assignee_id,
        due_date,
        created_by: req.user!.id,
        tag_ids,
      });
      res.status(201).json(task);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la création de la tâche.' });
    }
  });

  // Dashboard Global: All assigned tasks for current user across authorized workspaces
  app.get('/api/tasks/dashboard', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const isGlobalAdmin = user.role === 'admin';
    try {
      const tasks = await db.getUserDashboardTasks(user.id, isGlobalAdmin);
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors du chargement du tableau de bord.' });
    }
  });

  // Task Details: Get Single Task
  app.get('/api/tasks/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await db.getTaskById(req.params.id);
      if (!task) return res.status(404).json({ error: 'Tâche introuvable.' });
      const isGlobalAdmin = req.user!.role === 'admin';
      if (task.workspace_id) {
        const canAccess = await db.userCanAccessWorkspace(req.user!.id, task.workspace_id, isGlobalAdmin);
        if (!canAccess) {
          return res.status(403).json({ error: 'Accès refusé à cette tâche.' });
        }
      }
      res.json(task);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors du chargement de la tâche.' });
    }
  });

  // Task Update (Status, Priority, Assignee, Title, Description, Due Date, Tags)
  app.patch('/api/tasks/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await db.getTaskById(req.params.id);
      if (!task) return res.status(404).json({ error: 'Tâche introuvable.' });
      const isGlobalAdmin = req.user!.role === 'admin';
      if (task.workspace_id) {
        const canAccess = await db.userCanAccessWorkspace(req.user!.id, task.workspace_id, isGlobalAdmin);
        if (!canAccess) {
          return res.status(403).json({ error: 'Accès refusé à cette tâche.' });
        }
      }

      const { title, description, status, priority, assignee_id, due_date, tag_ids, position } = req.body;
      const updated = await db.updateTask(req.params.id, {
        title,
        description,
        status,
        priority,
        assignee_id,
        due_date,
        tag_ids,
        position,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la mise à jour de la tâche.' });
    }
  });

  // Reorder Tasks (Kanban Drag & Drop batch position sync)
  app.post('/api/tasks/reorder', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const { items } = req.body; // Array<{ id: string, status: TaskStatus, position: number }>
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Format invalide.' });
    }
    try {
      await db.reorderTasks(items);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors du réordonnancement.' });
    }
  });

  // Task Delete
  app.delete('/api/tasks/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await db.getTaskById(req.params.id);
      if (!task) return res.status(404).json({ error: 'Tâche introuvable.' });
      const isGlobalAdmin = req.user!.role === 'admin';
      if (task.workspace_id) {
        const canAccess = await db.userCanAccessWorkspace(req.user!.id, task.workspace_id, isGlobalAdmin);
        if (!canAccess) {
          return res.status(403).json({ error: 'Accès refusé à cette tâche.' });
        }
      }
      await db.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la suppression de la tâche.' });
    }
  });

  // Subtasks
  app.post('/api/tasks/:id/subtasks', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await db.getTaskById(req.params.id);
      if (!task) return res.status(404).json({ error: 'Tâche introuvable.' });
      const { title } = req.body;
      if (!title) return res.status(400).json({ error: 'Le titre est requis.' });
      const subtask = await db.addSubtask(req.params.id, title);
      res.status(201).json(subtask);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de l ajout de la sous-tâche.' });
    }
  });

  app.patch('/api/subtasks/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const { completed, title } = req.body;
    try {
      const updated = await db.updateSubtask(req.params.id, { completed, title });
      if (!updated) return res.status(404).json({ error: 'Sous-tâche introuvable.' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la mise à jour de la sous-tâche.' });
    }
  });

  app.delete('/api/subtasks/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      await db.deleteSubtask(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la suppression de la sous-tâche.' });
    }
  });

  // Comments
  app.post('/api/tasks/:id/comments', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await db.getTaskById(req.params.id);
      if (!task) return res.status(404).json({ error: 'Tâche introuvable.' });
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: 'Le contenu est requis.' });
      const comment = await db.addComment(req.params.id, req.user!.id, content);
      res.status(201).json(comment);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de l ajout du commentaire.' });
    }
  });

  app.delete('/api/comments/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      await db.deleteComment(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la suppression du commentaire.' });
    }
  });

  // Attachments
  app.post('/api/tasks/:id/attachments', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await db.getTaskById(req.params.id);
      if (!task) return res.status(404).json({ error: 'Tâche introuvable.' });
      const { file_name, file_url, file_size, file_type } = req.body;
      if (!file_name || !file_url) {
        return res.status(400).json({ error: 'Nom et URL de fichier requis.' });
      }
      const attachment = await db.addAttachment(req.params.id, req.user!.id, file_name, file_url, file_size, file_type);
      res.status(201).json(attachment);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de l ajout de la pièce jointe.' });
    }
  });

  app.delete('/api/attachments/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      await db.deleteAttachment(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la suppression de la pièce jointe.' });
    }
  });

  // Time Entries: Log Time
  app.post('/api/tasks/:id/time-entries', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await db.getTaskById(req.params.id);
      if (!task) return res.status(404).json({ error: 'Tâche introuvable.' });
      const { duration_minutes, note, date } = req.body;
      if (!duration_minutes || duration_minutes <= 0) {
        return res.status(400).json({ error: 'Durée valide en minutes requise.' });
      }
      const entry = await db.logTime(req.params.id, req.user!.id, Number(duration_minutes), note, date);
      res.status(201).json(entry);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de l enregistrement du temps.' });
    }
  });

  app.delete('/api/time-entries/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      await db.deleteTimeEntry(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la suppression de l entrée de temps.' });
    }
  });

  // Time Entries: Get aggregated & filtered list ("Mon temps" screen)
  app.get('/api/time-entries', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const isGlobalAdmin = user.role === 'admin';
    const { workspace_id, project_id, user_id } = req.query as { workspace_id?: string; project_id?: string; user_id?: string };
    try {
      const entries = await db.getTimeEntries(user.id, isGlobalAdmin, {
        workspace_id,
        project_id,
        user_id: user_id || (isGlobalAdmin ? undefined : user.id),
      });
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la récupération des temps.' });
    }
  });

  // --- Messaging: Conversations & Messages ---

  // List all conversations for the current user (most recent activity first)
  app.get('/api/conversations', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const conversations = await db.getUserConversations(req.user!.id);
      res.json(conversations);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la récupération des conversations.' });
    }
  });

  // Start (or fetch) a direct conversation with another member
  app.post('/api/conversations', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id est requis.' });
    }
    try {
      const targetUser = await db.getUserById(user_id);
      if (!targetUser) {
        return res.status(404).json({ error: 'Utilisateur introuvable.' });
      }
      const conversation = await db.findOrCreateDirectConversation(req.user!.id, user_id);
      res.status(201).json(conversation);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la création de la conversation.' });
    }
  });

  // Get messages for a conversation (most recent 50 by default, paginate with ?before=<iso date>)
  app.get('/api/conversations/:id/messages', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const conversationId = req.params.id;
    try {
      const isParticipant = await db.userIsConversationParticipant(req.user!.id, conversationId);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Accès refusé à cette conversation.' });
      }
      const { before, limit } = req.query as { before?: string; limit?: string };
      const messages = await db.getConversationMessages(conversationId, limit ? Number(limit) : 50, before);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la récupération des messages.' });
    }
  });

  // Send a message in a conversation
  app.post('/api/conversations/:id/messages', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const conversationId = req.params.id;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Le contenu du message est requis.' });
    }
    try {
      const isParticipant = await db.userIsConversationParticipant(req.user!.id, conversationId);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Accès refusé à cette conversation.' });
      }
      const message = await db.sendMessage(conversationId, req.user!.id, content);
      res.status(201).json(message);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de l’envoi du message.' });
    }
  });

  // Mark a conversation as read
  app.post('/api/conversations/:id/read', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const conversationId = req.params.id;
    try {
      const isParticipant = await db.userIsConversationParticipant(req.user!.id, conversationId);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Accès refusé à cette conversation.' });
      }
      await db.markConversationRead(conversationId, req.user!.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors du marquage de lecture.' });
    }
  });

  return app;
}
