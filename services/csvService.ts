import Papa from 'papaparse';
import { FileData, UserRecord, DiffResult, IdentityIssue, PrivilegedIssue } from '../types';
import { USER_ID_KEYS, STATUS_KEYS, TERM_DATE_KEYS, ROLE_KEYS, PRIVILEGED_PATTERNS } from '../constants';
import { calculateRiskScore } from './auditService';

export const parseCSV = (file: File, type?: FileData['type']): Promise<FileData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          timestamp: Date.now(),
          records: results.data as UserRecord[],
          headers: results.meta.fields || [],
          type,
          uploadedBy: 'IT Owner' // Default for now
        });
      },
      error: (err) => reject(err),
    });
  });
};

export const detectIdColumn = (headers: string[]): string => {
  const match = headers.find(h => USER_ID_KEYS.some(k => k.toLowerCase() === h.toLowerCase()));
  return match || headers[0];
};

export const compareFiles = (baseline: FileData, target: FileData): DiffResult => {
  const baselineIdCol = detectIdColumn(baseline.headers);
  const targetIdCol = detectIdColumn(target.headers); 

  const baselineMap = new Map<string, UserRecord>();
  baseline.records.forEach(r => {
    const key = r[baselineIdCol];
    if (key) baselineMap.set(key, r);
  });

  const targetMap = new Map<string, UserRecord>();
  target.records.forEach(r => {
    const key = r[targetIdCol];
    if (key) targetMap.set(key, r);
  });

  const added: UserRecord[] = [];
  const removed: UserRecord[] = [];
  const modified: { user: string; changes: any[] }[] = [];
  let matchCount = 0;

  baselineMap.forEach((val, key) => {
    if (!targetMap.has(key)) removed.push(val);
  });

  targetMap.forEach((val, key) => {
    if (!baselineMap.has(key)) {
      added.push(val);
    } else {
      const baseRec = baselineMap.get(key)!;
      const changes: { field: string; oldValue: string; newValue: string }[] = [];
      Object.keys(baseRec).forEach(field => {
        if (field === baselineIdCol) return;
        if (baseRec[field] !== val[field]) {
          changes.push({ field, oldValue: baseRec[field] || '', newValue: val[field] || '' });
        }
      });
      if (changes.length > 0) modified.push({ user: key, changes });
      else matchCount++;
    }
  });

  return { added, removed, modified, totalRecords: target.records.length, matchCount };
};

export const reconcileIdentity = (identity: FileData, appBaseline: FileData): IdentityIssue[] => {
  const issues: IdentityIssue[] = [];
  const identityIdCol = detectIdColumn(identity.headers);
  const appIdCol = detectIdColumn(appBaseline.headers);
  const statusCol = identity.headers.find(h => STATUS_KEYS.some(k => k.toLowerCase() === h.toLowerCase()));
  const termDateCol = identity.headers.find(h => TERM_DATE_KEYS.some(k => k.toLowerCase() === h.toLowerCase()));

  const identityMap = new Map<string, UserRecord>();
  identity.records.forEach(r => {
    if (r[identityIdCol]) identityMap.set(r[identityIdCol].toLowerCase().trim(), r);
  });

  const today = new Date();

  appBaseline.records.forEach(appUser => {
    const userIdRaw = appUser[appIdCol];
    if (!userIdRaw) return;
    const userId = userIdRaw.toLowerCase().trim();
    const identityUser = identityMap.get(userId);

    if (!identityUser) {
      issues.push({
        userId: userIdRaw,
        issueType: 'NOT_FOUND_IN_SOURCE',
        identityStatus: 'N/A',
        identityTermDate: 'N/A',
        appRecord: appUser
      });
    } else {
      const status = statusCol ? identityUser[statusCol] : 'Active';
      const termDateStr = termDateCol ? identityUser[termDateCol] : null;
      let isTerminated = false;
      let isFutureTerm = false;

      if (status.toLowerCase().includes('inactive') || status.toLowerCase().includes('terminated')) isTerminated = true;
      if (termDateStr) {
        const termDate = new Date(termDateStr);
        if (!isNaN(termDate.getTime())) {
           if (termDate < today) isTerminated = true;
           else isFutureTerm = true;
        }
      }

      if (isTerminated) {
        issues.push({
          userId: userIdRaw,
          issueType: 'TERMINATED_BUT_ACTIVE',
          identityStatus: status,
          identityTermDate: termDateStr || 'N/A',
          appRecord: appUser
        });
      } else if (isFutureTerm) {
        issues.push({
          userId: userIdRaw,
          issueType: 'FUTURE_TERMINATION',
          identityStatus: status,
          identityTermDate: termDateStr || 'N/A',
          appRecord: appUser
        });
      }
    }
  });
  return issues;
};

export const analyzePrivilegedAccess = (file: FileData): PrivilegedIssue[] => {
  const issues: PrivilegedIssue[] = [];
  const idCol = detectIdColumn(file.headers);
  const roleCols = file.headers.filter(h => ROLE_KEYS.some(k => h.toLowerCase().includes(k.toLowerCase())));

  file.records.forEach(rec => {
    let isPrivileged = false;
    let foundRole = '';

    roleCols.forEach(col => {
      const val = rec[col]?.toLowerCase() || '';
      if (PRIVILEGED_PATTERNS.some(p => val.includes(p))) {
        isPrivileged = true;
        foundRole = rec[col];
      }
    });

    if (isPrivileged) {
      const riskScore = calculateRiskScore(foundRole, rec);
      issues.push({
        userId: rec[idCol] || 'Unknown',
        role: foundRole,
        riskScore: riskScore,
        record: rec
      });
    }
  });

  return issues;
};