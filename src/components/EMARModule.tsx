import React, { useState, useEffect, useMemo } from 'react';
import { 
  Patient, 
  Admission, 
  EMARRecord, 
  MedicationOrder, 
  Language, 
  SystemUser,
  SmartAlert
} from '../types/hmis.ts';
import {
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  XCircle, 
  PauseCircle, 
  UserCheck, 
  Pill,
  Filter,
  Eye,
  Info,
  X,
  Stethoscope,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Table,
  ListOrdered
} from 'lucide-react';
import { api } from '../api/client.ts';
import { MedicationTimeline } from './MedicationTimeline.tsx';

interface EMARModuleProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  emarRecords: EMARRecord[];
  medications: MedicationOrder[];
  currentUser: SystemUser;
  language: Language;
  onRefresh: () => void;
  smartAlerts?: SmartAlert[];
}

interface MedicationAlertMatch {
  hasAllergyConflict: boolean;
  hasDrugInteraction: boolean;
  allergyAlerts: SmartAlert[];
  interactionAlerts: SmartAlert[];
  allAlerts: SmartAlert[];
}

export const EMARModule: React.FC<EMARModuleProps> = ({
  currentPatient,
  currentAdmission,
  emarRecords,
  medications,
  currentUser,
  language,
  onRefresh,
  smartAlerts: initialSmartAlerts
}) => {
  const isAr = language === 'ar';
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [selectedHourFilter, setSelectedHourFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [filterOnlyAlerts, setFilterOnlyAlerts] = useState<boolean>(false);

  // SmartAlerts state fetched from SmartAlerts service
  const [alerts, setAlerts] = useState<SmartAlert[]>(initialSmartAlerts || []);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);

  // Review Interaction Modal State
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [selectedReviewRecord, setSelectedReviewRecord] = useState<EMARRecord | null>(null);
  const [selectedReviewMatch, setSelectedReviewMatch] = useState<MedicationAlertMatch | null>(null);
  const [holdReasonNote, setHoldReasonNote] = useState('');
  const [isHoldingDose, setIsHoldingDose] = useState(false);

  // Administration action modal state
  const [showAdministerModal, setShowAdministerModal] = useState(false);
  const [activeEmar, setActiveEmar] = useState<EMARRecord | null>(null);
  const [adminStatus, setAdminStatus] = useState<'given' | 'refused' | 'held' | 'delayed'>('given');
  const [adminNotes, setAdminNotes] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [supervisorNote, setSupervisorNote] = useState('');
  const [supervisorName, setSupervisorName] = useState('مشرفة التمريض خولة الطاهر');
  const [isDelayedOutsideWindow, setIsDelayedOutsideWindow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch live SmartAlerts for the active admission
  const fetchAlerts = async () => {
    if (!currentAdmission) return;
    setIsLoadingAlerts(true);
    try {
      const fetched = await api.getSmartAlerts(currentAdmission.admissionId);
      setAlerts(fetched);
    } catch (err) {
      console.error('Error fetching smart alerts in EMARModule:', err);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [currentAdmission?.admissionId]);

  if (!currentAdmission || !currentPatient) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
        {isAr ? 'يرجى اختيار مريض منوم لعرض سجل إعطاء الأدوية eMAR' : 'Please select an active inpatient to view eMAR'}
      </div>
    );
  }

  // Helper to match a specific eMAR record against SmartAlerts service
  const getMedicationAlerts = (rec: EMARRecord): MedicationAlertMatch => {
    const recName = rec.medicationName.toLowerCase();
    const relOrder = medications.find(m => m.id === rec.orderId);
    const trade = relOrder?.tradeName.toLowerCase() || '';
    const generic = relOrder?.genericName.toLowerCase() || '';

    // Match alerts of category medication_allergy
    const matching = alerts.filter(a => {
      if (a.category !== 'medication_allergy') return false;
      const alertText = `${a.titleEn} ${a.titleAr} ${a.messageEn} ${a.messageAr} ${a.metricValue || ''}`.toLowerCase();

      // Token match on significant words (length >= 3)
      const tokens = recName.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 3);
      const matchesToken = tokens.some(token => alertText.includes(token));
      const matchesTrade = trade && alertText.includes(trade);
      const matchesGeneric = generic && alertText.includes(generic);
      const matchesId = rec.orderId && a.id.includes(rec.orderId);

      return matchesToken || matchesTrade || matchesGeneric || matchesId;
    });

    const allergyAlerts = matching.filter(a => 
      a.id.includes('allergy') || 
      a.titleEn.toLowerCase().includes('allergy') || 
      a.messageEn.toLowerCase().includes('allergy') || 
      a.titleAr.includes('حساسية') || 
      a.messageAr.includes('حساسية')
    );

    const interactionAlerts = matching.filter(a => 
      a.id.includes('ddi') || 
      a.titleEn.toLowerCase().includes('interaction') || 
      a.titleAr.includes('تفاعل') || 
      a.messageEn.toLowerCase().includes('interaction') || 
      a.messageAr.includes('تفاعل')
    );

    return {
      hasAllergyConflict: allergyAlerts.length > 0,
      hasDrugInteraction: interactionAlerts.length > 0,
      allergyAlerts,
      interactionAlerts,
      allAlerts: matching
    };
  };

  // Pre-calculate alert map for all eMAR records
  const recordAlertMap = useMemo(() => {
    const map = new Map<string, MedicationAlertMatch>();
    for (const r of emarRecords) {
      map.set(r.id, getMedicationAlerts(r));
    }
    return map;
  }, [emarRecords, alerts, medications]);

  // Count total alerts across records
  const totalAllergyConflicts = useMemo(() => {
    return Array.from(recordAlertMap.values()).filter(m => m.hasAllergyConflict).length;
  }, [recordAlertMap]);

  const totalDrugInteractions = useMemo(() => {
    return Array.from(recordAlertMap.values()).filter(m => m.hasDrugInteraction).length;
  }, [recordAlertMap]);

  // Filter records
  const filteredRecords = emarRecords.filter(r => {
    if (selectedHourFilter !== 'all' && r.scheduledHour !== selectedHourFilter) return false;
    if (selectedStatusFilter !== 'all' && r.status !== selectedStatusFilter) return false;
    if (filterOnlyAlerts) {
      const match = recordAlertMap.get(r.id);
      if (!match || (!match.hasAllergyConflict && !match.hasDrugInteraction)) return false;
    }
    return true;
  });

  const scheduledHours = Array.from(new Set(emarRecords.map(r => r.scheduledHour))).sort();

  // Open Review Interaction Modal
  const handleOpenReviewModal = (rec: EMARRecord, match: MedicationAlertMatch) => {
    setSelectedReviewRecord(rec);
    setSelectedReviewMatch(match);
    setHoldReasonNote(
      isAr 
        ? `عُلقت الجرعة لوجود ${match.hasAllergyConflict ? 'تعارض حساسية صريح' : 'تفاعل دوائي خطير'} بانتظار استبدالها من الطبيب المعالج.`
        : `Dose held due to ${match.hasAllergyConflict ? 'patient allergy conflict' : 'critical drug-drug interaction'}. Awaiting physician replacement.`
    );
    setShowInteractionModal(true);
  };

  // Hold Medication directly from Review Modal
  const handleHoldFromInteraction = async () => {
    if (!selectedReviewRecord) return;
    setIsHoldingDose(true);
    try {
      await api.recordEMARAdministration(selectedReviewRecord.id, {
        status: 'held',
        nurseName: currentUser.name,
        delayReason: isAr ? 'تعليق الجرعة لوجود تعارض دوائي/حساسية' : 'Held due to interaction/allergy conflict',
        supervisorNote: isAr ? 'تمت مراجعة التعارض وتعليق الدواء لحين مراجعة الطبيب' : 'Interaction reviewed with supervisor, dose withheld',
        supervisorName: currentUser.name,
        notes: holdReasonNote
      });

      setShowInteractionModal(false);
      onRefresh();
      fetchAlerts();
    } catch (err: any) {
      alert(err.message || 'Failed to hold medication');
    } finally {
      setIsHoldingDose(false);
    }
  };

  // Acknowledge alert with supervisor
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.acknowledgeSmartAlert(alertId, currentUser, isAr ? 'تمت مراجعة التفاعل من التمريض والمشرف' : 'Reviewed by charge nurse');
      fetchAlerts();
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge alert');
    }
  };

  const handleOpenAdministerModal = (record: EMARRecord) => {
    setActiveEmar(record);
    setAdminStatus('given');
    setAdminNotes('');
    setDelayReason('');
    setSupervisorNote('');

    // Check if the current time is > 1 hour away from scheduled time (Ch. 10 Window Rule)
    const now = new Date();
    const scheduled = new Date(record.scheduledTime);
    const diffHours = Math.abs((now.getTime() - scheduled.getTime()) / (1000 * 60 * 60));
    
    // Check if outside 1 hour window
    const outsideWindow = diffHours > 1.0;
    setIsDelayedOutsideWindow(outsideWindow);
    if (outsideWindow) {
      setAdminStatus('delayed');
      setDelayReason(isAr ? 'تأخر الإعطاء نظراً لإجراء طبي مرافق أو نوم المريض' : 'Clinical procedure or resting patient');
    }

    setShowAdministerModal(true);
  };

  const handleSaveAdministration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmar) return;
    setIsSubmitting(true);
    try {
      await api.recordEMARAdministration(activeEmar.id, {
        status: adminStatus,
        nurseName: currentUser.name,
        delayReason: (isDelayedOutsideWindow || adminStatus === 'delayed') ? delayReason : undefined,
        supervisorNote: (isDelayedOutsideWindow || adminStatus === 'delayed') ? supervisorNote : undefined,
        supervisorName: (isDelayedOutsideWindow || adminStatus === 'delayed') ? supervisorName : undefined,
        notes: adminNotes
      });

      setShowAdministerModal(false);
      onRefresh();
      fetchAlerts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* CLINICAL SAFETY BANNER: SMARTALERTS NOTIFICATIONS */}
      {(totalAllergyConflicts > 0 || totalDrugInteractions > 0) && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border-2 border-rose-300 rounded-xl p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-rose-950">
                    {isAr ? 'تنبيهات أمان التمريض الدوائي (SmartAlerts Clinical Safety Warnings)' : 'SmartAlerts Clinical Medication Safety Warnings'}
                  </h3>
                  <span className="px-2 py-0.2 rounded-full text-xs font-bold bg-rose-600 text-white font-mono">
                    {totalAllergyConflicts + totalDrugInteractions} {isAr ? 'تنبيهات نشطة' : 'alerts'}
                  </span>
                </div>
                <p className="text-xs text-rose-900 mt-1 leading-relaxed">
                  {isAr 
                    ? `رصد نظام التنبيهات الذكي تعارضات دوائية حرجة أو حساسية موثقة للمريضة (${currentPatient.fullName}). يرجى فحص كل دواء مميز بالنقر على «مراجعة التعارض» والتأكد قبل الإعطاء.`
                    : `SmartAlerts detected critical drug conflicts or documented patient allergy matches for ${currentPatient.fullName}. Review highlighted medications before administration.`}
                </p>
                {/* Allergy Pills */}
                {currentPatient.allergies.length > 0 && (
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-rose-900 font-medium">
                    <span className="font-bold">{isAr ? 'الحساسية الموثقة للمريض:' : 'Documented Allergies:'}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold font-mono">
                      {currentPatient.allergies.join(' · ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Filter Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setFilterOnlyAlerts(!filterOnlyAlerts)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  filterOnlyAlerts 
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs' 
                    : 'bg-white hover:bg-rose-100 text-rose-900 border-rose-300'
                }`}
              >
                {filterOnlyAlerts 
                  ? (isAr ? '✓ عرض الأدوية المنبهة فقط' : 'Showing Alerts Only') 
                  : (isAr ? 'تصفية الأدوية ذات التنبيهات' : 'Filter Medications with Alerts')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Filter & Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'سجل إعطاء العلاج بالتمريض الإلكتروني (eMAR)' : 'Electronic Medication Administration Record (eMAR)'}</span>
            </h2>
            <span className="text-xs text-slate-500">
              {isAr ? 'نافذة التوقيت: ±60 دقيقة من الوقت المحدد مع توثيق أسباب التأخير وتصديق المشرف دون تعطيل الرعاية' : 'Window rule: ±60 min standard with supervisor sign-off for delays'}
            </span>
          </div>

          {/* View Mode Switcher: Medication Timeline vs Table Grid */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title={isAr ? 'عرض المسار الزمني المتسلسل لكامل فترة الإيواء مع رصد التأخير والجرعات الفائتة' : 'Chronological vertical timeline of administered vs scheduled doses'}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isAr ? 'المسار الزمني للأدوية (Timeline)' : 'Medication Timeline'}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title={isAr ? 'عرض جدول الإعطاء السريري التقليدي' : 'Standard tabular eMAR view'}
            >
              <Table className="w-3.5 h-3.5" />
              <span>{isAr ? 'جدول الإعطاء (Table Grid)' : 'Table Grid'}</span>
            </button>
          </div>
        </div>

        {/* Filters (Shown when Table Grid is active) */}
        {viewMode === 'table' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedHourFilter}
                onChange={(e) => setSelectedHourFilter(e.target.value)}
                className="bg-transparent text-slate-900 focus:outline-none cursor-pointer font-mono"
              >
                <option value="all">{isAr ? 'كافة الفترات الزمنية' : 'All Hours'}</option>
                {scheduledHours.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="all">{isAr ? 'كافة حالات الإعطاء' : 'All Statuses'}</option>
                <option value="scheduled">{isAr ? 'مجدول / قيد الانتظار' : 'Scheduled'}</option>
                <option value="given">{isAr ? 'تم الإعطاء في الموعد' : 'Given'}</option>
                <option value="delayed">{isAr ? 'تم الإعطاء بتأخير موثق' : 'Delayed'}</option>
                <option value="refused">{isAr ? 'رفض المريض' : 'Refused'}</option>
                <option value="held">{isAr ? 'معلق / موقوف' : 'Held / Cancelled'}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area: MedicationTimeline vs Table Grid */}
      {viewMode === 'timeline' ? (
        <MedicationTimeline
          emarRecords={emarRecords}
          medications={medications}
          currentPatient={currentPatient}
          currentAdmission={currentAdmission}
          language={language}
          currentUser={currentUser}
          onAdministerDose={handleOpenAdministerModal}
          onReviewInteraction={handleOpenReviewModal}
          recordAlertMap={recordAlertMap}
        />
      ) : (
        /* eMAR Grid */
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-3.5">{isAr ? 'الموعد المحدد' : 'Scheduled'}</th>
                <th className="py-3 px-3.5">{isAr ? 'الدواء والجرعة' : 'Medication & Dose'}</th>
                <th className="py-3 px-3.5">{isAr ? 'تنبيهات الأمان السريري' : 'Clinical Safety & Alerts'}</th>
                <th className="py-3 px-3.5">{isAr ? 'الطريق' : 'Route'}</th>
                <th className="py-3 px-3.5">{isAr ? 'حالة الجرعة' : 'Status'}</th>
                <th className="py-3 px-3.5">{isAr ? 'وقت التنفيذ الفعلي' : 'Actual Time'}</th>
                <th className="py-3 px-3.5">{isAr ? 'الممرض المنفذ' : 'Administered By'}</th>
                <th className="py-3 px-3.5">{isAr ? 'ملاحظات / اعتماد المشرف' : 'Notes / Supervisor Sign-off'}</th>
                <th className="py-3 px-3.5 text-center">{isAr ? 'الإجراء والتوثيق' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {isAr ? 'لا توجد جرعات مجدولة مطابقة للفلتر المحدد' : 'No medication records found.'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map(rec => {
                  const isScheduled = rec.status === 'scheduled';
                  const isGiven = rec.status === 'given';
                  const isDelayed = rec.status === 'delayed';
                  const isRefused = rec.status === 'refused';
                  const isHeld = rec.status === 'held';

                  const alertMatch = recordAlertMap.get(rec.id) || {
                    hasAllergyConflict: false,
                    hasDrugInteraction: false,
                    allergyAlerts: [],
                    interactionAlerts: [],
                    allAlerts: []
                  };

                  const hasConflict = alertMatch.hasAllergyConflict || alertMatch.hasDrugInteraction;

                  return (
                    <tr 
                      key={rec.id} 
                      className={`transition-colors ${
                        alertMatch.hasAllergyConflict
                          ? 'bg-rose-50/60 border-s-4 border-s-rose-600 hover:bg-rose-100/60'
                          : alertMatch.hasDrugInteraction
                          ? 'bg-amber-50/60 border-s-4 border-s-amber-500 hover:bg-amber-100/60'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* 1. Scheduled Time */}
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 ${hasConflict ? 'text-rose-600' : 'text-teal-600'}`} />
                          <span>{rec.scheduledHour}</span>
                        </div>
                      </td>

                      {/* 2. Medication Name & Dose */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-start gap-1.5">
                          <div>
                            <span className="font-bold text-slate-900 block">{rec.medicationName}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{rec.dose}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Clinical Safety & Interaction Highlights */}
                      <td className="py-3 px-3.5">
                        {hasConflict ? (
                          <div className="space-y-1.5">
                            {/* Allergy Conflict Badge */}
                            {alertMatch.hasAllergyConflict && (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                  <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>{isAr ? 'تعارض حساسية مريض صريح!' : 'Allergy Conflict!'}</span>
                                </span>
                              </div>
                            )}

                            {/* Drug-Drug Interaction Badge */}
                            {alertMatch.hasDrugInteraction && (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>{isAr ? 'تفاعل دوائي خطير (نزيف/هبوط)!' : 'Drug Interaction Hazard!'}</span>
                                </span>
                              </div>
                            )}

                            {/* Prominent Review Interaction Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenReviewModal(rec, alertMatch)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all shadow-2xs cursor-pointer ${
                                alertMatch.hasAllergyConflict
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                  : 'bg-amber-600 hover:bg-amber-700 text-white'
                              }`}
                              title={isAr ? 'انقر لمراجعة تفاصيل التعارض والأمان السريري' : 'Review clinical interaction details'}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>{isAr ? 'مراجعة التعارض' : 'Review Interaction'}</span>
                              <ChevronRight className="w-3 h-3 rtl:rotate-180" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{isAr ? 'آمن - لا يوجد تعارض' : 'Safe / Verified'}</span>
                          </span>
                        )}
                      </td>

                      {/* 4. Route */}
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold font-mono text-[10px]">
                          {rec.route}
                        </span>
                      </td>

                      {/* 5. Status */}
                      <td className="py-3 px-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold ${
                          isGiven ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          isDelayed ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          isRefused ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                          isHeld ? 'bg-slate-200 text-slate-800 font-bold border border-slate-300' :
                          'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {isGiven ? (isAr ? 'تم الإعطاء في الموعد' : 'Given On Time') :
                           isDelayed ? (isAr ? 'تم الإعطاء (متأخرة)' : 'Given Delayed') :
                           isRefused ? (isAr ? 'رفض المريض' : 'Patient Refused') :
                           isHeld ? (isAr ? '⏸ معلق بأمر طبي' : 'Held / Cancelled') :
                           (isAr ? 'مجدول بالانتظار' : 'Scheduled')}
                        </span>
                      </td>

                      {/* 6. Actual Given Time */}
                      <td className="py-3 px-3.5 font-mono text-slate-700">
                        {rec.actualGivenTime ? (
                          <div>
                            {rec.actualGivenTime.split('T')[1]?.substring(0, 5)}
                            <span className="text-[10px] text-slate-400 block">{rec.actualGivenTime.split('T')[0]}</span>
                          </div>
                        ) : '--'}
                      </td>

                      {/* 7. Administered By */}
                      <td className="py-3 px-3.5 text-slate-700">
                        {rec.administeredBy || '--'}
                      </td>

                      {/* 8. Notes / Delay */}
                      <td className="py-3 px-3.5 text-slate-600 max-w-[200px]">
                        {rec.delayReason && (
                          <div className="text-[11px] text-amber-800 font-medium truncate" title={rec.delayReason}>
                            ⚠️ {rec.delayReason}
                          </div>
                        )}
                        {rec.supervisorApproval && (
                          <div className="text-[10px] text-teal-800 font-semibold truncate" title={rec.supervisorApproval.note}>
                            ✓ {rec.supervisorApproval.approvedBy}
                          </div>
                        )}
                        {rec.notes && !rec.delayReason && (
                          <div className="truncate text-slate-500" title={rec.notes}>{rec.notes}</div>
                        )}
                      </td>

                      {/* 9. Action Buttons */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {isScheduled ? (
                            <button
                              onClick={() => handleOpenAdministerModal(rec)}
                              className={`px-3 py-1 font-semibold rounded text-xs transition-colors shadow-xs w-full cursor-pointer ${
                                hasConflict 
                                  ? 'bg-rose-700 hover:bg-rose-800 text-white' 
                                  : 'bg-teal-600 hover:bg-teal-700 text-white'
                              }`}
                            >
                              {isAr ? 'توثيق الإعطاء' : 'Administer'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenAdministerModal(rec)}
                              className="text-slate-500 hover:text-slate-800 text-[11px] underline cursor-pointer"
                            >
                              {isAr ? 'تعديل / تفاصيل' : 'Edit / View'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    )}

      {/* REVIEW INTERACTION & ALLERGY CLINICAL SAFETY MODAL */}
      {showInteractionModal && selectedReviewRecord && selectedReviewMatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between text-white ${
              selectedReviewMatch.hasAllergyConflict 
                ? 'bg-gradient-to-r from-rose-700 to-red-800 border-rose-900' 
                : 'bg-gradient-to-r from-amber-600 to-orange-700 border-amber-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                  {selectedReviewMatch.hasAllergyConflict ? (
                    <ShieldAlert className="w-6 h-6 text-rose-200" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-200" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base sm:text-lg">
                      {isAr ? 'مراجعة أمان الدواء والتعارض السريري' : 'Medication Safety & Interaction Review'}
                    </h3>
                    <span className="px-2 py-0.2 rounded-full text-xs font-bold bg-white/20 border border-white/30">
                      {selectedReviewMatch.hasAllergyConflict 
                        ? (isAr ? 'تعارض حساسية صريح' : 'Allergy Conflict') 
                        : (isAr ? 'تفاعل دوائي خطير' : 'Drug-Drug Clash')}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-0.5">
                    {selectedReviewRecord.medicationName} ({selectedReviewRecord.dose}) · {isAr ? 'موعد الجرعة:' : 'Scheduled:'} {selectedReviewRecord.scheduledHour}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInteractionModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Patient Allergies Banner */}
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{isAr ? 'سجل حساسية المريضة الموثق في الملف الدائم:' : 'Documented Patient Allergies:'}</span>
                </div>
                <div className="font-bold text-rose-900 font-mono text-sm ps-6">
                  {currentPatient.allergies.join(' · ') || (isAr ? 'لا توجد حساسية معروفة' : 'No known allergies')}
                </div>
              </div>

              {/* Matched SmartAlert Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{isAr ? 'التنبيهات السريرية المسجلة من خدمة SmartAlerts' : 'Active Alerts from SmartAlerts Engine'}</span>
                </h4>

                {selectedReviewMatch.allAlerts.map(alert => (
                  <div 
                    key={alert.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">
                        {isAr ? alert.titleAr : alert.titleEn}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        alert.severity === 'critical' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed font-medium">
                      {isAr ? alert.messageAr : alert.messageEn}
                    </p>

                    {/* Metric / Clash Value */}
                    {alert.metricValue && (
                      <div className="inline-block px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">
                        <strong>{isAr ? 'المعيار المتعارض:' : 'Trigger:'}</strong> {alert.metricValue}
                      </div>
                    )}

                    {/* AI CDS Recommendation */}
                    {alert.aiRecommendation && (
                      <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-950 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-teal-900 mb-0.5">
                            {isAr ? 'توجيهات الذكاء الاصطناعي والدعم السريري (CDS Guidance):' : 'Clinical Decision Support Guidance:'}
                          </strong>
                          <span className="text-[11px] font-medium leading-relaxed">
                            {alert.aiRecommendation}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Acknowledged status */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      <span>
                        {alert.isAcknowledged 
                          ? (isAr ? `✓ تم الإقرار بواسطة: ${alert.acknowledgedBy}` : `Acknowledged by: ${alert.acknowledgedBy}`)
                          : (isAr ? '⚠️ بانتظار إقرار التمريض / الطبيب' : 'Pending acknowledgment')}
                      </span>

                      {!alert.isAcknowledged && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="text-teal-700 font-bold hover:underline cursor-pointer"
                        >
                          {isAr ? 'إقرار ومتابعة بحذر' : 'Acknowledge Alert'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hold Reason Input */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                <label className="block text-amber-950 font-bold text-xs">
                  {isAr ? 'ملاحظة تعليق الجرعة الدوائية (Nursing Hold Justification):' : 'Hold Justification Note:'}
                </label>
                <textarea
                  rows={2}
                  value={holdReasonNote}
                  onChange={e => setHoldReasonNote(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-lg p-2 text-slate-900 text-xs"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">
                {isAr ? 'حماية سلامة المريض وفق معايير JCI وأمان الأدوية' : 'JCI Medication Safety Protocol Enforced'}
              </span>

              <div className="flex items-center gap-2">
                {/* Hold Medication Button */}
                <button
                  type="button"
                  onClick={handleHoldFromInteraction}
                  disabled={isHoldingDose}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>{isHoldingDose ? (isAr ? 'جاري التعليق...' : 'Holding...') : (isAr ? 'تعليق الجرعة الدوائية (Hold)' : 'Hold Medication')}</span>
                </button>

                {/* Proceed to Administer with Caution */}
                <button
                  type="button"
                  onClick={() => {
                    setShowInteractionModal(false);
                    handleOpenAdministerModal(selectedReviewRecord);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {isAr ? 'المتابعة للتوثيق والإعطاء' : 'Proceed to Administer'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowInteractionModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Medication Administration (eMAR Dialog) */}
      {showAdministerModal && activeEmar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'توثيق إعطاء الجرعة الدوائية (eMAR)' : 'Medication Administration'}</span>
              </h3>
              <button onClick={() => setShowAdministerModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveAdministration} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">{activeEmar.medicationName}</div>
                <div className="text-slate-600 flex items-center gap-3">
                  <span>{isAr ? 'طريق الإعطاء:' : 'Route:'} <strong className="font-mono">{activeEmar.route}</strong></span>
                  <span>|</span>
                  <span>{isAr ? 'الموعد المجدول:' : 'Scheduled:'} <strong className="font-mono text-teal-700">{activeEmar.scheduledHour}</strong></span>
                </div>
              </div>

              {/* OUTSIDE WINDOW WARNING (Ch. 10 MANDATORY RULE) */}
              {isDelayedOutsideWindow && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{isAr ? 'تنبيه تنظيمي: الإعطاء خارج نافذة الساعة المعتمدة' : 'Regulatory Alert: Administration Outside 60-min Window'}</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {isAr 
                      ? 'بموجب سياسة المستشفى، لا يُسجل الإعطاء كروتيني في الموعد عند التقديم أو التأخير لأكثر من ساعة؛ يجب توثيق الوقت الحقيقي، وتحديد سبب المخالفة، واعتماد المشرف التمريضي (مع عدم منع إثبات الجرعة المنفذة).'
                      : 'Hospital policy requires documenting the actual time, logging the delay justification, and recording charge nurse validation without blocking documentation.'}
                  </p>
                </div>
              )}

              {/* Status selection */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'حالة الإعطاء الفعلي *' : 'Administration Status *'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminStatus('given')}
                    className={`py-2 px-3 rounded font-semibold text-center border transition-colors ${
                      adminStatus === 'given' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {isAr ? '✓ تم الإعطاء' : '✓ Given'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminStatus('delayed')}
                    className={`py-2 px-3 rounded font-semibold text-center border transition-colors ${
                      adminStatus === 'delayed' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {isAr ? '⏱ تأخرت الجرعة' : '⏱ Delayed'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminStatus('refused')}
                    className={`py-2 px-3 rounded font-semibold text-center border transition-colors ${
                      adminStatus === 'refused' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {isAr ? '✕ رفض المريض' : '✕ Refused'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminStatus('held')}
                    className={`py-2 px-3 rounded font-semibold text-center border transition-colors ${
                      adminStatus === 'held' ? 'bg-slate-800 text-white border-slate-800 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {isAr ? '⏸ معلقة بأمر طبي' : '⏸ Held / Withheld'}
                  </button>
                </div>
              </div>

              {/* Delay reason if outside window or marked delayed */}
              {(isDelayedOutsideWindow || adminStatus === 'delayed') && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-amber-900 font-bold mb-1">
                      {isAr ? 'سبب التأخير عن الموعد المحدد (مطلوب) *' : 'Delay Justification *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={delayReason}
                      onChange={(e) => setDelayReason(e.target.value)}
                      className="w-full bg-amber-50/50 border border-amber-300 rounded px-2.5 py-1.5 text-slate-900"
                      placeholder={isAr ? 'المريض كان نائماً ومستوى الألم منخفض، وجود إجراء بالأشعة...' : 'Reason for delay'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {isAr ? 'مشرف التمريض المعتمد *' : 'Supervisor / Charge Nurse *'}
                      </label>
                      <input
                        type="text"
                        value={supervisorName}
                        onChange={(e) => setSupervisorName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {isAr ? 'ملاحظة تصديق المشرف' : 'Supervisor Note'}
                      </label>
                      <input
                        type="text"
                        value={supervisorNote}
                        onChange={(e) => setSupervisorNote(e.target.value)}
                        placeholder={isAr ? 'تم التحقق واعتماد المبرر السريري' : 'Validated'}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* General Nursing Notes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isAr ? 'ملاحظات التمريض ومراقبة المريض بعد الإعطاء' : 'Clinical Nursing Notes'}
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900"
                  placeholder={isAr ? 'تحمل المريض للجرعة، عدم وجود حساسية أو تفاعلات...' : 'Tolerated well, no adverse reactions'}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAdministerModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (isAr ? 'جاري التوثيق...' : 'Saving...') : (isAr ? 'تأكيد توثيق الإعطاء' : 'Confirm Administration')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
