import React, { useState } from 'react';
import { 
  Patient, 
  Admission, 
  PharmacyItem, 
  DispenseRecord, 
  Language, 
  SystemUser 
} from '../types/hmis.ts';
import {
  Pill, 
  Package, 
  RotateCcw, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../api/client.ts';

interface PharmacyModuleProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  pharmacyItems: PharmacyItem[];
  dispenses: DispenseRecord[];
  currentUser: SystemUser;
  language: Language;
  onRefresh: () => void;
}

export const PharmacyModule: React.FC<PharmacyModuleProps> = ({
  currentPatient,
  currentAdmission,
  pharmacyItems,
  dispenses,
  currentUser,
  language,
  onRefresh,
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<'catalog' | 'dispenses'>('dispenses');

  // Search and filtration states
  const [catalogSearch, setCatalogSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'normal'>('all');
  const [modalSearch, setModalSearch] = useState('');

  // Dispense modal state
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(pharmacyItems[0]?.id || '');
  const [dispenseQty, setDispenseQty] = useState(1);
  const [coveredByPackage, setCoveredByPackage] = useState(!!currentAdmission?.packageId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Return modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedDispenseToReturn, setSelectedDispenseToReturn] = useState<DispenseRecord | null>(null);
  const [returnReason, setReturnReason] = useState('');

  // Filtered catalog items
  const filteredCatalogItems = pharmacyItems.filter(p => {
    const q = catalogSearch.toLowerCase().trim();
    const matchesSearch = !q || 
      p.tradeName.toLowerCase().includes(q) ||
      p.scientificName.toLowerCase().includes(q) ||
      p.batchNumber.toLowerCase().includes(q) ||
      p.strength.toLowerCase().includes(q);

    const matchesStock = stockStatusFilter === 'all' || 
      (stockStatusFilter === 'low' ? p.stockLevel <= p.minThreshold : p.stockLevel > p.minThreshold);

    return matchesSearch && matchesStock;
  });

  // Modal filtered items
  const modalFilteredItems = pharmacyItems.filter(p => {
    if (!modalSearch) return true;
    const q = modalSearch.toLowerCase().trim();
    return p.tradeName.toLowerCase().includes(q) || 
           p.scientificName.toLowerCase().includes(q) || 
           p.strength.toLowerCase().includes(q);
  });

  if (!currentAdmission || !currentPatient) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
        {isAr ? 'يرجى اختيار مريض منوم' : 'Please select an active inpatient'}
      </div>
    );
  }

  const handleDispenseItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;
    setIsSubmitting(true);
    try {
      await api.dispensePharmacyItem({
        admissionId: currentAdmission.admissionId,
        itemId: selectedItemId,
        quantity: dispenseQty,
        pharmacistName: currentUser.name,
        coveredByPackage
      });
      setShowDispenseModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispenseToReturn) return;
    setIsSubmitting(true);
    try {
      await api.returnPharmacyItem(selectedDispenseToReturn.id, returnReason, currentUser.name);
      setShowReturnModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedItemObj = pharmacyItems.find(p => p.id === selectedItemId);

  return (
    <div className="space-y-4">
      {/* View Switcher & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('dispenses')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'dispenses' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{isAr ? 'حركات الصرف للمريض والمرتجعات' : 'Patient Dispensed Items & Returns'}</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'catalog' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>{isAr ? 'دليل الأصناف والتسعير وهوامش الربح' : 'Inventory & Pricing Matrix'}</span>
          </button>
        </div>

        <button
          onClick={() => {
            if (pharmacyItems.length > 0 && !selectedItemId) {
              setSelectedItemId(pharmacyItems[0].id);
            }
            setShowDispenseModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAr ? 'صرف دواء / مستلزم للإيواء' : 'Dispense to Inpatient'}</span>
        </button>
      </div>

      {/* TAB 1: Patient Dispensed Items & Returns */}
      {activeTab === 'dispenses' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'سجل الأدوية والمستلزمات المصروفة للإقامة' : 'Inpatient Dispensed Items'}</span>
              </h3>
              <span className="text-slate-500 text-[11px]">
                {isAr ? 'يتم فصل الصرف الفعلي عن أمر الطبيب وعن إعطاء التمريض لسلامة الفوترة' : 'Strict separation between ordering, dispensing, and administration'}
              </span>
            </div>
            <span className="font-mono text-slate-500">{dispenses.length} {isAr ? 'عمليات صرف' : 'records'}</span>
          </div>

          {dispenses.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              {isAr ? 'لم يتم صرف أدوية بعد لهذه الإقامة' : 'No dispensed items found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">{isAr ? 'اسم الصنف والمستلزم' : 'Item Description'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الكمية' : 'Qty'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الإجمالي (د.ل)' : 'Total (LYD)'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'التغطية بالباقة' : 'Package Coverage'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الصيدلي ووقت الصرف' : 'Pharmacist & Time'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الحالة / المرتجع' : 'Status / Return'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {dispenses.map(d => (
                    <tr key={d.id} className={`hover:bg-slate-50 ${d.isReturned ? 'opacity-60 line-through' : ''}`}>
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{d.itemName}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{d.quantity}</td>
                      <td className="py-2.5 px-3 text-slate-600">{d.unitPrice} د.ل</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{d.totalPrice} د.ل</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          d.coveredByPackage ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {d.coveredByPackage ? (isAr ? 'مشمول بالباقة' : 'In Package') : (isAr ? 'حساب إضافي' : 'Out of Package')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-sans text-[11px]">
                        <div>{d.dispensedBy}</div>
                        <div className="font-mono text-slate-400 text-[10px]">{d.timestamp.split('T')[1]?.substring(0, 5)} {d.timestamp.split('T')[0]}</div>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {d.isReturned ? (
                          <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[10px] border border-rose-200" title={d.returnReason}>
                            {isAr ? 'تم إرجاع الصنف للصيدلية' : 'Returned'}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold text-[10px]">
                            {isAr ? 'مصروف فعلياً' : 'Dispensed'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        {!d.isReturned && (
                          <button
                            onClick={() => {
                              setSelectedDispenseToReturn(d);
                              setReturnReason('');
                              setShowReturnModal(true);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded transition-colors"
                          >
                            {isAr ? 'إرجاع وتسوية' : 'Return'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Inventory Catalog & Pricing Matrix (Ch. 19) */}
      {activeTab === 'catalog' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-100 gap-3">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'دليل أدوية الصيدلية وحساب هوامش الربحية (Ch. 19 Formula)' : 'Pharmacy Catalog & Profit Margin Formula'}</span>
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {isAr ? 'قاعدة التسعير: الربح = البيع - الشراء | هامش الربح = (الربح ÷ البيع) × 100 | نسبة الزيادة على الشراء = (الربح ÷ الشراء) × 100' : 'Formula: Profit = Sale - Cost | Margin % = Profit/Sale * 100 | Markup % = Profit/Cost * 100'}
              </p>
            </div>

            {/* Catalog Search & Stock Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder={isAr ? 'بحث بالاسم العلمي، التجاري أو التشغيلة...' : 'Search drug, scientific name or batch...'}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 w-56"
              />
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
              >
                <option value="all">{isAr ? 'كافة الأصناف' : 'All Stock'}</option>
                <option value="low">{isAr ? 'مخزون حرج / منخفض' : 'Low Stock Only'}</option>
                <option value="normal">{isAr ? 'مخزون طبيعي' : 'Adequate Stock'}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">{isAr ? 'الاسم التجاري والعلمي' : 'Trade & Scientific Name'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الشكل والقوة' : 'Form & Strength'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'سعر الشراء (التكلفة)' : 'Cost Price'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'سعر البيع للمريض' : 'Patient Retail'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'هامش الربح (%)' : 'Profit Margin %'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'نسبة الزيادة (%)' : 'Markup %'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'المخزون المتاح' : 'Stock Level'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'رقم التشغيلة والصلاحية' : 'Batch & Expiry'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredCatalogItems.map(p => {
                  const isLow = p.stockLevel <= p.minThreshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-bold text-slate-900">{p.tradeName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{p.scientificName}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{p.form} ({p.strength})</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.purchasePrice.toFixed(2)} د.ل</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{p.sellingPrice.toFixed(2)} د.ل</td>
                      <td className="py-2.5 px-3 text-emerald-700 font-bold">{p.profitMarginPercent.toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-indigo-700 font-bold">{p.markupPercent.toFixed(1)}%</td>
                      <td className="py-2.5 px-3 font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          isLow ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {p.stockLevel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        <div>{p.batchNumber}</div>
                        <div className="text-[10px] text-slate-400">EXP: {p.expiryDate}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Dispense Item to Patient */}
      {showDispenseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'صرف دواء أو مستلزم لحلقة الإيواء' : 'Dispense to Inpatient Admission'}</span>
              </h3>
              <button onClick={() => setShowDispenseModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleDispenseItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'اختر الصنف من المخزون *' : 'Select Item from Stock *'}
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder={isAr ? 'تصفية وبحث في الأصناف المخزنية...' : 'Filter items by name or strength...'}
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs"
                  />
                  <select
                    required
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    {modalFilteredItems.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.tradeName} - {p.strength} (سعر: {p.sellingPrice} د.ل · متوفر: {p.stockLevel})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedItemObj && (
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>{isAr ? 'سعر الشراء:' : 'Cost:'} <strong className="text-slate-700">{selectedItemObj.purchasePrice} د.ل</strong></div>
                  <div>{isAr ? 'سعر البيع:' : 'Retail:'} <strong className="text-teal-700">{selectedItemObj.sellingPrice} د.ل</strong></div>
                  <div>{isAr ? 'هامش الربح:' : 'Margin:'} <strong className="text-emerald-700">{selectedItemObj.profitMarginPercent.toFixed(1)}%</strong></div>
                  <div>{isAr ? 'رقم التشغيلة:' : 'Batch:'} <strong className="text-slate-700">{selectedItemObj.batchNumber}</strong></div>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'الكمية المصروفة *' : 'Quantity *'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedItemObj?.stockLevel || 99}
                  required
                  value={dispenseQty}
                  onChange={(e) => setDispenseQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={coveredByPackage}
                    onChange={(e) => setCoveredByPackage(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span className="text-slate-800 font-semibold">
                    {isAr ? 'مشمول ضمن بنود الباقة العلاجية (لا تفرض فاتورة إضافية)' : 'Covered under Medical Package (No extra fee)'}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDispenseModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري الصرف...' : 'Dispensing...') : (isAr ? 'تأكيد الصرف من الصيدلية' : 'Confirm Dispense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Return Item to Pharmacy */}
      {showReturnModal && selectedDispenseToReturn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>{isAr ? 'إرجاع دواء أو مستلزم وتسوية الفاتورة' : 'Return Dispensed Item'}</span>
              </h3>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleReturnItem} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{selectedDispenseToReturn.itemName}</div>
                <div className="text-slate-600 font-mono">
                  {isAr ? 'الكمية المصروفة:' : 'Quantity:'} {selectedDispenseToReturn.quantity} | {isAr ? 'المبلغ:' : 'Total:'} {selectedDispenseToReturn.totalPrice} د.ل
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isAr ? 'سبب الإرجاع (مطلوب للتسوية المالية والمخزنية) *' : 'Return Reason *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2"
                  placeholder={isAr ? 'إيقاف الدواء من قبل الطبيب، عدم الحاجة للجرعة، الخ...' : 'Doctor discontinued medication'}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جاري الإرجاع...' : 'Processing...') : (isAr ? 'تأكيد الإرجاع واستعادة المخزون' : 'Confirm Return')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
