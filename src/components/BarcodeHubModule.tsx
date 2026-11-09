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
  ExternalLink
} from 'lucide-react';
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
  | 'scanner';

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
        </div>
      </div>
    </div>
  );
};
