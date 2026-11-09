// WHO Child Growth Standards (0 to 3 Months / 90 Days) for Newborn & Infant Monitoring
// Based on World Health Organization (WHO) Multicentre Growth Reference Study

export interface WHOGrowthPoint {
  ageDays: number;
  label: string;
  p3: number;
  p10: number;
  p50: number; // Median
  p90: number;
  p97: number;
}

export interface WHOGrowthStandardSet {
  weightKg: WHOGrowthPoint[];
  lengthCm: WHOGrowthPoint[];
  headCircumferenceCm: WHOGrowthPoint[];
}

// WHO Standards for Girls (0 - 90 Days)
export const WHO_GIRLS_STANDARDS: WHOGrowthStandardSet = {
  weightKg: [
    { ageDays: 0, label: '0d', p3: 2.4, p10: 2.8, p50: 3.2, p90: 3.7, p97: 4.2 },
    { ageDays: 3, label: '3d', p3: 2.3, p10: 2.7, p50: 3.1, p90: 3.6, p97: 4.1 },
    { ageDays: 7, label: '7d', p3: 2.5, p10: 2.9, p50: 3.4, p90: 3.9, p97: 4.4 },
    { ageDays: 14, label: '14d', p3: 2.8, p10: 3.2, p50: 3.7, p90: 4.3, p97: 4.8 },
    { ageDays: 21, label: '21d', p3: 3.0, p10: 3.5, p50: 4.0, p90: 4.6, p97: 5.2 },
    { ageDays: 30, label: '1m', p3: 3.2, p10: 3.6, p50: 4.2, p90: 4.8, p97: 5.5 },
    { ageDays: 45, label: '1.5m', p3: 3.6, p10: 4.1, p50: 4.7, p90: 5.4, p97: 6.1 },
    { ageDays: 60, label: '2m', p3: 4.0, p10: 4.5, p50: 5.1, p90: 5.9, p97: 6.6 },
    { ageDays: 90, label: '3m', p3: 4.6, p10: 5.2, p50: 5.8, p90: 6.7, p97: 7.5 }
  ],
  lengthCm: [
    { ageDays: 0, label: '0d', p3: 45.4, p10: 47.0, p50: 49.1, p90: 51.0, p97: 52.7 },
    { ageDays: 3, label: '3d', p3: 45.6, p10: 47.2, p50: 49.3, p90: 51.2, p97: 52.9 },
    { ageDays: 7, label: '7d', p3: 46.2, p10: 47.8, p50: 50.0, p90: 52.0, p97: 53.7 },
    { ageDays: 14, label: '14d', p3: 47.3, p10: 49.0, p50: 51.2, p90: 53.3, p97: 55.0 },
    { ageDays: 21, label: '21d', p3: 48.6, p10: 50.3, p50: 52.5, p90: 54.6, p97: 56.3 },
    { ageDays: 30, label: '1m', p3: 50.0, p10: 51.7, p50: 53.7, p90: 55.6, p97: 57.4 },
    { ageDays: 45, label: '1.5m', p3: 51.6, p10: 53.4, p50: 55.5, p90: 57.5, p97: 59.3 },
    { ageDays: 60, label: '2m', p3: 53.2, p10: 55.0, p50: 57.1, p90: 59.2, p97: 61.1 },
    { ageDays: 90, label: '3m', p3: 55.8, p10: 57.7, p50: 59.8, p90: 61.9, p97: 63.8 }
  ],
  headCircumferenceCm: [
    { ageDays: 0, label: '0d', p3: 31.7, p10: 32.7, p50: 33.9, p90: 35.2, p97: 36.2 },
    { ageDays: 3, label: '3d', p3: 31.8, p10: 32.8, p50: 34.0, p90: 35.3, p97: 36.3 },
    { ageDays: 7, label: '7d', p3: 32.2, p10: 33.2, p50: 34.4, p90: 35.7, p97: 36.7 },
    { ageDays: 14, label: '14d', p3: 32.9, p10: 33.9, p50: 35.1, p90: 36.4, p97: 37.4 },
    { ageDays: 21, label: '21d', p3: 33.6, p10: 34.6, p50: 35.8, p90: 37.1, p97: 38.1 },
    { ageDays: 30, label: '1m', p3: 34.3, p10: 35.3, p50: 36.5, p90: 37.7, p97: 38.7 },
    { ageDays: 45, label: '1.5m', p3: 35.3, p10: 36.3, p50: 37.5, p90: 38.7, p97: 39.7 },
    { ageDays: 60, label: '2m', p3: 36.2, p10: 37.2, p50: 38.4, p90: 39.6, p97: 40.6 },
    { ageDays: 90, label: '3m', p3: 37.6, p10: 38.6, p50: 39.8, p90: 41.0, p97: 42.0 }
  ]
};

