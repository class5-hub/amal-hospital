import React, { useState } from 'react';
import { 
  Calendar, 
  Baby, 
  Clock, 
  Activity, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Eye, 
  Stethoscope, 
  ChevronRight,
  ChevronLeft,
  Info
} from 'lucide-react';
import { Patient, ClinicalAssessment, Language } from '../types/hmis.ts';

interface UltrasoundExamSummary {
  id: string;
  date: string;
  gaAtExam: string;
  bpdMm: number; // Biparietal diameter
  flMm: number;  // Femur length
  acMm: number;  // Abdominal circumference
  efwGrams: number; // Estimated fetal weight
  placentaLocation: string;
  placentaGrade: string;
  amnioticFluidAfiCm: number;
  presentation: string;
  sonographer: string;
  keyFindingsAr: string;
  keyFindingsEn: string;
  isNormal: boolean;
}

interface ObstetricMilestone {
  week: number;
  titleAr: string;
  titleEn: string;
  category: 'first_trimester' | 'second_trimester' | 'third_trimester' | 'term';
  descriptionAr: string;
  descriptionEn: string;
  recommendedTestsAr: string[];
  recommendedTestsEn: string[];
}

interface PregnancyTimelineProps {
  currentPatient: Patient;
  assessment: ClinicalAssessment | null;
  language: Language;
}

