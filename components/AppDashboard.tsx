import React, { useState, useRef } from 'react';
import { AppScope, AppState, GlobalIdentityConfig } from '../types';
import { Button } from './Button';
import { FileUpload } from './FileUpload';
import { Plus, ShieldCheck, ChevronRight, Clock, AlertTriangle, Trash2, Calendar, User, Eye, Edit3, Save, FileText, CheckCircle2, FileBadge, FileCheck, X } from 'lucide-react';
import { parseCSV } from '../services/csvService';
import { SLA_DAYS } from '../constants';

interface Props {
  state: AppState;
  onAddApp: (name: string, config: { active: boolean; rr: boolean }) => void;
  onSelectApp: (id: string) => void;
  onSetIdentity: (config: GlobalIdentityConfig) => void;
  onDeleteApp: (id: string) => void;
  onToggleView: (mode: 'IT Owner' | 'Auditor') => void;
  onDownloadManifest: () => void;
  onSave: () => void;
}

export const AppDashboard: React.FC<Props> = ({ 
  state, onAddApp, onSelectApp, onSetIdentity, onDeleteApp, onToggleView, onDownloadManifest, onSave 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newConfig, setNewConfig] = useState({ active: true, rr: true });
  
  // Identity Config Modal State
  const [isConfiguringIdentity, setIsConfiguringIdentity] = useState(false);
  const [identityForm, setIdentityForm] = useState<{
      file: File | null,
      evidence: File | null,
      method: string
  }>({ file: null, evidence: null, method: '' });

  const isAuditor = state.viewMode === 'Auditor';

  const handleIdentitySave = async () => {
      if (!identityForm.file) {
          alert("Configuration Error: An Identity Source Report (CSV) is required. Please select a file before saving.");
          return;
      }
      try {
          const parsed = await parseCSV(identityForm.file);
          const config: GlobalIdentityConfig = {
              file: parsed,
              evidence: identityForm.evidence ? {
                  name: identityForm.evidence.name,
                  timestamp: identityForm.evidence.lastModified,
                  size: identityForm.evidence.size
              } : undefined,
              extractionMethod: identityForm.method
          };
          onSetIdentity(config);
          setIsConfiguringIdentity(false);
          setIdentityForm({ file: null, evidence: null, method: '' });
      } catch (e) {
          alert("File Parsing Error: Failed to process the CSV file. Please ensure the file is a standard CSV format with headers.\n\nTechnical Details: " + e);
      }
  };

  const handleAdd = () => {
    if (!newAppName.trim()) return;
    onAddApp(newAppName, newConfig);
    setNewAppName('');
    setIsAdding(false);
  };

  const getSLAStatus = (app: AppScope) => {
    if (!app.startedAt) return { color: 'text-gray-400', label: 'Not Started', bg: 'bg-gray-100' };
    const daysOpen = Math.floor((Date.now() - app.startedAt) / (1000 * 60 * 60 * 24));
    
    if (daysOpen > SLA_DAYS.CLOSURE) return { color: 'text-red-700', label: `${daysOpen} Days (Breach)`, bg: 'bg-red-100' };
    if (daysOpen > SLA_DAYS.REMEDIATION) return { color: 'text-amber-700', label: `${daysOpen} Days (At Risk)`, bg: 'bg-amber-100' };
    return { color: 'text-green-700', label: `${daysOpen} Days (On Track)`, bg: 'bg-green-100' };
  };

  const renderIdentityModal = () => (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Configure Global Identity Source</h3>
                  <button onClick={() => setIsConfiguringIdentity(false)}><X size={20} className="text-gray-500 hover:text-gray-700"/></button>
              </div>
              
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">1. Identity Source Report (Required)</label>
                      <p className="text-xs text-gray-500 mb-2">Upload the master user list from Workday, HRIS, or AD (CSV/XLSX).</p>
                      {identityForm.file ? (
                          <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded border border-green-200">
                              <FileCheck size={16}/> {identityForm.file.name}
                              <button onClick={() => setIdentityForm(s => ({...s, file: null}))} className="ml-auto text-xs underline">Change</button>
                          </div>
                      ) : (
                          <input 
                            type="file" 
                            accept=".csv"
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                            onChange={e => e.target.files && setIdentityForm({...identityForm, file: e.target.files[0]})}
                          />
                      )}
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">2. Extraction Evidence (Optional but Recommended)</label>
                      <p className="text-xs text-gray-500 mb-2">Upload a screenshot or PDF showing the report generation parameters/filters.</p>
                      {identityForm.evidence ? (
                           <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 rounded border border-blue-200">
                               <FileBadge size={16}/> {identityForm.evidence.name}
                               <button onClick={() => setIdentityForm(s => ({...s, evidence: null}))} className="ml-auto text-xs underline">Change</button>
                           </div>
                      ) : (
                          <input 
                            type="file" 
                            accept="image/*,.pdf"
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            onChange={e => e.target.files && setIdentityForm({...identityForm, evidence: e.target.files[0]})}
                          />
                      )}
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">3. Extraction Method Description</label>
                      <textarea 
                          className="w-full border rounded p-2 text-sm h-24"
                          placeholder="Describe how the report was generated (e.g. 'Ran Report ID 123 in Workday with active status filter...')"
                          value={identityForm.method}
                          onChange={e => setIdentityForm({...identityForm, method: e.target.value})}
                      />
                  </div>

                  <div className="flex justify-end pt-4 gap-2">
                      <Button variant="outline" onClick={() => setIsConfiguringIdentity(false)}>Cancel</Button>
                      <Button onClick={handleIdentitySave}>Save Configuration</Button>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in">
      {isConfiguringIdentity && renderIdentityModal()}
      
      {/* Top Bar with Context */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
              <div>
                  <h1 className="text-xl font-bold text-gray-800">{state.metadata.auditName}</h1>
                  <div className="flex gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Calendar size={14}/> {state.metadata.financialYear} - {state.metadata.quarter}</span>
                      <span className="flex items-center gap-1 font-medium text-orange-700 bg-orange-50 px-2 rounded-full border border-orange-100">
                         <User size={14}/> Logged in as: {state.metadata.user.displayName} ({state.metadata.user.role})
                      </span>
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex bg-gray-100 p-1 rounded-md">
                 <button 
                    onClick={() => onToggleView('IT Owner')}
                    className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-2 ${!isAuditor ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
                 >
                    <Edit3 size={12}/> IT Owner
                 </button>
                 <button 
                    onClick={() => onToggleView('Auditor')}
                    className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-2 ${isAuditor ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                 >
                    <Eye size={12}/> Auditor View
                 </button>
             </div>
             <div className="h-6 w-px bg-gray-300 mx-2"></div>
             <Button variant="outline" onClick={onSave} icon={<Save size={14}/>}>Save</Button>
             <Button variant="secondary" onClick={onDownloadManifest} icon={<FileText size={14}/>}>Manifest</Button>
          </div>
      </div>

      {isAuditor && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded text-center text-sm font-medium flex items-center justify-center gap-2">
             <Eye size={16}/> READ ONLY MODE: You are viewing this audit as an Auditor. Editing is disabled.
          </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <div className="text-sm text-gray-500 font-medium">Audit Status</div>
           <div className="text-2xl font-bold text-gray-800">{state.metadata.status}</div>
           <div className="text-xs text-gray-400 mt-1">Started: {state.metadata.startTime.split(',')[0]}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <div className="text-sm text-gray-500 font-medium">Risks Identified</div>
           <div className="text-2xl font-bold text-gray-800">
              {state.apps.reduce((acc, app) => acc + (app.privilegedIssues?.filter(i => i.riskScore.level === 'High').length || 0), 0)}
           </div>
           <div className="text-xs text-red-500 mt-1">High Risk Privileges</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <div className="text-sm text-gray-500 font-medium flex justify-between">
               Global Identity Source
               {!isAuditor && state.identitySource && (
                   <button onClick={() => setIsConfiguringIdentity(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
               )}
           </div>
           {state.identitySource ? (
             <div className="flex items-start gap-2 mt-2">
               <ShieldCheck className="text-green-600 mt-1" size={24} />
               <div className="flex-1">
                 <div className="font-bold text-sm text-gray-700">{state.identitySource.file.name}</div>
                 <div className="text-xs text-gray-500">{state.identitySource.file.records.length} Records</div>
                 {state.identitySource.evidence && (
                     <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                         <FileBadge size={10}/> Evidence: {state.identitySource.evidence.name}
                     </div>
                 )}
                 {state.identitySource.extractionMethod && (
                     <div className="text-xs text-gray-400 mt-1 italic line-clamp-2" title={state.identitySource.extractionMethod}>
                         Method: {state.identitySource.extractionMethod}
                     </div>
                 )}
               </div>
             </div>
           ) : (
             <div className="mt-2">
               {!isAuditor ? (
                 <Button variant="outline" className="w-full text-xs" onClick={() => setIsConfiguringIdentity(true)}>
                    Setup Identity Source
                 </Button>
               ) : (
                 <span className="text-sm text-gray-400 italic">No Identity Source Uploaded</span>
               )}
             </div>
           )}
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <h2 className="text-lg font-bold text-gray-800">Applications in Scope</h2>
           {!isAuditor && <Button onClick={() => setIsAdding(!isAdding)} icon={<Plus size={16}/>}>Add Application</Button>}
        </div>

        {isAdding && (
          <div className="p-6 bg-orange-50 border-b border-orange-100 grid gap-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input 
                 className="p-2 border rounded" 
                 placeholder="Application Name (e.g. Salesforce)"
                 value={newAppName}
                 onChange={e => setNewAppName(e.target.value)}
               />
               <div className="flex gap-4 items-center">
                 <label className="flex items-center gap-2 text-sm text-gray-700">
                   <input type="checkbox" checked={newConfig.active} onChange={e => setNewConfig({...newConfig, active: e.target.checked})}/>
                   Active User Recon
                 </label>
                 <label className="flex items-center gap-2 text-sm text-gray-700">
                   <input type="checkbox" checked={newConfig.rr} onChange={e => setNewConfig({...newConfig, rr: e.target.checked})}/>
                   Roles & Permissions
                 </label>
               </div>
             </div>
             <div className="flex justify-end gap-2">
               <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
               <Button onClick={handleAdd}>Confirm Scope</Button>
             </div>
          </div>
        )}

        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="p-4">Application</th>
              <th className="p-4">Scope</th>
              <th className="p-4">Aging (SLA)</th>
              <th className="p-4">Exceptions</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {state.apps.map(app => {
              const sla = getSLAStatus(app);
              const openExceptions = app.exceptions.filter(e => e.status === 'Open').length;
              
              return (
              <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-gray-800 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                    {app.name.charAt(0)}
                  </div>
                  <div>
                      <div>{app.name}</div>
                      {app.isLocked && <div className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={10}/> Completed</div>}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {app.config.activeRecon && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Active User</span>}
                    {app.config.rrRecon && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">R&R</span>}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center w-fit gap-1 ${sla.color} ${sla.bg}`}>
                    <Clock size={12}/> {sla.label}
                  </span>
                </td>
                <td className="p-4">
                  {openExceptions > 0 ? (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-bold flex items-center w-fit gap-1">
                      <AlertTriangle size={12}/> {openExceptions} Open
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                </td>
                <td className="p-4 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => onSelectApp(app.id)}>
                    Open <ChevronRight size={14} className="ml-1"/>
                  </Button>
                   {!isAuditor && (
                     <button 
                       onClick={() => { if(confirm('Warning: Are you sure you want to permanently delete this application workspace? All uploaded evidence and logs will be lost. This action cannot be undone.')) onDeleteApp(app.id) }} 
                       className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                       title="Delete Workspace"
                     >
                       <Trash2 size={16}/>
                     </button>
                   )}
                </td>
              </tr>
            )})}
            {state.apps.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">No applications added to scope yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};