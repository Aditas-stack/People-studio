import React from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle2,
  Sparkles,
  Printer,
  Table,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee } from '../types';

interface ExportViewProps {
  employees: Employee[];
  datasetName: string;
  onShowModal: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
}

export const ExportView: React.FC<ExportViewProps> = ({
  employees,
  datasetName,
  onShowModal,
}) => {
  // Export real multi-tab Excel Workbook using SheetJS
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Active Workforce
      const workforceData = employees.map((e) => ({
        'Employee ID': e.id,
        'Full Name': e.name,
        Department: e.department,
        'Job Title': e.jobTitle,
        'Hire Date': e.hireDate,
        'Tenure (Years)': e.tenureYears,
        'Base Salary ($)': e.salary,
        'Bonus ($)': e.bonus,
        Performance: e.performanceRating,
        'Engagement Score': e.engagementScore,
        'Work Model': e.remoteStatus,
        Status: e.status,
        'Exit Reason': e.exitReason || 'N/A',
      }));
      const ws1 = XLSX.utils.json_to_sheet(workforceData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Cleaned_Workforce');

      // Sheet 2: Department Summary KPI
      const depts = Array.from(new Set(employees.map((e) => e.department)));
      const deptSummary = depts.map((d) => {
        const dStaff = employees.filter((e) => e.department === d);
        const exits = dStaff.filter((e) => e.status === 'Terminated').length;
        const avgSal = Math.round(dStaff.reduce((a, b) => a + b.salary, 0) / dStaff.length);
        const avgEng = Math.round(dStaff.reduce((a, b) => a + b.engagementScore, 0) / dStaff.length);
        return {
          Department: d,
          'Total Headcount': dStaff.length,
          'Active Staff': dStaff.filter((e) => e.status === 'Active').length,
          Exits: exits,
          'Turnover Rate (%)': `${((exits / dStaff.length) * 100).toFixed(1)}%`,
          'Average Salary': `$${avgSal.toLocaleString()}`,
          'Engagement Score': `${avgEng}%`,
        };
      });
      const ws2 = XLSX.utils.json_to_sheet(deptSummary);
      XLSX.utils.book_append_sheet(wb, ws2, 'Department_KPI_Summary');

      // Sheet 3: Data Dictionary
      const dictData = [
        { Field: 'Employee_ID', Type: 'VARCHAR (PK)', Description: 'Unique corporate employee identification' },
        { Field: 'Department', Type: 'VARCHAR', Description: 'Standardized organizational cost center' },
        { Field: 'Tenure_Years', Type: 'NUMERIC', Description: 'Length of service computed from hire date' },
        { Field: 'Base_Salary', Type: 'CURRENCY', Description: 'Annualized base compensation before bonus' },
        { Field: 'Engagement_Score', Type: 'INTEGER (0-100)', Description: 'Quarterly pulse satisfaction index' },
        { Field: 'Status', Type: 'VARCHAR', Description: 'Active vs Terminated indicator' },
      ];
      const ws3 = XLSX.utils.json_to_sheet(dictData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Data_Dictionary');

      XLSX.writeFile(wb, `Cleaned_Workforce_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);

      onShowModal(
        'Excel Workbook Generated',
        `Cleaned workbook with 3 structured sheets (Cleaned_Workforce, Department_KPI_Summary, Data_Dictionary) downloaded successfully.`,
        'success'
      );
    } catch (err: any) {
      onShowModal('Export Notice', `Export failed: ${err.message}`, 'danger');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    try {
      const headers = ['id,name,department,jobTitle,hireDate,tenureYears,salary,performanceRating,engagementScore,status,exitReason'];
      const rows = employees.map((e) =>
        `"${e.id}","${e.name}","${e.department}","${e.jobTitle}","${e.hireDate}",${e.tenureYears},${e.salary},"${e.performanceRating}",${e.engagementScore},"${e.status}","${e.exitReason || ''}"`
      );
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Workforce_Cleaned_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowModal('CSV Downloaded', `Exported ${employees.length} cleaned records as comma-separated values.`, 'success');
    } catch (err: any) {
      onShowModal('Export Error', err.message, 'danger');
    }
  };

  // Download Power BI Template / Metadata Schema (.json / .pbit config)
  const handleExportPBIT = () => {
    const pbiSchema = {
      $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/reportVersion/1.0.0/schema.json',
      name: 'PeopleAnalyticsStudio_Model',
      version: '3.4.0',
      entities: [
        {
          name: 'DimEmployee',
          columns: ['Employee_ID', 'Employee_Name', 'Department', 'Job_Title', 'Hire_Date', 'Tenure_Years'],
        },
        {
          name: 'FactPayroll',
          columns: ['Employee_ID', 'Base_Salary', 'Bonus', 'Comp_Ratio'],
        },
        {
          name: 'FactExits',
          columns: ['Employee_ID', 'Exit_Date', 'Exit_Type', 'Primary_Driver'],
        },
      ],
      relationships: [
        { fromTable: 'FactPayroll', fromColumn: 'Employee_ID', toTable: 'DimEmployee', toColumn: 'Employee_ID', cardinality: 'manyToOne' },
        { fromTable: 'FactExits', fromColumn: 'Employee_ID', toTable: 'DimEmployee', toColumn: 'Employee_ID', cardinality: 'manyToOne' },
      ],
      measures: [
        { name: 'Voluntary Turnover Rate', expression: 'DIVIDE(CALCULATE(COUNTROWS(FactExits), FactExits[Exit_Type] = "Voluntary"), [Average Headcount], 0)' },
        { name: 'Headcount', expression: 'CALCULATE(COUNTROWS(DimEmployee), DimEmployee[Status] = "Active")' },
        { name: 'Compa Ratio Midpoint', expression: 'AVERAGE(FactPayroll[Comp_Ratio])' },
      ],
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pbiSchema, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', 'People_Analytics_Model.pbit.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowModal(
      'Power BI Schema Exported',
      'Power BI dimensional data model schema with pre-built DAX measures and relationships downloaded.',
      'success'
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="border-b border-slate-700/60 pb-6">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>Distribution Hub</span>
          </span>
          <h2 className="text-xl font-bold text-white">Download Centre & Power BI Assets</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Export cleaned data, executive summary reports, and developer integration packages in industry-standard formats.
          </p>
        </div>

        {/* 3 Main Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Excel Workbook */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-colors">
            <div>
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center text-xl mb-3 border border-emerald-500/20">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base mb-1">Clean Excel Workbook</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Includes 3 structured tabs: Cleaned Workforce, Department KPI Summary, and Data Dictionary with schema types.
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .xlsx Workbook</span>
            </button>
          </div>

          {/* Executive PDF / Print Report */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4 hover:border-blue-500/40 transition-colors">
            <div>
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center text-xl mb-3 border border-blue-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base mb-1">Executive PDF Report</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Management-ready brief with KPI cards, AI "Explain My Dashboard" commentary, and departmental benchmarks.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
          </div>

          {/* Power BI Template */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-colors">
            <div>
              <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center text-xl mb-3 border border-purple-500/20">
                <FileCode className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base mb-1">Power BI Package (.pbit)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pre-built Power BI model template with star schema relationships, DimEmployee linkage, and DAX measures.
              </p>
            </div>
            <button
              onClick={handleExportPBIT}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .pbit Schema</span>
            </button>
          </div>
        </div>

        {/* Quick CSV Export Bar */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Table className="w-5 h-5 text-indigo-400" />
            <div>
              <span className="text-xs font-bold text-white block">Raw Cleaned Data (CSV Format)</span>
              <span className="text-[11px] text-slate-400">
                Compatible with Tableau, Looker Studio, R, and Python workflows ({employees.length} records)
              </span>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
