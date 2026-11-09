import { VitalSigns, LabOrder, ClinicalAssessment } from '../types/hmis.ts';

export type TriageUrgencyLevel = 'critical' | 'urgent' | 'stable' | 'pending';

export interface TriageTrigger {
  id: string;
  source: 'vitals' | 'lab';
  parameter: string;
  value: string | number;
  threshold: string;
  severity: 'critical' | 'urgent';
  messageAr: string;
  messageEn: string;
}

export interface TriageAssessmentResult {
  level: TriageUrgencyLevel;
  score: number;
  triggers: TriageTrigger[];
  latestVitals?: VitalSigns;
  criticalLabsCount: number;
  abnormalLabsCount: number;
  summaryAr: string;
  summaryEn: string;
  recommendationAr: string;
  recommendationEn: string;
  timestamp?: string;
}

/**
 * Evaluates patient clinical urgency & triage status based on:
 * 1. Modified Early Obstetric Warning Score (MEOWS) / NEWS2 vital sign thresholds
 * 2. Laboratory Information System (LIS) critical panic values and abnormal findings
 */
export function evaluatePatientTriage(
  assessment: ClinicalAssessment | null | undefined,
  labOrders: LabOrder[] = []
): TriageAssessmentResult {
  const triggers: TriageTrigger[] = [];
  let score = 0;
  let criticalLabsCount = 0;
  let abnormalLabsCount = 0;

  // 1. Get latest recorded vitals
  let latestVitals: VitalSigns | undefined = undefined;
  if (assessment?.vitals && assessment.vitals.length > 0) {
    // Sort descending by timestamp or id
    const sorted = [...assessment.vitals].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
    latestVitals = sorted[0];
  }

  // 2. Evaluate Vital Signs if present
  if (latestVitals) {
    const { bpSystolic, bpDiastolic, pulse, respRate, temp, spO2, consciousness, painScale } = latestVitals;

    // Blood Pressure - Systolic
    if (bpSystolic >= 160) {
      score += 3;
      triggers.push({
        id: 'vit-sbp-crit-high',
        source: 'vitals',
        parameter: 'BP Systolic',
        value: `${bpSystolic} mmHg`,
        threshold: '≥ 160 mmHg',
        severity: 'critical',
        messageAr: `ارتفاع حرج في الضغط الانقباضي (${bpSystolic} مم زئبق) - اشتباه تسمم حمل حاد / أزمة فرط ضغط`,
        messageEn: `Critical Systolic Hypertension (${bpSystolic} mmHg) - Severe Preeclampsia / Hypertensive Crisis`
      });
    } else if (bpSystolic <= 90) {
      score += 3;
      triggers.push({
        id: 'vit-sbp-crit-low',
        source: 'vitals',
        parameter: 'BP Systolic',
        value: `${bpSystolic} mmHg`,
        threshold: '≤ 90 mmHg',
        severity: 'critical',
        messageAr: `انخفاض حاد في الضغط الانقباضي (${bpSystolic} مم زئبق) - اشتباه صدمة أو نزيف`,
        messageEn: `Critical Hypotension (${bpSystolic} mmHg) - Shock / Hemorrhage Warning`
      });
    } else if (bpSystolic >= 140) {
      score += 2;
      triggers.push({
        id: 'vit-sbp-urg-high',
        source: 'vitals',
        parameter: 'BP Systolic',
        value: `${bpSystolic} mmHg`,
        threshold: '140-159 mmHg',
        severity: 'urgent',
        messageAr: `ارتفاع ضغط الدم الانقباضي (${bpSystolic} مم زئبق) - يتطلب مراقبة بروتين البول`,
        messageEn: `Systolic Hypertension (${bpSystolic} mmHg) - Monitor Preeclampsia Profile`
      });
    } else if (bpSystolic < 100) {
      score += 1;
      triggers.push({
        id: 'vit-sbp-urg-low',
        source: 'vitals',
        parameter: 'BP Systolic',
        value: `${bpSystolic} mmHg`,
        threshold: '< 100 mmHg',
        severity: 'urgent',
        messageAr: `انخفاض طفيف في الضغط الانقباضي (${bpSystolic} مم زئبق)`,
        messageEn: `Mildly Low Systolic BP (${bpSystolic} mmHg)`
      });
    }

    // Blood Pressure - Diastolic
    if (bpDiastolic >= 110) {
      score += 3;
      triggers.push({
        id: 'vit-dbp-crit-high',
        source: 'vitals',
        parameter: 'BP Diastolic',
        value: `${bpDiastolic} mmHg`,
        threshold: '≥ 110 mmHg',
        severity: 'critical',
        messageAr: `ارتفاع حاد في الضغط الانبساطي (${bpDiastolic} مم زئبق) - خطر وذمة دماغية واختلاج`,
        messageEn: `Critical Diastolic Hypertension (${bpDiastolic} mmHg) - Severe Preeclampsia Hazard`
      });
    } else if (bpDiastolic >= 90 && bpSystolic < 160) {
      score += 2;
      triggers.push({
        id: 'vit-dbp-urg-high',
        source: 'vitals',
        parameter: 'BP Diastolic',
        value: `${bpDiastolic} mmHg`,
        threshold: '90-109 mmHg',
        severity: 'urgent',
        messageAr: `ارتفاع ضغط الدم الانبساطي (${bpDiastolic} مم زئبق)`,
        messageEn: `Elevated Diastolic BP (${bpDiastolic} mmHg)`
      });
    }

    // Heart Rate / Pulse
    if (pulse >= 120) {
      score += 3;
      triggers.push({
        id: 'vit-hr-crit-high',
        source: 'vitals',
        parameter: 'Pulse / HR',
        value: `${pulse} bpm`,
        threshold: '≥ 120 bpm',
        severity: 'critical',
        messageAr: `تسارع قلبي حاد (${pulse} نبضة/د) - استبعاد النزف الحاد أو الصمّة الرئوية`,
        messageEn: `Severe Tachycardia (${pulse} bpm) - Exclude Hemorrhage or Embolism`
      });
    } else if (pulse <= 50) {
      score += 3;
      triggers.push({
        id: 'vit-hr-crit-low',
        source: 'vitals',
        parameter: 'Pulse / HR',
        value: `${pulse} bpm`,
        threshold: '≤ 50 bpm',
        severity: 'critical',
        messageAr: `تباطؤ قلبي شديد (${pulse} نبضة/د) - تقييم إحصار القلب أو التخدير`,
        messageEn: `Severe Bradycardia (${pulse} bpm) - Cardiac/Anesthesia Assessment Required`
      });
    } else if (pulse >= 100) {
      score += 1;
      triggers.push({
        id: 'vit-hr-urg-high',
        source: 'vitals',
        parameter: 'Pulse / HR',
        value: `${pulse} bpm`,
        threshold: '100-119 bpm',
        severity: 'urgent',
        messageAr: `تسارع في النبض (${pulse} نبضة/د)`,
        messageEn: `Mild Tachycardia (${pulse} bpm)`
      });
    } else if (pulse <= 59) {
      score += 1;
      triggers.push({
        id: 'vit-hr-urg-low',
        source: 'vitals',
        parameter: 'Pulse / HR',
        value: `${pulse} bpm`,
        threshold: '51-59 bpm',
        severity: 'urgent',
        messageAr: `نبض بطيء نسبياً (${pulse} نبضة/د)`,
        messageEn: `Borderline Low Pulse (${pulse} bpm)`
      });
    }

    // Respiratory Rate
    if (respRate >= 28) {
      score += 3;
      triggers.push({
        id: 'vit-rr-crit-high',
        source: 'vitals',
        parameter: 'Resp Rate',
        value: `${respRate} /min`,
        threshold: '≥ 28 /min',
        severity: 'critical',
        messageAr: `تسارع تنفسي حاد (${respRate} د/د) - ضائقة تنفسية حادة أو حمّاض استقلابي`,
        messageEn: `Severe Tachypnea (${respRate} /min) - Severe Respiratory Distress / Acidosis`
      });
    } else if (respRate <= 10) {
      score += 3;
      triggers.push({
        id: 'vit-rr-crit-low',
        source: 'vitals',
        parameter: 'Resp Rate',
        value: `${respRate} /min`,
        threshold: '≤ 10 /min',
        severity: 'critical',
        messageAr: `تباطؤ تنفسي حرج (${respRate} د/د) - اشتباه تثبيط تنفسي دوائي`,
        messageEn: `Severe Bradypnea (${respRate} /min) - Opioid/Sedative Depression Risk`
      });
    } else if (respRate >= 21) {
      score += 2;
      triggers.push({
        id: 'vit-rr-urg-high',
        source: 'vitals',
        parameter: 'Resp Rate',
        value: `${respRate} /min`,
        threshold: '21-27 /min',
        severity: 'urgent',
        messageAr: `تسارع معدل التنفس (${respRate} د/د)`,
        messageEn: `Tachypnea (${respRate} /min)`
      });
    }

    // Oxygen Saturation SpO2
    if (spO2 < 92) {
      score += 3;
      triggers.push({
        id: 'vit-spo2-crit',
        source: 'vitals',
        parameter: 'SpO2',
        value: `${spO2}%`,
        threshold: '< 92%',
        severity: 'critical',
        messageAr: `نقص أكسجين حاد (${spO2}%) - يتطلب دعم فوري بالأكسجين وتقييم الصدر`,
        messageEn: `Critical Hypoxemia (${spO2}%) - Immediate O2 Therapy & Chest Evaluation`
      });
    } else if (spO2 <= 94) {
      score += 2;
      triggers.push({
        id: 'vit-spo2-urg',
        source: 'vitals',
        parameter: 'SpO2',
        value: `${spO2}%`,
        threshold: '92-94%',
        severity: 'urgent',
        messageAr: `انخفاض طفيف في تشبع الأكسجين (${spO2}%)`,
        messageEn: `Mild Desaturation (${spO2}%)`
      });
    }

    // Temperature
    if (temp >= 38.5) {
      score += 3;
      triggers.push({
        id: 'vit-temp-crit-high',
        source: 'vitals',
        parameter: 'Temperature',
        value: `${temp}°C`,
        threshold: '≥ 38.5°C',
        severity: 'critical',
        messageAr: `حمى شديدة (${temp}°C) - تفعيل بروتوكول الإنتان السريري (Sepsis)`,
        messageEn: `High Fever (${temp}°C) - Sepsis Protocol Evaluation`
      });
    } else if (temp <= 35.5) {
      score += 3;
      triggers.push({
        id: 'vit-temp-crit-low',
        source: 'vitals',
        parameter: 'Temperature',
        value: `${temp}°C`,
        threshold: '≤ 35.5°C',
        severity: 'critical',
        messageAr: `انخفاض حرارة حاد (${temp}°C) - تدفئة نشطة واستبعاد الصدمة`,
        messageEn: `Hypothermia (${temp}°C) - Active Warming & Shock Evaluation`
      });
    } else if (temp >= 37.8) {
      score += 1;
      triggers.push({
        id: 'vit-temp-urg',
        source: 'vitals',
        parameter: 'Temperature',
        value: `${temp}°C`,
        threshold: '37.8-38.4°C',
        severity: 'urgent',
        messageAr: `ارتفاع طفيف في درجة الحرارة (${temp}°C)`,
        messageEn: `Subfebrile Pyrexia (${temp}°C)`
      });
    }

    // Consciousness
    if (consciousness && consciousness !== 'Alert') {
      score += 3;
      triggers.push({
        id: 'vit-avpu-crit',
        source: 'vitals',
        parameter: 'Consciousness',
        value: consciousness,
        threshold: 'Not Alert',
        severity: 'critical',
        messageAr: `تغير في مستوى الوعي والاستجابة (${consciousness})`,
        messageEn: `Altered Mental Status / Decreased Responsiveness (${consciousness})`
      });
    }

    // Pain Scale
    if (painScale >= 8) {
      score += 2;
      triggers.push({
        id: 'vit-pain-urg',
        source: 'vitals',
        parameter: 'Pain Scale',
        value: `${painScale}/10`,
        threshold: '≥ 8/10',
        severity: 'urgent',
        messageAr: `ألم سريري حاد (${painScale}/10) - يتطلب مراجعة بروتوكول المسكنات`,
        messageEn: `Severe Pain Score (${painScale}/10) - Analgesic Review Required`
      });
    }
  }

  // 3. Evaluate Lab Results (Critical Panic Values & Abnormalities)
  for (const order of labOrders) {
    if (order.status === 'cancelled') continue;

    for (const res of order.results || []) {
      const numVal = typeof res.value === 'number' ? res.value : parseFloat(res.value as string);
      const isExplicitCrit = res.isCritical === true;
      const isExplicitAbnormal = res.isAbnormal === true;

      // Clinical heuristic checks if explicit flag missing or true
      let inferredCritical = isExplicitCrit;
      let inferredAbnormal = isExplicitAbnormal;
      let criticalNote = '';

      const testLower = (res.name || '').toLowerCase();

      // Hemoglobin (Hb)
      if (testLower.includes('hemoglobin') || testLower.includes('hb')) {
        if (!isNaN(numVal)) {
          if (numVal < 7.0) {
            inferredCritical = true;
            criticalNote = 'فقر دم حاد مهدد للحياة (Severe Life-Threatening Anemia)';
          } else if (numVal < 10.0) {
            inferredAbnormal = true;
          }
        }
      }

      // Platelets
      if (testLower.includes('platelet') || testLower.includes('plt')) {
        if (!isNaN(numVal)) {
          if (numVal < 50) {
            inferredCritical = true;
            criticalNote = 'نقص حرج في الصفائح الدموية وخطر نزيف حاد';
          } else if (numVal < 100) {
            inferredAbnormal = true;
          }
        }
      }

      // Potassium (K+)
      if (testLower.includes('potassium') || testLower.includes('k+')) {
        if (!isNaN(numVal)) {
          if (numVal < 2.8 || numVal > 6.0) {
            inferredCritical = true;
            criticalNote = 'اضطراب حرج في بوتاسيوم الدم وخطر لا نظمية قلبية';
          } else if (numVal < 3.5 || numVal > 5.2) {
            inferredAbnormal = true;
          }
        }
      }

      // Glucose (RBS / FBS)
      if (testLower.includes('glucose') || testLower.includes('sugar') || testLower.includes('rbs')) {
        if (!isNaN(numVal)) {
          if (numVal < 50 || numVal > 350) {
            inferredCritical = true;
            criticalNote = 'هبوط أو ارتفاع سكر حرج يتطلب تدخلاً فورياً';
          } else if (numVal < 70 || numVal > 180) {
            inferredAbnormal = true;
          }
        }
      }

      if (inferredCritical) {
        criticalLabsCount++;
        score += 3;
        triggers.push({
          id: `lab-crit-${order.id}-${res.name}`,
          source: 'lab',
          parameter: `${order.testName}: ${res.name}`,
          value: `${res.value} ${res.unit || ''}`.trim(),
          threshold: res.refRange || 'Critical Value',
          severity: 'critical',
          messageAr: `قيمة مخبرية حرجة في ${order.testName} (${res.name} = ${res.value} ${res.unit || ''}) ${criticalNote ? `• ${criticalNote}` : ''}`,
          messageEn: `Critical Lab Value in ${order.testName} (${res.name}: ${res.value} ${res.unit || ''}) ${criticalNote ? `• ${criticalNote}` : ''}`
        });
      } else if (inferredAbnormal) {
        abnormalLabsCount++;
        score += 1;
        triggers.push({
          id: `lab-abn-${order.id}-${res.name}`,
          source: 'lab',
          parameter: `${order.testName}: ${res.name}`,
          value: `${res.value} ${res.unit || ''}`.trim(),
          threshold: res.refRange || 'Abnormal',
          severity: 'urgent',
          messageAr: `نتيجة غير طبيعية في ${order.testName} (${res.name} = ${res.value} ${res.unit || ''}) [المعدل: ${res.refRange}]`,
          messageEn: `Abnormal Lab Result in ${order.testName} (${res.name}: ${res.value} ${res.unit || ''}) [Ref: ${res.refRange}]`
        });
      }
    }
  }

  // 4. Determine Overall Triage Urgency Level
  const hasCritical = triggers.some(t => t.severity === 'critical');
  const hasUrgent = triggers.some(t => t.severity === 'urgent');

  let level: TriageUrgencyLevel = 'stable';
  if (!latestVitals && labOrders.length === 0) {
    level = 'pending';
  } else if (hasCritical || score >= 3) {
    level = 'critical';
  } else if (hasUrgent || score >= 1) {
    level = 'urgent';
  } else {
    level = 'stable';
  }

  // 5. Synthesize Recommendations & Summary
  let summaryAr = 'المؤشرات الحيوية والفحوصات ضمن النطاق الطبيعي المستقر';
  let summaryEn = 'All recorded vitals and lab findings are within stable limits';
  let recommendationAr = 'الاستمرار في المراقبة الدورية المعتادة وفق خطة الإيواء';
  let recommendationEn = 'Continue routine ward monitoring per clinical plan';

  if (level === 'critical') {
    summaryAr = `حالة حرجة تتطلب تدخلاً عاجلاً (${triggers.filter(t => t.severity === 'critical').length} مؤشرات حرجة)`;
    summaryEn = `Critical condition requiring immediate clinical action (${triggers.filter(t => t.severity === 'critical').length} critical triggers)`;
    recommendationAr = 'إبلاغ الاستشاري المعالج والطبيب المقيم فوراً، تجهيز أدوية الطوارئ، وتكثيف المراقبة كل 15 دقيقة';
    recommendationEn = 'Immediate notification of attending consultant & resident, emergency medication standby, Q15m vitals';
  } else if (level === 'urgent') {
    summaryAr = `حالة تستوجب المتابعة الحثيثة (${triggers.length} مؤشرات غير طبيعية)`;
    summaryEn = `Priority monitoring required (${triggers.length} abnormal triggers)`;
    recommendationAr = 'إعادة تقييم العلامات الحيوية ومراجعة نتائج التحاليل مع الطبيب المسؤول';
    recommendationEn = 'Re-evaluate vitals and review pending lab panels with attending physician';
  } else if (level === 'pending') {
    summaryAr = 'بانتظار تسجيل أولى قياسات المؤشرات الحيوية أو صدور الفحوصات';
    summaryEn = 'Awaiting initial vital signs measurement or verified laboratory panels';
    recommendationAr = 'يرجى قياس وتوثيق العلامات الحيوية عبر محطة التمريض eMAR';
    recommendationEn = 'Please record initial vital signs at eMAR nursing workstation';
  }

  return {
    level,
    score,
    triggers,
    latestVitals,
    criticalLabsCount,
    abnormalLabsCount,
    summaryAr,
    summaryEn,
    recommendationAr,
    recommendationEn,
    timestamp: latestVitals?.timestamp
  };
}
