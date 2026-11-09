import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  BedDouble, 
  ClipboardList, 
  Pill, 
  CheckCircle2, 
  FlaskConical, 
  Scissors, 
  Package, 
  Stethoscope, 
  DollarSign, 
  FileText, 
  ShieldCheck, 
  RefreshCw,
  Baby,
  Calendar,
  Boxes,
  Heart,
  Mic
} from 'lucide-react';
import { 
  SystemUser, 
  Patient, 
  Admission, 
  Bed, 
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
  MedicalPackage, 
  AuditLogEntry, 
  Language,
  SmartAlert
} from './types/hmis.ts';
import { api } from './api/client.ts';
import { Header } from './components/Header.tsx';
import { PatientBanner } from './components/PatientBanner.tsx';
import { ReceptionModule } from './components/ReceptionModule.tsx';
import { ClinicalWorkstation } from './components/ClinicalWorkstation.tsx';
import { OrdersAndDietaryModule } from './components/OrdersAndDietaryModule.tsx';
import { EMARModule } from './components/EMARModule.tsx';
import { LISModule } from './components/LISModule.tsx';
import { SurgicalAnesthesiaModule } from './components/SurgicalAnesthesiaModule.tsx';
import { PharmacyModule } from './components/PharmacyModule.tsx';
import { ConsultationsModule } from './components/ConsultationsModule.tsx';
import { BillingModule } from './components/BillingModule.tsx';
import { DischargeReportsModule } from './components/DischargeReportsModule.tsx';
import { AuditLogModule } from './components/AuditLogModule.tsx';
import { InventoryManagementModule } from './components/InventoryManagementModule.tsx';
import { AppointmentSchedulingModule } from './components/AppointmentSchedulingModule.tsx';
import { PatientPortalModule } from './components/PatientPortalModule.tsx';
import { AuthRoleModal } from './components/AuthRoleModal.tsx';
import { SidebarNavigation, ActiveTabType } from './components/SidebarNavigation.tsx';
import { GlobalCommandDropbox } from './components/GlobalCommandDropbox.tsx';
import { ConsentModule } from './components/ConsentModule.tsx';
import { VoiceNotesModule } from './components/VoiceNotesModule.tsx';
import { SmartAlertsModule } from './components/SmartAlertsModule.tsx';
import { SmartAlertsCenterModal } from './components/SmartAlertsCenterModal.tsx';
import { GlobalVoiceDictationModal } from './components/GlobalVoiceDictationModal.tsx';
import { BarcodeLabelsModal } from './components/BarcodeLabelsModal.tsx';
import { ShiftHandoverModule } from './components/ShiftHandoverModule.tsx';
import { BarcodeHubModule } from './components/BarcodeHubModule.tsx';

