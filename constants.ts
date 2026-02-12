export const BRAND_COLORS = {
  primary: '#d04a02', // PwC Orange style
  primaryHover: '#b03d00',
  dark: '#2d2d2d',
  gray: '#404040',
};

// Common keys to try and identify the "User ID" column automatically
export const USER_ID_KEYS = [
  'User ID', 'UserID', 'Username', 'User Name', 'Email', 'E-mail', 'Login', 'Employee ID', 'Worker', 'Account', 'SamAccountName'
];

export const STATUS_KEYS = ['Status', 'Worker Status', 'Employment Status', 'Active Status', 'User_Status'];
export const TERM_DATE_KEYS = ['Termination Date', 'Term Date', 'End Date', 'Last Day of Work'];
export const ROLE_KEYS = ['Role', 'Profile', 'Permission', 'Role_Name', 'Group'];

export const PRIVILEGED_PATTERNS = [
  'admin', 'super', 'integration', 'security', 'power', 'all_access', 'read/write'
];

export const STEPS = [
  { id: 'overview', label: 'Overview' },
  { id: 'scope', label: 'Scope' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'review', label: 'Review' },
  { id: 'communication', label: 'Communication' },
];

export const EMAIL_TEMPLATES = {
  PRIVILEGED_REVIEW: {
    id: 'priv_review',
    label: 'Business Owner – Privileged Access Review',
    subject: 'User Access Review – Privileged Roles Review Required – {{appName}}',
    body: `Hello {{ownerName}},

As part of the periodic User Access Review, please find attached the list of users with privileged roles for {{appName}}.

Risk Analysis is included for high-risk assignments.

Kindly review and confirm one of the following:
- No action required
- Remove access
- Add access

Please share your approval or comments along with any required changes.

Regards,
{{reviewerName}}`
  },
  POST_REMEDIATION: {
    id: 'post_rem',
    label: 'Business Owner – Post Remediation Confirmation',
    subject: 'User Access Review – Post Remediation Confirmation – {{appName}}',
    body: `Hello {{ownerName}},

As requested, the access changes have been implemented for {{appName}}.

Attached are:
- Updated access report
- Before vs After reconciliation
- ServiceNow reference

Please review and confirm approval.

Regards,
{{reviewerName}}`
  },
  AUDIT_CLOSURE: {
    id: 'audit_close',
    label: 'Audit Team – Final Audit Closure',
    subject: 'User Access Review Completed – {{auditName}}',
    body: `Hello Audit Team,

The User Access Review for the below applications has been completed.

Please find attached the Audit Package Ready containing:
- Audit Manifest (Source of Truth)
- Exception Register
- Source reports
- Reconciliation outputs
- Business owner approvals

Regards,
{{reviewerName}}`
  }
};

export const CHECKLIST_ITEMS = [
  { id: 'upload_users', label: 'Upload User List (Source)', req: 'activeRecon' },
  { id: 'upload_roles', label: 'Upload Roles Report', req: 'rrRecon' },
  { id: 'evidence_extract', label: 'Upload Extraction Evidence', req: 'all' },
  { id: 'validate_time', label: 'Validate Extraction Date/Time', req: 'all' },
  { id: 'gen_priv_report', label: 'Generate Privileged & Risk Report', req: 'rrRecon' },
  { id: 'run_identity', label: 'Run Active User Reconciliation', req: 'activeRecon' },
  { id: 'generate_exceptions', label: 'Generate Exception Register', req: 'all' },
  { id: 'send_bo', label: 'Send to Business Owner', req: 'all' },
  { id: 'capture_approval', label: 'Capture Business Owner Approval', req: 'all' },
  { id: 'gen_package', label: 'Generate Audit Package', req: 'all' },
];

export const SLA_DAYS = {
  EVIDENCE: 3,
  REVIEW: 5,
  REMEDIATION: 7,
  CLOSURE: 15
};

export const RISK_WEIGHTS = {
  CRITICALITY: 0.3,
  SENSITIVITY: 0.3,
  PRIVILEGE: 0.25,
  SOD: 0.15
};