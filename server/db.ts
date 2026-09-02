import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
  TaskPriority 
} from '../src/types';

interface DBUser extends User {
  password_hash: string;
}

interface DBTaskTag {
  id: string;
  task_id: string;
  tag_id: string;
}

interface DatabaseSchema {
  users: DBUser[];
  workspaces: Workspace[];
  workspace_members: WorkspaceMember[];
  projects: Project[];
  tasks: Task[];
  subtasks: Subtask[];
  comments: Comment[];
  attachments: Attachment[];
  time_entries: TimeEntry[];
  tags: Tag[];
  task_tags: DBTaskTag[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateId(prefix: string = ''): string {
  return prefix ? `${prefix}_${crypto.randomBytes(8).toString('hex')}` : crypto.randomUUID();
}

class RelationalDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Error reading db.json, reinitializing...', err);
      }
    }
    const initial = this.getInitialSeedData();
    this.saveData(initial);
    return initial;
  }

  private saveData(dataToSave?: DatabaseSchema) {
    const data = dataToSave || this.data;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write db.json:', err);
    }
  }

  private getInitialSeedData(): DatabaseSchema {
    const now = new Date().toISOString();
    const adminHash = hashPassword('password123');

    const uAxeDigital: DBUser = {
      id: 'usr_axedigital',
      email: 'axedigital00@gmail.com',
      name: 'Axe Digital Admin',
      password_hash: hashPassword('AxeTask2026!Admin1'),
      role: 'admin',
      avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=Axe%20Digital&backgroundColor=2563EB',
      created_at: now,
    };

    const uKameni: DBUser = {
      id: 'usr_kameni',
      email: 'kamenimax10@gmail.com',
      name: 'Max Kameni',
      password_hash: hashPassword('Kameni2026!Admin2'),
      role: 'admin',
      avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=Max%20Kameni&backgroundColor=2563EB',
      created_at: now,
    };

    const uMembre: DBUser = {
      id: 'usr_membre',
      email: 'membre@axetask.com',
      name: 'Membre AxeTask',
      password_hash: hashPassword('Member2026!Axe'),
      role: 'member',
      avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=Membre%20AxeTask&backgroundColor=2563EB',
      created_at: now,
    };

    const uAdmin: DBUser = {
      id: 'usr_admin',
      email: 'admin@axetask.com',
      name: 'Jean-Marc Dupont',
      password_hash: adminHash,
      role: 'admin',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      created_at: now,
    };

    const uAlex: DBUser = {
      id: 'usr_alex',
      email: 'alex@axetask.com',
      name: 'Alexandre Martin',
      password_hash: adminHash,
      role: 'member',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      created_at: now,
    };

    const uSophie: DBUser = {
      id: 'usr_sophie',
      email: 'sophie@axetask.com',
      name: 'Sophie Bernard',
      password_hash: adminHash,
      role: 'member',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      created_at: now,
    };

    const uMarc: DBUser = {
      id: 'usr_marc',
      email: 'marc@axetask.com',
      name: 'Marc Lefebvre',
      password_hash: adminHash,
      role: 'member',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      created_at: now,
    };

    const users = [uAxeDigital, uKameni, uMembre, uAdmin, uAlex, uSophie, uMarc];

    // Workspaces (ventures)
    const ws1: Workspace = {
      id: 'ws_saas',
      name: 'SaaS Studio — Bolt & Scale',
      color: '#F59E0B', // Gold / Amber
      icon: 'Rocket',
      created_at: now,
    };

    const ws2: Workspace = {
      id: 'ws_agency',
      name: 'Axe Digital Agency',
      color: '#3B82F6', // Royal Blue
      icon: 'Briefcase',
      created_at: now,
    };

    const ws3: Workspace = {
      id: 'ws_ecom',
      name: 'E-commerce Brands Hub',
      color: '#10B981', // Emerald
      icon: 'ShoppingBag',
      created_at: now,
    };

    const workspaces = [ws1, ws2, ws3];

    // Workspace Members (relations)
    const workspace_members: WorkspaceMember[] = [
      // Axe Digital Admin & Max Kameni & Membre memberships across workspaces
      { id: 'wm_ad_1', workspace_id: 'ws_saas', user_id: 'usr_axedigital', role: 'admin', joined_at: now },
      { id: 'wm_ad_2', workspace_id: 'ws_agency', user_id: 'usr_axedigital', role: 'admin', joined_at: now },
      { id: 'wm_ad_3', workspace_id: 'ws_ecom', user_id: 'usr_axedigital', role: 'admin', joined_at: now },

      { id: 'wm_km_1', workspace_id: 'ws_saas', user_id: 'usr_kameni', role: 'admin', joined_at: now },
      { id: 'wm_km_2', workspace_id: 'ws_agency', user_id: 'usr_kameni', role: 'admin', joined_at: now },
      { id: 'wm_km_3', workspace_id: 'ws_ecom', user_id: 'usr_kameni', role: 'admin', joined_at: now },

      { id: 'wm_mb_1', workspace_id: 'ws_saas', user_id: 'usr_membre', role: 'member', joined_at: now },
      { id: 'wm_mb_2', workspace_id: 'ws_agency', user_id: 'usr_membre', role: 'member', joined_at: now },
      { id: 'wm_mb_3', workspace_id: 'ws_ecom', user_id: 'usr_membre', role: 'member', joined_at: now },

      // SaaS Studio members: Admin (admin), Alex (member), Sophie (member)
      { id: 'wm_1', workspace_id: 'ws_saas', user_id: 'usr_admin', role: 'admin', joined_at: now },
      { id: 'wm_2', workspace_id: 'ws_saas', user_id: 'usr_alex', role: 'member', joined_at: now },
      { id: 'wm_3', workspace_id: 'ws_saas', user_id: 'usr_sophie', role: 'member', joined_at: now },

      // Axe Agency members: Admin (admin), Alex (member), Marc (member)
      { id: 'wm_4', workspace_id: 'ws_agency', user_id: 'usr_admin', role: 'admin', joined_at: now },
      { id: 'wm_5', workspace_id: 'ws_agency', user_id: 'usr_alex', role: 'member', joined_at: now },
      { id: 'wm_6', workspace_id: 'ws_agency', user_id: 'usr_marc', role: 'admin', joined_at: now },

      // E-commerce members: Admin (admin), Sophie (admin), Marc (member)
      { id: 'wm_7', workspace_id: 'ws_ecom', user_id: 'usr_admin', role: 'admin', joined_at: now },
      { id: 'wm_8', workspace_id: 'ws_ecom', user_id: 'usr_sophie', role: 'admin', joined_at: now },
      { id: 'wm_9', workspace_id: 'ws_ecom', user_id: 'usr_marc', role: 'member', joined_at: now },
    ];

    // Projects
    const projects: Project[] = [
      {
        id: 'prj_saas_v2',
        workspace_id: 'ws_saas',
        name: 'AxeTask Core v2.0',
        description: 'Refonte complète du moteur de synchronisation Kanban et intégration du time tracking en temps réel.',
        status: 'active',
        deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        created_at: now,
      },
      {
        id: 'prj_saas_billing',
        workspace_id: 'ws_saas',
        name: 'Stripe Billing & Subscriptions',
        description: 'Module de facturation récurrente multi-devises et portail client automatique.',
        status: 'active',
        deadline: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
        created_at: now,
      },
      {
        id: 'prj_agency_redesign',
        workspace_id: 'ws_agency',
        name: 'Refonte Web Client Luxe',
        description: 'Création du nouveau portail digital haute performance pour le groupe Hôtelier Riviera.',
        status: 'active',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        created_at: now,
      },
      {
        id: 'prj_ecom_launch',
        workspace_id: 'ws_ecom',
        name: 'Lancement Marque Skincare Q4',
        description: 'Stratégie d’acquisition, packaging produit, supply chain et tunnel Shopify.',
        status: 'active',
        deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        created_at: now,
      }
    ];

    // Tags
    const tags: Tag[] = [
      { id: 'tag_core', name: 'Core Architecture', color: '#F59E0B', workspace_id: 'ws_saas' },
      { id: 'tag_frontend', name: 'Frontend UX', color: '#6366F1', workspace_id: 'ws_saas' },
      { id: 'tag_security', name: 'Security & Auth', color: '#EF4444', workspace_id: 'ws_saas' },
      { id: 'tag_design', name: 'UI / Figma', color: '#EC4899', workspace_id: 'ws_agency' },
      { id: 'tag_growth', name: 'Marketing Ads', color: '#10B981', workspace_id: 'ws_ecom' },
    ];

    // Tasks
    const tasks: Task[] = [
      {
        id: 'tsk_1',
        project_id: 'prj_saas_v2',
        title: 'Implémenter le drag-and-drop fluide du Kanban',
        description: 'Optimiser le drag & drop avec mise à jour optimiste de la colonne `position` et persistance automatique en base de données.',
        status: 'en_cours',
        priority: 'urgente',
        assignee_id: 'usr_alex',
        due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        created_by: 'usr_admin',
        position: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tsk_2',
        project_id: 'prj_saas_v2',
        title: 'Mettre en place l’isolation des workspaces (RBAC)',
        description: 'Vérifier que chaque requête API valide strictement l’appartenance de l’utilisateur à workspace_members avant tout retour de données.',
        status: 'termine',
        priority: 'haute',
        assignee_id: 'usr_alex',
        due_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
        created_by: 'usr_admin',
        position: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tsk_3',
        project_id: 'prj_saas_v2',
        title: 'Export CSV du relevé d’heures et logs de temps',
        description: 'Générer un fichier CSV téléchargeable avec calcul automatique des heures cumulées par membre, projet et venture.',
        status: 'en_revision',
        priority: 'normale',
        assignee_id: 'usr_sophie',
        due_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
        created_by: 'usr_alex',
        position: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tsk_4',
        project_id: 'prj_saas_v2',
        title: 'Audit de sécurité des tokens de session',
        description: 'Contrôler la validité des sessions utilisateur et expiration programmée.',
        status: 'a_faire',
        priority: 'haute',
        assignee_id: 'usr_admin',
        due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        created_by: 'usr_admin',
        position: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tsk_5',
        project_id: 'prj_saas_v2',
        title: 'Correction du bug de rafraîchissement d’avatar',
        description: 'La miniature de l’assigné ne s’actualisait pas immédiatement lors du changement de membre.',
        status: 'bloque',
        priority: 'basse',
        assignee_id: 'usr_alex',
        due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
        created_by: 'usr_sophie',
        position: 0,
        created_at: now,
        updated_at: now,
      },
      // Tasks for Agency project
      {
        id: 'tsk_6',
        project_id: 'prj_agency_redesign',
        title: 'Validation de la charte graphique dark & or avec le client',
        description: 'Présentation des maquettes Figma interactives et signature du BAT.',
        status: 'en_cours',
        priority: 'haute',
        assignee_id: 'usr_marc',
        due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        created_by: 'usr_admin',
        position: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tsk_7',
        project_id: 'prj_agency_redesign',
        title: 'Intégration du module de réservation en ligne',
        description: 'Connecter l’API de réservation de suites avec confirmation SMS automatique.',
        status: 'a_faire',
        priority: 'normale',
        assignee_id: 'usr_alex',
        due_date: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
        created_by: 'usr_marc',
        position: 1,
        created_at: now,
        updated_at: now,
      },
      // Tasks for E-com project
      {
        id: 'tsk_8',
        project_id: 'prj_ecom_launch',
        title: 'Validation des échantillons packaging avec le fabricant',
        description: 'Contrôler la finition dorée sur verre dépoli et tests d’étanchéité.',
        status: 'en_cours',
        priority: 'urgente',
        assignee_id: 'usr_sophie',
        due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        created_by: 'usr_sophie',
        position: 0,
        created_at: now,
        updated_at: now,
      }
    ];

    // Subtasks
    const subtasks: Subtask[] = [
      { id: 'sub_1', task_id: 'tsk_1', title: 'Détecter l’événement pointerdown et dragstart', completed: true, position: 0, created_at: now },
      { id: 'sub_2', task_id: 'tsk_1', title: 'Calculer les nouvelles positions relatives', completed: true, position: 1, created_at: now },
      { id: 'sub_3', task_id: 'tsk_1', title: 'Appeler l’endpoint /api/tasks/reorder', completed: false, position: 2, created_at: now },
      { id: 'sub_4', task_id: 'tsk_2', title: 'Middleware checkWorkspaceMembership', completed: true, position: 0, created_at: now },
      { id: 'sub_5', task_id: 'tsk_2', title: 'Tests unitaires 403 Forbidden', completed: true, position: 1, created_at: now },
      { id: 'sub_6', task_id: 'tsk_3', title: 'Créer le formateur CSV UTF-8', completed: true, position: 0, created_at: now },
      { id: 'sub_7', task_id: 'tsk_3', title: 'Bouton de téléchargement direct', completed: false, position: 1, created_at: now },
    ];

    // Comments
    const comments: Comment[] = [
      {
        id: 'cmt_1',
        task_id: 'tsk_1',
        user_id: 'usr_sophie',
        content: 'Superbe réactivité sur le drag & drop ! Pense à gérer aussi le drop sur les colonnes vides.',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'cmt_2',
        task_id: 'tsk_1',
        user_id: 'usr_alex',
        content: 'C’est pris en compte, j’ai ajouté un placeholder avec hauteur dynamique.',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'cmt_3',
        task_id: 'tsk_6',
        user_id: 'usr_admin',
        content: 'Le client a adoré les accents dorés du design system.',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      }
    ];

    // Attachments
    const attachments: Attachment[] = [
      {
        id: 'att_1',
        task_id: 'tsk_1',
        file_name: 'kanban-spec-v2.pdf',
        file_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        file_size: 245000,
        file_type: 'application/pdf',
        uploaded_by: 'usr_admin',
        created_at: now,
      },
      {
        id: 'att_2',
        task_id: 'tsk_6',
        file_name: 'moodboard-luxury-gold.png',
        file_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
        file_size: 1250000,
        file_type: 'image/png',
        uploaded_by: 'usr_marc',
        created_at: now,
      }
    ];

    // Time Entries
    const time_entries: TimeEntry[] = [
      {
        id: 'te_1',
        task_id: 'tsk_1',
        user_id: 'usr_alex',
        duration_minutes: 120,
        note: 'Intégration du composant Kanban et gestion des colonnes',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        created_at: now,
      },
      {
        id: 'te_2',
        task_id: 'tsk_1',
        user_id: 'usr_alex',
        duration_minutes: 90,
        note: 'Animation du drag & drop avec motion/react',
        date: new Date().toISOString().split('T')[0],
        created_at: now,
      },
      {
        id: 'te_3',
        task_id: 'tsk_2',
        user_id: 'usr_alex',
        duration_minutes: 180,
        note: 'Mise en place des règles de sécurité RBAC',
        date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        created_at: now,
      },
      {
        id: 'te_4',
        task_id: 'tsk_3',
        user_id: 'usr_sophie',
        duration_minutes: 75,
        note: 'Spécification et test de l’export CSV',
        date: new Date().toISOString().split('T')[0],
        created_at: now,
      },
      {
        id: 'te_5',
        task_id: 'tsk_6',
        user_id: 'usr_marc',
        duration_minutes: 240,
        note: 'Finalisation maquettes Dark/Gold & BAT',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        created_at: now,
      }
    ];

    // Task Tags
    const task_tags: DBTaskTag[] = [
      { id: 'tt_1', task_id: 'tsk_1', tag_id: 'tag_frontend' },
      { id: 'tt_2', task_id: 'tsk_2', tag_id: 'tag_security' },
      { id: 'tt_3', task_id: 'tsk_3', tag_id: 'tag_core' },
      { id: 'tt_4', task_id: 'tsk_6', tag_id: 'tag_design' },
      { id: 'tt_5', task_id: 'tsk_8', tag_id: 'tag_growth' },
    ];

    return {
      users,
      workspaces,
      workspace_members,
      projects,
      tasks,
      subtasks,
      comments,
      attachments,
      time_entries,
      tags,
      task_tags,
    };
  }

  // --- Users & Auth ---
  public ensureRequiredUsers(): void {
    const requiredUsers = [
      { email: 'axedigital00@gmail.com', name: 'Axe Digital Admin', password: 'AxeTask2026!Admin1', role: 'admin' as const },
      { email: 'kamenimax10@gmail.com', name: 'Max Kameni', password: 'Kameni2026!Admin2', role: 'admin' as const },
      { email: 'membre@axetask.com', name: 'Membre AxeTask', password: 'Member2026!Axe', role: 'member' as const },
    ];

    let modified = false;
    for (const reqUser of requiredUsers) {
      const existing = this.data.users.find(u => u.email.toLowerCase() === reqUser.email.toLowerCase());
      if (!existing) {
        const newUser: DBUser = {
          id: generateId('usr'),
          email: reqUser.email.toLowerCase(),
          name: reqUser.name,
          password_hash: hashPassword(reqUser.password),
          role: reqUser.role,
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(reqUser.name)}&backgroundColor=0B0D11,1E293B`,
          created_at: new Date().toISOString(),
        };
        this.data.users.push(newUser);
        modified = true;
      } else {
        existing.password_hash = hashPassword(reqUser.password);
        existing.role = reqUser.role;
        existing.name = reqUser.name;
        modified = true;
      }
    }
    if (modified) {
      this.saveData();
    }
  }

  public getUserByEmail(email: string): DBUser | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): DBUser | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getAllUsers(): User[] {
    return this.data.users.map(({ password_hash, ...rest }) => rest);
  }

  public createUser(email: string, password: string, name: string, role: 'admin' | 'member' = 'member', avatar_url?: string): User {
    const newUser: DBUser = {
      id: generateId('usr'),
      email: email.trim().toLowerCase(),
      name: name.trim(),
      password_hash: hashPassword(password),
      role,
      avatar_url: avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0B0D11,1E293B`,
      created_at: new Date().toISOString(),
    };
    this.data.users.push(newUser);

    // Automatically create a default personal workspace for the new user if they aren't admin
    const newWs: Workspace = {
      id: generateId('ws'),
      name: `Espace de ${name}`,
      color: '#F59E0B',
      icon: 'Sparkles',
      created_at: new Date().toISOString(),
    };
    this.data.workspaces.push(newWs);

    this.data.workspace_members.push({
      id: generateId('wm'),
      workspace_id: newWs.id,
      user_id: newUser.id,
      role: 'admin',
      joined_at: new Date().toISOString(),
    });

    this.saveData();
    const { password_hash, ...userSafe } = newUser;
    return userSafe;
  }

  public verifyPassword(user: DBUser, password: string): boolean {
    return user.password_hash === hashPassword(password);
  }

  public updateUserProfile(userId: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
    };
    this.saveData();
    const { password_hash, ...userSafe } = this.data.users[idx];
    return userSafe;
  }

  // --- Workspaces & Access Control ---
  public getUserWorkspaces(userId: string, isGlobalAdmin: boolean): Workspace[] {
    let wsList: Workspace[];
    if (isGlobalAdmin) {
      wsList = [...this.data.workspaces];
    } else {
      const allowedWsIds = new Set(
        this.data.workspace_members.filter(wm => wm.user_id === userId).map(wm => wm.workspace_id)
      );
      wsList = this.data.workspaces.filter(ws => allowedWsIds.has(ws.id));
    }

    // Enrich each workspace with stats
    return wsList.map(ws => {
      const members = this.data.workspace_members.filter(wm => wm.workspace_id === ws.id);
      const userMember = members.find(m => m.user_id === userId);
      const wsProjects = this.data.projects.filter(p => p.workspace_id === ws.id);
      const projectIds = new Set(wsProjects.map(p => p.id));
      const wsTasks = this.data.tasks.filter(t => projectIds.has(t.project_id));
      const activeTasks = wsTasks.filter(t => t.status !== 'termine');
      const completedTasks = wsTasks.filter(t => t.status === 'termine');

      return {
        ...ws,
        member_count: members.length,
        projects_count: wsProjects.length,
        total_tasks_count: wsTasks.length,
        active_tasks_count: activeTasks.length,
        completed_tasks_count: completedTasks.length,
        my_role: isGlobalAdmin ? 'admin' : (userMember ? userMember.role : 'member'),
      };
    });
  }

  public userCanAccessWorkspace(userId: string, workspaceId: string, isGlobalAdmin: boolean): boolean {
    if (isGlobalAdmin) return true;
    return this.data.workspace_members.some(wm => wm.workspace_id === workspaceId && wm.user_id === userId);
  }

  public userIsWorkspaceAdmin(userId: string, workspaceId: string, isGlobalAdmin: boolean): boolean {
    if (isGlobalAdmin) return true;
    return this.data.workspace_members.some(wm => wm.workspace_id === workspaceId && wm.user_id === userId && wm.role === 'admin');
  }

  public createWorkspace(name: string, color: string, icon: string, creatorUserId: string): Workspace {
    const ws: Workspace = {
      id: generateId('ws'),
      name: name.trim(),
      color: color || '#F59E0B',
      icon: icon || 'Briefcase',
      created_at: new Date().toISOString(),
    };
    this.data.workspaces.push(ws);

    // Creator becomes admin member
    this.data.workspace_members.push({
      id: generateId('wm'),
      workspace_id: ws.id,
      user_id: creatorUserId,
      role: 'admin',
      joined_at: new Date().toISOString(),
    });

    this.saveData();
    return ws;
  }

  public updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Workspace | null {
    const idx = this.data.workspaces.findIndex(w => w.id === workspaceId);
    if (idx === -1) return null;
    this.data.workspaces[idx] = { ...this.data.workspaces[idx], ...updates };
    this.saveData();
    return this.data.workspaces[idx];
  }

  public deleteWorkspace(workspaceId: string) {
    this.data.workspaces = this.data.workspaces.filter(w => w.id !== workspaceId);
    this.data.workspace_members = this.data.workspace_members.filter(wm => wm.workspace_id !== workspaceId);
    
    // Cascade delete projects and tasks
    const prjIds = this.data.projects.filter(p => p.workspace_id === workspaceId).map(p => p.id);
    this.data.projects = this.data.projects.filter(p => p.workspace_id !== workspaceId);
    
    const taskIds = this.data.tasks.filter(t => prjIds.includes(t.project_id)).map(t => t.id);
    this.data.tasks = this.data.tasks.filter(t => !prjIds.includes(t.project_id));
    this.data.subtasks = this.data.subtasks.filter(s => !taskIds.includes(s.task_id));
    this.data.comments = this.data.comments.filter(c => !taskIds.includes(c.task_id));
    this.data.attachments = this.data.attachments.filter(a => !taskIds.includes(a.task_id));
    this.data.time_entries = this.data.time_entries.filter(te => !taskIds.includes(te.task_id));
    this.data.tags = this.data.tags.filter(tg => tg.workspace_id !== workspaceId);
    this.data.task_tags = this.data.task_tags.filter(tt => !taskIds.includes(tt.task_id));

    this.saveData();
  }

  // --- Workspace Members ---
  public getWorkspaceMembers(workspaceId: string): WorkspaceMember[] {
    const members = this.data.workspace_members.filter(wm => wm.workspace_id === workspaceId);
    return members.map(m => {
      const user = this.getUserById(m.user_id);
      return {
        ...m,
        user: user ? { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url, role: user.role } : undefined,
      };
    });
  }

  public addWorkspaceMember(workspaceId: string, userId: string, role: 'admin' | 'member'): WorkspaceMember {
    const existing = this.data.workspace_members.find(wm => wm.workspace_id === workspaceId && wm.user_id === userId);
    if (existing) {
      existing.role = role;
      this.saveData();
      return existing;
    }
    const member: WorkspaceMember = {
      id: generateId('wm'),
      workspace_id: workspaceId,
      user_id: userId,
      role,
      joined_at: new Date().toISOString(),
    };
    this.data.workspace_members.push(member);
    this.saveData();
    return member;
  }

  public removeWorkspaceMember(workspaceId: string, userId: string) {
    this.data.workspace_members = this.data.workspace_members.filter(
      wm => !(wm.workspace_id === workspaceId && wm.user_id === userId)
    );
    this.saveData();
  }

  // --- Projects ---
  public getWorkspaceProjects(workspaceId: string): Project[] {
    const projects = this.data.projects.filter(p => p.workspace_id === workspaceId);
    return projects.map(p => {
      const pTasks = this.data.tasks.filter(t => t.project_id === p.id);
      return {
        ...p,
        tasks_count: pTasks.length,
        active_tasks_count: pTasks.filter(t => t.status !== 'termine').length,
        completed_tasks_count: pTasks.filter(t => t.status === 'termine').length,
      };
    });
  }

  public getProjectById(projectId: string): Project | undefined {
    const prj = this.data.projects.find(p => p.id === projectId);
    if (!prj) return undefined;
    const ws = this.data.workspaces.find(w => w.id === prj.workspace_id);
    return {
      ...prj,
      workspace: ws,
    };
  }

  public createProject(workspaceId: string, name: string, description?: string, deadline?: string, status: 'active' | 'archived' | 'planned' | 'completed' = 'active'): Project {
    const prj: Project = {
      id: generateId('prj'),
      workspace_id: workspaceId,
      name: name.trim(),
      description,
      status,
      deadline,
      created_at: new Date().toISOString(),
    };
    this.data.projects.push(prj);
    this.saveData();
    return prj;
  }

  public updateProject(projectId: string, updates: Partial<Project>): Project | null {
    const idx = this.data.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;
    this.data.projects[idx] = { ...this.data.projects[idx], ...updates };
    this.saveData();
    return this.data.projects[idx];
  }

  public deleteProject(projectId: string) {
    this.data.projects = this.data.projects.filter(p => p.id !== projectId);
    const taskIds = this.data.tasks.filter(t => t.project_id === projectId).map(t => t.id);
    this.data.tasks = this.data.tasks.filter(t => t.project_id !== projectId);
    this.data.subtasks = this.data.subtasks.filter(s => !taskIds.includes(s.task_id));
    this.data.comments = this.data.comments.filter(c => !taskIds.includes(c.task_id));
    this.data.attachments = this.data.attachments.filter(a => !taskIds.includes(a.task_id));
    this.data.time_entries = this.data.time_entries.filter(te => !taskIds.includes(te.task_id));
    this.data.task_tags = this.data.task_tags.filter(tt => !taskIds.includes(tt.task_id));
    this.saveData();
  }

  // --- Tasks ---
  public getHydratedTask(rawTask: Task): Task {
    const assignee = rawTask.assignee_id ? this.getUserById(rawTask.assignee_id) : null;
    const creator = rawTask.created_by ? this.getUserById(rawTask.created_by) : null;
    const project = this.data.projects.find(p => p.id === rawTask.project_id);
    const workspace = project ? this.data.workspaces.find(w => w.id === project.workspace_id) : undefined;
    const subtasks = this.data.subtasks
      .filter(s => s.task_id === rawTask.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    const comments = this.data.comments
      .filter(c => c.task_id === rawTask.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(c => {
        const u = this.getUserById(c.user_id);
        return {
          ...c,
          user: u ? { id: u.id, email: u.email, name: u.name, avatar_url: u.avatar_url, role: u.role } : undefined,
        };
      });
    const attachments = this.data.attachments
      .filter(a => a.task_id === rawTask.id)
      .map(a => {
        const u = this.getUserById(a.uploaded_by);
        return {
          ...a,
          uploader: u ? { id: u.id, email: u.email, name: u.name, avatar_url: u.avatar_url, role: u.role } : undefined,
        };
      });
    const time_entries = this.data.time_entries
      .filter(te => te.task_id === rawTask.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(te => {
        const u = this.getUserById(te.user_id);
        return {
          ...te,
          user: u ? { id: u.id, email: u.email, name: u.name, avatar_url: u.avatar_url, role: u.role } : undefined,
        };
      });
    const taskTagIds = this.data.task_tags.filter(tt => tt.task_id === rawTask.id).map(tt => tt.tag_id);
    const taskTags = this.data.tags.filter(t => taskTagIds.includes(t.id));
    const total_time_minutes = time_entries.reduce((acc, curr) => acc + curr.duration_minutes, 0);

    return {
      ...rawTask,
      workspace_id: project?.workspace_id,
      assignee: assignee ? { id: assignee.id, email: assignee.email, name: assignee.name, avatar_url: assignee.avatar_url, role: assignee.role } : null,
      creator: creator ? { id: creator.id, email: creator.email, name: creator.name, avatar_url: creator.avatar_url, role: creator.role } : null,
      project,
      workspace,
      subtasks,
      comments,
      attachments,
      time_entries,
      tags: taskTags,
      total_time_minutes,
    };
  }

  public getProjectTasks(projectId: string): Task[] {
    const tasks = this.data.tasks.filter(t => t.project_id === projectId);
    return tasks.sort((a, b) => (a.position || 0) - (b.position || 0)).map(t => this.getHydratedTask(t));
  }

  public getTaskById(taskId: string): Task | undefined {
    const raw = this.data.tasks.find(t => t.id === taskId);
    if (!raw) return undefined;
    return this.getHydratedTask(raw);
  }

  public getUserDashboardTasks(userId: string, isGlobalAdmin: boolean): Task[] {
    // Get authorized workspace IDs
    let allowedWsIds: Set<string>;
    if (isGlobalAdmin) {
      allowedWsIds = new Set(this.data.workspaces.map(w => w.id));
    } else {
      allowedWsIds = new Set(this.data.workspace_members.filter(wm => wm.user_id === userId).map(wm => wm.workspace_id));
    }

    // Projects in authorized workspaces
    const allowedProjectIds = new Set(
      this.data.projects.filter(p => allowedWsIds.has(p.workspace_id)).map(p => p.id)
    );

    // Tasks assigned to user within authorized projects
    const tasks = this.data.tasks.filter(
      t => t.assignee_id === userId && allowedProjectIds.has(t.project_id)
    );

    // Sort by due_date ascending (tasks with due dates first, then nulls)
    tasks.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    return tasks.map(t => this.getHydratedTask(t));
  }

  public createTask(taskData: {
    project_id: string;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee_id?: string | null;
    due_date?: string | null;
    created_by: string;
    tag_ids?: string[];
  }): Task {
    const projectTasks = this.data.tasks.filter(t => t.project_id === taskData.project_id && t.status === (taskData.status || 'a_faire'));
    const maxPos = projectTasks.reduce((max, t) => Math.max(max, t.position || 0), -1);

    const task: Task = {
      id: generateId('tsk'),
      project_id: taskData.project_id,
      title: taskData.title.trim(),
      description: taskData.description || '',
      status: taskData.status || 'a_faire',
      priority: taskData.priority || 'normale',
      assignee_id: taskData.assignee_id || null,
      due_date: taskData.due_date || null,
      created_by: taskData.created_by,
      position: maxPos + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.tasks.push(task);

    if (taskData.tag_ids && taskData.tag_ids.length > 0) {
      for (const tagId of taskData.tag_ids) {
        this.data.task_tags.push({
          id: generateId('tt'),
          task_id: task.id,
          tag_id: tagId,
        });
      }
    }

    this.saveData();
    return this.getHydratedTask(task);
  }

  public updateTask(taskId: string, updates: Partial<Task> & { tag_ids?: string[] }): Task | null {
    const idx = this.data.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return null;

    const { tag_ids, ...rawUpdates } = updates;
    this.data.tasks[idx] = {
      ...this.data.tasks[idx],
      ...rawUpdates,
      updated_at: new Date().toISOString(),
    };

    if (tag_ids !== undefined) {
      this.data.task_tags = this.data.task_tags.filter(tt => tt.task_id !== taskId);
      for (const tagId of tag_ids) {
        this.data.task_tags.push({
          id: generateId('tt'),
          task_id: taskId,
          tag_id: tagId,
        });
      }
    }

    this.saveData();
    return this.getHydratedTask(this.data.tasks[idx]);
  }

  public reorderTasks(items: { id: string; status: TaskStatus; position: number }[]) {
    for (const item of items) {
      const t = this.data.tasks.find(x => x.id === item.id);
      if (t) {
        t.status = item.status;
        t.position = item.position;
        t.updated_at = new Date().toISOString();
      }
    }
    this.saveData();
  }

  public deleteTask(taskId: string) {
    this.data.tasks = this.data.tasks.filter(t => t.id !== taskId);
    this.data.subtasks = this.data.subtasks.filter(s => s.task_id !== taskId);
    this.data.comments = this.data.comments.filter(c => c.task_id !== taskId);
    this.data.attachments = this.data.attachments.filter(a => a.task_id !== taskId);
    this.data.time_entries = this.data.time_entries.filter(te => te.task_id !== taskId);
    this.data.task_tags = this.data.task_tags.filter(tt => tt.task_id !== taskId);
    this.saveData();
  }

  // --- Subtasks ---
  public addSubtask(taskId: string, title: string): Subtask {
    const existing = this.data.subtasks.filter(s => s.task_id === taskId);
    const subtask: Subtask = {
      id: generateId('sub'),
      task_id: taskId,
      title: title.trim(),
      completed: false,
      position: existing.length,
      created_at: new Date().toISOString(),
    };
    this.data.subtasks.push(subtask);
    this.saveData();
    return subtask;
  }

  public updateSubtask(subtaskId: string, updates: Partial<Subtask>): Subtask | null {
    const idx = this.data.subtasks.findIndex(s => s.id === subtaskId);
    if (idx === -1) return null;
    this.data.subtasks[idx] = { ...this.data.subtasks[idx], ...updates };
    this.saveData();
    return this.data.subtasks[idx];
  }

  public deleteSubtask(subtaskId: string) {
    this.data.subtasks = this.data.subtasks.filter(s => s.id !== subtaskId);
    this.saveData();
  }

  // --- Comments ---
  public addComment(taskId: string, userId: string, content: string): Comment {
    const comment: Comment = {
      id: generateId('cmt'),
      task_id: taskId,
      user_id: userId,
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    this.data.comments.push(comment);
    this.saveData();
    const u = this.getUserById(userId);
    return {
      ...comment,
      user: u ? { id: u.id, email: u.email, name: u.name, avatar_url: u.avatar_url, role: u.role } : undefined,
    };
  }

  public deleteComment(commentId: string) {
    this.data.comments = this.data.comments.filter(c => c.id !== commentId);
    this.saveData();
  }

  // --- Attachments ---
  public addAttachment(taskId: string, uploadedBy: string, fileName: string, fileUrl: string, fileSize?: number, fileType?: string): Attachment {
    const attachment: Attachment = {
      id: generateId('att'),
      task_id: taskId,
      uploaded_by: uploadedBy,
      file_name: fileName,
      file_url: fileUrl,
      file_size: fileSize,
      file_type: fileType,
      created_at: new Date().toISOString(),
    };
    this.data.attachments.push(attachment);
    this.saveData();
    const u = this.getUserById(uploadedBy);
    return {
      ...attachment,
      uploader: u ? { id: u.id, email: u.email, name: u.name, avatar_url: u.avatar_url, role: u.role } : undefined,
    };
  }

  public deleteAttachment(attachmentId: string) {
    this.data.attachments = this.data.attachments.filter(a => a.id !== attachmentId);
    this.saveData();
  }

  // --- Time Entries ---
  public logTime(taskId: string, userId: string, durationMinutes: number, note?: string, date?: string): TimeEntry {
    const entry: TimeEntry = {
      id: generateId('te'),
      task_id: taskId,
      user_id: userId,
      duration_minutes: durationMinutes,
      note: note?.trim(),
      date: date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };
    this.data.time_entries.push(entry);
    this.saveData();
    return entry;
  }

  public deleteTimeEntry(entryId: string) {
    this.data.time_entries = this.data.time_entries.filter(e => e.id !== entryId);
    this.saveData();
  }

  public getTimeEntries(userId: string, isGlobalAdmin: boolean, filters?: { workspace_id?: string; project_id?: string; user_id?: string }): TimeEntry[] {
    let allowedWsIds: Set<string>;
    if (isGlobalAdmin) {
      allowedWsIds = new Set(this.data.workspaces.map(w => w.id));
    } else {
      allowedWsIds = new Set(this.data.workspace_members.filter(wm => wm.user_id === userId).map(wm => wm.workspace_id));
    }

    let entries = this.data.time_entries;

    // Filter by target user if requested or default to own / workspace
    if (filters?.user_id) {
      entries = entries.filter(e => e.user_id === filters.user_id);
    } else if (!isGlobalAdmin) {
      // Members only see entries in their workspaces
    }

    const hydrated = entries.map(te => {
      const task = this.data.tasks.find(t => t.id === te.task_id);
      const project = task ? this.data.projects.find(p => p.id === task.project_id) : undefined;
      const workspace = project ? this.data.workspaces.find(w => w.id === project.workspace_id) : undefined;
      const user = this.getUserById(te.user_id);

      return {
        ...te,
        user: user ? { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url, role: user.role } : undefined,
        task: task ? {
          id: task.id,
          title: task.title,
          project_id: task.project_id,
          project_name: project?.name,
          workspace_id: project?.workspace_id,
          workspace_name: workspace?.name,
          workspace_color: workspace?.color,
        } : undefined,
      };
    });

    // Filter out any entries belonging to workspaces the user doesn't have access to
    const authorized = hydrated.filter(e => {
      if (!e.task?.workspace_id) return true;
      return allowedWsIds.has(e.task.workspace_id);
    });

    if (filters?.workspace_id) {
      return authorized.filter(e => e.task?.workspace_id === filters.workspace_id);
    }
    if (filters?.project_id) {
      return authorized.filter(e => e.task?.project_id === filters.project_id);
    }

    return authorized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // --- Tags ---
  public getWorkspaceTags(workspaceId: string): Tag[] {
    return this.data.tags.filter(t => t.workspace_id === workspaceId);
  }

  public createTag(workspaceId: string, name: string, color: string): Tag {
    const tag: Tag = {
      id: generateId('tag'),
      workspace_id: workspaceId,
      name: name.trim(),
      color: color || '#F59E0B',
    };
    this.data.tags.push(tag);
    this.saveData();
    return tag;
  }

  public deleteTag(tagId: string) {
    this.data.tags = this.data.tags.filter(t => t.id !== tagId);
    this.data.task_tags = this.data.task_tags.filter(tt => tt.tag_id !== tagId);
    this.saveData();
  }
}

export const db = new RelationalDatabase();
