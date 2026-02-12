
export type AuditPhase = 'overview' | 'scope' | 'evidence' | 'review' | 'communication';

export interface UserIdentity {
  displayName: string;
  email: string;
  upn?: string; // User Principal Name (for Entra ID)
  role: 'IT Owner' | 'Auditor';
  source: 'Local' | 'EntraID';
  objectId?: string; // Immutable Object ID
  tenantId?: string; // Tenant ID for traceability
}

export interface AuditCalendarConfig {
  fyStartMonth: number; // 1 = Jan, 4 = Apr, etc.
  namingConvention: 'FYXX' | 'FYXXXX' | 'YYYY-YYYY';
}

export interface CommentEntry {
  id: string;
  text: string;
  author: string;
  role: string;
  timestamp: string;
}

export interface AuditMetadata {
  auditId: string;
  auditName: string;
  financialYear: string;
  quarter: string;
  user: UserIdentity;
  startTime: string;
  rootFolder: string;
  status: 'Open' | 'Closed';
}

export interface UserRecord {
  [key: string]: string;
}

export interface FileData {
  id: string;
  name: string;
  timestamp: number;
  records: UserRecord[];
  headers: string[];
  type?: 'user_list' | 'roles_report' | 'evidence_extract' | 'evidence_bo' | 'remediation';
  uploadedBy?: string;
  validated?: boolean;
}

export interface GlobalIdentityConfig {
  file: FileData;
  evidence?: {
    name: string;
    timestamp: number;
    size: number;
  };
  extractionMethod?: string;
}

export interface DiffResult {
  added: UserRecord[];
  removed: UserRecord[];
  modified: {
    user: string;
    changes: { field: string; oldValue: string; newValue: string }[];
  }[];
  totalRecords: number;
  matchCount: number;
}

export interface IdentityIssue {
  userId: string;
  issueType: 'TERMINATED_BUT_ACTIVE' | 'NOT_FOUND_IN_SOURCE' | 'FUTURE_TERMINATION';
  identityStatus: string;
  identityTermDate: string;
  appRecord: UserRecord;
}

export interface RiskScore {
  total: number; // 0-100
  criticality: number;
  sensitivity: number;
  privilege: number;
  sod: number;
  level: 'High' | 'Medium' | 'Low';
}

export interface PrivilegedIssue {
  userId: string;
  role: string;
  riskScore: RiskScore;
  record: UserRecord;
}

export interface ExceptionEntry {
  id: string;
  appId: string;
  userId: string;
  type: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  justification: string;
  owner: string;
  targetDate: string;
  status: 'Open' | 'Closed';
}

export interface ChangeLogEntry {
  timestamp: string;
  section: string;
  action: string;
  oldValue: string;
  newValue: string;
  actor: string;
  justification?: string;
}

export interface ReviewDecision {
  userId: string;
  decision: 'No Action' | 'Remove' | 'Add';
  comments: string;
  ticketNumber?: string;
  timestamp: string;
}

export interface AppConfig {
  activeRecon: boolean;
  rrRecon: boolean;
}

export interface AppScope {
  id: string;
  name: string;
  config: AppConfig;
  status: 'Not Started' | 'In Progress' | 'Completed';
  isLocked: boolean; // Governance Lock
  startedAt?: number; // timestamp for SLA
  
  // Data
  files: FileData[];
  extractionDate?: string;
  extractionTime?: string;
  
  // Analysis
  diffs: DiffResult[];
  identityIssues?: IdentityIssue[];
  privilegedIssues?: PrivilegedIssue[];
  exceptions: ExceptionEntry[];
  
  // Workflow
  checklist: string[]; // IDs of completed steps
  reviews: ReviewDecision[];
  changeLog: ChangeLogEntry[];
  comments: CommentEntry[];
}

export interface AppState {
  view: 'init' | 'dashboard' | 'workspace';
  viewMode: 'IT Owner' | 'Auditor'; // View Context
  activeAppId: string | null;
  metadata: AuditMetadata;
  identitySource: GlobalIdentityConfig | null;
  apps: AppScope[];
  calendarConfig: AuditCalendarConfig;
}