// WHO Standards for Boys (0 - 90 Days)
export const WHO_BOYS_STANDARDS: WHOGrowthStandardSet = {
  weightKg: [
    { ageDays: 0, label: '0d', p3: 2.5, p10: 2.9, p50: 3.3, p90: 3.9, p97: 4.4 },
    { ageDays: 3, label: '3d', p3: 2.4, p10: 2.8, p50: 3.2, p90: 3.8, p97: 4.3 },
    { ageDays: 7, label: '7d', p3: 2.6, p10: 3.0, p50: 3.5, p90: 4.1, p97: 4.6 },
    { ageDays: 14, label: '14d', p3: 2.9, p10: 3.3, p50: 3.9, p90: 4.5, p97: 5.1 },
    { ageDays: 21, label: '21d', p3: 3.2, p10: 3.7, p50: 4.2, p90: 4.9, p97: 5.5 },
    { ageDays: 30, label: '1m', p3: 3.4, p10: 3.8, p50: 4.5, p90: 5.1, p97: 5.8 },
    { ageDays: 45, label: '1.5m', p3: 3.9, p10: 4.4, p50: 5.0, p90: 5.8, p97: 6.5 },
    { ageDays: 60, label: '2m', p3: 4.4, p10: 4.9, p50: 5.6, p90: 6.4, p97: 7.1 },
    { ageDays: 90, label: '3m', p3: 5.1, p10: 5.7, p50: 6.4, p90: 7.2, p97: 8.0 }
  ],
  lengthCm: [
    { ageDays: 0, label: '0d', p3: 46.1, p10: 47.7, p50: 49.9, p90: 51.8, p97: 53.4 },
    { ageDays: 3, label: '3d', p3: 46.3, p10: 47.9, p50: 50.1, p90: 52.0, p97: 53.6 },
    { ageDays: 7, label: '7d', p3: 47.0, p10: 48.6, p50: 50.8, p90: 52.8, p97: 54.4 },
    { ageDays: 14, label: '14d', p3: 48.2, p10: 49.9, p50: 52.1, p90: 54.2, p97: 55.9 },
    { ageDays: 21, label: '21d', p3: 49.6, p10: 51.3, p50: 53.5, p90: 55.6, p97: 57.3 },
    { ageDays: 30, label: '1m', p3: 51.1, p10: 52.8, p50: 54.7, p90: 56.7, p97: 58.4 },
    { ageDays: 45, label: '1.5m', p3: 52.9, p10: 54.6, p50: 56.6, p90: 58.6, p97: 60.3 },
    { ageDays: 60, label: '2m', p3: 54.7, p10: 56.4, p50: 58.4, p90: 60.5, p97: 62.2 },
    { ageDays: 90, label: '3m', p3: 57.6, p10: 59.4, p50: 61.4, p90: 63.5, p97: 65.3 }
  ],
  headCircumferenceCm: [
    { ageDays: 0, label: '0d', p3: 32.1, p10: 33.1, p50: 34.5, p90: 35.8, p97: 36.9 },
    { ageDays: 3, label: '3d', p3: 32.2, p10: 33.2, p50: 34.6, p90: 35.9, p97: 37.0 },
    { ageDays: 7, label: '7d', p3: 32.7, p10: 33.7, p50: 35.0, p90: 36.3, p97: 37.4 },
    { ageDays: 14, label: '14d', p3: 33.6, p10: 34.6, p50: 35.8, p90: 37.1, p97: 38.2 },
    { ageDays: 21, label: '21d', p3: 34.4, p10: 35.4, p50: 36.6, p90: 37.9, p97: 39.0 },
    { ageDays: 30, label: '1m', p3: 35.1, p10: 36.1, p50: 37.3, p90: 38.6, p97: 39.5 },
    { ageDays: 45, label: '1.5m', p3: 36.2, p10: 37.2, p50: 38.4, p90: 39.7, p97: 40.6 },
    { ageDays: 60, label: '2m', p3: 37.2, p10: 38.2, p50: 39.4, p90: 40.7, p97: 41.6 },
    { ageDays: 90, label: '3m', p3: 38.7, p10: 39.7, p50: 40.9, p90: 42.1, p97: 43.1 }
  ]
};

