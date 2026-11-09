import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Bell, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  User, 
  BedDouble, 
  Calendar, 
  FlaskConical, 
  Pill, 
  Clock, 
  FileSignature, 
  Boxes, 
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  Search,
  Activity,
  HeartPulse,
  Info,
  Loader2,
  Stethoscope
} from 'lucide-react';
import { Patient, Admission, SystemUser, Language, SmartAlert, AlertSeverity, AlertCategory } from '../types/hmis.ts';
import { api } from '../api/client.ts';
import { ActiveTabType } from './SidebarNavigation.tsx';

interface SmartAlertsModuleProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  currentUser: SystemUser;
  language: Language;
  onNavigateToTab: (tab: ActiveTabType) => void;
  onRefreshAll?: () => void;
}

export const SmartAlertsModule: React.FC<SmartAlertsModuleProps> = ({
  currentPatient,
  currentAdmission,
  currentUser,
  language,
  onNavigateToTab,
  onRefreshAll
}) => {
  const isAr = language === 'ar';

  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'current_patient'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unacknowledged' | 'acknowledged'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Acknowledging Alert
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [ackNote, setAckNote] = useState('');
  const [selectedAlertForAck, setSelectedAlertForAck] = useState<SmartAlert | null>(null);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const admId = scopeFilter === 'current_patient' && currentAdmission ? currentAdmission.admissionId : undefined;
      const data = await api.getSmartAlerts(admId);
      setAlerts(data);

      // Play audio chime if critical unacknowledged alerts found and sound enabled
      if (soundEnabled) {
        const hasUnackedCritical = data.some(a => a.severity === 'critical' && !a.isAcknowledged);
        if (hasUnackedCritical) {
          playAlertChime();
        }
      }
    } catch (err) {
      console.error('Error fetching smart alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [scopeFilter, currentAdmission]);

  // Audio Chime using Web Audio API
  const playAlertChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  };

  // AI Deep Clinical Risk Scan via Gemini 3.8 Flash
  const handleAiDeepScan = async () => {
    if (!currentPatient || !currentAdmission) {
      alert(isAr ? 'يرجى تحديد مريضة نشطة في قسم الإيواء أولاً لتشغيل الفحص السريري المعمق.' : 'Please select an active inpatient first.');
      return;
    }

    setIsAiScanning(true);
    try {
      const clinicalContext = {
        patientName: currentPatient.fullName,
        mrn: currentPatient.mrn,
        department: currentAdmission.department,
        packageName: currentAdmission.packageName,
        roomNumber: currentAdmission.roomNumber,
        admissionDate: currentAdmission.admissionDate,
        knownAllergies: currentPatient.allergies?.join(', ') || 'NKDA (لا توجد حساسية دوائية مسجلة)',
        bloodGroup: currentPatient.bloodGroup
      };

      const res = await api.scanAiSmartAlerts({
        admissionId: currentAdmission.admissionId,
        mrn: currentPatient.mrn,
        patientName: currentPatient.fullName,
        clinicalContext
      });

      if (res.alerts && res.alerts.length > 0) {
        await loadAlerts();
        onRefreshAll?.();
        alert(isAr 
          ? `✓ تم الفحص السريري بالذكاء الاصطناعي (Gemini 3.8 Flash): تم استخراج ${res.count} تنبيهات وتوصيات سريرية ذكية.` 
          : `AI Scan Complete: ${res.count} clinical risk insights detected.`);
      }
    } catch (err: any) {
      alert(err.message || 'AI Scan failed');
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleOpenAckModal = (alertItem: SmartAlert) => {
    setSelectedAlertForAck(alertItem);
    setAckNote('');
  };

  const handleConfirmAcknowledge = async () => {
    if (!selectedAlertForAck) return;
    setAcknowledgingId(selectedAlertForAck.id);
    try {
      await api.acknowledgeSmartAlert(selectedAlertForAck.id, currentUser, ackNote);
      setSelectedAlertForAck(null);
      setAckNote('');
      await loadAlerts();
      onRefreshAll?.();
    } catch (err: any) {
      alert(err.message || 'Error acknowledging alert');
    } finally {
      setAcknowledgingId(null);
    }
  };

  // Filtered Alerts calculation
  const filteredAlerts = alerts.filter(a => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (statusFilter === 'unacknowledged' && a.isAcknowledged) return false;
    if (statusFilter === 'acknowledged' && !a.isAcknowledged) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.titleAr.toLowerCase().includes(q) || a.titleEn.toLowerCase().includes(q);
      const matchMsg = a.messageAr.toLowerCase().includes(q) || a.messageEn.toLowerCase().includes(q);
      const matchPat = a.patientName?.toLowerCase().includes(q) || a.patientMrn?.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg && !matchPat) return false;
    }
    return true;
  });

  // KPI counts
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.isAcknowledged).length;
  const warningCount = alerts.filter(a => a.severity === 'warning' && !a.isAcknowledged).length;
  const aiInsightCount = alerts.filter(a => a.severity === 'ai_insight').length;
  const acknowledgedCount = alerts.filter(a => a.isAcknowledged).length;

  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'critical':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-800',
          indicator: 'bg-rose-500 animate-pulse',
          icon: ShieldAlert,
          labelAr: 'حرج للغاية (طوارئ)',
          labelEn: 'Critical Panic'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          indicator: 'bg-amber-500',
          icon: AlertTriangle,
          labelAr: 'تحذير سريري / تنظيمي',
          labelEn: 'Clinical Warning'
        };
      case 'ai_insight':
        return {
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
          indicator: 'bg-indigo-500',
          icon: Sparkles,
          labelAr: 'توصية ذكاء اصطناعي (AI)',
          labelEn: 'AI Clinical Insight'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-800',
          indicator: 'bg-blue-500',
          icon: Info,
          labelAr: 'إشعار سريري',
          labelEn: 'Clinical Notice'
        };
    }
  };

  const getCategoryIcon = (cat: AlertCategory) => {
    switch (cat) {
      case 'clinical_meows':
        return HeartPulse;
      case 'lab_lis':
        return FlaskConical;
      case 'medication_allergy':
        return Pill;
      case 'emar_delay':
        return Clock;
      case 'consent_surgery':
        return FileSignature;
      case 'inventory_stock':
        return Boxes;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {isAr ? 'مركز التنبيهات والإنذار السريري الذكي (Smart Clinical Alerts & CDS)' : 'Smart Clinical Alerts & Decision Support System'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                MEOWS · AI RULES ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr 
                ? 'رصد فوري لمؤشرات الإنذار المبكر للأمهات (MEOWS)، نتائج المختبر الحرجة، تعارضات الأدوية، الإقرارات، ونقص المخزون' 
                : 'Real-time maternal early warning score (MEOWS), panic lab flags, drug-allergy clashes, and inventory thresholds'}
            </p>
          </div>
        </div>

        {/* Action Controls: Sound Chime, AI Scan & Refresh */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playAlertChime();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              soundEnabled 
                ? 'bg-teal-50 border-teal-300 text-teal-800' 
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title={isAr ? 'تفعيل أو كتم النغمة الصوتية للتنبيهات الحرجة' : 'Toggle alert chime sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-600" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {soundEnabled ? (isAr ? 'الصوت مفعل' : 'Sound ON') : (isAr ? 'كتم الصوت' : 'Muted')}
            </span>
          </button>

          <button
            type="button"
            onClick={handleAiDeepScan}
            disabled={isAiScanning || !currentPatient}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-50"
            title={isAr ? 'فحص سريري استباقي عبر الذكاء الاصطناعي (Gemini 3.8 Flash)' : 'Proactive AI Clinical Deep Scan'}
          >
            {isAiScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {isAiScanning 
                ? (isAr ? 'جاري الفحص بالذكاء الاصطناعي...' : 'AI Scanning...') 
                : (isAr ? 'فحص استباقي ذكي (AI)' : 'AI Clinical Scan')}
            </span>
          </button>

          <button
            type="button"
            onClick={loadAlerts}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 border border-slate-200"
            title={isAr ? 'تحديث التنبيهات' : 'Refresh Alerts'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Critical Panic */}
        <div 
          onClick={() => { setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical'); setStatusFilter('unacknowledged'); }}
          className={`cursor-pointer border rounded-xl p-4 transition-all shadow-2xs ${
            severityFilter === 'critical' 
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400' 
              : 'bg-white border-slate-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span className="flex items-center gap-1 text-rose-700 font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>{isAr ? 'إنذارات حرجة مهددة' : 'Critical Panic'}</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700 tabular-nums">
            {criticalCount}
          </div>
          <span className="text-[10px] text-rose-600 font-medium">
            {isAr ? 'تتطلب تدخلاً سريرياً وإقراراً فورياً' : 'Immediate intervention required'}
          </span>
        </div>

        {/* Card 2: Warnings */}
        <div 
          onClick={() => { setSeverityFilter(severityFilter === 'warning' ? 'all' : 'warning'); }}
          className={`cursor-pointer border rounded-xl p-4 transition-all shadow-2xs ${
            severityFilter === 'warning' 
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' 
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span className="flex items-center gap-1 text-amber-800 font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>{isAr ? 'تحذيرات سريرية' : 'Clinical Warnings'}</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
            {warningCount}
          </div>
          <span className="text-[10px] text-amber-700 font-medium">
            {isAr ? 'تأخر eMAR، نقص مخزون، إشغال' : 'eMAR delays, low stock, ward occupancy'}
          </span>
        </div>

        {/* Card 3: AI Insights */}
        <div 
          onClick={() => { setSeverityFilter(severityFilter === 'ai_insight' ? 'all' : 'ai_insight'); }}
          className={`cursor-pointer border rounded-xl p-4 transition-all shadow-2xs ${
            severityFilter === 'ai_insight' 
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400' 
              : 'bg-white border-slate-200 hover:border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span className="flex items-center gap-1 text-indigo-800 font-bold">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>{isAr ? 'توصيات الذكاء الاصطناعي' : 'AI Clinical Insights'}</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-700 tabular-nums">
            {aiInsightCount}
          </div>
          <span className="text-[10px] text-indigo-600 font-medium">
            {isAr ? 'تحليل MEOWS وخطر النزف والخثار' : 'MEOWS score & VTE risk factors'}
          </span>
        </div>

        {/* Card 4: Acknowledged */}
        <div 
          onClick={() => { setStatusFilter(statusFilter === 'acknowledged' ? 'all' : 'acknowledged'); }}
          className={`cursor-pointer border rounded-xl p-4 transition-all shadow-2xs ${
            statusFilter === 'acknowledged' 
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' 
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span className="flex items-center gap-1 text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{isAr ? 'تم الإقرار والمتابعة' : 'Acknowledged'}</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {acknowledgedCount}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">
            {isAr ? 'موثقة بأسماء الأطباء والتمريض' : 'Signed off by clinicians'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg font-semibold text-slate-700">
            <button
              onClick={() => setScopeFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                scopeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'كامل المستشفى' : 'Hospital-wide'}
            </button>
            <button
              onClick={() => setScopeFilter('current_patient')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                scopeFilter === 'current_patient' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'المريضة الحالية' : 'Active Patient'}
            </button>
          </div>

          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
          >
            <option value="all">{isAr ? 'كل درجات الخطورة' : 'All Severities'}</option>
            <option value="critical">{isAr ? '🔴 حرج للغاية فقط' : 'Critical Panic'}</option>
            <option value="warning">{isAr ? '🟡 تحذيرات سريرية' : 'Warnings'}</option>
            <option value="ai_insight">{isAr ? '✨ توصيات ذكاء اصطناعي' : 'AI Insights'}</option>
          </select>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
          >
            <option value="all">{isAr ? 'كل الفئات السريرية' : 'All Categories'}</option>
            <option value="clinical_meows">{isAr ? 'مؤشرات MEOWS والعلامات الحيوية' : 'MEOWS & Vitals'}</option>
            <option value="lab_lis">{isAr ? 'المختبر والنتائج الحرجة LIS' : 'LIS Lab Orders'}</option>
            <option value="medication_allergy">{isAr ? 'الأدوية وحساسية المريض' : 'Medication & Allergy'}</option>
            <option value="emar_delay">{isAr ? 'تأخر إعطاء جرعات eMAR' : 'eMAR Delays'}</option>
            <option value="consent_surgery">{isAr ? 'الإقرارات والعمليات الجراحية' : 'Consents & Surgery'}</option>
            <option value="inventory_stock">{isAr ? 'المستودع ومخزون الأدوية' : 'Inventory & Stock'}</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
          >
            <option value="all">{isAr ? 'كل حالات الإقرار' : 'All Statuses'}</option>
            <option value="unacknowledged">{isAr ? '⚠️ بانتظار الإقرار والتدخل' : 'Pending Ack'}</option>
            <option value="acknowledged">{isAr ? '✓ تم الإقرار والمتابعة' : 'Acknowledged'}</option>
          </select>
        </div>

        {/* Search input */}
        <div className="relative min-w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute rtl:right-2.5 ltr:left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث في التنبيهات أو اسم المريضة...' : 'Search alerts...'}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1 rtl:pr-8 rtl:pl-2.5 ltr:pl-8 ltr:pr-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Alerts Feed List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 font-mono text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
            <span>{isAr ? 'جاري فحص مؤشرات الإنذار السريري وقواعد الأمان...' : 'Scanning clinical alerts...'}</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800">
              {isAr ? 'لا توجد تنبيهات نشطة مطابقة للمعايير المحددة' : 'No Active Clinical Alerts'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isAr 
                ? 'جميع المؤشرات الحيوية ونتائج المختبر وجدول eMAR والإقرارات ضمن الحدود الطبيعية المقبولة.' 
                : 'All patient vitals, lab reports, eMAR schedules, and consents are within normal limits.'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const badge = getSeverityBadge(alert.severity);
            const CategoryIcon = getCategoryIcon(alert.category);
            const SeverityIcon = badge.icon;

            return (
              <div
                key={alert.id}
                className={`border rounded-2xl p-4 sm:p-5 transition-all shadow-xs ${
                  alert.isAcknowledged 
                    ? 'bg-white border-slate-200 opacity-80' 
                    : alert.severity === 'critical'
                      ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200'
                      : alert.severity === 'warning'
                        ? 'bg-amber-50/40 border-amber-300'
                        : 'bg-indigo-50/40 border-indigo-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Main Details */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${badge.bg}`}>
                      <SeverityIcon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Badge row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.indicator}`} />
                          <span>{isAr ? badge.labelAr : badge.labelEn}</span>
                        </span>

                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          <CategoryIcon className="w-3 h-3 text-slate-500" />
                          <span>{alert.category}</span>
                        </span>

                        {alert.metricValue && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-rose-700 border border-rose-200 shadow-2xs">
                            {alert.metricValue}
                          </span>
                        )}

                        {alert.isAcknowledged && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>{isAr ? 'تم الإقرار' : 'Acknowledged'}</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {isAr ? alert.titleAr : alert.titleEn}
                      </h3>

                      {/* Patient & Room Meta */}
                      {alert.patientName && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium pt-0.5">
                          <span className="flex items-center gap-1 text-slate-800 font-bold">
                            <User className="w-3.5 h-3.5 text-teal-600" />
                            <span>{alert.patientName}</span>
                          </span>
                          {alert.patientMrn && (
                            <span className="font-mono text-[11px] text-slate-500">
                              MRN: {alert.patientMrn}
                            </span>
                          )}
                          {alert.roomNumber && (
                            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                              <BedDouble className="w-3 h-3 text-slate-500" />
                              <span>{isAr ? `غرفة: ${alert.roomNumber}` : `Room: ${alert.roomNumber}`}</span>
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(alert.timestamp).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}

                      {/* Detailed Message */}
                      <p className="text-xs text-slate-700 leading-relaxed font-normal pt-1">
                        {isAr ? alert.messageAr : alert.messageEn}
                      </p>

                      {/* AI Clinical Recommendation Callout */}
                      {alert.aiRecommendation && (
                        <div className="mt-2 p-2.5 rounded-xl bg-indigo-50 border border-indigo-200/80 text-[11px] text-indigo-950 flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <strong className="font-bold text-indigo-900">
                              {isAr ? 'توصية الذكاء الاصطناعي الإرشادية: ' : 'AI Clinical Directive: '}
                            </strong>
                            <span>{alert.aiRecommendation}</span>
                          </div>
                        </div>
                      )}

                      {/* Acknowledged signature info if done */}
                      {alert.isAcknowledged && (
                        <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {isAr ? `تم الإقرار بواسطة: ${alert.acknowledgedBy || 'الطبيب المعالج'} في ${new Date(alert.acknowledgedAt || alert.timestamp).toLocaleTimeString('ar-LY')}` : `Acknowledged by: ${alert.acknowledgedBy} at ${new Date(alert.acknowledgedAt || alert.timestamp).toLocaleTimeString()}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    {!alert.isAcknowledged ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAckModal(alert)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إقرار واطلاع' : 'Acknowledge'}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        {isAr ? '✓ معتمد' : '✓ Verified'}
                      </span>
                    )}

                    {alert.actionLink && (
                      <button
                        type="button"
                        onClick={() => onNavigateToTab(alert.actionLink!.tab as any)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <span>{isAr ? alert.actionLink.labelAr : alert.actionLink.labelEn}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 rtl:rotate-180" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Acknowledgment Confirmation Modal */}
      {selectedAlertForAck && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  {isAr ? 'إقرار ومتابعة التنبيه السريري' : 'Acknowledge Clinical Alert'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr 
                    ? 'سيتم توثيق اسمك وتوقيت الإقرار في سجل التدقيق والحوكمة الطبية للمستشفى.' 
                    : 'Your electronic signature and timestamp will be logged into the hospital audit trail.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-800 block">
                {isAr ? selectedAlertForAck.titleAr : selectedAlertForAck.titleEn}
              </span>
              <p className="text-slate-600">
                {isAr ? selectedAlertForAck.messageAr : selectedAlertForAck.messageEn}
              </p>
              {selectedAlertForAck.metricValue && (
                <span className="font-mono font-bold text-rose-700 block">
                  {selectedAlertForAck.metricValue}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? 'ملاحظة الطبيب / الممرض المعتمد (اختياري):' : 'Clinician Action Notes (Optional):'}
              </label>
              <textarea
                rows={2}
                value={ackNote}
                onChange={(e) => setAckNote(e.target.value)}
                placeholder={isAr ? 'مثال: تم إبلاغ الاستشاري والبدء في إعطاء الدواء الموصى به...' : 'e.g. Attending notified, vitals re-checked...'}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {currentUser.name} ({currentUser.role})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAlertForAck(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={acknowledgingId !== null}
                  onClick={handleConfirmAcknowledge}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
                >
                  {acknowledgingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'تأكيد الإقرار الطبي' : 'Confirm Acknowledgment'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
