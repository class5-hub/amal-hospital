import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertCircle, 
  User, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Building,
  Calendar,
  Layers,
  LogOut,
  FileSignature,
  Mic,
  Barcode,
  Printer,
  AlertTriangle,
  Clock,
  Flame,
  Thermometer,
  Heart,
  Wind,
  Droplets,
  ExternalLink,
  X,
  Stethoscope,
  ChevronRight,
  Info,
  Scale,
  UsersRound
} from 'lucide-react';
import { 
  Patient, 
  Admission, 
  SystemUser, 
  Language, 
  ClinicalAssessment, 
  LabOrder 
} from '../types/hmis.ts';
import { api } from '../api/client.ts';
import { 
  evaluatePatientTriage, 
  TriageAssessmentResult, 
  TriageUrgencyLevel 
} from '../utils/triage.ts';
import { SearchablePatientDropbox } from './SearchablePatientDropbox.tsx';
import { QuickDischargeModal } from './QuickDischargeModal.tsx';
import { ConsentFormModal } from './ConsentFormModal.tsx';
import { BarcodeLabelsModal } from './BarcodeLabelsModal.tsx';

interface PatientBannerProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  admissions: Admission[];
  patients: Patient[];
  onSelectAdmission: (adm: Admission) => void;
  language: Language;
  currentUser?: SystemUser | null;
  onRefresh?: () => void;
  onInitiateDischarge?: () => void;
  onOpenConsentModal?: () => void;
  onOpenVoiceNotes?: () => void;
  assessment?: ClinicalAssessment | null;
  labOrders?: LabOrder[];
  onOpenClinicalWorkstation?: () => void;
  onOpenBarcodeHub?: () => void;
  onOpenShiftHandover?: () => void;
}

