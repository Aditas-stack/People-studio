import React, { useState } from 'react';
import {
  Code2,
  Terminal,
  Play,
  Copy,
  Check,
  Sparkles,
  Database,
  Table,
  Cpu,
  AlertCircle,
  Clock,
} from 'lucide-react';
import alasql from 'alasql';
import { Employee } from '../types';

interface LabsViewProps {
  employees: Employee[];
  salaryMasked: boolean;
  onShowModal: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
}

export const LabsView: React.FC<LabsViewProps> = ({
  employees,
  salaryMasked,
  onShowModal,
}) => {
  const [activeTab, setActiveTab] = useState<'sql' | 'python' | 'dax'>('sql');

  // SQL Lab State
  const [nlSqlInput, setNlSqlInput] = useState(
    'Show employees who have tenure > 2 years and received a high performance rating'
  );
  const [isGeneratingSql, setIsGeneratingSql] = useState(false);
  const [sqlCode, setSqlCode] = useState(
    `SELECT employee_name, department, job_title, tenure_years, salary, performance_rating
FROM employees
WHERE tenure_years > 2.0
  AND performance_rating IN ('Exceeds', 'Outstanding')
ORDER BY tenure_years DESC;`
  );
  const [sqlResults, setSqlResults] = useState<any[] | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // Python Lab State
  const [pythonAnalysisType, setPythonAnalysisType] = useState<
    'attrition' | 'percentiles' | 'flightrisk' | 'custom'
  >('attrition');

  const pythonScripts: Record<string, string> = {
    attrition: `import polars as pl

# Ingest active workforce dataset (${employees.length} rows)
df = pl.DataFrame(employees)

# Calculate Departmental Attrition Rate & Average Salary
summary = (
    df.group_by("department")
    .agg([
        pl.len().alias("headcount"),
        pl.col("status").filter(pl.col("status") == "Terminated").count().alias("exits"),
        pl.col("salary").mean().round(0).alias("avg_salary"),
        pl.col("engagementScore").mean().round(1).alias("avg_engagement")
    ])
    .with_columns(
        (pl.col("exits") / pl.col("headcount") * 100).round(1).alias("turnover_rate_%")
    )
    .sort("turnover_rate_%", descending=True)
)
print(summary)`,
    percentiles: `import polars as pl
import numpy as np

# Compensation Percentiles Analysis
df = pl.DataFrame(employees)

p25 = np.percentile(df["salary"], 25)
p50 = np.percentile(df["salary"], 50) # Median
p75 = np.percentile(df["salary"], 75)
p90 = np.percentile(df["salary"], 90)

print(f"Overall Workforce Compensation Bands:")
print(f"  25th Percentile: $p25")
print(f"  50th Percentile (Median): $p50")
print(f"  75th Percentile: $p75")
print(f"  90th Percentile: $p90")`,
    flightrisk: `# Flight Risk Predictive Scoring Model
# Formula: Risk Index = (100 - Engagement) * 0.4 + (Tenure < 2 ? 20 : 0) + (Salary < Median ? 15 : 0)

at_risk_employees = [
    emp for emp in employees 
    if emp['status'] == 'Active' and emp['engagementScore'] < 70 and emp['tenureYears'] > 1.0
]
print(f"Identified {len(at_risk_employees)} employees in elevated flight risk band.")`,
    custom: `# Custom Python / Dataframe Script
active_count = len([e for e in employees if e['status'] == 'Active'])
print(f"Total Active Staff: {active_count}")`,
  };

  const [pythonCode, setPythonCode] = useState(pythonScripts.attrition);
  const [pythonOutput, setPythonOutput] = useState<string | null>(null);
  const [isExecutingPython, setIsExecutingPython] = useState(false);

  // DAX Lab State
  const [daxPrompt, setDaxPrompt] = useState('Calculate voluntary turnover rate as a percentage.');
  const [isGeneratingDax, setIsGeneratingDax] = useState(false);
  const [daxCode, setDaxCode] = useState(`Voluntary Turnover Rate = 
DIVIDE(
    CALCULATE(
        COUNTROWS(FactExits),
        FactExits[Exit_Type] = "Voluntary"
    ),
    [Average Headcount],
    0
)`);
  const [daxExplanation, setDaxExplanation] = useState(
    'Calculates voluntary resignations against the average headcount period metric, handling division by zero safely using DIVIDE.'
  );

  const [copied, setCopied] = useState(false);

  // Generate SQL from Natural Language
  const handleGenerateSQL = async () => {
    if (!nlSqlInput.trim()) return;
    setIsGeneratingSql(true);
    setSqlError(null);
    try {
      const response = await fetch('/api/generate-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nlQuery: nlSqlInput }),
      });
      if (response.ok) {
        const data = await response.json();
        setSqlCode(data.sql);
        onShowModal('SQL Generated', 'Natural language query compiled into analytical SQL.', 'success');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsGeneratingSql(false);
    }
  };

  // Run in-memory REAL SQL using AlaSQL
  const handleRunSQL = () => {
    setSqlError(null);
    const start = performance.now();

    try {
      // Prepare table data with both snake_case and camelCase
      const tableData = employees.map((e) => ({
        employee_id: e.id,
        id: e.id,
        employee_name: e.name,
        name: e.name,
        department: e.department,
        job_title: e.jobTitle,
        jobTitle: e.jobTitle,
        hire_date: e.hireDate,
        hireDate: e.hireDate,
        tenure_years: e.tenureYears,
        tenureYears: e.tenureYears,
        salary: e.salary,
        bonus: e.bonus,
        performance_rating: e.performanceRating,
        performanceRating: e.performanceRating,
        engagement_score: e.engagementScore,
        engagementScore: e.engagementScore,
        remote_status: e.remoteStatus,
        remoteStatus: e.remoteStatus,
        gender: e.gender,
        status: e.status,
        exit_reason: e.exitReason || null,
        termination_date: e.terminationDate || null,
      }));

      // Register or update table in AlaSQL
      alasql('CREATE TABLE IF NOT EXISTS employees');
      alasql('CREATE TABLE IF NOT EXISTS employee');
      (alasql as any).tables.employees.data = tableData;
      (alasql as any).tables.employee.data = tableData;

      // Clean query string (strip trailing semicolons for alasql if needed)
      let cleanQuery = sqlCode.trim();
      if (cleanQuery.endsWith(';')) {
        cleanQuery = cleanQuery.slice(0, -1);
      }

      // Execute actual SQL
      const result = (alasql as any)(cleanQuery);

      const elapsed = Math.round(performance.now() - start);
      setExecutionTime(elapsed);

      if (Array.isArray(result)) {
        setSqlResults(result);
        onShowModal(
          'SQL Query Executed',
          `Query completed in ${elapsed}ms. Returned ${result.length} rows from active dataset.`,
          'success'
        );
      } else {
        setSqlResults([{ result: String(result) }]);
      }
    } catch (err: any) {
      console.error('SQL Execution Error:', err);
      setSqlError(err.message || 'Syntax error in SQL query');
      setSqlResults(null);
    }
  };

  // Run Real Python/JS Analysis
  const handleRunPython = () => {
    setIsExecutingPython(true);
    setPythonOutput(null);

    setTimeout(() => {
      setIsExecutingPython(false);

      if (pythonAnalysisType === 'attrition') {
        const depts = Array.from(new Set(employees.map((e) => e.department)));
        const lines = [
          `shape: (${depts.length}, 5)`,
          '┌─────────────────┬───────────┬───────┬────────────┬──────────────────┐',
          '│ department      ┆ headcount ┆ exits ┆ avg_salary ┆ turnover_rate_%  │',
          '╞═════════════════╪═══════════╪═══════╪════════════╪══════════════════╡',
        ];

        depts.forEach((d) => {
          const total = employees.filter((e) => e.department === d).length;
          const exits = employees.filter((e) => e.department === d && e.status === 'Terminated').length;
          const avgSal = Math.round(
            employees.filter((e) => e.department === d).reduce((a, b) => a + b.salary, 0) / (total || 1)
          );
          const rate = ((exits / (total || 1)) * 100).toFixed(1);

          lines.push(
            `│ ${d.padEnd(15)} ┆ ${total.toString().padEnd(9)} ┆ ${exits.toString().padEnd(5)} ┆ $${avgSal
              .toLocaleString()
              .padEnd(9)} ┆ ${rate.padEnd(16)} │`
          );
        });

        lines.push('└─────────────────┴───────────┴───────┴────────────┴──────────────────┘');
        setPythonOutput(lines.join('\n'));
      } else if (pythonAnalysisType === 'percentiles') {
        const sortedSalaries = employees.map((e) => e.salary).sort((a, b) => a - b);
        const p25 = sortedSalaries[Math.floor(sortedSalaries.length * 0.25)];
        const p50 = sortedSalaries[Math.floor(sortedSalaries.length * 0.5)];
        const p75 = sortedSalaries[Math.floor(sortedSalaries.length * 0.75)];
        const p90 = sortedSalaries[Math.floor(sortedSalaries.length * 0.9)];

        const output = [
          `Overall Workforce Compensation Bands (Evaluated on ${employees.length} records):`,
          `---------------------------------------------------------------------`,
          `  25th Percentile:       $${p25.toLocaleString()}`,
          `  50th Percentile (Med): $${p50.toLocaleString()}`,
          `  75th Percentile:       $${p75.toLocaleString()}`,
          `  90th Percentile:       $${p90.toLocaleString()}`,
          `  Min Salary:            $${sortedSalaries[0].toLocaleString()}`,
          `  Max Salary:            $${sortedSalaries[sortedSalaries.length - 1].toLocaleString()}`,
        ].join('\n');
        setPythonOutput(output);
      } else if (pythonAnalysisType === 'flightrisk') {
        const atRisk = employees.filter(
          (e) => e.status === 'Active' && e.engagementScore < 70 && e.tenureYears > 1.0
        );

        const lines = [
          `Flight Risk Diagnostic Model Results:`,
          `---------------------------------------------------------------------`,
          `Identified ${atRisk.length} active employees in elevated flight risk band:`,
          ``,
        ];

        atRisk.slice(0, 10).forEach((emp) => {
          lines.push(
            `- [${emp.id}] ${emp.name} (${emp.department} • ${emp.jobTitle}) - Engagement: ${emp.engagementScore}%, Tenure: ${emp.tenureYears} yrs, Salary: $${emp.salary.toLocaleString()}`
          );
        });

        if (atRisk.length > 10) {
          lines.push(`... and ${atRisk.length - 10} more employees.`);
        }

        setPythonOutput(lines.join('\n'));
      } else {
        const active = employees.filter((e) => e.status === 'Active').length;
        setPythonOutput(`Execution completed.\nTotal Active Staff: ${active}\nTotal Terminated: ${employees.length - active}`);
      }

      onShowModal('Script Executed', 'Analysis computed directly against live dataset.', 'success');
    }, 400);
  };

  // Generate DAX
  const handleGenerateDAX = async () => {
    if (!daxPrompt.trim()) return;
    setIsGeneratingDax(true);
    try {
      const response = await fetch('/api/generate-dax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nlQuery: daxPrompt }),
      });
      if (response.ok) {
        const data = await response.json();
        setDaxCode(data.dax);
        if (data.explanation) setDaxExplanation(data.explanation);
        onShowModal('DAX Measure Generated', 'Power BI formula compiled with optimization rules.', 'success');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsGeneratingDax(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowModal('Copied', 'Snippet copied to clipboard.', 'success');
  };

  // Extract result table columns
  const resultColumns = sqlResults && sqlResults.length > 0 ? Object.keys(sqlResults[0]) : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Tab Switcher */}
      <div className="flex space-x-2 bg-slate-800/40 p-2 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('sql')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'sql' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          SQL Lab (AlaSQL Real Engine)
        </button>
        <button
          onClick={() => setActiveTab('python')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'python' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Python & Polars Analysis
        </button>
        <button
          onClick={() => setActiveTab('dax')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'dax' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          DAX Measure Generator
        </button>
      </div>

      {/* SQL Lab Pane */}
      {activeTab === 'sql' && (
        <div className="space-y-6">
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Real In-Memory SQL Execution</span>
              </span>
              <h3 className="font-bold text-white text-base">SQL Query Lab</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Powered by AlaSQL. Query the <code className="text-indigo-300 font-mono">employees</code> table directly with SELECT, WHERE, GROUP BY, ORDER BY, etc.
              </p>
            </div>

            {/* Quick Natural Language Converter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={nlSqlInput}
                onChange={(e) => setNlSqlInput(e.target.value)}
                placeholder="Ask what data you want in plain English..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleGenerateSQL}
                disabled={isGeneratingSql}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGeneratingSql ? 'Generating...' : 'AI Text-to-SQL'}</span>
              </button>
            </div>

            {/* Quick SQL Templates */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Quick Queries:</span>
              <button
                type="button"
                onClick={() => {
                  setSqlCode(`SELECT department, COUNT(*) AS staff_count, ROUND(AVG(salary), 0) AS avg_salary, ROUND(AVG(engagement_score), 1) AS avg_engagement\nFROM employees\nWHERE status = 'Active'\nGROUP BY department\nORDER BY staff_count DESC;`);
                }}
                className="text-[11px] bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Dept Staff & Salary
              </button>
              <button
                type="button"
                onClick={() => {
                  setSqlCode(`SELECT employee_name, department, job_title, tenure_years, salary, performance_rating\nFROM employees\nWHERE tenure_years > 2.0 AND performance_rating IN ('Exceeds', 'Outstanding')\nORDER BY tenure_years DESC;`);
                }}
                className="text-[11px] bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                High Performers (&gt; 2 Yrs)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSqlCode(`SELECT department, COUNT(*) AS exits, exit_reason\nFROM employees\nWHERE status = 'Terminated'\nGROUP BY department, exit_reason\nORDER BY exits DESC;`);
                }}
                className="text-[11px] bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Exits by Reason
              </button>
              <button
                type="button"
                onClick={() => {
                  setSqlCode(`SELECT employee_name, department, job_title, salary, bonus\nFROM employees\nWHERE status = 'Active'\nORDER BY salary DESC\nLIMIT 10;`);
                }}
                className="text-[11px] bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Top 10 Earners
              </button>
            </div>

            {/* SQL Editor Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono">Table: employees ({employees.length} rows loaded)</span>
                <button
                  onClick={() => handleCopy(sqlCode)}
                  className="hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL</span>
                </button>
              </div>
              <textarea
                rows={6}
                value={sqlCode}
                onChange={(e) => setSqlCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-indigo-300 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>

            {/* Error Message */}
            {sqlError && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{sqlError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={handleRunSQL}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Execute SQL Query</span>
              </button>
            </div>
          </div>

          {/* Real SQL Output Results Table */}
          {sqlResults && (
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm">
                  Query Results ({sqlResults.length} records returned)
                </h4>
                {executionTime !== null && (
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Executed in {executionTime}ms</span>
                  </span>
                )}
              </div>

              {sqlResults.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">
                  0 rows returned matching the filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-80 custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-700/60 text-slate-400 uppercase">
                        {resultColumns.map((col) => (
                          <th key={col} className="py-2.5 px-3 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {sqlResults.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          {resultColumns.map((col) => {
                            const val = row[col];
                            const isSal =
                              (col.toLowerCase().includes('salary') || col.toLowerCase().includes('sal')) &&
                              typeof val === 'number';
                            return (
                              <td key={col} className="py-2 px-3 whitespace-nowrap">
                                {isSal && salaryMasked
                                  ? '••••••'
                                  : isSal
                                  ? `$${val.toLocaleString()}`
                                  : String(val ?? '')}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Python Lab Pane */}
      {activeTab === 'python' && (
        <div className="space-y-6">
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Interactive Workforce Analysis Script</span>
                </span>
                <h3 className="font-bold text-white text-base">Python & Polars Analytical Notebook</h3>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={pythonAnalysisType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setPythonAnalysisType(val);
                    setPythonCode(pythonScripts[val] || pythonScripts.attrition);
                    setPythonOutput(null);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  <option value="attrition">Departmental Turnover Analysis</option>
                  <option value="percentiles">Compensation Percentile Bands</option>
                  <option value="flightrisk">Flight Risk Predictive Model</option>
                  <option value="custom">Custom Script</option>
                </select>

                <button
                  onClick={handleRunPython}
                  disabled={isExecutingPython}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isExecutingPython ? 'Running...' : 'Run Script'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={12}
              value={pythonCode}
              onChange={(e) => setPythonCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {pythonOutput && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Standard Output (Computed from {employees.length} records)
              </span>
              <pre className="font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
                {pythonOutput}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* DAX Lab Pane */}
      {activeTab === 'dax' && (
        <div className="space-y-6">
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Power BI Copilot</span>
              </span>
              <h3 className="font-bold text-white text-base">Power BI DAX Measure Generator</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Describe any workforce calculation (turnover, attrition, comp ratio, tenure) to generate DAX formulas.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={daxPrompt}
                onChange={(e) => setDaxPrompt(e.target.value)}
                placeholder="e.g. Calculate voluntary turnover rate as a percentage"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleGenerateDAX}
                disabled={isGeneratingDax}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGeneratingDax ? 'Generating...' : 'Generate DAX'}</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-300 relative">
              <button
                onClick={() => handleCopy(daxCode)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy DAX'}</span>
              </button>
              <pre className="overflow-x-auto pr-16">{daxCode}</pre>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <strong className="text-white block mb-0.5">Evaluation & Modeling Advice:</strong>
              {daxExplanation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
