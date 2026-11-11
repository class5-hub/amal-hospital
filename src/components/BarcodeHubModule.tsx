import React, { useState, useEffect, useRef } from 'react';
import {
  Patient,
  Admission,
  Language,
  SystemUser,
  MedicationOrder,
  LabOrder
} from '../types/hmis.ts';
import {
  Barcode,
  Printer,
  QrCode,
  Tag,
  ShieldAlert,
  Baby,
  FlaskConical,
  Pill,
  FileText,
  Sliders,
  Check,
  Copy,
  Scan,
  Maximize2,
  RefreshCw,
  Search,
  Building2,
  User,
  Calendar,
  Layers,
  Heart,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Volume2,
  Zap,
  Info,
  Droplets,
  Package,
  Scissors,
  ShieldCheck,
  Sparkles,
  Clock,
  ArrowRight,
  ExternalLink,
  History,
  TrendingUp,
  BarChart2,
  AlertOctagon,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import {
  generateCode128Svg,
  generateQrDataUrl,
  createPatientQrPayload,
  createSpecimenQrPayload,
  createMedicationQrPayload,
  parseScannedClinicalPayload,
  playScannerAudioBeep,
  ParsedClinicalScan
} from '../utils/barcodeService.ts';
import { BarcodeCameraScannerOverlay } from './BarcodeCameraScannerOverlay.tsx';

interface BarcodeHubModuleProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  allPatients: Patient[];
  allAdmissions: Admission[];
  language: Language;
  currentUser?: SystemUser | null;
  onSelectAdmission?: (adm: Admission) => void;
  medications?: MedicationOrder[];
  labOrders?: LabOrder[];
}

export type BarcodeTab = 
  | 'wristband' 
  | 'specimens' 
  | 'pharmacy' 
  | 'blood_bank' 
  | 'surgical' 
  | 'charts' 
  | 'belongings' 
  | 'sheet' 
  | 'bundle' 
  | 'scanner'
  | 'history';

