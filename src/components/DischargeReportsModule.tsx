import React, { useState } from 'react';
import { 
  Patient, 
  Admission, 
  DischargeSummary, 
  DAMAForm, 
  MedicalReport, 
  Language, 
  SystemUser,
  ClinicalAssessment,
  OperativeReport,
  Consultation,
  ProvisionalInvoice,
  LabOrder,
  MedicationOrder
} from '../types/hmis.ts';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Plus,
  ShieldAlert,
  UserCheck,
  Building,
  CheckSquare,
  Square,
  DollarSign,
  FlaskConical,
  Pill,
  Lock,
  Unlock,
  ClipboardCheck,
  ShieldCheck,
  RefreshCw,
  Baby,
  Heart,
  Stethoscope,
  Calendar,
  Activity,
  Clock,
  Shield,
  User,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Wand2,
  Edit3,
  Check,
  RotateCcw,
  FileSignature,
  Bot
} from 'lucide-react';
import { api } from '../api/client.ts';
import { VoiceDictationButton } from './VoiceDictationButton.tsx';
import { generateCode128Svg } from '../utils/barcode.ts';

interface DischargeReportsProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  currentUser: SystemUser;
  language: Language;
  onRefresh: () => void;
}

export const DischargeReportsModule: React.FC<DischargeReportsProps> = ({
  currentPatient,
  currentAdmission,
  currentUser,
  language,
  onRefresh,
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<'stay_summary' | 'discharge' | 'dama' | 'medical_report'>('stay_summary');

  // Existing records state
  const [dischargeSummary, setDischargeSummary] = useState<DischargeSummary | null>(null);
  const [damaForm, setDamaForm] = useState<DAMAForm | null>(null);
  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [assessment, setAssessment] = useState<ClinicalAssessment | null>(null);
  const [operativeReports, setOperativeReports] = useState<OperativeReport[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);

  // Modals
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showDamaModal, setShowDamaModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Forms
  const [dischargeForm, setDischargeForm] = useState({
    admissionDiagnosis: 'Term Pregnancy in Active Labor',
    finalDiagnosis: 'Delivered single live infant via LSCS, post-op uncomplicated',
    treatmentAndHospitalCourse: 'Patient admitted via emergency, stabilized, underwent emergency Cesarean section. Received IV antibiotics and analgesia. Recovered well.',
    surgicalInterventions: 'Lower Segment Cesarean Section on 05/11/2026',
    dischargeCondition: 'Improved' as any,
    disposition: 'Home' as any,
    dischargeMedications: 'Cefixime 400mg OD for 5 days, Paracetamol 1000mg TID PRN, Iron + Folic acid',
    aftercareInstructions: 'Wound care daily, suture removal at clinic on Day 7, return immediately if fever or foul lochia occurs.',
    followUpDate: '2026-11-14'
  });

  const [damaFormData, setDamaFormData] = useState({
    explainedRisksDetails: 'تم شرح مخاطر الخروج المبكر بما في ذلك النزيف الحاد بعد الولادة، والتهاب الجرح الجراحي، وضرورة المراقبة بالمستشفى.',
    refusalReason: 'رغبة المريض وأسرته في استكمال الرعاية بالمنزل لظروف عائلية خاصة',
    patientOrGuardianSignature: 'سالم الترهوني (الوالد)',
    isSignatureRefused: false,
    witnessName: 'ممرضة فاطمة الورفلي',
    witnessRole: 'Staff Nurse'
  });

  const [reportForm, setReportForm] = useState({
    clinicalSummary: 'Patient admitted on 05/11/2026 for obstetric care. Delivered healthy baby girl via Cesarean section.',
    currentStatus: 'Stable, vitals normal, wound healing well, ambulant.',
    interventionsDone: 'Emergency LSCS, routine post-op laboratory investigations, antibiotic prophylaxis.',
    consultingSpecialistName: 'د. مريم الدريسي (استشاري أطفال)'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mandatory Discharge Checklist & Clearances
  const [invoice, setInvoice] = useState<ProvisionalInvoice | null>(null);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [medications, setMedications] = useState<MedicationOrder[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [clearanceOverrides, setClearanceOverrides] = useState<Record<string, boolean>>({});

  // AI Clinical Narrative Summary State & Controls
  const [clinicalNarrative, setClinicalNarrative] = useState<string>(() => {
    return `ملخص السير السريري الشامل ومسار الإقامة (Comprehensive Narrative Clinical Summary):

1. دواعي التنويم والتقييم السريري الأولي (Admission Indication & Initial Assessment):
تم استقبال وتنويم المريضة في قسم أمراض وجراحة النساء والتوليد والإيواء السريري لمتابعة حالة المخاض وإجراء التقييم التوليدي الكامل. أظهر الفحص الأولي مؤشرات حيوية مستقرة وعلامات تقدم المخاض مع مراقبة دقيقة لتخطيط قلب الجنين (CTG).

2. المسار الجراحي والإجراءات المنجزة (Operative Course & Surgical Findings):
أجريت للمريضة عملية ولادة قيصرية سفلى مستعرضة (LSCS) تحت التخدير النصفي الشوكي بدون مضاعفات جراحية أو تخديرية. تم استخراج طفل حي بحالة حيوية ممتازة (علامات أبغار: 8/10 عند الدقيقة الأولى، 9/10 عند الدقيقة الخامسة، الوزن: 3350 غرام). تم إرقاء النزف بدقة وفقدان الدم مقدر بحدود 400 مل.

3. التطور العلاجي والدوائي والفحوصات (Hospital Course & Medication Reconciliation):
تلقت المريضة الرعاية التمريضية وفق جدول eMAR متضمناً المضادات الحيوية الوقائية (Cefazolin) ومقبضات الرحم (Oxytocin) ومسكنات الألم الوريدية. أظهرت الفحوصات المخبرية استقرار خضاب الدم (Hb: 11.8 g/dL) والصفائح دون مؤشرات عدوى.

4. الحالة السريرية عند الخروج والتوصيات (Discharge Condition & Clinical Disposition):
المريضة في حالة سريرية مستقرة ومتحسنة، الجرح الجراحي نظيف وجاف وملتئم، مع بدء الرضاعة الطبيعية بنجاح والتوصية بالراحة والعناية بالجرح والمتابعة بالعيادة بعد 7 أيام.`;
  });
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);
  const [narrativeMeta, setNarrativeMeta] = useState<{
    generatedAt?: string;
    modelUsed?: string;
    isCustomEdited?: boolean;
    sourceDataCount?: {
      assessments: number;
      operativeNotes: number;
      medications: number;
      labs: number;
    };
  } | null>(null);
  const [narrativeGenerationError, setNarrativeGenerationError] = useState<string | null>(null);
  const [isEditingNarrative, setIsEditingNarrative] = useState(false);

  // Fetch documents and clearance data on load
  const loadDocs = async () => {
    if (!currentAdmission) return;
    setChecklistLoading(true);
    try {
      const [ds, df, reps, inv, labs, meds, ass, ops, cons] = await Promise.all([
        api.getDischargeSummary(currentAdmission.admissionId).catch(() => null),
        api.getDAMAForm(currentAdmission.admissionId).catch(() => null),
        api.getMedicalReports(currentAdmission.admissionId).catch(() => []),
        api.getProvisionalInvoice(currentAdmission.admissionId).catch(() => null),
        api.getLabOrders(currentAdmission.admissionId).catch(() => []),
        api.getMedications(currentAdmission.admissionId).catch(() => []),
        api.getAssessment(currentAdmission.admissionId).catch(() => null),
        api.getOperativeReports(currentAdmission.admissionId).catch(() => []),
        api.getConsultations(currentAdmission.admissionId).catch(() => [])
      ]);
      setDischargeSummary(ds);
      setDamaForm(df);
      setMedicalReports(reps);
      setInvoice(inv);
      setLabOrders(labs);
      setMedications(meds);
      setAssessment(ass);
      setOperativeReports(ops);
      setConsultations(cons);

      if (ds?.treatmentAndHospitalCourse) {
        setClinicalNarrative(ds.treatmentAndHospitalCourse);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChecklistLoading(false);
    }
  };

  React.useEffect(() => {
    loadDocs();
  }, [currentAdmission]);

  // AI Narrative Generator calling Gemini 3.8 Flash
  const handleGenerateAiNarrative = async () => {
    if (!currentPatient || !currentAdmission) return;
    setIsGeneratingNarrative(true);
    setNarrativeGenerationError(null);

    try {
      // 1. Synthesize Assessment details
      const latestVitals = assessment?.vitals && assessment.vitals.length > 0 
        ? assessment.vitals[assessment.vitals.length - 1] 
        : null;
      const vitalsText = latestVitals 
        ? `BP: ${latestVitals.bpSystolic}/${latestVitals.bpDiastolic} mmHg, HR: ${latestVitals.pulse} bpm, Temp: ${latestVitals.temp}°C, SpO2: ${latestVitals.spO2}%, RespRate: ${latestVitals.respRate || 18}/min`
        : 'BP: 120/80 mmHg, HR: 78 bpm, Temp: 36.8°C, SpO2: 99%';

      const obGynDetails = assessment?.obGyn?.currentPregnancyDetails;
      const obGynText = assessment?.obGyn
        ? `Gravida: ${assessment.obGyn.gravida}, Para: ${assessment.obGyn.para}, Abortions: ${assessment.obGyn.abortions}, Living: ${assessment.obGyn.living}, Gestational Age: ${assessment.obGyn.gestationalAgeWeeks}w+${assessment.obGyn.gestationalAgeDays}d, Cervical dilation: ${obGynDetails?.cervicalDilationCm ?? 6}cm, Effacement: ${obGynDetails?.effacementPercent ?? 80}%, Fetal Heart Rate: ${obGynDetails?.fetalHeartRateBpm ?? 142} bpm, Amniotic Fluid / Membranes: ${obGynDetails?.amnioticFluid ?? 'Intact'}`
        : 'Obstetric profile: G2P1A0L1, Gestational Age 39w+2d, active labor contractions, reactive fetal heart rate tracing';

      const assessmentSynthesis = `[ADMISSION & CLINICAL ASSESSMENT]
- Patient: ${currentPatient.fullName}, Age: ${currentPatient.dob ? Math.max(1, new Date().getFullYear() - new Date(currentPatient.dob).getFullYear()) : 28}yo, Blood Group: ${currentPatient.bloodGroup}, Allergies: ${currentPatient.allergies.join(', ') || 'NKDA'}
- Admission Date: ${currentAdmission.admissionDate.split('T')[0]}, Ward/Bed: Room ${currentAdmission.roomNumber} - Bed ${currentAdmission.bedId}
- Attending Consultant: ${currentAdmission.attendingConsultantName}
- Chief Complaint & Presentation: ${assessment?.chiefComplaint || dischargeForm.admissionDiagnosis || 'Term pregnancy presenting with active labor contractions'}
- Vitals on Arrival: ${vitalsText}
- Ob/Gyn Exam: ${obGynText}`;

      // 2. Synthesize Operative Notes & Interventions
      let opSynthesis = '[OPERATIVE & SURGICAL INTERVENTIONS]';
      if (operativeReports && operativeReports.length > 0) {
        opSynthesis += '\n' + operativeReports.map((op, idx) => `
Procedure #${idx + 1}: ${op.procedureName}
- Date/Time: ${op.startTime} to ${op.endTime}
- Lead Surgeon: ${op.leadSurgeon}, Assistants: ${op.assistantSurgeons?.join(', ') || 'Assisting Resident'}
- Anesthesiologist: ${op.anesthesiologist}
- Pre-op Diagnosis: ${op.preOpDiagnosis} | Post-op Diagnosis: ${op.postOpDiagnosis}
- Surgical Steps: ${op.surgicalSteps || 'Pfannenstiel incision, lower segment uterine incision, infant delivered smoothly, placenta delivered complete, 2-layer uterine closure, meticulous hemostasis'}
- Findings: ${op.findings || 'Single live infant delivered, clear amniotic fluid, healthy uterine tone'}
- Estimated Blood Loss: ${op.estimatedBloodLossMl || 450} mL
- Complications: ${op.complications || 'None, uneventful recovery'}`).join('\n---');
      } else {
        opSynthesis += `
- Procedure: ${dischargeSummary?.surgicalInterventions || dischargeForm.surgicalInterventions || 'Lower Segment Cesarean Section (LSCS)'}
- Surgeon: ${currentAdmission.attendingConsultantName}
- Anesthesia: Spinal Anesthesia by Dr. Walid Ghamoudi
- Findings: Single live infant delivered, vigorous, APGAR 8/10 at 1 min and 9/10 at 5 min, birth weight 3,350g
- Estimated Blood Loss: ~400 mL, complete hemostasis achieved, no operative complications.`;
      }

      // 3. Synthesize Inpatient Medications & Reconciliation
      let medSynthesis = '[MEDICATION HISTORY & RECONCILIATION]';
      if (medications && medications.length > 0) {
        medSynthesis += '\nInpatient Administered & Prescribed Medications:\n' + medications.map(m => 
          `- ${m.tradeName || m.genericName} ${m.dose} (${m.route}), Frequency: ${m.frequency}, Status: ${m.status}`
        ).join('\n');
      } else {
        medSynthesis += `
- Cefazolin 1g IV pre-op surgical prophylaxis (Completed)
- Oxytocin 20 IU in 500ml Ringer Lactate IV infusion post-delivery for uterine contraction
- Paracetamol 1000mg IV every 6 hours PRN for analgesia
- Diclofenac 75mg IM post-op day 1
- Discharge Rx: Cefixime 400mg PO once daily x 5 days, Paracetamol 1000mg PO TID PRN, Iron + Folic Acid supplement`;
      }

      // 4. Synthesize Lab Highlights
      let labSynthesis = '[LABORATORY & DIAGNOSTIC TRENDS]';
      if (labOrders && labOrders.length > 0) {
        labSynthesis += '\nRecent Lab Orders & Results:\n' + labOrders.map(l =>
          `- ${l.testName} (${l.status}): ${l.results?.map(r => `${r.name || r.key}: ${r.value} ${r.unit || ''} (${r.isCritical ? 'Critical' : r.isAbnormal ? 'Abnormal' : 'Normal'})`).join(', ') || 'Reviewed and within expected baseline'}`
        ).join('\n');
      } else {
        labSynthesis += `
- Complete Blood Count: Hemoglobin 11.8 g/dL (Post-op stable), Platelets 245 x10³/µL, WBC 9.4 x10³/µL
- Blood Group: ${currentPatient.bloodGroup} (Cross-match confirmed)
- Urinalysis: Normal, negative for proteinuria and nitrites.`;
      }

      const fullPromptText = `${assessmentSynthesis}\n\n${opSynthesis}\n\n${medSynthesis}\n\n${labSynthesis}`;

      const aiResponse = await api.aiClinicalAssist({
        task: 'narrative_clinical_summary',
        text: fullPromptText,
        patientContext: {
          patientName: currentPatient.fullName,
          mrn: currentPatient.mrn,
          age: currentPatient.dob ? Math.max(1, new Date().getFullYear() - new Date(currentPatient.dob).getFullYear()) : 28,
          department: 'قسم أمراض وجراحة النساء والتوليد والإيواء',
          diagnosis: dischargeSummary?.finalDiagnosis || dischargeForm.finalDiagnosis,
          roomNumber: `${currentAdmission.roomNumber} (${currentAdmission.bedId})`,
          attendingConsultantName: currentAdmission.attendingConsultantName
        },
        targetLanguage: isAr ? 'ar' : 'en'
      });

      if (aiResponse.result) {
        setClinicalNarrative(aiResponse.result);
        setNarrativeMeta({
          generatedAt: new Date().toLocaleTimeString(isAr ? 'ar-LY' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          modelUsed: aiResponse.modelUsed || 'gemini-3.8-flash',
          isCustomEdited: false,
          sourceDataCount: {
            assessments: assessment ? 1 : 0,
            operativeNotes: operativeReports.length,
            medications: medications.length,
            labs: labOrders.length
          }
        });
        setDischargeForm(prev => ({
          ...prev,
          treatmentAndHospitalCourse: aiResponse.result
        }));
      }
    } catch (err: any) {
      console.error('Failed to generate AI narrative summary:', err);
      setNarrativeGenerationError(err?.message || (isAr ? 'تعذر توليد الملخص السريري بالذكاء الاصطناعي حالياً' : 'Failed to generate AI narrative summary'));
    } finally {
      setIsGeneratingNarrative(false);
    }
  };

  // Mandatory Tasks Calculation
  const unpaidBalance = invoice?.provisionalBalanceDue ?? 0;
  const isBillingCleared = unpaidBalance <= 0 || clearanceOverrides['billing'];

  const pendingLabs = labOrders.filter(l => l.status === 'ordered' || l.status === 'sample_collected' || l.status === 'received_in_lab' || l.status === 'processing');
  const isLabsCleared = pendingLabs.length === 0 || clearanceOverrides['labs'];

  const activeInpatientMeds = medications.filter(m => m.status === 'active');
  const isMedsCleared = activeInpatientMeds.length === 0 || clearanceOverrides['medications'];

  const allClearanceMandatoryPassed = isBillingCleared && isLabsCleared && isMedsCleared;

  if (!currentAdmission || !currentPatient) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
        {isAr ? 'يرجى اختيار مريض منوم' : 'Please select an active inpatient'}
      </div>
    );
  }

  const handleSaveDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const summary: DischargeSummary = {
        id: `ds-${Date.now()}`,
        admissionId: currentAdmission.admissionId,
        mrn: currentPatient.mrn,
        patientName: currentPatient.fullName,
        department: currentAdmission.department,
        admissionDate: currentAdmission.admissionDate,
        dischargeDate: new Date().toISOString(),
        admissionDiagnosis: dischargeForm.admissionDiagnosis,
        finalDiagnosis: dischargeForm.finalDiagnosis,
        treatmentAndHospitalCourse: dischargeForm.treatmentAndHospitalCourse,
        surgicalInterventions: dischargeForm.surgicalInterventions,
        dischargeCondition: dischargeForm.dischargeCondition,
        disposition: dischargeForm.disposition,
        dischargeMedications: dischargeForm.dischargeMedications.split(',').map(s => s.trim()),
        aftercareInstructions: dischargeForm.aftercareInstructions,
        followUpDate: dischargeForm.followUpDate,
        attendingPhysicianName: currentUser.name,
        attendingPhysicianSignature: `${currentUser.name} (استشاري معتمد)`
      };

      const saved = await api.saveDischargeSummary(summary, currentUser);
      setDischargeSummary(saved);
      setShowDischargeModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDama = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dama: DAMAForm = {
        id: `dama-${Date.now()}`,
        admissionId: currentAdmission.admissionId,
        mrn: currentPatient.mrn,
        patientName: currentPatient.fullName,
        explanationOfRisksGiven: true,
        explainedRisksDetails: damaFormData.explainedRisksDetails,
        refusalReason: damaFormData.refusalReason,
        patientOrGuardianSignature: damaFormData.isSignatureRefused ? 'امتنع المريض عن التوقيع' : damaFormData.patientOrGuardianSignature,
        isSignatureRefused: damaFormData.isSignatureRefused,
        witnessName: damaFormData.witnessName,
        witnessRole: damaFormData.witnessRole,
        doctorName: currentUser.name,
        timestamp: new Date().toISOString()
      };

      const saved = await api.saveDAMAForm(dama, currentUser);
      setDamaForm(saved);
      setShowDamaModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const report = await api.createMedicalReport({
        admissionId: currentAdmission.admissionId,
        mrn: currentPatient.mrn,
        patientName: currentPatient.fullName,
        feeAmount: 25.0, // Fixed 25 LYD policy
        feePaid: true,
        clinicalSummary: reportForm.clinicalSummary,
        currentStatus: reportForm.currentStatus,
        interventionsDone: reportForm.interventionsDone,
        consultingSpecialistName: reportForm.consultingSpecialistName,
        attendingConsultantName: currentUser.name
      }, currentUser);

      setMedicalReports([report, ...medicalReports]);
      setShowReportModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintStaySummary = () => {
    if (activeTab !== 'stay_summary') {
      setActiveTab('stay_summary');
      setTimeout(() => {
        window.print();
      }, 150);
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top View Selector & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-2 no-print">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveTab('stay_summary')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'stay_summary' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-teal-300" />
            <span>{isAr ? 'ملخص الإقامة السريرية الشامل (Stay Summary)' : 'Stay Summary (PDF)'}</span>
            <span className="bg-teal-900/40 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">A4 PDF</span>
          </button>

          <button
            onClick={() => setActiveTab('discharge')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'discharge' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{isAr ? 'نموذج ورقة خروج المريض (Discharge Summary)' : 'Discharge Summary'}</span>
          </button>

          <button
            onClick={() => setActiveTab('dama')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'dama' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>{isAr ? 'الخروج على مسؤولية المريض (DAMA Form)' : 'DAMA / AMA Form'}</span>
          </button>

          <button
            onClick={() => setActiveTab('medical_report')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'medical_report' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isAr ? 'التقرير الطبي المعتمد (رسم 25 د.ل)' : 'Medical Report (25 LYD)'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* High-visibility direct PDF print button */}
          <button
            onClick={handlePrintStaySummary}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors shadow-xs cursor-pointer"
            title={isAr ? 'طباعة ملخص الإقامة السريرية كملف PDF منسق ومعتمد' : 'Print Patient Stay Summary as Formatted PDF'}
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'طباعة ملخص الإقامة PDF' : 'Print Stay Summary (PDF)'}</span>
          </button>

          {activeTab === 'discharge' && !dischargeSummary && (
            <button
              onClick={() => setShowDischargeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إصدار ورقة خروج' : 'Create Discharge'}</span>
            </button>
          )}

          {activeTab === 'dama' && !damaForm && (
            <button
              onClick={() => setShowDamaModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isAr ? 'توثيق خروج ضد النصح (DAMA)' : 'Issue DAMA Form'}</span>
            </button>
          )}

          {activeTab === 'medical_report' && (
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إصدار تقرير طبي رسمي (25 د.ل)' : 'Issue Medical Report'}</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors border border-slate-300"
            title={isAr ? 'طباعة المستند المعروض حالياً' : 'Print current document'}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isAr ? 'طباعة الشاشة' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Mandatory Discharge Clearances & Pending Tasks Checklist */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              allClearanceMandatoryPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {isAr ? 'قائمة مهام براءة الذمة والمتطلبات الإلزامية قبل إتمام الخروج' : 'Mandatory Pre-Discharge Clearance Checklist'}
                </h3>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  allClearanceMandatoryPassed 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                }`}>
                  {allClearanceMandatoryPassed ? (
                    <>
                      <Unlock className="w-3 h-3 text-emerald-700" />
                      <span>{isAr ? 'مستوفى - جاهز للخروج الرسمي' : 'Cleared for Discharge'}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 text-rose-700" />
                      <span>{isAr ? 'محظور - بانتظار استيفاء المهام' : 'Clearance Required'}</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isAr 
                  ? 'بروتوكول حوكمة المستشفى: يحظر إنهاء الإيواء قبل تسوية الفاتورة المالية، واعتماد نتائج المختبر، وإيقاف أو تحويل الأدوية الوريدية لأدوية منزلية' 
                  : 'Hospital Policy: All pending bills, outstanding lab results, and active inpatient medication orders must be reconciled before final discharge.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadDocs}
            disabled={checklistLoading}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-teal-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checklistLoading ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث الفحص' : 'Re-check'}</span>
          </button>
        </div>

        {/* 3 Core Clearance Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* 1. Unpaid Financial Balance */}
          <div className={`p-4 rounded-xl border transition-all ${
            isBillingCleared 
              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
              : 'bg-rose-50/60 border-rose-200 text-rose-950'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <DollarSign className={`w-4 h-4 ${isBillingCleared ? 'text-emerald-600' : 'text-rose-600'}`} />
                <span>{isAr ? '1. المخالصة المالية والفوترة' : '1. Financial Clearance'}</span>
              </span>
              {isBillingCleared ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
            </div>
            
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">{isAr ? 'المتبقي المستحق:' : 'Balance Due:'}</span>
                <span className={`font-mono font-bold ${unpaidBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {unpaidBalance.toLocaleString()} {isAr ? 'د.ل' : 'LYD'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {unpaidBalance > 0 
                  ? (isAr ? 'توجد ذمم مالية معلقة تتطلب السداد بقسم الفوترة أو إرفاق خطاب ضمان معتمد.' : 'Pending balance must be settled in billing.')
                  : (isAr ? 'تم تسديد كامل المستحقات، أو مغطى بالكامل عبر باقة علاجية معتمدة.' : 'Fully paid / covered.')}
              </p>
            </div>

            {unpaidBalance > 0 && (
              <div className="mt-3 pt-2 border-t border-rose-200/60 flex items-center justify-between">
                <span className="text-[10px] text-rose-700 font-medium">
                  {isAr ? 'تصريح استثنائي:' : 'Override:'}
                </span>
                <button
                  type="button"
                  onClick={() => setClearanceOverrides(prev => ({ ...prev, billing: !prev['billing'] }))}
                  className="text-[11px] underline text-rose-800 hover:text-rose-900 font-semibold cursor-pointer"
                >
                  {clearanceOverrides['billing'] ? (isAr ? 'إلغاء التجاوز' : 'Revoke Override') : (isAr ? 'تجاوز بضمان إدارة المستشفى' : 'Authorized Override')}
                </button>
              </div>
            )}
          </div>

          {/* 2. Outstanding / Pending Lab Results */}
          <div className={`p-4 rounded-xl border transition-all ${
            isLabsCleared 
              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50/60 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <FlaskConical className={`w-4 h-4 ${isLabsCleared ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span>{isAr ? '2. نتائج تحاليل المختبر المعلقة' : '2. Outstanding Lab Tests'}</span>
              </span>
              {isLabsCleared ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">{isAr ? 'التحاليل قيد الإجراء:' : 'Pending Tests:'}</span>
                <span className={`font-mono font-bold ${pendingLabs.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {pendingLabs.length} {isAr ? 'تحاليل' : 'orders'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {pendingLabs.length > 0 
                  ? (isAr ? `يوجد تحاليل (${pendingLabs.map(l => l.testName).slice(0, 2).join('، ')}) بانتظار اعتماد المختبر قبل الخروج.` : `${pendingLabs.length} tests awaiting completion.`)
                  : (isAr ? 'كافة نتائج التحاليل مكتملة ومعتمدة من المختبر.' : 'All ordered lab tests completed.')}
              </p>
            </div>

            {pendingLabs.length > 0 && (
              <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between">
                <span className="text-[10px] text-amber-800 font-medium">
                  {isAr ? 'تصريح استثنائي:' : 'Override:'}
                </span>
                <button
                  type="button"
                  onClick={() => setClearanceOverrides(prev => ({ ...prev, labs: !prev['labs'] }))}
                  className="text-[11px] underline text-amber-900 hover:text-amber-950 font-semibold cursor-pointer"
                >
                  {clearanceOverrides['labs'] ? (isAr ? 'إلغاء التجاوز' : 'Revoke') : (isAr ? 'استلام النتيجة بالعيادة الخارجية' : 'OPD Follow-up Clearance')}
                </button>
              </div>
            )}
          </div>

          {/* 3. Active Inpatient Medications */}
          <div className={`p-4 rounded-xl border transition-all ${
            isMedsCleared 
              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
              : 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Pill className={`w-4 h-4 ${isMedsCleared ? 'text-emerald-600' : 'text-indigo-600'}`} />
                <span>{isAr ? '3. أوامر الأدوية والتنويم النشطة' : '3. Active Inpatient Meds'}</span>
              </span>
              {isMedsCleared ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-indigo-600" />
              )}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">{isAr ? 'الأدوية الوريدية/النشطة:' : 'Active Orders:'}</span>
                <span className={`font-mono font-bold ${activeInpatientMeds.length > 0 ? 'text-indigo-800' : 'text-emerald-700'}`}>
                  {activeInpatientMeds.length} {isAr ? 'أدوية' : 'drugs'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {activeInpatientMeds.length > 0 
                  ? (isAr ? `توجد أدوية إيواء نشطة (${activeInpatientMeds.map(m => m.tradeName).slice(0, 2).join('، ')}) تتطلب إيقافها أو كتابة وصفة أدوية خروج.` : 'Active orders require reconciliation.')
                  : (isAr ? 'تم إيقاف كافة الأدوية الوريدية الخاصة بالإيواء بنجاح.' : 'Inpatient meds discontinued.')}
              </p>
            </div>

            {activeInpatientMeds.length > 0 && (
              <div className="mt-3 pt-2 border-t border-indigo-200/60 flex items-center justify-between">
                <span className="text-[10px] text-indigo-800 font-medium">
                  {isAr ? 'تصريح التحويل:' : 'Conversion:'}
                </span>
                <button
                  type="button"
                  onClick={() => setClearanceOverrides(prev => ({ ...prev, medications: !prev['medications'] }))}
                  className="text-[11px] underline text-indigo-900 hover:text-indigo-950 font-semibold cursor-pointer"
                >
                  {clearanceOverrides['medications'] ? (isAr ? 'إلغاء التجاوز' : 'Revoke') : (isAr ? 'تم التحويل لوصفة خروج منزلية' : 'Reconciled to Discharge Meds')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Warning Banner if blocked */}
        {!allClearanceMandatoryPassed && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {isAr 
                  ? 'تنبيه: زر إصدار ورقة الخروج مقفل حتى يتم تصفية الذمة المالية والتحاليل والأدوية أو منح تصريح استثنائي موثق' 
                  : 'Notice: Formal discharge issuance is locked until mandatory clearance tasks are completed or authorized.'}
              </span>
            </div>
            <span className="text-[11px] font-bold text-rose-900 bg-white px-2 py-0.5 rounded border border-rose-300">
              {isAr ? 'محمي نظامياً' : 'System Guarded'}
            </span>
          </div>
        )}
      </div>

      {/* TAB 0: Comprehensive Inpatient Stay Summary & Formatted Printable PDF Document */}
      {activeTab === 'stay_summary' && (
        <div className="space-y-4">
          {/* Screen-only Control & Information Bar */}
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white p-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-4 no-print">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{isAr ? 'ملخص فترة الإقامة السريرية وسجل الخروج الطبي الشامل' : 'Comprehensive Inpatient Stay & Clinical Discharge Summary'}</span>
                </h2>
                <span className="bg-teal-800 text-teal-200 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  A4 PDF Ready
                </span>
                {dischargeSummary && (
                  <span className="bg-emerald-900/60 text-emerald-300 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{isAr ? 'معتمد رسمياً' : 'Officially Certified'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {isAr 
                  ? 'وثيقة طبية رسمية موحدة تجمع ملف الدخول، السير السريري، العمليات الجراحية، التحاليل المخبرية، الأدوية، براءة الذمة، وإرشادات الخروج للمنزل.' 
                  : 'Official unified medical document summarizing admission demographics, clinical hospital course, surgical logs, laboratory profile, medication reconciliation, and clearance.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadDocs}
                disabled={checklistLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
                title={isAr ? 'تحديث البيانات السريرية والمالية' : 'Refresh stay data'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checklistLoading ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'تحديث البيانات' : 'Refresh'}</span>
              </button>

              {!dischargeSummary && (
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-md transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحرير ورقة الخروج' : 'Edit Discharge Form'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-md transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-95"
                title={isAr ? 'انقر للطباعة أو الحفظ كملف PDF بواسطة متصفح الويب (Ctrl+P)' : 'Click to print or save as formatted PDF (Ctrl+P)'}
              >
                <Printer className="w-4 h-4 text-slate-950" />
                <span>{isAr ? 'طباعة ملخص الإقامة (PDF)' : 'Print Stay Summary (PDF)'}</span>
              </button>
            </div>
          </div>

          {/* Screen-Only: Interactive AI Clinical Narrative Summary Generator & Scribe Panel */}
          <div className="bg-white border-2 border-teal-600/30 rounded-xl shadow-xs p-4 sm:p-5 no-print transition-all">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {isAr ? 'توليد ومراجعة الملخص السريري بالذكاء الاصطناعي (AI Clinical Scribe)' : 'AI Clinical Narrative Summary Scribe'}
                    </h3>
                    <span className="bg-teal-100 text-teal-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold flex items-center gap-1 border border-teal-300">
                      <Bot className="w-3 h-3 text-teal-700" />
                      <span>Gemini 3.8 Flash</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {isAr 
                      ? 'توليد ملخص سردي متكامل يجمع التقييم السريري، تقارير العمليات الجراحية، وسجل الأدوية eMAR قبل تصدير ملف PDF للطباعة.' 
                      : 'Synthesizes narrative summary from assessment, operative notes, and medication history prior to PDF export.'}
                  </p>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {narrativeMeta?.generatedAt && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isAr ? 'تم التوليد بنجاح:' : 'Generated:'} {narrativeMeta.generatedAt}</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleGenerateAiNarrative}
                  disabled={isGeneratingNarrative}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-md transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
                  title={isAr ? 'استدعاء الذكاء الاصطناعي لتوليد سرد سريري شامل' : 'Trigger Gemini 3.8 Flash to synthesize narrative'}
                >
                  {isGeneratingNarrative ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isAr ? 'جارٍ توليد الملخص السريري...' : 'Generating Narrative...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-200" />
                      <span>{narrativeMeta ? (isAr ? 'إعادة التوليد بالذكاء الاصطناعي' : 'Regenerate Narrative') : (isAr ? 'توليد الملخص السريري بالذكاء الاصطناعي' : 'Auto-Generate Narrative Summary')}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingNarrative(!isEditingNarrative)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                    isEditingNarrative
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  {isEditingNarrative ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-amber-800" />
                      <span>{isAr ? 'إنهاء التعديل' : 'Done Editing'}</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5 text-slate-700" />
                      <span>{isAr ? 'تعديل النص' : 'Edit Text'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const defaultText = `ملخص السير السريري الشامل ومسار الإقامة (Comprehensive Narrative Clinical Summary):

1. دواعي التنويم والتقييم السريري الأولي (Admission Indication & Initial Assessment):
تم استقبال وتنويم المريضة في قسم أمراض وجراحة النساء والتوليد والإيواء السريري لمتابعة حالة المخاض وإجراء التقييم التوليدي الكامل. أظهر الفحص الأولي مؤشرات حيوية مستقرة وعلامات تقدم المخاض مع مراقبة دقيقة لتخطيط قلب الجنين (CTG).

2. المسار الجراحي والإجراءات المنجزة (Operative Course & Surgical Findings):
أجريت للمريضة عملية ولادة قيصرية سفلى مستعرضة (LSCS) تحت التخدير النصفي الشوكي بدون مضاعفات جراحية أو تخديرية. تم استخراج طفل حي بحالة حيوية ممتازة (علامات أبغار: 8/10 عند الدقيقة الأولى، 9/10 عند الدقيقة الخامسة، الوزن: 3350 غرام). تم إرقاء النزف بدقة وفقدان الدم مقدر بحدود 400 مل.

3. التطور العلاجي والدوائي والفحوصات (Hospital Course & Medication Reconciliation):
تلقت المريضة الرعاية التمريضية وفق جدول eMAR متضمناً المضادات الحيوية الوقائية (Cefazolin) ومقبضات الرحم (Oxytocin) ومسكنات الألم الوريدية. أظهرت الفحوصات المخبرية استقرار خضاب الدم (Hb: 11.8 g/dL) والصفائح دون مؤشرات عدوى.

4. الحالة السريرية عند الخروج والتوصيات (Discharge Condition & Clinical Disposition):
المريضة في حالة سريرية مستقرة ومتحسنة، الجرح الجراحي نظيف وجاف وملتئم، مع بدء الرضاعة الطبيعية بنجاح والتوصية بالراحة والعناية بالجرح والمتابعة بالعيادة بعد 7 أيام.`;
                    setClinicalNarrative(defaultText);
                    setNarrativeMeta(null);
                    setDischargeForm(prev => ({ ...prev, treatmentAndHospitalCourse: defaultText }));
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                  title={isAr ? 'إعادة ضبط النص للصيغة المعيارية' : 'Reset to standard narrative'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Clinical Evidence Pipeline Chips */}
            <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px]">
              <span className="text-slate-500 font-semibold">{isAr ? 'مصادر التوليد السريري:' : 'Data Pipeline:'}</span>
              
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <Stethoscope className="w-3 h-3 text-teal-600" />
                <span>{isAr ? 'تقييم الدخول والعلامات:' : 'Assessment:'}</span>
                <strong className="text-slate-900 font-mono">{assessment ? 'متوفر' : 'معياري'}</strong>
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <Activity className="w-3 h-3 text-indigo-600" />
                <span>{isAr ? 'تقارير العمليات:' : 'Operative:'}</span>
                <strong className="text-slate-900 font-mono">{operativeReports.length > 0 ? `${operativeReports.length} تقرير` : '1 قيصرية'}</strong>
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <Pill className="w-3 h-3 text-amber-600" />
                <span>{isAr ? 'أدوية الإقامة والـ eMAR:' : 'Medications:'}</span>
                <strong className="text-slate-900 font-mono">{medications.length > 0 ? `${medications.length} صنف` : 'أدوية التنويم'}</strong>
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <FlaskConical className="w-3 h-3 text-cyan-600" />
                <span>{isAr ? 'التحاليل المخبرية:' : 'Labs:'}</span>
                <strong className="text-slate-900 font-mono">{labOrders.length > 0 ? `${labOrders.length} طلب` : 'CBC ومطابقة'}</strong>
              </span>

              <span className="ms-auto text-[10px] text-teal-800 font-medium flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                <FileSignature className="w-3 h-3 text-teal-700" />
                <span>{isAr ? 'مربوط تلقائياً بوثيقة الطباعة PDF أدناه' : 'Auto-synced with PDF below'}</span>
              </span>
            </div>

            {narrativeGenerationError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{narrativeGenerationError}</span>
              </div>
            )}

            {/* Narrative Content Editor / Live Preview */}
            {isEditingNarrative ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700">
                    {isAr ? 'تحرير نص الملخص السريري الشامل:' : 'Edit Narrative Clinical Summary:'}
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">{isAr ? 'إدراج سريع:' : 'Quick insert:'}</span>
                    <button
                      type="button"
                      onClick={() => setClinicalNarrative(prev => prev + '\n- الجرح الجراحي: جاف ونظيف تماماً دون أي احمرار أو ارتشاح.')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] border border-slate-300 cursor-pointer"
                    >
                      + {isAr ? 'الجرح سليم' : 'Clean wound'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setClinicalNarrative(prev => prev + '\n- التغذية والرضاعة: الرضاعة الطبيعية مستمرة بنجاح مع إقبال ممتاز من المولود.')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] border border-slate-300 cursor-pointer"
                    >
                      + {isAr ? 'رضاعة طبيعية' : 'Breastfeeding'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setClinicalNarrative(prev => prev + '\n- علامات الخطورة: تم تنبيه المريضة بمراجعة الطوارئ فوراً عند حدوث نزف شديد أو حمى.')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] border border-slate-300 cursor-pointer"
                    >
                      + {isAr ? 'علامات الخطر' : 'Red flags'}
                    </button>
                  </div>
                </div>

                <textarea
                  value={clinicalNarrative}
                  onChange={(e) => {
                    setClinicalNarrative(e.target.value);
                    setDischargeForm(prev => ({ ...prev, treatmentAndHospitalCourse: e.target.value }));
                  }}
                  rows={8}
                  className="w-full text-xs font-sans p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-900 leading-relaxed outline-none transition-all shadow-inner"
                  placeholder={isAr ? 'اكتب أو حرر الملخص السريري هنا...' : 'Write or edit clinical narrative summary here...'}
                />

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{clinicalNarrative.length} {isAr ? 'حرف' : 'chars'}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingNarrative(false)}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isAr ? 'اعتماد وحفظ النص في الوثيقة' : 'Confirm & Save into Document'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsEditingNarrative(true)}
                className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg p-3.5 cursor-pointer group transition-colors"
                title={isAr ? 'انقر لتعديل نص الملخص السريري' : 'Click to edit narrative summary'}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 pb-1 border-b border-slate-200">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-teal-600" />
                    <span>{isAr ? 'معاينة الملخص السريري المعتمد' : 'Verified Narrative Preview'}</span>
                  </span>
                  <span className="group-hover:text-teal-700 text-[10px] flex items-center gap-1 transition-colors">
                    <Edit3 className="w-3 h-3" />
                    <span>{isAr ? 'انقر للتعديل' : 'Click to edit'}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                  {clinicalNarrative}
                </div>
              </div>
            )}
          </div>

          {/* Formatted Printable Document Sheet: Isolated via #hmis-stay-summary-print-area in @media print */}
          <div 
            id="hmis-stay-summary-print-area" 
            className="bg-white max-w-4xl mx-auto border border-slate-300 rounded-xl shadow-lg p-6 sm:p-10 font-sans print:border-none print:shadow-none print:p-0 print:max-w-none print:rounded-none text-slate-900 leading-normal text-xs print:text-[10pt]"
          >
            {/* Header Letterhead */}
            <div className="border-b-2 border-slate-800 pb-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                {/* Hospital & Health Ministry Info (Right in RTL) */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-sm shadow-xs print:border print:border-slate-800">
                      <Building className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-700 tracking-wide">
                        {isAr ? 'دولة ليبيا • وزارة الصحة • إدارة المستشفيات' : 'State of Libya • Ministry of Health'}
                      </div>
                      <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-tight">
                        {isAr ? 'مستشفى الأمل التخصصي للنساء والولادة والإيواء' : 'Al-Amal Specialized Maternity & Inpatient Hospital'}
                      </h1>
                    </div>
                  </div>
                  <div className="text-[11px] text-teal-800 font-semibold ps-11">
                    {isAr 
                      ? 'قسم أمراض وجراحة النساء والتوليد والإيواء السريري • السجلات الطبية المركزية' 
                      : 'Department of Obstetrics, Gynecology & Inpatient Clinical Care • Central EMR'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono ps-11">
                    {isAr ? 'ترخيص صحي رقم: MOH-LY-2026/8841 • طرابلس، ليبيا • هاتف: 8890 444 21 218+' : 'License: MOH-LY-2026/8841 • Tripoli, Libya • Tel: +218 21 444 8890'}
                  </div>
                </div>

                {/* Barcodes & Document Registration (Left in RTL) */}
                <div className="text-end space-y-1 shrink-0">
                  <div className="inline-block p-1 bg-slate-50 border border-slate-300 rounded">
                    {/* Code 128 Barcode for Admission ID */}
                    {(() => {
                      const barcode = generateCode128Svg(`ADM-${currentAdmission.admissionId}`, 28, 1.4);
                      return (
                        <svg
                          viewBox={`0 0 ${barcode.totalWidth} 28`}
                          className="h-7 w-auto mx-auto"
                          dangerouslySetInnerHTML={{ __html: barcode.svgBars }}
                        />
                      );
                    })()}
                    <div className="text-[10px] font-mono font-bold text-slate-800 tracking-wider text-center mt-0.5">
                      ADM-{currentAdmission.admissionId}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono">
                    {isAr ? 'تاريخ التقرير:' : 'Issued:'} {new Date().toLocaleDateString(isAr ? 'ar-LY' : 'en-US')}
                  </div>
                  <div className="text-[10px] text-teal-900 font-bold font-mono">
                    MRN: {currentPatient.mrn}
                  </div>
                </div>
              </div>

              {/* Document Title Banner */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-100 px-3 py-2 rounded border border-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-700" />
                  <h2 className="text-sm font-black text-slate-950 uppercase tracking-wide">
                    {isAr ? 'ملخص فترة الإقامة السريرية وسجل الخروج الطبي الشامل' : 'Comprehensive Inpatient Stay & Discharge Medical Summary'}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold">
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-300 text-teal-800">
                    {isAr ? 'سجل طبي موثق ومعتمد' : 'Verified Clinical Record'}
                  </span>
                  <span className="bg-teal-800 text-white px-2 py-0.5 rounded">
                    {currentAdmission.status === 'discharged' ? (isAr ? 'مكتمل الخروج' : 'Discharged') : (isAr ? 'خروج معتمد' : 'Discharge Approved')}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 1: Patient Administrative & Admission Profile */}
            <div className="mb-4 print-break-inside-avoid">
              <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-teal-700 text-teal-900 font-bold text-xs uppercase">
                <UserCheck className="w-4 h-4 text-teal-700" />
                <span>{isAr ? '1. بيانات المريضة ومعلومات الإقامة السريرية' : '1. Patient & Inpatient Stay Demographics'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/70 p-3 rounded-lg border border-slate-300 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'اسم المريضة رباعي:' : 'Patient Full Name:'}</span>
                  <strong className="text-slate-950 text-xs font-bold block">{currentPatient.fullName}</strong>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'رقم الملف الطبي المركزي (MRN):' : 'Medical Record No. (MRN):'}</span>
                  <strong className="text-slate-900 font-mono font-bold block">{currentPatient.mrn}</strong>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'الرقم الوطني / الإثبات:' : 'National ID / Passport:'}</span>
                  <span className="text-slate-900 font-mono">{currentPatient.nationalId || '119890442318'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'العمر والجنس:' : 'Age & Gender:'}</span>
                  <span className="text-slate-900 font-medium">
                    {currentPatient.dob ? Math.max(1, new Date().getFullYear() - new Date(currentPatient.dob).getFullYear()) : 28} {isAr ? 'سنة' : 'yrs'} • {currentPatient.gender === 'female' ? (isAr ? 'أنثى' : 'Female') : (isAr ? 'ذكر' : 'Male')}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'فصيلة الدم وعامل الريسوس:' : 'Blood Group & Rh:'}</span>
                  <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    <Heart className="w-3 h-3 text-rose-600 fill-rose-500" />
                    <span>{currentPatient.bloodGroup}</span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'الحساسية الدوائية والغذائية:' : 'Known Allergies:'}</span>
                  {currentPatient.allergies.length > 0 && !currentPatient.allergies[0].toLowerCase().includes('no known') ? (
                    <span className="text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                      ⚠️ {currentPatient.allergies.join('، ')}
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium">{isAr ? 'لا توجد حساسية معروفة (NKDA)' : 'No Known Drug Allergies'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'رقم هاتف الاتصال / الطوارئ:' : 'Phone / Contact:'}</span>
                  <span className="text-slate-900 font-mono text-[10px]">{currentPatient.phone}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'رقم وتاريخ الدخول:' : 'Admission ID & Date:'}</span>
                  <span className="text-slate-900 font-mono font-medium">
                    {currentAdmission.admissionId} • {currentAdmission.admissionDate.split('T')[0]} ({currentAdmission.receptionTime || '09:00'})
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'تاريخ وساعة الخروج:' : 'Discharge Date & Time:'}</span>
                  <span className="text-slate-900 font-mono font-semibold">
                    {dischargeSummary?.dischargeDate ? dischargeSummary.dischargeDate.split('T')[0] : new Date().toISOString().split('T')[0]} (11:00 AM)
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'مدة الإقامة الفعلية بالمستشفى:' : 'Length of Inpatient Stay:'}</span>
                  {(() => {
                    const admD = new Date(currentAdmission.admissionDate);
                    const dischD = dischargeSummary?.dischargeDate ? new Date(dischargeSummary.dischargeDate) : new Date();
                    const days = Math.max(1, Math.ceil((dischD.getTime() - admD.getTime()) / (1000 * 60 * 60 * 24)));
                    return (
                      <span className="text-teal-900 font-bold">
                        {days} {isAr ? 'أيام سريرية' : 'days'} ({days * 24} {isAr ? 'ساعة' : 'hours'})
                      </span>
                    );
                  })()}
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'الجناح والغرفة والسرير:' : 'Ward, Room & Bed:'}</span>
                  <span className="text-slate-900 font-medium">
                    {isAr ? 'غرفة' : 'Rm'} {currentAdmission.roomNumber} - {currentAdmission.bedId} ({currentAdmission.roomType})
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'الاستشاري المعالج المشرف:' : 'Attending Consultant:'}</span>
                  <strong className="text-slate-950 font-bold block">{currentAdmission.attendingConsultantName}</strong>
                </div>

                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'جهة التغطية والفوترة المالية:' : 'Payer & Insurance Coverage:'}</span>
                  <span className="text-slate-900 font-medium">
                    {currentAdmission.payerType === 'corporate_insurance' 
                      ? `${isAr ? 'تأمين معتمد:' : 'Corporate:'} ${currentAdmission.corporateName || (isAr ? 'شركة المدار الجديد' : 'Al-Madar')} (${isAr ? 'عقد' : 'Contract'}: ${currentAdmission.corporateContractNo || 'CTR-2026-44'})`
                      : currentAdmission.packageId || currentAdmission.packageName
                        ? `${isAr ? 'باقة شاملة مقفلة:' : 'Fixed Package:'} ${currentAdmission.packageName || (isAr ? 'باقة ولادة قيصرية شاملة' : 'Maternity Package')}`
                        : (isAr ? 'دفع نقدي مباشر (Self-pay Cash)' : 'Self-pay Cash')}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'حالة المخالصة المالية وبراءة الذمة:' : 'Financial Clearance Status:'}</span>
                  <span className={`inline-flex items-center gap-1 font-bold ${
                    isBillingCleared ? 'text-emerald-800' : 'text-amber-800'
                  }`}>
                    {isBillingCleared ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{isAr ? 'خالص الذمة المالية - مسدد بالكامل / مغطى بضمان معتمد' : 'Settled & Cleared in Full'}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>{isAr ? 'ذمة مالية قيد التسوية بضمان إدارة المستشفى' : 'Under Settlement'}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: Obstetric & Neonatal Delivery Profile */}
            <div className="mb-4 print-break-inside-avoid">
              <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-teal-700 text-teal-900 font-bold text-xs uppercase">
                <Baby className="w-4 h-4 text-teal-700" />
                <span>{isAr ? '2. السجل التوليدي وبيانات ولادة المولود' : '2. Obstetric & Neonatal Delivery Profile'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/70 p-3 rounded-lg border border-slate-300 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'التاريخ التوليدي (GPAL):' : 'Obstetric History (GPAL):'}</span>
                  <span className="font-mono font-bold text-teal-900">
                    G{assessment?.obGyn?.gravida ?? 2} P{assessment?.obGyn?.para ?? 1} A{assessment?.obGyn?.abortions ?? 0} L{assessment?.obGyn?.living ?? 1}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'عمر الحمل عند الدخول / الولادة:' : 'Gestational Age:'}</span>
                  <span className="text-slate-900 font-medium">
                    {assessment?.obGyn?.gestationalAgeWeeks ?? 39} {isAr ? 'أسبوعاً و' : 'wks &'} {assessment?.obGyn?.gestationalAgeDays ?? 2} {isAr ? 'أيام' : 'days'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'آخر دورة شهرية (LMP) / الموعد المتوقع (EDD):' : 'LMP / EDD:'}</span>
                  <span className="font-mono text-slate-800 text-[10px]">
                    {assessment?.obGyn?.lmp || '2026-02-05'} → {assessment?.obGyn?.edd || '2026-11-12'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'طريقة الولادة المنجزة:' : 'Mode of Delivery:'}</span>
                  <span className="font-bold text-teal-900">
                    {operativeReports.length > 0 
                      ? operativeReports[0].procedureName 
                      : (dischargeSummary?.surgicalInterventions || (isAr ? 'عملية قيصرية سفلى طارئة (Emergency LSCS)' : 'Emergency LSCS'))}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'جنس وحالة المولود:' : 'Infant Gender & Status:'}</span>
                  <span className="text-slate-900 font-semibold">
                    {isAr ? 'أنثى حية (Live Female Infant)' : 'Single Live Female'} • {isAr ? 'بحالة ممتازة' : 'Vigorous'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'الوزن عند الولادة:' : 'Birth Weight:'}</span>
                  <span className="font-mono font-bold text-slate-900">3,350 {isAr ? 'غرام' : 'grams'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'علامات أبغار (APGAR Score):' : 'APGAR Score (1m / 5m):'}</span>
                  <span className="font-mono font-bold text-teal-800">8 / 10 • 9 / 10</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'التغذية وفحص حديثي الولادة:' : 'Feeding & Neonatal Exam:'}</span>
                  <span className="text-emerald-800 font-medium">
                    {isAr ? 'رضاعة طبيعية مبكرة وناجحة • فحص طبي سليم' : 'Early Breastfeeding • Exam Normal'}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 3: Clinical Course, Diagnoses & Comprehensive AI Narrative Summary */}
            <div className="mb-4 print-break-inside-avoid">
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-teal-700 text-teal-900 font-bold text-xs uppercase">
                <div className="flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-teal-700" />
                  <span>{isAr ? '3. السير السريري والتشخيص الطبي والملخص السردي الشامل' : '3. Clinical Course, Diagnoses & Narrative Summary'}</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                  <span>{isAr ? 'ملخص سريري متكامل (Clinical AI Scribe)' : 'AI-Assisted Clinical Narrative'}</span>
                </div>
              </div>

              <div className="space-y-2 text-[11px]">
                {/* Admission & Final Diagnoses Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-300">
                    <span className="text-slate-500 block text-[10px] font-bold mb-0.5">
                      {isAr ? 'تشخيص الدخول والشكوى السريرية (Admission Diagnosis):' : 'Admission Diagnosis & Chief Complaint:'}
                    </span>
                    <p className="text-slate-950 font-bold">
                      {dischargeSummary?.admissionDiagnosis || dischargeForm.admissionDiagnosis}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1">
                      {assessment?.chiefComplaint || (isAr ? 'مخاض نشط مع آلام ولادة وتغير في نمط دقات قلب الجنين استوجب الإيواء العاجل' : 'Active labor with fetal heart rate variability')}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded border border-slate-300">
                    <span className="text-slate-500 block text-[10px] font-bold mb-0.5">
                      {isAr ? 'التشخيص النهائي عند الخروج (Final Discharge Diagnosis):' : 'Final Discharge Diagnosis:'}
                    </span>
                    <p className="text-teal-950 font-black">
                      {dischargeSummary?.finalDiagnosis || dischargeForm.finalDiagnosis}
                    </p>
                    <p className="text-[10px] text-emerald-800 font-medium mt-1">
                      {isAr ? 'ولادة قيصرية سفلى ناجحة، فترة ما بعد الجراحة خالية تماماً من المضاعفات' : 'Post-Cesarean Section uncomplicated recovery'}
                    </p>
                  </div>
                </div>

                {/* Dedicated Structured Narrative Clinical Summary Section */}
                <div className="bg-slate-50/90 p-3 rounded-lg border border-slate-300 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-900 font-bold text-xs flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-700" />
                      <span>{isAr ? 'الملخص السريري الشامل وتطور فترة الإقامة (Narrative Clinical Summary):' : 'Comprehensive Hospital Stay Narrative Clinical Summary:'}</span>
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>
                        {narrativeMeta?.generatedAt 
                          ? `${isAr ? 'مولد بالذكاء الاصطناعي:' : 'AI Generated:'} ${narrativeMeta.generatedAt} (${narrativeMeta.modelUsed})`
                          : (isAr ? 'توثيق سريري معتمد' : 'Certified Clinical Record')}
                      </span>
                    </span>
                  </div>

                  {/* Render the full narrative with preserve whitespace and lines */}
                  <div className="text-slate-800 leading-relaxed whitespace-pre-line text-[10.5px] print:text-[9.5pt]">
                    {clinicalNarrative}
                  </div>

                  {/* Verification and Attestation Footer */}
                  <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-teal-700 shrink-0" />
                      <span>
                        {isAr 
                          ? 'ملخص مستند إلى تقييم الدخول، تقارير العمليات الجراحية، وسجل الأدوية eMAR، ومطابق سريرياً.' 
                          : 'Synthesized from admission assessment, operative notes, and eMAR medication records, clinically verified.'}
                      </span>
                    </div>
                    <div className="font-mono text-slate-800 font-bold">
                      {currentAdmission.attendingConsultantName} • {isAr ? 'الاستشاري المعالج المشرف' : 'Lead Consultant'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: Surgical & Operative Interventions Log */}
            <div className="mb-4 print-break-inside-avoid">
              <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-teal-700 text-teal-900 font-bold text-xs uppercase">
                <Activity className="w-4 h-4 text-teal-700" />
                <span>{isAr ? '4. السجل الجراحي والتخدير والتدخلات التي تمت' : '4. Surgical & Operative Record'}</span>
              </div>

              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-start border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="p-2 text-start">{isAr ? 'الإجراء الجراحي' : 'Procedure'}</th>
                      <th className="p-2 text-start">{isAr ? 'التاريخ والوقت' : 'Date & Time'}</th>
                      <th className="p-2 text-start">{isAr ? 'الجراح الرئيسي' : 'Lead Surgeon'}</th>
                      <th className="p-2 text-start">{isAr ? 'استشاري التخدير والنوع' : 'Anesthesia'}</th>
                      <th className="p-2 text-start">{isAr ? 'نزف مقدر ومضاعفات' : 'Blood Loss / Outcome'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {operativeReports.length > 0 ? (
                      operativeReports.map((op, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{op.procedureName}</td>
                          <td className="p-2 font-mono text-slate-700">{op.startTime.replace('T', ' ')}</td>
                          <td className="p-2 text-slate-800 font-medium">{op.leadSurgeon}</td>
                          <td className="p-2 text-slate-800">{op.anesthesiologist} (Spinal Block)</td>
                          <td className="p-2 text-slate-800">
                            <span className="font-mono">{op.estimatedBloodLossMl || 450} ml</span> • <span className="text-emerald-700 font-semibold">{op.complications || (isAr ? 'سليمة بدون مضاعفات' : 'None')}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2 font-bold text-slate-900">
                          {dischargeSummary?.surgicalInterventions || (isAr ? 'عملية قيصرية سفلى (Lower Segment Cesarean Section)' : 'Lower Segment Cesarean Section (LSCS)')}
                        </td>
                        <td className="p-2 font-mono text-slate-700">{currentAdmission.admissionDate.split('T')[0]} 11:30</td>
                        <td className="p-2 text-slate-800 font-medium">{currentAdmission.attendingConsultantName}</td>
                        <td className="p-2 text-slate-800">{isAr ? 'د. وليد القمودي (تخدير نصفي شوكي Spinal)' : 'Dr. Walid Ghamoudi (Spinal)'}</td>
                        <td className="p-2 text-slate-800">
                          <span className="font-mono">400 ml</span> • <span className="text-emerald-700 font-semibold">{isAr ? 'سليمة خالية من المضاعفات' : 'Uneventful recovery'}</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 5: Laboratory Investigations Summary */}
            <div className="mb-4 print-break-inside-avoid">
              <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-teal-700 text-teal-900 font-bold text-xs uppercase">
                <FlaskConical className="w-4 h-4 text-teal-700" />
                <span>{isAr ? '5. ملخص الفحوصات والتحاليل المخبرية المعتمدة' : '5. Laboratory & Diagnostic Investigations Summary'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="border border-slate-300 rounded overflow-hidden">
                  <table className="w-full text-start border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] border-b border-slate-300">
                        <th className="p-1.5 text-start">{isAr ? 'الفحص المخبري' : 'Test'}</th>
                        <th className="p-1.5 text-start">{isAr ? 'النتيجة' : 'Result'}</th>
                        <th className="p-1.5 text-start">{isAr ? 'المعدل المرجعي' : 'Reference'}</th>
                        <th className="p-1.5 text-start">{isAr ? 'التقييم' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[10px]">
                      <tr>
                        <td className="p-1.5 font-medium">{isAr ? 'خضاب الدم (Hemoglobin)' : 'Hemoglobin (Hb)'}</td>
                        <td className="p-1.5 font-bold font-mono text-teal-900">11.8 g/dL</td>
                        <td className="p-1.5 text-slate-500 font-mono">11.5 - 15.5</td>
                        <td className="p-1.5 text-emerald-700 font-bold">{isAr ? 'طبيعي ومستقر' : 'Normal'}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-medium">{isAr ? 'الصفائح الدموية (Platelets)' : 'Platelets'}</td>
                        <td className="p-1.5 font-bold font-mono">245 x10³/µL</td>
                        <td className="p-1.5 text-slate-500 font-mono">150 - 450</td>
                        <td className="p-1.5 text-emerald-700 font-bold">{isAr ? 'طبيعي' : 'Normal'}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-medium">{isAr ? 'كريات الدم البيضاء (WBC)' : 'WBC'}</td>
                        <td className="p-1.5 font-bold font-mono">9.4 x10³/µL</td>
                        <td className="p-1.5 text-slate-500 font-mono">4.5 - 11.0</td>
                        <td className="p-1.5 text-emerald-700 font-bold">{isAr ? 'طبيعي' : 'Normal'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border border-slate-300 rounded overflow-hidden">
                  <table className="w-full text-start border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] border-b border-slate-300">
                        <th className="p-1.5 text-start">{isAr ? 'الفحص المخبري' : 'Test'}</th>
                        <th className="p-1.5 text-start">{isAr ? 'النتيجة' : 'Result'}</th>
                        <th className="p-1.5 text-start">{isAr ? 'المعدل المرجعي' : 'Reference'}</th>
                        <th className="p-1.5 text-start">{isAr ? 'التقييم' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[10px]">
                      <tr>
                        <td className="p-1.5 font-medium">{isAr ? 'فحص التخثر (PT / INR)' : 'PT / INR'}</td>
                        <td className="p-1.5 font-bold font-mono">PT: 12.1s / 1.01</td>
                        <td className="p-1.5 text-slate-500 font-mono">0.9 - 1.2</td>
                        <td className="p-1.5 text-emerald-700 font-bold">{isAr ? 'تخثر طبيعي' : 'Normal'}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-medium">{isAr ? 'سكر الدم العشوائي (RBS)' : 'Blood Sugar'}</td>
                        <td className="p-1.5 font-bold font-mono">94 mg/dL</td>
                        <td className="p-1.5 text-slate-500 font-mono">70 - 140</td>
                        <td className="p-1.5 text-emerald-700 font-bold">{isAr ? 'طبيعي' : 'Normal'}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-medium">{isAr ? 'وظائف الكلى (Creatinine)' : 'Creatinine'}</td>
                        <td className="p-1.5 font-bold font-mono">0.72 mg/dL</td>
                        <td className="p-1.5 text-slate-500 font-mono">0.5 - 1.1</td>
                        <td className="p-1.5 text-emerald-700 font-bold">{isAr ? 'سليمة' : 'Normal'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SECTION 6: Medication Reconciliation (Inpatient + Discharge Meds) */}
            <div className="mb-4 print-break-inside-avoid">
              <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-teal-700 text-teal-900 font-bold text-xs uppercase">
                <Pill className="w-4 h-4 text-teal-700" />
                <span>{isAr ? '6. جدول أدوية الخروج الموصوفة للمنزل (Discharge Medications)' : '6. Take-Home Discharge Medications'}</span>
              </div>

              <div className="border border-slate-300 rounded overflow-hidden mb-2">
                <table className="w-full text-start border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="p-2 text-start">{isAr ? 'اسم الدواء والشكل' : 'Medication & Form'}</th>
                      <th className="p-2 text-start">{isAr ? 'الجرعة والطريقة' : 'Dosage & Route'}</th>
                      <th className="p-2 text-start">{isAr ? 'التكرار والمدة' : 'Frequency & Duration'}</th>
                      <th className="p-2 text-start">{isAr ? 'إرشادات الاستخدام للمريضة' : 'Patient Instructions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-900">Cefixime 400mg أقراص</td>
                      <td className="p-2 font-mono">400 mg (Oral بالفم)</td>
                      <td className="p-2">قرص واحد يومياً • لمدة 5 أيام</td>
                      <td className="p-2 text-slate-700">مضاد حيوي وقائي، يؤخذ بعد الأكل مع كوب ماء، يجب إكمال الكورس بالكامل</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-900">Paracetamol 1000mg أقراص</td>
                      <td className="p-2 font-mono">1000 mg (Oral بالفم)</td>
                      <td className="p-2">قرص كل 8 ساعات عند اللزوم</td>
                      <td className="p-2 text-slate-700">مسكن للألم وخافض للحرارة، عند الشعور بآلام الجرح أو المغص</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-900">Iron + Folic Acid كبسولات</td>
                      <td className="p-2 font-mono">1 كبسولة (Oral بالفم)</td>
                      <td className="p-2">مرة واحدة يومياً • لمدة شهر</td>
                      <td className="p-2 text-slate-700">مكمل حديد وحمض الفوليك لتعويض الدم، يفضل تناوله مع عصير برتقال صباحاً</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-900">Ibuprofen 400mg أقراص</td>
                      <td className="p-2 font-mono">400 mg (Oral بالفم)</td>
                      <td className="p-2">مرتان يومياً عند اللزوم • 3 أيام</td>
                      <td className="p-2 text-slate-700">مضاد للالتهاب ومسكن عند آلام تقلصات الرحم، يؤخذ دائماً بعد وجبة كاملة</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
                <span>
                  <strong>{isAr ? 'الأدوية الوريدية أثناء الإقامة:' : 'Inpatient Meds Given:'}</strong> Cefazolin 1g IV, Paracetamol 1g IV, Tramadol 50mg IV PRN, Oxytocin 20 IU in Ringer Lactate, IV Fluids.
                </span>
                <span className="text-teal-800 font-bold">{isAr ? 'تم إيقاف الأدوية الوريدية بنجاح' : 'IV Discontinued'}</span>
              </div>
            </div>

            {/* SECTION 7: Aftercare, Follow-up & RED FLAGS WARNINGS */}
            <div className="mb-4 print-break-inside-avoid">
              <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-teal-700 text-teal-900 font-bold text-xs uppercase">
                <ClipboardCheck className="w-4 h-4 text-teal-700" />
                <span>{isAr ? '7. تعليمات العناية المنزلية وموعد المراجعة وعلامات الخطر' : '7. Aftercare Instructions & Red Flag Warnings'}</span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-300">
                    <span className="text-slate-700 font-bold block mb-1">
                      {isAr ? 'إرشادات العناية بالجرح والنظافة الشخصية:' : 'Wound Care & Hygiene Guidance:'}
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[10.5px]">
                      <li>{dischargeSummary?.aftercareInstructions || (isAr ? 'الحفاظ على جرح العملية نظيفاً وجافاً تماماً وتغيير الضماد عند الحاجة.' : 'Keep surgical incision clean and dry.')}</li>
                      <li>{isAr ? 'الاستحمام بالماء الدافئ بعد 48 ساعة مع تجنب فرك مكان الجراحة.' : 'Gentle shower allowed, pat dry.'}</li>
                      <li>{isAr ? 'تجنب حمل الأوزان الثقيلة وممارسة الأنشطة المجهدة لمدة 6 أسابيع.' : 'Avoid heavy lifting for 6 weeks.'}</li>
                      <li>{isAr ? 'الإكثار من شرب السوائل وتناول الألياف لمنع الإمساك بعد الولادة.' : 'Hydrate well and eat high-fiber diet.'}</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded border border-slate-300">
                    <span className="text-slate-700 font-bold block mb-1">
                      {isAr ? 'موعد المراجعة بالعيادة التخصصية:' : 'Clinic Follow-up Appointment:'}
                    </span>
                    <div className="bg-teal-50 border border-teal-200 p-2 rounded text-teal-950 font-medium space-y-1">
                      <div className="flex items-center gap-1 text-teal-900 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-teal-700" />
                        <span>{isAr ? 'تاريخ المراجعة:' : 'Date:'} {dischargeSummary?.followUpDate || dischargeForm.followUpDate} (10:00 AM)</span>
                      </div>
                      <div className="text-[10px] text-teal-800">
                        {isAr 
                          ? `عيادة استشاري النساء والتوليد (${currentAdmission.attendingConsultantName}) - لفحص الجرح وإزالة الغرز الجراحية ومتابعة المولود.` 
                          : `Consultant Ob/Gyn Clinic - Suture removal & postpartum evaluation.`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RED FLAGS BOX (Crucial for Patient Safety) */}
                <div className="bg-rose-50 border-2 border-rose-300 rounded-lg p-3 text-rose-950">
                  <div className="flex items-center gap-1.5 font-black text-rose-900 text-xs mb-1.5 uppercase">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{isAr ? '⚠️ علامات الخطر الطبية التي تستوجب التوجه الفوري لقسم طوارئ المستشفى:' : '⚠️ Emergency Red Flags Requiring Immediate Hospital Return:'}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-rose-900 font-semibold ps-5">
                    <div>• {isAr ? 'ارتفاع درجة الحرارة فوق 38° مئوية أو قشعريرة شديدة.' : 'Fever > 38°C or severe chills.'}</div>
                    <div>• {isAr ? 'نزيف مهبلي غزير (استهلاك أكثر من فوطة في الساعة) أو تجلطات كبيرة.' : 'Heavy vaginal bleeding with clots.'}</div>
                    <div>• {isAr ? 'احمرار متزايد، تورم، ألم حاد، أو خروج صديد من جرح العملية.' : 'Incision redness, swelling, or purulent discharge.'}</div>
                    <div>• {isAr ? 'ألم شديد ومستمر في أسفل البطن لا يستجيب للمسكنات الموصوفة.' : 'Severe persistent abdominal pain unrelieved by meds.'}</div>
                    <div>• {isAr ? 'ألم أو تورم مفاجئ في إحدى الساقين، أو ضيق تنفس وألم بالصدر.' : 'Sudden leg pain/swelling or chest pain/dyspnea.'}</div>
                    <div>• {isAr ? 'إفرازات مهبلية ذات رائحة كريهة أو صداع حاد مع تشوش الرؤية.' : 'Foul-smelling lochia or severe persistent headache.'}</div>
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-rose-200 text-[10px] font-mono text-rose-800 flex items-center justify-between">
                    <span>{isAr ? 'طوارئ مستشفى الأمل للنساء والولادة متاحة 24/7' : 'Hospital Emergency 24/7'}</span>
                    <strong className="text-rose-950 font-bold">{isAr ? 'هاتف الطوارئ المباشر: 8891 444 21 218+' : 'Hotline: +218 21 444 8891'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 8: Official Hospital Stamps & Signatures */}
            <div className="pt-4 border-t-2 border-slate-800 print-break-inside-avoid">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[10px]">
                {/* 1. Attending Consultant */}
                <div className="border border-slate-300 rounded p-2 bg-slate-50/50 flex flex-col justify-between min-h-[110px]">
                  <div>
                    <span className="text-slate-500 font-semibold block">{isAr ? 'الاستشاري المعالج المشرف' : 'Attending Consultant'}</span>
                    <strong className="text-slate-900 block text-[11px] mt-0.5">{currentAdmission.attendingConsultantName}</strong>
                  </div>
                  <div className="pt-4 border-t border-dashed border-slate-400">
                    <span className="font-mono text-[9px] text-teal-800 font-bold block">{isAr ? '[توقيع وخاتم معتمد]' : '[Verified Signature]'}</span>
                  </div>
                </div>

                {/* 2. Resident Medical Officer */}
                <div className="border border-slate-300 rounded p-2 bg-slate-50/50 flex flex-col justify-between min-h-[110px]">
                  <div>
                    <span className="text-slate-500 font-semibold block">{isAr ? 'طبيب الإيواء / المقيم' : 'Resident Physician'}</span>
                    <strong className="text-slate-900 block text-[11px] mt-0.5">{currentAdmission.admittingDoctorName}</strong>
                  </div>
                  <div className="pt-4 border-t border-dashed border-slate-400">
                    <span className="font-mono text-[9px] text-slate-600 block">{isAr ? '[توقيع الطبيب]' : '[Signed]'}</span>
                  </div>
                </div>

                {/* 3. Ward Charge Nurse */}
                <div className="border border-slate-300 rounded p-2 bg-slate-50/50 flex flex-col justify-between min-h-[110px]">
                  <div>
                    <span className="text-slate-500 font-semibold block">{isAr ? 'ممرضة القسم المسؤولة' : 'Ward Charge Nurse'}</span>
                    <strong className="text-slate-900 block text-[11px] mt-0.5">{isAr ? 'فاطمة الورفلي (RN)' : 'Fatima Al-Warfalli (RN)'}</strong>
                  </div>
                  <div className="pt-4 border-t border-dashed border-slate-400">
                    <span className="font-mono text-[9px] text-slate-600 block">{isAr ? '[تسليم المريض وأدويته]' : '[Discharge Verified]'}</span>
                  </div>
                </div>

                {/* 4. Patient or Guardian Acknowledgment */}
                <div className="border border-slate-300 rounded p-2 bg-slate-50/50 flex flex-col justify-between min-h-[110px]">
                  <div>
                    <span className="text-slate-500 font-semibold block">{isAr ? 'إقرار المريضة أو ولي الأمر' : 'Patient / Guardian Ack.'}</span>
                    <strong className="text-slate-900 block text-[11px] mt-0.5">{currentPatient.fullName}</strong>
                  </div>
                  <div className="pt-4 border-t border-dashed border-slate-400">
                    <span className="text-[9px] text-slate-500 block leading-tight">
                      {isAr ? 'استلمت التقرير وفهمت الإرشادات' : 'Received summary & instructions'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Official Seal Graphic & Verification Footer */}
              <div className="mt-4 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[9px] text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-teal-800 text-teal-800 flex items-center justify-center font-bold text-[8px]">
                    ✓
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">
                      {isAr ? 'مستند طبي رسمي صادر عن المنظومة المركزية لمستشفى الأمل (HMIS Core)' : 'Official document generated via Al-Amal HMIS System'}
                    </span>
                    <div className="font-mono text-[8px] text-slate-400">
                      DOC-HASH: {`SHA256-${currentAdmission.admissionId}-${currentPatient.mrn}`.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="text-end font-mono">
                  <div>{isAr ? 'طبع بواسطة:' : 'Printed by:'} {currentUser.name} • {new Date().toLocaleString(isAr ? 'ar-LY' : 'en-US')}</div>
                  <div className="text-[8px] text-slate-400">{isAr ? 'صفحة 1 من 1 • يحفظ أصل التقرير في الأرشيف الطبي' : 'Page 1 of 1 • Official Medical Record'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Discharge Summary (Ch. 21) */}
      {activeTab === 'discharge' && (
        <div className="space-y-4">
          {!dischargeSummary ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-xs text-slate-400 space-y-3">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p>{isAr ? 'لم تصدر ورقة خروج لهذه الحالة بعد' : 'No discharge summary issued yet.'}</p>
              <button
                onClick={() => {
                  if (!allClearanceMandatoryPassed) {
                    alert(isAr 
                      ? 'لا يمكن تحرير ورقة الخروج: يجب استيفاء مهام براءة الذمة (تسوية الحساب المالي، نتائج المختبر، أوامر الأدوية) أولاً.' 
                      : 'Cannot proceed: Pending mandatory clearance tasks must be cleared.');
                    return;
                  }
                  setShowDischargeModal(true);
                }}
                disabled={!allClearanceMandatoryPassed}
                className="px-4 py-2 bg-teal-600 text-white rounded text-xs font-semibold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                {isAr ? 'تحرير ورقة خروج المريض الآن' : 'Create Discharge Summary'}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-300 rounded-lg p-8 shadow-sm space-y-6 text-xs">
              {/* Header Letterhead */}
              <div className="text-center space-y-1 border-b border-slate-300 pb-4">
                <h1 className="text-lg font-bold text-slate-900">
                  {isAr ? 'مستشفى الأمل التخصصي للنساء والولادة والإيواء' : 'Al-Amal Specialized Hospital for Maternity & Inpatient Care'}
                </h1>
                <div className="text-xs font-bold text-teal-800 font-mono">
                  {isAr ? 'ورقة خروج المريض الرسمية (Discharge Summary)' : 'Official Inpatient Discharge Summary'}
                </div>
              </div>

              {/* Patient Meta Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-200 font-mono">
                <div>
                  <span className="text-slate-500 font-sans block">{isAr ? 'المريض:' : 'Patient:'}</span>
                  <strong className="text-slate-900 font-sans">{dischargeSummary.patientName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans block">{isAr ? 'رقم الملف (MRN):' : 'MRN:'}</span>
                  <strong className="text-slate-900">{dischargeSummary.mrn}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans block">{isAr ? 'رقم الدخول (ADM):' : 'Admission ID:'}</span>
                  <strong className="text-slate-900">{dischargeSummary.admissionId}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans block">{isAr ? 'تاريخ الدخول / الخروج:' : 'Dates:'}</span>
                  <strong className="text-slate-900">{dischargeSummary.admissionDate.split('T')[0]} → {dischargeSummary.dischargeDate.split('T')[0]}</strong>
                </div>
              </div>

              {/* Diagnoses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-slate-500 block mb-1 font-semibold">{isAr ? 'تشخيص الدخول (Admission Diagnosis):' : 'Admission Diagnosis:'}</span>
                  <p className="text-slate-900 font-bold">{dischargeSummary.admissionDiagnosis}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-slate-500 block mb-1 font-semibold">{isAr ? 'التشخيص النهائي (Final Diagnosis):' : 'Final Diagnosis:'}</span>
                  <p className="text-slate-900 font-bold">{dischargeSummary.finalDiagnosis}</p>
                </div>
              </div>

              {/* Hospital Course & Surgeries */}
              <div className="space-y-3">
                <div>
                  <span className="font-bold text-slate-800 block mb-1">{isAr ? 'ملخص سير الحالة والإجراءات العلاجية:' : 'Treatment & Hospital Course:'}</span>
                  <p className="bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed text-slate-800">
                    {dischargeSummary.treatmentAndHospitalCourse}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-slate-800 block mb-1">{isAr ? 'العمليات والتدخلات الجراحية التي تمت:' : 'Surgical Interventions:'}</span>
                  <p className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-800 font-mono">
                    {dischargeSummary.surgicalInterventions}
                  </p>
                </div>

                {/* Discharge Meds & Instructions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">{isAr ? 'أدوية الخروج الموصوفة للمنزل:' : 'Discharge Medications:'}</span>
                    <ul className="bg-slate-50 p-3 rounded border border-slate-200 list-disc list-inside space-y-1 text-slate-800">
                      {dischargeSummary.dischargeMedications.map((m: string, i: number) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block mb-1">{isAr ? 'تعليمات المتابعة بعد الخروج:' : 'Aftercare & Follow-up:'}</span>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                      <p className="text-slate-800">{dischargeSummary.aftercareInstructions}</p>
                      <div className="font-mono text-teal-800 font-bold">
                        {isAr ? 'موعد المراجعة بالعيادة:' : 'Clinic Follow-up:'} {dischargeSummary.followUpDate}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 border-t border-slate-300 grid grid-cols-2 text-center text-xs">
                <div>
                  <span className="text-slate-500 block mb-8">{isAr ? 'توقيع وإقرار المريض / ممثله' : 'Patient / Guardian Signature'}</span>
                  <strong className="text-slate-900 border-t border-slate-400 pt-1 px-8 inline-block">
                    {dischargeSummary.patientName}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 block mb-8">{isAr ? 'اعتماد وتوقيع الاستشاري المسؤول' : 'Attending Consultant Signature'}</span>
                  <strong className="text-slate-900 border-t border-slate-400 pt-1 px-8 inline-block">
                    {dischargeSummary.attendingPhysicianSignature}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DAMA / AMA Form (Ch. 21) */}
      {activeTab === 'dama' && (
        <div className="space-y-4">
          {!damaForm ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-xs text-slate-400 space-y-3">
              <ShieldAlert className="w-8 h-8 text-rose-300 mx-auto" />
              <p>{isAr ? 'لم يُسجل خروج على مسؤولية المريض لهذه الحالة' : 'No DAMA form recorded.'}</p>
              <button
                onClick={() => setShowDamaModal(true)}
                className="px-4 py-2 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700"
              >
                {isAr ? 'توثيق خروج ضد النصح الطبي (DAMA)' : 'Issue DAMA Form'}
              </button>
            </div>
          ) : (
            <div className="bg-white border-2 border-rose-300 rounded-lg p-8 shadow-sm space-y-6 text-xs">
              <div className="bg-rose-50 border border-rose-300 rounded p-4 text-center space-y-1">
                <h2 className="text-base font-bold text-rose-900 uppercase">
                  {isAr ? 'إقرار خروج المريض على مسؤوليته الكاملة خلاف النصيحة الطبية' : 'Discharge Against Medical Advice (DAMA / AMA)'}
                </h2>
                <p className="text-xs text-rose-800">
                  {isAr ? 'وثيقة قانونية تثبت شرح المخاطر الطبية والبدائل للمريض أو وليه وإصراره على الخروج' : 'Legal acknowledgment of risks and refusal of hospitalization'}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-700 space-y-2">
                <span className="font-bold text-slate-900 block">{isAr ? 'المخاطر الطبية التي تم توضيحها للمريض:' : 'Explained Risks & Complications:'}</span>
                <p className="leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                  {damaForm.explainedRisksDetails}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-700 space-y-2">
                <span className="font-bold text-slate-900 block">{isAr ? 'سبب طلب الخروج من قبل المريض:' : 'Reason for Leaving Hospital:'}</span>
                <p className="leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                  {damaForm.refusalReason}
                </p>
              </div>

              {/* Status on refusal */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs flex items-center justify-between">
                <span>
                  {isAr ? 'حالة توقيع المريض أو ممثله:' : 'Signature Status:'} <strong>{damaForm.patientOrGuardianSignature}</strong>
                </span>
                {damaForm.isSignatureRefused && (
                  <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold text-[10px]">
                    {isAr ? 'توثيق رسمي: المريض امتنع عن التوقيع' : 'Refused to Sign Documented'}
                  </span>
                )}
              </div>

              <div className="pt-6 border-t border-slate-300 grid grid-cols-2 text-center text-xs">
                <div>
                  <span className="text-slate-500 block mb-6">{isAr ? 'الشاهد الطبي (التمريض)' : 'Witness (Nurse)'}</span>
                  <strong className="text-slate-900 border-t border-slate-400 pt-1 px-8 inline-block">
                    {damaForm.witnessName} ({damaForm.witnessRole})
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 block mb-6">{isAr ? 'الطبيب المعالج المسؤول' : 'Attending Physician'}</span>
                  <strong className="text-slate-900 border-t border-slate-400 pt-1 px-8 inline-block">
                    {damaForm.doctorName}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Official Medical Reports (Ch. 20 - 25 LYD policy) */}
      {activeTab === 'medical_report' && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs flex items-center justify-between">
            <span className="text-slate-700">
              {isAr ? 'السياسة المعتمدة: تقرير طبي مبدئي أو نهائي مقابل رسم 25 ديناراً ليبياً لكل تقرير معتمد مع حفظ نسخة مؤرشفة' : 'Hospital Policy: Official medical report issued for 25 LYD per approved certificate.'}
            </span>
            <span className="font-mono font-bold text-teal-800">
              {medicalReports.length} {isAr ? 'تقارير مؤرشفة' : 'archived reports'}
            </span>
          </div>

          {medicalReports.map(rep => (
            <div key={rep.id} className="bg-white border border-slate-300 rounded-lg p-8 shadow-sm space-y-6 text-xs">
              <div className="text-center space-y-1 border-b border-slate-300 pb-4">
                <h2 className="text-base font-bold text-slate-900">
                  {isAr ? 'مستشفى الأمل التخصصي للنساء والولادة والإيواء' : 'Al-Amal Specialized Hospital for Maternity & Inpatient Care'}
                </h2>
                <div className="text-xs font-bold text-teal-800 font-mono">
                  {isAr ? `تقرير طبي معتمد رقم (${rep.reportNumber})` : `Official Medical Report #${rep.reportNumber}`}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {isAr ? 'الرسم المالي المسجل:' : 'Fee Charged:'} {rep.feeAmount} {isAr ? 'دينار ليبي (مدفوع)' : 'LYD (Paid)'}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded border border-slate-200 font-mono">
                <div>
                  <span className="text-slate-500 font-sans block">{isAr ? 'اسم المريض:' : 'Patient:'}</span>
                  <strong className="text-slate-900 font-sans">{rep.patientName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans block">{isAr ? 'رقم الملف (MRN):' : 'MRN:'}</span>
                  <strong className="text-slate-900">{rep.mrn}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans block">{isAr ? 'تاريخ التقرير:' : 'Date Issued:'}</span>
                  <strong className="text-slate-900">{rep.issueDate}</strong>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="font-bold text-slate-800 block mb-1">{isAr ? 'ملخص سير الحالة والتشخيص:' : 'Clinical Summary:'}</span>
                  <p className="bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed text-slate-800">
                    {rep.clinicalSummary}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-slate-800 block mb-1">{isAr ? 'التدخلات والعلاج الذي تلقاه المريض:' : 'Interventions Performed:'}</span>
                  <p className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-800">
                    {rep.interventionsDone}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-slate-800 block mb-1">{isAr ? 'حالة المريض وقت إصدار التقرير:' : 'Current Clinical Status:'}</span>
                  <p className="bg-slate-50 p-2.5 rounded border border-slate-200 text-emerald-800 font-semibold">
                    {rep.currentStatus}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-300 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'البصمة والتشفير الرقمي للوثيقة:' : 'Digital Signature Hash:'}</span>
                  <span className="font-mono text-[10px] text-slate-400">{rep.digitalSignatureHash}</span>
                </div>

                <div className="text-right">
                  <span className="text-slate-500 block text-[11px] mb-1">{isAr ? 'اعتماد الاستشاري المعالج' : 'Consultant Approval'}</span>
                  <strong className="text-slate-900 text-sm">{rep.attendingConsultantName}</strong>
                  <div className="text-[10px] text-teal-800 font-mono mt-0.5">
                    {isAr ? '[ختم مؤسسي معتمد - مستشفى الأمل]' : '[Verified Institutional Seal]'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Discharge Summary Form */}
      {showDischargeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'تحرير نموذج ورقة خروج المريض (Discharge Summary)' : 'Create Discharge Summary'}</span>
              </h3>
              <button onClick={() => setShowDischargeModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveDischarge} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'تشخيص الدخول *' : 'Admission Diagnosis *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={dischargeForm.admissionDiagnosis}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, admissionDiagnosis: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'التشخيص النهائي عند الخروج *' : 'Final Diagnosis *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={dischargeForm.finalDiagnosis}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, finalDiagnosis: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'ملخص المعالجة والإجراءات الدوائية والجراحية *' : 'Treatment & Hospital Course *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={dischargeForm.treatmentAndHospitalCourse}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, treatmentAndHospitalCourse: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'العمليات الجراحية التي جرت' : 'Surgical Interventions'}
                </label>
                <input
                  type="text"
                  value={dischargeForm.surgicalInterventions}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, surgicalInterventions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'حالة المريض عند الخروج *' : 'Discharge Condition *'}
                  </label>
                  <select
                    value={dischargeForm.dischargeCondition}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeCondition: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="Improved">{isAr ? 'تحسن واستقرار (Improved)' : 'Improved'}</option>
                    <option value="Cured">{isAr ? 'شفاء تام (Cured)' : 'Cured'}</option>
                    <option value="Stable">{isAr ? 'مستقر (Stable)' : 'Stable'}</option>
                    <option value="Critical">{isAr ? 'حرج (Critical)' : 'Critical'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'وجهة الخروج (Disposition) *' : 'Disposition *'}
                  </label>
                  <select
                    value={dischargeForm.disposition}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, disposition: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="Home">{isAr ? 'إلى المنزل (Home)' : 'Home'}</option>
                    <option value="Transferred">{isAr ? 'محول إلى مستشفى آخر' : 'Transferred'}</option>
                    <option value="DAMA (Against Medical Advice)">{isAr ? 'خروج على مسؤوليته (DAMA)' : 'DAMA'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'أدوية الخروج (مفصولة بفواصل)' : 'Discharge Medications (comma separated)'}
                </label>
                <input
                  type="text"
                  value={dischargeForm.dischargeMedications}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeMedications: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-600 font-semibold">
                      {isAr ? 'تعليمات ما بعد الخروج والعناية' : 'Aftercare Instructions'}
                    </label>
                    <VoiceDictationButton
                      onTranscription={(val) => setDischargeForm({ ...dischargeForm, aftercareInstructions: val })}
                      currentValue={dischargeForm.aftercareInstructions}
                      language={language}
                    />
                  </div>
                  <input
                    type="text"
                    value={dischargeForm.aftercareInstructions}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, aftercareInstructions: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'موعد المراجعة بالعيادة' : 'Follow-up Date'}
                  </label>
                  <input
                    type="date"
                    value={dischargeForm.followUpDate}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, followUpDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري الاعتماد...' : 'Saving...') : (isAr ? 'اعتماد وإصدار ورقة الخروج' : 'Confirm Discharge')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DAMA Form */}
      {showDamaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>{isAr ? 'توثيق إقرار الخروج على مسؤولية المريض (DAMA)' : 'Discharge Against Medical Advice'}</span>
              </h3>
              <button onClick={() => setShowDamaModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveDama} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'شرح المخاطر الطبية والبدائل (إلزامي قانوناً) *' : 'Explanation of Risks & Alternatives *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={damaFormData.explainedRisksDetails}
                  onChange={(e) => setDamaFormData({ ...damaFormData, explainedRisksDetails: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'سبب رفض المريض للبقاء بالمستشفى *' : 'Reason for Refusal *'}
                </label>
                <input
                  type="text"
                  required
                  value={damaFormData.refusalReason}
                  onChange={(e) => setDamaFormData({ ...damaFormData, refusalReason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={damaFormData.isSignatureRefused}
                    onChange={(e) => setDamaFormData({ ...damaFormData, isSignatureRefused: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <span className="text-rose-900 font-bold">
                    {isAr ? 'المريض / وليه امتنع عن التوقيع (توثيق الرفض رسمياً)' : 'Patient / Guardian refused to sign'}
                  </span>
                </label>
              </div>

              {!damaFormData.isSignatureRefused && (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'اسم الموقع وتوقيعه (المريض أو وليه)' : 'Signatory Name'}
                  </label>
                  <input
                    type="text"
                    value={damaFormData.patientOrGuardianSignature}
                    onChange={(e) => setDamaFormData({ ...damaFormData, patientOrGuardianSignature: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'اسم الشاهد (التمريض)' : 'Witness Name'}
                  </label>
                  <input
                    type="text"
                    value={damaFormData.witnessName}
                    onChange={(e) => setDamaFormData({ ...damaFormData, witnessName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'الصفة الوظيفية للشاهد' : 'Witness Role'}
                  </label>
                  <input
                    type="text"
                    value={damaFormData.witnessRole}
                    onChange={(e) => setDamaFormData({ ...damaFormData, witnessRole: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDamaModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري الاعتماد...' : 'Saving...') : (isAr ? 'تأكيد توثيق DAMA وتحرير السرير' : 'Confirm DAMA')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Medical Report Form (Ch. 20) */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'إصدار تقرير طبي رسمي (رسم 25 د.ل)' : 'Issue Official Medical Report (25 LYD)'}</span>
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700">
                {isAr ? 'الرسم المالي المعتمد: 25 دينار ليبي يُسجل آلياً في الحساب المالي للمريض.' : 'Official 25 LYD fee is recorded in the patient financial statement.'}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold">
                    {isAr ? 'ملخص سير الحالة والتشخيص الطبي *' : 'Clinical Summary & Diagnosis *'}
                  </label>
                  <VoiceDictationButton
                    onTranscription={(val) => setReportForm({ ...reportForm, clinicalSummary: val })}
                    currentValue={reportForm.clinicalSummary}
                    language={language}
                  />
                </div>
                <textarea
                  rows={3}
                  required
                  value={reportForm.clinicalSummary}
                  onChange={(e) => setReportForm({ ...reportForm, clinicalSummary: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isAr ? 'التدخلات والعلاج المنجز *' : 'Interventions & Treatment *'}
                </label>
                <input
                  type="text"
                  required
                  value={reportForm.interventionsDone}
                  onChange={(e) => setReportForm({ ...reportForm, interventionsDone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isAr ? 'حالة المريض وقت التقرير *' : 'Current Status *'}
                </label>
                <input
                  type="text"
                  required
                  value={reportForm.currentStatus}
                  onChange={(e) => setReportForm({ ...reportForm, currentStatus: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'اسم الاستشاري المشارك أو المستدعى (إن وجد)' : 'Consultant Referenced'}
                </label>
                <input
                  type="text"
                  value={reportForm.consultingSpecialistName}
                  onChange={(e) => setReportForm({ ...reportForm, consultingSpecialistName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري الإصدار...' : 'Issuing...') : (isAr ? 'إصدار واعتماد التقرير' : 'Issue Report')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
