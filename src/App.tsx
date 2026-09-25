import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { NotificationModal } from './components/NotificationModal';
import { HomeView } from './views/HomeView';
import { DataImportView } from './views/DataImportView';
import { DataCleaningView } from './views/DataCleaningView';
import { DataModelView } from './views/DataModelView';
import { AnalyticsView } from './views/AnalyticsView';
import { DashboardView } from './views/DashboardView';
import { AskDataView } from './views/AskDataView';
import { LabsView } from './views/LabsView';
import { ExportView } from './views/ExportView';
import { SettingsView } from './views/SettingsView';
import {
  generateInitialDataset,
  generateTechStartupDataset,
  initialProjects,
  initialTransformationSteps,
  initialQualityIssues,
  initialAuditLogs,
} from './data/mockData';
import {
  UserProfile,
  Employee,
  TransformationStep,
  QualityIssue,
  AuditLogEntry,
  Project,
  DatasetSnapshot,
} from './types';
import { calculateQualityAudit } from './utils/dataParser';

export default function App() {
  // Current user state
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('pas_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      name: 'Sarah Jenkins',
      company: 'Global Horizons HR Corp',
      role: 'HR Admin',
    };
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>('home');

  // Persistent projects list
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('pas_projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return initialProjects;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return projects[0]?.id || 'proj-1';
  });

  // Active Project Data
  const currentProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const [datasetName, setDatasetName] = useState<string>(currentProject.datasetName);
  const [employees, setEmployees] = useState<Employee[]>(currentProject.employees);
  const [qualityScore, setQualityScore] = useState<number>(currentProject.qualityScore);

  // Quality Profiler state
  const [qualityIssues, setQualityIssues] = useState<QualityIssue[]>(initialQualityIssues);

  // Transformation steps
  const [transformationSteps, setTransformationSteps] = useState<TransformationStep[]>(
    initialTransformationSteps
  );

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs);

  // Privacy: Salary Masking
  const [salaryMasked, setSalaryMasked] = useState<boolean>(false);

  // Notification Modal
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'danger';
    confirmText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  // Dataset Snapshots for point-in-time recovery & version control
  const [snapshots, setSnapshots] = useState<DatasetSnapshot[]>(() => {
    const saved = localStorage.getItem('pas_dataset_snapshots');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      {
        id: 'snap-baseline',
        name: 'Initial Ingestion Baseline (v1.0)',
        description: 'Golden baseline captured upon initial Active_Workforce_2026.xlsx upload',
        timestamp: '2026-09-25 08:30:00',
        recordCount: currentProject.employees.length,
        qualityScore: currentProject.qualityScore,
        datasetName: currentProject.datasetName,
        employees: currentProject.employees,
        createdBy: `${currentUser.name} (${currentUser.role})`,
        tags: ['Baseline', 'Golden Master'],
        isAutoSnapshot: true,
      },
    ];
  });

  // Save snapshots to localStorage
  useEffect(() => {
    localStorage.setItem('pas_dataset_snapshots', JSON.stringify(snapshots));
  }, [snapshots]);

  // Save projects to localStorage
  useEffect(() => {
    localStorage.setItem('pas_projects', JSON.stringify(projects));
  }, [projects]);

  // Save user to localStorage
  useEffect(() => {
    localStorage.setItem('pas_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Keep current project in sync when employees or datasetName change
  const updateActiveEmployees: React.Dispatch<React.SetStateAction<Employee[]>> = (valOrFn) => {
    setEmployees((prev) => {
      const next = typeof valOrFn === 'function' ? (valOrFn as any)(prev) : valOrFn;
      // Sync into projects array
      setProjects((projList) =>
        projList.map((p) =>
          p.id === activeProjectId ? { ...p, employees: next, updatedAt: 'Just now' } : p
        )
      );
      return next;
    });
  };

  const updateActiveDatasetName = (name: string) => {
    setDatasetName(name);
    setProjects((projList) =>
      projList.map((p) => (p.id === activeProjectId ? { ...p, datasetName: name } : p))
    );
  };

  const updateActiveQualityScore = (score: number) => {
    setQualityScore(score);
    setProjects((projList) =>
      projList.map((p) => (p.id === activeProjectId ? { ...p, qualityScore: score } : p))
    );
  };

  // Switch Project
  const handleSwitchProject = (id: string) => {
    const target = projects.find((p) => p.id === id);
    if (!target) return;

    setActiveProjectId(id);
    setDatasetName(target.datasetName);
    setEmployees(target.employees);
    setQualityScore(target.qualityScore);
    addAuditLog('Switched Workspace', `Switched active project to "${target.name}"`, 'Pipeline');
    showNotification(
      'Workspace Activated',
      `Switched workspace to "${target.name}" with ${target.employees.length} records.`,
      'success'
    );
  };

  // Create Project
  const handleCreateProject = (name: string, description: string, template: string) => {
    let initialEmps = employees;
    let initialScore = 91;
    let dName = `${name.replace(/\s+/g, '_')}.xlsx`;

    if (template === 'tech') {
      initialEmps = generateTechStartupDataset();
      initialScore = 95;
      dName = 'Tech_Cohort_Data.xlsx';
    } else if (template === 'blank') {
      initialEmps = [];
      initialScore = 50;
      dName = 'Empty_Dataset.xlsx';
    }

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name,
      description: description || 'Custom people analytics workspace',
      datasetName: dName,
      employees: initialEmps,
      qualityScore: initialScore,
      updatedAt: 'Just now',
    };

    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setDatasetName(newProj.datasetName);
    setEmployees(newProj.employees);
    setQualityScore(newProj.qualityScore);

    addAuditLog('Created Project', `Created new workspace "${name}"`, 'Ingestion');
    showNotification('Workspace Created', `New workspace "${name}" created and loaded.`, 'success');
  };

  // Delete Project
  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) {
      showNotification('Cannot Delete', 'At least one project workspace must remain active.', 'warning');
      return;
    }
    const target = projects.find((p) => p.id === id);
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);

    if (activeProjectId === id) {
      const fallback = remaining[0];
      setActiveProjectId(fallback.id);
      setDatasetName(fallback.datasetName);
      setEmployees(fallback.employees);
      setQualityScore(fallback.qualityScore);
    }

    showNotification('Project Removed', `Deleted workspace "${target?.name}".`, 'info');
  };

  const showNotification = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'danger' = 'info',
    confirmText?: string,
    onConfirm?: () => void
  ) => {
    setNotification({ isOpen: true, title, message, type, confirmText, onConfirm });
  };

  const addAuditLog = (
    action: string,
    details: string,
    category: AuditLogEntry['category'] = 'Pipeline'
  ) => {
    const newLog: AuditLogEntry = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: `${currentUser.name} (${currentUser.role})`,
      action,
      details,
      category,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const handleLogin = (profile: UserProfile) => {
    setCurrentUser(profile);
    setIsAuthOpen(false);
    addAuditLog('User Authenticated', `Switched session to ${profile.name} (${profile.role})`, 'Security');
    showNotification(
      'Profile Active',
      `Welcome ${profile.name}. Workspace configured with ${profile.role} permissions for ${profile.company}.`,
      'success'
    );
  };

  const handleRunFullAnalysis = () => {
    setActiveTab('analytics');
    addAuditLog(
      'Full Workforce Analysis Triggered',
      `Evaluated ${employees.length} records across 5 core people analytics modules`,
      'Analysis'
    );
    showNotification(
      'Full Analysis Completed',
      `Evaluated ${employees.length} employee records across Turnover, Headcount, Recruitment, Engagement, and Compensation modules.`,
      'success'
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        onOpenProfile={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <Header
          activeTab={activeTab}
          datasetName={datasetName}
          rowCount={employees.length}
          onRunAnalysis={handleRunFullAnalysis}
        />

        {/* Dynamic Viewport Container */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-slate-900/95">
          {activeTab === 'home' && (
            <HomeView
              onNavigate={setActiveTab}
              datasetName={datasetName}
              employees={employees}
              qualityScore={qualityScore}
              projects={projects}
              activeProjectId={activeProjectId}
              onSwitchProject={handleSwitchProject}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              salaryMasked={salaryMasked}
            />
          )}

          {activeTab === 'data' && (
            <DataImportView
              employees={employees}
              setEmployees={updateActiveEmployees}
              datasetName={datasetName}
              setDatasetName={updateActiveDatasetName}
              qualityScore={qualityScore}
              setQualityScore={updateActiveQualityScore}
              qualityIssues={qualityIssues}
              setQualityIssues={setQualityIssues}
              onShowModal={showNotification}
              onNavigateToClean={() => setActiveTab('clean')}
              salaryMasked={salaryMasked}
            />
          )}

          {activeTab === 'clean' && (
            <DataCleaningView
              steps={transformationSteps}
              setSteps={setTransformationSteps}
              employees={employees}
              setEmployees={updateActiveEmployees}
              qualityScore={qualityScore}
              setQualityScore={updateActiveQualityScore}
              qualityIssues={qualityIssues}
              setQualityIssues={setQualityIssues}
              onResetCleanData={() => {
                const fresh = generateInitialDataset();
                updateActiveEmployees(fresh);
                updateActiveQualityScore(96);
                const audit = calculateQualityAudit(fresh);
                setQualityIssues(audit.issues);
                addAuditLog('Dataset Restored', 'Restored workforce records to baseline clean dataset', 'Ingestion');
                showNotification('Dataset Restored', 'Workforce dataset reset to clean baseline of 487 verified records.', 'success');
              }}
              onShowModal={showNotification}
              onNavigateToModel={() => setActiveTab('model')}
            />
          )}

          {activeTab === 'model' && (
            <DataModelView
              employees={employees}
              onShowModal={showNotification}
              onNavigateToAnalytics={() => setActiveTab('analytics')}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              employees={employees}
              salaryMasked={salaryMasked}
              onShowModal={showNotification}
            />
          )}

          {activeTab === 'dashboards' && (
            <DashboardView
              employees={employees}
              onShowModal={showNotification}
              onNavigateToExport={() => setActiveTab('export')}
            />
          )}

          {activeTab === 'ask' && (
            <AskDataView
              currentUser={currentUser}
              employees={employees}
              onShowModal={showNotification}
            />
          )}

          {activeTab === 'labs' && (
            <LabsView
              employees={employees}
              salaryMasked={salaryMasked}
              onShowModal={showNotification}
            />
          )}

          {activeTab === 'export' && (
            <ExportView
              employees={employees}
              datasetName={datasetName}
              onShowModal={showNotification}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              salaryMasked={salaryMasked}
              setSalaryMasked={setSalaryMasked}
              auditLogs={auditLogs}
              onOpenProfile={() => setIsAuthOpen(true)}
              employees={employees}
              setEmployees={updateActiveEmployees}
              datasetName={datasetName}
              qualityScore={qualityScore}
              setQualityScore={updateActiveQualityScore}
              setQualityIssues={setQualityIssues}
              onAddAuditLog={addAuditLog}
              snapshots={snapshots}
              setSnapshots={setSnapshots}
              onShowModal={showNotification}
            />
          )}
        </main>
      </div>

      {/* Auth / Profile Switcher Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        currentUser={currentUser}
        onLogin={handleLogin}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Global Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        confirmText={notification.confirmText}
        onConfirm={notification.onConfirm}
        onClose={() => setNotification((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
