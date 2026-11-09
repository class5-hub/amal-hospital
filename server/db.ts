import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Patient,
  Admission,
  Bed,
  BedTransfer,
  ClinicalAssessment,
  ManagementPlan,
  DietaryOrder,
  MedicationOrder,
  EMARRecord,
  LabOrder,
  Consultation,
  OperativeReport,
  AnesthesiaRecord,
  PharmacyItem,
  DispenseRecord,
  StoreCustodyItem,
  MedicalPackage,
  PaymentReceipt,
  DischargeSummary,
  DAMAForm,
  MedicalReport,
  ConsentForm,
  VoiceNote,
  AuditLogEntry,
  SystemUser,
  ProvisionalInvoice,
  BillingLineItem,
  InventoryItem,
  Vendor,
  PurchaseOrder,
  StockMovement,
  Appointment,
  UserRole,
  Permission,
  SmartAlert,
  AlertSeverity,
  AlertCategory,
  DisbursementVoucher,
  JournalEntry,
  JournalEntryLine,
  AccountChartItem,
  DoctorSettlement,
  DoctorSettlementCase,
  CorporateClaim,
  FinancialOverviewData
} from '../src/types/hmis.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, 'hmis_database.json');

export interface HMISDatabase {
  users: SystemUser[];
  patients: Patient[];
  admissions: Admission[];
  beds: Bed[];
  assessments: Record<string, ClinicalAssessment>; // keyed by admissionId
  plans: Record<string, ManagementPlan[]>; // keyed by admissionId
  dietaryOrders: DietaryOrder[];
  medications: MedicationOrder[];
  emarRecords: EMARRecord[];
  labOrders: LabOrder[];
  consultations: Consultation[];
  operativeReports: OperativeReport[];
  anesthesiaRecords: AnesthesiaRecord[];
  pharmacyItems: PharmacyItem[];
  dispenseRecords: DispenseRecord[];
  custodyItems: StoreCustodyItem[];
  packages: MedicalPackage[];
  paymentReceipts: PaymentReceipt[];
  dischargeSummaries: DischargeSummary[];
  damaForms: DAMAForm[];
  medicalReports: MedicalReport[];
  consentForms: ConsentForm[];
  voiceNotes: VoiceNote[];
  auditLogs: AuditLogEntry[];
  inventoryItems: InventoryItem[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  stockMovements: StockMovement[];
  appointments: Appointment[];
  smartAlertAcks?: Record<string, { acknowledgedBy: string; acknowledgedAt: string; notes?: string }>;
  aiCustomAlerts?: SmartAlert[];
  disbursementVouchers?: DisbursementVoucher[];
  corporateClaims?: CorporateClaim[];
  customJournalEntries?: JournalEntry[];
}

function getInitialData(): HMISDatabase {
  const users: SystemUser[] = [
    { 
      id: 'usr-admin', 
      username: 'admin', 
      name: 'Dr. Salem Ben-Ziyad (Admin)', 
      nameAr: 'د. سالم بن زياد (المدير العام)', 
      role: 'admin', 
      title: 'Hospital Director & HMIS Administrator', 
      department: 'Executive Administration',
      email: 'admin@alamal-hospital.ly',
      permissions: [
        'MANAGE_SYSTEM', 'MANAGE_USERS', 'VIEW_ALL_PATIENTS', 'CREATE_PATIENTS', 
        'WRITE_CLINICAL', 'ORDER_MEDICATIONS', 'DISCONTINUE_MEDICATIONS', 'ADMINISTER_EMAR', 
        'ORDER_LABS', 'APPROVE_LABS', 'MANAGE_INVENTORY', 'CREATE_PO', 'APPROVE_PO', 
        'BOOK_APPOINTMENTS', 'MANAGE_APPOINTMENTS', 'VIEW_BILLING', 'MANAGE_BILLING'
      ]
    },
    { 
      id: 'usr-1', 
      username: 'dr_tarek', 
      name: 'Dr. Tarek Ben-Amer', 
      nameAr: 'د. طارق بن عامر', 
      role: 'doctor', 
      title: 'Senior Consultant Ob/Gyn & Surgeon', 
      department: 'Obstetrics & Gynecology',
      email: 'tarek.amer@alamal-hospital.ly',
      permissions: [
        'VIEW_ALL_PATIENTS', 'CREATE_PATIENTS', 'WRITE_CLINICAL', 'ORDER_MEDICATIONS', 
        'DISCONTINUE_MEDICATIONS', 'ORDER_LABS', 'BOOK_APPOINTMENTS', 'MANAGE_APPOINTMENTS', 
        'VIEW_BILLING'
      ]
    },
    { 
      id: 'usr-6', 
      username: 'nurse_fatima', 
      name: 'Nurse Fatima Al-Warfalli', 
      nameAr: 'ممرضة فاطمة الورفلي', 
      role: 'nurse', 
      title: 'Senior Charge Inpatient Nurse', 
      department: 'Nursing Care Unit',
      email: 'fatima.w@alamal-hospital.ly',
      permissions: [
        'VIEW_ALL_PATIENTS', 'ADMINISTER_EMAR', 'BOOK_APPOINTMENTS', 'MANAGE_APPOINTMENTS'
      ]
    },
    { 
      id: 'usr-patient', 
      username: 'mariam_patient', 
      name: 'Mariam Salem Al-Tarhouni', 
      nameAr: 'مريم سالم الترهوني', 
      role: 'patient', 
      title: 'Maternity Inpatient Client', 
      department: 'Patient Portal',
      linkedPatientMrn: 'MRN-2026-0811',
      email: 'mariam.tarhouni@gmail.com',
      permissions: [
        'VIEW_OWN_PORTAL', 'BOOK_APPOINTMENTS'
      ]
    },
    { 
      id: 'usr-2', 
      username: 'dr_huda', 
      name: 'Dr. Huda Al-Mansouri', 
      nameAr: 'د. هدى المنصوري', 
      role: 'doctor', 
      title: 'Specialist Obstetrician', 
      department: 'Obstetrics & Gynecology',
      email: 'huda.m@alamal-hospital.ly',
      permissions: [
        'VIEW_ALL_PATIENTS', 'CREATE_PATIENTS', 'WRITE_CLINICAL', 'ORDER_MEDICATIONS', 
        'DISCONTINUE_MEDICATIONS', 'ORDER_LABS', 'BOOK_APPOINTMENTS', 'MANAGE_APPOINTMENTS', 
        'VIEW_BILLING'
      ]
    },
    { 
      id: 'usr-8', 
      username: 'pharm_bassem', 
      name: 'Pharmacist Bassem Al-Qadi', 
      nameAr: 'صيدلي باسم القاضي', 
      role: 'pharmacist', 
      title: 'Chief Clinical Pharmacist & Inventory Lead', 
      department: 'Pharmacy & Medical Store',
      email: 'bassem.qadi@alamal-hospital.ly',
      permissions: [
        'VIEW_ALL_PATIENTS', 'MANAGE_INVENTORY', 'CREATE_PO', 'VIEW_BILLING'
      ]
    },
    { 
      id: 'usr-10', 
      username: 'reem_reception', 
      name: 'Reem Al-Sharif', 
      nameAr: 'ريم الشريف', 
      role: 'reception', 
      title: 'Admissions & Reception Officer', 
      department: 'Admissions & Scheduling',
      email: 'reem.sharif@alamal-hospital.ly',
      permissions: [
        'VIEW_ALL_PATIENTS', 'CREATE_PATIENTS', 'BOOK_APPOINTMENTS', 'MANAGE_APPOINTMENTS'
      ]
    },
    { 
      id: 'usr-11', 
      username: 'mustafa_finance', 
      name: 'Mustafa Al-Senussi', 
      nameAr: 'مصطفى السنوسي', 
      role: 'accountant', 
      title: 'Chief Inpatient Accountant', 
      department: 'Finance & Invoicing',
      email: 'mustafa.senussi@alamal-hospital.ly',
      permissions: [
        'VIEW_ALL_PATIENTS', 'VIEW_BILLING', 'MANAGE_BILLING', 'APPROVE_PO'
      ]
    }
  ];

  const beds: Bed[] = [
    { id: 'bed-101', number: 'Bed 101', ward: 'Ob/Gyn Inpatient (نساء وتوليد)', roomNumber: '101', roomType: 'standard', status: 'occupied', dailyRate: 150, currentAdmissionId: 'ADM-2026-4401', currentPatientName: 'مريم سالم الترهوني' },
    { id: 'bed-102', number: 'Bed 102', ward: 'Ob/Gyn Inpatient (نساء وتوليد)', roomNumber: '101', roomType: 'standard', status: 'vacant', dailyRate: 150 },
    { id: 'bed-103', number: 'Bed 103', ward: 'High-Risk Pregnancy (حمل حرج)', roomNumber: '102', roomType: 'standard', status: 'occupied', dailyRate: 180, currentAdmissionId: 'ADM-2026-4402', currentPatientName: 'سارة عبد الله القماطي' },
    { id: 'bed-104', number: 'Bed 104', ward: 'High-Risk Pregnancy (حمل حرج)', roomNumber: '102', roomType: 'standard', status: 'cleaning', dailyRate: 180 },
    { id: 'bed-201', number: 'VIP Suite 201', ward: 'Private Maternity Suite (أجنحة خاصة)', roomNumber: '201', roomType: 'vip', status: 'occupied', dailyRate: 350, currentAdmissionId: 'ADM-2026-4403', currentPatientName: 'أسماء المختار الفيتوري' },
    { id: 'bed-202', number: 'VIP Suite 202', ward: 'Private Maternity Suite (أجنحة خاصة)', roomNumber: '202', roomType: 'vip', status: 'reserved', dailyRate: 350 },
    { id: 'bed-301', number: 'Bed 301', ward: 'Post-Op Recovery (عناية وإفاقة)', roomNumber: '301', roomType: 'special_care', status: 'occupied', dailyRate: 250, currentAdmissionId: 'ADM-2026-4404', currentPatientName: 'فاطمة مفتاح الزوي' },
    { id: 'bed-302', number: 'Bed 302', ward: 'Post-Op Recovery (عناية وإفاقة)', roomNumber: '301', roomType: 'special_care', status: 'occupied', dailyRate: 250, currentAdmissionId: 'ADM-2026-4405', currentPatientName: 'خديجة المهدي السنوسي' },
    { id: 'bed-303', number: 'Bed 303', ward: 'Post-Op Recovery (عناية وإفاقة)', roomNumber: '302', roomType: 'special_care', status: 'vacant', dailyRate: 250 },
  ];

  const patients: Patient[] = [
    {
      mrn: 'MRN-2026-0811',
      fullName: 'مريم سالم الترهوني',
      nationalId: '119940284918',
      dob: '1994-06-14',
      gender: 'female',
      phone: '091-2345678',
      address: 'طرابلس - حي الأندلس',
      emergencyContactName: 'سالم الترهوني (الوالد)',
      emergencyContactRelation: 'أب',
      emergencyContactPhone: '092-3456789',
      bloodGroup: 'O+',
      bloodGroupStatus: 'Verified',
      bloodGroupVerifiedBy: 'فني مختبر عمر البراصي',
      allergies: ['Penicillin (Severe Rash / الحساسية من البنسلين)'],
      chronicConditions: ['No Chronic Illnesses'],
      pastMedicalHistory: 'No chronic diseases, prior appendectomy 2018',
      pastSurgicalHistory: 'Appendectomy 2018',
      drugHistory: 'Prenatal vitamins, Folic Acid, Iron supplements',
      familyHistory: 'No family history of genetic disorders or preeclampsia',
      createdAt: '2026-11-05T08:30:00Z',
    },
    {
      mrn: 'MRN-2026-0812',
      fullName: 'سارة عبد الله القماطي',
      nationalId: '119910543219',
      dob: '1991-03-22',
      gender: 'female',
      phone: '091-8765432',
      address: 'بنغازي - الكيش / طرابلس مؤقتاً',
      emergencyContactName: 'أحمد محمود القماطي (الزوج)',
      emergencyContactRelation: 'زوج',
      emergencyContactPhone: '092-9876543',
      bloodGroup: 'A+',
      bloodGroupStatus: 'Verified',
      bloodGroupVerifiedBy: 'فني مختبر عمر البراصي',
      allergies: ['Sulfa Drugs (طفح جلدي شديد)', 'Aspirin Sensitivity'],
      chronicConditions: ['Gestational Diabetes Mellitus (سكري الحمل)', 'Gestational Hypertension (ارتفاع ضغط الدم الحملي)'],
      pastMedicalHistory: 'GDM diagnosed at 26 weeks, mild hypertension at 32 weeks',
      pastSurgicalHistory: 'None',
      drugHistory: 'Methyldopa 250mg TDS, Insulin Lispro subcutaneous sliding scale',
      familyHistory: 'Mother has Type 2 Diabetes, Sister had preeclampsia',
      createdAt: '2026-11-04T11:15:00Z',
    },
    {
      mrn: 'MRN-2026-0813',
      fullName: 'أسماء المختار الفيتوري',
      nationalId: '119960782345',
      dob: '1996-11-09',
      gender: 'female',
      phone: '091-4567890',
      address: 'مصراتة - طريق البحر / طرابلس',
      emergencyContactName: 'طارق المختار الفيتوري (أخ)',
      emergencyContactRelation: 'أخ',
      emergencyContactPhone: '092-5678901',
      bloodGroup: 'B+',
      bloodGroupStatus: 'Verified',
      bloodGroupVerifiedBy: 'فني مختبر عمر البراصي',
      allergies: ['No Known Drug Allergies (NKDA)'],
      chronicConditions: [],
      pastMedicalHistory: 'Unremarkable, G2P1 with prior uncomplicated vaginal delivery',
      pastSurgicalHistory: 'None',
      drugHistory: 'Routine multivitamins',
      familyHistory: 'Negative',
      createdAt: '2026-11-06T14:20:00Z',
    },
    {
      mrn: 'MRN-2026-0814',
      fullName: 'فاطمة مفتاح الزوي',
      nationalId: '119880123987',
      dob: '1988-08-30',
      gender: 'female',
      phone: '091-3344556',
      address: 'طرابلس - زاوية الدهماني',
      emergencyContactName: 'مفتاح الزوي',
      emergencyContactRelation: 'أب',
      emergencyContactPhone: '092-2233445',
      bloodGroup: 'AB+',
      bloodGroupStatus: 'Pending Verification',
      allergies: ['Iodine Contrast Medium (حساسية صبغة اليود)'],
      chronicConditions: ['Pelvic Endometriosis'],
      pastMedicalHistory: 'Chronic pelvic pain, recurrent benign ovarian cysts',
      pastSurgicalHistory: 'Diagnostic Laparoscopy 2021',
      drugHistory: 'NSAIDs PRN',
      familyHistory: 'Endometriosis in maternal aunt',
      createdAt: '2026-11-06T16:00:00Z',
    },
    {
      mrn: 'MRN-2026-0815',
      fullName: 'خديجة المهدي السنوسي',
      nationalId: '119930987654',
      dob: '1993-01-18',
      gender: 'female',
      phone: '091-7788990',
      address: 'الزاوية - الطريق الساحلي',
      emergencyContactName: 'هشام السنوسي',
      emergencyContactRelation: 'زوج',
      emergencyContactPhone: '092-6677889',
      bloodGroup: 'O-',
      bloodGroupStatus: 'Verified',
      bloodGroupVerifiedBy: 'فني مختبر عمر البراصي',
      allergies: ['Latex Allergy (حساسية من اللاتكس المطاطي)'],
      chronicConditions: ['Chronic Iron Deficiency Anemia'],
      pastMedicalHistory: 'Secondary postpartum hemorrhage in 2022',
      pastSurgicalHistory: 'Lower segment Cesarean section in 2022',
      drugHistory: 'Oral Iron, Folate',
      familyHistory: 'Thalassemia minor in family',
      createdAt: '2026-11-07T02:15:00Z',
    },
  ];

  const admissions: Admission[] = [
    {
      admissionId: 'ADM-2026-4401',
      mrn: 'MRN-2026-0811',
      patientName: 'مريم سالم الترهوني',
      admissionDate: '2026-11-05T09:00:00Z',
      receptionTime: '2026-11-05T09:10:00Z',
      wardArrivalTime: '2026-11-05T09:35:00Z',
      source: 'emergency',
      attendingConsultantId: 'usr-1',
      attendingConsultantName: 'د. طارق بن عامر',
      admittingDoctorId: 'usr-2',
      admittingDoctorName: 'د. هدى المنصوري',
      department: 'Obstetrics & Gynecology (أمراض النساء والولادة)',
      bedId: 'bed-101',
      roomNumber: '101',
      roomType: 'standard',
      payerType: 'corporate_insurance',
      corporateName: 'شركة المدار الجديد للاتصالات (Al-Madar)',
      corporateContractNo: 'MD-2026-INS-981',
      packageId: 'PKG-CS-02',
      packageName: 'باقة العملية القيصرية (C-Section Package)',
      status: 'active',
      bedTransfers: [
        {
          id: 'tr-1',
          admissionId: 'ADM-2026-4401',
          fromBedId: 'bed-301',
          fromRoom: '301 (Post-Op OT)',
          toBedId: 'bed-101',
          toRoom: '101 (Inpatient)',
          timestamp: '2026-11-05T18:00:00Z',
          reason: 'Transferred from recovery room to post-natal ward',
          financialImpactNote: 'Room rate changed from Special Care (250 LYD) to Standard Inpatient (150 LYD) covered under package',
          transferredBy: 'مشرفة التمريض خولة الطاهر'
        }
      ],
    },
    {
      admissionId: 'ADM-2026-4402',
      mrn: 'MRN-2026-0812',
      patientName: 'سارة عبد الله القماطي',
      admissionDate: '2026-11-04T12:00:00Z',
      receptionTime: '2026-11-04T12:15:00Z',
      wardArrivalTime: '2026-11-04T12:45:00Z',
      source: 'referral',
      referralDetails: 'تحويل من مستشفى الجلاء للنساء والولادة - حالة حمل حرج وتسمم حمل أولي',
      attendingConsultantId: 'usr-1',
      attendingConsultantName: 'د. طارق بن عامر',
      admittingDoctorId: 'usr-2',
      admittingDoctorName: 'د. هدى المنصوري',
      department: 'Obstetrics & Gynecology (أمراض النساء والولادة)',
      bedId: 'bed-103',
      roomNumber: '102',
      roomType: 'standard',
      payerType: 'self',
      status: 'active',
      bedTransfers: [],
    },
    {
      admissionId: 'ADM-2026-4403',
      mrn: 'MRN-2026-0813',
      patientName: 'أسماء المختار الفيتوري',
      admissionDate: '2026-11-06T15:00:00Z',
      receptionTime: '2026-11-06T15:10:00Z',
      wardArrivalTime: '2026-11-06T15:30:00Z',
      source: 'outpatient',
      attendingConsultantId: 'usr-2',
      attendingConsultantName: 'د. هدى المنصوري',
      admittingDoctorId: 'usr-2',
      admittingDoctorName: 'د. هدى المنصوري',
      department: 'Obstetrics & Gynecology (أمراض النساء والولادة)',
      bedId: 'bed-201',
      roomNumber: '201',
      roomType: 'vip',
      payerType: 'corporate_insurance',
      corporateName: 'شركة البريقة لتسويق النفط (Brega Petroleum)',
      corporateContractNo: 'BRG-HEALTH-441',
      packageId: 'PKG-NVD-01',
      packageName: 'باقة الولادة الطبيعية (Normal Vaginal Delivery Package)',
      status: 'active',
      bedTransfers: [],
    },
    {
      admissionId: 'ADM-2026-4404',
      mrn: 'MRN-2026-0814',
      patientName: 'فاطمة مفتاح الزوي',
      admissionDate: '2026-11-06T17:00:00Z',
      receptionTime: '2026-11-06T17:15:00Z',
      wardArrivalTime: '2026-11-06T17:40:00Z',
      source: 'outpatient',
      attendingConsultantId: 'usr-3',
      attendingConsultantName: 'د. عادل الفيتوري',
      admittingDoctorId: 'usr-3',
      admittingDoctorName: 'د. عادل الفيتوري',
      department: 'General Surgery & Gynecological Laparoscopy (الجراحة والنساء)',
      bedId: 'bed-301',
      roomNumber: '301',
      roomType: 'special_care',
      payerType: 'self',
      packageId: 'PKG-LAP-03',
      packageName: 'باقة الجراحة المنظارية (Laparoscopic Surgery Package)',
      status: 'active',
      bedTransfers: [],
    },
    {
      admissionId: 'ADM-2026-4405',
      mrn: 'MRN-2026-0815',
      patientName: 'خديجة المهدي السنوسي',
      admissionDate: '2026-11-07T03:00:00Z',
      receptionTime: '2026-11-07T03:05:00Z',
      wardArrivalTime: '2026-11-07T03:20:00Z',
      source: 'emergency',
      referralDetails: 'إسعاف طارئ فوري - نزيف حاد وانخفاض حاد في خضاب الدم (Hb 8.6 g/dL)',
      attendingConsultantId: 'usr-1',
      attendingConsultantName: 'د. طارق بن عامر',
      admittingDoctorId: 'usr-2',
      admittingDoctorName: 'د. هدى المنصوري',
      department: 'Obstetrics & Gynecology (أمراض النساء والولادة)',
      bedId: 'bed-302',
      roomNumber: '301',
      roomType: 'special_care',
      payerType: 'family',
      status: 'active',
      bedTransfers: [],
    },
  ];

  const assessments: Record<string, ClinicalAssessment> = {
    'ADM-2026-4401': {
      id: 'ass-4401',
      admissionId: 'ADM-2026-4401',
      chiefComplaint: 'Labor pains with rupture of membranes (ألم مخاض مع نزول السائل الأمنيوسي)',
      chiefComplaintDuration: '6 hours',
      historyOfPresentIllness: 'Primigravida at 39 weeks presented with regular uterine contractions every 3 minutes lasting 45 seconds, accompanied by clear amniotic fluid leaking since 3:00 AM.',
      systemicExam: {
        cardiovascular: 'S1, S2 audible, no murmurs, normal peripheral pulses',
        respiratory: 'Chest clear bilaterally, vesicular breath sounds',
        abdominal: 'Gravid uterus, fundal height corresponding to 39 weeks, longitudinal lie, cephalic presentation',
        general: 'Alert, oriented, in moderate labor distress'
      },
      obGyn: {
        gravida: 1,
        para: 0,
        abortions: 0,
        living: 0,
        lmp: '2026-02-05',
        edd: '2026-11-12',
        gestationalAgeWeeks: 39,
        gestationalAgeDays: 2,
        obstetricHistory: 'Primigravida, uncomplicated antenatal visits, all anomaly scans normal.',
        currentPregnancyDetails: {
          fetalHeartRateBpm: 142,
          presentation: 'Cephalic',
          amnioticFluid: 'Intact',
          uterineContractions: '3 contractions per 10 minutes, lasting 45-50 seconds',
          cervicalDilationCm: 6,
          effacementPercent: 80
        },
        otherGynecologicalHistory: 'No history of PID or prior pelvic surgeries'
      },
      vitals: [
        {
          id: 'vit-1',
          admissionId: 'ADM-2026-4401',
          timestamp: '2026-11-07T08:00:00Z',
          bpSystolic: 118,
          bpDiastolic: 76,
          pulse: 82,
          respRate: 18,
          temp: 36.8,
          spO2: 99,
          consciousness: 'Alert',
          painScale: 4,
          weightKg: 68,
          heightCm: 164,
          recordedBy: 'ممرضة فاطمة الورفلي'
        },
        {
          id: 'vit-0',
          admissionId: 'ADM-2026-4401',
          timestamp: '2026-11-05T09:40:00Z',
          bpSystolic: 124,
          bpDiastolic: 80,
          pulse: 88,
          respRate: 20,
          temp: 37.0,
          spO2: 98,
          consciousness: 'Alert',
          painScale: 8,
          weightKg: 69,
          heightCm: 164,
          recordedBy: 'ممرضة فاطمة الورفلي'
        }
      ],
      updatedAt: '2026-11-07T08:15:00Z',
      assessedBy: 'د. هدى المنصوري',
      pediatricGrowthRecords: [
        {
          id: 'pgr-1',
          admissionId: 'ADM-2026-4401',
          timestamp: '2026-11-05T12:00:00Z',
          ageDays: 0,
          ageLabel: 'عند الولادة (اليوم 0)',
          gender: 'female',
          weightKg: 3.35,
          lengthCm: 49.5,
          headCircumferenceCm: 34.0,
          feedingType: 'exclusive_breastfeeding',
          recordedBy: 'د. مريم الدريسي (استشاري حديثي ولادة)',
          notes: 'ولادة قيصرية سليمة، بكاء فوري قوي، علامات أبغار 8/10 و 9/10، تم البدء بالرضاعة الطبيعية المبكرة.',
          percentiles: { weightPercentile: 52, lengthPercentile: 54, headPercentile: 56 }
        },
        {
          id: 'pgr-2',
          admissionId: 'ADM-2026-4401',
          timestamp: '2026-11-06T10:00:00Z',
          ageDays: 1,
          ageLabel: 'اليوم الأول (24 ساعة)',
          gender: 'female',
          weightKg: 3.22,
          lengthCm: 49.5,
          headCircumferenceCm: 34.0,
          feedingType: 'exclusive_breastfeeding',
          recordedBy: 'ممرضة خولة المجبري',
          notes: 'نزول وزن فسيولوجي طبيعي (-3.9%). خروج العقي (Meconium) طبيعي، لا يوجد يرقان.',
          percentiles: { weightPercentile: 45, lengthPercentile: 54, headPercentile: 56 }
        },
        {
          id: 'pgr-3',
          admissionId: 'ADM-2026-4401',
          timestamp: '2026-11-07T09:30:00Z',
          ageDays: 2,
          ageLabel: 'اليوم الثاني (48 ساعة)',
          gender: 'female',
          weightKg: 3.15,
          lengthCm: 49.7,
          headCircumferenceCm: 34.1,
          feedingType: 'exclusive_breastfeeding',
          recordedBy: 'ممرضة خولة المجبري',
          notes: 'بلوغ نقطة الانخفاض الفسيولوجي الأقصى (Nadir: -6.0%، ضمن المدى الآمن أقل من 10%). رضاعة طبيعية منتظمة كل 2-3 ساعات.',
          percentiles: { weightPercentile: 42, lengthPercentile: 55, headPercentile: 58 }
        },
        {
          id: 'pgr-4',
          admissionId: 'ADM-2026-4401',
          timestamp: '2026-11-08T09:00:00Z',
          ageDays: 3,
          ageLabel: 'اليوم الثالث (72 ساعة)',
          gender: 'female',
          weightKg: 3.21,
          lengthCm: 49.8,
          headCircumferenceCm: 34.2,
          feedingType: 'exclusive_breastfeeding',
          recordedBy: 'د. مريم الدريسي (استشاري حديثي ولادة)',
          notes: 'بدء مرحلة استعادة الوزن الفسيولوجية (+60 جم خلال 24 ساعة). حركات أمعاء صفراء انتقالية، لا جفاف.',
          percentiles: { weightPercentile: 46, lengthPercentile: 56, headPercentile: 59 }
        },
        {
          id: 'pgr-5',
          admissionId: 'ADM-2026-4401',
          timestamp: '2026-11-10T10:00:00Z',
          ageDays: 5,
          ageLabel: 'اليوم الخامس',
          gender: 'female',
          weightKg: 3.32,
          lengthCm: 50.0,
          headCircumferenceCm: 34.4,
          feedingType: 'exclusive_breastfeeding',
          recordedBy: 'ممرضة مروة بن قمرة',
          notes: 'استمرار زيادة الوزن بوتيرة ممتازة تقارب وزن الولادة الأصلي.',
          percentiles: { weightPercentile: 50, lengthPercentile: 58, headPercentile: 60 }
        },
        {
          id: 'pgr-6',
          admissionId: 'ADM-2026-4401',
          timestamp: '2026-11-12T11:00:00Z',
          ageDays: 7,
          ageLabel: 'الأسبوع الأول (اليوم 7)',
          gender: 'female',
          weightKg: 3.44,
          lengthCm: 50.3,
          headCircumferenceCm: 34.6,
          feedingType: 'exclusive_breastfeeding',
          recordedBy: 'د. مريم الدريسي (استشاري حديثي ولادة)',
          notes: 'تجاوز وزن الولادة بالكامل بنجاح في اليوم السابع. سرعة النمو 30-35 جم/يوم. النمو متناسق وضمن الشريحة الخمسينية.',
          percentiles: { weightPercentile: 54, lengthPercentile: 60, headPercentile: 62 }
        },
        {
          id: 'pgr-7',
          admissionId: 'ADM-2026-4401',
          timestamp: '2026-11-19T10:30:00Z',
          ageDays: 14,
          ageLabel: 'الأسبوع الثاني (اليوم 14)',
          gender: 'female',
          weightKg: 3.72,
          lengthCm: 51.2,
          headCircumferenceCm: 35.2,
          feedingType: 'exclusive_breastfeeding',
          recordedBy: 'د. مريم الدريسي (استشاري حديثي ولادة)',
          notes: 'متابعة العيادة الخارجية لحديثي الولادة. نمو ممتاز، رضاعة طبيعية حصرية، اليافوخ الأمامي مستوٍ ولين، استجابات حسية ممتازة.',
          percentiles: { weightPercentile: 56, lengthPercentile: 62, headPercentile: 63 }
        }
      ]
    },
    'ADM-2026-4405': {
      id: 'ass-4405',
      admissionId: 'ADM-2026-4405',
      chiefComplaint: 'Severe vaginal bleeding and dizziness (نزيف مهبلي شديد مع هبوط ودوار)',
      chiefComplaintDuration: '3 hours',
      historyOfPresentIllness: 'G3P2 at 34 weeks presented with sudden painless brisk vaginal bleeding soaking 4 sanitary pads in 2 hours, associated with postural dizziness.',
      systemicExam: {
        cardiovascular: 'Tachycardia, pulse 112 bpm, weak peripheral volume, S1 S2 normal',
        respiratory: 'Tachypneic, RR 24/min, chest clear',
        abdominal: 'Soft, non-tender, fundal height 33 cm, relaxed uterus without hypertonus',
        general: 'Marked pallor, cold extremities, conscious and anxious'
      },
      obGyn: {
        gravida: 3,
        para: 2,
        abortions: 0,
        living: 2,
        lmp: '2026-03-12',
        edd: '2026-12-17',
        gestationalAgeWeeks: 34,
        gestationalAgeDays: 1,
        obstetricHistory: 'Previous 1 lower segment Cesarean section in 2022 due to breech, 1 normal delivery 2020.',
        currentPregnancyDetails: {
          fetalHeartRateBpm: 154,
          presentation: 'Cephalic',
          amnioticFluid: 'Intact',
          uterineContractions: 'No active labor contractions',
          cervicalDilationCm: 0,
          effacementPercent: 0
        },
        otherGynecologicalHistory: 'Ultrasound at 28 weeks suggested low lying placenta'
      },
      vitals: [
        {
          id: 'vit-501',
          admissionId: 'ADM-2026-4405',
          timestamp: '2026-11-07T07:30:00Z',
          bpSystolic: 105,
          bpDiastolic: 65,
          pulse: 98,
          respRate: 20,
          temp: 36.9,
          spO2: 97,
          consciousness: 'Alert',
          painScale: 3,
          weightKg: 62,
          heightCm: 160,
          recordedBy: 'ممرضة فاطمة الورفلي'
        },
        {
          id: 'vit-500',
          admissionId: 'ADM-2026-4405',
          timestamp: '2026-11-07T03:15:00Z',
          bpSystolic: 90,
          bpDiastolic: 55,
          pulse: 114,
          respRate: 24,
          temp: 36.5,
          spO2: 95,
          consciousness: 'Alert',
          painScale: 5,
          weightKg: 62,
          heightCm: 160,
          recordedBy: 'مشرفة التمريض خولة الطاهر'
        }
      ],
      updatedAt: '2026-11-07T07:45:00Z',
      assessedBy: 'د. طارق بن عامر'
    }
  };

  const plans: Record<string, ManagementPlan[]> = {
    'ADM-2026-4401': [
      {
        id: 'plan-1',
        admissionId: 'ADM-2026-4401',
        planType: 'urgent_surgery',
        procedureNature: 'Lower Segment Cesarean Section (LSCS) for failure to progress and fetal distress',
        urgencyLevel: 'Urgent',
        notes: 'Emergency Cesarean Section indicated due to persistent fetal bradycardia during late first stage of labor. Patient consented. Anesthesia informed.',
        physicianId: 'usr-1',
        physicianName: 'د. طارق بن عامر',
        createdAt: '2026-11-05T12:00:00Z',
        version: 1
      },
      {
        id: 'plan-2',
        admissionId: 'ADM-2026-4401',
        planType: 'medical',
        procedureNature: 'Post-operative maternity care, wound dressing, analgesia, and neonatal bonding',
        urgencyLevel: 'Elective',
        notes: 'Patient stable Day 1 post-op. Baby rooming-in, breastfeeding initiated. Continue IV antibiotics and analgesia. Mobilization encouraged.',
        physicianId: 'usr-1',
        physicianName: 'د. طارق بن عامر',
        createdAt: '2026-11-06T09:00:00Z',
        version: 2
      }
    ],
    'ADM-2026-4405': [
      {
        id: 'plan-501',
        admissionId: 'ADM-2026-4405',
        planType: 'urgent_surgery',
        procedureNature: 'Immediate resuscitation, Cross-match 2 units packed RBCs, urgent pelvic ultrasound to rule out placenta previa, prepare for emergency delivery if bleeding persists',
        urgencyLevel: 'Emergency',
        notes: 'Stat Blood group confirmation (O Negative), urgent CBC every 6 hours, 2 wide-bore IV cannulae inserted, Ringer Lactate started. Anesthesiologist on standby.',
        physicianId: 'usr-1',
        physicianName: 'د. طارق بن عامر',
        createdAt: '2026-11-07T03:30:00Z',
        version: 1
      }
    ]
  };

  const dietaryOrders: DietaryOrder[] = [
    {
      id: 'diet-1',
      admissionId: 'ADM-2026-4401',
      dietType: 'soft',
      specialInstructions: 'Post-Cesarean soft diet: warm soup, boiled vegetables, light yogurt',
      startTime: '2026-11-06T08:00:00Z',
      orderedBy: 'د. طارق بن عامر',
      status: 'active',
      kitchenStatus: 'delivered',
      deliveredMealsCount: 3,
      companionMealsCount: 2
    },
    {
      id: 'diet-2',
      admissionId: 'ADM-2026-4402',
      dietType: 'diabetic',
      specialInstructions: 'Low salt, controlled carbohydrates 1800 kcal/day for GDM and Gestational HTN',
      startTime: '2026-11-04T13:00:00Z',
      orderedBy: 'د. هدى المنصوري',
      status: 'active',
      kitchenStatus: 'delivered',
      deliveredMealsCount: 6,
      companionMealsCount: 3
    },
    {
      id: 'diet-5',
      admissionId: 'ADM-2026-4405',
      dietType: 'npo',
      npoReason: 'Strict NPO - Nil Per Os for possible emergency surgical intervention / exploratory laparotomy',
      startTime: '2026-11-07T03:15:00Z',
      orderedBy: 'د. طارق بن عامر',
      status: 'active',
      kitchenStatus: 'pending',
      deliveredMealsCount: 0,
      companionMealsCount: 1
    }
  ];

  const medications: MedicationOrder[] = [
    {
      id: 'med-101',
      admissionId: 'ADM-2026-4401',
      tradeName: 'Klaforan',
      genericName: 'Cefotaxime',
      dosageForm: 'Vial (حقن)',
      strength: '1g',
      dose: '1g',
      route: 'IV',
      frequency: 'TID (كل 8 ساعات)',
      exactTimes: ['08:00', '16:00', '24:00'],
      durationDays: 3,
      startDate: '2026-11-05',
      endDate: '2026-11-08',
      instructions: 'Give via slow IV injection over 5 minutes after skin test verification',
      status: 'active',
      prescribedBy: 'د. طارق بن عامر',
      createdAt: '2026-11-05T13:00:00Z'
    },
    {
      id: 'med-102',
      admissionId: 'ADM-2026-4401',
      tradeName: 'Perfalgan',
      genericName: 'Paracetamol',
      dosageForm: 'Infusion Bottle',
      strength: '1000mg / 100ml',
      dose: '1000mg',
      route: 'IV',
      frequency: 'Q8H (كل 8 ساعات عند اللزوم)',
      exactTimes: ['06:00', '14:00', '22:00'],
      durationDays: 3,
      startDate: '2026-11-05',
      endDate: '2026-11-08',
      instructions: 'Infuse over 15 minutes for post-op analgesia',
      status: 'active',
      prescribedBy: 'د. طارق بن عامر',
      createdAt: '2026-11-05T13:00:00Z'
    },
    {
      id: 'med-103',
      admissionId: 'ADM-2026-4401',
      tradeName: 'Syntocinon',
      genericName: 'Oxytocin',
      dosageForm: 'Ampoule',
      strength: '10 IU / 1ml',
      dose: '20 IU',
      route: 'IV',
      frequency: 'Stat then continuous drip',
      exactTimes: ['14:00'],
      durationDays: 1,
      startDate: '2026-11-05',
      endDate: '2026-11-05',
      instructions: 'In 500ml Ringer Lactate at 125 ml/hr to prevent post-partum hemorrhage',
      status: 'discontinued',
      discontinueReason: 'Course completed satisfactorily, uterus well contracted',
      discontinuedBy: 'د. طارق بن عامر',
      discontinuedAt: '2026-11-06T02:00:00Z',
      prescribedBy: 'د. طارق بن عامر',
      createdAt: '2026-11-05T14:00:00Z'
    },
    {
      id: 'med-501',
      admissionId: 'ADM-2026-4405',
      tradeName: 'Cyklokapron',
      genericName: 'Tranexamic Acid',
      dosageForm: 'Ampoule',
      strength: '500mg / 5ml',
      dose: '1000mg',
      route: 'IV',
      frequency: 'Stat (فوري) then TID',
      exactTimes: ['03:30', '11:30', '19:30'],
      durationDays: 2,
      startDate: '2026-11-07',
      endDate: '2026-11-09',
      instructions: 'Slow IV injection over 10 minutes to control bleeding',
      status: 'active',
      prescribedBy: 'د. طارق بن عامر',
      createdAt: '2026-11-07T03:30:00Z'
    }
  ];

  const emarRecords: EMARRecord[] = [
    // --- Day 1 of Stay (2026-11-05) ---
    {
      id: 'emar-101',
      orderId: 'med-101',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Cefotaxime 1g IV',
      dose: '1g',
      route: 'IV',
      scheduledTime: '2026-11-05T16:00:00Z',
      scheduledHour: '16:00',
      actualGivenTime: '2026-11-05T16:05:00Z',
      administeredBy: 'ممرضة فاطمة الورفلي',
      status: 'given',
      notes: 'Initial admission dose given post skin-test confirmation'
    },
    {
      id: 'emar-102',
      orderId: 'med-102',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Paracetamol 1000mg IV',
      dose: '1000mg',
      route: 'IV',
      scheduledTime: '2026-11-05T18:00:00Z',
      scheduledHour: '18:00',
      actualGivenTime: '2026-11-05T18:00:00Z',
      administeredBy: 'ممرضة فاطمة الورفلي',
      status: 'given',
      notes: 'Analgesic infusion completed over 15 minutes'
    },
    {
      id: 'emar-103',
      orderId: 'med-101',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Cefotaxime 1g IV',
      dose: '1g',
      route: 'IV',
      scheduledTime: '2026-11-05T24:00:00Z',
      scheduledHour: '24:00',
      actualGivenTime: '2026-11-06T00:10:00Z',
      administeredBy: 'ممرضة سارة القماطي',
      status: 'given',
      notes: 'Night dose administered on time'
    },

    // --- Day 2 of Stay (2026-11-06) ---
    {
      id: 'emar-201',
      orderId: 'med-102',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Paracetamol 1000mg IV',
      dose: '1000mg',
      route: 'IV',
      scheduledTime: '2026-11-06T06:00:00Z',
      scheduledHour: '06:00',
      actualGivenTime: '2026-11-06T06:15:00Z',
      administeredBy: 'ممرضة سارة القماطي',
      status: 'given',
      notes: 'Early morning analgesia given on time'
    },
    {
      id: 'emar-202',
      orderId: 'med-101',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Cefotaxime 1g IV',
      dose: '1g',
      route: 'IV',
      scheduledTime: '2026-11-06T08:00:00Z',
      scheduledHour: '08:00',
      actualGivenTime: '2026-11-06T08:05:00Z',
      administeredBy: 'ممرضة فاطمة الورفلي',
      status: 'given',
      notes: 'Morning antibiotic administered smoothly'
    },
    {
      id: 'emar-203',
      orderId: 'med-102',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Paracetamol 1000mg IV',
      dose: '1000mg',
      route: 'IV',
      scheduledTime: '2026-11-06T14:00:00Z',
      scheduledHour: '14:00',
      actualGivenTime: '2026-11-06T15:35:00Z',
      administeredBy: 'ممرضة فاطمة الورفلي',
      status: 'delayed',
      delayReason: 'Patient was in ultrasound room for Doppler scan (المريضة كانت في قسم الموجات الصوتية)',
      supervisorApproval: {
        approvedBy: 'مشرفة التمريض خولة الطاهر',
        approvedAt: '2026-11-06T15:40:00Z',
        note: 'Delay of 95 min validated due to scheduled diagnostic ultrasound scan'
      },
      notes: 'Administered immediately upon patient return to ward'
    },
    {
      id: 'emar-204',
      orderId: 'med-101',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Cefotaxime 1g IV',
      dose: '1g',
      route: 'IV',
      scheduledTime: '2026-11-06T16:00:00Z',
      scheduledHour: '16:00',
      actualGivenTime: '2026-11-06T16:10:00Z',
      administeredBy: 'ممرضة فاطمة الورفلي',
      status: 'given',
      notes: 'Afternoon antibiotic given without complications'
    },
    {
      id: 'emar-205',
      orderId: 'med-102',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Paracetamol 1000mg IV',
      dose: '1000mg',
      route: 'IV',
      scheduledTime: '2026-11-06T22:00:00Z',
      scheduledHour: '22:00',
      status: 'held',
      delayReason: 'Withheld per consultant Dr. Tarek as pain scale 0/10 with normal body temp (عُلقت لعدم وجود ألم)',
      supervisorApproval: {
        approvedBy: 'مشرفة التمريض خولة الطاهر',
        approvedAt: '2026-11-06T22:15:00Z',
        note: 'PRN withholding verified with attending'
      },
      notes: 'Dose withheld as patient had no pain and requested no analgesia'
    },
    {
      id: 'emar-206',
      orderId: 'med-101',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Cefotaxime 1g IV',
      dose: '1g',
      route: 'IV',
      scheduledTime: '2026-11-06T24:00:00Z',
      scheduledHour: '24:00',
      actualGivenTime: '2026-11-07T01:25:00Z',
      administeredBy: 'ممرضة سارة القماطي',
      status: 'delayed',
      delayReason: 'IV cannula infiltration; required new IV placement in right forearm (تبديل كانيولا مسدودة)',
      supervisorApproval: {
        approvedBy: 'مشرفة التمريض خولة الطاهر',
        approvedAt: '2026-11-07T01:30:00Z',
        note: 'Delay validated for peripheral IV re-siting'
      },
      notes: 'New 20G IV placed successfully and drug administered'
    },

    // --- Day 3 of Stay (2026-11-07 - Today) ---
    {
      id: 'emar-1',
      orderId: 'med-101',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Cefotaxime 1g IV',
      dose: '1g',
      route: 'IV',
      scheduledTime: '2026-11-07T08:00:00Z',
      scheduledHour: '08:00',
      actualGivenTime: '2026-11-07T08:10:00Z',
      administeredBy: 'ممرضة فاطمة الورفلي',
      status: 'given',
      notes: 'Given on time, patient tolerated well'
    },
    {
      id: 'emar-3',
      orderId: 'med-102',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Paracetamol 1000mg IV',
      dose: '1000mg',
      route: 'IV',
      scheduledTime: '2026-11-07T06:00:00Z',
      scheduledHour: '06:00',
      actualGivenTime: '2026-11-07T07:45:00Z',
      administeredBy: 'ممرضة فاطمة الورفلي',
      status: 'delayed',
      delayReason: 'Patient was resting asleep and pain was rated 0/10; administered when awakening with pain scale 4',
      supervisorApproval: {
        approvedBy: 'مشرفة التمريض خولة الطاهر',
        approvedAt: '2026-11-07T07:50:00Z',
        note: 'Delay of 1h45m validated for clinical rest and reassessment'
      },
      notes: 'Pain reduced to 1/10 post infusion'
    },
    {
      id: 'emar-4',
      orderId: 'med-102',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Paracetamol 1000mg IV',
      dose: '1000mg',
      route: 'IV',
      scheduledTime: '2026-11-07T14:00:00Z',
      scheduledHour: '14:00',
      status: 'scheduled',
      notes: 'Dose overdue - was scheduled for 14:00 and not yet recorded'
    },
    {
      id: 'emar-2',
      orderId: 'med-101',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Cefotaxime 1g IV',
      dose: '1g',
      route: 'IV',
      scheduledTime: '2026-11-07T16:00:00Z',
      scheduledHour: '16:00',
      status: 'scheduled'
    },
    {
      id: 'emar-5',
      orderId: 'med-102',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Paracetamol 1000mg IV',
      dose: '1000mg',
      route: 'IV',
      scheduledTime: '2026-11-07T22:00:00Z',
      scheduledHour: '22:00',
      status: 'scheduled'
    },
    {
      id: 'emar-6',
      orderId: 'med-101',
      admissionId: 'ADM-2026-4401',
      medicationName: 'Cefotaxime 1g IV',
      dose: '1g',
      route: 'IV',
      scheduledTime: '2026-11-07T24:00:00Z',
      scheduledHour: '24:00',
      status: 'scheduled'
    },

    {
      id: 'emar-501',
      orderId: 'med-501',
      admissionId: 'ADM-2026-4405',
      medicationName: 'Tranexamic Acid 1000mg IV',
      dose: '1000mg',
      route: 'IV',
      scheduledTime: '2026-11-07T03:30:00Z',
      scheduledHour: '03:30',
      actualGivenTime: '2026-11-07T03:32:00Z',
      administeredBy: 'مشرفة التمريض خولة الطاهر',
      status: 'given',
      notes: 'Emergency stat dose administered without delay'
    },
    {
      id: 'emar-502',
      orderId: 'med-501',
      admissionId: 'ADM-2026-4405',
      medicationName: 'Tranexamic Acid 1000mg IV',
      dose: '1000mg',
      route: 'IV',
      scheduledTime: '2026-11-07T11:30:00Z',
      scheduledHour: '11:30',
      status: 'scheduled'
    }
  ];

  const labOrders: LabOrder[] = [
    {
      id: 'lab-101',
      admissionId: 'ADM-2026-4401',
      patientName: 'مريم سالم الترهوني',
      testName: 'Complete Blood Count (CBC / صورة الدم الكاملة)',
      category: 'Hematology',
      urgency: 'Routine',
      orderedBy: 'د. طارق بن عامر',
      orderTime: '2026-11-06T07:00:00Z',
      sampleCollectedAt: '2026-11-06T07:30:00Z',
      sampleCollectedBy: 'ممرضة فاطمة الورفلي',
      labReceivedAt: '2026-11-06T07:50:00Z',
      labReceivedBy: 'فني مختبر عمر البراصي',
      status: 'approved',
      approvedBy: 'د. مريم الدريسي (استشاري مختبرات)',
      approvedAt: '2026-11-06T09:10:00Z',
      results: [
        { name: 'Hemoglobin (خضاب الدم)', key: 'Hb', value: 11.4, unit: 'g/dL', refRange: '12.0 - 15.5', isAbnormal: true },
        { name: 'White Blood Cells (كريات الدم البيضاء)', key: 'WBC', value: 10.8, unit: 'x10^9/L', refRange: '4.0 - 11.0', isAbnormal: false },
        { name: 'Platelets (الصفائح الدموية)', key: 'PLT', value: 245, unit: 'x10^9/L', refRange: '150 - 450', isAbnormal: false },
        { name: 'Hematocrit (الدم المكدس)', key: 'HCT', value: 34.2, unit: '%', refRange: '36.0 - 46.0', isAbnormal: true }
      ]
    },
    {
      id: 'lab-102',
      admissionId: 'ADM-2026-4401',
      patientName: 'مريم سالم الترهوني',
      testName: 'Day 2 Post-Op CBC & Coagulation Profile (متابعة خضاب الدم والتخثر الصباحي)',
      category: 'Hematology',
      urgency: 'Routine',
      orderedBy: 'د. طارق بن عامر',
      orderTime: '2026-11-07T06:30:00Z',
      sampleCollectedAt: '2026-11-07T07:00:00Z',
      sampleCollectedBy: 'ممرضة فاطمة الورفلي',
      labReceivedAt: '2026-11-07T07:15:00Z',
      labReceivedBy: 'فني مختبر عمر البراصي',
      status: 'approved',
      approvedBy: 'د. مريم الدريسي (استشاري مختبرات)',
      approvedAt: '2026-11-07T08:15:00Z',
      results: [
        { name: 'Hemoglobin (خضاب الدم)', key: 'Hb', value: 10.9, unit: 'g/dL', refRange: '12.0 - 15.5', isAbnormal: true },
        { name: 'White Blood Cells (كريات الدم البيضاء)', key: 'WBC', value: 11.2, unit: 'x10^9/L', refRange: '4.0 - 11.0', isAbnormal: true },
        { name: 'Platelets (الصفائح الدموية)', key: 'PLT', value: 250, unit: 'x10^9/L', refRange: '150 - 450', isAbnormal: false },
        { name: 'Prothrombin Time (PT)', key: 'PT', value: 12.4, unit: 'sec', refRange: '11.0 - 13.5', isAbnormal: false },
        { name: 'INR', key: 'INR', value: 1.05, unit: '', refRange: '0.8 - 1.2', isAbnormal: false }
      ]
    },
    {
      id: 'lab-501',
      admissionId: 'ADM-2026-4405',
      patientName: 'خديجة المهدي السنوسي',
      testName: 'Complete Blood Count (CBC Longitudinal - خضاب الدم المتتابع)',
      category: 'Hematology',
      urgency: 'Stat',
      orderedBy: 'د. طارق بن عامر',
      orderTime: '2026-11-07T03:10:00Z',
      sampleCollectedAt: '2026-11-07T03:20:00Z',
      sampleCollectedBy: 'مشرفة التمريض خولة الطاهر',
      labReceivedAt: '2026-11-07T03:25:00Z',
      labReceivedBy: 'فني مختبر عمر البراصي',
      status: 'approved',
      approvedBy: 'د. مريم الدريسي',
      approvedAt: '2026-11-07T04:00:00Z',
      criticalAlertAcknowledged: true,
      criticalAlertAcknowledgedBy: 'د. طارق بن عامر',
      results: [
        { name: 'Hemoglobin (خضاب الدم)', key: 'Hb', value: 8.6, unit: 'g/dL', refRange: '12.0 - 15.5', isAbnormal: true, isCritical: true },
        { name: 'White Blood Cells', key: 'WBC', value: 13.5, unit: 'x10^9/L', refRange: '4.0 - 11.0', isAbnormal: true },
        { name: 'Platelets', key: 'PLT', value: 165, unit: 'x10^9/L', refRange: '150 - 450', isAbnormal: false },
        { name: 'Serum Creatinine', key: 'Cr', value: 0.9, unit: 'mg/dL', refRange: '0.5 - 1.1', isAbnormal: false },
        { name: 'C-Reactive Protein (CRP)', key: 'CRP', value: 24.5, unit: 'mg/L', refRange: '< 5.0', isAbnormal: true }
      ]
    },
    {
      id: 'lab-502',
      admissionId: 'ADM-2026-4405',
      patientName: 'خديجة المهدي السنوسي',
      testName: 'Follow-up CBC Post-Transfusion (إعادة CBC بعد نقل الدم)',
      category: 'Hematology',
      urgency: 'Urgent',
      orderedBy: 'د. طارق بن عامر',
      orderTime: '2026-11-07T07:00:00Z',
      sampleCollectedAt: '2026-11-07T07:15:00Z',
      sampleCollectedBy: 'ممرضة فاطمة الورفلي',
      labReceivedAt: '2026-11-07T07:30:00Z',
      labReceivedBy: 'فني مختبر عمر البراصي',
      status: 'approved',
      approvedBy: 'د. مريم الدريسي',
      approvedAt: '2026-11-07T08:30:00Z',
      results: [
        { name: 'Hemoglobin (خضاب الدم)', key: 'Hb', value: 10.1, unit: 'g/dL', refRange: '12.0 - 15.5', isAbnormal: true },
        { name: 'Hematocrit', key: 'HCT', value: 31.0, unit: '%', refRange: '36.0 - 46.0', isAbnormal: true },
        { name: 'Platelets', key: 'PLT', value: 180, unit: 'x10^9/L', refRange: '150 - 450', isAbnormal: false }
      ]
    }
  ];

  const consultations: Consultation[] = [
    {
      id: 'cons-1',
      admissionId: 'ADM-2026-4401',
      patientName: 'مريم سالم الترهوني',
      specialty: 'Neonatology & Pediatrics (أطفال وحديثي ولادة)',
      requestingPhysician: 'د. طارق بن عامر',
      urgency: 'Routine',
      reason: 'Routine neonatal examination for healthy newborn following Cesarean Section, birth weight 3.25 kg, Apgar 9/10.',
      requestTime: '2026-11-05T15:00:00Z',
      notifiedTime: '2026-11-05T15:10:00Z',
      responseTime: '2026-11-05T15:30:00Z',
      arrivalTime: '2026-11-05T16:00:00Z',
      consultantName: 'د. مريم الدريسي',
      findings: 'Term female infant, active, pink, good cry, normal reflexes. Moro and sucking reflex intact. Head circumference 34.5 cm.',
      recommendations: 'Encourage exclusive breastfeeding, Vitamin K already administered, Hepatitis B vaccine given. Discharge with mother.',
      ordersPlaced: 'Neonatal Bilirubin check at 48 hours if clinically indicated',
      feeAmount: 150,
      status: 'completed'
    },
    {
      id: 'cons-2',
      admissionId: 'ADM-2026-4402',
      patientName: 'سارة عبد الله القماطي',
      specialty: 'Endocrinology & Internal Medicine (باطنة وغدد صماء)',
      requestingPhysician: 'د. هدى المنصوري',
      urgency: 'Urgent',
      reason: 'Fasting blood sugars elevated (145 mg/dL), requires insulin adjustment for gestational diabetes during third trimester.',
      requestTime: '2026-11-06T10:00:00Z',
      notifiedTime: '2026-11-06T10:05:00Z',
      responseTime: '2026-11-06T10:30:00Z',
      arrivalTime: '2026-11-06T11:15:00Z',
      consultantName: 'د. عمر المريمي (استشاري باطنة)',
      findings: 'Mild peripheral edema, blood pressure 135/88 mmHg. HbA1c 6.8%.',
      recommendations: 'Increase morning insulin to 8 units, introduce 4 units pre-dinner. Pre-prandial target < 95 mg/dL, 2h post-prandial < 120 mg/dL.',
      ordersPlaced: 'Daily 4-point blood glucose profile (Fasting, 2h post-breakfast, post-lunch, post-dinner)',
      feeAmount: 150,
      status: 'completed'
    }
  ];

  const operativeReports: OperativeReport[] = [
    {
      id: 'op-4401',
      admissionId: 'ADM-2026-4401',
      procedureCode: 'OB-LSCS-01',
      procedureName: 'Lower Segment Cesarean Section (LSCS / عملية قيصرية سفلية)',
      preOpDiagnosis: 'Primigravida 39+2 weeks with non-reassuring fetal heart status and failure to progress',
      postOpDiagnosis: 'Delivered single live healthy female infant, birth weight 3,250g, Apgar 9 at 1 min, 10 at 5 min',
      leadSurgeon: 'د. طارق بن عامر',
      assistantSurgeons: ['د. هدى المنصوري'],
      scrubNurse: 'ممرضة فاطمة الورفلي',
      circulatingNurse: 'ممرضة خديجة قاسم',
      anesthesiologist: 'د. نادر العبيدي',
      startTime: '2026-11-05T13:30:00Z',
      endTime: '2026-11-05T14:25:00Z',
      surgicalSteps: 'Pfannenstiel incision. Sharp and blunt dissection into peritoneal cavity. Bladder flap mobilized inferiorly. Transverse lower segment uterine incision. Delivery of fetal head by gentle fundal pressure. Placenta delivered completely by controlled cord traction. Uterus closed in two continuous layers with Vicryl 1. Complete hemostasis secured. Rectus sheath closed with PDS. Skin closed with subcuticular Monocryl.',
      findings: 'Clear liquor, no meconium. Normal uterine anatomy. Placenta anterior fundal intact. Estimated blood loss 450 ml.',
      estimatedBloodLossMl: 450,
      specimensSent: 'Placenta sent for routine histopathological review',
      complications: 'None. Uneventful procedure.',
      postOpPlan: 'IV fluids 2L over 24h, IV Cefotaxime 1g TID, Paracetamol 1g Q8H, early mobilization, diet as tolerated after bowel sounds.',
      checklist: {
        signInDone: true,
        timeOutDone: true,
        signOutDone: true,
        spongeCountCorrect: true,
        instrumentCountCorrect: true
      },
      surgeonSignature: 'د. طارق بن عامر (استشاري جراحة النساء والولادة)'
    }
  ];

  const anesthesiaRecords: AnesthesiaRecord[] = [
    {
      id: 'anes-4401',
      admissionId: 'ADM-2026-4401',
      operativeId: 'op-4401',
      anesthesiologist: 'د. نادر العبيدي',
      anesthesiaType: 'Spinal',
      asaScore: 'ASA II',
      preAnesthesiaAssessment: {
        airwayMallampati: 'Class I',
        fastingHours: 8,
        allergiesNoted: 'Penicillin (Severe Rash)',
        preMedications: 'Metoclopramide 10mg IV + Ranitidine 50mg IV'
      },
      administeredDrugs: [
        { drugName: 'Heavy Bupivacaine 0.5%', dose: '10mg (2ml)', route: 'Intrathecal (L3-L4)', time: '13:15', givenBy: 'د. نادر العبيدي' },
        { drugName: 'Fentanyl', dose: '15 mcg', route: 'Intrathecal', time: '13:15', givenBy: 'د. نادر العبيدي' },
        { drugName: 'Ephedrine', dose: '5mg', route: 'IV bolus', time: '13:22', givenBy: 'د. نادر العبيدي' },
        { drugName: 'Ondansetron', dose: '4mg', route: 'IV slow', time: '14:10', givenBy: 'د. نادر العبيدي' }
      ],
      intraopVitals: [
        { time: '13:15', bpSystolic: 122, bpDiastolic: 78, heartRate: 84, spO2: 99, etCO2: 35, fluidsGivenMl: 500 },
        { time: '13:25', bpSystolic: 104, bpDiastolic: 62, heartRate: 80, spO2: 99, etCO2: 36, fluidsGivenMl: 800 },
        { time: '13:40', bpSystolic: 116, bpDiastolic: 72, heartRate: 78, spO2: 100, etCO2: 36, fluidsGivenMl: 1200 },
        { time: '14:00', bpSystolic: 120, bpDiastolic: 75, heartRate: 76, spO2: 99, etCO2: 35, fluidsGivenMl: 1500 },
        { time: '14:20', bpSystolic: 118, bpDiastolic: 74, heartRate: 74, spO2: 100, etCO2: 35, fluidsGivenMl: 1800 }
      ],
      pacu: {
        arrivalTime: '2026-11-05T14:30:00Z',
        dischargeTime: '2026-11-05T16:00:00Z',
        aldreteScore: 10,
        vitalsAtPACU: {
          bp: '120/75',
          hr: 76,
          spO2: 99,
          consciousness: 'Fully awake, sensory block regressing to L1'
        },
        handoverToNurse: 'ممرضة فاطمة الورفلي',
        postOpAnalgesiaPlan: 'Paracetamol IV 1g Q8H, Tramadol 50mg IV for breakthrough pain'
      }
    }
  ];

  const pharmacyItems: PharmacyItem[] = [
    {
      id: 'ph-01',
      tradeName: 'Klaforan',
      scientificName: 'Cefotaxime Sodium',
      form: 'Vial',
      strength: '1g',
      purchasePrice: 10.0,
      sellingPrice: 15.0,
      profitMarginPercent: 33.33,
      markupPercent: 50.0,
      stockLevel: 140,
      minThreshold: 30,
      batchNumber: 'BT-2026-881',
      expiryDate: '2028-05-31',
      isConsumable: true
    },
    {
      id: 'ph-02',
      tradeName: 'Syntocinon',
      scientificName: 'Oxytocin',
      form: 'Ampoule',
      strength: '10 IU',
      purchasePrice: 8.0,
      sellingPrice: 12.0,
      profitMarginPercent: 33.33,
      markupPercent: 50.0,
      stockLevel: 95,
      minThreshold: 20,
      batchNumber: 'BT-2026-442',
      expiryDate: '2027-10-15',
      isConsumable: true
    },
    {
      id: 'ph-03',
      tradeName: 'Cyklokapron',
      scientificName: 'Tranexamic Acid',
      form: 'Ampoule',
      strength: '500mg / 5ml',
      purchasePrice: 12.0,
      sellingPrice: 18.0,
      profitMarginPercent: 33.33,
      markupPercent: 50.0,
      stockLevel: 72,
      minThreshold: 15,
      batchNumber: 'BT-2026-119',
      expiryDate: '2028-01-20',
      isConsumable: true
    },
    {
      id: 'ph-04',
      tradeName: 'Perfalgan',
      scientificName: 'Paracetamol IV Infusion',
      form: 'IV Bottle',
      strength: '1000mg / 100ml',
      purchasePrice: 6.0,
      sellingPrice: 10.0,
      profitMarginPercent: 40.0,
      markupPercent: 66.67,
      stockLevel: 210,
      minThreshold: 40,
      batchNumber: 'BT-2026-702',
      expiryDate: '2027-12-31',
      isConsumable: true
    },
    {
      id: 'ph-05',
      tradeName: 'Ringer Lactate Solution',
      scientificName: 'Compound Sodium Lactate',
      form: 'IV Bag',
      strength: '500ml',
      purchasePrice: 4.0,
      sellingPrice: 7.0,
      profitMarginPercent: 42.86,
      markupPercent: 75.0,
      stockLevel: 320,
      minThreshold: 50,
      batchNumber: 'BT-2026-550',
      expiryDate: '2029-03-31',
      isConsumable: true
    },
    {
      id: 'ph-06',
      tradeName: 'Surgical Delivery Kit & Drapes',
      scientificName: 'Sterile Cesarean Pack',
      form: 'Pack',
      strength: 'Single Use Sterile',
      purchasePrice: 120.0,
      sellingPrice: 180.0,
      profitMarginPercent: 33.33,
      markupPercent: 50.0,
      stockLevel: 45,
      minThreshold: 10,
      batchNumber: 'PK-2026-090',
      expiryDate: '2028-09-30',
      isConsumable: true
    }
  ];

  const dispenseRecords: DispenseRecord[] = [
    {
      id: 'disp-1',
      admissionId: 'ADM-2026-4401',
      itemId: 'ph-01',
      itemName: 'Cefotaxime 1g Vial',
      quantity: 3,
      unitPrice: 15.0,
      totalPrice: 45.0,
      dispensedBy: 'صيدلي باسم القاضي',
      timestamp: '2026-11-05T13:30:00Z',
      coveredByPackage: true
    },
    {
      id: 'disp-2',
      admissionId: 'ADM-2026-4401',
      itemId: 'ph-04',
      itemName: 'Paracetamol IV 1000mg',
      quantity: 3,
      unitPrice: 10.0,
      totalPrice: 30.0,
      dispensedBy: 'صيدلي باسم القاضي',
      timestamp: '2026-11-05T13:30:00Z',
      coveredByPackage: true
    },
    {
      id: 'disp-3',
      admissionId: 'ADM-2026-4401',
      itemId: 'ph-02',
      itemName: 'Oxytocin 10 IU Ampoule',
      quantity: 2,
      unitPrice: 12.0,
      totalPrice: 24.0,
      dispensedBy: 'صيدلي باسم القاضي',
      timestamp: '2026-11-05T13:30:00Z',
      coveredByPackage: true
    },
    {
      id: 'disp-501',
      admissionId: 'ADM-2026-4405',
      itemId: 'ph-03',
      itemName: 'Tranexamic Acid 500mg Ampoule',
      quantity: 2,
      unitPrice: 18.0,
      totalPrice: 36.0,
      dispensedBy: 'صيدلي باسم القاضي',
      timestamp: '2026-11-07T03:35:00Z',
      coveredByPackage: false
    },
    {
      id: 'disp-502',
      admissionId: 'ADM-2026-4405',
      itemId: 'ph-05',
      itemName: 'Ringer Lactate Solution 500ml',
      quantity: 3,
      unitPrice: 7.0,
      totalPrice: 21.0,
      dispensedBy: 'صيدلي باسم القاضي',
      timestamp: '2026-11-07T03:35:00Z',
      coveredByPackage: false
    }
  ];

  const custodyItems: StoreCustodyItem[] = [
    {
      id: 'cst-1',
      admissionId: 'ADM-2026-4401',
      itemName: 'طقم أغطية وشراشف فاخرة للغرفة (Luxury Linen & Blanket Set)',
      type: 'custody',
      quantity: 2,
      assignedAt: '2026-11-05T10:00:00Z',
      assignedBy: 'مسؤول المغسلة سالم العماري',
      condition: 'Returned Clean'
    },
    {
      id: 'cst-2',
      admissionId: 'ADM-2026-4401',
      itemName: 'وسادة رضاعة طبية (Orthopedic Nursing Pillow)',
      type: 'custody',
      quantity: 1,
      assignedAt: '2026-11-05T10:00:00Z',
      assignedBy: 'مسؤول المخزن خالد البكوش'
    }
  ];

  const packages: MedicalPackage[] = [
    {
      id: 'PKG-NVD-01',
      code: 'NVD-STANDARD',
      name: 'Normal Vaginal Delivery Package',
      nameAr: 'باقة الولادة الطبيعية الشاملة',
      totalPrice: 1200.0,
      includedDays: 1,
      roomTypeIncluded: 'standard',
      includedDoctorVisits: 1,
      includedNursingDays: 1,
      includedProcedures: ['Normal Delivery', 'Labor Room Monitoring', 'Episiotomy & Repair if needed', 'Newborn Initial Assessment'],
      includedLabs: ['CBC', 'Blood Group & Rh', 'Urine Analysis'],
      includedMedsLimitAmount: 150.0,
      description: 'يشمل إقامة 24 ساعة، وأتعاب طبيب التوليد والتمريض، والتحاليل الروتينية، وأدوية الولادة الأساسية'
    },
    {
      id: 'PKG-CS-02',
      code: 'LSCS-COMPREHENSIVE',
      name: 'Comprehensive Cesarean Section Package',
      nameAr: 'باقة العملية القيصرية الشاملة',
      totalPrice: 2800.0,
      includedDays: 2,
      roomTypeIncluded: 'standard',
      includedDoctorVisits: 2,
      includedNursingDays: 2,
      includedProcedures: ['Elective or Emergency LSCS', 'Operating Room & Scrub Team', 'Anesthesia Specialist Fees', 'Newborn Pediatrician Round'],
      includedLabs: ['CBC', 'Coagulation Profile (PT/INR/PTT)', 'Renal Function', 'Blood Group & Rh Crossmatch'],
      includedMedsLimitAmount: 350.0,
      description: 'يشمل يومين إقامة، وغرفة العمليات، والتخدير، وأتعاب الجراح والمساعد، وفحص طبيب الأطفال، والمستلزمات والأدوية الأساسية'
    },
    {
      id: 'PKG-LAP-03',
      code: 'LAP-GYN-03',
      name: 'Diagnostic & Operative Laparoscopy Package',
      nameAr: 'باقة الجراحة المنظارية النسائية',
      totalPrice: 3500.0,
      includedDays: 2,
      roomTypeIncluded: 'standard',
      includedDoctorVisits: 2,
      includedNursingDays: 2,
      includedProcedures: ['Laparoscopic Ovarian Cystectomy / Adhesiolysis', 'Laparoscopy Tower & Instrumentation', 'Anesthesia', 'Histopathology Specimen Preparation'],
      includedLabs: ['CBC', 'Coagulation Profile', 'Liver & Renal Panel', 'CA-125 / Tumor Markers'],
      includedMedsLimitAmount: 300.0,
      description: 'يشمل الجراحة بالمنظار واستئصال الكيسة، والإقامة، والتخدير، والفحوصات المخبرية'
    }
  ];

  const paymentReceipts: PaymentReceipt[] = [
    {
      id: 'rcpt-101',
      admissionId: 'ADM-2026-4401',
      amount: 1000.0,
      paymentMethod: 'Letter of Guarantee',
      receivedBy: 'محاسب مصطفى السنوسي',
      receiptNumber: 'RC-2026-7891',
      timestamp: '2026-11-05T09:30:00Z',
      notes: 'Initial corporate insurance deposit coverage approval letter'
    },
    {
      id: 'rcpt-501',
      admissionId: 'ADM-2026-4405',
      amount: 800.0,
      paymentMethod: 'Cash',
      receivedBy: 'محاسب مصطفى السنوسي',
      receiptNumber: 'RC-2026-7892',
      timestamp: '2026-11-07T03:30:00Z',
      notes: 'Emergency admission cash advance deposit'
    }
  ];

  const medicalReports: MedicalReport[] = [
    {
      id: 'rep-01',
      reportNumber: 'REP-2026-0044',
      admissionId: 'ADM-2026-4401',
      mrn: 'MRN-2026-0811',
      patientName: 'مريم سالم الترهوني',
      issueDate: '2026-11-07',
      feeAmount: 25.0, // Per document policy 25 LYD
      feePaid: true,
      clinicalSummary: 'Patient admitted on 05/11/2026 in active labor. Underwent successful lower segment Cesarean section under spinal anesthesia delivering healthy baby girl. Post-operative period uneventful with stable vitals.',
      currentStatus: 'Clinically stable, incision clean and healing by primary intention, ambulant.',
      interventionsDone: 'Emergency LSCS, IV Cefotaxime, Paracetamol IV, Routine post-op labs.',
      consultingSpecialistName: 'د. مريم الدريسي (استشاري أطفال)',
      attendingConsultantName: 'د. طارق بن عامر',
      hospitalStampApproved: true,
      digitalSignatureHash: 'SHA256:7e8a9b21f9c0e4a781b238d09911e35a7b6c8d'
    }
  ];

  const dischargeSummaries: DischargeSummary[] = [];
  const damaForms: DAMAForm[] = [];

  const consentForms: ConsentForm[] = [
    {
      id: 'cns-1',
      consentNumber: 'CNS-2026-0001',
      admissionId: 'ADM-2026-4401',
      mrn: 'MRN-2026-0811',
      patientName: 'سارة المنصوري',
      type: 'surgical_operative',
      titleAr: 'إقرار وموافقة مستنيرة لإجراء عملية ولادة قيصرية',
      titleEn: 'Informed Consent for Lower Segment Cesarean Section (LSCS)',
      procedureName: 'Lower Segment Cesarean Section (LSCS) under Regional Anesthesia',
      clinicalIndication: 'Failure of progression in first stage of labor with persistent fetal bradycardia (Cat II tracing)',
      risksExplained: [
        'Bleeding / Intraoperative hemorrhage and possible need for blood transfusion',
        'Surgical site infection, wound breakdown, or pelvic collection',
        'Injury to adjacent visceral organs (urinary bladder, bowel, or ureters)',
        'Anesthesia-related complications including hypotension or spinal headache',
        'Venous thromboembolism (DVT/PE)'
      ],
      alternativesExplained: 'Continuation of trial of labor explained as carrying severe imminent risk to fetal viability.',
      emergencyConversionAuthorized: true,
      bloodTransfusionPermitted: true,
      signerType: 'patient',
      signerName: 'سارة المنصوري',
      signerNationalId: '219900445588',
      signerRelationship: 'المريضة نفسها (Patient)',
      signerPhone: '+218 91 234 5678',
      signerSignature: 'سارة المنصوري (توقيع إلكتروني موثق)',
      signedDate: '2026-11-05T09:30:00Z',
      physicianName: 'د. طارق بن عامر',
      physicianLicense: 'LY-MED-2012-4410',
      physicianSignature: 'د. طارق بن عامر (استشاري نساء وتوليد)',
      witnessName: 'فاطمة الورفلي',
      witnessRole: 'مشرفة تمريض العمليات',
      witnessSignature: 'فاطمة الورفلي',
      status: 'signed',
      notes: 'All questions answered thoroughly. Patient comprehends indications and emergency consent granted.'
    },
    {
      id: 'cns-2',
      consentNumber: 'CNS-2026-0002',
      admissionId: 'ADM-2026-4401',
      mrn: 'MRN-2026-0811',
      patientName: 'سارة المنصوري',
      type: 'anesthesia_epidural',
      titleAr: 'إقرار وموافقة مستنيرة للتخدير النصفي والشوكي',
      titleEn: 'Informed Consent for Regional / Spinal Anesthesia',
      procedureName: 'Subarachnoid Spinal Block (L3-L4 Heavy Bupivacaine 0.5% + Fentanyl)',
      clinicalIndication: 'Operative delivery anesthesia for Cesarean section',
      risksExplained: [
        'Post-dural puncture headache (PDPH)',
        'Transient hypotension requiring vasopressor infusion',
        'Incomplete or patchy sensory block requiring conversion to general endotracheal anesthesia',
        'Localized back discomfort or transient nerve irritation'
      ],
      emergencyConversionAuthorized: true,
      bloodTransfusionPermitted: true,
      signerType: 'patient',
      signerName: 'سارة المنصوري',
      signerNationalId: '219900445588',
      signerRelationship: 'المريضة نفسها',
      signerPhone: '+218 91 234 5678',
      signerSignature: 'سارة المنصوري',
      signedDate: '2026-11-05T09:45:00Z',
      physicianName: 'د. هدى الفيتوري',
      physicianLicense: 'LY-ANES-2015-8821',
      physicianSignature: 'د. هدى الفيتوري (أخصائية تخدير وعناية)',
      witnessName: 'فاطمة الورفلي',
      witnessRole: 'ممرضة تخدير',
      witnessSignature: 'فاطمة الورفلي',
      status: 'signed',
      notes: 'Airway Mallampati Class I, NPO status verified > 8 hours.'
    },
    {
      id: 'cns-3',
      consentNumber: 'CNS-2026-0003',
      admissionId: 'ADM-2026-4402',
      mrn: 'MRN-2026-0922',
      patientName: 'منى الزنتاني',
      type: 'general_admission',
      titleAr: 'إقرار الدخول العام وتلقي الفحوصات والعلاج الطبي الإيوائي',
      titleEn: 'General Inpatient Admission & Treatment Consent',
      procedureName: 'Inpatient Hospitalization, Monitoring, Diagnostic Labs & Medical Therapy',
      clinicalIndication: 'Threatened preterm labor at 31 weeks GA with cervical shortening',
      risksExplained: [
        'Adverse reactions to intravenous tocolytics or corticosteroid injections',
        'Need for repeated phlebotomy and blood glucose monitoring',
        'Possibility of urgent surgical delivery if fetal compromise ensues'
      ],
      emergencyConversionAuthorized: true,
      bloodTransfusionPermitted: true,
      signerType: 'patient',
      signerName: 'منى الزنتاني',
      signerNationalId: '219950112233',
      signerRelationship: 'المريضة نفسها',
      signerPhone: '+218 92 888 9900',
      signerSignature: 'منى الزنتاني (معتمد إلكترونياً)',
      signedDate: '2026-11-06T14:15:00Z',
      physicianName: 'د. طارق بن عامر',
      physicianLicense: 'LY-MED-2012-4410',
      physicianSignature: 'د. طارق بن عامر',
      witnessName: 'ريم الشريف',
      witnessRole: 'موظفة الاستقبال وقبول المرضى',
      witnessSignature: 'ريم الشريف',
      status: 'signed',
      notes: 'General admission terms, hospital regulations, and visiting hours explained.'
    }
  ];

  const voiceNotes: VoiceNote[] = [
    {
      id: 'vn-1',
      admissionId: 'ADM-2026-4401',
      mrn: 'MRN-2026-0811',
      patientName: 'سارة المنصوري',
      recordedBy: 'د. طارق بن عامر',
      recordedByRole: 'consultant',
      timestamp: '2026-11-06T10:15:00Z',
      durationSeconds: 42,
      category: 'clinical_round',
      title: 'مرور صباحي بعد العملية القيصرية - اليوم الأول',
      transcript: 'المريضة سارة المنصوري، اليوم الأول بعد القيصرية. العلامات الحيوية مستقرة تماماً، ضغط الدم 120/75، النبض 78، الحرارة 36.8. فحص البطن يظهر رحم منقبض جيداً وجرح العملية نظيف وجاف بدون أي تجمع دموي. تم البدء بالسوائل الفموية والمشي الخفيف. استمرار على المضاد الحيوي الوريدي ومسكنات الألم حسب جدول eMAR.',
      aiStructuredSoap: {
        subjective: 'المريضة تشعر بارتياح ملحوظ، ألم الجرح متحكم به بالمسكنات، تمكنت من شرب السوائل والمشي بمساعدة التمريض.',
        objective: 'BP: 120/75 mmHg, HR: 78 bpm, Temp: 36.8°C. Abdomen soft, uterus well contracted at umbilicus. Pfannenstiel surgical incision clean, dry, intact without discharge or hematoma. Lochia normal rubra.',
        assessment: 'Post-Cesarean Section Day 1 (LSCS), uncomplicated recovery, stable maternal vitals.',
        plan: '1. Step up to light soft diet. 2. Continue analgesia PRN and IV prophylactic antibiotic. 3. Encourage progressive ambulation. 4. Remove Foley catheter at 24h.'
      },
      aiSummary: 'حالة مستقرة لليوم الأول بعد القيصرية، الرحم منقبض والجرح سليم، تم تشجيع المشي وبدء التغذية الخفيفة.',
      tags: ['Post-Op Day 1', 'Cesarean', 'Stable']
    },
    {
      id: 'vn-2',
      admissionId: 'ADM-2026-4402',
      mrn: 'MRN-2026-0922',
      patientName: 'منى الزنتاني',
      recordedBy: 'فاطمة الورفلي',
      recordedByRole: 'nurse',
      timestamp: '2026-11-06T19:30:00Z',
      durationSeconds: 35,
      category: 'nursing_handover',
      title: 'تسليم التمريض المسائي - جناح الولادة',
      transcript: 'المريضة منى الزنتاني، الغرفة 102، حامل في الأسبوع 31، منومة للراحة التامة ومراقبة انقباضات الرحم. تلقت الجرعة الأولى من ديكساميثازون لنضج رئة الجنين. النبض وضغط الدم طبيعيان، تخطيط قلب الجنين CTG تفاعلي ومطمئن، ولا توجد إفرازات مائية أو نزف.',
      aiStructuredSoap: {
        subjective: 'المريضة لا تشتكي من تقلصات نشطة، حركة الجنين ممتازة.',
        objective: 'Vitals: BP 115/70, HR 82. CTG baseline 140 bpm, reactive with good variability. No uterine tenderness or vaginal bleeding.',
        assessment: 'Threatened preterm labor at 31 weeks GA, responding to rest and initial tocolytic therapy.',
        plan: '1. Administer second dose of Dexamethasone 12mg IM tomorrow morning at 08:00. 2. Continuous maternal-fetal surveillance. 3. Maintain strict bed rest.'
      },
      aiSummary: 'تسليم الحالة لمناوبة الليل: المريضة مستقرة، الجنين بحالة جيدة، وتنتظر الجرعة الثانية من حقنة الرئة صباح الغد.',
      tags: ['Handover', 'Dexamethasone', 'Bed Rest']
    }
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'aud-1',
      timestamp: '2026-11-05T09:10:00Z',
      userId: 'usr-10',
      userName: 'ريم الشريف',
      userRole: 'reception',
      action: 'CREATE',
      entity: 'Admission',
      entityId: 'ADM-2026-4401',
      patientMRN: 'MRN-2026-0811',
      details: 'Patient admitted to Ob/Gyn ward under Dr. Tarek Ben-Amer. Package PKG-CS-02 assigned.'
    },
    {
      id: 'aud-2',
      timestamp: '2026-11-05T13:30:00Z',
      userId: 'usr-1',
      userName: 'د. طارق بن عامر',
      userRole: 'surgeon',
      action: 'CREATE',
      entity: 'OperativeReport',
      entityId: 'op-4401',
      patientMRN: 'MRN-2026-0811',
      details: 'Operative record and surgical checklist completed for emergency Cesarean section.'
    },
    {
      id: 'aud-3',
      timestamp: '2026-11-06T02:00:00Z',
      userId: 'usr-1',
      userName: 'د. طارق بن عامر',
      userRole: 'consultant',
      action: 'DISCONTINUE',
      entity: 'MedicationOrder',
      entityId: 'med-103',
      patientMRN: 'MRN-2026-0811',
      details: 'Oxytocin infusion discontinued. Reason: Uterus well contracted, course complete.'
    },
    {
      id: 'aud-4',
      timestamp: '2026-11-07T03:05:00Z',
      userId: 'usr-10',
      userName: 'ريم الشريف',
      userRole: 'reception',
      action: 'CREATE',
      entity: 'Admission',
      entityId: 'ADM-2026-4405',
      patientMRN: 'MRN-2026-0815',
      details: 'Emergency fast-track admission created for Khadija Al-Sanussi due to severe bleeding.'
    },
    {
      id: 'aud-5',
      timestamp: '2026-11-07T04:05:00Z',
      userId: 'usr-1',
      userName: 'د. طارق بن عامر',
      userRole: 'doctor',
      action: 'VIEW',
      entity: 'LabOrder',
      entityId: 'lab-501',
      patientMRN: 'MRN-2026-0815',
      details: 'Critical Alert acknowledged: Hemoglobin 8.6 g/dL. Blood transfusion ordered.'
    }
  ];

