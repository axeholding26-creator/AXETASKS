import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../lib/api';
import { Project } from '../../types';
import {
  LayoutDashboard,
  Layers,
  Clock,
  Settings,
  Plus,
  FolderGit2,
  ChevronRight,
  Briefcase,
  ChevronDown,
  Users,
  Sparkles,
  Kanban,
  MessageSquare
} from 'lucide-react';

type SidebarView = 'dashboard' | 'workspaces' | 'workspace_detail' | 'project_detail' | 'time_tracking' | 'messages' | 'settings';

interface SidebarProps {
  currentView: SidebarView;
  onNavigate: (view: SidebarView) => void;
  isOpen: boolean;
  onClose: () => void;
}

const UNREAD_POLL_INTERVAL_MS = 15000;

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, onClose }) => {
  const { 
    workspaces, 
    currentWorkspace, 
    currentProject, 
    setCurrentProjectId,
    setCurrentWorkspaceId,
    setIsCreateProjectModalOpen,
    setIsCreateWorkspaceModalOpen,
    setIsCreateTaskModalOpen
  } = useWorkspace();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const loadUnread = () => {
      api.getConversations()
        .then(convs => setUnreadMessages(convs.reduce((sum, c) => sum + c.unread_count, 0)))
        .catch(() => {});
    };
    loadUnread();
    const interval = setInterval(loadUnread, UNREAD_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentWorkspace) {
      setLoadingProjects(true);
      api.getWorkspaceProjects(currentWorkspace.id)
        .then(setProjects)
        .catch(console.error)
        .finally(() => setLoadingProjects(false));
    } else {
      setProjects([]);
    }
  }, [currentWorkspace?.id]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/*
        Sidebar:
        - Mobile: fixed, starts at top-14 (below navbar h-14), height = 100vh - 3.5rem
        - Desktop: sticky, top-14, height = 100vh - 3.5rem
        This ensures the footer button is ALWAYS visible without scrolling.
      */}
      <aside
        className={`
          fixed left-0 z-50
          top-0 h-[100dvh]
          md:top-14 md:h-[calc(100dvh-3.5rem)]
          w-60
          border-r border-[#1E293B] bg-[#0B1120]
          flex flex-col shrink-0 overflow-hidden
          select-none font-mono
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Top Core Navigation Links — fixed height */}
        <div className="p-2 space-y-0.5 shrink-0">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-all ${
              currentView === 'dashboard'
                ? 'bg-[#2563EB]/15 text-[#60A5FA] font-bold border border-[#2563EB]/40 shadow-sm'
                : 'text-slate-300 hover:bg-[#1E293B] hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Mes Tâches</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('workspaces')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-all ${
              currentView === 'workspaces'
                ? 'bg-[#2563EB]/15 text-[#60A5FA] font-bold border border-[#2563EB]/40 shadow-sm'
                : 'text-slate-300 hover:bg-[#1E293B] hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#60A5FA]" />
              <span>Tous les Espaces</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#0F172A] text-slate-400 border border-[#1E293B]">
              {workspaces.length}
            </span>
          </button>

          <button
            onClick={() => onNavigate('time_tracking')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-all ${
              currentView === 'time_tracking'
                ? 'bg-[#2563EB]/15 text-[#60A5FA] font-bold border border-[#2563EB]/40 shadow-sm'
                : 'text-slate-300 hover:bg-[#1E293B] hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mon Temps</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('messages')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-all ${
              currentView === 'messages'
                ? 'bg-[#2563EB]/15 text-[#60A5FA] font-bold border border-[#2563EB]/40 shadow-sm'
                : 'text-slate-300 hover:bg-[#1E293B] hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-[#EC4899]" />
              <span>Messages</span>
            </div>
            {unreadMessages > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#2563EB] text-white min-w-[16px] text-center">
                {unreadMessages}
              </span>
            )}
          </button>
        </div>

        <div className="h-px bg-[#1E293B] mx-2 shrink-0" />

        {/* Scrollable middle section: workspace projects */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2 py-1 space-y-2">
          {currentWorkspace ? (
            <div>
              <div className="flex items-center justify-between px-1.5 mb-1">
                <button
                  onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${isProjectsExpanded ? '' : '-rotate-90'}`} />
                  <span className="truncate max-w-[120px]">{currentWorkspace.name}</span>
                </button>

                {currentWorkspace.my_role === 'admin' && (
                  <button
                    onClick={() => setIsCreateProjectModalOpen(true)}
                    title="Nouveau projet"
                    className="p-1 rounded text-slate-400 hover:text-[#3B82F6] hover:bg-[#2563EB]/10 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>

              {isProjectsExpanded && (
                <div className="space-y-0.5 pl-1">
                  <button
                    onClick={() => onNavigate('workspace_detail')}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                      currentView === 'workspace_detail'
                        ? 'bg-[#1E293B] text-[#60A5FA] font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>Vue d'ensemble</span>
                    </div>
                  </button>

                  {projects.map(prj => {
                    const isSelected = currentView === 'project_detail' && currentProject?.id === prj.id;
                    return (
                      <button
                        key={prj.id}
                        onClick={() => {
                          setCurrentProjectId(prj.id);
                          onNavigate('project_detail');
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors group ${
                          isSelected
                            ? 'bg-[#2563EB]/20 text-[#93C5FD] font-bold border-l-2 border-[#2563EB] pl-1.5'
                            : 'text-slate-300 hover:bg-[#1E293B] hover:text-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Kanban className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#3B82F6]' : 'text-slate-400 group-hover:text-slate-300'}`} />
                          <span className="truncate">{prj.name}</span>
                        </div>
                        {prj.active_tasks_count !== undefined && prj.active_tasks_count > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#0F172A] text-slate-400 border border-[#1E293B]">
                            {prj.active_tasks_count}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {projects.length === 0 && !loadingProjects && (
                    <div className="px-2 py-3 text-[10px] text-slate-500 italic text-center">
                      Aucun projet.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="px-3 py-6 text-center text-xs text-slate-500">
              Aucun espace sélectionné.
            </div>
          )}
        </div>

        {/* Bottom Footer — shrink-0 so it's always pinned at the bottom, never hidden */}
        <div className="shrink-0 p-2 border-t border-[#1E293B] bg-[#090D16]">
          <button
            onClick={() => onNavigate('settings')}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-xs font-mono transition-all ${
              currentView === 'settings'
                ? 'bg-[#2563EB]/15 text-[#60A5FA] font-bold border border-[#2563EB]/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Paramètres &amp; Équipe</span>
          </button>
        </div>
      </aside>
    </>
  );
};
