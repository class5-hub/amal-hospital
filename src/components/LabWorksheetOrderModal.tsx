import React, { useState, useMemo } from 'react';
import { 
  FlaskConical, 
  TestTube, 
  CheckSquare, 
  Square, 
  X, 
  Printer, 
  AlertCircle, 
  Search, 
  Sparkles, 
  ShieldAlert, 
  Check, 
  Clock, 
  FileText,
  Layers,
  Baby,
  Activity
} from 'lucide-react';
import { Patient, Admission, SystemUser, Language, LabTestItem } from '../types/hmis.ts';
import { api } from '../api/client.ts';

interface LabWorksheetOrderModalProps {
  currentPatient: Patient;
  currentAdmission: Admission;
  currentUser: SystemUser;
  language: Language;
  onClose: () => void;
  onRefresh: () => void;
}

interface WorksheetTestDefinition {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: 'Hematology' | 'Biochemistry' | 'Maternal' | 'Urinalysis' | 'Serology' | 'Blood Bank';
  tubeType: 'edta_lavender' | 'sst_gold' | 'citrate_blue' | 'fluoride_gray' | 'urine_cup' | 'blood_pink' | 'swab_sterile';
  tubeLabelAr: string;
  tubeLabelEn: string;
  refRange: string;
  unit: string;
  turnaroundTime: string;
  isPopular?: boolean;
}

