import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  Printer, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Baby, 
  BedDouble, 
  Building2, 
  Calendar, 
  FileText, 
  ShieldAlert, 
  Stethoscope, 
  Heart,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Admission, Bed, Patient, SystemUser, Language, SmartAlert } from '../types/hmis.ts';

interface DailyHuddleSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissions: Admission[];
  beds: Bed[];
  patients: Patient[];
  currentUser: SystemUser;
  language: Language;
  onSelectAdmission: (adm: Admission) => void;
}

export const DailyHuddleSummaryModal: React.FC<DailyHuddleSummaryModalProps> = ({
  isOpen,
  onClose,
  admissions,
  beds,
  patients,
  currentUser,
  language,
  onSelectAdmission
}) => {
  if (!isOpen) return null;
  const isAr = language === 'ar';

  const todayStr = new Date().toISOString().split('T')[0];
  const currentTimeStr = '08:00 AM';

  // 1. Inpatient Census Metrics
  const activeAdmissions = admissions.filter(a => a.status === 'active');
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter(b => b.status === 'occupied').length;
  const vacantBeds = beds.filter(b => b.status === 'vacant').length;
  const cleaningBeds = beds.filter(b => b.status === 'cleaning').length;
  const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // 2. Expected Discharges Today (e.g. patients improved, postoperative Day 2/3, normal recovery)
  const expectedDischarges = activeAdmissions.filter((adm, idx) => {
    // For realistic simulation: Patients who have been admitted >= 2 days or indexed for discharge
    const pkg = adm.packageName?.toLowerCase() || '';
    return pkg.includes('طبيعية') || pkg.includes('normal') || idx === 0 || adm.roomNumber === '101';
  });

  // 3. Pending Admissions / Scheduled Today
  const pendingAdmissions = [
    {
      id: 'padm-1',
      patientName: 'عائشة مفتاح القذافي',
      mrn: 'MRN-2026-0884',
      age: 28,
      scheduledTime: '09:30 AM',
      doctorName: 'د. طارق بن عامر',
      indication: 'ولادة قيصرية ثانية مجدولة (Elective Repeat LSCS 39w)',
      assignedWard: 'جناح العمليات القيصرية (غرفة 104)',
      priority: 'high'
    },
    {
      id: 'padm-2',
      patientName: 'خديجة عبد السلام التائب',
      mrn: 'MRN-2026-0902',
      age: 32,
      scheduledTime: '11:00 AM',
      doctorName: 'د. هدى المنصوري',
      indication: 'تنويم لمراقبة سكري الحمل المعتمد على الأنسولين + صغر وزن الجنين',
      assignedWard: 'جناح الرعاية الخاصة بالأمومة (غرفة 202)',
      priority: 'medium'
    },
    {
      id: 'padm-3',
      patientName: 'ابتسام سالم بن علي',
      mrn: 'MRN-2026-0915',
      age: 24,
      scheduledTime: '01:30 PM',
      doctorName: 'د. عادل الفيتوري',
      indication: 'استئصال كيس مبيضي بالمنظار الجراحي (Diagnostic Laparoscopy)',
      assignedWard: 'قسم الجراحة النسائية اليومية (غرفة 106)',
      priority: 'medium'
    }
  ];

  // 4. High-Risk Patients Requiring Multi-Disciplinary Alert in Morning Huddle
  const highRiskPatients = activeAdmissions.filter((adm) => {
    const p = patients.find(pt => pt.mrn === adm.mrn);
    const allergies = p?.allergies || [];
    const hasSevereAllergy = allergies.some(a => !a.toLowerCase().includes('no known') && !a.toLowerCase().includes('nkda'));
    // Mark as high risk if admitted under emergency, blood group negative, or severe allergy, or intensive stays
    return adm.source === 'emergency' || hasSevereAllergy || p?.bloodGroup?.includes('-') || adm.admissionId.includes('4405');
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in duration-150">
        
        {/* Header (Letterhead style) */}
        <div className="bg-gradient-to-r from-teal-800 via-slate-900 to-indigo-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Users className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">
                  {isAr ? 'تقرير الاجتماع الصباحي للفريق الطبي (Daily Huddle Summary)' : 'Daily Morning Staff Huddle Summary'}
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30">
                  {todayStr} - {currentTimeStr}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAr 
                  ? 'مستند تسليم المناوبة الصباحية لإدارة الأسرّة، حالات الخروج المرتقبة، الدخول المجدول، والمرضى ذوي الخطورة العالية' 
                  : 'Official morning briefing: Bed census, expected discharges, pending elective admissions & high-risk maternal alerts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors border border-white/10 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-teal-300" />
              <span>{isAr ? 'طباعة التقرير' : 'Print Briefing'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
          
          {/* Section 1: Inpatient Census & Capacity Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-slate-500 text-[11px] block">{isAr ? 'إجمالي الأسرّة المرخصة:' : 'Total Beds:'}</span>
              <strong className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{totalBeds}</strong>
              <span className="text-[10px] text-slate-400 mt-1 block">{isAr ? 'الطاقة الاستيعابية الكاملة' : 'Licensed beds'}</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-slate-500 text-[11px] block">{isAr ? 'المنومات حالياً:' : 'Occupied Census:'}</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className="text-xl font-bold font-mono text-rose-700">{occupiedBeds}</strong>
                <span className="text-xs text-slate-500">({occupancyPercent}%)</span>
              </div>
              <span className="text-[10px] text-rose-600 font-medium mt-1 block">
                {occupancyPercent >= 80 ? (isAr ? 'ضغط إشغال مرتفع' : 'High Occupancy') : (isAr ? 'ضمن الحدود الآمنة' : 'Normal')}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-slate-500 text-[11px] block">{isAr ? 'أسرّة شاغرة فورية:' : 'Vacant Available:'}</span>
              <strong className="text-xl font-bold font-mono text-emerald-700 mt-0.5 block">{vacantBeds}</strong>
              <span className="text-[10px] text-emerald-700 font-medium mt-1 block">{isAr ? 'جاهزة لاستقبال الطوارئ' : 'Ready for admissions'}</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-slate-500 text-[11px] block">{isAr ? 'تحت التنظيف/التعقيم:' : 'Under Cleaning:'}</span>
              <strong className="text-xl font-bold font-mono text-amber-700 mt-0.5 block">{cleaningBeds}</strong>
              <span className="text-[10px] text-amber-700 mt-1 block">{isAr ? 'تجهيز لسرير جديد' : 'Turnover in progress'}</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-slate-500 text-[11px] block">{isAr ? 'خروج متوقع اليوم:' : 'Expected Discharges:'}</span>
              <strong className="text-xl font-bold font-mono text-teal-700 mt-0.5 block">{expectedDischarges.length}</strong>
              <span className="text-[10px] text-teal-700 font-medium mt-1 block">{isAr ? 'تحرير أسرّة للطوارئ' : 'Bed turnover today'}</span>
            </div>
          </div>

          {/* Section 2: Expected Discharges Table (حالات الخروج المتوقعة اليوم) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>{isAr ? '1. حالات الخروج المتوقعة والمخططة لليوم (Expected Discharges)' : 'Expected Discharges Today'}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  {expectedDischarges.length} {isAr ? 'حالات' : 'patients'}
                </span>
              </h3>
              <span className="text-[11px] text-slate-500">
                {isAr ? 'هدف الإخلاء: قبل الساعة 12:00 ظهراً لتجهيز الأسرة' : 'Target: Clear by 12:00 PM'}
              </span>
            </div>

            {expectedDischarges.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">{isAr ? 'لا توجد حالات خروج مؤكدة اليوم' : 'No discharges planned today.'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">{isAr ? 'المريضة' : 'Patient'}</th>
                      <th className="py-2 px-3">{isAr ? 'الغرفة والسرير' : 'Room & Bed'}</th>
                      <th className="py-2 px-3">{isAr ? 'الاستشاري المسؤول' : 'Consultant'}</th>
                      <th className="py-2 px-3">{isAr ? 'تاريخ الدخول' : 'Admission Date'}</th>
                      <th className="py-2 px-3">{isAr ? 'الباقة المطبقة' : 'Package'}</th>
                      <th className="py-2 px-3">{isAr ? 'الإجراء المطلوب' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expectedDischarges.map((adm) => (
                      <tr key={adm.admissionId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {adm.patientName}
                          <span className="font-mono text-[10px] text-slate-400 block font-normal">{adm.mrn}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-teal-800">
                          غرفة {adm.roomNumber} ({adm.roomType.toUpperCase()})
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {adm.attendingConsultantName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {adm.admissionDate.split('T')[0]}
                        </td>
                        <td className="py-2.5 px-3 text-indigo-700 font-medium">
                          {adm.packageName || (isAr ? 'رسوم علاجية فردية' : 'Itemized')}
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectAdmission(adm);
                              onClose();
                            }}
                            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded font-semibold text-[11px] transition-colors"
                          >
                            {isAr ? 'فتح ملف الخروج' : 'Open Discharge'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Pending Admissions Scheduled Today (حالات الدخول المجدولة لليوم) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>{isAr ? '2. حالات الدخول والعمليات المجدولة لليوم (Pending Admissions)' : 'Pending Admissions Scheduled Today'}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {pendingAdmissions.length} {isAr ? 'حالات مجدولة' : 'scheduled'}
                </span>
              </h3>
              <span className="text-[11px] text-slate-500">
                {isAr ? 'تأكيد حجز السرير وإشعار التخدير والعمليات' : 'Confirm bed reservation & OT notification'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {pendingAdmissions.map((padm) => (
                <div key={padm.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                      {padm.scheduledTime}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      padm.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {padm.priority === 'high' ? (isAr ? 'أولوية جراحية' : 'High Priority') : (isAr ? 'دخول عادي' : 'Elective')}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{padm.patientName}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{padm.mrn} · {padm.age} {isAr ? 'سنة' : 'yrs'}</span>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                    <strong className="text-slate-800 block text-[10px]">{isAr ? 'التشخيص / سبب الدخول:' : 'Indication:'}</strong>
                    {padm.indication}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{padm.doctorName}</span>
                    <span className="font-semibold text-teal-800">{padm.assignedWard}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: High-Risk Inpatient Alerts for Morning Huddle */}
          <div className="bg-white rounded-xl border border-rose-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-rose-100">
              <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{isAr ? '3. المريضات ذوات الخطورة العالية للمناقشة والمتابعة (High-Risk Inpatients)' : 'High-Risk Maternal & Inpatient Alerts'}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                  {highRiskPatients.length} {isAr ? 'مريضات حرجات' : 'alerts'}
                </span>
              </h3>
              <span className="text-[11px] text-rose-700 font-semibold">
                {isAr ? 'تتطلب مراقبة MEOWS ومراجعة استشاري أول' : 'Requires MEOWS surveillance'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {highRiskPatients.map((adm) => {
                const pat = patients.find(p => p.mrn === adm.mrn);
                const isBleedingCase = adm.admissionId.includes('4405');

                return (
                  <div key={adm.admissionId} className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{adm.patientName}</span>
                        <span className="font-mono text-[10px] text-slate-500">{adm.mrn}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-rose-800 bg-white px-2 py-0.5 rounded border border-rose-200">
                        غرفة {adm.roomNumber}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">{isAr ? 'عوامل الخطورة:' : 'Risk Factors:'}</span>
                        <span className="font-bold text-rose-700">
                          {isBleedingCase 
                            ? (isAr ? 'نزيف مهبلي حاد (PPH / APH) + تسارع نبض' : 'Severe Obstetric Bleeding + Tachycardia')
                            : (isAr ? 'حساسية مهددة للحياة / زمرة دم سالبة' : 'Drug Allergy Alert / Rh Negative')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-2 rounded border border-rose-100">
                        <span>{isAr ? 'فصيلة الدم:' : 'Blood Group:'} <strong className="text-rose-700 font-mono">{pat?.bloodGroup}</strong></span>
                        <span>{isAr ? 'الحساسية:' : 'Allergies:'} <strong className="text-slate-800">{pat?.allergies?.join(', ') || 'NKDA'}</strong></span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        {adm.attendingConsultantName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectAdmission(adm);
                          onClose();
                        }}
                        className="text-xs text-rose-700 hover:text-rose-900 font-bold underline cursor-pointer"
                      >
                        {isAr ? 'الانتقال للملف السريري والتنبيهات' : 'Review Chart'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              {isAr 
                ? 'اعتمد من قبل رئيس قسم التمريض وإدارة شؤون المرضى بمستشفى الأمل التخصصي' 
                : 'Approved by Nurse-in-Charge & Patient Affairs Office, Al-Amal Specialized Hospital'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs transition-colors"
            >
              {isAr ? 'طباعة المحضر' : 'Print Briefing'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs transition-colors"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
