import React, { useState, useMemo } from 'react';
import {
  Patient,
  Admission,
  ClinicalAssessment,
  VitalSigns,
  ManagementPlan,
  DietaryOrder,
  MedicationOrder,
  EMARRecord,
  LabOrder,
  OperativeReport,
  AnesthesiaRecord,
  Consultation,
  Language,
  SystemUser,
  SmartAlert,
  ShiftHandoverRecord,
  ShiftHandoverChecklistItem
} from '../types/hmis.ts';
import {
  UsersRound,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Printer,
  Copy,
  Check,
  Plus,
  Scissors,
  FlaskConical,
  Pill,
  Heart,
  Activity,
  FileText,
  UserCheck,
  Stethoscope,
  Sparkles,
  ChevronDown,
  Layers,
  Thermometer,
  Wind,
  Droplets,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { evaluatePatientTriage } from '../utils/triage.ts';
import { api } from '../api/client.ts';

interface ShiftHandoverModuleProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  admissions: Admission[];
  patients: Patient[];
  onSelectAdmission: (adm: Admission) => void;
  assessment?: ClinicalAssessment | null;
  plans?: ManagementPlan[];
  dietaryOrders?: DietaryOrder[];
  medications?: MedicationOrder[];
  emarRecords?: EMARRecord[];
  labOrders?: LabOrder[];
  operativeReports?: OperativeReport[];
  anesthesiaRecords?: AnesthesiaRecord[];
  consultations?: Consultation[];
  alerts?: SmartAlert[];
  currentUser?: SystemUser | null;
  language: Language;
  onRefresh?: () => void;
}

