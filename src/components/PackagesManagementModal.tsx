import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  BedDouble, 
  Stethoscope, 
  FlaskConical, 
  Pill, 
  Layers, 
  Sparkles,
  Info
} from 'lucide-react';
import { MedicalPackage, RoomType, SystemUser, Language } from '../types/hmis.ts';
import { api } from '../api/client.ts';

interface PackagesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  packages: MedicalPackage[];
  currentUser: SystemUser;
  language: Language;
  onRefreshPackages: () => void;
}

export const PackagesManagementModal: React.FC<PackagesManagementModalProps> = ({
  isOpen,
  onClose,
  packages,
  currentUser,
  language,
  onRefreshPackages
}) => {
  if (!isOpen) return null;
  const isAr = language === 'ar';

  const [editingPackage, setEditingPackage] = useState<MedicalPackage | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [formData, setFormData] = useState<Omit<MedicalPackage, 'id'>>({
    code: '',
    name: '',
    nameAr: '',
    totalPrice: 1800,
    includedDays: 2,
    roomTypeIncluded: 'standard',
    includedDoctorVisits: 2,
    includedNursingDays: 2,
    includedProcedures: ['ولادة طبيعية تحت إشراف استشاري', 'تخطيط قلب الجنين CTG'],
    includedLabs: ['CBC', 'Blood Group & Rh', 'Urine Analysis'],
    includedMedsLimitAmount: 250,
    description: 'باقة متكاملة للإيواء والولادة الطبيعية تشمل الغرفة وفحوصات المختبر والأدوية الأساسية'
  });

  const resetForm = () => {
    setFormData({
      code: `PKG-OB-${Date.now().toString().slice(-4)}`,
      name: '',
      nameAr: '',
      totalPrice: 2000,
      includedDays: 2,
      roomTypeIncluded: 'standard',
      includedDoctorVisits: 2,
      includedNursingDays: 2,
      includedProcedures: ['ولادة قيصرية مجدولة', 'تخدير نصفي معتمد'],
      includedLabs: ['CBC', 'Coagulation Profile PT/PTT', 'Crossmatch 2 Units'],
      includedMedsLimitAmount: 350,
      description: ''
    });
    setEditingPackage(null);
    setIsCreatingNew(false);
    setErrorMsg('');
  };

  const handleStartEdit = (pkg: MedicalPackage) => {
    setEditingPackage(pkg);
    setIsCreatingNew(false);
    setFormData({
      code: pkg.code,
      name: pkg.name,
      nameAr: pkg.nameAr,
      totalPrice: pkg.totalPrice,
      includedDays: pkg.includedDays,
      roomTypeIncluded: pkg.roomTypeIncluded,
      includedDoctorVisits: pkg.includedDoctorVisits,
      includedNursingDays: pkg.includedNursingDays,
      includedProcedures: [...pkg.includedProcedures],
      includedLabs: [...pkg.includedLabs],
      includedMedsLimitAmount: pkg.includedMedsLimitAmount,
      description: pkg.description
    });
  };

  const handleStartCreate = () => {
    resetForm();
    setIsCreatingNew(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (editingPackage) {
        await api.updatePackage(editingPackage.id, formData, currentUser);
      } else {
        await api.createPackage(formData, currentUser);
      }
      onRefreshPackages();
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الباقة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (pkg: MedicalPackage) => {
    const confirmText = isAr 
      ? `هل أنت متأكد من رغبتك في حذف باقة "${pkg.nameAr}" نهائياً؟` 
      : `Are you sure you want to delete package "${pkg.name}"?`;
    if (!window.confirm(confirmText)) return;

    try {
      await api.deletePackage(pkg.id, currentUser);
      onRefreshPackages();
      if (editingPackage?.id === pkg.id) resetForm();
    } catch (err: any) {
      alert(err.message || 'فشل حذف الباقة');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-indigo-800 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Package className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>{isAr ? 'إدارة الباقات العلاجية والجراحية' : 'Medical & Surgical Packages Manager'}</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30">
                  {packages.length} {isAr ? 'باقة معرفة' : 'Packages'}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAr 
                  ? 'تعريف وتحديث باقات الولادة والإيواء القيصرية والطبيعية، وتحديد الأيام والخدمات والأدوية المشمولة' 
                  : 'Define, customize, and price fixed-rate maternity & surgical packages'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreatingNew && !editingPackage && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'إضافة باقة جديدة' : 'New Package'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Form Mode (Create or Edit) */}
          {(isCreatingNew || editingPackage) ? (
            <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>
                    {editingPackage 
                      ? (isAr ? `تعديل باقة: ${editingPackage.nameAr}` : `Edit Package: ${editingPackage.name}`)
                      : (isAr ? 'إنشاء باقة علاجية جديدة' : 'Create New Package')}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  {isAr ? 'إلغاء والعودة للقائمة' : 'Cancel'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'كود الباقة الفريد *' : 'Package Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="PKG-CS-01"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'اسم الباقة بالعربية *' : 'Arabic Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    placeholder="باقة الولادة القيصرية الأولى"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'الاسم بالإنجليزية *' : 'English Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Elective Cesarean Section Package"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'السعر الإجمالي للباقة (د.ل) *' : 'Total Package Price (LYD) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={10}
                    value={formData.totalPrice}
                    onChange={(e) => setFormData({ ...formData, totalPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-teal-700 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'عدد أيام الإيواء المشمولة' : 'Included Inpatient Days'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.includedDays}
                    onChange={(e) => setFormData({ ...formData, includedDays: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'فئة الغرفة المشمولة' : 'Included Room Type'}
                  </label>
                  <select
                    value={formData.roomTypeIncluded}
                    onChange={(e) => setFormData({ ...formData, roomTypeIncluded: e.target.value as RoomType })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                  >
                    <option value="standard">{isAr ? 'غرفة عادية مزدوجة (Standard)' : 'Standard Double'}</option>
                    <option value="private">{isAr ? 'غرفة فردية خاصة (Private)' : 'Private Single'}</option>
                    <option value="vip">{isAr ? 'جناح فندقي خاص (VIP Suite)' : 'VIP Suite'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'مرات مرور وزيارات الاستشاري' : 'Consultant Visits Included'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.includedDoctorVisits}
                    onChange={(e) => setFormData({ ...formData, includedDoctorVisits: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'أيام الرعاية التمريضية' : 'Nursing Care Days Included'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.includedNursingDays}
                    onChange={(e) => setFormData({ ...formData, includedNursingDays: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'سقف الأدوية المشمولة مجاناً (د.ل)' : 'Included Free Meds Allowance (LYD)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.includedMedsLimitAmount}
                    onChange={(e) => setFormData({ ...formData, includedMedsLimitAmount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'الإجراءات الجراحية والطبية المشمولة (مفصولة بفواصل)' : 'Included Procedures (comma separated)'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.includedProcedures.join('، ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      includedProcedures: e.target.value.split(/[,،]/).map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="ولادة قيصرية، تخدير نصفي، كشف طبيب الأطفال للمولود"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'تحاليل المختبر المشمولة (مفصولة بفواصل)' : 'Included Labs (comma separated)'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.includedLabs.join('، ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      includedLabs: e.target.value.split(/[,،]/).map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="CBC, Crossmatch 2 Units, Blood Group, Urine Analysis"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'وصف وملاحظات الباقة' : 'Package Description'}
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={isAr ? 'تفاصيل إضافية عن شروط الباقة وما لا تغطيه...' : 'Additional package terms...'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmitting 
                      ? (isAr ? 'جاري الحفظ...' : 'Saving...') 
                      : (isAr ? 'حفظ وتطبيق الباقة' : 'Save Package')}
                  </span>
                </button>
              </div>
            </form>
          ) : null}

          {/* Packages Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {pkg.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {pkg.roomTypeIncluded.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2">
                    {isAr ? pkg.nameAr : pkg.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                    {pkg.description || (isAr ? 'باقة رعاية متكاملة' : 'Comprehensive care package')}
                  </p>

                  <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5 text-teal-600" />
                        <span>{isAr ? 'مدة الإقامة المشمولة:' : 'Stay:'}</span>
                      </span>
                      <strong className="text-slate-800">{pkg.includedDays} {isAr ? 'أيام' : 'days'}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isAr ? 'مرور استشاري:' : 'Doctor Visits:'}</span>
                      </span>
                      <strong className="text-slate-800">{pkg.includedDoctorVisits} {isAr ? 'مرات' : 'visits'}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Pill className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isAr ? 'رصيد أدوية مجاني:' : 'Meds Allowance:'}</span>
                      </span>
                      <strong className="text-slate-800 font-mono">{pkg.includedMedsLimitAmount} {isAr ? 'د.ل' : 'LYD'}</strong>
                    </div>
                  </div>

                  {/* Included Procedures pills */}
                  <div className="mt-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      {isAr ? 'الخدمات المشمولة:' : 'Included:'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {pkg.includedProcedures.slice(0, 3).map((pr, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 text-[10px] border border-teal-200">
                          {pr}
                        </span>
                      ))}
                      {pkg.includedLabs.slice(0, 2).map((lab, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] border border-blue-200">
                          {lab}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer with Price & Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'السعر الشامل للباقة' : 'Fixed Price'}</span>
                    <span className="text-base font-extrabold text-teal-700 font-mono">
                      {pkg.totalPrice.toLocaleString()} <span className="text-xs font-normal">{isAr ? 'د.ل' : 'LYD'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(pkg)}
                      className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title={isAr ? 'تعديل الباقة' : 'Edit Package'}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(pkg)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title={isAr ? 'حذف الباقة' : 'Delete Package'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              {isAr 
                ? 'يتم تطبيق الباقات تلقائياً في شاشة الدخول وإصدار الفواتير المبدئية لحساب الإعفاءات ومطابقة المصروفات' 
                : 'Selected packages are automatically applied to admissions and provisional invoice calculations'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-xs transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
