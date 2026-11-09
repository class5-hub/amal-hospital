import React, { useState } from 'react';
import { 
  LogOut, 
  CheckCircle2, 
  X, 
  AlertTriangle, 
  BedDouble, 
  Calendar, 
  FileText, 
  Pill, 
  UserCheck, 
  ExternalLink,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { Patient, Admission, SystemUser, Language, DischargeSummary } from '../types/hmis.ts';
import { api } from '../api/client.ts';

interface QuickDischargeModalProps {
  currentPatient: Patient;
  currentAdmission: Admission;
  currentUser: SystemUser;
  language: Language;
  onClose: () => void;
  onRefresh: () => void;
  onOpenFullDischarge: () => void;
}

export const QuickDischargeModal: React.FC<QuickDischargeModalProps> = ({
  currentPatient,
  currentAdmission,
  currentUser,
  language,
  onClose,
  onRefresh,
  onOpenFullDischarge
}) => {
  const isAr = language === 'ar';

  // Calculate length of stay (days)
  const admDate = new Date(currentAdmission.admissionDate);
  const now = new Date();
  const diffDays = Math.max(1, Math.ceil((now.getTime() - admDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Default follow-up date is 7 days from now
  const defaultFollowUp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [condition, setCondition] = useState<'Improved' | 'Cured' | 'Stable' | 'Critical'>('Improved');
  const [disposition, setDisposition] = useState<'Home' | 'Transferred' | 'DAMA (Against Medical Advice)'>('Home');
  const [finalDiagnosis, setFinalDiagnosis] = useState(
    currentAdmission.department?.includes('Obstetrics')
      ? 'Delivered single live infant via Cesarean section, post-op recovery uncomplicated'
      : 'Inpatient recovery completed, vital signs stable, authorized for discharge'
  );
  const [treatmentSummary, setTreatmentSummary] = useState(
    `Patient admitted on ${currentAdmission.admissionDate.split('T')[0]} via ${currentAdmission.source || 'Emergency'}. Underwent clinical management under Dr. ${currentAdmission.attendingConsultantName}. Vitals stable, patient mobilized well.`
  );
  const [dischargeMedications, setDischargeMedications] = useState(
    'Cefixime 400mg OD x 5 days, Paracetamol 1000mg TID PRN for pain, Iron + Folic Acid OD x 30 days'
  );
  const [aftercareInstructions, setAftercareInstructions] = useState(
    'Daily wound hygiene and dry dressing. Return to outpatient clinic on follow-up date for surgical wound review. Seek emergency care immediately if high fever, severe abdominal pain, or abnormal bleeding occurs.'
  );
  const [followUpDate, setFollowUpDate] = useState(defaultFollowUp);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isAlreadyDischarged = currentAdmission.status === 'discharged' || currentAdmission.status === 'dama';

  const handleConfirmQuickDischarge = async (e: React.FormEvent) => {
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
        admissionDiagnosis: currentAdmission.packageName || 'Inpatient Admission',
        finalDiagnosis,
        treatmentAndHospitalCourse: treatmentSummary,
        surgicalInterventions: currentAdmission.department?.includes('Obstetrics') ? 'Cesarean Section / Delivery' : 'Medical Inpatient Management',
        dischargeCondition: condition,
        disposition,
        dischargeMedications: dischargeMedications.split(',').map(m => m.trim()),
        aftercareInstructions,
        followUpDate,
        attendingPhysicianName: currentUser.name,
        attendingPhysicianSignature: `${currentUser.name} (استشاري معتمد)`
      };

      await api.saveDischargeSummary(summary, currentUser);
      setIsSuccess(true);
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Error executing quick discharge');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 rtl:rotate-180" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight">
                  {isAr ? 'إجراءات الخروج السريع للإيواء (Quick Discharge)' : 'Quick Inpatient Discharge Workflow'}
                </h3>
                <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  FAST-TRACK
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr ? 'اعتماد خروج المريض، توثيق العلاجات المنزلية، وإخلاء السرير للتعقيم' : 'Authorize inpatient discharge, generate summary, and release bed for housekeeping'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Summary Strip */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold">{isAr ? 'المريض:' : 'Patient:'}</span>
              <strong className="text-slate-900 font-bold truncate block">{currentPatient.fullName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold">{isAr ? 'الملف / الإيواء:' : 'MRN / ADM:'}</span>
              <strong className="text-slate-900 font-mono block">{currentPatient.mrn} · {currentAdmission.admissionId}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold">{isAr ? 'الغرفة والسّرير الحالي:' : 'Bed & Ward:'}</span>
              <strong className="text-teal-700 font-bold block">{currentAdmission.roomNumber} ({currentAdmission.roomType})</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold">{isAr ? 'مدة الإقامة الإجمالية:' : 'Length of Stay (LOS):'}</span>
              <strong className="text-slate-900 font-mono block">{diffDays} {isAr ? 'أيام' : 'days'} ({currentAdmission.admissionDate.split('T')[0]})</strong>
            </div>
          </div>
        </div>

        {/* Form Body */}
        {isSuccess ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {isAr ? 'تم اعتماد الخروج الطبي وإخلاء السرير بنجاح!' : 'Inpatient Discharge Successfully Authorized!'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isAr ? 'تم توثيق ملخص الخروج بالملف السريري وتحويل السرير إلى وضع التعقيم (Cleaning).' : 'Discharge summary recorded in EMR and bed status transitioned to housekeeping.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleConfirmQuickDischarge} className="p-4 sm:p-5 space-y-4 text-xs">
            {isAlreadyDischarged && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {isAr ? 'تنبيه: هذا المريض تم تسجيل خروجه مسبقاً. يمكنك تحديث بيانات الخروج أو طباعة الوثيقة.' : 'Notice: This inpatient is already marked as discharged.'}
                </span>
              </div>
            )}

            {/* Condition & Disposition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'الحالة السريرية عند الخروج *' : 'Condition upon Discharge *'}
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Improved">{isAr ? 'متحسن ومستقر (Improved & Stable)' : 'Improved'}</option>
                  <option value="Cured">{isAr ? 'تم الشفاء التام (Cured)' : 'Cured'}</option>
                  <option value="Stable">{isAr ? 'مستقر طبياً (Stable)' : 'Stable'}</option>
                  <option value="Critical">{isAr ? 'حرج يستدعي النقل (Critical/Transfer)' : 'Critical'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'وجهة الخروج (Disposition) *' : 'Disposition *'}
                </label>
                <select
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Home">{isAr ? 'خروج إلى المنزل (Discharge to Home)' : 'Home'}</option>
                  <option value="Transferred">{isAr ? 'تحويل لمنشأة تخصصية أخرى (Transferred)' : 'Transferred'}</option>
                  <option value="DAMA (Against Medical Advice)">{isAr ? 'خروج على مسؤولية المريض (DAMA)' : 'DAMA'}</option>
                </select>
              </div>
            </div>

            {/* Final Diagnosis */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {isAr ? 'التشخيص النهائي المعتمد (Final Diagnosis) *' : 'Final Diagnosis *'}
              </label>
              <input
                type="text"
                required
                value={finalDiagnosis}
                onChange={(e) => setFinalDiagnosis(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Discharge Medications */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'الأدوية الموصوفة عند الخروج (Discharge Medications) *' : 'Discharge Medications *'}</span>
              </label>
              <textarea
                rows={2}
                required
                value={dischargeMedications}
                onChange={(e) => setDischargeMedications(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder={isAr ? 'الأدوية، الجرعات، التكرار والمدة...' : 'Medications, dose, frequency, duration...'}
              />
            </div>

            {/* Aftercare & Follow-Up */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'تعليمات العناية المنزلية (Aftercare Instructions)' : 'Aftercare Instructions'}
                </label>
                <textarea
                  rows={2}
                  value={aftercareInstructions}
                  onChange={(e) => setAftercareInstructions(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isAr ? 'موعد المراجعة بالعيادة (Follow-up Date) *' : 'Follow-up Clinic Date *'}</span>
                </label>
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {isAr ? 'تم ضبطه افتراضياً بعد 7 أيام من تاريخ اليوم' : 'Preset to 7 days post-discharge'}
                </span>
              </div>
            </div>

            {/* Bed Release Notice */}
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-start gap-2.5 text-teal-950">
              <BedDouble className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>{isAr ? 'الإخلاء الآلي للسرير:' : 'Automated Bed Release:'}</strong>{' '}
                {isAr 
                  ? `بمجرد التأكيد، سيتم تحرير السرير (${currentAdmission.roomNumber}) ونقله فوراً لحالة التنظيف والتعقيم (Cleaning) لتجهيزه للمرضى القادمين.` 
                  : `Upon confirmation, bed ${currentAdmission.roomNumber} will immediately transition to 'Cleaning' for housekeeping and reception availability.`}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullDischarge();
                }}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>{isAr ? 'فتح وحدة وثائق وتقارير الخروج الكاملة' : 'Open Full Discharge & Reports Module'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-colors"
                >
                  <LogOut className="w-4 h-4 rtl:rotate-180" />
                  <span>
                    {isSubmitting 
                      ? (isAr ? 'جاري اعتماد الخروج...' : 'Processing...') 
                      : (isAr ? 'اعتماد وتأكيد الخروج الطبي' : 'Authorize & Release Bed')}
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
