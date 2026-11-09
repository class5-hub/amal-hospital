import React, { useState } from 'react';
import { 
  Patient, 
  Admission, 
  DietaryOrder, 
  MedicationOrder, 
  Language, 
  SystemUser 
} from '../types/hmis.ts';
import {
  Utensils, 
  Pill, 
  Clock, 
  Plus, 
  AlertCircle, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  PauseCircle,
  Truck,
  Repeat
} from 'lucide-react';
import { api } from '../api/client.ts';
import { VoiceDictationButton } from './VoiceDictationButton.tsx';

interface OrdersAndDietaryModuleProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  dietaryOrders: DietaryOrder[];
  medications: MedicationOrder[];
  currentUser: SystemUser;
  language: Language;
  onRefresh: () => void;
}

export const OrdersAndDietaryModule: React.FC<OrdersAndDietaryModuleProps> = ({
  currentPatient,
  currentAdmission,
  dietaryOrders,
  medications,
  currentUser,
  language,
  onRefresh,
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<'medications' | 'dietary'>('medications');

  // Modals
  const [showMedModal, setShowMedModal] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  const [showDiscontinueModal, setShowDiscontinueModal] = useState(false);
  const [selectedMedToDiscontinue, setSelectedMedToDiscontinue] = useState<MedicationOrder | null>(null);
  const [discontinueReason, setDiscontinueReason] = useState('');

  // Medication form
  const [medForm, setMedForm] = useState({
    tradeName: 'Klaforan',
    genericName: 'Cefotaxime',
    dosageForm: 'Vial',
    strength: '1g',
    dose: '1g',
    route: 'IV' as any,
    frequency: 'TID (كل 8 ساعات)',
    exactTimes: '08:00, 16:00, 24:00',
    durationDays: 3,
    instructions: 'Slow IV injection over 5 minutes after negative skin test'
  });

  // Dietary form
  const [dietForm, setDietForm] = useState({
    dietType: 'soft' as any,
    npoReason: '',
    specialInstructions: 'وجبة خفيفة قليلة الدسم بعد العملية'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allergyWarning, setAllergyWarning] = useState<string | null>(null);

  if (!currentAdmission || !currentPatient) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
        {isAr ? 'يرجى اختيار مريض منوم' : 'Please select an active inpatient'}
      </div>
    );
  }

  // Pre-check drug allergy against patient known allergies
  const handleMedNameChange = (trade: string, generic: string) => {
    setMedForm(prev => ({ ...prev, tradeName: trade, genericName: generic }));
    const combined = `${trade} ${generic}`.toLowerCase();
    const matched = currentPatient.allergies.find((a: string) => 
      combined.includes(a.toLowerCase().split(' ')[0]) || a.toLowerCase().includes(trade.toLowerCase())
    );
    if (matched && !matched.toLowerCase().includes('no known')) {
      setAllergyWarning(`${isAr ? 'تحذير حساسية مهددة:' : 'Critical Allergy Alert:'} ${matched}`);
    } else {
      setAllergyWarning(null);
    }
  };

  const handlePrescribeMed = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const timesArray = medForm.exactTimes.split(',').map(t => t.trim()).filter(Boolean);
      const today = new Date();
      const end = new Date();
      end.setDate(today.getDate() + medForm.durationDays);

      await api.prescribeMedication({
        admissionId: currentAdmission.admissionId,
        tradeName: medForm.tradeName,
        genericName: medForm.genericName,
        dosageForm: medForm.dosageForm,
        strength: medForm.strength,
        dose: medForm.dose,
        route: medForm.route,
        frequency: medForm.frequency,
        exactTimes: timesArray,
        durationDays: medForm.durationDays,
        startDate: today.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        instructions: medForm.instructions,
        prescribedBy: currentUser.name
      }, currentUser);

      setShowMedModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscontinueMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedToDiscontinue) return;
    setIsSubmitting(true);
    try {
      await api.discontinueMedication(selectedMedToDiscontinue.id, discontinueReason, currentUser);
      setShowDiscontinueModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDietOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createDietaryOrder({
        admissionId: currentAdmission.admissionId,
        dietType: dietForm.dietType,
        npoReason: dietForm.dietType === 'npo' ? dietForm.npoReason : undefined,
        specialInstructions: dietForm.specialInstructions,
        startTime: new Date().toISOString(),
        orderedBy: currentUser.name,
        status: 'active'
      }, currentUser);

      setShowDietModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKitchenStatusUpdate = async (orderId: string, status: 'prepared' | 'delivered', deliveredInc = 0, companionInc = 0) => {
    try {
      await api.updateDietaryStatus(orderId, status, deliveredInc, companionInc);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('medications')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'medications' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>{isAr ? 'الأدوية الموصوفة وجدولة الجرعات' : 'Medication Prescriptions'}</span>
          </button>

          <button
            onClick={() => setActiveTab('dietary')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'dietary' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>{isAr ? 'أوامر التغذية والمطبخ (Dietary Orders)' : 'Dietary Orders & Kitchen'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'medications' ? (
            <button
              onClick={() => {
                setAllergyWarning(null);
                setShowMedModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إضافة وصفة دوائية جديدة' : 'Prescribe Medication'}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowDietModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إصدار أمر تغذية جديد' : 'New Dietary Order'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Medications List (Ch. 9 & 11) */}
      {activeTab === 'medications' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'الأدوية الحالية المعتمدة والجرعات الدقيقة' : 'Active Scheduled Medications'}</span>
            </h3>
            <span className="text-slate-500 font-mono">
              {medications.filter(m => m.status === 'active').length} {isAr ? 'أدوية نشطة' : 'active'} · {medications.filter(m => m.status !== 'active').length} {isAr ? 'موقوفة' : 'discontinued'}
            </span>
          </div>

          {medications.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              {isAr ? 'لا توجد أدوية موصوفة حالياً' : 'No active prescriptions.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">{isAr ? 'الدواء والشكل' : 'Medication & Form'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الجرعة والطريق' : 'Dose & Route'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'التكرار والمواعيد الدقيقة' : 'Frequency & Exact Hours'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'المدة والتواريخ' : 'Duration'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'التعليمات' : 'Instructions'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الطبيب' : 'Prescriber'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medications.map(med => {
                    const isActive = med.status === 'active';
                    return (
                      <tr key={med.id} className={`hover:bg-slate-50/80 ${!isActive ? 'opacity-60 bg-slate-50/40' : ''}`}>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{med.tradeName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{med.genericName} · {med.dosageForm} ({med.strength})</div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-800 font-mono">{med.dose}</span>
                          <span className="mr-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {med.route}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">{med.frequency}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-teal-600" />
                            <span className="text-[11px] font-mono text-teal-700">
                              {med.exactTimes?.join(' · ') || '08:00, 20:00'}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          <div>{med.durationDays} {isAr ? 'أيام' : 'days'}</div>
                          <div className="text-[10px] text-slate-400">{med.startDate} → {med.endDate}</div>
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate" title={med.instructions}>
                          {med.instructions || '--'}
                        </td>

                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'موقوف' : 'Discontinued')}
                          </span>
                          {!isActive && med.discontinueReason && (
                            <div className="text-[10px] text-rose-700 truncate max-w-[120px] mt-0.5" title={med.discontinueReason}>
                              {med.discontinueReason}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {med.prescribedBy}
                        </td>

                        <td className="py-2.5 px-3">
                          {isActive && (
                            <button
                              onClick={() => {
                                setSelectedMedToDiscontinue(med);
                                setDiscontinueReason('');
                                setShowDiscontinueModal(true);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:text-white hover:bg-rose-600 border border-rose-300 rounded transition-colors"
                              title={isAr ? 'إيقاف / تعليق الدواء بمصادقة الطبيب' : 'Discontinue'}
                            >
                              {isAr ? 'إيقاف الدواء' : 'Discontinue'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Dietary Orders (Ch. 8) */}
      {activeTab === 'dietary' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'أوامر التغذية السريرية والتنسيق مع المطبخ' : 'Clinical Dietary Orders & Kitchen Dispatch'}</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              {isAr ? 'ربط تلقائي مع المحاسبة لإسقاط وجبات الصيام NPO واحتساب وجبات المرافق' : 'Auto-links NPO deductions & companion meals'}
            </span>
          </div>

          {dietaryOrders.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              {isAr ? 'لا توجد أوامر تغذية مسجلة' : 'No dietary orders.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dietaryOrders.map(order => {
                const isNPO = order.dietType === 'npo';

                return (
                  <div 
                    key={order.id} 
                    className={`border rounded-lg p-4 space-y-3 ${
                      isNPO ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isNPO ? 'text-rose-900' : 'text-slate-900'}`}>
                            {isNPO ? 'NPO - صيام تام عن الأكل والشرب بالكامل' :
                             order.dietType === 'diabetic' ? 'وجبة مرضى السكري (Diabetic Diet)' :
                             order.dietType === 'low_salt' ? 'وجبة قليلة الملح (Low Salt Diet)' :
                             order.dietType === 'soft' ? 'أطعمة لينة بعد الجراحة (Soft Diet)' :
                             order.dietType === 'liquids_only' ? 'سوائل فقط / شوربة (Liquids Only)' : 'وجبة عادية متوازنة (Regular Diet)'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono block mt-0.5">
                          {isAr ? 'وقت البدء:' : 'Start:'} {order.startTime.split('T')[0]} {order.startTime.split('T')[1]?.substring(0, 5)} · {order.orderedBy}
                        </span>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        order.kitchenStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        order.kitchenStatus === 'prepared' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {order.kitchenStatus === 'delivered' ? (isAr ? 'تم تسليم الوجبة' : 'Delivered') :
                         order.kitchenStatus === 'prepared' ? (isAr ? 'جاهزة بالمطبخ' : 'Prepared') :
                         (isAr ? 'قيد التجهيز' : 'Pending')}
                      </span>
                    </div>

                    {isNPO && order.npoReason && (
                      <div className="bg-rose-100/70 border border-rose-300 rounded p-2 text-xs text-rose-900 flex items-center gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                        <span>{isAr ? 'سبب منع الأكل والشرب:' : 'NPO Reason:'} {order.npoReason}</span>
                      </div>
                    )}

                    {order.specialInstructions && !isNPO && (
                      <div className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">
                        {order.specialInstructions}
                      </div>
                    )}

                    {/* Meal counts & Kitchen dispatch controls */}
                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-4 text-slate-600 font-mono">
                        <span>{isAr ? 'وجبات المريض المسلمة:' : 'Patient Meals:'} <strong className="text-slate-900">{order.deliveredMealsCount}</strong></span>
                        <span>{isAr ? 'وجبات المرافق (20 د.ل):' : 'Companion Meals:'} <strong className="text-slate-900">{order.companionMealsCount}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isNPO && (
                          <button
                            onClick={() => handleKitchenStatusUpdate(order.id, 'delivered', 1, 0)}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-teal-700 flex items-center gap-1"
                          >
                            <Truck className="w-3 h-3" />
                            <span>{isAr ? '+ تسليم وجبة مريض' : '+ Deliver Patient'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleKitchenStatusUpdate(order.id, 'delivered', 0, 1)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-indigo-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isAr ? '+ وجبة مرافق' : '+ Companion Meal'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Prescribe Medication */}
      {showMedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'وصف دواء وجدولة الجرعات الطبية الدقيقة' : 'Prescribe Medication'}</span>
              </h3>
              <button onClick={() => setShowMedModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            {/* Allergy alert inside modal if drug clashes with patient allergy */}
            {allergyWarning && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded text-xs text-rose-900 font-bold flex items-center gap-2 animate-pulse">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{allergyWarning}</span>
              </div>
            )}

            <form onSubmit={handlePrescribeMed} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'الاسم التجاري (Trade Name) *' : 'Trade Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={medForm.tradeName}
                    onChange={(e) => handleMedNameChange(e.target.value, medForm.genericName)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                    placeholder="Klaforan, Perfalgan, Oxytocin..."
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'الاسم العلمي (Generic Name) *' : 'Generic Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={medForm.genericName}
                    onChange={(e) => handleMedNameChange(medForm.tradeName, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                    placeholder="Cefotaxime, Paracetamol..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'الشكل والقوة *' : 'Form & Strength *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={medForm.strength}
                    onChange={(e) => setMedForm({ ...medForm, strength: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                    placeholder="1g, 500mg, 10 IU"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'الجرعة المطلوبة *' : 'Dose *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={medForm.dose}
                    onChange={(e) => setMedForm({ ...medForm, dose: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                    placeholder="1g, 1000mg, 20 IU"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'طريق الإعطاء (Route) *' : 'Route *'}
                  </label>
                  <select
                    value={medForm.route}
                    onChange={(e) => setMedForm({ ...medForm, route: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="IV">IV (وريدي)</option>
                    <option value="PO">PO (فموي)</option>
                    <option value="IM">IM (عضلي)</option>
                    <option value="SC">SC (تحت الجلد)</option>
                    <option value="PR">PR (شرجي)</option>
                    <option value="Inhalation">Inhalation (استنشاق)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'التكرار (Frequency) *' : 'Frequency *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={medForm.frequency}
                    onChange={(e) => setMedForm({ ...medForm, frequency: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                    placeholder="TID (كل 8 ساعات), BD, Stat"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {isAr ? 'المواعيد الدقيقة المحددة (Exact Times) *' : 'Exact Times *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={medForm.exactTimes}
                    onChange={(e) => setMedForm({ ...medForm, exactTimes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                    placeholder="08:00, 16:00, 24:00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'المدة بالأيام (Duration Days) *' : 'Duration (Days) *'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={medForm.durationDays}
                  onChange={(e) => setMedForm({ ...medForm, durationDays: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'تعليمات إضافية وتدفق المحلول' : 'Special Instructions'}
                </label>
                <input
                  type="text"
                  value={medForm.instructions}
                  onChange={(e) => setMedForm({ ...medForm, instructions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  placeholder="حقن وريدي بطيء، بالتنقيط في 500 مل..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowMedModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري الاعتماد...' : 'Prescribing...') : (isAr ? 'اعتماد الوصفة وتوليد eMAR' : 'Prescribe & Schedule')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Discontinue Medication (Ch. 11: إيقاف وتعليق الأدوية) */}
      {showDiscontinueModal && selectedMedToDiscontinue && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-rose-600" />
                <span>{isAr ? 'إيقاف / تعليق الدواء بمصادقة الطبيب' : 'Discontinue Medication Order'}</span>
              </h3>
              <button onClick={() => setShowDiscontinueModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleDiscontinueMed} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="font-bold text-slate-900">{selectedMedToDiscontinue.tradeName} ({selectedMedToDiscontinue.dose})</div>
                <div className="text-slate-500">{selectedMedToDiscontinue.route} · {selectedMedToDiscontinue.frequency}</div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'سبب الإيقاف أو التعليق (إلزامي للتوثيق الطبي) *' : 'Reason for Discontinuation *'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={discontinueReason}
                  onChange={(e) => setDiscontinueReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-slate-900"
                  placeholder={isAr ? 'مثال: انتهاء كورس العلاج، استقرار حالة المريض، ظهور أعراض تحسسية، الخ...' : 'Clinical justification'}
                />
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
                {isAr ? 'تنبيه: ستبقى الوصفة القديمة ظاهرة في السجل الطبي كأرشيف مع توثيق اسمك وتاريخ الإيقاف، وستُحدث لوحة التمريض فوراً.' : 'Note: The order is archived in medical history and eMAR is notified.'}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDiscontinueModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري الإيقاف...' : 'Discontinuing...') : (isAr ? 'تأكيد إيقاف الدواء' : 'Confirm Discontinue')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Dietary Order */}
      {showDietModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'إصدار أمر تغذية وحمية سريرية' : 'New Dietary Order'}</span>
              </h3>
              <button onClick={() => setShowDietModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateDietOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'نوع الحمية والطعام المسموح *' : 'Diet Type *'}
                </label>
                <select
                  value={dietForm.dietType}
                  onChange={(e) => setDietForm({ ...dietForm, dietType: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                >
                  <option value="regular">{isAr ? 'وجبة عادية متوازنة (Regular)' : 'Regular'}</option>
                  <option value="soft">{isAr ? 'أطعمة لينة بعد الجراحة (Soft Diet)' : 'Soft Diet'}</option>
                  <option value="diabetic">{isAr ? 'وجبة مرضى السكري (Diabetic)' : 'Diabetic'}</option>
                  <option value="low_salt">{isAr ? 'وجبة قليلة الملح لمرضى الضغط (Low Salt)' : 'Low Salt'}</option>
                  <option value="liquids_only">{isAr ? 'سوائل فقط / شوربة (Liquids Only)' : 'Liquids Only'}</option>
                  <option value="npo">{isAr ? 'NPO - صيام تام عن الأكل والشرب بالفم' : 'NPO (Nil Per Os)'}</option>
                  <option value="special">{isAr ? 'حمية خاصة مخصصة (Custom)' : 'Custom Special'}</option>
                </select>
              </div>

              {dietForm.dietType === 'npo' && (
                <div>
                  <label className="block text-rose-700 font-bold mb-1">
                    {isAr ? 'سبب أمر الصيام التام NPO (إلزامي) *' : 'NPO Reason (Mandatory) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={dietForm.npoReason}
                    onChange={(e) => setDietForm({ ...dietForm, npoReason: e.target.value })}
                    className="w-full bg-rose-50 border border-rose-300 rounded px-2.5 py-1.5 text-rose-900"
                    placeholder="تحضير لعملية قيصرية، اشتباه بنزيف حاد..."
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-600 font-semibold">
                    {isAr ? 'تعليمات إضافية للمطبخ والتمريض' : 'Instructions for Kitchen & Nursing'}
                  </label>
                  <VoiceDictationButton
                    onTranscription={(val) => setDietForm({ ...dietForm, specialInstructions: val })}
                    currentValue={dietForm.specialInstructions}
                    language={language}
                  />
                </div>
                <textarea
                  rows={2}
                  value={dietForm.specialInstructions}
                  onChange={(e) => setDietForm({ ...dietForm, specialInstructions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900"
                  placeholder="بدون سكر مضاف، شوربة خضار دافئة..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDietModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري الإصدار...' : 'Creating...') : (isAr ? 'إصدار أمر التغذية' : 'Create Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
