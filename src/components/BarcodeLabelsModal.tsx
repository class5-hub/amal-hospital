import React, { useState, useRef } from 'react';
import { 
  Printer, 
  X, 
  Check, 
  Copy, 
  Sliders, 
  Tag, 
  ShieldAlert, 
  Heart, 
  Baby, 
  Sparkles, 
  Layers, 
  FileText,
  User,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Patient, Admission, Language } from '../types/hmis.ts';

interface BarcodeLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  allPatients: Patient[];
  allAdmissions: Admission[];
  language: Language;
}

export type LabelType = 'wristband' | 'specimen' | 'pharmacy' | 'chart' | 'mother_baby' | 'sheet';

// --- Code 128 Barcode Subset B Vector Generator ---
// Code 128 patterns for indices 0 to 106 (each is 6 bar/space widths, stop is 7)
const CODE128_PATTERNS: string[] = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112"
];

function generateCode128Svg(text: string, height: number = 44, barWidth: number = 2): { svgBars: string; totalWidth: number } {
  const safeText = text.replace(/[^\x20-\x7E]/g, '');
  if (!safeText) return { svgBars: '', totalWidth: 0 };

  const startCode = 104; // Start Code B
  let checksum = startCode;
  const codes: number[] = [startCode];

  for (let i = 0; i < safeText.length; i++) {
    const charCode = safeText.charCodeAt(i);
    const codeVal = charCode - 32;
    codes.push(codeVal);
    checksum += codeVal * (i + 1);
  }

  const checkCode = checksum % 103;
  codes.push(checkCode);
  codes.push(106); // Stop code

  let x = 10; // Quiet zone
  const rects: string[] = [];

  for (let c = 0; c < codes.length; c++) {
    const codeIndex = codes[c];
    const pattern = CODE128_PATTERNS[codeIndex] || CODE128_PATTERNS[0];
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const w = parseInt(pattern[p], 10) * barWidth;
      if (isBar) {
        rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000000" />`);
      }
      x += w;
      isBar = !isBar;
    }
  }

  // Termination bar for stop code
  rects.push(`<rect x="${x}" y="0" width="${barWidth * 2}" height="${height}" fill="#000000" />`);
  x += barWidth * 2 + 10; // Ending quiet zone

  return { svgBars: rects.join(''), totalWidth: x };
}

