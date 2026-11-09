import React, { useState, useRef, useEffect } from 'react';
import { 
  FileSignature, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  ShieldCheck, 
  UserCheck, 
  PenTool, 
  RotateCcw, 
  Building2, 
  Calendar, 
  Heart,
  Droplet,
  Baby,
  Stethoscope,
  Scissors,
  Check,
  AlertCircle
} from 'lucide-react';
import { Patient, Admission, SystemUser, Language, ConsentForm, ConsentType } from '../types/hmis.ts';
import { api } from '../api/client.ts';

interface ConsentFormModalProps {
  currentPatient: Patient;
  currentAdmission: Admission;
  currentUser: SystemUser;
  language: Language;
  initialType?: ConsentType;
  existingConsent?: ConsentForm | null;
  onClose: () => void;
  onSaved: () => void;
}

interface TemplatePreset {
  type: ConsentType;
  titleAr: string;
  titleEn: string;
  defaultProcedure: string;
  defaultIndication: string;
  risks: string[];
  alternatives: string;
  emergencyDefault: boolean;
  bloodDefault: boolean;
}

const TEMPLATES: Record<ConsentType, TemplatePreset> = {
  surgical_operative: {
    type: 'surgical_operative',
    titleAr: 'إقرار وموافقة مستنيرة لإجراء تدخل جراحي / ولادة قيصرية',
    titleEn: 'Informed Consent for Surgical & Operative Intervention',
    defaultProcedure: 'Lower Segment Cesarean Section (LSCS) with Exploration & Peritoneal Closure',
    defaultIndication: 'Obstetric indication: Failed progression / fetal distress / previous uterine scar',
    risks: [
      'Intraoperative or postoperative hemorrhage potentially requiring blood transfusion',
      'Surgical site infection, wound breakdown, or deep pelvic collection',
      'Visceral accidental injury (urinary bladder, ureters, or bowel)',
      'Adhesion formation, scar dehiscence, or chronic pelvic pain',
      'Venous thromboembolism (DVT / PE) requiring thromboprophylaxis',
      'In rare emergency situations of uncontrolled hemorrhage, emergency hysterectomy to save life'
    ],
    alternatives: 'Conservative monitoring / vaginal trial of labor, explained with its associated fetal/maternal risks.',
    emergencyDefault: true,
    bloodDefault: true
  },
  anesthesia_epidural: {
    type: 'anesthesia_epidural',
    titleAr: 'إقرار وموافقة مستنيرة للتخدير وتسكين آلام الولادة (إيبيدورال/شوكي)',
    titleEn: 'Informed Consent for Anesthesia & Labor Analgesia (Spinal / Epidural)',
    defaultProcedure: 'Subarachnoid Regional Spinal Block / Continuous Lumbar Epidural Analgesia',
    defaultIndication: 'Pain management during labor or surgical regional anesthesia for operative delivery',
    risks: [
      'Transient maternal arterial hypotension responsive to fluid and vasopressors',
      'Post-dural puncture headache (PDPH) requiring conservative care or blood patch',
      'Incomplete or patchy sensory block requiring supplemental analgesia or conversion to general anesthesia',
      'Localized puncture site soreness, back discomfort, or transient paresthesia',
      'Rare adverse drug reaction or shivering'
    ],
    alternatives: 'Systemic intravenous analgesia, Entonox inhalation, or general endotracheal anesthesia.',
    emergencyDefault: true,
    bloodDefault: false
  },
  general_admission: {
    type: 'general_admission',
    titleAr: 'إقرار الدخول العام وتلقي الفحوصات والعلاج الطبي الإيوائي',
    titleEn: 'General Inpatient Admission & Medical Treatment Consent',
    defaultProcedure: 'Inpatient Medical Care, Clinical Assessments, Phlebotomy, Diagnostic Labs & Nursing Protocols',
    defaultIndication: 'Specialized inpatient obstetric & gynecological monitoring and medical stabilization',
    risks: [
      'Adverse drug reactions or side effects to prescribed inpatient medications',
      'Mild bruising or discomfort at phlebotomy or IV cannula insertion sites',
      'Need for unexpected urgent clinical escalation or surgical consultation if status changes'
    ],
    alternatives: 'Outpatient clinic follow-up, with explanation of hazards of unmonitored complications.',
    emergencyDefault: true,
    bloodDefault: false
  },
  blood_transfusion: {
    type: 'blood_transfusion',
    titleAr: 'إقرار وموافقة مستنيرة لنقل الدم ومشتقاته',
    titleEn: 'Informed Consent for Blood & Blood Products Transfusion',
    defaultProcedure: 'Transfusion of Packed Red Blood Cells (PRBCs), Fresh Frozen Plasma (FFP), or Platelets',
    defaultIndication: 'Acute blood loss, severe obstetric hemorrhage, or marked symptomatic anemia (Hb < 8 g/dL)',
    risks: [
      'Febrile non-hemolytic transfusion reactions (fever, chills, flushing)',
      'Allergic urticarial skin reactions (rash, itching)',
      'Circulatory volume overload (TACO) in predisposed patients',
      'Extremely low residual risk of viral or bacterial transmission through screened screened blood components',
      'Delayed hemolytic transfusion reaction'
    ],
    alternatives: 'Intravenous iron therapy, erythropoietin, or volume expanders (suitable only in non-critical scenarios).',
    emergencyDefault: true,
    bloodDefault: true
  },
  high_risk_obstetric: {
    type: 'high_risk_obstetric',
    titleAr: 'إقرار متابعة الولادة عالية الخطورة ودخول العناية المركزة لحديثي الولادة (الحضانة)',
    titleEn: 'Informed Consent for High-Risk Delivery & Neonatal Intensive Care Unit (NICU)',
    defaultProcedure: 'High-Risk Maternal-Fetal Intrapartum Monitoring & Pre-arranged NICU Resuscitation Team',
    defaultIndication: 'Preterm labor, severe preeclampsia, gestational diabetes, multiple gestation, or IUGR',
    risks: [
      'Need for immediate neonatal resuscitation, intubation, or surfactant therapy upon delivery',
      'Prolonged neonatal incubator stay with ventilatory or nutritional support',
      'Unplanned emergency operative maternal delivery if non-reassuring fetal status emerges'
    ],
    alternatives: 'Immediate tertiary care perinatal transfer if stabilized and feasible.',
    emergencyDefault: true,
    bloodDefault: true
  },
  dama_refusal: {
    type: 'dama_refusal',
    titleAr: 'إقرار رفض العلاج الطبي أو الخروج على المسؤولية الشخصية (DAMA / Refusal)',
    titleEn: 'Refusal of Recommended Medical Intervention or Discharge Against Medical Advice (DAMA)',
    defaultProcedure: 'Refusal of recommended surgical intervention, medical therapy, or early self-discharge',
    defaultIndication: 'Patient / guardian election to decline inpatient medical recommendations',
    risks: [
      'Severe irreversible clinical deterioration, organ damage, or life-threatening compromise',
      'Permanent fetal injury, distress, or demise in obstetric cases',
      'Loss of immediate emergency resuscitation window outside hospital premises'
    ],
    alternatives: 'Adherence to full recommended hospital clinical care protocol.',
    emergencyDefault: false,
    bloodDefault: false
  }
};

