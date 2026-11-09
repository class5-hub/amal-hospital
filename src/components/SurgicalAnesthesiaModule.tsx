import React, { useState } from 'react';
import { 
  Patient, 
  Admission, 
  OperativeReport, 
  AnesthesiaRecord, 
  Language, 
  SystemUser 
} from '../types/hmis.ts';
import {
  Scissors,
  Syringe,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Clock,
  Heart,
  FileCheck,
  UserCheck
} from 'lucide-react';
import { api } from '../api/client.ts';
import { AnesthesiaProcedureTimer } from './AnesthesiaProcedureTimer.tsx';

interface SurgicalAnesthesiaProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  operativeReports: OperativeReport[];
  anesthesiaRecords: AnesthesiaRecord[];
  currentUser: SystemUser;
  language: Language;
  onRefresh: () => void;
  onOpenConsentModal?: () => void;
}

export const SurgicalAnesthesiaModule: React.FC<SurgicalAnesthesiaProps> = ({
  currentPatient,
  currentAdmission,
  operativeReports,
  anesthesiaRecords,
  currentUser,
  language,
  onRefresh,
  onOpenConsentModal
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<'operative' | 'anesthesia' | 'safety'>('operative');
  const [showNewOpModal, setShowNewOpModal] = useState(false);

  // New operative report state
  const [opForm, setOpForm] = useState({
    procedureCode: 'OB-LSCS-01',
    procedureName: 'Lower Segment Cesarean Section (LSCS)',
    preOpDiagnosis: 'Term pregnancy with failure to progress',
    postOpDiagnosis: 'Delivered single live infant, healthy outcome',
    leadSurgeon: 'د. طارق بن عامر',
    assistantSurgeons: 'د. هدى المنصوري',
    scrubNurse: 'ممرضة فاطمة الورفلي',
    circulatingNurse: 'ممرضة خديجة قاسم',
    anesthesiologist: 'د. نادر العبيدي',
    startTime: '2026-11-05T13:30',
    endTime: '2026-11-05T14:25',
    surgicalSteps: 'Pfannenstiel incision. Uterine incision lower segment. Delivery of fetus. Placenta delivered complete. Two-layer closure. Complete hemostasis.',
    findings: 'Normal anatomy, clear liquor, no meconium',
    estimatedBloodLossMl: 450,
    specimensSent: 'Placenta for routine histopathology',
    complications: 'None',
    postOpPlan: 'IV fluids, Cefotaxime 1g TID, Paracetamol IV Q8H'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentAdmission || !currentPatient) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
        {isAr ? 'يرجى اختيار مريض منوم' : 'Please select an active inpatient'}
      </div>
    );
  }

  const handleSaveOpReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newReport: OperativeReport = {
        id: `op-${Date.now()}`,
        admissionId: currentAdmission.admissionId,
        procedureCode: opForm.procedureCode,
        procedureName: opForm.procedureName,
        preOpDiagnosis: opForm.preOpDiagnosis,
        postOpDiagnosis: opForm.postOpDiagnosis,
        leadSurgeon: opForm.leadSurgeon,
        assistantSurgeons: opForm.assistantSurgeons.split(',').map(s => s.trim()),
        scrubNurse: opForm.scrubNurse,
        circulatingNurse: opForm.circulatingNurse,
        anesthesiologist: opForm.anesthesiologist,
        startTime: `${opForm.startTime}:00Z`,
        endTime: `${opForm.endTime}:00Z`,
        surgicalSteps: opForm.surgicalSteps,
        findings: opForm.findings,
        estimatedBloodLossMl: opForm.estimatedBloodLossMl,
        specimensSent: opForm.specimensSent,
        complications: opForm.complications,
        postOpPlan: opForm.postOpPlan,
        checklist: {
          signInDone: true,
          timeOutDone: true,
          signOutDone: true,
          spongeCountCorrect: true,
          instrumentCountCorrect: true
        },
        surgeonSignature: `${opForm.leadSurgeon} (استشاري جراحة النساء والولادة)`
      };

      await api.saveOperativeReport(newReport, currentUser);
      setShowNewOpModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryOp = operativeReports[0];
  const primaryAnes = anesthesiaRecords[0];

  const handleUpdateAnesthesiaRecord = async (updated: AnesthesiaRecord) => {
    try {
      await api.saveAnesthesiaRecord(updated, currentUser);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to update anesthesia record:', err);
    }
  };

  const handleStartNewAnesthesiaSession = async () => {
    try {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const newAnes: AnesthesiaRecord = {
        id: `anes-${Date.now()}`,
        admissionId: currentAdmission.admissionId,
        operativeId: primaryOp?.id || `op-${Date.now()}`,
        anesthesiologist: currentUser.name || 'د. نادر العبيدي',
        anesthesiaType: 'Spinal',
        asaScore: 'ASA II',
        startTime: nowTime,
        status: 'active',
        preAnesthesiaAssessment: {
          airwayMallampati: 'Class I',
          fastingHours: 8,
          allergiesNoted: currentPatient.allergies.join(', ') || 'No known allergies',
          preMedications: 'Metoclopramide 10mg IV + Ranitidine 50mg IV'
        },
        administeredDrugs: [
          {
            drugName: 'Heavy Bupivacaine 0.5%',
            dose: '10mg (2ml)',
            route: 'Intrathecal (L3-L4)',
            time: nowTime,
            givenBy: currentUser.name
          }
        ],
        intraopVitals: [
          {
            time: nowTime,
            bpSystolic: 120,
            bpDiastolic: 75,
            heartRate: 80,
            spO2: 99,
            etCO2: 35,
            fluidsGivenMl: 500
          }
        ],
        pacu: {
          arrivalTime: '',
          aldreteScore: 10,
          vitalsAtPACU: {
            bp: '120/75',
            hr: 78,
            spO2: 99,
            consciousness: 'Awake'
          },
          handoverToNurse: 'ممرضة القسم',
          postOpAnalgesiaPlan: 'Paracetamol IV 1g Q8H'
        }
      };
      await api.saveAnesthesiaRecord(newAnes, currentUser);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to start anesthesia session');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top View Selector & Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('operative')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'operative' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>{isAr ? 'تقرير العملية الجراحية (Operative Record)' : 'Operative Record'}</span>
          </button>

          <button
            onClick={() => setActiveTab('anesthesia')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'anesthesia' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Syringe className="w-4 h-4" />
            <span>{isAr ? 'سجل التخدير والمراقبة والإفاقة (Anesthesia)' : 'Anesthesia & PACU'}</span>
          </button>

          <button
            onClick={() => setActiveTab('safety')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'safety' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>{isAr ? 'قائمة التحقق للسلامة الجراحية (WHO Checklist)' : 'WHO Safety Checklist'}</span>
          </button>
        </div>

        <button
          onClick={() => setShowNewOpModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAr ? 'توثيق عملية جراحية جديدة' : 'New Operative Record'}</span>
        </button>
      </div>

      {/* TAB 1: Operative Report Details (Ch. 22) */}
      {activeTab === 'operative' && (
        <div className="space-y-4">
          {!primaryOp ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-400">
              {isAr ? 'لا توجد تقارير جراحية مسجلة لهذه الإقامة' : 'No operative records documented for this stay.'}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">{primaryOp.procedureName}</span>
                    <span className="font-mono bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                      {primaryOp.procedureCode}
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] block mt-1">
                    {primaryOp.startTime} → {primaryOp.endTime}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'الجراح الرئيسي المسؤول:' : 'Lead Surgeon:'}</span>
                  <strong className="text-slate-900 font-semibold">{primaryOp.leadSurgeon}</strong>
                </div>
              </div>

              {/* Diagnosis comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'التشخيص قبل العملية (Pre-op):' : 'Pre-op Diagnosis:'}</span>
                  <strong className="text-slate-800">{primaryOp.preOpDiagnosis}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'التشخيص بعد العملية (Post-op):' : 'Post-op Diagnosis:'}</span>
                  <strong className="text-slate-800">{primaryOp.postOpDiagnosis}</strong>
                </div>
              </div>

              {/* Surgical Team */}
              <div>
                <span className="font-bold text-slate-800 block mb-2">{isAr ? 'الفريق الجراحي المعاون:' : 'Surgical Team:'}</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-400 block">{isAr ? 'المساعدون:' : 'Assistants:'}</span>
                    <span className="text-slate-800 font-medium">{primaryOp.assistantSurgeons.join(', ')}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-400 block">{isAr ? 'طبيب التخدير:' : 'Anesthesiologist:'}</span>
                    <span className="text-slate-800 font-medium">{primaryOp.anesthesiologist}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-400 block">{isAr ? 'تمريض التعقيم (Scrub):' : 'Scrub Nurse:'}</span>
                    <span className="text-slate-800 font-medium">{primaryOp.scrubNurse}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-400 block">{isAr ? 'التمريض الدوار:' : 'Circulating:'}</span>
                    <span className="text-slate-800 font-medium">{primaryOp.circulatingNurse}</span>
                  </div>
                </div>
              </div>

              {/* Surgical Description & Findings */}
              <div className="space-y-3">
                <div>
                  <span className="font-bold text-slate-800 block mb-1">{isAr ? 'خطوات العملية والوصف الجراحي:' : 'Surgical Steps:'}</span>
                  <p className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-700 leading-relaxed">
                    {primaryOp.surgicalSteps}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <span className="text-slate-400 block">{isAr ? 'النزف التقديري (EBL):' : 'Estimated Blood Loss:'}</span>
                    <strong className="text-slate-900 font-mono text-sm">{primaryOp.estimatedBloodLossMl} ml</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <span className="text-slate-400 block">{isAr ? 'العينات المرسلة للأنسجة:' : 'Specimens Sent:'}</span>
                    <strong className="text-slate-900">{primaryOp.specimensSent}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <span className="text-slate-400 block">{isAr ? 'المضاعفات أثناء العملية:' : 'Complications:'}</span>
                    <strong className="text-slate-900">{primaryOp.complications}</strong>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-800 block mb-1">{isAr ? 'خطة الرعاية بعد الجراحة:' : 'Post-op Care Plan:'}</span>
                  <p className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700">
                    {primaryOp.postOpPlan}
                  </p>
                </div>
              </div>

              {/* Surgeon Electronic Signature */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  {isAr ? 'سجل جراحي محمي ضد التعديل المباشر' : 'Tamper-proof surgical record'}
                </span>
                <div className="flex items-center gap-2 text-teal-800 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>{primaryOp.surgeonSignature}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Anesthesia Record & Monitoring (Ch. 23) */}
      {activeTab === 'anesthesia' && (
        <div className="space-y-4">
          {!primaryAnes ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-500 space-y-3">
              <Syringe className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">
                {isAr ? 'لا توجد جلسة تخدير مسجلة لهذه الإقامة' : 'No anesthesia session active for this stay.'}
              </p>
              <button
                type="button"
                onClick={handleStartNewAnesthesiaSession}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'بدء جلسة تخدير وتشغيل مؤقت العمليات الحي' : 'Start Anesthesia Session & Launch Timer'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* DYNAMIC TIME-IN-PROCEDURE TIMER WITH PROACTIVE CRITICAL WARNINGS */}
              <AnesthesiaProcedureTimer
                anesthesiaRecord={primaryAnes}
                operativeReport={primaryOp}
                language={language}
                currentUser={currentUser}
                onUpdateRecord={handleUpdateAnesthesiaRecord}
              />

              {/* Pre-Anesthesia Assessment & Risk Evaluation */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-teal-600" />
                    <h3 className="font-bold text-slate-900">
                      {isAr ? 'تقييم ما قبل التخدير وتصنيف المخاطر (Pre-Anesthesia Assessment)' : 'Pre-Anesthesia Assessment'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold font-mono">
                      {primaryAnes.asaScore}
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold font-mono">
                      {primaryAnes.anesthesiaType} Anesthesia
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-200 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-sans">{isAr ? 'مجرى الهواء (Mallampati):' : 'Airway Mallampati:'}</span>
                    <strong className="text-slate-900">{primaryAnes.preAnesthesiaAssessment.airwayMallampati}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-sans">{isAr ? 'ساعات الصيام (Fasting):' : 'Fasting Hours:'}</span>
                    <strong className="text-slate-900">{primaryAnes.preAnesthesiaAssessment.fastingHours} {isAr ? 'ساعات' : 'hrs'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-sans">{isAr ? 'الحساسية المرصودة:' : 'Allergies:'}</span>
                    <strong className="text-rose-700">{primaryAnes.preAnesthesiaAssessment.allergiesNoted}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-sans">{isAr ? 'الأدوية التمهيدية:' : 'Pre-medications:'}</span>
                    <strong className="text-slate-900">{primaryAnes.preAnesthesiaAssessment.preMedications}</strong>
                  </div>
                </div>

                {/* Administered Anesthetic Drugs */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">{isAr ? 'قائمة أدوية التخدير المعطاة فعلياً:' : 'Administered Anesthetic Drugs:'}</h4>
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                        <th className="py-1.5 px-3">{isAr ? 'الدواء' : 'Drug'}</th>
                        <th className="py-1.5 px-3">{isAr ? 'الجرعة' : 'Dose'}</th>
                        <th className="py-1.5 px-3">{isAr ? 'طريق الإعطاء' : 'Route'}</th>
                        <th className="py-1.5 px-3">{isAr ? 'الوقت' : 'Time'}</th>
                        <th className="py-1.5 px-3">{isAr ? 'الشخص المعطي' : 'Given By'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {primaryAnes.administeredDrugs.map((d: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-slate-900 font-sans">{d.drugName}</td>
                          <td className="py-1.5 px-3">{d.dose}</td>
                          <td className="py-1.5 px-3">{d.route}</td>
                          <td className="py-1.5 px-3">{d.time}</td>
                          <td className="py-1.5 px-3 font-sans text-slate-700">{d.givenBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Intraoperative Vitals Timeline */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">{isAr ? 'المراقبة المتسلسلة داخل غرفة العمليات (Timeline):' : 'Intraoperative Monitoring Timeline:'}</h4>
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                        <th className="py-1.5 px-3">{isAr ? 'الوقت' : 'Time'}</th>
                        <th className="py-1.5 px-3">{isAr ? 'ضغط الدم (BP)' : 'BP'}</th>
                        <th className="py-1.5 px-3">{isAr ? 'النبض (HR)' : 'HR'}</th>
                        <th className="py-1.5 px-3">{isAr ? 'الأكسجة (SpO2)' : 'SpO2'}</th>
                        <th className="py-1.5 px-3">{isAr ? 'EtCO2' : 'EtCO2'}</th>
                        <th className="py-1.5 px-3">{isAr ? 'السوائل الوريدية المعطاة' : 'IV Fluids Given'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {primaryAnes.intraopVitals.map((v: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-slate-900">{v.time}</td>
                          <td className="py-1.5 px-3 font-semibold text-slate-900">{v.bpSystolic}/{v.bpDiastolic}</td>
                          <td className="py-1.5 px-3">{v.heartRate} bpm</td>
                          <td className="py-1.5 px-3 text-teal-700">{v.spO2}%</td>
                          <td className="py-1.5 px-3">{v.etCO2} mmHg</td>
                          <td className="py-1.5 px-3 text-slate-700">{v.fluidsGivenMl} ml</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* PACU / Recovery Room (Ch. 23.4) */}
                <div className="bg-teal-50/50 border border-teal-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-900 text-sm">{isAr ? 'سجل الإفاقة بعد التخدير (PACU Recovery):' : 'PACU Recovery Record:'}</span>
                    <span className="bg-teal-700 text-white font-mono font-bold px-2 py-0.5 rounded text-xs">
                      Aldrete Score: {primaryAnes.pacu.aldreteScore}/10
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 font-sans block">{isAr ? 'وقت الوصول للإفاقة:' : 'Arrival Time:'}</span>
                      <strong className="text-slate-800">{primaryAnes.pacu.arrivalTime.split('T')[1]?.substring(0, 5)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-sans block">{isAr ? 'العلامات الحيوية عند الإفاقة:' : 'Vitals at PACU:'}</span>
                      <strong className="text-slate-800">BP: {primaryAnes.pacu.vitalsAtPACU.bp} · HR: {primaryAnes.pacu.vitalsAtPACU.hr} · SpO2: {primaryAnes.pacu.vitalsAtPACU.spO2}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-sans block">{isAr ? 'التسليم لتمريض القسم:' : 'Handover to:'}</span>
                      <strong className="text-slate-800 font-sans">{primaryAnes.pacu.handoverToNurse}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WHO Surgical Safety Checklist (Ch. 22) */}
      {activeTab === 'safety' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 text-xs">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-teal-600" />
              <span>{isAr ? 'قائمة منظمة الصحة العالمية للسلامة الجراحية (WHO Surgical Safety Checklist)' : 'WHO Surgical Safety Checklist'}</span>
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              {isAr ? 'إجراء إلزامي لضمان أمان المريض ومطابقة الهوية وموقع الجراحة وتعداد الشاش والآلات' : 'Mandatory safety protocol for patient safety and swab/instrument counts'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phase 1: Sign In */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-200">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">1</span>
                <span>{isAr ? 'قبل التخدير (Sign In)' : 'Before Induction (Sign In)'}</span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between gap-2 text-emerald-800 font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{isAr ? 'تأكيد هوية المريض والموافقة المستنيرة' : 'Patient identity & consent confirmed'}</span>
                  </div>
                  {onOpenConsentModal && (
                    <button
                      type="button"
                      onClick={onOpenConsentModal}
                      className="text-[10px] bg-teal-100 hover:bg-teal-200 text-teal-800 px-2 py-0.5 rounded font-bold transition-colors"
                    >
                      {isAr ? 'عرض الإقرار' : 'View Consent'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'تأكيد موقع العملية الجراحية' : 'Surgical site marked'}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'جاهزية جهاز التخدير وأدوية الطوارئ' : 'Anesthesia machine check complete'}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'التحقق من حساسية المريض (Allergies)' : 'Known allergy check verified'}</span>
                </div>
              </div>
            </div>

            {/* Phase 2: Time Out */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-200">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">2</span>
                <span>{isAr ? 'قبل الشق الجراحي (Time Out)' : 'Before Skin Incision (Time Out)'}</span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'تعريف أعضاء الفريق بأسمائهم وأدوارهم' : 'Team members introduced'}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'مراجعة الجراح للخطوات الحرجة والنزف المتوقع' : 'Surgeon reviews critical steps & blood loss'}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'إعطاء المضاد الحيوي الوقائي خلال 60 دقيقة' : 'Antibiotic prophylaxis given <60m'}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'تأكيد توفر أكياس الدم المطابقة إن لزم' : 'Crossmatched blood availability confirmed'}</span>
                </div>
              </div>
            </div>

            {/* Phase 3: Sign Out */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-200">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">3</span>
                <span>{isAr ? 'قبل مغادرة الغرفة (Sign Out)' : 'Before Leaving OR (Sign Out)'}</span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'تطابق تعداد الشاش الجراحي والإبر' : 'Sponge and needle counts correct'}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'تطابق تعداد الآلات الجراحية' : 'Instrument count correct'}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'تسمية وترميز عينات الأنسجة باسم المريض' : 'Specimen correctly labeled'}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'مراجعة خطة الإفاقة ومسكنات الألم' : 'Recovery & analgesia plan reviewed'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Operative Report */}
      {showNewOpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'توثيق تقرير عملية جراحية جديدة' : 'New Operative Report'}</span>
              </h3>
              <button onClick={() => setShowNewOpModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveOpReport} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'اسم العملية الجراحية *' : 'Procedure Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={opForm.procedureName}
                    onChange={(e) => setOpForm({ ...opForm, procedureName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'رمز الإجراء (Procedure Code) *' : 'Procedure Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={opForm.procedureCode}
                    onChange={(e) => setOpForm({ ...opForm, procedureCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'التشخيص قبل العملية *' : 'Pre-op Diagnosis *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={opForm.preOpDiagnosis}
                    onChange={(e) => setOpForm({ ...opForm, preOpDiagnosis: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'التشخيص بعد العملية *' : 'Post-op Diagnosis *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={opForm.postOpDiagnosis}
                    onChange={(e) => setOpForm({ ...opForm, postOpDiagnosis: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'الجراح الرئيسي *' : 'Lead Surgeon *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={opForm.leadSurgeon}
                    onChange={(e) => setOpForm({ ...opForm, leadSurgeon: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'المساعدون' : 'Assistants'}
                  </label>
                  <input
                    type="text"
                    value={opForm.assistantSurgeons}
                    onChange={(e) => setOpForm({ ...opForm, assistantSurgeons: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'طبيب التخدير' : 'Anesthesiologist'}
                  </label>
                  <input
                    type="text"
                    value={opForm.anesthesiologist}
                    onChange={(e) => setOpForm({ ...opForm, anesthesiologist: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'الوصف الجراحي والخطوات *' : 'Surgical Steps *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={opForm.surgicalSteps}
                  onChange={(e) => setOpForm({ ...opForm, surgicalSteps: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'النزف التقديري (ml)' : 'Estimated Blood Loss (ml)'}
                  </label>
                  <input
                    type="number"
                    value={opForm.estimatedBloodLossMl}
                    onChange={(e) => setOpForm({ ...opForm, estimatedBloodLossMl: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'العينات المرسلة' : 'Specimens Sent'}
                  </label>
                  <input
                    type="text"
                    value={opForm.specimensSent}
                    onChange={(e) => setOpForm({ ...opForm, specimensSent: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewOpModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'اعتماد التقرير الجراحي' : 'Save Operative Report')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
