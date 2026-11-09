import React, { useState } from 'react';
import { 
  Bed, 
  Patient, 
  Admission, 
  Language, 
  SystemUser, 
  MedicalPackage 
} from '../types/hmis.ts';
import {
  Plus, 
  UserPlus, 
  ArrowRightLeft, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  FileText,
  TrendingUp,
  Activity,
  BedDouble,
  BarChart3,
  Users,
  Barcode,
  Map,
  LayoutGrid
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { api } from '../api/client.ts';
import { DailyHuddleSummaryModal } from './DailyHuddleSummaryModal.tsx';
import { BarcodeLabelsModal } from './BarcodeLabelsModal.tsx';
import { BedAssignmentMap } from './BedAssignmentMap.tsx';

interface ReceptionModuleProps {
  beds: Bed[];
  patients: Patient[];
  admissions: Admission[];
  packages: MedicalPackage[];
  currentUser: SystemUser;
  language: Language;
  onRefresh: () => void;
  onSelectAdmission: (adm: Admission) => void;
  onOpenBarcodeHub?: () => void;
}

export const ReceptionModule: React.FC<ReceptionModuleProps> = ({
  beds,
  patients,
  admissions,
  packages,
  currentUser,
  language,
  onRefresh,
  onSelectAdmission,
  onOpenBarcodeHub,
}) => {
  const isAr = language === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [bedStatusFilter, setBedStatusFilter] = useState<'all' | 'occupied' | 'available' | 'cleaning'>('all');
  const [bedViewMode, setBedViewMode] = useState<'floor_map' | 'grid'>('floor_map');
  
  // Modals state
  const [showHuddleModal, setShowHuddleModal] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAdmission, setTransferAdmission] = useState<Admission | null>(null);
  const [selectedPatientForAdm, setSelectedPatientForAdm] = useState<Patient | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedPatientForBarcode, setSelectedPatientForBarcode] = useState<Patient | null>(null);
  const [selectedAdmissionForBarcode, setSelectedAdmissionForBarcode] = useState<Admission | null>(null);

  // Form states
  const [isEmergencyFastTrack, setIsEmergencyFastTrack] = useState(false);
  const [patientForm, setPatientForm] = useState({
    fullName: '',
    nationalId: '',
    dob: '1995-01-01',
    gender: 'female' as 'female' | 'male',
    phone: '',
    address: 'طرابلس',
    emergencyContactName: '',
    emergencyContactRelation: 'زوج',
    emergencyContactPhone: '',
    bloodGroup: 'O+' as any,
    bloodGroupStatus: 'Pending Verification' as any,
    allergies: '',
    chronicConditions: '',
    pastMedicalHistory: '',
    pastSurgicalHistory: '',
    drugHistory: '',
    familyHistory: ''
  });

  const [admissionForm, setAdmissionForm] = useState({
    source: 'emergency' as any,
    referralDetails: '',
    attendingConsultantId: 'usr-1',
    attendingConsultantName: 'د. طارق بن عامر',
    admittingDoctorId: 'usr-2',
    admittingDoctorName: 'د. هدى المنصوري',
    department: 'Obstetrics & Gynecology (أمراض النساء والولادة)',
    bedId: '',
    payerType: 'self' as any,
    corporateName: '',
    corporateContractNo: '',
    packageId: ''
  });

  const [transferTargetBedId, setTransferTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filtered beds
  const wards = Array.from(new Set(beds.map(b => b.ward)));
  const filteredBeds = beds.filter(b => {
    if (selectedWard !== 'all' && b.ward !== selectedWard) return false;
    if (bedStatusFilter !== 'all' && b.status !== bedStatusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNumber = b.number.toLowerCase().includes(term);
      const matchPatient = b.currentPatientName?.toLowerCase().includes(term);
      const matchAdm = b.currentAdmissionId?.toLowerCase().includes(term);
      const matchType = b.roomType?.toLowerCase().includes(term);
      const matchRoom = b.roomNumber?.toLowerCase().includes(term);
      return matchNumber || matchPatient || matchAdm || matchType || matchRoom;
    }
    return true;
  });

  const [showOccupancyDashboard, setShowOccupancyDashboard] = useState(true);

  // 7-day Bed Occupancy Trend Data
  const last7DaysData = React.useMemo(() => {
    const totalBeds = beds.length || 16;
    const currentOccupied = beds.filter(b => b.status === 'occupied').length;
    const currentCleaning = beds.filter(b => b.status === 'cleaning').length;

    // Dates for the last 7 days ending today
    const days = [
      { offset: 6, labelAr: 'السبت 01/11', labelEn: 'Sat 01/11', occupied: Math.max(3, currentOccupied - 2), adm: 3, dis: 2 },
      { offset: 5, labelAr: 'الأحد 02/11', labelEn: 'Sun 02/11', occupied: Math.max(4, currentOccupied - 1), adm: 4, dis: 3 },
      { offset: 4, labelAr: 'الإثنين 03/11', labelEn: 'Mon 03/11', occupied: Math.max(5, currentOccupied - 2), adm: 5, dis: 4 },
      { offset: 3, labelAr: 'الثلاثاء 04/11', labelEn: 'Tue 04/11', occupied: Math.max(6, currentOccupied), adm: 4, dis: 2 },
      { offset: 2, labelAr: 'الأربعاء 05/11', labelEn: 'Wed 05/11', occupied: Math.max(5, currentOccupied + 1), adm: 6, dis: 3 },
      { offset: 1, labelAr: 'الخميس 06/11', labelEn: 'Thu 06/11', occupied: Math.max(4, currentOccupied), adm: 3, dis: 4 },
      { offset: 0, labelAr: 'اليوم (الجمعة)', labelEn: 'Today (Fri)', occupied: currentOccupied, adm: 4, dis: 2 },
    ];

    return days.map(d => {
      const occPercent = Math.min(100, Math.round((d.occupied / totalBeds) * 100));
      return {
        day: isAr ? d.labelAr : d.labelEn,
        occupied: d.occupied,
        vacant: Math.max(0, totalBeds - d.occupied),
        rate: occPercent,
        admissions: d.adm,
        discharges: d.dis,
        capacity: totalBeds
      };
    });
  }, [beds, isAr]);

  const currentOccupancyRate = beds.length > 0 
    ? Math.round((beds.filter(b => b.status === 'occupied').length / beds.length) * 100) 
    : 0;

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const mrnCount = patients.length + 816;
      const mrn = `MRN-2026-0${mrnCount}`;
      const newPat = await api.createPatient({
        mrn,
        fullName: patientForm.fullName,
        nationalId: patientForm.nationalId || `ID-${Date.now().toString().slice(-8)}`,
        dob: patientForm.dob,
        gender: patientForm.gender,
        phone: patientForm.phone || '091-0000000',
        address: patientForm.address,
        emergencyContactName: patientForm.emergencyContactName || 'مرافق مريض',
        emergencyContactRelation: patientForm.emergencyContactRelation,
        emergencyContactPhone: patientForm.emergencyContactPhone || '092-0000000',
        bloodGroup: patientForm.bloodGroup,
        bloodGroupStatus: patientForm.bloodGroupStatus,
        allergies: patientForm.allergies ? patientForm.allergies.split(',').map(s => s.trim()) : ['No Known Drug Allergies (NKDA)'],
        chronicConditions: patientForm.chronicConditions ? patientForm.chronicConditions.split(',').map(s => s.trim()) : [],
        pastMedicalHistory: patientForm.pastMedicalHistory || 'Unremarkable',
        pastSurgicalHistory: patientForm.pastSurgicalHistory || 'None',
        drugHistory: patientForm.drugHistory || 'None',
        familyHistory: patientForm.familyHistory || 'None'
      }, currentUser);

      setShowNewPatientModal(false);
      onRefresh();
      // Prompt directly to admit
      setSelectedPatientForAdm(newPat);
      setShowAdmissionModal(true);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForAdm) return;
    if (!admissionForm.bedId) {
      setErrorMessage(isAr ? 'يرجى اختيار سرير شاغر' : 'Please select a vacant bed');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const selectedBed = beds.find(b => b.id === admissionForm.bedId);
      const selectedPkg = packages.find(p => p.id === admissionForm.packageId);
      const now = new Date().toISOString();

      const newAdm = await api.createAdmission({
        mrn: selectedPatientForAdm.mrn,
        patientName: selectedPatientForAdm.fullName,
        admissionDate: now,
        receptionTime: now,
        wardArrivalTime: now,
        source: admissionForm.source,
        referralDetails: admissionForm.referralDetails,
        attendingConsultantId: admissionForm.attendingConsultantId,
        attendingConsultantName: admissionForm.attendingConsultantName,
        admittingDoctorId: admissionForm.admittingDoctorId,
        admittingDoctorName: admissionForm.admittingDoctorName,
        department: admissionForm.department,
        bedId: admissionForm.bedId,
        roomNumber: selectedBed ? selectedBed.roomNumber : '101',
        roomType: selectedBed ? selectedBed.roomType : 'standard',
        payerType: admissionForm.payerType,
        corporateName: admissionForm.corporateName,
        corporateContractNo: admissionForm.corporateContractNo,
        packageId: selectedPkg ? selectedPkg.id : undefined,
        packageName: selectedPkg ? selectedPkg.nameAr : undefined,
        status: 'active'
      }, currentUser);

      setShowAdmissionModal(false);
      onRefresh();
      onSelectAdmission(newAdm);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAdmission || !transferTargetBedId) return;

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await api.transferBed(transferAdmission.admissionId, transferTargetBedId, transferReason, currentUser);
      setShowTransferModal(false);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setIsEmergencyFastTrack(false);
              setPatientForm({
                fullName: '',
                nationalId: '',
                dob: '1995-01-01',
                gender: 'female',
                phone: '',
                address: 'طرابلس',
                emergencyContactName: '',
                emergencyContactRelation: 'زوج',
                emergencyContactPhone: '',
                bloodGroup: 'O+',
                bloodGroupStatus: 'Pending Verification',
                allergies: '',
                chronicConditions: '',
                pastMedicalHistory: '',
                pastSurgicalHistory: '',
                drugHistory: '',
                familyHistory: ''
              });
              setShowNewPatientModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isAr ? 'فتح ملف مريض جديد (MRN)' : 'Register Patient (MRN)'}</span>
          </button>

          {/* Emergency fast-track register (as mandated in Ch. 2 & 3: تسريع تسجيل الطوارئ) */}
          <button
            onClick={() => {
              setIsEmergencyFastTrack(true);
              setPatientForm({
                fullName: 'حالة إسعافية مجهولة الهوية ' + Math.floor(Math.random() * 1000),
                nationalId: 'EMERGENCY-' + Date.now().toString().slice(-6),
                dob: '1995-01-01',
                gender: 'female',
                phone: '091-0000000',
                address: 'إسعاف وطوارئ فوري',
                emergencyContactName: 'طاقم الإسعاف المرافق',
                emergencyContactRelation: 'مسعف',
                emergencyContactPhone: '092-0000000',
                bloodGroup: 'O-',
                bloodGroupStatus: 'Pending Verification',
                allergies: 'Unknown - Emergency Case',
                chronicConditions: 'Under Emergency Assessment',
                pastMedicalHistory: 'Pending stabilized patient history',
                pastSurgicalHistory: 'Unknown',
                drugHistory: 'Unknown',
                familyHistory: 'Unknown'
              });
              setShowNewPatientModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
          >
            <Sparkles className="w-4 h-4 text-rose-600" />
            <span>{isAr ? 'تسجيل إسعافي طارئ فوري' : 'Fast-Track Emergency'}</span>
          </button>

          {/* Daily Huddle Summary Button */}
          <button
            type="button"
            onClick={() => setShowHuddleModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>{isAr ? 'محضر الاجتماع الصباحي (Daily Huddle)' : 'Daily Huddle Summary'}</span>
          </button>

          {/* Barcode & Wristband Printing Hub - Full Page */}
          <button
            type="button"
            onClick={() => {
              if (onOpenBarcodeHub) {
                onOpenBarcodeHub();
              } else {
                setSelectedPatientForBarcode(patients[0] || null);
                setSelectedAdmissionForBarcode(admissions[0] || null);
                setShowBarcodeModal(true);
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors shadow-2xs cursor-pointer"
            title={isAr ? 'فتح المركز الشامل لطباعة وتدقيق الباركود وQR' : 'Open Full-Page Barcode & QR Hub'}
          >
            <Barcode className="w-4 h-4 text-emerald-600" />
            <span>{isAr ? 'مركز ملصقات الباركود وQR' : 'Barcode & QR Hub'}</span>
          </button>
        </div>

        {/* Enhanced Search & Status / Ward Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute rtl:right-2.5 ltr:left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالسرير، المريض، أو رقم الدخول...' : 'Search bed, patient, or ADM...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg rtl:pr-8 rtl:pl-7 ltr:pl-8 ltr:pr-7 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 w-48 sm:w-64"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute rtl:left-2 ltr:right-2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Bed Status Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">{isAr ? 'حالة السرير:' : 'Status:'}</span>
            <select
              value={bedStatusFilter}
              onChange={(e) => setBedStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="all">{isAr ? 'كافة الحالات' : 'All Beds'}</option>
              <option value="occupied">{isAr ? 'مشغول حالياً (Occupied)' : 'Occupied'}</option>
              <option value="available">{isAr ? 'شاغر متاح (Available)' : 'Available'}</option>
              <option value="cleaning">{isAr ? 'تنظيف وتعقيم (Cleaning)' : 'Cleaning'}</option>
            </select>
          </div>

          {/* Ward Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs overflow-x-auto max-w-md">
            <button
              onClick={() => setSelectedWard('all')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-colors shrink-0 ${
                selectedWard === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'كافة الأجنحة' : 'All Wards'}
            </button>
            {wards.map(w => (
              <button
                key={w}
                onClick={() => setSelectedWard(w)}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors truncate max-w-[140px] shrink-0 ${
                  selectedWard === w ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title={w}
              >
                {w.split('(')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recharts: Bed Occupancy Dashboard (7-Day Trends) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {isAr ? 'لوحة إشغال الأسرّة وتحليلات الـ 7 أيام الماضية' : 'Bed Occupancy Dashboard (7-Day Trends)'}
                </h3>
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  currentOccupancyRate >= 80 
                    ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}>
                  {isAr ? `إشغال اليوم: ${currentOccupancyRate}%` : `Current Occupancy: ${currentOccupancyRate}%`}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isAr 
                  ? 'رصد حركة الإشغال والتنويم والخروج اليومي والتنبؤ بالطاقة الاستيعابية لأقسام الإيواء' 
                  : 'Daily inpatient bed census, admission/discharge volume, and ward capacity trends'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Quick KPI pills */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
              <BedDouble className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600">{isAr ? 'إجمالي الأسرّة:' : 'Total Beds:'}</span>
              <strong className="font-mono text-slate-900">{beds.length}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-700">{isAr ? 'الشاغر الآن:' : 'Vacant:'}</span>
              <strong className="font-mono text-emerald-900">{beds.filter(b => b.status === 'vacant').length}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-rose-700">{isAr ? 'المشغول:' : 'Occupied:'}</span>
              <strong className="font-mono text-rose-900">{beds.filter(b => b.status === 'occupied').length}</strong>
            </div>

            <button
              type="button"
              onClick={() => setShowOccupancyDashboard(!showOccupancyDashboard)}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold underline px-1 cursor-pointer"
            >
              {showOccupancyDashboard ? (isAr ? 'طي المؤشر' : 'Collapse') : (isAr ? 'عرض الرسم' : 'Expand')}
            </button>
          </div>
        </div>

        {showOccupancyDashboard && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {/* Main Area Chart: Bed Occupancy & Capacity Trend */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isAr ? 'منحنى عدد الأسرّة المشغولة مقابل الشاغرة (7 أيام)' : 'Occupied vs Vacant Beds (7 Days)'}</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {isAr ? 'الطاقة الكلية: 16 سرير' : 'Total Capacity: 16 beds'}
                </span>
              </div>

              <div className="h-64 w-full bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="occupiedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="vacantGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, (dataMax: number) => Math.max(16, dataMax + 2)]} 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: any, name: any) => {
                        const label = name === 'occupied' 
                          ? (isAr ? 'أسرّة مشغولة' : 'Occupied Beds') 
                          : (isAr ? 'أسرّة شاغرة' : 'Vacant Beds');
                        return [`${value} ${isAr ? 'سرير' : 'beds'}`, label];
                      }}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={32}
                      formatter={(value) => {
                        return (
                          <span className="text-xs text-slate-700 font-medium">
                            {value === 'occupied' 
                              ? (isAr ? 'أسرّة مشغولة (Occupied)' : 'Occupied Beds') 
                              : (isAr ? 'أسرّة شاغرة (Vacant)' : 'Vacant Beds')}
                          </span>
                        );
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="occupied" 
                      stroke="#0d9488" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#occupiedGradient)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="vacant" 
                      stroke="#60a5fa" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={1} 
                      fill="url(#vacantGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: Daily Inpatient Admissions vs Discharges */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAr ? 'حركة الدخول والخروج (Admissions vs Discharges)' : 'Daily Flow'}</span>
                </span>
                <span className="text-[11px] text-teal-700 font-medium font-mono">
                  {isAr ? 'صافي التدفق' : 'Net Flow'}
                </span>
              </div>

              <div className="h-64 w-full bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7DaysData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: any, name: any) => {
                        const label = name === 'admissions' 
                          ? (isAr ? 'دخول جديد' : 'Admissions') 
                          : (isAr ? 'حالات خروج' : 'Discharges');
                        return [`${value} ${isAr ? 'حالة' : 'patients'}`, label];
                      }}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={32}
                      formatter={(value) => (
                        <span className="text-xs text-slate-700 font-medium">
                          {value === 'admissions' ? (isAr ? 'دخول (Admissions)' : 'Admissions') : (isAr ? 'خروج (Discharges)' : 'Discharges')}
                        </span>
                      )}
                    />
                    <Bar dataKey="admissions" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="discharges" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bed Occupancy Management: Floor Plan Map & Grid View */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'لوحة توزيع الأسرّة والإيواء اللحظي' : 'Real-time Ward & Bed Management'}</span>
            </h2>

            {/* View Mode Toggle: Interactive Floor Plan Map vs Grid */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setBedViewMode('floor_map')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  bedViewMode === 'floor_map'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
                title={isAr ? 'عرض المخطط الهندسي التفاعلي لطوابق وأجنحة المستشفى' : 'Architectural Floor Plan View'}
              >
                <Map className="w-3.5 h-3.5" />
                <span>{isAr ? 'خريطة الطوابق التفاعلية' : 'Interactive Floor Map'}</span>
              </button>

              <button
                type="button"
                onClick={() => setBedViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  bedViewMode === 'grid'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
                title={isAr ? 'عرض بطاقات الأسرّة التقليدية' : 'Standard Bed Cards Grid'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{isAr ? 'بطاقات الأسرّة (شبكة)' : 'Bed Cards Grid'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">{isAr ? 'شاغر' : 'Vacant'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-600">{isAr ? 'مشغول' : 'Occupied'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-600">{isAr ? 'محجوز' : 'Reserved'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-600">{isAr ? 'تعقيم' : 'Cleaning'}</span>
            </span>
          </div>
        </div>

        {/* View Selection: BedAssignmentMap or Bed Grid */}
        {bedViewMode === 'floor_map' ? (
          <BedAssignmentMap
            beds={beds}
            patients={patients}
            admissions={admissions}
            currentUser={currentUser}
            language={language}
            onSelectAdmission={onSelectAdmission}
            onInitiateTransfer={(adm) => {
              setTransferAdmission(adm);
              setTransferTargetBedId('');
              setTransferReason('');
              setShowTransferModal(true);
            }}
            onAssignPatientToBed={(bed) => {
              setAdmissionForm(prev => ({ ...prev, bedId: bed.id }));
              setSelectedPatientForAdm(patients[0] || null);
              setShowAdmissionModal(true);
            }}
            onUpdateBedStatus={async (bedId, status, infectionStatus) => {
              try {
                await api.updateBed(bedId, { status, infectionStatus }, {
                  id: currentUser.id,
                  name: currentUser.name,
                  role: currentUser.role
                });
                onRefresh();
              } catch (err: any) {
                console.error('Failed to update bed status:', err);
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBeds.map(bed => {
              const isOccupied = bed.status === 'occupied';
              const adm = isOccupied ? admissions.find(a => a.admissionId === bed.currentAdmissionId) : null;

              return (
                <div 
                  key={bed.id}
                  className={`bg-white border rounded-lg p-4 transition-all hover:shadow-sm ${
                    isOccupied ? 'border-rose-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{bed.number}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                          {isAr ? `غرفة ${bed.roomNumber}` : `Rm ${bed.roomNumber}`}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{bed.ward}</span>
                    </div>

                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      bed.status === 'vacant' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      bed.status === 'occupied' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      bed.status === 'reserved' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {bed.status === 'vacant' ? (isAr ? 'شاغر' : 'Vacant') :
                       bed.status === 'occupied' ? (isAr ? 'مشغول' : 'Occupied') :
                       bed.status === 'reserved' ? (isAr ? 'محجوز' : 'Reserved') :
                       (isAr ? 'يحتاج تعقيم' : 'Cleaning')}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 mb-3 font-mono">
                    <span>{isAr ? 'فئة الإقامة:' : 'Class:'} <strong className="text-slate-800">{bed.roomType.toUpperCase()}</strong></span>
                    <span>{bed.dailyRate} {isAr ? 'د.ل / يوم' : 'LYD / day'}</span>
                  </div>

                  {isOccupied && adm ? (
                    <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs space-y-1">
                      <div className="font-bold text-slate-900 flex items-center justify-between">
                        <span className="truncate">{bed.currentPatientName}</span>
                        <span className="text-[10px] text-teal-700 font-mono">{adm.admissionId}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {isAr ? 'الاستشاري:' : 'Consultant:'} {adm.attendingConsultantName}
                      </div>
                      {adm.packageName && (
                        <div className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded truncate">
                          {adm.packageName}
                        </div>
                      )}

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => onSelectAdmission(adm)}
                          className="flex-1 py-1 text-center bg-teal-600 hover:bg-teal-700 text-white font-medium rounded text-[11px] transition-colors"
                        >
                          {isAr ? 'فتح الملف السريري' : 'Open EMR'}
                        </button>
                        <button
                          onClick={() => {
                            const pat = patients.find(p => p.mrn === adm.mrn) || null;
                            setSelectedPatientForBarcode(pat);
                            setSelectedAdmissionForBarcode(adm);
                            setShowBarcodeModal(true);
                          }}
                          className="p-1 text-teal-700 hover:text-teal-900 bg-white border border-teal-300 rounded hover:bg-teal-50 transition-colors"
                          title={isAr ? 'طباعة باركود وسوار المريض' : 'Print Patient Barcode & Wristband'}
                        >
                          <Barcode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setTransferAdmission(adm);
                            setTransferTargetBedId('');
                            setTransferReason('');
                            setShowTransferModal(true);
                          }}
                          className="p-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                          title={isAr ? 'نقل المريض لسرير آخر' : 'Transfer Bed'}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end pt-1">
                      <button
                        onClick={() => {
                          setAdmissionForm(prev => ({ ...prev, bedId: bed.id }));
                          setSelectedPatientForAdm(patients[0] || null);
                          setShowAdmissionModal(true);
                        }}
                        className="w-full py-1.5 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-xs transition-colors"
                      >
                        {isAr ? 'تخصيص سرير وإدخال حالة' : 'Admit Patient Here'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Register New Patient */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {isEmergencyFastTrack 
                    ? (isAr ? 'تسجيل إسعافي طارئ فوري (Fast-Track)' : 'Fast-Track Emergency Patient Registration')
                    : (isAr ? 'تسجيل وفتح ملف مريض جديد (Permanent MRN)' : 'Register New Patient (Permanent MRN)')}
                </h3>
              </div>
              <button 
                onClick={() => setShowNewPatientModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreatePatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'الاسم الرباعي الكامل للمريض *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={patientForm.fullName}
                    onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                    placeholder="فاطمة عمر فرج الورفلي"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'الرقم الوطني / جواز السفر *' : 'National ID / Passport *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={patientForm.nationalId}
                    onChange={(e) => setPatientForm({ ...patientForm, nationalId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 font-mono"
                    placeholder="119950123456"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'تاريخ الميلاد *' : 'Date of Birth *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={patientForm.dob}
                    onChange={(e) => setPatientForm({ ...patientForm, dob: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'رقم الهاتف *' : 'Phone *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                    placeholder="091-2345678"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'فصيلة الدم وعامل Rh' : 'Blood Group & Rh'}
                  </label>
                  <select
                    value={patientForm.bloodGroup}
                    onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 font-mono"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'حالة التحقق المخبري للفصيلة' : 'Blood Group Verification Status'}
                  </label>
                  <select
                    value={patientForm.bloodGroupStatus}
                    onChange={(e) => setPatientForm({ ...patientForm, bloodGroupStatus: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                  >
                    <option value="Pending Verification">{isAr ? 'قيد التحقق المخبري (Pending)' : 'Pending Verification'}</option>
                    <option value="Verified">{isAr ? 'معتمد ومؤكد مخبرياً (Verified)' : 'Verified'}</option>
                    <option value="Reported by Patient">{isAr ? 'حسب إفادة المريض (Reported)' : 'Reported by Patient'}</option>
                  </select>
                </div>
              </div>

              {/* Allergies Highlight */}
              <div>
                <label className="block text-rose-700 font-bold mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isAr ? 'حساسية الأدوية والمواد (Drug Allergies) - هام جداً' : 'Drug Allergies (Crucial)'}</span>
                </label>
                <input
                  type="text"
                  value={patientForm.allergies}
                  onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })}
                  className="w-full bg-rose-50 border border-rose-300 rounded px-3 py-1.5 text-rose-900"
                  placeholder="مثال: Penicillin, Sulfa, Latex (أو اترك فارغاً إذا لا توجد حساسية معروفة)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'اسم القريب المسؤول (Emergency Contact)' : 'Emergency Contact Name'}
                  </label>
                  <input
                    type="text"
                    value={patientForm.emergencyContactName}
                    onChange={(e) => setPatientForm({ ...patientForm, emergencyContactName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                    placeholder="سالم الترهوني"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'صلة القرابة ورقم الهاتف' : 'Relation & Phone'}
                  </label>
                  <input
                    type="text"
                    value={patientForm.emergencyContactPhone}
                    onChange={(e) => setPatientForm({ ...patientForm, emergencyContactPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                    placeholder="زوج / 092-1234567"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ وفتح الملف الطبي' : 'Save & Proceed')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Admit Patient to Ward */}
      {showAdmissionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {isAr ? 'إجراءات فتح حلقة إيواء جديدة (Admission ID)' : 'Create New Inpatient Admission (Admission ID)'}
                </h3>
              </div>
              <button 
                onClick={() => setShowAdmissionModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateAdmission} className="space-y-4 text-xs">
              {/* Patient Selection */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isAr ? 'المريض المراد إيواؤه *' : 'Patient *'}
                </label>
                <select
                  value={selectedPatientForAdm?.mrn || ''}
                  onChange={(e) => {
                    const p = patients.find(pat => pat.mrn === e.target.value);
                    if (p) setSelectedPatientForAdm(p);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                >
                  {patients.map(p => (
                    <option key={p.mrn} value={p.mrn}>
                      {p.fullName} ({p.mrn} - {p.bloodGroup})
                    </option>
                  ))}
                </select>
              </div>

              {/* Source of Admission & Department */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'مصدر التحويل والدخول *' : 'Admission Source *'}
                  </label>
                  <select
                    value={admissionForm.source}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, source: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                  >
                    <option value="emergency">{isAr ? 'إسعاف وطوارئ (Emergency)' : 'Emergency'}</option>
                    <option value="outpatient">{isAr ? 'عيادات خارجية (Outpatient Clinic)' : 'Outpatient'}</option>
                    <option value="referral">{isAr ? 'تحويل من مستشفى آخر (Referral)' : 'Hospital Referral'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'القسم الطبي *' : 'Medical Department *'}
                  </label>
                  <select
                    value={admissionForm.department}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                  >
                    <option value="Obstetrics & Gynecology (أمراض النساء والولادة)">
                      {isAr ? 'أمراض النساء والولادة (Obstetrics & Gynecology)' : 'Obstetrics & Gynecology'}
                    </option>
                    <option value="General Surgery (الجراحة العامة)">
                      {isAr ? 'الجراحة العامة (General Surgery)' : 'General Surgery'}
                    </option>
                    <option value="Intensive Care Unit (العناية الفائقة)">
                      {isAr ? 'العناية الفائقة (ICU)' : 'Intensive Care Unit'}
                    </option>
                  </select>
                </div>
              </div>

              {/* Doctors in charge */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'الاستشاري المسؤول *' : 'Attending Consultant *'}
                  </label>
                  <select
                    value={admissionForm.attendingConsultantName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, attendingConsultantName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                  >
                    <option value="د. طارق بن عامر">د. طارق بن عامر (استشاري نساء وتوليد)</option>
                    <option value="د. هدى المنصوري">د. هدى المنصوري (أخصائي نساء وتوليد)</option>
                    <option value="د. عادل الفيتوري">د. عادل الفيتوري (استشاري جراحة منظارية)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'الطبيب فاتح الملف *' : 'Admitting Physician *'}
                  </label>
                  <select
                    value={admissionForm.admittingDoctorName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, admittingDoctorName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                  >
                    <option value="د. هدى المنصوري">د. هدى المنصوري</option>
                    <option value="د. طارق بن عامر">د. طارق بن عامر</option>
                    <option value="د. عادل الفيتوري">د. عادل الفيتوري</option>
                  </select>
                </div>
              </div>

              {/* Bed Selection - Conflict Prevention */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                  <span>{isAr ? 'تخصيص السرير والغرفة (الأسرّة الشاغرة فقط) *' : 'Assign Bed (Vacant Only) *'}</span>
                  <span className="text-teal-700 text-[11px] font-normal">
                    {isAr ? 'تطبق قاعدة منع ازدواج تخصيص السرير' : 'Prevents double-booking'}
                  </span>
                </label>
                <select
                  required
                  value={admissionForm.bedId}
                  onChange={(e) => setAdmissionForm({ ...admissionForm, bedId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 font-mono"
                >
                  <option value="">{isAr ? '-- اختر سريراً متاحاً --' : '-- Select a vacant bed --'}</option>
                  {beds.filter(b => b.status === 'vacant').map(b => (
                    <option key={b.id} value={b.id}>
                      {b.number} - {b.ward} ({b.roomType.toUpperCase()} - {b.dailyRate} LYD/day)
                    </option>
                  ))}
                </select>
              </div>

              {/* Financial Payer & Medical Package */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'الجهة المالية والضامن' : 'Financial Payer'}
                  </label>
                  <select
                    value={admissionForm.payerType}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, payerType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                  >
                    <option value="self">{isAr ? 'دفع ذاتي (Self-Pay)' : 'Self-Pay'}</option>
                    <option value="family">{isAr ? 'قريب / عائلة (Family)' : 'Family'}</option>
                    <option value="corporate_insurance">{isAr ? 'تأمين / شركة تعاقدية (Insurance)' : 'Corporate / Insurance'}</option>
                  </select>
                </div>

                {admissionForm.payerType === 'corporate_insurance' && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {isAr ? 'اسم الشركة ورقم العقد / الاعتماد' : 'Corporate Name & Contract No.'}
                    </label>
                    <input
                      type="text"
                      value={admissionForm.corporateName}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, corporateName: e.target.value })}
                      placeholder="شركة المدار للاتصالات / عقد رقم 981"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'ربط باقة علاجية محددة (Packages)' : 'Medical Package'}
                  </label>
                  <select
                    value={admissionForm.packageId}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, packageId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                  >
                    <option value="">{isAr ? 'بدون باقة (حساب فعلي بالخدمات)' : 'No Package (Itemized Billing)'}</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.nameAr} ({pkg.totalPrice} LYD - {pkg.includedDays} days)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAdmissionModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري التخصيص...' : 'Assigning...') : (isAr ? 'تأكيد الإيواء وفتح الحلقة' : 'Confirm Admission')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bed Transfer */}
      {showTransferModal && transferAdmission && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {isAr ? 'نقل المريض لغرفة أو سرير آخر' : 'Transfer Bed / Room'}
                </h3>
              </div>
              <button 
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleTransferBed} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900">{transferAdmission.patientName}</div>
                <div className="text-slate-600">
                  {isAr ? 'السرير الحالي:' : 'Current Bed:'} <strong className="font-mono">{transferAdmission.roomNumber} ({transferAdmission.roomType})</strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isAr ? 'السرير الجديد المستهدف *' : 'Target Bed *'}
                </label>
                <select
                  required
                  value={transferTargetBedId}
                  onChange={(e) => setTransferTargetBedId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 font-mono"
                >
                  <option value="">{isAr ? '-- اختر السرير الجديد الشاغر --' : '-- Select destination bed --'}</option>
                  {beds.filter(b => b.status === 'vacant').map(b => (
                    <option key={b.id} value={b.id}>
                      {b.number} - {b.ward} ({b.roomType.toUpperCase()} - {b.dailyRate} LYD/day)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isAr ? 'سبب النقل (مطلوب للتوثيق المحاسبي والسريري) *' : 'Reason for Transfer *'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                  placeholder={isAr ? 'مثال: نقل من غرفة الإفاقة بعد استقرار العلامات الحيوية إلى جناح التوليد العادي' : 'Clinical reason for transfer'}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري النقل...' : 'Transferring...') : (isAr ? 'تأكيد نقل السرير' : 'Confirm Transfer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Staff Huddle Summary Modal */}
      <DailyHuddleSummaryModal
        isOpen={showHuddleModal}
        onClose={() => setShowHuddleModal(false)}
        admissions={admissions}
        beds={beds}
        patients={patients}
        currentUser={currentUser}
        language={language}
        onSelectAdmission={(adm) => onSelectAdmission(adm)}
      />

      {/* Barcode & Wristband Label Generator Modal */}
      <BarcodeLabelsModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        currentPatient={selectedPatientForBarcode || patients[0] || null}
        currentAdmission={selectedAdmissionForBarcode || admissions[0] || null}
        allPatients={patients}
        allAdmissions={admissions}
        language={language}
      />
    </div>
  );
};
