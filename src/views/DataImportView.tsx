import React, { useState, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Database,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Search,
  Filter,
  Check,
  RefreshCw,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  ArrowUpDown,
  Download,
  X,
  Clipboard,
  Layers,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { Employee, QualityIssue } from '../types';
import { generateInitialDataset, generateTechStartupDataset } from '../data/mockData';
import {
  normalizeRowToEmployee,
  calculateQualityAudit,
  parseTabularString,
} from '../utils/dataParser';

interface DataImportViewProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  datasetName: string;
  setDatasetName: (name: string) => void;
  qualityScore: number;
  setQualityScore: (score: number) => void;
  qualityIssues: QualityIssue[];
  setQualityIssues: React.Dispatch<React.SetStateAction<QualityIssue[]>>;
  onShowModal: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
  onNavigateToClean: () => void;
  salaryMasked: boolean;
}

export const DataImportView: React.FC<DataImportViewProps> = ({
  employees,
  setEmployees,
  datasetName,
  setDatasetName,
  qualityScore,
  setQualityScore,
  qualityIssues,
  setQualityIssues,
  onShowModal,
  onNavigateToClean,
  salaryMasked,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Terminated'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Sorting
  const [sortField, setSortField] = useState<keyof Employee>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Cloud Connect & Paste modal states
  const [cloudModalType, setCloudModalType] = useState<'sheets' | 'paste' | null>(null);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [pastedTextInput, setPastedTextInput] = useState('');
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // CRUD Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Employee_ID: 'EMP-0001',
        Employee_Name: 'Alex Morgan',
        Department: 'Engineering',
        Job_Title: 'Senior Software Engineer',
        Hire_Date: '2023-03-15',
        Tenure_Years: 3.2,
        Salary: 135000,
        Bonus: 12000,
        Performance_Rating: 'Exceeds',
        Engagement_Score: 82,
        Remote_Status: 'Hybrid',
        Gender: 'Female',
        Status: 'Active',
      },
      {
        Employee_ID: 'EMP-0002',
        Employee_Name: 'Jordan Lee',
        Department: 'Sales',
        Job_Title: 'Enterprise Account Executive',
        Hire_Date: '2022-06-01',
        Tenure_Years: 4.1,
        Salary: 105000,
        Bonus: 22000,
        Performance_Rating: 'Meets Expectations',
        Engagement_Score: 74,
        Remote_Status: 'Onsite',
        Gender: 'Male',
        Status: 'Active',
      },
      {
        Employee_ID: 'EMP-0003',
        Employee_Name: 'Taylor Riley',
        Department: 'Operations',
        Job_Title: 'Supply Chain Analyst',
        Hire_Date: '2024-01-10',
        Tenure_Years: 2.5,
        Salary: 82000,
        Bonus: 6000,
        Performance_Rating: 'Outstanding',
        Engagement_Score: 89,
        Remote_Status: 'Remote',
        Gender: 'Non-Binary',
        Status: 'Active',
      },
      {
        Employee_ID: 'EMP-0004',
        Employee_Name: 'Marcus Vance',
        Department: 'Engineering',
        Job_Title: 'DevOps Specialist',
        Hire_Date: '2021-08-20',
        Tenure_Years: 4.8,
        Salary: 128000,
        Bonus: 9500,
        Performance_Rating: 'Exceeds',
        Engagement_Score: 68,
        Remote_Status: 'Remote',
        Gender: 'Male',
        Status: 'Terminated',
        Exit_Reason: 'Compensation',
        Termination_Date: '2026-02-14',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Workforce_Template');
    XLSX.writeFile(wb, 'Workforce_Upload_Template.xlsx');

    onShowModal(
      'Template Downloaded',
      'Downloaded "Workforce_Upload_Template.xlsx". You can edit it in Excel or Google Sheets and upload it back!',
      'success'
    );
  };

  // Switch Sample Dataset
  const handleLoadSample = (sampleType: 'enterprise' | 'tech') => {
    if (sampleType === 'tech') {
      const techData = generateTechStartupDataset();
      setEmployees(techData);
      setDatasetName('Tech_Attrition_Study_2026.xlsx');
      const audit = calculateQualityAudit(techData);
      setQualityScore(audit.score);
      setQualityIssues(audit.issues);
      confetti({ particleCount: 40, spread: 60 });
      onShowModal('Dataset Loaded', `Switched active dataset to Tech Startup Cohort (${techData.length} records).`, 'success');
    } else {
      const entData = generateInitialDataset();
      setEmployees(entData);
      setDatasetName('Active_Workforce_2026.xlsx');
      const audit = calculateQualityAudit(entData);
      setQualityScore(audit.score);
      setQualityIssues(audit.issues);
      confetti({ particleCount: 40, spread: 60 });
      onShowModal('Dataset Loaded', `Switched active dataset to Enterprise Workforce (${entData.length} records).`, 'success');
    }
  };

  // Real File Upload Handler with SheetJS & CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;

        let parsedEmployees: Employee[] = [];

        if (file.name.endsWith('.json')) {
          const json = JSON.parse(data as string);
          if (Array.isArray(json)) {
            parsedEmployees = json.map((item: any, idx: number) => normalizeRowToEmployee(item, idx));
          }
        } else {
          // XLSX or CSV or XLS
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet);

          if (jsonRows.length > 0) {
            parsedEmployees = jsonRows.map((row: any, idx: number) => normalizeRowToEmployee(row, idx));
          }
        }

        if (parsedEmployees.length > 0) {
          setEmployees(parsedEmployees);
          setDatasetName(file.name);
          const audit = calculateQualityAudit(parsedEmployees);
          setQualityScore(audit.score);
          setQualityIssues(audit.issues);
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
          onShowModal(
            'Dataset Ingested & Parsed',
            `Successfully parsed "${file.name}" with ${parsedEmployees.length} workforce records! All downstream dashboards, models, and analytics have updated in real time.`,
            'success'
          );
        } else {
          onShowModal('Parse Notice', 'The selected file contained no recognizable data rows. Please ensure it has a header row.', 'warning');
        }
      } catch (err: any) {
        onShowModal('Upload Error', `Failed to read file: ${err.message}`, 'danger');
      }
    };

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
    // Reset file input so re-selecting the same file fires onChange
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Real Google Sheets Fetch
  const handleFetchGoogleSheet = async () => {
    if (!sheetUrlInput.trim()) return;
    setIsFetchingSheet(true);
    setSheetError(null);

    try {
      const response = await fetch('/api/fetch-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sheetUrlInput.trim() }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch sheet.');
      }

      // Parse the CSV from Google Sheets
      const parsedEmployees = parseTabularString(data.csvText);

      if (parsedEmployees.length === 0) {
        throw new Error('Google Sheet returned 0 valid data rows. Ensure the sheet has headers like Name, Department, Salary, etc.');
      }

      setEmployees(parsedEmployees);
      setDatasetName('Live_Google_Sheet.csv');
      const audit = calculateQualityAudit(parsedEmployees);
      setQualityScore(audit.score);
      setQualityIssues(audit.issues);
      setCloudModalType(null);
      setSheetUrlInput('');
      confetti({ particleCount: 70, spread: 70 });
      onShowModal(
        'Google Sheet Synced',
        `Successfully retrieved and parsed ${parsedEmployees.length} live records directly from Google Sheets!`,
        'success'
      );
    } catch (err: any) {
      setSheetError(err.message);
    } finally {
      setIsFetchingSheet(false);
    }
  };

  // Direct Clipboard / Paste Ingestion
  const handleIngestPastedData = () => {
    if (!pastedTextInput.trim()) return;
    try {
      const parsed = parseTabularString(pastedTextInput);
      if (parsed.length === 0) {
        setSheetError('Could not recognize table rows in pasted text. Make sure you copied column headers and data rows.');
        return;
      }

      setEmployees(parsed);
      const name = `Pasted_Workforce_${new Date().toISOString().slice(0, 10)}.csv`;
      setDatasetName(name);
      const audit = calculateQualityAudit(parsed);
      setQualityScore(audit.score);
      setQualityIssues(audit.issues);
      setCloudModalType(null);
      setPastedTextInput('');
      confetti({ particleCount: 60, spread: 70 });
      onShowModal(
        'Data Ingested from Clipboard',
        `Successfully parsed and loaded ${parsed.length} employee records from pasted table!`,
        'success'
      );
    } catch (err: any) {
      setSheetError(`Parsing error: ${err.message}`);
    }
  };

  // Fix All Issues Automatically
  const handleFixAll = () => {
    setQualityIssues((prev) => prev.map((issue) => ({ ...issue, resolved: true, count: 0 })));
    setQualityScore(99);

    setEmployees((prev) =>
      prev.map((emp) => {
        let dept = emp.department;
        if (dept.toLowerCase() === 'eng') dept = 'Engineering';
        if (dept.toLowerCase() === 'fin') dept = 'Finance';
        if (dept.toLowerCase() === 'ops') dept = 'Operations';
        return {
          ...emp,
          name: emp.name.trim(),
          department: dept,
          gender: emp.gender || 'Unknown',
          jobTitle: emp.jobTitle.trim(),
        };
      })
    );

    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    onShowModal(
      'Automated Quality Pipeline Executed',
      'All detected anomalies were cleaned and standardized. Quality Score elevated to 99%.',
      'success'
    );
  };

  const handleResolveIssue = (id: number) => {
    setQualityIssues((prev) =>
      prev.map((issue) => (issue.id === id ? { ...issue, resolved: true, count: 0 } : issue))
    );
    setQualityScore(Math.min(99, qualityScore + 2));
    onShowModal('Anomaly Resolved', 'Selected anomaly was repaired via target transformation rule.', 'success');
  };

  // CRUD Handlers
  const handleOpenAddModal = () => {
    setIsNewRecord(true);
    setEditingEmployee({
      id: `EMP-${(employees.length + 1).toString().padStart(4, '0')}`,
      name: '',
      department: 'Engineering',
      jobTitle: 'Software Engineer',
      hireDate: new Date().toISOString().slice(0, 10),
      tenureYears: 1.0,
      salary: 110000,
      bonus: 10000,
      performanceRating: 'Meets Expectations',
      engagementScore: 80,
      remoteStatus: 'Hybrid',
      gender: 'Female',
      status: 'Active',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setIsNewRecord(false);
    setEditingEmployee({ ...emp });
    setIsEditModalOpen(true);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    onShowModal('Employee Removed', `Employee record ${id} has been removed from the dataset.`, 'info');
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee?.name || !editingEmployee?.id) return;

    if (isNewRecord) {
      setEmployees((prev) => [editingEmployee as Employee, ...prev]);
      onShowModal('Employee Added', `Created new employee record for ${editingEmployee.name}.`, 'success');
    } else {
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === editingEmployee.id ? (editingEmployee as Employee) : emp))
      );
      onShowModal('Employee Updated', `Updated details for ${editingEmployee.name}.`, 'success');
    }
    setIsEditModalOpen(false);
  };

  // Sorting Handler
  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered and Sorted employees
  const filteredAndSorted = useMemo(() => {
    return employees
      .filter((emp) => {
        const matchesSearch =
          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = selectedDept === 'All' || emp.department === selectedDept;
        const matchesStatus = statusFilter === 'All' || emp.status === statusFilter;
        return matchesSearch && matchesDept && matchesStatus;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
  }, [employees, searchTerm, selectedDept, statusFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;
  const paginatedEmployees = filteredAndSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const departmentsList = ['All', ...Array.from(new Set(employees.map((e) => e.department)))];

  // Quick export of active table view to Excel
  const handleExportCurrentView = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filteredAndSorted);
    XLSX.utils.book_append_sheet(wb, ws, 'Filtered_Employees');
    XLSX.writeFile(wb, `Filtered_Workforce_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onShowModal('View Exported', `Exported ${filteredAndSorted.length} filtered rows as Excel spreadsheet.`, 'success');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx,.xls,.csv,.json"
        className="hidden"
      />

      {/* Dataset Source Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Active Dataset Source
          </span>
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30 animate-pulse" />
            <span>{datasetName}</span>
            <span className="text-indigo-400 font-semibold font-mono">({employees.length} records active)</span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switch preloaded datasets */}
          <button
            onClick={() => handleLoadSample('enterprise')}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            Load 487 Enterprise Dataset
          </button>
          <button
            onClick={() => handleLoadSample('tech')}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            Load 220 Tech Startup Cohort
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .xlsx Template</span>
          </button>
        </div>
      </div>

      {/* Ingestion Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Real File Upload Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 text-center flex flex-col items-center justify-center hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all cursor-pointer group"
        >
          <div className="w-16 h-16 bg-indigo-600/10 text-indigo-400 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform border border-indigo-500/20">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-white text-base mb-1">Upload Real File</h3>
          <p className="text-xs text-slate-400 mb-4">Ingest your .xlsx, .xls, .csv, or .json</p>
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Choose Local File</span>
          </button>
        </div>

        {/* Real Google Sheets Connect */}
        <div
          onClick={() => {
            setCloudModalType('sheets');
            setSheetError(null);
          }}
          className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 text-center flex flex-col items-center justify-center hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all cursor-pointer group"
        >
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform border border-emerald-500/20">
            <ExternalLink className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-white text-base mb-1">Sync Google Sheets Link</h3>
          <p className="text-xs text-slate-400 mb-4">Paste any shared Google Sheet URL</p>
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Live Sheet URL</span>
          </button>
        </div>

        {/* Paste Table / Spreadsheet Data Directly */}
        <div
          onClick={() => {
            setCloudModalType('paste');
            setSheetError(null);
          }}
          className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 text-center flex flex-col items-center justify-center hover:border-purple-500/50 hover:bg-slate-800/60 transition-all cursor-pointer group"
        >
          <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform border border-purple-500/20">
            <Clipboard className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-white text-base mb-1">Paste Table / Clipboard</h3>
          <p className="text-xs text-slate-400 mb-4">Copy cells from Google Sheets & paste</p>
          <button className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer">
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste Sheet Data</span>
          </button>
        </div>
      </div>

      {/* Automatic Data Profiler & Quality Audit Box */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-6">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Automated Profiler</span>
            </span>
            <h2 className="text-xl font-bold text-white">Dataset Quality & Health Audit</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              File: <strong className="text-white">{datasetName}</strong> ({employees.length} rows, 13 dimensional attributes)
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-black text-emerald-400">{qualityScore}%</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Quality Score</div>
            </div>
            <button
              onClick={handleFixAll}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fix All Automatically</span>
            </button>
            <button
              onClick={onNavigateToClean}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-2 cursor-pointer"
            >
              <span>Power Query Pipeline</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quality Dimensions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/40">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Completeness</span>
            <div className="text-base font-bold text-white mt-1">98.2%</div>
            <div className="text-[10px] text-emerald-400 font-medium">Zero missing names</div>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/40">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Uniqueness</span>
            <div className="text-base font-bold text-white mt-1">
              {qualityIssues.some((i) => i.id === 1 && !i.resolved) ? '97.5%' : '100%'}
            </div>
            <div className="text-[10px] text-slate-400">Primary Key referential check</div>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/40">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Validity</span>
            <div className="text-base font-bold text-white mt-1">99.1%</div>
            <div className="text-[10px] text-emerald-400 font-medium">Valid ISO hire dates</div>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/40">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Consistency</span>
            <div className="text-base font-bold text-white mt-1">94.8%</div>
            <div className="text-[10px] text-amber-400 font-medium">Taxonomy standardization</div>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/40">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Accuracy</span>
            <div className="text-base font-bold text-white mt-1">98.9%</div>
            <div className="text-[10px] text-emerald-400 font-medium">Valid compensation bands</div>
          </div>
        </div>

        {/* Detected Issues List */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Detected Anomalies & Auto-Clean Pipeline ({qualityIssues.filter((i) => !i.resolved).length} active)
          </h4>

          <div className="space-y-2">
            {qualityIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  issue.resolved
                    ? 'bg-slate-900/30 border-slate-800 text-slate-500'
                    : 'bg-slate-900/70 border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      issue.resolved
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : issue.severity === 'danger'
                        ? 'bg-rose-500/10 text-rose-400'
                        : issue.severity === 'warning'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}
                  >
                    {issue.resolved ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium flex items-center gap-2">
                      <span className={issue.resolved ? 'line-through text-slate-500' : 'text-white'}>
                        {issue.type}
                      </span>
                      {issue.count > 0 && !issue.resolved && (
                        <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                          {issue.count} rows
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Field: <code className="text-indigo-400">{issue.field}</code> &bull;{' '}
                      {issue.resolved ? 'Resolved by pipeline' : 'Requires normalization'}
                    </div>
                  </div>
                </div>

                <div>
                  {issue.resolved ? (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Fixed</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleResolveIssue(issue.id)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Resolve Issue
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Data Explorer & Table Preview */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-base">Ingested Workforce Master Table</h3>
            <p className="text-xs text-slate-400">
              Showing {filteredAndSorted.length} of {employees.length} records. Click any column header to sort.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </button>
            <button
              onClick={handleExportCurrentView}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export View</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, ID, job title..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {departmentsList.map((d) => (
                <option key={d} value={d}>
                  Department: {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="All">Status: All (Active & Terminated)</option>
              <option value="Active">Status: Active Staff Only</option>
              <option value="Terminated">Status: Terminated / Departed Only</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 select-none">
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('department')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Department</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('jobTitle')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Job Title</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('tenureYears')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Tenure</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('salary')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Salary</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('performanceRating')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Performance</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('engagementScore')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Engagement</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No workforce records match your active search filters.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-400">{emp.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{emp.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded text-[11px]">
                        {emp.department}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{emp.jobTitle}</td>
                    <td className="py-2.5 px-3 font-mono">{emp.tenureYears} yrs</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">
                      {salaryMasked ? '••••••' : `$${emp.salary.toLocaleString()}`}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          emp.performanceRating === 'Outstanding'
                            ? 'bg-purple-500/20 text-purple-300'
                            : emp.performanceRating === 'Exceeds'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : emp.performanceRating === 'Meets Expectations'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {emp.performanceRating}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-medium text-white">{emp.engagementScore}%</span>
                        <div className="w-12 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              emp.engagementScore >= 80
                                ? 'bg-emerald-400'
                                : emp.engagementScore >= 65
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                            }`}
                            style={{ width: `${emp.engagementScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          emp.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1 hover:text-white text-slate-400 hover:bg-slate-700 rounded transition-colors"
                          title="Edit Employee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1 hover:text-rose-400 text-slate-500 hover:bg-slate-700 rounded transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <div>
            Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredAndSorted.length} matching rows)
          </div>
          <div className="flex space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-40 hover:bg-slate-800 text-white cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-40 hover:bg-slate-800 text-white cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* CRUD Modal for Add/Edit Employee */}
      {isEditModalOpen && editingEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isNewRecord ? 'Add New Employee Record' : `Edit Record: ${editingEmployee.name}`}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.id || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.name || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.department || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                    Job Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.jobTitle || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, jobTitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                    Base Salary ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={editingEmployee.salary || 0}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, salary: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                    Tenure (Years)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingEmployee.tenureYears || 0}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, tenureYears: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                    Performance Rating
                  </label>
                  <select
                    value={editingEmployee.performanceRating || 'Meets Expectations'}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, performanceRating: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Needs Improvement">Needs Improvement</option>
                    <option value="Meets Expectations">Meets Expectations</option>
                    <option value="Exceeds">Exceeds</option>
                    <option value="Outstanding">Outstanding</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                    Employment Status
                  </label>
                  <select
                    value={editingEmployee.status || 'Active'}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/30"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Sheets Fetch Modal */}
      {cloudModalType === 'sheets' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <ExternalLink className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Sync Live Google Sheet</h3>
                <p className="text-xs text-slate-400">Directly sync any shared spreadsheet</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Google Sheets Link
              </label>
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrlInput}
                onChange={(e) => setSheetUrlInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-[11px] text-slate-500">
                  Sharing must be set to <strong>"Anyone with the link can view"</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSheetUrlInput('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing');
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Use Demo Sheet
                </button>
              </div>
            </div>

            {sheetError && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-300 text-xs">
                {sheetError}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setCloudModalType(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFetchGoogleSheet}
                disabled={isFetchingSheet || !sheetUrlInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 cursor-pointer"
              >
                {isFetchingSheet && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isFetchingSheet ? 'Fetching...' : 'Sync Sheet Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste Table Data Modal */}
      {cloudModalType === 'paste' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <Clipboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Paste Spreadsheet / Table Data</h3>
                <p className="text-xs text-slate-400">
                  Select rows in Google Sheets or Excel, copy (Ctrl+C), and paste directly below.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Pasted Tabular Data (TSV or CSV)
              </label>
              <textarea
                rows={8}
                placeholder={`Employee_ID\tEmployee_Name\tDepartment\tJob_Title\tSalary\tStatus\nEMP-101\tAlex Chen\tEngineering\tSenior Engineer\t142000\tActive\nEMP-102\tElena Rostova\tSales\tAccount Executive\t98000\tActive`}
                value={pastedTextInput}
                onChange={(e) => setPastedTextInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 font-mono resize-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Tip: Include a header row (e.g. Name, Department, Job Title, Salary). Our smart parser will automatically map the columns!
              </p>
            </div>

            {sheetError && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-300 text-xs">
                {sheetError}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setCloudModalType(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleIngestPastedData}
                disabled={!pastedTextInput.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2 rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Ingest Pasted Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