  const vendors: Vendor[] = [
    {
      id: 'vend-1',
      name: 'Al-Balsam Pharmaceuticals Co.',
      nameAr: 'شركة البلسم لاستيراد الأدوية والمستلزمات الطبية',
      code: 'VEND-PHARM-01',
      contactPerson: 'Eng. Hisham Al-Tarhouni',
      phone: '021-3331122',
      email: 'sales@balsam-pharma.ly',
      address: 'Tripoli - Omar Al-Mukhtar St, Building 14',
      category: 'Pharmaceuticals & IV Solutions',
      paymentTerms: 'Net 30 Days',
      active: true
    },
    {
      id: 'vend-2',
      name: 'Al-Nour Medical Equipment & Technology',
      nameAr: 'شركة النور للأجهزة الطبية وتقنيات الموجات فوق الصوتية',
      code: 'VEND-EQUIP-02',
      contactPerson: 'Dr. Walid Al-Obeidi',
      phone: '021-4448899',
      email: 'orders@alnour-medtech.ly',
      address: 'Tripoli - Ben Ashour Branch',
      category: 'Diagnostic & Ultrasound Equipment',
      paymentTerms: '50% Advance, 50% on Delivery & Installation',
      active: true
    },
    {
      id: 'vend-3',
      name: 'Tripoli Surgical Supplies & Consumables',
      nameAr: 'مؤسسة طرابلس للمستلزمات الجراحية والمستهلكات',
      code: 'VEND-SURG-03',
      contactPerson: 'Samer Al-Zintani',
      phone: '021-7776655',
      email: 'info@tripolisurgical.ly',
      address: 'Tripoli - Zawiyat Al-Dahmani',
      category: 'Surgical Disposables, Cannulae & Drapes',
      paymentTerms: 'Net 15 Days',
      active: true
    }
  ];

