import React from 'react';
import { DiffResult, FileData } from '../types';
import { detectIdColumn } from '../services/csvService';
import { UserMinus, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

interface DiffTableProps {
  baseline: FileData;
  target: FileData;
  diff: DiffResult;
}

export const DiffTable: React.FC<DiffTableProps> = ({ baseline, target, diff }) => {
  const idCol = detectIdColumn(baseline.headers);

  if (!diff) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 font-bold mb-1">
            <UserMinus size={18} /> Removed Users
          </div>
          <div className="text-2xl font-bold text-red-800">{diff.removed.length}</div>
          <div className="text-xs text-red-600">Action: Deactivate in Target</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700 font-bold mb-1">
            <AlertCircle size={18} /> Modified Attributes
          </div>
          <div className="text-2xl font-bold text-amber-800">{diff.modified.length}</div>
          <div className="text-xs text-amber-600">Action: Review Role/Group Changes</div>
        </div>
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 font-bold mb-1">
            <UserPlus size={18} /> New Users
          </div>
          <div className="text-2xl font-bold text-green-800">{diff.added.length}</div>
          <div className="text-xs text-green-600">Compared to baseline</div>
        </div>
      </div>

      {diff.removed.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <div className="bg-red-100 px-4 py-2 border-b border-red-200 font-semibold text-red-800 text-sm">
            Users present in {baseline.name} but MISSING in {target.name}
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr>
                  <th className="px-4 py-2">{idCol}</th>
                  {baseline.headers.slice(0, 3).filter(h => h !== idCol).map(h => (
                    <th key={h} className="px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diff.removed.map((rec, i) => (
                  <tr key={i} className="border-b hover:bg-red-50">
                    <td className="px-4 py-2 font-medium">{rec[idCol]}</td>
                    {baseline.headers.slice(0, 3).filter(h => h !== idCol).map(h => (
                      <td key={h} className="px-4 py-2 text-gray-500">{rec[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {diff.modified.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
           <div className="bg-amber-100 px-4 py-2 border-b border-amber-200 font-semibold text-amber-800 text-sm">
            Attribute Changes (Role/Permission updates)
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr>
                  <th className="px-4 py-2">User ID</th>
                  <th className="px-4 py-2">Field Changed</th>
                  <th className="px-4 py-2">Old Value ({baseline.name})</th>
                  <th className="px-4 py-2">New Value ({target.name})</th>
                </tr>
              </thead>
              <tbody>
                {diff.modified.map((mod, i) => (
                  <React.Fragment key={i}>
                    {mod.changes.map((change, cIdx) => (
                      <tr key={`${i}-${cIdx}`} className="border-b hover:bg-amber-50">
                        {cIdx === 0 && (
                          <td rowSpan={mod.changes.length} className="px-4 py-2 font-medium border-r bg-gray-50">
                            {mod.user}
                          </td>
                        )}
                        <td className="px-4 py-2 text-gray-600">{change.field}</td>
                        <td className="px-4 py-2 text-red-600 bg-red-50/50 line-through">{change.oldValue}</td>
                        <td className="px-4 py-2 text-green-600 bg-green-50/50">{change.newValue}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {diff.removed.length === 0 && diff.modified.length === 0 && diff.added.length === 0 && (
         <div className="p-8 text-center text-gray-500 bg-gray-50 rounded border border-dashed">
            <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
            <p>Files are identical. No discrepancies found.</p>
         </div>
      )}
    </div>
  );
};