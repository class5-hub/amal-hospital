import React, { useState, useMemo } from 'react';
import { 
  EMARRecord, 
  MedicationOrder, 
  Patient, 
  Admission, 
  Language, 
  SystemUser,
  SmartAlert
} from '../types/hmis.ts';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PauseCircle,
  Pill,
  ShieldAlert,
  Calendar,
  Filter,
  Check,
  ChevronDown,
  ArrowUpDown,
  UserCheck,
  ExternalLink,
  Sparkles,
  Info,
  Flame,
  Activity,
  Layers
} from 'lucide-react';

interface MedicationTimelineProps {
  emarRecords: EMARRecord[];
  medications: MedicationOrder[];
  currentPatient: Patient;
  currentAdmission: Admission;
  language: Language;
  currentUser: SystemUser;
  onAdministerDose: (record: EMARRecord) => void;
  onReviewInteraction?: (record: EMARRecord, match: any) => void;
  recordAlertMap?: Map<string, any>;
}

export const MedicationTimeline: React.FC<MedicationTimelineProps> = ({
  emarRecords,
  medications,
  currentPatient,
  currentAdmission,
  language,
  currentUser,
  onAdministerDose,
  onReviewInteraction,
  recordAlertMap
}) => {
  const isAr = language === 'ar';

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'delayed' | 'given' | 'scheduled' | 'held_refused'>('all');
  const [selectedMedFilter, setSelectedMedFilter] = useState<string>('all');
  const [groupByDay, setGroupByDay] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // default to newest first or chronological

  // Helper to determine if an eMAR record is overdue (scheduled in past by > 60 mins and not yet administered)
  const getRecordDelayAndOverdueStatus = (rec: EMARRecord) => {
    const scheduledDate = new Date(rec.scheduledTime);
    const now = new Date(); // reference current time

    let isOverdue = false;
    let delayMinutes = 0;
    let isEarly = false;

    if (rec.status === 'scheduled') {
      // If scheduled time is in the past by > 60 minutes, it's overdue / missed!
      const elapsedMinutes = (now.getTime() - scheduledDate.getTime()) / (1000 * 60);
      if (elapsedMinutes > 60) {
        isOverdue = true;
        delayMinutes = Math.round(elapsedMinutes);
      }
    } else if (rec.actualGivenTime) {
      const actualDate = new Date(rec.actualGivenTime);
      const diffMin = (actualDate.getTime() - scheduledDate.getTime()) / (1000 * 60);
      delayMinutes = Math.round(diffMin);
      if (diffMin < -30) {
        isEarly = true;
      }
    }

    return {
      isOverdue,
      delayMinutes,
      isEarly,
      isStrictDelay: rec.status === 'delayed' || delayMinutes > 60
    };
  };

  // Processed and enriched records
  const enrichedRecords = useMemo(() => {
    return emarRecords.map(rec => {
      const timing = getRecordDelayAndOverdueStatus(rec);
      const order = medications.find(m => m.id === rec.orderId);
      const alerts = recordAlertMap?.get(rec.id);

      return {
        ...rec,
        timing,
        order,
        alerts
      };
    });
  }, [emarRecords, medications, recordAlertMap]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let total = enrichedRecords.length;
    let givenOnTime = 0;
    let delayed = 0;
    let overdue = 0;
    let scheduledUpcoming = 0;
    let heldOrRefused = 0;
    let totalDelayMinutes = 0;

    enrichedRecords.forEach(r => {
      if (r.timing.isOverdue) {
        overdue++;
      } else if (r.status === 'scheduled') {
        scheduledUpcoming++;
      } else if (r.status === 'given') {
        if (r.timing.isStrictDelay) {
          delayed++;
          totalDelayMinutes += Math.max(0, r.timing.delayMinutes);
        } else {
          givenOnTime++;
        }
      } else if (r.status === 'delayed') {
        delayed++;
        totalDelayMinutes += Math.max(0, r.timing.delayMinutes);
      } else if (r.status === 'held' || r.status === 'refused') {
        heldOrRefused++;
      }
    });

    const administeredTotal = givenOnTime + delayed;
    const onTimeCompliance = administeredTotal > 0 ? Math.round((givenOnTime / administeredTotal) * 100) : 100;
    const avgDelayMin = delayed > 0 ? Math.round(totalDelayMinutes / delayed) : 0;

    return {
      total,
      givenOnTime,
      delayed,
      overdue,
      scheduledUpcoming,
      heldOrRefused,
      onTimeCompliance,
      avgDelayMin
    };
  }, [enrichedRecords]);

  // Filter and sort records
  const filteredAndSortedRecords = useMemo(() => {
    let list = enrichedRecords.filter(r => {
      // Medication filter
      if (selectedMedFilter !== 'all' && r.orderId !== selectedMedFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'overdue') {
        return r.timing.isOverdue;
      }
      if (statusFilter === 'delayed') {
        return r.status === 'delayed' || (r.status === 'given' && r.timing.isStrictDelay);
      }
      if (statusFilter === 'given') {
        return r.status === 'given' && !r.timing.isStrictDelay;
      }
      if (statusFilter === 'scheduled') {
        return r.status === 'scheduled' && !r.timing.isOverdue;
      }
      if (statusFilter === 'held_refused') {
        return r.status === 'held' || r.status === 'refused';
      }

      return true;
    });

    // Sort
    list.sort((a, b) => {
      const timeA = new Date(a.scheduledTime).getTime();
      const timeB = new Date(b.scheduledTime).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [enrichedRecords, statusFilter, selectedMedFilter, sortOrder]);

  // Group by Day helper
  const groupedByDate = useMemo(() => {
    if (!groupByDay) return null;

    const groups: { [dateKey: string]: typeof filteredAndSortedRecords } = {};
    filteredAndSortedRecords.forEach(r => {
      const dateKey = r.scheduledTime.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(r);
    });

    return groups;
  }, [filteredAndSortedRecords, groupByDay]);

  // Calculate admission stay day number from admission date
  const getStayDayLabel = (dateStr: string) => {
    if (!currentAdmission?.admissionDate) return dateStr;
    const admDate = new Date(currentAdmission.admissionDate.split('T')[0]);
    const targetDate = new Date(dateStr);
    const diffTime = targetDate.getTime() - admDate.getTime();
    const dayDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (dayDiff === 1) {
      return isAr ? `اليوم الأول من الإيواء (${dateStr})` : `Day 1 of Stay (${dateStr})`;
    } else if (dayDiff === 2) {
      return isAr ? `اليوم الثاني من الإيواء (${dateStr})` : `Day 2 of Stay (${dateStr})`;
    } else if (dayDiff === 3) {
      return isAr ? `اليوم الثالث من الإيواء (${dateStr})` : `Day 3 of Stay (${dateStr})`;
    } else if (dayDiff > 3) {
      return isAr ? `اليوم ${dayDiff} من الإيواء (${dateStr})` : `Day ${dayDiff} of Stay (${dateStr})`;
    } else {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header & KPI Cards Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                {isAr ? 'المسار الزمني لمواعيد وإعطاء الأدوية (Medication Timeline)' : 'Medication Administration Timeline'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isAr 
                ? 'مخطط تسلسلي زمني دقيق للجرعات المعطاة مقابل المجدولة لكامل فترة الإيواء مع تمييز فوري للتأخير والجرعات الفائتة'
                : 'Vertical chronological timeline tracking administered vs scheduled doses with instant delay & missed dose detection'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium font-mono">
              {isAr ? 'المريضة:' : 'Patient:'} <strong className="text-slate-800">{currentPatient.fullName}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-mono">
              {isAr ? 'رقم الإيواء:' : 'ADM:'} <strong className="text-teal-700">{currentAdmission.admissionId}</strong>
            </span>
          </div>
        </div>

        {/* Clinical KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 text-xs">
          {/* 1. Total Stay Doses */}
          <div 
            onClick={() => setStatusFilter('all')}
            className={`cursor-pointer rounded-lg p-3 border transition-all ${
              statusFilter === 'all' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] opacity-80">{isAr ? 'إجمالي الجرعات' : 'Total Doses'}</span>
              <Layers className="w-3.5 h-3.5 opacity-70" />
            </div>
            <div className="text-xl font-bold font-mono mt-1">{metrics.total}</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              {isAr ? 'لكامل فترة الإيواء' : 'Full Inpatient Stay'}
            </div>
          </div>

          {/* 2. Administered On-Time */}
          <div 
            onClick={() => setStatusFilter('given')}
            className={`cursor-pointer rounded-lg p-3 border transition-all ${
              statusFilter === 'given' 
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' 
                : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] opacity-80">{isAr ? 'في الوقت المحدد' : 'Given On-Time'}</span>
              <CheckCircle2 className="w-3.5 h-3.5 opacity-70" />
            </div>
            <div className="text-xl font-bold font-mono mt-1">{metrics.givenOnTime}</div>
            <div className="text-[10px] opacity-75 mt-0.5 font-bold">
              {metrics.onTimeCompliance}% {isAr ? 'التزام بالموعد' : 'Adherence'}
            </div>
          </div>

          {/* 3. Delayed Administrations */}
          <div 
            onClick={() => setStatusFilter('delayed')}
            className={`cursor-pointer rounded-lg p-3 border transition-all ${
              statusFilter === 'delayed' 
                ? 'bg-amber-600 text-white border-amber-700 shadow-xs' 
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] opacity-80">{isAr ? 'تأخير موثق' : 'Delayed Doses'}</span>
              <Clock className="w-3.5 h-3.5 opacity-70" />
            </div>
            <div className="text-xl font-bold font-mono mt-1">{metrics.delayed}</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              {metrics.delayed > 0 ? (isAr ? `متوسط ${metrics.avgDelayMin} دقيقة` : `Avg +${metrics.avgDelayMin}m`) : (isAr ? 'لا يوجد تأخير حرج' : 'Zero delays')}
            </div>
          </div>

          {/* 4. Overdue / Missed Doses (CRITICAL ALERT) */}
          <div 
            onClick={() => setStatusFilter('overdue')}
            className={`cursor-pointer rounded-lg p-3 border transition-all ${
              statusFilter === 'overdue' 
                ? 'bg-rose-700 text-white border-rose-800 shadow-xs ring-2 ring-rose-400' 
                : metrics.overdue > 0 
                  ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100 animate-pulse' 
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold">{isAr ? 'فائتة / متجاوزة للوقت' : 'Overdue / Missed'}</span>
              <AlertTriangle className={`w-3.5 h-3.5 ${metrics.overdue > 0 ? 'text-rose-600' : 'opacity-60'}`} />
            </div>
            <div className="text-xl font-black font-mono mt-1 text-rose-700">{metrics.overdue}</div>
            <div className="text-[10px] font-semibold mt-0.5 text-rose-800">
              {metrics.overdue > 0 ? (isAr ? '⚠️ تستوجب الإعطاء الفوري' : 'Requires Action Now') : (isAr ? 'كل الجرعات منتظمة' : 'Zero missed')}
            </div>
          </div>

          {/* 5. Scheduled Upcoming */}
          <div 
            onClick={() => setStatusFilter('scheduled')}
            className={`cursor-pointer rounded-lg p-3 border transition-all ${
              statusFilter === 'scheduled' 
                ? 'bg-sky-600 text-white border-sky-700 shadow-xs' 
                : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] opacity-80">{isAr ? 'مجدولة قادمة' : 'Upcoming Scheduled'}</span>
              <Pill className="w-3.5 h-3.5 opacity-70" />
            </div>
            <div className="text-xl font-bold font-mono mt-1">{metrics.scheduledUpcoming}</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              {isAr ? 'خلال الساعات القادمة' : 'Due during stay'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Timeline Controls & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Quick Pills */}
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'all' 
                ? 'bg-teal-700 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isAr ? 'كافة الجرعات' : 'All Doses'} ({metrics.total})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('overdue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'overdue' 
                ? 'bg-rose-700 text-white shadow-2xs' 
                : metrics.overdue > 0 
                  ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 font-black' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>{isAr ? 'الجرعات الفائتة / المتأخرة' : 'Overdue / Missed'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono">
              {metrics.overdue}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('delayed')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'delayed' 
                ? 'bg-amber-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>{isAr ? 'تأخير موثق' : 'Delayed'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-mono">
              {metrics.delayed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('given')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'given' 
                ? 'bg-emerald-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isAr ? 'في الموعد' : 'On-Time'} ({metrics.givenOnTime})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('scheduled')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'scheduled' 
                ? 'bg-sky-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isAr ? 'مجدولة قادمة' : 'Scheduled'} ({metrics.scheduledUpcoming})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Specific Medication Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
            <Pill className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedMedFilter}
              onChange={(e) => setSelectedMedFilter(e.target.value)}
              className="bg-transparent text-slate-900 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="all">{isAr ? 'كافة الأدوية الموصوفة' : 'All Prescribed Medications'}</option>
              {medications.map(m => (
                <option key={m.id} value={m.id}>
                  {m.tradeName} ({m.genericName})
                </option>
              ))}
            </select>
          </div>

          {/* Grouping by Day Toggle */}
          <button
            type="button"
            onClick={() => setGroupByDay(!groupByDay)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
              groupByDay 
                ? 'bg-teal-50 border-teal-300 text-teal-800' 
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isAr ? 'تجميع حسب أيام الإيواء' : 'Group by Stay Day'}</span>
          </button>

          {/* Sort order */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
            title={sortOrder === 'desc' ? (isAr ? 'الأحدث أولاً' : 'Newest First') : (isAr ? 'الأقدم أولاً' : 'Oldest First')}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>{sortOrder === 'desc' ? (isAr ? 'الأحدث أولاً' : 'Newest First') : (isAr ? 'الأقدم أولاً' : 'Oldest First')}</span>
          </button>
        </div>
      </div>

      {/* 3. The Vertical Timeline Canvas */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {filteredAndSortedRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-300" />
            <div className="text-sm font-semibold text-slate-600">
              {isAr ? 'لا توجد جرعات علاجية مطابقة للفلتر المحدد' : 'No medication timeline records match this filter.'}
            </div>
            <p className="text-xs text-slate-400">
              {isAr ? 'جرب اختيار «كافة الجرعات» لعرض الجدول الزمني الكامل.' : 'Try selecting "All Doses" to view full stay timeline.'}
            </p>
          </div>
        ) : groupByDay && groupedByDate ? (
          // Grouped by Stay Day View
          <div className="space-y-8">
            {Object.keys(groupedByDate).map(dateKey => {
              const dayRecords = groupedByDate[dateKey];
              const stayDayTitle = getStayDayLabel(dateKey);

              return (
                <div key={dateKey} className="space-y-4">
                  {/* Day Header Ribbon */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-teal-400" />
                      <span>{stayDayTitle}</span>
                    </div>
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-[11px] font-mono text-slate-400 font-semibold">
                      {dayRecords.length} {isAr ? 'جرعات' : 'doses'}
                    </span>
                  </div>

                  {/* Vertical Spine for this day */}
                  <div className="relative ps-6 sm:ps-8 ms-3 sm:ms-4 border-s-2 border-slate-200 space-y-5">
                    {dayRecords.map((rec) => (
                      <TimelineDoseCard
                        key={rec.id}
                        rec={rec}
                        isAr={isAr}
                        currentUser={currentUser}
                        onAdministerDose={onAdministerDose}
                        onReviewInteraction={onReviewInteraction}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Continuous Linear Timeline View
          <div className="relative ps-6 sm:ps-8 ms-3 sm:ms-4 border-s-2 border-slate-200 space-y-6">
            {filteredAndSortedRecords.map((rec) => (
              <TimelineDoseCard
                key={rec.id}
                rec={rec}
                isAr={isAr}
                currentUser={currentUser}
                onAdministerDose={onAdministerDose}
                onReviewInteraction={onReviewInteraction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Subcomponent: Timeline Dose Card with Node Indicator ---
interface TimelineDoseCardProps {
  rec: any;
  isAr: boolean;
  currentUser: SystemUser;
  onAdministerDose: (record: EMARRecord) => void;
  onReviewInteraction?: (record: EMARRecord, match: any) => void;
}

const TimelineDoseCard: React.FC<TimelineDoseCardProps> = ({
  rec,
  isAr,
  onAdministerDose,
  onReviewInteraction
}) => {
  const isGiven = rec.status === 'given';
  const isDelayed = rec.status === 'delayed' || (isGiven && rec.timing?.isStrictDelay);
  const isOverdue = rec.timing?.isOverdue;
  const isScheduled = rec.status === 'scheduled' && !isOverdue;
  const isHeld = rec.status === 'held';
  const isRefused = rec.status === 'refused';

  const alertMatch = rec.alerts || {
    hasAllergyConflict: false,
    hasDrugInteraction: false,
    allAlerts: []
  };

  const hasConflict = alertMatch.hasAllergyConflict || alertMatch.hasDrugInteraction;

  // Node Icon and Style based on status
  let nodeColor = 'bg-slate-400 text-white border-slate-200';
  let NodeIcon = Clock;

  if (isOverdue) {
    nodeColor = 'bg-rose-600 text-white ring-4 ring-rose-100 shadow-xs animate-bounce';
    NodeIcon = AlertTriangle;
  } else if (isDelayed) {
    nodeColor = 'bg-amber-500 text-white ring-4 ring-amber-100 shadow-xs';
    NodeIcon = Clock;
  } else if (isGiven) {
    nodeColor = 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs';
    NodeIcon = CheckCircle2;
  } else if (isScheduled) {
    nodeColor = 'bg-sky-500 text-white ring-4 ring-sky-100';
    NodeIcon = Clock;
  } else if (isHeld) {
    nodeColor = 'bg-slate-600 text-white ring-4 ring-slate-100';
    NodeIcon = PauseCircle;
  } else if (isRefused) {
    nodeColor = 'bg-rose-700 text-white ring-4 ring-rose-100';
    NodeIcon = XCircle;
  }

  return (
    <div className="relative group">
      {/* Node Anchor on Spine */}
      <div 
        className={`absolute rtl:-right-[37px] sm:rtl:-right-[45px] ltr:-left-[37px] sm:ltr:-left-[45px] top-3.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all ${nodeColor}`}
      >
        <NodeIcon className="w-3.5 h-3.5" />
      </div>

      {/* Card Body */}
      <div className={`rounded-xl border p-4 transition-all hover:shadow-md ${
        isOverdue 
          ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-400' 
          : isDelayed 
          ? 'bg-amber-50/70 border-amber-300' 
          : isGiven 
          ? 'bg-white border-slate-200 hover:border-emerald-300' 
          : isHeld 
          ? 'bg-slate-50 border-slate-300' 
          : 'bg-white border-slate-200 hover:border-sky-300'
      }`}>
        {/* Top Header of Card: Scheduled vs Actual & Timing Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Scheduled Time */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-slate-500 font-medium">{isAr ? 'الموعد المحدد:' : 'Scheduled:'}</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {rec.scheduledHour} · {rec.scheduledTime.split('T')[0]}
              </span>
            </div>

            {/* Actual Time if Given */}
            {rec.actualGivenTime && (
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-slate-400">➔</span>
                <span className="text-slate-500 font-medium">{isAr ? 'التنفيذ الفعلي:' : 'Administered:'}</span>
                <span className={`font-bold px-2 py-0.5 rounded border ${
                  isDelayed 
                    ? 'bg-amber-100 text-amber-900 border-amber-300' 
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}>
                  {rec.actualGivenTime.split('T')[1]?.substring(0, 5)}
                </span>
              </div>
            )}
          </div>

          {/* Variance & Status Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Overdue Alert Badge */}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse shadow-2xs">
                <AlertTriangle className="w-3 h-3" />
                <span>
                  {isAr 
                    ? `جرعة فائتة متأخرة (+${rec.timing?.delayMinutes} دقيقة)` 
                    : `MISSED / OVERDUE (+${rec.timing?.delayMinutes}m)`}
                </span>
              </span>
            )}

            {/* Delayed Administration Badge */}
            {isDelayed && !isOverdue && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-2xs">
                <Clock className="w-3 h-3" />
                <span>
                  {isAr 
                    ? `تأخير موثق (+${Math.abs(rec.timing?.delayMinutes)} دقيقة)` 
                    : `Delayed (+${Math.abs(rec.timing?.delayMinutes)} min)`}
                </span>
              </span>
            )}

            {/* On Time Badge */}
            {isGiven && !isDelayed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>{isAr ? 'في الوقت المحدد' : 'On-Time'}</span>
              </span>
            )}

            {/* Scheduled Upcoming Badge */}
            {isScheduled && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
                <Clock className="w-3 h-3 text-sky-600" />
                <span>{isAr ? 'قيد الانتظار' : 'Upcoming'}</span>
              </span>
            )}

            {/* Held Badge */}
            {isHeld && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
                <PauseCircle className="w-3 h-3 text-slate-600" />
                <span>{isAr ? 'معلق بأمر طبي' : 'Held / Cancelled'}</span>
              </span>
            )}

            {/* Refused Badge */}
            {isRefused && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                <XCircle className="w-3 h-3 text-rose-600" />
                <span>{isAr ? 'رفض المريض' : 'Patient Refused'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Medication Details Core */}
        <div className="py-3 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {rec.medicationName}
              </span>
              {rec.order?.tradeName && rec.order.tradeName !== rec.medicationName && (
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                  {rec.order.tradeName}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">
                {isAr ? 'الجرعة:' : 'Dose:'} <strong className="text-slate-900 font-mono">{rec.dose}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-700">
                {isAr ? 'الطريق:' : 'Route:'} <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-bold">{rec.route}</span>
              </span>
              {rec.order?.frequency && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-mono">
                    {isAr ? 'التكرار:' : 'Freq:'} {rec.order.frequency}
                  </span>
                </>
              )}
            </div>

            {rec.order?.instructions && (
              <div className="text-[11px] text-slate-500 italic mt-0.5">
                {isAr ? 'تعليمات الإعطاء:' : 'Instructions:'} {rec.order.instructions}
              </div>
            )}
          </div>

          {/* Action Trigger for Scheduled / Overdue Doses */}
          {(isScheduled || isOverdue) && (
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAdministerDose(rec)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isOverdue
                    ? 'bg-rose-700 hover:bg-rose-800 text-white animate-pulse'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isAr ? 'تسجيل الإعطاء الآن' : 'Administer Dose Now'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Safety Alert Warning Banner if present */}
        {hasConflict && (
          <div className="mt-1 mb-2.5 p-2.5 rounded-lg border bg-rose-50 border-rose-200 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-900">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <strong className="font-bold">
                  {alertMatch.hasAllergyConflict ? (isAr ? 'تعارض حساسية صريح للمريضة!' : 'Patient Allergy Conflict!') : (isAr ? 'تنبيه تفاعل دوائي حرج!' : 'Critical Drug-Drug Interaction!')}
                </strong>
                <span className="text-[11px] text-rose-800 block">
                  {alertMatch.allAlerts[0]?.messageAr || alertMatch.allAlerts[0]?.messageEn || (isAr ? 'يرجى المراجعة السريرية قبل الإعطاء' : 'Review interaction')}
                </span>
              </div>
            </div>

            {onReviewInteraction && (
              <button
                type="button"
                onClick={() => onReviewInteraction(rec, alertMatch)}
                className="px-2.5 py-1 text-[11px] font-bold rounded bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              >
                {isAr ? 'مراجعة التعارض' : 'Review Alert'}
              </button>
            )}
          </div>
        )}

        {/* Administration Log & Clinical Audit Footnote */}
        {(rec.administeredBy || rec.delayReason || rec.supervisorApproval || rec.notes) && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 bg-slate-50/60 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
            <div className="flex flex-wrap items-center gap-3">
              {/* Administered Nurse */}
              {rec.administeredBy && (
                <div className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="text-slate-500">{isAr ? 'الممرض المنفذ:' : 'Nurse:'}</span>
                  <strong className="text-slate-900">{rec.administeredBy}</strong>
                </div>
              )}

              {/* Documented Delay Reason */}
              {rec.delayReason && (
                <div className="flex items-center gap-1 text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="font-bold">{isAr ? 'سبب التأخير:' : 'Delay Reason:'}</span>
                  <span className="font-medium">{rec.delayReason}</span>
                </div>
              )}

              {/* Notes */}
              {rec.notes && !rec.delayReason && (
                <div className="text-slate-500 truncate max-w-sm" title={rec.notes}>
                  {rec.notes}
                </div>
              )}
            </div>

            {/* Supervisor Sign-Off Stamp */}
            {rec.supervisorApproval && (
              <div className="flex items-center gap-1.5 text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>
                  {isAr ? 'اعتماد المشرف:' : 'Approved by:'} <strong className="font-bold">{rec.supervisorApproval.approvedBy}</strong>
                </span>
                {rec.supervisorApproval.note && (
                  <span className="text-[10px] text-teal-700 hidden sm:inline">({rec.supervisorApproval.note})</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