export const BarcodeLabelsModal: React.FC<BarcodeLabelsModalProps> = ({
  isOpen,
  onClose,
  currentPatient,
  currentAdmission,
  allPatients,
  allAdmissions,
  language
}) => {
  const isAr = language === 'ar';

  // Selected patient & admission for printing
  const [selectedMrn, setSelectedMrn] = useState<string>(currentPatient?.mrn || (allPatients[0]?.mrn ?? ''));
  const activePatient = allPatients.find(p => p.mrn === selectedMrn) || currentPatient || allPatients[0];
  const activeAdmission = allAdmissions.find(a => a.mrn === activePatient?.mrn) || currentAdmission;

  // Active Label Template
  const [labelType, setLabelType] = useState<LabelType>('wristband');
  const [copies, setCopies] = useState<number>(2);

  // Customization Toggles
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [showAllergiesWarning, setShowAllergiesWarning] = useState<boolean>(true);
  const [showNationalId, setShowNationalId] = useState<boolean>(true);
  const [showAttendingDoctor, setShowAttendingDoctor] = useState<boolean>(true);
  const [showBedRoom, setShowBedRoom] = useState<boolean>(true);
  const [copiedMrn, setCopiedMrn] = useState<boolean>(false);

  // Specimen subtype
  const [specimenType, setSpecimenType] = useState<'EDTA Whole Blood' | 'Serum Chemistry' | 'Coagulation PT/INR' | 'Urine Sterile'>('EDTA Whole Blood');
  const [specimenTestName, setSpecimenTestName] = useState<string>('CBC & Blood Group crossmatch');

  // Newborn Details (for Mother-Baby wristbands)
  const [babyGender, setBabyGender] = useState<'female' | 'male'>('female');
  const [babyBirthWeight, setBabyBirthWeight] = useState<string>('3.250 kg');
  const [babyBirthTime, setBabyBirthTime] = useState<string>('08:45 AM');

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !activePatient) return null;

  const mrnCode = activePatient.mrn;
  const barcodeData = generateCode128Svg(mrnCode, 42, 2);
  const compactBarcodeData = generateCode128Svg(mrnCode, 32, 1.6);
  const tinyBarcodeData = generateCode128Svg(mrnCode, 24, 1.2);

  const hasAllergies = activePatient.allergies.length > 0 && 
    !activePatient.allergies[0].toLowerCase().includes('no known');

  const handleCopyMrn = () => {
    navigator.clipboard.writeText(activePatient.mrn);
    setCopiedMrn(true);
    setTimeout(() => setCopiedMrn(false), 2000);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  // Realistic mock QR pattern using SVG matrix for patient data
  const renderQrSvg = (size: number = 64) => {
    return (
      <svg width={size} height={size} viewBox="0 0 25 25" className="bg-white p-0.5 rounded border border-slate-300">
        <rect width="25" height="25" fill="#fff" />
        {/* Corner 1 */}
        <rect x="1" y="1" width="7" height="7" fill="#000" />
        <rect x="2" y="2" width="5" height="5" fill="#fff" />
        <rect x="3" y="3" width="3" height="3" fill="#000" />
        {/* Corner 2 */}
        <rect x="17" y="1" width="7" height="7" fill="#000" />
        <rect x="18" y="2" width="5" height="5" fill="#fff" />
        <rect x="19" y="3" width="3" height="3" fill="#000" />
        {/* Corner 3 */}
        <rect x="1" y="17" width="7" height="7" fill="#000" />
        <rect x="2" y="18" width="5" height="5" fill="#fff" />
        <rect x="3" y="19" width="3" height="3" fill="#000" />
        {/* Data points */}
        <rect x="9" y="2" width="1" height="2" fill="#000" />
        <rect x="11" y="1" width="2" height="1" fill="#000" />
        <rect x="14" y="2" width="1" height="2" fill="#000" />
        <rect x="9" y="5" width="2" height="2" fill="#000" />
        <rect x="13" y="5" width="2" height="1" fill="#000" />
        <rect x="10" y="8" width="5" height="1" fill="#000" />
        <rect x="2" y="9" width="2" height="1" fill="#000" />
        <rect x="5" y="10" width="1" height="2" fill="#000" />
        <rect x="9" y="10" width="2" height="2" fill="#000" />
        <rect x="13" y="10" width="2" height="2" fill="#000" />
        <rect x="17" y="9" width="2" height="1" fill="#000" />
        <rect x="20" y="10" width="3" height="1" fill="#000" />
        <rect x="10" y="13" width="2" height="3" fill="#000" />
        <rect x="14" y="13" width="3" height="1" fill="#000" />
        <rect x="13" y="15" width="2" height="2" fill="#000" />
        <rect x="9" y="17" width="2" height="1" fill="#000" />
        <rect x="12" y="18" width="1" height="2" fill="#000" />
        <rect x="15" y="18" width="2" height="2" fill="#000" />
        <rect x="18" y="17" width="2" height="2" fill="#000" />
        <rect x="21" y="18" width="2" height="2" fill="#000" />
        <rect x="10" y="21" width="3" height="2" fill="#000" />
        <rect x="14" y="21" width="2" height="1" fill="#000" />
        <rect x="17" y="21" width="2" height="2" fill="#000" />
        <rect x="21" y="21" width="2" height="2" fill="#000" />
      </svg>
    );
  };

  const patientAge = new Date().getFullYear() - new Date(activePatient.dob).getFullYear();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-200">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>{isAr ? 'طباعة ملصقات الباركود وهوية المريض' : 'Print Barcode Labels & Patient ID'}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/30 border border-teal-400/40 text-teal-100 font-normal">
                  Code 128 & QR
                </span>
              </h2>
              <p className="text-xs text-teal-200/80">
                {isAr 
                  ? 'أساور معصم المريض، ملصقات أنابيب المختبر، ملصقات الأدوية، وملصقات الملفات الطبية' 
                  : 'Patient wristbands, lab specimen tube labels, pharmacy unit-dose, and medical record tags'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-md transition-all transform active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة فورية' : 'Print Now'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Controls & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          
          {/* Left Column: Settings, Patient Selector & Format Options */}
          <div className="lg:col-span-5 p-5 border-b lg:border-b-0 lg:border-e border-slate-200 overflow-y-auto space-y-5 bg-slate-50/70">
            
            {/* Patient Selector */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isAr ? 'تحديد المريض المراد طباعة ملصقه:' : 'Select Patient:'}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-normal">
                  {allPatients.length} {isAr ? 'مريض مسجل' : 'registered'}
                </span>
              </label>

              <select
                value={selectedMrn}
                onChange={(e) => setSelectedMrn(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                {allPatients.map(p => {
                  const adm = allAdmissions.find(a => a.mrn === p.mrn);
                  return (
                    <option key={p.mrn} value={p.mrn}>
                      {p.fullName} — {p.mrn} {adm ? `(الغرفة ${adm.roomNumber})` : ''}
                    </option>
                  );
                })}
              </select>

              {/* Quick Info Strip */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <div className="flex items-center gap-1">
                  <span className="font-mono font-bold text-slate-900">{activePatient.mrn}</span>
                  <button
                    type="button"
                    onClick={handleCopyMrn}
                    className="text-slate-400 hover:text-teal-600 transition-colors p-0.5"
                    title={isAr ? 'نسخ رقم MRN' : 'Copy MRN'}
                  >
                    {copiedMrn ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-bold font-mono">
                    {activePatient.bloodGroup}
                  </span>
                  <span>{patientAge} {isAr ? 'سنة' : 'yrs'}</span>
                </div>
              </div>
            </div>

            {/* Label Template Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'نوع ونموذج الملصق المطلوب:' : 'Label Template:'}</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* 1. Wristband */}
                <button
                  type="button"
                  onClick={() => setLabelType('wristband')}
                  className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer ${
                    labelType === 'wristband'
                      ? 'bg-teal-50/80 border-teal-500 text-teal-900 shadow-2xs font-bold ring-1 ring-teal-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>{isAr ? 'سوار معصم المريض' : 'Patient Wristband'}</span>
                    <span className="text-[10px] text-teal-700 font-mono">25x250mm</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {isAr ? 'سوار التنويم الإيوائي المعتمد' : 'Standard adult inpatient band'}
                  </p>
                </button>

                {/* 2. Specimen Tube */}
                <button
                  type="button"
                  onClick={() => setLabelType('specimen')}
                  className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer ${
                    labelType === 'specimen'
                      ? 'bg-teal-50/80 border-teal-500 text-teal-900 shadow-2xs font-bold ring-1 ring-teal-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>{isAr ? 'عينة مختبر / أنبوب' : 'Lab Specimen Tube'}</span>
                    <span className="text-[10px] text-teal-700 font-mono">50x25mm</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {isAr ? 'ملصق أنابيب الدم والتحاليل' : 'Blood tube & vial label'}
                  </p>
                </button>

                {/* 3. Pharmacy Dispense */}
                <button
                  type="button"
                  onClick={() => setLabelType('pharmacy')}
                  className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer ${
                    labelType === 'pharmacy'
                      ? 'bg-teal-50/80 border-teal-500 text-teal-900 shadow-2xs font-bold ring-1 ring-teal-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>{isAr ? 'ملصق صيدلية وجرعة' : 'Pharmacy Dispense'}</span>
                    <span className="text-[10px] text-teal-700 font-mono">60x35mm</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {isAr ? 'جرعات الأدوية والمحاليل' : 'Unit-dose & IV infusions'}
                  </p>
                </button>

                {/* 4. Chart Folder */}
                <button
                  type="button"
                  onClick={() => setLabelType('chart')}
                  className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer ${
                    labelType === 'chart'
                      ? 'bg-teal-50/80 border-teal-500 text-teal-900 shadow-2xs font-bold ring-1 ring-teal-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>{isAr ? 'ملصق الملف الورقي' : 'Medical Chart Folder'}</span>
                    <span className="text-[10px] text-teal-700 font-mono">75x50mm</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {isAr ? 'غلاف الإضبارة والسجل' : 'Folder cover & archive'}
                  </p>
                </button>

                {/* 5. Mother & Baby Pair */}
                <button
                  type="button"
                  onClick={() => setLabelType('mother_baby')}
                  className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer ${
                    labelType === 'mother_baby'
                      ? 'bg-teal-50/80 border-teal-500 text-teal-900 shadow-2xs font-bold ring-1 ring-teal-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Baby className="w-3.5 h-3.5 text-pink-600" />
                      <span>{isAr ? 'أساور الأم والوليد' : 'Mother & Baby Pair'}</span>
                    </span>
                    <span className="text-[10px] text-pink-700 font-mono">2-in-1</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {isAr ? 'مطابقة أمان الأم والمولود' : 'Dual matched security bands'}
                  </p>
                </button>

                {/* 6. Multi-label sheet */}
                <button
                  type="button"
                  onClick={() => setLabelType('sheet')}
                  className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer ${
                    labelType === 'sheet'
                      ? 'bg-teal-50/80 border-teal-500 text-teal-900 shadow-2xs font-bold ring-1 ring-teal-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>{isAr ? 'ورقة ملصقات A4' : 'A4 Multi-label Sheet'}</span>
                    <span className="text-[10px] text-teal-700 font-mono">12-up</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {isAr ? 'لطابعات الليزر العادية' : 'Office laser & inkjet sheet'}
                  </p>
                </button>
              </div>
            </div>

            {/* Template Specific Options */}
            {labelType === 'specimen' && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-700">{isAr ? 'بيانات أنبوب العينة:' : 'Specimen Details:'}</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">{isAr ? 'نوع العينة' : 'Specimen Type'}</label>
                    <select
                      value={specimenType}
                      onChange={(e) => setSpecimenType(e.target.value as any)}
                      className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded"
                    >
                      <option value="EDTA Whole Blood">EDTA (Lavender Tube)</option>
                      <option value="Serum Chemistry">Serum Gel (Yellow/Red)</option>
                      <option value="Coagulation PT/INR">Citrate (Light Blue)</option>
                      <option value="Urine Sterile">Sterile Urine Cup</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">{isAr ? 'الفحص المطلوب' : 'Test'}</label>
                    <input
                      type="text"
                      value={specimenTestName}
                      onChange={(e) => setSpecimenTestName(e.target.value)}
                      className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {labelType === 'mother_baby' && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-pink-800 flex items-center gap-1.5">
                  <Baby className="w-3.5 h-3.5 text-pink-600" />
                  <span>{isAr ? 'بيانات المولود لربط الأساور:' : 'Newborn Details:'}</span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">{isAr ? 'الجنس' : 'Gender'}</label>
                    <select
                      value={babyGender}
                      onChange={(e) => setBabyGender(e.target.value as any)}
                      className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded"
                    >
                      <option value="female">{isAr ? 'أنثى' : 'Female'}</option>
                      <option value="male">{isAr ? 'ذكر' : 'Male'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">{isAr ? 'الوزن' : 'Weight'}</label>
                    <input
                      type="text"
                      value={babyBirthWeight}
                      onChange={(e) => setBabyBirthWeight(e.target.value)}
                      className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">{isAr ? 'ساعة الولادة' : 'Time'}</label>
                    <input
                      type="text"
                      value={babyBirthTime}
                      onChange={(e) => setBabyBirthTime(e.target.value)}
                      className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Customization Checkboxes */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'خيارات المحتوى المطبوع:' : 'Print Content Fields:'}</span>
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showQrCode}
                    onChange={(e) => setShowQrCode(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>{isAr ? 'كود الاستجابة السريع 2D QR' : '2D QR Code'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAllergiesWarning}
                    onChange={(e) => setShowAllergiesWarning(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>{isAr ? 'تنبيه الحساسية السريرية' : 'Allergies Alert'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showNationalId}
                    onChange={(e) => setShowNationalId(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>{isAr ? 'الرقم الوطني' : 'National ID'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showBedRoom}
                    onChange={(e) => setShowBedRoom(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>{isAr ? 'رقم الغرفة والسرير' : 'Room & Bed'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAttendingDoctor}
                    onChange={(e) => setShowAttendingDoctor(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>{isAr ? 'الاستشاري المعالج' : 'Consultant'}</span>
                </label>
              </div>

              {/* Number of copies */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{isAr ? 'عدد النسخ المطبوعة:' : 'Print Copies:'}</span>
                <div className="flex items-center gap-2">
                  {[1, 2, 4, 8].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCopies(n)}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        copies === n ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Print Instructions / Hint */}
            <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-900 text-[11px] leading-relaxed">
              <span className="font-bold flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'توافق أجهزة الطباعة الطبية:' : 'Thermal & Office Printer Compatibility:'}</span>
              </span>
              {isAr
                ? 'متوافق مع طابعات الأساور الحرارية القياسية (Zebra, Honeywell, TSC, Brother) وطابعات الملصقات اللاصقة مقاس 25×250mm أو 50×30mm وكذلك الطابعات المكتبية العادية.'
                : 'Directly compatible with thermal wristband & barcode label printers (Zebra ZD510, HC100, Honeywell, Dymo) and standard laser/inkjet sheet printers.'}
            </div>

          </div>

          {/* Right Column: Live High-Fidelity Preview & Print Layout */}
          <div className="lg:col-span-7 p-6 overflow-y-auto flex flex-col items-center justify-start bg-slate-200/50">
            
            {/* Live Preview Bar */}
            <div className="w-full flex items-center justify-between mb-4 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{isAr ? 'معاينة الملصق المباشرة قبل الطباعة:' : 'Live Label Preview:'}</span>
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                {labelType === 'wristband' && '1" × 10" (25mm × 250mm) Patient Band'}
                {labelType === 'specimen' && '2" × 1" (50mm × 25mm) Tube Label'}
                {labelType === 'pharmacy' && '2.5" × 1.5" (60mm × 35mm) Dose Tag'}
                {labelType === 'chart' && '3" × 2" (75mm × 50mm) Chart Cover'}
                {labelType === 'mother_baby' && 'Dual Matched Set (Mom & Baby)'}
                {labelType === 'sheet' && 'A4 Sheet (12 Labels Grid)'}
              </span>
            </div>

            {/* Printable Container Wrapper */}
            <div 
              ref={printAreaRef}
              id="hmis-barcode-print-area"
              className="w-full flex flex-col items-center gap-5 transition-all select-none"
            >
              
              {/* --- 1. PATIENT INPATIENT WRISTBAND --- */}
              {labelType === 'wristband' && (
                <div className="w-full max-w-xl bg-white border-2 border-slate-300 rounded-xl p-4 shadow-lg text-slate-900 relative overflow-hidden font-sans print-break-inside-avoid">
                  {/* Visual Clip Strap holes for wristband representation */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 opacity-40 no-print">
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-400 bg-slate-100"></span>
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-400 bg-slate-100"></span>
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-400 bg-slate-100"></span>
                  </div>

                  {/* Hospital Top Bar */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-teal-800 text-white flex items-center justify-center font-bold text-xs">
                        أ
                      </div>
                      <div>
                        <h4 className="text-xs font-black tracking-tight text-slate-900 leading-none">
                          مستشفى الأمل التخصصي للنساء والولادة والإيواء
                        </h4>
                        <span className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase">
                          Al-Amal Specialized Maternity Hospital · Inpatient ID Band
                        </span>
                      </div>
                    </div>
                    
                    {/* Blood Group Highlight Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold">{isAr ? 'فصيلة الدم:' : 'Blood:'}</span>
                      <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono font-black text-sm leading-tight shadow-2xs">
                        {activePatient.bloodGroup}
                      </span>
                    </div>
                  </div>

                  {/* Main Identity Content Strip */}
                  <div className="flex items-start justify-between gap-4">
                    {/* Patient Core Demographics */}
                    <div className="space-y-1 flex-1 min-w-0">
                      {/* Name Arabic & English */}
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                          {isAr ? 'اسم المريضة الكامل' : 'Patient Full Name'}
                        </span>
                        <h3 className="text-base font-black text-slate-950 truncate leading-tight">
                          {activePatient.fullName}
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-1">
                        <div>
                          <span className="text-slate-400 text-[10px] block">{isAr ? 'رقم الملف الدائم (MRN):' : 'MRN:'}</span>
                          <span className="font-mono font-black text-slate-950 text-sm tracking-wide">
                            {activePatient.mrn}
                          </span>
                        </div>

                        {showNationalId && (
                          <div>
                            <span className="text-slate-400 text-[10px] block">{isAr ? 'الرقم الوطني:' : 'National ID:'}</span>
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              {activePatient.nationalId}
                            </span>
                          </div>
                        )}

                        <div>
                          <span className="text-slate-400 text-[10px] block">{isAr ? 'العمر / الجنس / تاريخ الميلاد:' : 'Age / Gender / DOB:'}</span>
                          <span className="font-semibold text-slate-800 text-xs">
                            {patientAge} {isAr ? 'سنة' : 'yrs'} · {activePatient.gender === 'female' ? (isAr ? 'أنثى' : 'F') : (isAr ? 'ذكر' : 'M')} · {activePatient.dob}
                          </span>
                        </div>

                        {showBedRoom && activeAdmission && (
                          <div>
                            <span className="text-slate-400 text-[10px] block">{isAr ? 'الغرفة والسّرير / القسم:' : 'Room & Bed:'}</span>
                            <span className="font-bold text-teal-800 text-xs font-mono">
                              {isAr ? `غرفة ${activeAdmission.roomNumber}` : `Rm ${activeAdmission.roomNumber}`} (سرير {activeAdmission.bedId})
                            </span>
                          </div>
                        )}

                        {showAttendingDoctor && activeAdmission && (
                          <div className="col-span-2">
                            <span className="text-slate-400 text-[10px] block">{isAr ? 'الاستشاري المسؤول:' : 'Consultant:'}</span>
                            <span className="font-bold text-slate-800 text-xs truncate">
                              {activeAdmission.attendingConsultantName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* QR Code */}
                    {showQrCode && (
                      <div className="shrink-0 flex flex-col items-center justify-center p-1 bg-slate-50 border border-slate-200 rounded-lg">
                        {renderQrSvg(70)}
                        <span className="text-[8px] font-mono font-bold text-slate-500 mt-1 uppercase">
                          SCAN FOR EMR
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Primary Code 128 Barcode Strip */}
                  <div className="mt-3 pt-2 border-t border-dashed border-slate-300 flex flex-col items-center justify-center">
                    <svg 
                      width="100%" 
                      height="46" 
                      viewBox={`0 0 ${barcodeData.totalWidth} 42`} 
                      preserveAspectRatio="xMidYMid meet"
                      className="max-w-md w-full"
                      dangerouslySetInnerHTML={{ __html: barcodeData.svgBars }}
                    />
                    <span className="font-mono font-black text-slate-900 text-xs tracking-widest mt-0.5">
                      *{activePatient.mrn}*
                    </span>
                  </div>

                  {/* Allergies Critical Banner */}
                  {showAllergiesWarning && hasAllergies && (
                    <div className="mt-2 py-1 px-2.5 bg-rose-600 text-white rounded flex items-center justify-between text-[11px] font-bold">
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>{isAr ? 'تحذير حساسية موثقة:' : 'ALLERGY ALERT:'}</span>
                        <span className="font-mono">{activePatient.allergies.join(', ')}</span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider">{isAr ? 'حذر سريري' : 'CLINICAL ALERT'}</span>
                    </div>
                  )}

                  {/* Timestamp & Verification Barcode */}
                  <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                    <span>ADM ID: {activeAdmission?.admissionId || 'ADM-INP-2026'}</span>
                    <span>ISSUED: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>AL-AMAL HMIS v4.0</span>
                  </div>
                </div>
              )}

              {/* --- 2. LAB SPECIMEN TUBE LABEL --- */}
              {labelType === 'specimen' && (
                <div className="w-80 bg-white border-2 border-slate-400 rounded-lg p-3 shadow-md text-slate-900 font-sans print-break-inside-avoid">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
                    <span className="font-black text-xs text-slate-900">Al-Amal LIS Lab Sample</span>
                    <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-1 rounded">
                      {specimenType.split(' ')[0]}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="font-black text-xs text-slate-950 truncate">
                      {activePatient.fullName}
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-slate-900">{activePatient.mrn}</span>
                      <span className="font-bold text-red-600 font-sans">{activePatient.bloodGroup}</span>
                      <span>{patientAge}y · {activePatient.gender === 'female' ? 'F' : 'M'}</span>
                    </div>
                    {activeAdmission && (
                      <div className="text-[10px] text-slate-600 font-mono">
                        Ward: {activeAdmission.department.slice(0, 15)} · Rm: {activeAdmission.roomNumber}
                      </div>
                    )}
                    <div className="text-[10px] font-bold text-indigo-900 truncate">
                      Test: {specimenTestName}
                    </div>
                  </div>

                  {/* Barcode */}
                  <div className="mt-2 pt-1 border-t border-slate-200 flex flex-col items-center">
                    <svg 
                      width="100%" 
                      height="34" 
                      viewBox={`0 0 ${compactBarcodeData.totalWidth} 32`} 
                      preserveAspectRatio="xMidYMid meet"
                      className="w-full"
                      dangerouslySetInnerHTML={{ __html: compactBarcodeData.svgBars }}
                    />
                    <span className="font-mono font-bold text-[10px] tracking-wider">
                      {activePatient.mrn}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[8px] text-slate-400 font-mono">
                    <span>Coll: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>Tech: Lab Staff</span>
                  </div>
                </div>
              )}

              {/* --- 3. PHARMACY DISPENSE LABEL --- */}
              {labelType === 'pharmacy' && (
                <div className="w-96 bg-white border-2 border-slate-400 rounded-lg p-3.5 shadow-md text-slate-900 font-sans print-break-inside-avoid">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-2">
                    <div className="text-xs font-black text-teal-800">صيدلية مستشفى الأمل · Inpatient Pharmacy</div>
                    <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-900 px-1 rounded">Rx Unit-Dose</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="truncate">{activePatient.fullName}</span>
                      <span className="font-mono text-teal-900">{activePatient.mrn}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 font-mono">
                      {activeAdmission ? `Room: ${activeAdmission.roomNumber} (Bed ${activeAdmission.bedId})` : 'Outpatient / Day Care'} · {activeAdmission?.attendingConsultantName}
                    </div>

                    <div className="p-2 bg-slate-50 border border-slate-200 rounded mt-1.5 space-y-0.5">
                      <div className="text-xs font-black text-slate-950">Cefazolin 1g IV Powder for Injection</div>
                      <div className="text-[11px] text-slate-700 font-medium">الجرعة: 1 غرام بالوريد كل 8 ساعات بعد اختبار الحساسية</div>
                      <div className="text-[10px] text-slate-500 font-mono">Qty: 3 Vials · Exp: 2027-10 · Batch: #AMAL-7819</div>
                    </div>
                  </div>

                  {/* Barcode */}
                  <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex flex-col items-center">
                      <svg 
                        width="180" 
                        height="30" 
                        viewBox={`0 0 ${compactBarcodeData.totalWidth} 32`} 
                        preserveAspectRatio="xMidYMid meet"
                        dangerouslySetInnerHTML={{ __html: compactBarcodeData.svgBars }}
                      />
                      <span className="font-mono text-[9px] font-bold">{activePatient.mrn}</span>
                    </div>
                    {showQrCode && renderQrSvg(45)}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[8px] text-slate-400 font-mono">
                    <span>Dispensed by: Pharm. Bassem</span>
                    <span>Verify with eMAR scanner before admin</span>
                  </div>
                </div>
              )}

              {/* --- 4. MEDICAL CHART FOLDER ARCHIVE LABEL --- */}
              {labelType === 'chart' && (
                <div className="w-[420px] bg-white border-2 border-slate-400 rounded-xl p-4 shadow-lg text-slate-900 font-sans print-break-inside-avoid">
                  <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-2">
                    <div>
                      <h3 className="font-black text-sm text-slate-950">إضبارة السجل الطبي العام</h3>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">
                        Permanent Inpatient Medical Record
                      </span>
                    </div>
                    <div className="text-end font-mono">
                      <span className="text-xs font-black text-teal-800 block">{activePatient.mrn}</span>
                      <span className="text-[9px] text-slate-400">FILE ARCHIVE</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'اسم المريضة الثلاثي واللقب:' : 'Patient Name:'}</span>
                      <h2 className="text-base font-black text-slate-950">{activePatient.fullName}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-slate-400 text-[10px] block">{isAr ? 'الرقم الوطني:' : 'National ID:'}</span>
                        <span className="font-mono font-bold text-slate-900">{activePatient.nationalId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">{isAr ? 'فصيلة الدم:' : 'Blood Group:'}</span>
                        <span className="font-bold text-red-600 font-mono text-sm">{activePatient.bloodGroup}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">{isAr ? 'تاريخ الميلاد والعمر:' : 'DOB & Age:'}</span>
                        <span className="font-semibold">{activePatient.dob} ({patientAge} {isAr ? 'سنة' : 'yrs'})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">{isAr ? 'رقم الهاتف:' : 'Phone:'}</span>
                        <span className="font-mono">{activePatient.phone}</span>
                      </div>
                      {activeAdmission && (
                        <div className="col-span-2">
                          <span className="text-slate-400 text-[10px] block">{isAr ? 'الاستشاري المسؤول:' : 'Consultant:'}</span>
                          <span className="font-bold text-slate-900">{activeAdmission.attendingConsultantName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Big high contrast barcode */}
                  <div className="mt-3 pt-2 border-t border-slate-300 flex flex-col items-center">
                    <svg 
                      width="100%" 
                      height="46" 
                      viewBox={`0 0 ${barcodeData.totalWidth} 42`} 
                      preserveAspectRatio="xMidYMid meet"
                      className="w-full"
                      dangerouslySetInnerHTML={{ __html: barcodeData.svgBars }}
                    />
                    <span className="font-mono font-black text-sm tracking-widest mt-1">
                      {activePatient.mrn}
                    </span>
                  </div>
                </div>
              )}

              {/* --- 5. MOTHER & NEWBORN MATCHING PAIR --- */}
              {labelType === 'mother_baby' && (
                <div className="w-full max-w-xl space-y-3">
                  {/* Mother Wristband */}
                  <div className="bg-white border-2 border-pink-300 rounded-xl p-3.5 shadow-md text-slate-900">
                    <div className="flex items-center justify-between border-b border-pink-200 pb-1 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-pink-900">
                        <Heart className="w-4 h-4 text-pink-600 fill-pink-600" />
                        <span>سوار الأم (Mother ID Band) · قسم الولادة</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-pink-100 text-pink-800 px-1.5 py-0.5 rounded">
                        MATERNAL MATCH #M-{activePatient.mrn.slice(-4)}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-950">{activePatient.fullName}</h4>
                        <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                          MRN: {activePatient.mrn} · Blood: <strong className="text-red-600">{activePatient.bloodGroup}</strong>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Delivery: {new Date().toLocaleDateString()} · Consultant: {activeAdmission?.attendingConsultantName || 'Dr. Tarek Ben-Amer'}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-center">
                        <svg 
                          width="160" 
                          height="30" 
                          viewBox={`0 0 ${compactBarcodeData.totalWidth} 32`} 
                          preserveAspectRatio="xMidYMid meet"
                          dangerouslySetInnerHTML={{ __html: compactBarcodeData.svgBars }}
                        />
                        <span className="text-[9px] font-mono font-bold">{activePatient.mrn}</span>
                      </div>
                    </div>
                  </div>

                  {/* Newborn Wristband */}
                  <div className="bg-white border-2 border-indigo-300 rounded-xl p-3.5 shadow-md text-slate-900">
                    <div className="flex items-center justify-between border-b border-indigo-200 pb-1 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-indigo-900">
                        <Baby className="w-4 h-4 text-indigo-600" />
                        <span>سوار المولود (Newborn Infant Band) · الحضانة وحديثي الولادة</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                        LINKED TO #{activePatient.mrn}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-indigo-950">
                          {isAr ? `مولود السيدة: ${activePatient.fullName}` : `Infant of ${activePatient.fullName}`}
                        </h4>
                        <div className="text-xs font-bold text-slate-700 mt-0.5 flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${babyGender === 'female' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                            {babyGender === 'female' ? (isAr ? 'أنثى (Baby Girl)' : 'Baby Girl') : (isAr ? 'ذكر (Baby Boy)' : 'Baby Boy')}
                          </span>
                          <span>{isAr ? 'الوزن:' : 'Wt:'} <strong className="font-mono">{babyBirthWeight}</strong></span>
                          <span>{isAr ? 'الوقت:' : 'Time:'} <strong className="font-mono">{babyBirthTime}</strong></span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Mother MRN: {activePatient.mrn} · Rh Status: {activePatient.bloodGroup}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-center">
                        <svg 
                          width="160" 
                          height="30" 
                          viewBox={`0 0 ${compactBarcodeData.totalWidth} 32`} 
                          preserveAspectRatio="xMidYMid meet"
                          dangerouslySetInnerHTML={{ __html: compactBarcodeData.svgBars }}
                        />
                        <span className="text-[9px] font-mono font-bold">BABY-{activePatient.mrn.slice(-4)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 6. A4 MULTI-LABEL SHEET GRID --- */}
              {labelType === 'sheet' && (
                <div className="w-full bg-white border border-slate-300 rounded-xl p-4 shadow-md text-slate-900 grid grid-cols-2 sm:grid-cols-3 gap-3 print-break-inside-avoid">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="border border-slate-300 rounded p-2 text-start space-y-1 bg-slate-50/50">
                      <div className="text-[10px] font-black text-slate-900 truncate">{activePatient.fullName}</div>
                      <div className="text-[9px] font-mono text-slate-600 flex items-center justify-between">
                        <span>{activePatient.mrn}</span>
                        <span className="font-bold text-red-600">{activePatient.bloodGroup}</span>
                      </div>
                      <div className="flex justify-center pt-1">
                        <svg 
                          width="100%" 
                          height="22" 
                          viewBox={`0 0 ${tinyBarcodeData.totalWidth} 24`} 
                          preserveAspectRatio="xMidYMid meet"
                          dangerouslySetInnerHTML={{ __html: tinyBarcodeData.svgBars }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Quick Action Buttons */}
            <div className="w-full max-w-xl mt-6 flex items-center justify-end gap-3 no-print">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 rounded-lg shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? `إرسال للطباعة (${copies} نسخ)` : `Print Labels (${copies} copies)`}</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
