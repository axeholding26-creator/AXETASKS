import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../lib/api';
import { Task, TaskStatus } from '../../types';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Play, 
  CheckCircle2, 
  Layers, 
  FolderGit2, 
  Flame, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export const GlobalDashboard: React.FC = () => {
  const { user } = useAuth();
  const { setSelectedTaskId, setIsCreateTaskModalOpen, startTimer, activeTimer, taskVersion, bumpTaskVersion } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue' | 'in_progress' | 'urgent'>('all');
  const [search, setSearch] = useState('');

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardTasks();
      setTasks(data);
    } catch (err) {
      console.error('Error fetching dashboard tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user, taskVersion]);

  // Calculations
  const todayStr = new Date().toISOString().split('T')[0];

  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < todayStr && t.status !== 'termine');
  const todayTasks = tasks.filter(t => t.due_date === todayStr && t.status !== 'termine');
  const inProgressTasks = tasks.filter(t => t.status === 'en_cours');
  const urgentTasks = tasks.filter(t => (t.priority === 'urgente' || t.priority === 'haute') && t.status !== 'termine');
  const completedTasks = tasks.filter(t => t.status === 'termine');

  // Filtered tasks
  const filteredTasks = tasks.filter(t => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = t.title.toLowerCase().includes(q) ||
        t.project?.name.toLowerCase().includes(q) ||
        t.workspace?.name.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filter === 'overdue') return t.due_date && t.due_date < todayStr && t.status !== 'termine';
    if (filter === 'today') return t.due_date === todayStr && t.status !== 'termine';
    if (filter === 'in_progress') return t.status === 'en_cours';
    if (filter === 'urgent') return (t.priority === 'urgente' || t.priority === 'haute') && t.status !== 'termine';
    return true;
  });

  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.updateTask(taskId, { status: newStatus });
      bumpTaskVersion();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDueDate = (dateStr?: string | null) => {
    if (!dateStr) return { text: 'Sans date', isOverdue: false, isToday: false };
    const isOverdue = dateStr < todayStr;
    const isToday = dateStr === todayStr;
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return {
      text: isToday ? "Aujourd'hui" : formatted,
      isOverdue,
      isToday,
    };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-150 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider mb-1">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>VUE GLOBALE // SYNTHÈSE MULTI-PROJETS</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Bonjour, {user?.name}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Flux consolidé des tâches actives réparties sur l'ensemble de vos espaces de travail.
          </p>
        </div>

        <button
          onClick={() => setIsCreateTaskModalOpen(true)}
          className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-sm shadow-blue-500/25 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Nouvelle tâche</span>
        </button>
      </div>

      {/* Metrics Row / Data Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')}
          className={`p-3.5 rounded border text-left transition-all relative overflow-hidden group ${
            filter === 'overdue'
              ? 'bg-rose-950/20 border-rose-600/70 ring-1 ring-rose-500/40'
              : 'bg-[#0F172A] border-[#1E293B] hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En retard</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${overdueTasks.length > 0 ? 'text-rose-400' : 'text-slate-600'}`} />
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-1.5">{overdueTasks.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">CRITIQUE // ÉCHÉANCE PASSÉE</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'today' ? 'all' : 'today')}
          className={`p-3.5 rounded border text-left transition-all group ${
            filter === 'today'
              ? 'bg-[#2563EB]/20 border-[#2563EB]/70 ring-1 ring-[#2563EB]/40'
              : 'bg-[#0F172A] border-[#1E293B] hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aujourd’hui</span>
            <Calendar className="w-3.5 h-3.5 text-[#3B82F6]" />
          </div>
          <p className="text-2xl font-bold text-[#60A5FA] mt-1.5">{todayTasks.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">ÉCHÉANCE DU JOUR</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'in_progress' ? 'all' : 'in_progress')}
          className={`p-3.5 rounded border text-left transition-all group ${
            filter === 'in_progress'
              ? 'bg-sky-950/20 border-sky-600/70 ring-1 ring-sky-500/40'
              : 'bg-[#0F172A] border-[#1E293B] hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En cours</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-sky-400 mt-1.5">{inProgressTasks.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">EXÉCUTION ACTIVE</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'urgent' ? 'all' : 'urgent')}
          className={`p-3.5 rounded border text-left transition-all group ${
            filter === 'urgent'
              ? 'bg-amber-950/20 border-amber-600/70 ring-1 ring-amber-500/40'
              : 'bg-[#0F172A] border-[#1E293B] hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioritaires</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-1.5">{urgentTasks.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">HAUTE & URGENTE</p>
        </button>
      </div>

      {/* Main Task List / Data Grid Panel */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded overflow-hidden shadow-lg shadow-black/60">
        {/* Controls bar */}
        <div className="p-3 border-b border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0B1120]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer les tâches..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/60"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/40'
                  : 'bg-[#1E293B] text-slate-400 hover:text-slate-200'
              }`}
            >
              Toutes ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('overdue')}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === 'overdue'
                  ? 'bg-rose-950/30 text-rose-300 border border-rose-700/50'
                  : 'bg-[#1E293B] text-slate-400 hover:text-slate-200'
              }`}
            >
              Retard ({overdueTasks.length})
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === 'today'
                  ? 'bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/40'
                  : 'bg-[#1E293B] text-slate-400 hover:text-slate-200'
              }`}
            >
              Aujourd'hui ({todayTasks.length})
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === 'in_progress'
                  ? 'bg-sky-950/30 text-sky-300 border border-sky-700/50'
                  : 'bg-[#1E293B] text-slate-400 hover:text-slate-200'
              }`}
            >
              En cours ({inProgressTasks.length})
            </button>
          </div>
        </div>

        {/* Task Items List / Data Rows */}
        <div className="divide-y divide-[#1E293B]">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Synchronisation des données en cours...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-bold text-slate-200">Toutes les tâches sont terminées.</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                Aucune tâche ne correspond aux critères de filtre sélectionnés.
              </p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const dueInfo = formatDueDate(task.due_date);
              const isTaskTimerActive = activeTimer?.taskId === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="p-3 hover:bg-[#1E293B]/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer group"
                >
                  {/* Left: Task Info & Workspace/Project Badges */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {/* Workspace badge */}
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-[#0B1120] text-slate-300 border border-[#1E293B]">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: task.workspace?.color || '#2563EB' }}
                        />
                        {task.workspace?.name || 'Workspace'}
                      </span>

                      {/* Project badge */}
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        <FolderGit2 className="w-3 h-3 text-slate-500" />
                        {task.project?.name}
                      </span>

                      {/* Tags */}
                      {task.tags?.map(t => (
                        <span
                          key={t.id}
                          className="text-[10px] px-1.5 py-0.2 rounded font-medium"
                          style={{ backgroundColor: `${t.color}15`, color: t.color, border: `1px solid ${t.color}35` }}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <h3 className={`text-xs font-semibold group-hover:text-[#60A5FA] transition-colors truncate ${
                      task.status === 'termine' ? 'line-through text-slate-500' : 'text-slate-100'
                    }`}>
                      {task.title}
                    </h3>
                  </div>

                  {/* Right: Due Date, Priority, Status, Quick Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center" onClick={e => e.stopPropagation()}>
                    {/* Due Date */}
                    {task.due_date && (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          dueInfo.isOverdue && task.status !== 'termine'
                            ? 'bg-rose-950/30 text-rose-400 border-rose-800/60'
                            : dueInfo.isToday
                            ? 'bg-[#2563EB]/15 text-[#60A5FA] border-[#2563EB]/40'
                            : 'bg-[#0B1120] text-slate-400 border-[#1E293B]'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {dueInfo.text}
                      </span>
                    )}

                    {/* Priority Badge */}
                    <PriorityBadge priority={task.priority} />

                    {/* Status Dropdown / Badge */}
                    <StatusBadge status={task.status} />

                    {/* Stopwatch Start/Log button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isTaskTimerActive) {
                          // Already active
                        } else {
                          startTimer(task);
                        }
                      }}
                      title="Lancer le chrono sur cette tâche"
                      className={`p-1.5 rounded border transition-all ${
                        isTaskTimerActive
                          ? 'bg-[#2563EB]/20 text-[#60A5FA] border-[#2563EB]/50'
                          : 'bg-[#0B1120] text-slate-400 border-[#1E293B] hover:text-[#60A5FA] hover:border-[#2563EB]/40'
                      }`}
                    >
                      <Play className="w-3 h-3" />
                    </button>

                    {/* Direct open drawer button */}
                    <button
                      onClick={() => setSelectedTaskId(task.id)}
                      className="p-1.5 rounded text-slate-500 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
                      title="Ouvrir le détail"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
