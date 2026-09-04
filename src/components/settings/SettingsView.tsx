import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { SoundEffectType } from '../../lib/sound';
import { api } from '../../lib/api';
import { WorkspaceMember, Tag, WorkspaceRole, User as UserType } from '../../types';
import { Avatar } from '../common/Avatar';
import { ConfirmDialog, useConfirm } from '../common/ConfirmDialog';
import { RoleBadge } from '../common/Badge';
import { 
  Settings, 
  Users, 
  Tag as TagIcon, 
  UserPlus, 
  Trash2, 
  Shield, 
  Plus, 
  Briefcase, 
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Search,
  KeyRound,
  ShieldCheck,
  UserX,
  Volume2,
  VolumeX,
  Sparkles,
  Music,
  Radio,
  Play,
  Sliders,
  BellRing
} from 'lucide-react';

const PRESET_COLORS = [
  '#2563EB', '#3B82F6', '#60A5FA', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'
];

export const SettingsView: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const { 
    notify, 
    soundEnabled, 
    soundVolume, 
    toggleSound, 
    updateVolume, 
    playTestSound 
  } = useToast();
  const { confirmProps, confirm } = useConfirm();

  const isGlobalAdmin = user?.role === 'admin';
  const isWorkspaceAdmin = isGlobalAdmin || currentWorkspace?.my_role === 'admin';

  const [activeTab, setActiveTab] = useState<'profile' | 'members' | 'tags' | 'workspace' | 'all_users' | 'notifications'>(
    isGlobalAdmin ? 'all_users' : 'members'
  );

  const [lastPlayedSound, setLastPlayedSound] = useState<string>('');

  // Personal profile state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Members state
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Global All Users state (Admin feature)
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('password123');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'member'>('member');
  const [userAdminError, setUserAdminError] = useState('');
  const [userAdminSuccess, setUserAdminSuccess] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Tags state
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#2563EB');

  // Workspace edit state
  const [wsName, setWsName] = useState('');
  const [wsColor, setWsColor] = useState('#2563EB');
  const [isUpdatingWs, setIsUpdatingWs] = useState(false);

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoadingMembers(true);
      const [mems, tgs] = await Promise.all([
        api.getWorkspaceMembers(currentWorkspace.id),
        api.getWorkspaceTags(currentWorkspace.id),
      ]);
      setMembers(mems);
      setTags(tgs);
      setWsName(currentWorkspace.name);
      setWsColor(currentWorkspace.color);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadAllUsers = async () => {
    if (!isGlobalAdmin) return;
    try {
      setLoadingUsers(true);
      const list = await api.getUsers();
      setAllUsers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (isGlobalAdmin) {
      loadAllUsers();
    }
  }, [isGlobalAdmin]);

  // Save personal profile (name + email)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    if (!profileName.trim() || !profileEmail.trim()) {
      setProfileError('Le nom et l\'email ne peuvent pas être vides.');
      return;
    }
    try {
      setIsSavingProfile(true);
      await updateProfile(profileName.trim(), profileEmail.trim());
      setProfileSuccess('Vos informations ont été mises à jour.');
    } catch (err: any) {
      setProfileError(err.message || 'Erreur lors de la mise à jour du profil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    try {
      setIsChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Votre mot de passe a été changé avec succès.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Invite member to workspace
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    if (!inviteEmail.trim() || !currentWorkspace) return;

    try {
      await api.addWorkspaceMember(currentWorkspace.id, inviteEmail.trim(), inviteRole);
      setInviteSuccess(`Membre ${inviteEmail} ajouté avec succès !`);
      setInviteEmail('');
      loadData();
    } catch (err: any) {
      setInviteError(err.message || "Erreur lors de l'ajout du membre.");
    }
  };

  // Change workspace member role
  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    try {
      await api.updateWorkspaceMember(memberId, newRole);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Remove member from workspace
  const handleRemoveMember = async (memberId: string) => {
    const ok = await confirm({
      title: 'Retirer le membre',
      message: "Voulez-vous retirer ce membre de l'espace de travail ?\n\nIl perdra l'accès à tous les projets de cet espace.",
      confirmLabel: 'Retirer',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.removeWorkspaceMember(memberId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Admin: Create new user profile
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserAdminError('');
    setUserAdminSuccess('');
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    try {
      await api.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword || 'password123',
        role: newUserRole,
      });
      setUserAdminSuccess(`Utilisateur ${newUserName} créé avec succès !`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('password123');
      setNewUserRole('member');
      loadAllUsers();
      loadData();
    } catch (err: any) {
      setUserAdminError(err.message || 'Erreur lors de la création du profil.');
    }
  };

  // Admin: Change user global role
  const handleUserRoleChange = async (userId: string, role: 'admin' | 'member') => {
    try {
      await api.updateUserRole(userId, role);
      loadAllUsers();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du changement de rôle.');
    }
  };

  // Admin: Delete user profile
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setIsDeletingUser(true);
      setUserAdminError('');
      await api.deleteUser(userToDelete.id);
      setUserAdminSuccess(`Le profil utilisateur de ${userToDelete.name} a été supprimé avec succès.`);
      setUserToDelete(null);
      await loadAllUsers();
      await loadData();
    } catch (err: any) {
      setUserAdminError(err.message || 'Erreur lors de la suppression du profil.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Create Tag
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || !currentWorkspace) return;
    try {
      await api.createWorkspaceTag(currentWorkspace.id, newTagName.trim(), newTagColor);
      setNewTagName('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Tag
  const handleDeleteTag = async (tagId: string) => {
    try {
      await api.deleteWorkspaceTag(tagId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Update Workspace
  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !wsName.trim()) return;
    try {
      setIsUpdatingWs(true);
      await api.updateWorkspace(currentWorkspace.id, { name: wsName.trim(), color: wsColor });
      refreshWorkspaces();
      alert('Espace mis à jour avec succès !');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingWs(false);
    }
  };

  // Delete Workspace
  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace) return;
    const ok = await confirm({
      title: `Supprimer l'espace "${currentWorkspace.name}"`,
      message: `Cette action est DÉFINITIVE.\n\nTous les projets, tâches et données associés seront détruits définitivement.`,
      confirmLabel: 'Supprimer définitivement',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      setIsUpdatingWs(true);
      await api.deleteWorkspace(currentWorkspace.id);
      await refreshWorkspaces();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression de l'espace.");
    } finally {
      setIsUpdatingWs(false);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const noWorkspaceNotice = (
    <div className="p-8 text-center text-slate-400 text-xs">
      Veuillez sélectionner un espace de travail pour gérer ses membres, tags ou détails.
    </div>
  );

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5 animate-in fade-in duration-150 font-mono">
      <ConfirmDialog {...confirmProps} />
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider mb-1">
          <Settings className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Configuration & Gouvernance</span>
        </div>
        <h1 className="text-xl font-bold text-slate-100 uppercase tracking-tight">
          {currentWorkspace ? `Paramètres — ${currentWorkspace.name}` : 'Paramètres'}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Gérez votre profil, les accès collaborateurs, les rôles RBAC et les taxonomies.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1.5 border-b border-[#1E293B] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Mon Profil</span>
        </button>

        {isGlobalAdmin && (
          <button
            onClick={() => setActiveTab('all_users')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'all_users'
                ? 'bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Gestion des Profils & Admin ({allUsers.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'members'
              ? 'bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Membres de l'Espace ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tags')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'tags'
              ? 'bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TagIcon className="w-3.5 h-3.5" />
          <span>Tags & Labels ({tags.length})</span>
        </button>

        {isWorkspaceAdmin && currentWorkspace && (
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'workspace'
                ? 'bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Détails de l'Espace</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BellRing className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Sons & Alertes</span>
        </button>
      </div>

      {/* TAB: MY PROFILE (everyone, no workspace required) */}
      {activeTab === 'profile' && (
        <div className="max-w-lg space-y-4">
          {profileError && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center justify-between">
              <span>{profileError}</span>
              <button onClick={() => setProfileError('')} className="text-rose-400 hover:text-white font-bold ml-2">×</button>
            </div>
          )}
          {profileSuccess && (
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center justify-between">
              <span>{profileSuccess}</span>
              <button onClick={() => setProfileSuccess('')} className="text-emerald-400 hover:text-white font-bold ml-2">×</button>
            </div>
          )}

          <div className="p-4 rounded bg-[#0F172A] border border-[#1E293B] space-y-3.5">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#3B82F6]" />
              <span>Mes informations personnelles</span>
            </h3>

            <div className="flex items-center gap-3 pb-1">
              <Avatar name={profileName || user?.name} avatarUrl={user?.avatar_url} size="lg" />
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 focus:outline-none focus:border-[#2563EB]/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Adresse email</label>
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={e => setProfileEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 focus:outline-none focus:border-[#2563EB]/50"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-1.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-sm shadow-blue-500/25 transition-all disabled:opacity-60"
                >
                  {isSavingProfile ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>

          <div className="p-4 rounded bg-[#0F172A] border border-[#1E293B] space-y-3.5">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#3B82F6]" />
              <span>Changer le mot de passe</span>
            </h3>

            {passwordError && (
              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 focus:outline-none focus:border-[#2563EB]/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nouveau mot de passe</label>
                  <input
                    type="password"
                    required
                    placeholder="6 caractères minimum"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Confirmer</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 focus:outline-none focus:border-[#2563EB]/50"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-1.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-sm shadow-blue-500/25 transition-all disabled:opacity-60"
                >
                  {isChangingPassword ? 'Changement...' : 'Changer le mot de passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: GLOBAL USERS ADMINISTRATION (ADMIN ONLY) */}
      {activeTab === 'all_users' && isGlobalAdmin && (
        <div className="space-y-4">
          {/* Notification Alerts */}
          {userAdminError && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center justify-between">
              <span>{userAdminError}</span>
              <button onClick={() => setUserAdminError('')} className="text-rose-400 hover:text-white font-bold ml-2">×</button>
            </div>
          )}
          {userAdminSuccess && (
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center justify-between">
              <span>{userAdminSuccess}</span>
              <button onClick={() => setUserAdminSuccess('')} className="text-emerald-400 hover:text-white font-bold ml-2">×</button>
            </div>
          )}

          {/* Add New Profile Card */}
          <div className="p-4 rounded bg-[#0F172A] border border-[#1E293B] space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#3B82F6]" />
              <span>Créer un nouveau compte / profil utilisateur</span>
            </h3>
            <p className="text-xs text-slate-400">
              En tant qu'administrateur, vous pouvez enregistrer directement de nouveaux profils avec leur rôle système.
            </p>

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Jean Dupont"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="jean@axetask.com"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Mot de passe</label>
                <input
                  type="text"
                  placeholder="password123"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Rôle global</label>
                <div className="flex gap-2">
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as 'admin' | 'member')}
                    className="flex-1 px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs font-semibold text-slate-200 focus:outline-none focus:border-[#2563EB]/50 cursor-pointer"
                  >
                    <option value="member">Membre</option>
                    <option value="admin">Administrateur</option>
                  </select>

                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-sm shadow-blue-500/25 transition-all whitespace-nowrap"
                  >
                    Créer
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* User Profiles Directory Table */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded overflow-hidden">
            <div className="p-3 border-b border-[#1E293B] bg-[#0B1120] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Répertoire des profils ({filteredUsers.length} / {allUsers.length})
                </h3>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/50 w-full sm:w-64"
                />
              </div>
            </div>

            <div className="divide-y divide-[#1E293B]">
              {loadingUsers ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Chargement des profils...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Aucun profil trouvé correspondant à votre recherche.
                </div>
              ) : (
                filteredUsers.map(profile => {
                  const isCurrentSessionUser = profile.id === user?.id;

                  return (
                    <div key={profile.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1E293B]/20 transition-colors">
                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <Avatar user={profile} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">
                              {profile.name}
                            </span>
                            {isCurrentSessionUser && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#60A5FA] font-bold">
                                Vous (Session Active)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">{profile.email}</p>
                          {profile.created_at && (
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              Inscrit le {new Date(profile.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Controls & Actions */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {/* Role selector */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-slate-400 uppercase font-bold">Rôle :</label>
                          <select
                            disabled={isCurrentSessionUser}
                            value={profile.role}
                            onChange={e => handleUserRoleChange(profile.id, e.target.value as 'admin' | 'member')}
                            className="px-2.5 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs font-semibold text-slate-300 focus:outline-none focus:border-[#2563EB]/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="member">Membre</option>
                            <option value="admin">Administrateur</option>
                          </select>
                        </div>

                        {/* Delete Profile Button */}
                        {isCurrentSessionUser ? (
                          <span className="text-[10px] text-slate-500 italic px-2">
                            Protégé
                          </span>
                        ) : (
                          <button
                            onClick={() => setUserToDelete(profile)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 text-xs font-bold transition-colors"
                            title="Supprimer définitivement ce profil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: WORKSPACE MEMBERS MANAGEMENT */}
      {activeTab === 'members' && !currentWorkspace && noWorkspaceNotice}
      {activeTab === 'members' && currentWorkspace && (
        <div className="space-y-4">
          {/* Invite Form Card (Admin Only) */}
          {isWorkspaceAdmin ? (
            <div className="p-4 rounded bg-[#0F172A] border border-[#1E293B] space-y-2.5">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#3B82F6]" />
                <span>Inviter ou assigner un collaborateur dans cet espace</span>
              </h3>
              <p className="text-xs text-slate-400">
                L'utilisateur aura accès à tous les projets et tâches de <strong>{currentWorkspace.name}</strong>.
              </p>

              <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <input
                  type="email"
                  required
                  placeholder="adresse.email@societe.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/50"
                />

                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as WorkspaceRole)}
                  className="px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs font-semibold text-slate-200 focus:outline-none focus:border-[#2563EB]/50 cursor-pointer"
                >
                  <option value="member">Membre standard</option>
                  <option value="admin">Administrateur d'espace</option>
                </select>

                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-sm shadow-blue-500/25 transition-all whitespace-nowrap"
                >
                  Ajouter à l'espace
                </button>
              </form>

              {inviteError && (
                <p className="text-xs text-rose-400 mt-1 font-medium">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="text-xs text-emerald-400 mt-1 font-medium">{inviteSuccess}</p>
              )}
            </div>
          ) : (
            <div className="p-3 rounded bg-[#0F172A] border border-[#1E293B] text-xs text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#3B82F6]" />
              <span>Seuls les administrateurs de cet espace peuvent inviter ou modifier les rôles.</span>
            </div>
          )}

          {/* Members List Box */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded overflow-hidden">
            <div className="p-3 border-b border-[#1E293B] bg-[#0B1120]">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Collaborateurs de l'espace ({members.length})
              </h3>
            </div>

            <div className="divide-y divide-[#1E293B]">
              {members.map(member => (
                <div key={member.id} className="p-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar user={member.user} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">
                          {member.user?.name}
                        </span>
                        {member.user_id === user?.id && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#090D16] border border-[#1E293B] text-slate-400 font-medium">
                            Vous
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">{member.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Role selector */}
                    {isWorkspaceAdmin && member.user_id !== user?.id ? (
                      <select
                        value={member.role}
                        onChange={e => handleRoleChange(member.id, e.target.value as WorkspaceRole)}
                        className="px-2 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs font-semibold text-slate-300 focus:outline-none focus:border-[#2563EB]/50 cursor-pointer"
                      >
                        <option value="member">Membre</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}

                    {/* Remove from workspace button */}
                    {isWorkspaceAdmin && member.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        title="Retirer cet utilisateur de l'espace"
                        className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: TAGS MANAGEMENT */}
      {activeTab === 'tags' && !currentWorkspace && noWorkspaceNotice}
      {activeTab === 'tags' && currentWorkspace && (
        <div className="space-y-4">
          {/* Add Tag Card */}
          <div className="p-4 rounded bg-[#0F172A] border border-[#1E293B] space-y-2.5">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#3B82F6]" />
              <span>Créer un nouveau tag</span>
            </h3>

            <form onSubmit={handleCreateTag} className="flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="text"
                required
                placeholder="Nom du tag (ex: Bug, Marketing, Urgent, Backend)..."
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/50"
              />

              {/* Color Presets */}
              <div className="flex items-center gap-1.5 p-1 rounded bg-[#090D16] border border-[#1E293B]">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewTagColor(c)}
                    className={`w-5 h-5 rounded transition-transform ${newTagColor === c ? 'scale-110 ring-2 ring-[#3B82F6]' : 'opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-sm shadow-blue-500/25 transition-colors whitespace-nowrap"
              >
                Créer le tag
              </button>
            </form>
          </div>

          {/* Tags list */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded p-4 space-y-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
              Tags existants dans {currentWorkspace.name}
            </h3>

            <div className="flex flex-wrap gap-2 pt-1">
              {tags.map(tag => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 px-2.5 py-1 rounded border text-xs font-semibold group"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                    borderColor: `${tag.color}40`,
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span>{tag.name}</span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors ml-1 opacity-60 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {tags.length === 0 && (
                <p className="text-xs text-slate-500 italic">Aucun tag créé pour l'instant.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: WORKSPACE SETTINGS */}
      {activeTab === 'workspace' && isWorkspaceAdmin && currentWorkspace && (
        <>
          <form onSubmit={handleSaveWorkspace} className="space-y-4">
          <div className="p-4 rounded bg-[#0F172A] border border-[#1E293B] space-y-3.5">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              Personnalisation de l'espace
            </h3>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nom de l'espace</label>
              <input
                type="text"
                required
                value={wsName}
                onChange={e => setWsName(e.target.value)}
                className="w-full sm:w-80 px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 focus:outline-none focus:border-[#2563EB]/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Couleur thématique</label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setWsColor(c)}
                    className={`w-7 h-7 rounded transition-transform ${wsColor === c ? 'scale-110 ring-2 ring-[#3B82F6] shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingWs}
                className="px-4 py-1.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-sm shadow-blue-500/25 transition-all"
              >
                {isUpdatingWs ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </form>

        {/* Danger Zone */}
        <div className="p-5 rounded-lg bg-rose-500/5 border border-rose-500/20 space-y-4">
          <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wide flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Zone dangereuse
          </h3>
          <p className="text-xs text-rose-300/80 max-w-2xl leading-relaxed">
            La suppression d'un espace de travail est définitive. Tous les projets, tâches, tags et membres qui y sont rattachés perdront accès à ces données, et elles seront détruites de manière permanente.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleDeleteWorkspace}
              disabled={isUpdatingWs}
              className="px-4 py-2 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 hover:border-rose-500 font-bold text-xs shadow-sm transition-all"
            >
              Supprimer l'espace de travail
            </button>
          </div>
        </div>
      </>
      )}

      {/* TAB: SONS & ALERTES (AUDIO ENGINE & NOTIFICATIONS) */}
      {activeTab === 'notifications' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Main Controls Card */}
          <div className="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 border border-[#2563EB]/30 flex items-center justify-center text-[#60A5FA] shadow-lg shadow-blue-500/10">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <span>Moteur Audio & Sons de Notification</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      Web Audio API Actif
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Générateur procédural d'effets acoustiques aléatoires à chaque notification et interaction.
                  </p>
                </div>
              </div>

              {/* Master Toggle */}
              <div className="flex items-center gap-3 bg-[#090D16] p-1.5 rounded-lg border border-[#1E293B] shrink-0">
                <button
                  type="button"
                  onClick={() => toggleSound(!soundEnabled)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    soundEnabled
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25'
                      : 'bg-[#1E293B] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{soundEnabled ? 'Sons Activés' : 'Sons Désactivés'}</span>
                </button>
              </div>
            </div>

            {/* Volume Slider & Random Tester */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Volume Slider */}
              <div className="p-4 rounded-lg bg-[#090D16] border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#3B82F6]" />
                    Volume Principal
                  </span>
                  <span className="font-mono font-bold text-[#60A5FA]">
                    {Math.round(soundVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={soundVolume}
                  disabled={!soundEnabled}
                  onChange={(e) => updateVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                />
                <p className="text-[11px] text-slate-500">
                  Ajuste le niveau de sortie pour l'ensemble des synthétiseurs et carillons de l'application.
                </p>
              </div>

              {/* Random Sound Tester Button */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-[#090D16] to-[#0E1726] border border-[#2563EB]/30 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#60A5FA]" />
                    Générateur Aléatoire
                  </span>
                  {lastPlayedSound && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#93C5FD]">
                      Dernier: {lastPlayedSound.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Tire au sort l'une des 5 signatures acoustiques harmoniques et déclenche un toast de test.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const played = playTestSound();
                    setLastPlayedSound(played);
                    notify({
                      type: 'sound_preview',
                      title: 'Son Aléatoire Joué',
                      message: `Acoustique: ${played.replace('_', ' ')}`,
                      sound: false // already played by playTestSound
                    });
                  }}
                  className="w-full py-2 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Tester un Son Aléatoire</span>
                </button>
              </div>
            </div>

            {/* Individual Sound Presets Laboratory */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Les 5 Signatures Acoustiques Aléatoires</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    id: 'crystal_bell' as SoundEffectType,
                    name: 'Crystal Bell',
                    desc: 'Carillon cristallin C6 / E6 / C7 avec décroissance exponentielle.',
                    color: 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/60',
                    tag: 'C6-E6-C7 Sine'
                  },
                  {
                    id: 'marimba_pop' as SoundEffectType,
                    name: 'Marimba Pop',
                    desc: 'Percussion boisée ronde avec glissando de résonance.',
                    color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60',
                    tag: 'Warm Triangle'
                  },
                  {
                    id: 'digital_ping' as SoundEffectType,
                    name: 'Digital Ping',
                    desc: 'Double impulsion moderne ultra-claire F6 / A6.',
                    color: 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60',
                    tag: 'Acoustic Dual'
                  },
                  {
                    id: 'harmonic_success' as SoundEffectType,
                    name: 'Harmonic Success',
                    desc: 'Accord d\'élévation tri-phonique E5 / G#5 / B5.',
                    color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60',
                    tag: 'Major Triad'
                  },
                  {
                    id: 'harp_chime' as SoundEffectType,
                    name: 'Harp Chime',
                    desc: 'Arpège pincé acoustique D5 / A5 / D6.',
                    color: 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60',
                    tag: 'Plucked Strings'
                  },
                  {
                    id: 'subtle_tap' as SoundEffectType,
                    name: 'Subtle Tap',
                    desc: 'Micro-clic de confirmation minimaliste pour les actions rapides.',
                    color: 'border-slate-500/30 bg-slate-500/5 hover:border-slate-400/60',
                    tag: 'Fast Transient'
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      playTestSound(item.id);
                      setLastPlayedSound(item.id);
                      notify({
                        type: 'info',
                        title: `Son: ${item.name}`,
                        message: item.desc,
                        sound: false
                      });
                    }}
                    className={`p-3.5 rounded-xl border ${item.color} text-left transition-all duration-200 group flex flex-col justify-between space-y-2`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-200 group-hover:text-white flex items-center gap-1.5">
                        <Play className="w-3 h-3 text-[#3B82F6] fill-current group-hover:scale-110 transition-transform" />
                        {item.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Documentation & Architecture Details Box */}
            <div className="p-4 rounded-xl bg-[#090D16] border border-[#1E293B] space-y-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#3B82F6]" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Architecture & Déclencheurs Intégrés
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-400 leading-relaxed">
                <div className="space-y-1 bg-[#0F172A] p-3 rounded-lg border border-[#1E293B]">
                  <strong className="text-slate-200 block font-mono">1. Zéro latence procédurale</strong>
                  <p>
                    Les sons sont synthétisés en temps réel via l'API Web Audio (<code className="text-[#60A5FA]">OscillatorNode</code> + <code className="text-[#60A5FA]">GainNode</code> exponentiels), garantissant un déclenchement instantané sans téléchargement de fichier MP3.
                  </p>
                </div>
                <div className="space-y-1 bg-[#0F172A] p-3 rounded-lg border border-[#1E293B]">
                  <strong className="text-slate-200 block font-mono">2. Événements connectés</strong>
                  <p>
                    Création de tâches, validation Kanban, minuterie de suivi du temps, ajout de workspaces et commentaires jouent automatiquement une nuance sonore aléatoire.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE USER MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-rose-500/40 rounded-lg p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase tracking-wide">
                Suppression définitive de profil
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le compte utilisateur de{' '}
              <strong className="text-white">{userToDelete.name}</strong> ({userToDelete.email}) ?
            </p>

            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
              ⚠️ Cette action est irréversible. Toutes ses assignations et accès seront automatiquement désolidarisés.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="px-3.5 py-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-slate-300 text-xs font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingUser ? 'Suppression...' : 'Confirmer la suppression'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
