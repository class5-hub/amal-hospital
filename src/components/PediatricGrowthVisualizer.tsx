import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  PediatricGrowthRecord,
  Language,
  SystemUser
} from '../types/hmis.ts';
import {
  WHO_GIRLS_STANDARDS,
  WHO_BOYS_STANDARDS,
  calculatePercentile,
  getGrowthAssessment
} from '../utils/growthStandards.ts';
import {
  Baby,
  TrendingUp,
  Plus,
  Scale,
  Ruler,
  Brain,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ChevronRight,
  ShieldCheck,
  Table as TableIcon,
  Maximize2,
  Info,
  Clock,
  Sparkles,
  Milk,
  X
} from 'lucide-react';

interface PediatricGrowthVisualizerProps {
  growthRecords: PediatricGrowthRecord[];
  patientName: string;
  patientDob?: string;
  patientGender?: 'female' | 'male';
  language: Language;
  currentUser: SystemUser;
  onSaveRecord: (record: PediatricGrowthRecord) => Promise<void>;
}

type ActiveMetric = 'all' | 'weight' | 'length' | 'head' | 'table';

export const PediatricGrowthVisualizer: React.FC<PediatricGrowthVisualizerProps> = ({
  growthRecords,
  patientName,
  patientDob,
  patientGender = 'female',
  language,
  currentUser,
  onSaveRecord
}) => {
  const isAr = language === 'ar';

  const [activeMetric, setActiveMetric] = useState<ActiveMetric>('all');
  const [selectedGender, setSelectedGender] = useState<'female' | 'male'>(patientGender);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Record Form State
  const [formAgeDays, setFormAgeDays] = useState<number>(() => {
    if (growthRecords.length > 0) {
      const maxAge = Math.max(...growthRecords.map(r => r.ageDays));
      return maxAge + 1;
    }
    return 0;
  });
  const [formWeightKg, setFormWeightKg] = useState<string>('3.40');
  const [formLengthCm, setFormLengthCm] = useState<string>('50.0');
  const [formHeadCm, setFormHeadCm] = useState<string>('34.5');
  const [formFeeding, setFormFeeding] = useState<'exclusive_breastfeeding' | 'formula' | 'mixed' | 'tpm_iv'>('exclusive_breastfeeding');
  const [formNotes, setFormNotes] = useState<string>('');

  // Sort patient growth records by age in days
  const sortedRecords = useMemo(() => {
    return [...growthRecords].sort((a, b) => a.ageDays - b.ageDays);
  }, [growthRecords]);

  // Key measurements
  const birthRecord = sortedRecords.find(r => r.ageDays === 0) || sortedRecords[0];
  const latestRecord = sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1] : null;

  // WHO reference standard based on chosen gender
  const standards = useMemo(() => {
    return selectedGender === 'female' ? WHO_GIRLS_STANDARDS : WHO_BOYS_STANDARDS;
  }, [selectedGender]);

  // Latest calculated percentiles
  const latestPercentiles = useMemo(() => {
    if (!latestRecord) return { weight: 50, length: 50, head: 50 };
    return {
      weight: calculatePercentile(latestRecord.weightKg, latestRecord.ageDays, 'weightKg', selectedGender),
      length: calculatePercentile(latestRecord.lengthCm, latestRecord.ageDays, 'lengthCm', selectedGender),
      head: calculatePercentile(latestRecord.headCircumferenceCm, latestRecord.ageDays, 'headCircumferenceCm', selectedGender)
    };
  }, [latestRecord, selectedGender]);

  // Clinical evaluation summary
  const assessment = useMemo(() => {
    if (!latestRecord) return null;
    return getGrowthAssessment(
      latestPercentiles.weight,
      latestPercentiles.length,
      latestPercentiles.head,
      birthRecord?.weightKg,
      latestRecord.weightKg,
      latestRecord.ageDays,
      isAr
    );
  }, [latestRecord, birthRecord, latestPercentiles, isAr]);

  // Combine WHO curve milestones and patient readings into unified dataset for Recharts
  const buildChartData = (metric: 'weightKg' | 'lengthCm' | 'headCircumferenceCm') => {
    const whoCurve = standards[metric];
    const dataMap = new Map<number, any>();

    // 1. Initialize with WHO standard milestones
    whoCurve.forEach(pt => {
      dataMap.set(pt.ageDays, {
        ageDays: pt.ageDays,
        ageLabel: pt.label,
        p3: pt.p3,
        p10: pt.p10,
        p50: pt.p50,
        p90: pt.p90,
        p97: pt.p97,
        patientVal: undefined,
        record: undefined
      });
    });

    // 2. Overlay patient records
    sortedRecords.forEach(rec => {
      const val = rec[metric];
      if (dataMap.has(rec.ageDays)) {
        const item = dataMap.get(rec.ageDays);
        item.patientVal = val;
        item.record = rec;
      } else {
        // Approximate WHO percentiles for non-standard milestone day
        const p3 = calculatePercentileInterpolated(rec.ageDays, metric, 'p3', selectedGender);
        const p10 = calculatePercentileInterpolated(rec.ageDays, metric, 'p10', selectedGender);
        const p50 = calculatePercentileInterpolated(rec.ageDays, metric, 'p50', selectedGender);
        const p90 = calculatePercentileInterpolated(rec.ageDays, metric, 'p90', selectedGender);
        const p97 = calculatePercentileInterpolated(rec.ageDays, metric, 'p97', selectedGender);

        dataMap.set(rec.ageDays, {
          ageDays: rec.ageDays,
          ageLabel: `${rec.ageDays}d`,
          p3,
          p10,
          p50,
          p90,
          p97,
          patientVal: val,
          record: rec
        });
      }
    });

    return Array.from(dataMap.values()).sort((a, b) => a.ageDays - b.ageDays);
  };

  // Helper for milestone interpolation
  const calculatePercentileInterpolated = (
    ageDays: number,
    metric: 'weightKg' | 'lengthCm' | 'headCircumferenceCm',
    pKey: 'p3' | 'p10' | 'p50' | 'p90' | 'p97',
    gender: 'female' | 'male'
  ): number => {
    const list = gender === 'female' ? WHO_GIRLS_STANDARDS[metric] : WHO_BOYS_STANDARDS[metric];
    let lower = list[0];
    let upper = list[list.length - 1];

    for (let i = 0; i < list.length - 1; i++) {
      if (ageDays >= list[i].ageDays && ageDays <= list[i + 1].ageDays) {
        lower = list[i];
        upper = list[i + 1];
        break;
      }
    }

    const frac = upper.ageDays === lower.ageDays ? 0 : (ageDays - lower.ageDays) / (upper.ageDays - lower.ageDays);
    return parseFloat((lower[pKey] + frac * (upper[pKey] - lower[pKey])).toFixed(2));
  };

  const weightChartData = useMemo(() => buildChartData('weightKg'), [standards, sortedRecords, selectedGender]);
  const lengthChartData = useMemo(() => buildChartData('lengthCm'), [standards, sortedRecords, selectedGender]);
  const headChartData = useMemo(() => buildChartData('headCircumferenceCm'), [standards, sortedRecords, selectedGender]);

  // Form submit handler
  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const weight = parseFloat(formWeightKg);
      const length = parseFloat(formLengthCm);
      const head = parseFloat(formHeadCm);

      const newRecord: PediatricGrowthRecord = {
        id: `pgr-${Date.now()}`,
        admissionId: birthRecord?.admissionId || 'ADM-CURRENT',
        timestamp: new Date().toISOString(),
        ageDays: formAgeDays,
        ageLabel: formAgeDays === 0 ? (isAr ? 'عند الولادة (اليوم 0)' : 'Birth (Day 0)') : `${isAr ? 'اليوم' : 'Day'} ${formAgeDays}`,
        gender: selectedGender,
        weightKg: weight,
        lengthCm: length,
        headCircumferenceCm: head,
        feedingType: formFeeding,
        recordedBy: currentUser.name,
        notes: formNotes || (isAr ? 'قياس سريري دوري للرضيع' : 'Routine infant growth check'),
        percentiles: {
          weightPercentile: calculatePercentile(weight, formAgeDays, 'weightKg', selectedGender),
          lengthPercentile: calculatePercentile(length, formAgeDays, 'lengthCm', selectedGender),
          headPercentile: calculatePercentile(head, formAgeDays, 'headCircumferenceCm', selectedGender)
        }
      };

      await onSaveRecord(newRecord);
      setShowAddModal(false);
      setFormNotes('');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save growth record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom Recharts Tooltip
  const renderCustomTooltip = (props: any, unit: string, metricNameAr: string, metricNameEn: string) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const patientVal = data.patientVal;
      const pct = patientVal !== undefined 
        ? calculatePercentile(patientVal, data.ageDays, unit === 'kg' ? 'weightKg' : unit === 'cm' && metricNameEn.includes('Length') ? 'lengthCm' : 'headCircumferenceCm', selectedGender)
        : null;

      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1.5 max-w-xs z-50">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1">
            <span className="font-bold text-teal-300">
              {isAr ? `عمر المولود: ${data.ageDays} يوم (${data.ageLabel})` : `Age: ${data.ageDays} days (${data.ageLabel})`}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              WHO Standard
            </span>
          </div>

          {patientVal !== undefined ? (
            <div className="bg-teal-950/60 p-2 rounded border border-teal-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">
                  {isAr ? 'القياس المسجل للرضيع:' : 'Infant Measurement:'}
                </span>
                <strong className="text-sm font-mono text-teal-400">
                  {patientVal} {unit}
                </strong>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{isAr ? 'الشريحة المئينية:' : 'Percentile:'}</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {isAr ? `المئين ${pct}` : `${pct}th %ile`}
                </span>
              </div>
              {data.record?.notes && (
                <p className="text-[10px] text-slate-300 pt-1 border-t border-teal-800/60 italic">
                  "{data.record.notes}"
                </p>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 italic">
              {isAr ? 'نقطة معيارية لمنظمة الصحة العالمية' : 'WHO standard curve reference point'}
            </div>
          )}

          <div className="text-[10px] text-slate-300 space-y-0.5 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-400">P50 (Median):</span>
              <span className="font-mono text-amber-300">{data.p50} {unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">P10 - P90 (Normal Range):</span>
              <span className="font-mono">{data.p10} - {data.p90} {unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">P3 - P97 (Boundary):</span>
              <span className="font-mono">{data.p3} - {data.p97} {unit}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-xl shadow-md border border-teal-800/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                <Baby className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>{isAr ? 'منحنيات وسجل نمو المولود التخصصي (WHO Pediatric Growth Charts)' : 'Pediatric & Newborn Growth Charts (WHO)'}</span>
                </h2>
                <p className="text-xs text-slate-300">
                  {isAr 
                    ? `رصد بياني دقيق لمسار الوزن، الطول، ومحيط الرأس مقارنة بالمئينيات المعيارية لمنظمة الصحة العالمية (0 - 90 يوماً).`
                    : `Plotting weight, recumbent length, and head circumference percentiles against WHO standards (0 - 90 days).`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Gender Toggle Button */}
            <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setSelectedGender('female')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                  selectedGender === 'female'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>♀ {isAr ? 'أنثى (WHO Girls)' : 'Female'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender('male')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                  selectedGender === 'male'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>♂ {isAr ? 'ذكر (WHO Boys)' : 'Male'}</span>
              </button>
            </div>

            {/* Quick Add Measurement Button */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'تسجيل قياس نمو جديد' : 'Record Measurement'}</span>
            </button>

            {/* Print/Export Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-xs cursor-pointer"
              title={isAr ? 'طباعة تقرير النمو' : 'Print Growth Chart'}
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span className="hidden sm:inline">{isAr ? 'طباعة التقرير' : 'Print'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clinical Metrics Snapshot Cards */}
      {latestRecord && assessment && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Weight & AGA/SGA Category */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Scale className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'الوزن الحالي والمئين' : 'Current Weight & %ile'}</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {latestRecord.ageLabel}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black font-mono text-slate-950">
                  {latestRecord.weightKg}
                </span>
                <span className="text-xs text-slate-500 ms-1 font-semibold">{isAr ? 'كجم' : 'kg'}</span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  ({(latestRecord.weightKg * 1000).toFixed(0)} {isAr ? 'جرام' : 'g'})
                </span>
              </div>
              <div className="text-end">
                <span className="text-sm font-black text-teal-700 font-mono block">
                  {isAr ? `المئين ${latestPercentiles.weight}` : `${latestPercentiles.weight}th %ile`}
                </span>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${assessment.weightBadgeColor}`}>
                  {latestPercentiles.weight >= 10 && latestPercentiles.weight <= 90 ? 'AGA' : latestPercentiles.weight < 10 ? 'SGA' : 'LGA'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              <span className="block truncate" title={assessment.weightStatus}>
                {assessment.weightStatus}
              </span>
            </div>
          </div>

          {/* Card 2: Length & Stature */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Ruler className="w-4 h-4 text-indigo-600" />
                <span>{isAr ? 'طول المولود (Stature)' : 'Recumbent Length'}</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                WHO {selectedGender === 'female' ? 'Girls' : 'Boys'}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black font-mono text-slate-950">
                  {latestRecord.lengthCm}
                </span>
                <span className="text-xs text-slate-500 ms-1 font-semibold">{isAr ? 'سم' : 'cm'}</span>
                <span className="text-[11px] text-slate-400 block">
                  {birthRecord ? `+${(latestRecord.lengthCm - birthRecord.lengthCm).toFixed(1)} cm ${isAr ? 'منذ الولادة' : 'gain'}` : ''}
                </span>
              </div>
              <div className="text-end">
                <span className="text-sm font-black text-indigo-700 font-mono block">
                  {isAr ? `المئين ${latestPercentiles.length}` : `${latestPercentiles.length}th %ile`}
                </span>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mt-0.5">
                  {isAr ? 'نمو طولي متناسق' : 'Normal Length'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              {isAr ? 'ضمن الشريحة المئينية الطبيعية للطول' : 'Within normal recumbent length percentile'}
            </div>
          </div>

          {/* Card 3: Head Circumference & Cranial Health */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Brain className="w-4 h-4 text-cyan-600" />
                <span>{isAr ? 'محيط الرأس (OFC)' : 'Head Circumference'}</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                P3 - P97 Normal
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black font-mono text-slate-950">
                  {latestRecord.headCircumferenceCm}
                </span>
                <span className="text-xs text-slate-500 ms-1 font-semibold">{isAr ? 'سم' : 'cm'}</span>
                <span className="text-[11px] text-slate-400 block">
                  {birthRecord ? `+${(latestRecord.headCircumferenceCm - birthRecord.headCircumferenceCm).toFixed(1)} cm ${isAr ? 'زيادة' : 'delta'}` : ''}
                </span>
              </div>
              <div className="text-end">
                <span className="text-sm font-black text-cyan-700 font-mono block">
                  {isAr ? `المئين ${latestPercentiles.head}` : `${latestPercentiles.head}th %ile`}
                </span>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${assessment.headBadgeColor}`}>
                  {latestPercentiles.head >= 3 && latestPercentiles.head <= 97 ? 'Normocephalic' : latestPercentiles.head < 3 ? 'Microcephaly ?' : 'Macrocephaly ?'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              <span className="block truncate" title={assessment.headStatus}>
                {assessment.headStatus}
              </span>
            </div>
          </div>

          {/* Card 4: Physiological Weight Loss / Recovery Status */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-3.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-teal-800">
              <span className="flex items-center gap-1.5 font-bold">
                <Milk className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'تطور الوزن الفسيولوجي' : 'Physiological Weight Course'}</span>
              </span>
              <span className="bg-teal-200/70 text-teal-900 text-[9px] font-bold px-1.5 py-0.5 rounded">
                {isAr ? 'مؤشر التغذية' : 'Hydration Index'}
              </span>
            </div>

            <div className="space-y-1">
              {birthRecord && latestRecord && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{isAr ? 'وزن الولادة الأساسي:' : 'Birth Weight:'}</span>
                  <span className="font-mono font-bold text-slate-900">{birthRecord.weightKg} kg</span>
                </div>
              )}
              {birthRecord && latestRecord && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{isAr ? 'الفارق الإجمالي:' : 'Net Change:'}</span>
                  <span className={`font-mono font-bold ${latestRecord.weightKg >= birthRecord.weightKg ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {latestRecord.weightKg >= birthRecord.weightKg ? '+' : ''}
                    {((latestRecord.weightKg - birthRecord.weightKg) * 1000).toFixed(0)} g 
                    ({(((latestRecord.weightKg - birthRecord.weightKg) / birthRecord.weightKg) * 100).toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>

            <div className="pt-1.5 border-t border-teal-200/70 text-[10.5px] text-teal-900 leading-tight">
              {assessment.physiologicNote}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveMetric('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeMetric === 'all'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'العرض الشامل (المخططات الثلاثة)' : 'Multi-Metric Grid (All 3)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMetric('weight')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeMetric === 'weight'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{isAr ? 'مخطط الوزن بالنسبة للعمر (WFA)' : 'Weight-for-Age'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMetric('length')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeMetric === 'length'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>{isAr ? 'مخطط الطول بالنسبة للعمر (LFA)' : 'Length-for-Age'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMetric('head')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeMetric === 'head'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>{isAr ? 'مخطط محيط الرأس (HCFA / OFC)' : 'Head Circumference'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMetric('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeMetric === 'table'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>{isAr ? 'جدول القياسات التفصيلي' : 'Measurements Table'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
            <span>{isAr ? 'قياسات الرضيع المسجلة' : 'Patient Records'}</span>
          </span>
          <span className="flex items-center gap-1 ms-2">
            <span className="w-3 h-1.5 bg-amber-400 inline-block rounded" />
            <span>P50 (Median)</span>
          </span>
          <span className="flex items-center gap-1 ms-2">
            <span className="w-3 h-2 bg-teal-100 border border-teal-300 inline-block rounded" />
            <span>P10 - P90 Zone</span>
          </span>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="space-y-4">
        {/* VIEW 1: All 3 Charts Side-by-Side Grid */}
        {activeMetric === 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart 1: Weight */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-teal-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    {isAr ? 'الوزن (كجم) • Weight (kg)' : 'Weight-for-Age (kg)'}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold">
                  {latestPercentiles.weight}th %ile
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="ageLabel" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis domain={['dataMin - 0.3', 'dataMax + 0.5']} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip content={(p) => renderCustomTooltip(p, 'kg', 'الوزن', 'Weight')} />
                    
                    {/* WHO Reference Area: P10 to P90 */}
                    <Area type="monotone" dataKey="p90" stroke="none" fill="#ccfbf1" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="p10" stroke="none" fill="#ffffff" fillOpacity={1.0} />

                    {/* WHO Standard Curves */}
                    <Line type="monotone" dataKey="p3" stroke="#cbd5e1" strokeDasharray="3 3" dot={false} strokeWidth={1} />
                    <Line type="monotone" dataKey="p50" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="p97" stroke="#cbd5e1" strokeDasharray="3 3" dot={false} strokeWidth={1} />

                    {/* Patient Actual Weight Data */}
                    <Line
                      type="monotone"
                      dataKey="patientVal"
                      name={isAr ? 'وزن الرضيع' : 'Patient Weight'}
                      stroke="#0f766e"
                      strokeWidth={2.5}
                      connectNulls
                      dot={{ r: 4, fill: '#0f766e', stroke: '#ffffff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#0d9488' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Length */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    {isAr ? 'الطول (سم) • Length (cm)' : 'Length-for-Age (cm)'}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                  {latestPercentiles.length}th %ile
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={lengthChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="ageLabel" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 2']} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip content={(p) => renderCustomTooltip(p, 'cm', 'الطول', 'Length')} />
                    
                    {/* WHO Reference Area: P10 to P90 */}
                    <Area type="monotone" dataKey="p90" stroke="none" fill="#e0e7ff" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="p10" stroke="none" fill="#ffffff" fillOpacity={1.0} />

                    {/* Standard Curves */}
                    <Line type="monotone" dataKey="p3" stroke="#cbd5e1" strokeDasharray="3 3" dot={false} strokeWidth={1} />
                    <Line type="monotone" dataKey="p50" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="p97" stroke="#cbd5e1" strokeDasharray="3 3" dot={false} strokeWidth={1} />

                    {/* Patient Actual Length Data */}
                    <Line
                      type="monotone"
                      dataKey="patientVal"
                      name={isAr ? 'طول الرضيع' : 'Patient Length'}
                      stroke="#4338ca"
                      strokeWidth={2.5}
                      connectNulls
                      dot={{ r: 4, fill: '#4338ca', stroke: '#ffffff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#4f46e5' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Head Circumference */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    {isAr ? 'محيط الرأس (سم) • OFC (cm)' : 'Head Circumference (cm)'}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded font-bold">
                  {latestPercentiles.head}th %ile
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={headChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="ageLabel" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1.5']} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip content={(p) => renderCustomTooltip(p, 'cm', 'محيط الرأس', 'Head Circumference')} />
                    
                    {/* WHO Reference Area: P10 to P90 */}
                    <Area type="monotone" dataKey="p90" stroke="none" fill="#cffafe" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="p10" stroke="none" fill="#ffffff" fillOpacity={1.0} />

                    {/* Standard Curves */}
                    <Line type="monotone" dataKey="p3" stroke="#f43f5e" strokeDasharray="3 3" dot={false} strokeWidth={1} />
                    <Line type="monotone" dataKey="p50" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="p97" stroke="#f43f5e" strokeDasharray="3 3" dot={false} strokeWidth={1} />

                    {/* Patient Actual Head Circumference Data */}
                    <Line
                      type="monotone"
                      dataKey="patientVal"
                      name={isAr ? 'محيط رأس الرضيع' : 'Head Circumference'}
                      stroke="#0891b2"
                      strokeWidth={2.5}
                      connectNulls
                      dot={{ r: 4, fill: '#0891b2', stroke: '#ffffff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#06b6d4' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Detailed Single Metric View (Weight-for-Age) */}
        {activeMetric === 'weight' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isAr ? 'منحنى الوزن بالنسبة للعمر (Weight-for-Age Percentiles - WHO)' : 'WHO Weight-for-Age Percentile Curve (0 - 90 Days)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr 
                      ? 'الشريحة الخضراء المظللة تمثل النطاق المئيني الطبيعي (المئين 10 إلى المئين 90). الخط البرتقالي يمثل متوسط منظمة الصحة العالمية (P50).' 
                      : 'The teal shaded area denotes the 10th to 90th percentile normal range. The amber line represents the 50th percentile (WHO Median).'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="bg-teal-50 text-teal-800 px-3 py-1 rounded-md border border-teal-200 font-bold">
                  {isAr ? 'الوزن الحالي:' : 'Current:'} {latestRecord?.weightKg} kg ({latestPercentiles.weight}th %ile)
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weightChartData} margin={{ top: 15, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="ageLabel" 
                    tick={{ fontSize: 11, fill: '#475569' }} 
                    label={{ value: isAr ? 'عمر الرضيع (أيام / أسابيع)' : 'Infant Age', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis 
                    domain={['dataMin - 0.2', 'dataMax + 0.6']} 
                    tick={{ fontSize: 11, fill: '#475569' }}
                    label={{ value: isAr ? 'الوزن (كيلوجرام)' : 'Weight (kg)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip content={(p) => renderCustomTooltip(p, 'kg', 'الوزن', 'Weight')} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />

                  {/* WHO Area */}
                  <Area type="monotone" dataKey="p90" name="WHO P90" stroke="none" fill="#ccfbf1" fillOpacity={0.7} />
                  <Area type="monotone" dataKey="p10" name="WHO P10" stroke="none" fill="#ffffff" fillOpacity={1.0} />

                  {/* Standard Milestone Curves */}
                  <Line type="monotone" dataKey="p3" name="WHO P3 (Severe Lower Limit)" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="p50" name="WHO P50 (Median)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p97" name="WHO P97 (Upper Limit)" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />

                  {/* Birth Weight Reference Line */}
                  {birthRecord && (
                    <ReferenceLine 
                      y={birthRecord.weightKg} 
                      stroke="#64748b" 
                      strokeDasharray="2 2" 
                      label={{ value: `${isAr ? 'وزن الولادة' : 'Birth'}: ${birthRecord.weightKg}kg`, position: 'right', fill: '#64748b', fontSize: 10 }} 
                    />
                  )}

                  {/* Patient Line */}
                  <Line
                    type="monotone"
                    dataKey="patientVal"
                    name={isAr ? `مسار وزن الرضيع (${patientName})` : `Patient Weight (${patientName})`}
                    stroke="#0f766e"
                    strokeWidth={3}
                    connectNulls
                    dot={{ r: 5, fill: '#0f766e', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: '#0d9488' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 3: Detailed Length-for-Age */}
        {activeMetric === 'length' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Ruler className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isAr ? 'منحنى الطول بالنسبة للعمر (Length-for-Age Percentiles - WHO)' : 'WHO Recumbent Length-for-Age Percentiles (0 - 90 Days)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'قياس الطول في وضعية الاستلقاء الأفقي للرضيع (Recumbent Crown-to-Heel Length).' : 'Crown-to-heel recumbent infant length monitoring.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="bg-indigo-50 text-indigo-800 px-3 py-1 rounded-md border border-indigo-200 font-bold">
                  {isAr ? 'الطول الحالي:' : 'Current:'} {latestRecord?.lengthCm} cm ({latestPercentiles.length}th %ile)
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={lengthChartData} margin={{ top: 15, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="ageLabel" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 2']} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip content={(p) => renderCustomTooltip(p, 'cm', 'الطول', 'Length')} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />

                  <Area type="monotone" dataKey="p90" name="WHO P90" stroke="none" fill="#e0e7ff" fillOpacity={0.7} />
                  <Area type="monotone" dataKey="p10" name="WHO P10" stroke="none" fill="#ffffff" fillOpacity={1.0} />

                  <Line type="monotone" dataKey="p3" name="WHO P3" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="p50" name="WHO P50 (Median)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p97" name="WHO P97" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />

                  <Line
                    type="monotone"
                    dataKey="patientVal"
                    name={isAr ? `طول الرضيع (${patientName})` : `Patient Length (${patientName})`}
                    stroke="#4338ca"
                    strokeWidth={3}
                    connectNulls
                    dot={{ r: 5, fill: '#4338ca', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: '#4f46e5' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 4: Detailed Head Circumference */}
        {activeMetric === 'head' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isAr ? 'منحنى محيط الرأس ونمو الدماغ (Head Circumference-for-Age - OFC)' : 'WHO Head Circumference-for-Age Curve (OFC)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr 
                      ? 'مؤشر حيوي لسلامة نمو الدماغ والجمجمة. الخطوط الحمراء المنقطة تمثل حدي صغر الرأس (<P3) وكبر الرأس (>P97).' 
                      : 'Cranial growth monitoring. Dotted red lines represent clinical thresholds for microcephaly (<P3) and macrocephaly (>P97).'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="bg-cyan-50 text-cyan-800 px-3 py-1 rounded-md border border-cyan-200 font-bold">
                  {isAr ? 'محيط الرأس:' : 'Current OFC:'} {latestRecord?.headCircumferenceCm} cm ({latestPercentiles.head}th %ile)
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={headChartData} margin={{ top: 15, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="ageLabel" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1.5']} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip content={(p) => renderCustomTooltip(p, 'cm', 'محيط الرأس', 'Head Circumference')} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />

                  <Area type="monotone" dataKey="p90" name="WHO P90" stroke="none" fill="#cffafe" fillOpacity={0.7} />
                  <Area type="monotone" dataKey="p10" name="WHO P10" stroke="none" fill="#ffffff" fillOpacity={1.0} />

                  <Line type="monotone" dataKey="p3" name="Microcephaly Threshold (<P3)" stroke="#f43f5e" strokeDasharray="3 3" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="p50" name="WHO P50 (Median)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p97" name="Macrocephaly Threshold (>P97)" stroke="#f43f5e" strokeDasharray="3 3" dot={false} strokeWidth={1.5} />

                  <Line
                    type="monotone"
                    dataKey="patientVal"
                    name={isAr ? `محيط رأس الرضيع (${patientName})` : `Head Circumference (${patientName})`}
                    stroke="#0891b2"
                    strokeWidth={3}
                    connectNulls
                    dot={{ r: 5, fill: '#0891b2', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: '#06b6d4' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 5: Tabular Growth Log */}
        {activeMetric === 'table' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'سجل قياسات النمو الموثقة للمولود' : 'Documented Growth Log'}</span>
              </h3>
              <span className="text-xs font-mono text-slate-500">
                {sortedRecords.length} {isAr ? 'قياسات مسجلة' : 'records'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-3 text-start">{isAr ? 'العمر الزمني' : 'Age (Days)'}</th>
                    <th className="p-3 text-start">{isAr ? 'تاريخ ووقت القياس' : 'Date / Time'}</th>
                    <th className="p-3 text-start">{isAr ? 'الوزن (كجم / %ile)' : 'Weight (kg / %ile)'}</th>
                    <th className="p-3 text-start">{isAr ? 'الطول (سم / %ile)' : 'Length (cm / %ile)'}</th>
                    <th className="p-3 text-start">{isAr ? 'محيط الرأس (سم / %ile)' : 'OFC (cm / %ile)'}</th>
                    <th className="p-3 text-start">{isAr ? 'نمط التغذية' : 'Feeding Modality'}</th>
                    <th className="p-3 text-start">{isAr ? 'ملاحظات النمو والتعافي' : 'Clinical Notes'}</th>
                    <th className="p-3 text-start">{isAr ? 'المسجل' : 'Staff'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRecords.map((r, idx) => {
                    const wp = calculatePercentile(r.weightKg, r.ageDays, 'weightKg', selectedGender);
                    const lp = calculatePercentile(r.lengthCm, r.ageDays, 'lengthCm', selectedGender);
                    const hp = calculatePercentile(r.headCircumferenceCm, r.ageDays, 'headCircumferenceCm', selectedGender);

                    return (
                      <tr key={r.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-bold text-slate-900">
                          {r.ageLabel || `Day ${r.ageDays}`}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {new Date(r.timestamp).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}{' '}
                          {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <strong className="font-mono text-slate-900">{r.weightKg} kg</strong>
                          <span className="ms-1.5 text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            P{wp}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-medium text-slate-800">{r.lengthCm} cm</span>
                          <span className="ms-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            P{lp}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-medium text-slate-800">{r.headCircumferenceCm} cm</span>
                          <span className="ms-1.5 text-[10px] font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                            P{hp}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Milk className="w-3 h-3 text-emerald-600" />
                            <span>
                              {r.feedingType === 'exclusive_breastfeeding' 
                                ? (isAr ? 'رضاعة طبيعية حصرية' : 'Exclusive Breastfeeding') 
                                : r.feedingType === 'formula'
                                  ? (isAr ? 'حليب صناعي' : 'Formula')
                                  : (isAr ? 'تغذية مختلطة' : 'Mixed')}
                            </span>
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs">
                          {r.notes || '-'}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {r.recordedBy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add New Measurement */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-teal-800 to-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-teal-300" />
                <h3 className="font-bold text-sm">
                  {isAr ? 'تسجيل قياس نمو جديد للمولود' : 'Record New Pediatric Growth Measurement'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-300 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMeasurement} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'عمر الرضيع بالأيام (Age in Days):' : 'Age in Days:'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    required
                    value={formAgeDays}
                    onChange={(e) => setFormAgeDays(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {formAgeDays === 0 ? (isAr ? 'يوم الولادة (0)' : 'Day of birth') : `${isAr ? 'اليوم' : 'Day'} ${formAgeDays}`}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'معيار الجنس (WHO Gender):' : 'WHO Gender Standard:'}
                  </label>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-medium"
                  >
                    <option value="female">♀ {isAr ? 'أنثى (WHO Girls)' : 'Female (Girls)'}</option>
                    <option value="male">♂ {isAr ? 'ذكر (WHO Boys)' : 'Male (Boys)'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'الوزن (كجم):' : 'Weight (kg):'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.0"
                    max="15.0"
                    required
                    value={formWeightKg}
                    onChange={(e) => setFormWeightKg(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:ring-2 focus:ring-teal-500"
                    placeholder="3.35"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {parseFloat(formWeightKg) ? `${(parseFloat(formWeightKg) * 1000).toFixed(0)} g` : ''}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'الطول (سم):' : 'Length (cm):'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="35.0"
                    max="80.0"
                    required
                    value={formLengthCm}
                    onChange={(e) => setFormLengthCm(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:ring-2 focus:ring-teal-500"
                    placeholder="49.5"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {isAr ? 'أفقي (Crown-heel)' : 'Recumbent'}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'محيط الرأس (سم):' : 'Head OFC (cm):'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="25.0"
                    max="55.0"
                    required
                    value={formHeadCm}
                    onChange={(e) => setFormHeadCm(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:ring-2 focus:ring-teal-500"
                    placeholder="34.0"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {isAr ? 'محيط الجبهة' : 'Frontal-Occipital'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'نمط التغذية (Feeding Modality):' : 'Feeding Modality:'}
                </label>
                <select
                  value={formFeeding}
                  onChange={(e) => setFormFeeding(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                >
                  <option value="exclusive_breastfeeding">{isAr ? 'رضاعة طبيعية حصرية (Exclusive Breastfeeding)' : 'Exclusive Breastfeeding'}</option>
                  <option value="formula">{isAr ? 'حليب أطفال صناعي (Infant Formula)' : 'Infant Formula'}</option>
                  <option value="mixed">{isAr ? 'تغذية مختلطة (طبيعي + صناعي)' : 'Mixed Feeding'}</option>
                  <option value="tpm_iv">{isAr ? 'تغذية وريدية كاملة (TPN / NICU)' : 'TPN / IV Fluids'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'الملاحظات السريرية والفحص (Clinical Notes):' : 'Clinical Notes:'}
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={isAr ? 'حالة اليافوخ، نشاط المص، علامات الجفاف، اليرقان، التبرز...' : 'Fontanelles status, rooting reflex, jaundice, stools...'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ وتثبيت القياس' : 'Save Measurement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
