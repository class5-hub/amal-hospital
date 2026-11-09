import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  Bell, 
  BellRing, 
  Syringe, 
  Activity, 
  Plus, 
  Heart, 
  ShieldAlert, 
  Sparkles, 
  Info,
  Calendar,
  X,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { 
  AnesthesiaRecord, 
  AnesthesiaVitalsPoint, 
  OperativeReport, 
  Language, 
  SystemUser 
} from '../types/hmis.ts';

interface AnesthesiaProcedureTimerProps {
  anesthesiaRecord: AnesthesiaRecord;
  operativeReport?: OperativeReport;
  language: Language;
  currentUser: SystemUser;
  onUpdateRecord: (updated: AnesthesiaRecord) => Promise<void> | void;
}

interface ProcedureMilestone {
  id: string;
  minuteMark: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  severity: 'critical' | 'warning' | 'routine';
  category: 'vitals' | 'hourly_review' | 'antibiotic' | 'block_duration' | 'prolonged';
}

const PROCEDURAL_MILESTONES: ProcedureMilestone[] = [
  {
    id: 'm-15',
    minuteMark: 15,
    titleAr: 'فحص العلامات الحيوية الأول (15 دقيقة)',
    titleEn: '15-Minute Vital Signs Check',
    descriptionAr: 'توثيق ضغط الدم، النبض، SpO2، وتركيز ثاني أكسيد الكربون EtCO2',
    descriptionEn: 'Document BP, Pulse, SpO2, and EtCO2 level',
    severity: 'warning',
    category: 'vitals'
  },
  {
    id: 'm-30',
    minuteMark: 30,
    titleAr: 'فحص العلامات الحيوية الدوري (30 دقيقة)',
    titleEn: '30-Minute Vital Signs Check',
    descriptionAr: 'متابعة استقرار المؤشرات الحيوية وحجم السوائل الوريدية المعطاة',
    descriptionEn: 'Monitor hemodynamic stability and infused IV fluid volume',
    severity: 'warning',
    category: 'vitals'
  },
  {
    id: 'm-45',
    minuteMark: 45,
    titleAr: 'فحص العلامات الحيوية الدوري (45 دقيقة)',
    titleEn: '45-Minute Vital Signs Check',
    descriptionAr: 'مراقبة مستوى التخدير النصفي/العام وتدفق الغازات والتهوية',
    descriptionEn: 'Monitor anesthesia depth, ventilation, and oxygen flow',
    severity: 'warning',
    category: 'vitals'
  },
  {
    id: 'm-60',
    minuteMark: 60,
    titleAr: 'المراجعة السريرية الشاملة للساعة الأولى (60 دقيقة)',
    titleEn: 'Hourly Full Hemodynamic & Fluid Review (60m)',
    descriptionAr: 'مراجعة توازن السوائل، النزف التقديري، درجة حرارة المريض، والبول',
    descriptionEn: 'Evaluate fluid balance, EBL blood loss, core temperature & urine output',
    severity: 'critical',
    category: 'hourly_review'
  },
  {
    id: 'm-90',
    minuteMark: 90,
    titleAr: 'تقييم مدة التخدير النصفي/الشوكي (90 دقيقة)',
    titleEn: 'Spinal/Epidural Duration & Block Level (90m)',
    descriptionAr: 'مراقبة انحسار الحصار العصبي الحسي/الحركي وتجهيز مسكنات إضافية',
    descriptionEn: 'Assess sensory/motor block regression and supplemental analgesia',
    severity: 'warning',
    category: 'block_duration'
  },
  {
    id: 'm-120',
    minuteMark: 120,
    titleAr: 'استحقاق الجرعة المعززة للمضاد الحيوي الوقائي (120 دقيقة)',
    titleEn: 'Antibiotic Re-Dosing Reminder (120m Window)',
    descriptionAr: 'إلزامية إعادة جرعة المضاد الوقائي (مثل Cefazolin) عند تجاوز الساعتين',
    descriptionEn: 'Mandatory antibiotic re-dose (e.g. Cefazolin) for procedures > 2 hours',
    severity: 'critical',
    category: 'antibiotic'
  },
  {
    id: 'm-180',
    minuteMark: 180,
    titleAr: 'تنبيه الجراحة المطوّلة وخطر انخفاض الحرارة (180 دقيقة)',
    titleEn: 'Prolonged Procedure Alert & Thermal Management (180m)',
    descriptionAr: 'تقييم غازات الدم الشرياني ABG وتدفئة نشطة للمريض والسوائل',
    descriptionEn: 'Arterial blood gas (ABG) review, active patient and fluid warming',
    severity: 'critical',
    category: 'prolonged'
  }
];

