import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  User, 
  BedDouble, 
  FlaskConical, 
  Scissors, 
  Package, 
  CheckCircle2, 
  DollarSign, 
  FileText, 
  Calendar, 
  Boxes, 
  ShieldCheck, 
  Stethoscope, 
  Sparkles, 
  X, 
  ArrowRight,
  ClipboardList,
  Heart,
  Barcode
} from 'lucide-react';
import { Admission, Patient, Language } from '../types/hmis.ts';

interface GlobalCommandDropboxProps {
  isOpen: boolean;
  onClose: () => void;
  admissions: Admission[];
  patients: Patient[];
  onSelectAdmission: (adm: Admission) => void;
  onNavigateTab: (tab: any) => void;
  onOpenLabWorksheet?: () => void;
  onOpenBarcodeModal?: () => void;
  language: Language;
}

export const GlobalCommandDropbox: React.FC<GlobalCommandDropboxProps> = ({
  isOpen,
  onClose,
  admissions,
  patients,
  onSelectAdmission,
  onNavigateTab,
  onOpenLabWorksheet,
  onOpenBarcodeModal,
  language
}) => {
  const isAr = language === 'ar';
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global key listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Define modules catalogue for quick navigation
  const modules = useMemo(() => [
    { id: 'clinical', nameAr: 'الملف الطبي وسريري النساء والولادة', nameEn: 'Clinical Workstation & Ob/Gyn EMR', icon: Heart, category: 'Clinical' },
    { id: 'lis', nameAr: 'المختبر والتحاليل الطبية LIS (ورقة عمل)', nameEn: 'Laboratory LIS & Requisition Worksheet', icon: FlaskConical, category: 'Clinical' },
    { id: 'emar', nameAr: 'سجل إعطاء الأدوية التمريضي eMAR', nameEn: 'Nursing eMAR Medication Admin', icon: CheckCircle2, category: 'Clinical' },
    { id: 'orders', nameAr: 'الأوامر الطبية والوجبات الغذائية', nameEn: 'Physician Orders & Dietary Service', icon: ClipboardList, category: 'Clinical' },
    { id: 'surgery', nameAr: 'العمليات الجراحية والتخدير والولادات', nameEn: 'Operating Theater & Anesthesia', icon: Scissors, category: 'Clinical' },
    { id: 'reception', nameAr: 'الاستقبال والتنويم وإشغال الأسرّة', nameEn: 'Reception & Bed Management', icon: BedDouble, category: 'Operations' },
    { id: 'appointments', nameAr: 'حجز المواعيد والعيادات الخارجية', nameEn: 'Outpatient Clinic Appointments', icon: Calendar, category: 'Operations' },
    { id: 'pharmacy', nameAr: 'الصيدلية وصرف الأدوية والمستلزمات', nameEn: 'Pharmacy Dispense & Ward Stock', icon: Package, category: 'Pharmacy' },
    { id: 'inventory', nameAr: 'المستودع الطبي وأوامر الشراء PO', nameEn: 'Inventory Management & Purchase Orders', icon: Boxes, category: 'Operations' },
    { id: 'billing', nameAr: 'المحاسبة المالية والفوترة والخزينة وسندات القبض (Financial Accounting)', nameEn: 'Hospital Financial Accounting, General Ledger & Billing', icon: DollarSign, category: 'Finance' },
    { id: 'consultations', nameAr: 'الاستشارات الطبية التخصصية', nameEn: 'Specialty Consultations', icon: Stethoscope, category: 'Clinical' },
    { id: 'barcode_print', nameAr: 'طباعة ملصقات الباركود وأساور المرضى (Code 128 / QR)', nameEn: 'Print Patient Barcode Labels & Wristbands', icon: Barcode, category: 'Operations' },
    { id: 'discharge', nameAr: 'وثائق الخروج وتقارير التفويض الطبي', nameEn: 'Discharge Summaries & Reports', icon: FileText, category: 'Clinical' },
    { id: 'audit', nameAr: 'سجل التدقيق الأمني والحوكمة الرقمية', nameEn: 'Audit Trail & Compliance Logs', icon: ShieldCheck, category: 'Finance' },
  ], []);

  // Quick lab tests catalogue for immediate worksheet order
  const labTestsDirectory = useMemo(() => [
    { nameAr: 'صورة دم كاملة (CBC with Differential)', nameEn: 'Complete Blood Count (CBC)', code: 'HEM-01', panel: 'Hematology' },
    { nameAr: 'وظائف الكلى (Urea, Creatinine, eGFR)', nameEn: 'Renal Function Tests (RFT)', code: 'BIO-01', panel: 'Biochemistry' },
    { nameAr: 'وظائف الكبد (ALT, AST, Bilirubin, Albumin)', nameEn: 'Liver Function Tests (LFT)', code: 'BIO-05', panel: 'Biochemistry' },
    { nameAr: 'هرمون الحمل الرقمي المتتابع (Quantitative Beta-hCG)', nameEn: 'Serum Beta-hCG (Serial)', code: 'MAT-01', panel: 'Maternal' },
    { nameAr: 'تخثر وسيولة الدم (PT / INR / aPTT / Fibrinogen)', nameEn: 'Coagulation Profile (PT/INR/PTT)', code: 'HEM-04', panel: 'Hematology' },
    { nameAr: 'فصيلة وتطابق الدم (Blood Group & Crossmatch 2 Units)', nameEn: 'Blood Group & Crossmatch', code: 'BBK-01', panel: 'Blood Bank' },
    { nameAr: 'باقة تسمم الحمل (Preeclampsia Toxemia Panel)', nameEn: 'Preeclampsia Toxemia Panel', code: 'PANEL-PRE', panel: 'Worksheet' },
    { nameAr: 'تحليل البول الروتيني والمجهري (Urinalysis Routine)', nameEn: 'Complete Urinalysis', code: 'URN-01', panel: 'Urinalysis' },
  ], []);

  // Filter items based on query
  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Return default favorites / quick actions
      return {
        patients: admissions.slice(0, 3).map(adm => ({
          type: 'patient' as const,
          adm,
          title: adm.patientName,
          subtitle: `${adm.roomNumber} · MRN: ${adm.mrn} · ADM: ${adm.admissionId}`
        })),
        modules: modules.slice(0, 4).map(m => ({
          type: 'module' as const,
          id: m.id,
          title: isAr ? m.nameAr : m.nameEn,
          subtitle: m.category,
          icon: m.icon
        })),
        labTests: labTestsDirectory.slice(0, 3).map(t => ({
          type: 'lab' as const,
          title: isAr ? t.nameAr : t.nameEn,
          subtitle: `${t.code} · ${t.panel}`,
          testName: t.nameEn
        }))
      };
    }

    const matchedPatients = admissions.filter(adm => {
      const pat = patients.find(p => p.mrn === adm.mrn);
      return (
        adm.patientName.toLowerCase().includes(q) ||
        adm.mrn.toLowerCase().includes(q) ||
        adm.admissionId.toLowerCase().includes(q) ||
        adm.roomNumber.toLowerCase().includes(q) ||
        (pat && pat.nationalId && pat.nationalId.includes(q))
      );
    }).map(adm => ({
      type: 'patient' as const,
      adm,
      title: adm.patientName,
      subtitle: `${adm.roomNumber} · MRN: ${adm.mrn} · ADM: ${adm.admissionId}`
    }));

    const matchedModules = modules.filter(m => 
      m.nameAr.toLowerCase().includes(q) ||
      m.nameEn.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    ).map(m => ({
      type: 'module' as const,
      id: m.id,
      title: isAr ? m.nameAr : m.nameEn,
      subtitle: m.category,
      icon: m.icon
    }));

    const matchedLabTests = labTestsDirectory.filter(t =>
      t.nameAr.toLowerCase().includes(q) ||
      t.nameEn.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) ||
      t.panel.toLowerCase().includes(q)
    ).map(t => ({
      type: 'lab' as const,
      title: isAr ? t.nameAr : t.nameEn,
      subtitle: `${t.code} · ${t.panel}`,
      testName: t.nameEn
    }));

    return {
      patients: matchedPatients,
      modules: matchedModules,
      labTests: matchedLabTests
    };
  }, [query, admissions, patients, modules, labTestsDirectory, isAr]);

  const allItems = useMemo(() => {
    return [
      ...searchResults.patients,
      ...searchResults.modules,
      ...searchResults.labTests
    ];
  }, [searchResults]);

  const handleSelectItem = (item: any) => {
    if (item.type === 'patient') {
      onSelectAdmission(item.adm);
      onNavigateTab('clinical');
    } else if (item.type === 'module') {
      if (item.id === 'barcode_print') {
        if (onOpenBarcodeModal) {
          onOpenBarcodeModal();
        } else {
          onNavigateTab('reception');
        }
      } else {
        onNavigateTab(item.id);
      }
    } else if (item.type === 'lab') {
      onNavigateTab('lis');
      if (onOpenLabWorksheet) {
        onOpenLabWorksheet();
      }
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < allItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        handleSelectItem(allItems[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-16 px-4">
      <div 
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center gap-3 border-b border-slate-800">
          <Search className="w-5 h-5 text-teal-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isAr ? 'بحث شامل في النظام (المرضى، الأقسام، التحاليل المخبرية، الصيدلية)...' : 'Omni search (patients, admissions, modules, lab worksheet tests)...'}
            className="w-full bg-transparent text-white placeholder:text-slate-400 text-sm focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Results Sections */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {allItems.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">
                {isAr ? 'لم يتم العثور على أي نتائج تطابق البحث' : 'No matching results found'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {isAr ? 'جرّب البحث باسم المريض، رقم الغرفة، أو اسم التحليل' : 'Try searching by patient name, room number, or lab test'}
              </p>
            </div>
          ) : (
            <>
              {/* Category 1: Inpatient Admissions */}
              {searchResults.patients.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    {isAr ? 'المرضى المنومين في الأقسام' : 'Inpatient Admissions'}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {searchResults.patients.map((item, idx) => {
                      const itemIdx = idx;
                      const isFocused = selectedIndex === itemIdx;
                      return (
                        <div
                          key={item.adm.admissionId}
                          onClick={() => handleSelectItem(item)}
                          className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between text-right rtl:text-right ltr:text-left transition-colors ${
                            isFocused ? 'bg-teal-50 text-teal-950 font-medium' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-slate-900">{item.title}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{item.subtitle}</div>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {isAr ? 'فتح الملف' : 'Open EMR'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category 2: Modules & Workstations */}
              {searchResults.modules.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    {isAr ? 'شاشات ووحدات النظام' : 'System Modules & Workstations'}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {searchResults.modules.map((item, idx) => {
                      const itemIdx = searchResults.patients.length + idx;
                      const isFocused = selectedIndex === itemIdx;
                      const Icon = item.icon || Sparkles;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between text-right rtl:text-right ltr:text-left transition-colors ${
                            isFocused ? 'bg-teal-50 text-teal-950 font-medium' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs shrink-0">
                              <Icon className="w-4 h-4 text-teal-600" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-semibold text-slate-900">{item.title}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{item.subtitle}</div>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category 3: Lab Tests & Worksheets */}
              {searchResults.labTests.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    {isAr ? 'كتالوج الفحوصات المخبرية (طلب ورقة عمل)' : 'Laboratory Catalog & Worksheet Orders'}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {searchResults.labTests.map((item, idx) => {
                      const itemIdx = searchResults.patients.length + searchResults.modules.length + idx;
                      const isFocused = selectedIndex === itemIdx;
                      return (
                        <div
                          key={item.title}
                          onClick={() => handleSelectItem(item)}
                          className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between text-right rtl:text-right ltr:text-left transition-colors ${
                            isFocused ? 'bg-teal-50 text-teal-950 font-medium' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-xs shrink-0">
                              <FlaskConical className="w-4 h-4 text-teal-600" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-semibold text-slate-900">{item.title}</div>
                              <div className="text-[10px] text-teal-700 font-mono">{item.subtitle}</div>
                            </div>
                          </div>
                          <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded font-semibold">
                            {isAr ? 'طلب بورقة العمل' : 'Add to Worksheet'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-700 shadow-2xs font-bold">⇅</kbd> {isAr ? 'للتنقل' : 'Navigate'}
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-700 shadow-2xs font-bold">↵</kbd> {isAr ? 'للاختيار' : 'Select'}
            </span>
          </div>
          <span>
            {isAr ? 'مستشفى الأمل التخصصي | البحث الذكي السريع' : 'Al-Amal Specialized HMIS Quick Search'}
          </span>
        </div>
      </div>
    </div>
  );
};
