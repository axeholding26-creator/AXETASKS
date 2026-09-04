import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../lib/api';
import { TimeEntry, TimeAllocationWorkspace, User } from '../../types';
import { Avatar } from '../common/Avatar';
import { ConfirmDialog, useConfirm } from '../common/ConfirmDialog';
import {
  Clock,
  Download,
  Layers,
  FolderGit2,
  Search,
  Trash2,
  ArrowUpRight,
  ArrowLeft,
  TrendingUp,
  FileSpreadsheet,
  Users,
  LayoutGrid,
  History
} from 'lucide-react';

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export const TimeTrackingView: React.FC = () => {
  const { user } = useAuth();
  const { workspaces, setSelectedTaskId } = useWorkspace();
  const { confirmProps, confirm } = useConfirm();

  const isGlobalAdmin = user?.role === 'admin';
  const [mainTab, setMainTab] = useState<'overview' | 'history'>('overview');

  /* ---------- OVERVIEW ("allocation") STATE ---------- */
  const [scope, setScope] = useState<'me' | 'all'>('me');
  const [myAllocation, setMyAllocation] = useState<TimeAllocationWorkspace[]>([]);
  const [allAllocation, setAllAllocation] = useState<{ user: User; workspaces: TimeAllocationWorkspace[] }[]>([]);
  const [loadingAllocation, setLoadingAllocation] = useState(true);
  const [drillWorkspaceId, setDrillWorkspaceId] = useState<string | null>(null);
  const [drillProjectId, setDrillProjectId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

  const loadAllocation = async () => {
    try {
      setLoadingAllocation(true);
      if (scope === 'all' && isGlobalAdmin) {
        setAllAllocation(await api.getAllMembersTimeAllocation());
      } else {
        setMyAllocation(await api.getMyTimeAllocation());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAllocation(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'overview') {
      loadAllocation();
      setDrillWorkspaceId(null);
      setDrillProjectId(null);
    }
  }, [mainTab, scope]);

  const drillWorkspace = myAllocation.find(w => w.id === drillWorkspaceId) || null;
  const drillProject = drillWorkspace?.projects.find(p => p.id === drillProjectId) || null;

  // Flattened rows for the admin "all members" table
  const allMemberRows = allAllocation.flatMap(({ user: member, workspaces: wss }) =>
    wss.flatMap(ws => ws.projects.map(prj => ({ member, ws, prj })))
  ).filter(row => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return row.member.name.toLowerCase().includes(q) || row.member.email.toLowerCase().includes(q);
  });

  /* ---------- HISTORY (manual time entries) STATE — unchanged behavior ---------- */
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'week' | 'month'>('all');
  const [search, setSearch] = useState('');

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await api.getTimeEntries({
        workspace_id: selectedWorkspaceId !== 'all' ? selectedWorkspaceId : undefined,
        project_id: selectedProjectId !== 'all' ? selectedProjectId : undefined,
      });
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'history') loadEntries();
  }, [mainTab, selectedWorkspaceId, selectedProjectId, user]);

  const handleDeleteEntry = async (id: string) => {
    const ok = await confirm({
      title: 'Supprimer l\'entrée de temps',
      message: 'Voulez-vous supprimer cette session de temps ?\n\nCette action est irréversible.',
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteTimeEntry(id);
      loadEntries();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEntries = entries.filter(e => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = e.task?.title.toLowerCase().includes(q) ||
        e.task?.project_name?.toLowerCase().includes(q) ||
        e.note?.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (selectedPeriod === 'week') {
      const entryDate = new Date(e.date).getTime();
      const weekAgo = Date.now() - 7 * 86400000;
      if (entryDate < weekAgo) return false;
    } else if (selectedPeriod === 'month') {
      const entryDate = new Date(e.date).getTime();
      const monthAgo = Date.now() - 30 * 86400000;
      if (entryDate < monthAgo) return false;
    }

    return true;
  });

  const totalMinutes = filteredEntries.reduce((acc, e) => acc + e.duration_minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const projectBreakdown: Record<string, { name: string; minutes: number; color?: string }> = {};
  for (const entry of filteredEntries) {
    const prjName = entry.task?.project_name || 'Sans projet';
    if (!projectBreakdown[prjName]) {
      projectBreakdown[prjName] = {
        name: prjName,
        minutes: 0,
        color: entry.task?.workspace_color || '#2563EB',
      };
    }
    projectBreakdown[prjName].minutes += entry.duration_minutes;
  }

  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      alert('Aucune entrée à exporter.');
      return;
    }

    const headers = [
      'Date',
      'Utilisateur',
      'Email',
      'Tache',
      'Projet',
      'Espace de travail',
      'Duree (Minutes)',
      'Duree (Heures)',
      'Notes'
    ];

    const rows = filteredEntries.map(e => [
      `"${e.date}"`,
      `"${e.user?.name || ''}"`,
      `"${e.user?.email || ''}"`,
      `"${(e.task?.title || '').replace(/"/g, '""')}"`,
      `"${(e.task?.project_name || '').replace(/"/g, '""')}"`,
      `"${(e.task?.workspace_name || '').replace(/"/g, '""')}"`,
      e.duration_minutes,
      (e.duration_minutes / 60).toFixed(2),
      `"${(e.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '﻿' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `AxeTask_Releve_Temps_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-150 font-mono">
      <ConfirmDialog {...confirmProps} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider mb-1">
            <Clock className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Suivi de Productivité & Facturation</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-tight">
            Mon Temps
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Allocation de temps par espace et projet, et historique détaillé des heures loguées.
          </p>
        </div>

        {mainTab === 'history' && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-sm shadow-blue-500/25 transition-all self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Exporter en CSV</span>
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#1E293B] pb-2">
        <button
          onClick={() => setMainTab('overview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            mainTab === 'overview' ? 'bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Vue d'ensemble</span>
        </button>
        <button
          onClick={() => setMainTab('history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            mainTab === 'history' ? 'bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historique</span>
        </button>
      </div>

      {/* ============ OVERVIEW TAB ============ */}
      {mainTab === 'overview' && (
        <div className="space-y-4">
          {isGlobalAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScope('me')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  scope === 'me' ? 'bg-[#2563EB] text-white' : 'bg-[#0F172A] border border-[#1E293B] text-slate-400 hover:text-slate-200'
                }`}
              >
                Mes données
              </button>
              <button
                onClick={() => setScope('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  scope === 'all' ? 'bg-[#2563EB] text-white' : 'bg-[#0F172A] border border-[#1E293B] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Tous les membres</span>
              </button>
            </div>
          )}

          {loadingAllocation ? (
            <div className="p-12 text-center text-xs text-slate-400">Chargement de l'allocation de temps...</div>
          ) : scope === 'all' && isGlobalAdmin ? (
            /* ---- ADMIN: everyone's allocation, flattened table ---- */
            <div className="bg-[#0F172A] border border-[#1E293B] rounded overflow-hidden">
              <div className="p-3 border-b border-[#1E293B] bg-[#0B1120] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  {allMemberRows.length} affectation{allMemberRows.length > 1 ? 's' : ''}
                </h3>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher un membre..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/50 w-56"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1E293B] bg-[#090D16] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3 pl-4">Membre</th>
                      <th className="p-3">Espace</th>
                      <th className="p-3">Projet</th>
                      <th className="p-3">Tâches</th>
                      <th className="p-3">Heures allouées</th>
                      <th className="p-3 pr-4">Heures loguées</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {allMemberRows.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">Aucune affectation trouvée.</td></tr>
                    ) : allMemberRows.map(({ member, ws, prj }) => (
                      <tr key={`${member.id}-${prj.id}`} className="hover:bg-[#1E293B]/40 transition-colors">
                        <td className="p-3 pl-4">
                          <div className="flex items-center gap-2">
                            <Avatar user={member} size="xs" />
                            <span className="font-semibold text-slate-200">{member.name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ws.color }} />
                            <span className="text-slate-300">{ws.name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-200">{prj.name}</td>
                        <td className="p-3 text-slate-400 font-mono">{prj.tasks_count}</td>
                        <td className="p-3 font-mono text-[#60A5FA] font-semibold">{formatMinutes(prj.allocated_minutes)}</td>
                        <td className="p-3 pr-4 font-mono text-emerald-400 font-semibold">{formatMinutes(prj.logged_minutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : drillProject && drillWorkspace ? (
            /* ---- DRILL-DOWN: tasks within one project ---- */
            <div className="space-y-3">
              <button
                onClick={() => setDrillProjectId(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#60A5FA]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{drillWorkspace.name}</span>
              </button>
              <h3 className="text-sm font-bold text-slate-100">{drillProject.name}</h3>
              <div className="bg-[#0F172A] border border-[#1E293B] rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#1E293B] bg-[#090D16] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3 pl-4">Tâche</th>
                        <th className="p-3">Statut</th>
                        <th className="p-3">Heures allouées</th>
                        <th className="p-3 pr-4">Heures loguées</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]">
                      {drillProject.tasks.map(t => (
                        <tr key={t.id} className="hover:bg-[#1E293B]/40 transition-colors cursor-pointer" onClick={() => setSelectedTaskId(t.id)}>
                          <td className="p-3 pl-4 font-semibold text-slate-100">{t.title}</td>
                          <td className="p-3 text-slate-400">{t.status}</td>
                          <td className="p-3 font-mono text-[#60A5FA] font-semibold">{formatMinutes(t.allocated_minutes)}</td>
                          <td className="p-3 pr-4 font-mono text-emerald-400 font-semibold">{formatMinutes(t.logged_minutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : drillWorkspace ? (
            /* ---- DRILL-DOWN: projects within one workspace ---- */
            <div className="space-y-3">
              <button
                onClick={() => setDrillWorkspaceId(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#60A5FA]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Tous les espaces</span>
              </button>
              <h3 className="text-sm font-bold text-slate-100">{drillWorkspace.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {drillWorkspace.projects.map(prj => (
                  <button
                    key={prj.id}
                    onClick={() => setDrillProjectId(prj.id)}
                    className="p-3.5 rounded bg-[#0F172A] border border-[#1E293B] hover:border-[#2563EB]/50 text-left transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                        {prj.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{prj.tasks_count} tâche{prj.tasks_count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1E293B]">
                      <span className="text-slate-400">Alloué: <span className="text-[#60A5FA] font-bold font-mono">{formatMinutes(prj.allocated_minutes)}</span></span>
                      <span className="text-slate-400">Logué: <span className="text-emerald-400 font-bold font-mono">{formatMinutes(prj.logged_minutes)}</span></span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ---- TOP LEVEL: my workspaces ---- */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {myAllocation.length === 0 && (
                <div className="col-span-full p-12 text-center text-xs text-slate-500">
                  Aucun projet ne vous est actuellement assigné.
                </div>
              )}
              {myAllocation.map(ws => {
                const projectsCount = ws.projects.length;
                const allocated = ws.projects.reduce((s, p) => s + p.allocated_minutes, 0);
                const logged = ws.projects.reduce((s, p) => s + p.logged_minutes, 0);
                return (
                  <button
                    key={ws.id}
                    onClick={() => setDrillWorkspaceId(ws.id)}
                    className="p-4 rounded bg-[#0F172A] border border-[#1E293B] hover:border-[#2563EB]/50 text-left transition-all space-y-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${ws.color}20`, border: `1px solid ${ws.color}40` }}
                      >
                        {ws.photo_url ? (
                          <img src={ws.photo_url} alt={ws.name} className="w-full h-full object-cover" />
                        ) : (
                          <Layers className="w-4 h-4" style={{ color: ws.color }} />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100">{ws.name}</h3>
                        <span className="text-[10px] text-slate-500">{projectsCount} projet{projectsCount > 1 ? 's' : ''} assigné{projectsCount > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#1E293B]">
                      <span className="text-slate-400">Alloué: <span className="text-[#60A5FA] font-bold font-mono">{formatMinutes(allocated)}</span></span>
                      <span className="text-slate-400">Logué: <span className="text-emerald-400 font-bold font-mono">{formatMinutes(logged)}</span></span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ HISTORY TAB (manual time-entries log) ============ */}
      {mainTab === 'history' && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded bg-[#0F172A] border border-[#1E293B] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Heures Loguées</span>
                <p className="text-2xl font-bold text-[#60A5FA] mt-1 font-mono">{totalHours} <span className="text-xs font-semibold text-slate-400">heures</span></p>
                <p className="text-[10px] text-slate-500 mt-0.5">({totalMinutes} minutes cumulées)</p>
              </div>
              <div className="w-10 h-10 rounded bg-[#2563EB]/10 border border-[#2563EB]/30 flex items-center justify-center text-[#60A5FA]">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded bg-[#0F172A] border border-[#1E293B] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sessions Enregistrées</span>
                <p className="text-2xl font-bold text-sky-400 mt-1 font-mono">{filteredEntries.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Sur la sélection active</p>
              </div>
              <div className="w-10 h-10 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded bg-[#0F172A] border border-[#1E293B] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format d'Export</span>
                <p className="text-base font-bold text-emerald-400 mt-1">CSV / Excel UTF-8</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Rapports & comptabilité</p>
              </div>
              <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Project Distribution Breakdown Bar */}
          {Object.keys(projectBreakdown).length > 0 && (
            <div className="p-4 rounded bg-[#0F172A] border border-[#1E293B] space-y-2.5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Répartition par projet
              </h3>
              <div className="w-full h-2.5 rounded bg-[#090D16] overflow-hidden flex border border-[#1E293B]">
                {Object.entries(projectBreakdown).map(([name, data]) => {
                  const pct = totalMinutes > 0 ? (data.minutes / totalMinutes) * 100 : 0;
                  return (
                    <div
                      key={name}
                      style={{ width: `${pct}%`, backgroundColor: data.color || '#2563EB' }}
                      className="h-full transition-all"
                      title={`${name}: ${(data.minutes / 60).toFixed(1)}h (${pct.toFixed(0)}%)`}
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3.5 pt-1 text-xs">
                {Object.entries(projectBreakdown).map(([name, data]) => {
                  const pct = totalMinutes > 0 ? (data.minutes / totalMinutes) * 100 : 0;
                  return (
                    <div key={name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color || '#2563EB' }} />
                      <span className="text-slate-300 font-semibold">{name}</span>
                      <span className="text-slate-500 font-mono">{(data.minutes / 60).toFixed(1)}h ({pct.toFixed(0)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Table Box */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded overflow-hidden">
            {/* Filter Bar */}
            <div className="p-3 border-b border-[#1E293B] bg-[#0B1120] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrer par mot-clé..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2563EB]/50"
                  />
                </div>

                {/* Workspace filter */}
                <select
                  value={selectedWorkspaceId}
                  onChange={e => setSelectedWorkspaceId(e.target.value)}
                  className="px-2.5 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-300 focus:outline-none focus:border-[#2563EB]/50 cursor-pointer"
                >
                  <option value="all">Tous les workspaces</option>
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>

                {/* Period filter */}
                <select
                  value={selectedPeriod}
                  onChange={e => setSelectedPeriod(e.target.value as any)}
                  className="px-2.5 py-1 rounded bg-[#090D16] border border-[#1E293B] text-xs text-slate-300 focus:outline-none focus:border-[#2563EB]/50 cursor-pointer"
                >
                  <option value="all">Toute la période</option>
                  <option value="week">7 derniers jours</option>
                  <option value="month">30 derniers jours</option>
                </select>
              </div>

              <span className="text-slate-400 font-medium text-[11px]">
                {filteredEntries.length} session{filteredEntries.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Entries Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#090D16] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3 pl-4">Date</th>
                    <th className="p-3">Membre</th>
                    <th className="p-3">Tâche</th>
                    <th className="p-3">Projet & Espace</th>
                    <th className="p-3">Durée</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Chargement des entrées de temps...
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-500">
                        Aucune entrée de temps trouvée avec les filtres sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-[#1E293B]/40 transition-colors">
                        <td className="p-3 pl-4 font-mono text-slate-300 font-medium">
                          {entry.date}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar user={entry.user} size="xs" />
                            <span className="font-semibold text-slate-200">
                              {entry.user?.name || 'Utilisateur'}
                            </span>
                          </div>
                        </td>

                        <td className="p-3">
                          <button
                            onClick={() => setSelectedTaskId(entry.task_id)}
                            className="font-bold text-slate-100 hover:text-[#60A5FA] transition-colors text-left flex items-center gap-1 group"
                          >
                            <span className="truncate max-w-[200px]">{entry.task?.title || 'Tâche'}</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-[#60A5FA]" />
                          </button>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: entry.task?.workspace_color || '#2563EB' }}
                            />
                            <span className="text-slate-300 font-medium">{entry.task?.project_name}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-500">{entry.task?.workspace_name}</span>
                          </div>
                        </td>

                        <td className="p-3 font-mono font-bold text-[#60A5FA]">
                          {Math.floor(entry.duration_minutes / 60) > 0 ? `${Math.floor(entry.duration_minutes / 60)}h ` : ''}
                          {entry.duration_minutes % 60}m
                        </td>

                        <td className="p-3 text-slate-400 max-w-[250px] truncate">
                          {entry.note || <span className="text-slate-600 italic">—</span>}
                        </td>

                        <td className="p-3 pr-4 text-right">
                          {entry.user_id === user?.id && (
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              title="Supprimer l'entrée"
                              className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
