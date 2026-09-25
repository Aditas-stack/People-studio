import * as XLSX from 'xlsx';
import { Employee, QualityIssue } from '../types';

/**
 * Convert Excel numeric date serials to ISO YYYY-MM-DD
 */
export function parseExcelDate(serial: any): string {
  if (!serial) return '2023-01-15';
  if (typeof serial === 'string') {
    // If it's already a date string
    const trimmed = serial.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return trimmed;
  }
  if (typeof serial === 'number') {
    // Excel base date starts at Dec 30, 1899
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    if (!isNaN(date_info.getTime())) {
      return date_info.toISOString().slice(0, 10);
    }
  }
  return '2023-01-15';
}

/**
 * Clean salary or numeric values from string formatting ($120,000.00 / 120k / EUR)
 */
export function cleanCurrency(val: any, fallback = 85000): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : Math.round(val);
  if (!val) return fallback;
  const str = String(val).trim();
  // Handle '120k' or '95.5k'
  if (/k$/i.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? fallback : Math.round(num * 1000);
  }
  const cleaned = parseFloat(str.replace(/[^0-9.-]+/g, ''));
  return isNaN(cleaned) ? fallback : Math.round(cleaned);
}

/**
 * Find the best matching key in an object using regex patterns
 */
function findKey(obj: Record<string, any>, patterns: RegExp[]): string | undefined {
  const keys = Object.keys(obj);
  for (const pattern of patterns) {
    const match = keys.find((k) => pattern.test(k.trim()));
    if (match) return match;
  }
  return undefined;
}

/**
 * Smart normalizer converting any spreadsheet row into an Employee record
 */