  const inventoryItems: InventoryItem[] = [
    // Medicines
    {
      id: 'inv-med-01',
      sku: 'MED-CEF-1G',
      name: 'Klaforan (Cefotaxime Sodium)',
      nameAr: 'كلافوران (سيفوتاكسيم) 1 جم حقن',
      category: 'medicine',
      description: 'Broad-spectrum 3rd generation cephalosporin antibiotic injection',
      location: 'Main Pharmacy - Shelf A1',
      stockLevel: 140,
      minThreshold: 30,
      unit: 'Vial',
      unitCost: 10.0,
      unitPrice: 15.0,
      vendorId: 'vend-1',
      vendorName: 'Al-Balsam Pharmaceuticals Co.',
      batchNumber: 'BT-2026-881',
      expiryDate: '2028-05-31',
      status: 'in_stock',
      lastRestockedAt: '2026-11-01T10:00:00Z'
    },
    {
      id: 'inv-med-02',
      sku: 'MED-OXY-10IU',
      name: 'Syntocinon (Oxytocin)',
      nameAr: 'سينتوسينون (أوكسيتوسين) 10 وحدات دولية',
      category: 'medicine',
      description: 'Uterotonic agent for labor induction and postpartum hemorrhage prevention',
      location: 'Main Pharmacy - Refrigerator B (2-8°C)',
      stockLevel: 95,
      minThreshold: 20,
      unit: 'Ampoule',
      unitCost: 8.0,
      unitPrice: 12.0,
      vendorId: 'vend-1',
      vendorName: 'Al-Balsam Pharmaceuticals Co.',
      batchNumber: 'BT-2026-442',
      expiryDate: '2027-10-15',
      status: 'in_stock',
      lastRestockedAt: '2026-10-25T11:30:00Z'
    },
    {
      id: 'inv-med-03',
      sku: 'MED-TXA-500MG',
      name: 'Cyklokapron (Tranexamic Acid)',
      nameAr: 'سيكلوكابرون (حمض الترانيكساميك) 500 ملغم',
      category: 'medicine',
      description: 'Antifibrinolytic hemostatic injection for acute bleeding control',
      location: 'Main Pharmacy - Emergency Shelf',
      stockLevel: 72,
      minThreshold: 15,
      unit: 'Ampoule',
      unitCost: 12.0,
      unitPrice: 18.0,
      vendorId: 'vend-1',
      vendorName: 'Al-Balsam Pharmaceuticals Co.',
      batchNumber: 'BT-2026-119',
      expiryDate: '2028-01-20',
      status: 'in_stock',
      lastRestockedAt: '2026-10-28T09:15:00Z'
    },
    {
      id: 'inv-med-04',
      sku: 'MED-PARA-1000',
      name: 'Perfalgan (Paracetamol IV Infusion)',
      nameAr: 'بيرفالجان (باراسيتامول وريدي) 1000 ملغم / 100 مل',
      category: 'medicine',
      description: 'Analgesic and antipyretic infusion for post-operative pain',
      location: 'Main Pharmacy - Shelf A3',
      stockLevel: 210,
      minThreshold: 40,
      unit: 'Bottle',
      unitCost: 6.0,
      unitPrice: 10.0,
      vendorId: 'vend-1',
      vendorName: 'Al-Balsam Pharmaceuticals Co.',
      batchNumber: 'BT-2026-702',
      expiryDate: '2027-12-31',
      status: 'in_stock',
      lastRestockedAt: '2026-11-02T14:00:00Z'
    },
    {
      id: 'inv-med-05',
      sku: 'MED-RL-500ML',
      name: 'Ringer Lactate Solution 500ml',
      nameAr: 'محلول رينجر لاكتات 500 مل وريدي',
      category: 'medicine',
      description: 'Balanced crystalloid solution for hydration and surgical fluid therapy',
      location: 'Warehouse - Bay 2 Fluids',
      stockLevel: 320,
      minThreshold: 50,
      unit: 'IV Bag',
      unitCost: 4.0,
      unitPrice: 7.0,
      vendorId: 'vend-1',
      vendorName: 'Al-Balsam Pharmaceuticals Co.',
      batchNumber: 'BT-2026-550',
      expiryDate: '2029-03-31',
      status: 'in_stock',
      lastRestockedAt: '2026-10-30T16:00:00Z'
    },

    // Equipment
    {
      id: 'inv-eq-01',
      sku: 'EQ-VOLUSON-E10',
      name: 'Voluson E10 3D/4D Convex Ultrasound Transducer Probe',
      nameAr: 'مسبار التراساوند فولوسون E10 ثلاثي ورباعي الأبعاد للولادة',
      category: 'equipment',
      description: 'High-definition matrix convex abdominal transducer for advanced fetal anomaly and growth scans',
      location: 'Ultrasound Diagnostic Suite 1',
      stockLevel: 2,
      minThreshold: 1,
      unit: 'Device',
      unitCost: 18500.0,
      unitPrice: 22000.0,
      vendorId: 'vend-2',
      vendorName: 'Al-Nour Medical Equipment & Technology',
      batchNumber: 'SN-VOL-98214',
      status: 'in_stock',
      lastRestockedAt: '2026-09-15T10:00:00Z'
    },
    {
      id: 'inv-eq-02',
      sku: 'EQ-DOPPLER-BT200',
      name: 'Hi-Bebe Fetal Doppler Heart Rate Detector BT-200',
      nameAr: 'جهاز دوبلر الجنين المحمول لقياس نبضات قلب الجنين',
      category: 'equipment',
      description: 'Pocket obstetric Doppler with LCD acoustic display and waterproof 2MHz probe',
      location: 'Maternity Ward Nursing Station Cart',
      stockLevel: 4,
      minThreshold: 2,
      unit: 'Device',
      unitCost: 450.0,
      unitPrice: 650.0,
      vendorId: 'vend-2',
      vendorName: 'Al-Nour Medical Equipment & Technology',
      batchNumber: 'SN-DOP-44102',
      status: 'in_stock',
      lastRestockedAt: '2026-10-10T12:00:00Z'
    },
    {
      id: 'inv-eq-03',
      sku: 'EQ-CTG-MONITOR',
      name: 'Cardiotocography (CTG) Fetal Monitor Dual Channel',
      nameAr: 'جهاز تخطيط قلب الجنين وانقباضات الرحم (CTG) ثنائي القناة',
      category: 'equipment',
      description: 'Dual pulsed ultrasound transducers with thermal printer for antepartum fetal monitoring',
      location: 'Labor & Delivery Room 2',
      stockLevel: 3,
      minThreshold: 2,
      unit: 'Device',
      unitCost: 7200.0,
      unitPrice: 8800.0,
      vendorId: 'vend-2',
      vendorName: 'Al-Nour Medical Equipment & Technology',
      batchNumber: 'SN-CTG-33019',
      status: 'in_stock',
      lastRestockedAt: '2026-10-01T15:00:00Z'
    },
    {
      id: 'inv-eq-04',
      sku: 'EQ-BED-OB900',
      name: 'Electric Obstetric Delivery Bed Multi-Position Model OB-900',
      nameAr: 'سرير توليد كهربائي متعدد الوضعيات لغرف العمليات والولادة',
      category: 'equipment',
      description: 'Full motorized height, Trendelenburg, and leg support adjustment with battery backup',
      location: 'Delivery Suite Operating Theater',
      stockLevel: 5,
      minThreshold: 2,
      unit: 'Bed',
      unitCost: 9500.0,
      unitPrice: 12000.0,
      vendorId: 'vend-2',
      vendorName: 'Al-Nour Medical Equipment & Technology',
      batchNumber: 'SN-BED-77180',
      status: 'in_stock',
      lastRestockedAt: '2026-08-20T08:30:00Z'
    },

    // Supplies (with 3 low-stock alert items)
    {
      id: 'inv-sup-01',
      sku: 'SUP-GLOVE-75',
      name: 'Sterile Powder-Free Surgical Gloves Size 7.5 (Box of 50 pairs)',
      nameAr: 'قفازات جراحية معقمة خالية من البودرة مقاس 7.5 (علبة 50 زوج)',
      category: 'supplies',
      description: 'High-tactility micro-textured latex-free surgical gloves for obstetric surgery',
      location: 'OT Supply Room - Shelf 4',
      stockLevel: 18, // LOW STOCK ALERT: stock 18 <= minThreshold 25
      minThreshold: 25,
      unit: 'Box',
      unitCost: 35.0,
      unitPrice: 50.0,
      vendorId: 'vend-3',
      vendorName: 'Tripoli Surgical Supplies & Consumables',
      batchNumber: 'BT-GLV-9921',
      expiryDate: '2028-11-30',
      status: 'low_stock',
      lastRestockedAt: '2026-10-14T09:00:00Z'
    },
    {
      id: 'inv-sup-02',
      sku: 'SUP-CANNULA-18G',
      name: 'IV Cannula with Injection Port 18G Green (Box of 100)',
      nameAr: 'كانيولا وريدية خضراء 18G مع صمام حقن (علبة 100 قطعة)',
      category: 'supplies',
      description: 'Wide-bore IV catheter for emergency blood transfusion and rapid infusion',
      location: 'Inpatient Ward Supply Closet - Bin 2',
      stockLevel: 12, // LOW STOCK ALERT: stock 12 <= minThreshold 20
      minThreshold: 20,
      unit: 'Box',
      unitCost: 45.0,
      unitPrice: 65.0,
      vendorId: 'vend-3',
      vendorName: 'Tripoli Surgical Supplies & Consumables',
      batchNumber: 'BT-CAN-8812',
      expiryDate: '2029-06-30',
      status: 'low_stock',
      lastRestockedAt: '2026-10-20T11:00:00Z'
    },
    {
      id: 'inv-sup-03',
      sku: 'SUP-CORD-CLAMP',
      name: 'Sterile Umbilical Cord Clamps Disposable (Pack of 100)',
      nameAr: 'مشابك الحبل السري المعقمة للاستخدام الفردي (كيس 100 مشبك)',
      category: 'supplies',
      description: 'Medical grade plastic non-slip dual grip clamps for newborn umbilical cord clamping',
      location: 'Delivery Room Emergency Cart 1',
      stockLevel: 8, // LOW STOCK ALERT: stock 8 <= minThreshold 15
      minThreshold: 15,
      unit: 'Pack',
      unitCost: 28.0,
      unitPrice: 42.0,
      vendorId: 'vend-3',
      vendorName: 'Tripoli Surgical Supplies & Consumables',
      batchNumber: 'BT-CLP-5501',
      expiryDate: '2030-01-01',
      status: 'low_stock',
      lastRestockedAt: '2026-10-18T14:30:00Z'
    },
    {
      id: 'inv-sup-04',
      sku: 'SUP-GAUZE-1010',
      name: 'Sterile Laparotomy Gauze Swabs 10x10cm with X-Ray Thread (Box of 100)',
      nameAr: 'شاش جراحي معقم 10×10 سم بخيط كاشف للأشعة السينية (علبة 100)',
      category: 'supplies',
      description: 'High-absorbency 100% cotton laparotomy abdominal sponges with barium sulfate filament',
      location: 'OR Central Dressing Store',
      stockLevel: 42,
      minThreshold: 20,
      unit: 'Box',
      unitCost: 18.0,
      unitPrice: 28.0,
      vendorId: 'vend-3',
      vendorName: 'Tripoli Surgical Supplies & Consumables',
      batchNumber: 'BT-GAZ-3320',
      expiryDate: '2028-09-30',
      status: 'in_stock',
      lastRestockedAt: '2026-10-29T10:00:00Z'
    },
    {
      id: 'inv-sup-05',
      sku: 'SUP-CS-DRAPE',
      name: 'Sterile Cesarean Section Surgical Drape Pack with Fluid Collection Pouch',
      nameAr: 'طقم شوادر جراحية معقمة للولادة القيصرية مع كيس تجميع السوائل',
      category: 'supplies',
      description: 'Impervious SMS fabric with incise film aperture and high-capacity calibrated drainage bag',
      location: 'OR Sterile Storage Room - Rack C',
      stockLevel: 25,
      minThreshold: 10,
      unit: 'Pack',
      unitCost: 120.0,
      unitPrice: 180.0,
      vendorId: 'vend-3',
      vendorName: 'Tripoli Surgical Supplies & Consumables',
      batchNumber: 'PK-2026-090',
      expiryDate: '2028-09-30',
      status: 'in_stock',
      lastRestockedAt: '2026-11-03T16:00:00Z'
    }
  ];

