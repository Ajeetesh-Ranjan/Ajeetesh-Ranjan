import React from 'react';
import { IdentityIssue, FileData } from '../types';
import { UserX, HelpCircle, CalendarClock } from 'lucide-react';

interface Props {
  issues: IdentityIssue[];
  identityName: string;
  appName: string;
}

export const ReconciliationTable: React.FC<Props> = ({ issues, identityName, appName }) => {
  if (issues.length === 0) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
        ✅ No identity discrepancies found. All active {appName} users are active in {identityName}.
      </div>
    );
  }

  const terminated = issues.filter(i => i.issueType === 'TERMINATED_BUT_ACTIVE');
  const orphans = issues.filter(i => i.issueType === 'NOT_FOUND_IN_SOURCE');
  const future = issues.filter(i => i.issueType === 'FUTURE_TERMINATION');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 p-3 rounded">
            <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                <UserX size={16}/> Terminated & Active
            </div>
            <div className="text-xl font-bold text-red-900">{terminated.length}</div>
            <div className="text-xs text-red-600">Must Deactivate</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 p-3 rounded">
            <div className="flex items-center gap-2 text-orange-800 font-bold text-sm">
                <HelpCircle size={16}/> Not in {identityName}
            </div>
            <div className="text-xl font-bold text-orange-900">{orphans.length}</div>
            <div className="text-xs text-orange-600">Potential Orphans</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-3 rounded">
            <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                <CalendarClock size={16}/> Future Termination
            </div>
            <div className="text-xl font-bold text-blue-900">{future.length}</div>
            <div className="text-xs text-blue-600">Monitor closely</div>
        </div>
      </div>

      <div className="bg-white border rounded overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            Discrepancy Details
        </div>
        <div className="max-h-60 overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-4 py-2">User ID</th>
                        <th className="px-4 py-2">Issue Type</th>
                        <th className="px-4 py-2">Source Status</th>
                        <th className="px-4 py-2">Term Date</th>
                    </tr>
                </thead>
                <tbody>
                    {issues.map((issue, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{issue.userId}</td>
                            <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium
                                    ${issue.issueType === 'TERMINATED_BUT_ACTIVE' ? 'bg-red-100 text-red-800' : 
                                      issue.issueType === 'NOT_FOUND_IN_SOURCE' ? 'bg-orange-100 text-orange-800' : 
                                      'bg-blue-100 text-blue-800'}`}>
                                    {issue.issueType.replace(/_/g, ' ')}
                                </span>
                            </td>
                            <td className="px-4 py-2 text-gray-500">{issue.identityStatus}</td>
                            <td className="px-4 py-2 text-gray-500">{issue.identityTermDate}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};