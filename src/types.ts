export interface Employee {
  id: string;
  name: string;
  department: string;
  jobTitle: string;
  hireDate: string;
  tenureYears: number;
  salary: number;
  bonus: number;
  performanceRating: 'Needs Improvement' | 'Meets Expectations' | 'Exceeds' | 'Outstanding';
  engagementScore: number; // 0 - 100
  remoteStatus: 'Remote' | 'Hybrid' | 'Onsite';
  gender: 'Female' | 'Male' | 'Non-Binary' | 'Unknown';
  status: 'Active' | 'Terminated';
  terminationDate?: string;
  exitReason?: 'Compensation' | 'Career Growth' | 'Leadership' | 'Relocation' | 'Burnout' | 'Other';
}

export interface UserProfile {
  name: string;
  company: string;
  role: 'HR Admin' | 'People Analyst' | 'Executive' | 'Manager';
  email?: string;
}

export interface TransformationStep {
  id: number;
  name: string;
  description: string;
  applied: boolean;
  codeSnippet: string;
  affectedRows: number;
}

export interface QualityIssue {
  id: number;
  type: string;
  count: number;
  severity: 'danger' | 'warning' | 'info';
  resolved: boolean;
  field: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  category: 'Ingestion' | 'Pipeline' | 'Modeling' | 'Analysis' | 'Security';
}

export interface Project {
  id: string;
  name: string;
  description: string;
  datasetName: string;
  employees: Employee[];
  qualityScore: number;
  updatedAt: string;
  isDefault?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  source?: string;
}
