import React, { useState } from 'react';
import { AppScope, FileData, AppState, ChangeLogEntry, CommentEntry, GlobalIdentityConfig } from '../types';
import { CHECKLIST_ITEMS } from '../constants';
import { Button } from './Button';
import { FileUpload } from './FileUpload';
import { ReconciliationTable } from './ReconciliationTable';
import { parseCSV, reconcileIdentity, analyzePrivilegedAccess } from '../services/csvService';
import { autoGenerateExceptions } from '../services/auditService';
import { CheckSquare, Upload, Activity, Users, Mail, Package, AlertTriangle, ShieldAlert, History, Check, Lock, MessageSquare, Unlock, Send, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';

interface Props {
  app: AppScope;
  identitySource: GlobalIdentityConfig | null;
  onUpdateApp: (updated: AppScope) => void;
  onBack: () => void;
  meta: AppState['metadata'];
  viewMode: AppState['viewMode'];
}

type TabId = 'checklist' | 'inputs' | 'recon' | 'risks' | 'comments' | 'package';

export const AppWorkspace: React.FC<Props> = ({ app, identitySource, onUpdateApp, onBack, meta, viewMode }) => {
  const [activeTab, setActiveTab] = useState<TabId>('checklist');
  const [newComment, setNewComment] = useState('');
  
  const isReadOnly = viewMode === 'Auditor' || app.isLocked;

  // --- Helpers ---
  const logChange = (section: string, action: string, oldVal: string, newVal: string, reason?: string) => {
    const entry: ChangeLogEntry = {
      timestamp: new Date().toLocaleString(),
      section,
      action,
      oldValue: oldVal,
      newValue: newVal,
      actor: meta.user.displayName,
      justification: reason || 'Routine Update'
    };
    return [...app.changeLog, entry];
  };

  const isStepLocked = (stepId: string) => app.checklist.includes(stepId);

  // --- Handlers ---

  const handleToggleStep = (stepId: string, label: string) => {
    if (isReadOnly) return;

    if (app.checklist.includes(stepId)) {
      // Step is currently complete, user wants to reopen it
      const justification = prompt(`Mandatory: Please provide a reason for reopening the step '${label}'`);
      if (justification && justification.trim().length > 0) {
        const newChecklist = app.checklist.filter(id => id !== stepId);
        const newLog = logChange('Checklist', `Reopened Step: ${label}`, 'Completed', 'Incomplete', justification);
        onUpdateApp({ ...app, checklist: newChecklist, changeLog: newLog });
      } else {
        alert("Governance Control: Reopening a completed step requires a documented justification for the audit trail. Please try again and provide a reason.");
      }
    } else {
      // Mark as complete
      const newChecklist = [...app.checklist, stepId];
      const newLog = logChange('Checklist', `Completed Step: ${label}`, 'Incomplete', 'Completed');
      onUpdateApp({ ...app, checklist: newChecklist, changeLog: newLog });
    }
  };

  const handleFile = async (file: File, type: FileData['type']) => {
    try {
      const parsed = await parseCSV(file, type);
      const otherFiles = app.files.filter(f => f.type !== type);
      const newFiles = [...otherFiles, parsed];
      const newLog = logChange('Inputs', 'Upload File', 'N/A', file.name);
      
      onUpdateApp({ 
        ...app, 
        files: newFiles, 
        status: 'In Progress', 
        changeLog: newLog,
        extractionDate: app.extractionDate,
      });
      // Do NOT auto-mark checklist anymore to allow explicit user control
    } catch (e) { alert("Upload Failed: The file could not be parsed. Please check that the file is a valid CSV and try again."); }
  };

  const runIdentityRecon = () => {
    if (!identitySource) return alert("Configuration Missing: Global Identity Source is not configured. Please return to the Dashboard and set up the Identity Source (e.g., Workday/AD export) before running reconciliation.");
    const baseline = app.files.find(f => f.type === 'user_list');
    if (!baseline) return alert("Input Missing: The Active User List for this application has not been uploaded. Please go to the 'Inputs' tab and upload the baseline user report.");
    
    // Pass the file data from the GlobalIdentityConfig
    const issues = reconcileIdentity(identitySource.file, baseline);
    onUpdateApp({ ...app, identityIssues: issues });
    // Prompt user to mark checklist manually or just notify
    alert("Reconciliation Complete: Identity Check has been successfully executed against the Global Identity Source. Please review the findings in the 'Recon' tab and mark this step as complete in the Overview.");
  };

  const runPrivilegedRecon = () => {
    const rolesFile = app.files.find(f => f.type === 'roles_report') || app.files.find(f => f.type === 'user_list');
    if (!rolesFile) return alert("Input Missing: No Roles/Permissions report found. Please go to the 'Inputs' tab and upload a Roles Report (or User List containing roles) to perform this analysis.");

    const issues = analyzePrivilegedAccess(rolesFile);
    onUpdateApp({ ...app, privilegedIssues: issues });
    alert("Analysis Complete: Privileged Role Analysis has been successfully executed. Please review the identified high-risk roles in the 'Recon' tab and mark this step as complete in the Overview.");
  };

  const handleGenerateExceptions = () => {
    const newExceptions = autoGenerateExceptions(app);
    onUpdateApp({ ...app, exceptions: [...app.exceptions, ...newExceptions] });
    alert(`Process Complete: Successfully generated ${newExceptions.length} new exceptions based on current findings. Please review the Exception Register in the 'Risks' tab.`);
  };

  const downloadPackage = async () => {
    const zip = new JSZip();
    const folder = zip.folder(app.name);
    
    // Add Evidence
    app.files.forEach(f => {
        // @ts-ignore
        const Papa = window.Papa;
        if (Papa) folder?.file(`Evidence/${f.type}_${f.name}`, Papa.unparse(f.records));
    });

    // Add Registers
    // @ts-ignore
    const Papa = window.Papa;
    if (app.exceptions.length > 0) {
      folder?.file('Exception_Register.csv', Papa.unparse(app.exceptions));
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.financialYear}_${meta.quarter}_${app.name}_Audit_Package.zip`;
    a.click();
    // Do not auto mark gen_package
  };

  const handlePostComment = () => {
     if (!newComment.trim()) return;
     const entry: CommentEntry = {
        id: crypto.randomUUID(),
        text: newComment,
        author: meta.user.displayName,
        role: meta.user.role,
        timestamp: new Date().toLocaleString()
     };
     onUpdateApp({ ...app, comments: [...(app.comments || []), entry] });
     setNewComment('');
  };

  const toggleLock = () => {
      if (app.isLocked) {
          const reason = prompt("Governance Requirement: Please provide a mandatory justification for re-opening this locked audit workspace.");
          if (reason) {
             const newLog = logChange('Governance', 'Unlock Audit', 'Locked', 'Open', reason);
             onUpdateApp({...app, isLocked: false, status: 'In Progress', changeLog: newLog});
          }
      } else {
          if (confirm("Governance Check: Are you sure you want to mark this audit as Complete? This will lock the workspace to prevent further changes. You can only reopen it with a justification.")) {
             const newLog = logChange('Governance', 'Complete Audit', 'In Progress', 'Completed');
             onUpdateApp({...app, isLocked: true, status: 'Completed', changeLog: newLog});
          }
      }
  };

  // --- Renderers ---

  const renderChecklist = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Audit Execution Steps</h3>
      <p className="text-sm text-gray-500 mb-4">Click a step to mark it as complete. Completed steps lock related actions. Reopening requires justification.</p>
      
      <div className="space-y-3">
        {CHECKLIST_ITEMS.filter(item => item.req === 'all' || (app.config.activeRecon && item.req === 'activeRecon') || (app.config.rrRecon && item.req === 'rrRecon')).map(item => {
          const isDone = app.checklist.includes(item.id);
          
          return (
            <div 
              key={item.id} 
              onClick={() => handleToggleStep(item.id, item.label)}
              className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-all ${isDone ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'} ${isReadOnly ? 'cursor-default' : ''}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${isDone ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300'}`}>
                {isDone && <Check size={14} />}
              </div>
              <div className="flex-1">
                 <span className={`${isDone ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>{item.label}</span>
              </div>
              {isDone && <span title="Step Locked"><Lock size={14} className="text-gray-400" /></span>}
            </div>
          );
        })}
      </div>
      
      {app.changeLog.length > 0 && (
        <div className="mt-8 pt-4 border-t">
          <h4 className="font-bold text-gray-600 mb-2 flex items-center gap-2"><History size={16}/> Change History</h4>
          <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
            {app.changeLog.map((log, i) => (
              <div key={i} className="border-b border-gray-200 pb-1">
                <span className="font-bold">{log.timestamp}:</span> {log.actor} changed {log.section} ({log.action}) - <span className="italic">{log.justification}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderInputs = () => {
    const userListLocked = isStepLocked('upload_users');
    const rolesLocked = isStepLocked('upload_roles');

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded border">
          <h4 className="font-bold mb-4">Source Reports</h4>
          {isReadOnly && <div className="text-xs text-orange-600 mb-2">Editing disabled in Read-Only mode.</div>}
          
          <div className="grid grid-cols-2 gap-4">
              {app.config.activeRecon && (
                   <div className={`border p-4 rounded ${userListLocked ? 'bg-gray-100 opacity-75' : 'bg-blue-50'}`}>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-bold text-blue-900 block">User List (Baseline)</label>
                        {userListLocked && <span title="Locked by 'Upload User List' step"><Lock size={14} className="text-gray-500" /></span>}
                      </div>
                      
                      {isReadOnly || userListLocked ? 
                          <div className="text-sm font-mono text-gray-600">{app.files.find(f => f.type === 'user_list')?.name || 'No file uploaded'}</div> : 
                          <FileUpload compact label="Upload Active Users CSV" onUpload={f => handleFile(f, 'user_list')} />
                      }
                      {app.files.find(f => f.type === 'user_list') && <div className="mt-2 text-xs text-green-600">✅ Uploaded</div>}
                   </div>
              )}
              {app.config.rrRecon && (
                   <div className={`border p-4 rounded ${rolesLocked ? 'bg-gray-100 opacity-75' : 'bg-purple-50'}`}>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-bold text-purple-900 block">Roles & Permissions</label>
                        {rolesLocked && <span title="Locked by 'Upload Roles' step"><Lock size={14} className="text-gray-500" /></span>}
                      </div>

                      {isReadOnly || rolesLocked ? 
                          <div className="text-sm font-mono text-gray-600">{app.files.find(f => f.type === 'roles_report')?.name || 'No file uploaded'}</div> : 
                          <FileUpload compact label="Upload Roles CSV" onUpload={f => handleFile(f, 'roles_report')} />
                      }
                      {app.files.find(f => f.type === 'roles_report') && <div className="mt-2 text-xs text-green-600">✅ Uploaded</div>}
                   </div>
              )}
          </div>
          {(userListLocked || rolesLocked) && !isReadOnly && (
             <div className="mt-4 text-xs text-gray-500 flex items-center gap-1">
                <AlertCircle size={12}/> Some inputs are locked because the corresponding audit step is marked as complete. Reopen the step in 'Overview' to modify.
             </div>
          )}
        </div>
      </div>
    );
  }

  const renderRecon = () => {
      const identityLocked = isStepLocked('run_identity');
      const privLocked = isStepLocked('gen_priv_report');

      return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <div className="relative">
                    <Button variant="secondary" disabled={isReadOnly || identityLocked} onClick={runIdentityRecon}>Run Identity Check</Button>
                    {identityLocked && <Lock size={14} className="absolute -top-2 -right-2 text-gray-400 bg-white rounded-full"/>}
                </div>
                <div className="relative">
                    <Button variant="secondary" disabled={isReadOnly || privLocked} onClick={runPrivilegedRecon}>Analyze Privileged Roles</Button>
                    {privLocked && <Lock size={14} className="absolute -top-2 -right-2 text-gray-400 bg-white rounded-full"/>}
                </div>
            </div>
            
            {isReadOnly && <div className="text-xs text-orange-600">Reconciliation disabled in Read-Only mode.</div>}
            {(identityLocked || privLocked) && !isReadOnly && (
                <div className="text-xs text-gray-500 italic">Analysis buttons locked because steps are marked complete.</div>
            )}
            
            {app.identityIssues && app.identityIssues.length > 0 && (
                <div className="bg-white p-6 rounded border">
                    <h4 className="font-bold mb-4 text-red-700">Identity Findings</h4>
                    {/* @ts-ignore */}
                    <ReconciliationTable issues={app.identityIssues} identityName={identitySource?.file.name || 'Source'} appName={app.name} />
                </div>
            )}
            {app.privilegedIssues && app.privilegedIssues.length > 0 && (
               <div className="bg-white p-6 rounded border">
                   <h4 className="font-bold mb-4 text-purple-700">Privileged Roles ({app.privilegedIssues.length})</h4>
                   <div className="max-h-60 overflow-y-auto">
                       <table className="w-full text-sm">
                           <thead className="bg-gray-50 sticky top-0"><tr><th className="p-2 text-left">User</th><th className="p-2 text-left">Role</th><th className="p-2 text-left">Risk Score</th></tr></thead>
                           <tbody>
                               {app.privilegedIssues.map((i, idx) => (
                                   <tr key={idx} className="border-b">
                                       <td className="p-2 font-medium">{i.userId}</td>
                                       <td className="p-2">{i.role}</td>
                                       <td className="p-2">
                                           <span className={`px-2 py-0.5 rounded text-xs ${i.riskScore.level === 'High' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                               {i.riskScore.total} ({i.riskScore.level})
                                           </span>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>
           )}
        </div>
      );
  }

  const renderComments = () => (
      <div className="bg-white p-6 rounded border h-full flex flex-col">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><MessageSquare size={18}/> Audit Collaboration</h3>
          
          <div className="flex-1 overflow-y-auto bg-gray-50 rounded p-4 space-y-4 mb-4 min-h-[300px]">
              {app.comments && app.comments.length > 0 ? app.comments.map(c => (
                  <div key={c.id} className="bg-white p-3 rounded shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm text-gray-700">{c.author} <span className="text-xs text-gray-400 font-normal">({c.role})</span></span>
                          <span className="text-xs text-gray-400">{c.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-800">{c.text}</p>
                  </div>
              )) : (
                  <div className="text-center text-gray-400 mt-10">No comments yet. Start a discussion.</div>
              )}
          </div>

          <div className="flex gap-2">
              <input 
                 className="flex-1 border p-2 rounded"
                 placeholder="Add a comment..."
                 value={newComment}
                 onChange={e => setNewComment(e.target.value)}
                 onKeyPress={e => e.key === 'Enter' && handlePostComment()}
              />
              <Button onClick={handlePostComment} icon={<Send size={14}/>}>Post</Button>
          </div>
      </div>
  );

  return (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={onBack} icon={<Check size={16} />}>Back</Button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {app.name} 
                        {app.isLocked && <Lock size={16} className="text-green-600"/>}
                    </h2>
                    <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="font-mono">{meta.rootFolder}/{app.name}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                {/* Tabs */}
                 <div className="flex bg-gray-100 p-1 rounded-md">
                     {([
                         ['checklist', 'Overview', CheckSquare],
                         ['inputs', 'Inputs', Upload],
                         ['recon', 'Recon', Activity],
                         ['risks', 'Risks', AlertTriangle],
                         ['comments', 'Comments', MessageSquare],
                         ['package', 'Package', Package]
                     ] as const).map(([id, label, Icon]) => (
                         <button 
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`px-3 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === id ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                         >
                            <Icon size={14}/> {label}
                         </button>
                     ))}
                 </div>

                 {/* Governance Actions */}
                 {viewMode === 'IT Owner' && (
                     <button 
                        onClick={toggleLock}
                        className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-colors border ${app.isLocked ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                     >
                        {app.isLocked ? <><Unlock size={14}/> Re-Open</> : <><Lock size={14}/> Complete</>}
                     </button>
                 )}
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            <div className="max-w-6xl mx-auto">
                {activeTab === 'checklist' && renderChecklist()}
                {activeTab === 'inputs' && renderInputs()}
                {activeTab === 'comments' && renderComments()}
                {activeTab === 'recon' && renderRecon()}
                {activeTab === 'risks' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-white p-4 rounded border">
                            <div>
                                <h3 className="font-bold text-gray-800">Exceptions Register</h3>
                                <p className="text-sm text-gray-500">Manage identified risks.</p>
                            </div>
                            <Button disabled={isReadOnly || isStepLocked('generate_exceptions')} onClick={handleGenerateExceptions} icon={<ShieldAlert size={16}/>}>Auto-Generate</Button>
                        </div>
                        {isStepLocked('generate_exceptions') && !isReadOnly && (
                            <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                                <Lock size={10}/> Generation locked. Reopen 'Generate Exception Register' step to regenerate.
                            </div>
                        )}
                        
                        {app.exceptions.length > 0 ? (
                            <div className="bg-white rounded border overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-3">User</th>
                                            <th className="p-3">Risk</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {app.exceptions.map((ex, i) => (
                                            <tr key={i} className="border-b">
                                                <td className="p-3 font-medium">{ex.userId}</td>
                                                <td className="p-3"><span className="bg-red-100 text-red-800 px-1 rounded text-xs">{ex.riskLevel}</span></td>
                                                <td className="p-3">{ex.status}</td>
                                                <td className="p-3">
                                                    {ex.status === 'Open' && !isReadOnly && (
                                                        <button 
                                                            onClick={() => {
                                                                const just = prompt("Enter Justification:");
                                                                if (just) {
                                                                    const updated = app.exceptions.map(e => e.id === ex.id ? {...e, status: 'Closed' as const, justification: just} : e);
                                                                    onUpdateApp({...app, exceptions: updated});
                                                                }
                                                            }}
                                                            className="text-blue-600 hover:underline text-xs"
                                                        >
                                                            Justify
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <div className="p-8 text-center text-gray-400 bg-gray-50 border border-dashed rounded">No exceptions found.</div>}
                    </div>
                )}
                {activeTab === 'package' && (
                    <div className="bg-white p-8 rounded shadow text-center">
                         <h3 className="text-xl font-bold mb-4">Audit Package Ready</h3>
                         <div className="flex justify-center mb-6">
                             <ShieldAlert className={app.exceptions.some(e => e.status === 'Open') ? 'text-red-500' : 'text-green-500'} size={64} />
                         </div>
                         <p className="mb-6 text-gray-600">
                             {app.exceptions.some(e => e.status === 'Open') 
                                ? "Warning: Open exceptions exist." 
                                : "Ready for download."}
                         </p>
                         <Button className="w-full py-4 text-lg" onClick={downloadPackage}>Download Package (Zip)</Button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};