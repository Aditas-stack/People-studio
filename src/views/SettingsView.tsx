import React, { useState, useMemo } from 'react';
import {
  Settings,
  ShieldCheck,
  Lock,
  EyeOff,
  Eye,
  Activity,
  UserCheck,
  Filter,
  Camera,
  History,
  RotateCcw,
  Trash2,
  Download,
  Plus,
  Check,
  Clock,
  Database,
  AlertTriangle,
  Sparkles,
  Tag,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  X,
  Search,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import {
  UserProfile,
  AuditLogEntry,
  Employee,
  DatasetSnapshot,
  QualityIssue,
} from '../types';
import { calculateQualityAudit } from '../utils/dataParser';

interface SettingsViewProps {
  currentUser: UserProfile;
  salaryMasked: boolean;
  setSalaryMasked: (masked: boolean) => void;
  auditLogs: AuditLogEntry[];
  onOpenProfile: () => void;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  datasetName: string;
  qualityScore: number;
  setQualityScore: (score: number) => void;
  setQualityIssues: React.Dispatch<React.SetStateAction<QualityIssue[]>>;
  onAddAuditLog: (action: string, details: string, category?: AuditLogEntry['category']) => void;
  snapshots: DatasetSnapshot[];
  setSnapshots: React.Dispatch<React.SetStateAction<DatasetSnapshot[]>>;
  onShowModal: (
    title: string,
    message: string,
    type?: 'info' | 'success' | 'warning' | 'danger',
    confirmText?: string,
    onConfirm?: () => void
  ) => void;
}

const PRESET_TAGS = ['Baseline', 'Cleaned', 'Pre-Pipeline', 'Compensation', 'Reorg', 'Audit', 'Backup'];

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  salaryMasked,
  setSalaryMasked,
  auditLogs,
  onOpenProfile,
  employees,
  setEmployees,
  datasetName,
  qualityScore,
  setQualityScore,
  setQualityIssues,
  onAddAuditLog,
  snapshots,
  setSnapshots,
  onShowModal,
}) => {
  // Audit trail category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Snapshots filter & search
  const [snapshotSearch, setSnapshotSearch] = useState<string>('');
  const [selectedSnapshotTag, setSelectedSnapshotTag] = useState<string>('All');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotDesc, setNewSnapshotDesc] = useState('');
  const [newSnapshotTags, setNewSnapshotTags] = useState<string[]>(['Cleaned']);

  // Revert confirmation modal state
  const [revertingSnapshot, setRevertingSnapshot] = useState<DatasetSnapshot | null>(null);
  const [autoBackupBeforeRevert, setAutoBackupBeforeRevert] = useState(true);

  // Inspect / preview modal state
  const [previewSnapshot, setPreviewSnapshot] = useState<DatasetSnapshot | null>(null);

  // Delete confirmation modal state
  const [deletingSnapshot, setDeletingSnapshot] = useState<DatasetSnapshot | null>(null);

  const filteredLogs = auditLogs.filter(
    (log) => selectedCategory === 'All' || log.category === selectedCategory
  );

  const toggleSalaryMasking = () => {
    const nextState = !salaryMasked;
    setSalaryMasked(nextState);
    onAddAuditLog(
      nextState ? 'Salary Masking Enabled' : 'Salary Masking Disabled',
      nextState
        ? 'Payroll compensation fields obscured for confidential role session'
        : 'Payroll compensation values made visible to HR Administrator',
      'Security'
    );
    onShowModal(
      nextState ? 'Salary Masking Enabled' : 'Salary Masking Disabled',
      nextState
        ? 'Payroll compensation figures are now shielded with •••••• across all tables, charts, and exports.'
        : 'Full compensation access restored for authorized HR administrator profile.',
      'info'
    );
  };

  // Compare active memory with latest snapshot
  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;
  const isMemoryInSyncWithLatest = useMemo(() => {
    if (!latestSnapshot) return false;
    return (
      latestSnapshot.recordCount === employees.length &&
      latestSnapshot.qualityScore === qualityScore
    );
  }, [latestSnapshot, employees.length, qualityScore]);

  // Filtered snapshots list
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((snap) => {
      const matchesSearch =
        snap.name.toLowerCase().includes(snapshotSearch.toLowerCase()) ||
        (snap.description && snap.description.toLowerCase().includes(snapshotSearch.toLowerCase())) ||
        snap.createdBy.toLowerCase().includes(snapshotSearch.toLowerCase());
      const matchesTag =
        selectedSnapshotTag === 'All' ||
        (snap.tags && snap.tags.includes(selectedSnapshotTag));
      return matchesSearch && matchesTag;
    });
  }, [snapshots, snapshotSearch, selectedSnapshotTag]);

  // Open Create Snapshot modal with default name
  const handleOpenCreateModal = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
    setNewSnapshotName(`Workforce State — ${dateStr}, ${timeStr}`);
    setNewSnapshotDesc(`Captured active memory with ${employees.length} records (${qualityScore}% Quality Score)`);
    setNewSnapshotTags(['Manual']);
    setIsCreateModalOpen(true);
  };

  // Handle taking a snapshot
  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotName.trim()) return;

    const clonedEmployees: Employee[] = JSON.parse(JSON.stringify(employees));
    const newSnap: DatasetSnapshot = {
      id: `snap-${Date.now()}`,
      name: newSnapshotName.trim(),
      description: newSnapshotDesc.trim() || undefined,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      recordCount: clonedEmployees.length,
      qualityScore,
      datasetName,
      employees: clonedEmployees,
      createdBy: `${currentUser.name} (${currentUser.role})`,
      tags: newSnapshotTags.length > 0 ? newSnapshotTags : ['Manual'],
      isAutoSnapshot: false,
    };

    setSnapshots((prev) => [newSnap, ...prev]);
    setIsCreateModalOpen(false);

    onAddAuditLog(
      'Snapshot Captured',
      `Saved immutable dataset snapshot "${newSnap.name}" with ${newSnap.recordCount} records`,
      'Security'
    );

    confetti({ particleCount: 40, spread: 50 });
    onShowModal(
      'Snapshot Captured Successfully',
      `Version "${newSnap.name}" has been preserved with ${newSnap.recordCount} records and ${newSnap.qualityScore}% Quality Score. You can revert to this exact point in time whenever needed.`,
      'success'
    );
  };

  // Execute revert to a snapshot
  const handleConfirmRevert = () => {
    if (!revertingSnapshot) return;

    // Optional: create auto-backup before reverting if requested
    if (autoBackupBeforeRevert) {
      const backupSnap: DatasetSnapshot = {
        id: `snap-auto-backup-${Date.now()}`,
        name: `Auto-Backup (Prior to reverting to ${revertingSnapshot.name})`,
        description: `Automatic state backup captured right before restoring version "${revertingSnapshot.name}"`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        recordCount: employees.length,
        qualityScore,
        datasetName,
        employees: JSON.parse(JSON.stringify(employees)),
        createdBy: `${currentUser.name} (Auto-Backup)`,
        tags: ['Auto-Backup', 'Pre-Revert'],
        isAutoSnapshot: true,
      };
      setSnapshots((prev) => [backupSnap, ...prev]);
    }

    // Restore working dataset from snapshot
    const restoredEmployees: Employee[] = JSON.parse(
      JSON.stringify(revertingSnapshot.employees)
    );
    setEmployees(restoredEmployees);
    setQualityScore(revertingSnapshot.qualityScore);

    // Recompute quality audit issues
    const audit = calculateQualityAudit(restoredEmployees);
    setQualityIssues(audit.issues);

    onAddAuditLog(
      'Reverted Dataset Version',
      `Restored active workforce dataset to snapshot "${revertingSnapshot.name}" (${revertingSnapshot.recordCount} records, ${revertingSnapshot.qualityScore}% quality)`,
      'Pipeline'
    );

    const revertedName = revertingSnapshot.name;
    const restoredCount = restoringCount(revertingSnapshot);
    setRevertingSnapshot(null);
    if (previewSnapshot) setPreviewSnapshot(null);

    confetti({ particleCount: 60, spread: 70 });
    onShowModal(
      'Dataset Reverted Successfully',
      `Your active workspace data has been restored to "${revertedName}". All dashboard metrics, pipeline tables, and data models are now synchronized with these ${restoredCount} records.`,
      'success'
    );
  };

  const restoringCount = (snap: DatasetSnapshot) => snap.recordCount;

  // Handle snapshot deletion
  const handleConfirmDelete = () => {
    if (!deletingSnapshot) return;
    const targetId = deletingSnapshot.id;
    const targetName = deletingSnapshot.name;

    setSnapshots((prev) => prev.filter((s) => s.id !== targetId));
    setDeletingSnapshot(null);

    onAddAuditLog(
      'Deleted Snapshot',
      `Removed snapshot "${targetName}" from version archive`,
      'Security'
    );
    onShowModal('Snapshot Deleted', `Version "${targetName}" removed from snapshot storage.`, 'info');
  };

  // Export a snapshot to XLSX
  const handleExportSnapshotExcel = (snap: DatasetSnapshot) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(snap.employees);
    XLSX.utils.book_append_sheet(wb, ws, 'Workforce_Snapshot');
    const safeName = snap.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    XLSX.writeFile(wb, `${safeName}_${snap.timestamp.slice(0, 10)}.xlsx`);
    onShowModal(
      'Snapshot Exported',
      `Exported "${snap.name}" (${snap.recordCount} rows) to Microsoft Excel (.xlsx).`,
      'success'
    );
  };

  const toggleTagSelection = (tag: string) => {
    if (newSnapshotTags.includes(tag)) {
      setNewSnapshotTags(newSnapshotTags.filter((t) => t !== tag));
    } else {
      setNewSnapshotTags([...newSnapshotTags, tag]);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Title & Profile Switch */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="border-b border-slate-700/60 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Workspace Administration & Control</span>
            </span>
            <h2 className="text-xl font-bold text-white mt-1">Security, Versioning & Audit Trail</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Take immutable dataset snapshots, revert to historical points in time, configure GDPR privacy masking, and inspect real-time system audit logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreateModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Snapshot</span>
            </button>
            <button
              onClick={onOpenProfile}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Switch Profile</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* NEW FEATURE: DATASET SNAPSHOTS & VERSION CONTROL               */}
        {/* ============================================================== */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Dataset Snapshots & Version History</h3>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {snapshots.length} Versions Saved
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Point-in-time immutable state copies of your workforce records. Revert safely whenever transformations or imports need to be rolled back.
              </p>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="self-start md:self-auto bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Take New Snapshot</span>
            </button>
          </div>

          {/* Active Memory Status Banner */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Current Active Memory:</span>
                  <span className="text-slate-300 font-mono">{datasetName}</span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.2 rounded-full">
                    {employees.length} Records
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Quality Score: <strong className="text-emerald-400">{qualityScore}%</strong>
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {isMemoryInSyncWithLatest ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      In sync with latest captured snapshot ({latestSnapshot?.name})
                    </span>
                  ) : (
                    <span className="text-amber-300 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      Active memory has modifications since latest snapshot. Consider capturing a new snapshot.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isMemoryInSyncWithLatest && (
              <button
                onClick={handleOpenCreateModal}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>Save Current State</span>
              </button>
            )}
          </div>

          {/* Search & Tag Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search snapshot name, author..."
                value={snapshotSearch}
                onChange={(e) => setSnapshotSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {snapshotSearch && (
                <button
                  onClick={() => setSnapshotSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tag Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1 shrink-0">
                <Tag className="w-3 h-3" /> Tag:
              </span>
              {['All', ...PRESET_TAGS].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedSnapshotTag(tag)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                    selectedSnapshotTag === tag
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Snapshots Cards Grid */}
          <div className="space-y-3">
            {filteredSnapshots.length === 0 ? (
              <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <History className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-300">No matching snapshots found</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {snapshotSearch || selectedSnapshotTag !== 'All'
                    ? 'Try clearing your search query or tag filter.'
                    : 'Capture your first snapshot above to start recording point-in-time dataset versions.'}
                </p>
                <button
                  onClick={handleOpenCreateModal}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Take First Snapshot</span>
                </button>
              </div>
            ) : (
              filteredSnapshots.map((snap, idx) => {
                const isCurrentlyActive =
                  snap.recordCount === employees.length &&
                  snap.qualityScore === qualityScore &&
                  idx === 0;

                const rowDelta = snap.recordCount - employees.length;

                return (
                  <div
                    key={snap.id}
                    className={`bg-slate-950/80 border rounded-2xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isCurrentlyActive
                        ? 'border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                        : 'border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    {/* Left Info */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg">
                          v{snapshots.length - snapshots.indexOf(snap)}
                        </span>
                        <h4 className="font-bold text-white text-sm truncate">{snap.name}</h4>

                        {isCurrentlyActive && (
                          <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Active in Memory
                          </span>
                        )}

                        {snap.isAutoSnapshot && (
                          <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-slate-700">
                            Auto-Snapshot
                          </span>
                        )}
                      </div>

                      {snap.description && (
                        <p className="text-xs text-slate-400 leading-relaxed">{snap.description}</p>
                      )}

                      {/* Snapshot Meta Details */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{snap.timestamp}</span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>
                          Author: <strong className="text-slate-300 font-sans">{snap.createdBy}</strong>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>
                          Records: <strong className="text-white font-mono">{snap.recordCount}</strong>
                          {rowDelta !== 0 && (
                            <span
                              className={`ml-1 text-[11px] font-mono ${
                                rowDelta > 0 ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              ({rowDelta > 0 ? `+${rowDelta}` : rowDelta} vs active)
                            </span>
                          )}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>
                          Quality: <strong className="text-emerald-400">{snap.qualityScore}%</strong>
                        </span>
                      </div>

                      {/* Tags */}
                      {snap.tags && snap.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {snap.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-md"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => setPreviewSnapshot(snap)}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Inspect snapshot breakdown and sample records"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Inspect</span>
                      </button>

                      <button
                        onClick={() => handleExportSnapshotExcel(snap)}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Download as Excel file"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span>Excel</span>
                      </button>

                      <button
                        onClick={() => setRevertingSnapshot(snap)}
                        disabled={isCurrentlyActive}
                        className={`text-xs font-semibold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                          isCurrentlyActive
                            ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                        }`}
                        title={
                          isCurrentlyActive
                            ? 'This snapshot matches the current active dataset'
                            : 'Revert working dataset to this point in time'
                        }
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isCurrentlyActive ? 'Current State' : 'Revert to Version'}</span>
                      </button>

                      {snapshots.length > 1 && !snap.isAutoSnapshot && (
                        <button
                          onClick={() => setDeletingSnapshot(snap)}
                          className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-slate-900 transition-colors cursor-pointer"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
                <strong className="text-emerald-400 font-mono">Polars / AlaSQL In-Memory Runtime</strong>
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

      {/* ============================================================== */}
      {/* MODAL 1: CREATE SNAPSHOT                                       */}
      {/* ============================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Capture Dataset Snapshot</h3>
                  <p className="text-xs text-slate-400">Save an immutable copy of current workforce records</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Active Dataset Summary Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                State to be Captured
              </span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                  <div className="text-slate-400 text-[10px]">Headcount</div>
                  <div className="text-white font-bold font-mono text-sm">{employees.length}</div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                  <div className="text-slate-400 text-[10px]">Quality Score</div>
                  <div className="text-emerald-400 font-bold font-mono text-sm">{qualityScore}%</div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                  <div className="text-slate-400 text-[10px]">Source Dataset</div>
                  <div className="text-indigo-300 font-bold truncate text-[11px] mt-0.5">{datasetName}</div>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateSnapshot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Snapshot Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSnapshotName}
                  onChange={(e) => setNewSnapshotName(e.target.value)}
                  placeholder="e.g. Q3 Baseline - Pre Pipeline Run"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description / Audit Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newSnapshotDesc}
                  onChange={(e) => setNewSnapshotDesc(e.target.value)}
                  placeholder="Notes on reasons for capture (e.g. before merging external contractor batch)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tags & Metadata
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TAGS.map((tag) => {
                    const isSelected = newSnapshotTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTagSelection(tag)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Preserve Snapshot</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: REVERT CONFIRMATION                                   */}
      {/* ============================================================== */}
      {revertingSnapshot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Revert Workforce Dataset</h3>
                <p className="text-xs text-slate-400">Roll back active data to selected snapshot</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                You are about to revert your active workspace to snapshot:
              </p>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="font-bold text-white text-sm">{revertingSnapshot.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Captured {revertingSnapshot.timestamp} by {revertingSnapshot.createdBy}
                </div>
              </div>

              {/* Delta Comparison */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  <div className="text-slate-400 text-[10px]">Active Memory</div>
                  <div className="text-white font-bold font-mono text-sm mt-0.5">{employees.length} Records</div>
                  <div className="text-[11px] text-slate-400">{qualityScore}% Quality</div>
                </div>
                <div className="p-2.5 bg-indigo-950/30 rounded-xl border border-indigo-500/30">
                  <div className="text-indigo-300 text-[10px]">Restoring Version</div>
                  <div className="text-emerald-400 font-bold font-mono text-sm mt-0.5">{revertingSnapshot.recordCount} Records</div>
                  <div className="text-[11px] text-emerald-400">{revertingSnapshot.qualityScore}% Quality</div>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={autoBackupBeforeRevert}
                    onChange={(e) => setAutoBackupBeforeRevert(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Create an automatic backup snapshot of current state before reverting</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRevertingSnapshot(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevert}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm & Revert Working Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: PREVIEW / INSPECT SNAPSHOT                            */}
      {/* ============================================================== */}
      {previewSnapshot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{previewSnapshot.name}</h3>
                  <p className="text-xs text-slate-400">
                    Captured {previewSnapshot.timestamp} by {previewSnapshot.createdBy}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewSnapshot(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Headcount</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">{previewSnapshot.recordCount}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Quality Score</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{previewSnapshot.qualityScore}%</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Avg Salary</div>
                <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">
                  $
                  {salaryMasked
                    ? '••••••'
                    : Math.round(
                        previewSnapshot.employees.reduce((acc, e) => acc + (e.salary || 0), 0) /
                          (previewSnapshot.employees.length || 1)
                      ).toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Active Staff</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  {previewSnapshot.employees.filter((e) => e.status === 'Active').length}
                </div>
              </div>
            </div>

            {/* Department Breakdown */}
            <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Department Distribution
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                {Array.from(new Set(previewSnapshot.employees.map((e) => e.department))).map((dept) => {
                  const count = previewSnapshot.employees.filter((e) => e.department === dept).length;
                  const pct = Math.round((count / previewSnapshot.employees.length) * 100);
                  return (
                    <div key={dept} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center text-slate-300 font-medium">
                        <span className="truncate">{dept}</span>
                        <span className="font-mono text-indigo-400 font-bold">{count}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sample Records Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sample Ingested Rows (First 5 records)
                </h4>
                <span className="text-[11px] text-slate-500">Read-Only Snapshot State</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                      <th className="py-2 px-3">Emp ID</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Department</th>
                      <th className="py-2 px-3">Job Title</th>
                      <th className="py-2 px-3">Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {previewSnapshot.employees.slice(0, 5).map((e) => (
                      <tr key={e.id}>
                        <td className="py-2 px-3 text-indigo-400">{e.id}</td>
                        <td className="py-2 px-3 font-sans text-white">{e.name}</td>
                        <td className="py-2 px-3">{e.department}</td>
                        <td className="py-2 px-3">{e.jobTitle}</td>
                        <td className="py-2 px-3 text-emerald-400 font-sans">
                          ${salaryMasked ? '••••••' : e.salary.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleExportSnapshotExcel(previewSnapshot)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Snapshot to Excel</span>
              </button>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewSnapshot(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const snap = previewSnapshot;
                    setPreviewSnapshot(null);
                    setRevertingSnapshot(snap);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert to this Version</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: DELETE CONFIRMATION                                   */}
      {/* ============================================================== */}
      {deletingSnapshot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Snapshot</h3>
                <p className="text-xs text-slate-400">Permanent version removal</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete version{' '}
              <strong className="text-white">"{deletingSnapshot.name}"</strong>? This will remove the point-in-time state from your browser storage.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingSnapshot(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Delete Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
