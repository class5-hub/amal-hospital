import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, 
  User, 
  ChevronDown, 
  Check, 
  X, 
  Building2, 
  ShieldAlert, 
  BedDouble, 
  Filter,
  Activity,
  HeartHandshake
} from 'lucide-react';
import { Patient, Admission, Language } from '../types/hmis.ts';

interface SearchablePatientDropboxProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  admissions: Admission[];
  patients: Patient[];
  onSelectAdmission: (adm: Admission) => void;
  language: Language;
  compact?: boolean;
}

export const SearchablePatientDropbox: React.FC<SearchablePatientDropboxProps> = ({
  currentPatient,
  currentAdmission,
  admissions,
  patients,
  onSelectAdmission,
  language,
  compact = false
}) => {
  const isAr = language === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hasAllergy'>('all');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setFocusedIndex(0);
    }
  }, [isOpen]);

  // Extract unique departments/wards
  const wards = useMemo(() => {
    const set = new Set<string>();
    admissions.forEach(adm => {
      if (adm.department) set.add(adm.department);
      else if (adm.roomType) set.add(adm.roomType);
    });
    return Array.from(set);
  }, [admissions]);

  // Filter admissions and patients
  const filteredAdmissions = useMemo(() => {
    return admissions.filter(adm => {
      const pat = patients.find(p => p.mrn === adm.mrn);
      const q = query.toLowerCase().trim();

      // Text query match: Name, MRN, Room, AdmId, NationalId, Consultant, Payer
      const matchesQuery = !q || (
        adm.patientName.toLowerCase().includes(q) ||
        adm.mrn.toLowerCase().includes(q) ||
        adm.admissionId.toLowerCase().includes(q) ||
        adm.roomNumber.toLowerCase().includes(q) ||
        adm.attendingConsultantName.toLowerCase().includes(q) ||
        (adm.corporateName && adm.corporateName.toLowerCase().includes(q)) ||
        (adm.packageName && adm.packageName.toLowerCase().includes(q)) ||
        (pat && pat.nationalId && pat.nationalId.includes(q)) ||
        (pat && pat.phone && pat.phone.includes(q))
      );

      // Ward filter
      const matchesWard = selectedWard === 'all' || 
        (adm.department && adm.department.includes(selectedWard)) ||
        (adm.roomType && adm.roomType.toLowerCase().includes(selectedWard.toLowerCase()));

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = adm.status === 'active';
      } else if (statusFilter === 'hasAllergy') {
        matchesStatus = !!pat && pat.allergies.length > 0 && !pat.allergies[0].toLowerCase().includes('no known');
      }

      return matchesQuery && matchesWard && matchesStatus;
    });
  }, [admissions, patients, query, selectedWard, statusFilter]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filteredAdmissions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : filteredAdmissions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredAdmissions[focusedIndex]) {
        onSelectAdmission(filteredAdmissions[focusedIndex]);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-right rtl:text-right ltr:text-left" ref={containerRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`flex items-center justify-between gap-2.5 bg-slate-50 hover:bg-white text-slate-900 border border-slate-300 hover:border-teal-500 rounded-lg transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-sm'
        }`}
        title={isAr ? 'البحث واختيار مريض منوم' : 'Search & switch active inpatient'}
      >
        <div className="flex items-center gap-2 truncate">
          <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold shrink-0">
            {currentAdmission?.patientName ? currentAdmission.patientName.charAt(0) : <User className="w-3 h-3" />}
          </div>
          <div className="flex flex-col text-right rtl:text-right ltr:text-left truncate">
            <span className="font-bold text-slate-900 truncate">
              {currentAdmission ? currentAdmission.patientName : (isAr ? 'اختر مريضاً منوماً...' : 'Select Inpatient...')}
            </span>
            {currentAdmission && (
              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 leading-none">
                <span className="font-semibold text-teal-700">{currentAdmission.roomNumber}</span>
                <span>·</span>
                <span>{currentAdmission.mrn}</span>
                <span>·</span>
                <span>{currentAdmission.admissionId}</span>
              </span>
            )}
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-teal-600' : ''}`} />
      </button>

      {/* Expanded Dropbox Overlay Panel */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 z-50 w-80 sm:w-96 md:w-[440px] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden rtl:right-0 ltr:left-0 animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-3 bg-slate-900 text-white border-b border-slate-800">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute rtl:right-3 ltr:left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={isAr ? 'ابحث بالاسم، رقم الملف MRN، الغرفة، أو رقم الدخول...' : 'Search by name, MRN, bed, ADM ID, or national ID...'}
                className="w-full bg-slate-800 text-white placeholder:text-slate-400 text-xs rounded-lg rtl:pr-9 rtl:pl-8 ltr:pl-9 ltr:pr-8 py-2 border border-slate-700 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute rtl:left-2.5 ltr:right-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Chips inside Dropbox */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto text-[11px] pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 rounded font-medium whitespace-nowrap transition-colors ${
                  statusFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isAr ? 'الكل' : 'All'} ({admissions.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-2 py-0.5 rounded font-medium whitespace-nowrap transition-colors ${
                  statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isAr ? 'الإيواء النشط' : 'Active Only'}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('hasAllergy')}
                className={`px-2 py-0.5 rounded font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                  statusFilter === 'hasAllergy' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-300 hover:bg-slate-700'
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                <span>{isAr ? 'تنبيه حساسية' : 'With Allergies'}</span>
              </button>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>
              {isAr ? 'النتائج المطابقة:' : 'Matching Admissions:'} <strong className="text-slate-900">{filteredAdmissions.length}</strong>
            </span>
            <span className="text-[10px] text-slate-400">
              {isAr ? 'استخدم الأسهم ⇅ للتنقل وEnter للاختيار' : 'Use ⇅ to navigate, Enter to select'}
            </span>
          </div>

          {/* List of Filtered Inpatient Stays */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {filteredAdmissions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">
                  {isAr ? 'لم يتم العثور على مريض يطابق معايير البحث' : 'No matching inpatients found'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isAr ? 'جرّب البحث برقم الغرفة أو جزء من الاسم' : 'Try searching by room number or partial name'}
                </p>
              </div>
            ) : (
              filteredAdmissions.map((adm, idx) => {
                const pat = patients.find(p => p.mrn === adm.mrn);
                const isSelected = currentAdmission?.admissionId === adm.admissionId;
                const isFocused = idx === focusedIndex;
                const hasAllergy = !!pat && pat.allergies.length > 0 && !pat.allergies[0].toLowerCase().includes('no known');

                return (
                  <div
                    key={adm.admissionId}
                    onClick={() => {
                      onSelectAdmission(adm);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`p-3 cursor-pointer transition-colors text-right rtl:text-right ltr:text-left flex items-start justify-between gap-3 ${
                      isSelected ? 'bg-teal-50/70 border-r-4 rtl:border-r-4 ltr:border-l-4 border-teal-600' : 
                      isFocused ? 'bg-slate-50' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 truncate">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        pat?.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {adm.patientName.charAt(0)}
                      </div>

                      <div className="flex flex-col truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {adm.patientName}
                          </span>
                          {hasAllergy && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-0.5">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              <span>{isAr ? 'حساسية' : 'Allergy'}</span>
                            </span>
                          )}
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            adm.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {adm.status === 'active' ? (isAr ? 'منوم' : 'Active') : adm.status}
                          </span>
                        </div>

                        {/* Room, Bed & Admission Details */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono mt-0.5">
                          <span className="font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                            {adm.roomNumber} ({adm.roomType})
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>MRN: <strong className="text-slate-800">{adm.mrn}</strong></span>
                          <span className="text-slate-300">·</span>
                          <span>ADM: <strong className="text-slate-700">{adm.admissionId}</strong></span>
                        </div>

                        {/* Consultant & Payer Info */}
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                          <span className="truncate">
                            {isAr ? 'الاستشاري:' : 'Doctor:'} {adm.attendingConsultantName}
                          </span>
                          <span>·</span>
                          <span className="truncate text-slate-600 font-medium">
                            {adm.packageName || adm.corporateName || (isAr ? 'دفع ذاتي' : 'Self-Pay')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Blood Group & Selection Check */}
                    <div className="flex flex-col items-end shrink-0 gap-1 text-right">
                      {pat?.bloodGroup && (
                        <span className="text-xs font-bold font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          {pat.bloodGroup}
                        </span>
                      )}
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Quick Action */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {isAr ? 'إجمالي المرضى المنومين:' : 'Total Active Inpatients:'} <strong className="text-slate-800">{admissions.filter(a => a.status === 'active').length}</strong>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 font-semibold"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