  const purchaseOrders: PurchaseOrder[] = [
    {
      id: 'po-2026-01',
      poNumber: 'PO-2026-001',
      vendorId: 'vend-3',
      vendorName: 'Tripoli Surgical Supplies & Consumables',
      items: [
        { itemId: 'inv-sup-01', itemName: 'Sterile Surgical Gloves 7.5', quantity: 30, unitCost: 35.0, totalCost: 1050.0 },
        { itemId: 'inv-sup-02', itemName: 'IV Cannula 18G Green', quantity: 20, unitCost: 45.0, totalCost: 900.0 }
      ],
      totalAmount: 1950.0,
      status: 'received',
      orderedBy: 'صيدلي باسم القاضي',
      orderDate: '2026-11-01T09:00:00Z',
      approvedBy: 'د. سالم بن زياد (المدير العام)',
      approvedDate: '2026-11-01T14:00:00Z',
      receivedBy: 'صيدلي باسم القاضي',
      receivedDate: '2026-11-03T11:00:00Z',
      notes: 'Initial monthly surgical consumables order received and inspected in good condition'
    },
    {
      id: 'po-2026-02',
      poNumber: 'PO-2026-002',
      vendorId: 'vend-1',
      vendorName: 'Al-Balsam Pharmaceuticals Co.',
      items: [
        { itemId: 'inv-med-01', itemName: 'Klaforan (Cefotaxime) 1g Vial', quantity: 100, unitCost: 10.0, totalCost: 1000.0 },
        { itemId: 'inv-med-02', itemName: 'Syntocinon (Oxytocin) 10 IU', quantity: 60, unitCost: 8.0, totalCost: 480.0 },
        { itemId: 'inv-med-03', itemName: 'Cyklokapron 500mg Ampoule', quantity: 50, unitCost: 12.0, totalCost: 600.0 }
      ],
      totalAmount: 2080.0,
      status: 'pending_approval',
      orderedBy: 'صيدلي باسم القاضي',
      orderDate: '2026-11-06T10:30:00Z',
      notes: 'Emergency restock for Maternity OT antibiotic and uterotonic reserve'
    },
    {
      id: 'po-2026-03',
      poNumber: 'PO-2026-003',
      vendorId: 'vend-2',
      vendorName: 'Al-Nour Medical Equipment & Technology',
      items: [
        { itemId: 'inv-eq-03', itemName: 'Cardiotocography (CTG) Fetal Monitor Dual Channel', quantity: 1, unitCost: 7200.0, totalCost: 7200.0 },
        { itemId: 'inv-eq-02', itemName: 'Hi-Bebe Fetal Doppler BT-200', quantity: 2, unitCost: 450.0, totalCost: 900.0 }
      ],
      totalAmount: 8100.0,
      status: 'approved',
      orderedBy: 'صيدلي باسم القاضي',
      orderDate: '2026-11-05T13:00:00Z',
      approvedBy: 'د. سالم بن زياد (المدير العام)',
      approvedDate: '2026-11-06T09:00:00Z',
      notes: 'Approved under expansion budget for High-Risk Maternity triage room'
    }
  ];

  const stockMovements: StockMovement[] = [
    {
      id: 'mov-1',
      itemId: 'inv-sup-01',
      itemName: 'Sterile Surgical Gloves Size 7.5 (Box of 50 pairs)',
      type: 'PURCHASE_RECEIPT',
      quantity: 30,
      previousStock: 5,
      newStock: 35,
      referenceId: 'PO-2026-001',
      performedBy: 'صيدلي باسم القاضي',
      timestamp: '2026-11-03T11:00:00Z',
      notes: 'Received from Tripoli Surgical Supplies'
    },
    {
      id: 'mov-2',
      itemId: 'inv-sup-01',
      itemName: 'Sterile Surgical Gloves Size 7.5 (Box of 50 pairs)',
      type: 'PATIENT_DISPENSE',
      quantity: 17,
      previousStock: 35,
      newStock: 18,
      referenceId: 'DISP-OT-4401',
      performedBy: 'ممرضة فاطمة الورفلي',
      timestamp: '2026-11-05T13:30:00Z',
      notes: 'Dispensed for Cesarean delivery suites'
    }
  ];

  const appointments: Appointment[] = [
    {
      id: 'apt-101',
      appointmentNumber: 'APT-2026-081',
      patientMrn: 'MRN-2026-0811',
      patientName: 'مريم سالم الترهوني',
      patientPhone: '091-2345678',
      doctorId: 'usr-1',
      doctorName: 'د. طارق بن عامر',
      department: 'Obstetrics & Gynecology (أمراض النساء والولادة)',
      date: '2026-11-10',
      timeSlot: '10:00',
      durationMinutes: 30,
      visitType: 'post_op',
      status: 'scheduled',
      notes: 'Post-Cesarean surgical wound check and infant wellbeing review',
      createdBy: 'ريم الشريف',
      createdAt: '2026-11-06T11:00:00Z'
    },
    {
      id: 'apt-102',
      appointmentNumber: 'APT-2026-082',
      patientMrn: 'MRN-2026-0812',
      patientName: 'سارة عبد الله القماطي',
      patientPhone: '091-8765432',
      doctorId: 'usr-2',
      doctorName: 'د. هدى المنصوري',
      department: 'Obstetrics & Gynecology (أمراض النساء والولادة)',
      date: '2026-11-08',
      timeSlot: '11:00',
      durationMinutes: 30,
      visitType: 'antenatal',
      status: 'confirmed',
      notes: 'High-risk pregnancy consultation for gestational diabetes and blood pressure monitoring',
      createdBy: 'ريم الشريف',
      createdAt: '2026-11-05T14:20:00Z'
    },
    {
      id: 'apt-103',
      appointmentNumber: 'APT-2026-083',
      patientMrn: 'MRN-2026-0813',
      patientName: 'أسماء المختار الفيتوري',
      patientPhone: '091-4567890',
      doctorId: 'usr-1',
      doctorName: 'د. طارق بن عامر',
      department: 'Obstetrics & Gynecology (أمراض النساء والولادة)',
      date: '2026-11-10',
      timeSlot: '11:30',
      durationMinutes: 30,
      visitType: 'ultrasound',
      status: 'scheduled',
      notes: 'Detailed 3D/4D fetal growth ultrasound and Doppler biophysical profile',
      createdBy: 'ريم الشريف',
      createdAt: '2026-11-06T15:00:00Z'
    },
    {
      id: 'apt-104',
      appointmentNumber: 'APT-2026-084',
      patientMrn: 'MRN-2026-0814',
      patientName: 'فاطمة مفتاح الزوي',
      patientPhone: '091-3344556',
      doctorId: 'usr-1',
      doctorName: 'د. طارق بن عامر',
      department: 'Obstetrics & Gynecology (أمراض النساء والولادة)',
      date: '2026-11-06',
      timeSlot: '09:00',
      durationMinutes: 30,
      visitType: 'consultation',
      status: 'completed',
      notes: 'Pre-operative diagnostic assessment for laparoscopic management',
      createdBy: 'ريم الشريف',
      createdAt: '2026-11-04T10:00:00Z'
    }
  ];

  return {
    users,
    patients,
    admissions,
    beds,
    assessments,
    plans,
    dietaryOrders,
    medications,
    emarRecords,
    labOrders,
    consultations,
    operativeReports,
    anesthesiaRecords,
    pharmacyItems,
    dispenseRecords,
    custodyItems,
    packages,
    paymentReceipts,
    dischargeSummaries,
    damaForms,
    medicalReports,
    consentForms,
    voiceNotes,
    auditLogs,
    inventoryItems,
    vendors,
    purchaseOrders,
    stockMovements,
    appointments
  };
}

