import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { AuthView } from './components/auth/AuthView';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalDashboard } from './components/dashboard/GlobalDashboard';
import { WorkspacesList } from './components/workspaces/WorkspacesList';
import { WorkspaceView } from './components/workspaces/WorkspaceView';
import { ProjectView } from './components/projects/ProjectView';
import { TimeTrackingView } from './components/time/TimeTrackingView';
import { SettingsView } from './components/settings/SettingsView';
import { TaskDetailDrawer } from './components/tasks/TaskDetailDrawer';
import { CreateTaskModal } from './components/modals/CreateTaskModal';
import { CreateProjectModal } from './components/modals/CreateProjectModal';
import { CreateWorkspaceModal } from './components/modals/CreateWorkspaceModal';

type NavigationTab = 
  | 'dashboard' 
  | 'workspaces' 
  | 'workspace_detail' 
  | 'project_detail' 
  | 'time_tracking' 
  | 'settings';

function MainAppLayout() {
  const { user, loading } = useAuth();
  const { currentWorkspace, currentProject, setCurrentProjectId } = useWorkspace();
  const [currentView, setCurrentView] = useState<NavigationTab>('dashboard');

  // Auto route if project is selected
  useEffect(() => {
    if (currentProject && currentView === 'workspaces') {
      setCurrentView('project_detail');
    }
  }, [currentProject?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090D16] flex flex-col items-center justify-center text-slate-400 font-mono">
        <div className="w-8 h-8 border-2 border-[#2563EB]/20 border-t-[#2563EB] rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-300">Initialisation de Axe Task...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col selection:bg-[#2563EB]/30 selection:text-[#93C5FD] font-mono">
      {/* Top Fixed Navbar */}
      <Navbar
        onOpenSettings={() => setCurrentView('settings')}
        onOpenTimeTracking={() => setCurrentView('time_tracking')}
        onOpenDashboard={() => setCurrentView('dashboard')}
        onOpenWorkspaces={() => setCurrentView('workspaces')}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#090D16] relative">
          {currentView === 'dashboard' && <GlobalDashboard />}

          {currentView === 'workspaces' && (
            <WorkspacesList
              onSelectWorkspace={(wsId) => {
                setCurrentView('workspace_detail');
              }}
            />
          )}

          {currentView === 'workspace_detail' && (
            <WorkspaceView
              onSelectProject={(prjId) => {
                setCurrentProjectId(prjId);
                setCurrentView('project_detail');
              }}
              onOpenSettings={() => setCurrentView('settings')}
              onBackToWorkspaces={() => setCurrentView('workspaces')}
            />
          )}

          {currentView === 'project_detail' && (
            <ProjectView
              onBackToWorkspace={() => setCurrentView('workspace_detail')}
            />
          )}

          {currentView === 'time_tracking' && <TimeTrackingView />}

          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Modals & Overlays */}
      <TaskDetailDrawer />
      <CreateTaskModal />
      <CreateProjectModal />
      <CreateWorkspaceModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <MainAppLayout />
      </WorkspaceProvider>
    </AuthProvider>
  );
}
