import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Workspace, Project, Task } from '../types';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface ActiveTimer {
  taskId: string;
  taskTitle: string;
  projectName?: string;
  workspaceName?: string;
  startTime: number; // timestamp
  elapsedSeconds: number;
  isRunning: boolean;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentProject: Project | null;
  loading: boolean;
  selectedTaskId: string | null;
  isCreateTaskModalOpen: boolean;
  isCreateProjectModalOpen: boolean;
  isCreateWorkspaceModalOpen: boolean;
  activeTimer: ActiveTimer | null;
  setCurrentWorkspaceId: (id: string | null) => void;
  setCurrentProjectId: (id: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  setIsCreateTaskModalOpen: (open: boolean) => void;
  setIsCreateProjectModalOpen: (open: boolean) => void;
  setIsCreateWorkspaceModalOpen: (open: boolean) => void;
  refreshWorkspaces: () => Promise<void>;
  startTimer: (task: Task) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopAndLogTimer: (note?: string) => Promise<void>;
  discardTimer: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);

  // Active Live Timer
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(() => {
    const saved = localStorage.getItem('axetask_active_timer');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Timer tick interval
  useEffect(() => {
    let interval: any = null;
    if (activeTimer && activeTimer.isRunning) {
      interval = setInterval(() => {
        setActiveTimer(prev => {
          if (!prev || !prev.isRunning) return prev;
          const updated = {
            ...prev,
            elapsedSeconds: prev.elapsedSeconds + 1,
          };
          localStorage.setItem('axetask_active_timer', JSON.stringify(updated));
          return updated;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer?.isRunning]);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const wsList = await api.getWorkspaces();
      setWorkspaces(wsList);

      // Keep current workspace if still accessible, otherwise default to first
      setCurrentWorkspace(prev => {
        if (prev) {
          const found = wsList.find(w => w.id === prev.id);
          if (found) return found;
        }
        return wsList.length > 0 ? wsList[0] : null;
      });
    } catch (err) {
      console.error('Error loading workspaces:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const setCurrentWorkspaceId = (id: string | null) => {
    if (!id) {
      setCurrentWorkspace(null);
      setCurrentProject(null);
      return;
    }
    const found = workspaces.find(w => w.id === id);
    if (found) {
      setCurrentWorkspace(found);
      setCurrentProject(null);
    }
  };

  const setCurrentProjectId = async (id: string | null) => {
    if (!id) {
      setCurrentProject(null);
      return;
    }
    try {
      const prj = await api.getProject(id);
      setCurrentProject(prj);
      if (prj.workspace) {
        setCurrentWorkspace(prj.workspace);
      }
    } catch (err) {
      console.error('Error setting project:', err);
    }
  };

  // Timer Controls
  const startTimer = (task: Task) => {
    const newTimer: ActiveTimer = {
      taskId: task.id,
      taskTitle: task.title,
      projectName: task.project?.name,
      workspaceName: task.workspace?.name,
      startTime: Date.now(),
      elapsedSeconds: 0,
      isRunning: true,
    };
    setActiveTimer(newTimer);
    localStorage.setItem('axetask_active_timer', JSON.stringify(newTimer));
  };

  const pauseTimer = () => {
    setActiveTimer(prev => {
      if (!prev) return null;
      const updated = { ...prev, isRunning: false };
      localStorage.setItem('axetask_active_timer', JSON.stringify(updated));
      return updated;
    });
  };

  const resumeTimer = () => {
    setActiveTimer(prev => {
      if (!prev) return null;
      const updated = { ...prev, isRunning: true };
      localStorage.setItem('axetask_active_timer', JSON.stringify(updated));
      return updated;
    });
  };

  const stopAndLogTimer = async (note?: string) => {
    if (!activeTimer) return;
    const durationMinutes = Math.max(1, Math.round(activeTimer.elapsedSeconds / 60));
    try {
      await api.logTime(activeTimer.taskId, durationMinutes, note || 'Session chronométrée', new Date().toISOString().split('T')[0]);
      setActiveTimer(null);
      localStorage.removeItem('axetask_active_timer');
    } catch (err) {
      console.error('Failed to log timer:', err);
      throw err;
    }
  };

  const discardTimer = () => {
    setActiveTimer(null);
    localStorage.removeItem('axetask_active_timer');
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        currentProject,
        loading,
        selectedTaskId,
        isCreateTaskModalOpen,
        isCreateProjectModalOpen,
        isCreateWorkspaceModalOpen,
        activeTimer,
        setCurrentWorkspaceId,
        setCurrentProjectId,
        setSelectedTaskId,
        setIsCreateTaskModalOpen,
        setIsCreateProjectModalOpen,
        setIsCreateWorkspaceModalOpen,
        refreshWorkspaces,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopAndLogTimer,
        discardTimer,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