class DatabaseManager {
  private data: HMISDatabase;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): HMISDatabase {
    const initial = getInitialData();
    try {
      if (fs.existsSync(DATA_FILE)) {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);

        // Auto-merge new collections if missing
        if (!parsed.consentForms || parsed.consentForms.length === 0) {
          parsed.consentForms = initial.consentForms;
        }
        if (!parsed.voiceNotes || parsed.voiceNotes.length === 0) {
          parsed.voiceNotes = initial.voiceNotes;
        }
        if (!parsed.inventoryItems || parsed.inventoryItems.length === 0) {
          parsed.inventoryItems = initial.inventoryItems;
        }
        if (!parsed.vendors || parsed.vendors.length === 0) {
          parsed.vendors = initial.vendors;
        }
        if (!parsed.purchaseOrders || parsed.purchaseOrders.length === 0) {
          parsed.purchaseOrders = initial.purchaseOrders;
        }
        if (!parsed.stockMovements) {
          parsed.stockMovements = initial.stockMovements;
        }
        if (!parsed.appointments || parsed.appointments.length === 0) {
          parsed.appointments = initial.appointments;
        }

        // Ensure users have updated RBAC fields
        if (parsed.users) {
          for (const initU of initial.users) {
            const existing = parsed.users.find((u: any) => u.id === initU.id || u.username === initU.username);
            if (!existing) {
              parsed.users.push(initU);
            } else {
              existing.username = initU.username;
              existing.permissions = initU.permissions;
              existing.role = initU.role;
              if (initU.linkedPatientMrn) existing.linkedPatientMrn = initU.linkedPatientMrn;
              if (initU.email) existing.email = initU.email;
            }
          }
        } else {
          parsed.users = initial.users;
        }

        this.saveData(parsed);
        return parsed;
      }
    } catch (err) {
      console.warn('Failed to load DB from disk, initializing fresh in-memory data:', err);
    }
    this.saveData(initial);
    return initial;
  }

  private saveData(data: HMISDatabase) {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  public getData(): HMISDatabase {
    return this.data;
  }

  public logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const log: AuditLogEntry = {
      ...entry,
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(log);
    this.saveData(this.data);
    return log;
  }

  // --- Patients ---
  public getPatients() {
    return this.data.patients;
  }

  public getPatientByMRN(mrn: string) {
    return this.data.patients.find(p => p.mrn === mrn);
  }

  public createPatient(patient: Omit<Patient, 'createdAt'>, userId: string, userName: string, userRole: any) {
    const newPatient: Patient = {
      ...patient,
      createdAt: new Date().toISOString()
    };
    this.data.patients.unshift(newPatient);
    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'Patient',
      entityId: newPatient.mrn,
      patientMRN: newPatient.mrn,
      details: `Created new patient file: ${newPatient.fullName} (${newPatient.mrn})`
    });
    this.saveData(this.data);
    return newPatient;
  }

  // --- Admissions & Bed Management ---
  public getAdmissions() {
    return this.data.admissions;
  }

  public getAdmissionById(id: string) {
    return this.data.admissions.find(a => a.admissionId === id);
  }

  public getBeds() {
    return this.data.beds;
  }

  public updateBed(bedId: string, updates: Partial<Bed>, userId: string, userName: string, userRole: any) {
    const bed = this.data.beds.find(b => b.id === bedId);
    if (!bed) throw new Error(`Bed with id ${bedId} not found`);
    Object.assign(bed, updates);
    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'Bed',
      entityId: bedId,
      details: `Updated bed ${bed.number}: status=${bed.status}${bed.infectionStatus ? `, infection=${bed.infectionStatus}` : ''}`
    });
    this.saveData(this.data);
    return bed;
  }

  public createAdmission(admData: Omit<Admission, 'admissionId' | 'bedTransfers'>, userId: string, userName: string, userRole: any) {
    // Conflict Prevention Rule: Verify target bed is not occupied!
    const targetBed = this.data.beds.find(b => b.id === admData.bedId);
    if (targetBed && targetBed.status === 'occupied') {
      throw new Error(`Bed ${targetBed.number} is already occupied by another patient. Double allocation prevented!`);
    }

    const count = this.data.admissions.length + 4401;
    const admissionId = `ADM-2026-${count}`;

    const newAdmission: Admission = {
      ...admData,
      admissionId,
      bedTransfers: []
    };

    if (targetBed) {
      targetBed.status = 'occupied';
      targetBed.currentAdmissionId = admissionId;
      targetBed.currentPatientName = admData.patientName;
    }

    this.data.admissions.unshift(newAdmission);

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'Admission',
      entityId: admissionId,
      patientMRN: admData.mrn,
      details: `Admitted patient ${admData.patientName} to ${admData.department}, Bed: ${targetBed?.number || admData.bedId}`
    });

    this.saveData(this.data);
    return newAdmission;
  }

  public transferBed(admissionId: string, toBedId: string, reason: string, userId: string, userName: string, userRole: any) {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admission not found');

    const toBed = this.data.beds.find(b => b.id === toBedId);
    if (!toBed) throw new Error('Destination bed not found');
    if (toBed.status === 'occupied' && toBed.currentAdmissionId !== admissionId) {
      throw new Error(`Target bed ${toBed.number} is already occupied!`);
    }

    const fromBed = this.data.beds.find(b => b.id === admission.bedId);
    if (fromBed) {
      fromBed.status = 'cleaning';
      fromBed.currentAdmissionId = undefined;
      fromBed.currentPatientName = undefined;
    }

    const transfer: BedTransfer = {
      id: `tr-${Date.now()}`,
      admissionId,
      fromBedId: fromBed ? fromBed.id : admission.bedId,
      fromRoom: fromBed ? `${fromBed.roomNumber} (${fromBed.number})` : admission.roomNumber,
      toBedId: toBed.id,
      toRoom: `${toBed.roomNumber} (${toBed.number})`,
      timestamp: new Date().toISOString(),
      reason,
      financialImpactNote: `Room rate changed from ${fromBed?.dailyRate || 150} LYD to ${toBed.dailyRate} LYD`,
      transferredBy: userName
    };

    admission.bedId = toBed.id;
    admission.roomNumber = toBed.roomNumber;
    admission.roomType = toBed.roomType;
    admission.bedTransfers.push(transfer);

    toBed.status = 'occupied';
    toBed.currentAdmissionId = admissionId;
    toBed.currentPatientName = admission.patientName;

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'BedTransfer',
      entityId: transfer.id,
      patientMRN: admission.mrn,
      details: `Transferred from ${transfer.fromRoom} to ${transfer.toRoom}. Reason: ${reason}`
    });

    this.saveData(this.data);
    return { admission, transfer };
  }

  // --- Clinical Assessment & Ob/Gyn ---
  public getAssessment(admissionId: string) {
    return this.data.assessments[admissionId] || null;
  }

  public saveAssessment(admissionId: string, assessment: Partial<ClinicalAssessment>, userId: string, userName: string, userRole: any) {
    const existing = this.data.assessments[admissionId];
    const updated: ClinicalAssessment = {
      id: existing ? existing.id : `ass-${admissionId}`,
      admissionId,
      chiefComplaint: assessment.chiefComplaint || '',
      chiefComplaintDuration: assessment.chiefComplaintDuration || '',
      historyOfPresentIllness: assessment.historyOfPresentIllness || '',
      systemicExam: assessment.systemicExam || {
        cardiovascular: 'Normal heart sounds',
        respiratory: 'Chest clear bilaterally',
        abdominal: 'Soft, lax',
        general: 'Alert and conscious'
      },
      obGyn: assessment.obGyn,
      vitals: existing ? existing.vitals : [],
      updatedAt: new Date().toISOString(),
      assessedBy: userName,
      pediatricGrowthRecords: assessment.pediatricGrowthRecords !== undefined ? assessment.pediatricGrowthRecords : (existing ? existing.pediatricGrowthRecords : [])
    };

    this.data.assessments[admissionId] = updated;

    this.logAudit({
      userId,
      userName,
      userRole,
      action: existing ? 'UPDATE' : 'CREATE',
      entity: 'ClinicalAssessment',
      entityId: updated.id,
      details: `Updated clinical assessment and Ob/Gyn records for admission ${admissionId}`
    });

    this.saveData(this.data);
    return updated;
  }

  public addVitals(admissionId: string, vitalsData: Omit<import('../src/types/hmis.ts').VitalSigns, 'id' | 'timestamp'>, userId: string, userName: string, userRole: any) {
    const assessment = this.data.assessments[admissionId];
    const newVitals = {
      ...vitalsData,
      id: `vit-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    if (assessment) {
      assessment.vitals.unshift(newVitals);
      assessment.updatedAt = new Date().toISOString();
    } else {
      this.data.assessments[admissionId] = {
        id: `ass-${admissionId}`,
        admissionId,
        chiefComplaint: '',
        chiefComplaintDuration: '',
        historyOfPresentIllness: '',
        systemicExam: { cardiovascular: '', respiratory: '', abdominal: '', general: '' },
        vitals: [newVitals],
        updatedAt: new Date().toISOString(),
        assessedBy: userName
      };
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'VitalSigns',
      entityId: newVitals.id,
      details: `Recorded vitals: BP ${newVitals.bpSystolic}/${newVitals.bpDiastolic}, Pulse ${newVitals.pulse}, Temp ${newVitals.temp}°C, SpO2 ${newVitals.spO2}%`
    });

    this.saveData(this.data);
    return newVitals;
  }

  // --- Management Plan ---
  public getPlans(admissionId: string) {
    return this.data.plans[admissionId] || [];
  }

  public addPlan(planData: Omit<ManagementPlan, 'id' | 'createdAt' | 'version'>, userId: string, userName: string, userRole: any) {
    const existing = this.data.plans[planData.admissionId] || [];
    const newPlan: ManagementPlan = {
      ...planData,
      id: `plan-${Date.now()}`,
      createdAt: new Date().toISOString(),
      version: existing.length + 1
    };
    if (!this.data.plans[planData.admissionId]) {
      this.data.plans[planData.admissionId] = [];
    }
    this.data.plans[planData.admissionId].unshift(newPlan);

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'ManagementPlan',
      entityId: newPlan.id,
      details: `Created management plan version ${newPlan.version}: ${newPlan.planType} - ${newPlan.procedureNature}`
    });

    this.saveData(this.data);
    return newPlan;
  }

  // --- Dietary Orders ---
  public getDietaryOrders(admissionId?: string) {
    if (admissionId) {
      return this.data.dietaryOrders.filter(d => d.admissionId === admissionId);
    }
    return this.data.dietaryOrders;
  }

  public createDietaryOrder(orderData: Omit<DietaryOrder, 'id' | 'deliveredMealsCount' | 'companionMealsCount' | 'kitchenStatus'>, userId: string, userName: string, userRole: any) {
    const newOrder: DietaryOrder = {
      ...orderData,
      id: `diet-${Date.now()}`,
      kitchenStatus: 'pending',
      deliveredMealsCount: 0,
      companionMealsCount: 0
    };
    this.data.dietaryOrders.unshift(newOrder);

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'DietaryOrder',
      entityId: newOrder.id,
      details: `Prescribed diet order: ${newOrder.dietType}${newOrder.npoReason ? ' - NPO Reason: ' + newOrder.npoReason : ''}`
    });

    this.saveData(this.data);
    return newOrder;
  }

  public updateDietaryStatus(orderId: string, kitchenStatus: 'pending' | 'prepared' | 'delivered', deliveredCountIncrement = 0, companionCountIncrement = 0) {
    const order = this.data.dietaryOrders.find(d => d.id === orderId);
    if (!order) throw new Error('Dietary order not found');
    order.kitchenStatus = kitchenStatus;
    if (deliveredCountIncrement > 0) order.deliveredMealsCount += deliveredCountIncrement;
    if (companionCountIncrement > 0) order.companionMealsCount += companionCountIncrement;
    this.saveData(this.data);
    return order;
  }

  // --- Medications & eMAR ---
  public getMedications(admissionId?: string) {
    if (admissionId) {
      return this.data.medications.filter(m => m.admissionId === admissionId);
    }
    return this.data.medications;
  }

  public prescribeMedication(orderData: Omit<MedicationOrder, 'id' | 'createdAt' | 'status'>, userId: string, userName: string, userRole: any) {
    const orderId = `med-${Date.now()}`;
    const newMed: MedicationOrder = {
      ...orderData,
      id: orderId,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    this.data.medications.unshift(newMed);

    // Auto-generate scheduled eMAR slots for the next 24-48 hours
    const times = newMed.exactTimes && newMed.exactTimes.length > 0 ? newMed.exactTimes : ['08:00', '20:00'];
    const now = new Date();
    for (const time of times) {
      const emar: EMARRecord = {
        id: `emar-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        orderId: newMed.id,
        admissionId: newMed.admissionId,
        medicationName: `${newMed.tradeName} (${newMed.genericName}) ${newMed.dose}`,
        dose: newMed.dose,
        route: newMed.route,
        scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(time.split(':')[0], 10), parseInt(time.split(':')[1] || '0', 10)).toISOString(),
        scheduledHour: time,
        status: 'scheduled'
      };
      this.data.emarRecords.unshift(emar);
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'MedicationOrder',
      entityId: newMed.id,
      details: `Prescribed: ${newMed.tradeName} (${newMed.genericName}) ${newMed.dose} ${newMed.route} ${newMed.frequency}`
    });

    this.saveData(this.data);
    return newMed;
  }

  public discontinueMedication(orderId: string, reason: string, userId: string, userName: string, userRole: any) {
    const med = this.data.medications.find(m => m.id === orderId);
    if (!med) throw new Error('Medication order not found');
    med.status = 'discontinued';
    med.discontinueReason = reason;
    med.discontinuedBy = userName;
    med.discontinuedAt = new Date().toISOString();

    // Mark remaining scheduled eMAR records as held/cancelled
    for (const emar of this.data.emarRecords) {
      if (emar.orderId === orderId && emar.status === 'scheduled') {
        emar.status = 'held';
        emar.notes = `Discontinued by doctor: ${reason}`;
      }
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'DISCONTINUE',
      entity: 'MedicationOrder',
      entityId: med.id,
      details: `Discontinued medication ${med.tradeName}. Reason: ${reason}`
    });

    this.saveData(this.data);
    return med;
  }

  public getEMAR(admissionId?: string) {
    if (admissionId) {
      return this.data.emarRecords.filter(e => e.admissionId === admissionId);
    }
    return this.data.emarRecords;
  }

  public recordEMARAdministration(
    emarId: string,
    status: 'given' | 'refused' | 'held' | 'missed' | 'delayed',
    nurseName: string,
    delayReason?: string,
    supervisorNote?: string,
    supervisorName?: string,
    notes?: string
  ) {
    const emar = this.data.emarRecords.find(e => e.id === emarId);
    if (!emar) throw new Error('eMAR record not found');

    emar.status = status;
    emar.actualGivenTime = new Date().toISOString();
    emar.administeredBy = nurseName;
    if (notes) emar.notes = notes;
    if (delayReason) emar.delayReason = delayReason;
    if (supervisorNote && supervisorName) {
      emar.supervisorApproval = {
        approvedBy: supervisorName,
        approvedAt: new Date().toISOString(),
        note: supervisorNote
      };
    }

    this.logAudit({
      userId: nurseName,
      userName: nurseName,
      userRole: 'nurse',
      action: 'UPDATE',
      entity: 'EMARRecord',
      entityId: emar.id,
      details: `eMAR administration updated: ${emar.medicationName} -> ${status.toUpperCase()}${delayReason ? ` (Delay: ${delayReason})` : ''}`
    });

    this.saveData(this.data);
    return emar;
  }

  // --- LIS Laboratory Information System ---
  public getLabOrders(admissionId?: string) {
    if (admissionId) {
      return this.data.labOrders.filter(l => l.admissionId === admissionId);
    }
    return this.data.labOrders;
  }

  public createLabOrder(orderData: Omit<LabOrder, 'id' | 'orderTime' | 'status' | 'results'>, results: import('../src/types/hmis.ts').LabTestItem[] = [], userId: string, userName: string, userRole: any) {
    const newOrder: LabOrder = {
      ...orderData,
      id: `lab-${Date.now()}`,
      orderTime: new Date().toISOString(),
      status: 'ordered',
      results: results.length > 0 ? results : [
        { name: 'Hemoglobin (Hb)', key: 'Hb', value: '--', unit: 'g/dL', refRange: '12.0 - 15.5' },
        { name: 'WBC', key: 'WBC', value: '--', unit: 'x10^9/L', refRange: '4.0 - 11.0' },
        { name: 'Platelets', key: 'PLT', value: '--', unit: 'x10^9/L', refRange: '150 - 450' }
      ]
    };

    this.data.labOrders.unshift(newOrder);

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'LabOrder',
      entityId: newOrder.id,
      details: `Ordered lab test: ${newOrder.testName} (${newOrder.urgency})`
    });

    this.saveData(this.data);
    return newOrder;
  }

  public updateLabStatus(
    orderId: string,
    status: import('../src/types/hmis.ts').LabOrderStatus,
    payload: {
      collectorName?: string;
      receiverName?: string;
      approverName?: string;
      results?: import('../src/types/hmis.ts').LabTestItem[];
    },
    userId: string,
    userName: string,
    userRole: any
  ) {
    const order = this.data.labOrders.find(l => l.id === orderId);
    if (!order) throw new Error('Lab order not found');

    order.status = status;
    const now = new Date().toISOString();

    if (status === 'sample_collected') {
      order.sampleCollectedAt = now;
      order.sampleCollectedBy = payload.collectorName || userName;
    } else if (status === 'received_in_lab') {
      order.labReceivedAt = now;
      order.labReceivedBy = payload.receiverName || userName;
    } else if (status === 'approved') {
      order.approvedAt = now;
      order.approvedBy = payload.approverName || userName;
      if (payload.results && payload.results.length > 0) {
        order.results = payload.results;
      }
    } else if (payload.results) {
      order.results = payload.results;
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'LabOrder',
      entityId: order.id,
      details: `Lab order status advanced to ${status.toUpperCase()} by ${userName}`
    });

    this.saveData(this.data);
    return order;
  }

  public acknowledgeLabCriticalAlert(orderId: string, doctorName: string) {
    const order = this.data.labOrders.find(l => l.id === orderId);
    if (!order) throw new Error('Lab order not found');
    order.criticalAlertAcknowledged = true;
    order.criticalAlertAcknowledgedBy = doctorName;
    this.logAudit({
      userId: doctorName,
      userName: doctorName,
      userRole: 'consultant',
      action: 'VIEW',
      entity: 'LabOrder',
      entityId: order.id,
      details: `Critical lab alert acknowledged by ${doctorName}`
    });
    this.saveData(this.data);
    return order;
  }

  // --- Operative & Anesthesia ---
  public getOperativeReports(admissionId?: string) {
    if (admissionId) {
      return this.data.operativeReports.filter(o => o.admissionId === admissionId);
    }
    return this.data.operativeReports;
  }

  public saveOperativeReport(reportData: OperativeReport, userId: string, userName: string, userRole: any) {
    const index = this.data.operativeReports.findIndex(o => o.id === reportData.id);
    if (index >= 0) {
      this.data.operativeReports[index] = reportData;
    } else {
      this.data.operativeReports.unshift(reportData);
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: index >= 0 ? 'UPDATE' : 'CREATE',
      entity: 'OperativeReport',
      entityId: reportData.id,
      details: `Saved surgical operative record: ${reportData.procedureName} by ${reportData.leadSurgeon}`
    });

    this.saveData(this.data);
    return reportData;
  }

  public getAnesthesiaRecords(admissionId?: string) {
    if (admissionId) {
      return this.data.anesthesiaRecords.filter(a => a.admissionId === admissionId);
    }
    return this.data.anesthesiaRecords;
  }

  public saveAnesthesiaRecord(recordData: AnesthesiaRecord, userId: string, userName: string, userRole: any) {
    const index = this.data.anesthesiaRecords.findIndex(a => a.id === recordData.id);
    if (index >= 0) {
      this.data.anesthesiaRecords[index] = recordData;
    } else {
      this.data.anesthesiaRecords.unshift(recordData);
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: index >= 0 ? 'UPDATE' : 'CREATE',
      entity: 'AnesthesiaRecord',
      entityId: recordData.id,
      details: `Saved anesthesia record (${recordData.anesthesiaType}, ${recordData.asaScore}) by ${recordData.anesthesiologist}`
    });

    this.saveData(this.data);
    return recordData;
  }

  // --- Pharmacy & Stock ---
  public getPharmacyItems() {
    return this.data.pharmacyItems;
  }

  public getDispenseRecords(admissionId?: string) {
    if (admissionId) {
      return this.data.dispenseRecords.filter(d => d.admissionId === admissionId);
    }
    return this.data.dispenseRecords;
  }

  public dispenseItem(admissionId: string, itemId: string, quantity: number, pharmacistName: string, coveredByPackage: boolean) {
    const item = this.data.pharmacyItems.find(p => p.id === itemId);
    if (!item) throw new Error('Pharmacy item not found');
    if (item.stockLevel < quantity) {
      throw new Error(`Insufficient stock for ${item.tradeName}. Available: ${item.stockLevel}`);
    }

    item.stockLevel -= quantity;
    const record: DispenseRecord = {
      id: `disp-${Date.now()}`,
      admissionId,
      itemId: item.id,
      itemName: `${item.tradeName} (${item.scientificName}) ${item.strength}`,
      quantity,
      unitPrice: item.sellingPrice,
      totalPrice: item.sellingPrice * quantity,
      dispensedBy: pharmacistName,
      timestamp: new Date().toISOString(),
      coveredByPackage
    };

    this.data.dispenseRecords.unshift(record);

    this.logAudit({
      userId: pharmacistName,
      userName: pharmacistName,
      userRole: 'pharmacist',
      action: 'CREATE',
      entity: 'DispenseRecord',
      entityId: record.id,
      details: `Dispensed ${quantity}x ${item.tradeName} for admission ${admissionId}. Stock reduced to ${item.stockLevel}.`
    });

    this.saveData(this.data);
    return record;
  }

  public returnDispensedItem(recordId: string, reason: string, pharmacistName: string) {
    const record = this.data.dispenseRecords.find(d => d.id === recordId);
    if (!record) throw new Error('Dispense record not found');
    if (record.isReturned) throw new Error('Item is already returned');

    const item = this.data.pharmacyItems.find(p => p.id === record.itemId);
    if (item) {
      item.stockLevel += record.quantity;
    }

    record.isReturned = true;
    record.returnReason = reason;
    record.returnedAt = new Date().toISOString();

    this.logAudit({
      userId: pharmacistName,
      userName: pharmacistName,
      userRole: 'pharmacist',
      action: 'UPDATE',
      entity: 'DispenseRecord',
      entityId: record.id,
      details: `Returned item ${record.itemName} (Qty: ${record.quantity}). Reason: ${reason}`
    });

    this.saveData(this.data);
    return record;
  }

  // --- Consultations ---
  public getConsultations(admissionId?: string) {
    if (admissionId) {
      return this.data.consultations.filter(c => c.admissionId === admissionId);
    }
    return this.data.consultations;
  }

  public createConsultation(consData: Omit<Consultation, 'id' | 'requestTime' | 'status'>, userId: string, userName: string, userRole: any) {
    const newCons: Consultation = {
      ...consData,
      id: `cons-${Date.now()}`,
      requestTime: new Date().toISOString(),
      status: 'requested'
    };
    this.data.consultations.unshift(newCons);

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'Consultation',
      entityId: newCons.id,
      details: `Requested consultation in ${newCons.specialty} for patient ${newCons.patientName}`
    });

    this.saveData(this.data);
    return newCons;
  }

  public completeConsultation(consId: string, consultantName: string, findings: string, recommendations: string, ordersPlaced?: string) {
    const cons = this.data.consultations.find(c => c.id === consId);
    if (!cons) throw new Error('Consultation not found');

    cons.consultantName = consultantName;
    cons.findings = findings;
    cons.recommendations = recommendations;
    if (ordersPlaced) cons.ordersPlaced = ordersPlaced;
    cons.status = 'completed';
    cons.arrivalTime = new Date().toISOString();

    this.logAudit({
      userId: consultantName,
      userName: consultantName,
      userRole: 'consultant',
      action: 'UPDATE',
      entity: 'Consultation',
      entityId: cons.id,
      details: `Consultation report completed by ${consultantName}`
    });

    this.saveData(this.data);
    return cons;
  }

  // --- Packages ---
  public getPackages(): MedicalPackage[] {
    return this.data.packages;
  }

  public createPackage(pkg: Omit<MedicalPackage, 'id'>, userId: string, userName: string, userRole: any): MedicalPackage {
    const id = `pkg-${Date.now()}`;
    const newPkg: MedicalPackage = {
      ...pkg,
      id
    };
    this.data.packages.push(newPkg);
    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'MedicalPackage',
      entityId: id,
      details: `Created new medical package: ${newPkg.nameAr} (${newPkg.code}) with total price ${newPkg.totalPrice} LYD`
    });
    this.saveData(this.data);
    return newPkg;
  }

  public updatePackage(id: string, pkgData: Partial<MedicalPackage>, userId: string, userName: string, userRole: any): MedicalPackage {
    const pkg = this.data.packages.find(p => p.id === id);
    if (!pkg) throw new Error('Package not found');
    Object.assign(pkg, pkgData);
    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'MedicalPackage',
      entityId: id,
      details: `Updated medical package: ${pkg.nameAr} (${pkg.code}) price: ${pkg.totalPrice} LYD`
    });
    this.saveData(this.data);
    return pkg;
  }

  public deletePackage(id: string, userId: string, userName: string, userRole: any): boolean {
    const idx = this.data.packages.findIndex(p => p.id === id);
    if (idx < 0) throw new Error('Package not found');
    const removed = this.data.packages.splice(idx, 1)[0];
    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'LOGICAL_DELETE',
      entity: 'MedicalPackage',
      entityId: id,
      details: `Deleted medical package: ${removed.nameAr} (${removed.code})`
    });
    this.saveData(this.data);
    return true;
  }

  // --- Provisional Inpatient Invoice Engine (Ch. 25) ---
  public generateProvisionalInvoice(admissionId: string, customCutoffTime?: string): ProvisionalInvoice {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admission not found');

    const patient = this.getPatientByMRN(admission.mrn);
    const now = new Date();
    
    // Default cutoff policy: 11:00 AM of today or specified time
    const cutoffDate = customCutoffTime ? new Date(customCutoffTime) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);
    const cutoffFormatted = `${cutoffDate.toISOString().split('T')[0]} 11:00 AM`;

    const items: BillingLineItem[] = [];

    // 1. Hotel Inpatient Stay calculation (Ch. 16.4)
    // Rule: Day 1 full day; extra days split into three 8-hour shifts (00-08, 08-16, 16-24)
    const admStart = new Date(admission.admissionDate);
    const effectiveEnd = now > cutoffDate ? cutoffDate : now;
    const totalHours = Math.max(1, (effectiveEnd.getTime() - admStart.getTime()) / (1000 * 60 * 60));
    
    const bed = this.data.beds.find(b => b.id === admission.bedId);
    const roomRate = bed ? bed.dailyRate : (admission.roomType === 'vip' ? 350 : 150);

    let daysCharged = 1;
    if (totalHours > 24) {
      const extraHours = totalHours - 24;
      const extraShifts = Math.ceil(extraHours / 8); // each shift is 1/3 day
      daysCharged = 1 + (extraShifts * (1 / 3));
    }
    const roundedDays = Math.round(daysCharged * 100) / 100;

    items.push({
      id: `bill-room-${Date.now()}`,
      category: 'room',
      description: `Inpatient Accommodation (${admission.roomType.toUpperCase()} - ${roundedDays} days)`,
      descriptionAr: `إقامة فندقية بالقسم (${admission.roomNumber} - فئة ${admission.roomType} - ${roundedDays} يوم)`,
      date: admission.admissionDate.split('T')[0],
      quantity: roundedDays,
      unitPrice: roomRate,
      totalPrice: Math.round(roundedDays * roomRate),
      coveredByPackage: !!admission.packageId
    });

    // 2. Doctor Daily Rounds (Ch. 16.1)
    // Rule: 1 paid visit per day under "Medical Supervision" (200 LYD: 100 doctor / 100 clinic). No duplicate charge in same day!
    const daysSinceAdm = Math.max(1, Math.ceil(totalHours / 24));
    items.push({
      id: `bill-doc-round`,
      category: 'doctor_visit',
      description: `Daily Attending Medical Rounds (${daysSinceAdm} visits)`,
      descriptionAr: `الإشراف الطبي والمتابعة اليومية للاستشاري (${daysSinceAdm} زيارات مقيدة)`,
      date: now.toISOString().split('T')[0],
      quantity: daysSinceAdm,
      unitPrice: 200,
      totalPrice: daysSinceAdm * 200,
      coveredByPackage: !!admission.packageId
    });

    // 3. Daily Nursing Fee (Ch. 16.3)
    // Rule: 20 LYD per day
    items.push({
      id: `bill-nurse`,
      category: 'nursing',
      description: `Daily Ward Nursing Care (${daysSinceAdm} days)`,
      descriptionAr: `خدمات ورعاية التمريض اليومية (${daysSinceAdm} أيام)`,
      date: now.toISOString().split('T')[0],
      quantity: daysSinceAdm,
      unitPrice: 20,
      totalPrice: daysSinceAdm * 20,
      coveredByPackage: !!admission.packageId
    });

    // 4. Consultations (Ch. 16.2)
    const consList = this.getConsultations(admissionId).filter(c => c.status === 'completed');
    for (const c of consList) {
      items.push({
        id: `bill-cons-${c.id}`,
        category: 'consultation',
        description: `Specialist Consultation: ${c.specialty} (${c.consultantName || 'Attending'})`,
        descriptionAr: `أتعاب استشارة تخصصية: ${c.specialty} (${c.consultantName || 'استشاري مستدعى'})`,
        date: c.requestTime.split('T')[0],
        quantity: 1,
        unitPrice: c.feeAmount,
        totalPrice: c.feeAmount,
        coveredByPackage: false
      });
    }

    // 5. Surgeries & Anesthesia (Ch. 22 & 23)
    const opReports = this.getOperativeReports(admissionId);
    for (const op of opReports) {
      items.push({
        id: `bill-op-${op.id}`,
        category: 'surgery',
        description: `Surgical Procedure: ${op.procedureName}`,
        descriptionAr: `أتعاب وتجهيز غرفة العمليات: ${op.procedureName}`,
        date: op.startTime.split('T')[0],
        quantity: 1,
        unitPrice: 1500,
        totalPrice: 1500,
        coveredByPackage: !!admission.packageId
      });
    }

    // 6. Laboratory (Ch. 7)
    const labs = this.getLabOrders(admissionId).filter(l => l.status === 'approved');
    for (const l of labs) {
      const isRoutineCBC = l.testName.includes('CBC');
      const testPrice = isRoutineCBC ? 40 : 60;
      items.push({
        id: `bill-lab-${l.id}`,
        category: 'lab',
        description: `Laboratory: ${l.testName}`,
        descriptionAr: `فحوصات وتحاليل مخبرية: ${l.testName}`,
        date: l.orderTime.split('T')[0],
        quantity: 1,
        unitPrice: testPrice,
        totalPrice: testPrice,
        coveredByPackage: !!admission.packageId && isRoutineCBC
      });
    }

    // 7. Pharmacy & Supplies (Ch. 19)
    const dispenses = this.getDispenseRecords(admissionId).filter(d => !d.isReturned);
    for (const d of dispenses) {
      items.push({
        id: `bill-disp-${d.id}`,
        category: 'pharmacy',
        description: `Pharmacy: ${d.itemName} (x${d.quantity})`,
        descriptionAr: `صيدلية ومستلزمات: ${d.itemName} (كمية ${d.quantity})`,
        date: d.timestamp.split('T')[0],
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        totalPrice: d.totalPrice,
        coveredByPackage: d.coveredByPackage
      });
    }

    // 8. Meals & NPO Deductions (Ch. 8 & 16.5)
    // Rule: If NPO ordered, unserved patient meals are NOT charged. Companion meals charged at 20 LYD.
    const dietOrders = this.getDietaryOrders(admissionId);
    let totalCompanionMeals = 0;
    let totalPatientMealsDelivered = 0;
    let hasNPO = false;

    for (const diet of dietOrders) {
      totalCompanionMeals += diet.companionMealsCount;
      totalPatientMealsDelivered += diet.deliveredMealsCount;
      if (diet.dietType === 'npo') hasNPO = true;
    }

    if (totalCompanionMeals > 0) {
      items.push({
        id: `bill-companion-meals`,
        category: 'companion',
        description: `Companion Meals (${totalCompanionMeals} meals)`,
        descriptionAr: `وجبات المرافق المسجلة (${totalCompanionMeals} وجبات)`,
        date: now.toISOString().split('T')[0],
        quantity: totalCompanionMeals,
        unitPrice: 20,
        totalPrice: totalCompanionMeals * 20,
        coveredByPackage: false
      });
    }

    if (hasNPO) {
      items.push({
        id: `bill-npo-credit`,
        category: 'meals',
        description: `NPO Dietary Order Credit (Meals not served due to fasting)`,
        descriptionAr: `تسوية عدم تقديم وجبات للمريض بموجب أمر الصيام الطبي NPO`,
        date: now.toISOString().split('T')[0],
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        coveredByPackage: true,
        isNpoDeduction: true
      });
    }

    // Package calculations
    let totalBilled = 0;
    let totalPackageCovered = 0;

    const pkg = admission.packageId ? this.data.packages.find(p => p.id === admission.packageId) : undefined;

    for (const item of items) {
      totalBilled += item.totalPrice;
      if (item.coveredByPackage) {
        totalPackageCovered += item.totalPrice;
      }
    }

    // If package is applied, patient payable = Package Base Price + Uncovered Extra Items
    let totalPayableBeforeDiscounts = totalBilled;
    if (pkg) {
      const uncoveredExtra = totalBilled - totalPackageCovered;
      totalPayableBeforeDiscounts = pkg.totalPrice + uncoveredExtra;
    }

    const receipts = this.data.paymentReceipts.filter(r => r.admissionId === admissionId);
    const totalPaymentsReceived = receipts.reduce((sum, r) => sum + r.amount, 0);
    const provisionalBalanceDue = Math.max(0, totalPayableBeforeDiscounts - totalPaymentsReceived);

    return {
      admissionId,
      patientName: admission.patientName,
      mrn: admission.mrn,
      roomNumber: admission.roomNumber,
      admissionDate: admission.admissionDate,
      cutoffTime: cutoffFormatted,
      generatedAt: now.toISOString(),
      items,
      packageApplied: pkg ? {
        packageId: pkg.id,
        packageName: pkg.nameAr,
        packagePrice: pkg.totalPrice,
        includedUsedSummary: `يشمل إقامة ${pkg.includedDays} يوم، وأتعاب الجراحة، والإشراف، وتمريض القسم، وفحوصات روتينية`
      } : undefined,
      totalBilled,
      totalPackageCovered,
      totalPayableBeforeDiscounts,
      totalPaymentsReceived,
      provisionalBalanceDue,
      mandatoryNoticeAr: '«هذه فاتورة مالية مبدئية توضح التكاليف المسجلة في النظام حتى تاريخ ووقت القطع الموضحين أعلاه، ولا تمثل القيمة النهائية المستحقة على المريض. قد تضاف لاحقاً تكاليف خدمات أو إجراءات أو أدوية أو مستلزمات نُفذت ولم تكن قد سُجلت أو اعتمدت حتى وقت إصدار هذا الكشف. يتم تحديد الحساب النهائي بعد اكتمال جميع الخدمات والتسويات المالية عند الخروج.»',
      mandatoryNoticeEn: 'This is a provisional inpatient invoice reflecting charges recorded in the system up to the stated cut-off time. It does not represent final settlement. Additional procedure, medication, lab, or room charges may be posted before final discharge clearance.'
    };
  }

  public addPayment(admissionId: string, amount: number, paymentMethod: any, receivedBy: string, notes?: string) {
    const receipt: PaymentReceipt = {
      id: `rcpt-${Date.now()}`,
      admissionId,
      amount,
      paymentMethod,
      receivedBy,
      receiptNumber: `RC-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      notes
    };
    this.data.paymentReceipts.unshift(receipt);
    this.logAudit({
      userId: receivedBy,
      userName: receivedBy,
      userRole: 'accountant',
      action: 'CREATE',
      entity: 'PaymentReceipt',
      entityId: receipt.id,
      details: `Received payment of ${amount} LYD via ${paymentMethod} (Receipt: ${receipt.receiptNumber})`
    });
    this.saveData(this.data);
    return receipt;
  }

  // --- Comprehensive Hospital Financial Accounting & General Ledger ---

  public getPaymentReceipts(admissionId?: string): PaymentReceipt[] {
    if (admissionId) {
      return this.data.paymentReceipts.filter(r => r.admissionId === admissionId);
    }
    return this.data.paymentReceipts;
  }

  public getDisbursementVouchers(): DisbursementVoucher[] {
    if (!this.data.disbursementVouchers) {
      // Seed initial realistic disbursements
      this.data.disbursementVouchers = [
        {
          id: 'pv-001',
          voucherNumber: 'PV-2026-0041',
          date: '2026-11-06',
          beneficiary: 'د. طارق بن عامر',
          beneficiaryType: 'doctor',
          category: 'doctor_commission',
          amount: 2500,
          paymentMethod: 'Cash',
          accountCode: '5102',
          accountNameAr: 'أتعاب وأجور الأطباء والجراحين',
          description: 'صرف دفعة من مستحقات العمليات القيصرية والتوليد لشهر نوفمبر',
          approvedBy: 'د. سالم بن زياد (المدير العام)',
          issuedBy: 'مصطفى السنوسي (رئيس قسم الحسابات)',
          timestamp: '2026-11-06T14:30:00Z',
          notes: 'تسوية جزئية للعمليات المنجزة'
        },
        {
          id: 'pv-002',
          voucherNumber: 'PV-2026-0042',
          date: '2026-11-05',
          beneficiary: 'شركة الأوائل لتوريد الأدوية والمستلزمات الطبية',
          beneficiaryType: 'vendor',
          category: 'medical_supplies',
          amount: 1850,
          paymentMethod: 'Bank Transfer',
          bankName: 'مصرف الجمهورية - فرع الميدان',
          accountCode: '5101',
          accountNameAr: 'تكلفة الأدوية والمستهلكات الطبية',
          description: 'سداد فاتورة توريد محاليل وخيوط جراحية لغرفة العمليات',
          approvedBy: 'د. سالم بن زياد',
          issuedBy: 'مصطفى السنوسي',
          timestamp: '2026-11-05T11:15:00Z',
          notes: 'إشعار تحويل مصرفي رقم #TR-9902'
        },
        {
          id: 'pv-003',
          voucherNumber: 'PV-2026-0043',
          date: '2026-11-04',
          beneficiary: 'مؤسسة النسيم للغازات الطبية والأكسجين',
          beneficiaryType: 'utility',
          category: 'maintenance',
          amount: 600,
          paymentMethod: 'Cash',
          accountCode: '5104',
          accountNameAr: 'صيانة الأجهزة وشبكة الغازات الطبية',
          description: 'تعبئة وصيانة أسطوانات وشبكة الأكسجين الطبي المركزية بالقسم',
          approvedBy: 'د. سالم بن زياد',
          issuedBy: 'مصطفى السنوسي',
          timestamp: '2026-11-04T16:00:00Z'
        }
      ];
      this.saveData(this.data);
    }
    return this.data.disbursementVouchers;
  }

  public addDisbursementVoucher(voucherData: Omit<DisbursementVoucher, 'id' | 'voucherNumber' | 'timestamp'>, userId: string, userName: string, userRole: any): DisbursementVoucher {
    const vouchers = this.getDisbursementVouchers();
    const count = vouchers.length + 44;
    const newVoucher: DisbursementVoucher = {
      ...voucherData,
      id: `pv-${Date.now()}`,
      voucherNumber: `PV-2026-00${count}`,
      timestamp: new Date().toISOString()
    };
    this.data.disbursementVouchers!.unshift(newVoucher);
    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'DisbursementVoucher',
      entityId: newVoucher.id,
      details: `Issued disbursement voucher ${newVoucher.voucherNumber} of ${newVoucher.amount} LYD to ${newVoucher.beneficiary} (${newVoucher.category})`
    });
    this.saveData(this.data);
    return newVoucher;
  }

  public getDoctorSettlements(): DoctorSettlement[] {
    const doctors = [
      { id: 'usr-1', name: 'د. طارق بن عامر', specialty: 'استشاري أول نساء وتوليد وجراحة' },
      { id: 'usr-2', name: 'د. هدى المنصوري', specialty: 'أخصائية نساء وتوليد' },
      { id: 'usr-4', name: 'د. وليد القمودي', specialty: 'استشاري التخدير والعناية الفائقة' },
      { id: 'usr-3', name: 'د. سارة الكيلاني', specialty: 'أخصائية طب الأطفال وحديثي الولادة' }
    ];

    const vouchers = this.getDisbursementVouchers();

    return doctors.map(doc => {
      const cases: DoctorSettlementCase[] = [];
      let totalEarned = 0;

      // 1. Surgical Procedures
      for (const op of this.data.operativeReports) {
        const admission = this.data.admissions.find(a => a.admissionId === op.admissionId);
        const patientName = admission?.patientName || 'مريضة مقيمة';

        if (op.leadSurgeon && (op.leadSurgeon.includes(doc.name) || op.leadSurgeon.includes(doc.name.split(' ')[1] || ''))) {
          const docShare = 1000;
          const hospShare = 500;
          totalEarned += docShare;
          cases.push({
            admissionId: op.admissionId,
            patientName: patientName,
            date: op.startTime.split('T')[0],
            serviceType: 'surgery',
            serviceName: `عملية جراحية: ${op.procedureName}`,
            totalFee: 1500,
            hospitalShare: hospShare,
            doctorShare: docShare,
            status: 'pending'
          });
        }
        if (doc.id === 'usr-4' && op.anesthesiologist && (op.anesthesiologist.includes('وليد') || op.anesthesiologist.includes(doc.name))) {
          const anesFee = 350;
          totalEarned += anesFee;
          cases.push({
            admissionId: op.admissionId,
            patientName: patientName,
            date: op.startTime.split('T')[0],
            serviceType: 'surgery',
            serviceName: `أتعاب تخدير: ${op.procedureName}`,
            totalFee: 450,
            hospitalShare: 100,
            doctorShare: anesFee,
            status: 'pending'
          });
        }
      }

      // 2. Daily Attending Doctor Rounds (Ch. 16.1: 200 LYD = 100 Doctor / 100 Hospital)
      for (const adm of this.data.admissions) {
        if (adm.attendingConsultantName.includes(doc.name) || adm.attendingConsultantName.includes(doc.name.split(' ')[1] || '')) {
          const admDate = new Date(adm.admissionDate);
          const days = Math.max(1, Math.ceil((Date.now() - admDate.getTime()) / (1000 * 60 * 60 * 24)));
          const roundFee = 100 * days;
          totalEarned += roundFee;
          cases.push({
            admissionId: adm.admissionId,
            patientName: adm.patientName,
            date: adm.admissionDate.split('T')[0],
            serviceType: 'rounds',
            serviceName: `إشراف طبي ومرور سريري يومي (${days} زيارات)`,
            totalFee: 200 * days,
            hospitalShare: 100 * days,
            doctorShare: roundFee,
            status: 'pending'
          });
        }
      }

      // 3. Specialty Consultations
      for (const cons of this.data.consultations) {
        if (cons.consultantName?.includes(doc.name) || cons.specialty.includes(doc.specialty.slice(0, 5))) {
          const fee = cons.feeAmount || 120;
          totalEarned += fee;
          cases.push({
            admissionId: cons.admissionId,
            patientName: cons.patientName,
            date: cons.requestTime.split('T')[0],
            serviceType: 'consultation',
            serviceName: `استشارة تخصصية: ${cons.specialty}`,
            totalFee: fee,
            hospitalShare: 20,
            doctorShare: fee - 20,
            status: cons.status === 'completed' ? 'pending' : 'pending'
          });
        }
      }

      // Paid disbursements to this doctor
      const paidVouchers = vouchers.filter(v => v.beneficiary.includes(doc.name) || v.beneficiary.includes(doc.name.split(' ')[1] || ''));
      const totalPaid = paidVouchers.reduce((sum, v) => sum + v.amount, 0);
      const pendingBalance = Math.max(0, totalEarned - totalPaid);

      return {
        doctorId: doc.id,
        doctorName: doc.name,
        specialty: doc.specialty,
        totalCases: cases.length,
        totalEarned,
        totalPaid,
        pendingBalance,
        cases,
        lastPaymentDate: paidVouchers[0]?.date
      };
    });
  }

  public settleDoctorPayment(doctorId: string, amount: number, paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque', notes: string, userId: string, userName: string, userRole: any): DisbursementVoucher {
    const settlements = this.getDoctorSettlements();
    const doc = settlements.find(d => d.doctorId === doctorId);
    if (!doc) throw new Error('Doctor not found');

    const voucher = this.addDisbursementVoucher({
      date: new Date().toISOString().split('T')[0],
      beneficiary: doc.doctorName,
      beneficiaryType: 'doctor',
      category: 'doctor_commission',
      amount,
      paymentMethod,
      accountCode: '5102',
      accountNameAr: 'أتعاب وأجور الأطباء والجراحين',
      description: `تسوية أتعاب طبية وسريرية للاستشاري ${doc.doctorName} (${notes || 'صرف أتعاب'})`,
      approvedBy: 'د. سالم بن زياد (المدير العام)',
      issuedBy: userName,
      notes
    }, userId, userName, userRole);

    return voucher;
  }

  public getCorporateClaims(): CorporateClaim[] {
    if (!this.data.corporateClaims) {
      this.data.corporateClaims = [
        {
          id: 'clm-001',
          claimNumber: 'CLM-2026-901',
          corporateName: 'شركة المدار الجديد للاتصالات (Al-Madar)',
          corporateContractNo: 'CTR-MADAR-2026-44',
          admissionId: 'ADM-2026-4401',
          patientName: 'مريم سالم الترهوني',
          mrn: 'MRN-2026-0811',
          submissionDate: '2026-11-05',
          totalBilledAmount: 4320,
          patientCopayDeductible: 432,
          netCorporateClaim: 3888,
          status: 'approved',
          letterOfGuaranteeNo: 'LG-MADAR-98102',
          approvedAmount: 3888,
          paidAmount: 1000,
          outstandingBalance: 2888,
          notes: 'تم استلام الدفعة الأولى بموجب خطاب الضمان المعتمد'
        },
        {
          id: 'clm-002',
          claimNumber: 'CLM-2026-902',
          corporateName: 'شركة البريقة لتسويق النفط (Brega Petroleum)',
          corporateContractNo: 'CTR-BREGA-2026-18',
          admissionId: 'ADM-2026-4403',
          patientName: 'أسماء المختار الفيتوري',
          mrn: 'MRN-2026-0813',
          submissionDate: '2026-11-06',
          totalBilledAmount: 3650,
          patientCopayDeductible: 365,
          netCorporateClaim: 3285,
          status: 'submitted',
          letterOfGuaranteeNo: 'LG-BREGA-4419',
          approvedAmount: 3285,
          paidAmount: 0,
          outstandingBalance: 3285,
          notes: 'مطالبة ولادة قيصرية تحت المراجعة الفنية لدى إدارة التأمين'
        },
        {
          id: 'clm-003',
          claimNumber: 'CLM-2026-903',
          corporateName: 'مصرف ليبيا المركزي - صندوق التأمين الصحي',
          corporateContractNo: 'CTR-CBL-2026-05',
          admissionId: 'ADM-2026-4405',
          patientName: 'خديجة المهدي السنوسي',
          mrn: 'MRN-2026-0815',
          submissionDate: '2026-11-03',
          totalBilledAmount: 2800,
          patientCopayDeductible: 0,
          netCorporateClaim: 2800,
          status: 'settled',
          letterOfGuaranteeNo: 'LG-CBL-1109',
          approvedAmount: 2800,
          paidAmount: 2800,
          outstandingBalance: 0,
          notes: 'تم التحويل المصرفي بالكامل وتسوية المطالبة'
        }
      ];
      this.saveData(this.data);
    }
    return this.data.corporateClaims;
  }

  public settleCorporateClaim(claimId: string, amount: number, paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque', reference: string, userId: string, userName: string, userRole: any): CorporateClaim {
    const claims = this.getCorporateClaims();
    const claim = claims.find(c => c.id === claimId);
    if (!claim) throw new Error('Claim not found');

    claim.paidAmount += amount;
    claim.outstandingBalance = Math.max(0, claim.approvedAmount - claim.paidAmount);
    claim.status = claim.outstandingBalance <= 0 ? 'settled' : 'partially_settled';

    // Record as PaymentReceipt in the system
    this.addPayment(claim.admissionId, amount, paymentMethod as any, userName, `سداد مطالبة شركة التأمين: ${claim.corporateName} (مرجع: ${reference})`);

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'CorporateClaim',
      entityId: claim.id,
      details: `Settled ${amount} LYD for corporate claim ${claim.claimNumber} (${claim.corporateName}). Remaining: ${claim.outstandingBalance} LYD`
    });

    this.saveData(this.data);
    return claim;
  }

  public getChartOfAccounts(): AccountChartItem[] {
    const overview = this.getFinancialOverview();

    return [
      // 1. ASSETS
      {
        code: '1000',
        nameAr: 'الأصول والموجودات',
        nameEn: 'Total Assets',
        type: 'asset',
        level: 1,
        debitTotal: 184500,
        creditTotal: 0,
        balance: 184500,
        normalBalance: 'debit',
        categoryGroupAr: 'الأصول'
      },
      {
        code: '1100',
        nameAr: 'النقدية وما في حكمها',
        nameEn: 'Cash & Cash Equivalents',
        type: 'asset',
        parentCode: '1000',
        level: 2,
        debitTotal: overview.cashDrawerBalance + overview.bankAccountBalance,
        creditTotal: 0,
        balance: overview.cashDrawerBalance + overview.bankAccountBalance,
        normalBalance: 'debit',
        categoryGroupAr: 'الأصول المتداولة'
      },
      {
        code: '1101',
        nameAr: 'خزينة المستشفى النقدية الرئيسية',
        nameEn: 'Main Hospital Cash Drawer',
        type: 'asset',
        parentCode: '1100',
        level: 3,
        debitTotal: overview.cashDrawerBalance,
        creditTotal: 0,
        balance: overview.cashDrawerBalance,
        normalBalance: 'debit',
        categoryGroupAr: 'الأصول المتداولة'
      },
      {
        code: '1102',
        nameAr: 'حساب مصرف الجمهورية - فرع طرابلس',
        nameEn: 'Jumhouria Bank Main Account',
        type: 'asset',
        parentCode: '1100',
        level: 3,
        debitTotal: overview.bankAccountBalance,
        creditTotal: 0,
        balance: overview.bankAccountBalance,
        normalBalance: 'debit',
        categoryGroupAr: 'الأصول المتداولة'
      },
      {
        code: '1200',
        nameAr: 'الذمم المدينة والعملاء',
        nameEn: 'Accounts Receivable',
        type: 'asset',
        parentCode: '1000',
        level: 2,
        debitTotal: overview.totalPatientReceivables + overview.totalCorporateReceivables,
        creditTotal: 0,
        balance: overview.totalPatientReceivables + overview.totalCorporateReceivables,
        normalBalance: 'debit',
        categoryGroupAr: 'الأصول المتداولة'
      },
      {
        code: '1201',
        nameAr: 'ذمم المرضى المنومين (إيواء)',
        nameEn: 'Inpatient Accounts Receivable',
        type: 'asset',
        parentCode: '1200',
        level: 3,
        debitTotal: overview.totalPatientReceivables,
        creditTotal: 0,
        balance: overview.totalPatientReceivables,
        normalBalance: 'debit',
        categoryGroupAr: 'الأصول المتداولة'
      },
      {
        code: '1202',
        nameAr: 'مطالبات شركات التأمين والجهات الضامنة',
        nameEn: 'Corporate & Insurance Claims Receivable',
        type: 'asset',
        parentCode: '1200',
        level: 3,
        debitTotal: overview.totalCorporateReceivables,
        creditTotal: 0,
        balance: overview.totalCorporateReceivables,
        normalBalance: 'debit',
        categoryGroupAr: 'الأصول المتداولة'
      },
      {
        code: '1300',
        nameAr: 'المخزون الطبي ومستودع الأدوية',
        nameEn: 'Medical & Pharmacy Inventory',
        type: 'asset',
        parentCode: '1000',
        level: 2,
        debitTotal: 48500,
        creditTotal: 0,
        balance: 48500,
        normalBalance: 'debit',
        categoryGroupAr: 'المخزون'
      },

      // 2. LIABILITIES
      {
        code: '2000',
        nameAr: 'الخصوم والالتزامات',
        nameEn: 'Total Liabilities',
        type: 'liability',
        level: 1,
        debitTotal: 0,
        creditTotal: 34200,
        balance: 34200,
        normalBalance: 'credit',
        categoryGroupAr: 'الالتزامات'
      },
      {
        code: '2100',
        nameAr: 'مستحقات موردي الأدوية والمستلزمات',
        nameEn: 'Accounts Payable - Medical Vendors',
        type: 'liability',
        parentCode: '2000',
        level: 2,
        debitTotal: 0,
        creditTotal: 18200,
        balance: 18200,
        normalBalance: 'credit',
        categoryGroupAr: 'الالتزامات المتداولة'
      },
      {
        code: '2200',
        nameAr: 'أمانات وودائع المرضى المعلقة',
        nameEn: 'Patient Inpatient Deposits',
        type: 'liability',
        parentCode: '2000',
        level: 2,
        debitTotal: 0,
        creditTotal: 4500,
        balance: 4500,
        normalBalance: 'credit',
        categoryGroupAr: 'الالتزامات المتداولة'
      },
      {
        code: '2300',
        nameAr: 'مستحقات وأتعاب الأطباء المعلقة',
        nameEn: 'Accrued Doctor Fees Payable',
        type: 'liability',
        parentCode: '2000',
        level: 2,
        debitTotal: 0,
        creditTotal: overview.totalDoctorLiabilities,
        balance: overview.totalDoctorLiabilities,
        normalBalance: 'credit',
        categoryGroupAr: 'الالتزامات المتداولة'
      },

      // 3. EQUITY
      {
        code: '3000',
        nameAr: 'حقوق الملكية ورأس المال',
        nameEn: 'Owners Equity',
        type: 'equity',
        level: 1,
        debitTotal: 0,
        creditTotal: 150000,
        balance: 150000,
        normalBalance: 'credit',
        categoryGroupAr: 'حقوق الملكية'
      },

      // 4. REVENUES
      {
        code: '4000',
        nameAr: 'الإيرادات الطبية والتشغيلية',
        nameEn: 'Medical Operating Revenues',
        type: 'revenue',
        level: 1,
        debitTotal: 0,
        creditTotal: overview.totalGrossRevenue,
        balance: overview.totalGrossRevenue,
        normalBalance: 'credit',
        categoryGroupAr: 'الإيرادات'
      },
      {
        code: '4101',
        nameAr: 'إيرادات الإقامة الفندقية والأسرّة',
        nameEn: 'Inpatient Accommodation Revenue',
        type: 'revenue',
        parentCode: '4000',
        level: 2,
        debitTotal: 0,
        creditTotal: Math.round(overview.totalGrossRevenue * 0.28),
        balance: Math.round(overview.totalGrossRevenue * 0.28),
        normalBalance: 'credit',
        categoryGroupAr: 'الإيرادات التشغيلية'
      },
      {
        code: '4102',
        nameAr: 'إيرادات العمليات الجراحية والتوليد',
        nameEn: 'Operating Theater & Delivery Revenue',
        type: 'revenue',
        parentCode: '4000',
        level: 2,
        debitTotal: 0,
        creditTotal: Math.round(overview.totalGrossRevenue * 0.38),
        balance: Math.round(overview.totalGrossRevenue * 0.38),
        normalBalance: 'credit',
        categoryGroupAr: 'الإيرادات التشغيلية'
      },
      {
        code: '4103',
        nameAr: 'إيرادات المختبر والتحاليل LIS',
        nameEn: 'Laboratory LIS Revenue',
        type: 'revenue',
        parentCode: '4000',
        level: 2,
        debitTotal: 0,
        creditTotal: Math.round(overview.totalGrossRevenue * 0.14),
        balance: Math.round(overview.totalGrossRevenue * 0.14),
        normalBalance: 'credit',
        categoryGroupAr: 'الإيرادات التشغيلية'
      },
      {
        code: '4104',
        nameAr: 'إيرادات الصيدلية والمستلزمات',
        nameEn: 'Pharmacy & Supplies Revenue',
        type: 'revenue',
        parentCode: '4000',
        level: 2,
        debitTotal: 0,
        creditTotal: Math.round(overview.totalGrossRevenue * 0.15),
        balance: Math.round(overview.totalGrossRevenue * 0.15),
        normalBalance: 'credit',
        categoryGroupAr: 'الإيرادات التشغيلية'
      },
      {
        code: '4105',
        nameAr: 'إيرادات الاستشارات والعيادات الخارجية',
        nameEn: 'Consultations & Outpatient Clinics',
        type: 'revenue',
        parentCode: '4000',
        level: 2,
        debitTotal: 0,
        creditTotal: Math.round(overview.totalGrossRevenue * 0.05),
        balance: Math.round(overview.totalGrossRevenue * 0.05),
        normalBalance: 'credit',
        categoryGroupAr: 'الإيرادات التشغيلية'
      },

      // 5. EXPENSES
      {
        code: '5000',
        nameAr: 'المصروفات والتكاليف التشغيلية',
        nameEn: 'Operating Expenses',
        type: 'expense',
        level: 1,
        debitTotal: overview.totalDisbursements + 12000,
        creditTotal: 0,
        balance: overview.totalDisbursements + 12000,
        normalBalance: 'debit',
        categoryGroupAr: 'المصروفات'
      },
      {
        code: '5101',
        nameAr: 'تكلفة الأدوية والمستهلكات الطبية',
        nameEn: 'Cost of Drugs & Supplies',
        type: 'expense',
        parentCode: '5000',
        level: 2,
        debitTotal: 8400,
        creditTotal: 0,
        balance: 8400,
        normalBalance: 'debit',
        categoryGroupAr: 'تكاليف تشغيلية'
      },
      {
        code: '5102',
        nameAr: 'أتعاب وأجور الأطباء والجراحين',
        nameEn: 'Doctor & Surgeon Commissions',
        type: 'expense',
        parentCode: '5000',
        level: 2,
        debitTotal: 6200,
        creditTotal: 0,
        balance: 6200,
        normalBalance: 'debit',
        categoryGroupAr: 'تكاليف تشغيلية'
      },
      {
        code: '5103',
        nameAr: 'أجور التمريض والكوادر الفنية',
        nameEn: 'Nursing & Technical Staff Payroll',
        type: 'expense',
        parentCode: '5000',
        level: 2,
        debitTotal: 4500,
        creditTotal: 0,
        balance: 4500,
        normalBalance: 'debit',
        categoryGroupAr: 'الرواتب والأجور'
      },
      {
        code: '5104',
        nameAr: 'صيانة الأجهزة وشبكة الغازات الطبية',
        nameEn: 'Medical Gas & Equipment Maintenance',
        type: 'expense',
        parentCode: '5000',
        level: 2,
        debitTotal: 1600,
        creditTotal: 0,
        balance: 1600,
        normalBalance: 'debit',
        categoryGroupAr: 'مصروفات الصيانة'
      }
    ];
  }

  public getJournalEntries(): JournalEntry[] {
    const receipts = this.getPaymentReceipts();
    const disbursements = this.getDisbursementVouchers();
    const admissions = this.data.admissions;

    const entries: JournalEntry[] = [];

    // 1. Inpatient Service Accrual Entries
    admissions.forEach((adm, idx) => {
      try {
        const inv = this.generateProvisionalInvoice(adm.admissionId);
        if (inv.totalBilled > 0) {
          entries.push({
            id: `jv-bill-${adm.admissionId}`,
            entryNumber: `JV-2026-0${101 + idx}`,
            date: adm.admissionDate.split('T')[0],
            referenceType: 'patient_bill',
            referenceId: adm.admissionId,
            descriptionAr: `إثبات استحقاق خدمات الإيواء والعمليات للمريضة: ${adm.patientName} (${adm.roomNumber})`,
            descriptionEn: `Accrual of inpatient medical services for: ${adm.patientName}`,
            lines: [
              {
                accountCode: adm.payerType === 'corporate_insurance' ? '1202' : '1201',
                accountNameAr: adm.payerType === 'corporate_insurance' ? 'مطالبات شركات التأمين' : 'ذمم المرضى المنومين',
                accountNameEn: adm.payerType === 'corporate_insurance' ? 'Insurance Claims' : 'Patient Receivables',
                debit: inv.totalBilled,
                credit: 0,
                description: `استحقاق فاتورة ADM: ${adm.admissionId}`
              },
              {
                accountCode: '4101',
                accountNameAr: 'إيرادات الإقامة والعمليات الطبية',
                accountNameEn: 'Medical Operating Revenues',
                debit: 0,
                credit: inv.totalBilled,
                description: `إيرادات خدمات طبية معتمدة`
              }
            ],
            totalDebit: inv.totalBilled,
            totalCredit: inv.totalBilled,
            postedBy: 'النظام المحاسبي الآلي',
            isBalanced: true,
            timestamp: adm.admissionDate
          });
        }
      } catch (e) {
        // Skip invalid admissions
      }
    });

    // 2. Receipt Voucher Entries (Dr: Cash/Bank, Cr: Receivables)
    receipts.forEach((rcpt, idx) => {
      const isBank = rcpt.paymentMethod === 'Bank Transfer' || rcpt.paymentMethod === 'Card';
      entries.push({
        id: `jv-rcpt-${rcpt.id}`,
        entryNumber: `JV-2026-0${201 + idx}`,
        date: rcpt.timestamp.split('T')[0],
        referenceType: 'receipt_voucher',
        referenceId: rcpt.receiptNumber,
        descriptionAr: `قيد سند قبض مالي رقم ${rcpt.receiptNumber} (${rcpt.paymentMethod}) - ${rcpt.notes || 'دفعة إيواء'}`,
        descriptionEn: `Receipt Voucher ${rcpt.receiptNumber} via ${rcpt.paymentMethod}`,
        lines: [
          {
            accountCode: isBank ? '1102' : '1101',
            accountNameAr: isBank ? 'مصرف الجمهورية الرئيسي' : 'الخزينة النقدية الرئيسية',
            accountNameEn: isBank ? 'Jumhouria Bank' : 'Cash Drawer',
            debit: rcpt.amount,
            credit: 0,
            description: `قبض نقدي/مصرفي إيصال ${rcpt.receiptNumber}`
          },
          {
            accountCode: '1201',
            accountNameAr: 'ذمم المرضى المنومين',
            accountNameEn: 'Patient Receivables',
            debit: 0,
            credit: rcpt.amount,
            description: `تسديد تحت حساب الإيواء ${rcpt.admissionId}`
          }
        ],
        totalDebit: rcpt.amount,
        totalCredit: rcpt.amount,
        postedBy: rcpt.receivedBy,
        isBalanced: true,
        timestamp: rcpt.timestamp
      });
    });

    // 3. Disbursement Voucher Entries (Dr: Expense, Cr: Cash/Bank)
    disbursements.forEach((pv, idx) => {
      const isBank = pv.paymentMethod === 'Bank Transfer' || pv.paymentMethod === 'Cheque';
      entries.push({
        id: `jv-pv-${pv.id}`,
        entryNumber: `JV-2026-0${301 + idx}`,
        date: pv.date,
        referenceType: 'disbursement_voucher',
        referenceId: pv.voucherNumber,
        descriptionAr: `قيد سند صرف رقم ${pv.voucherNumber} لصالح: ${pv.beneficiary} (${pv.accountNameAr})`,
        descriptionEn: `Disbursement Voucher ${pv.voucherNumber} to ${pv.beneficiary}`,
        lines: [
          {
            accountCode: pv.accountCode,
            accountNameAr: pv.accountNameAr,
            accountNameEn: 'Operating Expense',
            debit: pv.amount,
            credit: 0,
            description: pv.description
          },
          {
            accountCode: isBank ? '1102' : '1101',
            accountNameAr: isBank ? 'مصرف الجمهورية الرئيسي' : 'الخزينة النقدية الرئيسية',
            accountNameEn: isBank ? 'Jumhouria Bank' : 'Cash Drawer',
            debit: 0,
            credit: pv.amount,
            description: `صرف بموجب سند ${pv.voucherNumber}`
          }
        ],
        totalDebit: pv.amount,
        totalCredit: pv.amount,
        postedBy: pv.issuedBy,
        isBalanced: true,
        timestamp: pv.timestamp
      });
    });

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getFinancialOverview(): FinancialOverviewData {
    let totalGrossRevenue = 0;
    let totalPatientReceivables = 0;

    // Calculate sum across all admissions
    for (const adm of this.data.admissions) {
      try {
        const inv = this.generateProvisionalInvoice(adm.admissionId);
        totalGrossRevenue += inv.totalBilled;
        totalPatientReceivables += inv.provisionalBalanceDue;
      } catch {
        // ignore
      }
    }

    const receipts = this.getPaymentReceipts();
    const disbursements = this.getDisbursementVouchers();
    const claims = this.getCorporateClaims();
    const settlements = this.getDoctorSettlements();

    const totalCashCollected = receipts
      .filter(r => r.paymentMethod === 'Cash')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalBankCollected = receipts
      .filter(r => r.paymentMethod !== 'Cash')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalDisbursements = disbursements.reduce((sum, d) => sum + d.amount, 0);
    const totalCorporateReceivables = claims.reduce((sum, c) => sum + c.outstandingBalance, 0);
    const totalDoctorLiabilities = settlements.reduce((sum, s) => sum + s.pendingBalance, 0);

    const cashDrawerBalance = Math.max(1240, 5000 + totalCashCollected - disbursements.filter(d => d.paymentMethod === 'Cash').reduce((s, d) => s + d.amount, 0));
    const bankAccountBalance = Math.max(15800, 35000 + totalBankCollected - disbursements.filter(d => d.paymentMethod !== 'Cash').reduce((s, d) => s + d.amount, 0));

    const departmentRevenue = [
      { departmentAr: 'النساء والولادة والجراحة', departmentEn: 'Ob/Gyn & Surgery', amount: Math.round(totalGrossRevenue * 0.42), percentage: 42, color: '#0d9488' },
      { departmentAr: 'الإقامة الفندقية والأسرّة', departmentEn: 'Inpatient Rooms', amount: Math.round(totalGrossRevenue * 0.28), percentage: 28, color: '#0284c7' },
      { departmentAr: 'المختبر والتحاليل LIS', departmentEn: 'Laboratory', amount: Math.round(totalGrossRevenue * 0.14), percentage: 14, color: '#6366f1' },
      { departmentAr: 'الصيدلية والمستلزمات', departmentEn: 'Pharmacy & Supplies', amount: Math.round(totalGrossRevenue * 0.12), percentage: 12, color: '#f59e0b' },
      { departmentAr: 'الاستشارات والعيادات', departmentEn: 'Consultations', amount: Math.round(totalGrossRevenue * 0.04), percentage: 4, color: '#ec4899' }
    ];

    const dailyTrend = [
      { date: '2026-11-01', label: 'السبت 01/11', revenue: 3200, receipts: 2800, disbursements: 1200 },
      { date: '2026-11-02', label: 'الأحد 02/11', revenue: 4100, receipts: 3500, disbursements: 850 },
      { date: '2026-11-03', label: 'الإثنين 03/11', revenue: 3800, receipts: 4200, disbursements: 2100 },
      { date: '2026-11-04', label: 'الثلاثاء 04/11', revenue: 5200, receipts: 4800, disbursements: 1400 },
      { date: '2026-11-05', label: 'الأربعاء 05/11', revenue: 4600, receipts: 3900, disbursements: 1950 },
      { date: '2026-11-06', label: 'الخميس 06/11', revenue: 4900, receipts: 4500, disbursements: 2500 },
      { date: '2026-11-07', label: 'اليوم (الجمعة)', revenue: Math.round(totalGrossRevenue * 0.18), receipts: totalCashCollected + totalBankCollected, disbursements: totalDisbursements }
    ];

    const payerBreakdown = [
      { name: 'دفع ذاتي مباشر (Self-Pay)', amount: Math.round(totalGrossRevenue * 0.52), count: 8 },
      { name: 'شركة المدار الجديد (Al-Madar)', amount: Math.round(totalGrossRevenue * 0.22), count: 2 },
      { name: 'شركة البريقة للنفط (Brega)', amount: Math.round(totalGrossRevenue * 0.16), count: 2 },
      { name: 'مصرف ليبيا المركزي (CBL)', amount: Math.round(totalGrossRevenue * 0.10), count: 1 }
    ];

    return {
      totalGrossRevenue,
      totalCashCollected,
      totalBankCollected,
      totalPatientReceivables,
      totalCorporateReceivables,
      totalDoctorLiabilities,
      totalDisbursements,
      cashDrawerBalance,
      bankAccountBalance,
      departmentRevenue,
      dailyTrend,
      payerBreakdown,
      recentTransactionsCount: receipts.length + disbursements.length
    };
  }

  // --- Discharge Summaries & AMA / DAMA ---
  public getDischargeSummary(admissionId: string) {
    return this.data.dischargeSummaries.find(d => d.admissionId === admissionId) || null;
  }

  public saveDischargeSummary(summaryData: DischargeSummary, userId: string, userName: string, userRole: any) {
    const index = this.data.dischargeSummaries.findIndex(d => d.admissionId === summaryData.admissionId);
    if (index >= 0) {
      this.data.dischargeSummaries[index] = summaryData;
    } else {
      this.data.dischargeSummaries.unshift(summaryData);
    }

    const admission = this.getAdmissionById(summaryData.admissionId);
    if (admission) {
      admission.status = summaryData.disposition === 'DAMA (Against Medical Advice)' ? 'dama' : 'discharged';
      admission.dischargeDate = summaryData.dischargeDate;
      const bed = this.data.beds.find(b => b.id === admission.bedId);
      if (bed) {
        bed.status = 'cleaning';
        bed.currentAdmissionId = undefined;
        bed.currentPatientName = undefined;
      }
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'DischargeSummary',
      entityId: summaryData.id,
      patientMRN: summaryData.mrn,
      details: `Patient discharged. Disposition: ${summaryData.disposition}. Final diagnosis: ${summaryData.finalDiagnosis}`
    });

    this.saveData(this.data);
    return summaryData;
  }

  public getDAMAForm(admissionId: string) {
    return this.data.damaForms.find(d => d.admissionId === admissionId) || null;
  }

  public saveDAMAForm(damaData: DAMAForm, userId: string, userName: string, userRole: any) {
    const index = this.data.damaForms.findIndex(d => d.admissionId === damaData.admissionId);
    if (index >= 0) {
      this.data.damaForms[index] = damaData;
    } else {
      this.data.damaForms.unshift(damaData);
    }

    const admission = this.getAdmissionById(damaData.admissionId);
    if (admission) {
      admission.status = 'dama';
      admission.dischargeDate = damaData.timestamp;
      const bed = this.data.beds.find(b => b.id === admission.bedId);
      if (bed) {
        bed.status = 'cleaning';
        bed.currentAdmissionId = undefined;
        bed.currentPatientName = undefined;
      }
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'DAMAForm',
      entityId: damaData.id,
      patientMRN: damaData.mrn,
      details: `DAMA (Discharge Against Medical Advice) recorded. Refusal reason: ${damaData.refusalReason}. Signature refused: ${damaData.isSignatureRefused}`
    });

    this.saveData(this.data);
    return damaData;
  }

  // --- Medical Reports (Ch. 20) ---
  public getMedicalReports(admissionId?: string) {
    if (admissionId) {
      return this.data.medicalReports.filter(m => m.admissionId === admissionId);
    }
    return this.data.medicalReports;
  }

  public createMedicalReport(reportData: Omit<MedicalReport, 'id' | 'reportNumber' | 'issueDate' | 'hospitalStampApproved' | 'digitalSignatureHash'>, userId: string, userName: string, userRole: any) {
    const count = this.data.medicalReports.length + 45;
    const reportNumber = `REP-2026-${count.toString().padStart(4, '0')}`;

    const newReport: MedicalReport = {
      ...reportData,
      id: `rep-${Date.now()}`,
      reportNumber,
      issueDate: new Date().toISOString().split('T')[0],
      feeAmount: 25.0, // Fixed 25 LYD policy per spec
      hospitalStampApproved: true,
      digitalSignatureHash: `SHA256:${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`
    };

    this.data.medicalReports.unshift(newReport);

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'MedicalReport',
      entityId: newReport.id,
      patientMRN: newReport.mrn,
      details: `Generated official medical report #${reportNumber} (Fee: 25 LYD) for patient ${newReport.patientName}`
    });

    this.saveData(this.data);
    return newReport;
  }

  // --- Consent Forms (Informed Consent, Surgery, Anesthesia, Transfusions) ---
  public getConsentForms(admissionId?: string, mrn?: string) {
    if (!this.data.consentForms) {
      this.data.consentForms = [];
    }
    if (admissionId) {
      return this.data.consentForms.filter(c => c.admissionId === admissionId);
    }
    if (mrn) {
      return this.data.consentForms.filter(c => c.mrn === mrn);
    }
    return this.data.consentForms;
  }

  public getConsentById(id: string) {
    if (!this.data.consentForms) return null;
    return this.data.consentForms.find(c => c.id === id) || null;
  }

  public saveConsentForm(consentData: Omit<ConsentForm, 'id' | 'consentNumber'> & { id?: string; consentNumber?: string }, userId: string, userName: string, userRole: any) {
    if (!this.data.consentForms) {
      this.data.consentForms = [];
    }

    let savedConsent: ConsentForm;
    if (consentData.id) {
      const index = this.data.consentForms.findIndex(c => c.id === consentData.id);
      if (index >= 0) {
        savedConsent = {
          ...this.data.consentForms[index],
          ...consentData,
          id: consentData.id,
          consentNumber: this.data.consentForms[index].consentNumber
        };
        this.data.consentForms[index] = savedConsent;
      } else {
        const count = this.data.consentForms.length + 1;
        const consentNumber = `CNS-2026-${count.toString().padStart(4, '0')}`;
        savedConsent = {
          ...consentData,
          id: consentData.id || `cns-${Date.now()}`,
          consentNumber: consentData.consentNumber || consentNumber
        } as ConsentForm;
        this.data.consentForms.unshift(savedConsent);
      }
    } else {
      const count = this.data.consentForms.length + 1;
      const consentNumber = `CNS-2026-${count.toString().padStart(4, '0')}`;
      savedConsent = {
        ...consentData,
        id: `cns-${Date.now()}`,
        consentNumber
      } as ConsentForm;
      this.data.consentForms.unshift(savedConsent);
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: consentData.id ? 'UPDATE' : 'CREATE',
      entity: 'ConsentForm',
      entityId: savedConsent.id,
      patientMRN: savedConsent.mrn,
      details: `Consent Form ${savedConsent.consentNumber} (${savedConsent.type}) documented for ${savedConsent.patientName}. Signer: ${savedConsent.signerName} (${savedConsent.signerRelationship}). Status: ${savedConsent.status}`
    });

    this.saveData(this.data);
    return savedConsent;
  }

  public revokeConsentForm(id: string, reason: string, userId: string, userName: string, userRole: any) {
    if (!this.data.consentForms) return null;
    const consent = this.data.consentForms.find(c => c.id === id);
    if (!consent) {
      throw new Error(`Consent form with ID ${id} not found.`);
    }

    consent.status = 'revoked';
    consent.notes = `${consent.notes ? consent.notes + ' | ' : ''}REVOKED: ${reason} by ${userName} at ${new Date().toISOString()}`;

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'ConsentForm',
      entityId: consent.id,
      patientMRN: consent.mrn,
      details: `Revoked consent ${consent.consentNumber} (${consent.procedureName}). Reason: ${reason}`
    });

    this.saveData(this.data);
    return consent;
  }

  // --- Voice Notes & Audio Dictation ---
  public getVoiceNotes(admissionId?: string, mrn?: string) {
    if (!this.data.voiceNotes) {
      this.data.voiceNotes = [];
    }
    if (admissionId) {
      return this.data.voiceNotes.filter(v => v.admissionId === admissionId);
    }
    if (mrn) {
      return this.data.voiceNotes.filter(v => v.mrn === mrn);
    }
    return this.data.voiceNotes;
  }

  public saveVoiceNote(noteData: Omit<VoiceNote, 'id'> & { id?: string }, userId: string, userName: string, userRole: any) {
    if (!this.data.voiceNotes) {
      this.data.voiceNotes = [];
    }

    let savedNote: VoiceNote;
    if (noteData.id) {
      const idx = this.data.voiceNotes.findIndex(v => v.id === noteData.id);
      if (idx >= 0) {
        savedNote = {
          ...this.data.voiceNotes[idx],
          ...noteData,
          id: noteData.id
        };
        this.data.voiceNotes[idx] = savedNote;
      } else {
        savedNote = {
          ...noteData,
          id: noteData.id || `vn-${Date.now()}`
        } as VoiceNote;
        this.data.voiceNotes.unshift(savedNote);
      }
    } else {
      savedNote = {
        ...noteData,
        id: `vn-${Date.now()}`
      } as VoiceNote;
      this.data.voiceNotes.unshift(savedNote);
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: noteData.id ? 'UPDATE' : 'CREATE',
      entity: 'VoiceNote',
      entityId: savedNote.id,
      patientMRN: savedNote.mrn,
      details: `Voice note recorded/saved (${savedNote.category}: "${savedNote.title}") for ${savedNote.patientName} (${savedNote.durationSeconds}s)`
    });

    this.saveData(this.data);
    return savedNote;
  }

  public deleteVoiceNote(id: string, userId: string, userName: string, userRole: any) {
    if (!this.data.voiceNotes) return null;
    const idx = this.data.voiceNotes.findIndex(v => v.id === id);
    if (idx < 0) {
      throw new Error(`Voice note with ID ${id} not found.`);
    }

    const removed = this.data.voiceNotes.splice(idx, 1)[0];
    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'LOGICAL_DELETE',
      entity: 'VoiceNote',
      entityId: id,
      patientMRN: removed.mrn,
      details: `Deleted voice note "${removed.title}" (${removed.category})`
    });

    this.saveData(this.data);
    return removed;
  }

  // --- Audit Logs ---
  public getAuditLogs() {
    return this.data.auditLogs;
  }

  // --- Authentication & RBAC ---
  public authenticate(username: string, password?: string) {
    const user = this.data.users.find(u => u.username === username || u.id === username);
    if (!user) {
      throw new Error(`User not found: ${username}`);
    }

    // Default system credentials verification
    const validCredentials: Record<string, string> = {
      admin: 'admin123',
      dr_tarek: 'doctor123',
      dr_huda: 'doctor123',
      nurse_fatima: 'nurse123',
      mariam_patient: 'patient123',
      pharm_bassem: 'pharm123',
      reem_reception: 'reception123',
      mustafa_finance: 'finance123'
    };

    if (password && validCredentials[user.username] && password !== validCredentials[user.username]) {
      throw new Error('Invalid credentials: password does not match system account records.');
    }

    const token = `hmis-token-${user.id}-${Date.now()}`;
    user.token = token;

    this.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'VIEW',
      entity: 'SystemUser',
      entityId: user.id,
      details: `User ${user.username} authenticated with role ${user.role.toUpperCase()}`
    });

    this.saveData(this.data);
    return { user, token };
  }

  public updateUserRole(userId: string, newRole: UserRole, newPermissions: Permission[], performedBy: string) {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    const oldRole = user.role;
    user.role = newRole;
    user.permissions = newPermissions;

    this.logAudit({
      userId: performedBy,
      userName: performedBy,
      userRole: 'admin',
      action: 'UPDATE',
      entity: 'SystemUser',
      entityId: user.id,
      details: `Updated role for ${user.name} from ${oldRole} to ${newRole}`
    });

    this.saveData(this.data);
    return user;
  }

  // --- Inventory Management (Medicines, Equipment, Supplies) ---
  public getInventoryItems(category?: string) {
    if (category) {
      return this.data.inventoryItems.filter(i => i.category === category);
    }
    return this.data.inventoryItems;
  }

  public addInventoryItem(itemData: Omit<InventoryItem, 'id' | 'status'>, userId: string, userName: string, userRole: any) {
    const status: import('../src/types/hmis.ts').InventoryItemStatus = 
      itemData.stockLevel <= 0 ? 'out_of_stock' : itemData.stockLevel <= itemData.minThreshold ? 'low_stock' : 'in_stock';

    const newItem: InventoryItem = {
      ...itemData,
      id: `inv-${Date.now()}`,
      status,
      lastRestockedAt: new Date().toISOString()
    };

    this.data.inventoryItems.unshift(newItem);

    // Initial stock movement
    if (newItem.stockLevel > 0) {
      this.data.stockMovements.unshift({
        id: `mov-${Date.now()}`,
        itemId: newItem.id,
        itemName: newItem.name,
        type: 'ADJUSTMENT',
        quantity: newItem.stockLevel,
        previousStock: 0,
        newStock: newItem.stockLevel,
        referenceId: 'INITIAL_STOCK',
        performedBy: userName,
        timestamp: new Date().toISOString(),
        notes: 'Initial inventory item creation and stock entry'
      });
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'InventoryItem',
      entityId: newItem.id,
      details: `Added inventory item: ${newItem.name} (${newItem.category}, Stock: ${newItem.stockLevel} ${newItem.unit})`
    });

    this.saveData(this.data);
    return newItem;
  }

  public updateInventoryItem(id: string, updates: Partial<InventoryItem>, userId: string, userName: string, userRole: any) {
    const item = this.data.inventoryItems.find(i => i.id === id);
    if (!item) throw new Error('Inventory item not found');

    const previousStock = item.stockLevel;
    Object.assign(item, updates);

    // Recompute status
    item.status = item.stockLevel <= 0 ? 'out_of_stock' : item.stockLevel <= item.minThreshold ? 'low_stock' : 'in_stock';

    if (updates.stockLevel !== undefined && updates.stockLevel !== previousStock) {
      item.lastRestockedAt = new Date().toISOString();
      this.data.stockMovements.unshift({
        id: `mov-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        type: 'ADJUSTMENT',
        quantity: Math.abs(item.stockLevel - previousStock),
        previousStock,
        newStock: item.stockLevel,
        referenceId: 'MANUAL_ADJUSTMENT',
        performedBy: userName,
        timestamp: new Date().toISOString(),
        notes: `Stock adjusted from ${previousStock} to ${item.stockLevel}`
      });
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'InventoryItem',
      entityId: item.id,
      details: `Updated inventory item ${item.name}. Current stock: ${item.stockLevel}`
    });

    this.saveData(this.data);
    return item;
  }

  public deleteInventoryItem(id: string, userId: string, userName: string, userRole: any) {
    const index = this.data.inventoryItems.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Inventory item not found');
    const removed = this.data.inventoryItems.splice(index, 1)[0];

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'LOGICAL_DELETE',
      entity: 'InventoryItem',
      entityId: id,
      details: `Deleted inventory item: ${removed.name} (${removed.sku})`
    });

    this.saveData(this.data);
    return removed;
  }

  // --- Vendors ---
  public getVendors() {
    return this.data.vendors;
  }

  public addVendor(vendorData: Omit<Vendor, 'id'>, userId: string, userName: string, userRole: any) {
    const newVendor: Vendor = {
      ...vendorData,
      id: `vend-${Date.now()}`
    };
    this.data.vendors.unshift(newVendor);

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'Vendor',
      entityId: newVendor.id,
      details: `Registered vendor: ${newVendor.name} (${newVendor.category})`
    });

    this.saveData(this.data);
    return newVendor;
  }

  public updateVendor(id: string, updates: Partial<Vendor>, userId: string, userName: string, userRole: any) {
    const vendor = this.data.vendors.find(v => v.id === id);
    if (!vendor) throw new Error('Vendor not found');
    Object.assign(vendor, updates);

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'Vendor',
      entityId: vendor.id,
      details: `Updated vendor details for: ${vendor.name}`
    });

    this.saveData(this.data);
    return vendor;
  }

  // --- Purchase Orders & Fulfillment ---
  public getPurchaseOrders(status?: string) {
    if (status) {
      return this.data.purchaseOrders.filter(p => p.status === status);
    }
    return this.data.purchaseOrders;
  }

  public createPurchaseOrder(poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'orderDate' | 'status'>, userId: string, userName: string, userRole: any) {
    const count = this.data.purchaseOrders.length + 1;
    const poNumber = `PO-2026-${count.toString().padStart(3, '0')}`;

    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now()}`,
      poNumber,
      orderDate: new Date().toISOString(),
      status: 'pending_approval'
    };

    this.data.purchaseOrders.unshift(newPO);

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'PurchaseOrder',
      entityId: newPO.id,
      details: `Created Purchase Order ${newPO.poNumber} for ${newPO.vendorName}. Total: ${newPO.totalAmount} LYD`
    });

    this.saveData(this.data);
    return newPO;
  }

  public updatePurchaseOrderStatus(id: string, status: import('../src/types/hmis.ts').PurchaseOrderStatus, userId: string, userName: string, userRole: any) {
    const po = this.data.purchaseOrders.find(p => p.id === id);
    if (!po) throw new Error('Purchase order not found');

    if (status === 'received') {
      return this.receivePurchaseOrder(id, userId, userName, userRole);
    }

    po.status = status;
    if (status === 'approved') {
      po.approvedBy = userName;
      po.approvedDate = new Date().toISOString();
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'PurchaseOrder',
      entityId: po.id,
      details: `Purchase Order ${po.poNumber} status updated to ${status.toUpperCase()} by ${userName}`
    });

    this.saveData(this.data);
    return po;
  }

  public receivePurchaseOrder(id: string, userId: string, userName: string, userRole: any) {
    const po = this.data.purchaseOrders.find(p => p.id === id);
    if (!po) throw new Error('Purchase order not found');
    if (po.status === 'received') throw new Error('Purchase order is already received.');

    po.status = 'received';
    po.receivedBy = userName;
    po.receivedDate = new Date().toISOString();

    // Automatically increment stock levels for all ordered items
    const now = new Date().toISOString();
    for (const poItem of po.items) {
      const invItem = this.data.inventoryItems.find(i => i.id === poItem.itemId || i.name === poItem.itemName);
      if (invItem) {
        const previousStock = invItem.stockLevel;
        invItem.stockLevel += poItem.quantity;
        invItem.status = invItem.stockLevel <= 0 ? 'out_of_stock' : invItem.stockLevel <= invItem.minThreshold ? 'low_stock' : 'in_stock';
        invItem.lastRestockedAt = now;

        // Log StockMovement
        this.data.stockMovements.unshift({
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          itemId: invItem.id,
          itemName: invItem.name,
          type: 'PURCHASE_RECEIPT',
          quantity: poItem.quantity,
          previousStock,
          newStock: invItem.stockLevel,
          referenceId: po.poNumber,
          performedBy: userName,
          timestamp: now,
          notes: `Goods received via ${po.poNumber} from ${po.vendorName}`
        });
      }
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'PurchaseOrder',
      entityId: po.id,
      details: `Received and fulfilled Purchase Order ${po.poNumber}. Stock automatically updated for ${po.items.length} items.`
    });

    this.saveData(this.data);
    return po;
  }

  public getStockMovements(itemId?: string) {
    if (itemId) {
      return this.data.stockMovements.filter(m => m.itemId === itemId);
    }
    return this.data.stockMovements;
  }

  // --- Patient Appointment Scheduling Module ---
  public getAppointments(patientMrn?: string, doctorId?: string, date?: string) {
    return this.data.appointments.filter(a => {
      if (patientMrn && a.patientMrn !== patientMrn) return false;
      if (doctorId && a.doctorId !== doctorId) return false;
      if (date && a.date !== date) return false;
      return true;
    });
  }

  public bookAppointment(
    data: Omit<Appointment, 'id' | 'appointmentNumber' | 'createdAt' | 'status'>,
    userId: string,
    userName: string,
    userRole: any
  ) {
    // Collision detection check:
    const conflict = this.data.appointments.find(
      a => a.doctorId === data.doctorId &&
           a.date === data.date &&
           a.timeSlot === data.timeSlot &&
           a.status !== 'cancelled'
    );

    if (conflict) {
      throw new Error(`Double-booking conflict: ${data.doctorName} already has an appointment booked on ${data.date} at ${data.timeSlot}. Please select another time slot.`);
    }

    const count = this.data.appointments.length + 1;
    const appointmentNumber = `APT-2026-${count.toString().padStart(3, '0')}`;

    const newAppointment: Appointment = {
      ...data,
      id: `apt-${Date.now()}`,
      appointmentNumber,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    this.data.appointments.unshift(newAppointment);

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'Appointment',
      entityId: newAppointment.id,
      patientMRN: newAppointment.patientMrn,
      details: `Booked appointment #${appointmentNumber} for ${newAppointment.patientName} with ${newAppointment.doctorName} on ${newAppointment.date} at ${newAppointment.timeSlot} (${newAppointment.visitType})`
    });

    this.saveData(this.data);
    return newAppointment;
  }

  public rescheduleAppointment(
    id: string,
    newDate: string,
    newTimeSlot: string,
    userId: string,
    userName: string,
    userRole: any
  ) {
    const apt = this.data.appointments.find(a => a.id === id);
    if (!apt) throw new Error('Appointment not found');

    // Collision detection for the new slot
    const conflict = this.data.appointments.find(
      a => a.id !== id &&
           a.doctorId === apt.doctorId &&
           a.date === newDate &&
           a.timeSlot === newTimeSlot &&
           a.status !== 'cancelled'
    );

    if (conflict) {
      throw new Error(`Double-booking conflict: ${apt.doctorName} already has an appointment scheduled on ${newDate} at ${newTimeSlot}.`);
    }

    const oldDate = apt.date;
    const oldSlot = apt.timeSlot;

    apt.date = newDate;
    apt.timeSlot = newTimeSlot;
    apt.status = 'rescheduled';
    apt.rescheduledFromDate = oldDate;
    apt.rescheduledFromSlot = oldSlot;

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'Appointment',
      entityId: apt.id,
      patientMRN: apt.patientMrn,
      details: `Rescheduled appointment #${apt.appointmentNumber} from ${oldDate} ${oldSlot} to ${newDate} ${newTimeSlot}`
    });

    this.saveData(this.data);
    return apt;
  }

  public cancelAppointment(id: string, reason: string, userId: string, userName: string, userRole: any) {
    const apt = this.data.appointments.find(a => a.id === id);
    if (!apt) throw new Error('Appointment not found');

    apt.status = 'cancelled';
    apt.cancellationReason = reason;

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'Appointment',
      entityId: apt.id,
      patientMRN: apt.patientMrn,
      details: `Cancelled appointment #${apt.appointmentNumber}. Reason: ${reason}`
    });

    this.saveData(this.data);
    return apt;
  }

  // --- Smart Alerts & Clinical Decision Support System ---
  public getSmartAlerts(admissionId?: string, severityFilter?: string): SmartAlert[] {
    const alerts: SmartAlert[] = [];
    const acks = this.data.smartAlertAcks || {};
    const currentTime = new Date().toISOString();

    // 1. MEOWS & Vitals Alerts across active admissions
    const activeAdmissions = this.data.admissions.filter(a => a.status === 'active');
    for (const adm of activeAdmissions) {
      if (admissionId && adm.admissionId !== admissionId) continue;
      const patient = this.data.patients.find(p => p.mrn === adm.mrn);
      const patName = patient ? patient.fullName : 'المريضة';
      const assessment = this.data.assessments[adm.admissionId];
      if (assessment && assessment.vitals && assessment.vitals.length > 0) {
        // Latest vitals
        const v = assessment.vitals[assessment.vitals.length - 1];

        // Blood pressure check (MEOWS)
        if (v.bpSystolic >= 160 || v.bpDiastolic >= 110) {
          const id = `alert-meows-bp-${adm.admissionId}`;
          const ack = acks[id];
          alerts.push({
            id,
            titleAr: 'إنذار سريري أحمر: ارتفاع حاد في ضغط الدم (MEOWS)',
            titleEn: 'Critical MEOWS Alert: Severe Hypertension',
            messageAr: `ضغط دم حرج ${v.bpSystolic}/${v.bpDiastolic} ملم زئبق للمريضة ${patName} (غرفة ${adm.roomNumber}). خطر ارتعاج الحمل وتسمم كبدي، يوصى فوراً ببروتوكول سلفات المغنيسيوم وخافضات الضغط وتخطيط قلب الجنين.`,
            messageEn: `Critical BP ${v.bpSystolic}/${v.bpDiastolic} mmHg for ${patName} (Room ${adm.roomNumber}). Severe pre-eclampsia risk; urgent MgSO4 and antihypertensives recommended.`,
            severity: 'critical',
            category: 'clinical_meows',
            patientMrn: adm.mrn,
            patientName: patName,
            admissionId: adm.admissionId,
            roomNumber: adm.roomNumber,
            timestamp: v.timestamp || currentTime,
            isAcknowledged: !!ack,
            acknowledgedBy: ack?.acknowledgedBy,
            acknowledgedAt: ack?.acknowledgedAt,
            metricValue: `${v.bpSystolic}/${v.bpDiastolic} mmHg`,
            aiRecommendation: 'ابدأ حقن سلفات المغنيسيوم بجرعة التحميل 4g وريدياً، واطلب صورة دم كاملة ووظائف كبد وكلى وتخطيط قلب الجنين CTG.',
            actionLink: { tab: 'clinical', labelAr: 'معاينة الملف السريري والمؤشرات', labelEn: 'View Clinical Chart' }
          });
        } else if (v.bpSystolic >= 140 || v.bpDiastolic >= 90) {
          const id = `alert-meows-bp-mod-${adm.admissionId}`;
          const ack = acks[id];
          alerts.push({
            id,
            titleAr: 'تحذير سريري: ارتفاع معتدل بضغط الدم',
            titleEn: 'Warning: Moderate Hypertension',
            messageAr: `قراءة ضغط الدم ${v.bpSystolic}/${v.bpDiastolic} ملم زئبق للمريضة ${patName} تستدعي المراقبة كل ساعتين وتحليل بروتين البول.`,
            messageEn: `Blood pressure ${v.bpSystolic}/${v.bpDiastolic} mmHg for ${patName}. Re-check every 2 hours and test urine protein.`,
            severity: 'warning',
            category: 'clinical_meows',
            patientMrn: adm.mrn,
            patientName: patName,
            admissionId: adm.admissionId,
            roomNumber: adm.roomNumber,
            timestamp: v.timestamp || currentTime,
            isAcknowledged: !!ack,
            acknowledgedBy: ack?.acknowledgedBy,
            acknowledgedAt: ack?.acknowledgedAt,
            metricValue: `${v.bpSystolic}/${v.bpDiastolic} mmHg`,
            actionLink: { tab: 'clinical', labelAr: 'معاينة الملف السريري', labelEn: 'View Clinical Chart' }
          });
        }

        // Tachycardia
        if (v.pulse >= 115) {
          const id = `alert-meows-hr-${adm.admissionId}`;
          const ack = acks[id];
          alerts.push({
            id,
            titleAr: 'إنذار سريري: تسارع نبضات القلب (Tachycardia)',
            titleEn: 'Critical MEOWS Alert: Tachycardia',
            messageAr: `معدل النبض ${v.pulse} نبضة/دقيقة للمريضة ${patName}. مؤشر لخطر نزف ما بعد الولادة المستتر أو صدمة نقص حجم أو ألم حاد.`,
            messageEn: `Heart rate ${v.pulse} bpm for ${patName}. Warning for concealed postpartum hemorrhage or hypovolemic shock.`,
            severity: 'critical',
            category: 'clinical_meows',
            patientMrn: adm.mrn,
            patientName: patName,
            admissionId: adm.admissionId,
            roomNumber: adm.roomNumber,
            timestamp: v.timestamp || currentTime,
            isAcknowledged: !!ack,
            acknowledgedBy: ack?.acknowledgedBy,
            acknowledgedAt: ack?.acknowledgedAt,
            metricValue: `${v.pulse} bpm`,
            actionLink: { tab: 'clinical', labelAr: 'فحص النزف والمؤشرات', labelEn: 'Check Vitals & Bleeding' }
          });
        }

        // Fever / Sepsis
        if (v.temp >= 38.3) {
          const id = `alert-meows-temp-${adm.admissionId}`;
          const ack = acks[id];
          alerts.push({
            id,
            titleAr: 'إنذار سريري: حمى نفاسية حادة / اشتباه إنتان',
            titleEn: 'MEOWS Sepsis Alert: High Fever',
            messageAr: `درجة الحرارة ${v.temp}°C للمريضة ${patName}. يوصى بسحب مزارع دم وبول ومسحة جرح وبدء بروتوكول الإنتان الحاد (Sepsis Six).`,
            messageEn: `Temperature ${v.temp}°C for ${patName}. Suspected puerperal sepsis; obtain cultures and blood gas.`,
            severity: 'critical',
            category: 'clinical_meows',
            patientMrn: adm.mrn,
            patientName: patName,
            admissionId: adm.admissionId,
            roomNumber: adm.roomNumber,
            timestamp: v.timestamp || currentTime,
            isAcknowledged: !!ack,
            acknowledgedBy: ack?.acknowledgedBy,
            acknowledgedAt: ack?.acknowledgedAt,
            metricValue: `${v.temp} °C`,
            actionLink: { tab: 'clinical', labelAr: 'الملف السريري والحرارة', labelEn: 'View Chart' }
          });
        }

        // SpO2
        if (v.spO2 && v.spO2 < 94) {
          const id = `alert-meows-spo2-${adm.admissionId}`;
          const ack = acks[id];
          alerts.push({
            id,
            titleAr: 'إنذار سريري: نقص تشبع الأكسجين',
            titleEn: 'MEOWS Hypoxia Alert',
            messageAr: `تشبع الأكسجين ${v.spO2}% للمريضة ${patName}. يرجى تزويد المريضة بالأكسجين وفحص الرئتين والتأكد من عدم وجود انصمام رئوي.`,
            messageEn: `SpO2 ${v.spO2}% for ${patName}. Administer O2 therapy and evaluate for pulmonary embolism.`,
            severity: 'critical',
            category: 'clinical_meows',
            patientMrn: adm.mrn,
            patientName: patName,
            admissionId: adm.admissionId,
            roomNumber: adm.roomNumber,
            timestamp: v.timestamp || currentTime,
            isAcknowledged: !!ack,
            acknowledgedBy: ack?.acknowledgedBy,
            acknowledgedAt: ack?.acknowledgedAt,
            metricValue: `${v.spO2}%`,
            actionLink: { tab: 'clinical', labelAr: 'متابعة الأكسجين والتنفس', labelEn: 'Manage Respiratory' }
          });
        }
      }

      // 2. Missing or Revoked Surgical Consent for Surgical Plan
      const plans = this.data.plans[adm.admissionId] || [];
      const hasSurgeryPlan = plans.some(p => p.planType === 'urgent_surgery' || p.planType === 'elective_surgery');
      if (hasSurgeryPlan) {
        const consents = this.data.consentForms.filter(c => c.admissionId === adm.admissionId && c.status === 'signed');
        const hasValidSurgeryConsent = consents.some(c => c.type === 'surgical_operative' || c.type === 'anesthesia_epidural');
        if (!hasValidSurgeryConsent) {
          const id = `alert-consent-missing-${adm.admissionId}`;
          const ack = acks[id];
          alerts.push({
            id,
            titleAr: 'إنذار نظامي: مريضة مجدولة لعملية جراحية بدون إقرار موقع!',
            titleEn: 'Regulatory Alert: Surgery Scheduled Without Signed Consent',
            messageAr: `المريضة ${patName} مجدولة لعملية جراحية (${plans.find(p=>p.planType.includes('surgery'))?.procedureNature || 'جراحة'}) ولكن لا يوجد نموذج إقرار مستنير موقع ومعتمد في النظام!`,
            messageEn: `Patient ${patName} is scheduled for surgery but lacks an electronically signed informed consent form.`,
            severity: 'critical',
            category: 'consent_surgery',
            patientMrn: adm.mrn,
            patientName: patName,
            admissionId: adm.admissionId,
            roomNumber: adm.roomNumber,
            timestamp: currentTime,
            isAcknowledged: !!ack,
            acknowledgedBy: ack?.acknowledgedBy,
            acknowledgedAt: ack?.acknowledgedAt,
            actionLink: { tab: 'consents', labelAr: 'توقيع واعتماد الإقرار الجراحي فوراً', labelEn: 'Sign Informed Consent' }
          });
        }
      }

      // 3. Drug-Allergy Interaction
      const patientAllergies = patient?.allergies || [];
      const hasKnownAllergy = patientAllergies.length > 0 && !patientAllergies.some(al => al.toLowerCase().includes('no known') || al.toLowerCase().includes('nkda'));
      if (hasKnownAllergy) {
        const allergyStr = patientAllergies.join(', ');
        const allergiesLower = allergyStr.toLowerCase();
        const patientMeds = this.data.medications.filter(m => m.admissionId === adm.admissionId && m.status === 'active');
        for (const med of patientMeds) {
          const drugLower = `${med.tradeName} ${med.genericName}`.toLowerCase();
          const isPenicillinDrug = drugLower.includes('penicillin') || drugLower.includes('amoxicillin') || drugLower.includes('ampicillin') || drugLower.includes('augmentin') || drugLower.includes('ceftriaxone') || drugLower.includes('cefotaxime') || drugLower.includes('klaforan') || drugLower.includes('cefazolin');
          const isSulfaDrug = drugLower.includes('sulfa') || drugLower.includes('bactrim') || drugLower.includes('trimethoprim') || drugLower.includes('septra');
          const isNsaidDrug = drugLower.includes('aspirin') || drugLower.includes('ibuprofen') || drugLower.includes('ketorolac') || drugLower.includes('toradol') || drugLower.includes('diclofenac') || drugLower.includes('voltaren');

          const hasPenicillinClash = (allergiesLower.includes('penicillin') || allergiesLower.includes('بنسلين')) && isPenicillinDrug;
          const hasSulfaClash = (allergiesLower.includes('sulfa') || allergiesLower.includes('سلفا')) && isSulfaDrug;
          const hasNsaidClash = (allergiesLower.includes('aspirin') || allergiesLower.includes('أسبرين') || allergiesLower.includes('nsaid')) && isNsaidDrug;

          if (hasPenicillinClash || hasSulfaClash || hasNsaidClash) {
            const id = `alert-allergy-${adm.admissionId}-${med.id}`;
            const ack = acks[id];
            const allergen = hasPenicillinClash ? 'Penicillin / Beta-lactam' : hasSulfaClash ? 'Sulfonamides' : 'Aspirin / NSAIDs';
            alerts.push({
              id,
              titleAr: `إنذار أمان دوائي: تعارض حساسية مريض مع ${med.tradeName}`,
              titleEn: `Critical Drug-Allergy Conflict: ${med.tradeName}`,
              messageAr: `المريضة ${patName} تعاني من حساسية موثقة ضد (${allergyStr})، وتم وصف الدواء (${med.tradeName} - ${med.genericName}). خطر صدمة حساسية مفرطة (Anaphylaxis)!`,
              messageEn: `Patient ${patName} has documented allergy to (${allergyStr}) and is prescribed (${med.tradeName} - ${med.genericName}). High risk of anaphylaxis.`,
              severity: 'critical',
              category: 'medication_allergy',
              patientMrn: adm.mrn,
              patientName: patName,
              admissionId: adm.admissionId,
              roomNumber: adm.roomNumber,
              timestamp: med.createdAt || currentTime,
              isAcknowledged: !!ack,
              acknowledgedBy: ack?.acknowledgedBy,
              acknowledgedAt: ack?.acknowledgedAt,
              metricValue: `Allergy: ${allergen}`,
              aiRecommendation: `أوقف الدواء فوراً واطلب استشارة الصيدلي السريري لاستبداله ببديل آمن لا يتعارض مع ${allergen}.`,
              actionLink: { tab: 'emar', labelAr: 'مراجعة تعارض الدواء في eMAR', labelEn: 'Review Interaction in eMAR' }
            });
          }
        }
      }

      // 3.1 Drug-Drug Interactions across prescribed active medications
      const patientMeds = this.data.medications.filter(m => m.admissionId === adm.admissionId && m.status === 'active');
      for (let i = 0; i < patientMeds.length; i++) {
        for (let j = i + 1; j < patientMeds.length; j++) {
          const medA = patientMeds[i];
          const medB = patientMeds[j];
          const textA = `${medA.tradeName} ${medA.genericName}`.toLowerCase();
          const textB = `${medB.tradeName} ${medB.genericName}`.toLowerCase();

          // Interaction 1: Anticoagulant (Enoxaparin / Heparin) + NSAID (Ketorolac / Toradol / Aspirin)
          const isAnticoag = (t: string) => t.includes('enoxaparin') || t.includes('clexane') || t.includes('heparin');
          const isNsaid = (t: string) => t.includes('ketorolac') || t.includes('toradol') || t.includes('ibuprofen') || t.includes('aspirin') || t.includes('voltaren') || t.includes('diclofenac');

          if ((isAnticoag(textA) && isNsaid(textB)) || (isAnticoag(textB) && isNsaid(textA))) {
            const id = `alert-ddi-bleed-${adm.admissionId}-${medA.id}-${medB.id}`;
            const ack = acks[id];
            alerts.push({
              id,
              titleAr: `تحذير تفاعل دوائي حرج: ${medA.tradeName} + ${medB.tradeName}`,
              titleEn: `Drug-Drug Interaction: ${medA.tradeName} & ${medB.tradeName}`,
              messageAr: `تفاعل دوائي خطير بين مضاد التخثر (${medA.tradeName}) ومضاد الالتهاب (${medB.tradeName}) يزيد خطر النزيف الجراحي والداخلي بصورة حادة ومضاعفة!`,
              messageEn: `Severe interaction between anticoagulant (${medA.tradeName}) and NSAID (${medB.tradeName}) markedly escalating hemorrhagic risk.`,
              severity: 'critical',
              category: 'medication_allergy',
              patientMrn: adm.mrn,
              patientName: patName,
              admissionId: adm.admissionId,
              roomNumber: adm.roomNumber,
              timestamp: medA.createdAt || currentTime,
              isAcknowledged: !!ack,
              acknowledgedBy: ack?.acknowledgedBy,
              acknowledgedAt: ack?.acknowledgedAt,
              metricValue: 'Bleeding Hazard Risk',
              aiRecommendation: 'يوصى بتعليق مضاد الالتهاب اللاستيرويدي والاستعاضة عنه بالباراسيتامول الوريدي (Perfalgan) لضبط الألم دون المساس بتخثر الدم.',
              actionLink: { tab: 'emar', labelAr: 'مراجعة التفاعل الدوائي في eMAR', labelEn: 'Review Interaction in eMAR' }
            });
          }

          // Interaction 2: Magnesium Sulfate + Calcium Channel Blocker (Nifedipine)
          const isMg = (t: string) => t.includes('magnesium') || t.includes('mgso4');
          const isCcb = (t: string) => t.includes('nifedipine') || t.includes('adalat');

          if ((isMg(textA) && isCcb(textB)) || (isMg(textB) && isCcb(textA))) {
            const id = `alert-ddi-mg-ccb-${adm.admissionId}-${medA.id}-${medB.id}`;
            const ack = acks[id];
            alerts.push({
              id,
              titleAr: `تحذير تفاعل دوائي: ${medA.tradeName} + ${medB.tradeName}`,
              titleEn: `Drug-Drug Interaction: ${medA.tradeName} & ${medB.tradeName}`,
              messageAr: `الجمع بين سلفات المغنيسيوم والنيفيديبين قد يسبب هبوطاً حاداً في ضغط الدم وحصاراً عصبياً عضلياً شديداً.`,
              messageEn: `Concurrent Magnesium Sulfate and Nifedipine may cause profound hypotension and severe neuromuscular blockade.`,
              severity: 'critical',
              category: 'medication_allergy',
              patientMrn: adm.mrn,
              patientName: patName,
              admissionId: adm.admissionId,
              roomNumber: adm.roomNumber,
              timestamp: medA.createdAt || currentTime,
              isAcknowledged: !!ack,
              acknowledgedBy: ack?.acknowledgedBy,
              acknowledgedAt: ack?.acknowledgedAt,
              metricValue: 'Profound Hypotension Hazard',
              aiRecommendation: 'مراقبة لصيقة لضغط الدم والمنعكسات العضلية وتجنب الإعطاء الوريدي المتزامن.',
              actionLink: { tab: 'emar', labelAr: 'مراجعة التفاعل الدوائي في eMAR', labelEn: 'Review Interaction in eMAR' }
            });
          }
        }
      }
    }

    // 4. Critical LIS Lab Results
    const critLabs = this.data.labOrders.filter(o => 
      o.results && o.results.some(r => r.isCritical) &&
      (!admissionId || o.admissionId === admissionId)
    );
    for (const lab of critLabs) {
      const id = `alert-lab-crit-${lab.id}`;
      const ack = acks[id] || (lab.criticalAlertAcknowledged ? { acknowledgedBy: lab.criticalAlertAcknowledgedBy || 'Doctor', acknowledgedAt: lab.orderTime } : undefined);
      const critParams = lab.results.filter(r => r.isCritical).map(r => `${r.name}: ${r.value} ${r.unit}`).join(', ');
      const relatedAdm = this.data.admissions.find(a => a.admissionId === lab.admissionId);
      const patientMrn = relatedAdm?.mrn || 'N/A';

      alerts.push({
        id,
        titleAr: `نتائج مختبر حرجة تستوجب الإقرار الفوري: ${lab.testName}`,
        titleEn: `Critical LIS Lab Alert: ${lab.testName}`,
        messageAr: `تحليل ${lab.testName} للمريضة ${lab.patientName} أظهر قيماً حرجة: ${critParams}. يتطلب إقرار الطبيب المعالج واتخاذ إجراء علاجي عاجل.`,
        messageEn: `Lab ${lab.testName} for ${lab.patientName} showed critical panic values: ${critParams}. Immediate physician review required.`,
        severity: 'critical',
        category: 'lab_lis',
        patientMrn,
        patientName: lab.patientName,
        admissionId: lab.admissionId,
        timestamp: lab.orderTime || currentTime,
        isAcknowledged: !!ack,
        acknowledgedBy: ack?.acknowledgedBy,
        acknowledgedAt: ack?.acknowledgedAt,
        metricValue: critParams,
        aiRecommendation: critParams.toLowerCase().includes('hb') || critParams.toLowerCase().includes('hemoglobin') ? 'فحص النزف السريري، حجز وحدتي دم متطابق 2 Units PRBCs، وقياس العلامات الحيوية.' : 'تقييم سريري عاجل ومراجعة أخصائي المختبر.',
        actionLink: { tab: 'lis', labelAr: 'مراجعة المختبر والإقرار', labelEn: 'Review & Acknowledge LIS' }
      });
    }

    // 5. Overdue eMAR doses & Medication schedule reminders
    const overdueEmars = this.data.emarRecords.filter(e => 
      e.status === 'delayed' || 
      (e.status === 'scheduled' && (!admissionId || e.admissionId === admissionId))
    );
    for (const emar of overdueEmars.slice(0, 6)) {
      const isOverdue = emar.status === 'delayed';
      const id = isOverdue ? `alert-emar-overdue-${emar.id}` : `alert-emar-reminder-${emar.id}`;
      const ack = acks[id];
      const relatedAdm = this.data.admissions.find(a => a.admissionId === emar.admissionId);
      const patName = relatedAdm?.patientName || 'المريضة';
      const patMrn = relatedAdm?.mrn;

      alerts.push({
        id,
        titleAr: isOverdue 
          ? `تأخر حرج في إعطاء دواء: ${emar.medicationName}` 
          : `تذكير بموعد إعطاء دواء قادم: ${emar.medicationName}`,
        titleEn: isOverdue 
          ? `Overdue Medication: ${emar.medicationName}` 
          : `Upcoming Medication Dose: ${emar.medicationName}`,
        messageAr: isOverdue
          ? `جرعة ${emar.medicationName} (${emar.dose} - ${emar.route}) للمريضة ${patName} تجاوزت نافذة التوقيت النظامية (60 دقيقة). يتطلب الإعطاء فوراً أو توثيق عذر التأخير.`
          : `موعد إعطاء جرعة ${emar.medicationName} (${emar.dose} - ${emar.route}) للمريضة ${patName} حل أو يقترب (${emar.scheduledTime || 'الآن'}). جهز الجرعة وسجل الإعطاء في eMAR.`,
        messageEn: isOverdue
          ? `Medication dose ${emar.medicationName} for ${patName} is past the 60-min window. Administer immediately or record delay reason.`
          : `Scheduled dose ${emar.medicationName} (${emar.dose}) for ${patName} is due now (${emar.scheduledTime || 'Now'}). Prepare and administer in eMAR.`,
        severity: isOverdue ? 'critical' : 'warning',
        category: 'emar_delay',
        patientMrn: patMrn,
        patientName: patName,
        admissionId: emar.admissionId,
        timestamp: emar.scheduledTime || currentTime,
        isAcknowledged: !!ack,
        acknowledgedBy: ack?.acknowledgedBy,
        acknowledgedAt: ack?.acknowledgedAt,
        actionLink: { tab: 'emar', labelAr: 'الانتقال إلى سجل التمريض eMAR', labelEn: 'Go to eMAR' }
      });
    }

    // 5.1 Clinic Appointments Reminders (مواعيد العيادات والعمليات المهمة)
    if (this.data.appointments && this.data.appointments.length > 0) {
      const todayStr = currentTime.split('T')[0];
      const relevantAppointments = this.data.appointments.filter(apt => 
        apt.status === 'confirmed' || apt.status === 'scheduled' || apt.status === 'in_progress'
      );

      for (const apt of relevantAppointments) {
        if (admissionId) {
          const adm = this.data.admissions.find(a => a.admissionId === admissionId);
          if (adm && adm.mrn !== apt.patientMrn) continue;
        }

        const id = `alert-apt-${apt.id}`;
        const ack = acks[id];
        const isToday = apt.date === todayStr;

        alerts.push({
          id,
          titleAr: isToday 
            ? `تنبيه موعد اليوم: ${apt.patientName} (${apt.visitType})`
            : `تذكير بموعد عيادة قادم: ${apt.patientName}`,
          titleEn: isToday 
            ? `Today's Appointment: ${apt.patientName}` 
            : `Upcoming Clinic Appointment: ${apt.patientName}`,
          messageAr: `موعد عيادة (${apt.visitType}) محجوز للمريضة ${apt.patientName} مع ${apt.doctorName} بتاريخ ${apt.date} الساعة ${apt.timeSlot}. رقم الحجز: #${apt.appointmentNumber}.`,
          messageEn: `Scheduled appointment (${apt.visitType}) for ${apt.patientName} with ${apt.doctorName} on ${apt.date} at ${apt.timeSlot}. Booking #${apt.appointmentNumber}.`,
          severity: isToday ? 'warning' : 'info',
          category: 'clinical_meows',
          patientMrn: apt.patientMrn,
          patientName: apt.patientName,
          timestamp: `${apt.date}T${apt.timeSlot}:00Z`,
          isAcknowledged: !!ack,
          acknowledgedBy: ack?.acknowledgedBy,
          acknowledgedAt: ack?.acknowledgedAt,
          metricValue: `${apt.date} @ ${apt.timeSlot}`,
          actionLink: { tab: 'appointments', labelAr: 'إدارة المواعيد والعيادات', labelEn: 'View Appointments' }
        });
      }
    }

    // 6. Inventory Low Stock Alerts (Medicines & Surgical Supplies)
    if (!admissionId) {
      const lowStockItems = this.data.inventoryItems.filter(i => i.stockLevel <= i.minThreshold);
      for (const item of lowStockItems) {
        const id = `alert-inv-${item.id}`;
        const ack = acks[id];
        const isMed = item.category === 'medicine';
        alerts.push({
          id,
          titleAr: `${isMed ? 'إنذار نفاذ دواء طوارئ:' : 'تنبيه نقص مخزون مستلزمات:'} ${item.nameAr || item.name}`,
          titleEn: `Low Stock Alert: ${item.name}`,
          messageAr: `الرصيد المتبقي من ${item.nameAr || item.name} هو (${item.stockLevel} ${item.unit})، وهو عند أو أقل من حد الأمان المحدد (${item.minThreshold}). يرجى إنشاء أمر شراء فوراً.`,
          messageEn: `Stock level of ${item.name} is ${item.stockLevel} ${item.unit}, breaching minimum safe threshold (${item.minThreshold}). Issue purchase order now.`,
          severity: isMed ? 'critical' : 'warning',
          category: 'inventory_stock',
          timestamp: item.lastRestockedAt || currentTime,
          isAcknowledged: !!ack,
          acknowledgedBy: ack?.acknowledgedBy,
          acknowledgedAt: ack?.acknowledgedAt,
          metricValue: `${item.stockLevel} / ${item.minThreshold} ${item.unit}`,
          actionLink: { tab: 'inventory', labelAr: 'إنشاء أمر شراء وتوريد', labelEn: 'Create Purchase Order' }
        });
      }

      // 7. Hospital Bed Occupancy
      const totalBeds = this.data.beds.length;
      const occupiedBeds = this.data.beds.filter(b => b.status === 'occupied').length;
      const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;
      if (occupancyRate >= 80) {
        const id = 'alert-ward-high-occupancy';
        const ack = acks[id];
        alerts.push({
          id,
          titleAr: 'تنبيه إداري: ارتفاع نسبة إشغال أسرّة الإيواء بالمستشفى',
          titleEn: 'Administrative Alert: High Bed Occupancy',
          messageAr: `نسبة إشغال أسرّة الإيواء بلغت ${Math.round(occupancyRate)}% (${occupiedBeds}/${totalBeds} سريراً مشغولاً). يرجى التنسيق مع الأطباء لإتمام إجراءات خروج الحالات المستقرة لتوفير أسرّة للطوارئ والولادات.`,
          messageEn: `Ward bed occupancy has reached ${Math.round(occupancyRate)}% (${occupiedBeds}/${totalBeds} beds occupied). Expedite stable discharge clearances.`,
          severity: 'warning',
          category: 'clinical_meows',
          timestamp: currentTime,
          isAcknowledged: !!ack,
          acknowledgedBy: ack?.acknowledgedBy,
          acknowledgedAt: ack?.acknowledgedAt,
          metricValue: `${occupiedBeds}/${totalBeds} (${Math.round(occupancyRate)}%)`,
          actionLink: { tab: 'reception', labelAr: 'إدارة أسرّة الإيواء والاستقبال', labelEn: 'Manage Ward Beds' }
        });
      }
    }

    // 8. Custom AI Insights
    if (this.data.aiCustomAlerts && this.data.aiCustomAlerts.length > 0) {
      for (const customAlert of this.data.aiCustomAlerts) {
        if (admissionId && customAlert.admissionId && customAlert.admissionId !== admissionId) continue;
        const ack = acks[customAlert.id];
        alerts.push({
          ...customAlert,
          isAcknowledged: !!ack || customAlert.isAcknowledged,
          acknowledgedBy: ack?.acknowledgedBy || customAlert.acknowledgedBy,
          acknowledgedAt: ack?.acknowledgedAt || customAlert.acknowledgedAt
        });
      }
    }

    // Filter by severity if requested
    if (severityFilter && severityFilter !== 'all') {
      return alerts.filter(a => a.severity === severityFilter);
    }

    // Sort: Unacknowledged first, then critical, then warning, then timestamp desc
    return alerts.sort((a, b) => {
      if (a.isAcknowledged !== b.isAcknowledged) {
        return a.isAcknowledged ? 1 : -1;
      }
      const sevOrder: Record<string, number> = { critical: 0, warning: 1, ai_insight: 2, info: 3 };
      const aOrder = sevOrder[a.severity] ?? 99;
      const bOrder = sevOrder[b.severity] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  public acknowledgeSmartAlert(alertId: string, userId: string, userName: string, userRole: any, notes?: string): SmartAlert {
    if (!this.data.smartAlertAcks) {
      this.data.smartAlertAcks = {};
    }

    const now = new Date().toISOString();
    this.data.smartAlertAcks[alertId] = {
      acknowledgedBy: `${userName} (${userRole})`,
      acknowledgedAt: now,
      notes
    };

    // If it is a lab alert, also update lab acknowledge state
    if (alertId.startsWith('alert-lab-crit-')) {
      const labId = alertId.replace('alert-lab-crit-', '');
      const lab = this.data.labOrders.find(l => l.id === labId);
      if (lab) {
        lab.criticalAlertAcknowledged = true;
        lab.criticalAlertAcknowledgedBy = userName;
      }
    }

    this.logAudit({
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'SmartAlert',
      entityId: alertId,
      details: `Acknowledged clinical smart alert #${alertId}. Clinician: ${userName} (${userRole}). Notes: ${notes || 'Acknowledged in Smart Alerts Center'}`
    });

    this.saveData(this.data);

    const all = this.getSmartAlerts();
    const target = all.find(a => a.id === alertId);
    return target || {
      id: alertId,
      titleAr: 'تم الإقرار',
      titleEn: 'Acknowledged',
      messageAr: 'تم الإقرار بنجاح',
      messageEn: 'Acknowledged successfully',
      severity: 'info',
      category: 'clinical_meows',
      timestamp: now,
      isAcknowledged: true,
      acknowledgedBy: userName,
      acknowledgedAt: now
    };
  }

  public addAiCustomAlert(alert: SmartAlert): SmartAlert {
    if (!this.data.aiCustomAlerts) {
      this.data.aiCustomAlerts = [];
    }
    // Prevent duplicates
    const idx = this.data.aiCustomAlerts.findIndex(a => a.id === alert.id);
    if (idx >= 0) {
      this.data.aiCustomAlerts[idx] = alert;
    } else {
      this.data.aiCustomAlerts.unshift(alert);
    }
    this.saveData(this.data);
    return alert;
  }
}

export const db = new DatabaseManager();
