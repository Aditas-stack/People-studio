import { Employee, TransformationStep, QualityIssue, AuditLogEntry, Project } from '../types';

// Deterministic seed generation for 487 records
const DEPARTMENTS = [
  { name: 'Engineering', weight: 0.30, titles: ['Software Engineer', 'Senior Software Engineer', 'DevOps Specialist', 'Frontend Architect', 'Engineering Manager', 'QA Automation Lead'] },
  { name: 'Sales', weight: 0.24, titles: ['Account Executive', 'Enterprise SDR', 'Sales Director', 'Customer Success Manager', 'Solutions Architect'] },
  { name: 'Operations', weight: 0.19, titles: ['Operations Lead', 'Logistics Analyst', 'Compliance Officer', 'Procurement Specialist'] },
  { name: 'Finance', weight: 0.13, titles: ['Financial Analyst', 'Senior Accountant', 'Payroll Specialist', 'FP&A Manager'] },
  { name: 'HR', weight: 0.09, titles: ['People Partner', 'Talent Acquisition Partner', 'HR Operations Analyst', 'Compensation Specialist'] },
  { name: 'Marketing', weight: 0.05, titles: ['Growth Marketer', 'Content Strategist', 'Brand Manager', 'Product Marketing Lead'] },
];

const FIRST_NAMES = ['Sarah', 'David', 'Elena', 'Marcus', 'Priya', 'Liam', 'Aaliyah', 'Carlos', 'Mei', 'Jamal', 'Chloe', 'Alexander', 'Fatima', 'Mateo', 'Emma', 'Hiroshi', 'Zara', 'Benjamin', 'Ananya', 'Lucas', 'Leila', 'Julian', 'Sofia', 'Oliver', 'Amara', 'Daniel', 'Naomi', 'Tariq', 'Grace', 'Ethan'];
const LAST_NAMES = ['Jenkins', 'Chen', 'Rodriguez', 'Patel', 'Smith', 'Kowalski', 'Al-Mansoor', 'Kim', 'O\'Connor', 'Mendoza', 'Adeyemi', 'Johansson', 'Watanabe', 'Dubois', 'Novak', 'Gupta', 'Taylor', 'Santos', 'Becker', 'Ibrahim'];

export function generateInitialDataset(): Employee[] {
  const employees: Employee[] = [];
  const totalCount = 487;

  for (let i = 1; i <= totalCount; i++) {
    const idNum = i.toString().padStart(4, '0');
    const empId = `EMP-${idNum}`;
    
    const randDept = (i * 17 + 3) % 100 / 100;
    let cum = 0;
    let deptObj = DEPARTMENTS[0];
    for (const d of DEPARTMENTS) {
      cum += d.weight;
      if (randDept <= cum) {
        deptObj = d;
        break;
      }
    }

    const firstName = FIRST_NAMES[(i * 7 + 13) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 11 + 5) % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;
    const jobTitle = deptObj.titles[(i * 3) % deptObj.titles.length];
    
    const tenureYears = Number((0.5 + ((i * 37) % 65) / 10).toFixed(1));
    const hireYear = 2026 - Math.floor(tenureYears);
    const hireMonth = ((i * 3) % 12) + 1;
    const hireDay = ((i * 7) % 27) + 1;
    const hireDate = `${hireYear}-${hireMonth.toString().padStart(2, '0')}-${hireDay.toString().padStart(2, '0')}`;

    let baseSalary = 80000;
    if (deptObj.name === 'Engineering') baseSalary = 125000 + ((i * 149) % 55000);
    else if (deptObj.name === 'Sales') baseSalary = 95000 + ((i * 123) % 45000);
    else if (deptObj.name === 'Finance') baseSalary = 90000 + ((i * 117) % 40000);
    else if (deptObj.name === 'Operations') baseSalary = 75000 + ((i * 97) % 35000);
    else if (deptObj.name === 'HR') baseSalary = 85000 + ((i * 103) % 35000);
    else baseSalary = 92000 + ((i * 109) % 38000);

    const bonus = Math.round(baseSalary * (((i % 15) + 5) / 100));

    const ratings: Array<Employee['performanceRating']> = [
      'Needs Improvement',
      'Meets Expectations',
      'Meets Expectations',
      'Exceeds',
      'Exceeds',
      'Outstanding',
    ];
    const performanceRating = ratings[(i * 5) % ratings.length];

    let engagementScore = 60 + ((i * 13) % 38);
    if (performanceRating === 'Outstanding') engagementScore = Math.min(99, engagementScore + 10);
    if (performanceRating === 'Needs Improvement') engagementScore = Math.max(45, engagementScore - 15);

    const isTerminated = i % 15 === 0 && employees.filter(e => e.status === 'Terminated').length < 32;
    const status: Employee['status'] = isTerminated ? 'Terminated' : 'Active';

    const exitReasons: Array<NonNullable<Employee['exitReason']>> = [
      'Compensation',
      'Compensation',
      'Career Growth',
      'Career Growth',
      'Leadership',
      'Burnout',
      'Relocation',
      'Other',
    ];
    const exitReason = isTerminated ? exitReasons[(i * 2) % exitReasons.length] : undefined;
    const terminationDate = isTerminated ? `2026-0${((i % 8) + 1)}-${((i * 4) % 25) + 1}` : undefined;

    const remoteStatuses: Array<Employee['remoteStatus']> = ['Remote', 'Hybrid', 'Hybrid', 'Onsite'];
    const remoteStatus = remoteStatuses[(i * 3) % remoteStatuses.length];

    const genders: Array<Employee['gender']> = ['Female', 'Male', 'Female', 'Male', 'Non-Binary'];
    const gender = genders[(i * 2) % genders.length];

    employees.push({
      id: empId,
      name,
      department: deptObj.name,
      jobTitle,
      hireDate,
      tenureYears,
      salary: baseSalary,
      bonus,
      performanceRating,
      engagementScore,
      remoteStatus,
      gender,
      status,
      terminationDate,
      exitReason,
    });
  }

  return employees;
}