export function normalizeRowToEmployee(row: Record<string, any>, idx: number): Employee {
  // 1. Employee ID
  const idKey = findKey(row, [
    /^(id|emp.*id|employee.*id|badge|badge.*number|code|staff.*id)$/i,
    /id$/i,
  ]);
  const id = idKey && row[idKey] ? String(row[idKey]).trim() : `EMP-${(idx + 1).toString().padStart(4, '0')}`;

  // 2. Full Name (check for separate first/last name or combined full name)
  const firstNameKey = findKey(row, [/^(first.*name|fname|given.*name)$/i]);
  const lastNameKey = findKey(row, [/^(last.*name|lname|surname|family.*name)$/i]);
  const fullNameKey = findKey(row, [/^(name|employee.*name|full.*name|staff.*name|worker|person|employee)$/i]);

  let name = '';
  if (firstNameKey && row[firstNameKey]) {
    const first = String(row[firstNameKey]).trim();
    const last = lastNameKey && row[lastNameKey] ? String(row[lastNameKey]).trim() : '';
    name = `${first} ${last}`.trim();
  } else if (fullNameKey && row[fullNameKey]) {
    name = String(row[fullNameKey]).trim();
  } else {
    name = `Staff Member ${idx + 1}`;
  }

  // 3. Department
  const deptKey = findKey(row, [
    /^(dept|department|division|team|business.*unit|org|cost.*center|group)$/i,
  ]);
  let department = deptKey && row[deptKey] ? String(row[deptKey]).trim() : 'Operations';
  // Common normalization
  if (department.toLowerCase() === 'eng') department = 'Engineering';
  if (department.toLowerCase() === 'fin') department = 'Finance';
  if (department.toLowerCase() === 'ops') department = 'Operations';
  if (department.toLowerCase() === 'mktg' || department.toLowerCase() === 'mkt') department = 'Marketing';

  // 4. Job Title
  const titleKey = findKey(row, [
    /^(title|job.*title|position|role|designation|job|occupation)$/i,
  ]);
  const jobTitle = titleKey && row[titleKey] ? String(row[titleKey]).trim() : 'Specialist';

  // 5. Hire Date
  const hireKey = findKey(row, [
    /^(hire.*date|start.*date|date.*joined|joining.*date|hired|start)$/i,
  ]);
  const hireDate = hireKey && row[hireKey] ? parseExcelDate(row[hireKey]) : '2023-01-15';

  // 6. Tenure (Years)
  const tenureKey = findKey(row, [
    /^(tenure|tenure.*years|years.*service|experience|length.*service)$/i,
  ]);
  let tenureYears = 2.0;
  if (tenureKey && row[tenureKey] !== undefined) {
    tenureYears = parseFloat(String(row[tenureKey]).replace(/[^0-9.-]+/g, '')) || 2.0;
  } else if (hireDate) {
    const diffMs = Date.now() - new Date(hireDate).getTime();
    if (!isNaN(diffMs)) {
      tenureYears = Math.max(0.1, +(diffMs / (365.25 * 24 * 3600 * 1000)).toFixed(1));
    }
  }

  // 7. Base Salary
  const salaryKey = findKey(row, [
    /^(salary|base.*salary|annual.*salary|pay|base.*pay|wage|compensation|rate)$/i,
  ]);
  const salary = salaryKey && row[salaryKey] !== undefined ? cleanCurrency(row[salaryKey], 85000) : 85000;

  // 8. Bonus
  const bonusKey = findKey(row, [
    /^(bonus|incentive|variable|commission|annual.*bonus)$/i,
  ]);
  const bonus = bonusKey && row[bonusKey] !== undefined ? cleanCurrency(row[bonusKey], 6000) : 6000;

  // 9. Performance Rating
  const ratingKey = findKey(row, [
    /^(perf.*rating|performance|rating|appraisal|performance.*score|review)$/i,
  ]);
  let performanceRating: Employee['performanceRating'] = 'Meets Expectations';
  if (ratingKey && row[ratingKey]) {
    const rStr = String(row[ratingKey]).toLowerCase().trim();
    if (rStr.includes('out') || rStr === '5' || rStr.includes('top')) performanceRating = 'Outstanding';
    else if (rStr.includes('exceed') || rStr === '4' || rStr.includes('high')) performanceRating = 'Exceeds';
    else if (rStr.includes('need') || rStr.includes('improve') || rStr === '1' || rStr === '2' || rStr.includes('low'))
      performanceRating = 'Needs Improvement';
    else performanceRating = 'Meets Expectations';
  }

  // 10. Engagement Score
  const engKey = findKey(row, [
    /^(engagement|engagement.*score|satisfaction|enps|pulse.*score)$/i,
  ]);
  let engagementScore = 78;
  if (engKey && row[engKey] !== undefined) {
    const val = parseFloat(String(row[engKey]).replace(/[^0-9.-]+/g, ''));
    if (!isNaN(val)) {
      engagementScore = val <= 5 ? Math.round(val * 20) : Math.min(100, Math.max(0, Math.round(val)));
    }
  }

  // 11. Remote Status
  const remoteKey = findKey(row, [
    /^(remote|remote.*status|work.*mode|location.*type|workplace|work.*location)$/i,
  ]);
  let remoteStatus: Employee['remoteStatus'] = 'Hybrid';
  if (remoteKey && row[remoteKey]) {
    const rmStr = String(row[remoteKey]).toLowerCase().trim();
    if (rmStr.includes('remote') || rmStr.includes('home') || rmStr === 'wfh') remoteStatus = 'Remote';
    else if (rmStr.includes('site') || rmStr.includes('office') || rmStr.includes('in-person')) remoteStatus = 'Onsite';
    else remoteStatus = 'Hybrid';
  }

  // 12. Gender
  const genderKey = findKey(row, [/^(gender|sex)$/i]);
  let gender: Employee['gender'] = 'Unknown';
  if (genderKey && row[genderKey]) {
    const gStr = String(row[genderKey]).toLowerCase().trim();
    if (gStr.startsWith('f')) gender = 'Female';
    else if (gStr.startsWith('m')) gender = 'Male';
    else if (gStr.includes('non') || gStr.includes('nb')) gender = 'Non-Binary';
    else gender = 'Unknown';
  }

  // 13. Status & Exit Details
  const statusKey = findKey(row, [
    /^(status|employment.*status|state|active|is.*active)$/i,
  ]);
  let status: Employee['status'] = 'Active';
  if (statusKey && row[statusKey]) {
    const sStr = String(row[statusKey]).toLowerCase().trim();
    if (sStr.includes('term') || sStr.includes('exit') || sStr.includes('left') || sStr.includes('inactive') || sStr === '0' || sStr === 'false') {
      status = 'Terminated';
    } else {
      status = 'Active';
    }
  }

  const exitReasonKey = findKey(row, [
    /^(exit.*reason|reason|departure.*reason|separation.*reason)$/i,
  ]);
  const exitReason = exitReasonKey && row[exitReasonKey] ? (String(row[exitReasonKey]).trim() as any) : undefined;

  const termDateKey = findKey(row, [
    /^(term.*date|termination.*date|exit.*date|end.*date|departure.*date)$/i,
  ]);
  const terminationDate = termDateKey && row[termDateKey] ? parseExcelDate(row[termDateKey]) : undefined;

  return {
    id,
    name,
    department,
    jobTitle,
    hireDate,
    tenureYears,
    salary,
    bonus,
    performanceRating,
    engagementScore,
    remoteStatus,
    gender,
    status,
    exitReason,
    terminationDate,
  };
}

