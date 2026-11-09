export type Language = 'ar' | 'en';

export type UserRole = 
  | 'admin'
  | 'doctor'
  | 'nurse'
  | 'patient'
  | 'reception'
  | 'physician'
  | 'consultant'
  | 'nurse_supervisor'
  | 'lab_technician'
  | 'pharmacist'
  | 'surgeon'
  | 'anesthesiologist'
  | 'kitchen'
  | 'storekeeper'
  | 'accountant';

export type Permission = 
  | 'MANAGE_SYSTEM'
  | 'MANAGE_USERS'
  | 'VIEW_ALL_PATIENTS'
  | 'CREATE_PATIENTS'
  | 'WRITE_CLINICAL'
  | 'ORDER_MEDICATIONS'
  | 'DISCONTINUE_MEDICATIONS'
  | 'ADMINISTER_EMAR'
  | 'ORDER_LABS'
  | 'APPROVE_LABS'
  | 'MANAGE_INVENTORY'
  | 'CREATE_PO'
  | 'APPROVE_PO'
  | 'BOOK_APPOINTMENTS'
  | 'MANAGE_APPOINTMENTS'
  | 'VIEW_BILLING'
  | 'MANAGE_BILLING'
  | 'VIEW_OWN_PORTAL';

export interface SystemUser {
  id: string;
  username: string;
  name: string;
  nameAr: string;
  role: UserRole;
  title: string;
  department: string;
  permissions: Permission[];
  linkedPatientMrn?: string; // For 'patient' role
  email?: string;
  token?: string;
}

// --- Inventory & Vendor Models ---
export type InventoryCategory = 'medicine' | 'equipment' | 'supplies';
export type InventoryItemStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  nameAr: string;
  category: InventoryCategory;
  description: string;
  location: string; // e.g. "Main Pharmacy - Shelf A4", "OR Supply Room 2"
  stockLevel: number;
  minThreshold: number; // Alerts when stock <= minThreshold
  unit: string; // "Vial", "Ampoule", "Pack", "Device", "Box"
  unitCost: number; // Cost in LYD
  unitPrice: number; // Selling price in LYD
  vendorId?: string;
  vendorName?: string;
  batchNumber?: string;
  expiryDate?: string;
  status: InventoryItemStatus;
  lastRestockedAt?: string;
}

export interface Vendor {
  id: string;
  name: string;
  nameAr: string;
  code: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  category: string; // e.g. "Pharmaceuticals", "Surgical Equipment", "Laboratory Supplies"
  paymentTerms: string; // e.g. "Net 30 Days", "Immediate Cash", "Letter of Credit"
  active: boolean;
}

export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export type PurchaseOrderStatus = 'draft' | 'pending_approval' | 'approved' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  orderedBy: string;
  orderDate: string;
  approvedBy?: string;
  approvedDate?: string;
  receivedBy?: string;
  receivedDate?: string;
  notes?: string;
}

export type StockMovementType = 
  | 'PURCHASE_RECEIPT' 
  | 'PATIENT_DISPENSE' 
  | 'RETURN' 
  | 'ADJUSTMENT' 
  | 'DAMAGE';

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string; // PO Number, Dispense ID, etc.
  performedBy: string;
  timestamp: string;
  notes?: string;
}

// --- Appointment Scheduling Models ---
export type AppointmentVisitType = 
  | 'consultation' 
  | 'follow_up' 
  | 'antenatal' 
  | 'post_op' 
  | 'ultrasound';

export type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'rescheduled' 
  | 'cancelled';