export function generateTechStartupDataset(): Employee[] {
  const depts = [
    { name: 'AI & Data Science', titles: ['ML Engineer', 'Research Scientist', 'AI Product Manager', 'Data Platform Lead'] },
    { name: 'Core Engineering', titles: ['Backend Architect', 'Full Stack Engineer', 'Systems Engineer', 'Cloud Reliability Lead'] },
    { name: 'Product & Design', titles: ['Product Designer', 'UX Researcher', 'Principal PM', 'Design System Lead'] },
    { name: 'Growth & GTM', titles: ['Enterprise Growth Lead', 'Developer Advocate', 'Sales Engineer', 'RevOps Specialist'] },
  ];

  const employees: Employee[] = [];
  const total = 220;

  for (let i = 1; i <= total; i++) {
    const deptObj = depts[i % depts.length];
    const title = deptObj.titles[(i * 2) % deptObj.titles.length];
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`;
    const tenureYears = Number((0.4 + ((i * 29) % 45) / 10).toFixed(1));
    const salary = 110000 + ((i * 181) % 75000);
    const bonus = Math.round(salary * 0.12);
    const isTerminated = i % 9 === 0;

    employees.push({
      id: `TECH-${i.toString().padStart(4, '0')}`,
      name,
      department: deptObj.name,
      jobTitle: title,
      hireDate: `202${6 - Math.floor(tenureYears)}-0${(i % 9) + 1}-15`,
      tenureYears,
      salary,
      bonus,
      performanceRating: i % 4 === 0 ? 'Outstanding' : i % 3 === 0 ? 'Exceeds' : 'Meets Expectations',
      engagementScore: 70 + (i % 28),
      remoteStatus: i % 2 === 0 ? 'Remote' : 'Hybrid',
      gender: i % 2 === 0 ? 'Female' : 'Male',
      status: isTerminated ? 'Terminated' : 'Active',
      exitReason: isTerminated ? (i % 2 === 0 ? 'Compensation' : 'Career Growth') : undefined,
      terminationDate: isTerminated ? '2026-03-20' : undefined,
    });
  }

  return employees;
}

export const initialProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Global Workforce Analysis 2026',
    description: 'Corporate master employee roster covering 6 global departments with compensation & performance attributes.',
    datasetName: 'Active_Workforce_2026.xlsx',
    employees: generateInitialDataset(),
    qualityScore: 91,
    updatedAt: 'Today',
    isDefault: true,
  },
  {
    id: 'proj-2',
    name: 'High-Growth Tech Attrition Study',
    description: 'Quarterly review of technical talent, engineering flight risk, and market salary parity.',
    datasetName: 'Tech_Attrition_Study_2026.xlsx',
    employees: generateTechStartupDataset(),
    qualityScore: 95,
    updatedAt: 'Yesterday',
  },
];

export const initialTransformationSteps: TransformationStep[] = [
  {
    id: 1,
    name: 'Deduplicate Employee Primary Key',
    description: 'Remove duplicate Employee IDs based on earliest ingestion timestamp',
    applied: true,
    codeSnippet: 'df = df.drop_duplicates(subset=["Employee_ID"], keep="first")',
    affectedRows: 12,
  },
  {
    id: 2,
    name: 'Trim & Normalize Text Fields',
    description: 'Strip leading/trailing whitespaces from names, job titles, and departments',
    applied: true,
    codeSnippet: 'df["Employee_Name"] = df["Employee_Name"].str.strip().str.title()',
    affectedRows: 487,
  },
  {
    id: 3,
    name: 'Standardize Department Taxonomy',
    description: 'Map legacy aliases ("Eng", "Fin", "Ops") to standardized corporate cost centers',
    applied: true,
    codeSnippet: 'dept_map = {"Eng": "Engineering", "Fin": "Finance", "Ops": "Operations"}\ndf["Department"] = df["Department"].replace(dept_map)',
    affectedRows: 34,
  },
  {
    id: 4,
    name: 'Cast Hire Dates to ISO 8601',
    description: 'Parse varied date strings into standardized YYYY-MM-DD UTC format',
    applied: true,
    codeSnippet: 'df["Hire_Date"] = pd.to_datetime(df["Hire_Date"], errors="coerce").dt.strftime("%Y-%m-%d")',
    affectedRows: 23,
  },
  {
    id: 5,
    name: 'Convert Currency to Numeric Float',
    description: 'Clean dollar signs, commas, and trailing characters from compensation fields',
    applied: true,
    codeSnippet: 'df["Salary"] = pd.to_numeric(df["Salary"].astype(str).str.replace(r"[$,]", "", regex=True), errors="coerce")',
    affectedRows: 5,
  },
  {
    id: 6,
    name: 'Handle Missing Values & Imputation',
    description: 'Impute missing genders as "Unknown" and fill unrecorded exit reasons',
    applied: true,
    codeSnippet: 'df["Gender"] = df["Gender"].fillna("Unknown")\ndf["Exit_Reason"] = df["Exit_Reason"].fillna("Not Applicable")',
    affectedRows: 18,
  },
];

export const initialQualityIssues: QualityIssue[] = [
  { id: 1, type: 'Duplicate Employee IDs', count: 12, severity: 'warning', resolved: false, field: 'Employee_ID' },
  { id: 2, type: 'Missing Department Cost Centers', count: 8, severity: 'danger', resolved: false, field: 'Department' },
  { id: 3, type: 'Invalid Hire Date Formats', count: 23, severity: 'warning', resolved: false, field: 'Hire_Date' },
  { id: 4, type: 'Inconsistent Job Title Casing', count: 17, severity: 'info', resolved: false, field: 'Job_Title' },
  { id: 5, type: 'Salary Stored as String ($)', count: 5, severity: 'danger', resolved: false, field: 'Salary' },
  { id: 6, type: 'Blank Termination Dates on Terminated Staff', count: 14, severity: 'info', resolved: false, field: 'Termination_Date' },
];

export const initialAuditLogs: AuditLogEntry[] = [
  {
    id: 'LOG-1001',
    timestamp: '2026-09-25 08:30:12',
    user: 'Sarah Jenkins (HR Admin)',
    action: 'Dataset Ingested',
    details: 'Uploaded Active_Workforce_2026.xlsx (487 records, 32 schema attributes)',
    category: 'Ingestion',
  },
  {
    id: 'LOG-1002',
    timestamp: '2026-09-25 08:32:45',
    user: 'Sarah Jenkins (HR Admin)',
    action: 'Automated Profiler Run',
    details: 'Completed data quality audit. Initial Quality Score computed at 91%',
    category: 'Pipeline',
  },
  {
    id: 'LOG-1003',
    timestamp: '2026-09-25 08:35:10',
    user: 'Sarah Jenkins (HR Admin)',
    action: 'Power Query Transformation',
    details: 'Executed 6 data cleaning steps. Normalized departments and converted dates',
    category: 'Pipeline',
  },
  {
    id: 'LOG-1004',
    timestamp: '2026-09-25 08:38:22',
    user: 'System Engine',
    action: 'Dimensional Model Validated',
    details: 'Star Schema referential integrity verified. DimEmployee 1:M relationships linked',
    category: 'Modeling',
  },
];
