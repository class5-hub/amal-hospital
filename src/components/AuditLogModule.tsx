import React, { useState } from 'react';
import { AuditLogEntry, Language } from '../types/hmis.ts';
import { 
  ShieldCheck, 
  Filter, 
  Clock, 
  User, 
  Search,
  FileText,
  AlertCircle
} from 'lucide-react';

interface AuditLogModuleProps {
  logs: AuditLogEntry[];
  language: Language;
}

export const AuditLogModule: React.FC<AuditLogModuleProps> = ({ logs, language }) => {
  const isAr = language === 'ar';
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchUser = log.userName.toLowerCase().includes(term);
      const matchDetails = log.details.toLowerCase().includes(term);
      const matchMRN = log.patientMRN?.toLowerCase().includes(term);
      const matchEntity = log.entity.toLowerCase().includes(term);
      return matchUser || matchDetails || matchMRN || matchEntity;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>{isAr ? 'سجل التدقيق الرقمي غير القابل للتعديل (Tamper-Proof Audit Trail)' : 'Tamper-Proof System Audit Trail'}</span>
          </h2>
          <span className="text-xs text-slate-500">
            {isAr ? 'توثيق كامل لكافة عمليات الإنشاء والتعديل والإيقاف والاطلاع وحماية السجلات الطبية' : 'Complete audit of creation, updates, discontinuations, and record views'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute top-2 right-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={isAr ? 'بحث في السجل...' : 'Search logs...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded pr-8 pl-2.5 py-1 text-xs w-44"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-transparent text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="all">{isAr ? 'كافة العمليات' : 'All Actions'}</option>
              <option value="CREATE">CREATE (إنشاء)</option>
              <option value="UPDATE">UPDATE (تعديل)</option>
              <option value="DISCONTINUE">DISCONTINUE (إيقاف دواء)</option>
              <option value="VIEW">VIEW (اطلاع / إقرار)</option>
              <option value="SUPERVISOR_OVERRIDE">SUPERVISOR (اعتماد مشرف)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">{isAr ? 'التاريخ والوقت' : 'Timestamp'}</th>
                <th className="py-2.5 px-3">{isAr ? 'المستخدم' : 'User'}</th>
                <th className="py-2.5 px-3">{isAr ? 'الدور الوظيفي' : 'Role'}</th>
                <th className="py-2.5 px-3">{isAr ? 'نوع الإجراء' : 'Action'}</th>
                <th className="py-2.5 px-3">{isAr ? 'الكيان والمستند' : 'Entity'}</th>
                <th className="py-2.5 px-3">{isAr ? 'ملف المريض (MRN)' : 'Patient MRN'}</th>
                <th className="py-2.5 px-3">{isAr ? 'تفاصيل الحدث الموثق' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    {isAr ? 'لا توجد سجلات تدقيق مطابقة' : 'No audit logs found.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {log.timestamp.replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        log.action === 'CREATE' ? 'bg-teal-50 text-teal-800 border border-teal-200' :
                        log.action === 'UPDATE' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                        log.action === 'DISCONTINUE' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                        log.action === 'VIEW' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {log.entity}
                    </td>
                    <td className="py-2.5 px-3 text-teal-700 font-semibold">
                      {log.patientMRN || '--'}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-700 max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