export const BarcodeHubModule: React.FC<BarcodeHubModuleProps> = ({
  currentPatient,
  currentAdmission,
  allPatients,
  allAdmissions,
  language,
  currentUser,
  onSelectAdmission,
  medications = [],
  labOrders = []
}) => {
  const isAr = language === 'ar';

  // Selected Patient
  const [selectedMrn, setSelectedMrn] = useState<string>(
    currentPatient?.mrn || (allPatients[0]?.mrn ?? '')
  );

  const activePatient = allPatients.find(p => p.mrn === selectedMrn) || currentPatient || allPatients[0];
  const activeAdmission = allAdmissions.find(a => a.mrn === activePatient?.mrn) || currentAdmission;

  // Active Sub-tab
  const [activeTab, setActiveTab] = useState<BarcodeTab>('wristband');

  // Print & Layout Settings
  const [copies, setCopies] = useState<number>(2);
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [printerDpi, setPrinterDpi] = useState<number>(300);
  const [isCopied, setIsCopied] = useState(false);

  // Persistent Camera Scanner Overlay Trigger
  const [isCameraOverlayOpen, setIsCameraOverlayOpen] = useState<boolean>(false);

  // Content Customization Toggles
  const [includeQrCode, setIncludeQrCode] = useState<boolean>(true);
  const [includeAllergyAlert, setIncludeAllergyAlert] = useState<boolean>(true);
  const [includeBloodGroup, setIncludeBloodGroup] = useState<boolean>(true);
  const [includeDoctorName, setIncludeDoctorName] = useState<boolean>(true);
  const [includeBedRoom, setIncludeBedRoom] = useState<boolean>(true);

  // Specimen label customization
  const [tubeColor, setTubeColor] = useState<'lavender' | 'red' | 'blue' | 'green' | 'yellow'>('lavender');
  const [specimenTest, setSpecimenTest] = useState<string>('CBC & Crossmatch (صورة دم وفصيلة)');
  const [specimenSource, setSpecimenSource] = useState<string>('Venous Whole Blood');
  const [phlebotomistName, setPhlebotomistName] = useState<string>(currentUser?.name || 'ممرضة فاطمة الورفلي');

  // Pharmacy label customization
  const [medTradeName, setMedTradeName] = useState<string>('Cefotaxime (Claforan)');
  const [medGenericName, setMedGenericName] = useState<string>('Cefotaxime Sodium 1g');
  const [medDose, setMedDose] = useState<string>('1g in 100ml Normal Saline');
  const [medRoute, setMedRoute] = useState<string>('IV Infusion over 20m');
  const [medBatch, setMedBatch] = useState<string>('LOT-2026-X992');
  const [medExpiry, setMedExpiry] = useState<string>('2027-11-30');
  const [isHighAlertMed, setIsHighAlertMed] = useState<boolean>(false);

  // Blood Bank & Transfusion customization
  const [bloodDonorUnitId, setBloodDonorUnitId] = useState<string>('BLD-2026-A9941');
  const [bloodComponent, setBloodComponent] = useState<string>('Packed Red Blood Cells (PRBCs)');
  const [bloodVolume, setBloodVolume] = useState<string>('350 mL');
  const [bloodCrossmatchStatus, setBloodCrossmatchStatus] = useState<string>('Compatible / Serologically Crossmatched');
  const [bloodExpiryDate, setBloodExpiryDate] = useState<string>('2026-11-28');

  // Surgical Pathology & Biopsy customization
  const [surgicalSpecimenSite, setSurgicalSpecimenSite] = useState<string>('Uterine Myoma (Right Lateral Wall)');
  const [surgicalFixative, setSurgicalFixative] = useState<string>('10% Neutral Buffered Formalin');
  const [surgicalTheaterNumber, setSurgicalTheaterNumber] = useState<string>('OR Suite 02 (Obstetrics & Gynecology)');
  const [surgicalLeadSurgeon, setSurgicalLeadSurgeon] = useState<string>(activeAdmission?.attendingConsultantName || 'د. طارق الزنتاني');

  // Belongings & Infant Feeding customization
  const [belongingsLockerNumber, setBelongingsLockerNumber] = useState<string>('Locker #14 (Ward A)');
  const [belongingsBagCount, setBelongingsBagCount] = useState<string>('2 Bags + Handbag');
  const [breastmilkVolume, setBreastmilkVolume] = useState<string>('60 mL');
  const [breastmilkExpDate, setBreastmilkExpDate] = useState<string>('2026-11-11 08:30 (48h Refrigerated)');

  // Mother & Baby Ident-A-Band Pair
  const [babyGender, setBabyGender] = useState<'female' | 'male'>('female');
  const [babyWeight, setBabyWeight] = useState<string>('3.250 kg');
  const [babyBirthTime, setBabyBirthTime] = useState<string>('08:45 AM');
  const [babyApgar, setBabyApgar] = useState<string>('9 / 10');

  // Scanner Simulator State
  const [scannedInput, setScannedInput] = useState<string>('');
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'warning' | 'error'>('idle');

  // Shift & Scan History Analytics State
  const [shiftFilter, setShiftFilter] = useState<'all' | 'morning' | 'evening' | 'night'>('all');
  const [scanCategoryFilter, setScanCategoryFilter] = useState<'all' | 'medication' | 'patient' | 'specimen' | 'blood'>('all');

  // Generated QR Data URL state
  const [patientQrUrl, setPatientQrUrl] = useState<string>('');
  const [specimenQrUrl, setSpecimenQrUrl] = useState<string>('');
  const [medicationQrUrl, setMedicationQrUrl] = useState<string>('');
  const [bloodBankQrUrl, setBloodBankQrUrl] = useState<string>('');
  const [surgicalQrUrl, setSurgicalQrUrl] = useState<string>('');
  const [belongingsQrUrl, setBelongingsQrUrl] = useState<string>('');

  // Generate QR Code data URLs whenever active patient or params change
  useEffect(() => {
    if (!activePatient) return;

    // 1. Patient QR
    const patPayload = createPatientQrPayload(activePatient, activeAdmission?.admissionId);
    generateQrDataUrl(patPayload, 220).then(url => setPatientQrUrl(url));

    // 2. Specimen QR
    const specPayload = createSpecimenQrPayload(
      `LAB-${Date.now().toString().slice(-6)}`,
      activePatient.mrn,
      specimenTest,
      tubeColor
    );
    generateQrDataUrl(specPayload, 200).then(url => setSpecimenQrUrl(url));

    // 3. Medication QR
    const medPayload = createMedicationQrPayload(
      `MED-${Date.now().toString().slice(-6)}`,
      activePatient.mrn,
      medTradeName,
      medDose
    );
    generateQrDataUrl(medPayload, 200).then(url => setMedicationQrUrl(url));

    // 4. Blood Bank QR
    const bloodPayload = JSON.stringify({
      sys: 'AL-AMAL-BLOOD-BANK',
      unit: bloodDonorUnitId,
      mrn: activePatient.mrn,
      patient: activePatient.fullName,
      abo: activePatient.bloodGroup,
      comp: bloodComponent,
      crossmatch: 'COMPATIBLE',
      exp: bloodExpiryDate,
      ts: Date.now()
    });
    generateQrDataUrl(bloodPayload, 200).then(url => setBloodBankQrUrl(url));

    // 5. Surgical Pathology QR
    const surgPayload = JSON.stringify({
      sys: 'AL-AMAL-PATHOLOGY',
      case: `SURG-${activePatient.mrn.slice(-4)}-01`,
      mrn: activePatient.mrn,
      patient: activePatient.fullName,
      site: surgicalSpecimenSite,
      fixative: surgicalFixative,
      surgeon: surgicalLeadSurgeon,
      ts: Date.now()
    });
    generateQrDataUrl(surgPayload, 200).then(url => setSurgicalQrUrl(url));

    // 6. Belongings & Infant Feeding QR
    const belPayload = JSON.stringify({
      sys: 'AL-AMAL-BELONGINGS',
      mrn: activePatient.mrn,
      patient: activePatient.fullName,
      locker: belongingsLockerNumber,
      room: activeAdmission?.roomNumber || '102',
      ts: Date.now()
    });
    generateQrDataUrl(belPayload, 200).then(url => setBelongingsQrUrl(url));

  }, [
    activePatient,
    activeAdmission,
    specimenTest,
    tubeColor,
    medTradeName,
    medDose,
    bloodDonorUnitId,
    bloodComponent,
    bloodExpiryDate,
    surgicalSpecimenSite,
    surgicalFixative,
    surgicalLeadSurgeon,
    belongingsLockerNumber
  ]);

  if (!activePatient) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500">{isAr ? 'لم يتم العثور على مريض محدد' : 'No active patient record selected.'}</p>
      </div>
    );
  }

  // Generate barcodes
  const mrnBarcode = generateCode128Svg(activePatient.mrn, 42, 2);
  const natIdBarcode = generateCode128Svg(activePatient.nationalId || activePatient.mrn, 36, 1.8);
  const admBarcode = generateCode128Svg(activeAdmission?.admissionId || 'ADM-2026-0001', 36, 1.8);
  const bloodUnitBarcode = generateCode128Svg(bloodDonorUnitId, 36, 1.8);
  const surgicalBarcode = generateCode128Svg(`SURG-${activePatient.mrn.slice(-4)}-01`, 36, 1.8);

  // Check if patient has allergies
  const hasAllergies = activePatient.allergies && activePatient.allergies.length > 0;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Copy raw MRN or QR
  const handleCopyPayload = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Handle Bedside Scan Verification
  const handleExecuteScan = (rawQuery: string) => {
    const query = (rawQuery || '').trim();
    if (!query) return;

    playScannerAudioBeep('success');

    const parsed = parseScannedClinicalPayload(query);
    const matchedPatient = allPatients.find(p => 
      p.mrn.toLowerCase() === (parsed.mrn || query).toLowerCase()
    );
    const matchedAdm = allAdmissions.find(a => a.mrn === matchedPatient?.mrn);

    setScanResult({
      parsed,
      patient: matchedPatient || activePatient,
      admission: matchedAdm || activeAdmission,
      raw: query
    });
    setScanStatus('success');

    if (matchedPatient && matchedPatient.mrn !== activePatient.mrn) {
      setSelectedMrn(matchedPatient.mrn);
      if (matchedAdm && onSelectAdmission) onSelectAdmission(matchedAdm);
    }
  };

  // Patient switch callback from Camera Scanner
  const handlePatientIdentifiedFromCamera = (patient: Patient, adm?: Admission) => {
    setSelectedMrn(patient.mrn);
    if (adm && onSelectAdmission) {
      onSelectAdmission(adm);
    }
  };

  return (
    <div className="space-y-5 pb-16 print:p-0 print:m-0">
      
      {/* PERSISTENT CAMERA SCANNER OVERLAY COMPONENT */}
      <BarcodeCameraScannerOverlay
        allPatients={allPatients}
        allAdmissions={allAdmissions}
        activePatient={activePatient}
        activeAdmission={activeAdmission}
        medications={medications}
        labOrders={labOrders}
        currentUser={currentUser}
        language={language}
        onSelectPatient={handlePatientIdentifiedFromCamera}
        initialMode={isCameraOverlayOpen ? 'pip' : 'minimized'}
        dockedInPage={activeTab === 'scanner'}
      />

      {/* 1. Header & Print Station Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs no-print">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">
                  {isAr ? 'مركز طباعة ملصقات الباركود وQR الشامل لكل ما يخص المريض' : 'Comprehensive Clinical Barcode & Patient Label Hub'}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold border border-teal-300">
                  GS1-128 & ISO-18004 2D QR
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr 
                  ? 'طباعة أساور المعصم، ملصقات أنابيب المختبر، جرعات الصيدلية، بنك الدم، العينات الجراحية، بطاقة السرير، والمتعلقات مع المسح المباشر بالكاميرا'
                  : 'Complete medical label suite: Wristbands, LIS tubes, eMAR unit-doses, Blood bank, Surgical biopsy, Bedhead cards, and Live Camera Scanner'}
              </p>
            </div>
          </div>

          {/* Top Global Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Live Camera Scanner Toggle Button */}
            <button
              type="button"
              onClick={() => setIsCameraOverlayOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 transition-colors cursor-pointer"
              title={isAr ? 'تشغيل ماسح الكاميرا العائم' : 'Launch Live Camera Scanner'}
            >
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>{isAr ? 'مسح الكاميرا السريع' : 'Live Camera Scanner'}</span>
            </button>

            {/* Quick Patient Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">{isAr ? 'المريض:' : 'Patient:'}</span>
              <select
                value={selectedMrn}
                onChange={(e) => {
                  setSelectedMrn(e.target.value);
                  const adm = allAdmissions.find(a => a.mrn === e.target.value);
                  if (adm && onSelectAdmission) onSelectAdmission(adm);
                }}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                {allPatients.map(p => (
                  <option key={p.mrn} value={p.mrn}>
                    {p.fullName} ({p.mrn})
                  </option>
                ))}
              </select>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة الملصق المحدد' : 'Print Selected Labels'}</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION SUB-TABS (COVERING ALL PATIENT WORKFLOWS) */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
            
            {/* 1. Wristbands */}
            <button
              type="button"
              onClick={() => setActiveTab('wristband')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'wristband' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{isAr ? 'أساور المعصم' : 'Wristbands'}</span>
            </button>

            {/* 2. Specimen Tubes */}
            <button
              type="button"
              onClick={() => setActiveTab('specimens')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'specimens' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>{isAr ? 'أنابيب المختبر' : 'Lab Tubes'}</span>
            </button>

            {/* 3. Pharmacy */}
            <button
              type="button"
              onClick={() => setActiveTab('pharmacy')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'pharmacy' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>{isAr ? 'جرعات الصيدلية' : 'Pharmacy'}</span>
            </button>

            {/* 4. Blood Bank */}
            <button
              type="button"
              onClick={() => setActiveTab('blood_bank')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'blood_bank' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>{isAr ? 'بنك الدم ونقل الدم' : 'Blood Bank'}</span>
            </button>

            {/* 5. Surgical Pathology */}
            <button
              type="button"
              onClick={() => setActiveTab('surgical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'surgical' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>{isAr ? 'عينات العمليات والجراحة' : 'Surgical Biopsy'}</span>
            </button>

            {/* 6. Bed & Chart */}
            <button
              type="button"
              onClick={() => setActiveTab('charts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'charts' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isAr ? 'بطاقة السرير والملف' : 'Bed & Chart'}</span>
            </button>

            {/* 7. Belongings & Infant Feeding */}
            <button
              type="button"
              onClick={() => setActiveTab('belongings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'belongings' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>{isAr ? 'الأمتعة وتغذية الرضيع' : 'Belongings & Feeds'}</span>
            </button>

            {/* 8. Avery A4 Sheet */}
            <button
              type="button"
              onClick={() => setActiveTab('sheet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'sheet' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isAr ? 'ورقة A4 ملصقات' : 'Avery Sheet'}</span>
            </button>

            {/* 9. 1-Click Complete Admission Bundle */}
            <button
              type="button"
              onClick={() => setActiveTab('bundle')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'bundle' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'حزمة الدخول الكاملة (1-Click)' : 'Admission Bundle'}</span>
            </button>

            {/* 10. Bedside Terminal & Camera Scanner */}
            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'scanner' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>{isAr ? 'محطة فحص الباركود' : 'Bedside Terminal'}</span>
            </button>

            {/* 11. Scanning History & Trend Analytics Panel */}
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'history' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{isAr ? 'سجل وإحصائيات المسح' : 'Scan History & Trends'}</span>
            </button>
          </div>

          {/* Zoom Scale & Copies Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">{isAr ? 'المعاينة:' : 'Zoom:'}</span>
              <select
                value={zoomScale}
                onChange={(e) => setZoomScale(Number(e.target.value))}
                className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800"
              >
                <option value={80}>80%</option>
                <option value={100}>{isAr ? '100% الحجم الفعلي (1:1)' : '100% True Scale'}</option>
                <option value={125}>125%</option>
                <option value={150}>150%</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">{isAr ? 'النسخ:' : 'Copies:'}</span>
              <input
                type="number"
                min="1"
                max="20"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Studio Canvas with Sidebar Controls & Live Label Render */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* SIDEBAR: LABEL SETTINGS & FIELD TOGGLES (NO PRINT) */}
        <div className="lg:col-span-1 space-y-4 no-print">
          
          {/* Patient Quick Identity Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'بيانات المريض النشط' : 'Active Patient Data'}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-50 text-teal-700 font-bold border border-teal-200">
                {activePatient.mrn}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900">{activePatient.fullName}</h3>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500 font-mono mt-2">
                <div>{isAr ? 'الجنس:' : 'Gender:'} <strong className="text-slate-800 font-sans">{activePatient.gender === 'female' ? (isAr ? 'أنثى' : 'F') : (isAr ? 'ذكر' : 'M')}</strong></div>
                <div>{isAr ? 'الميلاد:' : 'DOB:'} <strong className="text-slate-800">{activePatient.dob}</strong></div>
                <div>{isAr ? 'الفصيلة:' : 'Blood:'} <strong className="text-red-600 font-bold">{activePatient.bloodGroup}</strong></div>
                <div>{isAr ? 'الغرفة:' : 'Room:'} <strong className="text-slate-800">{activeAdmission?.roomNumber || '102'}</strong></div>
              </div>
            </div>

            {hasAllergies && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isAr ? 'حساسية مسجلة:' : 'Known Allergies:'}</span>
                </div>
                <div className="text-[11px] mt-0.5 font-medium">
                  {activePatient.allergies.join(' · ')}
                </div>
              </div>
            )}
          </div>

          {/* Tab Specific Customization Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Sliders className="w-3.5 h-3.5 text-teal-600" />
              <span>{isAr ? 'خيارات وتخصيص الملصق' : 'Label Customization'}</span>
            </h4>

            {/* Global Inclusions */}
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={includeQrCode}
                  onChange={(e) => setIncludeQrCode(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>{isAr ? 'تضمين رمز الاستجابة السريع (QR Code)' : 'Include 2D QR Code'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={includeAllergyAlert}
                  onChange={(e) => setIncludeAllergyAlert(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>{isAr ? 'تضمين شريط تحذير الحساسية' : 'Include Allergy Warning Bar'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={includeBloodGroup}
                  onChange={(e) => setIncludeBloodGroup(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>{isAr ? 'تضمين فصيلة الدم وعامل Rh' : 'Include Blood Group & Rh'}</span>
              </label>
            </div>

            {/* Specimen Tube Controls */}
            {activeTab === 'specimens' && (
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">{isAr ? 'لون غطاء الأنبوب:' : 'Tube Cap Standard:'}</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['lavender', 'red', 'blue', 'green', 'yellow'] as const).map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setTubeColor(color)}
                        className={`h-7 rounded-md border flex items-center justify-center font-bold text-[10px] uppercase transition-all cursor-pointer ${
                          tubeColor === color ? 'ring-2 ring-slate-900 border-white' : 'opacity-80 hover:opacity-100'
                        } ${
                          color === 'lavender' ? 'bg-purple-600 text-white' :
                          color === 'red' ? 'bg-red-600 text-white' :
                          color === 'blue' ? 'bg-sky-500 text-white' :
                          color === 'green' ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-slate-900'
                        }`}
                      >
                        {color.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">{isAr ? 'الفحص المطلوب:' : 'Test Requisition:'}</label>
                  <input
                    type="text"
                    value={specimenTest}
                    onChange={(e) => setSpecimenTest(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Pharmacy Controls */}
            {activeTab === 'pharmacy' && (
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">{isAr ? 'اسم الدواء التجاري:' : 'Medication Brand:'}</label>
                  <input
                    type="text"
                    value={medTradeName}
                    onChange={(e) => setMedTradeName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">{isAr ? 'الجرعة والمحلول:' : 'Dose & Diluent:'}</label>
                  <input
                    type="text"
                    value={medDose}
                    onChange={(e) => setMedDose(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-rose-700 font-bold">
                  <input
                    type="checkbox"
                    checked={isHighAlertMed}
                    onChange={(e) => setIsHighAlertMed(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>{isAr ? 'دواء عالي الخطورة (High Alert)' : 'High-Alert Medication'}</span>
                </label>
              </div>
            )}

            {/* Blood Bank Controls */}
            {activeTab === 'blood_bank' && (
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">{isAr ? 'رقم كيس الدم (Donor Unit ID):' : 'Donor Unit ID:'}</label>
                  <input
                    type="text"
                    value={bloodDonorUnitId}
                    onChange={(e) => setBloodDonorUnitId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">{isAr ? 'مكوّن الدم:' : 'Component:'}</label>
                  <input
                    type="text"
                    value={bloodComponent}
                    onChange={(e) => setBloodComponent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Surgical Biopsy Controls */}
            {activeTab === 'surgical' && (
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">{isAr ? 'موضع النسيج / العينة الجراحية:' : 'Tissue Site / Organ:'}</label>
                  <input
                    type="text"
                    value={surgicalSpecimenSite}
                    onChange={(e) => setSurgicalSpecimenSite(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">{isAr ? 'الجراح المسؤول:' : 'Lead Surgeon:'}</label>
                  <input
                    type="text"
                    value={surgicalLeadSurgeon}
                    onChange={(e) => setSurgicalLeadSurgeon(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Belongings Controls */}
            {activeTab === 'belongings' && (
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">{isAr ? 'رقم الخزانة / الأمانات:' : 'Locker / Storage #:'}</label>
                  <input
                    type="text"
                    value={belongingsLockerNumber}
                    onChange={(e) => setBelongingsLockerNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">{isAr ? 'صلاحية حليب الأم (Refrigerated):' : 'Breastmilk Expiry:'}</label>
                  <input
                    type="text"
                    value={breastmilkExpDate}
                    onChange={(e) => setBreastmilkExpDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* WORKSPACE PREVIEW & THERMAL PRINT CANVAS */}
        <div className="lg:col-span-3 space-y-6">

          {/* TAB 1: PATIENT WRISTBANDS (ADULT & NEWBORN) */}
          {activeTab === 'wristband' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between no-print">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-teal-600" />
                  <span>{isAr ? 'أساور معصم المريض الحرارية (Thermal Wristbands)' : 'Direct Thermal Inpatient Wristbands'}</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">Zebra HC100 / ZD510-HC (25mm × 280mm)</span>
              </div>

              {/* Adult Inpatient Wristband */}
              <div 
                style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: isAr ? 'top right' : 'top left' }}
                className="transition-transform duration-150"
              >
                <div className="bg-white border-2 border-slate-400 rounded-2xl p-4 shadow-sm max-w-2xl relative overflow-hidden text-xs">
                  {/* Clip fastener tab */}
                  <div className="absolute top-0 bottom-0 rtl:right-0 ltr:left-0 w-8 bg-slate-100 border-e-2 border-slate-300 flex flex-col items-center justify-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 bg-white" />
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 bg-white" />
                  </div>

                  <div className="rtl:pr-10 ltr:pl-10 space-y-2">
                    <div className="flex items-center justify-between border-b pb-1.5 border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 tracking-wider">
                          AL-AMAL SPECIALIZED HOSPITAL
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-bold">
                          INPATIENT
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700">
                        RM: {activeAdmission?.roomNumber || '102'} · BED: {activeAdmission?.bedId || 'B-102'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-base font-black text-slate-950">
                          {activePatient.fullName}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono text-slate-700">
                          <span>MRN: <strong className="text-slate-900">{activePatient.mrn}</strong></span>
                          <span>DOB: <strong>{activePatient.dob}</strong></span>
                          <span>Blood: <strong className="text-red-600 font-bold">{activePatient.bloodGroup}</strong></span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Adm: {activeAdmission?.admissionDate.split('T')[0] || '2026-11-06'} · {activeAdmission?.attendingConsultantName || 'Dr. Tarek'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {patientQrUrl && includeQrCode && (
                          <img src={patientQrUrl} alt="Patient QR" className="w-18 h-18 border border-slate-200 rounded p-1 bg-white" />
                        )}
                        <div className="flex flex-col items-center">
                          <svg 
                            width={mrnBarcode.totalWidth} 
                            height={34} 
                            dangerouslySetInnerHTML={{ __html: mrnBarcode.svgBars }} 
                          />
                          <span className="font-mono text-[10px] font-bold text-slate-800">
                            *{activePatient.mrn}*
                          </span>
                        </div>
                      </div>
                    </div>

                    {hasAllergies && includeAllergyAlert && (
                      <div className="bg-rose-600 text-white px-3 py-1 rounded font-bold text-xs tracking-wider flex items-center gap-1.5 uppercase">
                        <ShieldAlert className="w-3.5 h-3.5 text-white" />
                        <span>ALLERGY ALERT: {activePatient.allergies.join(' · ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Newborn Ident-A-Band (Maternity Integration) */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3 no-print">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                    <Baby className="w-4 h-4 text-pink-600" />
                    <span>{isAr ? 'سوار تعريف المولود (Newborn Baby Ident-A-Band)' : 'Newborn Infant Dual Ident-A-Band'}</span>
                  </h4>
                  <span className="text-[11px] text-pink-700 bg-pink-50 px-2 py-0.5 rounded font-bold border border-pink-200">
                    Linked to Mother's MRN
                  </span>
                </div>

                <div 
                  style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: isAr ? 'top right' : 'top left' }}
                  className="transition-transform duration-150"
                >
                  <div className="bg-pink-50/50 border-2 border-pink-300 rounded-xl p-3 max-w-xl text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-pink-200 pb-1">
                      <span className="font-bold text-pink-900 text-xs">BABY OF {activePatient.fullName.toUpperCase()}</span>
                      <span className="font-mono text-[11px] font-bold text-pink-800">APGAR: {babyApgar} · WT: {babyWeight}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5 font-mono text-[11px] text-slate-700">
                        <div>Mother MRN: <strong className="text-slate-900">{activePatient.mrn}</strong></div>
                        <div>Infant ID: <strong className="text-pink-700">INF-{activePatient.mrn.slice(-4)}-01</strong></div>
                        <div>Born: <strong>2026-11-06 {babyBirthTime}</strong> ({babyGender.toUpperCase()})</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {patientQrUrl && (
                          <img src={patientQrUrl} alt="Baby QR" className="w-14 h-14 bg-white p-1 border border-pink-200 rounded" />
                        )}
                        <svg 
                          width={mrnBarcode.totalWidth * 0.75} 
                          height={28} 
                          dangerouslySetInnerHTML={{ __html: mrnBarcode.svgBars }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIS LABORATORY SPECIMEN TUBES */}
          {activeTab === 'specimens' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between no-print">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-purple-600" />
                  <span>{isAr ? 'ملصقات أنابيب المختبر وسحب الدم (LIS Vacuum Tube Labels)' : 'LIS Vacuum Tube & Specimen Labels'}</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">Standard 50mm × 25mm Wrap-Around</span>
              </div>

              <div 
                style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: isAr ? 'top right' : 'top left' }}
                className="transition-transform duration-150"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  {/* Vacuum Tube Label 1 */}
                  <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shadow-xs relative overflow-hidden text-xs space-y-1.5">
                    <div className={`absolute top-0 bottom-0 rtl:right-0 ltr:left-0 w-3 ${
                      tubeColor === 'lavender' ? 'bg-purple-600' :
                      tubeColor === 'red' ? 'bg-red-600' :
                      tubeColor === 'blue' ? 'bg-sky-500' :
                      tubeColor === 'green' ? 'bg-emerald-600' : 'bg-amber-400'
                    }`} />

                    <div className="rtl:pr-3 ltr:pl-3">
                      <div className="flex items-center justify-between border-b pb-1 border-slate-100">
                        <span className="font-bold text-slate-900 text-[11px] truncate block">{activePatient.fullName}</span>
                        <span className="text-[9px] font-mono font-bold bg-slate-100 px-1 py-0.2 rounded text-slate-700">
                          {activePatient.bloodGroup}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 pt-1">
                        <span>MRN: <strong>{activePatient.mrn}</strong></span>
                        <span>Rm: <strong>{activeAdmission?.roomNumber || '102'}</strong></span>
                      </div>

                      <div className="text-[10px] text-purple-700 font-bold truncate">
                        {specimenTest}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[9px] text-slate-400 font-mono">
                          Drawn: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString().slice(0, 5)}
                        </div>
                        {specimenQrUrl && (
                          <img src={specimenQrUrl} alt="Tube QR" className="w-10 h-10 border border-slate-200 rounded p-0.5" />
                        )}
                      </div>

                      <div className="pt-1 flex justify-center">
                        <svg 
                          width={mrnBarcode.totalWidth * 0.75} 
                          height={22} 
                          dangerouslySetInnerHTML={{ __html: mrnBarcode.svgBars }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sterile Container Label (Urine / Fluids) */}
                  <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shadow-xs text-xs space-y-1.5">
                    <div className="flex items-center justify-between border-b pb-1 border-slate-100">
                      <span className="font-bold text-slate-900 text-[11px] truncate">{activePatient.fullName}</span>
                      <span className="text-[9px] font-mono bg-amber-100 text-amber-800 font-bold px-1 py-0.2 rounded">STERILE CUP</span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-600">
                      MRN: <strong>{activePatient.mrn}</strong> · Nat ID: {activePatient.nationalId}
                    </div>

                    <div className="text-[10px] font-bold text-slate-800">
                      Specimen: Midstream Clean-Catch Urine (مزرعة وبول كامل)
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[9px] text-slate-500 font-mono">
                        Collector: {phlebotomistName}
                      </div>
                      {patientQrUrl && (
                        <img src={patientQrUrl} alt="Cup QR" className="w-10 h-10 border border-slate-200 rounded p-0.5" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PHARMACY UNIT-DOSE & IV FLUID LABELS */}
          {activeTab === 'pharmacy' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between no-print">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'ملصقات الصيدلية والجرعات الدوائية والمحاليل (eMAR Unit-Dose)' : 'Pharmacy Unit-Dose & IV Bag Labels'}</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">ASHP Standard Medical Label</span>
              </div>

              <div 
                style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: isAr ? 'top right' : 'top left' }}
                className="transition-transform duration-150"
              >
                <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-sm max-w-xl space-y-3 text-xs">
                  {/* High Alert Banner */}
                  {isHighAlertMed && (
                    <div className="bg-rose-700 text-white px-3 py-1 rounded-lg font-bold text-center uppercase tracking-wider text-xs">
                      ⚠️ HIGH-ALERT MEDICATION · DUAL NURSE VERIFICATION REQUIRED
                    </div>
                  )}

                  <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px]">{isAr ? 'المريض المستفيد:' : 'Patient Recipient:'}</span>
                      <strong className="text-sm text-slate-900 font-black">{activePatient.fullName}</strong>
                      <span className="text-[10px] font-mono text-slate-500 block">MRN: {activePatient.mrn} · Room: {activeAdmission?.roomNumber || '102'}</span>
                    </div>

                    <div className="text-right font-mono text-[10px] text-slate-500">
                      <div>BATCH: {medBatch}</div>
                      <div>EXPIRY: {medExpiry}</div>
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="text-base font-black text-teal-800">
                      {medTradeName}
                    </div>
                    <div className="text-xs text-slate-700 font-semibold">
                      {medGenericName}
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-900">
                      Dose: {medDose} · Route: {medRoute}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-500">
                        {isAr ? 'المسؤول عن الصرف: صيدلية المستشفى المركزية' : 'Dispensed by: Central HMIS Pharmacy'}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold">
                        ✓ 5-Rights Bedside Barcode Scanning Required
                      </div>
                    </div>

                    {medicationQrUrl && (
                      <img src={medicationQrUrl} alt="Med QR" className="w-16 h-16 border border-slate-300 rounded-lg p-1 bg-white" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BLOOD BANK & TRANSFUSION CROSSMATCH LABELS */}
          {activeTab === 'blood_bank' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between no-print">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-red-600" />
                  <span>{isAr ? 'ملصقات أكياس نقل الدم ومطابقة الفصائل (Blood Bank Transfusion Tag)' : 'Blood Bank Transfusion & Compatibility Tag'}</span>
                </h3>
                <span className="text-xs text-red-700 font-bold bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 font-mono">
                  AABB & ISBT 128 Standard
                </span>
              </div>

              <div 
                style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: isAr ? 'top right' : 'top left' }}
                className="transition-transform duration-150"
              >
                <div className="bg-white border-2 border-red-500 rounded-2xl p-5 shadow-sm max-w-xl space-y-3.5 text-xs">
                  {/* Warning Header */}
                  <div className="bg-red-700 text-white p-2 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-white" />
                      <span className="font-bold text-xs uppercase tracking-wider">BLOOD BANK COMPATIBILITY TAG</span>
                    </div>
                    <span className="font-mono text-xs font-bold bg-white/20 px-2 py-0.5 rounded">
                      UNIT: {bloodDonorUnitId}
                    </span>
                  </div>

                  {/* Recipient Details */}
                  <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px]">{isAr ? 'اسم المتلقي (المريض):' : 'Recipient Patient:'}</span>
                      <strong className="text-slate-900 text-sm block font-black">{activePatient.fullName}</strong>
                      <span className="text-[11px] font-mono text-slate-600">MRN: {activePatient.mrn}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">{isAr ? 'فصيلة دم المريض:' : 'Patient ABO / Rh:'}</span>
                      <strong className="text-red-700 text-lg font-black font-mono">{activePatient.bloodGroup}</strong>
                      <span className="text-[10px] text-emerald-700 font-bold block">✓ Verified & Crossmatched</span>
                    </div>
                  </div>

                  {/* Component & Unit details */}
                  <div className="bg-red-50/60 p-3 rounded-xl border border-red-200 space-y-1">
                    <div className="text-xs font-bold text-red-950">
                      Component: {bloodComponent} ({bloodVolume})
                    </div>
                    <div className="text-[11px] text-slate-700 font-mono">
                      Compatibility: <strong className="text-emerald-800">{bloodCrossmatchStatus}</strong>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      Expiry Date: <strong className="text-red-800">{bloodExpiryDate}</strong>
                    </div>
                  </div>

                  {/* Dual Nurse Verification Lines */}
                  <div className="pt-1 grid grid-cols-2 gap-3 text-[10px] font-mono border-t border-slate-200">
                    <div className="border border-slate-300 rounded p-1.5 bg-slate-50">
                      <span className="text-slate-500 block">Nurse 1 Bedside Verification:</span>
                      <div className="h-5 border-b border-dashed border-slate-400 mt-1" />
                    </div>
                    <div className="border border-slate-300 rounded p-1.5 bg-slate-50">
                      <span className="text-slate-500 block">Nurse 2 Dual Verification:</span>
                      <div className="h-5 border-b border-dashed border-slate-400 mt-1" />
                    </div>
                  </div>

                  {/* Barcode & QR footer */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-1">
                      <svg 
                        width={bloodUnitBarcode.totalWidth * 0.8} 
                        height={26} 
                        dangerouslySetInnerHTML={{ __html: bloodUnitBarcode.svgBars }} 
                      />
                      <span className="font-mono text-[10px] font-bold block text-slate-800">
                        *{bloodDonorUnitId}*
                      </span>
                    </div>

                    {bloodBankQrUrl && (
                      <img src={bloodBankQrUrl} alt="Blood QR" className="w-14 h-14 border border-red-200 rounded p-1 bg-white" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SURGICAL PATHOLOGY & BIOPSY SPECIMEN LABELS */}
          {activeTab === 'surgical' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between no-print">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-indigo-600" />
                  <span>{isAr ? 'ملصقات عينات غرف العمليات والتشريح المرضي (Surgical Pathology Specimen)' : 'Surgical Pathology & Biopsy Specimen Label'}</span>
                </h3>
                <span className="text-xs text-indigo-700 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 font-mono">
                  Operating Room & Histopathology
                </span>
              </div>

              <div 
                style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: isAr ? 'top right' : 'top left' }}
                className="transition-transform duration-150"
              >
                <div className="bg-white border-2 border-indigo-300 rounded-2xl p-5 shadow-sm max-w-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b pb-2 border-indigo-100">
                    <div>
                      <span className="text-indigo-800 font-bold text-xs uppercase">AL-AMAL SURGICAL PATHOLOGY</span>
                      <div className="text-[10px] text-slate-500 font-mono">BIOPSY & HISTOPATHOLOGY SPECIMEN</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-[10px]">
                      OR TISSUE JAR
                    </span>
                  </div>

                  <div className="space-y-1">
                    <strong className="text-base text-slate-900 block font-black">{activePatient.fullName}</strong>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-700">
                      <div>MRN: <strong className="text-slate-950 font-bold">{activePatient.mrn}</strong></div>
                      <div>DOB: <strong>{activePatient.dob}</strong></div>
                      <div>Room: <strong>{activeAdmission?.roomNumber || '102'}</strong></div>
                      <div>Theater: <strong>{surgicalTheaterNumber}</strong></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                    <div className="text-xs font-bold text-slate-900">
                      Tissue Specimen: <span className="text-indigo-700">{surgicalSpecimenSite}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Fixative: <strong>{surgicalFixative}</strong>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Lead Surgeon: <strong>{surgicalLeadSurgeon}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-1">
                      <svg 
                        width={surgicalBarcode.totalWidth * 0.8} 
                        height={26} 
                        dangerouslySetInnerHTML={{ __html: surgicalBarcode.svgBars }} 
                      />
                      <span className="font-mono text-[10px] font-bold block text-slate-800">
                        *SURG-{activePatient.mrn.slice(-4)}-01*
                      </span>
                    </div>

                    {surgicalQrUrl && (
                      <img src={surgicalQrUrl} alt="Surgical QR" className="w-14 h-14 border border-indigo-200 rounded p-1 bg-white" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BED CARD & CHART COVER */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between no-print">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>{isAr ? 'بطاقة رأس السرير وغلاف الملف الورقي (Bedhead Card & Chart Cover)' : 'Bedside Card & Chart Cover Placard'}</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">150mm × 100mm Display Format</span>
              </div>

              <div 
                style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: isAr ? 'top right' : 'top left' }}
                className="transition-transform duration-150"
              >
                <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm max-w-3xl space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 uppercase">AL-AMAL SPECIALIZED HOSPITAL</span>
                        <div className="text-[10px] text-slate-500 font-mono">INPATIENT ADMISSION & CHART COVER</div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-sm font-black text-teal-700">ROOM {activeAdmission?.roomNumber || '102'}</span>
                      <div className="text-[10px] text-slate-500">BED {activeAdmission?.bedId || 'BED-102'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-8 space-y-2">
                      <div className="text-xl font-black text-slate-900">
                        {activePatient.fullName}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-700">
                        <div>MRN: <strong className="text-slate-950 font-bold">{activePatient.mrn}</strong></div>
                        <div>National ID: <strong>{activePatient.nationalId}</strong></div>
                        <div>DOB: <strong>{activePatient.dob}</strong></div>
                        <div>Blood Group: <strong className="text-red-700 font-bold">{activePatient.bloodGroup}</strong></div>
                        <div>Admitted: <strong>{activeAdmission?.admissionDate.split('T')[0] || '2026-11-06'}</strong></div>
                        <div>Consultant: <strong>{activeAdmission?.attendingConsultantName || 'Dr. Tarek'}</strong></div>
                      </div>

                      {hasAllergies && (
                        <div className="bg-rose-100 text-rose-900 px-3 py-1.5 rounded-lg font-bold border border-rose-300">
                          ⚠️ KNOWN ALLERGIES: {activePatient.allergies.join(' · ')}
                        </div>
                      )}
                    </div>

                    <div className="col-span-4 flex flex-col items-center justify-center space-y-2">
                      {patientQrUrl && (
                        <img src={patientQrUrl} alt="Chart QR" className="w-28 h-28 border border-slate-300 rounded-lg p-1.5 bg-white shadow-2xs" />
                      )}
                      <svg 
                        width={mrnBarcode.totalWidth * 0.85} 
                        height={38} 
                        dangerouslySetInnerHTML={{ __html: mrnBarcode.svgBars }} 
                      />
                      <span className="font-mono text-xs font-bold text-slate-900">
                        *{activePatient.mrn}*
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: BELONGINGS & INFANT FEEDING BOTTLE LABELS */}
          {activeTab === 'belongings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between no-print">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>{isAr ? 'ملصقات أمانات المريض وتغذية الرضيع وحليب الأم (Belongings & Infant Feed)' : 'Patient Belongings & Breastmilk Feed Labels'}</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">Ward Security & NICU Nutrition</span>
              </div>

              <div 
                style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: isAr ? 'top right' : 'top left' }}
                className="transition-transform duration-150"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  {/* Valuables & Luggage Tag */}
                  <div className="bg-white border-2 border-amber-300 rounded-xl p-4 shadow-sm text-xs space-y-2">
                    <div className="flex items-center justify-between border-b pb-1.5 border-amber-200">
                      <span className="font-bold text-amber-950 uppercase">PATIENT VALUABLES & LUGGAGE</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold font-mono text-[10px]">
                        WARD STORAGE
                      </span>
                    </div>

                    <div>
                      <strong className="text-slate-900 text-sm block">{activePatient.fullName}</strong>
                      <div className="text-[11px] font-mono text-slate-600">
                        MRN: {activePatient.mrn} · Room: {activeAdmission?.roomNumber || '102'}
                      </div>
                      <div className="text-[11px] text-amber-800 font-bold mt-1">
                        Location: {belongingsLockerNumber} ({belongingsBagCount})
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <svg 
                        width={mrnBarcode.totalWidth * 0.7} 
                        height={20} 
                        dangerouslySetInnerHTML={{ __html: mrnBarcode.svgBars }} 
                      />
                      {belongingsQrUrl && (
                        <img src={belongingsQrUrl} alt="Belongings QR" className="w-10 h-10 border border-amber-200 rounded p-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Breastmilk Expression Bottle Label */}
                  <div className="bg-white border-2 border-pink-300 rounded-xl p-4 shadow-sm text-xs space-y-2">
                    <div className="flex items-center justify-between border-b pb-1.5 border-pink-200">
                      <span className="font-bold text-pink-950 uppercase flex items-center gap-1">
                        <Baby className="w-3.5 h-3.5 text-pink-600" />
                        <span>EXPRESSED BREASTMILK (EBM)</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-800 font-bold font-mono text-[10px]">
                        NICU / FEED
                      </span>
                    </div>

                    <div>
                      <strong className="text-slate-900 text-sm block">Mother: {activePatient.fullName}</strong>
                      <div className="text-[11px] font-mono text-slate-600">
                        Baby of {activePatient.fullName.split(' ')[0]} · Vol: <strong>{breastmilkVolume}</strong>
                      </div>
                      <div className="text-[10px] text-pink-800 font-semibold mt-1">
                        Expires: {breastmilkExpDate}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[9px] text-slate-400 font-mono">
                        Date: {new Date().toLocaleDateString()}
                      </span>
                      {patientQrUrl && (
                        <img src={patientQrUrl} alt="Milk QR" className="w-10 h-10 border border-pink-200 rounded p-0.5" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: AVERY MULTI-LABEL A4 SHEET */}
          {activeTab === 'sheet' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between no-print">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>{isAr ? 'ورقة ملصقات استمارات التحاليل والملفات (Avery 24-Up A4 Sheet)' : 'Avery 24-Label Sticker Sheet (A4)'}</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">24 Labels (65mm × 35mm per sticker)</span>
              </div>

              {/* A4 Printable Grid */}
              <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div key={idx} className="border border-slate-200 rounded p-2.5 text-xs space-y-1 bg-white">
                      <div className="flex items-start justify-between gap-1">
                        <strong className="text-slate-900 text-[11px] truncate block">{activePatient.fullName}</strong>
                        <span className="text-[9px] font-mono text-red-600 font-bold">{activePatient.bloodGroup}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        MRN: {activePatient.mrn} · Rm: {activeAdmission?.roomNumber || '102'}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <svg 
                          width={mrnBarcode.totalWidth * 0.55} 
                          height={20} 
                          dangerouslySetInnerHTML={{ __html: mrnBarcode.svgBars }} 
                        />
                        {patientQrUrl && (
                          <img src={patientQrUrl} alt="QR mini" className="w-7 h-7 bg-white" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: 1-CLICK COMPLETE INPATIENT ADMISSION BUNDLE */}
          {activeTab === 'bundle' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4 no-print">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-200" />
                    <h3 className="font-bold text-base">
                      {isAr ? 'حزمة ملصقات الدخول الكاملة للمريض (1-Click Admission Pack)' : 'Complete Inpatient Admission Label Bundle'}
                    </h3>
                  </div>
                  <p className="text-xs text-white/80 max-w-xl">
                    {isAr 
                      ? 'تجهيز وطباعة كافة ملصقات المريض دفعة واحدة عند الدخول: أساور المعصم، ملصقات أنابيب المختبر، بطاقة السرير، ملصقات الملف، وبطاقة الأمانات'
                      : 'One-click bundle generation for reception: 2 Wristbands, 6 Lab Tube Labels, 1 Bedhead Card, 1 Chart Cover, and 12 Sticky Labels'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2.5 rounded-xl font-bold bg-white text-emerald-900 hover:bg-emerald-50 transition-all shadow-md cursor-pointer flex items-center gap-2 text-xs"
                >
                  <Printer className="w-4 h-4 text-emerald-700" />
                  <span>{isAr ? 'طباعة الحزمة الكاملة الآن' : 'Print Entire Bundle'}</span>
                </button>
              </div>

              {/* Bundle Printable Showcase */}
              <div className="space-y-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6">
                
                {/* 1. Wristband row */}
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-2">1. Inpatient Identification Wristbands (Adult + Backup)</span>
                  <div className="bg-white border border-slate-300 rounded-xl p-3 max-w-xl">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-sm font-black text-slate-900 block">{activePatient.fullName}</strong>
                        <span className="text-[11px] font-mono text-slate-600">MRN: {activePatient.mrn} · Blood: {activePatient.bloodGroup} · Room: {activeAdmission?.roomNumber || '102'}</span>
                      </div>
                      {patientQrUrl && <img src={patientQrUrl} alt="QR" className="w-12 h-12 bg-white" />}
                    </div>
                  </div>
                </div>

                {/* 2. Specimen tube pack */}
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-2">2. LIS Specimen Tube Labels (CBC, Coagulation, Biochemistry)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {['CBC & Hematology (Lavender)', 'Coagulation PT/INR (Blue)', 'Biochemistry / Serum (Red)'].map((t, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded p-2 text-xs space-y-1">
                        <strong className="text-[11px] text-slate-900 truncate block">{activePatient.fullName}</strong>
                        <div className="text-[10px] text-slate-500 font-mono">MRN: {activePatient.mrn} · {t}</div>
                        <div className="flex justify-between items-center pt-1">
                          <svg width={mrnBarcode.totalWidth * 0.5} height={16} dangerouslySetInnerHTML={{ __html: mrnBarcode.svgBars }} />
                          {patientQrUrl && <img src={patientQrUrl} alt="QR" className="w-6 h-6" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Bed card placard */}
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-2">3. Bedside & Chart Cover Card</span>
                  <div className="bg-white border border-slate-300 rounded-xl p-4 max-w-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400">BEDHEAD PLACARD · ROOM {activeAdmission?.roomNumber || '102'}</span>
                      <div className="text-base font-black text-slate-900 mt-0.5">{activePatient.fullName}</div>
                      <div className="text-xs font-mono text-slate-600">MRN: {activePatient.mrn} · Consultant: {activeAdmission?.attendingConsultantName || 'Dr. Tarek'}</div>
                    </div>
                    {patientQrUrl && <img src={patientQrUrl} alt="Placard QR" className="w-16 h-16" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: BEDSIDE SCANNER & CAMERA VERIFIER TERMINAL */}
          {activeTab === 'scanner' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between no-print">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scan className="w-4 h-4 text-indigo-600" />
                  <span>{isAr ? 'محطة التدقيق وفحص الباركود السريري عند السرير' : 'Bedside Barcode & Camera Verification Terminal'}</span>
                </h3>
                <span className="text-xs text-indigo-700 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Camera Optical Scan + USB Laser Gun Ready
                </span>
              </div>

              {/* The BarcodeCameraScannerOverlay component is docked right here inside the tab! */}
              <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-600">
                <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>{isAr ? 'تم تفعيل عدسة الكاميرا للتدقيق السريري المستمر' : 'Persistent Optical Camera Scanner Docked Above'}</span>
                </div>
                <p>
                  {isAr 
                    ? 'يمكنك توجيه كاميرا الهاتف المحمول أو الجهاز اللوحي نحو أسورة المريض أو أنابيب العينات أو جرعات الأدوية للمطابقة الفورية للحقوق الخمسة للسلامة الدوائية (5-Rights Safety Check).'
                    : 'Use the live camera viewfinder above to scan patient wristbands, vacuum tubes, or medication blisters for instantaneous 5-rights bedside verification.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 11: SCANNING HISTORY & SHIFT TREND ANALYTICS */}
          {activeTab === 'history' && (() => {
            const allShiftData = [
              { time: '08:00', matches: 24, mismatches: 0, total: 24, shift: 'morning' },
              { time: '09:00', matches: 30, mismatches: 1, total: 31, shift: 'morning' },
              { time: '10:00', matches: 27, mismatches: 1, total: 28, shift: 'morning' },
              { time: '11:00', matches: 19, mismatches: 0, total: 19, shift: 'morning' },
              { time: '12:00', matches: 34, mismatches: 1, total: 35, shift: 'morning' },
              { time: '13:00', matches: 22, mismatches: 0, total: 22, shift: 'morning' },
              { time: '14:00', matches: 28, mismatches: 1, total: 29, shift: 'morning' },
              { time: '15:00', matches: 18, mismatches: 0, total: 18, shift: 'morning' },
              { time: '16:00', matches: 25, mismatches: 1, total: 26, shift: 'evening' },
              { time: '17:00', matches: 20, mismatches: 0, total: 20, shift: 'evening' },
              { time: '18:00', matches: 32, mismatches: 0, total: 32, shift: 'evening' },
              { time: '19:00', matches: 20, mismatches: 1, total: 21, shift: 'evening' },
              { time: '20:00', matches: 28, mismatches: 0, total: 28, shift: 'evening' },
              { time: '21:00', matches: 16, mismatches: 0, total: 16, shift: 'evening' },
              { time: '22:00', matches: 23, mismatches: 1, total: 24, shift: 'evening' },
              { time: '23:00', matches: 14, mismatches: 0, total: 14, shift: 'evening' },
              { time: '00:00', matches: 12, mismatches: 0, total: 12, shift: 'night' },
              { time: '02:00', matches: 9, mismatches: 0, total: 9, shift: 'night' },
              { time: '04:00', matches: 11, mismatches: 1, total: 12, shift: 'night' },
              { time: '06:00', matches: 15, mismatches: 0, total: 15, shift: 'night' }
            ];

            const filteredData = shiftFilter === 'all' 
              ? allShiftData 
              : allShiftData.filter(d => d.shift === shiftFilter);

            const totalScans = filteredData.reduce((acc, d) => acc + d.total, 0);
            const totalMatches = filteredData.reduce((acc, d) => acc + d.matches, 0);
            const totalMismatches = filteredData.reduce((acc, d) => acc + d.mismatches, 0);
            const successRate = totalScans > 0 ? ((totalMatches / totalScans) * 100).toFixed(1) : '100.0';

            const categoryBreakdown = [
              { name: isAr ? 'أدوية eMAR' : 'eMAR Meds', matches: Math.round(totalMatches * 0.52), mismatches: Math.max(1, Math.round(totalMismatches * 0.7)), fill: '#0d9488' },
              { name: isAr ? 'أساور المرضى' : 'Patient ID', matches: Math.round(totalMatches * 0.28), mismatches: Math.round(totalMismatches * 0.2), fill: '#2563eb' },
              { name: isAr ? 'أنابيب المختبر' : 'LIS Tubes', matches: Math.round(totalMatches * 0.14), mismatches: 0, fill: '#7c3aed' },
              { name: isAr ? 'أكياس الدم' : 'Blood Bank', matches: Math.round(totalMatches * 0.06), mismatches: 0, fill: '#dc2626' }
            ];

            const recentLogs = [
              {
                id: 'SCAN-2026-981',
                time: '14:28:12',
                item: 'Cefotaxime Sodium 1g IV (Claforan)',
                code: 'MED-771920|MRN-2026-0811|Claforan|1g',
                category: 'medication',
                patient: `${activePatient.fullName} (${activePatient.mrn})`,
                status: 'match',
                statusLabelAr: 'مطابقة مؤكدة eMAR',
                statusLabelEn: 'Match Confirmed',
                nurse: currentUser?.name || 'م. سارة المهدي (RN)',
                shift: 'morning',
                action: isAr ? 'تم التحقق من الحقوق الـ 5 وتسجيل الجرعة في eMAR' : '5-Rights verified, administered in eMAR'
              },
              {
                id: 'SCAN-2026-980',
                time: '14:15:04',
                item: 'Warfarin 5mg PO (Coumadin)',
                code: 'MED-448102|Coumadin-5mg|PO',
                category: 'medication',
                patient: `${activePatient.fullName} (${activePatient.mrn})`,
                status: 'mismatch',
                statusLabelAr: 'تنبيه عدم تطابق eMAR',
                statusLabelEn: 'Mismatch Intercepted',
                nurse: 'م. ياسمين الكاديكي (RN)',
                shift: 'morning',
                action: isAr ? 'تم منع الإعطاء: الدواء غير مدرج في أوامر المريض النشطة' : 'Administration blocked: drug not on active eMAR orders'
              },
              {
                id: 'SCAN-2026-979',
                time: '13:50:33',
                item: 'Patient Identification Wristband (GS1-128)',
                code: activePatient.mrn,
                category: 'patient',
                patient: `${activePatient.fullName} (${activePatient.mrn})`,
                status: 'match',
                statusLabelAr: 'تحقق هوية المريض بنجاح',
                statusLabelEn: 'Patient Verified',
                nurse: currentUser?.name || 'م. سارة المهدي (RN)',
                shift: 'morning',
                action: isAr ? 'مطابقة الهوية وسوار المعصم قبل السحب الوريدي' : 'Identity confirmed prior to phlebotomy'
              },
              {
                id: 'SCAN-2026-978',
                time: '13:42:19',
                item: 'CBC & Coagulation Specimen Tube (Lavender)',
                code: `LAB-918274|${activePatient.mrn}|CBC`,
                category: 'specimen',
                patient: `${activePatient.fullName} (${activePatient.mrn})`,
                status: 'match',
                statusLabelAr: 'مطابقة أنبوبة المختبر',
                statusLabelEn: 'LIS Tube Verified',
                nurse: 'فني مختبر: كمال الزوي',
                shift: 'morning',
                action: isAr ? 'تم سحب العينة والمسح السريري وتأكيد الباركود في LIS' : 'Specimen collected & verified in LIS'
              },
              {
                id: 'SCAN-2026-977',
                time: '12:10:05',
                item: 'PRBC Packed Red Blood Cells (BLD-2026-A9941)',
                code: 'BLD-2026-A9941|O_POS|COMPATIBLE',
                category: 'blood',
                patient: `${activePatient.fullName} (${activePatient.mrn})`,
                status: 'match',
                statusLabelAr: 'مطابقة نقل الدم المزدوجة',
                statusLabelEn: 'Blood Unit Dual Check',
                nurse: 'م. فاطمة الورفلي + د. عمر',
                shift: 'morning',
                action: isAr ? 'التحقق المزدوج من التوافق المصلي وفصيلة المريض' : 'Dual RN-MD check passed, transfusion commenced'
              },
              {
                id: 'SCAN-2026-976',
                time: '10:05:44',
                item: 'Amoxicillin-Clavulanate (Augmentin)',
                code: 'MED-119283|Augmentin-1.2g|IV',
                category: 'medication',
                patient: `${activePatient.fullName} (${activePatient.mrn})`,
                status: 'allergy',
                statusLabelAr: 'تحذير حساسية متقاطعة',
                statusLabelEn: 'Allergy Conflict Intercepted',
                nurse: 'م. هناء المقريف (RN)',
                shift: 'morning',
                action: isAr ? 'تم كشف حساسية البنسلين عند المسح وإيقاف الإعطاء فوراً' : 'Penicillin allergy detected; dose intercepted bedside'
              }
            ];

            const displayedLogs = recentLogs.filter(log => {
              const matchShift = shiftFilter === 'all' || log.shift === shiftFilter;
              const matchCat = scanCategoryFilter === 'all' || log.category === scanCategoryFilter;
              return matchShift && matchCat;
            });

            return (
              <div className="space-y-6">
                {/* 1. Header Toolbar with Shift Selector & Global Stats */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shadow-2xs">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{isAr ? 'سجل وإحصائيات المسح السريري وتدقيق المناوبات' : 'Scanning History & Shift Audit Analytics'}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                          {isAr ? 'مباشر وتراكمي' : 'Live Shift Telemetry'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isAr 
                          ? 'متابعة وتدقيق معدلات دقة مطابقة الباركود، رصد حالات عدم التطابق الممنوعة، وإحصائيات التمريض لكل مناوبة'
                          : 'Audit scan frequency, verification success rate, near-miss intercepts, and nursing bedside adherence per shift'}
                      </p>
                    </div>
                  </div>

                  {/* Shift Filter Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500 font-medium">{isAr ? 'المناوبة:' : 'Shift:'}</span>
                    <div className="flex items-center bg-white border border-slate-300 rounded-xl p-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setShiftFilter('all')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          shiftFilter === 'all' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isAr ? 'كل المناوبات (24h)' : 'All 24h'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShiftFilter('morning')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          shiftFilter === 'morning' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isAr ? 'الصباحية (08-16)' : 'Morning'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShiftFilter('evening')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          shiftFilter === 'evening' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isAr ? 'المسائية (16-24)' : 'Evening'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShiftFilter('night')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          shiftFilter === 'night' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isAr ? 'الليلية (00-08)' : 'Night'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
                      title={isAr ? 'طباعة تقرير تدقيق المناوبة' : 'Print Shift Audit Report'}
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>{isAr ? 'طباعة التقرير' : 'Print Report'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Top KPI Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {/* Card 1: Total Scans */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-semibold">{isAr ? 'إجمالي المسحات' : 'Total Scans'}</span>
                      <Scan className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{totalScans}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {isAr ? 'جميع الأجهزة ومسدسات الليزر' : 'Optical camera & laser guns'}
                    </div>
                  </div>

                  {/* Card 2: Success Match Rate */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-semibold">{isAr ? 'معدل المطابقة' : 'Success Rate'}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-emerald-600">{successRate}%</span>
                      <span className="text-xs text-emerald-700 font-bold">({totalMatches})</span>
                    </div>
                    <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${successRate}%` }}></div>
                    </div>
                  </div>

                  {/* Card 3: Mismatches Intercepted */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-semibold">{isAr ? 'تناقضات تم منعها' : 'Near-Misses Intercepted'}</span>
                      <AlertOctagon className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-2xl font-black text-rose-600">{totalMismatches}</div>
                    <div className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded mt-1 border border-rose-200 inline-block">
                      {isAr ? 'حماية من أخطاء دوائية' : 'Zero-harm saves'}
                    </div>
                  </div>

                  {/* Card 4: eMAR Active Checks */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-semibold">{isAr ? 'جرعات eMAR المحققة' : 'eMAR Doses Checked'}</span>
                      <Pill className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-2xl font-black text-indigo-600">{Math.round(totalMatches * 0.52)}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {isAr ? 'مطابقة الحقوق الـ 5 كاملة' : 'Bedside 5-Rights cleared'}
                    </div>
                  </div>

                  {/* Card 5: Offline Sync & Readiness */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-semibold">{isAr ? 'حالة المزامنة' : 'Offline Sync Queue'}</span>
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-black text-teal-700">{isAr ? 'متزامن 100%' : '100% Synced'}</div>
                    <div className="text-[10px] text-teal-700 font-bold mt-1">
                      {isAr ? 'قاعدة بيانات المستشفى متصلة' : 'Zero pending offline items'}
                    </div>
                  </div>
                </div>

                {/* 3. Trend Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Chart 1: Hourly Scan Volume & Discrepancies */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-teal-600" />
                          <span>{isAr ? 'منحنى كثافة المسح ونسب المطابقة عبر ساعات المناوبة' : 'Scan Volume & Bedside Match Trend by Hour'}</span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {isAr ? 'مقارنة العمليات السليمة مقابل التناقضات المكتشفة بالساعة' : 'Successful verified matches vs detected mismatches per hour'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 font-semibold text-teal-700">
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                          {isAr ? 'مطابقة مؤكدة' : 'Matches'}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-rose-600">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                          {isAr ? 'تناقضات' : 'Mismatches'}
                        </span>
                      </div>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorMismatches" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#e11d48" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="matches" 
                            name={isAr ? 'مسحات ناجحة' : 'Successful Scans'} 
                            stroke="#0d9488" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorMatches)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="mismatches" 
                            name={isAr ? 'تناقضات مكتشفة' : 'Mismatches Caught'} 
                            stroke="#e11d48" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorMismatches)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Category Breakdown */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <BarChart2 className="w-4 h-4 text-indigo-600" />
                          <span>{isAr ? 'توزيع المسح حسب النوع' : 'Breakdown by Asset Type'}</span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">Shift Total</span>
                      </div>

                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={categoryBreakdown} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={80} />
                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '11px' }} />
                            <Bar dataKey="matches" name={isAr ? 'عمليات مطابقة' : 'Matches'} radius={[0, 4, 4, 0]} fill="#0d9488" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                      <div className="flex justify-between text-slate-600">
                        <span>{isAr ? 'الأعلى كثافة:' : 'Highest Volume:'}</span>
                        <strong className="text-teal-700">{isAr ? 'أدوية eMAR السريرية' : 'eMAR Medications'}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{isAr ? 'أعلى دقة:' : 'Highest Accuracy:'}</span>
                        <strong className="text-emerald-700">100% {isAr ? '(أنابيب المختبر)' : '(LIS Specimens)'}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Live Shift Scan Audit Table */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                      <h4 className="text-xs font-bold text-slate-900">
                        {isAr ? 'سجل التدقيق السريري اللحظي للمسحات' : 'Real-Time Bedside Clinical Scan Audit Log'}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 font-mono font-bold text-slate-700">
                        {displayedLogs.length} {isAr ? 'سجل' : 'events'}
                      </span>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-medium">{isAr ? 'تصفية النوع:' : 'Filter:'}</span>
                      {[
                        { key: 'all', labelAr: 'الكل', labelEn: 'All' },
                        { key: 'medication', labelAr: 'الأدوية', labelEn: 'Meds' },
                        { key: 'patient', labelAr: 'الأساور', labelEn: 'Patients' },
                        { key: 'specimen', labelAr: 'المختبر', labelEn: 'LIS' },
                        { key: 'blood', labelAr: 'بنك الدم', labelEn: 'Blood' }
                      ].map(cat => (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setScanCategoryFilter(cat.key as any)}
                          className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors cursor-pointer ${
                            scanCategoryFilter === cat.key 
                              ? 'bg-slate-900 text-white' 
                              : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {isAr ? cat.labelAr : cat.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-start">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                          <th className="py-2.5 px-3 text-start">{isAr ? 'الوقت' : 'Time'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'العنصر الممسوح' : 'Scanned Asset'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'المريض المستهدف' : 'Patient (MRN)'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'نتيجة الفحص' : 'Verification Status'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'الممرض / الفني' : 'Staff Operator'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'الإجراء السريري' : 'Clinical Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-600 whitespace-nowrap">
                              {log.time}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">{log.item}</div>
                              <div className="text-[10px] font-mono text-slate-400 truncate max-w-xs">{log.code}</div>
                            </td>
                            <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-medium">
                              {log.patient}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {log.status === 'match' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  {isAr ? log.statusLabelAr : log.statusLabelEn}
                                </span>
                              )}
                              {log.status === 'mismatch' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                  <AlertOctagon className="w-3 h-3 text-rose-600" />
                                  {isAr ? log.statusLabelAr : log.statusLabelEn}
                                </span>
                              )}
                              {log.status === 'allergy' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  {isAr ? log.statusLabelAr : log.statusLabelEn}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                              {log.nurse}
                            </td>
                            <td className="py-3 px-3 text-slate-600 text-[11px]">
                              {log.action}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