export const ConsentFormModal: React.FC<ConsentFormModalProps> = ({
  currentPatient,
  currentAdmission,
  currentUser,
  language,
  initialType = 'surgical_operative',
  existingConsent = null,
  onClose,
  onSaved
}) => {
  const isAr = language === 'ar';

  const [selectedType, setSelectedType] = useState<ConsentType>(
    existingConsent ? existingConsent.type : initialType
  );

  const activePreset = TEMPLATES[selectedType];

  // Form states
  const [procedureName, setProcedureName] = useState(
    existingConsent ? existingConsent.procedureName : activePreset.defaultProcedure
  );
  const [clinicalIndication, setClinicalIndication] = useState(
    existingConsent ? existingConsent.clinicalIndication : activePreset.defaultIndication
  );
  const [risksList, setRisksList] = useState<string[]>(
    existingConsent ? existingConsent.risksExplained : activePreset.risks
  );
  const [newRiskInput, setNewRiskInput] = useState('');
  const [alternativesExplained, setAlternativesExplained] = useState(
    existingConsent ? (existingConsent.alternativesExplained || '') : activePreset.alternatives
  );
  const [emergencyAuthorized, setEmergencyAuthorized] = useState(
    existingConsent ? existingConsent.emergencyConversionAuthorized : activePreset.emergencyDefault
  );
  const [bloodPermitted, setBloodPermitted] = useState(
    existingConsent ? (existingConsent.bloodTransfusionPermitted ?? activePreset.bloodDefault) : activePreset.bloodDefault
  );

  // Signer details
  const [signerType, setSignerType] = useState<'patient' | 'spouse' | 'guardian' | 'relative'>(
    existingConsent ? existingConsent.signerType : 'patient'
  );
  const [signerName, setSignerName] = useState(
    existingConsent ? existingConsent.signerName : currentPatient.fullName
  );
  const [signerNationalId, setSignerNationalId] = useState(
    existingConsent ? existingConsent.signerNationalId : currentPatient.nationalId
  );
  const [signerRelationship, setSignerRelationship] = useState(
    existingConsent ? existingConsent.signerRelationship : (isAr ? 'المريضة نفسها' : 'Self (Patient)')
  );
  const [signerPhone, setSignerPhone] = useState(
    existingConsent ? (existingConsent.signerPhone || '') : currentPatient.phone
  );

  // Physician & Witness
  const [physicianName, setPhysicianName] = useState(
    existingConsent ? existingConsent.physicianName : (currentUser.role.includes('doctor') || currentUser.role.includes('consultant') || currentUser.role.includes('surgeon') ? currentUser.name : currentAdmission.attendingConsultantName)
  );
  const [physicianLicense, setPhysicianLicense] = useState(
    existingConsent ? existingConsent.physicianLicense : 'LY-MED-2016-8840'
  );
  const [witnessName, setWitnessName] = useState(
    existingConsent ? existingConsent.witnessName : (currentUser.name || 'ممرضة القسم المناوبة')
  );
  const [witnessRole, setWitnessRole] = useState(
    existingConsent ? existingConsent.witnessRole : (currentUser.title || 'Staff Nurse')
  );
  const [notes, setNotes] = useState(existingConsent ? (existingConsent.notes || '') : '');

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(
    Boolean(existingConsent?.signerSignature && existingConsent.signerSignature.startsWith('data:image'))
  );
  const [useTypedSignature, setUseTypedSignature] = useState(
    Boolean(existingConsent && !existingConsent.signerSignature.startsWith('data:image'))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // When switching preset template
  const handleSelectTemplate = (type: ConsentType) => {
    setSelectedType(type);
    const tmpl = TEMPLATES[type];
    setProcedureName(tmpl.defaultProcedure);
    setClinicalIndication(tmpl.defaultIndication);
    setRisksList(tmpl.risks);
    setAlternativesExplained(tmpl.alternatives);
    setEmergencyAuthorized(tmpl.emergencyDefault);
    setBloodPermitted(tmpl.bloodDefault);
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawnSignature(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a'; // dark slate
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  const handleAddRisk = () => {
    if (!newRiskInput.trim()) return;
    setRisksList([...risksList, newRiskInput.trim()]);
    setNewRiskInput('');
  };

  const handleRemoveRisk = (index: number) => {
    setRisksList(risksList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let signatureStr = '';
      if (!useTypedSignature && canvasRef.current && hasDrawnSignature) {
        signatureStr = canvasRef.current.toDataURL('image/png');
      } else {
        signatureStr = `${signerName} (${signerRelationship}) - [إقرار إلكتروني موثق بموجب الهوية الوطنية: ${signerNationalId}]`;
      }

      const consentPayload: Partial<ConsentForm> = {
        id: existingConsent?.id,
        admissionId: currentAdmission.admissionId,
        mrn: currentPatient.mrn,
        patientName: currentPatient.fullName,
        type: selectedType,
        titleAr: activePreset.titleAr,
        titleEn: activePreset.titleEn,
        procedureName,
        clinicalIndication,
        risksExplained: risksList,
        alternativesExplained,
        emergencyConversionAuthorized: emergencyAuthorized,
        bloodTransfusionPermitted: bloodPermitted,
        signerType,
        signerName,
        signerNationalId,
        signerRelationship,
        signerPhone,
        signerSignature: signatureStr,
        signedDate: new Date().toISOString(),
        physicianName,
        physicianLicense,
        physicianSignature: `${physicianName} [ترخيص: ${physicianLicense}]`,
        witnessName,
        witnessRole,
        witnessSignature: `${witnessName} (${witnessRole})`,
        status: 'signed',
        notes
      };

      await api.saveConsentForm(consentPayload, currentUser);
      setIsSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Error saving consent form');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Printable View
  if (isPrintMode) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-8 text-slate-900">
        <div className="max-w-3xl mx-auto border-2 border-slate-900 p-8 space-y-6 bg-white">
          {/* Print Controls (hidden on paper) */}
          <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200">
            <button
              onClick={() => setIsPrintMode(false)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg text-xs"
            >
              {isAr ? '← العودة للتعديل' : '← Back to Editor'}
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-xs shadow"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? 'طباعة الإقرار الطبي' : 'Print Consent Form'}</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Hospital Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h2 className="text-xl font-bold font-sans">مستشفى الأمل التخصصي للنساء والولادة والإيواء</h2>
              <p className="text-xs text-slate-600 font-sans">Al-Amal Specialized Maternity & Surgical Inpatient Hospital</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">قسم التوثيق الطبي والشؤون القانونية والسريرية</p>
            </div>
            <div className="text-left rtl:text-right font-mono text-xs">
              <div className="border border-slate-900 px-3 py-1 font-bold">
                {existingConsent?.consentNumber || 'CNS-2026-TEMP'}
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">تاريخ التوثيق: {new Date().toLocaleDateString('ar-LY')}</span>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center py-2 bg-slate-100 border border-slate-300">
            <h1 className="text-base font-bold text-slate-900">{activePreset.titleAr}</h1>
            <p className="text-xs text-slate-600 font-sans tracking-wide">{activePreset.titleEn}</p>
          </div>

          {/* Patient Demographics Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border border-slate-300 p-3 bg-slate-50">
            <div>
              <span className="text-slate-500 text-[10px] block">اسم المريضة:</span>
              <strong className="font-bold">{currentPatient.fullName}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">رقم الملف الدائم (MRN):</span>
              <strong className="font-mono">{currentPatient.mrn}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">رقم الدخول / السرير:</span>
              <strong className="font-mono">{currentAdmission.admissionId} / {currentAdmission.roomNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">الرقم الوطني:</span>
              <strong className="font-mono">{currentPatient.nationalId}</strong>
            </div>
          </div>

          {/* Procedure & Indication */}
          <div className="space-y-3 text-xs">
            <div>
              <strong className="text-slate-900 font-bold block mb-1">1. مسمى التدخل الطبي أو الإجراء الجراحي:</strong>
              <div className="p-2 border border-slate-200 bg-white font-semibold">
                {procedureName}
              </div>
            </div>

            <div>
              <strong className="text-slate-900 font-bold block mb-1">2. الدواعي السريرية والتشخيصية للإجراء:</strong>
              <div className="p-2 border border-slate-200 bg-white">
                {clinicalIndication}
              </div>
            </div>

            {/* Risks */}
            <div>
              <strong className="text-slate-900 font-bold block mb-1">3. المخاطر والمضاعفات المحتملة المشروحة:</strong>
              <ul className="list-disc list-inside space-y-1 bg-slate-50 p-3 border border-slate-200 text-slate-800">
                {risksList.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            {/* Legal Statement & Conversions */}
            <div className="p-3 border border-slate-300 bg-slate-50/50 space-y-2 text-[11px] leading-relaxed">
              <p className="font-bold text-slate-900">
                إقرار وتفويض المريض / ولي الأمر:
              </p>
              <p>
                أقر أنا الموقع أدناه (<strong>{signerName}</strong>)، بصفتي (<strong>{signerRelationship}</strong>) حامل الرقم الوطني (<strong>{signerNationalId}</strong>)، بأن الطبيب المعالج قد شرح لي بالتفصيل طبيعة الحالة الصحية والغرض من الإجراء الطبي المذكور، والبدائل المتاحة، والمخاطر والمضاعفات التي قد تنجم عنه. وقد أُتيحت لي الفرصة الكاملة لطرح الأسئلة وتلقيت إجابات وافية ومرضية.
              </p>
              {emergencyAuthorized && (
                <p className="font-semibold text-slate-900">
                  ✓ أفوض الفريق الطبي الجراحي باتخاذ أي تدابير إضافية أو طارئة غير متوقعة تمليها الضرورة الطبية لإنقاذ الحياة أو تفادي الضرر الجسيم أثناء الإجراء.
                </p>
              )}
              {bloodPermitted && (
                <p className="font-semibold text-slate-900">
                  ✓ أوافق صراحة على نقل الدم أو مشتقاته عند الحاجة السريرية الطارئة لتعويض النزف وتثبيت المؤشرات الحيوية.
                </p>
              )}
            </div>
          </div>

          {/* Signatures Grid */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-slate-900 text-xs">
            {/* Patient / Signer Signature */}
            <div className="border border-slate-300 p-3 space-y-2">
              <span className="font-bold text-slate-900 block border-b pb-1">توقيع المقر (المريض/الوكيل):</span>
              <p className="text-[11px]">الاسم: <strong>{signerName}</strong></p>
              <p className="text-[10px] text-slate-600">الصفة: {signerRelationship}</p>
              <div className="h-16 flex items-center justify-center border border-dashed border-slate-300 bg-slate-50 mt-1">
                {existingConsent?.signerSignature && existingConsent.signerSignature.startsWith('data:image') ? (
                  <img src={existingConsent.signerSignature} alt="Signature" className="max-h-14 object-contain" />
                ) : (
                  <span className="font-mono text-[10px] text-slate-600 font-bold">{signerName}</span>
                )}
              </div>
              <span className="text-[9px] text-slate-400 block font-mono">التاريخ: {new Date().toISOString().split('T')[0]}</span>
            </div>

            {/* Attending Physician */}
            <div className="border border-slate-300 p-3 space-y-2">
              <span className="font-bold text-slate-900 block border-b pb-1">اعتماد الطبيب المعالج / الجراح:</span>
              <p className="text-[11px]">الاسم: <strong>{physicianName}</strong></p>
              <p className="text-[10px] text-slate-600">الترخيص: {physicianLicense}</p>
              <div className="h-16 flex items-center justify-center border border-dashed border-slate-300 bg-slate-50 mt-1">
                <span className="font-bold text-teal-800 font-serif text-xs">
                  {physicianName} (معتمد طبياً)
                </span>
              </div>
              <span className="text-[9px] text-slate-400 block font-mono">الختم والاعتماد الرقمي</span>
            </div>

            {/* Hospital Witness */}
            <div className="border border-slate-300 p-3 space-y-2">
              <span className="font-bold text-slate-900 block border-b pb-1">الشاهد / تمريض القسم:</span>
              <p className="text-[11px]">الاسم: <strong>{witnessName}</strong></p>
              <p className="text-[10px] text-slate-600">الوظيفة: {witnessRole}</p>
              <div className="h-16 flex items-center justify-center border border-dashed border-slate-300 bg-slate-50 mt-1">
                <span className="font-mono text-[10px] text-slate-700">{witnessName}</span>
              </div>
              <span className="text-[9px] text-slate-400 block font-mono">المستشفى التخصصي</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-[10px] text-slate-400 text-center pt-2 border-t border-slate-200">
            وثيقة إقرار قانونية وطبية معتمدة وفق اشتراطات وزارة الصحة ونظام السجلات الطبية الإلكترونية HMIS.
          </div>
        </div>
      </div>
    );
  }

  // Normal Form Modal
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight">
                  {isAr ? 'نموذج الإقرار والموافقة المستنيرة (Informed Consent)' : 'Informed Clinical & Operative Consent'}
                </h3>
                {existingConsent && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {existingConsent.consentNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isAr ? 'توثيق موافقة المريض/الولي، شرح المخاطر والبدائل، والتوقيع الرقمي المعتمد' : 'Document informed patient consent, risks disclosure, and capture verified digital signatures'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrintMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700"
              title={isAr ? 'معاينة الطباعة الرسمية' : 'Official Print View'}
            >
              <Printer className="w-3.5 h-3.5 text-teal-400" />
              <span>{isAr ? 'معاينة للطباعة' : 'Print Preview'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Patient Summary Strip */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold">{isAr ? 'المريض:' : 'Patient:'}</span>
              <strong className="text-slate-900 font-bold truncate block">{currentPatient.fullName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold">{isAr ? 'رقم الملف / الدخول:' : 'MRN / ADM:'}</span>
              <strong className="text-slate-900 font-mono block">{currentPatient.mrn} · {currentAdmission.admissionId}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold">{isAr ? 'الغرفة والسّرير:' : 'Room & Bed:'}</span>
              <strong className="text-teal-700 font-bold block">{currentAdmission.roomNumber} ({currentAdmission.roomType})</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold">{isAr ? 'الاستشاري المسؤول:' : 'Attending Consultant:'}</span>
              <strong className="text-slate-900 truncate block">{currentAdmission.attendingConsultantName}</strong>
            </div>
          </div>
        </div>

        {/* Form Body */}
        {isSuccess ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {isAr ? 'تم اعتماد وتوثيق الإقرار الطبي بنجاح!' : 'Consent Form Successfully Authorized & Stored!'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isAr ? 'تم حفظ التوقيع الرقمي بالملف السريري المركزي وقيده في سجل التدقيق الطبي.' : 'Digital signature recorded in EMR and audit trail.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
            {/* Template Selector Tabs */}
            <div>
              <label className="block text-slate-700 font-bold mb-2">
                {isAr ? 'اختر نوع نموذج الإقرار والموافقة المستنيرة:' : 'Select Consent Form Template:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {(Object.keys(TEMPLATES) as ConsentType[]).map((type) => {
                  const tmpl = TEMPLATES[type];
                  const isSelected = selectedType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSelectTemplate(type)}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {type === 'surgical_operative' && <Scissors className="w-4 h-4" />}
                      {type === 'anesthesia_epidural' && <Stethoscope className="w-4 h-4" />}
                      {type === 'general_admission' && <Building2 className="w-4 h-4" />}
                      {type === 'blood_transfusion' && <Droplet className="w-4 h-4" />}
                      {type === 'high_risk_obstetric' && <Baby className="w-4 h-4" />}
                      {type === 'dama_refusal' && <AlertTriangle className="w-4 h-4" />}
                      <span className="font-bold text-[11px] leading-tight line-clamp-2">
                        {isAr ? tmpl.titleAr.split(' ')[2] || tmpl.titleAr : tmpl.titleEn.split(' ')[2] || tmpl.titleEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Procedure & Indication */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'اسم الإجراء الطبي / الجراحي المحدد *' : 'Specific Medical / Surgical Procedure *'}
                </label>
                <input
                  type="text"
                  required
                  value={procedureName}
                  onChange={(e) => setProcedureName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'الدواعي الطبية للإجراء (Clinical Indication) *' : 'Clinical Indication *'}
                </label>
                <input
                  type="text"
                  required
                  value={clinicalIndication}
                  onChange={(e) => setClinicalIndication(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Explained Risks List */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 font-bold">
                  {isAr ? 'المخاطر والمضاعفات التي تم إيضاحها للمريض/المرافق:' : 'Explained Risks & Potential Complications:'}
                </label>
                <span className="text-[10px] text-slate-500">
                  {risksList.length} {isAr ? 'بنود محددة' : 'items'}
                </span>
              </div>
              <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                {risksList.map((risk, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-800 text-[11px] font-medium leading-relaxed">
                      • {risk}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRisk(idx)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newRiskInput}
                    onChange={(e) => setNewRiskInput(e.target.value)}
                    placeholder={isAr ? 'إضافة بند خطر سريري إضافي...' : 'Add another clinical risk item...'}
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRisk();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddRisk}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg text-slate-700 text-xs"
                  >
                    {isAr ? 'إضافة' : 'Add'}
                  </button>
                </div>
              </div>
            </div>

            {/* Alternatives & Emergency Clauses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'البدائل الطبية المشروحة ومخاطر عدم التدخل:' : 'Explained Alternatives & Non-Intervention Risks:'}
                </label>
                <textarea
                  rows={2}
                  value={alternativesExplained}
                  onChange={(e) => setAlternativesExplained(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'بنود التفويض الطبي الطارئ:' : 'Emergency Authorization Clauses:'}
                </label>
                <label className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 cursor-pointer hover:bg-slate-100/70">
                  <input
                    type="checkbox"
                    checked={emergencyAuthorized}
                    onChange={(e) => setEmergencyAuthorized(e.target.checked)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-[11px] text-slate-800 font-medium">
                    {isAr 
                      ? 'تفويض الجراح والطاقم باتخاذ الإجراءات الطارئة المنقذة للحياة وتعديل الخطة الجراحية إذا اقتضت الضرورة' 
                      : 'Authorize surgical team for unexpected emergency lifesaving conversions'}
                  </span>
                </label>

                <label className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 cursor-pointer hover:bg-slate-100/70">
                  <input
                    type="checkbox"
                    checked={bloodPermitted}
                    onChange={(e) => setBloodPermitted(e.target.checked)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-[11px] text-slate-800 font-medium">
                    {isAr 
                      ? 'الموافقة الصريحة على نقل الدم ومشتقاته عند حدوث نزف أو هبوط حاد في خضاب الدم' 
                      : 'Explicit authorization for blood & components transfusion if clinically indicated'}
                  </span>
                </label>
              </div>
            </div>

            {/* Signer Demographics */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'بيانات الشخص المُقِر والمفوِّض بالتوقيع:' : 'Signatory & Legal Guardian Information:'}</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 text-[10px] font-bold mb-1">
                    {isAr ? 'صفة الموقع *' : 'Signer Capacity *'}
                  </label>
                  <select
                    value={signerType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setSignerType(val);
                      if (val === 'patient') {
                        setSignerName(currentPatient.fullName);
                        setSignerNationalId(currentPatient.nationalId);
                        setSignerRelationship(isAr ? 'المريضة نفسها' : 'Self (Patient)');
                      } else if (val === 'spouse') {
                        setSignerRelationship(isAr ? 'الزوج' : 'Spouse / Husband');
                      } else if (val === 'guardian') {
                        setSignerRelationship(isAr ? 'ولي الأمر الشرعي' : 'Legal Guardian');
                      } else {
                        setSignerRelationship(isAr ? 'قريب من الدرجة الأولى' : 'First-degree relative');
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
                  >
                    <option value="patient">{isAr ? 'المريضة نفسها' : 'Patient'}</option>
                    <option value="spouse">{isAr ? 'الزوج' : 'Spouse'}</option>
                    <option value="guardian">{isAr ? 'ولي الأمر' : 'Guardian'}</option>
                    <option value="relative">{isAr ? 'قريب' : 'Relative'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 text-[10px] font-bold mb-1">
                    {isAr ? 'اسم الموقع كاملاً *' : 'Full Signer Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[10px] font-bold mb-1">
                    {isAr ? 'الرقم الوطني / الهوية *' : 'National ID *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={signerNationalId}
                    onChange={(e) => setSignerNationalId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[10px] font-bold mb-1">
                    {isAr ? 'صلة القرابة / الهاتف' : 'Relationship / Phone'}
                  </label>
                  <input
                    type="text"
                    value={signerRelationship}
                    onChange={(e) => setSignerRelationship(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Signature Capture Section (Canvas or Digital) */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-slate-900">
                    {isAr ? 'لوحة التوقيع الحي للمريض أو ولي الأمر:' : 'Patient / Signatory Signature Pad:'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useTypedSignature}
                      onChange={(e) => setUseTypedSignature(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>{isAr ? 'اعتماد التوقيع الرقمي المقيد بالهوية' : 'Use Verified ID Electronic Sign'}</span>
                  </label>
                  {!useTypedSignature && (
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isAr ? 'مسح التوقيع' : 'Clear'}</span>
                    </button>
                  )}
                </div>
              </div>

              {useTypedSignature ? (
                <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center space-y-1">
                  <p className="font-mono text-xs font-bold text-teal-800">
                    {signerName} - [{signerRelationship}]
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {isAr ? 'تم التحقق من الهوية الوطنية:' : 'Verified National ID:'} {signerNationalId} · {new Date().toLocaleDateString('ar-LY')}
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 relative flex items-center justify-center overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={120}
                    className="w-full h-28 cursor-crosshair touch-none bg-slate-50"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!hasDrawnSignature && (
                    <span className="absolute pointer-events-none text-slate-400 text-xs">
                      {isAr ? 'وقع هنا باللمس أو بالفأرة...' : 'Sign here with touch or mouse...'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Clinician & Witness Sign-off */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="block text-[10px] text-slate-500 font-bold mb-1">
                  {isAr ? 'الطبيب المعالج / الاستشاري المعتمد:' : 'Attending Physician / Consultant:'}
                </span>
                <input
                  type="text"
                  required
                  value={physicianName}
                  onChange={(e) => setPhysicianName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-900"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="block text-[10px] text-slate-500 font-bold mb-1">
                  {isAr ? 'الشاهد من الكادر التمريضي / الاستقبال:' : 'Clinical Witness / Staff Nurse:'}
                </span>
                <input
                  type="text"
                  required
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsPrintMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>{isAr ? 'معاينة وثيقة الطباعة الرسمية' : 'View Official Print Document'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-colors"
                >
                  <FileSignature className="w-4 h-4" />
                  <span>
                    {isSubmitting 
                      ? (isAr ? 'جاري توثيق الإقرار...' : 'Saving Consent...') 
                      : (isAr ? 'اعتماد وتوثيق الإقرار الطبي' : 'Authorize & Save Consent')}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
