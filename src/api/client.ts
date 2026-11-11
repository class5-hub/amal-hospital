import {
  Patient,
  Admission,
  Bed,
  ClinicalAssessment,
  VitalSigns,
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
  MedicalPackage,
  PaymentReceipt,
  ProvisionalInvoice,
  DischargeSummary,
  DAMAForm,
  MedicalReport,
  ConsentForm,
  VoiceNote,
  AIAssistRequest,
  AIAssistResponse,
  AuditLogEntry,
  SystemUser,
  InventoryItem,
  InventoryBatch,
  Vendor,
  PurchaseOrder,
  StockMovement,
  Appointment,
  UserRole,
  Permission,
  InventoryCategory,
  PurchaseOrderStatus,
  SmartAlert,
  DisbursementVoucher,
  JournalEntry,
  AccountChartItem,
  DoctorSettlement,
  CorporateClaim,
  FinancialOverviewData
} from '../types/hmis.ts';

const API_BASE = '/api';

export const api = {
  // Users
  getUsers: async (): Promise<SystemUser[]> => {
    const res = await fetch(`${API_BASE}/system/users`);
    return res.json();
  },

  // Patients
  getPatients: async (): Promise<Patient[]> => {
    const res = await fetch(`${API_BASE}/patients`);
    return res.json();
  },
  getPatient: async (mrn: string): Promise<Patient> => {
    const res = await fetch(`${API_BASE}/patients/${mrn}`);
    return res.json();
  },
  createPatient: async (patient: Omit<Patient, 'createdAt'>, user: { id: string; name: string; role: any }): Promise<Patient> => {
    const res = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create patient');
    }
    return res.json();
  },

  // Beds & Admissions
  getBeds: async (): Promise<Bed[]> => {
    const res = await fetch(`${API_BASE}/beds`);
    return res.json();
  },
  updateBed: async (bedId: string, updates: Partial<Bed>, user?: { id: string; name: string; role: any }): Promise<Bed> => {
    const res = await fetch(`${API_BASE}/beds/${bedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, userId: user?.id, userName: user?.name, userRole: user?.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update bed status');
    }
    return res.json();
  },
  getAdmissions: async (): Promise<Admission[]> => {
    const res = await fetch(`${API_BASE}/admissions`);
    return res.json();
  },
  getAdmission: async (id: string): Promise<Admission> => {
    const res = await fetch(`${API_BASE}/admissions/${id}`);
    return res.json();
  },
  createAdmission: async (admission: Omit<Admission, 'admissionId' | 'bedTransfers'>, user: { id: string; name: string; role: any }): Promise<Admission> => {
    const res = await fetch(`${API_BASE}/admissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admission, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create admission');
    }
    return res.json();
  },
  transferBed: async (admissionId: string, toBedId: string, reason: string, user: { id: string; name: string; role: any }): Promise<{ admission: Admission; transfer: any }> => {
    const res = await fetch(`${API_BASE}/admissions/${admissionId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toBedId, reason, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to transfer bed');
    }
    return res.json();
  },

  // Clinical Assessment
  getAssessment: async (admissionId: string): Promise<ClinicalAssessment | null> => {
    const res = await fetch(`${API_BASE}/assessments/${admissionId}`);
    return res.json();
  },
  saveAssessment: async (admissionId: string, assessment: Partial<ClinicalAssessment>, user: { id: string; name: string; role: any }): Promise<ClinicalAssessment> => {
    const res = await fetch(`${API_BASE}/assessments/${admissionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },
  addVitals: async (admissionId: string, vitals: Omit<VitalSigns, 'id' | 'timestamp'>, user: { id: string; name: string; role: any }): Promise<VitalSigns> => {
    const res = await fetch(`${API_BASE}/vitals/${admissionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vitals, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },

  // Management Plan
  getPlans: async (admissionId: string): Promise<ManagementPlan[]> => {
    const res = await fetch(`${API_BASE}/plans/${admissionId}`);
    return res.json();
  },
  addPlan: async (plan: Omit<ManagementPlan, 'id' | 'createdAt' | 'version'>, user: { id: string; name: string; role: any }): Promise<ManagementPlan> => {
    const res = await fetch(`${API_BASE}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },

  // Dietary Orders
  getDietaryOrders: async (admissionId?: string): Promise<DietaryOrder[]> => {
    const url = admissionId ? `${API_BASE}/dietary?admissionId=${admissionId}` : `${API_BASE}/dietary`;
    const res = await fetch(url);
    return res.json();
  },
  createDietaryOrder: async (order: Omit<DietaryOrder, 'id' | 'deliveredMealsCount' | 'companionMealsCount' | 'kitchenStatus'>, user: { id: string; name: string; role: any }): Promise<DietaryOrder> => {
    const res = await fetch(`${API_BASE}/dietary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },
  updateDietaryStatus: async (orderId: string, kitchenStatus: 'pending' | 'prepared' | 'delivered', deliveredCountIncrement = 0, companionCountIncrement = 0): Promise<DietaryOrder> => {
    const res = await fetch(`${API_BASE}/dietary/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kitchenStatus, deliveredMealsIncrement: deliveredCountIncrement, companionMealsIncrement: companionCountIncrement })
    });
    return res.json();
  },

  // Medications
  getMedications: async (admissionId?: string): Promise<MedicationOrder[]> => {
    const url = admissionId ? `${API_BASE}/medications?admissionId=${admissionId}` : `${API_BASE}/medications`;
    const res = await fetch(url);
    return res.json();
  },
  prescribeMedication: async (medication: Omit<MedicationOrder, 'id' | 'createdAt' | 'status'>, user: { id: string; name: string; role: any }): Promise<MedicationOrder> => {
    const res = await fetch(`${API_BASE}/medications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medication, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },
  discontinueMedication: async (id: string, reason: string, user: { id: string; name: string; role: any }): Promise<MedicationOrder> => {
    const res = await fetch(`${API_BASE}/medications/${id}/discontinue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },

  // Nursing eMAR
  getEMAR: async (admissionId?: string): Promise<EMARRecord[]> => {
    const url = admissionId ? `${API_BASE}/emar?admissionId=${admissionId}` : `${API_BASE}/emar`;
    const res = await fetch(url);
    return res.json();
  },
  recordEMARAdministration: async (id: string, payload: {
    status: 'given' | 'refused' | 'held' | 'missed' | 'delayed';
    nurseName: string;
    delayReason?: string;
    supervisorNote?: string;
    supervisorName?: string;
    notes?: string;
  }): Promise<EMARRecord> => {
    const res = await fetch(`${API_BASE}/emar/${id}/administer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // LIS Laboratory
  getLabOrders: async (admissionId?: string): Promise<LabOrder[]> => {
    const url = admissionId ? `${API_BASE}/lab/orders?admissionId=${admissionId}` : `${API_BASE}/lab/orders`;
    const res = await fetch(url);
    return res.json();
  },
  createLabOrder: async (order: Omit<LabOrder, 'id' | 'orderTime' | 'status' | 'results'>, results: any[], user: { id: string; name: string; role: any }): Promise<LabOrder> => {
    const res = await fetch(`${API_BASE}/lab/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, results, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },
  updateLabStatus: async (orderId: string, status: any, payload: any, user: { id: string; name: string; role: any }): Promise<LabOrder> => {
    const res = await fetch(`${API_BASE}/lab/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...payload, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },
  acknowledgeLabCriticalAlert: async (orderId: string, doctorName: string): Promise<LabOrder> => {
    const res = await fetch(`${API_BASE}/lab/orders/${orderId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorName })
    });
    return res.json();
  },

  // Consultations
  getConsultations: async (admissionId?: string): Promise<Consultation[]> => {
    const url = admissionId ? `${API_BASE}/consultations?admissionId=${admissionId}` : `${API_BASE}/consultations`;
    const res = await fetch(url);
    return res.json();
  },
  createConsultation: async (consultation: Omit<Consultation, 'id' | 'requestTime' | 'status'>, user: { id: string; name: string; role: any }): Promise<Consultation> => {
    const res = await fetch(`${API_BASE}/consultations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultation, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },
  completeConsultation: async (consId: string, payload: { consultantName: string; findings: string; recommendations: string; ordersPlaced?: string }): Promise<Consultation> => {
    const res = await fetch(`${API_BASE}/consultations/${consId}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Operative & Anesthesia
  getOperativeReports: async (admissionId?: string): Promise<OperativeReport[]> => {
    const url = admissionId ? `${API_BASE}/operative?admissionId=${admissionId}` : `${API_BASE}/operative`;
    const res = await fetch(url);
    return res.json();
  },
  saveOperativeReport: async (report: OperativeReport, user: { id: string; name: string; role: any }): Promise<OperativeReport> => {
    const res = await fetch(`${API_BASE}/operative`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },
  getAnesthesiaRecords: async (admissionId?: string): Promise<AnesthesiaRecord[]> => {
    const url = admissionId ? `${API_BASE}/anesthesia?admissionId=${admissionId}` : `${API_BASE}/anesthesia`;
    const res = await fetch(url);
    return res.json();
  },
  saveAnesthesiaRecord: async (record: AnesthesiaRecord, user: { id: string; name: string; role: any }): Promise<AnesthesiaRecord> => {
    const res = await fetch(`${API_BASE}/anesthesia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },

  // Pharmacy & Stock
  getPharmacyItems: async (): Promise<PharmacyItem[]> => {
    const res = await fetch(`${API_BASE}/pharmacy/items`);
    return res.json();
  },
  getDispenses: async (admissionId?: string): Promise<DispenseRecord[]> => {
    const url = admissionId ? `${API_BASE}/pharmacy/dispenses?admissionId=${admissionId}` : `${API_BASE}/pharmacy/dispenses`;
    const res = await fetch(url);
    return res.json();
  },
  dispensePharmacyItem: async (payload: { admissionId: string; itemId: string; quantity: number; pharmacistName: string; coveredByPackage: boolean }): Promise<DispenseRecord> => {
    const res = await fetch(`${API_BASE}/pharmacy/dispense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Dispense failed');
    }
    return res.json();
  },
  returnPharmacyItem: async (
    id: string, 
    reason: string, 
    pharmacistName: string, 
    returnCondition?: 'sealed_reusable' | 'opened_unusable',
    customVoucherNo?: string
  ): Promise<DispenseRecord> => {
    const res = await fetch(`${API_BASE}/pharmacy/return/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, pharmacistName, returnCondition, customVoucherNo })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to return medication');
    }
    return res.json();
  },
  getMedicationReturns: async (admissionId?: string): Promise<MedicationReturnRecord[]> => {
    const url = admissionId ? `${API_BASE}/pharmacy/returns?admissionId=${admissionId}` : `${API_BASE}/pharmacy/returns`;
    const res = await fetch(url);
    return res.json();
  },

  // Packages
  getPackages: async (): Promise<MedicalPackage[]> => {
    const res = await fetch(`${API_BASE}/packages`);
    return res.json();
  },
  createPackage: async (pkg: Omit<MedicalPackage, 'id'>, user: { id: string; name: string; role: any }): Promise<MedicalPackage> => {
    const res = await fetch(`${API_BASE}/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pkg, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create package');
    }
    return res.json();
  },
  updatePackage: async (id: string, pkg: Partial<MedicalPackage>, user: { id: string; name: string; role: any }): Promise<MedicalPackage> => {
    const res = await fetch(`${API_BASE}/packages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pkg, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update package');
    }
    return res.json();
  },
  deletePackage: async (id: string, user: { id: string; name: string; role: any }): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/packages/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete package');
    }
    return res.json();
  },

  // Provisional Invoice & Billing
  getProvisionalInvoice: async (admissionId: string, cutoff?: string): Promise<ProvisionalInvoice> => {
    const url = cutoff ? `${API_BASE}/billing/invoice/${admissionId}?cutoff=${encodeURIComponent(cutoff)}` : `${API_BASE}/billing/invoice/${admissionId}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate provisional invoice');
    }
    return res.json();
  },
  recordPayment: async (payload: { admissionId: string; amount: number; paymentMethod: any; receivedBy: string; notes?: string }): Promise<PaymentReceipt> => {
    const res = await fetch(`${API_BASE}/billing/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Hospital Financial Accounting & General Ledger Suite
  getFinancialOverview: async (): Promise<FinancialOverviewData> => {
    const res = await fetch(`${API_BASE}/finance/overview`);
    return res.json();
  },
  getPaymentReceipts: async (admissionId?: string): Promise<PaymentReceipt[]> => {
    const url = admissionId ? `${API_BASE}/finance/receipts?admissionId=${admissionId}` : `${API_BASE}/finance/receipts`;
    const res = await fetch(url);
    return res.json();
  },
  getDisbursementVouchers: async (): Promise<DisbursementVoucher[]> => {
    const res = await fetch(`${API_BASE}/finance/disbursements`);
    return res.json();
  },
  createDisbursementVoucher: async (voucher: Omit<DisbursementVoucher, 'id' | 'voucherNumber' | 'timestamp'>, user: { id: string; name: string; role: any }): Promise<DisbursementVoucher> => {
    const res = await fetch(`${API_BASE}/finance/disbursements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voucher, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create disbursement voucher');
    }
    return res.json();
  },
  getDoctorSettlements: async (): Promise<DoctorSettlement[]> => {
    const res = await fetch(`${API_BASE}/finance/doctor-settlements`);
    return res.json();
  },
  settleDoctorPayment: async (payload: { doctorId: string; amount: number; paymentMethod: any; notes: string }, user: { id: string; name: string; role: any }): Promise<DisbursementVoucher> => {
    const res = await fetch(`${API_BASE}/finance/doctor-settlements/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to settle doctor payment');
    }
    return res.json();
  },
  getCorporateClaims: async (): Promise<CorporateClaim[]> => {
    const res = await fetch(`${API_BASE}/finance/corporate-claims`);
    return res.json();
  },
  settleCorporateClaim: async (payload: { claimId: string; amount: number; paymentMethod: any; reference: string }, user: { id: string; name: string; role: any }): Promise<CorporateClaim> => {
    const res = await fetch(`${API_BASE}/finance/corporate-claims/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to settle corporate claim');
    }
    return res.json();
  },
  getChartOfAccounts: async (): Promise<AccountChartItem[]> => {
    const res = await fetch(`${API_BASE}/finance/chart-of-accounts`);
    return res.json();
  },
  getJournalEntries: async (): Promise<JournalEntry[]> => {
    const res = await fetch(`${API_BASE}/finance/journal-entries`);
    return res.json();
  },

  // Discharge & DAMA
  getDischargeSummary: async (admissionId: string): Promise<DischargeSummary | null> => {
    const res = await fetch(`${API_BASE}/discharge/${admissionId}`);
    return res.json();
  },
  saveDischargeSummary: async (summary: DischargeSummary, user: { id: string; name: string; role: any }): Promise<DischargeSummary> => {
    const res = await fetch(`${API_BASE}/discharge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },
  getDAMAForm: async (admissionId: string): Promise<DAMAForm | null> => {
    const res = await fetch(`${API_BASE}/dama/${admissionId}`);
    return res.json();
  },
  saveDAMAForm: async (dama: DAMAForm, user: { id: string; name: string; role: any }): Promise<DAMAForm> => {
    const res = await fetch(`${API_BASE}/dama`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dama, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },

  // Medical Reports
  getMedicalReports: async (admissionId?: string): Promise<MedicalReport[]> => {
    const url = admissionId ? `${API_BASE}/reports?admissionId=${admissionId}` : `${API_BASE}/reports`;
    const res = await fetch(url);
    return res.json();
  },
  createMedicalReport: async (report: any, user: { id: string; name: string; role: any }): Promise<MedicalReport> => {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report, userId: user.id, userName: user.name, userRole: user.role })
    });
    return res.json();
  },

  // Consent Forms (Informed Consent, Surgery, Anesthesia, Transfusions)
  getConsents: async (admissionId?: string, mrn?: string): Promise<ConsentForm[]> => {
    let url = `${API_BASE}/consents`;
    const params = new URLSearchParams();
    if (admissionId) params.append('admissionId', admissionId);
    if (mrn) params.append('mrn', mrn);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url);
    return res.json();
  },
  getConsentById: async (id: string): Promise<ConsentForm> => {
    const res = await fetch(`${API_BASE}/consents/${id}`);
    if (!res.ok) throw new Error('Consent form not found');
    return res.json();
  },
  saveConsentForm: async (consent: Partial<ConsentForm>, user: { id: string; name: string; role: any }): Promise<ConsentForm> => {
    const res = await fetch(`${API_BASE}/consents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save consent form');
    }
    return res.json();
  },
  revokeConsentForm: async (id: string, reason: string, user: { id: string; name: string; role: any }): Promise<ConsentForm> => {
    const res = await fetch(`${API_BASE}/consents/${id}/revoke`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to revoke consent form');
    }
    return res.json();
  },

  // Voice Notes & Clinical Audio Dictation
  getVoiceNotes: async (admissionId?: string, mrn?: string): Promise<VoiceNote[]> => {
    let url = `${API_BASE}/voice-notes`;
    const params = new URLSearchParams();
    if (admissionId) params.append('admissionId', admissionId);
    if (mrn) params.append('mrn', mrn);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url);
    return res.json();
  },
  saveVoiceNote: async (note: Partial<VoiceNote>, user: { id: string; name: string; role: any }): Promise<VoiceNote> => {
    const res = await fetch(`${API_BASE}/voice-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save voice note');
    }
    return res.json();
  },
  deleteVoiceNote: async (id: string, user: { id: string; name: string; role: any }): Promise<VoiceNote> => {
    const res = await fetch(`${API_BASE}/voice-notes/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete voice note');
    }
    return res.json();
  },

  // Free AI Clinical Assistant (Gemini 3.8 Flash)
  aiClinicalAssist: async (request: AIAssistRequest): Promise<AIAssistResponse> => {
    const res = await fetch(`${API_BASE}/ai/clinical-assist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'AI Clinical Assistant request failed');
    }
    return res.json();
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLogEntry[]> => {
    const res = await fetch(`${API_BASE}/audit`);
    return res.json();
  },

  // Auth & RBAC
  login: async (username: string, password?: string): Promise<{ user: SystemUser; token: string }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Authentication failed');
    }
    return res.json();
  },

  updateUserRole: async (userId: string, role: UserRole, permissions: Permission[], performedBy: string): Promise<SystemUser> => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, permissions, performedBy })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update user role');
    }
    return res.json();
  },

  // Inventory Management
  getInventoryItems: async (category?: InventoryCategory): Promise<InventoryItem[]> => {
    const url = category ? `${API_BASE}/inventory/items?category=${category}` : `${API_BASE}/inventory/items`;
    const res = await fetch(url);
    return res.json();
  },

  addInventoryItem: async (item: Omit<InventoryItem, 'id' | 'status'>, user: { id: string; name: string; role: any }): Promise<InventoryItem> => {
    const res = await fetch(`${API_BASE}/inventory/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add inventory item');
    }
    return res.json();
  },

  updateInventoryItem: async (id: string, updates: Partial<InventoryItem>, user: { id: string; name: string; role: any }): Promise<InventoryItem> => {
    const res = await fetch(`${API_BASE}/inventory/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update inventory item');
    }
    return res.json();
  },

  deleteInventoryItem: async (id: string, user: { id: string; name: string; role: any }): Promise<InventoryItem> => {
    const res = await fetch(`${API_BASE}/inventory/items/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete inventory item');
    }
    return res.json();
  },

  // Batch & Expiry Management
  addBatchToItem: async (itemId: string, batch: Omit<InventoryBatch, 'id' | 'status'>, user: { id: string; name: string; role: any }): Promise<{ item: InventoryItem; batch: InventoryBatch }> => {
    const res = await fetch(`${API_BASE}/inventory/items/${itemId}/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add batch to item');
    }
    return res.json();
  },

  quarantineBatch: async (itemId: string, batchId: string, reason: string, user: { id: string; name: string; role: any }): Promise<{ item: InventoryItem; batch: InventoryBatch }> => {
    const res = await fetch(`${API_BASE}/inventory/items/${itemId}/batches/${batchId}/quarantine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to quarantine batch');
    }
    return res.json();
  },

  getExpiringBatches: async (days: number = 90): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/inventory/batches/expiring?days=${days}`);
    return res.json();
  },

  // Vendors
  getVendors: async (): Promise<Vendor[]> => {
    const res = await fetch(`${API_BASE}/inventory/vendors`);
    return res.json();
  },

  addVendor: async (vendor: Omit<Vendor, 'id'>, user: { id: string; name: string; role: any }): Promise<Vendor> => {
    const res = await fetch(`${API_BASE}/inventory/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add vendor');
    }
    return res.json();
  },

  updateVendor: async (id: string, updates: Partial<Vendor>, user: { id: string; name: string; role: any }): Promise<Vendor> => {
    const res = await fetch(`${API_BASE}/inventory/vendors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update vendor');
    }
    return res.json();
  },

  // Purchase Orders
  getPurchaseOrders: async (status?: string): Promise<PurchaseOrder[]> => {
    const url = status ? `${API_BASE}/inventory/purchase-orders?status=${status}` : `${API_BASE}/inventory/purchase-orders`;
    const res = await fetch(url);
    return res.json();
  },

  createPurchaseOrder: async (purchaseOrder: Omit<PurchaseOrder, 'id' | 'poNumber' | 'orderDate' | 'status'>, user: { id: string; name: string; role: any }): Promise<PurchaseOrder> => {
    const res = await fetch(`${API_BASE}/inventory/purchase-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseOrder, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create purchase order');
    }
    return res.json();
  },

  updatePurchaseOrderStatus: async (id: string, status: PurchaseOrderStatus, user: { id: string; name: string; role: any }): Promise<PurchaseOrder> => {
    const res = await fetch(`${API_BASE}/inventory/purchase-orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update purchase order');
    }
    return res.json();
  },

  getStockMovements: async (itemId?: string): Promise<StockMovement[]> => {
    const url = itemId ? `${API_BASE}/inventory/movements?itemId=${itemId}` : `${API_BASE}/inventory/movements`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch stock movements');
    return res.json();
  },

  // Automated procurement re-order for low stock warehouse items
  autoReorderLowStockItems: async (user: { id: string; name: string; role: any }): Promise<{ message: string; createdOrders: PurchaseOrder[] }> => {
    const res = await fetch(`${API_BASE}/inventory/auto-reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to auto-reorder low stock items');
    }
    return res.json();
  },

  // Real-time stock demand cross-reference alerts
  getStockAlerts: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/inventory/stock-alerts`);
    if (!res.ok) throw new Error('Failed to fetch stock cross-reference alerts');
    return res.json();
  },

  // Supplier Automation: ROP calculation & electronic draft PO generation
  getSupplierAutomation: async (scope: string = 'all'): Promise<import('../types/hmis.ts').SupplierAutomationSummary> => {
    const res = await fetch(`${API_BASE}/inventory/supplier-automation?scope=${scope}`);
    if (!res.ok) throw new Error('Failed to fetch supplier automation calculations');
    return res.json();
  },

  generateSupplierAutomationPOs: async (
    options: { itemIds?: string[]; scope?: string },
    user: { id: string; name: string; role: any }
  ): Promise<{ message: string; messageEn?: string; createdOrders: PurchaseOrder[] }> => {
    const res = await fetch(`${API_BASE}/inventory/supplier-automation/generate-pos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemIds: options.itemIds,
        scope: options.scope || 'all',
        userId: user.id,
        userName: user.name,
        userRole: user.role
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate automated purchase orders');
    }
    return res.json();
  },

  // Sync offline-cached barcode scans to backend
  syncCachedBarcodeScans: async (scans: any[], user: { id: string; name: string; role: any }): Promise<{ success: boolean; syncedCount: number; message: string }> => {
    const res = await fetch(`${API_BASE}/barcodes/sync-scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scans, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to sync cached scans');
    }
    return res.json();
  },

  // Appointment Scheduling
  getAppointments: async (params?: { patientMrn?: string; doctorId?: string; date?: string }): Promise<Appointment[]> => {
    const query = new URLSearchParams();
    if (params?.patientMrn) query.append('patientMrn', params.patientMrn);
    if (params?.doctorId) query.append('doctorId', params.doctorId);
    if (params?.date) query.append('date', params.date);
    const url = query.toString() ? `${API_BASE}/appointments?${query.toString()}` : `${API_BASE}/appointments`;
    const res = await fetch(url);
    return res.json();
  },

  bookAppointment: async (appointment: Omit<Appointment, 'id' | 'appointmentNumber' | 'createdAt' | 'status'>, user: { id: string; name: string; role: any }): Promise<Appointment> => {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to book appointment');
    }
    return res.json();
  },

  rescheduleAppointment: async (id: string, newDate: string, newTimeSlot: string, user: { id: string; name: string; role: any }): Promise<Appointment> => {
    const res = await fetch(`${API_BASE}/appointments/${id}/reschedule`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newDate, newTimeSlot, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reschedule appointment');
    }
    return res.json();
  },

  cancelAppointment: async (id: string, reason: string, user: { id: string; name: string; role: any }): Promise<Appointment> => {
    const res = await fetch(`${API_BASE}/appointments/${id}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, userId: user.id, userName: user.name, userRole: user.role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to cancel appointment');
    }
    return res.json();
  },

  // Smart Clinical Alerts & Decision Support
  getSmartAlerts: async (admissionId?: string, severity?: string): Promise<SmartAlert[]> => {
    const params = new URLSearchParams();
    if (admissionId) params.append('admissionId', admissionId);
    if (severity) params.append('severity', severity);
    const res = await fetch(`${API_BASE}/alerts?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch smart alerts');
    return res.json();
  },

  acknowledgeSmartAlert: async (alertId: string, user: { id: string; name: string; role: any }, notes?: string): Promise<SmartAlert> => {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userName: user.name, userRole: user.role, notes })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to acknowledge smart alert');
    }
    return res.json();
  },

  scanAiSmartAlerts: async (data: { admissionId?: string; mrn?: string; patientName?: string; clinicalContext: any }): Promise<{ alerts: SmartAlert[]; count: number }> => {
    const res = await fetch(`${API_BASE}/ai/smart-alerts/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to scan AI smart alerts');
    }
    return res.json();
  },

  transcribeAudio: async (data: { audioData?: string; text?: string; language?: string; context?: any }): Promise<{ transcript: string; extractedVitals?: any; summary?: string }> => {
    const res = await fetch(`${API_BASE}/ai/transcribe-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to transcribe audio');
    }
    return res.json();
  }
};