export const PregnancyTimeline: React.FC<PregnancyTimelineProps> = ({
  currentPatient,
  assessment,
  language
}) => {
  const isAr = language === 'ar';
  const obGyn = assessment?.obGyn;

  // Gestational Age & Dates calculations
  const lmpStr = obGyn?.lmp || '2026-03-12';
  const eddStr = obGyn?.edd || '2026-12-17';
  const currentGaWeeks = obGyn?.gestationalAgeWeeks ?? 34;
  const currentGaDays = obGyn?.gestationalAgeDays ?? 2;

  // Selected Trimester filter
  const [selectedTrimester, setSelectedTrimester] = useState<'all' | '1' | '2' | '3'>('all');
  const [showUsDetails, setShowUsDetails] = useState<string | null>(null);

  // Standard Key Obstetric Milestones
  const milestones: ObstetricMilestone[] = [
    {
      week: 8,
      titleAr: 'تأكيد نبض الجنين والتوطين الرحمي',
      titleEn: 'Viability & Early Dating Scan',
      category: 'first_trimester',
      descriptionAr: 'تأكيد وجود كيس الحمل داخل الرحم، وسماع نبض الجنين، وقياس الطول التاجي المقعدي (CRL).',
      descriptionEn: 'Intrauterine gestational sac verification, embryonic cardiac activity, and CRL dating.',
      recommendedTestsAr: ['CBC', 'Blood Group & Rh', 'Rubella IgG', 'Urine Analysis'],
      recommendedTestsEn: ['CBC', 'Blood Group & Rh', 'Rubella IgG', 'Urine Analysis']
    },
    {
      week: 12,
      titleAr: 'فحص الشفافية القفوية والتشوهات المبكرة (NT)',
      titleEn: 'First Trimester Combined Screening / NT Scan',
      category: 'first_trimester',
      descriptionAr: 'قياس سماكة الرقبة الجنينية NT وفحص عظم الأنف للكشف المبكر عن متلازمة داون.',
      descriptionEn: 'Nuchal translucency measurement and nasal bone assessment for aneuploidy risk.',
      recommendedTestsAr: ['Combined First Trimester Screen / Double Marker', 'NIPT (إذا لزم)'],
      recommendedTestsEn: ['Double Marker (PAPP-A & Free hCG)', 'NIPT Cell-Free DNA']
    },
    {
      week: 20,
      titleAr: 'سونار تفصيلي لتشريح أعضاء الجنين (Anomaly Scan)',
      titleEn: 'Detailed Fetal Anomaly Scan (Level II)',
      category: 'second_trimester',
      descriptionAr: 'فحص شامل لقلب الجنين، الدماغ، العمود الفقري، الكليتين، الأطراف وموقع المشيمة.',
      descriptionEn: 'Comprehensive structural anatomy scan of brain, cardiac 4-chambers, spine, kidneys, and placenta.',
      recommendedTestsAr: ['Anomaly Ultrasound Report', 'Mid-trimester Cervical Length'],
      recommendedTestsEn: ['Detailed Morphology Scan', 'Cervical Length Assessment']
    },
    {
      week: 26,
      titleAr: 'فحص سكري الحمل وأجسام مضادة Rh',
      titleEn: 'Gestational Diabetes (GTT) & Anti-D Screening',
      category: 'second_trimester',
      descriptionAr: 'اختبار تحمل الغلوكوز (OGTT 75g) وحقن إبرة Anti-D للأمهات ذوات فصيلة دم سالبة (Rh-negative).',
      descriptionEn: '75g 2-hour Oral Glucose Tolerance Test and Anti-D prophylaxis evaluation.',
      recommendedTestsAr: ['OGTT 75g', 'Indirect Coombs Test (إذا Rh-)', 'CBC (Hemoglobin)'],
      recommendedTestsEn: ['OGTT 75g', 'Indirect Coombs Test', 'Hemoglobin / Ferritin']
    },
    {
      week: 32,
      titleAr: 'سونار تقييم النمو وحجم الجنين والمشيمة',
      titleEn: 'Third Trimester Fetal Growth & Doppler Scan',
      category: 'third_trimester',
      descriptionAr: 'تقدير وزن الجنين (EFW)، كمية السائل الأمنيوسي (AFI)، ومقاومة شرايين الحبل السري (Umbilical Doppler).',
      descriptionEn: 'Estimated fetal weight trajectory, amniotic fluid volume (AFI), and umbilical artery Doppler indices.',
      recommendedTestsAr: ['Growth Ultrasound', 'Umbilical Artery PI/RI', 'BP & Urine Protein Check'],
      recommendedTestsEn: ['Growth Ultrasound', 'Umbilical Doppler', 'Pre-eclampsia Screen']
    },
    {
      week: 36,
      titleAr: 'تحديد وضعية المجيء وخطة الولادة (GBS Screen)',
      titleEn: 'Presentation & Group B Streptococcus Screening',
      category: 'third_trimester',
      descriptionAr: 'تأكيد المجيء الرأسي أو المقعدي، مسحة المهبل GBS، واعتماد الخطة الجراحية للقيصرية أو الطبيعية.',
      descriptionEn: 'Confirmation of cephalic/breech presentation, vaginal-rectal GBS swab, and mode-of-delivery planning.',
      recommendedTestsAr: ['GBS Swab', 'Coagulation Profile', 'Anesthesia Consultation'],
      recommendedTestsEn: ['GBS Swab', 'Coagulation Screen', 'Anesthetic Assessment']
    },
    {
      week: 39,
      titleAr: 'اكتمال النضج الجنيني وموعد الولادة المحدد',
      titleEn: 'Full Term & Delivery Window',
      category: 'term',
      descriptionAr: 'تمام الحمل، مراقبة تخطيط قلب الجنين CTG ومؤشرات المخاض النشط.',
      descriptionEn: 'Full term delivery threshold, non-stress test (NST/CTG) surveillance, and active labor triage.',
      recommendedTestsAr: ['Cardiotocography (CTG)', 'Biophysical Profile (BPP)'],
      recommendedTestsEn: ['Electronic Fetal Monitoring (CTG)', 'Biophysical Profile']
    }
  ];

  // Serial Ultrasound Reports (Derived & Mocked based on patient admission)
  const ultrasoundReports: UltrasoundExamSummary[] = [
    {
      id: 'us-3',
      date: '2026-11-06',
      gaAtExam: `${currentGaWeeks} weeks ${currentGaDays} days`,
      bpdMm: 85,
      flMm: 66,
      acMm: 305,
      efwGrams: 2350,
      placentaLocation: 'Posterior Low-Lying (Margin 2.1 cm from internal os)',
      placentaGrade: 'Grade II maturity',
      amnioticFluidAfiCm: 14.2,
      presentation: obGyn?.currentPregnancyDetails?.presentation || 'Cephalic',
      sonographer: 'د. عادل الفيتوري (استشاري تصوير نسائي)',
      keyFindingsAr: 'جنين مفرد حي بوضعية رأسية، نبض القلب 148 نبضة/دقيقة تفاعلي، المشيمة خلفية منخفضة ولكنها تبعد 2.1 سم عن عنق الرحم (تسمح بالمراقبة الحذرة)، تدفق الدم عبر الشريان السري طبيعي بدون علامات قصور مشيمي.',
      keyFindingsEn: 'Single live intrauterine gestation in cephalic presentation. FHR 148 bpm. Low-lying posterior placenta clear of os by 21mm. Normal umbilical artery Doppler waveforms (RI: 0.58).',
      isNormal: true
    },
    {
      id: 'us-2',
      date: '2026-08-14',
      gaAtExam: '22 weeks 0 days',
      bpdMm: 54,
      flMm: 39,
      acMm: 178,
      efwGrams: 490,
      placentaLocation: 'Posterior',
      placentaGrade: 'Grade I',
      amnioticFluidAfiCm: 15.0,
      presentation: 'Variable / Transverse',
      sonographer: 'د. هدى المنصوري',
      keyFindingsAr: 'فحص تشريح الأعضاء التفصيلي طبيعي بالكامل، الحجرات الأربع للقلب متناظرة، الكليتان والدماغ سليم، الحبل السري ثلاثي الأوعية (3-vessel cord).',
      keyFindingsEn: 'Detailed anatomical survey normal. Symmetrical intracranial ventricles, four-chamber cardiac view intact, three-vessel umbilical cord.',
      isNormal: true
    },
    {
      id: 'us-1',
      date: '2026-05-22',
      gaAtExam: '12 weeks 4 days',
      bpdMm: 21,
      flMm: 8,
      acMm: 62,
      efwGrams: 58,
      placentaLocation: 'Posterior Fundal',
      placentaGrade: 'Grade 0',
      amnioticFluidAfiCm: 12.0,
      presentation: 'Unfixed',
      sonographer: 'د. طارق بن عامر',
      keyFindingsAr: 'سماكة الشفافية القفوية NT طبيعية (1.3 ملم)، عظم الأنف موجود ومرئي، القياسات تطابق تاريخ آخر دورة شهرية.',
      keyFindingsEn: 'Nuchal translucency measured at 1.3 mm (low risk). Nasal bone visualized. Crown-rump length matches LMP dating.',
      isNormal: true
    }
  ];

  // Trimester percentage calculation
  const progressPercent = Math.min(100, Math.round((currentGaWeeks / 40) * 100));
  const currentTrimester = currentGaWeeks < 13 ? 1 : currentGaWeeks < 28 ? 2 : 3;

  const filteredMilestones = milestones.filter(m => {
    if (selectedTrimester === '1') return m.category === 'first_trimester';
    if (selectedTrimester === '2') return m.category === 'second_trimester';
    if (selectedTrimester === '3') return m.category === 'third_trimester' || m.category === 'term';
    return true;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Baby className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {isAr ? 'المخطط الزمني للحمل وتقارير السونار (Pregnancy Timeline)' : 'Obstetric Pregnancy Timeline & Ultrasound'}
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                {isAr ? `الثلث ${currentTrimester === 1 ? 'الأول' : currentTrimester === 2 ? 'الثاني' : 'الثالث'}` : `Trimester ${currentTrimester}`}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {isAr 
                ? 'حساب عمر الحمل الدقيق، تتبع المحطات السريرية والفحوصات الموصى بها، وسجل قياسات السونار التراكمي' 
                : 'Gestational age calculations, clinical milestones timeline, and serial ultrasound biometric reports'}
            </p>
          </div>
        </div>

        {/* Trimester Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setSelectedTrimester('all')}
            className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
              selectedTrimester === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'كافة المراحل' : 'All Trimesters'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedTrimester('1')}
            className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
              selectedTrimester === '1' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'الثلث 1 (1-12)' : 'T1 (1-12w)'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedTrimester('2')}
            className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
              selectedTrimester === '2' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'الثلث 2 (13-27)' : 'T2 (13-27w)'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedTrimester('3')}
            className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
              selectedTrimester === '3' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'الثلث 3 (28-40)' : 'T3 (28-40w)'}
          </button>
        </div>
      </div>

      {/* Gestational Age KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
          <span className="text-slate-500 block mb-0.5">{isAr ? 'عمر الحمل الحالي (GA):' : 'Gestational Age:'}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-teal-700 font-mono">{currentGaWeeks}</span>
            <span className="text-xs text-slate-600 font-medium">{isAr ? 'أسبوع +' : 'w +'}</span>
            <span className="text-lg font-bold text-teal-700 font-mono">{currentGaDays}</span>
            <span className="text-xs text-slate-600 font-medium">{isAr ? 'يوم' : 'd'}</span>
          </div>
          <span className="text-[10px] text-teal-700 font-medium mt-1 block">
            {progressPercent}% {isAr ? 'من فترة الحمل الإجمالية' : 'of 40 weeks'}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
          <span className="text-slate-500 block mb-0.5">{isAr ? 'الموعد المتوقع للولادة (EDD):' : 'Estimated Due Date:'}</span>
          <span className="text-base font-bold text-slate-900 font-mono block">{eddStr}</span>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {isAr ? 'حسب قاعدة نايجل (Naegele)' : 'Naegele Rule Calculation'}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
          <span className="text-slate-500 block mb-0.5">{isAr ? 'آخر دورة شهرية (LMP):' : 'Last Menstrual Period:'}</span>
          <span className="text-base font-bold text-slate-900 font-mono block">{lmpStr}</span>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {isAr ? 'تاريخ بداية الحمل المعتمد' : 'Reliable menstrual dating'}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
          <span className="text-slate-500 block mb-0.5">{isAr ? 'الوزن الجنيني التقديري (EFW):' : 'Est. Fetal Weight:'}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-indigo-700 font-mono">2,350</span>
            <span className="text-xs text-slate-600 font-medium">{isAr ? 'جرام' : 'grams'}</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium mt-1 block">
            {isAr ? 'مؤشر النمو: المئين 50 (طبيعي)' : '50th percentile (Appropriate)'}
          </span>
        </div>
      </div>

      {/* Visual Pregnancy Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
            <span>{isAr ? 'مسار تقدم الحمل عبر الأسابيع الأربعين' : 'Pregnancy Progress (40 Weeks)'}</span>
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            {isAr ? `الأسبوع ${currentGaWeeks} من 40` : `Week ${currentGaWeeks} of 40`}
          </span>
        </div>

        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex relative border border-slate-200">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-full transition-all duration-500" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
          <span>{isAr ? 'الأسبوع 0 (LMP)' : '0w'}</span>
          <span>{isAr ? '12 أسبوع (T1)' : '12w'}</span>
          <span>{isAr ? '20 أسبوع (سونار تشريحي)' : '20w'}</span>
          <span>{isAr ? '28 أسبوع (T3)' : '28w'}</span>
          <span className="font-bold text-teal-700">{isAr ? '40 أسبوع (الولادة EDD)' : '40w EDD'}</span>
        </div>
      </div>

      {/* Main Grid: Milestones Timeline (Left) & Serial Ultrasound Biometry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* SECTION 1: Key Obstetric Milestones Timeline */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>{isAr ? 'المحطات السريرية ومواعيد الفحوصات الإلزامية' : 'Obstetric Milestones & Screenings'}</span>
          </h4>

          <div className="relative border-r rtl:border-r ltr:border-l border-slate-200 rtl:pr-4 ltr:pl-4 space-y-4">
            {filteredMilestones.map((m) => {
              const isPassed = currentGaWeeks >= m.week;
              const isCurrent = Math.abs(currentGaWeeks - m.week) <= 2;

              return (
                <div key={m.week} className="relative group">
                  {/* Timeline bullet dot */}
                  <div className={`absolute rtl:-right-[21px] ltr:-left-[21px] top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    isCurrent
                      ? 'bg-teal-500 border-white ring-4 ring-teal-100 animate-pulse'
                      : isPassed
                      ? 'bg-emerald-600 border-white'
                      : 'bg-white border-slate-300'
                  }`} />

                  <div className={`p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-teal-50/70 border-teal-300 shadow-2xs'
                      : isPassed
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-dashed border-slate-200 opacity-75'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        isCurrent
                          ? 'bg-teal-600 text-white'
                          : isPassed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isAr ? `الأسبوع ${m.week}` : `Week ${m.week}`}
                      </span>

                      <span className="text-[10px] font-medium text-slate-500">
                        {isPassed ? (
                          <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            {isAr ? 'تم الإنجاز' : 'Completed'}
                          </span>
                        ) : isCurrent ? (
                          <span className="text-teal-700 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {isAr ? 'المرحلة الحالية' : 'Current Window'}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {isAr ? 'مستقبلي' : 'Upcoming'}
                          </span>
                        )}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold text-slate-900 mt-1.5">
                      {isAr ? m.titleAr : m.titleEn}
                    </h5>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {isAr ? m.descriptionAr : m.descriptionEn}
                    </p>

                    {/* Recommended investigations pills */}
                    <div className="mt-2 pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                        {isAr ? 'الفحوصات المقترحة:' : 'Recommended Tests:'}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(isAr ? m.recommendedTestsAr : m.recommendedTestsEn).map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-slate-200 text-slate-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Serial Ultrasound Reports & Fetal Biometry */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>{isAr ? 'سجل تقارير السونار والقياسات الحيوية الجنينية' : 'Ultrasound Biometry & Doppler Reports'}</span>
          </h4>

          <div className="space-y-3">
            {ultrasoundReports.map((us) => {
              const isExpanded = showUsDetails === us.id;

              return (
                <div
                  key={us.id}
                  className={`bg-white border rounded-xl transition-all shadow-2xs overflow-hidden ${
                    us.id === 'us-3' ? 'border-teal-300 ring-1 ring-teal-100' : 'border-slate-200'
                  }`}
                >
                  <div 
                    onClick={() => setShowUsDetails(isExpanded ? null : us.id)}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3 select-none"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{us.date}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {us.gaAtExam}
                        </span>
                        {us.id === 'us-3' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 border border-teal-200">
                            {isAr ? 'الأحدث' : 'Latest'}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        {us.sonographer}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">{isAr ? 'الوزن المقدر' : 'EFW'}</span>
                        <strong className="text-xs font-mono text-teal-800">{us.efwGrams} g</strong>
                      </div>
                      <div className="text-slate-400 hover:text-slate-600">
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>
                  </div>

                  {/* Biometric Indices Summary Table */}
                  <div className="p-3.5 border-t border-slate-100 space-y-3 text-xs">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-mono">BPD</span>
                        <strong className="font-mono text-slate-800 text-xs">{us.bpdMm} mm</strong>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-mono">FL</span>
                        <strong className="font-mono text-slate-800 text-xs">{us.flMm} mm</strong>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-mono">AC</span>
                        <strong className="font-mono text-slate-800 text-xs">{us.acMm} mm</strong>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-mono">AFI</span>
                        <strong className="font-mono text-teal-700 text-xs">{us.amnioticFluidAfiCm} cm</strong>
                      </div>
                    </div>

                    {/* Placenta & Presentation */}
                    <div className="bg-slate-50/80 rounded-lg p-2.5 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{isAr ? 'موقع ونضج المشيمة:' : 'Placenta:'}</span>
                        <span className="font-semibold text-slate-800">{us.placentaLocation} ({us.placentaGrade})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{isAr ? 'وضعية المجيء الجنيني:' : 'Presentation:'}</span>
                        <span className="font-semibold text-slate-800">{us.presentation}</span>
                      </div>
                    </div>

                    {/* Report Narrative */}
                    <div className="p-2.5 bg-teal-50/40 border border-teal-200/60 rounded-lg">
                      <span className="text-[10px] font-bold text-teal-900 block mb-0.5">
                        {isAr ? 'الخلاصة والتوصيات السريرية:' : 'Clinical Findings:'}
                      </span>
                      <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                        {isAr ? us.keyFindingsAr : us.keyFindingsEn}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
