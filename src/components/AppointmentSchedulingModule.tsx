import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Stethoscope, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  CalendarDays, 
  ChevronRight, 
  ChevronLeft,
  X,
  Edit2,
  FileText,
  UserCheck,
  Building2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { 
  Appointment, 
  AppointmentVisitType, 
  AppointmentStatus, 
  Patient, 
  SystemUser, 
  Language 
} from '../types/hmis.ts';
import { api } from '../api/client.ts';

interface AppointmentProps {
  currentUser: SystemUser;
  patients: Patient[];
  language: Language;
  onOpenPatientEMR?: (patientMrn: string) => void;
}

const AVAILABLE_SLOTS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', 
  '11:30', '12:00', '12:30', '13:00', '13:30', '14:00',
  '16:00', '16:30', '17:00', '17:30', '18:00'
];

export function AppointmentSchedulingModule({ 
  currentUser, 
  patients, 
  language,
  onOpenPatientEMR 
}: AppointmentProps) {
  const isAr = language === 'ar';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showBookModal, setShowBookModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states - Booking
  const [bookPatientMrn, setBookPatientMrn] = useState('');
  const [bookDoctorId, setBookDoctorId] = useState('usr-1');
  const [bookDate, setBookDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookTimeSlot, setBookTimeSlot] = useState('09:30');
  const [bookDuration, setBookDuration] = useState(30);
  const [bookVisitType, setBookVisitType] = useState<AppointmentVisitType>('antenatal');
  const [bookNotes, setBookNotes] = useState('');

  // Form states - Reschedule
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('10:00');

  // Form states - Cancel
  const [cancelReason, setCancelReason] = useState('');

  const doctorsList = [
    { id: 'usr-1', name: 'Dr. Tarek Ben-Amer', nameAr: 'د. طارق بن عامر', dept: 'Obstetrics & Gynecology' },
    { id: 'usr-2', name: 'Dr. Huda Al-Mansouri', nameAr: 'د. هدى المنصوري', dept: 'Obstetrics & Gynecology' },
    { id: 'usr-3', name: 'Dr. Adel Al-Fitouri', nameAr: 'د. عادل الفيتوري', dept: 'General & Laparoscopic Surgery' },
    { id: 'usr-4', name: 'Dr. Nader Al-Obeidi', nameAr: 'د. نادر العبيدي', dept: 'Anesthesia & Pain Management' },
    { id: 'usr-5', name: 'Dr. Maryam Al-Drissi', nameAr: 'د. مريم الدريسي', dept: 'Pediatrics & Neonatology' }
  ];

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAppointments();
      setAppointments(data);
    } catch (err: any) {
      console.error('Failed to load appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Filtered Appointments
  const filteredAppointments = appointments.filter(apt => {
    const matchesDoctor = selectedDoctorId === 'all' || apt.doctorId === selectedDoctorId;
    const matchesStatus = selectedStatus === 'all' || apt.status === selectedStatus;
    const matchesDate = !filterDate || apt.date === filterDate;
    const matchesSearch = 
      apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patientMrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.appointmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.doctorName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDoctor && matchesStatus && matchesDate && matchesSearch;
  });

  // Check collision for booking
  const isSlotCollision = (docId: string, date: string, slot: string, excludeId?: string) => {
    return appointments.some(
      a => a.doctorId === docId && 
           a.date === date && 
           a.timeSlot === slot && 
           a.status !== 'cancelled' &&
           a.id !== excludeId
    );
  };

  const collisionDetected = isSlotCollision(bookDoctorId, bookDate, bookTimeSlot);
  const rescheduleCollision = selectedAppointment ? isSlotCollision(selectedAppointment.doctorId, rescheduleDate, rescheduleTimeSlot, selectedAppointment.id) : false;

  // Handle Book
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.mrn === bookPatientMrn);
    if (!patient) {
      setNotification({ type: 'error', message: isAr ? 'يرجى اختيار مريض مسجل في المنظومة' : 'Please select an existing patient' });
      return;
    }
    const doc = doctorsList.find(d => d.id === bookDoctorId);
    if (!doc) return;

    if (collisionDetected) {
      setNotification({
        type: 'error',
        message: isAr 
          ? `تعارض في المواعيد: الطبيب لديه موعد محجوز مسبقاً في هذا التوقيت!` 
          : 'Double-booking conflict: Doctor is already booked in this slot!'
      });
      return;
    }

    try {
      await api.bookAppointment({
        patientMrn: patient.mrn,
        patientName: patient.fullName,
        patientPhone: patient.phone,
        doctorId: doc.id,
        doctorName: isAr ? doc.nameAr : doc.name,
        department: doc.dept,
        date: bookDate,
        timeSlot: bookTimeSlot,
        durationMinutes: bookDuration,
        visitType: bookVisitType,
        notes: bookNotes,
        createdBy: isAr ? currentUser.nameAr : currentUser.name
      }, currentUser);

      setNotification({
        type: 'success',
        message: isAr ? 'تم تأكيد حجز الموعد بنجاح وربطه بالملف الطبي' : 'Appointment booked and linked to patient file'
      });
      setShowBookModal(false);
      setBookNotes('');
      loadAppointments();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // Handle Reschedule
  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    if (rescheduleCollision) {
      setNotification({
        type: 'error',
        message: isAr ? 'تعارض: الطبيب لديه حجز آخر في هذا التاريخ والتوقيت' : 'Conflict: Doctor already booked in this slot'
      });
      return;
    }

    try {
      await api.rescheduleAppointment(selectedAppointment.id, rescheduleDate, rescheduleTimeSlot, currentUser);
      setNotification({
        type: 'success',
        message: isAr ? 'تم إعادة جدولة الموعد بنجاح وتحديث الإشعار' : 'Appointment rescheduled successfully'
      });
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      loadAppointments();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // Handle Cancel
  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    try {
      await api.cancelAppointment(selectedAppointment.id, cancelReason || 'Cancelled by staff', currentUser);
      setNotification({
        type: 'success',
        message: isAr ? 'تم إلغاء الموعد وتوثيق سبب الإلغاء' : 'Appointment cancelled with logged reason'
      });
      setShowCancelModal(false);
      setSelectedAppointment(null);
      setCancelReason('');
      loadAppointments();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">{isAr ? 'مؤكد' : 'Confirmed'}</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">{isAr ? 'قيد الكشف' : 'In Progress'}</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">{isAr ? 'مكتمل' : 'Completed'}</span>;
      case 'rescheduled':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">{isAr ? 'مجدول مجدداً' : 'Rescheduled'}</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">{isAr ? 'ملغي' : 'Cancelled'}</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{isAr ? 'محجوز' : 'Scheduled'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-700 font-semibold text-xs tracking-wider uppercase mb-1">
            <CalendarDays className="w-4 h-4" />
            <span>{isAr ? 'جدولة العيادات والمواعيد التخصصية' : 'Outpatient & Maternity Scheduling'}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {isAr ? 'حجز وإدارة مواعيد العيادات والاستشارات' : 'Patient Appointment Scheduling Module'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAr 
              ? 'حجز مواعيد جديدة، فحص ومنع تعارض أوقات الأطباء، وإعادة الجدولة والإلغاء مع الربط الكامل بالملف الطبي للمريض' 
              : 'Book outpatient consultations, prevent doctor double-booking, reschedule, and integrate with Central EMR'}
          </p>
        </div>

        <button
          onClick={() => {
            if (patients.length > 0) setBookPatientMrn(patients[0].mrn);
            setShowBookModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'حجز موعد جديد' : 'Book New Appointment'}</span>
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-lg text-xs flex items-center justify-between ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-medium text-slate-500 mb-1">{isAr ? 'إجمالي المواعيد' : 'Total Appointments'}</div>
          <div className="text-2xl font-bold font-mono text-slate-900">{appointments.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">{isAr ? 'في كافة العيادات' : 'Across all clinics'}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-medium text-slate-500 mb-1">{isAr ? 'مواعيد مؤكدة وقادمة' : 'Confirmed & Upcoming'}</div>
          <div className="text-2xl font-bold font-mono text-teal-700">
            {appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{isAr ? 'بانتظار وصول المرضى' : 'Awaiting patient arrival'}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-medium text-slate-500 mb-1">{isAr ? 'استشارات مكتملة' : 'Completed Consultations'}</div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {appointments.filter(a => a.status === 'completed').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{isAr ? 'تم فحصهم وتوثيق نتائجهم' : 'Examined & documented'}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-medium text-slate-500 mb-1">{isAr ? 'ملغية أو معادة الجدولة' : 'Rescheduled / Cancelled'}</div>
          <div className="text-2xl font-bold font-mono text-slate-600">
            {appointments.filter(a => a.status === 'cancelled' || a.status === 'rescheduled').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{isAr ? 'محدثة مع أسباب التغيير' : 'With documented reason'}</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={isAr ? 'بحث برقم الموعد، اسم المريض، أو MRN...' : 'Search by appointment #, patient, or MRN...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">{isAr ? 'الطبيب:' : 'Doctor:'}</span>
            <select
              value={selectedDoctorId}
              onChange={e => setSelectedDoctorId(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-md text-xs"
            >
              <option value="all">{isAr ? 'كافة الأطباء' : 'All Doctors'}</option>
              {doctorsList.map(doc => (
                <option key={doc.id} value={doc.id}>{isAr ? doc.nameAr : doc.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">{isAr ? 'الحالة:' : 'Status:'}</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-md text-xs"
            >
              <option value="all">{isAr ? 'كافة الحالات' : 'All Statuses'}</option>
              <option value="scheduled">{isAr ? 'محجوز' : 'Scheduled'}</option>
              <option value="confirmed">{isAr ? 'مؤكد' : 'Confirmed'}</option>
              <option value="completed">{isAr ? 'مكتمل' : 'Completed'}</option>
              <option value="rescheduled">{isAr ? 'مجدول مجدداً' : 'Rescheduled'}</option>
              <option value="cancelled">{isAr ? 'ملغي' : 'Cancelled'}</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">{isAr ? 'التاريخ:' : 'Date:'}</span>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono"
            />
            {filterDate && (
              <button onClick={() => setFilterDate('')} className="text-slate-400 hover:text-slate-600 text-xs">
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>
        </div>

        <div className="text-slate-500 font-mono text-xs">
          {isAr ? 'المعروض:' : 'Showing:'} <strong className="text-slate-900">{filteredAppointments.length}</strong> {isAr ? 'موعد' : 'appointments'}
        </div>
      </div>

      {/* Appointments List / Grid */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">{isAr ? 'رقم الموعد' : 'Appointment #'}</th>
                <th className="py-3 px-4">{isAr ? 'المريض والملف الطبي' : 'Patient & MRN'}</th>
                <th className="py-3 px-4">{isAr ? 'الطبيب والعيادة' : 'Doctor & Specialty'}</th>
                <th className="py-3 px-4">{isAr ? 'التاريخ والتوقيت' : 'Date & Time Slot'}</th>
                <th className="py-3 px-4">{isAr ? 'نوع الزيارة' : 'Visit Type'}</th>
                <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-4">{isAr ? 'ملاحظات' : 'Notes'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    {isAr ? 'لا توجد مواعيد مطابقة لمعايير البحث المحددة' : 'No appointments matching search criteria'}
                  </td>
                </tr>
              ) : (
                filteredAppointments.map(apt => (
                  <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {apt.appointmentNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{apt.patientName}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] text-teal-700 bg-teal-50 px-1 rounded border border-teal-200">
                          {apt.patientMrn}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">{apt.patientPhone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{apt.doctorName}</div>
                      <div className="text-[11px] text-slate-500">{apt.department}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-teal-600" />
                        <span>{apt.date}</span>
                      </div>
                      <div className="font-mono text-slate-600 text-[11px] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{apt.timeSlot} ({apt.durationMinutes} min)</span>
                      </div>
                      {apt.rescheduledFromDate && (
                        <div className="text-[10px] text-purple-700 font-mono mt-0.5">
                          {isAr ? 'معدل من:' : 'Was:'} {apt.rescheduledFromDate} {apt.rescheduledFromSlot}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 capitalize">
                        {apt.visitType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(apt.status)}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 max-w-[180px] truncate">
                      {apt.notes || '--'}
                      {apt.cancellationReason && (
                        <div className="text-rose-600 italic font-medium mt-0.5">
                          {isAr ? 'سبب الإلغاء:' : 'Cancelled:'} {apt.cancellationReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Open EMR Record */}
                        {onOpenPatientEMR && (
                          <button
                            onClick={() => onOpenPatientEMR(apt.patientMrn)}
                            title={isAr ? 'فتح الملف الطبي للمريض' : 'Open Patient EMR'}
                            className="p-1 text-teal-700 hover:bg-teal-50 rounded"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Reschedule Button */}
                        {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                          <button
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setRescheduleDate(apt.date);
                              setRescheduleTimeSlot(apt.timeSlot);
                              setShowRescheduleModal(true);
                            }}
                            title={isAr ? 'إعادة جدولة الموعد' : 'Reschedule'}
                            className="p-1 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Cancel Button */}
                        {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                          <button
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setShowCancelModal(true);
                            }}
                            title={isAr ? 'إلغاء الموعد' : 'Cancel Appointment'}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Book Appointment */}
      {showBookModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'حجز موعد عيادة جديد' : 'Book Outpatient Appointment'}</span>
              </h3>
              <button onClick={() => setShowBookModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="p-4 space-y-4 text-xs">
              {/* Patient Selector */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {isAr ? 'المريض المستهدف (من السجل الطبي المركزي)' : 'Select Patient (From Central EMR)'} *
                </label>
                <select
                  required
                  value={bookPatientMrn}
                  onChange={e => setBookPatientMrn(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                >
                  {patients.map(p => (
                    <option key={p.mrn} value={p.mrn}>
                      {p.fullName} ({p.mrn} · {p.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor Selector */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {isAr ? 'الطبيب المعالج' : 'Doctor'} *
                </label>
                <select
                  required
                  value={bookDoctorId}
                  onChange={e => setBookDoctorId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                >
                  {doctorsList.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {isAr ? doc.nameAr : doc.name} ({doc.dept})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Slot */}
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'الوقت المتاح' : 'Time Slot'} *</label>
                  <select
                    value={bookTimeSlot}
                    onChange={e => setBookTimeSlot(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  >
                    {AVAILABLE_SLOTS.map(slot => {
                      const taken = isSlotCollision(bookDoctorId, bookDate, slot);
                      return (
                        <option key={slot} value={slot} disabled={taken}>
                          {slot} {taken ? (isAr ? '(محجوز!)' : '(Booked)') : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Live Collision Warning */}
              {collisionDetected && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    {isAr 
                      ? 'تنبيه تعارض: هذا الطبيب لديه موعد محجوز مسبقاً في هذا التوقيت! يرجى اختيار وقت آخر.' 
                      : 'Conflict: The selected doctor is already booked at this time. Please select another slot.'}
                  </span>
                </div>
              )}

              {/* Visit Type & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'نوع الزيارة' : 'Visit Type'}</label>
                  <select
                    value={bookVisitType}
                    onChange={e => setBookVisitType(e.target.value as AppointmentVisitType)}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  >
                    <option value="antenatal">{isAr ? 'متابعة حمل (Antenatal)' : 'Antenatal Check'}</option>
                    <option value="consultation">{isAr ? 'استشارة طبية أولى (Consultation)' : 'New Consultation'}</option>
                    <option value="ultrasound">{isAr ? 'تصوير موجات صوتية التراساوند' : 'Ultrasound Scan'}</option>
                    <option value="post_op">{isAr ? 'متابعة ما بعد العملية (Post-Op)' : 'Post-Operative Follow-up'}</option>
                    <option value="follow_up">{isAr ? 'متابعة روتينية (Follow-up)' : 'Routine Follow-up'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'المدة التقديرية (دقيقة)' : 'Duration (min)'}</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={bookDuration}
                    onChange={e => setBookDuration(parseInt(e.target.value) || 30)}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'ملاحظات الشكوى أو الفحص' : 'Clinical Notes / Reason'}</label>
                <textarea
                  rows={2}
                  value={bookNotes}
                  onChange={e => setBookNotes(e.target.value)}
                  placeholder={isAr ? 'مثال: فحص دوري للأسبوع 36، متابعة نسبة السكر، إيكو الجنين...' : 'Reason for visit...'}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-50"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={collisionDetected}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  {isAr ? 'تأكيد الحجز' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reschedule Appointment */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {isAr ? `إعادة جدولة موعد: ${selectedAppointment.appointmentNumber}` : `Reschedule: ${selectedAppointment.appointmentNumber}`}
              </h3>
              <button onClick={() => setShowRescheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-2.5 rounded text-slate-600">
              <div>{isAr ? 'المريض:' : 'Patient:'} <strong>{selectedAppointment.patientName}</strong></div>
              <div>{isAr ? 'الطبيب:' : 'Doctor:'} {selectedAppointment.doctorName}</div>
              <div className="text-slate-400 text-[11px] mt-1 font-mono">
                {isAr ? 'الموعد الحالي:' : 'Current Slot:'} {selectedAppointment.date} {selectedAppointment.timeSlot}
              </div>
            </div>

            <form onSubmit={handleReschedule} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'التاريخ الجديد' : 'New Date'} *</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'التوقيت الجديد' : 'New Time Slot'} *</label>
                <select
                  value={rescheduleTimeSlot}
                  onChange={e => setRescheduleTimeSlot(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                >
                  {AVAILABLE_SLOTS.map(slot => {
                    const taken = isSlotCollision(selectedAppointment.doctorId, rescheduleDate, slot, selectedAppointment.id);
                    return (
                      <option key={slot} value={slot} disabled={taken}>
                        {slot} {taken ? (isAr ? '(محجوز)' : '(Booked)') : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {rescheduleCollision && (
                <div className="text-rose-600 text-xs font-medium bg-rose-50 p-2 rounded border border-rose-200">
                  {isAr ? 'تعارض: الطبيب محجوز في هذا التوقيت!' : 'Slot conflict: Doctor is booked!'}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={rescheduleCollision}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  {isAr ? 'تأكيد الجدولة' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cancel Appointment */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900 text-rose-600 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                <span>{isAr ? 'إلغاء حجز الموعد' : 'Cancel Appointment'}</span>
              </h3>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600">
              {isAr 
                ? `هل أنت متأكد من إلغاء موعد المريض "${selectedAppointment.patientName}" رقم ${selectedAppointment.appointmentNumber}؟`
                : `Are you sure you want to cancel appointment #${selectedAppointment.appointmentNumber} for ${selectedAppointment.patientName}?`}
            </p>

            <form onSubmit={handleCancel} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{isAr ? 'سبب الإلغاء (إلزامي للتدقيق)' : 'Cancellation Reason'} *</label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: طلب المريض، ظرف طارئ، اعتذار الطبيب...' : 'e.g. Patient requested, doctor emergency duty...'}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs"
                >
                  {isAr ? 'تراجع' : 'Back'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                >
                  {isAr ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
