import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Task, TaskStatus, TaskPriority, Tag, User } from '../../types';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import confetti from 'canvas-confetti';
import { 
  X, 
  Trash2, 
  Calendar, 
  User as UserIcon, 
  Tag as TagIcon, 
  CheckSquare, 
  MessageSquare, 
  Paperclip, 
  Clock, 
  Play, 
  Plus, 
  Check, 
  Send, 
  FolderGit2, 
  ExternalLink,
  Download,
  AlertCircle
} from 'lucide-react';

export const TaskDetailDrawer: React.FC = () => {
  const { user } = useAuth();
  const { 
    selectedTaskId, 
    setSelectedTaskId, 
    startTimer, 
    activeTimer, 
    currentWorkspace 
  } = useWorkspace();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // Form edit states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('a_faire');
  const [priority, setPriority] = useState<TaskPriority>('normale');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  // Subtasks & Comments & Attachments & Time Logging inputs
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);

  // Time logging
  const [logDuration, setLogDuration] = useState('');
  const [logNote, setLogNote] = useState('');
  const [isLoggingTime, setIsLoggingTime] = useState(false);

  // Available options
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
  const [workspaceTags, setWorkspaceTags] = useState<Tag[]>([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'subtasks' | 'comments' | 'attachments' | 'time'>('subtasks');

  const loadTask = async () => {
    if (!selectedTaskId) return;
    try {
      setLoading(true);
      const data = await api.getTask(selectedTaskId);
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setStatus(data.status);
      setPriority(data.priority);
      setAssigneeId(data.assignee_id || '');
      setDueDate(data.due_date || '');

      if (data.workspace_id) {
        const [members, tags] = await Promise.all([
          api.getWorkspaceMembers(data.workspace_id),
          api.getWorkspaceTags(data.workspace_id),
        ]);
        setWorkspaceMembers(members.map(m => m.user).filter(Boolean) as User[]);
        setWorkspaceTags(tags);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [selectedTaskId]);

  const handleUpdateField = async (updates: Partial<Task>) => {
    if (!task) return;
    try {
      const updated = await api.updateTask(task.id, updates);
      setTask(updated);
    } catch (err) {
      console.error(err);
    }
  };

  // Subtasks
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !task) return;
    try {
      await api.addSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      loadTask();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    try {
      await api.updateSubtask(subtaskId, { completed: !currentCompleted });
      if (!currentCompleted) {
        confetti({
          particleCount: 20,
          spread: 40,
          origin: { y: 0.8 },
          colors: ['#F59E0B', '#10B981']
        });
      }
      loadTask();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await api.deleteSubtask(subtaskId);
      loadTask();
    } catch (err) {
      console.error(err);
    }
  };

  // Comments
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim() || !task) return;
    try {
      await api.addComment(task.id, newCommentContent.trim());
      setNewCommentContent('');
      loadTask();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId);
      loadTask();
    } catch (err) {
      console.error(err);
    }
  };

  // Attachments
  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttachmentName.trim() || !newAttachmentUrl.trim() || !task) return;
    try {
      await api.addAttachment(task.id, {
        file_name: newAttachmentName.trim(),
        file_url: newAttachmentUrl.trim(),
        file_size: 150000,
        file_type: 'document',
      });
      setNewAttachmentName('');
      setNewAttachmentUrl('');
      setIsAddingAttachment(false);
      loadTask();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await api.deleteAttachment(attachmentId);
      loadTask();
    } catch (err) {
      console.error(err);
    }
  };

  // Time logging
  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const duration = parseInt(logDuration, 10);
    if (!duration || duration <= 0 || !task) return;
    try {
      await api.logTime(task.id, duration, logNote, new Date().toISOString().split('T')[0]);
      setLogDuration('');
      setLogNote('');
      setIsLoggingTime(false);
      loadTask();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTimeEntry = async (entryId: string) => {
    try {
      await api.deleteTimeEntry(entryId);
      loadTask();
    } catch (err) {
      console.error(err);
    }
  };

  // Tags toggle
  const handleToggleTag = async (tagId: string) => {
    if (!task) return;
    const currentTagIds = task.tags?.map(t => t.id) || [];
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter(id => id !== tagId)
      : [...currentTagIds, tagId];

    await handleUpdateField({ tag_ids: newTagIds } as any);
    loadTask();
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    if (!window.confirm('Voulez-vous vraiment supprimer cette tâche ?')) return;
    try {
      await api.deleteTask(task.id);
      setSelectedTaskId(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (!selectedTaskId) return null;

  const totalSubtasks = task?.subtasks?.length || 0;
  const completedSubtasks = task?.subtasks?.filter(s => s.completed).length || 0;
  const subtasksProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-150 font-mono">
      <div className="w-full max-w-2xl bg-[#090D16] border-l border-[#1E293B] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-3.5 border-b border-[#1E293B] bg-[#0B1120] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 truncate">
            <span className="flex items-center gap-1.5 text-slate-300">
              <FolderGit2 className="w-3.5 h-3.5 text-[#3B82F6]" />
              {task?.project?.name || 'Projet'}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-[#60A5FA] font-mono text-[11px]">#{task?.id.slice(-4)}</span>
          </div>

          <div className="flex items-center gap-2">
            {task && (
              <button
                onClick={() => startTimer(task)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2563EB]/15 border border-[#2563EB]/40 text-[#60A5FA] hover:bg-[#2563EB]/25 text-xs font-bold transition-colors"
              >
                <Play className="w-3 h-3" />
                <span>Chronométrer</span>
              </button>
            )}

            <button
              onClick={handleDeleteTask}
              title="Supprimer la tâche"
              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setSelectedTaskId(null)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="text-center py-20 text-xs text-slate-400">
              Synchronisation des données de la tâche...
            </div>
          ) : task ? (
            <>
              {/* Title input */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={() => handleUpdateField({ title })}
                  className="w-full text-lg font-bold bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-[#0F172A] p-1.5 rounded transition-colors border border-transparent focus:border-[#2563EB]/50"
                  placeholder="Titre de la tâche..."
                />
              </div>

              {/* Status, Priority, Assignee & Due Date Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded bg-[#0F172A] border border-[#1E293B]">
                {/* Status */}
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Statut
                  </label>
                  <select
                    value={status}
                    onChange={e => {
                      const val = e.target.value as TaskStatus;
                      setStatus(val);
                      handleUpdateField({ status: val });
                    }}
                    className="w-full px-2 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs font-semibold text-slate-200 focus:outline-none focus:border-[#2563EB]/60 cursor-pointer"
                  >
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="en_revision">En révision</option>
                    <option value="termine">Terminé</option>
                    <option value="bloque">Bloqué</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Priorité
                  </label>
                  <select
                    value={priority}
                    onChange={e => {
                      const val = e.target.value as TaskPriority;
                      setPriority(val);
                      handleUpdateField({ priority: val });
                    }}
                    className="w-full px-2 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs font-semibold text-slate-200 focus:outline-none focus:border-[#2563EB]/60 cursor-pointer"
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Assigné à
                  </label>
                  <select
                    value={assigneeId}
                    onChange={e => {
                      const val = e.target.value;
                      setAssigneeId(val);
                      handleUpdateField({ assignee_id: val || null });
                    }}
                    className="w-full px-2 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs font-semibold text-slate-200 focus:outline-none focus:border-[#2563EB]/60 cursor-pointer truncate"
                  >
                    <option value="">Non assigné</option>
                    {workspaceMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Échéance
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => {
                      const val = e.target.value;
                      setDueDate(val);
                      handleUpdateField({ due_date: val || null });
                    }}
                    className="w-full px-2 py-0.5 rounded bg-[#090D16] border border-[#1E293B] text-xs font-medium text-slate-200 focus:outline-none focus:border-[#2563EB]/60 cursor-pointer"
                  />
                </div>
              </div>

              {/* Tags Selector */}
              {workspaceTags.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <TagIcon className="w-3 h-3 text-[#3B82F6]" />
                    <span>Tags</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {workspaceTags.map(tag => {
                      const isSelected = task.tags?.some(t => t.id === tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleTag(tag.id)}
                          className={`text-xs px-2 py-0.5 rounded font-medium transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'ring-1 ring-[#2563EB] shadow-sm'
                              : 'opacity-50 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: `${tag.color}15`,
                            color: tag.color,
                            border: `1px solid ${tag.color}45`,
                          }}
                        >
                          <span>{tag.name}</span>
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description & Spécifications
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={() => handleUpdateField({ description })}
                  placeholder="Spécifications, paramètres et détails techniques..."
                  rows={4}
                  className="w-full p-2.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/60 leading-relaxed"
                />
              </div>

              {/* Tabs Navigation: Subtasks, Comments, Attachments, Time Logged */}
              <div className="border-t border-[#1E293B] pt-3">
                <div className="flex items-center gap-1.5 border-b border-[#1E293B] pb-2 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('subtasks')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                      activeTab === 'subtasks'
                        ? 'bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Sous-tâches ({task.subtasks?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                      activeTab === 'comments'
                        ? 'bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Commentaires ({task.comments?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('attachments')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                      activeTab === 'attachments'
                        ? 'bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Fichiers ({task.attachments?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('time')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                      activeTab === 'time'
                        ? 'bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Temps ({task.total_time_minutes ? `${Math.floor(task.total_time_minutes / 60)}h ${task.total_time_minutes % 60}m` : '0m'})</span>
                  </button>
                </div>

                {/* TAB 1: SUBTASKS */}
                {activeTab === 'subtasks' && (
                  <div className="pt-3 space-y-2.5">
                    {totalSubtasks > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Progression</span>
                          <span className="font-mono font-bold text-[#60A5FA]">{completedSubtasks}/{totalSubtasks} ({subtasksProgress}%)</span>
                        </div>
                        <div className="w-full h-1 rounded bg-[#1E293B] overflow-hidden">
                          <div
                            className="h-full rounded bg-[#2563EB]"
                            style={{ width: `${subtasksProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {task.subtasks?.map(sub => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between p-2 rounded bg-[#0F172A] border border-[#1E293B] group hover:border-[#334155]"
                        >
                          <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                            <input
                              type="checkbox"
                              checked={sub.completed}
                              onChange={() => handleToggleSubtask(sub.id, sub.completed)}
                              className="w-3.5 h-3.5 rounded border-[#1E293B] text-[#2563EB] focus:ring-0 accent-[#2563EB]"
                            />
                            <span className={`text-xs truncate ${sub.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {sub.title}
                            </span>
                          </label>
                          <button
                            onClick={() => handleDeleteSubtask(sub.id)}
                            className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Subtask Form */}
                    <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={e => setNewSubtaskTitle(e.target.value)}
                        placeholder="Ajouter une sous-tâche..."
                        className="flex-1 px-2.5 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/60"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 bg-[#1E293B] hover:bg-[#334155] text-[#60A5FA] border border-[#1E293B] font-bold text-xs rounded transition-colors"
                      >
                        + Ajouter
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 2: COMMENTS */}
                {activeTab === 'comments' && (
                  <div className="pt-3 space-y-3">
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {task.comments?.map(cmt => (
                        <div key={cmt.id} className="p-2.5 rounded bg-[#0F172A] border border-[#1E293B] space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar user={cmt.user} size="xs" />
                              <span className="text-xs font-bold text-slate-200">{cmt.user?.name}</span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(cmt.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {cmt.user_id === user?.id && (
                              <button
                                onClick={() => handleDeleteComment(cmt.id)}
                                className="text-slate-600 hover:text-rose-400 text-xs"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 pl-5 leading-relaxed whitespace-pre-wrap">
                            {cmt.content}
                          </p>
                        </div>
                      ))}

                      {(!task.comments || task.comments.length === 0) && (
                        <div className="p-6 text-center text-xs text-slate-500">
                          Aucun commentaire pour le moment.
                        </div>
                      )}
                    </div>

                    {/* New Comment Input */}
                    <form onSubmit={handleAddComment} className="flex items-center gap-2">
                      <Avatar user={user} size="sm" />
                      <input
                        type="text"
                        value={newCommentContent}
                        onChange={e => setNewCommentContent(e.target.value)}
                        placeholder="Écrire une note ou commentaire..."
                        className="flex-1 px-3 py-1.5 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/60"
                      />
                      <button
                        type="submit"
                        className="p-1.5 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors shadow-sm shadow-blue-500/25"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 3: ATTACHMENTS */}
                {activeTab === 'attachments' && (
                  <div className="pt-3 space-y-2.5">
                    <div className="space-y-1.5">
                      {task.attachments?.map(att => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 rounded bg-[#0F172A] border border-[#1E293B]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-200 truncate">{att.file_name}</p>
                              <p className="text-[10px] text-slate-500">Ajouté par {att.uploader?.name}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-[#3B82F6]"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="p-1 text-slate-600 hover:text-rose-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {(!task.attachments || task.attachments.length === 0) && (
                        <div className="p-6 text-center text-xs text-slate-500">
                          Aucune pièce jointe liée à cette tâche.
                        </div>
                      )}
                    </div>

                    {isAddingAttachment ? (
                      <form onSubmit={handleAddAttachment} className="p-2.5 rounded bg-[#0F172A] border border-[#1E293B] space-y-2">
                        <input
                          type="text"
                          value={newAttachmentName}
                          onChange={e => setNewAttachmentName(e.target.value)}
                          placeholder="Nom du fichier (ex: spec.pdf)"
                          className="w-full px-2.5 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={newAttachmentUrl}
                          onChange={e => setNewAttachmentUrl(e.target.value)}
                          placeholder="Lien URL (https://...)"
                          className="w-full px-2.5 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingAttachment(false)}
                            className="px-2 py-0.5 text-xs text-slate-400"
                          >
                            Annuler
                          </button>
                          <button
                            type="submit"
                            className="px-2.5 py-0.5 bg-[#2563EB] text-white font-bold rounded text-xs"
                          >
                            Attacher
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsAddingAttachment(true)}
                        className="w-full py-1.5 border border-dashed border-[#1E293B] rounded text-xs font-semibold text-[#60A5FA] hover:bg-[#0F172A] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Attacher un lien / fichier</span>
                      </button>
                    )}
                  </div>
                )}

                {/* TAB 4: TIME ENTRIES */}
                {activeTab === 'time' && (
                  <div className="pt-3 space-y-2.5">
                    <div className="flex items-center justify-between p-2.5 rounded bg-[#2563EB]/10 border border-[#2563EB]/30">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#60A5FA]">Total cumulé</span>
                        <p className="text-lg font-bold text-slate-100 font-mono">
                          {task.total_time_minutes ? `${Math.floor(task.total_time_minutes / 60)}h ${task.total_time_minutes % 60}m` : '0m'}
                        </p>
                      </div>

                      <button
                        onClick={() => setIsLoggingTime(!isLoggingTime)}
                        className="px-2.5 py-1 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs transition-colors shadow-sm shadow-blue-500/25"
                      >
                        + Logguer du temps
                      </button>
                    </div>

                    {isLoggingTime && (
                      <form onSubmit={handleLogTime} className="p-2.5 rounded bg-[#0F172A] border border-[#1E293B] space-y-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Durée (minutes)</label>
                          <input
                            type="number"
                            min="1"
                            value={logDuration}
                            onChange={e => setLogDuration(e.target.value)}
                            placeholder="Ex: 60"
                            className="w-full px-2.5 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Note d'activité</label>
                          <input
                            type="text"
                            value={logNote}
                            onChange={e => setLogNote(e.target.value)}
                            placeholder="Ex: Refactoring, audit..."
                            className="w-full px-2.5 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 focus:outline-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsLoggingTime(false)}
                            className="px-2 py-0.5 text-xs text-slate-400"
                          >
                            Annuler
                          </button>
                          <button
                            type="submit"
                            className="px-2.5 py-0.5 bg-[#2563EB] text-white font-bold rounded text-xs"
                          >
                            Enregistrer
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="space-y-1">
                      {task.time_entries?.map(te => (
                        <div
                          key={te.id}
                          className="flex items-center justify-between p-2 rounded bg-[#0F172A] border border-[#1E293B] text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar user={te.user} size="xs" />
                            <div>
                              <span className="font-mono font-bold text-[#60A5FA]">
                                {Math.floor(te.duration_minutes / 60) > 0 ? `${Math.floor(te.duration_minutes / 60)}h ` : ''}
                                {te.duration_minutes % 60}m
                              </span>
                              {te.note && <span className="text-slate-400 ml-2">— {te.note}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">{te.date}</span>
                            {te.user_id === user?.id && (
                              <button
                                onClick={() => handleDeleteTimeEntry(te.id)}
                                className="text-slate-600 hover:text-rose-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-xs text-slate-400">
              Tâche introuvable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
