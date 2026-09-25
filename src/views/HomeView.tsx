import React, { useState } from 'react';
import {
  Sparkles,
  CloudUpload,
  LayoutDashboard,
  MessageSquare,
  Brush,
  TrendingUp,
  Code2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Building,
  DollarSign,
  HeartHandshake,
  Plus,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { TabType } from '../components/Sidebar';
import { Employee, Project } from '../types';

interface HomeViewProps {
  onNavigate: (tab: TabType) => void;
  datasetName: string;
  employees: Employee[];
  qualityScore: number;
  projects: Project[];
  activeProjectId: string;
  onSwitchProject: (id: string) => void;
  onCreateProject: (name: string, description: string, template: string) => void;
  onDeleteProject: (id: string) => void;
  salaryMasked: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  datasetName,
  employees,
  qualityScore,
  projects,
  activeProjectId,
  onSwitchProject,
  onCreateProject,
  onDeleteProject,
  salaryMasked,
}) => {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectTemplate, setNewProjectTemplate] = useState('current');

  const activeEmployees = employees.filter((e) => e.status === 'Active');
  const terminatedEmployees = employees.filter((e) => e.status === 'Terminated');
  const turnoverRate = ((terminatedEmployees.length / (employees.length || 1)) * 100).toFixed(1);
  const avgEngagement = Math.round(
    employees.reduce((acc, curr) => acc + curr.engagementScore, 0) / (employees.length || 1)
  );
  const avgSalary = Math.round(
    employees.reduce((acc, curr) => acc + curr.salary, 0) / (employees.length || 1)
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim(), newProjectDesc.trim(), newProjectTemplate);
    setIsCreatingProject(false);
    setNewProjectName('');
    setNewProjectDesc('');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/25 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center space-x-1.5 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>People Analytics Intelligence Platform</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3 leading-tight">
            Turn messy HR spreadsheets into executive decisions in seconds.
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 max-w-2xl">
            Clean raw workforce records, run automated star schema models, generate Power BI-compatible DAX, and query your employee dataset using natural language AI.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('data')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              <span>Analyse HR Data</span>
            </button>
            <button
              onClick={() => onNavigate('dashboards')}
              className="bg-slate-800/90 hover:bg-slate-700 text-white font-medium text-xs px-5 py-3 rounded-xl transition-all border border-slate-700/80 flex items-center space-x-2 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Create Dashboard</span>
            </button>
            <button
              onClick={() => onNavigate('ask')}
              className="bg-slate-800/90 hover:bg-slate-700 text-white font-medium text-xs px-5 py-3 rounded-xl transition-all border border-slate-700/80 flex items-center space-x-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Ask My HR Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Active Headcount</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{activeEmployees.length}</div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-2 flex items-center gap-1">
            <span>Active workforce pool</span>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Annual Turnover</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{turnoverRate}%</div>
          <div className="text-[11px] text-amber-400 font-semibold mt-2">
            <span>{terminatedEmployees.length} departures recorded</span>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Engagement Score</span>
            <HeartHandshake className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{avgEngagement}%</div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-2">
            <span>Favorable sentiment index</span>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Average Base Salary</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {salaryMasked ? '••••••' : `$${avgSalary.toLocaleString()}`}
          </div>
          <div className="text-[11px] text-slate-400 font-semibold mt-2">
            <span>Departmental benchmark mean</span>
          </div>
        </div>
      </div>

      {/* Quick Action Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => onNavigate('clean')}
          className="bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 transition-all cursor-pointer group hover:border-emerald-500/40"
        >
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform border border-emerald-500/20">
            <Brush className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base mb-1">Clean My Data</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Auto-detect duplicates, blank termination dates, missing taxonomy, and formatting issues instantly.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 space-x-1.5">
            <span>Quality Score: {qualityScore}%</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('analytics')}
          className="bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 transition-all cursor-pointer group hover:border-indigo-500/40"
        >
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform border border-indigo-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base mb-1">People Analytics</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Explore turnover drivers, headcount distribution, gender parity, and payroll cohorts.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-indigo-400 space-x-1.5">
            <span>5 Modules Ready</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('labs')}
          className="bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 transition-all cursor-pointer group hover:border-purple-500/40"
        >
          <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform border border-purple-500/20">
            <Code2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base mb-1">SQL / Python / DAX</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Run real analytical queries on your workforce records or generate Power BI DAX formulas using natural language.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-purple-400 space-x-1.5">
            <span>Developer Labs Ready</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Real Projects & Workspaces Manager */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-base">Active Workspaces & Projects</h3>
            <p className="text-xs text-slate-400">
              Create and switch between distinct enterprise workforce datasets
            </p>
          </div>
          <button
            onClick={() => setIsCreatingProject(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700/60 text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-4">Source Dataset</th>
                <th className="py-3 px-4">Headcount</th>
                <th className="py-3 px-4">Quality</th>
                <th className="py-3 px-4">Workspace Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-800/60 text-slate-300">
              {projects.map((proj) => {
                const isActive = proj.id === activeProjectId;
                return (
                  <tr
                    key={proj.id}
                    className={`transition-colors ${
                      isActive ? 'bg-indigo-950/20 hover:bg-indigo-950/30' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-emerald-400 ring-2 ring-emerald-500/30 animate-pulse' : 'bg-slate-600'
                          }`}
                        />
                        <span>{proj.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-normal pl-4">{proj.description}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-xs font-mono">{proj.datasetName}</td>
                    <td className="py-3.5 px-4 font-mono">{proj.employees.length}</td>
                    <td className="py-3.5 px-4">
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-medium">
                        {proj.qualityScore}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {isActive ? (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          Active Workspace
                        </span>
                      ) : (
                        <span className="text-slate-400">Available</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {isActive ? (
                          <button
                            onClick={() => onNavigate('analytics')}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
                          >
                            Explore
                          </button>
                        ) : (
                          <button
                            onClick={() => onSwitchProject(proj.id)}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20 cursor-pointer"
                          >
                            Switch To
                          </button>
                        )}
                        {!proj.isDefault && (
                          <button
                            onClick={() => onDeleteProject(proj.id)}
                            title="Delete Project"
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Project Modal */}
      {isCreatingProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create New Workspace</h3>
                <p className="text-xs text-slate-400">Isolate data, models, and analytics for another team</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Project / Workspace Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Executive Retention Taskforce"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Brief context on this workforce segment"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Initial Data Source
                </label>
                <select
                  value={newProjectTemplate}
                  onChange={(e) => setNewProjectTemplate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="current">Clone Active Dataset (Current Records)</option>
                  <option value="tech">Tech Startup Cohort (220 AI/Engineering records)</option>
                  <option value="blank">Blank Workspace (Ready for Fresh Ingestion)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Create & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