export default function App() {
  const [language, setLanguage] = useState<Language>('ar');
  const isAr = language === 'ar';

  // Navigation module tabs
  const [activeTab, setActiveTab] = useState<ActiveTabType>('clinical');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOmniSearch, setShowOmniSearch] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showVoiceDictationModal, setShowVoiceDictationModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Smart Alerts
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);

  // Application Data States
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [packages, setPackages] = useState<MedicalPackage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Selected Active Inpatient Stay
  const [currentAdmission, setCurrentAdmission] = useState<Admission | null>(null);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);

  // Patient Sub-records for current stay
  const [assessment, setAssessment] = useState<ClinicalAssessment | null>(null);
  const [plans, setPlans] = useState<ManagementPlan[]>([]);
  const [dietaryOrders, setDietaryOrders] = useState<DietaryOrder[]>([]);
  const [medications, setMedications] = useState<MedicationOrder[]>([]);
  const [emarRecords, setEmarRecords] = useState<EMARRecord[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [operativeReports, setOperativeReports] = useState<OperativeReport[]>([]);
  const [anesthesiaRecords, setAnesthesiaRecords] = useState<AnesthesiaRecord[]>([]);
  const [pharmacyItems, setPharmacyItems] = useState<PharmacyItem[]>([]);
  const [dispenses, setDispenses] = useState<DispenseRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Sync RTL / LTR with language state
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Initial load
  const loadInitialData = async () => {
    try {
      const [u, p, a, b, pkgs, logs, ph, al] = await Promise.all([
        api.getUsers(),
        api.getPatients(),
        api.getAdmissions(),
        api.getBeds(),
        api.getPackages(),
        api.getAuditLogs(),
        api.getPharmacyItems(),
        api.getSmartAlerts()
      ]);

      setUsers(u);
      setCurrentUser(u[0] || null);
      setPatients(p);
      setAdmissions(a);
      setBeds(b);
      setPackages(pkgs);
      setAuditLogs(logs);
      setPharmacyItems(ph);
      setAlerts(al);

      // Default active patient is the first active admission
      if (a.length > 0) {
        const firstAdm = a[0];
        setCurrentAdmission(firstAdm);
        const pat = p.find(pt => pt.mrn === firstAdm.mrn) || null;
        setCurrentPatient(pat);
        await loadPatientSubrecords(firstAdm.admissionId);
      }
    } catch (err) {
      console.error('Initial load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatientSubrecords = async (admissionId: string) => {
    try {
      const [ass, pl, diet, med, emar, lab, cons, op, anes, disp] = await Promise.all([
        api.getAssessment(admissionId),
        api.getPlans(admissionId),
        api.getDietaryOrders(admissionId),
        api.getMedications(admissionId),
        api.getEMAR(admissionId),
        api.getLabOrders(admissionId),
        api.getConsultations(admissionId),
        api.getOperativeReports(admissionId),
        api.getAnesthesiaRecords(admissionId),
        api.getDispenses(admissionId)
      ]);

      setAssessment(ass);
      setPlans(pl);
      setDietaryOrders(diet);
      setMedications(med);
      setEmarRecords(emar);
      setLabOrders(lab);
      setConsultations(cons);
      setOperativeReports(op);
      setAnesthesiaRecords(anes);
      setDispenses(disp);
    } catch (err) {
      console.error('Error loading patient subrecords:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle switching to patient portal when role is 'patient'
  useEffect(() => {
    if (currentUser?.role === 'patient') {
      const linkedMrn = currentUser.linkedPatientMrn || 'MRN-2026-0811';
      const pat = patients.find(p => p.mrn === linkedMrn) || patients[0];
      if (pat) {
        setCurrentPatient(pat);
        const adm = admissions.find(a => a.mrn === pat.mrn) || null;
        setCurrentAdmission(adm);
        if (adm) loadPatientSubrecords(adm.admissionId);
      }
      setActiveTab('portal');
    }
  }, [currentUser, patients, admissions]);

  const handleSelectAdmission = async (adm: Admission) => {
    setCurrentAdmission(adm);
    const pat = patients.find(p => p.mrn === adm.mrn) || null;
    setCurrentPatient(pat);
    await loadPatientSubrecords(adm.admissionId);
  };

  const refreshAlertsOnly = async () => {
    try {
      const al = await api.getSmartAlerts();
      setAlerts(al);
    } catch (err) {
      console.error('Error refreshing alerts:', err);
    }
  };

  const refreshAll = async () => {
    try {
      const [p, a, b, logs, ph, al] = await Promise.all([
        api.getPatients(),
        api.getAdmissions(),
        api.getBeds(),
        api.getAuditLogs(),
        api.getPharmacyItems(),
        api.getSmartAlerts()
      ]);
      setPatients(p);
      setAdmissions(a);
      setBeds(b);
      setAuditLogs(logs);
      setPharmacyItems(ph);
      setAlerts(al);

      if (currentAdmission) {
        const updatedAdm = a.find(ad => ad.admissionId === currentAdmission.admissionId) || currentAdmission;
        setCurrentAdmission(updatedAdm);
        const updatedPat = p.find(pt => pt.mrn === updatedAdm.mrn) || null;
        setCurrentPatient(updatedPat);
        await loadPatientSubrecords(updatedAdm.admissionId);
      }
    } catch (err) {
      console.error('Error refreshing state:', err);
    }
  };

  const handleInsertDictatedText = async (text: string) => {
    if (!currentAdmission) return;
    try {
      const currentAss = assessment || {
        id: `ass-${currentAdmission.admissionId}`,
        admissionId: currentAdmission.admissionId,
        chiefComplaint: '',
        chiefComplaintDuration: 'Day 1',
        historyOfPresentIllness: '',
        systemicExam: { cardiovascular: 'Normal', respiratory: 'Clear', abdominal: 'Soft, non-tender', general: 'Conscious, oriented' },
        vitals: [],
        updatedAt: new Date().toISOString(),
        assessedBy: currentUser?.name || 'Dr. Tarek Ben-Amer'
      };

      const sep = currentAss.historyOfPresentIllness ? '\n\n' : '';
      const updated = {
        ...currentAss,
        historyOfPresentIllness: currentAss.historyOfPresentIllness + sep + text,
        updatedAt: new Date().toISOString(),
        assessedBy: currentUser?.name || 'Doctor'
      };

      const saved = await api.saveAssessment(currentAdmission.admissionId, updated, currentUser || { id: 'usr-1', name: 'Doctor', role: 'doctor' });
      setAssessment(saved);
      setActiveTab('clinical');
    } catch (err) {
      console.error('Error inserting dictated text:', err);
    }
  };

  const handleInsertSoap = async (soap: { subjective: string; objective: string; assessment: string; plan: string }) => {
    if (!currentAdmission) return;
    try {
      const currentAss = assessment || {
        id: `ass-${currentAdmission.admissionId}`,
        admissionId: currentAdmission.admissionId,
        chiefComplaint: '',
        chiefComplaintDuration: 'Day 1',
        historyOfPresentIllness: '',
        systemicExam: { cardiovascular: 'Normal', respiratory: 'Clear', abdominal: 'Soft, non-tender', general: 'Conscious, oriented' },
        vitals: [],
        updatedAt: new Date().toISOString(),
        assessedBy: currentUser?.name || 'Dr. Tarek Ben-Amer'
      };

      const updated = {
        ...currentAss,
        chiefComplaint: soap.subjective || currentAss.chiefComplaint,
        historyOfPresentIllness: `${soap.subjective}\n\n[O - Objective]: ${soap.objective}\n[A - Assessment]: ${soap.assessment}`,
        updatedAt: new Date().toISOString(),
        assessedBy: currentUser?.name || 'Doctor'
      };

      const saved = await api.saveAssessment(currentAdmission.admissionId, updated, currentUser || { id: 'usr-1', name: 'Doctor', role: 'doctor' });
      setAssessment(saved);

      if (soap.plan) {
        await api.addPlan({
          admissionId: currentAdmission.admissionId,
          planType: 'medical',
          procedureNature: 'Voice-dictated clinical plan',
          urgencyLevel: 'Elective',
          notes: soap.plan,
          physicianId: currentUser?.id || 'usr-1',
          physicianName: currentUser?.name || 'Doctor'
        }, currentUser || { id: 'usr-1', name: 'Doctor', role: 'doctor' });
        const updatedPlans = await api.getPlans(currentAdmission.admissionId);
        setPlans(updatedPlans);
      }

      setActiveTab('clinical');
    } catch (err) {
      console.error('Error inserting SOAP into assessment:', err);
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600 font-mono text-sm">
        <div className="flex items-center gap-3 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
          <span>{isAr ? 'جاري تحميل قاعدة بيانات منظومة المستشفى HMIS...' : 'Loading Hospital Management System...'}</span>
        </div>
      </div>
    );
  }

  const totalBedsCount = beds.length;
  const occupiedBedsCount = beds.filter(b => b.status === 'occupied').length;
  const criticalLabsCount = labOrders.filter(o => o.status === 'approved' && o.results.some(r => r.isCritical) && !o.criticalAlertAcknowledged).length;
  const unacknowledgedAlertsCount = alerts.filter(a => !a.isAcknowledged).length;
  const criticalAlertsCount = alerts.filter(a => a.severity === 'critical' && !a.isAcknowledged).length;
  const isPatientRole = currentUser.role === 'patient';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Application Header */}
      <Header
        currentUser={currentUser}
        users={users}
        onSelectUser={setCurrentUser}
        language={language}
        onToggleLanguage={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        activeModule={activeTab}
        totalBedsCount={totalBedsCount}
        occupiedBedsCount={occupiedBedsCount}
        unacknowledgedAlertsCount={unacknowledgedAlertsCount}
        criticalAlertsCount={criticalAlertsCount}
        onOpenAlertsModal={() => setShowAlertsModal(true)}
        onOpenVoiceDictationModal={() => setShowVoiceDictationModal(true)}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenOmniSearch={() => setShowOmniSearch(true)}
      />

      {/* Main Two-Column Layout with Vertical Menu Sidebar */}
      <div className="flex flex-1 flex-row min-h-0 relative">
        {/* Modern Vertical Menu Navigation */}
        <SidebarNavigation
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          currentUser={currentUser}
          language={language}
          onToggleLanguage={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          onOpenAuthModal={() => setShowAuthModal(true)}
          onOpenOmniSearch={() => setShowOmniSearch(true)}
          totalBedsCount={totalBedsCount}
          occupiedBedsCount={occupiedBedsCount}
          criticalLabsCount={criticalLabsCount}
          unacknowledgedAlertsCount={unacknowledgedAlertsCount}
          criticalAlertsCount={criticalAlertsCount}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Content Column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Patient Clinical Context Banner (Staff View Only) */}
          {!isPatientRole && (
            <PatientBanner
              currentPatient={currentPatient}
              currentAdmission={currentAdmission}
              admissions={admissions}
              patients={patients}
              onSelectAdmission={handleSelectAdmission}
              language={language}
              currentUser={currentUser}
              onRefresh={refreshAll}
              onInitiateDischarge={() => setActiveTab('discharge')}
              onOpenConsentModal={() => setActiveTab('consents')}
              onOpenVoiceNotes={() => setActiveTab('voice')}
              assessment={assessment}
              labOrders={labOrders}
              onOpenClinicalWorkstation={() => setActiveTab('clinical')}
              onOpenBarcodeHub={() => setActiveTab('barcodes')}
              onOpenShiftHandover={() => setActiveTab('handover')}
            />
          )}

          {/* Main Workspace Viewport */}<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* PATIENT PORTAL VIEW */}
        {activeTab === 'portal' && (
          <PatientPortalModule
            currentUser={currentUser}
            patient={currentPatient}
            admission={currentAdmission}
            language={language}
          />
        )}

        {/* INVENTORY MANAGEMENT MODULE */}
        {activeTab === 'inventory' && (
          <InventoryManagementModule
            currentUser={currentUser}
            language={language}
          />
        )}

        {/* APPOINTMENT SCHEDULING MODULE */}
        {activeTab === 'appointments' && (
          <AppointmentSchedulingModule
            currentUser={currentUser}
            patients={patients}
            language={language}
            onOpenPatientEMR={(mrn) => {
              const pat = patients.find(p => p.mrn === mrn);
              if (pat) {
                setCurrentPatient(pat);
                const adm = admissions.find(a => a.mrn === mrn);
                if (adm) handleSelectAdmission(adm);
              }
              setActiveTab('clinical');
            }}
          />
        )}

        {/* RECEPTION & BEDS */}
        {activeTab === 'reception' && (
          <ReceptionModule
            beds={beds}
            patients={patients}
            admissions={admissions}
            packages={packages}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
            onSelectAdmission={(adm) => {
              handleSelectAdmission(adm);
              setActiveTab('clinical');
            }}
            onOpenBarcodeHub={() => setActiveTab('barcodes')}
          />
        )}

        {/* CLINICAL EMR */}
        {activeTab === 'clinical' && (
          <ClinicalWorkstation
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            assessment={assessment}
            plans={plans}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
          />
        )}

        {/* ORDERS & DIETARY */}
        {activeTab === 'orders' && (
          <OrdersAndDietaryModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            dietaryOrders={dietaryOrders}
            medications={medications}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
          />
        )}

        {/* NURSING eMAR */}
        {activeTab === 'emar' && (
          <EMARModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            emarRecords={emarRecords}
            medications={medications}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
            smartAlerts={alerts}
          />
        )}

        {/* LABORATORY LIS */}
        {activeTab === 'lis' && (
          <LISModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            labOrders={labOrders}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
          />
        )}

        {/* SURGERY & ANESTHESIA */}
        {activeTab === 'surgery' && (
          <SurgicalAnesthesiaModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            operativeReports={operativeReports}
            anesthesiaRecords={anesthesiaRecords}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
            onOpenConsentModal={() => setActiveTab('consents')}
          />
        )}

        {/* PHARMACY DISPENSE */}
        {activeTab === 'pharmacy' && (
          <PharmacyModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            pharmacyItems={pharmacyItems}
            dispenses={dispenses}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
          />
        )}

        {/* CONSULTATIONS */}
        {activeTab === 'consultations' && (
          <ConsultationsModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            consultations={consultations}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
          />
        )}

        {/* FINANCIAL ACCOUNTING & BILLING SUITE */}
        {activeTab === 'billing' && (
          <BillingModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            admissions={admissions}
            patients={patients}
            packages={packages}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
            onSelectAdmission={handleSelectAdmission}
            onRefreshPackages={async () => {
              const updatedPkgs = await api.getPackages();
              setPackages(updatedPkgs);
            }}
          />
        )}

        {/* DISCHARGE & REPORTS */}
        {activeTab === 'discharge' && (
          <DischargeReportsModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
          />
        )}

        {/* INFORMED CONSENT FORMS MODULE */}
        {activeTab === 'consents' && (
          <ConsentModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
          />
        )}

        {/* VOICE NOTES, DICTATION & FREE AI SCRIBE MODULE */}
        {activeTab === 'voice' && (
          <VoiceNotesModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
            onApplySoapToAssessment={() => {
              setActiveTab('clinical');
            }}
          />
        )}

        {/* SMART CLINICAL ALERTS & CDS */}
        {activeTab === 'alerts' && (
          <SmartAlertsModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            currentUser={currentUser}
            language={language}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onRefreshAll={refreshAll}
          />
        )}

        {/* CLINICAL SHIFT HANDOVER (SBAR) FULL PAGE */}
        {activeTab === 'handover' && (
          <ShiftHandoverModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            admissions={admissions}
            patients={patients}
            labOrders={labOrders}
            medications={medications}
            emarRecords={emarRecords}
            operativeReports={operativeReports}
            assessment={assessment}
            plans={plans}
            dietaryOrders={dietaryOrders}
            currentUser={currentUser}
            language={language}
            onRefresh={refreshAll}
            onSelectAdmission={(adm: Admission) => handleSelectAdmission(adm)}
          />
        )}

        {/* CLINICAL BARCODE & QR CODE GENERATION & VERIFICATION HUB (FULL PAGE) */}
        {activeTab === 'barcodes' && (
          <BarcodeHubModule
            currentPatient={currentPatient}
            currentAdmission={currentAdmission}
            allPatients={patients}
            allAdmissions={admissions}
            medications={medications}
            labOrders={labOrders}
            currentUser={currentUser}
            language={language}
            onSelectAdmission={(adm: Admission) => handleSelectAdmission(adm)}
          />
        )}

        {/* AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <AuditLogModule
            logs={auditLogs}
            language={language}
          />
        )}
      </main>

        {/* Hospital System Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4 no-print select-none">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <span className="font-semibold text-slate-800">
              {isAr ? 'منظومة إدارة المستشفى الإيوائي التخصصي (HMIS) - مستشفى الأمل' : 'Specialized Inpatient Hospital Management Information System (HMIS)'}
            </span>
            <span className="text-slate-400">·</span>
            <span>الإصدار 1.0 (7 نوفمبر 2026)</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>
              {isAr ? 'المستخدم النشط:' : 'User:'}{' '}
              <strong className="text-slate-800 font-sans">
                {isAr ? currentUser.nameAr : currentUser.name}
              </strong>{' '}
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                {currentUser.role}
              </span>
            </span>
            <span>·</span>
            <span>
              {isAr ? 'السجل الطبي المركزي:' : 'Central EMR:'}{' '}
              <strong className="text-emerald-700">{patients.length} MRN</strong>
            </span>
            <span>·</span>
            <span>
              {isAr ? 'الأسرّة النشطة:' : 'Active Beds:'}{' '}
              <strong className="text-teal-700">{occupiedBedsCount}/{totalBedsCount}</strong>
            </span>
          </div>
        </footer>
      </div>
    </div>

    {/* RBAC Authentication & Role Management Modal */}
    {showAuthModal && (
      <AuthRoleModal
        currentUser={currentUser}
        users={users}
        language={language}
        onSelectUser={(u) => {
          setCurrentUser(u);
          if (u.role === 'patient') {
            setActiveTab('portal');
          }
        }}
        onClose={() => setShowAuthModal(false)}
      />
    )}

    {/* Smart Alerts Center Quick Modal */}
    <SmartAlertsCenterModal
      isOpen={showAlertsModal}
      onClose={() => setShowAlertsModal(false)}
      alerts={alerts}
      currentUser={currentUser}
      language={language}
      onNavigateToTab={(tab) => setActiveTab(tab)}
      onRefreshAlerts={refreshAlertsOnly}
      onViewAllAlerts={() => setActiveTab('alerts')}
    />

    {/* Global Voice Dictation Studio Modal */}
    <GlobalVoiceDictationModal
      isOpen={showVoiceDictationModal}
      onClose={() => setShowVoiceDictationModal(false)}
      currentPatient={currentPatient}
      currentAdmission={currentAdmission}
      currentUser={currentUser}
      language={language}
      onInsertTextIntoAssessment={handleInsertDictatedText}
      onInsertSoapIntoAssessment={handleInsertSoap}
    />

    {/* Global Omni Command Dropbox (Ctrl+K) */}
    <GlobalCommandDropbox
      isOpen={showOmniSearch}
      onClose={() => setShowOmniSearch(false)}
      admissions={admissions}
      patients={patients}
      onSelectAdmission={handleSelectAdmission}
      onNavigateTab={(tab) => setActiveTab(tab)}
      onOpenLabWorksheet={() => setActiveTab('lis')}
      onOpenBarcodeModal={() => setActiveTab('barcodes')}
      language={language}
    />

    {/* Barcode & Wristband Label Generator Modal */}
    <BarcodeLabelsModal
      isOpen={showBarcodeModal}
      onClose={() => setShowBarcodeModal(false)}
      currentPatient={currentPatient}
      currentAdmission={currentAdmission}
      allPatients={patients}
      allAdmissions={admissions}
      language={language}
    />

    {/* Quick Floating Voice Dictation Trigger */}
    {!isPatientRole && (
      <button
        type="button"
        onClick={() => setShowVoiceDictationModal(true)}
        className="fixed bottom-6 rtl:left-6 ltr:right-6 z-30 flex items-center gap-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-full shadow-xl border border-teal-400/40 transition-all transform hover:scale-105 select-none no-print group cursor-pointer"
        title={isAr ? 'فتح استوديو الطباعة والإملاء الصوتي السريري' : 'Open Voice Dictation Studio'}
      >
        <div className="relative">
          <Mic className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
        </div>
        <span className="text-xs font-bold tracking-tight">
          {isAr ? 'الطباعة الصوتية الذكية' : 'Smart Voice Scribe'}
        </span>
      </button>
    )}
  </div>
);
}