export const AnesthesiaProcedureTimer: React.FC<AnesthesiaProcedureTimerProps> = ({
  anesthesiaRecord,
  operativeReport,
  language,
  currentUser,
  onUpdateRecord
}) => {
  const isAr = language === 'ar';

  // Determine initial procedure start time
  const initialStartTime = useMemo(() => {
    if (anesthesiaRecord.startTime) return anesthesiaRecord.startTime;
    if (anesthesiaRecord.administeredDrugs && anesthesiaRecord.administeredDrugs.length > 0) {
      return anesthesiaRecord.administeredDrugs[0].time;
    }
    if (anesthesiaRecord.intraopVitals && anesthesiaRecord.intraopVitals.length > 0) {
      return anesthesiaRecord.intraopVitals[0].time;
    }
    if (operativeReport?.startTime) {
      return operativeReport.startTime;
    }
    return '13:15';
  }, [anesthesiaRecord, operativeReport]);

  const [procedureStartTime, setProcedureStartTime] = useState<string>(initialStartTime);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [timerMode, setTimerMode] = useState<'live' | 'simulation'>('live');
  const [simulatedElapsedMinutes, setSimulatedElapsedMinutes] = useState<number>(55);
  const [acknowledgedMilestones, setAcknowledgedMilestones] = useState<Record<string, boolean>>({});
  const [showVitalsModal, setShowVitalsModal] = useState<boolean>(false);
  const [showTimeEditModal, setShowTimeEditModal] = useState<boolean>(false);

  // Quick vital sign form states
  const [quickVitals, setQuickVitals] = useState({
    time: '',
    bpSystolic: 118,
    bpDiastolic: 75,
    heartRate: 78,
    spO2: 99,
    etCO2: 35,
    fluidsGivenMl: 1500
  });

  // Calculate elapsed seconds
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState<number>(() => {
    // If start time is an ISO date or "HH:MM"
    try {
      if (procedureStartTime.includes('T')) {
        const start = new Date(procedureStartTime).getTime();
        const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
        return diff;
      } else if (procedureStartTime.includes(':')) {
        // Compare with today's date at that HH:MM
        const [hours, minutes] = procedureStartTime.split(':').map(Number);
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        // If start was in the past today, return diff, else default to 55 mins
        return diff > 0 && diff < 86400 ? diff : 55 * 60;
      }
    } catch {
      // fallback
    }
    return 55 * 60; // 55 minutes default
  });

  // Live timer tick
  useEffect(() => {
    if (!isRunning || timerMode === 'simulation') return;

    const interval = setInterval(() => {
      setLiveElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timerMode]);

  // Current effective elapsed seconds and minutes
  const effectiveSeconds = timerMode === 'simulation' 
    ? simulatedElapsedMinutes * 60 
    : liveElapsedSeconds;

  const elapsedHours = Math.floor(effectiveSeconds / 3600);
  const elapsedMinutes = Math.floor((effectiveSeconds % 3600) / 60);
  const elapsedSecs = effectiveSeconds % 60;
  const totalElapsedMinutes = Math.floor(effectiveSeconds / 60);

  // Format timer HH:MM:SS
  const formattedTimer = `${String(elapsedHours).padStart(2, '0')}:${String(elapsedMinutes).padStart(2, '0')}:${String(elapsedSecs).padStart(2, '0')}`;

  // Evaluate Milestones: check which ones are upcoming, due, or accomplished
  const milestoneStatuses = useMemo(() => {
    return PROCEDURAL_MILESTONES.map(m => {
      const isAcknowledged = !!acknowledgedMilestones[m.id];
      // Check if vitals exist around that mark in intraopVitals
      const hasVitalRecord = anesthesiaRecord.intraopVitals?.some(v => {
        // e.g. check if there's a vital recorded
        return false;
      });

      const minutesUntil = m.minuteMark - totalElapsedMinutes;
      const isPast = totalElapsedMinutes >= m.minuteMark;
      const isApproaching = minutesUntil > 0 && minutesUntil <= 5; // within 5 minutes
      const isDue = isPast && !isAcknowledged;

      return {
        ...m,
        isAcknowledged,
        minutesUntil,
        isPast,
        isApproaching,
        isDue,
        status: isAcknowledged ? 'done' : isDue ? 'due' : isApproaching ? 'approaching' : 'scheduled'
      };
    });
  }, [totalElapsedMinutes, acknowledgedMilestones, anesthesiaRecord.intraopVitals]);

  // Urgent active alerts (due or approaching)
  const activeAlerts = useMemo(() => {
    return milestoneStatuses.filter(m => m.isDue || m.isApproaching);
  }, [milestoneStatuses]);

  const mostCriticalAlert = activeAlerts.find(a => a.isDue) || activeAlerts[0] || null;

  // Handle Quick Vitals Recording
  const handleSaveQuickVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    const timeStr = quickVitals.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const newPoint: AnesthesiaVitalsPoint = {
      time: timeStr,
      bpSystolic: quickVitals.bpSystolic,
      bpDiastolic: quickVitals.bpDiastolic,
      heartRate: quickVitals.heartRate,
      spO2: quickVitals.spO2,
      etCO2: quickVitals.etCO2,
      fluidsGivenMl: quickVitals.fluidsGivenMl
    };

    const updatedRecord: AnesthesiaRecord = {
      ...anesthesiaRecord,
      intraopVitals: [...(anesthesiaRecord.intraopVitals || []), newPoint]
    };

    // Acknowledge any due vitals milestones up to this mark
    const newAcks = { ...acknowledgedMilestones };
    milestoneStatuses.forEach(m => {
      if (m.isPast) newAcks[m.id] = true;
    });
    setAcknowledgedMilestones(newAcks);

    await onUpdateRecord(updatedRecord);
    setShowVitalsModal(false);
  };

  // Acknowledge milestone
  const handleAcknowledge = (milestoneId: string) => {
    setAcknowledgedMilestones(prev => ({
      ...prev,
      [milestoneId]: true
    }));
  };

  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 overflow-hidden mb-5">
      {/* Top Banner: Status & Live Controls */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Stopwatch Display & Identity */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                {isAr ? 'مؤقت مدة التخدير والجراحة (Time-in-Procedure)' : 'Time-in-Procedure Stopwatch'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
                {isRunning ? (isAr ? 'جلسة نشطة' : 'ACTIVE SESSION') : (isAr ? 'متوقف مؤقتاً' : 'PAUSED')}
              </span>
            </div>

            <div className="flex items-baseline gap-3 mt-1">
              <div className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
                {formattedTimer}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {elapsedHours > 0 ? (
                  <span>
                    {elapsedHours} {isAr ? 'س' : 'h'} {elapsedMinutes} {isAr ? 'د' : 'm'}
                  </span>
                ) : (
                  <span>
                    {elapsedMinutes} {isAr ? 'دقيقة جراحية' : 'minutes in OT'}
                  </span>
                )}
                <span className="text-slate-600 mx-1.5">|</span>
                <span className="text-slate-400 font-mono">
                  {isAr ? 'بدء التخدير:' : 'Start:'} {procedureStartTime.split('T')[1]?.substring(0, 5) || procedureStartTime}
                </span>
                <button
                  type="button"
                  onClick={() => setShowTimeEditModal(true)}
                  className="text-teal-400 hover:text-teal-300 ms-1 text-[11px] underline cursor-pointer"
                >
                  {isAr ? 'تعديل' : 'Edit'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isRunning 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title={isRunning ? (isAr ? 'إيقاف مؤقت للمؤقت' : 'Pause timer') : (isAr ? 'استئناف المؤقت' : 'Resume timer')}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'استئناف' : 'Resume')}</span>
          </button>

          {/* Quick Intraop Vitals Logger */}
          <button
            type="button"
            onClick={() => {
              const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
              setQuickVitals(prev => ({ ...prev, time: nowTime }));
              setShowVitalsModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-xs cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل علامات داخل العمليات' : 'Log Intra-op Vitals'}</span>
          </button>

          {/* Simulator & Milestone Tester Toggle */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <span className="text-[11px] text-slate-400 px-1 font-sans">
              {isAr ? 'محاكاة الوقت:' : 'Simulate:'}
            </span>
            <button
              type="button"
              onClick={() => {
                setTimerMode('live');
                setIsRunning(true);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                timerMode === 'live' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'حي' : 'Live'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerMode('simulation');
                setSimulatedElapsedMinutes(55);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                timerMode === 'simulation' && simulatedElapsedMinutes === 55 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title={isAr ? 'محاكاة 55 دقيقة (تحذير اقتراب الساعة الأولى)' : 'Simulate 55m (Warning)'}
            >
              55m ⚠️
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerMode('simulation');
                setSimulatedElapsedMinutes(62);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                timerMode === 'simulation' && simulatedElapsedMinutes === 62 ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title={isAr ? 'محاكاة 62 دقيقة (استحقاق فحص الساعة الأولى)' : 'Simulate 62m (Due)'}
            >
              62m 🚨
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerMode('simulation');
                setSimulatedElapsedMinutes(118);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                timerMode === 'simulation' && simulatedElapsedMinutes === 118 ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title={isAr ? 'محاكاة 118 دقيقة (اقتراب جرعة المضاد الحيوي)' : 'Simulate 118m (Antibiotic)'}
            >
              118m 💉
            </button>
          </div>
        </div>
      </div>

      {/* CRITICAL WARNING PROACTIVE BAR (WHEN ALERT ACTIVE) */}
      {mostCriticalAlert && (
        <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
          mostCriticalAlert.status === 'due'
            ? 'bg-rose-950/80 border-rose-800 text-rose-100 animate-pulse'
            : 'bg-amber-950/70 border-amber-800 text-amber-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              mostCriticalAlert.status === 'due'
                ? 'bg-rose-600 text-white'
                : 'bg-amber-600 text-white'
            }`}>
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  {mostCriticalAlert.status === 'due' 
                    ? (isAr ? '🚨 تنبيه سريري مستحق الآن:' : '🚨 CRITICAL MILESTONE OVERDUE:') 
                    : (isAr ? '⚠️ اقتراب موعد إجراء سريري حرج:' : '⚠️ UPCOMING CRITICAL MILESTONE:')}
                </span>
                <span className="font-bold text-sm">
                  {isAr ? mostCriticalAlert.titleAr : mostCriticalAlert.titleEn}
                </span>
                <span className="px-2 py-0.2 rounded text-[10px] font-bold font-mono bg-black/40 border border-white/20">
                  {mostCriticalAlert.status === 'due' 
                    ? (isAr ? `مستحق عند د ${mostCriticalAlert.minuteMark}` : `Due @ ${mostCriticalAlert.minuteMark}m`)
                    : (isAr ? `خلال ${mostCriticalAlert.minutesUntil} دقيقة` : `In ${mostCriticalAlert.minutesUntil}m`)}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                {isAr ? mostCriticalAlert.descriptionAr : mostCriticalAlert.descriptionEn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick action button */}
            <button
              type="button"
              onClick={() => {
                const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                setQuickVitals(prev => ({ ...prev, time: nowTime }));
                setShowVitalsModal(true);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shadow-xs"
            >
              {isAr ? 'تسجيل وفحص العلامات الآن' : 'Record Vitals & Clear Alert'}
            </button>

            <button
              type="button"
              onClick={() => handleAcknowledge(mostCriticalAlert.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 cursor-pointer"
            >
              {isAr ? 'تم الإقرار (Acknowledge)' : 'Acknowledge'}
            </button>
          </div>
        </div>
      )}

      {/* MILESTONE HORIZONTAL TIMELINE & CHECKPOINTS */}
      <div className="p-4 sm:p-5 bg-slate-900/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-teal-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {isAr ? 'المعايير الزمنية والمحطات الإلزامية في غرفة العمليات' : 'Intraoperative Milestones & Hourly Checkpoints'}
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {milestoneStatuses.filter(m => m.status === 'done').length} / {milestoneStatuses.length} {isAr ? 'محطات مكتملة' : 'completed'}
          </span>
        </div>

        {/* Milestone Steps Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {milestoneStatuses.map(m => {
            const isDone = m.status === 'done';
            const isDue = m.status === 'due';
            const isApproaching = m.status === 'approaching';

            return (
              <div 
                key={m.id}
                className={`p-3 rounded-xl border text-xs transition-all relative ${
                  isDone 
                    ? 'bg-slate-800/60 border-emerald-900/40 text-slate-300' 
                    : isDue 
                    ? 'bg-rose-950/40 border-rose-600/80 text-rose-100 ring-1 ring-rose-500' 
                    : isApproaching 
                    ? 'bg-amber-950/40 border-amber-500 text-amber-100' 
                    : 'bg-slate-850/50 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold font-mono">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                      isDone ? 'bg-emerald-500/20 text-emerald-400' :
                      isDue ? 'bg-rose-500 text-white font-black' :
                      isApproaching ? 'bg-amber-500 text-black font-black' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      +{m.minuteMark}m
                    </span>
                    <span className={`text-[11px] truncate ${isDue ? 'text-rose-200 font-bold' : isApproaching ? 'text-amber-200' : 'text-slate-200'}`}>
                      {isAr ? m.titleAr : m.titleEn}
                    </span>
                  </div>

                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isDue ? (
                    <BellRing className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
                  ) : isApproaching ? (
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0 mt-1"></span>
                  )}
                </div>

                <p className="text-[11px] opacity-80 leading-snug line-clamp-2 mb-2 font-medium">
                  {isAr ? m.descriptionAr : m.descriptionEn}
                </p>

                {/* Milestone Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[10px]">
                  <span className="font-mono">
                    {isDone ? (
                      <span className="text-emerald-400 font-semibold">{isAr ? '✓ تم التحقق' : 'Verified'}</span>
                    ) : isDue ? (
                      <span className="text-rose-400 font-bold">{isAr ? 'مستحق الآن!' : 'Due Now!'}</span>
                    ) : isApproaching ? (
                      <span className="text-amber-400 font-bold">{isAr ? `خلال ${m.minutesUntil} د` : `In ${m.minutesUntil}m`}</span>
                    ) : (
                      <span className="text-slate-500">{isAr ? `بعد ${m.minutesUntil} د` : `In ${m.minutesUntil}m`}</span>
                    )}
                  </span>

                  {!isDone && (
                    <button
                      type="button"
                      onClick={() => handleAcknowledge(m.id)}
                      className="text-teal-400 hover:text-teal-300 font-bold hover:underline cursor-pointer"
                    >
                      {isAr ? 'إقرار' : 'Ack'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Record Intraoperative Vitals */}
      {showVitalsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-200" />
                <h3 className="font-bold text-sm">
                  {isAr ? 'توثيق قراءة حيوية داخل العمليات (Intra-op)' : 'Log Intraoperative Vital Signs'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowVitalsModal(false)}
                className="text-white/80 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickVitals} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'وقت القراءة (Time)' : 'Time'}
                  </label>
                  <input
                    type="time"
                    value={quickVitals.time}
                    onChange={e => setQuickVitals({ ...quickVitals, time: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'معدل النبض (HR bpm)' : 'Heart Rate (bpm)'}
                  </label>
                  <input
                    type="number"
                    value={quickVitals.heartRate}
                    onChange={e => setQuickVitals({ ...quickVitals, heartRate: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                    min={30}
                    max={220}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'الضغط الانقباضي (SBP)' : 'BP Systolic (mmHg)'}
                  </label>
                  <input
                    type="number"
                    value={quickVitals.bpSystolic}
                    onChange={e => setQuickVitals({ ...quickVitals, bpSystolic: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                    min={40}
                    max={250}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'الضغط الانبساطي (DBP)' : 'BP Diastolic (mmHg)'}
                  </label>
                  <input
                    type="number"
                    value={quickVitals.bpDiastolic}
                    onChange={e => setQuickVitals({ ...quickVitals, bpDiastolic: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                    min={20}
                    max={150}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'تشبع الأكسجين (SpO2 %)' : 'Oxygen SpO2 (%)'}
                  </label>
                  <input
                    type="number"
                    value={quickVitals.spO2}
                    onChange={e => setQuickVitals({ ...quickVitals, spO2: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-teal-700 font-bold"
                    min={50}
                    max={100}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'تركيز EtCO2 (mmHg)' : 'End-Tidal CO2 (mmHg)'}
                  </label>
                  <input
                    type="number"
                    value={quickVitals.etCO2}
                    onChange={e => setQuickVitals({ ...quickVitals, etCO2: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    min={10}
                    max={80}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'إجمالي السوائل الوريدية المعطاة (IV Fluids ml)' : 'Total Cumulative IV Fluids (ml)'}
                </label>
                <input
                  type="number"
                  value={quickVitals.fluidsGivenMl}
                  onChange={e => setQuickVitals({ ...quickVitals, fluidsGivenMl: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  step={50}
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVitalsModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {isAr ? 'حفظ وتحديث المحطات' : 'Save & Clear Milestones'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Procedure Start Time */}
      {showTimeEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {isAr ? 'ضبط وقت بدء جلسة التخدير' : 'Set Anesthesia Start Time'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowTimeEditModal(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'وقت البدء الفعلي للتخدير:' : 'Actual Induction Start Time:'}
                </label>
                <input
                  type="time"
                  value={procedureStartTime.includes('T') ? procedureStartTime.split('T')[1]?.substring(0, 5) : procedureStartTime}
                  onChange={e => setProcedureStartTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-base font-bold"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const hh = String(now.getHours()).padStart(2, '0');
                    const mm = String(now.getMinutes()).padStart(2, '0');
                    setProcedureStartTime(`${hh}:${mm}`);
                    setLiveElapsedSeconds(0);
                    setTimerMode('live');
                    setShowTimeEditModal(false);
                  }}
                  className="flex-1 py-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 transition-colors"
                >
                  {isAr ? 'بدء الآن (اللحظة الحالية)' : 'Start Now (00:00:00)'}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowTimeEditModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 text-white font-bold"
                >
                  {isAr ? 'تم' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
