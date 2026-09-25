import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Lock,
  EyeOff,
  Eye,
  Activity,
  UserCheck,
  Filter,
} from 'lucide-react';
import { UserProfile, AuditLogEntry } from '../types';

interface SettingsViewProps {
  currentUser: UserProfile;
  salaryMasked: boolean;
  setSalaryMasked: (masked: boolean) => void;
  auditLogs: AuditLogEntry[];
  onOpenProfile: () => void;
  onShowModal: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  salaryMasked,
  setSalaryMasked,
  auditLogs,
  onOpenProfile,
  onShowModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredLogs = auditLogs.filter(
    (log) => selectedCategory === 'All' || log.category === selectedCategory
  );

  const toggleSalaryMasking = () => {
    const nextState = !salaryMasked;
    setSalaryMasked(nextState);
    onShowModal(
      nextState ? 'Salary Masking Enabled' : 'Salary Masking Disabled',
      nextState
        ? 'Payroll compensation figures are now shielded with •••••• across all tables and charts.'
        : 'Full compensation access restored for authorized HR administrator profile.',
      'info'
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="border-b border-slate-700/60 pb-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Security & Governance</span>
            </span>
            <h2 className="text-xl font-bold text-white">Audit Trail & Role-Based Access Control</h2>
          </div>

          <button
            onClick={onOpenProfile}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Switch Profile</span>
          </button>
        </div>

        {/* Top 2 Cards: Profile & Privacy Masking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Profile */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>Active Profile Permissions</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">User Name:</span>
                <strong className="text-white">{currentUser.name}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Organization:</span>
                <strong className="text-white">{currentUser.company}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Access Role:</span>
                <span className="bg-indigo-500/20 text-indigo-300 font-bold px-2.5 py-0.5 rounded-full text-[11px] border border-indigo-500/30">
                  {currentUser.role}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Database Engine:</span>
                <strong className="text-emerald-400 font-mono">Polars / DuckDB Local Runtime</strong>
              </div>
            </div>
          </div>

          {/* Privacy & Masking Toggle */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Confidential Data Masking</span>
              </h3>
              <button
                onClick={toggleSalaryMasking}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  salaryMasked ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    salaryMasked ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              When enabled, all base salary and compensation bonus fields are obfuscated with{' '}
              <code className="text-indigo-300 font-mono">••••••</code> in all tables, exports, and analytics drilldowns to comply with GDPR & enterprise wage privacy.
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300">Salary Masking Status:</span>
              <span
                className={`font-bold flex items-center gap-1.5 ${
                  salaryMasked ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {salaryMasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{salaryMasked ? 'Masked (Protected)' : 'Visible (Full Access)'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Audit Trail Log */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">Real-time System Audit Trail</h3>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Categories</option>
                <option value="Ingestion">Ingestion</option>
                <option value="Pipeline">Pipeline</option>
                <option value="Modeling">Modeling</option>
                <option value="Security">Security</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 font-mono"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-indigo-400 font-bold font-sans">{log.action}</span>
                    <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.2 rounded font-sans">
                      {log.category}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] font-sans">{log.details}</p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-slate-300 text-[11px]">{log.timestamp}</div>
                  <div className="text-[10px] text-slate-500">{log.user}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