// Master traditional lab worksheet test catalog
const WORKSHEET_CATALOG: WorksheetTestDefinition[] = [
  // PANEL 1: Hematology & Coagulation
  { id: 'hem_01', code: 'HEM-01', nameAr: 'صورة دم كاملة مع التفريق (CBC with Differential)', nameEn: 'Complete Blood Count (CBC + Diff)', category: 'Hematology', tubeType: 'edta_lavender', tubeLabelAr: 'أنبوبة بنفسجية (EDTA)', tubeLabelEn: 'Lavender EDTA Tube', refRange: 'Hb 12-15.5 g/dL, WBC 4-11, PLT 150-450', unit: 'Composite', turnaroundTime: '30-45 min', isPopular: true },
  { id: 'hem_02', code: 'HEM-02', nameAr: 'خضاب الدم والهيماتوكريت السريع (Hb & Hematocrit Stat)', nameEn: 'Hemoglobin & Hematocrit (Hb/Hct)', category: 'Hematology', tubeType: 'edta_lavender', tubeLabelAr: 'أنبوبة بنفسجية (EDTA)', tubeLabelEn: 'Lavender EDTA Tube', refRange: '12.0 - 15.5 g/dL', unit: 'g/dL', turnaroundTime: '15 min (STAT)' },
  { id: 'hem_03', code: 'HEM-03', nameAr: 'الصفائح الدموية (Platelet Count Confirmation)', nameEn: 'Platelet Count (PLT)', category: 'Hematology', tubeType: 'edta_lavender', tubeLabelAr: 'أنبوبة بنفسجية (EDTA)', tubeLabelEn: 'Lavender EDTA Tube', refRange: '150 - 450 x10^9/L', unit: 'x10^9/L', turnaroundTime: '30 min' },
  { id: 'hem_04', code: 'HEM-04', nameAr: 'زمن البروثرومبين والمعدل الدولي (PT / INR)', nameEn: 'Prothrombin Time & INR', category: 'Hematology', tubeType: 'citrate_blue', tubeLabelAr: 'أنبوبة زرقاء (Citrate)', tubeLabelEn: 'Light Blue Citrate Tube', refRange: 'INR: 0.9 - 1.15, PT: 11 - 13.5 sec', unit: 'INR / sec', turnaroundTime: '45 min', isPopular: true },
  { id: 'hem_05', code: 'HEM-05', nameAr: 'زمن الثرومبوبلاستين الجزئي (aPTT)', nameEn: 'Activated Partial Thromboplastin Time (aPTT)', category: 'Hematology', tubeType: 'citrate_blue', tubeLabelAr: 'أنبوبة زرقاء (Citrate)', tubeLabelEn: 'Light Blue Citrate Tube', refRange: '25.0 - 36.5 sec', unit: 'sec', turnaroundTime: '45 min' },
  { id: 'hem_06', code: 'HEM-06', nameAr: 'الفيبرينوجين كمي (Fibrinogen - Clauss Method)', nameEn: 'Plasma Fibrinogen (Clauss)', category: 'Hematology', tubeType: 'citrate_blue', tubeLabelAr: 'أنبوبة زرقاء (Citrate)', tubeLabelEn: 'Light Blue Citrate Tube', refRange: '200 - 400 mg/dL (Pregnancy >300)', unit: 'mg/dL', turnaroundTime: '60 min' },
  { id: 'hem_07', code: 'HEM-07', nameAr: 'دي دايمر كمي (D-Dimer Quantitative)', nameEn: 'D-Dimer Quantitative', category: 'Hematology', tubeType: 'citrate_blue', tubeLabelAr: 'أنبوبة زرقاء (Citrate)', tubeLabelEn: 'Light Blue Citrate Tube', refRange: '< 0.50 ug/mL FEU', unit: 'ug/mL', turnaroundTime: '45 min' },
  { id: 'hem_08', code: 'HEM-08', nameAr: 'سرعة التثفل (ESR 1st Hour)', nameEn: 'Erythrocyte Sedimentation Rate (ESR)', category: 'Hematology', tubeType: 'citrate_blue', tubeLabelAr: 'أنبوبة سوداء/زرقاء', tubeLabelEn: 'Black / Blue Tube', refRange: '< 20 mm/hr', unit: 'mm/hr', turnaroundTime: '60 min' },
  { id: 'hem_09', code: 'HEM-09', nameAr: 'فيلم دم طرفي ومورفولوجيا (Peripheral Blood Smear)', nameEn: 'Peripheral Blood Smear Review', category: 'Hematology', tubeType: 'edta_lavender', tubeLabelAr: 'أنبوبة بنفسجية + شريحة', tubeLabelEn: 'EDTA + Glass Slide', refRange: 'Normocytic / Normochromic', unit: 'Visual', turnaroundTime: '2 hours' },

  // PANEL 2: Clinical Biochemistry & Organ Functions
  { id: 'bio_01', code: 'BIO-01', nameAr: 'وظائف الكلى (Urea & Serum Creatinine + eGFR)', nameEn: 'Renal Function Profile (Urea, Cr, eGFR)', category: 'Biochemistry', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: 'Cr: 0.5 - 0.9 mg/dL, Urea: 15 - 40 mg/dL', unit: 'mg/dL', turnaroundTime: '45 min', isPopular: true },
  { id: 'bio_02', code: 'BIO-02', nameAr: 'حمض اليوريك (Serum Uric Acid - Preeclampsia)', nameEn: 'Serum Uric Acid (Toxemia Marker)', category: 'Biochemistry', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: '2.5 - 5.5 mg/dL (High in preeclampsia)', unit: 'mg/dL', turnaroundTime: '45 min' },
  { id: 'bio_03', code: 'BIO-03', nameAr: 'شوارد الدم (Electrolytes: Na+, K+, Cl-)', nameEn: 'Serum Electrolytes (Na, K, Cl)', category: 'Biochemistry', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: 'Na 135-145, K 3.5-5.0, Cl 98-107', unit: 'mmol/L', turnaroundTime: '30 min', isPopular: true },
  { id: 'bio_04', code: 'BIO-04', nameAr: 'الكالسيوم والمغنيسيوم (Calcium & Magnesium)', nameEn: 'Serum Calcium (Total/Ionized) & Mg', category: 'Biochemistry', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: 'Ca: 8.5-10.2 mg/dL, Mg: 1.7-2.4 mg/dL', unit: 'mg/dL', turnaroundTime: '45 min' },
  { id: 'bio_05', code: 'BIO-05', nameAr: 'وظائف الكبد الكاملة (LFT: ALT, AST, Bilirubin, ALP, Albumin)', nameEn: 'Liver Function Tests (Full LFT)', category: 'Biochemistry', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: 'ALT <35, AST <35, Bilirubin <1.2 mg/dL', unit: 'U/L & mg/dL', turnaroundTime: '60 min', isPopular: true },
  { id: 'bio_06', code: 'BIO-06', nameAr: 'إنزيم ديهيدروجينيز اللاكتات (LDH - HELLP Marker)', nameEn: 'Lactate Dehydrogenase (LDH)', category: 'Biochemistry', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: '140 - 280 U/L (>600 in HELLP)', unit: 'U/L', turnaroundTime: '45 min' },
  { id: 'bio_07', code: 'BIO-07', nameAr: 'سكر الدم العشوائي (Random Blood Sugar - RBS)', nameEn: 'Random Blood Sugar (RBS)', category: 'Biochemistry', tubeType: 'fluoride_gray', tubeLabelAr: 'أنبوبة رمادية (Fluoride)', tubeLabelEn: 'Gray Fluoride Tube', refRange: '70 - 140 mg/dL', unit: 'mg/dL', turnaroundTime: '15 min' },
  { id: 'bio_08', code: 'BIO-08', nameAr: 'سكر الدم الصائم (Fasting Blood Sugar - FBS)', nameEn: 'Fasting Blood Sugar (FBS 8h Fast)', category: 'Biochemistry', tubeType: 'fluoride_gray', tubeLabelAr: 'أنبوبة رمادية (Fluoride)', tubeLabelEn: 'Gray Fluoride Tube', refRange: '70 - 99 mg/dL', unit: 'mg/dL', turnaroundTime: '30 min' },
  { id: 'bio_09', code: 'BIO-09', nameAr: 'منحنى السكر للحوامل (OGTT 75g - 1h & 2h Gestational)', nameEn: 'Oral Glucose Tolerance Test (OGTT 75g)', category: 'Biochemistry', tubeType: 'fluoride_gray', tubeLabelAr: 'أنبوبة رمادية (3 عينات)', tubeLabelEn: 'Gray Fluoride (3 Draws)', refRange: 'Fasting <92, 1h <180, 2h <153 mg/dL', unit: 'mg/dL', turnaroundTime: '3 hours' },
  { id: 'bio_10', code: 'BIO-10', nameAr: 'السكر التراكمي (HbA1c Glycated Hemoglobin)', nameEn: 'Hemoglobin A1c (HbA1c)', category: 'Biochemistry', tubeType: 'edta_lavender', tubeLabelAr: 'أنبوبة بنفسجية (EDTA)', tubeLabelEn: 'Lavender EDTA Tube', refRange: '< 5.7% (Good Control <6.0% in pregnancy)', unit: '%', turnaroundTime: '60 min' },

  // PANEL 3: Maternal, Ob/Gyn & Hormones
  { id: 'mat_01', code: 'MAT-01', nameAr: 'هرمون الحمل الرقمي كمي (Quantitative Beta-hCG)', nameEn: 'Serum Beta-hCG (Quantitative)', category: 'Maternal', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: 'Varies by gestational week (mIU/mL)', unit: 'mIU/mL', turnaroundTime: '60 min', isPopular: true },
  { id: 'mat_02', code: 'MAT-02', nameAr: 'متابعة هرمون الحمل المتتابع بعد 48 ساعة (Serial 48h Beta-hCG)', nameEn: 'Serial 48-Hour Beta-hCG Doubling Protocol', category: 'Maternal', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: 'Expected >66% rise in 48 hrs for viable IUP', unit: 'mIU/mL', turnaroundTime: '60 min' },
  { id: 'mat_03', code: 'MAT-03', nameAr: 'بروجستيرون المصل (Serum Progesterone)', nameEn: 'Serum Progesterone Level', category: 'Maternal', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: '11 - 90 ng/mL (1st trimester)', unit: 'ng/mL', turnaroundTime: '90 min' },
  { id: 'mat_04', code: 'MAT-04', nameAr: 'الهرمون المنبه للدرقية (TSH High Sensitivity)', nameEn: 'Thyroid Stimulating Hormone (TSH)', category: 'Maternal', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: '0.4 - 2.5 uIU/mL (Pregnancy 1st Tri)', unit: 'uIU/mL', turnaroundTime: '60 min' },
  { id: 'mat_05', code: 'MAT-05', nameAr: 'الثيروكسين الحر (Free T4)', nameEn: 'Free Thyroxine (FT4)', category: 'Maternal', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: '0.8 - 1.8 ng/dL', unit: 'ng/dL', turnaroundTime: '60 min' },
  { id: 'mat_06', code: 'MAT-06', nameAr: 'صفراء حديثي الولادة كلية ومباشرة (Neonatal Bilirubin T&D)', nameEn: 'Neonatal Bilirubin (Total & Direct)', category: 'Maternal', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة دقيقة محمية من الضوء', tubeLabelEn: 'Micro Amber/SST Tube', refRange: '< 5.0 mg/dL (<24h age)', unit: 'mg/dL', turnaroundTime: '30 min (STAT)' },

  // PANEL 4: Urinalysis & Body Fluids
  { id: 'urn_01', code: 'URN-01', nameAr: 'تحليل البول الروتيني والمجهري (Complete Urinalysis)', nameEn: 'Complete Urinalysis & Sediment Micro', category: 'Urinalysis', tubeType: 'urine_cup', tubeLabelAr: 'علبة بول معقمة', tubeLabelEn: 'Sterile Urine Container', refRange: 'Protein: Neg, Ketones: Neg, WBC: 0-5', unit: 'Visual/Dipstick', turnaroundTime: '30 min', isPopular: true },
  { id: 'urn_02', code: 'URN-02', nameAr: 'نسبة بروتين إلى كرياتينين بالبول (Urine Protein/Creatinine Ratio)', nameEn: 'Urine Protein/Creatinine Ratio (UPCR)', category: 'Urinalysis', tubeType: 'urine_cup', tubeLabelAr: 'علبة بول معقمة', tubeLabelEn: 'Sterile Urine Container', refRange: '< 0.30 mg/mg (Sign of preeclampsia if >0.3)', unit: 'mg/mg', turnaroundTime: '60 min' },
  { id: 'urn_03', code: 'URN-03', nameAr: 'تجميع بول 24 ساعة للبروتين الكلي (24-Hour Urine Protein)', nameEn: '24-Hour Urine Total Protein Collection', category: 'Urinalysis', tubeType: 'urine_cup', tubeLabelAr: 'وعاء تجميع 24 ساعة خاص', tubeLabelEn: '24h Urine Jug Container', refRange: '< 300 mg/24 hours (>300 in preeclampsia)', unit: 'mg/24h', turnaroundTime: 'Same Day' },
  { id: 'urn_04', code: 'URN-04', nameAr: 'مسحة مهبلية علوية وفحص مجهري (HVS Wet Mount & Gram Stain)', nameEn: 'High Vaginal Swab (HVS) Microscopy', category: 'Urinalysis', tubeType: 'swab_sterile', tubeLabelAr: 'مسحة معقمة مع وسط ناقل', tubeLabelEn: 'Sterile Swab + Medium', refRange: 'Normal vaginal flora, No Trichomonas/Clue', unit: 'Microscopic', turnaroundTime: '90 min' },

  // PANEL 5: Serology, Immunology & Infectious Disease
  { id: 'ser_01', code: 'SER-01', nameAr: 'مستضد التهاب الكبد ب (Hepatitis B Surface Antigen - HBsAg)', nameEn: 'Hepatitis B Surface Antigen (HBsAg)', category: 'Serology', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: 'Non-Reactive (Negative)', unit: 'Qualitative', turnaroundTime: '45 min', isPopular: true },
  { id: 'ser_02', code: 'SER-02', nameAr: 'أجسام مضادة لالتهاب الكبد ج (Hepatitis C Virus Ab - HCV)', nameEn: 'Hepatitis C Virus Antibody (HCV Ab)', category: 'Serology', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: 'Non-Reactive (Negative)', unit: 'Qualitative', turnaroundTime: '45 min', isPopular: true },
  { id: 'ser_03', code: 'SER-03', nameAr: 'فيروس نقص المناعة المكتسب (HIV 1/2 Ag/Ab Combo)', nameEn: 'HIV 1/2 Combo Antigen/Antibody', category: 'Serology', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: 'Non-Reactive (Negative)', unit: 'Qualitative', turnaroundTime: '45 min', isPopular: true },
  { id: 'ser_04', code: 'SER-04', nameAr: 'تحليل الزهري (Syphilis VDRL / RPR)', nameEn: 'Syphilis Serology (VDRL / RPR)', category: 'Serology', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: 'Non-Reactive', unit: 'Qualitative', turnaroundTime: '45 min' },
  { id: 'ser_05', code: 'SER-05', nameAr: 'داء المقوسات للأمهات (Toxoplasma Gondii IgG & IgM)', nameEn: 'Toxoplasma Gondii IgG & IgM', category: 'Serology', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: 'IgM Negative, IgG indicates past immunity', unit: 'Index', turnaroundTime: '2 hours' },
  { id: 'ser_06', code: 'SER-06', nameAr: 'الحصبة الألمانية (Rubella Virus IgG & IgM)', nameEn: 'Rubella Virus IgG & IgM Serology', category: 'Serology', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: 'IgG > 10 IU/mL indicates immunity', unit: 'IU/mL', turnaroundTime: '2 hours' },
  { id: 'ser_07', code: 'SER-07', nameAr: 'بروتين الالتهاب التفاعلي كمي (CRP Quantitative)', nameEn: 'C-Reactive Protein (CRP Quantitative)', category: 'Serology', tubeType: 'sst_gold', tubeLabelAr: 'أنبوبة جل ذهبية (SST)', tubeLabelEn: 'Gold Gel SST Tube', refRange: '< 5.0 mg/L', unit: 'mg/L', turnaroundTime: '30 min', isPopular: true },

  // PANEL 6: Blood Bank & Transfusion Medicine
  { id: 'bbk_01', code: 'BBK-01', nameAr: 'فصيلة الدم وعامل ريسوس وتأكيد (ABO & Rh D Typing Confirmed)', nameEn: 'Blood Group ABO & Rh(D) Phenotype', category: 'Blood Bank', tubeType: 'blood_pink', tubeLabelAr: 'أنبوبة بنك الدم وردية (Pink)', tubeLabelEn: 'Pink Blood Bank Tube', refRange: 'Patient Specific ABO/Rh', unit: 'Grouping', turnaroundTime: '30 min', isPopular: true },
  { id: 'bbk_02', code: 'BBK-02', nameAr: 'فحص الأجسام المضادة غير المباشر (Indirect Coombs Antibody Screen)', nameEn: 'Indirect Antiglobulin Test (Indirect Coombs)', category: 'Blood Bank', tubeType: 'blood_pink', tubeLabelAr: 'أنبوبة بنك الدم وردية (Pink)', tubeLabelEn: 'Pink Blood Bank Tube', refRange: 'Negative (No irregular antibodies)', unit: 'Agglutination', turnaroundTime: '60 min' },
  { id: 'bbk_03', code: 'BBK-03', nameAr: 'فحص كومبس المباشر للمولود (Direct Coombs Test - DAT)', nameEn: 'Direct Antiglobulin Test (Direct Coombs)', category: 'Blood Bank', tubeType: 'blood_pink', tubeLabelAr: 'أنبوبة بنك الدم وردية (Pink)', tubeLabelEn: 'Pink Blood Bank Tube', refRange: 'Negative (Evaluates hemolytic disease)', unit: 'Agglutination', turnaroundTime: '45 min' },
  { id: 'bbk_04', code: 'BBK-04', nameAr: 'حجز وتطابق وحدتين كريات دم حمراء مكدسة (Crossmatch 2 Units PRBCs)', nameEn: 'Crossmatch & Reserve 2 Units PRBCs', category: 'Blood Bank', tubeType: 'blood_pink', tubeLabelAr: 'أنبوبة بنك الدم وردية (Pink)', tubeLabelEn: 'Pink Blood Bank Tube', refRange: 'Compatible 2 Units Prepared & Reserved', unit: 'Crossmatch', turnaroundTime: '60 min (STAT: 20 min)' },
  { id: 'bbk_05', code: 'BBK-05', nameAr: 'صرف إسعافي طارئ O-Negative غير متطابق (Emergency O-Neg Release Protocol)', nameEn: 'Stat Uncrossmatched O-Negative Release', category: 'Blood Bank', tubeType: 'blood_pink', tubeLabelAr: 'طلب بنك دم إسعافي طارئ', tubeLabelEn: 'Emergency Blood Bank Form', refRange: 'Universal Donor O-Neg Units', unit: 'Emergency', turnaroundTime: 'Immediate (<10 min)' },
];

export const LabWorksheetOrderModal: React.FC<LabWorksheetOrderModalProps> = ({
  currentPatient,
  currentAdmission,
  currentUser,
  language,
  onClose,
  onRefresh
}) => {
  const isAr = language === 'ar';

  // Selected test IDs set
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set(['hem_01', 'bio_01', 'bbk_01']));
  const [urgency, setUrgency] = useState<'Routine' | 'Urgent' | 'Stat'>('Routine');
  const [fastingStatus, setFastingStatus] = useState<'random' | 'fasting' | 'postprandial'>('random');
  const [clinicalIndication, setClinicalIndication] = useState('Routine Inpatient Admission & Maternity Workup');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrintSlip, setShowPrintSlip] = useState(false);

  // Group tests into panels
  const categories = useMemo(() => [
    { key: 'Hematology', nameAr: 'أمراض الدم والتخثر (Hematology & Hemostasis)', nameEn: 'Hematology & Hemostasis', defaultTube: '🟣 EDTA Lavender & 🔵 Citrate' },
    { key: 'Biochemistry', nameAr: 'الكيمياء السريرية والأيض (Biochemistry & Metabolic)', nameEn: 'Biochemistry & Organ Profiles', defaultTube: '🟡 Gel SST & 🔘 Fluoride' },
    { key: 'Maternal', nameAr: 'الأمومة وهرمونات النساء والولادة (Maternal & Ob/Gyn)', nameEn: 'Maternal, Ob/Gyn & Hormones', defaultTube: '🟡 Gel SST & Micro-tube' },
    { key: 'Urinalysis', nameAr: 'تحاليل البول وسوائل الجسم (Urinalysis & Body Fluids)', nameEn: 'Urinalysis & Specialized Fluids', defaultTube: '🟡 Sterile Cup & ⚪ Swab' },
    { key: 'Serology', nameAr: 'المصول والمناعة والأمراض المعدية (Serology & Infectious)', nameEn: 'Serology & Infectious Diseases', defaultTube: '🟡 Gel SST' },
    { key: 'Blood Bank', nameAr: 'بنك الدم ونقل المشتقات (Transfusion Medicine & Blood Bank)', nameEn: 'Blood Bank & Crossmatch', defaultTube: '🟣 Pink Tube' }
  ], []);

  // Filter catalog based on search
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return WORKSHEET_CATALOG;
    return WORKSHEET_CATALOG.filter(t => 
      t.code.toLowerCase().includes(q) ||
      t.nameAr.toLowerCase().includes(q) ||
      t.nameEn.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.refRange.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Toggle single test
  const toggleTest = (id: string) => {
    setSelectedTestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Preset Bundles / Worksheets
  const applyPreset = (presetType: 'admission' | 'preeclampsia' | 'cesarean' | 'hemorrhage' | 'endocrine' | 'clear') => {
    if (presetType === 'clear') {
      setSelectedTestIds(new Set());
      return;
    }

    if (presetType === 'admission') {
      setSelectedTestIds(new Set(['hem_01', 'bio_01', 'bio_07', 'urn_01', 'ser_01', 'ser_02', 'ser_03', 'bbk_01']));
      setClinicalIndication('Routine Inpatient Admission & Maternal Baseline');
      setUrgency('Routine');
    } else if (presetType === 'preeclampsia') {
      setSelectedTestIds(new Set(['hem_01', 'hem_03', 'bio_01', 'bio_02', 'bio_05', 'bio_06', 'urn_01', 'urn_02', 'urn_03']));
      setClinicalIndication('Preeclampsia Workup - Maternal Hypertension & Proteinuria Assessment');
      setUrgency('Urgent');
    } else if (presetType === 'cesarean') {
      setSelectedTestIds(new Set(['hem_01', 'hem_04', 'hem_05', 'bio_01', 'bio_03', 'bbk_01', 'bbk_02', 'bbk_04', 'ser_01', 'ser_02']));
      setClinicalIndication('Pre-Operative Elective/Urgent Cesarean Section Clearance');
      setUrgency('Urgent');
    } else if (presetType === 'hemorrhage') {
      setSelectedTestIds(new Set(['hem_01', 'hem_02', 'hem_03', 'hem_04', 'hem_05', 'hem_06', 'hem_07', 'bbk_01', 'bbk_04', 'bbk_05']));
      setClinicalIndication('EMERGENCY: Acute Postpartum Hemorrhage (PPH) - Massive Transfusion Protocol');
      setUrgency('Stat');
    } else if (presetType === 'endocrine') {
      setSelectedTestIds(new Set(['mat_01', 'mat_02', 'mat_03', 'mat_04', 'mat_05', 'ser_05', 'ser_06']));
      setClinicalIndication('Early Pregnancy Viability & Maternal Endocrine Screening');
      setUrgency('Routine');
    }
  };

  // Selected tests details
  const selectedTests = useMemo(() => {
    return WORKSHEET_CATALOG.filter(t => selectedTestIds.has(t.id));
  }, [selectedTestIds]);

  // Compute required specimen collection tubes
  const tubeRequirements = useMemo(() => {
    const tubes = new Map<string, { label: string; count: number; color: string }>();

    selectedTests.forEach(t => {
      let key = t.tubeType;
      let label = isAr ? t.tubeLabelAr : t.tubeLabelEn;
      let color = 'bg-slate-500';

      if (t.tubeType === 'edta_lavender') color = 'bg-purple-600';
      else if (t.tubeType === 'sst_gold') color = 'bg-amber-400';
      else if (t.tubeType === 'citrate_blue') color = 'bg-sky-500';
      else if (t.tubeType === 'fluoride_gray') color = 'bg-slate-400';
      else if (t.tubeType === 'urine_cup') color = 'bg-yellow-500';
      else if (t.tubeType === 'blood_pink') color = 'bg-pink-600';
      else if (t.tubeType === 'swab_sterile') color = 'bg-emerald-600';

      if (!tubes.has(key)) {
        tubes.set(key, { label, count: 1, color });
      } else {
        const existing = tubes.get(key)!;
        // Don't multiply tubes infinitely for the same draw type unless needed
        tubes.set(key, { ...existing, count: Math.min(2, existing.count) });
      }
    });

    return Array.from(tubes.values());
  }, [selectedTests, isAr]);

  // Handle batch submit
  const handleSubmitWorksheetOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTests.length === 0) {
      alert(isAr ? 'يرجى تحديد تحليل واحد على الأقل في ورقة العمل' : 'Please select at least one test on the worksheet');
      return;
    }

    setIsSubmitting(true);
    try {
      // Group tests by main category or create a comprehensive requisition order
      // Let's create orders grouped by category to match hospital bench workflow
      const grouped = new Map<string, WorksheetTestDefinition[]>();
      selectedTests.forEach(t => {
        const cat = t.category;
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat)!.push(t);
      });

      for (const [cat, tests] of grouped.entries()) {
        const testNameCombined = tests.length === 1 
          ? tests[0].nameEn 
          : `${cat} Panel (${tests.map(t => t.code).join(', ')})`;

        const resultsPlaceholders: LabTestItem[] = tests.map(t => ({
          name: isAr ? t.nameAr : t.nameEn,
          key: t.code,
          value: '--',
          unit: t.unit,
          refRange: t.refRange,
          isAbnormal: false,
          isCritical: false
        }));

        await api.createLabOrder({
          admissionId: currentAdmission.admissionId,
          patientName: currentPatient.fullName,
          testName: testNameCombined,
          category: (cat === 'Maternal' ? 'Biochemistry' : cat === 'Urinalysis' ? 'Biochemistry' : cat) as any,
          urgency: urgency,
          orderedBy: currentUser.name
        }, resultsPlaceholders, currentUser);
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error submitting lab order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Printable/Worksheet Top Header */}
        <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shrink-0">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold tracking-tight">
                  {isAr ? 'نموذج طلب الفحوصات المخبرية (ورقة العمل المخبرية)' : 'Clinical Laboratory Requisition Worksheet'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  LIS BENCH REQUISITION
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr ? 'مستشفى الأمل التخصصي للنساء والولادة والإيواء السريري · المختبر التشخيصي المركزي' : 'Al-Amal Specialized Maternity & Inpatient HMIS · Central Diagnostic Laboratories'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
              title={isAr ? 'طباعة ورقة العمل المادية' : 'Print physical worksheet'}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isAr ? 'طباعة ورقة العمل' : 'Print Slip'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Traditional Patient & Specimen Requisition Banner */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">{isAr ? 'المريضة:' : 'Patient:'}</span>
              <strong className="text-slate-900 truncate block font-bold">{currentPatient.fullName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">{isAr ? 'الملف الدائم / الإيواء:' : 'MRN / ADM:'}</span>
              <strong className="text-slate-900 font-mono block">{currentPatient.mrn} · {currentAdmission.admissionId}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">{isAr ? 'الغرفة والسرير:' : 'Bed & Ward:'}</span>
              <strong className="text-teal-700 font-semibold block">{currentAdmission.roomNumber} ({currentAdmission.roomType})</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">{isAr ? 'فصيلة الدم:' : 'Blood Group:'}</span>
              <span className="text-red-700 font-bold font-mono text-sm">{currentPatient.bloodGroup}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">{isAr ? 'الطبيب الطالب:' : 'Ordering Doctor:'}</span>
              <strong className="text-slate-800 truncate block">{currentUser.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">{isAr ? 'تاريخ ووقت الطلب:' : 'Request Timestamp:'}</span>
              <span className="text-slate-700 font-mono text-[11px] block">2026-11-07 11:30</span>
            </div>
          </div>
        </div>

        {/* Priority, Fasting & Presets Bar */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Priority & Fasting Controls */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Urgency */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold px-2 text-[11px]">{isAr ? 'درجة الاستعجال:' : 'Urgency:'}</span>
              <button
                type="button"
                onClick={() => setUrgency('Routine')}
                className={`px-2.5 py-1 rounded font-bold transition-colors ${
                  urgency === 'Routine' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'روتيني (Routine)' : 'Routine'}
              </button>
              <button
                type="button"
                onClick={() => setUrgency('Urgent')}
                className={`px-2.5 py-1 rounded font-bold transition-colors ${
                  urgency === 'Urgent' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'عاجل (Urgent)' : 'Urgent'}
              </button>
              <button
                type="button"
                onClick={() => setUrgency('Stat')}
                className={`px-2.5 py-1 rounded font-bold transition-colors flex items-center gap-1 ${
                  urgency === 'Stat' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>⚡</span>
                <span>{isAr ? 'فوري طارئ (STAT)' : 'STAT (Emergency)'}</span>
              </button>
            </div>

            {/* Fasting Condition */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-[11px]">
              <span className="text-slate-500 font-semibold px-1.5">{isAr ? 'الحالة الغذائية:' : 'Fasting:'}</span>
              <select
                value={fastingStatus}
                onChange={(e) => setFastingStatus(e.target.value as any)}
                className="bg-white border border-slate-200 rounded px-2 py-0.5 font-medium text-slate-800 focus:outline-none"
              >
                <option value="random">{isAr ? 'عشوائي (Random Draw)' : 'Random'}</option>
                <option value="fasting">{isAr ? 'صائم 8-12 ساعة (Fasting)' : 'Fasting 8-12h'}</option>
                <option value="postprandial">{isAr ? 'بعد الأكل بساعتين (Post-Prandial)' : 'Post-Prandial 2h'}</option>
              </select>
            </div>
          </div>

          {/* Quick Search within Worksheet */}
          <div className="relative flex items-center w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute rtl:right-2.5 ltr:left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في ورقة العمل (CBC, Hb, LFT)...' : 'Filter worksheet tests...'}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg rtl:pr-8 rtl:pl-3 ltr:pl-8 ltr:pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute rtl:left-2 ltr:right-2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Traditional Quick Requisition Presets Bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 no-scrollbar">
          <span className="text-slate-500 font-bold shrink-0 text-[11px]">
            {isAr ? 'باقات ورقة العمل السريعة:' : 'Worksheet Presets:'}
          </span>
          <button
            type="button"
            onClick={() => applyPreset('admission')}
            className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-slate-300 hover:border-teal-400 rounded-md text-slate-800 font-semibold shrink-0 transition-colors flex items-center gap-1"
          >
            <span>📋</span>
            <span>{isAr ? 'دخول التنويم والولادة الروتيني' : 'Maternity Admission'}</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('preeclampsia')}
            className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-400 rounded-md text-slate-800 font-semibold shrink-0 transition-colors flex items-center gap-1"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>{isAr ? 'تسمم الحمل (Preeclampsia Toxemia)' : 'Preeclampsia Toxemia'}</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('cesarean')}
            className="px-2.5 py-1 bg-white hover:bg-sky-50 border border-slate-300 hover:border-sky-400 rounded-md text-slate-800 font-semibold shrink-0 transition-colors flex items-center gap-1"
          >
            <span>🔪</span>
            <span>{isAr ? 'تحضير العمليات القيصرية (Pre-Op)' : 'Pre-Op C-Section'}</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('hemorrhage')}
            className="px-2.5 py-1 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-400 rounded-md text-red-700 font-semibold shrink-0 transition-colors flex items-center gap-1"
          >
            <span>🩸</span>
            <span>{isAr ? 'نزيف ما بعد الولادة STAT' : 'Postpartum Bleed STAT'}</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('endocrine')}
            className="px-2.5 py-1 bg-white hover:bg-purple-50 border border-slate-300 hover:border-purple-400 rounded-md text-slate-800 font-semibold shrink-0 transition-colors flex items-center gap-1"
          >
            <span>🧪</span>
            <span>{isAr ? 'هرمونات وحمل مبكر' : 'Early Pregnancy & Hormones'}</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('clear')}
            className="px-2 py-1 text-slate-500 hover:text-slate-800 shrink-0 font-medium text-[11px]"
          >
            {isAr ? 'تفريغ التحديد' : 'Clear All'}
          </button>
        </div>

        {/* TRADITIONAL MULTI-COLUMN LABORATORY BENCH WORKSHEET */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => {
              const testsInCat = filteredCatalog.filter(t => t.category === category.key);
              if (testsInCat.length === 0) return null;

              const selectedCount = testsInCat.filter(t => selectedTestIds.has(t.id)).length;

              return (
                <div 
                  key={category.key}
                  className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-slate-300 transition-colors"
                >
                  {/* Panel Worksheet Header (Mimics Hospital Bench Sheet) */}
                  <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs tracking-tight">
                        {isAr ? category.nameAr : category.nameEn}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {category.defaultTube}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                      selectedCount > 0 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {selectedCount}/{testsInCat.length}
                    </span>
                  </div>

                  {/* Worksheet Test Checkbox Rows */}
                  <div className="divide-y divide-slate-100 text-xs">
                    {testsInCat.map(test => {
                      const isSelected = selectedTestIds.has(test.id);

                      return (
                        <label
                          key={test.id}
                          className={`p-2.5 flex items-start gap-2.5 cursor-pointer select-none transition-colors ${
                            isSelected ? 'bg-teal-50/70 text-slate-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {/* Traditional Checkbox Box */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTest(test.id)}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          {/* Test Code & Name */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                                {test.code}
                              </span>
                              <span className="truncate text-xs font-bold text-slate-900">
                                {isAr ? test.nameAr : test.nameEn}
                              </span>
                            </div>

                            {/* Reference Range & TAT */}
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                              <span className="truncate" title={test.refRange}>
                                {isAr ? 'المرجع:' : 'Ref:'} {test.refRange}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="text-teal-700 font-semibold">{test.turnaroundTime}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clinical Notes & Specimen Tube Requirements Bottom Strip */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 shrink-0 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Clinical Indication Field */}
            <div>
              <label className="block text-slate-600 font-bold mb-1">
                {isAr ? 'التشخيص / المبرر السريري لطلب التحاليل (Clinical Indication) *' : 'Clinical Indication / Diagnosis *'}
              </label>
              <input
                type="text"
                value={clinicalIndication}
                onChange={(e) => setClinicalIndication(e.target.value)}
                placeholder={isAr ? 'مثال: اشتباه تسمم حمل / تحضير لعملية قيصرية إسعافية' : 'e.g. Suspected preeclampsia, pre-op clearance'}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Specimen Tube Calculation Summary */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                {isAr ? 'عينات وأنابيب السحب المطلوبة (Phlebotomy Tube Requirements):' : 'Specimen Collection Tubes Required:'}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {tubeRequirements.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">
                    {isAr ? 'لم يتم تحديد أي فحوصات بعد' : 'No tests selected yet'}
                  </span>
                ) : (
                  tubeRequirements.map((tube, i) => (
                    <span 
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 border border-slate-300 text-slate-800"
                    >
                      <span className={`w-2 h-2 rounded-full ${tube.color}`}></span>
                      <span>{tube.label}</span>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-800">
                {isAr ? 'إجمالي الفحوصات المختارة في ورقة العمل:' : 'Total Tests Selected:'}{' '}
                <strong className="text-teal-700 text-sm font-mono">{selectedTests.length}</strong>
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-600 font-mono text-[11px]">
                {isAr ? 'الأولوية:' : 'Priority:'} <strong className="text-slate-900">{urgency}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleSubmitWorksheetOrder}
                disabled={isSubmitting || selectedTests.length === 0}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSubmitting 
                    ? (isAr ? 'جاري إرسال ورقة العمل...' : 'Submitting Worksheet...') 
                    : (isAr ? `اعتماد وإرسال ورقة العمل (${selectedTests.length} فحص)` : `Submit Lab Worksheet (${selectedTests.length} Tests)`)}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
