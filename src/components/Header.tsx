import React from 'react';
import { ChevronRight, Zap, Database, Layers } from 'lucide-react';
import { TabType } from './Sidebar';

interface HeaderProps {
  activeTab: TabType;
  datasetName: string;
  rowCount: number;
  onRunAnalysis: () => void;
  onSelectDataset?: (name: string) => void;
}

const TAB_METADATA: Record<TabType, { category: string; title: string }> = {
  home: { category: 'Workspace', title: 'Studio Overview & Quick Start' },
  data: { category: 'Data Ingestion', title: 'Data Import Centre & Profiler' },
  clean: { category: 'Data Engineering', title: 'Power Query Transformation Pipeline' },
  model: { category: 'Data Modeling', title: 'Power Pivot Star Schema & Relationships' },
  analytics: { category: 'Analytics Engine', title: 'Workforce, Attrition, Comp & Metrics' },
  dashboards: { category: 'Executive Dashboards', title: 'Interactive Performance Dashboard & AI' },
  ask: { category: 'AI Intelligence', title: 'Ask Your HR Data (Natural Language Assistant)' },
  labs: { category: 'Developer Labs', title: 'SQL Lab, Python Notebook & DAX Generator' },
  export: { category: 'Distribution', title: 'Download Centre & Power BI Assets' },
  settings: { category: 'Administration', title: 'Audit Trail, Role Permissions & Security' },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  datasetName,
  rowCount,
  onRunAnalysis,
}) => {
  const meta = TAB_METADATA[activeTab] || { category: 'Workspace', title: 'Analytics Studio' };

  return (
    <header className="h-16 bg-slate-950/70 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 backdrop-blur-md">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2.5 text-xs">
        <span className="font-semibold text-slate-400 uppercase tracking-wider">{meta.category}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <h2 className="font-bold text-white text-sm">{meta.title}</h2>
      </div>

      {/* Action Controls & Active Dataset Pill */}
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Database className="w-3 h-3 text-slate-400 ml-0.5" />
          <span className="text-slate-300 font-medium">
            Dataset: <strong className="text-white">{datasetName}</strong> ({rowCount} rows)
          </span>
        </div>

        <button
          onClick={onRunAnalysis}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/25 flex items-center space-x-1.5 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Run Full Analysis</span>
        </button>
      </div>
    </header>
  );
};