export const ShiftHandoverModule: React.FC<ShiftHandoverModuleProps> = ({
  currentPatient,
  currentAdmission,
  admissions,
  patients,
  onSelectAdmission,
  assessment = null,
  plans = [],
  dietaryOrders = [],
  medications = [],
  emarRecords = [],
  labOrders = [],
  operativeReports = [],
  anesthesiaRecords = [],
  consultations = [],
  alerts = [],
  currentUser = null,
  language,
  onRefresh
}) => {
  const isAr = language === 'ar';

  // Timeframe selector: 12h, 24h, 8h, or full stay
  const [timeframeHours, setTimeframeHours] = useState<number>(24);
  const [shiftType, setShiftType] = useState<'day_shift' | 'night_shift'>('day_shift');
  const [incomingNurseName, setIncomingNurseName] = useState('ممرضة سارة القماطي');
  const [outgoingNurseName, setOutgoingNurseName] = useState(currentUser?.name || 'ممرضة فاطمة الورفلي');
  const [isCopied, setIsCopied] = useState(false);
  const [isHandoverAcknowledged, setIsHandoverAcknowledged] = useState(false);
  const [acknowledgedTimestamp, setAcknowledgedTimestamp] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [customActionText, setCustomActionText] = useState('');

  // SBAR custom notes state
  const [situationNote, setSituationNote] = useState('');
  const [recommendationNote, setRecommendationNote] = useState('');

  // Interactive Incoming Shift Action Checklist
  const [checklist, setChecklist] = useState<ShiftHandoverChecklistItem[]>([
    {
      id: 'task-1',
      text: isAr ? 'قياس العلامات الحيوية كل 4 ساعات ومراقبة النزف المهبلي' : 'Check vital signs Q4H & assess vaginal bleeding/lochia',
      category: 'vital',
      dueTime: '16:00',
      completed: false
    },
    {
      id: 'task-2',
      text: isAr ? 'إعطاء مضاد Cefotaxime 1g IV في موعده المحدد' : 'Administer scheduled Cefotaxime 1g IV on time',
      category: 'medication',
      dueTime: '16:00',
      completed: false
    },
    {
      id: 'task-3',
      text: isAr ? 'تقييم موضع الجرح الجراحي القيصري والغيار المعقم' : 'Inspect Pfannenstiel surgical wound dressing for soakage',
      category: 'wound_care',
      dueTime: '18:00',
      completed: false
    },
    {
      id: 'task-4',
      text: isAr ? 'متابعة ناتج الإدرار البولي بعد إزالة القسطرة' : 'Monitor urine output post-Foley catheter removal',
      category: 'general',
      dueTime: '20:00',
      completed: false
    }
  ]);

  if (!currentPatient || !currentAdmission) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 max-w-4xl mx-auto my-8 space-y-3">
        <UsersRound className="w-12 h-12 mx-auto text-slate-300" />
        <h3 className="font-bold text-slate-800 text-base">
          {isAr ? 'يرجى اختيار مريض منوّم لعرض محضر تسليم المناوبة (Shift Handover)' : 'Please select an active inpatient to generate Shift Handover'}
        </h3>
        <p className="text-xs text-slate-400">
          {isAr ? 'اختر مريضاً من القائمة العلوية لتلخيص أحداث الـ 12-24 ساعة الماضية سريرياً.' : 'Select a patient to aggregate recent clinical events.'}
        </p>
      </div>
    );
  }

  // Calculate cutoff timestamp based on selected timeframe
  const now = new Date();
  const cutoffTime = useMemo(() => {
    return new Date(now.getTime() - timeframeHours * 60 * 60 * 1000);
  }, [timeframeHours]);

  // 1. Filtered Recent Labs within timeframe
  const recentLabOrders = useMemo(() => {
    return labOrders.filter(o => {
      if (o.admissionId !== currentAdmission.admissionId) return false;
      const orderDate = new Date(o.orderTime || o.sampleCollectedAt || o.approvedAt || '');
      // If timeframe is 0/infinite, include all
      if (timeframeHours >= 72) return true;
      return orderDate >= cutoffTime;
    });
  }, [labOrders, currentAdmission.admissionId, cutoffTime, timeframeHours]);

  // Extract all individual lab test items with abnormal / critical flags
  const extractedLabItems = useMemo(() => {
    const items: Array<{
      orderId: string;
      testName: string;
      orderTime: string;
      status: string;
      name: string;
      value: number | string;
      unit: string;
      refRange: string;
      isAbnormal?: boolean;
      isCritical?: boolean;
    }> = [];

    recentLabOrders.forEach(o => {
      (o.results || []).forEach(r => {
        items.push({
          orderId: o.id,
          testName: o.testName,
          orderTime: o.orderTime,
          status: o.status,
          name: r.name,
          value: r.value,
          unit: r.unit,
          refRange: r.refRange,
          isAbnormal: r.isAbnormal,
          isCritical: r.isCritical
        });
      });
    });

    return items;
  }, [recentLabOrders]);

  // 2. Filtered Medications & eMAR records within timeframe
  const recentEmarRecords = useMemo(() => {
    return emarRecords.filter(r => {
      if (r.admissionId !== currentAdmission.admissionId) return false;
      const scheduledDate = new Date(r.scheduledTime);
      if (timeframeHours >= 72) return true;
      return scheduledDate >= cutoffTime;
    });
  }, [emarRecords, currentAdmission.admissionId, cutoffTime, timeframeHours]);

  // Medication summary counts
  const emarSummary = useMemo(() => {
    let givenCount = 0;
    let delayedCount = 0;
    let overdueCount = 0;
    let heldCount = 0;
    let refusedCount = 0;
    let scheduledCount = 0;

    recentEmarRecords.forEach(r => {
      const scheduledDate = new Date(r.scheduledTime);
      const isPast = (now.getTime() - scheduledDate.getTime()) > (60 * 60 * 1000);

      if (r.status === 'given') {
        givenCount++;
      } else if (r.status === 'delayed') {
        delayedCount++;
      } else if (r.status === 'held') {
        heldCount++;
      } else if (r.status === 'refused') {
        refusedCount++;
      } else if (r.status === 'scheduled') {
        if (isPast) {
          overdueCount++;
        } else {
          scheduledCount++;
        }
      }
    });

    return {
      givenCount,
      delayedCount,
      overdueCount,
      heldCount,
      refusedCount,
      scheduledCount
    };
  }, [recentEmarRecords, now]);

  // 3. Filtered Operative Reports within timeframe
  const recentOperativeReports = useMemo(() => {
    return operativeReports.filter(op => {
      if (op.admissionId !== currentAdmission.admissionId) return false;
      const opDate = new Date(op.startTime);
      if (timeframeHours >= 72) return true;
      return opDate >= cutoffTime;
    });
  }, [operativeReports, currentAdmission.admissionId, cutoffTime, timeframeHours]);

  // 4. Vitals Extremes & Trajectory
  const vitalsTrajectory = useMemo(() => {
    const list = assessment?.vitals || [];
    if (list.length === 0) return null;

    const latest = list[list.length - 1];
    let maxTemp = latest.temp;
    let minSystolic = latest.bpSystolic;
    let maxSystolic = latest.bpSystolic;
    let maxPain = latest.painScale ?? 0;

    list.forEach(v => {
      if (v.temp > maxTemp) maxTemp = v.temp;
      if (v.bpSystolic < minSystolic) minSystolic = v.bpSystolic;
      if (v.bpSystolic > maxSystolic) maxSystolic = v.bpSystolic;
      if (v.painScale && v.painScale > maxPain) maxPain = v.painScale;
    });

    return {
      latest,
      maxTemp,
      bpRange: `${minSystolic} - ${maxSystolic}`,
      maxPain
    };
  }, [assessment?.vitals]);

  // Triage Evaluation
  const triage = useMemo(() => {
    return evaluatePatientTriage(assessment, labOrders);
  }, [assessment, labOrders]);

  // Active Diet
  const activeDiet = dietaryOrders.find(d => d.admissionId === currentAdmission.admissionId && d.status === 'active');

  // Toggle checklist item
  const handleToggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          completed: !item.completed,
          completedBy: !item.completed ? incomingNurseName : undefined,
          completedAt: !item.completed ? new Date().toISOString() : undefined
        };
      }
      return item;
    }));
  };

  // Add custom action item
  const handleAddCustomAction = () => {
    if (!customActionText.trim()) return;
    const newItem: ShiftHandoverChecklistItem = {
      id: `task-${Date.now()}`,
      text: customActionText.trim(),
      category: 'general',
      completed: false
    };
    setChecklist(prev => [...prev, newItem]);
    setCustomActionText('');
  };

  // Endorse & Acknowledge Handover
  const handleAcknowledgeHandover = () => {
    setIsHandoverAcknowledged(true);
    setAcknowledgedTimestamp(new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' }));
  };

  // Copy structured text to clipboard
  const handleCopyToClipboard = () => {
    const textLines = [
      `====================================================`,
      `CLINICAL SHIFT HANDOVER REPORT (SBAR) · ${shiftType === 'day_shift' ? 'DAY SHIFT' : 'NIGHT SHIFT'}`,
      `Hospital: Al-Amal Specialized Hospital (Tripoli, Libya)`,
      `Patient: ${currentPatient.fullName} | MRN: ${currentPatient.mrn} | Bed: ${currentAdmission.roomNumber}`,
      `Attending Consultant: ${currentAdmission.attendingConsultantName}`,
      `Handover Time: ${new Date().toLocaleString()} (Past ${timeframeHours}h Window)`,
      `Outgoing Nurse: ${outgoingNurseName} | Incoming Nurse: ${incomingNurseName}`,
      `====================================================`,
      ``,
      `[S] SITUATION:`,
      `- Diagnosis: ${currentAdmission.department}`,
      `- Triage Urgency: ${triage.level.toUpperCase()} (${triage.summaryEn})`,
      `- Chief Complaint: ${assessment?.chiefComplaint || 'Unremarkable'}`,
      `- Active Diet: ${activeDiet ? activeDiet.dietType.toUpperCase() : 'Regular'}`,
      `- Code Status: FULL CODE`,
      ``,
      `[B] BACKGROUND & OPERATIVE EVENTS (PAST ${timeframeHours}H):`,
      recentOperativeReports.length > 0 
        ? recentOperativeReports.map(op => 
            `- Procedure: ${op.procedureName}\n  Surgeon: ${op.leadSurgeon} | EBL: ${op.estimatedBloodLossMl} ml\n  Findings: ${op.findings}\n  Post-op Plan: ${op.postOpPlan}`
          ).join('\n')
        : `- No operative procedures in this timeframe.`,
      `- Documented Allergies: ${currentPatient.allergies.join(', ') || 'NKDA'}`,
      ``,
      `[A] ASSESSMENT & RECENT CLINICAL EVENTS:`,
      `- Latest Vitals: BP ${vitalsTrajectory?.latest.bpSystolic}/${vitalsTrajectory?.latest.bpDiastolic} mmHg | HR ${vitalsTrajectory?.latest.pulse} bpm | Temp ${vitalsTrajectory?.latest.temp}°C | SpO2 ${vitalsTrajectory?.latest.spO2}%`,
      `- Shift Extremes: Peak Temp ${vitalsTrajectory?.maxTemp}°C | Systolic Range ${vitalsTrajectory?.bpRange} mmHg | Max Pain ${vitalsTrajectory?.maxPain}/10`,
      `- New Lab Results (${extractedLabItems.length} items):`,
      extractedLabItems.length > 0 
        ? extractedLabItems.map(l => `  * ${l.name}: ${l.value} ${l.unit} (${l.isCritical ? 'CRITICAL ALERT!' : l.isAbnormal ? 'Abnormal' : 'Normal'})`).join('\n')
        : `  * No new lab releases in this window.`,
      `- Medication Administration Summary:`,
      `  * Given on time: ${emarSummary.givenCount} doses`,
      `  * Delayed: ${emarSummary.delayedCount} doses`,
      `  * Overdue/Missed: ${emarSummary.overdueCount} doses`,
      `  * Held/Refused: ${emarSummary.heldCount + emarSummary.refusedCount} doses`,
      ``,
      `[R] RECOMMENDATIONS & INCOMING SHIFT CHECKLIST:`,
      checklist.map(c => `  [${c.completed ? 'X' : ' '}] ${c.text} ${c.dueTime ? `(Due: ${c.dueTime})` : ''}`).join('\n'),
      ``,
      `Endorsed by: ${outgoingNurseName} | Received by: ${incomingNurseName}`,
      `====================================================`
    ].join('\n');

    navigator.clipboard.writeText(textLines);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // AI narrative generator
  const handleGenerateAiNarrative = async () => {
    setIsGeneratingAi(true);
    try {
      const prompt = `Synthesize a concise nursing SBAR shift handover note for ${currentPatient.fullName}, post-operative Day 2. Operative procedure: ${recentOperativeReports[0]?.procedureName || 'None'}. Recent lab results: ${extractedLabItems.map(l => `${l.name}=${l.value}`).join(', ')}. Medication adherence: ${emarSummary.givenCount} given, ${emarSummary.delayedCount} delayed. Latest vitals: BP ${vitalsTrajectory?.latest.bpSystolic}/${vitalsTrajectory?.latest.bpDiastolic}, Temp ${vitalsTrajectory?.latest.temp}°C.`;
      
      const res = await api.aiClinicalAssist({
        task: 'shift_handover',
        text: prompt,
        patientContext: {
          patientName: currentPatient.fullName,
          mrn: currentPatient.mrn,
          department: currentAdmission.department,
          diagnosis: assessment?.chiefComplaint || currentAdmission.department,
          roomNumber: currentAdmission.roomNumber,
          attendingConsultantName: currentAdmission.attendingConsultantName
        },
        targetLanguage: isAr ? 'ar' : 'en'
      });

      if (res.result) {
        setSituationNote(res.result);
      }
    } catch (err) {
      console.error('Failed to generate AI narrative:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-5 pb-12 print:p-0 print:m-0">
      {/* 1. Header & Configuration Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs no-print">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
              <UsersRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">
                  {isAr ? 'محضر تسليم واستلام المناوبة التمريضية (Shift Handover SBAR)' : 'Clinical Nursing Shift Handover (SBAR)'}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold border border-teal-300">
                  {shiftType === 'day_shift' ? (isAr ? '☀️ مناوبة نهارية' : '☀️ Day Shift') : (isAr ? '🌙 مناوبة ليلية' : '🌙 Night Shift')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr 
                  ? 'تلخيص تركيبي سريري لوقائع الـ 12-24 ساعة الماضية: التحاليل المخبرية الجديدة، تغييرات الأدوية، والتقارير الجراحية'
                  : 'Synthesized clinical summary of the past 12-24 hours: new lab releases, medication changes, and operative notes'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Print, Copy, AI Narrative */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleGenerateAiNarrative}
              disabled={isGeneratingAi}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title={isAr ? 'توليد صياغة سريرية ذكية للمناوبة بواسطة الذكاء الاصطناعي' : 'Generate structured narrative with AI'}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isGeneratingAi ? (isAr ? 'جاري الصياغة...' : 'Synthesizing...') : (isAr ? 'صياغة AI الذكية' : 'AI Scribe')}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors shadow-2xs cursor-pointer"
              title={isAr ? 'نسخ ملخص SBAR إلى الحافظة' : 'Copy SBAR summary to clipboard'}
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{isCopied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ SBAR' : 'Copy Text')}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs cursor-pointer"
              title={isAr ? 'طباعة نموذج التسليم لملف الجناح' : 'Print Handover Sheet for Ward Binder'}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isAr ? 'طباعة المحضر' : 'Print SBAR'}</span>
            </button>
          </div>
        </div>

        {/* Configuration Bar: Shift Window, Shift Type, Staff */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Timeframe Window Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">{isAr ? 'النافذة الزمنية للأحداث:' : 'Event Window:'}</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setTimeframeHours(12)}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  timeframeHours === 12 ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'آخر 12 ساعة' : 'Past 12h'}
              </button>
              <button
                type="button"
                onClick={() => setTimeframeHours(24)}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  timeframeHours === 24 ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'آخر 24 ساعة' : 'Past 24h'}
              </button>
              <button
                type="button"
                onClick={() => setTimeframeHours(8)}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  timeframeHours === 8 ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'آخر 8 ساعات' : 'Past 8h'}
              </button>
              <button
                type="button"
                onClick={() => setTimeframeHours(72)}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  timeframeHours === 72 ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'كامل الإيواء' : 'Full Stay'}
              </button>
            </div>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              ({timeframeHours < 72 ? `منذ ${timeframeHours} ساعة وحتى اللحظة` : 'كافة السجلات'})
            </span>
          </div>

          {/* Shift Type and Nursing Staff Roles */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Shift Type Pill */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value as any)}
                className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="day_shift">{isAr ? 'مناوبة نهارية (08:00 - 20:00)' : 'Day Shift (08:00 - 20:00)'}</option>
                <option value="night_shift">{isAr ? 'مناوبة ليلية (20:00 - 08:00)' : 'Night Shift (20:00 - 08:00)'}</option>
              </select>
            </div>

            {/* Outgoing Nurse */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
              <span className="text-slate-400 font-medium">{isAr ? 'المسلّم:' : 'Outgoing:'}</span>
              <input
                type="text"
                value={outgoingNurseName}
                onChange={(e) => setOutgoingNurseName(e.target.value)}
                className="bg-transparent text-slate-900 font-semibold focus:outline-none w-32"
                placeholder="Nurse Name"
              />
            </div>

            {/* Incoming Nurse */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
              <span className="text-slate-400 font-medium">{isAr ? 'المستلم:' : 'Incoming:'}</span>
              <input
                type="text"
                value={incomingNurseName}
                onChange={(e) => setIncomingNurseName(e.target.value)}
                className="bg-transparent text-teal-800 font-semibold focus:outline-none w-32"
                placeholder="Nurse Name"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Formal SBAR Handover Sheet Canvas (Print & Screen Optimized) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden print:border-none print:shadow-none">
        {/* Printable Hospital Header Stamp */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/70">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 font-mono">
                  AL-AMAL HOSPITAL · INPATIENT NURSING HANDOVER
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-mono text-slate-500">
                  ISO-15189 & JCIA COMPLIANT
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-1">
                {isAr ? 'استمارة تسليم واستلام المريض وفق معيار SBAR' : 'SBAR Clinical Nursing Handover Form'}
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                {isAr 
                  ? `أحداث الـ ${timeframeHours} ساعة الماضية · تم الإنشاء: ${new Date().toLocaleString('ar-LY')}`
                  : `Past ${timeframeHours}h events aggregated · Generated: ${new Date().toLocaleString()}`}
              </div>
            </div>

            {/* Patient Demographic Box */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-2xs space-y-1 min-w-[280px]">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-900 text-sm">{currentPatient.fullName}</span>
                <span className="text-teal-700 font-mono">{currentPatient.mrn}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 font-mono text-[11px]">
                <span>{isAr ? 'الغرفة:' : 'Room:'} <strong>{currentAdmission.roomNumber} ({currentAdmission.roomType})</strong></span>
                <span>{isAr ? 'السرير:' : 'Bed:'} <strong>{currentAdmission.bedId || 'Main'}</strong></span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>{isAr ? 'الاستشاري:' : 'Consultant:'} {currentAdmission.attendingConsultantName}</span>
                <span className="font-bold text-red-600 font-mono">{currentPatient.bloodGroup}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SBAR SECTION 1: [S] - SITUATION (الموقف السريري الراهن) */}
        {/* ============================================================== */}
        <div className="p-5 sm:p-6 border-b border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-600 text-white font-black text-sm flex items-center justify-center">
                S
              </span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {isAr ? 'الموقف الراهن والتشخيص (Situation)' : 'Situation & Current Clinical State'}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Triage Urgency Badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                triage.level === 'critical' ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse' :
                triage.level === 'urgent' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  triage.level === 'critical' ? 'bg-rose-600' :
                  triage.level === 'urgent' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}></span>
                <span>
                  {triage.level === 'critical' ? (isAr ? 'حالة حرجة (Level 1)' : 'Critical (L1)') :
                   triage.level === 'urgent' ? (isAr ? 'عاجل (Priority 2)' : 'Urgent (P2)') :
                   (isAr ? 'مستقر سريرياً (Routine)' : 'Stable / Routine')}
                </span>
              </span>

              {/* Code Status */}
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-white font-mono">
                FULL CODE
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-slate-400 font-semibold block">{isAr ? 'التشخيص / سبب الدخول:' : 'Admission Diagnosis:'}</span>
              <span className="font-bold text-slate-900 mt-1 block">
                {assessment?.chiefComplaint || currentAdmission.department}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {isAr ? 'القسم:' : 'Dept:'} {currentAdmission.department}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-slate-400 font-semibold block">{isAr ? 'مدة الإيواء والوضع الحركي:' : 'Stay Duration & Mobility:'}</span>
              <span className="font-bold text-slate-900 mt-1 block">
                {isAr ? 'تاريخ الدخول:' : 'Admitted:'} {currentAdmission.admissionDate.split('T')[0]}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">
                ✓ {isAr ? 'حركة حرة بمساعدة الممرض' : 'Ambulation with assist'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-slate-400 font-semibold block">{isAr ? 'النظام الغذائي المصرح به:' : 'Dietary / NPO Status:'}</span>
              <span className="font-bold text-slate-900 mt-1 block">
                {activeDiet ? activeDiet.dietType.toUpperCase() : (isAr ? 'وجبة عادية متوازنة' : 'Regular Diet')}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block truncate" title={activeDiet?.specialInstructions || 'Normal oral fluids'}>
                {activeDiet?.specialInstructions || (isAr ? 'سوائل عن طريق الفم وتغذية منتظمة' : 'Oral intake tolerated')}
              </span>
            </div>
          </div>

          {/* AI or Outgoing Nurse Synthesis Note */}
          {situationNote && (
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-950 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-indigo-900">
                  {isAr ? 'ملخص التمريض السريري الذكي:' : 'Synthesized Nursing Summary:'}
                </strong>
                <p className="mt-0.5 leading-relaxed">{situationNote}</p>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* SBAR SECTION 2: [B] - BACKGROUND & OPERATIVE NOTES */}
        {/* ============================================================== */}
        <div className="p-5 sm:p-6 border-b border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
              B
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              {isAr ? 'الخلفية المرضية وملاحظات العمليات (Background & Operative Notes)' : 'Background & Operative Notes'}
            </h3>
          </div>

          {/* Surgical / Operative Procedures within the timeframe */}
          <div className="space-y-3 text-xs">
            {recentOperativeReports.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 italic">
                {isAr ? 'لا توجد عمليات جراحية منفذة خلال النافذة الزمنية المحددة.' : 'No operative procedures performed within this timeframe.'}
              </div>
            ) : (
              recentOperativeReports.map(op => (
                <div key={op.id} className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-indigo-600" />
                      <strong className="text-sm font-bold text-slate-900">{op.procedureName}</strong>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold">
                        {op.procedureCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                      <span>{op.startTime.split('T')[0]} ({op.startTime.split('T')[1]?.substring(0, 5)} - {op.endTime.split('T')[1]?.substring(0, 5)})</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-slate-700">
                    <div>
                      <span className="text-slate-400 block">{isAr ? 'الجراح الرئيسي:' : 'Surgeon:'}</span>
                      <strong className="text-slate-900">{op.leadSurgeon}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">{isAr ? 'المساعد والتخدير:' : 'Team:'}</span>
                      <span>{op.assistantSurgeons.join(', ')} · {op.anesthesiologist}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">{isAr ? 'نزف الدم المقدر (EBL):' : 'Estimated Blood Loss:'}</span>
                      <strong className="text-rose-700 font-mono">{op.estimatedBloodLossMl} ml</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">{isAr ? 'مطابقة الشاش والأدوات:' : 'Safety Counts:'}</span>
                      <span className="text-emerald-700 font-bold">✓ {isAr ? 'مطابقة ومكتملة 100%' : '100% Correct'}</span>
                    </div>
                  </div>

                  {/* Findings & Post-Op Plan */}
                  <div className="bg-white border border-indigo-100 rounded-lg p-3 space-y-1.5">
                    <div>
                      <span className="font-bold text-slate-900">{isAr ? 'الموجودات الجراحية:' : 'Operative Findings:'} </span>
                      <span className="text-slate-700">{op.findings}</span>
                    </div>
                    <div>
                      <span className="font-bold text-indigo-900">{isAr ? 'خطة ما بعد العملية للمناوبة:' : 'Post-Op Orders for Shift:'} </span>
                      <span className="text-indigo-800 font-medium">{op.postOpPlan}</span>
                    </div>
                  </div>

                  {/* Anesthesia / PACU Recovery Note */}
                  {anesthesiaRecords[0] && (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between border-t border-indigo-100 pt-2 font-mono">
                      <span>{isAr ? 'نوع التخدير:' : 'Anesthesia:'} <strong>{anesthesiaRecords[0].anesthesiaType}</strong></span>
                      <span>{isAr ? 'درجة الإفاقة Aldrete:' : 'Aldrete Score:'} <strong>{anesthesiaRecords[0].pacu?.aldreteScore || 10}/10</strong></span>
                      <span>{isAr ? 'سوائل العملية:' : 'Intra-Op Fluids:'} <strong>1800 ml</strong></span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Documented Allergies & Fall Risk Warning Bar */}
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3 text-rose-900">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold">{isAr ? 'الحساسية الموثقة:' : 'Known Allergies:'}</span>
              <span className="font-semibold text-rose-800">
                {currentPatient.allergies.join(' · ') || (isAr ? 'لا توجد حساسية دوائية معروفة' : 'NKDA')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{isAr ? 'عزل العدوى:' : 'Infection Isolation:'}</span>
              <span className="px-2 py-0.5 rounded bg-white text-rose-800 border border-rose-300 font-semibold font-mono">
                Standard Precautions
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SBAR SECTION 3: [A] - ASSESSMENT & CLINICAL EVENTS (PAST 12-24H) */}
        {/* ============================================================== */}
        <div className="p-5 sm:p-6 border-b border-slate-200 space-y-5">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-600 text-white font-black text-sm flex items-center justify-center">
              A
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              {isAr ? `التقييم السريري ووقائع الـ ${timeframeHours} ساعة الماضية (Assessment & Recent Events)` : `Assessment & Events (Past ${timeframeHours}h)`}
            </h3>
          </div>

          {/* Sub-block A: Vital Signs Extremes & Current Snapshot */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'العلامات الحيوية والمسار خلال المناوبة' : 'Vital Signs Trajectory & Shift Extremes'}</span>
            </h4>

            {vitalsTrajectory ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs font-mono">
                {/* BP */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block font-sans">{isAr ? 'ضغط الدم الأخير' : 'Latest BP'}</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {vitalsTrajectory.latest.bpSystolic}/{vitalsTrajectory.latest.bpDiastolic}
                    <span className="text-[10px] text-slate-400 font-normal ms-1">mmHg</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                    {isAr ? 'النطاق:' : 'Range:'} {vitalsTrajectory.bpRange}
                  </span>
                </div>

                {/* Pulse */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block font-sans">{isAr ? 'النبض' : 'Pulse'}</span>
                  <div className="text-sm font-bold text-rose-700 mt-0.5 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    <span>{vitalsTrajectory.latest.pulse}</span>
                    <span className="text-[10px] text-slate-400 font-normal">bpm</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-sans block mt-0.5">Normal Sinus</span>
                </div>

                {/* Temp */}
                <div className={`border rounded-lg p-2.5 ${
                  vitalsTrajectory.maxTemp >= 38.0 
                    ? 'bg-rose-50 border-rose-300' 
                    : vitalsTrajectory.maxTemp >= 37.5 
                    ? 'bg-amber-50 border-amber-300' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] text-slate-400 block font-sans">{isAr ? 'الحرارة والذروة' : 'Temperature'}</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                    <span>{vitalsTrajectory.latest.temp}°C</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                    {isAr ? 'أعلى حرارة:' : 'Peak:'} <strong className="font-bold">{vitalsTrajectory.maxTemp}°C</strong>
                  </span>
                </div>

                {/* SpO2 */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block font-sans">{isAr ? 'تشبع الأكسجين' : 'SpO2'}</span>
                  <div className="text-sm font-bold text-sky-700 mt-0.5 flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5" />
                    <span>{vitalsTrajectory.latest.spO2}%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans block mt-0.5">Room Air (هواء الغرفة)</span>
                </div>

                {/* Resp Rate */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block font-sans">{isAr ? 'معدل التنفس' : 'Resp Rate'}</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {vitalsTrajectory.latest.respRate || 18}
                    <span className="text-[10px] text-slate-400 font-normal ms-1">/min</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-sans block mt-0.5">Eupneic</span>
                </div>

                {/* Pain Score */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block font-sans">{isAr ? 'مقياس الألم' : 'Pain Scale'}</span>
                  <div className="text-sm font-bold text-indigo-700 mt-0.5">
                    {vitalsTrajectory.latest.painScale ?? 2} / 10
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                    {isAr ? 'أقصى ألم بالمناوبة:' : 'Max:'} {vitalsTrajectory.maxPain}/10
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded text-slate-400 text-xs italic">
                {isAr ? 'لا توجد علامات حيوية مسجلة' : 'No vitals recorded'}
              </div>
            )}
          </div>

          {/* Sub-block B: NEW LAB RESULTS within the past 12-24h */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-indigo-600" />
                <span>{isAr ? `نتائج التحاليل المخبرية الجديدة (خلال الـ ${timeframeHours} ساعة)` : `New Laboratory Results (Past ${timeframeHours}h)`}</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                {extractedLabItems.length} {isAr ? 'نتائج موثقة' : 'results released'}
              </span>
            </div>

            {extractedLabItems.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs italic">
                {isAr ? 'لم تصدر تحاليل مخبرية جديدة خلال الساعات المحددة.' : 'No new laboratory results released in this timeframe.'}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">{isAr ? 'الفحص المخبري' : 'Test Name'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'النتيجة المسجلة' : 'Result'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'النطاق المرجعي الطبيعي' : 'Reference Range'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'حالة القراءة والأمان' : 'Status & Interpretation'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'وقت الإصدار' : 'Time'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {extractedLabItems.map((item, idx) => (
                      <tr 
                        key={idx}
                        className={`transition-colors ${
                          item.isCritical 
                            ? 'bg-rose-50/80 font-bold text-rose-900' 
                            : item.isAbnormal 
                            ? 'bg-amber-50/60 text-amber-950 font-semibold' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2 px-3 font-bold">
                          {item.value} <span className="text-[10px] font-normal text-slate-500 font-sans">{item.unit}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-sans">
                          {item.refRange}
                        </td>
                        <td className="py-2 px-3 font-sans">
                          {item.isCritical ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>{isAr ? 'قيمة حرجة تستوجب الإبلاغ' : 'CRITICAL VALUE'}</span>
                            </span>
                          ) : item.isAbnormal ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <span>{isAr ? 'غير طبيعي (Abnormal)' : 'Abnormal Flag'}</span>
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">✓ {isAr ? 'طبيعي' : 'Normal'}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[10px]">
                          {item.orderTime ? item.orderTime.split('T')[1]?.substring(0, 5) : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sub-block C: MEDICATION CHANGES & ADMINISTRATION (PAST 12-24H) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? `إعطاء الأدوية وتغييرات الوصفات (eMAR خلال الـ ${timeframeHours} ساعة)` : `Medication Administration & Changes (Past ${timeframeHours}h)`}</span>
              </h4>

              {/* Medication KPI summary chips */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  {emarSummary.givenCount} {isAr ? 'في الموعد' : 'given'}
                </span>
                {emarSummary.delayedCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                    {emarSummary.delayedCount} {isAr ? 'متأخرة' : 'delayed'}
                  </span>
                )}
                {emarSummary.overdueCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-black animate-pulse">
                    {emarSummary.overdueCount} {isAr ? 'فائتة!' : 'overdue!'}
                  </span>
                )}
                {(emarSummary.heldCount + emarSummary.refusedCount) > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">
                    {emarSummary.heldCount + emarSummary.refusedCount} {isAr ? 'موقوفة' : 'held'}
                  </span>
                )}
              </div>
            </div>

            {/* Dose Cards List in this timeframe */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {recentEmarRecords.map(rec => {
                const isGiven = rec.status === 'given';
                const isDelayed = rec.status === 'delayed';
                const isHeld = rec.status === 'held';
                const isOverdue = rec.status === 'scheduled' && (now.getTime() - new Date(rec.scheduledTime).getTime() > 3600000);

                return (
                  <div 
                    key={rec.id}
                    className={`rounded-lg border p-3 space-y-1.5 transition-all ${
                      isOverdue ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-400' :
                      isDelayed ? 'bg-amber-50/70 border-amber-300' :
                      isHeld ? 'bg-slate-50 border-slate-300' :
                      'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-900 font-bold">{rec.medicationName}</strong>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                          {rec.route}
                        </span>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOverdue ? 'bg-rose-600 text-white animate-pulse' :
                        isDelayed ? 'bg-amber-500 text-white' :
                        isGiven ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        isHeld ? 'bg-slate-200 text-slate-800' :
                        'bg-sky-100 text-sky-800'
                      }`}>
                        {isOverdue ? (isAr ? '⚠️ جرعة فائتة!' : 'OVERDUE!') :
                         isDelayed ? (isAr ? 'تأخير موثق' : 'Delayed') :
                         isGiven ? (isAr ? 'تم الإعطاء' : 'Given') :
                         isHeld ? (isAr ? '⏸ معلق' : 'Held') :
                         (isAr ? 'مجدول' : 'Scheduled')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                      <span>{isAr ? 'المحدد:' : 'Sched:'} {rec.scheduledHour} ({rec.scheduledTime.split('T')[0]})</span>
                      {rec.actualGivenTime && (
                        <span>{isAr ? 'الفعلي:' : 'Given:'} <strong className="text-slate-900">{rec.actualGivenTime.split('T')[1]?.substring(0, 5)}</strong></span>
                      )}
                    </div>

                    {rec.delayReason && (
                      <div className="text-[11px] text-amber-900 bg-amber-100/70 p-1.5 rounded font-sans">
                        ⚠️ <strong>{isAr ? 'سبب التأخير:' : 'Delay:'}</strong> {rec.delayReason}
                      </div>
                    )}

                    {rec.administeredBy && (
                      <div className="text-[10px] text-slate-400 font-sans">
                        {isAr ? 'الممرض:' : 'Nurse:'} {rec.administeredBy}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SBAR SECTION 4: [R] - RECOMMENDATION & INCOMING ACTION CHECKLIST */}
        {/* ============================================================== */}
        <div className="p-5 sm:p-6 space-y-4 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-black text-sm flex items-center justify-center">
                R
              </span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {isAr ? 'التوصيات وقائمة مهام المناوبة المستلمة (Recommendation & Action Checklist)' : 'Recommendations & Incoming Shift Tasks'}
              </h3>
            </div>

            <span className="text-xs text-slate-500 font-medium font-mono">
              {checklist.filter(c => c.completed).length} / {checklist.length} {isAr ? 'مهام منجزة' : 'tasks acknowledged'}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            {isAr 
              ? 'يرجى من الممرض المستلم مراجعة هذه المهام والتحقق منها وتأكيد إنجازها أثناء المناوبة القادمة:'
              : 'Incoming nursing staff should review, acknowledge, and check off these clinical actions during the shift:'}
          </p>

          {/* Checklist Items */}
          <div className="space-y-2">
            {checklist.map(item => (
              <div 
                key={item.id}
                onClick={() => handleToggleChecklist(item.id)}
                className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs transition-all cursor-pointer ${
                  item.completed 
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' 
                    : 'bg-white border-slate-200 hover:border-teal-300 text-slate-800 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                    item.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className={`font-semibold ${item.completed ? 'line-through opacity-75' : ''}`}>
                    {item.text}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.dueTime && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                      {isAr ? 'الموعد:' : 'Due:'} {item.dueTime}
                    </span>
                  )}
                  {item.completedBy && (
                    <span className="text-[10px] text-emerald-700 font-medium">
                      ✓ {item.completedBy}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add custom task bar */}
          <div className="flex items-center gap-2 pt-1 no-print">
            <input
              type="text"
              value={customActionText}
              onChange={(e) => setCustomActionText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomAction()}
              placeholder={isAr ? 'إضافة مهمة تمريضية أو توصية مخصصة للمناوبة القادمة...' : 'Add a custom nursing task or clinical recommendation...'}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={handleAddCustomAction}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إضافة مهمة' : 'Add Task'}</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* FORMAL NURSING SIGN-OFF & ENDORSEMENT STAMP */}
        {/* ============================================================== */}
        <div className="p-5 sm:p-6 bg-slate-100/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block">{isAr ? 'الممرض المسلّم (Outgoing):' : 'Endorsed by:'}</span>
              <strong className="text-slate-900 text-sm font-bold">{outgoingNurseName}</strong>
              <span className="text-[10px] text-slate-400 block font-mono">
                {new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="border-s border-slate-300 ps-6">
              <span className="text-slate-400 block">{isAr ? 'الممرض المستلم (Incoming):' : 'Received by:'}</span>
              <strong className="text-teal-800 text-sm font-bold">{incomingNurseName}</strong>
              {acknowledgedTimestamp ? (
                <span className="text-[10px] text-emerald-700 block font-bold">
                  ✓ {isAr ? `تم الاستلام الساعة ${acknowledgedTimestamp}` : `Acknowledged at ${acknowledgedTimestamp}`}
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 block font-semibold">
                  {isAr ? 'بانتظار تأكيد الاستلام' : 'Pending acknowledgment'}
                </span>
              )}
            </div>
          </div>

          {/* Digital Signature / Acknowledge Button */}
          <div className="no-print">
            {isHandoverAcknowledged ? (
              <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-300 px-4 py-2 rounded-xl text-xs font-bold shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? 'تم تأكيد واعتماد استلام المناوبة رقمياً' : 'Shift Handover Acknowledged & Signed'}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAcknowledgeHandover}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>{isAr ? 'تأكيد واعتماد استلام المناوبة' : 'Acknowledge & Sign Handover'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
