import * as XLSX from 'xlsx';
import { AppState, RiskScore, PrivilegedIssue, ExceptionEntry, AppScope } from '../types';
import { RISK_WEIGHTS } from '../constants';

// --- Risk Logic ---

export const calculateRiskScore = (roleName: string, context: any = {}): RiskScore => {
  // Logic: Heuristic scoring based on keywords in role name
  const roleLower = roleName.toLowerCase();
  
  let criticality = 50; // Base
  let sensitivity = 50;
  let privilege = 50;
  let sod = 10;

  if (roleLower.includes('admin') || roleLower.includes('super')) {
    criticality = 100;
    privilege = 100;
    sensitivity = 90;
    sod = 40;
  } else if (roleLower.includes('read') || roleLower.includes('viewer')) {
    criticality = 20;
    privilege = 10;
    sensitivity = 30;
  } else if (roleLower.includes('finance') || roleLower.includes('hr')) {
    sensitivity = 100; // PII/Financial data
    sod = 60;
  }

  const total = (criticality * RISK_WEIGHTS.CRITICALITY) +
                (sensitivity * RISK_WEIGHTS.SENSITIVITY) +
                (privilege * RISK_WEIGHTS.PRIVILEGE) +
                (sod * RISK_WEIGHTS.SOD);

  return {
    total: Math.round(total),
    criticality,
    sensitivity,
    privilege,
    sod,
    level: total >= 80 ? 'High' : total >= 50 ? 'Medium' : 'Low'
  };
};

export const autoGenerateExceptions = (app: AppScope): ExceptionEntry[] => {
  const exceptions: ExceptionEntry[] = [];
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 7); // Default 7 day remediation
  const targetDateStr = targetDate.toISOString().split('T')[0];

  // 1. Identity Issues (Terminated but Active)
  if (app.identityIssues) {
    app.identityIssues.filter(i => i.issueType === 'TERMINATED_BUT_ACTIVE').forEach(issue => {
        exceptions.push({
            id: crypto.randomUUID(),
            appId: app.id,
            userId: issue.userId,
            type: 'Terminated User Active',
            riskLevel: 'High',
            justification: '',
            owner: 'IT Ops',
            targetDate: targetDateStr,
            status: 'Open'
        });
    });
  }

  // 2. High Risk Privileged Roles
  if (app.privilegedIssues) {
    app.privilegedIssues.filter(i => i.riskScore.level === 'High').forEach(issue => {
        exceptions.push({
            id: crypto.randomUUID(),
            appId: app.id,
            userId: issue.userId,
            type: `High Risk Role: ${issue.role}`,
            riskLevel: 'High',
            justification: 'Requires Business Justification',
            owner: 'Business Owner',
            targetDate: targetDateStr,
            status: 'Open'
        });
    });
  }

  return exceptions;
};

// --- Manifest Logic ---

export const generateAuditManifest = (state: AppState): Blob => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Audit Overview & Governance
  const overviewData = [{
    'Audit ID': state.metadata.auditId,
    'Audit Name': state.metadata.auditName,
    'Financial Year': state.metadata.financialYear,
    'Quarter': state.metadata.quarter,
    'Reviewer Name': state.metadata.user.displayName,
    'Reviewer Email': state.metadata.user.email,
    'Reviewer Source': state.metadata.user.source,
    'Start Time': state.metadata.startTime,
    'Export Time': new Date().toLocaleString(),
    'Total Apps': state.apps.length,
    'Status': state.metadata.status,
    'Global Identity Source': state.identitySource ? state.identitySource.file.name : 'N/A',
    'Identity Evidence': state.identitySource?.evidence ? state.identitySource.evidence.name : 'N/A',
    'Extraction Method': state.identitySource?.extractionMethod || 'N/A'
  }];
  const wsOverview = XLSX.utils.json_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, "Audit Governance");

  // Sheet 2: Applications Scope
  const scopeData = state.apps.map(app => ({
    'App Name': app.name,
    'Config': `${app.config.activeRecon ? 'Active ' : ''}${app.config.rrRecon ? 'R&R' : ''}`,
    'Status': app.status,
    'Locked': app.isLocked ? 'Yes' : 'No',
    'Exceptions Open': app.exceptions.filter(e => e.status === 'Open').length,
    'SLA Started': app.startedAt ? new Date(app.startedAt).toLocaleDateString() : 'N/A'
  }));
  const wsScope = XLSX.utils.json_to_sheet(scopeData);
  XLSX.utils.book_append_sheet(wb, wsScope, "Applications Scope");

  // Sheet 3: Evidence Inventory
  const evidenceData: any[] = [];
  state.apps.forEach(app => {
    app.files.forEach(f => {
      evidenceData.push({
        'App': app.name,
        'File Name': f.name,
        'Type': f.type,
        'Uploaded By': f.uploadedBy || state.metadata.user.displayName,
        'Upload Timestamp': new Date(f.timestamp).toLocaleString(),
        'Records': f.records.length
      });
    });
  });
  const wsEvidence = XLSX.utils.json_to_sheet(evidenceData);
  XLSX.utils.book_append_sheet(wb, wsEvidence, "Evidence Inventory");

  // Sheet 4: Exceptions Register (Consolidated)
  const exceptionsData: any[] = [];
  state.apps.forEach(app => {
    app.exceptions.forEach(ex => {
        exceptionsData.push({
            'Exception ID': ex.id,
            'App': app.name,
            'User': ex.userId,
            'Type': ex.type,
            'Risk': ex.riskLevel,
            'Justification': ex.justification,
            'Owner': ex.owner,
            'Target Date': ex.targetDate,
            'Status': ex.status
        });
    });
  });
  const wsExceptions = XLSX.utils.json_to_sheet(exceptionsData);
  XLSX.utils.book_append_sheet(wb, wsExceptions, "Exception Register");

  // Sheet 5: Change History
  const historyData: any[] = [];
  state.apps.forEach(app => {
      app.changeLog.forEach(log => {
          historyData.push({
              'App': app.name,
              'Timestamp': log.timestamp,
              'Section': log.section,
              'Action': log.action,
              'Old Value': log.oldValue,
              'New Value': log.newValue,
              'Actor': log.actor,
              'Reason': log.justification
          });
      });
  });
  const wsHistory = XLSX.utils.json_to_sheet(historyData);
  XLSX.utils.book_append_sheet(wb, wsHistory, "Change History");

  // Sheet 6: Collaboration Log (Comments)
  const commentData: any[] = [];
  state.apps.forEach(app => {
     if(app.comments) {
       app.comments.forEach(c => {
         commentData.push({
           'App': app.name,
           'Timestamp': c.timestamp,
           'Author': c.author,
           'Role': c.role,
           'Comment': c.text
         });
       });
     }
  });
  const wsComments = XLSX.utils.json_to_sheet(commentData);
  XLSX.utils.book_append_sheet(wb, wsComments, "Collaboration Log");

  // Generate Buffer
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/octet-stream' });
};
