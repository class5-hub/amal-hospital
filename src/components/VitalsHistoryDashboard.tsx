import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Area
} from 'recharts';
import { VitalSigns, Language } from '../types/hmis.ts';
import {
  Activity,
  Heart,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Table as TableIcon
} from 'lucide-react';

interface VitalsHistoryDashboardProps {
  vitals: VitalSigns[];
  language: Language;
  onOpenRecordModal: () => void;
}

export const VitalsHistoryDashboard: React.FC<VitalsHistoryDashboardProps> = ({
  vitals,
  language,
  onOpenRecordModal
}) => {
  const isAr = language === 'ar';
  const [timeRange, setTimeRange] = useState<'all' | '24h' | '12h'>('all');
  const [showThresholds, setShowThresholds] = useState(true);

  // Sort vitals chronologically
  const sortedVitals = useMemo(() => {
    return [...vitals].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB;
    });
  }, [vitals]);

  // Filter based on range
  const filteredVitals = useMemo(() => {
    if (timeRange === 'all' || sortedVitals.length === 0) return sortedVitals;
    const now = new Date(sortedVitals[sortedVitals.length - 1].timestamp).getTime();
    const hours = timeRange === '24h' ? 24 : 12;
    const cutoff = now - hours * 60 * 60 * 1000;
    const filtered = sortedVitals.filter(v => new Date(v.timestamp).getTime() >= cutoff);
    return filtered.length > 0 ? filtered : sortedVitals;
  }, [sortedVitals, timeRange]);

  // Transform data for dual-axis Recharts
  const chartData = useMemo(() => {
    return filteredVitals.map((v, index) => {
      const d = new Date(v.timestamp);
      const timeLabel = isAr
        ? `${d.toLocaleDateString('ar-LY', { month: 'numeric', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
        : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;

      // Clinical Flags Evaluation
      const isCriticalBp = v.bpSystolic >= 160 || v.bpSystolic <= 80 || v.bpDiastolic >= 110 || v.bpDiastolic <= 50;
      const isAbnormalBp = !isCriticalBp && (v.bpSystolic > 140 || v.bpSystolic < 90 || v.bpDiastolic > 90 || v.bpDiastolic < 60);

      const isCriticalHr = v.pulse >= 125 || v.pulse <= 45;
      const isAbnormalHr = !isCriticalHr && (v.pulse > 100 || v.pulse < 55);

      const isOverallCritical = isCriticalBp || isCriticalHr || (v.spO2 && v.spO2 < 90);
      const isOverallAbnormal = !isOverallCritical && (isAbnormalBp || isAbnormalHr || (v.spO2 && v.spO2 < 95));

      const map = Math.round(v.bpDiastolic + (v.bpSystolic - v.bpDiastolic) / 3);
      const pulsePressure = v.bpSystolic - v.bpDiastolic;

      return {
        id: v.id || `v-${index}`,
        timestamp: v.timestamp,
        timeLabel,
        bpSystolic: v.bpSystolic,
        bpDiastolic: v.bpDiastolic,
        pulse: v.pulse,
        temp: v.temp,
        spO2: v.spO2,
        map,
        pulsePressure,
        recordedBy: v.recordedBy,
        isCriticalBp,
        isAbnormalBp,
        isCriticalHr,
        isAbnormalHr,
        isOverallCritical,
        isOverallAbnormal
      };
    });
  }, [filteredVitals, isAr]);

  const latest = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  // Custom Tooltip highlighting abnormal / critical vitals
  const renderDualAxisTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-2 min-w-[220px] z-50">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <span className="font-bold text-teal-300 font-mono flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>{data.timeLabel}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {data.recordedBy || 'Nurse'}
            </span>
          </div>

          {/* Alert Status Pill */}
          {data.isOverallCritical ? (
            <div className="bg-rose-950/80 border border-rose-500/70 p-2 rounded-lg text-rose-200 flex items-start gap-1.5 animate-pulse">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[11px] font-bold text-rose-300">
                  {isAr ? '🚨 قراءة حرجة تستوجب تدخلاً عاجلاً' : '🚨 CRITICAL CLINICAL READING'}
                </strong>
                <span className="text-[10px] text-rose-300/90 block">
                  {data.isCriticalBp && (isAr ? '• ضغط الدم في نطاق الخطر الحاد' : '• Severe BP Range')}
                  {data.isCriticalHr && (isAr ? ' • اضطراب حاد في النبض' : ' • Severe Tachycardia/Bradycardia')}
                </span>
              </div>
            </div>
          ) : data.isOverallAbnormal ? (
            <div className="bg-amber-950/70 border border-amber-500/50 p-2 rounded-lg text-amber-200 flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[11px] font-bold text-amber-300">
                  {isAr ? '⚠️ قراءة غير طبيعية خارج النطاق الآمن' : '⚠️ ABNORMAL READING DETECTED'}
                </strong>
                <span className="text-[10px] text-amber-300/90 block">
                  {data.isAbnormalBp && (isAr ? '• ضغط الدم خارج المدى الطبيعي' : '• BP out of normal range')}
                  {data.isAbnormalHr && (isAr ? ' • تسارع أو تباطؤ في النبض' : ' • Pulse irregularity')}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/50 border border-emerald-500/30 px-2 py-1 rounded text-emerald-300 flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'المؤشرات مستقرة ضمن المعدل الآمن' : 'All Vitals Within Stable Baseline'}</span>
            </div>
          )}

          {/* Vital Signs Metrics */}
          <div className="space-y-1.5 pt-1 text-slate-200 font-mono">
            <div className="flex items-center justify-between bg-slate-800/60 px-2 py-1 rounded">
              <span className="text-slate-400 flex items-center gap-1 font-sans">
                <Activity className="w-3.5 h-3.5 text-rose-400" />
                <span>{isAr ? 'ضغط الدم (BP):' : 'Blood Pressure:'}</span>
              </span>
              <strong className={`font-bold ${data.isCriticalBp ? 'text-rose-400' : data.isAbnormalBp ? 'text-amber-400' : 'text-white'}`}>
                {data.bpSystolic}/{data.bpDiastolic} mmHg
              </strong>
            </div>

            <div className="flex items-center justify-between bg-slate-800/60 px-2 py-1 rounded">
              <span className="text-slate-400 flex items-center gap-1 font-sans">
                <Heart className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? 'معدل النبض (HR):' : 'Heart Rate:'}</span>
              </span>
              <strong className={`font-bold ${data.isCriticalHr ? 'text-rose-400' : data.isAbnormalHr ? 'text-amber-400' : 'text-emerald-300'}`}>
                {data.pulse} bpm
              </strong>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1 border-t border-slate-800">
              <span>{isAr ? 'متوسط الضغط الشرياني (MAP):' : 'MAP:'} <strong className="text-slate-300 font-mono">{data.map} mmHg</strong></span>
              <span>SpO2: <strong className="text-cyan-300 font-mono">{data.spO2}%</strong></span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <TrendingUp className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{isAr ? 'لوحة المراقبة البيانية المزدوجة للعلامات الحيوية (Vitals History Dashboard)' : 'Dual-Axis Vitals History Dashboard'}</span>
              <span className="bg-teal-100 text-teal-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                Dual Axis
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {isAr 
                ? 'رصد بياني متزامن لضغط الدم (انقباضي / انبساطي) على المحور الأيسر ومعدل النبض على المحور الأيمن طوال فترة الإقامة.' 
                : 'Synchronous dual-axis trend monitoring of blood pressure (left axis) and heart rate (right axis) over admission.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range filters */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                timeRange === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'كامل الإقامة' : 'All Stay'}
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('24h')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                timeRange === '24h' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'آخر 24 ساعة' : 'Last 24h'}
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('12h')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                timeRange === '12h' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'آخر 12 ساعة' : 'Last 12h'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowThresholds(!showThresholds)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border transition-colors ${
              showThresholds ? 'bg-teal-50 border-teal-300 text-teal-800' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isAr ? 'خطوط التحذير السريرية' : 'Thresholds'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenRecordModal}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل قراءة' : 'Record'}</span>
          </button>
        </div>
      </div>

      {/* Snapshot KPI Cards */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-slate-500 block text-[10px] font-semibold">
              {isAr ? 'آخر قراءة ضغط دم:' : 'Latest Blood Pressure:'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xl font-bold font-mono ${latest.isCriticalBp ? 'text-rose-600' : latest.isAbnormalBp ? 'text-amber-600' : 'text-slate-900'}`}>
                {latest.bpSystolic}/{latest.bpDiastolic}
              </span>
              <span className="text-[10px] text-slate-500">mmHg</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {isAr ? 'متوسط الشريان (MAP):' : 'MAP:'} {latest.map} mmHg
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-slate-500 block text-[10px] font-semibold">
              {isAr ? 'آخر معدل نبض (HR):' : 'Latest Heart Rate:'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xl font-bold font-mono ${latest.isCriticalHr ? 'text-rose-600' : latest.isAbnormalHr ? 'text-amber-600' : 'text-emerald-700'}`}>
                {latest.pulse}
              </span>
              <span className="text-[10px] text-slate-500">bpm</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {latest.pulse >= 60 && latest.pulse <= 100 ? (isAr ? 'طبيعي ومستقر' : 'Normal Sinus') : latest.pulse > 100 ? (isAr ? 'تسارع نبض' : 'Tachycardia') : (isAr ? 'تباطؤ نبض' : 'Bradycardia')}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-slate-500 block text-[10px] font-semibold">
              {isAr ? 'ضغط النبض (Pulse Pressure):' : 'Pulse Pressure:'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-slate-900">
                {latest.pulsePressure}
              </span>
              <span className="text-[10px] text-slate-500">mmHg</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {latest.pulsePressure >= 30 && latest.pulsePressure <= 50 ? (isAr ? 'مدى ضغط سليم' : 'Healthy delta') : (isAr ? 'تغير يتطلب مراقبة' : 'Monitor')}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-slate-500 block text-[10px] font-semibold">
              {isAr ? 'تقييم السلامة والتنبيهات:' : 'Triage Status:'}
            </span>
            <div className="mt-1">
              {latest.isOverallCritical ? (
                <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                  <span>{isAr ? 'حالة حرجة' : 'Critical'}</span>
                </span>
              ) : latest.isOverallAbnormal ? (
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isAr ? 'غير طبيعية' : 'Abnormal'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isAr ? 'مستقرة' : 'Stable'}</span>
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {new Date(latest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {/* Recharts Dual-Axis Chart */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            
            {/* X-Axis */}
            <XAxis 
              dataKey="timeLabel" 
              tick={{ fontSize: 10, fill: '#475569' }}
              label={{ value: isAr ? 'الوقت والتاريخ' : 'Time & Date', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#94a3b8' }}
            />

            {/* Left Y-Axis: Blood Pressure (mmHg) */}
            <YAxis 
              yAxisId="bp" 
              orientation="left" 
              domain={[50, 180]} 
              tick={{ fontSize: 10, fill: '#e11d48' }}
              label={{ value: isAr ? 'ضغط الدم (mmHg)' : 'Blood Pressure (mmHg)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#e11d48' }}
            />

            {/* Right Y-Axis: Heart Rate (bpm) */}
            <YAxis 
              yAxisId="hr" 
              orientation="right" 
              domain={[40, 150]} 
              tick={{ fontSize: 10, fill: '#059669' }}
              label={{ value: isAr ? 'النبض (bpm)' : 'Heart Rate (bpm)', angle: 90, position: 'insideRight', fontSize: 10, fill: '#059669' }}
            />

            <Tooltip content={renderDualAxisTooltip} />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />

            {/* Clinical Threshold Lines */}
            {showThresholds && (
              <>
                <ReferenceLine yAxisId="bp" y={140} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'SBP Alert (140)', position: 'left', fill: '#f43f5e', fontSize: 9 }} />
                <ReferenceLine yAxisId="bp" y={90} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'SBP Low (90)', position: 'left', fill: '#f59e0b', fontSize: 9 }} />
                <ReferenceLine yAxisId="hr" y={100} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Tachycardia (100)', position: 'right', fill: '#10b981', fontSize: 9 }} />
              </>
            )}

            {/* Systolic BP Trend Line */}
            <Line
              yAxisId="bp"
              type="monotone"
              dataKey="bpSystolic"
              name={isAr ? 'الضغط الانقباضي (Systolic)' : 'Systolic BP (mmHg)'}
              stroke="#e11d48"
              strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy) return null;
                const isCrit = payload.isCriticalBp;
                return (
                  <circle
                    key={`dot-sbp-${props.index}`}
                    cx={cx}
                    cy={cy}
                    r={isCrit ? 6 : 4}
                    fill={isCrit ? '#e11d48' : '#ffffff'}
                    stroke="#e11d48"
                    strokeWidth={isCrit ? 3 : 2}
                  />
                );
              }}
              activeDot={{ r: 7, fill: '#e11d48' }}
            />

            {/* Diastolic BP Trend Line */}
            <Line
              yAxisId="bp"
              type="monotone"
              dataKey="bpDiastolic"
              name={isAr ? 'الضغط الانبساطي (Diastolic)' : 'Diastolic BP (mmHg)'}
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3.5, fill: '#ffffff', stroke: '#2563eb', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: '#2563eb' }}
            />

            {/* Heart Rate Trend Line on Right Axis */}
            <Line
              yAxisId="hr"
              type="monotone"
              dataKey="pulse"
              name={isAr ? 'معدل النبض (Heart Rate)' : 'Heart Rate (bpm)'}
              stroke="#059669"
              strokeWidth={2.5}
              strokeDasharray="4 2"
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy) return null;
                const isCrit = payload.isCriticalHr;
                return (
                  <circle
                    key={`dot-hr-${props.index}`}
                    cx={cx}
                    cy={cy}
                    r={isCrit ? 6 : 4}
                    fill={isCrit ? '#059669' : '#ffffff'}
                    stroke="#059669"
                    strokeWidth={isCrit ? 3 : 2}
                  />
                );
              }}
              activeDot={{ r: 7, fill: '#059669' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