/**
 * Calculates estimated percentile based on linear approximation between WHO milestone curves
 */
export function calculatePercentile(
  val: number,
  ageDays: number,
  metric: 'weightKg' | 'lengthCm' | 'headCircumferenceCm',
  gender: 'female' | 'male'
): number {
  const standards = gender === 'female' ? WHO_GIRLS_STANDARDS[metric] : WHO_BOYS_STANDARDS[metric];
  
  // Find surrounding bracket
  let lower = standards[0];
  let upper = standards[standards.length - 1];

  for (let i = 0; i < standards.length - 1; i++) {
    if (ageDays >= standards[i].ageDays && ageDays <= standards[i + 1].ageDays) {
      lower = standards[i];
      upper = standards[i + 1];
      break;
    }
  }

  const fraction = upper.ageDays === lower.ageDays 
    ? 0 
    : (ageDays - lower.ageDays) / (upper.ageDays - lower.ageDays);

  const p3 = lower.p3 + fraction * (upper.p3 - lower.p3);
  const p10 = lower.p10 + fraction * (upper.p10 - lower.p10);
  const p50 = lower.p50 + fraction * (upper.p50 - lower.p50);
  const p90 = lower.p90 + fraction * (upper.p90 - lower.p90);
  const p97 = lower.p97 + fraction * (upper.p97 - lower.p97);

  if (val <= p3) {
    const ratio = Math.max(0.1, val / p3);
    return Math.max(1, Math.round(ratio * 3));
  }
  if (val <= p10) {
    return Math.round(3 + ((val - p3) / (p10 - p3)) * 7);
  }
  if (val <= p50) {
    return Math.round(10 + ((val - p10) / (p50 - p10)) * 40);
  }
  if (val <= p90) {
    return Math.round(50 + ((val - p50) / (p90 - p50)) * 40);
  }
  if (val <= p97) {
    return Math.round(90 + ((val - p90) / (p97 - p90)) * 7);
  }
  return Math.min(99, Math.round(97 + ((val - p97) / (p97 * 0.1)) * 2));
}

/**
 * Returns clinical assessment categorization for weight, length, and head circumference
 */
