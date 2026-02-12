import React, { useState, useRef, useMemo } from 'react';
import { AppState, AppScope, AuditMetadata, UserIdentity, AuditCalendarConfig, GlobalIdentityConfig } from './types';
import { AppDashboard } from './components/AppDashboard';
import { AppWorkspace } from './components/AppWorkspace';
import { Button } from './components/Button';
import { generateAuditManifest } from './services/auditService';
import { Save, Upload, UserCircle, Shield, Calendar, Lock, Settings } from 'lucide-react';

const INITIAL_USER: UserIdentity = {
  displayName: '',
  email: '',
  role: 'IT Owner',
  source: 'Local'
};

const DEFAULT_CALENDAR_CONFIG: AuditCalendarConfig = {
  fyStartMonth: 4, // April
  namingConvention: 'FYXX'
};

const INITIAL_STATE: AppState = {
  view: 'init',
  viewMode: 'IT Owner',
  activeAppId: null,
  metadata: {
    auditId: '',
    auditName: '',
    financialYear: 'FY25',
    quarter: 'Q1',
    user: INITIAL_USER,
    startTime: '',
    rootFolder: '/MyAudit',
    status: 'Open'
  },
  identitySource: null,
  apps: [],
  calendarConfig: DEFAULT_CALENDAR_CONFIG
};

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [showSettings, setShowSettings] = useState(false);
  
  // Init Form State
  const [initForm, setInitForm] = useState({
    auditName: '',
    fy: 'FY25',
    q: 'Q1',
    userName: '',
    userEmail: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Dynamic FY Generation ---
  const fyOptions = useMemo(() => {
    const options = [];
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 1; // Start offering from last year
    const endYear = 2050;

    for (let y = startYear; y <= endYear; y++) {
      let label = '';
      if (state.calendarConfig.namingConvention === 'FYXX') {
        label = `FY${(y + 1).toString().slice(-2)}`;
      } else if (state.calendarConfig.namingConvention === 'FYXXXX') {
        label = `FY${y + 1}`;
      } else {
        label = `${y}-${y + 1}`;
      }
      options.push(label);
    }
    return options;
  }, [state.calendarConfig]);

  // --- Actions ---

  const startAudit = () => {
    if (!initForm.auditName || !initForm.userName || !initForm.userEmail) {
      alert("Validation Error: Please ensure Audit Name, Your Name, and Corporate Email are all provided to initialize the audit ledger.");
      return;
    }

    const auditId = `UAR_${new Date().toISOString().split('T')[0].replace(/-/g,'')}_${Math.floor(Math.random()*1000)}`;
    
    // Strict Folder Hierarchy: UAR / FY / Quarter / AuditName
    const rootFolder = `UAR/${initForm.fy}/${initForm.q}/${initForm.auditName.replace(/\s+/g, '_')}_${auditId}`;

    setState({
      ...state,
      view: 'dashboard',
      metadata: {
        ...state.metadata,
        auditId: auditId,
        auditName: initForm.auditName,
        financialYear: initForm.fy,
        quarter: initForm.q,
        startTime: new Date().toLocaleString(),
        rootFolder: rootFolder,
        user: {
          displayName: initForm.userName,
          email: initForm.userEmail,
          role: 'IT Owner',
          source: 'Local',
          upn: initForm.userEmail, // In local mode, UPN is email
          objectId: `local-guid-${Math.floor(Math.random() * 10000)}` // Simulated GUID for testing
        }
      }
    });
  };

  const addApp = (name: string, config: { active: boolean; rr: boolean }) => {
    const newApp: AppScope = {
      id: crypto.randomUUID(),
      name,
      config: { activeRecon: config.active, rrRecon: config.rr },
      status: 'Not Started',
      isLocked: false,
      startedAt: Date.now(),
      files: [],
      diffs: [],
      checklist: [],
      reviews: [],
      exceptions: [],
      changeLog: [],
      comments: []
    };
    setState(prev => ({ ...prev, apps: [...prev.apps, newApp] }));
  };

  const deleteApp = (id: string) => {
    setState(prev => ({
        ...prev,
        apps: prev.apps.filter(a => a.id !== id)
    }));
  };

  const updateApp = (updated: AppScope) => {
    setState(prev => ({
      ...prev,
      apps: prev.apps.map(a => a.id === updated.id ? updated : a)
    }));
  };

  const saveAuditState = () => {
    const jsonString = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audit_State_${state.metadata.financialYear}_${state.metadata.quarter}_${state.metadata.auditId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadAudit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const loadedState = JSON.parse(json);
        
        // Migration/Validation
        if (!loadedState.metadata || !Array.isArray(loadedState.apps)) {
           alert("Invalid File Format: The uploaded file does not contain the required audit metadata or application structure. Please upload a valid Audit State JSON file.");
           return;
        }
        
        // Ensure new fields exist for backward compatibility
        if (!loadedState.viewMode) loadedState.viewMode = 'IT Owner';
        if (!loadedState.calendarConfig) loadedState.calendarConfig = DEFAULT_CALENDAR_CONFIG;

        loadedState.apps.forEach((app: any) => {
            if (app.isLocked === undefined) app.isLocked = false;
            if (!app.comments) app.comments = [];
        });

        setState(loadedState);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        alert("Error Loading Audit: The selected file could not be parsed. Please ensure it is a valid JSON audit state file exported from this tool.\n\nDetails: " + err);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadManifest = () => {
    const blob = generateAuditManifest(state);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audit_Manifest_${state.metadata.financialYear}_${state.metadata.auditId}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Views ---

  const renderInit = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full border-t-4 border-orange-600 relative">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          title="Admin Settings"
        >
          <Settings size={20} />
        </button>

        <div className="text-center mb-6">
           <h1 className="text-2xl font-bold text-gray-800">Audit Cycle Management</h1>
           <p className="text-gray-500">User Access Review Ledger Setup</p>
        </div>
        
        {showSettings ? (
          <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200 animate-in fade-in">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Settings size={14}/> Audit Calendar Settings
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">FY Start Month</label>
                <select 
                  className="w-full border p-2 rounded text-sm"
                  value={state.calendarConfig.fyStartMonth}
                  onChange={(e) => setState(s => ({...s, calendarConfig: {...s.calendarConfig, fyStartMonth: parseInt(e.target.value)}}))}
                >
                  <option value={1}>January</option>
                  <option value={4}>April</option>
                  <option value={7}>July</option>
                  <option value={10}>October</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Naming Convention</label>
                <select 
                  className="w-full border p-2 rounded text-sm"
                  value={state.calendarConfig.namingConvention}
                  onChange={(e) => setState(s => ({...s, calendarConfig: {...s.calendarConfig, namingConvention: e.target.value as any}}))}
                >
                  <option value="FYXX">Short (e.g. FY25)</option>
                  <option value="FYXXXX">Full (e.g. FY2025)</option>
                  <option value="YYYY-YYYY">Hyphenated (e.g. 2024-2025)</option>
                </select>
              </div>
              <div className="text-right">
                <button onClick={() => setShowSettings(false)} className="text-xs text-blue-600 font-medium hover:underline">Done</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Financial Year</label>
                    <select 
                      className="w-full border p-2 rounded bg-white" 
                      value={initForm.fy} 
                      onChange={e => setInitForm({...initForm, fy: e.target.value})}
                    >
                      {fyOptions.map(year => (
                          <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Quarter</label>
                    <select className="w-full border p-2 rounded bg-white" value={initForm.q} onChange={e => setInitForm({...initForm, q: e.target.value})}>
                      <option>Q1</option>
                      <option>Q2</option>
                      <option>Q3</option>
                      <option>Q4</option>
                    </select>
                </div>
             </div>
  
             <div>
               <label className="block text-xs font-bold text-gray-500 mb-1">Audit Name</label>
               <input 
                 className="w-full border p-2 rounded focus:ring-orange-500 focus:border-orange-500" 
                 placeholder="e.g. Enterprise Access Review"
                 value={initForm.auditName}
                 onChange={e => setInitForm({...initForm, auditName: e.target.value})}
               />
             </div>
  
             <div className="bg-orange-50 p-6 rounded-lg border border-orange-200 shadow-sm">
                <h3 className="text-sm font-bold text-orange-900 mb-3 flex items-center gap-2">
                   <UserCircle size={16}/> IT Owner Identity Capture
                </h3>
                
                {/* Deployment Mode Selection Simulation */}
                <div className="flex gap-2 mb-4">
                    <button className="flex-1 py-1 px-2 text-xs bg-white border border-orange-300 text-orange-700 rounded shadow-sm font-medium">
                       Local / Test Mode
                    </button>
                    <button className="flex-1 py-1 px-2 text-xs bg-gray-50 text-gray-400 rounded cursor-not-allowed border border-transparent" title="Available in Production">
                       <Lock size={10} className="inline mr-1"/> Production (Entra ID)
                    </button>
                </div>
  
                <div className="space-y-3">
                   <div>
                      <label className="block text-xs font-bold text-orange-800 mb-1">Full Name</label>
                      <input 
                      className="w-full border border-orange-200 p-2 rounded text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none" 
                      placeholder="e.g. Ajeetesh"
                      value={initForm.userName}
                      onChange={e => setInitForm({...initForm, userName: e.target.value})}
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-orange-800 mb-1">Corporate Email</label>
                      <input 
                      className="w-full border border-orange-200 p-2 rounded text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none" 
                      placeholder="e.g. ajeetesh@company.com"
                      value={initForm.userEmail}
                      onChange={e => setInitForm({...initForm, userEmail: e.target.value})}
                      />
                   </div>
                   <div className="flex items-center gap-2 text-xs text-orange-600 mt-2">
                      <Shield size={12}/> Identity will be bound to audit manifest.
                   </div>
                </div>
             </div>
  
             <Button className="w-full" onClick={startAudit}>Start Audit Cycle</Button>
  
             <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                <div className="flex-grow border-t border-gray-200"></div>
             </div>
  
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleLoadAudit} 
               className="hidden" 
               accept=".json"
             />
             <Button variant="outline" className="w-full border-dashed text-gray-600" onClick={() => fileInputRef.current?.click()} icon={<Upload size={16}/>}>
               Resume Audit (Load JSON)
             </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (state.view === 'init') {
    return renderInit();
  }

  if (state.view === 'workspace' && state.activeAppId) {
    const activeApp = state.apps.find(a => a.id === state.activeAppId);
    if (!activeApp) {
        // Fallback or error state
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">Error: Application not found.</p>
                <Button onClick={() => setState({...state, view: 'dashboard', activeAppId: null})}>Return to Dashboard</Button>
            </div>
        );
    }
    return (
        <AppWorkspace 
           app={activeApp}
           identitySource={state.identitySource}
           onUpdateApp={updateApp}
           onBack={() => setState({ ...state, view: 'dashboard', activeAppId: null })}
           meta={state.metadata}
           viewMode={state.viewMode}
        />
    );
  }

  return (
    <AppDashboard
       state={state}
       onAddApp={addApp}
       onSelectApp={(id) => setState({ ...state, view: 'workspace', activeAppId: id })}
       onSetIdentity={(config) => setState({ ...state, identitySource: config })}
       onDeleteApp={deleteApp}
       onToggleView={(mode) => setState({ ...state, viewMode: mode })}
       onDownloadManifest={handleDownloadManifest}
       onSave={saveAuditState}
    />
  );
}
