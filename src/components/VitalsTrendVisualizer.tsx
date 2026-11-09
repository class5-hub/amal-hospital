import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  ReferenceLine, 
  AreaChart, 
  Area,
  ComposedChart
} from 'recharts';
import { VitalSigns, Language } from '../types/hmis.ts';
import { 
  Activity, 
  Heart, 
  TrendingUp, 
  Plus, 
  Wind, 
  Thermometer, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert,
  SlidersHorizontal,
  Table as TableIcon,
  Maximize2
} from 'lucide-react';

interface VitalsTrendVisualizerProps {
  vitals: VitalSigns[];
  language: Language;
  onOpenRecordModal: () => void;
}

type MetricView = 'hemodynamics' | 'blood_pressure' | 'pulse' | 'oxygen' | 'temp_pain';
type DisplayMode = 'chart_only' | 'split' | 'table_only';

export const VitalsTrendVisualizer: React.FC<VitalsTrendVisualizerProps> = ({
  vitals,
  language,
  onOpenRecordModal
}) => {
  const isAr = language === 'ar';
  const [metricView, setMetricView] = useState<MetricView>('hemodynamics');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('split');

  // Sort vitals chronologically (oldest to newest) for accurate plotting along the x-axis
  const sortedVitals = useMemo(() => {
    return [...vitals].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB;
    });
  }, [vitals]);

  // Transform data for Recharts
  const chartData = useMemo(() => {
    return sortedVitals.map((v, index) => {
      const d = new Date(v.timestamp);
      const timeLabel = isAr 
        ? `${d.toLocaleDateString('ar-LY', { month: 'numeric', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
        : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;

      // Mean Arterial Pressure (MAP) = DBP + 1/3 (SBP - DBP)
      const map = Math.round(v.bpDiastolic + (v.bpSystolic - v.bpDiastolic) / 3);
      // Shock Index = Heart Rate / Systolic BP
      const shockIndex = v.bpSystolic > 0 ? parseFloat((v.pulse / v.bpSystolic).toFixed(2)) : 0;
      // Pulse Pressure = SBP - DBP
      const pulsePressure = v.bpSystolic - v.bpDiastolic;

      return {
        id: v.id || `v-${index}`,
        rawTimestamp: v.timestamp,
        timeLabel,
        bpSystolic: v.bpSystolic,
        bpDiastolic: v.bpDiastolic,
        map,
        pulsePressure,
        pulse: v.pulse,
        temp: v.temp,
        spO2: v.spO2,
        respRate: v.respRate,
        painScale: v.painScale,
        consciousness: v.consciousness,
        recordedBy: v.recordedBy,
        shockIndex
      };
    });
  }, [sortedVitals, isAr]);

  // Latest and previous readings for clinical comparison
  const latest = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const previous = chartData.length > 1 ? chartData[chartData.length - 2] : null;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-sm min-w-[210px] z-50">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
            <span className="font-bold text-teal-300 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 text-teal-400" />
              {data.timeLabel}
            </span>
            <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{data.recordedBy}</span>
          </div>

          <div className="space-y-1.5 font-mono">
            {/* BP */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                {isAr ? 'الضغط (BP):' : 'BP:'}
              </span>
              <span className="font-bold text-white">
                {data.bpSystolic}/{data.bpDiastolic} <span className="text-[10px] font-normal text-slate-400">mmHg</span>
                <span className="text-[10px] text-slate-400 ms-1">(MAP {data.map})</span>
              </span>
            </div>

            {/* Pulse */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                {isAr ? 'النبض (Pulse):' : 'Pulse:'}
              </span>
              <span className="font-bold text-teal-300">
                {data.pulse} <span className="text-[10px] font-normal text-slate-400">bpm</span>
              </span>
            </div>

            {/* SpO2 & RR */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                {isAr ? 'الأكسجة / التنفس:' : 'SpO2 / RR:'}
              </span>
              <span className="font-bold text-sky-200">
                {data.spO2}% <span className="text-[10px] font-normal text-slate-400">/ {data.respRate}/min</span>
              </span>
            </div>

            {/* Temp & Pain */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                {isAr ? 'الحرارة / الألم:' : 'Temp / Pain:'}
              </span>
              <span className="font-bold text-amber-200">
                {data.temp}°C <span className="text-[10px] font-normal text-slate-400">/ {data.painScale}/10</span>
              </span>
            </div>

            {/* Shock index */}
            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{isAr ? 'مؤشر الصدمة (SI):' : 'Shock Index:'}</span>
              <span className={`font-bold ${data.shockIndex >= 0.9 ? 'text-rose-400 font-black' : 'text-emerald-400'}`}>
                {data.shockIndex} {data.shockIndex >= 0.9 && (isAr ? '(مرتفع!)' : '(Alert)')}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Top Clinical Snapshot Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Blood Pressure */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-rose-600" />
              <span>{isAr ? 'ضغط الدم الأخير' : 'Latest BP'}</span>
            </span>
            {previous && latest && (
              <span className={`flex items-center text-[10px] font-semibold ${
                latest.bpSystolic > previous.bpSystolic ? 'text-rose-600' :
                latest.bpSystolic < previous.bpSystolic ? 'text-emerald-600' : 'text-slate-500'
              }`}>
                {latest.bpSystolic > previous.bpSystolic ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : latest.bpSystolic < previous.bpSystolic ? (
                  <ArrowDownRight className="w-3 h-3" />
                ) : null}
                {Math.abs(latest.bpSystolic - previous.bpSystolic)} mmHg
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
            {latest ? `${latest.bpSystolic}/${latest.bpDiastolic}` : '--/--'}
            <span className="text-xs font-normal text-slate-400 ms-1 font-sans">mmHg</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px]">
            {latest ? (
              <>
                <span className={`px-1.5 py-0.2 rounded font-bold ${
                  latest.bpSystolic >= 160 || latest.bpDiastolic >= 110 ? 'bg-rose-100 text-rose-800' :
                  latest.bpSystolic >= 140 || latest.bpDiastolic >= 90 ? 'bg-amber-100 text-amber-800' :
                  latest.bpSystolic <= 90 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {latest.bpSystolic >= 160 || latest.bpDiastolic >= 110 ? (isAr ? 'ارتفاع حرج' : 'Stage 2 HTN') :
                   latest.bpSystolic >= 140 || latest.bpDiastolic >= 90 ? (isAr ? 'مرتفع' : 'Stage 1 HTN') :
                   latest.bpSystolic <= 90 ? (isAr ? 'انخفاض' : 'Hypotension') : (isAr ? 'طبيعي' : 'Optimal')}
                </span>
                <span className="text-slate-400 font-mono">MAP: {latest.map}</span>
              </>
            ) : (
              <span className="text-slate-400">{isAr ? 'بانتظار التسجيل' : 'No data'}</span>
            )}
          </div>
        </div>

        {/* Card 2: Pulse / Heart Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'معدل النبض' : 'Heart Rate'}</span>
            </span>
            {previous && latest && (
              <span className={`flex items-center text-[10px] font-semibold ${
                latest.pulse > previous.pulse ? 'text-amber-600' :
                latest.pulse < previous.pulse ? 'text-teal-600' : 'text-slate-500'
              }`}>
                {latest.pulse > previous.pulse ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : latest.pulse < previous.pulse ? (
                  <ArrowDownRight className="w-3 h-3" />
                ) : null}
                {Math.abs(latest.pulse - previous.pulse)} bpm
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
            {latest ? latest.pulse : '--'}
            <span className="text-xs font-normal text-slate-400 ms-1 font-sans">bpm</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px]">
            {latest ? (
              <span className={`px-1.5 py-0.2 rounded font-bold ${
                latest.pulse >= 120 ? 'bg-rose-100 text-rose-800' :
                latest.pulse >= 100 ? 'bg-amber-100 text-amber-800' :
                latest.pulse <= 50 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {latest.pulse >= 120 ? (isAr ? 'تسارع حاد' : 'Marked Tachycardia') :
                 latest.pulse >= 100 ? (isAr ? 'تسارع نبض' : 'Tachycardia') :
                 latest.pulse <= 50 ? (isAr ? 'تباطؤ نبض' : 'Bradycardia') : (isAr ? 'نبض طبيعي' : 'Normal')}
              </span>
            ) : (
              <span className="text-slate-400">{isAr ? 'بانتظار التسجيل' : 'No data'}</span>
            )}
          </div>
        </div>

        {/* Card 3: SpO2 & Respiratory Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-sky-600" />
              <span>{isAr ? 'الأكسجة والتنفس' : 'SpO2 & Resp'}</span>
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
            {latest ? `${latest.spO2}%` : '--%'}
            <span className="text-xs font-semibold text-slate-500 ms-2 font-mono">
              {latest ? `${latest.respRate}/min` : '--'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px]">
            {latest ? (
              <span className={`px-1.5 py-0.2 rounded font-bold ${
                latest.spO2 < 92 ? 'bg-rose-100 text-rose-800' :
                latest.spO2 <= 94 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {latest.spO2 < 92 ? (isAr ? 'نقص أكسجة حاد' : 'Hypoxemia') :
                 latest.spO2 <= 94 ? (isAr ? 'أكسجة منخفضة' : 'Borderline') : (isAr ? 'أكسجة مثالية' : 'Optimal')}
              </span>
            ) : (
              <span className="text-slate-400">{isAr ? 'بانتظار التسجيل' : 'No data'}</span>
            )}
          </div>
        </div>

        {/* Card 4: Shock Index & Temperature */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <span>{isAr ? 'مؤشر الصدمة (Shock Index)' : 'Shock Index (SI)'}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">HR/SBP</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
            {latest ? latest.shockIndex : '--'}
            <span className="text-xs font-semibold text-slate-500 ms-2 font-mono">
              {latest ? `${latest.temp}°C` : '--'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px]">
            {latest ? (
              <span className={`px-1.5 py-0.2 rounded font-bold ${
                latest.shockIndex >= 0.9 ? 'bg-rose-100 text-rose-800 animate-pulse' :
                latest.shockIndex >= 0.7 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {latest.shockIndex >= 0.9 ? (isAr ? 'إنذار نزيف / صدمة!' : 'Hemorrhage Alert!') :
                 latest.shockIndex >= 0.7 ? (isAr ? 'متابعة حثيثة' : 'Elevated') : (isAr ? 'مؤشر سليم (0.5-0.7)' : 'Normal SI')}
              </span>
            ) : (
              <span className="text-slate-400">{isAr ? 'بانتظار التسجيل' : 'No data'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Card Header & Controls Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{isAr ? 'منحنى التطور الزمني للمؤشرات الحيوية' : 'Vital Signs Historical Trend Curve'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-medium">
                  {chartData.length} {isAr ? 'قراءات' : 'points'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'رسم بياني تفاعلي يوضح تدرج ضغط الدم، النبض، والتنفس طوال فترة الإقامة' : 'Interactive hemodynamic curves plotted across current hospital admission'}
              </p>
            </div>
          </div>

          {/* Action & Metric Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Selector Tabs */}
            <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMetricView('hemodynamics')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricView === 'hemodynamics'
                    ? 'bg-white text-teal-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={isAr ? 'الضغط والنبض معاً' : 'Hemodynamics: BP & Pulse'}
              >
                {isAr ? 'الديناميكا الدموية (BP + HR)' : 'Hemodynamics'}
              </button>
              <button
                type="button"
                onClick={() => setMetricView('blood_pressure')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricView === 'blood_pressure'
                    ? 'bg-white text-rose-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'ضغط الدم (BP)' : 'Blood Pressure'}
              </button>
              <button
                type="button"
                onClick={() => setMetricView('pulse')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricView === 'pulse'
                    ? 'bg-white text-indigo-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'النبض (Pulse)' : 'Pulse'}
              </button>
              <button
                type="button"
                onClick={() => setMetricView('oxygen')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricView === 'oxygen'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'التنفس والأكسجة' : 'SpO2 & RR'}
              </button>
              <button
                type="button"
                onClick={() => setMetricView('temp_pain')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricView === 'temp_pain'
                    ? 'bg-white text-amber-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'الحرارة والألم' : 'Temp & Pain'}
              </button>
            </div>

            {/* Display Mode Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDisplayMode('chart_only')}
                className={`p-1.5 rounded transition-colors ${
                  displayMode === 'chart_only' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title={isAr ? 'رسم بياني فقط' : 'Chart Only'}
              >
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('split')}
                className={`p-1.5 rounded transition-colors ${
                  displayMode === 'split' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title={isAr ? 'عرض مدمج: رسم بياني وجدول' : 'Split View'}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('table_only')}
                className={`p-1.5 rounded transition-colors ${
                  displayMode === 'table_only' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title={isAr ? 'جدول رقمي فقط' : 'Table Only'}
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Add Vitals Button */}
            <button
              type="button"
              onClick={onOpenRecordModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'تسجيل علامات جديدة' : 'Log Vitals'}</span>
            </button>
          </div>
        </div>

        {/* Chart Content Area */}
        {displayMode !== 'table_only' && (
          <div className="p-4 bg-slate-50/40">
            {chartData.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-slate-700">
                  {isAr ? 'لا توجد قراءات مسجلة للمخطط البياني' : 'No vital signs history to plot'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  {isAr 
                    ? 'قم بإضافة قراءات العلامات الحيوية للمريض لإنشاء منحنى المؤشرات ومتابعة استجابة الضغط والنبض للعلاج' 
                    : 'Record patient vital signs to begin tracking hemodynamic trends and response to therapy'}
                </p>
                <button
                  type="button"
                  onClick={onOpenRecordModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'تسجيل أول قراءة حيوية' : 'Record Initial Vitals'}</span>
                </button>
              </div>
            ) : chartData.length === 1 ? (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl mb-4 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {isAr 
                      ? 'توجد قراءة واحدة فقط. يرجى توثيق قراءة ثانية لإظهار مسار المنحنى البياني ومقارنة الاتجاهات.' 
                      : 'Only 1 recorded reading so far. Log an additional reading to reveal longitudinal trend lines.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenRecordModal}
                  className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0"
                >
                  {isAr ? 'إضافة قراءة ثانية' : 'Add 2nd Reading'}
                </button>
              </div>
            ) : null}

            {chartData.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                {/* 1. VIEW: HEMODYNAMICS (BP + HEART RATE) */}
                {metricView === 'hemodynamics' && (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis 
                          dataKey="timeLabel" 
                          stroke="#64748b" 
                          tick={{ fontSize: 11, fill: '#64748b' }} 
                          dy={8}
                        />
                        {/* Left Y Axis for Blood Pressure (mmHg) */}
                        <YAxis 
                          yAxisId="bp" 
                          domain={[40, 200]} 
                          stroke="#e11d48" 
                          tick={{ fontSize: 11, fill: '#e11d48' }}
                          label={{ value: 'BP (mmHg)', angle: -90, position: 'insideLeft', fill: '#e11d48', fontSize: 11 }}
                        />
                        {/* Right Y Axis for Heart Rate (bpm) */}
                        <YAxis 
                          yAxisId="pulse" 
                          orientation="right" 
                          domain={[40, 160]} 
                          stroke="#0d9488" 
                          tick={{ fontSize: 11, fill: '#0d9488' }}
                          label={{ value: isAr ? 'النبض (bpm)' : 'Pulse (bpm)', angle: 90, position: 'insideRight', fill: '#0d9488', fontSize: 11 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                        {/* Clinical Reference Lines */}
                        <ReferenceLine yAxisId="bp" y={140} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'HTN 140', fill: '#f59e0b', fontSize: 10, position: 'top' }} />
                        <ReferenceLine yAxisId="bp" y={90} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Hypotension 90', fill: '#ef4444', fontSize: 10, position: 'bottom' }} />
                        <ReferenceLine yAxisId="pulse" y={100} stroke="#14b8a6" strokeDasharray="2 2" />

                        {/* Curves */}
                        <Line 
                          yAxisId="bp" 
                          type="monotone" 
                          dataKey="bpSystolic" 
                          name={isAr ? 'الضغط الانقباضي (SBP)' : 'Systolic BP'} 
                          stroke="#e11d48" 
                          strokeWidth={2.5} 
                          dot={{ r: 4, fill: '#e11d48', strokeWidth: 1.5, stroke: '#fff' }}
                          activeDot={{ r: 6 }}
                        />
                        <Line 
                          yAxisId="bp" 
                          type="monotone" 
                          dataKey="bpDiastolic" 
                          name={isAr ? 'الضغط الانبساطي (DBP)' : 'Diastolic BP'} 
                          stroke="#be123c" 
                          strokeWidth={2} 
                          strokeDasharray="4 2"
                          dot={{ r: 3.5, fill: '#be123c', strokeWidth: 1.5, stroke: '#fff' }}
                        />
                        <Line 
                          yAxisId="pulse" 
                          type="monotone" 
                          dataKey="pulse" 
                          name={isAr ? 'معدل النبض (Pulse)' : 'Heart Rate'} 
                          stroke="#0d9488" 
                          strokeWidth={2.5} 
                          dot={{ r: 4, fill: '#0d9488', strokeWidth: 1.5, stroke: '#fff' }}
                          activeDot={{ r: 6 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* 2. VIEW: BLOOD PRESSURE ONLY */}
                {metricView === 'blood_pressure' && (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 25, left: 10, bottom: 20 }}>
                        <defs>
                          <linearGradient id="bpArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e11d48" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 11 }} dy={8} />
                        <YAxis domain={[50, 190]} stroke="#64748b" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                        <ReferenceLine y={160} stroke="#dc2626" strokeDasharray="3 3" label={{ value: 'Severe HTN 160', fill: '#dc2626', fontSize: 10 }} />
                        <ReferenceLine y={140} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'HTN 140', fill: '#f59e0b', fontSize: 10 }} />
                        <ReferenceLine y={90} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Low SBP 90', fill: '#3b82f6', fontSize: 10 }} />

                        <Area type="monotone" dataKey="bpSystolic" name={isAr ? 'الضغط الانقباضي' : 'Systolic'} stroke="#e11d48" strokeWidth={2.5} fill="url(#bpArea)" dot={{ r: 4, fill: '#e11d48' }} />
                        <Line type="monotone" dataKey="map" name={isAr ? 'متوسط الضغط الشرياني (MAP)' : 'Mean Arterial (MAP)'} stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 3, fill: '#8b5cf6' }} />
                        <Line type="monotone" dataKey="bpDiastolic" name={isAr ? 'الضغط الانبساطي' : 'Diastolic'} stroke="#be123c" strokeWidth={2} dot={{ r: 3.5, fill: '#be123c' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* 3. VIEW: PULSE & HEART RATE */}
                {metricView === 'pulse' && (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 25, left: 10, bottom: 20 }}>
                        <defs>
                          <linearGradient id="pulseArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 11 }} dy={8} />
                        <YAxis domain={[40, 150]} stroke="#64748b" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                        <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Tachycardia >100', fill: '#f59e0b', fontSize: 10 }} />
                        <ReferenceLine y={60} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Bradycardia <60', fill: '#3b82f6', fontSize: 10 }} />

                        <Area type="monotone" dataKey="pulse" name={isAr ? 'معدل النبض (نبضة/دقيقة)' : 'Heart Rate (bpm)'} stroke="#0d9488" strokeWidth={2.5} fill="url(#pulseArea)" dot={{ r: 4, fill: '#0d9488' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* 4. VIEW: OXYGENATION & RESPIRATORY RATE */}
                {metricView === 'oxygen' && (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 25, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 11 }} dy={8} />
                        <YAxis yAxisId="spo2" domain={[85, 100]} stroke="#0284c7" tick={{ fontSize: 11 }} label={{ value: 'SpO2 (%)', angle: -90, position: 'insideLeft', fill: '#0284c7', fontSize: 11 }} />
                        <YAxis yAxisId="rr" orientation="right" domain={[8, 32]} stroke="#475569" tick={{ fontSize: 11 }} label={{ value: isAr ? 'التنفس (/د)' : 'RR (/min)', angle: 90, position: 'insideRight', fill: '#475569', fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                        <ReferenceLine yAxisId="spo2" y={92} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical Hypoxia <92%', fill: '#ef4444', fontSize: 10 }} />

                        <Line yAxisId="spo2" type="monotone" dataKey="spO2" name={isAr ? 'تشبع الأكسجين (SpO2 %)' : 'Oxygen Saturation (%)'} stroke="#0284c7" strokeWidth={2.5} dot={{ r: 4, fill: '#0284c7' }} />
                        <Line yAxisId="rr" type="monotone" dataKey="respRate" name={isAr ? 'معدل التنفس (دورة/د)' : 'Respiratory Rate'} stroke="#64748b" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3.5, fill: '#64748b' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* 5. VIEW: TEMPERATURE & PAIN SCALE */}
                {metricView === 'temp_pain' && (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 25, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 11 }} dy={8} />
                        <YAxis yAxisId="temp" domain={[35.5, 40]} stroke="#d97706" tick={{ fontSize: 11 }} label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', fill: '#d97706', fontSize: 11 }} />
                        <YAxis yAxisId="pain" orientation="right" domain={[0, 10]} stroke="#e11d48" tick={{ fontSize: 11 }} label={{ value: isAr ? 'مقياس الألم (0-10)' : 'Pain (0-10)', angle: 90, position: 'insideRight', fill: '#e11d48', fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                        <ReferenceLine yAxisId="temp" y={38.0} stroke="#dc2626" strokeDasharray="3 3" label={{ value: 'Fever ≥ 38.0°C', fill: '#dc2626', fontSize: 10 }} />

                        <Line yAxisId="temp" type="monotone" dataKey="temp" name={isAr ? 'درجة الحرارة (°C)' : 'Temperature (°C)'} stroke="#d97706" strokeWidth={2.5} dot={{ r: 4, fill: '#d97706' }} />
                        <Area yAxisId="pain" type="monotone" dataKey="painScale" name={isAr ? 'مقياس الألم' : 'Pain Score'} stroke="#e11d48" fill="#e11d48" fillOpacity={0.15} strokeWidth={2} dot={{ r: 3.5, fill: '#e11d48' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tabular Records Section */}
        {displayMode !== 'chart_only' && (
          <div className="border-t border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <TableIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>{isAr ? 'سجل القراءات الرقمية المجدولة' : 'Numerical Vitals Log Table'}</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                {sortedVitals.length} {isAr ? 'قراءة موثقة' : 'logged readings'}
              </span>
            </div>

            {sortedVitals.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                {isAr ? 'لا توجد قراءات مسجلة' : 'No records found.'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-right border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">{isAr ? 'التاريخ والوقت' : 'Timestamp'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'ضغط الدم (BP)' : 'BP (mmHg)'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'النبض (Pulse)' : 'Pulse'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الحرارة (Temp)' : 'Temp'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الأكسجة (SpO2)' : 'SpO2'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'التنفس (RR)' : 'Resp'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'مؤشر الصدمة' : 'Shock Index'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الألم (Pain)' : 'Pain'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'المسجل' : 'Logged By'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {/* Display descending (newest first) for table */}
                    {[...sortedVitals].reverse().map(v => {
                      const shockIndex = v.bpSystolic > 0 ? (v.pulse / v.bpSystolic).toFixed(2) : '-';
                      const isHighBP = v.bpSystolic >= 140 || v.bpDiastolic >= 90;
                      const isHighHR = v.pulse >= 100;

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                            {v.timestamp.split('T')[0]} {v.timestamp.split('T')[1]?.substring(0, 5)}
                          </td>
                          <td className="py-2 px-3 font-bold whitespace-nowrap">
                            <span className={isHighBP ? 'text-rose-700' : 'text-slate-900'}>
                              {v.bpSystolic}/{v.bpDiastolic}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={isHighHR ? 'text-amber-700 font-bold' : 'text-teal-700'}>
                              {v.pulse} bpm
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-800 whitespace-nowrap">{v.temp}°C</td>
                          <td className="py-2 px-3 font-bold text-sky-700 whitespace-nowrap">{v.spO2}%</td>
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{v.respRate}/min</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              Number(shockIndex) >= 0.9 ? 'bg-rose-100 text-rose-800' :
                              Number(shockIndex) >= 0.7 ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {shockIndex}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.painScale > 6 ? 'bg-rose-100 text-rose-800' :
                              v.painScale > 3 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {v.painScale}/10
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600 text-[11px] truncate max-w-[130px]">
                            {v.recordedBy}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