export interface Appointment {
  id: string;
  appointmentNumber: string;
  patientMrn: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  department: string;
  date: string; // "YYYY-MM-DD"
  timeSlot: string; // "09:00", "09:30", "10:00", etc.
  durationMinutes: number;
  visitType: AppointmentVisitType;
  status: AppointmentStatus;
  cancellationReason?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  rescheduledFromDate?: string;
  rescheduledFromSlot?: string;
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type BloodGroupStatus = 'Verified' | 'Pending Verification' | 'Reported by Patient';

export interface Patient {
  mrn: string; // Medical Record Number e.g. MRN-2026-001
  fullName: string;
  nationalId: string;
  dob: string;
  gender: 'female' | 'male';
  phone: string;
  address: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  bloodGroup: BloodGroup;
  bloodGroupStatus: BloodGroupStatus;
  bloodGroupVerifiedBy?: string;
  allergies: string[]; // e.g. "Penicillin (Anaphylaxis)", "Sulfa Drugs", "No Known Allergies (NKDA)"
  chronicConditions: string[]; // e.g. "Gestational Diabetes", "Chronic Hypertension"
  pastMedicalHistory: string;
  pastSurgicalHistory: string;
  drugHistory: string;
  familyHistory: string;
  createdAt: string;
}

export type AdmissionSource = 'emergency' | 'outpatient' | 'referral';
export type PayerType = 'self' | 'family' | 'corporate_insurance';
export type RoomType = 'standard' | 'vip' | 'special_care';
export type BedStatus = 'vacant' | 'occupied' | 'reserved' | 'cleaning';
export type AdmissionStatus = 'active' | 'discharged' | 'dama' | 'transferred';

export type InfectionIsolationStatus = 'standard' | 'contact_isolation' | 'droplet_isolation' | 'airborne' | 'protective';

export interface Bed {
  id: string;
  number: string;
  ward: string;
  roomNumber: string;
  roomType: RoomType;
  status: BedStatus;
  dailyRate: number; // e.g. 150 LYD for standard, 350 LYD for VIP
  currentAdmissionId?: string;
  currentPatientName?: string;
  patientGender?: 'female' | 'male' | 'newborn';
  infectionStatus?: InfectionIsolationStatus;
}

export interface BedTransfer {
  id: string;
  admissionId: string;
  fromBedId: string;
  fromRoom: string;
  toBedId: string;
  toRoom: string;
  timestamp: string;
  reason: string;
  financialImpactNote: string;
  transferredBy: string;
}

export interface Admission {
  admissionId: string; // e.g. ADM-2026-101
  mrn: string;
  patientName: string;
  admissionDate: string; // ISO string
  receptionTime: string;
  wardArrivalTime: string;
  source: AdmissionSource;
  referralDetails?: string;
  attendingConsultantId: string;
  attendingConsultantName: string;
  admittingDoctorId: string;
  admittingDoctorName: string;
  department: string; // e.g. "Obstetrics & Gynecology" (أمراض النساء والولادة)
  bedId: string;
  roomNumber: string;
  roomType: RoomType;
  payerType: PayerType;
  corporateName?: string;
  corporateContractNo?: string;
  packageId?: string;
  packageName?: string;
  status: AdmissionStatus;
  dischargeDate?: string;
  bedTransfers: BedTransfer[];
}

export interface VitalSigns {
  id: string;
  admissionId: string;
  timestamp: string;
  bpSystolic: number;
  bpDiastolic: number;
  pulse: number;
  respRate: number;
  temp: number;
  spO2: number;
  consciousness: 'Alert' | 'Verbal' | 'Pain' | 'Unresponsive';
  painScale: number; // 0-10
  weightKg?: number;
  heightCm?: number;
  recordedBy: string;
}

export interface ObGynAssessment {
  gravida: number; // G
  para: number; // P
  abortions: number; // A
  living: number; // L
  lmp: string; // Last Menstrual Period
  edd: string; // Estimated Due Date
  gestationalAgeWeeks: number;
  gestationalAgeDays: number;
  obstetricHistory: string; // Previous C-sections, complications
  currentPregnancyDetails: {
    fetalHeartRateBpm: number;
    presentation: 'Cephalic' | 'Breech' | 'Transverse';
    amnioticFluid: 'Intact' | 'Ruptured Clear' | 'Meconium Stained';
    uterineContractions: string;
    cervicalDilationCm: number;
    effacementPercent: number;
  };
  otherGynecologicalHistory: string;
}

export interface PediatricGrowthRecord {
  id: string;
  admissionId: string;
  timestamp: string;
  ageDays: number;
  ageLabel?: string;
  gender: 'female' | 'male';
  weightKg: number;
  lengthCm: number;
  headCircumferenceCm: number;
  feedingType?: 'exclusive_breastfeeding' | 'formula' | 'mixed' | 'tpm_iv';
  recordedBy: string;
  notes?: string;
  percentiles?: {
    weightPercentile?: number;
    lengthPercentile?: number;
    headPercentile?: number;
  };
}

export interface ClinicalAssessment {
  id: string;
  admissionId: string;
  chiefComplaint: string;
  chiefComplaintDuration: string;
  historyOfPresentIllness: string;
  systemicExam: {
    cardiovascular: string;
    respiratory: string;
    abdominal: string;
    general: string;
  };
  obGyn?: ObGynAssessment;
  vitals: VitalSigns[];
  updatedAt: string;
  assessedBy: string;
  pediatricGrowthRecords?: PediatricGrowthRecord[];
}

export type ManagementPlanType = 
  | 'medical'
  | 'observation'
  | 'obstetric'
  | 'elective_surgery'
  | 'urgent_surgery';

export interface ManagementPlan {
  id: string;
  admissionId: string;
  planType: ManagementPlanType;
  procedureNature: string;
  urgencyLevel: 'Elective' | 'Urgent' | 'Emergency';
  notes: string;
  physicianId: string;
  physicianName: string;
  createdAt: string;
  version: number;
}

export type DietType = 
  | 'regular'
  | 'diabetic'
  | 'low_salt'
  | 'soft'
  | 'liquids_only'
  | 'npo'
  | 'special';

export interface DietaryOrder {
  id: string;
  admissionId: string;
  dietType: DietType;
  specialInstructions?: string;
  npoReason?: string;
  startTime: string;
  endTime?: string;
  orderedBy: string;
  status: 'active' | 'completed' | 'cancelled';
  kitchenStatus: 'pending' | 'prepared' | 'delivered';
  deliveredMealsCount: number;
  companionMealsCount: number;
}

export type MedicationRoute = 'PO' | 'IV' | 'IM' | 'SC' | 'PR' | 'Inhalation' | 'Topical';

export interface MedicationOrder {
  id: string;
  admissionId: string;
  tradeName: string;
  genericName: string;
  dosageForm: string; // Tablet, Vial, Ampoule, Infusion, Syrup
  strength: string; // 1g, 500mg, 10 IU
  dose: string;
  route: MedicationRoute;
  frequency: string; // OD, BD, TID, QID, Q8H, Q12H, Stat, PRN
  exactTimes: string[]; // e.g. ["08:00", "16:00", "24:00"]
  durationDays: number;
  startDate: string;
  endDate: string;
  instructions?: string;
  status: 'active' | 'discontinued' | 'held';
  discontinueReason?: string;
  discontinuedBy?: string;
  discontinuedAt?: string;
  prescribedBy: string;
  createdAt: string;
}

export type EMARStatus = 'scheduled' | 'given' | 'refused' | 'held' | 'missed' | 'delayed';

export interface EMARRecord {
  id: string;
  orderId: string;
  admissionId: string;
  medicationName: string;
  dose: string;
  route: MedicationRoute;
  scheduledTime: string; // ISO
  scheduledHour: string; // e.g. "08:00"
  actualGivenTime?: string;
  administeredBy?: string;
  status: EMARStatus;
  delayReason?: string;
  supervisorApproval?: {
    approvedBy: string;
    approvedAt: string;
    note: string;
  };
  notes?: string;
}

export interface LabTestItem {
  name: string;
  key: string;
  value: number | string;
  unit: string;
  refRange: string;
  isAbnormal?: boolean;
  isCritical?: boolean;
}

export type LabOrderStatus = 'ordered' | 'sample_collected' | 'received_in_lab' | 'processing' | 'approved' | 'cancelled';

export interface LabOrder {
  id: string;
  admissionId: string;
  patientName: string;
  testName: string; // e.g. "CBC", "Renal Function", "Coagulation Profile"
  category: 'Hematology' | 'Biochemistry' | 'Blood Bank' | 'Microbiology' | 'Serology';
  urgency: 'Routine' | 'Urgent' | 'Stat';
  orderedBy: string;
  orderTime: string;
  sampleCollectedAt?: string;
  sampleCollectedBy?: string;
  labReceivedAt?: string;
  labReceivedBy?: string;
  status: LabOrderStatus;
  approvedBy?: string;
  approvedAt?: string;
  results: LabTestItem[];
  criticalAlertAcknowledged?: boolean;
  criticalAlertAcknowledgedBy?: string;
}

export interface Consultation {
  id: string;
  admissionId: string;
  patientName: string;
  specialty: string; // e.g. "Cardiology", "Internal Medicine", "Anesthesia", "Pediatrics"
  requestingPhysician: string;
  urgency: 'Routine' | 'Urgent' | 'Immediate';
  reason: string;
  requestTime: string;
  notifiedTime?: string;
  responseTime?: string;
  arrivalTime?: string;
  consultantName?: string;
  findings?: string;
  recommendations?: string;
  ordersPlaced?: string;
  feeAmount: number; // e.g. 150 LYD
  status: 'requested' | 'notified' | 'in_progress' | 'completed';
}

export interface SurgicalChecklist {
  signInDone: boolean; // Before induction of anesthesia
  timeOutDone: boolean; // Before skin incision
  signOutDone: boolean; // Before patient leaves OR
  spongeCountCorrect: boolean;
  instrumentCountCorrect: boolean;
}

export interface OperativeReport {
  id: string;
  admissionId: string;
  procedureCode: string;
  procedureName: string;
  preOpDiagnosis: string;
  postOpDiagnosis: string;
  leadSurgeon: string;
  assistantSurgeons: string[];
  scrubNurse: string;
  circulatingNurse: string;
  anesthesiologist: string;
  startTime: string;
  endTime: string;
  surgicalSteps: string;
  findings: string;
  estimatedBloodLossMl: number;
  specimensSent: string;
  complications: string;
  postOpPlan: string;
  checklist: SurgicalChecklist;
  surgeonSignature: string;
}

export interface AnesthesiaVitalsPoint {
  time: string;
  bpSystolic: number;
  bpDiastolic: number;
  heartRate: number;
  spO2: number;
  etCO2: number;
  fluidsGivenMl: number;
}

export interface AnesthesiaRecord {
  id: string;
  admissionId: string;
  operativeId: string;
  startTime?: string;
  endTime?: string;
  status?: 'active' | 'in_progress' | 'completed' | 'pacu';
  anesthesiologist: string;
  anesthesiaType: 'Spinal' | 'Epidural' | 'General' | 'Local / Sedation';
  asaScore: 'ASA I' | 'ASA II' | 'ASA III' | 'ASA IV' | 'ASA V' | 'ASA E';
  preAnesthesiaAssessment: {
    airwayMallampati: 'Class I' | 'Class II' | 'Class III' | 'Class IV';
    fastingHours: number;
    allergiesNoted: string;
    preMedications: string;
  };
  administeredDrugs: {
    drugName: string;
    dose: string;
    route: string;
    time: string;
    givenBy: string;
  }[];
  intraopVitals: AnesthesiaVitalsPoint[];
  pacu: {
    arrivalTime: string;
    dischargeTime?: string;
    aldreteScore: number; // 0-10
    vitalsAtPACU: {
      bp: string;
      hr: number;
      spO2: number;
      consciousness: string;
    };
    handoverToNurse: string;
    postOpAnalgesiaPlan: string;
  };
}

export interface PharmacyItem {
  id: string;
  tradeName: string;
  scientificName: string;
  form: string; // Ampoule, Tablet, IV Bag, Vial
  strength: string;
  purchasePrice: number; // Wholesale cost in LYD
  sellingPrice: number; // Price to patient in LYD
  profitMarginPercent: number; // (selling - purchase) / selling * 100
  markupPercent: number; // (selling - purchase) / purchase * 100
  stockLevel: number;
  minThreshold: number;
  batchNumber: string;
  expiryDate: string;
  isConsumable: boolean; // vs returnable custody
}

export interface DispenseRecord {
  id: string;
  admissionId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  dispensedBy: string;
  timestamp: string;
  coveredByPackage: boolean;
  isReturned?: boolean;
  returnReason?: string;
  returnedAt?: string;
}

export interface StoreCustodyItem {
  id: string;
  admissionId: string;
  itemName: string; // e.g. "Luxury Linen Set", "Orthopedic Blanket", "Nebulizer Device"
  type: 'consumable' | 'custody';
  quantity: number;
  assignedAt: string;
  assignedBy: string;
  returnedAt?: string;
  condition?: 'Returned Clean' | 'Damaged' | 'Missing';
}

export interface MedicalPackage {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  totalPrice: number; // Fixed package price in LYD
  includedDays: number;
  roomTypeIncluded: RoomType;
  includedDoctorVisits: number;
  includedNursingDays: number;
  includedProcedures: string[];
  includedLabs: string[]; // List of included lab names
  includedMedsLimitAmount: number; // Free meds allowance
  description: string;
}

export interface BillingLineItem {
  id: string;
  category: 'room' | 'doctor_visit' | 'consultation' | 'nursing' | 'lab' | 'pharmacy' | 'surgery' | 'anesthesia' | 'meals' | 'companion' | 'other';
  description: string;
  descriptionAr: string;
  date: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  coveredByPackage: boolean;
  isNpoDeduction?: boolean;
}

export interface PaymentReceipt {
  id: string;
  admissionId: string;
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Letter of Guarantee';
  receivedBy: string;
  receiptNumber: string;
  timestamp: string;
  notes?: string;
}

export interface ProvisionalInvoice {
  admissionId: string;
  patientName: string;
  mrn: string;
  roomNumber: string;
  admissionDate: string;
  cutoffTime: string; // e.g. "2026-11-07 11:00 AM"
  generatedAt: string;
  items: BillingLineItem[];
  packageApplied?: {
    packageId: string;
    packageName: string;
    packagePrice: number;
    includedUsedSummary: string;
  };
  totalBilled: number;
  totalPackageCovered: number;
  totalPayableBeforeDiscounts: number;
  totalPaymentsReceived: number;
  provisionalBalanceDue: number;
  mandatoryNoticeAr: string;
  mandatoryNoticeEn: string;
}

export interface DischargeSummary {
  id: string;
  admissionId: string;
  mrn: string;
  patientName: string;
  department: string;
  admissionDate: string;
  dischargeDate: string;
  admissionDiagnosis: string;
  finalDiagnosis: string;
  treatmentAndHospitalCourse: string;
  surgicalInterventions: string;
  dischargeCondition: 'Improved' | 'Cured' | 'Stable' | 'Critical' | 'Deceased';
  disposition: 'Home' | 'Transferred' | 'DAMA (Against Medical Advice)';
  dischargeMedications: string[];
  aftercareInstructions: string;
  followUpDate: string;
  attendingPhysicianName: string;
  attendingPhysicianSignature: string;
}

// --- Consent Forms (Informed Consent, Surgery, Anesthesia, Transfusion, Admission) ---
export type ConsentType = 
  | 'general_admission'
  | 'surgical_operative'
  | 'anesthesia_epidural'
  | 'blood_transfusion'
  | 'high_risk_obstetric'
  | 'dama_refusal';

export type ConsentStatus = 'signed' | 'draft' | 'revoked';

export interface ConsentForm {
  id: string;
  consentNumber: string; // e.g. "CNS-2026-0042"
  admissionId: string;
  mrn: string;
  patientName: string;
  type: ConsentType;
  titleAr: string;
  titleEn: string;
  procedureName: string;
  clinicalIndication: string;
  risksExplained: string[];
  alternativesExplained?: string;
  emergencyConversionAuthorized: boolean;
  bloodTransfusionPermitted?: boolean;
  signerType: 'patient' | 'spouse' | 'guardian' | 'relative';
  signerName: string;
  signerNationalId: string;
  signerRelationship: string;
  signerPhone?: string;
  signerSignature: string; // Draw data URL or verified digital signature
  signedDate: string;
  physicianName: string;
  physicianLicense: string;
  physicianSignature: string;
  witnessName: string;
  witnessRole: string;
  witnessSignature?: string;
  status: ConsentStatus;
  notes?: string;
}

export interface DAMAForm {
  id: string;
  admissionId: string;
  mrn: string;
  patientName: string;
  explanationOfRisksGiven: boolean;
  explainedRisksDetails: string;
  refusalReason: string;
  patientOrGuardianSignature: string;
  isSignatureRefused: boolean;
  witnessName: string;
  witnessRole: string;
  doctorName: string;
  timestamp: string;
}

export interface MedicalReport {
  id: string;
  reportNumber: string;
  admissionId: string;
  mrn: string;
  patientName: string;
  issueDate: string;
  feeAmount: number; // 25 LYD per document policy
  feePaid: boolean;
  clinicalSummary: string;
  currentStatus: string;
  interventionsDone: string;
  consultingSpecialistName?: string;
  attendingConsultantName: string;
  hospitalStampApproved: boolean;
  digitalSignatureHash: string;
}

// --- Voice Notes, Dictation & Free AI Scribe ---
export type VoiceNoteCategory = 
  | 'clinical_round'
  | 'operative_dictation'
  | 'nursing_handover'
  | 'discharge_instruction'
  | 'consent_explanation';

export interface VoiceNote {
  id: string;
  admissionId: string;
  mrn: string;
  patientName: string;
  recordedBy: string;
  recordedByRole: UserRole;
  timestamp: string;
  durationSeconds: number;
  audioUrl?: string; // Base64 data URL or audio link
  category: VoiceNoteCategory;
  title: string;
  transcript: string;
  aiStructuredSoap?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  aiSummary?: string;
  tags?: string[];
}

export interface AIAssistRequest {
  task: 'soap_structuring' | 'discharge_summary' | 'consent_draft' | 'translate_medical' | 'voice_cleanup' | 'narrative_clinical_summary' | 'shift_handover';
  text: string;
  patientContext?: {
    patientName?: string;
    mrn?: string;
    age?: number;
    department?: string;
    diagnosis?: string;
    roomNumber?: string;
    attendingConsultantName?: string;
  };
  targetLanguage?: 'ar' | 'en';
}

export interface AIAssistResponse {
  result: string;
  structuredSoap?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  modelUsed: string;
}

export interface ShiftHandoverChecklistItem {
  id: string;
  text: string;
  category: 'medication' | 'lab' | 'vital' | 'wound_care' | 'dietary' | 'general';
  dueTime?: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface ShiftHandoverRecord {
  id: string;
  admissionId: string;
  patientMrn: string;
  patientName: string;
  roomNumber: string;
  shiftType: 'day_shift' | 'night_shift';
  timeframeHours: 8 | 12 | 24;
  outgoingNurseId: string;
  outgoingNurseName: string;
  incomingNurseId?: string;
  incomingNurseName?: string;
  createdAt: string;
  acknowledgedAt?: string;
  status: 'draft' | 'endorsed' | 'acknowledged';
  sbar: {
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
  };
  keyEventsSummary: {
    vitalsSummary: string;
    labResultsSummary: string;
    medicationsSummary: string;
    operativeNotesSummary?: string;
  };
  checklist: ShiftHandoverChecklistItem[];
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'LOGICAL_DELETE' | 'DISCONTINUE' | 'VIEW' | 'SUPERVISOR_OVERRIDE' | 'ARCHIVE';
  entity: string; // e.g. "MedicationOrder", "Admission", "LabOrder", "VitalSigns"
  entityId: string;
  patientMRN?: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

// --- Smart Alerts & Clinical Decision Support System ---
export type AlertSeverity = 'critical' | 'warning' | 'ai_insight' | 'info';

export type AlertCategory = 
  | 'clinical_meows' 
  | 'lab_lis' 
  | 'medication_allergy' 
  | 'emar_delay' 
  | 'consent_surgery' 
  | 'inventory_stock' 
  | 'ai_proactive';

export interface SmartAlertActionLink {
  tab: string;
  subTab?: string;
  labelAr: string;
  labelEn: string;
}

export interface SmartAlert {
  id: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  severity: AlertSeverity;
  category: AlertCategory;
  patientMrn?: string;
  patientName?: string;
  admissionId?: string;
  roomNumber?: string;
  timestamp: string;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  actionLink?: SmartAlertActionLink;
  metricValue?: string;
  aiRecommendation?: string;
}

// --- Comprehensive Hospital Financial Accounting & General Ledger Types ---

export interface DisbursementVoucher {
  id: string;
  voucherNumber: string; // e.g. "PV-2026-0041"
  date: string;
  beneficiary: string; // e.g. "د. طارق بن عامر", "شركة الأدوية المتحدة", "المورد الطبي"
  beneficiaryType: 'doctor' | 'vendor' | 'employee' | 'utility' | 'patient_refund';
  category: 'doctor_commission' | 'vendor_invoice' | 'medical_supplies' | 'salaries' | 'maintenance' | 'refund';
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque';
  bankName?: string;
  chequeNumber?: string;
  accountCode: string; // e.g. "5102"
  accountNameAr: string;
  description: string;
  admissionId?: string;
  receiptReference?: string;
  approvedBy: string;
  issuedBy: string;
  timestamp: string;
  notes?: string;
}

export interface JournalEntryLine {
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string; // e.g. "JV-2026-0812"
  date: string;
  referenceType: 'patient_bill' | 'receipt_voucher' | 'disbursement_voucher' | 'doctor_settlement' | 'insurance_claim' | 'manual';
  referenceId: string;
  descriptionAr: string;
  descriptionEn: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  postedBy: string;
  isBalanced: boolean;
  timestamp: string;
}

export interface AccountChartItem {
  code: string;
  nameAr: string;
  nameEn: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentCode?: string;
  level: number;
  debitTotal: number;
  creditTotal: number;
  balance: number;
  normalBalance: 'debit' | 'credit';
  categoryGroupAr: string;
}

export interface DoctorSettlementCase {
  admissionId: string;
  patientName: string;
  date: string;
  serviceType: 'surgery' | 'rounds' | 'consultation';
  serviceName: string;
  totalFee: number;
  hospitalShare: number;
  doctorShare: number;
  status: 'pending' | 'settled';
  settlementVoucherId?: string;
}

export interface DoctorSettlement {
  doctorId: string;
  doctorName: string;
  specialty: string;
  totalCases: number;
  totalEarned: number;
  totalPaid: number;
  pendingBalance: number;
  cases: DoctorSettlementCase[];
  lastPaymentDate?: string;
}

export interface CorporateClaim {
  id: string;
  claimNumber: string; // e.g. "CLM-2026-901"
  corporateName: string; // e.g. "شركة المدار الجديد", "شركة البريقة"
  corporateContractNo: string;
  admissionId: string;
  patientName: string;
  mrn: string;
  submissionDate: string;
  totalBilledAmount: number;
  patientCopayDeductible: number;
  netCorporateClaim: number;
  status: 'submitted' | 'approved' | 'partially_settled' | 'settled' | 'rejected';
  letterOfGuaranteeNo: string;
  approvedAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  notes?: string;
}

export interface FinancialOverviewData {
  totalGrossRevenue: number;
  totalCashCollected: number;
  totalBankCollected: number;
  totalPatientReceivables: number;
  totalCorporateReceivables: number;
  totalDoctorLiabilities: number;
  totalDisbursements: number;
  cashDrawerBalance: number;
  bankAccountBalance: number;
  departmentRevenue: Array<{
    departmentAr: string;
    departmentEn: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  dailyTrend: Array<{
    date: string;
    label: string;
    revenue: number;
    receipts: number;
    disbursements: number;
  }>;
  payerBreakdown: Array<{
    name: string;
    amount: number;
    count: number;
  }>;
  recentTransactionsCount: number;
}