/**
 * Scan active dataset to dynamically compute quality score and identify real issues
 */
export function calculateQualityAudit(employees: Employee[]): {
  score: number;
  issues: QualityIssue[];
} {
  if (employees.length === 0) {
    return { score: 100, issues: [] };
  }

  let penalty = 0;
  const issues: QualityIssue[] = [];

  // 1. Duplicate IDs
  const seenIds = new Set<string>();
  let duplicateCount = 0;
  employees.forEach((e) => {
    if (seenIds.has(e.id)) duplicateCount++;
    seenIds.add(e.id);
  });
  if (duplicateCount > 0) {
    penalty += Math.min(20, duplicateCount * 3);
    issues.push({
      id: 1,
      type: 'Duplicate Primary Keys (Employee_ID)',
      count: duplicateCount,
      severity: 'danger',
      resolved: false,
      field: 'id',
    });
  }

  // 2. Whitespace / capitalization issues
  let nameIssues = 0;
  employees.forEach((e) => {
    if (e.name !== e.name.trim() || e.name === e.name.toUpperCase() || e.name === e.name.toLowerCase()) {
      nameIssues++;
    }
  });
  if (nameIssues > 0) {
    penalty += Math.min(15, nameIssues * 2);
    issues.push({
      id: 2,
      type: 'Trailing Whitespace & Improper Casing in Names',
      count: nameIssues,
      severity: 'warning',
      resolved: false,
      field: 'name',
    });
  }

  // 3. Department taxonomy abbreviations
  let deptIssues = 0;
  employees.forEach((e) => {
    if (['eng', 'fin', 'ops', 'mkt', 'mktg', 'tech'].includes(e.department.toLowerCase())) {
      deptIssues++;
    }
  });
  if (deptIssues > 0) {
    penalty += Math.min(20, deptIssues * 2);
    issues.push({
      id: 3,
      type: 'Non-Standard Department Taxonomy (e.g. Eng, Fin, Ops)',
      count: deptIssues,
      severity: 'warning',
      resolved: false,
      field: 'department',
    });
  }

  // 4. Missing gender values
  let genderIssues = 0;
  employees.forEach((e) => {
    if (e.gender === 'Unknown' || !e.gender) genderIssues++;
  });
  if (genderIssues > 0) {
    penalty += Math.min(10, Math.round((genderIssues / employees.length) * 10));
    issues.push({
      id: 4,
      type: 'Unpopulated Demographic / Gender Attributes',
      count: genderIssues,
      severity: 'info',
      resolved: false,
      field: 'gender',
    });
  }

  // 5. Terminated records missing exit reasons
  let exitReasonIssues = 0;
  employees.forEach((e) => {
    if (e.status === 'Terminated' && !e.exitReason) exitReasonIssues++;
  });
  if (exitReasonIssues > 0) {
    penalty += Math.min(15, exitReasonIssues * 2);
    issues.push({
      id: 5,
      type: 'Terminated Records Lacking Exit Reason Categorization',
      count: exitReasonIssues,
      severity: 'warning',
      resolved: false,
      field: 'exitReason',
    });
  }

  const score = Math.max(70, Math.min(100, 100 - penalty));
  return { score, issues };
}

/**
 * Parse raw tabular string (TSV from Google Sheets copy-paste, or CSV)
 */
export function parseTabularString(rawText: string): Employee[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  try {
    // SheetJS can parse CSV or TSV automatically from string
    const workbook = XLSX.read(trimmed, { type: 'string' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

    return rows.map((r, idx) => normalizeRowToEmployee(r, idx));
  } catch (err) {
    // Simple manual fallback for tab/comma separated text
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));

    const parsed: Employee[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const rowObj: Record<string, any> = {};
      headers.forEach((h, hIdx) => {
        rowObj[h] = parts[hIdx] || '';
      });
      parsed.push(normalizeRowToEmployee(rowObj, i - 1));
    }
    return parsed;
  }
}
