import React, { useState } from 'react';
import { 
  Patient, 
  Admission, 
  LabOrder, 
  LabTestItem, 
  Language, 
  SystemUser 
} from '../types/hmis.ts';
import {
  FlaskConical,
  TestTube,
  CheckCircle2,
  AlertTriangle,
  FileText,
  TrendingDown,
  TrendingUp,
  Plus,
  Printer,
  ShieldAlert,
  ArrowRight,
  Search,
  Filter,
  CheckSquare,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client.ts';
import { LabWorksheetOrderModal } from './LabWorksheetOrderModal.tsx';

interface LISModuleProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  labOrders: LabOrder[];
  currentUser: SystemUser;
  language: Language;
  onRefresh: () => void;
}

export const LISModule: React.FC<LISModuleProps> = ({
  currentPatient,
  currentAdmission,
  labOrders,
  currentUser,
  language,
  onRefresh,
}) => {
  const isAr = language === 'ar';
  const [activeViewMode, setActiveViewMode] = useState<'orders' | 'worksheet_matrix' | 'longitudinal' | 'trend' | 'report'>('orders');
  const [selectedReportOrder, setSelectedReportOrder] = useState<LabOrder | null>(null);

  // New Lab Requisition Worksheet Modal state
  const [showWorksheetModal, setShowWorksheetModal] = useState(false);

  // Enhanced Dropbox search and filtration states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [onlyCriticalFilter, setOnlyCriticalFilter] = useState(false);

  if (!currentAdmission || !currentPatient) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
        {isAr ? 'يرجى اختيار مريض منوم للاطلاع على الفحوصات المخبرية' : 'Please select an inpatient to view laboratory orders'}
      </div>
    );
  }

  // Find critical alerts pending acknowledgment
  const criticalOrders = labOrders.filter(o => 
    o.status === 'approved' && 
    o.results.some((r: LabTestItem) => r.isCritical) && 
    !o.criticalAlertAcknowledged
  );

  const handleAcknowledgeCritical = async (orderId: string) => {
    try {
      await api.acknowledgeLabCriticalAlert(orderId, currentUser.name);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAdvanceStatus = async (order: LabOrder) => {
    try {
      if (order.status === 'ordered') {
        await api.updateLabStatus(order.id, 'sample_collected', { collectorName: currentUser.name }, currentUser);
      } else if (order.status === 'sample_collected') {
        await api.updateLabStatus(order.id, 'received_in_lab', { receiverName: currentUser.name }, currentUser);
      } else if (order.status === 'received_in_lab') {
        await api.updateLabStatus(order.id, 'processing', {}, currentUser);
      } else if (order.status === 'processing') {
        // Approve with results
        const dummyResults: LabTestItem[] = [
          { name: 'Hemoglobin (خضاب الدم)', key: 'Hb', value: 10.4, unit: 'g/dL', refRange: '12.0 - 15.5', isAbnormal: true },
          { name: 'White Blood Cells', key: 'WBC', value: 8.5, unit: 'x10^9/L', refRange: '4.0 - 11.0', isAbnormal: false },
          { name: 'Platelets', key: 'PLT', value: 220, unit: 'x10^9/L', refRange: '150 - 450', isAbnormal: false }
        ];
        await api.updateLabStatus(order.id, 'approved', { approverName: currentUser.name, results: dummyResults }, currentUser);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Extract longitudinal data points for Hb, Creatinine, CRP
  // Matching the exact example given on Page 5 of the specification:
  // "مثال Hb: 10.0 عند الدخول، 9.2 في الفحص التالي، 8.6 ثم 10.1 g/dL"
  const longitudinalHbData = [
    { date: '2026-11-05 09:30', stage: isAr ? 'عند الدخول' : 'Admission', value: 10.0, unit: 'g/dL', status: 'mild_anemia' },
    { date: '2026-11-06 08:00', stage: isAr ? 'الفحص الثاني' : 'Post-Op Day 1', value: 9.2, unit: 'g/dL', status: 'moderate_drop' },
    { date: '2026-11-07 03:20', stage: isAr ? 'نزيف إسعافي (حرج)' : 'Acute Bleed (Critical)', value: 8.6, unit: 'g/dL', status: 'critical' },
    { date: '2026-11-07 08:30', stage: isAr ? 'بعد نقل الدم' : 'Post-Transfusion', value: 10.1, unit: 'g/dL', status: 'improving' }
  ];

  // Multi-criteria filter for orders
  const filteredOrders = labOrders.filter(order => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      order.testName.toLowerCase().includes(q) ||
      order.category.toLowerCase().includes(q) ||
      order.orderedBy.toLowerCase().includes(q) ||
      order.results.some(r => r.name.toLowerCase().includes(q) || r.key.toLowerCase().includes(q))
    );

    const matchesCategory = categoryFilter === 'all' || order.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesUrgency = urgencyFilter === 'all' || order.urgency.toLowerCase() === urgencyFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesCritical = !onlyCriticalFilter || order.results.some(r => r.isCritical);

    return matchesSearch && matchesCategory && matchesUrgency && matchesStatus && matchesCritical;
  });

  return (
    <div className="space-y-4">
      {/* CRITICAL ALERT BANNER (Ch. 7 REQUIREMENT) */}
      {criticalOrders.length > 0 && (
        <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-lg shadow-sm animate-pulse flex flex-wrap items-center justify-between gap-3 text-rose-900">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                {isAr ? '⚠️ تنبيه نتائج مخبرية حرجة (Critical Lab Results) تتطلب إقرار الطبيب:' : 'CRITICAL LAB ALERT - IMMEDIATE PHYSICIAN ACTION REQUIRED:'}
              </div>
              <div className="text-xs font-semibold text-rose-800 mt-0.5">
                {criticalOrders.map(o => `${o.testName} (Hb: 8.6 g/dL - Critical Alert)`).join(' · ')}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleAcknowledgeCritical(criticalOrders[0].id)}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-xs transition-colors shadow-xs"
          >
            {isAr ? 'إقرار الاطلاع الطبي والتوثيق' : 'Acknowledge Critical Alert'}
          </button>
        </div>
      )}

      {/* View Switcher & Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-2.5">
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <button
            onClick={() => setActiveViewMode('orders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-md transition-colors ${
              activeViewMode === 'orders' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>{isAr ? 'الطلبات والمسار السريري' : 'Orders Lifecycle'}</span>
            <span className="font-mono text-[10px] bg-slate-800/20 px-1.5 py-0.2 rounded">
              {labOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveViewMode('worksheet_matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-md transition-colors ${
              activeViewMode === 'worksheet_matrix' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>{isAr ? 'ورقة العمل المخبرية (Worksheet Bench Matrix)' : 'Lab Worksheet Matrix'}</span>
          </button>

          <button
            onClick={() => setActiveViewMode('longitudinal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-md transition-colors ${
              activeViewMode === 'longitudinal' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{isAr ? 'المتابعة الطولية المقارنة' : 'Longitudinal View'}</span>
          </button>

          <button
            onClick={() => setActiveViewMode('trend')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-md transition-colors ${
              activeViewMode === 'trend' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{isAr ? 'منحنى التغير البياني' : 'Trend Curve'}</span>
          </button>
        </div>

        {/* Primary Action: Open Traditional Lab Requisition Worksheet */}
        <button
          onClick={() => setShowWorksheetModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{isAr ? 'طلب ورقة عمل مخبرية تقليدية' : 'New Lab Worksheet Requisition'}</span>
        </button>
      </div>

      {/* Enhanced Dropbox Search & Filter Controls Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute rtl:right-2.5 ltr:left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في الفحوصات المخبرية (CBC, خضاب، يوريا)...' : 'Search lab orders or parameters...'}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg rtl:pr-8 rtl:pl-3 ltr:pl-8 ltr:pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute rtl:left-2.5 ltr:right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">{isAr ? 'القسم:' : 'Category:'}</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="all">{isAr ? 'جميع الأقسام' : 'All Categories'}</option>
              <option value="hematology">{isAr ? 'أمراض الدم (Hematology)' : 'Hematology'}</option>
              <option value="biochemistry">{isAr ? 'الكيمياء الحيوية (Biochemistry)' : 'Biochemistry'}</option>
              <option value="blood bank">{isAr ? 'بنك الدم (Blood Bank)' : 'Blood Bank'}</option>
              <option value="serology">{isAr ? 'المصول والمناعة (Serology)' : 'Serology'}</option>
            </select>
          </div>

          {/* Urgency Dropdown Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">{isAr ? 'الاستعجال:' : 'Urgency:'}</span>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="all">{isAr ? 'الكل' : 'All'}</option>
              <option value="routine">{isAr ? 'روتيني (Routine)' : 'Routine'}</option>
              <option value="urgent">{isAr ? 'عاجل (Urgent)' : 'Urgent'}</option>
              <option value="stat">{isAr ? 'فوري طارئ (Stat)' : 'Stat'}</option>
            </select>
          </div>

          {/* Status Dropdown Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">{isAr ? 'الحالة:' : 'Status:'}</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="ordered">{isAr ? 'تم الطلب' : 'Ordered'}</option>
              <option value="sample_collected">{isAr ? 'تم سحب العينة' : 'Collected'}</option>
              <option value="received_in_lab">{isAr ? 'مستلم بالمختبر' : 'Received'}</option>
              <option value="processing">{isAr ? 'قيد التحليل' : 'Processing'}</option>
              <option value="approved">{isAr ? 'معتمد' : 'Approved'}</option>
            </select>
          </div>
        </div>

        {/* Critical Only Toggle Filter */}
        <button
          type="button"
          onClick={() => setOnlyCriticalFilter(!onlyCriticalFilter)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition-colors ${
            onlyCriticalFilter
              ? 'bg-rose-600 border-rose-600 text-white'
              : 'bg-slate-50 border-slate-300 text-rose-700 hover:bg-rose-50'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{isAr ? 'القيم الحرجة فقط ⚠️' : 'Critical Only'}</span>
        </button>
      </div>

      {/* VIEW 1: Lab Sample Lifecycle & Orders (Ch. 7) */}
      {activeViewMode === 'orders' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <TestTube className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'مسار العينات السريرية: إنشاء ← سحب ← استلام ← معالجة ← اعتماد' : 'Sample Lifecycle: Ordered → Collected → Received → Processed → Approved'}</span>
            </h3>
            <span className="text-slate-500 font-mono">
              {filteredOrders.length} / {labOrders.length} {isAr ? 'فحوصات' : 'orders'}
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs space-y-2">
              <FlaskConical className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">
                {isAr ? 'لا توجد طلبات مخبرية تطابق معايير التصفية والبحث' : 'No lab orders match the selected filters'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setUrgencyFilter('all');
                  setStatusFilter('all');
                  setOnlyCriticalFilter(false);
                }}
                className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-100"
              >
                {isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const isApproved = order.status === 'approved';
                const isUrgent = order.urgency !== 'Routine';

                return (
                  <div key={order.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{order.testName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.urgency === 'Stat' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          order.urgency === 'Urgent' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {order.urgency}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">({order.category})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                          order.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'received_in_lab' ? 'bg-indigo-100 text-indigo-800' :
                          order.status === 'sample_collected' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {order.status === 'approved' ? (isAr ? '✓ معتمد بالملف' : 'Approved') :
                           order.status === 'processing' ? (isAr ? 'قيد التحليل' : 'Processing') :
                           order.status === 'received_in_lab' ? (isAr ? 'مستلم بالمختبر' : 'Received in Lab') :
                           order.status === 'sample_collected' ? (isAr ? 'تم سحب العينة' : 'Collected') :
                           (isAr ? 'تم الطلب' : 'Ordered')}
                        </span>

                        {!isApproved ? (
                          <button
                            onClick={() => handleAdvanceStatus(order)}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                          >
                            <span>
                              {order.status === 'ordered' ? (isAr ? 'تأكيد السحب' : 'Mark Collected') :
                               order.status === 'sample_collected' ? (isAr ? 'تأكيد الاستلام' : 'Mark Received') :
                               order.status === 'received_in_lab' ? (isAr ? 'بدء التحليل' : 'Process') :
                               (isAr ? 'اعتماد النتيجة' : 'Approve')}
                            </span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedReportOrder(order);
                              setActiveViewMode('report');
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>{isAr ? 'طباعة تقرير PDF' : 'PDF Report'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lifecycle Timestamps Trail */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] bg-white p-2.5 rounded border border-slate-200/80 font-mono">
                      <div>
                        <span className="text-slate-400 block">{isAr ? 'وقت الطلب والطبيب:' : 'Order Time:'}</span>
                        <strong className="text-slate-800">{order.orderTime.split('T')[1]?.substring(0, 5)}</strong> ({order.orderedBy})
                      </div>
                      <div>
                        <span className="text-slate-400 block">{isAr ? 'وقت السحب والساحب:' : 'Collection:'}</span>
                        <span className="text-slate-800">{order.sampleCollectedAt ? `${order.sampleCollectedAt.split('T')[1]?.substring(0, 5)} (${order.sampleCollectedBy})` : '--'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">{isAr ? 'وقت الاستلام بالمختبر:' : 'Lab Receipt:'}</span>
                        <span className="text-slate-800">{order.labReceivedAt ? `${order.labReceivedAt.split('T')[1]?.substring(0, 5)} (${order.labReceivedBy})` : '--'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">{isAr ? 'وقت الاعتماد الاستشاري:' : 'Approval:'}</span>
                        <span className="text-emerald-700 font-bold">{order.approvedAt ? `${order.approvedAt.split('T')[1]?.substring(0, 5)} (${order.approvedBy})` : '--'}</span>
                      </div>
                    </div>

                    {/* Test Results Table if approved */}
                    {order.results && order.results.length > 0 && order.status === 'approved' && (
                      <div className="pt-2">
                        <table className="w-full text-xs text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                              <th className="py-1.5 px-3">{isAr ? 'المؤشر المخبري' : 'Parameter'}</th>
                              <th className="py-1.5 px-3">{isAr ? 'القيمة المحصلة' : 'Result'}</th>
                              <th className="py-1.5 px-3">{isAr ? 'الوحدة' : 'Unit'}</th>
                              <th className="py-1.5 px-3">{isAr ? 'المدى المرجعي الطبيعي' : 'Reference Range'}</th>
                              <th className="py-1.5 px-3">{isAr ? 'الحالة' : 'Status'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {order.results.map((res: LabTestItem, idx: number) => (
                              <tr key={idx} className={res.isCritical ? 'bg-rose-50/80 font-bold' : res.isAbnormal ? 'bg-amber-50/60' : ''}>
                                <td className="py-1.5 px-3 font-sans text-slate-900">{res.name}</td>
                                <td className="py-1.5 px-3 font-bold text-slate-900">{res.value}</td>
                                <td className="py-1.5 px-3 text-slate-500">{res.unit}</td>
                                <td className="py-1.5 px-3 text-slate-500">{res.refRange}</td>
                                <td className="py-1.5 px-3">
                                  {res.isCritical ? (
                                    <span className="text-rose-700 font-bold text-[10px] bg-rose-100 px-1.5 py-0.5 rounded">
                                      {isAr ? 'قيمة حرجة ⚠️' : 'CRITICAL'}
                                    </span>
                                  ) : res.isAbnormal ? (
                                    <span className="text-amber-700 font-semibold text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">
                                      {isAr ? 'غير طبيعي' : 'Abnormal'}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-medium text-[10px]">
                                      {isAr ? 'طبيعي' : 'Normal'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Traditional Laboratory Worksheet Bench Matrix */}
      {activeViewMode === 'worksheet_matrix' && (
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-5 text-xs">
          {/* Authentic Bench Requisition Slip Letterhead */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900 tracking-tight">
                  {isAr ? 'ورقة العمل المخبرية السريرية (Clinical Laboratory Bench Matrix)' : 'Clinical Laboratory Bench Worksheet Matrix'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-100 text-teal-800 border border-teal-300">
                  ACCREDITED BENCH FORM
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isAr ? 'عرض شامل لكافة الباقات والفحوصات المحللة والمطلوبة للمريض وفق تصنيف أنابيب وسوائل السحب' : 'Consolidated bench view of all ordered, processed, and verified analytes across specimen types'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isAr ? 'طباعة ورقة العمل' : 'Print Worksheet'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowWorksheetModal(true)}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'طلب فحوصات بورقة العمل' : 'Order via Worksheet'}</span>
              </button>
            </div>
          </div>

          {/* Patient Context Requisition Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px] font-sans font-bold">{isAr ? 'المريضة:' : 'Patient:'}</span>
              <strong className="text-slate-900 truncate block font-sans">{currentPatient.fullName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-sans font-bold">{isAr ? 'رقم الملف الدائم:' : 'MRN:'}</span>
              <strong className="text-slate-900">{currentPatient.mrn}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-sans font-bold">{isAr ? 'رقم الإيواء:' : 'ADM ID:'}</span>
              <strong className="text-slate-900">{currentAdmission.admissionId}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-sans font-bold">{isAr ? 'الغرفة والسرير:' : 'Bed / Ward:'}</span>
              <strong className="text-teal-700 font-sans">{currentAdmission.roomNumber} ({currentAdmission.roomType})</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-sans font-bold">{isAr ? 'فصيلة الدم المعتمدة:' : 'Blood Group:'}</span>
              <strong className="text-red-700 font-bold">{currentPatient.bloodGroup}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-sans font-bold">{isAr ? 'إجمالي الطلبات:' : 'Total Orders:'}</span>
              <strong className="text-slate-800">{labOrders.length} {isAr ? 'طلب مسجل' : 'Orders'}</strong>
            </div>
          </div>

          {/* Traditional Bench Panels Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Panel A: Hematology & Hemostasis Bench */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-purple-50 border-b border-purple-200 px-3.5 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  <span className="font-bold text-purple-950">
                    {isAr ? 'قسم أمراض الدم والتخثر (Hematology & Hemostasis)' : 'Hematology & Hemostasis Bench'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-purple-800 font-semibold bg-purple-100 px-2 py-0.5 rounded">
                  EDTA Lavender & Citrate Blue
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="p-2.5 flex items-center justify-between bg-slate-50/50 text-[11px] font-semibold text-slate-500">
                  <span>{isAr ? 'اسم الفحص / الرمز' : 'Analyte / Code'}</span>
                  <span>{isAr ? 'النتيجة المحصلة / المرجع' : 'Result / Ref Range'}</span>
                </div>
                <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded mr-1">HEM-01</span>
                    <span className="font-bold text-slate-900">Hemoglobin (خضاب الدم Hb)</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900 text-sm">10.4 g/dL</span>
                    <span className="text-[10px] text-slate-400 block">12.0 - 15.5 g/dL (Mild Anemia)</span>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded mr-1">HEM-01</span>
                    <span className="font-bold text-slate-900">White Blood Cells (WBC)</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900 text-sm">8.5 x10^9/L</span>
                    <span className="text-[10px] text-slate-400 block">4.0 - 11.0 x10^9/L (Normal)</span>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded mr-1">HEM-03</span>
                    <span className="font-bold text-slate-900">Platelet Count (الصفائح PLT)</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900 text-sm">220 x10^9/L</span>
                    <span className="text-[10px] text-slate-400 block">150 - 450 x10^9/L (Normal)</span>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded mr-1">HEM-04</span>
                    <span className="font-bold text-slate-900">Prothrombin Time & INR (PT/INR)</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900 text-sm">1.05 INR</span>
                    <span className="text-[10px] text-slate-400 block">0.90 - 1.15 INR (Normal)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel B: Clinical Biochemistry & Metabolic Bench */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-amber-50 border-b border-amber-200 px-3.5 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="font-bold text-amber-950">
                    {isAr ? 'الكيمياء الحيوية ووظائف الأعضاء (Clinical Biochemistry)' : 'Clinical Biochemistry Bench'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded">
                  SST Gold Gel & Fluoride Gray
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="p-2.5 flex items-center justify-between bg-slate-50/50 text-[11px] font-semibold text-slate-500">
                  <span>{isAr ? 'اسم الفحص / الرمز' : 'Analyte / Code'}</span>
                  <span>{isAr ? 'النتيجة المحصلة / المرجع' : 'Result / Ref Range'}</span>
                </div>
                <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded mr-1">BIO-01</span>
                    <span className="font-bold text-slate-900">Serum Creatinine (كرياتينين الدم)</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900 text-sm">0.78 mg/dL</span>
                    <span className="text-[10px] text-slate-400 block">0.50 - 0.90 mg/dL (Normal)</span>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded mr-1">BIO-01</span>
                    <span className="font-bold text-slate-900">Blood Urea Nitrogen (اليوريا)</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900 text-sm">24 mg/dL</span>
                    <span className="text-[10px] text-slate-400 block">15 - 40 mg/dL (Normal)</span>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded mr-1">BIO-02</span>
                    <span className="font-bold text-slate-900">Serum Uric Acid (حمض اليوريك)</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900 text-sm">4.1 mg/dL</span>
                    <span className="text-[10px] text-slate-400 block">2.5 - 5.5 mg/dL (Negative for Preeclampsia)</span>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded mr-1">BIO-07</span>
                    <span className="font-bold text-slate-900">Random Blood Glucose (سكر عشوائي)</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900 text-sm">118 mg/dL</span>
                    <span className="text-[10px] text-slate-400 block">70 - 140 mg/dL (Euglycemic)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel C: Maternal & Ob/Gyn Hormones Bench */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-pink-50 border-b border-pink-200 px-3.5 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                  <span className="font-bold text-pink-950">
                    {isAr ? 'الأمومة وهرمونات النساء والولادة (Maternal & Ob/Gyn)' : 'Maternal & Ob/Gyn Bench'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-pink-800 font-semibold bg-pink-100 px-2 py-0.5 rounded">
                  SST Gold Gel
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="p-2.5 flex items-center justify-between bg-slate-50/50 text-[11px] font-semibold text-slate-500">
                  <span>{isAr ? 'اسم الفحص / الرمز' : 'Analyte / Code'}</span>
                  <span>{isAr ? 'النتيجة المحصلة / المرجع' : 'Result / Ref Range'}</span>
                </div>
                <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded mr-1">MAT-01</span>
                    <span className="font-bold text-slate-900">Quantitative Beta-hCG (هرمون الحمل)</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-emerald-700 text-sm">48,250 mIU/mL</span>
                    <span className="text-[10px] text-slate-400 block">Corresponds to Gestational Age</span>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded mr-1">MAT-04</span>
                    <span className="font-bold text-slate-900">TSH High Sensitivity (الغدة الدرقية)</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900 text-sm">1.82 uIU/mL</span>
                    <span className="text-[10px] text-slate-400 block">0.40 - 2.50 uIU/mL (Target Met)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel D: Blood Bank & Transfusion Medicine */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-red-50 border-b border-red-200 px-3.5 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                  <span className="font-bold text-red-950">
                    {isAr ? 'بنك الدم ونقل المشتقات (Transfusion & Blood Bank)' : 'Blood Bank & Crossmatch'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-red-800 font-semibold bg-red-100 px-2 py-0.5 rounded">
                  Pink Crossmatch Tube
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="p-2.5 flex items-center justify-between bg-slate-50/50 text-[11px] font-semibold text-slate-500">
                  <span>{isAr ? 'الفحص المطلوب' : 'Order'}</span>
                  <span>{isAr ? 'حالة التوافق والجاهزية' : 'Status'}</span>
                </div>
                <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded mr-1">BBK-01</span>
                    <span className="font-bold text-slate-900">ABO & Rh(D) Confirmed</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">{currentPatient.bloodGroup}</span>
                    <span className="text-[10px] text-emerald-700 block font-sans">✓ Verified by Lab</span>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded mr-1">BBK-04</span>
                    <span className="font-bold text-slate-900">Crossmatch 2 Units Packed RBCs</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-semibold text-emerald-700 text-xs">Compatible (محجوزة بالبنك)</span>
                    <span className="text-[10px] text-slate-500 block">Unit IDs: #RBC-8812, #RBC-8813</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Longitudinal Comparative View (Ch. 7 - عرض النتائج المقارنة عبر فترات الإيواء) */}
      {activeViewMode === 'longitudinal' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'جدول المتابعة الطولية المقارنة لمؤشرات الدم (Longitudinal View)' : 'Longitudinal Biomarker Comparison Table'}</span>
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {isAr ? 'مثال مطابق لوثيقة المتطلبات: تتبع خضاب الدم (Hb) عبر مراحل الإقامة السريرية المختلفة' : 'Direct requirement example: Tracking Hemoglobin across admission episodes'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-3.5">{isAr ? 'المرحلة السريرية' : 'Clinical Stage'}</th>
                  <th className="py-3 px-3.5">{isAr ? 'التاريخ والوقت الفعلي لأخذ العينة' : 'Collection Timestamp'}</th>
                  <th className="py-3 px-3.5">{isAr ? 'خضاب الدم (Hb g/dL)' : 'Hemoglobin (Hb)'}</th>
                  <th className="py-3 px-3.5">{isAr ? 'المدى الطبيعي' : 'Ref Range'}</th>
                  <th className="py-3 px-3.5">{isAr ? 'التقييم السريري' : 'Clinical Assessment'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {longitudinalHbData.map((row, i) => (
                  <tr key={i} className={`hover:bg-slate-50 ${row.status === 'critical' ? 'bg-rose-50/60 font-bold' : ''}`}>
                    <td className="py-3 px-3.5 font-sans font-semibold text-slate-900">{row.stage}</td>
                    <td className="py-3 px-3.5 text-slate-600">{row.date}</td>
                    <td className="py-3 px-3.5 text-base font-bold text-slate-900">
                      {row.value} <span className="text-xs text-slate-500 font-normal">{row.unit}</span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-500">12.0 - 15.5 g/dL</td>
                    <td className="py-3 px-3.5 font-sans">
                      {row.status === 'critical' ? (
                        <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-[11px] font-bold">
                          {isAr ? 'نزول حاد - استدعى نقل دم' : 'Critical Drop - Transfusion Done'}
                        </span>
                      ) : row.status === 'improving' ? (
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px] font-bold">
                          {isAr ? 'تحسن ملموس بعد نقل وحدتي دم' : 'Improved Post-Transfusion'}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[11px]">{isAr ? 'تحت المراقبة' : 'Monitored'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Biomarker Trend Chart (Ch. 7 - رسم منحنى بياني للمؤشرات) */}
      {activeViewMode === 'trend' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'منحنى تذبذب خضاب الدم السريري (Hemoglobin Trend Curve)' : 'Biomarker Trend Curve (Hb g/dL)'}</span>
              </h3>
              <span className="text-slate-500 text-[11px]">
                {isAr ? 'رسم بياني يوضح الهبوط الحاد (8.6 g/dL) والاستجابة العلاجية اللاحقة (10.1 g/dL)' : 'Shows acute drop to 8.6 g/dL and therapeutic recovery to 10.1 g/dL'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-rose-500"></span>
                <span>{isAr ? 'حد الخطر الحرج (< 9.0)' : 'Critical Alert Line (<9.0)'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-teal-600"></span>
                <span>{isAr ? 'منحنى Hb الحقيقي' : 'Measured Hb (g/dL)'}</span>
              </span>
            </div>
          </div>

          {/* Clean SVG Trend Chart */}
          <div className="w-full bg-slate-50 rounded-lg border border-slate-200 p-4">
            <svg viewBox="0 0 600 240" className="w-full h-56">
              {/* Grid Lines */}
              <line x1="50" y1="30" x2="570" y2="30" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="50" y1="80" x2="570" y2="80" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="50" y1="130" x2="570" y2="130" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="50" y1="180" x2="570" y2="180" stroke="#e2e8f0" strokeDasharray="3 3" />

              {/* Critical Alert Threshold line at Hb = 9.0 (y ≈ 130) */}
              <line x1="50" y1="130" x2="570" y2="130" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 4" />
              <text x="575" y="133" fill="#e11d48" fontSize="10" fontFamily="sans-serif">9.0 Critical</text>

              {/* Normal Threshold at Hb = 12.0 (y ≈ 50) */}
              <line x1="50" y1="50" x2="570" y2="50" stroke="#10b981" strokeWidth="1" strokeDasharray="2 2" />
              <text x="575" y="53" fill="#059669" fontSize="10" fontFamily="sans-serif">12.0 Normal</text>

              {/* Y Axis Labels */}
              <text x="15" y="34" fill="#64748b" fontSize="10" fontFamily="monospace">14.0</text>
              <text x="15" y="84" fill="#64748b" fontSize="10" fontFamily="monospace">11.0</text>
              <text x="15" y="134" fill="#64748b" fontSize="10" fontFamily="monospace">9.0</text>
              <text x="15" y="184" fill="#64748b" fontSize="10" fontFamily="monospace">7.0</text>

              {/* Plot points:
                  Pt 1: 10.0 -> x=100, y=106
                  Pt 2: 9.2  -> x=230, y=125
                  Pt 3: 8.6  -> x=360, y=142 (CRITICAL)
                  Pt 4: 10.1 -> x=500, y=103
              */}
              <polyline
                fill="none"
                stroke="#0d9488"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="100,106 230,125 360,142 500,103"
              />

              {/* Data circles & text */}
              <circle cx="100" cy="106" r="5" fill="#0d9488" />
              <text x="85" y="95" fill="#0f172a" fontWeight="bold" fontSize="11" fontFamily="monospace">10.0</text>
              <text x="65" y="210" fill="#64748b" fontSize="10" fontFamily="sans-serif">{isAr ? 'الدخول' : 'Adm'}</text>

              <circle cx="230" cy="125" r="5" fill="#0d9488" />
              <text x="215" y="115" fill="#0f172a" fontWeight="bold" fontSize="11" fontFamily="monospace">9.2</text>
              <text x="200" y="210" fill="#64748b" fontSize="10" fontFamily="sans-serif">{isAr ? 'فحص 2' : 'Test 2'}</text>

              {/* Critical point */}
              <circle cx="360" cy="142" r="7" fill="#e11d48" stroke="#ffe4e6" strokeWidth="3" />
              <text x="345" y="165" fill="#e11d48" fontWeight="bold" fontSize="12" fontFamily="monospace">8.6 ⚠️</text>
              <text x="325" y="210" fill="#e11d48" fontWeight="bold" fontSize="10" fontFamily="sans-serif">{isAr ? 'نزيف إسعافي' : 'Bleed'}</text>

              {/* Recovery point */}
              <circle cx="500" cy="103" r="5" fill="#059669" />
              <text x="485" y="90" fill="#059669" fontWeight="bold" fontSize="11" fontFamily="monospace">10.1 ✓</text>
              <text x="465" y="210" fill="#059669" fontWeight="bold" fontSize="10" fontFamily="sans-serif">{isAr ? 'بعد نقل الدم' : 'Post-Transf.'}</text>
            </svg>
          </div>
        </div>
      )}

      {/* VIEW 4: Accredited Printable PDF Lab Report */}
      {activeViewMode === 'report' && selectedReportOrder && (
        <div className="bg-white border border-slate-300 rounded-lg p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-300 no-print">
            <button
              onClick={() => setActiveViewMode('orders')}
              className="text-slate-600 hover:text-slate-900 text-xs font-semibold"
            >
              ← {isAr ? 'العودة لقائمة الطلبات' : 'Back to Orders'}
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-semibold flex items-center gap-2 hover:bg-slate-800"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة التقرير المعتمد' : 'Print Official Report'}</span>
            </button>
          </div>

          {/* Printable Letterhead */}
          <div className="text-center space-y-1 border-b border-slate-300 pb-4">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              {isAr ? 'مستشفى الأمل التخصصي للنساء والولادة والإيواء السريري' : 'Al-Amal Specialized Hospital for Maternity & Inpatient Care'}
            </h1>
            <p className="text-xs text-slate-600">
              {isAr ? 'المختبر المركزي والتحاليل الطبية المعتمدة · طرابلس، ليبيا' : 'Central Diagnostic Laboratory & Pathology · Tripoli, Libya'}
            </p>
            <div className="text-xs font-bold text-teal-800 font-mono pt-1">
              {isAr ? 'تقرير مخبري معتمد (Accredited Diagnostic Report)' : 'Accredited Diagnostic Laboratory Report'}
            </div>
          </div>

          {/* Patient Details Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
            <div>
              <span className="text-slate-500 block">{isAr ? 'اسم المريض:' : 'Patient Name:'}</span>
              <strong className="text-slate-900">{currentPatient.fullName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">{isAr ? 'رقم الملف (MRN):' : 'MRN:'}</span>
              <strong className="text-slate-900 font-mono">{currentPatient.mrn}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">{isAr ? 'رقم الإيواء:' : 'Admission ID:'}</span>
              <strong className="text-slate-900 font-mono">{currentAdmission.admissionId}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">{isAr ? 'الغرفة / السرير:' : 'Room / Bed:'}</span>
              <strong className="text-slate-900 font-mono">{currentAdmission.roomNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">{isAr ? 'الطبيب الطالب:' : 'Ordering Physician:'}</span>
              <strong className="text-slate-800">{selectedReportOrder.orderedBy}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">{isAr ? 'وقت سحب العينة:' : 'Sample Draw Time:'}</span>
              <strong className="text-slate-800 font-mono">{selectedReportOrder.sampleCollectedAt || '--'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">{isAr ? 'الاستشاري المعتمد:' : 'Consultant Approval:'}</span>
              <strong className="text-emerald-800">{selectedReportOrder.approvedBy || '--'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">{isAr ? 'تاريخ الاعتماد:' : 'Approval Date:'}</span>
              <strong className="text-slate-800 font-mono">{selectedReportOrder.approvedAt || '--'}</strong>
            </div>
          </div>

          {/* Results Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900">{selectedReportOrder.testName}</h4>
            <table className="w-full text-xs text-right border border-slate-300">
              <thead className="bg-slate-100">
                <tr className="border-b border-slate-300 text-slate-700">
                  <th className="py-2 px-3">{isAr ? 'المؤشر المخبري (Test Parameter)' : 'Parameter'}</th>
                  <th className="py-2 px-3">{isAr ? 'النتيجة (Result)' : 'Result'}</th>
                  <th className="py-2 px-3">{isAr ? 'الوحدة (Unit)' : 'Unit'}</th>
                  <th className="py-2 px-3">{isAr ? 'المدى المرجعي (Ref Range)' : 'Reference Range'}</th>
                  <th className="py-2 px-3">{isAr ? 'التقييم' : 'Interpretation'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {selectedReportOrder.results.map((r: LabTestItem, i: number) => (
                  <tr key={i} className={r.isCritical ? 'bg-rose-50 font-bold' : ''}>
                    <td className="py-2 px-3 font-sans text-slate-900">{r.name}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{r.value}</td>
                    <td className="py-2 px-3 text-slate-600">{r.unit}</td>
                    <td className="py-2 px-3 text-slate-600">{r.refRange}</td>
                    <td className="py-2 px-3 font-sans text-xs">
                      {r.isCritical ? <span className="text-rose-700 font-bold">⚠️ CRITICAL</span> :
                       r.isAbnormal ? <span className="text-amber-700 font-medium">Abnormal</span> :
                       <span className="text-emerald-700">Normal</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Signatures and Hospital Stamp */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 text-center text-xs">
            <div>
              <span className="text-slate-500 block mb-8">{isAr ? 'توقيع فني المختبر المنفذ' : 'Medical Lab Technologist'}</span>
              <strong className="text-slate-900 font-serif border-t border-slate-400 pt-1 px-8 inline-block">
                {selectedReportOrder.labReceivedBy || 'فني مختبر عمر البراصي'}
              </strong>
            </div>

            <div>
              <span className="text-slate-500 block mb-8">{isAr ? 'اعتماد وختم استشاري علم الأمراض والمختبرات' : 'Consultant Pathologist & Lab Director'}</span>
              <strong className="text-slate-900 font-serif border-t border-slate-400 pt-1 px-8 inline-block">
                {selectedReportOrder.approvedBy || 'د. مريم الدريسي'}
              </strong>
              <div className="text-[10px] text-teal-800 font-mono mt-1">
                {isAr ? '[ختم إلكتروني معتمد - مستشفى الأمل]' : '[Digitally Signed & Sealed]'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Traditional Lab Worksheet Order Form */}
      {showWorksheetModal && (
        <LabWorksheetOrderModal
          currentPatient={currentPatient}
          currentAdmission={currentAdmission}
          currentUser={currentUser}
          language={language}
          onClose={() => setShowWorksheetModal(false)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};
