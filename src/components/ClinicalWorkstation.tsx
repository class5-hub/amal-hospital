import React, { useState } from 'react';
import { 
  Patient, 
  Admission, 
  ClinicalAssessment, 
  VitalSigns, 
  ManagementPlan, 
  Language, 
  SystemUser 
} from '../types/hmis.ts';
import {
  Heart,
  Activity,
  Baby,
  Stethoscope,
  ClipboardList,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp
} from 'lucide-react';
import { api } from '../api/client.ts';
import { VoiceDictationButton } from './VoiceDictationButton.tsx';
import { PregnancyTimeline } from './PregnancyTimeline.tsx';
import { VitalsTrendVisualizer } from './VitalsTrendVisualizer.tsx';
import { VitalsHistoryDashboard } from './VitalsHistoryDashboard.tsx';
import { PediatricGrowthVisualizer } from './PediatricGrowthVisualizer.tsx';
import { PediatricGrowthRecord } from '../types/hmis.ts';

interface ClinicalWorkstationProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  assessment: ClinicalAssessment | null;
  plans: ManagementPlan[];
  currentUser: SystemUser;
  language: Language;
  onRefresh: () => void;
}

export const ClinicalWorkstation: React.FC<ClinicalWorkstationProps> = ({
  currentPatient,
  currentAdmission,
  assessment,
  plans,
  currentUser,
  language,
  onRefresh,
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<'obgyn' | 'growth' | 'timeline' | 'assessment' | 'vitals' | 'plan'>('obgyn');

  // Form states for clinical assessment
  const [chiefComplaint, setChiefComplaint] = useState(assessment?.chiefComplaint || '');
  const [chiefComplaintDuration, setChiefComplaintDuration] = useState(assessment?.chiefComplaintDuration || '');
  const [hpi, setHpi] = useState(assessment?.historyOfPresentIllness || '');
  const [cvsExam, setCvsExam] = useState(assessment?.systemicExam?.cardiovascular || 'Normal S1, S2, no murmurs');
  const [respExam, setRespExam] = useState(assessment?.systemicExam?.respiratory || 'Bilateral vesicular breath sounds, clear');
  const [abdoExam, setAbdoExam] = useState(assessment?.systemicExam?.abdominal || 'Soft, lax, non-tender');
  const [generalExam, setGeneralExam] = useState(assessment?.systemicExam?.general || 'Alert, conscious, oriented');

  // Ob/Gyn state
  const obGynInitial = assessment?.obGyn;
  const [gravida, setGravida] = useState(obGynInitial?.gravida ?? 1);
  const [para, setPara] = useState(obGynInitial?.para ?? 0);
  const [abortions, setAbortions] = useState(obGynInitial?.abortions ?? 0);
  const [living, setLiving] = useState(obGynInitial?.living ?? 0);
  const [lmp, setLmp] = useState(obGynInitial?.lmp || '2026-02-10');
  const [edd, setEdd] = useState(obGynInitial?.edd || '2026-11-17');
  const [gaWeeks, setGaWeeks] = useState(obGynInitial?.gestationalAgeWeeks ?? 38);
  const [gaDays, setGaDays] = useState(obGynInitial?.gestationalAgeDays ?? 4);
  const [obstetricHistory, setObstetricHistory] = useState(obGynInitial?.obstetricHistory || 'Uncomplicated antenatal course');
  const [fhr, setFhr] = useState(obGynInitial?.currentPregnancyDetails?.fetalHeartRateBpm ?? 144);
  const [presentation, setPresentation] = useState(obGynInitial?.currentPregnancyDetails?.presentation || 'Cephalic');
  const [amnioticFluid, setAmnioticFluid] = useState(obGynInitial?.currentPregnancyDetails?.amnioticFluid || 'Intact');
  const [contractions, setContractions] = useState(obGynInitial?.currentPregnancyDetails?.uterineContractions || '2-3 per 10 mins, moderate');
  const [cervicalDilation, setCervicalDilation] = useState(obGynInitial?.currentPregnancyDetails?.cervicalDilationCm ?? 4);
  const [effacement, setEffacement] = useState(obGynInitial?.currentPregnancyDetails?.effacementPercent ?? 70);
  const [gynHistory, setGynHistory] = useState(obGynInitial?.otherGynecologicalHistory || 'Regular cycles, no prior pelvic surgeries');

  // Vitals form
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [newVitals, setNewVitals] = useState({
    bpSystolic: 120,
    bpDiastolic: 80,
    pulse: 82,
    respRate: 18,
    temp: 37.0,
    spO2: 98,
    consciousness: 'Alert' as any,
    painScale: 2,
    weightKg: 68,
    heightCm: 165
  });

  // Management Plan form
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    planType: 'obstetric' as any,
    procedureNature: '',
    urgencyLevel: 'Elective' as any,
    notes: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!currentAdmission || !currentPatient) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
        {isAr ? 'يرجى اختيار مريض للاطلاع على ملفه السريري' : 'Please select an active patient to view EMR'}
      </div>
    );
  }

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.saveAssessment(currentAdmission.admissionId, {
        chiefComplaint,
        chiefComplaintDuration,
        historyOfPresentIllness: hpi,
        systemicExam: {
          cardiovascular: cvsExam,
          respiratory: respExam,
          abdominal: abdoExam,
          general: generalExam
        },
        obGyn: {
          gravida,
          para,
          abortions,
          living,
          lmp,
          edd,
          gestationalAgeWeeks: gaWeeks,
          gestationalAgeDays: gaDays,
          obstetricHistory,
          currentPregnancyDetails: {
            fetalHeartRateBpm: fhr,
            presentation: presentation as any,
            amnioticFluid: amnioticFluid as any,
            uterineContractions: contractions,
            cervicalDilationCm: cervicalDilation,
            effacementPercent: effacement
          },
          otherGynecologicalHistory: gynHistory
        }
      }, currentUser);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGrowthRecord = async (record: PediatricGrowthRecord) => {
    if (!currentAdmission) return;
    try {
      const existingRecords = assessment?.pediatricGrowthRecords || [];
      const updatedRecords = [...existingRecords, record];

      await api.saveAssessment(currentAdmission.admissionId, {
        ...assessment,
        pediatricGrowthRecords: updatedRecords
      }, currentUser);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save growth record');
    }
  };

  const handleAddVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addVitals(currentAdmission.admissionId, {
        admissionId: currentAdmission.admissionId,
        ...newVitals,
        recordedBy: currentUser.name
      }, currentUser);
      setShowVitalsModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addPlan({
        admissionId: currentAdmission.admissionId,
        planType: newPlan.planType,
        procedureNature: newPlan.procedureNature,
        urgencyLevel: newPlan.urgencyLevel,
        notes: newPlan.notes,
        physicianId: currentUser.id,
        physicianName: currentUser.name
      }, currentUser);
      setShowPlanModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const vitalsList = assessment?.vitals || [];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('obgyn')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'obgyn' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Baby className="w-4 h-4" />
            <span>{isAr ? 'نموذج النساء والولادة التخصصي' : 'Ob/Gyn Specialty Sheet'}</span>
          </button>

          <button
            onClick={() => setActiveTab('growth')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'growth' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Baby className="w-4 h-4 text-pink-400" />
            <span>{isAr ? 'منحنيات نمو المولود (WHO)' : 'Pediatric Growth'}</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'timeline' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>{isAr ? 'المخطط الزمني للحمل والسونار' : 'Pregnancy Timeline & US'}</span>
          </button>

          <button
            onClick={() => setActiveTab('assessment')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'assessment' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>{isAr ? 'التاريخ المرضي والفحص السريري' : 'Initial Assessment & History'}</span>
          </button>

          <button
            onClick={() => setActiveTab('vitals')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'vitals' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{isAr ? 'العلامات الحيوية والرصد البياني' : 'Vitals & Chart Trends'}</span>
          </button>

          <button
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'plan' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>{isAr ? 'الخطة العلاجية والتدخل' : 'Management Plan'}</span>
          </button>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'vitals' && (
            <button
              onClick={() => setShowVitalsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'تسجيل علامات حيوية جديدة' : 'Record Vitals'}</span>
            </button>
          )}

          {activeTab === 'plan' && (
            <button
              onClick={() => {
                setNewPlan({
                  planType: 'obstetric',
                  procedureNature: '',
                  urgencyLevel: 'Elective',
                  notes: ''
                });
                setShowPlanModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إصدار خطة علاجية جديدة' : 'New Management Plan'}</span>
            </button>
          )}

          {(activeTab === 'obgyn' || activeTab === 'assessment') && (
            <button
              onClick={handleSaveAssessment}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التحديث السريري' : 'Save Changes')}</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{isAr ? 'تم حفظ التعديلات السريرية بنجاح وتسجيلها في سجل التدقيق المعتمد' : 'Clinical records updated and logged in tamper-proof audit trail.'}</span>
        </div>
      )}

      {/* TAB 1: Specialized Ob/Gyn Module (نموذج النساء والولادة - Ch. 5) */}
      {activeTab === 'obgyn' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Column 1: Parity & Gestational Age Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Baby className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'البيانات التوليدية الأساسية (L/A/P/G)' : 'Parity & Gestational Age'}</span>
            </h3>

            {/* Parity Code: G / P / A / L */}
            <div>
              <label className="block text-slate-600 text-xs font-semibold mb-1">
                {isAr ? 'مؤشر الحمل والولادات (G / P / A / L)' : 'Parity Notation (G / P / A / L)'}
              </label>
              <div className="grid grid-cols-4 gap-2 text-center font-mono">
                <div className="bg-slate-50 border border-slate-200 rounded p-1.5">
                  <span className="text-[10px] text-slate-500 block">G (الحمل)</span>
                  <input
                    type="number"
                    min="0"
                    value={gravida}
                    onChange={(e) => setGravida(parseInt(e.target.value) || 0)}
                    className="w-full text-center font-bold text-sm bg-transparent focus:outline-none"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-1.5">
                  <span className="text-[10px] text-slate-500 block">P (الولادات)</span>
                  <input
                    type="number"
                    min="0"
                    value={para}
                    onChange={(e) => setPara(parseInt(e.target.value) || 0)}
                    className="w-full text-center font-bold text-sm bg-transparent focus:outline-none"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-1.5">
                  <span className="text-[10px] text-slate-500 block">A (الإجهاض)</span>
                  <input
                    type="number"
                    min="0"
                    value={abortions}
                    onChange={(e) => setAbortions(parseInt(e.target.value) || 0)}
                    className="w-full text-center font-bold text-sm bg-transparent focus:outline-none"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-1.5">
                  <span className="text-[10px] text-slate-500 block">L (الأحياء)</span>
                  <input
                    type="number"
                    min="0"
                    value={living}
                    onChange={(e) => setLiving(parseInt(e.target.value) || 0)}
                    className="w-full text-center font-bold text-sm bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* LMP, EDD & Gestational Age */}
            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'تاريخ آخر دورة شهرية (LMP)' : 'Last Menstrual Period (LMP)'}
                </label>
                <input
                  type="date"
                  value={lmp}
                  onChange={(e) => setLmp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'الموعد المتوقع للولادة (EDD)' : 'Estimated Due Date (EDD)'}
                </label>
                <input
                  type="date"
                  value={edd}
                  onChange={(e) => setEdd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'عمر الحمل الحالي (GA)' : 'Gestational Age (GA)'}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-1 bg-slate-50 border border-slate-300 rounded px-2 py-1">
                    <input
                      type="number"
                      min="1"
                      max="44"
                      value={gaWeeks}
                      onChange={(e) => setGaWeeks(parseInt(e.target.value) || 0)}
                      className="w-12 text-center font-bold font-mono bg-transparent focus:outline-none"
                    />
                    <span className="text-slate-500 text-[11px]">{isAr ? 'أسبوع' : 'weeks'}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-1 bg-slate-50 border border-slate-300 rounded px-2 py-1">
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={gaDays}
                      onChange={(e) => setGaDays(parseInt(e.target.value) || 0)}
                      className="w-10 text-center font-bold font-mono bg-transparent focus:outline-none"
                    />
                    <span className="text-slate-500 text-[11px]">{isAr ? 'يوم' : 'days'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Obstetric History */}
            <div className="pt-2 border-t border-slate-100 text-xs">
              <label className="block text-slate-600 font-semibold mb-1">
                {isAr ? 'التاريخ التوليدي السابق (Obstetric History)' : 'Obstetric History'}
              </label>
              <textarea
                rows={3}
                value={obstetricHistory}
                onChange={(e) => setObstetricHistory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900"
                placeholder="ولادات سابقة، قيصريات سابقة، مضاعفات..."
              />
            </div>
          </div>

          {/* Column 2: Current Pregnancy Status & Labor Progress */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>{isAr ? 'حالة الحمل والمخاض الحالي (Current Pregnancy)' : 'Current Pregnancy & Labor Status'}</span>
            </h3>

            {/* Fetal Heart Rate */}
            <div className="bg-rose-50/50 border border-rose-200 rounded p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-rose-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isAr ? 'نبض الجنين (Fetal Heart Rate - FHR)' : 'Fetal Heart Rate (FHR)'}</span>
                </span>
                <span className="text-[10px] text-rose-600 font-medium">110 - 160 bpm (Normal)</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="60"
                  max="220"
                  value={fhr}
                  onChange={(e) => setFhr(parseInt(e.target.value) || 0)}
                  className="w-24 bg-white border border-rose-300 rounded px-2.5 py-1 text-sm font-bold text-rose-900 font-mono"
                />
                <span className="text-rose-700 font-medium text-xs">نبضة / دقيقة (bpm)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'المجيء (Presentation)' : 'Presentation'}
                </label>
                <select
                  value={presentation}
                  onChange={(e) => setPresentation(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                >
                  <option value="Cephalic">{isAr ? 'رأسي (Cephalic)' : 'Cephalic'}</option>
                  <option value="Breech">{isAr ? 'مقعدي (Breech)' : 'Breech'}</option>
                  <option value="Transverse">{isAr ? 'مستعرض (Transverse)' : 'Transverse'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'السائل الأمنيوسي' : 'Amniotic Fluid'}
                </label>
                <select
                  value={amnioticFluid}
                  onChange={(e) => setAmnioticFluid(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                >
                  <option value="Intact">{isAr ? 'سليم لم ينفجر (Intact)' : 'Intact'}</option>
                  <option value="Ruptured Clear">{isAr ? 'منفجر رائق (Clear)' : 'Ruptured Clear'}</option>
                  <option value="Meconium Stained">{isAr ? 'عقي (Meconium)' : 'Meconium'}</option>
                </select>
              </div>
            </div>

            {/* Cervical Assessment */}
            <div className="pt-2 border-t border-slate-100 text-xs space-y-3">
              <span className="font-bold text-slate-800 block">{isAr ? 'تقييم عنق الرحم (Cervical Assessment)' : 'Cervical Assessment'}</span>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-600">{isAr ? 'اتساع عنق الرحم (Dilation):' : 'Cervical Dilation:'}</span>
                  <strong className="font-mono text-teal-700">{cervicalDilation} cm</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={cervicalDilation}
                  onChange={(e) => setCervicalDilation(parseInt(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-600">{isAr ? 'الامحاء (Effacement):' : 'Effacement:'}</span>
                  <strong className="font-mono text-teal-700">{effacement}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={effacement}
                  onChange={(e) => setEffacement(parseInt(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'تقلصات الرحم (Uterine Contractions)' : 'Uterine Contractions'}
                </label>
                <input
                  type="text"
                  value={contractions}
                  onChange={(e) => setContractions(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                  placeholder="3 تقلصات كل 10 دقائق، مدتها 45 ثانية"
                />
              </div>
            </div>
          </div>

          {/* Column 3: Gynecological History & Key Alerts */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'التاريخ النسائي العام (Gyn History)' : 'Gynecological History'}</span>
            </h3>

            <div className="text-xs space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'الأعراض والعمليات والمشاكل النسائية غير المتعلقة بالحمل' : 'Non-pregnancy Gynecological History'}
                </label>
                <textarea
                  rows={4}
                  value={gynHistory}
                  onChange={(e) => setGynHistory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900"
                  placeholder="دورات منتظمة، متلازمة تكيس المبايض، بطانة الرحم المهاجرة..."
                />
              </div>

              {/* Verified Blood Group Alert */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1">
                <span className="text-[11px] font-semibold text-slate-700 block">
                  {isAr ? 'فصيلة الدم وعامل Rh الموثق:' : 'Documented Blood Group & Rh:'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-red-600 font-mono">{currentPatient.bloodGroup}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                    currentPatient.bloodGroupStatus === 'Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {currentPatient.bloodGroupStatus}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 pt-1">
                  {isAr ? 'تنبيه تنظيمي: لا تعتبر فصيلة الدم المكتوبة اعتماداً مستقلاً لنقل الدم دون التحقق المخبري' : 'Rule: Transfusion requires accredited cross-match verification.'}
                </p>
              </div>

              {/* Known Allergies */}
              <div className="bg-rose-50 border border-rose-200 rounded p-3 space-y-1">
                <span className="text-[11px] font-bold text-rose-800 block flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isAr ? 'الحساسية الدوائية المعتمدة:' : 'Verified Drug Allergies:'}</span>
                </span>
                <div className="text-xs font-semibold text-rose-900">
                  {currentPatient.allergies.join(', ')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Pregnancy Timeline & Serial Ultrasound Biometry */}
      {activeTab === 'timeline' && (
        <PregnancyTimeline
          currentPatient={currentPatient}
          assessment={assessment}
          language={language}
        />
      )}

      {/* TAB 2: Initial Clinical Assessment & History (Ch. 4) */}
      {activeTab === 'assessment' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 font-bold">
                  {isAr ? 'سبب الدخول والشكوى الرئيسية (Chief Complaint) *' : 'Chief Complaint *'}
                </label>
                <VoiceDictationButton
                  onTranscription={(val) => setChiefComplaint(val)}
                  currentValue={chiefComplaint}
                  language={language}
                />
              </div>
              <input
                type="text"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900"
                placeholder="ألم مخاض حاد مع نزول سائل مائي..."
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {isAr ? 'مدة الشكوى (Duration) *' : 'Duration *'}
              </label>
              <input
                type="text"
                value={chiefComplaintDuration}
                onChange={(e) => setChiefComplaintDuration(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900"
                placeholder="6 ساعات"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-bold">
                {isAr ? 'القصة الحالية وتطور الأعراض (History of Present Illness - HPI) *' : 'History of Present Illness (HPI) *'}
              </label>
              <VoiceDictationButton
                onTranscription={(val) => setHpi(val)}
                currentValue={hpi}
                language={language}
              />
            </div>
            <textarea
              rows={4}
              value={hpi}
              onChange={(e) => setHpi(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded p-3 text-slate-900 leading-relaxed font-medium"
              placeholder="وصف تفصيلي لبداية الأعراض، الشدة، العوامل المسببة، التغيرات السريرية..."
            />
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'الفحص السريري العام للأجهزة (Systemic Examination)' : 'Systemic Examination'}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'الجهاز الدوري والقلب (Cardiovascular)' : 'Cardiovascular System'}
                </label>
                <input
                  type="text"
                  value={cvsExam}
                  onChange={(e) => setCvsExam(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'الجهاز التنفسي (Respiratory)' : 'Respiratory System'}
                </label>
                <input
                  type="text"
                  value={respExam}
                  onChange={(e) => setRespExam(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'البطن والحوض (Abdominal / Pelvic)' : 'Abdomen & Pelvis'}
                </label>
                <input
                  type="text"
                  value={abdoExam}
                  onChange={(e) => setAbdoExam(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'الفحص العام ومستوى الوعي (General)' : 'General Appearance'}
                </label>
                <input
                  type="text"
                  value={generalExam}
                  onChange={(e) => setGeneralExam(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Pediatric Growth Charts Visualization */}
      {activeTab === 'growth' && (
        <PediatricGrowthVisualizer
          growthRecords={assessment?.pediatricGrowthRecords || []}
          patientName={currentPatient.fullName}
          patientDob={currentPatient.dob}
          patientGender="female"
          language={language}
          currentUser={currentUser}
          onSaveRecord={handleSaveGrowthRecord}
        />
      )}

      {/* TAB 3: Vital Signs & Monitoring (Ch. 5) */}
      {activeTab === 'vitals' && (
        <div className="space-y-4">
          <VitalsHistoryDashboard
            vitals={vitalsList}
            language={language}
            onOpenRecordModal={() => setShowVitalsModal(true)}
          />
          <VitalsTrendVisualizer
            vitals={vitalsList}
            language={language}
            onOpenRecordModal={() => setShowVitalsModal(true)}
          />
        </div>
      )}

      {/* TAB 4: Management Plan (خطة العلاج والتدخل - Ch. 6) */}
      {activeTab === 'plan' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'سجل الخطط العلاجية والتدخلات وتاريخ التعديل (Plan Versions)' : 'Management Plan Versions'}</span>
            </h3>
            <span className="text-slate-500 font-mono">{plans.length} {isAr ? 'خطط موثقة' : 'plans'}</span>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              {isAr ? 'لم تصدر خطة علاجية بعد. اضغط «إصدار خطة علاجية جديدة»' : 'No plans documented yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map(p => (
                <div key={p.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {isAr ? `الخطة العلاجية - إصدار v${p.version}` : `Management Plan v${p.version}`}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.urgencyLevel === 'Emergency' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                        p.urgencyLevel === 'Urgent' ? 'bg-amber-100 text-amber-800' :
                        'bg-teal-50 text-teal-800'
                      }`}>
                        {p.urgencyLevel}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                        {p.planType.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      {p.createdAt.split('T')[0]} {p.createdAt.split('T')[1]?.substring(0, 5)} · {p.physicianName}
                    </div>
                  </div>

                  <div className="text-slate-800 font-semibold">
                    {p.procedureNature}
                  </div>

                  {p.notes && (
                    <p className="text-slate-600 bg-white p-2.5 rounded border border-slate-200 leading-relaxed">
                      {p.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Record Vitals */}
      {showVitalsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'تسجيل قراءة علامات حيوية جديدة' : 'Record New Vital Signs'}</span>
              </h3>
              <button onClick={() => setShowVitalsModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleAddVitals} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'الضغط الانقباضي (BP Systolic)' : 'BP Systolic (mmHg)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={newVitals.bpSystolic}
                    onChange={(e) => setNewVitals({ ...newVitals, bpSystolic: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'الضغط الانبساطي (BP Diastolic)' : 'BP Diastolic (mmHg)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={newVitals.bpDiastolic}
                    onChange={(e) => setNewVitals({ ...newVitals, bpDiastolic: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'النبض (Pulse bpm)' : 'Pulse (bpm)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={newVitals.pulse}
                    onChange={(e) => setNewVitals({ ...newVitals, pulse: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'الحرارة (°C)' : 'Temp (°C)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newVitals.temp}
                    onChange={(e) => setNewVitals({ ...newVitals, temp: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'الأكسجة (SpO2 %)' : 'SpO2 (%)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={newVitals.spO2}
                    onChange={(e) => setNewVitals({ ...newVitals, spO2: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'مستوى الوعي (Consciousness)' : 'Consciousness'}
                  </label>
                  <select
                    value={newVitals.consciousness}
                    onChange={(e) => setNewVitals({ ...newVitals, consciousness: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="Alert">Alert (واعٍ ومنتبه تماماً)</option>
                    <option value="Verbal">Verbal (يستجيب للصوت)</option>
                    <option value="Pain">Pain (يستجيب للألم فقط)</option>
                    <option value="Unresponsive">Unresponsive (غير مستجيب)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'تقييم الألم (Pain 0-10)' : 'Pain Scale (0-10)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={newVitals.painScale}
                    onChange={(e) => setNewVitals({ ...newVitals, painScale: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowVitalsModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white font-semibold rounded shadow-xs hover:bg-teal-700"
                >
                  {isAr ? 'حفظ القراءة' : 'Save Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Management Plan */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'إصدار خطة علاجية وتدخل جراحي جديد' : 'New Management Plan'}</span>
              </h3>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleAddPlan} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'نوع الخطة *' : 'Plan Type *'}
                  </label>
                  <select
                    value={newPlan.planType}
                    onChange={(e) => setNewPlan({ ...newPlan, planType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="obstetric">{isAr ? 'تدبير توليدي ومخاض (Obstetric)' : 'Obstetric'}</option>
                    <option value="urgent_surgery">{isAr ? 'تدخل جراحي عاجل / طارئ' : 'Urgent Surgery'}</option>
                    <option value="elective_surgery">{isAr ? 'عملية جراحية اختيارية' : 'Elective Surgery'}</option>
                    <option value="medical">{isAr ? 'علاج طبي دوائي (Medical)' : 'Medical'}</option>
                    <option value="observation">{isAr ? 'مراقبة سريرية مكثفة' : 'Observation'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'درجة الاستعجال *' : 'Urgency Level *'}
                  </label>
                  <select
                    value={newPlan.urgencyLevel}
                    onChange={(e) => setNewPlan({ ...newPlan, urgencyLevel: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="Elective">{isAr ? 'اختياري / روتيني (Elective)' : 'Elective'}</option>
                    <option value="Urgent">{isAr ? 'عاجل (Urgent)' : 'Urgent'}</option>
                    <option value="Emergency">{isAr ? 'طارئ وفوري (Emergency)' : 'Emergency'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'طبيعة الإجراء المقترح *' : 'Proposed Intervention *'}
                </label>
                <input
                  type="text"
                  required
                  value={newPlan.procedureNature}
                  onChange={(e) => setNewPlan({ ...newPlan, procedureNature: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  placeholder="مثال: إجراء عملية قيصرية سفلية طارئة نظراً لهبوط نبض الجنين"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-600 font-semibold">
                    {isAr ? 'ملاحظات وتفاصيل الخطة السريرية' : 'Clinical Notes'}
                  </label>
                  <VoiceDictationButton
                    onTranscription={(val) => setNewPlan({ ...newPlan, notes: val })}
                    currentValue={newPlan.notes}
                    language={language}
                  />
                </div>
                <textarea
                  rows={3}
                  value={newPlan.notes}
                  onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2.5"
                  placeholder="التفاصيل، تحضير الدم، إخطار التخدير، موافقة المريض..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white font-semibold rounded shadow-xs hover:bg-teal-700"
                >
                  {isAr ? 'اعتماد الخطة العلاجية' : 'Commit Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
