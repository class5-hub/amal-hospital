import React, { useState, useEffect } from 'react';
import { 
  FileSignature, 
  Plus, 
  Search, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Scissors, 
  Stethoscope, 
  Droplet, 
  Baby, 
  Filter, 
  UserCheck, 
  Clock, 
  X, 
  Eye, 
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { Patient, Admission, SystemUser, Language, ConsentForm, ConsentType } from '../types/hmis.ts';
import { api } from '../api/client.ts';
import { ConsentFormModal } from './ConsentFormModal.tsx';

interface ConsentModuleProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  currentUser: SystemUser;
  language: Language;
  onRefresh?: () => void;
}

export const ConsentModule: React.FC<ConsentModuleProps> = ({
  currentPatient,
  currentAdmission,
  currentUser,
  language,
  onRefresh
}) => {
  const isAr = language === 'ar';

  const [consents, setConsents] = useState<ConsentForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewScope, setViewScope] = useState<'current_stay' | 'all'>('current_stay');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ConsentType>('surgical_operative');
  const [selectedConsent, setSelectedConsent] = useState<ConsentForm | null>(null);

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const loadConsents = async () => {
    setIsLoading(true);
    try {
      const admId = viewScope === 'current_stay' && currentAdmission ? currentAdmission.admissionId : undefined;
      const mrn = viewScope === 'current_stay' && currentPatient ? currentPatient.mrn : undefined;
      const data = await api.getConsents(admId, mrn);
      setConsents(data);
    } catch (err) {
      console.error('Error fetching consent forms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConsents();
  }, [viewScope, currentAdmission]);

  const handleOpenNew = (type: ConsentType) => {
    if (!currentPatient || !currentAdmission) {
      alert(isAr ? 'يرجى تحديد مريض نشط أولاً' : 'Please select an active inpatient first');
      return;
    }
    setSelectedConsent(null);
    setModalType(type);
    setShowModal(true);
  };

  const handleView = (c: ConsentForm) => {
    setSelectedConsent(c);
    setModalType(c.type);
    setShowModal(true);
  };

  const handleConfirmRevoke = async () => {
    if (!revokingId || !revokeReason.trim()) return;
    try {
      await api.revokeConsentForm(revokingId, revokeReason, currentUser);
      setRevokingId(null);
      setRevokeReason('');
      loadConsents();
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Error revoking consent form');
    }
  };

  const filteredConsents = consents.filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.patientName?.toLowerCase().includes(q);
      const matchMrn = c.mrn?.toLowerCase().includes(q);
      const matchProc = c.procedureName?.toLowerCase().includes(q);
      const matchNumber = c.consentNumber?.toLowerCase().includes(q);
      if (!matchName && !matchMrn && !matchProc && !matchNumber) return false;
    }
    return true;
  });

  const surgicalCount = consents.filter(c => c.type === 'surgical_operative').length;
  const anesthesiaCount = consents.filter(c => c.type === 'anesthesia_epidural').length;
  const admissionCount = consents.filter(c => c.type === 'general_admission').length;
  const bloodCount = consents.filter(c => c.type === 'blood_transfusion').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {isAr ? 'منظومة نماذج الإقرارات والموافقات المستنيرة' : 'Informed Consent Forms & Medicolegal Registry'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                LEGAL EMR
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr 
                ? 'إقرارات العمليات الجراحية، التخدير، نقل الدم، والدخول العام مع التوثيق والتوقيع الرقمي' 
                : 'Surgical, anesthesia, blood transfusion, and admission informed consents with digital signature capture'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewScope('current_stay')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewScope === 'current_stay'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'المريض الحالي' : 'Active Patient'}
            </button>
            <button
              onClick={() => setViewScope('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewScope === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'جميع المرضى' : 'All Patients'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenNew('surgical_operative')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'تحرير إقرار جديد' : 'New Consent Form'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] block">{isAr ? 'إقرارات الجراحة والقيصرية' : 'Surgical Consents'}</span>
            <strong className="text-lg font-bold text-slate-900">{surgicalCount}</strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
            <Scissors className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] block">{isAr ? 'إقرارات التخدير والإيبيدورال' : 'Anesthesia Consents'}</span>
            <strong className="text-lg font-bold text-slate-900">{anesthesiaCount}</strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Stethoscope className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] block">{isAr ? 'إقرارات الدخول العام' : 'General Admission'}</span>
            <strong className="text-lg font-bold text-slate-900">{admissionCount}</strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] block">{isAr ? 'إقرارات نقل الدم ومشتقاته' : 'Blood Transfusions'}</span>
            <strong className="text-lg font-bold text-red-600">{bloodCount}</strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <Droplet className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Quick New Consent Template Buttons */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
        <span className="text-xs font-bold text-slate-700 block">
          {isAr ? 'قوالب سريعة لإنشاء الإقرار الطبي للمريض الحالي:' : 'Quick Consent Templates for Active Patient:'}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenNew('surgical_operative')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors"
          >
            <Scissors className="w-3.5 h-3.5 text-teal-600" />
            <span>{isAr ? 'إقرار عملية ولادة قيصرية / جراحة' : 'Cesarean / Surgery Consent'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenNew('anesthesia_epidural')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors"
          >
            <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isAr ? 'إقرار التخدير النصفي / إيبيدورال' : 'Epidural / Spinal Anesthesia'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenNew('blood_transfusion')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-colors"
          >
            <Droplet className="w-3.5 h-3.5 text-red-600" />
            <span>{isAr ? 'إقرار نقل الدم ومشتقاته' : 'Blood Transfusion Consent'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenNew('general_admission')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            <span>{isAr ? 'إقرار الدخول وتلقي العلاج' : 'General Admission Consent'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenNew('high_risk_obstetric')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
          >
            <Baby className="w-3.5 h-3.5 text-amber-600" />
            <span>{isAr ? 'إقرار ولادة عالية الخطورة ودخول الحضانة' : 'High-Risk & NICU Consent'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 absolute top-2.5 start-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث برقم الإقرار، اسم المريضة، رقم الملف، أو اسم العملية...' : 'Search by consent #, patient, MRN, or procedure...'}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-9 pe-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700"
          >
            <option value="all">{isAr ? 'جميع أنواع الإقرارات' : 'All Consent Types'}</option>
            <option value="surgical_operative">{isAr ? 'جراحة وقيصرية' : 'Surgical'}</option>
            <option value="anesthesia_epidural">{isAr ? 'تخدير وإيبيدورال' : 'Anesthesia'}</option>
            <option value="blood_transfusion">{isAr ? 'نقل دم' : 'Transfusion'}</option>
            <option value="general_admission">{isAr ? 'دخول عام' : 'Admission'}</option>
            <option value="high_risk_obstetric">{isAr ? 'ولادة حرجة / حضانة' : 'High-Risk'}</option>
            <option value="dama_refusal">{isAr ? 'رفض علاج / DAMA' : 'Refusal / DAMA'}</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700"
          >
            <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="signed">{isAr ? 'معتمد وموقع' : 'Signed'}</option>
            <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
            <option value="revoked">{isAr ? 'ملغى / مسحوب' : 'Revoked'}</option>
          </select>
        </div>
      </div>

      {/* Consents Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">{isAr ? 'رقم الإقرار والتاريخ' : 'Consent # & Date'}</th>
                <th className="p-3.5">{isAr ? 'المريضة والملف' : 'Patient & MRN'}</th>
                <th className="p-3.5">{isAr ? 'نوع الإقرار والإجراء' : 'Consent Type & Procedure'}</th>
                <th className="p-3.5">{isAr ? 'المُقِر والصفة' : 'Signatory & Relation'}</th>
                <th className="p-3.5">{isAr ? 'الطبيب المعتمد' : 'Attending Physician'}</th>
                <th className="p-3.5">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="p-3.5 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-mono">
                    {isAr ? 'جاري تحميل الإقرارات الطبية...' : 'Loading consent records...'}
                  </td>
                </tr>
              ) : filteredConsents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <FileSignature className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">{isAr ? 'لا توجد نماذج إقرارات مطابقة لمعايير البحث' : 'No consent forms found'}</p>
                  </td>
                </tr>
              ) : (
                filteredConsents.map((c) => {
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Consent # & Date */}
                      <td className="p-3.5 font-mono">
                        <strong className="text-slate-900 block font-bold">{c.consentNumber}</strong>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {c.signedDate?.split('T')[0]} {c.signedDate?.split('T')[1]?.substring(0, 5)}
                        </span>
                      </td>

                      {/* Patient & MRN */}
                      <td className="p-3.5">
                        <strong className="text-slate-900 font-bold block">{c.patientName}</strong>
                        <span className="text-[10px] text-slate-500 font-mono block">MRN: {c.mrn}</span>
                      </td>

                      {/* Consent Type & Procedure */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          {c.type === 'surgical_operative' && <Scissors className="w-3.5 h-3.5 text-teal-600" />}
                          {c.type === 'anesthesia_epidural' && <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />}
                          {c.type === 'blood_transfusion' && <Droplet className="w-3.5 h-3.5 text-red-600" />}
                          {c.type === 'general_admission' && <Building2 className="w-3.5 h-3.5 text-slate-600" />}
                          {c.type === 'high_risk_obstetric' && <Baby className="w-3.5 h-3.5 text-amber-600" />}
                          <strong className="text-slate-900 font-semibold">{isAr ? c.titleAr : c.titleEn}</strong>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate max-w-xs mt-0.5" title={c.procedureName}>
                          {c.procedureName}
                        </p>
                      </td>

                      {/* Signatory */}
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-900 block">{c.signerName}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {c.signerRelationship} · {c.signerNationalId}
                        </span>
                      </td>

                      {/* Physician */}
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-900 block">{c.physicianName}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{c.physicianLicense}</span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {c.status === 'signed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {isAr ? 'موقع ومعتمد' : 'Signed'}
                          </span>
                        )}
                        {c.status === 'revoked' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            {isAr ? 'ملغى / مسحوب' : 'Revoked'}
                          </span>
                        )}
                        {c.status === 'draft' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                            {isAr ? 'مسودة' : 'Draft'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleView(c)}
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors"
                            title={isAr ? 'معاينة وطباعة الوثيقة الرسمية' : 'View & Print Official Form'}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {c.status === 'signed' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRevokingId(c.id);
                                setRevokeReason('');
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors"
                              title={isAr ? 'إلغاء أو سحب الإقرار' : 'Revoke Consent'}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revoke Consent Confirmation Dialog */}
      {revokingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-rose-200 shadow-xl">
            <div className="flex items-center gap-2 text-rose-700 font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4>{isAr ? 'سحب أو إلغاء الإقرار الطبي المستنير' : 'Revoke Informed Consent'}</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isAr 
                ? 'وفق اللوائح الطبية والقانونية، يتطلب إلغاء الإقرار توثيق السبب المباشر وهوية الطبيب أو المريض الذي طلب السحب.' 
                : 'Revoking an informed consent requires entering a clinical or patient withdrawal reason for audit compliance.'}
            </p>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs">
                {isAr ? 'سبب سحب الإقرار *' : 'Revocation Reason *'}
              </label>
              <textarea
                rows={3}
                required
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder={isAr ? 'مثال: طلبت المريضة تأجيل الإجراء الجراحي، أو تغيّر القرار الطبي...' : 'Reason for withdrawal...'}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRevokingId(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 text-xs"
              >
                {isAr ? 'تراجع' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!revokeReason.trim()}
                onClick={handleConfirmRevoke}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs"
              >
                {isAr ? 'تأكيد سحب الإقرار' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consent Form Modal (Editor & Print) */}
      {showModal && currentPatient && currentAdmission && (
        <ConsentFormModal
          currentPatient={currentPatient}
          currentAdmission={currentAdmission}
          currentUser={currentUser}
          language={language}
          initialType={modalType}
          existingConsent={selectedConsent}
          onClose={() => {
            setShowModal(false);
            setSelectedConsent(null);
          }}
          onSaved={() => {
            loadConsents();
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
};
