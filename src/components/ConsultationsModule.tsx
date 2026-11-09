import React, { useState } from 'react';
import { 
  Patient, 
  Admission, 
  Consultation, 
  Language, 
  SystemUser 
} from '../types/hmis.ts';
import {
  UserCheck, 
  Clock, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  FileText,
  Stethoscope
} from 'lucide-react';
import { api } from '../api/client.ts';

interface ConsultationsModuleProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  consultations: Consultation[];
  currentUser: SystemUser;
  language: Language;
  onRefresh: () => void;
}

export const ConsultationsModule: React.FC<ConsultationsModuleProps> = ({
  currentPatient,
  currentAdmission,
  consultations,
  currentUser,
  language,
  onRefresh,
}) => {
  const isAr = language === 'ar';
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedConsToComplete, setSelectedConsToComplete] = useState<Consultation | null>(null);

  // Form states
  const [specialty, setSpecialty] = useState('Pediatrics & Neonatology (أطفال وحديثي ولادة)');
  const [urgency, setUrgency] = useState<'Routine' | 'Urgent' | 'Immediate'>('Routine');
  const [reason, setReason] = useState('معاينة المولود بعد ولادة قيصرية روتينية');
  const [findings, setFindings] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [ordersPlaced, setOrdersPlaced] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentAdmission || !currentPatient) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
        {isAr ? 'يرجى اختيار مريض منوم' : 'Please select an active inpatient'}
      </div>
    );
  }

  const handleCreateConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createConsultation({
        admissionId: currentAdmission.admissionId,
        patientName: currentPatient.fullName,
        specialty,
        requestingPhysician: currentUser.name,
        urgency,
        reason,
        feeAmount: 150.0 // Standard consultation fee
      }, currentUser);

      setShowRequestModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsToComplete) return;
    setIsSubmitting(true);
    try {
      await api.completeConsultation(selectedConsToComplete.id, {
        consultantName: currentUser.name,
        findings,
        recommendations,
        ordersPlaced
      });

      setShowCompleteModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            <span>{isAr ? 'إدارة الاستشارات الطبية التخصصية (Consultation Management)' : 'Medical Consultation Management'}</span>
          </h2>
          <span className="text-xs text-slate-500">
            {isAr ? 'تسجيل أوقات الطلب والتبليغ والاستجابة والوصول مع إدراج أتعاب الاستشاري المستدعى في الملف المالي' : 'Full tracking of request, arrival, response and financial fee allocation'}
          </span>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAr ? 'طلب استشارة اختصاصي جديد' : 'Request Specialist Consultation'}</span>
        </button>
      </div>

      {/* Consultations List */}
      <div className="space-y-3">
        {consultations.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-400">
            {isAr ? 'لا توجد طلبات استشارة مسجلة لهذه الإقامة' : 'No consultations requested for this admission.'}
          </div>
        ) : (
          consultations.map(c => {
            const isCompleted = c.status === 'completed';

            return (
              <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{c.specialty}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.urgency === 'Immediate' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                        c.urgency === 'Urgent' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.urgency}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-mono text-[10px] font-bold">
                        {c.feeAmount} {isAr ? 'د.ل (أتعاب الاستشارة)' : 'LYD fee'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono block mt-1">
                      {isAr ? 'الطبيب الطالب:' : 'Requested by:'} {c.requestingPhysician} · {c.requestTime.split('T')[0]} {c.requestTime.split('T')[1]?.substring(0, 5)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                      isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isCompleted ? (isAr ? '✓ تمت المعاينة وكتابة التقرير' : 'Completed') : (isAr ? 'قيد الانتظار والاستدعاء' : 'Pending Review')}
                    </span>

                    {!isCompleted && (
                      <button
                        onClick={() => {
                          setSelectedConsToComplete(c);
                          setFindings('');
                          setRecommendations('');
                          setOrdersPlaced('');
                          setShowCompleteModal(true);
                        }}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded text-[11px] transition-colors"
                      >
                        {isAr ? 'كتابة تقرير المعاينة' : 'Write Report'}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-1">{isAr ? 'سبب طلب الاستشارة:' : 'Reason for Consultation:'}</span>
                  <p className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-800">
                    {c.reason}
                  </p>
                </div>

                {isCompleted && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <UserCheck className="w-4 h-4 text-teal-600" />
                      <span>{isAr ? 'تقرير الطبيب المستدعى:' : 'Consultant Findings & Plan:'} {c.consultantName}</span>
                    </div>

                    <div className="bg-teal-50/40 border border-teal-200/80 rounded p-3 space-y-2">
                      <div>
                        <span className="text-slate-500 font-semibold block">{isAr ? 'المشاهدات السريرية والفحص:' : 'Clinical Findings:'}</span>
                        <p className="text-slate-800">{c.findings}</p>
                      </div>

                      <div>
                        <span className="text-slate-500 font-semibold block">{isAr ? 'التوصيات والخطة العلاجية:' : 'Recommendations:'}</span>
                        <p className="text-slate-800">{c.recommendations}</p>
                      </div>

                      {c.ordersPlaced && (
                        <div>
                          <span className="text-slate-500 font-semibold block">{isAr ? 'الأوامر الصادرة ضمن الصلاحيات:' : 'Orders Placed:'}</span>
                          <p className="text-teal-800 font-mono">{c.ordersPlaced}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Request Consultation */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'طلب استشارة طبيب اختصاصي' : 'Request Specialist Consultation'}</span>
              </h3>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateConsultation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'التخصص الطبي المطلوب *' : 'Specialty *'}
                </label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                >
                  <option value="Pediatrics & Neonatology (أطفال وحديثي ولادة)">أطفال وحديثي ولادة (Pediatrics & Neonatology)</option>
                  <option value="Endocrinology & Internal Medicine (باطنة وغدد صماء)">باطنة وغدد صماء (Internal Medicine & Diabetes)</option>
                  <option value="Cardiology (أمراض القلب)">أمراض القلب (Cardiology)</option>
                  <option value="Anesthesia & Critical Care (تخدير وعناية)">تخدير وعناية فائقة (Anesthesia & Critical Care)</option>
                  <option value="General Surgery (جراحة عامة)">جراحة عامة (General Surgery)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'درجة الاستعجال *' : 'Urgency Level *'}
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                >
                  <option value="Routine">{isAr ? 'روتيني (Routine)' : 'Routine'}</option>
                  <option value="Urgent">{isAr ? 'عاجل (Urgent)' : 'Urgent'}</option>
                  <option value="Immediate">{isAr ? 'فوري حرج (Immediate)' : 'Immediate'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'سبب طلب الاستشارة والمسألة السريرية المطروحة *' : 'Reason for Consultation *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2"
                  placeholder={isAr ? 'وصف الحالة، الفحوصات، الهدف من الاستشارة...' : 'Clinical question'}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال طلب الاستشارة' : 'Send Request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Complete Consultation Report */}
      {showCompleteModal && selectedConsToComplete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'توثيق تقرير معاينة الاستشاري المستدعى' : 'Consultant Findings & Report'}</span>
              </h3>
              <button onClick={() => setShowCompleteModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleCompleteConsultation} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="font-bold text-slate-900">{selectedConsToComplete.specialty}</span>
                <p className="text-slate-600 mt-1">{selectedConsToComplete.reason}</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isAr ? 'المشاهدات السريرية والفحص (Findings) *' : 'Findings *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2"
                  placeholder={isAr ? 'نتائج المعاينة المباشرة للمريض...' : 'Clinical exam findings'}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isAr ? 'التوصيات والخطة المقترحة (Recommendations) *' : 'Recommendations *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2"
                  placeholder={isAr ? 'العلاج الموصى به، الفحوصات المقترحة...' : 'Management recommendations'}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isAr ? 'أوامر وفحوصات صادرة ضمن الصلاحية الممنوحة' : 'Orders Placed'}
                </label>
                <input
                  type="text"
                  value={ordersPlaced}
                  onChange={(e) => setOrdersPlaced(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  placeholder={isAr ? 'تحليل سكر تراكمي، تخطيط قلب، تعديل جرعة...' : 'Lab or medication orders'}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري الاعتماد...' : 'Saving...') : (isAr ? 'اعتماد وإغلاق الاستشارة' : 'Save & Complete')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