export function getGrowthAssessment(
  weightPct: number,
  lengthPct: number,
  headPct: number,
  birthWeightKg?: number,
  currentWeightKg?: number,
  ageDays?: number,
  isAr = true
) {
  let weightStatus = '';
  let weightStatusEn = '';
  let weightBadgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';

  if (weightPct < 3) {
    weightStatus = 'انخفاض شديد في الوزن (أقل من المئين 3 - يتطلب تقييم التغذية)';
    weightStatusEn = 'Severe Underweight (<3rd %ile - Requires Nutritional Evaluation)';
    weightBadgeColor = 'text-rose-700 bg-rose-50 border-rose-300';
  } else if (weightPct < 10) {
    weightStatus = 'صغير بالنسبة لعمر الحمل (SGA - المئين 3 إلى 10)';
    weightStatusEn = 'Small for Gestational Age (SGA: 3rd-10th %ile)';
    weightBadgeColor = 'text-amber-700 bg-amber-50 border-amber-300';
  } else if (weightPct <= 90) {
    weightStatus = 'وزن مناسب وطبيعي لعمر الحمل (AGA - المئين 10 إلى 90)';
    weightStatusEn = 'Appropriate for Gestational Age (AGA: 10th-90th %ile)';
    weightBadgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
  } else {
    weightStatus = 'كبير بالنسبة لعمر الحمل (LGA - أعلى من المئين 90)';
    weightStatusEn = 'Large for Gestational Age (LGA: >90th %ile)';
    weightBadgeColor = 'text-blue-700 bg-blue-50 border-blue-300';
  }

  // Head circumference clinical alert
  let headStatus = '';
  let headStatusEn = '';
  let headBadgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';

  if (headPct < 3) {
    headStatus = 'اشتباه صغر محيط الرأس (Microcephaly alert - أقل من المئين 3)';
    headStatusEn = 'Microcephaly Alert (<3rd %ile - Requires Cranial US)';
    headBadgeColor = 'text-rose-700 bg-rose-50 border-rose-300';
  } else if (headPct > 97) {
    headStatus = 'اشتباه كبر محيط الرأس (Macrocephaly alert - أعلى من المئين 97)';
    headStatusEn = 'Macrocephaly Alert (>97th %ile - Follow fontanelles)';
    headBadgeColor = 'text-amber-700 bg-amber-50 border-amber-300';
  } else {
    headStatus = 'محيط رأس سليم ومتناسق مع النمو الدماغي (Normocephalic)';
    headStatusEn = 'Normal Head Circumference (Normocephalic)';
    headBadgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  }

  // Neonatal physiologic weight loss tracking
  let physiologicNote = '';
  let physiologicNoteEn = '';
  if (birthWeightKg && currentWeightKg && ageDays !== undefined) {
    const diffKg = currentWeightKg - birthWeightKg;
    const diffPct = (diffKg / birthWeightKg) * 100;

    if (ageDays <= 5) {
      if (diffPct < -10) {
        physiologicNote = `تحذير: نزول وزن فائق للحد الطبيعي (${diffPct.toFixed(1)}%). يجب تقييم كفاءة الإرضاع ودرجة الإماهة فوراً.`;
        physiologicNoteEn = `Warning: Weight loss exceeds normal 10% threshold (${diffPct.toFixed(1)}%). Assess latch and hydration.`;
      } else if (diffPct < 0) {
        physiologicNote = `نزول وزن فسيولوجي طبيعي بعد الولادة (${diffPct.toFixed(1)}% من وزن الولادة)، متوقع خلال الأيام الـ 5 الأولى.`;
        physiologicNoteEn = `Normal physiologic postnatal weight drop (${diffPct.toFixed(1)}% from birth weight), expected in first 5 days.`;
      } else {
        physiologicNote = `استعادة مبكرة لوزن الولادة (+${(diffKg * 1000).toFixed(0)} جم)؛ مؤشر ممتاز لفعالية الإرضاع.`;
        physiologicNoteEn = `Early birth weight recovery (+${(diffKg * 1000).toFixed(0)}g); excellent breastfeeding indicator.`;
      }
    } else if (ageDays <= 14) {
      if (diffKg >= 0) {
        physiologicNote = `تمت استعادة وزن الولادة وتجاوزه بنجاح (+${(diffKg * 1000).toFixed(0)} جم). نمو مستمر بمعدل طبيعي.`;
        physiologicNoteEn = `Birth weight successfully regained (+${(diffKg * 1000).toFixed(0)}g). Continued healthy velocity.`;
      } else {
        physiologicNote = `ملاحظة: تأخر استعادة وزن الولادة في اليوم ${ageDays} (-${Math.abs(diffKg * 1000).toFixed(0)} جم). يوصى بزيادة تكرار الرضعات.`;
        physiologicNoteEn = `Note: Delayed birth weight regain at day ${ageDays} (-${Math.abs(diffKg * 1000).toFixed(0)}g). Increase feeds frequency.`;
      }
    } else {
      physiologicNote = `معدل كسب وزن يومي ممتاز (+${((diffKg * 1000) / ageDays).toFixed(0)} جم/يوم).`;
      physiologicNoteEn = `Healthy daily weight gain rate (+${((diffKg * 1000) / ageDays).toFixed(0)}g/day).`;
    }
  }

  return {
    weightStatus: isAr ? weightStatus : weightStatusEn,
    weightBadgeColor,
    headStatus: isAr ? headStatus : headStatusEn,
    headBadgeColor,
    physiologicNote: isAr ? physiologicNote : physiologicNoteEn
  };
}
