import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  FileText, 
  DollarSign, 
  ShieldCheck, 
  Activity, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Edit3, 
  X, 
  Phone, 
  MapPin, 
  Droplet, 
  Pill, 
  FlaskConical, 
  Baby, 
  Heart,
  ChevronRight,
  Printer
} from 'lucide-react';
import { 
  Patient, 
  Admission, 
  Appointment, 
  LabOrder, 
  MedicationOrder, 
  ProvisionalInvoice, 
  SystemUser, 
  Language, 
  EMARRecord,
  AppointmentVisitType,
  DischargeSummary
} from '../types/hmis.ts';
import { api } from '../api/client.ts';
import { generateCode128Svg } from '../utils/barcode.ts';

interface PatientPortalProps {
  currentUser: SystemUser;
  patient: Patient | null;
  admission: Admission | null;
  language: Language;
}

export function PatientPortalModule({
  currentUser,
  patient,
  admission,
  language
}: PatientPortalProps) {
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'records' | 'appointments' | 'stay_summary' | 'billing'>('records');
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [medications, setMedications] = useState<MedicationOrder[]>([]);
  const [emarRecords, setEmarRecords] = useState<EMARRecord[]>([]);
  const [invoice, setInvoice] = useState<ProvisionalInvoice | null>(null);
  const [dischargeSummary, setDischargeSummary] = useState<DischargeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Booking modal for patient
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookDate, setBookDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookTimeSlot, setBookTimeSlot] = useState('10:00');
  const [bookVisitType, setBookVisitType] = useState<AppointmentVisitType>('antenatal');
  const [bookNotes, setBookNotes] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const targetMrn = currentUser.linkedPatientMrn || patient?.mrn || 'MRN-2026-0811';

  const loadPatientData = async () => {
    try {
      setIsLoading(true);
      const [apts, labs, meds, emar, disch] = await Promise.all([
        api.getAppointments({ patientMrn: targetMrn }),
        admission ? api.getLabOrders(admission.admissionId) : api.getLabOrders(),
        admission ? api.getMedications(admission.admissionId) : api.getMedications(),
        admission ? api.getEMAR(admission.admissionId) : api.getEMAR(),
        admission ? api.getDischargeSummary(admission.admissionId).catch(() => null) : Promise.resolve(null)
      ]);

      setPatientAppointments(apts);
      setLabOrders(labs);
      setMedications(meds);
      setEmarRecords(emar);
      setDischargeSummary(disch);

      if (admission) {
        const inv = await api.getProvisionalInvoice(admission.admissionId);
        setInvoice(inv);
      }
    } catch (err: any) {
      console.error('Error loading patient portal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [targetMrn, admission]);

  const handlePatientBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    try {
      await api.bookAppointment({
        patientMrn: patient.mrn,
        patientName: patient.fullName,
        patientPhone: patient.phone,
        doctorId: 'usr-1',
        doctorName: isAr ? 'د. طارق بن عامر' : 'Dr. Tarek Ben-Amer',
        department: 'Obstetrics & Gynecology (أمراض النساء والولادة)',
        date: bookDate,
        timeSlot: bookTimeSlot,
        durationMinutes: 30,
        visitType: bookVisitType,
        notes: bookNotes,
        createdBy: isAr ? `${patient.fullName} (بوابة المريض)` : `${patient.fullName} (Patient Portal)`
      }, currentUser);

      setMessage({
        type: 'success',
        text: isAr ? 'تم حجز موعدك بنجاح وسيتواصل معك قسم الاستقبال للتأكيد' : 'Appointment booked successfully'
      });
      setShowBookModal(false);
      setBookNotes('');
      loadPatientData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handlePatientCancel = async (aptId: string) => {
    if (!confirm(isAr ? 'هل تود بالتأكيد إلغاء هذا الموعد؟' : 'Are you sure you want to cancel this appointment?')) return;
    try {
      await api.cancelAppointment(aptId, 'Cancelled directly by patient via portal', currentUser);
      setMessage({
        type: 'success',
        text: isAr ? 'تم إلغاء الموعد بناءً على رغبتك' : 'Appointment cancelled successfully'
      });
      loadPatientData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (!patient) {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500">
        <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p>{isAr ? 'لم يتم العثور على سجل مريض مرتبط بهذا الحساب' : 'No linked patient record found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Greeting & Verified Health ID Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white p-6 rounded-xl shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-teal-500/20 border-2 border-teal-400 flex items-center justify-center text-teal-300 font-bold text-xl">
              {patient.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/30 text-teal-200 border border-teal-400/30 uppercase tracking-wider">
                  {isAr ? 'بوابة المريض الرقمية الآمنة' : 'Secure Patient Portal'}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-300 font-mono">MRN: {patient.mrn}</span>
              </div>
              <h2 className="text-2xl font-bold mt-1 text-white">{patient.fullName}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                <span>{isAr ? 'الرقم الوطني:' : 'National ID:'} <strong className="font-mono">{patient.nationalId}</strong></span>
                <span>·</span>
                <span>{isAr ? 'الهاتف:' : 'Phone:'} <strong className="font-mono">{patient.phone}</strong></span>
                <span>·</span>
                <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                  <Droplet className="w-3.5 h-3.5" />
                  <span>{patient.bloodGroup} ({isAr ? 'فصيلة دم مؤكدة' : 'Verified'})</span>
                </span>
              </div>
            </div>
          </div>

          {admission && (
            <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-lg border border-white/15 text-xs space-y-1">
              <div className="text-teal-300 font-bold flex items-center gap-1.5">
                <Baby className="w-4 h-4" />
                <span>{isAr ? 'إقامة إيوائية نشطة' : 'Active Inpatient Stay'}</span>
              </div>
              <div>{isAr ? 'رقم الإيواء:' : 'Admission:'} <strong className="font-mono">{admission.admissionId}</strong></div>
              <div>{isAr ? 'الغرفة:' : 'Room:'} {admission.roomNumber} ({admission.roomType.toUpperCase()})</div>
              <div>{isAr ? 'الاستشاري المشرف:' : 'Attending:'} {admission.attendingConsultantName}</div>
            </div>
          )}
        </div>
      </div>

      {/* Action Notification */}
      {message && (
        <div className={`p-4 rounded-lg text-xs flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span className="font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'records'
              ? 'border-teal-600 text-teal-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{isAr ? 'سجلاتي الطبية والتحاليل' : 'My Health & Lab Results'}</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'appointments'
              ? 'border-teal-600 text-teal-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{isAr ? 'مواعيدي وعياداتي' : 'My Appointments'}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 font-mono text-[10px] text-slate-600">
            {patientAppointments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('stay_summary')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'stay_summary'
              ? 'border-teal-600 text-teal-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isAr ? 'ملخص الإقامة وورقة الخروج' : 'Stay Summary & Discharge'}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-teal-100 font-mono text-[10px] text-teal-800 font-bold">
            PDF
          </span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'billing'
              ? 'border-teal-600 text-teal-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{isAr ? 'الفاتورة المالية المبدئية' : 'Provisional Invoice & Bill'}</span>
        </button>
      </div>

      {/* TAB 1: Medical Records & Lab Results */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          {/* Allergies & Chronic Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs">
              <h4 className="font-bold text-rose-900 flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{isAr ? 'الحساسية الدوائية المسجلة' : 'Documented Drug Allergies'}</span>
              </h4>
              <ul className="space-y-1 list-disc list-inside text-rose-800">
                {patient.allergies.length > 0 ? (
                  patient.allergies.map((all, i) => <li key={i}>{all}</li>)
                ) : (
                  <li>{isAr ? 'لا توجد حساسية دوائية مسجلة (NKDA)' : 'No Known Drug Allergies (NKDA)'}</li>
                )}
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'الأمراض والمتابعات المزمنة' : 'Chronic Conditions'}</span>
              </h4>
              <ul className="space-y-1 list-disc list-inside text-slate-700">
                {patient.chronicConditions.length > 0 ? (
                  patient.chronicConditions.map((cond, i) => <li key={i}>{cond}</li>)
                ) : (
                  <li>{isAr ? 'لا توجد أمراض مزمنة مقيدة' : 'No Chronic Illnesses Documented'}</li>
                )}
              </ul>
            </div>
          </div>

          {/* Verified Laboratory Results */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'نتائج الفحوصات والتحاليل المخبرية المعتمدة' : 'Verified Diagnostic Lab Results'}</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {labOrders.filter(l => l.status === 'approved').length} {isAr ? 'فحوصات معتمدة' : 'approved tests'}
              </span>
            </div>

            <div className="space-y-4">
              {labOrders.filter(l => l.status === 'approved').map(order => (
                <div key={order.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 p-3 flex items-center justify-between border-b border-slate-200 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{order.testName}</span>
                      <span className="text-slate-400 mx-2">·</span>
                      <span className="text-slate-500 font-mono">{order.orderTime.split('T')[0]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {isAr ? 'معتمد رسمياً' : 'Officially Approved'}
                      </span>
                      <span className="text-slate-500 text-[11px]">{order.approvedBy}</span>
                    </div>
                  </div>

                  <div className="p-3 overflow-x-auto">
                    <table className="w-full text-left rtl:text-right text-xs">
                      <thead className="text-slate-500 font-semibold border-b border-slate-100">
                        <tr>
                          <th className="py-2 px-3">{isAr ? 'المؤشر المخبري' : 'Test Parameter'}</th>
                          <th className="py-2 px-3">{isAr ? 'النتيجة الفورية' : 'Observed Value'}</th>
                          <th className="py-2 px-3">{isAr ? 'المعدل الطبيعي المرجعي' : 'Reference Range'}</th>
                          <th className="py-2 px-3">{isAr ? 'التقييم السريري' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.results.map((res, idx) => (
                          <tr key={idx} className={res.isAbnormal ? 'bg-amber-50/40' : ''}>
                            <td className="py-2 px-3 font-medium text-slate-800">{res.name}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">
                              {res.value} {res.unit}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500">{res.refRange}</td>
                            <td className="py-2 px-3">
                              {res.isCritical ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                  {isAr ? 'قيمة حرجة' : 'Critical Value'}
                                </span>
                              ) : res.isAbnormal ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  {isAr ? 'خارج المعدل الطبيعي' : 'Abnormal'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {isAr ? 'طبيعي' : 'Normal'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Inpatient Medications */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Pill className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'الأدوية الموصوفة وجدول الجرعات' : 'Current Prescribed Medications'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {medications.filter(m => m.status === 'active').map(med => (
                <div key={med.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900">{med.tradeName} ({med.genericName})</span>
                    <span className="font-mono text-[11px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                      {med.route}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    {isAr ? 'الجرعة:' : 'Dose:'} <strong>{med.dose}</strong> · {med.frequency}
                  </div>
                  {med.instructions && (
                    <div className="text-slate-500 italic text-[11px]">"{med.instructions}"</div>
                  )}
                  <div className="text-[10px] text-slate-400">
                    {isAr ? 'وصف بواسطة:' : 'Prescribed by:'} {med.prescribedBy}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Appointments */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {isAr ? 'مواعيدك القادمة والسابقة' : 'My Clinical Appointments'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'يمكنك حجز موعد جديد أو إلغاء موعد قائم مباشرة من هنا' : 'Book new consultations or manage scheduled visits'}
              </p>
            </div>

            <button
              onClick={() => setShowBookModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'حجز موعد جديد' : 'Book Appointment'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {patientAppointments.map(apt => (
              <div key={apt.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{apt.appointmentNumber}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                      {apt.visitType.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      apt.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      apt.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      apt.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {apt.status}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-800 text-sm">{apt.doctorName} ({apt.department})</div>

                  <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      {apt.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {apt.timeSlot} ({apt.durationMinutes} min)
                    </span>
                  </div>

                  {apt.notes && <div className="text-slate-500 italic">"{apt.notes}"</div>}
                </div>

                {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      onClick={() => handlePatientCancel(apt.id)}
                      className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded text-xs font-semibold transition-colors"
                    >
                      {isAr ? 'إلغاء الموعد' : 'Cancel Appointment'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2.5: Inpatient Stay & Discharge Summary */}
      {activeTab === 'stay_summary' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 no-print">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'ملخص الإقامة السريرية وورقة الخروج الرسمية' : 'Inpatient Stay Summary & Discharge Record'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isAr 
                  ? 'تقرير طبي معتمد يوثق مدة الإقامة بالمستشفى، والتشخيص النهائي، وجدول أدوية الخروج، وتعليمات المتابعة المنزلية' 
                  : 'Certified discharge medical summary including stay dates, final diagnosis, take-home prescription, and aftercare'}
              </p>
            </div>

            {admission && (
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-bold shadow-xs cursor-pointer"
                title={isAr ? 'طباعة أو حفظ التقرير كملف PDF' : 'Print or save summary as PDF'}
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? 'طباعة التقرير (PDF)' : 'Print Summary (PDF)'}</span>
              </button>
            )}
          </div>

          {!admission ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-xs text-slate-400 space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p>{isAr ? 'لا توجد إقامة سريرية نشطة أو مؤرشفة لهذا الحساب حالياً.' : 'No inpatient stay records currently registered for this account.'}</p>
            </div>
          ) : (
            <div 
              id="hmis-stay-summary-print-area" 
              className="bg-white rounded-xl border border-slate-300 shadow-md p-6 sm:p-8 font-sans print:border-none print:shadow-none print:p-0 text-xs print:text-[10pt]"
            >
              {/* Header Letterhead */}
              <div className="border-b-2 border-slate-800 pb-3 mb-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-700">
                    {isAr ? 'دولة ليبيا • وزارة الصحة • مستشفى الأمل التخصصي' : 'State of Libya • Ministry of Health • Al-Amal Hospital'}
                  </div>
                  <h2 className="text-base font-black text-slate-950">
                    {isAr ? 'ملخص فترة الإقامة السريرية وسجل الخروج الطبي' : 'Inpatient Stay & Discharge Medical Summary'}
                  </h2>
                  <div className="text-[10px] text-teal-800 font-mono">
                    MOH-LY-2026/8841 • {isAr ? 'قسم النساء والولادة والإيواء' : 'Obstetrics & Gynecology Inpatient Care'}
                  </div>
                </div>

                <div className="text-end space-y-1">
                  <div className="inline-block p-1 bg-slate-50 border border-slate-200 rounded">
                    {(() => {
                      const barcode = generateCode128Svg(`ADM-${admission.admissionId}`, 24, 1.3);
                      return (
                        <svg
                          viewBox={`0 0 ${barcode.totalWidth} 24`}
                          className="h-6 w-auto mx-auto"
                          dangerouslySetInnerHTML={{ __html: barcode.svgBars }}
                        />
                      );
                    })()}
                    <div className="text-[9px] font-mono font-bold text-slate-800 text-center mt-0.5">
                      ADM-{admission.admissionId}
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    MRN: {patient?.mrn || targetMrn}
                  </div>
                </div>
              </div>

              {/* Stay Demographics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'اسم المريضة:' : 'Patient Name:'}</span>
                  <strong className="text-slate-900 font-bold block">{patient?.fullName || currentUser.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'تاريخ الدخول:' : 'Admission Date:'}</span>
                  <span className="text-slate-900 font-mono">{admission.admissionDate.split('T')[0]}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'تاريخ الخروج:' : 'Discharge Date:'}</span>
                  <span className="text-slate-900 font-mono">
                    {dischargeSummary?.dischargeDate ? dischargeSummary.dischargeDate.split('T')[0] : new Date().toISOString().split('T')[0]}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'الاستشاري المعالج المشرف:' : 'Attending Consultant:'}</span>
                  <strong className="text-slate-900 font-bold block">{admission.attendingConsultantName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'الغرفة والسرير:' : 'Room & Bed:'}</span>
                  <span className="text-slate-900">{isAr ? 'غرفة' : 'Rm'} {admission.roomNumber} - {admission.bedId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'فصيلة الدم:' : 'Blood Group:'}</span>
                  <span className="font-bold text-rose-700">{patient?.bloodGroup || 'O+'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'حالة براءة الذمة:' : 'Clearance Status:'}</span>
                  <span className="text-emerald-700 font-bold">
                    {isAr ? '✓ خالص الذمة ومستوفى الإجراءات' : '✓ Cleared & Authorized'}
                  </span>
                </div>
              </div>

              {/* Diagnoses & Hospital Course */}
              <div className="space-y-3 mb-4">
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-bold mb-1">
                    {isAr ? 'التشخيص النهائي عند الخروج (Final Diagnosis):' : 'Final Diagnosis:'}
                  </span>
                  <p className="text-slate-900 font-bold">
                    {dischargeSummary?.finalDiagnosis || (isAr ? 'ولادة قيصرية سفلى ناجحة، فترة ما بعد الجراحة خالية تماماً من المضاعفات' : 'Delivered single live infant via LSCS, post-op uncomplicated')}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-bold mb-1">
                    {isAr ? 'ملخص سير الحالة العلاجي أثناء الإيواء:' : 'Treatment & Hospital Course:'}
                  </span>
                  <p className="text-slate-800 leading-relaxed">
                    {dischargeSummary?.treatmentAndHospitalCourse || (isAr ? 'تنويم المريضة عبر الطوارئ، إجراء عملية قيصرية طارئة سفلى، تلقي المضادات الحيوية والمسكنات الوريدية، والتعافي التام مع حركة طبيعية وعلامات حيوية مستقرة.' : 'Admitted, underwent LSCS, received antibiotics and analgesia, uneventful recovery.')}
                  </p>
                </div>
              </div>

              {/* Take-Home Medications Table */}
              <div className="border border-slate-300 rounded overflow-hidden mb-4">
                <div className="bg-teal-900 text-white px-3 py-1.5 font-bold text-[11px] flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5" />
                  <span>{isAr ? 'جدول أدوية الخروج الموصوفة للمنزل (Take-Home Prescriptions)' : 'Discharge Medications'}</span>
                </div>
                <table className="w-full text-start border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="p-2 text-start">{isAr ? 'اسم الدواء' : 'Medication'}</th>
                      <th className="p-2 text-start">{isAr ? 'الجرعة والتكرار' : 'Dose & Frequency'}</th>
                      <th className="p-2 text-start">{isAr ? 'المدة' : 'Duration'}</th>
                      <th className="p-2 text-start">{isAr ? 'إرشادات الاستخدام' : 'Instructions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-900">Cefixime 400mg</td>
                      <td className="p-2">قرص واحد يومياً بالفم</td>
                      <td className="p-2 font-mono">5 أيام</td>
                      <td className="p-2 text-slate-700">مضاد حيوي وقائي، يؤخذ بعد الأكل، يجب إكمال العبوة بالكامل</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-900">Paracetamol 1000mg</td>
                      <td className="p-2">قرص كل 8 ساعات</td>
                      <td className="p-2 font-mono">عند اللزوم</td>
                      <td className="p-2 text-slate-700">لتسكين الألم وخفض الحرارة، مع شرب كمية كافية من الماء</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-900">Iron + Folic Acid</td>
                      <td className="p-2">كبسولة واحدة صباحاً</td>
                      <td className="p-2 font-mono">شهر كامل</td>
                      <td className="p-2 text-slate-700">مكمل حديد لتعويض الدم، يفضل تناوله مع عصير برتقال</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Aftercare & Clinic Follow-up */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-[11px]">
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-slate-700 font-bold block mb-1">
                    {isAr ? 'إرشادات العناية بالجرح والنظافة المنزلية:' : 'Aftercare Instructions:'}
                  </span>
                  <p className="text-slate-700 leading-relaxed text-[10.5px]">
                    {dischargeSummary?.aftercareInstructions || (isAr ? 'الحفاظ على جرح العملية نظيفاً وجافاً، تجنب المجهود الشاق وحمل الأثقال لمدة 6 أسابيع، والإكثار من شرب السوائل والتغذية المتوازنة.' : 'Keep incision clean and dry, avoid strenuous lifting, maintain hydration.')}
                  </p>
                </div>

                <div className="bg-teal-50 border border-teal-200 p-3 rounded text-teal-950">
                  <span className="text-teal-900 font-bold block mb-1">
                    {isAr ? 'موعد المراجعة بالعيادة التخصصية:' : 'Clinic Follow-up Appointment:'}
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-teal-900 mt-1">
                    <Calendar className="w-4 h-4 text-teal-700" />
                    <span>{dischargeSummary?.followUpDate || '2026-11-14'} (10:00 AM)</span>
                  </div>
                  <div className="text-[10px] text-teal-800 mt-1">
                    {isAr ? `عيادة استشاري النساء والتوليد (${admission.attendingConsultantName}) لفحص الجرح وإزالة الغرز الجراحية ومتابعة المولود.` : 'Postpartum follow-up & suture review clinic.'}
                  </div>
                </div>
              </div>

              {/* Red Flags Emergency Warning */}
              <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-rose-950 text-[10.5px]">
                <div className="flex items-center gap-1.5 font-bold text-rose-900 mb-1">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{isAr ? 'علامات الخطر التي تستوجب التوجه الفوري لقسم طوارئ المستشفى:' : 'Emergency Red Flags Requiring Immediate Return:'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] text-rose-900 ps-5">
                  <div>• {isAr ? 'ارتفاع درجة الحرارة فوق 38° مئوية أو قشعريرة شديدة' : 'Fever > 38°C or chills'}</div>
                  <div>• {isAr ? 'نزيف مهبلي مفاجئ غزير أو خروج تجلطات كبيرة' : 'Heavy bleeding or large clots'}</div>
                  <div>• {isAr ? 'احمرار شديد، انتفاخ، أو خروج إفرازات من جرح العملية' : 'Wound erythema, swelling or discharge'}</div>
                  <div>• {isAr ? 'ألم حاد ومستمر في البطن أو ألم مفاجئ بالصدر والساق' : 'Severe persistent pain or chest/leg pain'}</div>
                </div>
                <div className="mt-1.5 pt-1 border-t border-rose-200 text-[9.5px] font-mono text-rose-800 flex items-center justify-between">
                  <span>{isAr ? 'طوارئ مستشفى الأمل للنساء والولادة 24/7' : 'Hospital Emergency 24/7'}</span>
                  <strong>{isAr ? 'هاتف الطوارئ: 8891 444 21 218+' : 'Tel: +218 21 444 8891'}</strong>
                </div>
              </div>

              {/* Signatures & Accreditation Footer */}
              <div className="mt-4 pt-3 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                <div>
                  {isAr ? 'الاستشاري المعالج:' : 'Attending:'} {admission.attendingConsultantName} [خاتم إلكتروني معتمد]
                </div>
                <div>
                  {isAr ? 'مستند إلكتروني رسمي • مستشفى الأمل التخصصي' : 'Official Electronic Record • Al-Amal Hospital'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Provisional Inpatient Invoice */}
      {activeTab === 'billing' && invoice && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-200 gap-3">
            <div>
              <div className="text-xs text-teal-700 font-bold uppercase tracking-wider">
                {isAr ? 'مستشفى الأمل التخصصي للنساء والولادة' : 'Al-Amal Specialized Hospital'}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                {isAr ? 'كشف الحساب والفوترة المبدئية للإقامة الإيوائية' : 'Provisional Inpatient Bill'}
              </h3>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                {isAr ? 'وقت القطع المالي المعتمد:' : 'Financial Cutoff Time:'} <strong>{invoice.cutoffTime}</strong>
              </div>
            </div>

            <div className="text-right rtl:text-left bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500">{isAr ? 'الرصيد المبدئي المستحق:' : 'Provisional Balance Due:'}</div>
              <div className="text-xl font-bold font-mono text-emerald-700">
                {invoice.provisionalBalanceDue.toLocaleString()} د.ل
              </div>
              <div className="text-[11px] text-slate-400">
                {isAr ? 'سُدد منها:' : 'Paid:'} {invoice.totalPaymentsReceived} د.ل
              </div>
            </div>
          </div>

          {/* Package details */}
          {invoice.packageApplied && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3.5 text-xs text-teal-900">
              <div className="font-bold">{isAr ? 'الباقة الطبية المطبقة:' : 'Applied Package:'} {invoice.packageApplied.packageName}</div>
              <div className="font-mono mt-0.5">{isAr ? 'سعر الباقة الشاملة:' : 'Package Price:'} {invoice.packageApplied.packagePrice} د.ل</div>
              <div className="text-[11px] text-teal-700 mt-1">{invoice.packageApplied.includedUsedSummary}</div>
            </div>
          )}

          {/* Billing line items */}
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{isAr ? 'الخدمة / الإجراء / الدواء' : 'Description'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="py-2.5 px-3 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الإجمالي' : 'Total'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'التغطية' : 'Coverage'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {isAr ? item.descriptionAr : item.description}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{item.date}</td>
                    <td className="py-2.5 px-3 font-mono text-center">{item.quantity}</td>
                    <td className="py-2.5 px-3 font-mono">{item.unitPrice.toFixed(2)} د.ل</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{item.totalPrice.toFixed(2)} د.ل</td>
                    <td className="py-2.5 px-3">
                      {item.coveredByPackage ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                          {isAr ? 'مغطى بالباقة' : 'Package'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          {isAr ? 'إضافي' : 'Out-of-pocket'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mandatory Inpatient Disclaimer */}
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-amber-900 text-xs leading-relaxed">
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>{isAr ? 'إشعار الفاتورة المبدئية الإلزامي (سياسة المستشفى)' : 'Mandatory Provisional Bill Disclaimer'}</span>
            </div>
            <p className="text-[11px]">{isAr ? invoice.mandatoryNoticeAr : invoice.mandatoryNoticeEn}</p>
          </div>
        </div>
      )}

      {/* MODAL: Patient Book Appointment */}
      {showBookModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'حجز موعد استشارة جديدة' : 'Book New Consultation'}</span>
              </h3>
              <button onClick={() => setShowBookModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePatientBook} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'تاريخ الموعد' : 'Date'} *</label>
                <input
                  type="date"
                  required
                  value={bookDate}
                  onChange={e => setBookDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'التوقيت المفضل' : 'Preferred Time'} *</label>
                <select
                  value={bookTimeSlot}
                  onChange={e => setBookTimeSlot(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                >
                  <option value="09:00">09:00 AM</option>
                  <option value="09:30">09:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="16:30">04:30 PM</option>
                  <option value="17:00">05:00 PM</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'نوع الزيارة' : 'Visit Type'}</label>
                <select
                  value={bookVisitType}
                  onChange={e => setBookVisitType(e.target.value as AppointmentVisitType)}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                >
                  <option value="antenatal">{isAr ? 'متابعة حمل دورية' : 'Antenatal Check'}</option>
                  <option value="post_op">{isAr ? 'متابعة ما بعد الولادة والجراحة' : 'Post-Op Follow-up'}</option>
                  <option value="ultrasound">{isAr ? 'تصوير سونار وإيكو جنين' : 'Ultrasound Scan'}</option>
                  <option value="consultation">{isAr ? 'استشارة عامة' : 'General Consultation'}</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'الشكوى أو الاستفسار' : 'Reason / Inquiries'}</label>
                <textarea
                  rows={2}
                  value={bookNotes}
                  onChange={e => setBookNotes(e.target.value)}
                  placeholder={isAr ? 'اكتبي باختصار سبب طلب الموعد...' : 'Brief reason for appointment...'}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded text-xs text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold"
                >
                  {isAr ? 'تأكيد طلب الموعد' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
