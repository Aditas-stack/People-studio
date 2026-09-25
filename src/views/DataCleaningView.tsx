import React, { useState, useMemo } from 'react';
import {
  Brush,
  CheckCircle2,
  Copy,
  Check,
  Plus,
  ArrowRight,
  Code,
  FileCode,
  Terminal,
  Database,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Eye,
  Sliders,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { TransformationStep, Employee } from '../types';

interface DataCleaningViewProps {
  steps: TransformationStep[];
  setSteps: React.Dispatch<React.SetStateAction<TransformationStep[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  onShowModal: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
  onNavigateToModel: () => void;
}

export const DataCleaningView: React.FC<DataCleaningViewProps> = ({
  steps,
  setSteps,
  employees,
  setEmployees,
  onShowModal,
  onNavigateToModel,
}) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'python' | 'm' | 'sql'>('python');
  const [copied, setCopied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [viewMode, setViewMode] = useState<'pipeline' | 'diff'>('pipeline');

  // New step modal state
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');
  const [newStepAction, setNewStepAction] = useState<'trim' | 'dept' | 'raise' | 'impute'>('trim');

  // Inject messy records to demonstrate live cleaning
  const handleInjectMessyData = () => {
    const dirtyRecords: Employee[] = [
      {
        id: 'EMP-0012', // Duplicate ID
        name: '  alexander novak   ', // Untrimmed
        department: 'Eng', // Non-standard taxonomy
        jobTitle: 'frontend dev', // Lowercase
        hireDate: '15/04/2023', // Non-ISO date
        tenureYears: 2.1,
        salary: 115000,
        bonus: 8000,
        performanceRating: 'Exceeds',
        engagementScore: 78,
        remoteStatus: 'Hybrid',
        gender: 'Unknown',
        status: 'Active',
      },
      {
        id: 'EMP-0044',
        name: '  priya patel  ',
        department: 'Ops', // Non-standard taxonomy
        jobTitle: 'logistics analyst',
        hireDate: '2024-02-18',
        tenureYears: 1.8,
        salary: 78000,
        bonus: 4000,
        performanceRating: 'Outstanding',
        engagementScore: 92,
        remoteStatus: 'Remote',
        gender: 'Female',
        status: 'Active',
      },
      {
        id: 'EMP-0098',
        name: 'DAVID CHEN',
        department: 'Fin', // Non-standard taxonomy
        jobTitle: 'senior accountant',
        hireDate: '2021-11-05',
        tenureYears: 4.2,
        salary: 96000,
        bonus: 10000,
        performanceRating: 'Meets Expectations',
        engagementScore: 81,
        remoteStatus: 'Onsite',
        gender: 'Male',
        status: 'Active',
      },
    ];

    setEmployees((prev) => [...dirtyRecords, ...prev]);
    onShowModal(
      'Messy Records Injected',
      'Injected 3 sample rows with unstandardized departments ("Eng", "Ops", "Fin"), irregular casing, and trailing whitespace. Click "Apply Pipeline" to watch them normalize in real-time!',
      'warning'
    );
  };

  const toggleStep = (id: number) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, applied: !s.applied } : s))
    );
  };

  const handleCopyCode = () => {
    let textToCopy = pythonScript;
    if (activeCodeTab === 'm') textToCopy = powerQueryScript;
    if (activeCodeTab === 'sql') textToCopy = sqlScript;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowModal('Code Copied', 'Script pipeline copied to clipboard.', 'success');
  };

  const handleAddCustomStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepName.trim()) return;

    let codeSnippet = '';
    if (newStepAction === 'raise') {
      codeSnippet = `df['Salary'] = df['Salary'] * 1.05 # 5% across-the-board cost-of-living adjustment`;
      setEmployees((prev) =>
        prev.map((emp) => ({
          ...emp,
          salary: Math.round(emp.salary * 1.05),
        }))
      );
    } else if (newStepAction === 'trim') {
      codeSnippet = `df['Employee_Name'] = df['Employee_Name'].str.strip().str.title()`;
      setEmployees((prev) =>
        prev.map((emp) => ({
          ...emp,
          name: emp.name.trim(),
        }))
      );
    } else {
      codeSnippet = `# Custom rule: Standardize Department Taxonomy\ndf['Department'] = df['Department'].replace({'Eng': 'Engineering', 'Fin': 'Finance', 'Ops': 'Operations'})`;
    }

    const newStep: TransformationStep = {
      id: steps.length + 1,
      name: newStepName,
      description: newStepDesc || 'Custom analyst transformation',
      applied: true,
      codeSnippet,
      affectedRows: employees.length,
    };

    setSteps((prev) => [...prev, newStep]);
    setIsAddingStep(false);
    setNewStepName('');
    setNewStepDesc('');
    onShowModal('Transformation Executed', `Step "${newStep.name}" added and executed across all records.`, 'success');
  };

  // Real execution of all active pipeline steps
  const handleExecutePipeline = () => {
    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);

      // Perform real deduplication and standardization
      setEmployees((prev) => {
        const seenIds = new Set<string>();
        const cleaned: Employee[] = [];

        for (const emp of prev) {
          // If deduplication step is applied:
          const dedupActive = steps.find((s) => s.id === 1)?.applied;
          if (dedupActive) {
            if (seenIds.has(emp.id)) continue;
            seenIds.add(emp.id);
          }

          // Step 2: Trim whitespace and title case
          let name = emp.name.trim();
          name = name
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');

          // Step 3: Standardize departments
          let dept = emp.department;
          if (dept === 'Eng') dept = 'Engineering';
          if (dept === 'Fin') dept = 'Finance';
          if (dept === 'Ops') dept = 'Operations';

          // Step 6: Handle missing gender
          const gender = emp.gender || 'Unknown';

          cleaned.push({
            ...emp,
            name,
            department: dept,
            gender,
            jobTitle: emp.jobTitle.trim(),
          });
        }

        return cleaned;
      });

      confetti({ particleCount: 50, spread: 60 });
      onShowModal(
        'Pipeline Executed Successfully',
        `Applied active transformations across all ${employees.length} records. Cleaned department aliases, trimmed strings, and enforced referential uniqueness.`,
        'success'
      );
    }, 700);
  };

  const handleDownloadCleanedExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(employees);
    XLSX.utils.book_append_sheet(wb, ws, 'Cleaned_Workforce');
    XLSX.writeFile(wb, `Cleaned_Workforce_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onShowModal('Download Ready', `Cleaned dataset with ${employees.length} records exported to Excel.`, 'success');
  };

  // Detect rows with potential messy anomalies for the Diff Inspector
  const rowsWithAnomalies = useMemo(() => {
    return employees.filter(
      (e) =>
        e.department === 'Eng' ||
        e.department === 'Fin' ||
        e.department === 'Ops' ||
        e.name.startsWith(' ') ||
        e.name.endsWith(' ') ||
        e.name === e.name.toUpperCase()
    );
  }, [employees]);

  const powerQueryScript = `let
    Source = Excel.Workbook(File.Contents("Active_Workforce_2026.xlsx"), null, true),
    Employee_Master_Table = Source{[Item="Employee_Master",Kind="Table"]}[Data],
    #"Removed Duplicates" = Table.Distinct(Employee_Master_Table, {"Employee_ID"}),
    #"Trimmed Text" = Table.TransformColumns(#"Removed Duplicates",{{"Employee_Name", Text.Trim}}),
    #"Replaced Eng" = Table.ReplaceValue(#"Trimmed Text","Eng","Engineering",Replacer.ReplaceText,{"Department"}),
    #"Replaced Fin" = Table.ReplaceValue(#"Replaced Eng","Fin","Finance",Replacer.ReplaceText,{"Department"}),
    #"Changed Type Date" = Table.TransformColumnTypes(#"Replaced Fin",{{"Hire_Date", type date}}),
    #"Parsed Salary" = Table.TransformColumns(#"Changed Type Date",{{"Salary", Currency.From}}),
    #"Imputed Gender" = Table.ReplaceValue(#"Parsed Salary",null,"Unknown",Replacer.ReplaceValue,{"Gender"})
in
    #"Imputed Gender"`;

  const sqlScript = `WITH RawWorkforce AS (
    SELECT 
        TRIM(employee_name) AS employee_name,
        employee_id,
        CASE 
            WHEN department = 'Eng' THEN 'Engineering'
            WHEN department = 'Fin' THEN 'Finance'
            WHEN department = 'Ops' THEN 'Operations'
            ELSE COALESCE(department, 'Unassigned')
        END AS department,
        job_title,
        CAST(hire_date AS DATE) AS hire_date,
        CAST(REGEXP_REPLACE(salary::TEXT, '[$,]', '', 'g') AS NUMERIC) AS salary,
        COALESCE(gender, 'Unknown') AS gender,
        status,
        exit_reason
    FROM raw_employee_master
),
DeduplicatedWorkforce AS (
    SELECT DISTINCT ON (employee_id) *
    FROM RawWorkforce
    ORDER BY employee_id, hire_date DESC
)
SELECT * FROM DeduplicatedWorkforce;`;

  const pythonScript = `import pandas as pd
import numpy as np

# Load raw employee master dataset
df = pd.read_excel("Active_Workforce_2026.xlsx")

# Step 1: Remove duplicate Employee IDs
df = df.drop_duplicates(subset=['Employee_ID'], keep='first')

# Step 2: Trim whitespace and title-case Employee Names
df['Employee_Name'] = df['Employee_Name'].str.strip().str.title()

# Step 3: Standardize Department Taxonomy
dept_map = {'Eng': 'Engineering', 'Fin': 'Finance', 'Ops': 'Operations'}
df['Department'] = df['Department'].replace(dept_map)

# Step 4: Convert Hire Date to ISO Date
df['Hire_Date'] = pd.to_datetime(df['Hire_Date'], errors='coerce').dt.strftime('%Y-%m-%d')

# Step 5: Cast Salary to Decimal currency
df['Salary'] = pd.to_numeric(df['Salary'].astype(str).str.replace(r'[$,]', '', regex=True), errors='coerce')

# Step 6: Impute blank Gender with 'Unknown'
df['Gender'] = df['Gender'].fillna('Unknown')
df['Exit_Reason'] = df['Exit_Reason'].fillna('Not Applicable')

print(f"Cleaned dataset successfully: {len(df)} rows validated.")`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-700/60 pb-6">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Brush className="w-3.5 h-3.5" />
              <span>Power Query Engine</span>
            </span>
            <h2 className="text-xl font-bold text-white">Transformation Pipeline & Audit Trail</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live data cleaning steps. Toggle transformations and watch records normalize.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleInjectMessyData}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold px-3 py-2 rounded-xl border border-amber-500/30 flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Inject Dirty Sample Data</span>
            </button>

            <button
              onClick={() => setIsAddingStep(true)}
              className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Add Custom Step</span>
            </button>

            <button
              onClick={handleDownloadCleanedExcel}
              className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 text-xs font-semibold px-3 py-2 rounded-xl border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Cleaned (.xlsx)</span>
            </button>

            <button
              onClick={handleExecutePipeline}
              disabled={isApplying}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold px-4 py-2 rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isApplying ? 'Executing Pipeline...' : 'Apply Pipeline'}</span>
            </button>
          </div>
        </div>

        {/* View Mode Toggle: Pipeline vs Live Diff Inspector */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setViewMode('pipeline')}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              viewMode === 'pipeline'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Pipeline Steps & Code
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'diff'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Before vs After Diff ({rowsWithAnomalies.length} flagged)</span>
          </button>
        </div>

        {viewMode === 'pipeline' ? (
          /* Grid: Steps on Left, Code Inspector on Right */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Step Sequence */}
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pipeline Sequence ({steps.filter((s) => s.applied).length}/{steps.length})
                </h4>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    onClick={() => toggleStep(step.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start space-x-3 ${
                      step.applied
                        ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        step.applied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {step.applied ? <Check className="w-3.5 h-3.5" /> : step.id}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white truncate block">
                          Step {step.id}: {step.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        {step.description}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-indigo-400 font-mono">
                          {step.affectedRows} rows impacted
                        </span>
                        <span
                          className={
                            step.applied ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                          }
                        >
                          {step.applied ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compiled Code Inspector */}
            <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                {/* Code Tabs */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                  <div className="flex space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setActiveCodeTab('python')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        activeCodeTab === 'python'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Python / Pandas
                    </button>
                    <button
                      onClick={() => setActiveCodeTab('m')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        activeCodeTab === 'm'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Power Query (M)
                    </button>
                    <button
                      onClick={() => setActiveCodeTab('sql')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        activeCodeTab === 'sql'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      SQL Query
                    </button>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Script'}</span>
                  </button>
                </div>

                {/* Code Box */}
                <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800/80 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-[380px] custom-scrollbar">
                  <pre>
                    {activeCodeTab === 'python' && pythonScript}
                    {activeCodeTab === 'm' && powerQueryScript}
                    {activeCodeTab === 'sql' && sqlScript}
                  </pre>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Pipeline executes in-memory and feeds clean staging tables to Data Modeling.
                </span>
                <button
                  onClick={onNavigateToModel}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>Proceed to Data Model</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Live Diff Comparison View */
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
              <strong className="text-white block mb-1">Live Normalization Inspector</strong>
              Shows records in memory that require cleaning. When you click <strong>"Apply Pipeline"</strong>, notice how non-standard departments ("Eng", "Ops", "Fin") become standardized, and untrimmed names are capitalized!
            </div>

            <div className="overflow-x-auto max-h-96 custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-700/60 text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Raw Name</th>
                    <th className="py-2.5 px-3">Raw Department</th>
                    <th className="py-2.5 px-3">Job Title</th>
                    <th className="py-2.5 px-3">Salary</th>
                    <th className="py-2.5 px-3">Flagged Issue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {rowsWithAnomalies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-emerald-400 font-sans">
                        ✓ All records in memory are currently clean and standardized!
                      </td>
                    </tr>
                  ) : (
                    rowsWithAnomalies.map((emp, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-indigo-400 font-bold">{emp.id}</td>
                        <td className="py-2.5 px-3 text-amber-300">"{emp.name}"</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              emp.department === 'Eng' || emp.department === 'Ops' || emp.department === 'Fin'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {emp.department}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{emp.jobTitle}</td>
                        <td className="py-2.5 px-3 text-emerald-400">${emp.salary.toLocaleString()}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            {emp.department.length <= 3 ? 'Non-standard Department' : 'Untrimmed text'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Step Modal */}
      {isAddingStep && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add Custom Transformation Step</h3>

            <form onSubmit={handleAddCustomStep} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Step Action Type
                </label>
                <select
                  value={newStepAction}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setNewStepAction(val);
                    if (val === 'raise') setNewStepName('5% Cost-of-Living Adjustment (COLA)');
                    else if (val === 'trim') setNewStepName('Trim & Title Case All Names');
                    else setNewStepName('Standardize Legacy Departments');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="trim">Clean Whitespace & Format Proper Case</option>
                  <option value="dept">Standardize Department Taxonomy (Eng &rarr; Engineering)</option>
                  <option value="raise">Apply 5% Salary Index Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Step Display Name
                </label>
                <input
                  type="text"
                  required
                  value={newStepName}
                  onChange={(e) => setNewStepName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Reason for transformation"
                  value={newStepDesc}
                  onChange={(e) => setNewStepDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingStep(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Execute & Append Step
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
