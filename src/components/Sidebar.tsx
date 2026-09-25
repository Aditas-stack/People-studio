import React from 'react';
import {
  Home,
  Database,
  Brush,
  Network,
  TrendingUp,
  LayoutDashboard,
  Sparkles,
  Code2,
  Download,
  Settings,
  LogOut,
  Users,
} from 'lucide-react';
import { UserProfile } from '../types';

export type TabType =
  | 'home'
  | 'data'
  | 'clean'
  | 'model'
  | 'analytics'
  | 'dashboards'
  | 'ask'
  | 'labs'
  | 'export'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  currentUser: UserProfile;
  onOpenProfile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onOpenProfile,
}) => {
  const navItems: Array<{ id: TabType; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'data', label: 'Data Import', icon: <Database className="w-4 h-4" /> },
    { id: 'clean', label: 'Data Cleaning', icon: <Brush className="w-4 h-4" /> },
    { id: 'model', label: 'Data Model / DWH', icon: <Network className="w-4 h-4" /> },
    { id: 'analytics', label: 'People Analytics', icon: <TrendingUp className="w-4 h-4" />, badge: '5 Modules' },
    { id: 'dashboards', label: 'Dashboards & AI', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'ask', label: 'Ask HR Data (AI)', icon: <Sparkles className="w-4 h-4 text-indigo-400" />, badge: 'AI' },
    { id: 'labs', label: 'SQL, Python & DAX', icon: <Code2 className="w-4 h-4" /> },
    { id: 'export', label: 'Export Centre', icon: <Download className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings & Audit', icon: <Settings className="w-4 h-4" /> },
  ];

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none h-full">
      <div>
        {/* Brand Header */}
        <div className="p-4 flex items-center space-x-3 border-b border-slate-800/80">
          <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight block leading-tight text-sm">People Studio</span>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase block">
              Analytics Platform v3.4
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-white border border-indigo-500/30 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={isActive ? 'text-indigo-400' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      item.badge === 'AI'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
        <button
          onClick={onOpenProfile}
          className="flex items-center space-x-2.5 overflow-hidden text-left hover:opacity-85 transition-opacity"
          title="Edit Profile"
        >
          <div className="w-8 h-8 bg-indigo-600/30 text-indigo-300 font-bold text-xs rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/30">
            {initials}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
            <div className="text-[10px] text-indigo-400 truncate">{currentUser.role}</div>
          </div>
        </button>

        <button
          onClick={onOpenProfile}
          title="Switch User / Organization"
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