export const PatientBanner: React.FC<PatientBannerProps> = ({
  currentPatient,
  currentAdmission,
  admissions,
  patients,
  onSelectAdmission,
  language,
  currentUser,
  onRefresh,
  onInitiateDischarge,
  onOpenConsentModal,
  onOpenVoiceNotes,
  assessment,
  labOrders,
  onOpenClinicalWorkstation,
  onOpenBarcodeHub,
  onOpenShiftHandover
}) => {
  const isAr = language === 'ar';
  const [showQuickDischarge, setShowQuickDischarge] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);

  // Internal fallback state for assessment and labs if not supplied by props
  const [internalAssessment, setInternalAssessment] = useState<ClinicalAssessment | null>(null);
  const [internalLabs, setInternalLabs] = useState<LabOrder[]>([]);

  useEffect(() => {
    if (currentAdmission) {
      if (assessment !== undefined) {
        setInternalAssessment(assessment);
      } else {
        api.getAssessment(currentAdmission.admissionId)
          .then(res => setInternalAssessment(res))
          .catch(() => setInternalAssessment(null));
      }

      if (labOrders !== undefined) {
        setInternalLabs(labOrders);
      } else {
        api.getLabOrders(currentAdmission.admissionId)
          .then(res => setInternalLabs(res))
          .catch(() => setInternalLabs([]));
      }
    } else {
      setInternalAssessment(null);
      setInternalLabs([]);
    }
  }, [currentAdmission?.admissionId, assessment, labOrders]);

  // Compute live triage status
  const effectiveAssessment = assessment !== undefined ? assessment : internalAssessment;
  const effectiveLabs = labOrders !== undefined ? labOrders : internalLabs;

  const triage: TriageAssessmentResult = useMemo(() => {
    return evaluatePatientTriage(effectiveAssessment, effectiveLabs);
  }, [effectiveAssessment, effectiveLabs]);

  // Extract latest vital signs for clinical snapshot and BMI calculation
  const latestVitals = useMemo(() => {
    const list = effectiveAssessment?.vitals;
    if (!list || list.length === 0) return null;
    return list[list.length - 1];
  }, [effectiveAssessment]);

  // Exact calculated patient age from DOB
  const calculatedAge = useMemo(() => {
    if (!currentPatient?.dob) return null;
    const birthDate = new Date(currentPatient.dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      years--;
    }
    return Math.max(0, years);
  }, [currentPatient?.dob]);

  // Most recent BMI calculated from latest weight & height in vitals
  const calculatedBmi = useMemo(() => {
    if (!latestVitals) return null;
    const weight = latestVitals.weightKg;
    const height = latestVitals.heightCm;
    if (!weight || !height || height <= 0) return null;
    const heightM = height / 100;
    const bmiVal = parseFloat((weight / (heightM * heightM)).toFixed(1));

    let category = '';
    let categoryEn = '';
    let badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';

    if (bmiVal < 18.5) {
      category = 'نقص وزن';
      categoryEn = 'Underweight';
      badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (bmiVal < 25) {
      category = 'وزن طبيعي';
      categoryEn = 'Normal';
      badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    } else if (bmiVal < 30) {
      category = 'زيادة وزن';
      categoryEn = 'Overweight';
      badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      category = 'سمنة';
      categoryEn = 'Obese';
      badgeColor = 'text-rose-700 bg-rose-50 border-rose-200';
    }

    return {
      value: bmiVal,
      category: isAr ? category : categoryEn,
      badgeColor,
      weight,
      height
    };
  }, [latestVitals, isAr]);

  if (!currentPatient || !currentAdmission) {
    return (
      <div className="bg-white border-b border-slate-200 p-4 text-center text-sm text-slate-500">
        {isAr ? 'لم يتم تحديد مريض حالياً' : 'No active patient selected'}
      </div>
    );
  }

  const hasAllergies = currentPatient.allergies.length > 0 && !currentPatient.allergies[0].toLowerCase().includes('no known');

  return (
    <section className="bg-white border-b border-slate-200 shadow-xs select-none no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        {/* Top bar with quick patient switcher, status, and triage urgency pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-xs shrink-0">
              <User className="w-4 h-4" />
            </div>

            {/* Enhanced Searchable Dropbox Patient Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                {isAr ? 'المريض النشط:' : 'Active Patient:'}
              </span>
              <SearchablePatientDropbox
                currentPatient={currentPatient}
                currentAdmission={currentAdmission}
                admissions={admissions}
                patients={patients}
                onSelectAdmission={onSelectAdmission}
                language={language}
              />
            </div>

            {/* Stay Status Indicator */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-800 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {currentAdmission.status === 'active' ? (isAr ? 'منوم حالياً' : 'Inpatient Active') : currentAdmission.status}
            </span>

            {/* TRIAGE URGENCY INDICATOR PILL */}
            <button
              type="button"
              onClick={() => setShowTriageModal(true)}
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
                triage.level === 'critical'
                  ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                  : triage.level === 'urgent'
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : triage.level === 'stable'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
              title={
                isAr 
                  ? `فرز الخطورة: ${triage.summaryAr} (انقر لعرض المؤشرات الحيوية والتحاليل)`
                  : `Triage Status: ${triage.summaryEn} (Click for clinical vitals & lab breakdown)`
              }
            >
              {triage.level === 'critical' && (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                  </span>
                  <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="tracking-tight">
                    {isAr ? 'حرج / طوارئ (Level 1)' : 'Emergency / Critical (L1)'}
                  </span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-600 text-white font-mono font-black">
                    {triage.triggers.filter(t => t.severity === 'critical').length} {isAr ? 'حرج' : 'Crit'}
                  </span>
                </>
              )}

              {triage.level === 'urgent' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="tracking-tight">
                    {isAr ? 'عاجل / متابعة حثيثة (Priority 2)' : 'Urgent / Priority 2'}
                  </span>
                  {triage.triggers.length > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500 text-white font-mono font-bold">
                      {triage.triggers.length}
                    </span>
                  )}
                </>
              )}

              {triage.level === 'stable' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="tracking-tight">
                    {isAr ? 'مستقر سريرياً (Routine)' : 'Stable / Routine (L3)'}
                  </span>
                </>
              )}

              {triage.level === 'pending' && (
                <>
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="tracking-tight">
                    {isAr ? 'قيد قياس العلامات' : 'Pending Vitals'}
                  </span>
                </>
              )}

              <Info className="w-3 h-3 opacity-60 ms-0.5" />
            </button>

            {/* Quick Action Shortcuts: Discharge, Consents, Barcodes, Voice */}
            <div className="flex items-center gap-1.5 ms-1">
              {/* Quick Discharge Button */}
              <button
                type="button"
                onClick={() => setShowQuickDischarge(true)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all shadow-2xs whitespace-nowrap cursor-pointer ${
                  currentAdmission.status === 'discharged' || currentAdmission.status === 'dama'
                    ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 hover:border-amber-400'
                }`}
                title={isAr ? 'بدء إجراءات الخروج السريع للإيواء' : 'Initiate quick discharge workflow'}
              >
                <LogOut className="w-3.5 h-3.5 text-amber-600 rtl:rotate-180" />
                <span>
                  {currentAdmission.status === 'discharged' || currentAdmission.status === 'dama'
                    ? (isAr ? '✓ تم الخروج' : 'Discharged')
                    : (isAr ? 'الخروج السريع' : 'Quick Discharge')}
                </span>
              </button>

              {/* Consent Forms Button */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenConsentModal) {
                    onOpenConsentModal();
                  } else {
                    setShowConsentModal(true);
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                title={isAr ? 'نماذج الإقرارات والموافقات المستنيرة' : 'Informed Consent Forms'}
              >
                <FileSignature className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'إقرارات المريض' : 'Consent Forms'}</span>
              </button>

              {/* Barcode & Wristband Label Print Button - Full Page Hub */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenBarcodeHub) {
                    onOpenBarcodeHub();
                  } else {
                    setShowBarcodeModal(true);
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                title={isAr ? 'فتح مركز طباعة وتدقيق الباركود وQR كامل الصفحة' : 'Open Full-Page Barcode & QR Hub'}
              >
                <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? 'مركز الباركود وQR' : 'Barcode & QR Hub'}</span>
              </button>

              {/* Shift Handover (SBAR) Full Page Shortcut */}
              {onOpenShiftHandover && (
                <button
                  type="button"
                  onClick={onOpenShiftHandover}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                  title={isAr ? 'عرض محضر تسليم المناوبة التمريضية وفق معيار SBAR' : 'Clinical Nursing Shift Handover (SBAR)'}
                >
                  <UsersRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAr ? 'تسليم المناوبة (SBAR)' : 'Shift Handover'}</span>
                </button>
              )}

              {/* Stay Summary PDF Direct Shortcut Button */}
              {onInitiateDischarge && (
                <button
                  type="button"
                  onClick={onInitiateDischarge}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                  title={isAr ? 'عرض وطباعة ملخص فترة الإقامة السريرية كملف PDF' : 'View & Print Inpatient Stay Summary PDF'}
                >
                  <Printer className="w-3.5 h-3.5 text-teal-700" />
                  <span>{isAr ? 'ملخص الإقامة PDF' : 'Stay Summary PDF'}</span>
                </button>
              )}

              {/* Voice Dictation Button */}
              {onOpenVoiceNotes && (
                <button
                  type="button"
                  onClick={onOpenVoiceNotes}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                  title={isAr ? 'الملاحظات والطباعة الصوتية والذكاء الاصطناعي' : 'Voice Notes & AI Scribe'}
                >
                  <Mic className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAr ? 'ملاحظات صوتية AI' : 'Voice AI'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Identification Tags */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono text-slate-600">
            <div>
              <span className="text-slate-400">{isAr ? 'رقم الدخول:' : 'ADM ID:'} </span>
              <strong className="text-slate-900 font-semibold">{currentAdmission.admissionId}</strong>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-slate-400">{isAr ? 'رقم الملف الدائم:' : 'MRN:'} </span>
              <strong className="text-slate-900 font-semibold">{currentPatient.mrn}</strong>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-slate-400">{isAr ? 'الرقم الوطني:' : 'National ID:'} </span>
              <strong className="text-slate-900">{currentPatient.nationalId}</strong>
            </div>
          </div>
        </div>

        {/* Clinical Info Strip - 7 Columns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-2 text-xs">
          {/* 1. Room & Bed */}
          <div className="flex flex-col">
            <span className="text-slate-400 font-medium">{isAr ? 'الغرفة والسّرير' : 'Room & Bed'}</span>
            <span className="font-semibold text-slate-900">
              {currentAdmission.roomNumber} ({currentAdmission.roomType.toUpperCase()})
            </span>
          </div>

          {/* 2. Attending Consultant */}
          <div className="flex flex-col">
            <span className="text-slate-400 font-medium">{isAr ? 'الاستشاري المسؤول' : 'Consultant'}</span>
            <span className="font-semibold text-slate-900 truncate" title={currentAdmission.attendingConsultantName}>
              {currentAdmission.attendingConsultantName}
            </span>
          </div>

          {/* 3. Blood Group & Verification */}
          <div className="flex flex-col">
            <span className="text-slate-400 font-medium">{isAr ? 'فصيلة الدم وRh' : 'Blood Group & Rh'}</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-red-600 font-mono text-sm">{currentPatient.bloodGroup}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                currentPatient.bloodGroupStatus === 'Verified' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {currentPatient.bloodGroupStatus === 'Verified' ? (isAr ? 'معتمد' : 'Verified') : (isAr ? 'قيد التحقق' : 'Pending')}
              </span>
            </div>
          </div>

          {/* 4. Payer / Package */}
          <div className="flex flex-col">
            <span className="text-slate-400 font-medium">{isAr ? 'جهة الدفع / الباقة' : 'Payer / Package'}</span>
            <span className="font-semibold text-slate-900 truncate" title={currentAdmission.packageName || currentAdmission.corporateName || currentAdmission.payerType}>
              {currentAdmission.packageName ? currentAdmission.packageName : (
                currentAdmission.corporateName ? currentAdmission.corporateName : (isAr ? 'دفع ذاتي' : 'Self-Pay')
              )}
            </span>
          </div>

          {/* 5. Admission Date */}
          <div className="flex flex-col">
            <span className="text-slate-400 font-medium">{isAr ? 'تاريخ ووقت الدخول' : 'Admission Date'}</span>
            <span className="font-medium text-slate-700 font-mono">
              {currentAdmission.admissionDate.split('T')[0]} {currentAdmission.admissionDate.split('T')[1]?.substring(0, 5)}
            </span>
          </div>

          {/* 6. Age & Gender */}
          <div className="flex flex-col">
            <span className="text-slate-400 font-medium">{isAr ? 'العمر / الجنس' : 'Age / Gender'}</span>
            <span className="font-semibold text-slate-800">
              {calculatedAge !== null ? `${calculatedAge} ${isAr ? 'سنة' : 'yrs'}` : '—'} · {currentPatient.gender === 'female' ? (isAr ? 'أنثى' : 'Female') : (isAr ? 'ذكر' : 'Male')}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {currentPatient.dob}
            </span>
          </div>

          {/* 7. Triage Urgency Tile */}
          <div 
            onClick={() => setShowTriageModal(true)}
            className="flex flex-col cursor-pointer group rounded p-1 -m-1 hover:bg-slate-50 transition-colors"
            title={isAr ? 'عرض تفاصيل تقييم الخطورة السريرية والعلامات الحيوية' : 'View triage clinical evaluation & vitals'}
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">{isAr ? 'فرز الخطورة' : 'Triage Status'}</span>
              <span className="text-[10px] text-teal-600 font-medium group-hover:underline flex items-center gap-0.5">
                {isAr ? 'تفاصيل' : 'Details'}
                <ChevronRight className="w-2.5 h-2.5 rtl:rotate-180" />
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                triage.level === 'critical' ? 'bg-rose-500 animate-ping' :
                triage.level === 'urgent' ? 'bg-amber-500' :
                triage.level === 'stable' ? 'bg-emerald-500' : 'bg-slate-400'
              }`}></span>
              <span className={`font-bold truncate text-[11px] ${
                triage.level === 'critical' ? 'text-rose-700' :
                triage.level === 'urgent' ? 'text-amber-800' :
                triage.level === 'stable' ? 'text-emerald-700' : 'text-slate-600'
              }`}>
                {triage.level === 'critical' ? (isAr ? 'حالة حرجة (L1)' : 'Critical (L1)') :
                 triage.level === 'urgent' ? (isAr ? 'عاجل (P2)' : 'Urgent (P2)') :
                 triage.level === 'stable' ? (isAr ? 'مستقر (L3)' : 'Stable (L3)') :
                 (isAr ? 'قيد القياس' : 'Pending')}
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Snapshot Bar: Current Age, Latest BMI & Vital Signs */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/80 -mx-1 px-3 py-2 rounded-lg border border-slate-200/70">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Age calculated from DOB */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="text-slate-500 font-medium">{isAr ? 'العمر الدقيق:' : 'Age:'}</span>
              <strong className="text-slate-900 font-bold">
                {calculatedAge !== null ? `${calculatedAge} ${isAr ? 'سنة' : 'years'}` : (isAr ? 'غير محدد' : 'N/A')}
              </strong>
              <span className="text-[11px] text-slate-400 font-mono">({currentPatient.dob})</span>
            </div>

            {/* Most recent BMI */}
            <div className="flex items-center gap-1.5 border-s border-slate-200 ps-4">
              <Scale className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-slate-500 font-medium">{isAr ? 'مؤشر كتلة الجسم (BMI):' : 'BMI:'}</span>
              {calculatedBmi ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900">{calculatedBmi.value}</span>
                  <span className="text-[10px] text-slate-500">kg/m²</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${calculatedBmi.badgeColor}`}>
                    {calculatedBmi.category}
                  </span>
                  <span className="text-[11px] text-slate-400 hidden md:inline">
                    ({calculatedBmi.weight} kg · {calculatedBmi.height} cm)
                  </span>
                </div>
              ) : (
                <span className="text-slate-400 italic text-[11px]">
                  {isAr ? 'غير متوفر (يلزم الوزن والطول)' : 'Pending vitals (weight/height)'}
                </span>
              )}
            </div>

            {/* Vital Signs Snapshot */}
            <div className="flex items-center gap-2.5 border-s border-slate-200 ps-4 flex-wrap">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                {isAr ? 'العلامات الحيوية:' : 'Vitals:'}
              </span>
              {latestVitals ? (
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs" title="Blood Pressure">
                    <span className="text-slate-400 text-[10px]">BP</span>
                    <strong className="text-slate-900">{latestVitals.bpSystolic}/{latestVitals.bpDiastolic}</strong>
                    <span className="text-[9px] text-slate-400">mmHg</span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs" title="Heart Rate">
                    <Heart className="w-3 h-3 text-rose-500" />
                    <strong className="text-slate-900">{latestVitals.pulse}</strong>
                    <span className="text-[9px] text-slate-400">bpm</span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs" title="Temperature">
                    <Thermometer className="w-3 h-3 text-amber-500" />
                    <strong className="text-slate-900">{latestVitals.temp}</strong>
                    <span className="text-[9px] text-slate-400">°C</span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs" title="Oxygen Saturation">
                    <Wind className="w-3 h-3 text-sky-500" />
                    <strong className="text-slate-900">{latestVitals.spO2}%</strong>
                  </span>
                </div>
              ) : (
                <span className="text-slate-400 italic text-[11px]">
                  {isAr ? 'لا توجد قراءات مسجلة' : 'No vitals recorded'}
                </span>
              )}
            </div>
          </div>

          {onOpenClinicalWorkstation && (
            <button
              type="button"
              onClick={onOpenClinicalWorkstation}
              className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 hover:underline cursor-pointer shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
              {isAr ? 'سجل المؤشرات الحيوية' : 'Vitals & Growth Charts'}
            </button>
          )}
        </div>

        {/* PROMINENT ALLERGIES WARNING BAR */}
        {hasAllergies && (
          <div className="mt-2.5 bg-rose-50 border border-rose-300 rounded px-3 py-1.5 flex items-center justify-between gap-3 text-rose-900">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {isAr ? 'تنبيه سريري - الحساسية الموثقة:' : 'CLINICAL ALERT - KNOWN ALLERGIES:'}
              </span>
              <span className="text-xs font-semibold text-rose-800">
                {currentPatient.allergies.join(' · ')}
              </span>
            </div>
            <span className="text-[11px] text-rose-700 font-medium">
              {isAr ? 'مقيّد في شاشات الوصفات والتمريض والعمليات' : 'Active alert in eMAR, Orders & OT'}
            </span>
          </div>
        )}
      </div>

      {/* Quick Discharge Workflow Modal */}
      {showQuickDischarge && currentUser && (
        <QuickDischargeModal
          currentPatient={currentPatient}
          currentAdmission={currentAdmission}
          currentUser={currentUser}
          language={language}
          onClose={() => setShowQuickDischarge(false)}
          onRefresh={() => {
            onRefresh?.();
          }}
          onOpenFullDischarge={() => {
            onInitiateDischarge?.();
          }}
        />
      )}

      {/* Informed Consent Form Modal */}
      {showConsentModal && currentUser && (
        <ConsentFormModal
          currentPatient={currentPatient}
          currentAdmission={currentAdmission}
          currentUser={currentUser}
          language={language}
          onClose={() => setShowConsentModal(false)}
          onSaved={() => {
            onRefresh?.();
          }}
        />
      )}

      {/* Barcode & Wristband Label Generator Modal */}
      <BarcodeLabelsModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        currentPatient={currentPatient}
        currentAdmission={currentAdmission}
        allPatients={patients}
        allAdmissions={admissions}
        language={language}
      />

      {/* TRIAGE CLINICAL BREAKDOWN & EARLY WARNING SCORE MODAL */}
      {showTriageModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between text-white ${
              triage.level === 'critical' ? 'bg-gradient-to-r from-rose-700 to-red-800 border-rose-900' :
              triage.level === 'urgent' ? 'bg-gradient-to-r from-amber-600 to-orange-700 border-amber-800' :
              triage.level === 'stable' ? 'bg-gradient-to-r from-teal-700 to-emerald-800 border-teal-900' :
              'bg-gradient-to-r from-slate-700 to-slate-800 border-slate-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                  {triage.level === 'critical' ? <Flame className="w-6 h-6 text-rose-200" /> :
                   triage.level === 'urgent' ? <AlertTriangle className="w-6 h-6 text-amber-200" /> :
                   triage.level === 'stable' ? <CheckCircle2 className="w-6 h-6 text-emerald-200" /> :
                   <Clock className="w-6 h-6 text-slate-300" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base sm:text-lg">
                      {isAr ? 'فرز الخطورة السريرية وتقييم الإنذار المبكر' : 'Clinical Triage & Early Warning MEOWS'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 border border-white/30">
                      {triage.level === 'critical' ? (isAr ? 'المستوى 1: حرج / طوارئ' : 'Level 1: Critical Emergency') :
                       triage.level === 'urgent' ? (isAr ? 'المستوى 2: أولوية عاجلة' : 'Level 2: Urgent Priority') :
                       triage.level === 'stable' ? (isAr ? 'المستوى 3: حالة مستقرة' : 'Level 3: Routine Stable') :
                       (isAr ? 'بانتظار القياسات' : 'Pending Baseline')}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-0.5">
                    {currentPatient.fullName} · {currentPatient.mrn} · {isAr ? 'الغرفة' : 'Room'} {currentAdmission.roomNumber}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTriageModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Clinical Recommendation Card */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                triage.level === 'critical' ? 'bg-rose-50 border-rose-200 text-rose-950' :
                triage.level === 'urgent' ? 'bg-amber-50 border-amber-200 text-amber-950' :
                triage.level === 'stable' ? 'bg-emerald-50 border-emerald-200 text-emerald-950' :
                'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <Activity className={`w-5 h-5 shrink-0 mt-0.5 ${
                  triage.level === 'critical' ? 'text-rose-600' :
                  triage.level === 'urgent' ? 'text-amber-600' :
                  triage.level === 'stable' ? 'text-emerald-600' :
                  'text-slate-500'
                }`} />
                <div className="flex-1 text-xs">
                  <div className="font-bold text-sm mb-1">
                    {isAr ? triage.summaryAr : triage.summaryEn}
                  </div>
                  <div className="leading-relaxed opacity-90 font-medium">
                    <strong className="underline">{isAr ? 'التوصية السريرية الفورية:' : 'Immediate Clinical Directive:'}</strong>{' '}
                    {isAr ? triage.recommendationAr : triage.recommendationEn}
                  </div>
                </div>
              </div>

              {/* Active Triggers / Alerts (if any) */}
              {triage.triggers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{isAr ? 'المؤشرات والنتائج المتجاوزة للحدود الآمنة' : 'Active Warning Triggers & Breaches'}</span>
                    </h4>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {triage.triggers.length} {isAr ? 'مؤشر نشط' : 'active triggers'}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {triage.triggers.map(trigger => (
                      <div 
                        key={trigger.id} 
                        className={`p-3 flex items-start justify-between gap-3 ${
                          trigger.severity === 'critical' ? 'bg-rose-50/50' : 'bg-amber-50/30'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            trigger.severity === 'critical' ? 'bg-rose-600' : 'bg-amber-500'
                          }`}></span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{trigger.parameter}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                trigger.severity === 'critical'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {trigger.severity === 'critical' ? (isAr ? 'حرج' : 'Critical') : (isAr ? 'غير طبيعي' : 'Abnormal')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({trigger.source === 'vitals' ? (isAr ? 'علامات حيوية' : 'Vital Sign') : (isAr ? 'فحص مخبري LIS' : 'Lab Order')})
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 mt-1 font-medium">
                              {isAr ? trigger.messageAr : trigger.messageEn}
                            </p>
                          </div>
                        </div>

                        <div className="text-end shrink-0">
                          <div className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {trigger.value}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {isAr ? 'الحد الآمن:' : 'Limit:'} {trigger.threshold}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Latest Vital Signs Grid Card */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span>{isAr ? 'آخر قراءات المؤشرات الحيوية المسجلة' : 'Latest Recorded Vital Signs'}</span>
                  </h4>
                  {triage.latestVitals?.timestamp && (
                    <span className="text-[11px] font-mono text-slate-500">
                      {isAr ? 'وقت التسجيل:' : 'Recorded:'} {new Date(triage.latestVitals.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {triage.latestVitals ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    {/* BP */}
                    <div className={`p-2.5 rounded-lg border bg-white ${
                      triage.latestVitals.bpSystolic >= 160 || triage.latestVitals.bpSystolic <= 90 || triage.latestVitals.bpDiastolic >= 110
                        ? 'border-rose-300 text-rose-900 bg-rose-50/30'
                        : triage.latestVitals.bpSystolic >= 140 || triage.latestVitals.bpDiastolic >= 90
                        ? 'border-amber-300 text-amber-900 bg-amber-50/30'
                        : 'border-slate-200'
                    }`}>
                      <div className="text-[10px] text-slate-500 font-medium">{isAr ? 'ضغط الدم (BP)' : 'Blood Pressure'}</div>
                      <div className="text-base font-bold font-mono">
                        {triage.latestVitals.bpSystolic}/{triage.latestVitals.bpDiastolic}
                      </div>
                      <div className="text-[10px] text-slate-400">mmHg</div>
                    </div>

                    {/* HR / Pulse */}
                    <div className={`p-2.5 rounded-lg border bg-white ${
                      triage.latestVitals.pulse >= 120 || triage.latestVitals.pulse <= 50
                        ? 'border-rose-300 text-rose-900 bg-rose-50/30'
                        : triage.latestVitals.pulse >= 100 || triage.latestVitals.pulse <= 59
                        ? 'border-amber-300 text-amber-900 bg-amber-50/30'
                        : 'border-slate-200'
                    }`}>
                      <div className="text-[10px] text-slate-500 font-medium">{isAr ? 'معدل النبض (HR)' : 'Heart Rate'}</div>
                      <div className="text-base font-bold font-mono">
                        {triage.latestVitals.pulse}
                      </div>
                      <div className="text-[10px] text-slate-400">bpm</div>
                    </div>

                    {/* Resp Rate */}
                    <div className={`p-2.5 rounded-lg border bg-white ${
                      triage.latestVitals.respRate >= 28 || triage.latestVitals.respRate <= 10
                        ? 'border-rose-300 text-rose-900 bg-rose-50/30'
                        : triage.latestVitals.respRate >= 21
                        ? 'border-amber-300 text-amber-900 bg-amber-50/30'
                        : 'border-slate-200'
                    }`}>
                      <div className="text-[10px] text-slate-500 font-medium">{isAr ? 'التنفس (RR)' : 'Respiratory Rate'}</div>
                      <div className="text-base font-bold font-mono">
                        {triage.latestVitals.respRate}
                      </div>
                      <div className="text-[10px] text-slate-400">/min</div>
                    </div>

                    {/* SpO2 */}
                    <div className={`p-2.5 rounded-lg border bg-white ${
                      triage.latestVitals.spO2 < 92
                        ? 'border-rose-300 text-rose-900 bg-rose-50/30'
                        : triage.latestVitals.spO2 <= 94
                        ? 'border-amber-300 text-amber-900 bg-amber-50/30'
                        : 'border-slate-200'
                    }`}>
                      <div className="text-[10px] text-slate-500 font-medium">{isAr ? 'الأكسجين (SpO2)' : 'Oxygen Saturation'}</div>
                      <div className="text-base font-bold font-mono">
                        {triage.latestVitals.spO2}%
                      </div>
                      <div className="text-[10px] text-slate-400">{isAr ? 'تشبع الدم' : 'Room air'}</div>
                    </div>

                    {/* Temp */}
                    <div className={`p-2.5 rounded-lg border bg-white ${
                      triage.latestVitals.temp >= 38.5 || triage.latestVitals.temp <= 35.5
                        ? 'border-rose-300 text-rose-900 bg-rose-50/30'
                        : triage.latestVitals.temp >= 37.8
                        ? 'border-amber-300 text-amber-900 bg-amber-50/30'
                        : 'border-slate-200'
                    }`}>
                      <div className="text-[10px] text-slate-500 font-medium">{isAr ? 'الحرارة (Temp)' : 'Temperature'}</div>
                      <div className="text-base font-bold font-mono">
                        {triage.latestVitals.temp}°C
                      </div>
                      <div className="text-[10px] text-slate-400">{isAr ? 'درجة مئوية' : 'Celsius'}</div>
                    </div>

                    {/* Consciousness */}
                    <div className={`p-2.5 rounded-lg border bg-white ${
                      triage.latestVitals.consciousness && triage.latestVitals.consciousness !== 'Alert'
                        ? 'border-rose-300 text-rose-900 bg-rose-50/30'
                        : 'border-slate-200'
                    }`}>
                      <div className="text-[10px] text-slate-500 font-medium">{isAr ? 'الوعي (AVPU)' : 'Mental State'}</div>
                      <div className="text-base font-bold">
                        {triage.latestVitals.consciousness || 'Alert'}
                      </div>
                      <div className="text-[10px] text-slate-400">{isAr ? 'الاستجابة' : 'Response'}</div>
                    </div>

                    {/* Pain Scale */}
                    <div className={`p-2.5 rounded-lg border bg-white ${
                      triage.latestVitals.painScale >= 8
                        ? 'border-rose-300 text-rose-900 bg-rose-50/30'
                        : triage.latestVitals.painScale >= 5
                        ? 'border-amber-300 text-amber-900 bg-amber-50/30'
                        : 'border-slate-200'
                    }`}>
                      <div className="text-[10px] text-slate-500 font-medium">{isAr ? 'مقياس الألم' : 'Pain Scale'}</div>
                      <div className="text-base font-bold font-mono">
                        {triage.latestVitals.painScale} / 10
                      </div>
                      <div className="text-[10px] text-slate-400">{isAr ? 'تقييم ذاتي' : 'Severity'}</div>
                    </div>

                    {/* MEOWS / Score Summary */}
                    <div className="p-2.5 rounded-lg border border-teal-200 bg-teal-50/50 text-teal-950">
                      <div className="text-[10px] text-teal-700 font-medium">{isAr ? 'نقاط الإنذار المبكر' : 'MEOWS Score'}</div>
                      <div className="text-base font-black font-mono text-teal-900">
                        {triage.score} {isAr ? 'نقطة' : 'pts'}
                      </div>
                      <div className="text-[10px] text-teal-700">{isAr ? 'معيار الخطورة' : 'Warning index'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
                    <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">
                      {isAr ? 'لم تسجل أي علامات حيوية لهذا المريض حتى الآن' : 'No vital signs recorded for this patient yet'}
                    </p>
                    <p className="text-slate-400 mt-1">
                      {isAr ? 'يمكن للممرض المناوب توثيق المؤشرات عبر محطة التمريض eMAR' : 'Nursing staff can log readings via the eMAR workstation'}
                    </p>
                  </div>
                )}
              </div>

              {/* Lab Panel Status Snapshot */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-teal-600" />
                    <span>{isAr ? 'فحوصات وتحاليل المختبر المرتبطة بالإقامة' : 'Associated LIS Laboratory Panels'}</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    {effectiveLabs.length} {isAr ? 'فحوصات مسجلة' : 'panels'}
                  </span>
                </div>

                {effectiveLabs.length > 0 ? (
                  <div className="space-y-1.5">
                    {effectiveLabs.map(order => {
                      const hasCrit = order.results?.some(r => r.isCritical);
                      const hasAbn = order.results?.some(r => r.isAbnormal);

                      return (
                        <div 
                          key={order.id} 
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                            hasCrit ? 'bg-rose-50/40 border-rose-200' :
                            hasAbn ? 'bg-amber-50/40 border-amber-200' :
                            'bg-slate-50/50 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{order.testName}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                order.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                order.status === 'sample_collected' ? 'bg-teal-100 text-teal-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {order.status === 'approved' ? (isAr ? 'معتمد ومكتمل' : 'Approved') : order.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {order.results?.map(r => `${r.name}: ${r.value} ${r.unit || ''}`).join(' · ') || (isAr ? 'النتائج قيد الفحص بالمختبر' : 'Pending analysis')}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {hasCrit ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                                {isAr ? 'قيمة حرجة!' : 'Critical Panic'}
                              </span>
                            ) : hasAbn ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                                {isAr ? 'غير طبيعي' : 'Abnormal'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-700">
                                {isAr ? 'ضمن المعدل' : 'Normal'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                    {isAr ? 'لا توجد فحوصات مخبرية مسجلة لهذه الإقامة' : 'No laboratory orders for this admission'}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                {isAr ? 'نظام الفرز المبكر مدمج مع معايير MEOWS والتنبيهات السريرية' : 'MEOWS Early Warning System Integrated'}
              </span>

              <div className="flex items-center gap-2">
                {onOpenClinicalWorkstation && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowTriageModal(false);
                      onOpenClinicalWorkstation();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>{isAr ? 'فتح المحطة السريرية' : 'Open Clinical Workstation'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowTriageModal(false)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
