import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { AppNotification } from '../../types';
import {
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  X,
  UserPlus,
  CalendarClock,
  AlarmClockOff,
  Briefcase,
  RefreshCw,
  MessageSquare,
  UserMinus,
  ShieldCheck,
} from 'lucide-react';

const TYPE_META: Record<AppNotification['type'], { icon: React.ReactNode; color: string }> = {
  task_assigned: { icon: <UserPlus className="w-3.5 h-3.5" />, color: 'text-[#60A5FA]' },
  task_status_changed: { icon: <RefreshCw className="w-3.5 h-3.5" />, color: 'text-indigo-400' },
  task_comment: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: 'text-[#EC4899]' },
  task_due_today: { icon: <CalendarClock className="w-3.5 h-3.5" />, color: 'text-amber-400' },
  task_overdue: { icon: <AlarmClockOff className="w-3.5 h-3.5" />, color: 'text-rose-400' },
  workspace_added: { icon: <Briefcase className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
  workspace_removed: { icon: <UserMinus className="w-3.5 h-3.5" />, color: 'text-rose-400' },
  workspace_role_changed: { icon: <ShieldCheck className="w-3.5 h-3.5" />, color: 'text-[#60A5FA]' },
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'à l\'instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days} j`;
}

interface NotificationsBellProps {
  onOpenWorkspaces: () => void;
}

export const NotificationsBell: React.FC<NotificationsBellProps> = ({ onOpenWorkspaces }) => {
  const { setSelectedTaskId, setCurrentWorkspaceId, workspaces } = useWorkspace();
  const { notify } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(0);

  const pollUnreadCount = useCallback(async () => {
    try {
      const { count } = await api.getUnreadNotificationCount();
      if (count > prevUnreadRef.current && prevUnreadRef.current !== 0) {
        notify({
          type: 'info',
          title: 'Nouvelle notification',
          message: count - prevUnreadRef.current > 1
            ? `${count - prevUnreadRef.current} nouvelles notifications`
            : 'Vous avez une nouvelle notification.',
        });
      }
      prevUnreadRef.current = count;
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to poll notification count:', err);
    }
  }, [notify]);

  useEffect(() => {
    pollUnreadCount();
    const interval = setInterval(pollUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [pollUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const list = await api.getNotifications();
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) loadNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelect = async (n: AppNotification) => {
    if (!n.is_read) {
      try {
        await api.markNotificationRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
        setUnreadCount(prev => Math.max(0, prev - 1));
        prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
      } catch (err) {
        console.error(err);
      }
    }

    setIsOpen(false);

    if (n.task_id) {
      setSelectedTaskId(n.task_id);
    } else if (n.workspace_id) {
      const stillMember = workspaces.some(w => w.id === n.workspace_id);
      if (stillMember) setCurrentWorkspaceId(n.workspace_id);
      onOpenWorkspaces();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="relative p-1.5 rounded text-slate-300 hover:text-white hover:bg-[#1E293B] transition-colors"
        title="Notifications"
      >
        {unreadCount > 0 ? <BellRing className="w-4 h-4 text-[#60A5FA]" /> : <Bell className="w-4 h-4" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center font-mono">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed left-4 right-4 top-16 sm:absolute sm:right-0 sm:left-auto sm:top-[calc(100%+0.375rem)] sm:mt-0 w-auto sm:w-96 rounded-lg bg-[#0F172A] border border-[#1E293B] shadow-2xl shadow-black/80 z-50 animate-in fade-in slide-in-from-top-1 duration-100 font-mono overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-[#1E293B] flex items-center justify-between bg-[#0B1120]">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </span>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={handleMarkAllRead}
                    title="Tout marquer comme lu"
                    className="flex items-center gap-1 text-[10px] text-[#60A5FA] hover:text-[#93C5FD] font-semibold"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tout lire</span>
                  </button>
                  <button
                    onClick={handleClearAll}
                    title="Tout effacer"
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#1E293B]">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications.map(n => {
                const meta = TYPE_META[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => handleSelect(n)}
                    className={`w-full text-left p-3 flex items-start gap-2.5 hover:bg-[#1E293B]/60 transition-colors group ${
                      !n.is_read ? 'bg-[#2563EB]/5' : ''
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${meta.color}`}>{meta.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0" />}
                        <p className={`text-xs truncate ${!n.is_read ? 'font-bold text-slate-100' : 'font-medium text-slate-300'}`}>
                          {n.title}
                        </p>
                      </div>
                      {n.message && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-1">{formatRelativeTime(n.created_at)}</p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      className="p-1 rounded text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Supprimer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
