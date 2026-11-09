import React, { useState, useEffect, useMemo } from 'react';
import { 
  Patient, 
  Admission, 
  ProvisionalInvoice, 
  MedicalPackage, 
  Language, 
  SystemUser,
  FinancialOverviewData,
  PaymentReceipt,
  DisbursementVoucher,
  DoctorSettlement,
  CorporateClaim,
  AccountChartItem,
  JournalEntry
} from '../types/hmis.ts';
import {
  DollarSign,
  CreditCard,
  Receipt,
  Printer,
  Clock,
  AlertTriangle,
  Layers,
  Package,
  Building2,
  TrendingUp,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  FileText,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Stethoscope,
  Scissors,
  ShieldCheck,
  Scale,
  FileSpreadsheet,
  Eye,
  BookOpen,
  ArrowRightLeft,
  X,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { api } from '../api/client.ts';
import { PackagesManagementModal } from './PackagesManagementModal.tsx';

interface BillingModuleProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  admissions?: Admission[];
  patients?: Patient[];
  packages: MedicalPackage[];
  currentUser: SystemUser;
  language: Language;
  onRefresh: () => void;
  onSelectAdmission?: (adm: Admission) => void;
  onRefreshPackages?: () => void;
}

type FinanceSubTab = 
  | 'overview' 
  | 'invoicing' 
  | 'vouchers' 
  | 'doctor_fees' 
  | 'insurance' 
  | 'general_ledger' 
  | 'packages';

export const BillingModule: React.FC<BillingModuleProps> = ({
  currentPatient,
  currentAdmission,
  admissions = [],
  patients = [],
  packages,
  currentUser,
  language,
  onRefresh,
  onSelectAdmission,
  onRefreshPackages
}) => {
  const isAr = language === 'ar';

  // Navigation tab inside Financial Suite
  const [activeFinanceTab, setActiveFinanceTab] = useState<FinanceSubTab>('overview');

  // Inpatient Invoice State
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>(currentAdmission?.admissionId || (admissions[0]?.admissionId ?? ''));
  const activeAdm = admissions.find(a => a.admissionId === selectedAdmissionId) || currentAdmission || admissions[0];
  const activePat = patients.find(p => p.mrn === activeAdm?.mrn) || currentPatient || patients[0];

  const [invoice, setInvoice] = useState<ProvisionalInvoice | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [cutoffTime, setCutoffTime] = useState<string>('2026-11-07T11:00');

  // Financial Suite Data States
  const [overview, setOverview] = useState<FinancialOverviewData | null>(null);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [disbursements, setDisbursements] = useState<DisbursementVoucher[]>([]);
  const [doctorSettlements, setDoctorSettlements] = useState<DoctorSettlement[]>([]);
  const [corporateClaims, setCorporateClaims] = useState<CorporateClaim[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<AccountChartItem[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoadingSuite, setIsLoadingSuite] = useState(true);

  // Modals & Action Forms
  const [showPackagesModal, setShowPackagesModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDisbursementModal, setShowDisbursementModal] = useState(false);
  const [showDoctorPayModal, setShowDoctorPayModal] = useState(false);
  const [selectedDoctorForPay, setSelectedDoctorForPay] = useState<DoctorSettlement | null>(null);
  const [showClaimPayModal, setShowClaimPayModal] = useState(false);
  const [selectedClaimForPay, setSelectedClaimForPay] = useState<CorporateClaim | null>(null);
  const [showVoucherPrintModal, setShowVoucherPrintModal] = useState(false);
  const [voucherToPrint, setVoucherToPrint] = useState<{ type: 'receipt' | 'disbursement'; data: any } | null>(null);

  // Filter states
  const [voucherFilter, setVoucherFilter] = useState<'all' | 'receipts' | 'disbursements'>('all');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>('all');

  // Form inputs
  const [payAmount, setPayAmount] = useState<number>(500);
  const [payMethod, setPayMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Letter of Guarantee'>('Cash');
  const [payNotes, setPayNotes] = useState<string>('');
  const [disbursementForm, setDisbursementForm] = useState({
    beneficiary: '',
    beneficiaryType: 'doctor' as any,
    category: 'doctor_commission' as any,
    amount: 1000,
    paymentMethod: 'Cash' as any,
    bankName: 'مصرف الجمهورية',
    accountCode: '5102',
    accountNameAr: 'أتعاب وأجور الأطباء والجراحين',
    description: '',
    notes: ''
  });
  const [doctorPayAmount, setDoctorPayAmount] = useState<number>(1000);
  const [doctorPayMethod, setDoctorPayMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [doctorPayNotes, setDoctorPayNotes] = useState<string>('تسوية أتعاب العمليات والإشراف السريري');

  const [claimPayAmount, setClaimPayAmount] = useState<number>(1000);
  const [claimPayMethod, setClaimPayMethod] = useState<'Bank Transfer' | 'Cheque'>('Bank Transfer');
  const [claimPayRef, setClaimPayRef] = useState<string>('TR-CBL-2026-');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selected admission from outside
  useEffect(() => {
    if (currentAdmission) {
      setSelectedAdmissionId(currentAdmission.admissionId);
    }
  }, [currentAdmission]);

  // Load Financial Suite Data
  const loadFinancialData = async () => {
    setIsLoadingSuite(true);
    try {
      const [ov, rc, ds, docs, claims, coa, jv] = await Promise.all([
        api.getFinancialOverview(),
        api.getPaymentReceipts(),
        api.getDisbursementVouchers(),
        api.getDoctorSettlements(),
        api.getCorporateClaims(),
        api.getChartOfAccounts(),
        api.getJournalEntries()
      ]);
      setOverview(ov);
      setReceipts(rc);
      setDisbursements(ds);
      setDoctorSettlements(docs);
      setCorporateClaims(claims);
      setChartOfAccounts(coa);
      setJournalEntries(jv);
    } catch (err) {
      console.error('Error loading financial suite:', err);
    } finally {
      setIsLoadingSuite(false);
    }
  };

  const fetchInvoice = async () => {
    if (!activeAdm) return;
    setIsLoadingInvoice(true);
    try {
      const inv = await api.getProvisionalInvoice(activeAdm.admissionId, cutoffTime ? `${cutoffTime}:00Z` : undefined);
      setInvoice(inv);
    } catch (err: any) {
      console.error('Error fetching provisional invoice:', err);
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  useEffect(() => {
    fetchInvoice();
  }, [selectedAdmissionId, cutoffTime]);

  // Handle Record Payment (Receipt)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAdm) return;
    setIsSubmitting(true);
    try {
      const rcpt = await api.recordPayment({
        admissionId: activeAdm.admissionId,
        amount: payAmount,
        paymentMethod: payMethod,
        receivedBy: currentUser.name,
        notes: payNotes
      });
      setShowPaymentModal(false);
      setPayNotes('');
      fetchInvoice();
      loadFinancialData();
      onRefresh();
      // Show voucher
      setVoucherToPrint({ type: 'receipt', data: rcpt });
      setShowVoucherPrintModal(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Disbursement Voucher
  const handleCreateDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await api.createDisbursementVoucher({
        date: new Date().toISOString().split('T')[0],
        beneficiary: disbursementForm.beneficiary,
        beneficiaryType: disbursementForm.beneficiaryType,
        category: disbursementForm.category,
        amount: Number(disbursementForm.amount),
        paymentMethod: disbursementForm.paymentMethod,
        bankName: disbursementForm.paymentMethod !== 'Cash' ? disbursementForm.bankName : undefined,
        accountCode: disbursementForm.accountCode,
        accountNameAr: disbursementForm.accountNameAr,
        description: disbursementForm.description,
        approvedBy: 'د. سالم بن زياد (المدير العام)',
        issuedBy: currentUser.name,
        notes: disbursementForm.notes
      }, currentUser);

      setShowDisbursementModal(false);
      setDisbursementForm({
        beneficiary: '',
        beneficiaryType: 'doctor',
        category: 'doctor_commission',
        amount: 1000,
        paymentMethod: 'Cash',
        bankName: 'مصرف الجمهورية',
        accountCode: '5102',
        accountNameAr: 'أتعاب وأجور الأطباء والجراحين',
        description: '',
        notes: ''
      });
      loadFinancialData();
      onRefresh();
      setVoucherToPrint({ type: 'disbursement', data: created });
      setShowVoucherPrintModal(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Settle Doctor Payment
  const handleSettleDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorForPay) return;
    setIsSubmitting(true);
    try {
      const voucher = await api.settleDoctorPayment({
        doctorId: selectedDoctorForPay.doctorId,
        amount: doctorPayAmount,
        paymentMethod: doctorPayMethod,
        notes: doctorPayNotes
      }, currentUser);

      setShowDoctorPayModal(false);
      loadFinancialData();
      onRefresh();
      setVoucherToPrint({ type: 'disbursement', data: voucher });
      setShowVoucherPrintModal(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Settle Corporate Claim
  const handleSettleCorporateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForPay) return;
    setIsSubmitting(true);
    try {
      await api.settleCorporateClaim({
        claimId: selectedClaimForPay.id,
        amount: claimPayAmount,
        paymentMethod: claimPayMethod,
        reference: claimPayRef
      }, currentUser);

      setShowClaimPayModal(false);
      loadFinancialData();
      fetchInvoice();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combined Vouchers List
  const unifiedVouchers = useMemo(() => {
    const list: Array<{
      type: 'receipt' | 'disbursement';
      id: string;
      voucherNumber: string;
      date: string;
      partyName: string;
      categoryOrMethod: string;
      amount: number;
      paymentMethod: string;
      user: string;
      notes?: string;
      raw: any;
    }> = [];

    if (voucherFilter !== 'disbursements') {
      receipts.forEach(r => {
        const adm = admissions.find(a => a.admissionId === r.admissionId);
        list.push({
          type: 'receipt',
          id: r.id,
          voucherNumber: r.receiptNumber,
          date: r.timestamp.split('T')[0],
          partyName: adm ? adm.patientName : (r.admissionId || 'مريض إيواء'),
          categoryOrMethod: 'قبض مالي / إيداع تحت الحساب',
          amount: r.amount,
          paymentMethod: r.paymentMethod,
          user: r.receivedBy,
          notes: r.notes,
          raw: r
        });
      });
    }

    if (voucherFilter !== 'receipts') {
      disbursements.forEach(d => {
        list.push({
          type: 'disbursement',
          id: d.id,
          voucherNumber: d.voucherNumber,
          date: d.date,
          partyName: d.beneficiary,
          categoryOrMethod: d.accountNameAr,
          amount: d.amount,
          paymentMethod: d.paymentMethod,
          user: d.issuedBy,
          notes: d.description,
          raw: d
        });
      });
    }

    return list.filter(v => {
      if (!voucherSearch) return true;
      const s = voucherSearch.toLowerCase();
      return (
        v.voucherNumber.toLowerCase().includes(s) ||
        v.partyName.toLowerCase().includes(s) ||
        v.paymentMethod.toLowerCase().includes(s) ||
        (v.notes && v.notes.toLowerCase().includes(s))
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [receipts, disbursements, admissions, voucherFilter, voucherSearch]);

  return (
    <div className="space-y-6">
      
      {/* Top Suite Navigation & Global Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs no-print">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{isAr ? 'الإدارة المالية والمحاسبة والفوترة العامة' : 'Hospital Financial Accounting & Billing'}</span>
                <span className="text-[11px] font-mono text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  General Ledger · Tripoli HMIS
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                {isAr 
                  ? 'لوحة المؤشرات، الخزينة اليومية، سندات القبض والصرف، أتعاب الأطباء، مطالبات التأمين، ودليل الحسابات' 
                  : 'Executive financial KPIs, cash drawer, receipt & payment vouchers, doctor commissions, and general ledger'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* New Receipt Voucher */}
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isAr ? 'سند قبض نقدية / دفعة' : 'New Receipt Voucher'}</span>
            </button>

            {/* New Disbursement Voucher */}
            <button
              type="button"
              onClick={() => setShowDisbursementModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{isAr ? 'سند صرف مالي' : 'New Disbursement'}</span>
            </button>

            {/* Packages Management */}
            <button
              type="button"
              onClick={() => setShowPackagesModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isAr ? 'إدارة الباقات (Packages)' : 'Manage Packages'}</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Bar (Interactive functional filter tabs) */}
        <div className="flex items-center gap-1.5 pt-3 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveFinanceTab('overview')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeFinanceTab === 'overview'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isAr ? 'لوحة المؤشرات والتحليل المالي' : 'Financial Dashboard'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFinanceTab('invoicing')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeFinanceTab === 'invoicing'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{isAr ? 'كشوفات وفواتير الإيواء (Provisional Invoices)' : 'Inpatient Invoicing'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFinanceTab('vouchers')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeFinanceTab === 'vouchers'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>{isAr ? 'حركة الخزينة وسندات القبض والصرف' : 'Cash Drawer & Vouchers'}</span>
            <span className="ms-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800">
              {receipts.length + disbursements.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFinanceTab('doctor_fees')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeFinanceTab === 'doctor_fees'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>{isAr ? 'أتعاب ومستحقات الأطباء والاستشاريين' : 'Doctor Commissions'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFinanceTab('insurance')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeFinanceTab === 'insurance'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAr ? 'مطالبات شركات التأمين والجهات الضامنة' : 'Corporate Claims'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFinanceTab('general_ledger')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeFinanceTab === 'general_ledger'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{isAr ? 'دليل الحسابات ودفتر الأستاذ (COA & GL)' : 'Chart of Accounts & GL'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. FINANCIAL DASHBOARD & OVERVIEW TAB                                     */}
      {/* ========================================================================= */}
      {activeFinanceTab === 'overview' && overview && (
        <div className="space-y-6">
          
          {/* Executive KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Gross Medical Revenue */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>{isAr ? 'إجمالي الإيرادات المسجلة' : 'Gross Medical Revenue'}</span>
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="font-mono text-xl font-black text-slate-900">
                {overview.totalGrossRevenue.toLocaleString()} <span className="text-xs font-sans text-slate-500 font-semibold">{isAr ? 'د.ل' : 'LYD'}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>{isAr ? 'شامل الإقامة والعمليات والتحاليل' : 'Inpatient, OT, LIS & Pharmacy'}</span>
              </div>
            </div>

            {/* Card 2: Cash & Bank Collections */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>{isAr ? 'المقبوضات المحصلة (نقد ومصرف)' : 'Total Collections'}</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="font-mono text-xl font-black text-emerald-700">
                {(overview.totalCashCollected + overview.totalBankCollected).toLocaleString()} <span className="text-xs font-sans text-slate-500 font-semibold">{isAr ? 'د.ل' : 'LYD'}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>{isAr ? 'خزينة:' : 'Cash:'} {overview.totalCashCollected.toLocaleString()} د.ل</span>
                <span>{isAr ? 'مصرف:' : 'Bank:'} {overview.totalBankCollected.toLocaleString()} د.ل</span>
              </div>
            </div>

            {/* Card 3: Inpatient Patient Receivables */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>{isAr ? 'الذمم المدينة للمرضى (إيواء)' : 'Patient Receivables'}</span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="font-mono text-xl font-black text-rose-700">
                {overview.totalPatientReceivables.toLocaleString()} <span className="text-xs font-sans text-slate-500 font-semibold">{isAr ? 'د.ل' : 'LYD'}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>{isAr ? 'أرصدة حالات الإيواء النشطة' : 'Active Inpatient Balances'}</span>
              </div>
            </div>

            {/* Card 4: Corporate & Insurance Receivables */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>{isAr ? 'مستحقات شركات التأمين والشركات' : 'Corporate Receivables'}</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="font-mono text-xl font-black text-indigo-900">
                {overview.totalCorporateReceivables.toLocaleString()} <span className="text-xs font-sans text-slate-500 font-semibold">{isAr ? 'د.ل' : 'LYD'}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>{isAr ? 'مطالبات المدار والبريقة والمركزي' : 'Al-Madar, Brega & CBL'}</span>
              </div>
            </div>
          </div>

          {/* Real-time Cash Balances Strip */}
          <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-teal-300">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">{isAr ? 'رصيد الخزينة النقدية الرئيسية (Cash Drawer):' : 'Main Cash Drawer Balance:'}</span>
                <span className="text-lg font-black font-mono text-teal-300">{overview.cashDrawerBalance.toLocaleString()} د.ل</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-300">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">{isAr ? 'رصيد حساب مصرف الجمهورية الرئيسي:' : 'Jumhouria Bank Balance:'}</span>
                <span className="text-lg font-black font-mono text-blue-300">{overview.bankAccountBalance.toLocaleString()} د.ل</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">{isAr ? 'مستحقات وأتعاب الأطباء المعلقة:' : 'Doctor Fees Payable:'}</span>
                <span className="text-lg font-black font-mono text-amber-300">{overview.totalDoctorLiabilities.toLocaleString()} د.ل</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-rose-300">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">{isAr ? 'إجمالي سندات الصرف المنفذة:' : 'Total Disbursements:'}</span>
                <span className="text-lg font-black font-mono text-rose-300">{overview.totalDisbursements.toLocaleString()} د.ل</span>
              </div>
            </div>
          </div>

          {/* Analytical Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 7-Day Revenue & Inflow vs Outflow */}
            <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  <span>{isAr ? 'التدفق المالي اليومي (الإيرادات، المقبوضات، وسندات الصرف)' : 'Daily Financial Flow'}</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  {isAr ? 'آخر 7 أيام عمل' : 'Last 7 Days'}
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(val: any, name: any) => {
                        const label = name === 'revenue' 
                          ? (isAr ? 'إيرادات' : 'Revenue')
                          : name === 'receipts' 
                            ? (isAr ? 'مقبوضات نقد/مصرف' : 'Collections')
                            : (isAr ? 'سندات صرف' : 'Disbursements');
                        return [`${Number(val).toLocaleString()} د.ل`, label];
                      }}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={30}
                      formatter={(val) => (
                        <span className="text-xs text-slate-700 font-medium">
                          {val === 'revenue' ? (isAr ? 'الإيرادات المسجلة' : 'Revenue') :
                           val === 'receipts' ? (isAr ? 'المقبوضات المحصلة' : 'Collections') :
                           (isAr ? 'المصروفات وسندات الصرف' : 'Disbursements')}
                        </span>
                      )}
                    />
                    <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="receipts" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="disbursements" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Revenue Breakdown */}
            <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <PieChart className="w-4 h-4 text-indigo-600" />
                  <span>{isAr ? 'توزيع الإيرادات حسب الأقسام الطبية' : 'Revenue by Department'}</span>
                </h3>

                <div className="space-y-3 pt-3">
                  {overview.departmentRevenue.map(dept => (
                    <div key={dept.departmentEn} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{isAr ? dept.departmentAr : dept.departmentEn}</span>
                        <span className="font-mono font-bold text-slate-900">{dept.amount.toLocaleString()} د.ل ({dept.percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${dept.percentage}%`, backgroundColor: dept.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payer breakdown summary */}
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span className="font-bold text-slate-700 block mb-1">{isAr ? 'محفظة جهات الدفع المعتمدة:' : 'Payer Mix:'}</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  {overview.payerBreakdown.map(p => (
                    <div key={p.name} className="p-1.5 rounded bg-slate-50 border border-slate-200">
                      <span className="block truncate font-semibold text-slate-800">{p.name}</span>
                      <strong className="text-teal-800">{p.amount.toLocaleString()} د.ل</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Recent Financial Activities Table preview */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? 'آخر السندات المالية المنفذة (قبض وصرف)' : 'Recent Financial Vouchers'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveFinanceTab('vouchers')}
                className="text-xs text-teal-700 hover:text-teal-900 font-bold"
              >
                {isAr ? 'عرض كل السندات ←' : 'View all vouchers →'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">{isAr ? 'نوع السند' : 'Type'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'رقم السند' : 'Voucher No.'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الطرف المستفيد / المريض' : 'Beneficiary / Patient'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'طريقة السداد' : 'Method'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'المبلغ (د.ل)' : 'Amount (LYD)'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'المسؤول' : 'Officer'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {unifiedVouchers.slice(0, 5).map(v => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-sans">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.type === 'receipt' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {v.type === 'receipt' ? (isAr ? '↓ سند قبض' : 'Receipt') : (isAr ? '↑ سند صرف' : 'Disbursement')}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">{v.voucherNumber}</td>
                      <td className="py-2 px-3 text-slate-600">{v.date}</td>
                      <td className="py-2 px-3 font-sans font-bold text-slate-900 truncate max-w-xs">{v.partyName}</td>
                      <td className="py-2 px-3 font-sans text-slate-700">{v.paymentMethod}</td>
                      <td className={`py-2 px-3 font-bold ${v.type === 'receipt' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {v.amount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-600">{v.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INPATIENT INVOICING & BILLING STATEMENTS TAB                           */}
      {/* ========================================================================= */}
      {activeFinanceTab === 'invoicing' && (
        <div className="space-y-4">
          
          {/* Inpatient Stay Selector & 11:00 AM Cutoff Policy */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 no-print shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {isAr ? 'اختيار ملف المريضة المنومة للاطلاع على الفاتورة:' : 'Select Inpatient Stay:'}
                </label>
                <select
                  value={selectedAdmissionId}
                  onChange={(e) => {
                    setSelectedAdmissionId(e.target.value);
                    const adm = admissions.find(a => a.admissionId === e.target.value);
                    if (adm && onSelectAdmission) onSelectAdmission(adm);
                  }}
                  className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                >
                  {admissions.map(a => (
                    <option key={a.admissionId} value={a.admissionId}>
                      {a.patientName} — {a.admissionId} (الغرفة {a.roomNumber} - {a.roomType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Custom Cut-off Picker (Ch. 25) */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600 font-medium">{isAr ? 'موعد القطع المحاسبي (11:00 AM):' : 'Cut-off Time:'}</span>
                <input
                  type="datetime-local"
                  value={cutoffTime}
                  onChange={(e) => setCutoffTime(e.target.value)}
                  className="bg-transparent text-slate-900 font-mono focus:outline-hidden"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{isAr ? 'تسديد دفعة / قبض مالي' : 'Record Payment'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isAr ? 'طباعة الفاتورة' : 'Print Invoice'}</span>
              </button>
            </div>
          </div>

          {/* Invoice Document Body */}
          {isLoadingInvoice || !invoice ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400">
              {isAr ? 'جاري تجميع وحساب بنود الفاتورة المبدئية حتى موعد القطع المحاسبي...' : 'Calculating provisional invoice charges...'}
            </div>
          ) : (
            <div className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
              
              {/* MANDATORY LEGAL NOTICE (Ch. 25 MANDATORY CLAUSE) */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-amber-950 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{isAr ? 'تنبيه تنظيمي ملزم قانوناً على الكشف المالي المبدئي:' : 'MANDATORY REGULATORY DISCLAIMER:'}</span>
                </div>
                <p className="text-xs leading-relaxed font-medium">
                  {isAr ? invoice.mandatoryNoticeAr : invoice.mandatoryNoticeEn}
                </p>
              </div>

              {/* Letterhead Header */}
              <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-300 gap-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-slate-900">
                    {isAr ? 'مستشفى الأمل التخصصي للنساء والولادة والإيواء' : 'Al-Amal Specialized Hospital for Maternity & Inpatient Care'}
                  </h2>
                  <p className="text-xs text-slate-600">
                    {isAr ? 'الإدارة المالية وقسم الفوترة والتأمين الطبي · طرابلس - ليبيا' : 'Financial Administration & Inpatient Billing · Tripoli, Libya'}
                  </p>
                </div>

                <div className="text-right text-xs font-mono">
                  <div className="text-slate-500">{isAr ? 'رقم الكشف المبدئي:' : 'Statement No:'} <strong className="text-slate-900">INV-2026-{invoice.admissionId.slice(-4)}</strong></div>
                  <div className="text-slate-500">{isAr ? 'وقت القطع المحاسبي:' : 'Accounting Cut-off:'} <strong className="text-teal-800">{invoice.cutoffTime}</strong></div>
                  <div className="text-slate-400 text-[10px]">{isAr ? 'تاريخ الطباعة:' : 'Printed:'} {new Date().toISOString().replace('T', ' ').substring(0, 16)}</div>
                </div>
              </div>

              {/* Patient Identification Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block font-sans">{isAr ? 'اسم المريضة:' : 'Patient Name:'}</span>
                  <strong className="text-slate-900 font-sans text-sm">{invoice.patientName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans">{isAr ? 'رقم الملف الدائم (MRN):' : 'MRN:'}</span>
                  <strong className="text-slate-900">{invoice.mrn}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans">{isAr ? 'رقم الإيواء (ADM):' : 'Admission ID:'}</span>
                  <strong className="text-slate-900">{invoice.admissionId}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans">{isAr ? 'الغرفة والفئة:' : 'Room & Class:'}</span>
                  <strong className="text-slate-900">{invoice.roomNumber} ({activeAdm?.roomType.toUpperCase()})</strong>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans">{isAr ? 'تاريخ ووقت الدخول:' : 'Admission Date:'}</span>
                  <span className="text-slate-800">{invoice.admissionDate.split('T')[0]} {invoice.admissionDate.split('T')[1]?.substring(0, 5)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans">{isAr ? 'الاستشاري المسؤول:' : 'Attending Consultant:'}</span>
                  <span className="text-slate-800 font-sans">{activeAdm?.attendingConsultantName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans">{isAr ? 'جهة الدفع:' : 'Payer:'}</span>
                  <span className="text-slate-800 font-sans">{activeAdm?.corporateName || activeAdm?.payerType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans">{isAr ? 'الباقة المعتمدة:' : 'Medical Package:'}</span>
                  <span className="text-indigo-800 font-bold font-sans">{invoice.packageApplied ? invoice.packageApplied.packageName : (isAr ? 'بدون باقة' : 'None')}</span>
                </div>
              </div>

              {/* Package Details Banner if applied */}
              {invoice.packageApplied && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-indigo-950 block text-xs">
                      {isAr ? 'باقة علاجية معتمدة: ' : 'Package Applied: '}{invoice.packageApplied.packageName}
                    </span>
                    <span className="text-indigo-800 text-[11px] block mt-0.5">
                      {invoice.packageApplied.includedUsedSummary}
                    </span>
                  </div>
                  <div className="font-mono text-sm font-bold text-indigo-950">
                    {invoice.packageApplied.packagePrice.toLocaleString()} {isAr ? 'د.ل (سعر الباقة الثابت)' : 'LYD fixed'}
                  </div>
                </div>
              )}

              {/* Itemized Services Breakdown Table */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>{isAr ? 'تفاصيل الخدمات والمصروفات المسجلة حتى موعد القطع المحاسبي' : 'Itemized Services Breakdown'}</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">{isAr ? 'البند والخدمة الطبية' : 'Description'}</th>
                        <th className="py-2.5 px-3">{isAr ? 'التصنيف' : 'Category'}</th>
                        <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                        <th className="py-2.5 px-3">{isAr ? 'الكمية / الأيام' : 'Qty'}</th>
                        <th className="py-2.5 px-3">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                        <th className="py-2.5 px-3">{isAr ? 'الإجمالي (د.ل)' : 'Total (LYD)'}</th>
                        <th className="py-2.5 px-3">{isAr ? 'التغطية بالباقة' : 'Coverage'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {invoice.items.map((item: any, i: number) => (
                        <tr key={i} className={`hover:bg-slate-50 ${item.isNpoDeduction ? 'bg-emerald-50/60 font-semibold' : ''}`}>
                          <td className="py-2 px-3 font-sans font-medium text-slate-900">
                            {isAr ? item.descriptionAr : item.description}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-500 uppercase text-[10px]">
                            {item.category}
                          </td>
                          <td className="py-2 px-3 text-slate-500">{item.date}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{item.quantity}</td>
                          <td className="py-2 px-3 text-slate-700">{item.unitPrice}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{item.totalPrice}</td>
                          <td className="py-2 px-3 font-sans text-[10px]">
                            {item.coveredByPackage ? (
                              <span className="text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded font-semibold border border-indigo-200">
                                {isAr ? 'ضمن الباقة' : 'Included'}
                              </span>
                            ) : (
                              <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {isAr ? 'حساب إضافي' : 'Billed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Matrix */}
              <div className="pt-4 border-t border-slate-300 flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="text-[11px] text-slate-500 max-w-md space-y-1">
                  <span className="font-bold text-slate-700 block">{isAr ? 'ملاحظات السياسة المالية المعتمدة:' : 'Billing Policies:'}</span>
                  <p>• {isAr ? 'اليوم الأول للإقامة يحتسب كاملاً، والأيام الإضافية تقسم إلى 3 فترات كل منها 8 ساعات.' : 'Day 1 billed 24h full; additional days split into three 8h shifts.'}</p>
                  <p>• {isAr ? 'الإشراف الطبي محدد بزيارة واحدة مدفوعة يومياً، ومنع تكرار الرسم في اليوم نفسه.' : 'Daily attending doctor rounds capped at 1 paid visit/day to prevent duplicates.'}</p>
                  <p>• {isAr ? 'تسوية وجبات الصيام NPO مطبقة تلقائياً ولا تحتسب على المريضة.' : 'NPO meal deductions applied automatically.'}</p>
                </div>

                {/* Total Balance Summary Box */}
                <div className="w-full md:w-80 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>{isAr ? 'إجمالي الخدمات المسجلة:' : 'Total Gross Services:'}</span>
                    <span className="font-bold">{invoice.totalBilled.toLocaleString()} د.ل</span>
                  </div>

                  {invoice.packageApplied && (
                    <div className="flex justify-between text-indigo-800 font-semibold">
                      <span>{isAr ? 'المغطى ضمن الباقة:' : 'Covered in Package:'}</span>
                      <span className="font-bold">-{invoice.totalPackageCovered.toLocaleString()} د.ل</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-800 font-semibold pt-1 border-t border-slate-200">
                    <span>{isAr ? 'المستحق قبل الدفعات:' : 'Subtotal Payable:'}</span>
                    <span className="font-bold">{invoice.totalPayableBeforeDiscounts.toLocaleString()} د.ل</span>
                  </div>

                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>{isAr ? 'الدفعات والودائع المسددة:' : 'Advance Payments:'}</span>
                    <span className="font-bold">-{invoice.totalPaymentsReceived.toLocaleString()} د.ل</span>
                  </div>

                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t-2 border-slate-300">
                    <span className="font-sans">{isAr ? 'الرصيد المبدئي المستحق:' : 'Provisional Balance Due:'}</span>
                    <span className="text-base text-rose-700 font-black">{invoice.provisionalBalanceDue.toLocaleString()} د.ل</span>
                  </div>
                </div>
              </div>

              {/* Signatures & Seal */}
              <div className="pt-6 border-t border-slate-300 grid grid-cols-2 text-center text-xs">
                <div>
                  <span className="text-slate-500 block mb-6">{isAr ? 'إعداد ومراجعة قسم الحسابات' : 'Accountant'}</span>
                  <strong className="text-slate-900 border-t border-slate-400 pt-1 px-8 inline-block">
                    مصطفى السنوسي (رئيس قسم الحسابات)
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 block mb-6">{isAr ? 'اعتماد الإدارة المالية والختم' : 'Financial Approval & Seal'}</span>
                  <strong className="text-slate-900 border-t border-slate-400 pt-1 px-8 inline-block">
                    {isAr ? 'مستشفى الأمل - الإدارة المالية' : 'Al-Amal Finance Dept'}
                  </strong>
                  <div className="text-[10px] text-teal-800 font-mono mt-1">
                    {isAr ? '[ختم مالي إلكتروني معتمد]' : '[Official Stamp Verified]'}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CASH DRAWER & VOUCHERS (سندات القبض والصرف)                             */}
      {/* ========================================================================= */}
      {activeFinanceTab === 'vouchers' && (
        <div className="space-y-4">
          
          {/* Vouchers Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-bold">{isAr ? 'تصفية السندات:' : 'Filter:'}</span>
              <button
                type="button"
                onClick={() => setVoucherFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  voucherFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isAr ? 'جميع السندات' : 'All Vouchers'} ({receipts.length + disbursements.length})
              </button>
              <button
                type="button"
                onClick={() => setVoucherFilter('receipts')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  voucherFilter === 'receipts' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isAr ? '↓ سندات القبض' : 'Receipts'} ({receipts.length})
              </button>
              <button
                type="button"
                onClick={() => setVoucherFilter('disbursements')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  voucherFilter === 'disbursements' ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isAr ? '↑ سندات الصرف' : 'Disbursements'} ({disbursements.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute rtl:right-2.5 ltr:left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث برقم السند، الطرف، أو الملاحظات...' : 'Search voucher #, name, notes...'}
                  value={voucherSearch}
                  onChange={(e) => setVoucherSearch(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg rtl:pr-8 rtl:pl-3 ltr:pl-8 ltr:pr-3 py-1.5 w-64 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'سند قبض' : 'Receipt'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDisbursementModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'سند صرف' : 'Disbursement'}</span>
              </button>
            </div>
          </div>

          {/* Vouchers Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">{isAr ? 'النوع' : 'Type'}</th>
                  <th className="py-3 px-3">{isAr ? 'رقم السند' : 'Voucher No.'}</th>
                  <th className="py-3 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="py-3 px-3">{isAr ? 'الطرف المستفيد / المريض' : 'Party / Patient'}</th>
                  <th className="py-3 px-3">{isAr ? 'التصنيف / البيان' : 'Category / Description'}</th>
                  <th className="py-3 px-3">{isAr ? 'طريقة الدفع' : 'Payment Method'}</th>
                  <th className="py-3 px-3">{isAr ? 'المبلغ (د.ل)' : 'Amount (LYD)'}</th>
                  <th className="py-3 px-3">{isAr ? 'المسؤول' : 'Officer'}</th>
                  <th className="py-3 px-3 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {unifiedVouchers.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-sans">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.type === 'receipt' 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {v.type === 'receipt' ? (isAr ? '↓ سند قبض' : 'Receipt') : (isAr ? '↑ سند صرف' : 'Disbursement')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{v.voucherNumber}</td>
                    <td className="py-2.5 px-3 text-slate-600">{v.date}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{v.partyName}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 truncate max-w-xs" title={v.notes || v.categoryOrMethod}>
                      {v.notes || v.categoryOrMethod}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-700">{v.paymentMethod}</td>
                    <td className={`py-2.5 px-3 font-bold text-sm ${v.type === 'receipt' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {v.amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{v.user}</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setVoucherToPrint({ type: v.type, data: v.raw });
                          setShowVoucherPrintModal(true);
                        }}
                        className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        title={isAr ? 'معاينة وطباعة السند المالي الرسمي' : 'Print Official Voucher'}
                      >
                        <Printer className="w-4 h-4 text-teal-700" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DOCTOR FEES & COMMISSIONS SETTLEMENT (أتعاب الأطباء والاستشاريين)        */}
      {/* ========================================================================= */}
      {activeFinanceTab === 'doctor_fees' && (
        <div className="space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'حسابات ومستحقات الأطباء والاستشاريين والجراحين' : 'Physician & Surgeon Commission Accounts'}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isAr 
                ? 'حساب أتعاب العمليات الجراحية، التخدير، المرور السريري اليومي (100 د.ل/زيارة)، والاستشارات الطبية مع إمكانية الصرف والتسوية المباشرة' 
                : 'Automated surgeon operative share, anesthesia, daily rounds (100 LYD/visit), and specialty consultations'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctorSettlements.map(doc => (
              <div key={doc.doctorId} className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-black text-slate-950">{doc.doctorName}</h4>
                    <span className="text-xs text-teal-700 font-semibold">{doc.specialty}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                    {doc.totalCases} {isAr ? 'حالات مسجلة' : 'cases'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">{isAr ? 'إجمالي الأتعاب:' : 'Earned:'}</span>
                    <strong className="text-slate-900 font-bold">{doc.totalEarned.toLocaleString()} د.ل</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 block font-sans">{isAr ? 'المسدد سابقاً:' : 'Paid:'}</span>
                    <strong className="text-emerald-700 font-bold">{doc.totalPaid.toLocaleString()} د.ل</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-[10px] text-amber-800 block font-sans">{isAr ? 'المستحق المتبقي:' : 'Pending:'}</span>
                    <strong className="text-amber-800 font-bold">{doc.pendingBalance.toLocaleString()} د.ل</strong>
                  </div>
                </div>

                {/* Recent Cases Preview */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-slate-600 block">{isAr ? 'تفاصيل الحالات والعمليات:' : 'Recent cases:'}</span>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                    {doc.cases.map((c, i) => (
                      <div key={i} className="p-1.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between text-[11px]">
                        <div className="truncate max-w-[200px]">
                          <strong className="text-slate-900 block truncate">{c.serviceName}</strong>
                          <span className="text-slate-500 font-sans">{c.patientName} · {c.date}</span>
                        </div>
                        <div className="text-end font-mono">
                          <span className="text-teal-800 font-bold">{c.doctorShare} د.ل</span>
                          <span className="text-[9px] text-slate-400 block font-sans">{isAr ? 'حصة الطبيب' : 'Fee'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settle Action Button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {doc.lastPaymentDate ? `${isAr ? 'آخر صرفية:' : 'Last paid:'} ${doc.lastPaymentDate}` : (isAr ? 'لا توجد دفعات سابقة' : 'No prior payout')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDoctorForPay(doc);
                      setDoctorPayAmount(doc.pendingBalance > 0 ? doc.pendingBalance : 500);
                      setShowDoctorPayModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs shadow-2xs transition-colors cursor-pointer"
                  >
                    {isAr ? 'تسديد وصرف الأتعاب' : 'Settle Doctor Fee'}
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CORPORATE & INSURANCE RECEIVABLES (مطالبات شركات التأمين)               */}
      {/* ========================================================================= */}
      {activeFinanceTab === 'insurance' && (
        <div className="space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>{isAr ? 'إدارة مطالبات ومستحقات شركات التأمين والجهات الضامنة' : 'Corporate & Insurance Claims Management'}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isAr 
                ? 'متابعة المطالبات الصادرة لشركات النفط، الاتصالات، والمصارف، مع خصم نسب التحمل وتسجيل إشعارات التحويل المصرفي' 
                : 'Track insurance receivables, patient co-pay deductions, and corporate bank remittances'}
            </p>
          </div>

          <div className="space-y-4">
            {corporateClaims.map(claim => (
              <div key={claim.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900">{claim.corporateName}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold border border-indigo-200">
                        {claim.claimNumber}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {isAr ? 'المريضة:' : 'Patient:'} <strong>{claim.patientName}</strong> ({claim.admissionId}) · {isAr ? 'خطاب ضمان:' : 'LG:'} <span className="font-mono">{claim.letterOfGuaranteeNo}</span>
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                    claim.status === 'settled' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : claim.status === 'approved' 
                        ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {claim.status === 'settled' ? (isAr ? '✓ مسددة بالكامل' : 'Settled') :
                     claim.status === 'approved' ? (isAr ? 'معتمدة - قيد الصرف' : 'Approved') :
                     (isAr ? 'قيد المراجعة الفنية' : 'Submitted')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">{isAr ? 'إجمالي الفاتورة:' : 'Billed:'}</span>
                    <strong className="text-slate-900">{claim.totalBilledAmount.toLocaleString()} د.ل</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">{isAr ? 'تحمل المريض (Co-pay):' : 'Co-pay:'}</span>
                    <strong className="text-slate-700">{claim.patientCopayDeductible.toLocaleString()} د.ل</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200">
                    <span className="text-[10px] text-indigo-800 block font-sans">{isAr ? 'صافي المطالبة:' : 'Net Claim:'}</span>
                    <strong className="text-indigo-950 font-bold">{claim.netCorporateClaim.toLocaleString()} د.ل</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 block font-sans">{isAr ? 'المسدد من الشركة:' : 'Paid:'}</span>
                    <strong className="text-emerald-700 font-bold">{claim.paidAmount.toLocaleString()} د.ل</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
                    <span className="text-[10px] text-rose-800 block font-sans">{isAr ? 'الرصيد المتبقي:' : 'Balance Due:'}</span>
                    <strong className="text-rose-700 font-bold">{claim.outstandingBalance.toLocaleString()} د.ل</strong>
                  </div>
                </div>

                {claim.notes && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    {claim.notes}
                  </p>
                )}

                {/* Settle Claim Button */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClaimForPay(claim);
                      setClaimPayAmount(claim.outstandingBalance > 0 ? claim.outstandingBalance : 1000);
                      setShowClaimPayModal(true);
                    }}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-2xs transition-colors cursor-pointer"
                  >
                    {isAr ? 'تسجيل سداد تحويل مصرفي للمطالبة' : 'Record Corporate Remittance'}
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CHART OF ACCOUNTS & GENERAL LEDGER (دليل الحسابات ودفتر الأستاذ)       */}
      {/* ========================================================================= */}
      {activeFinanceTab === 'general_ledger' && (
        <div className="space-y-6">
          
          {/* Header & Account Type Filter */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-teal-600" />
                  <span>{isAr ? 'دليل الحسابات وشجرة الحسابات المحاسبية (Chart of Accounts)' : 'Chart of Accounts'}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr 
                    ? 'شجرة الحسابات الخماسية المعتمدة للمستشفى: الأصول، الخصوم، حقوق الملكية، الإيرادات، والمصروفات' 
                    : 'Standard 5-category healthcare general ledger accounts structure'}
                </p>
              </div>

              {/* Balanced Status Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? 'ميزان المراجعة متزن 100%' : 'Trial Balance 100% Balanced'}</span>
              </div>
            </div>

            {/* Account Type Filters */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAccountTypeFilter('all')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  accountTypeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isAr ? 'جميع الحسابات' : 'All Accounts'}
              </button>
              <button
                type="button"
                onClick={() => setAccountTypeFilter('asset')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  accountTypeFilter === 'asset' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isAr ? '1000 الأصول (Assets)' : 'Assets'}
              </button>
              <button
                type="button"
                onClick={() => setAccountTypeFilter('liability')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  accountTypeFilter === 'liability' ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isAr ? '2000 الخصوم (Liabilities)' : 'Liabilities'}
              </button>
              <button
                type="button"
                onClick={() => setAccountTypeFilter('equity')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  accountTypeFilter === 'equity' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isAr ? '3000 حقوق الملكية (Equity)' : 'Equity'}
              </button>
              <button
                type="button"
                onClick={() => setAccountTypeFilter('revenue')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  accountTypeFilter === 'revenue' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isAr ? '4000 الإيرادات (Revenues)' : 'Revenues'}
              </button>
              <button
                type="button"
                onClick={() => setAccountTypeFilter('expense')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  accountTypeFilter === 'expense' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isAr ? '5000 المصروفات (Expenses)' : 'Expenses'}
              </button>
            </div>
          </div>

          {/* Chart of Accounts Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{isAr ? 'رمز الحساب' : 'Code'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'اسم الحساب بالعربية' : 'Account Name (Ar)'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الاسم بالإنجليزية' : 'Account Name (En)'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'التصنيف' : 'Type'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'مجموع المدين (د.ل)' : 'Debit Total'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'مجموع الدائن (د.ل)' : 'Credit Total'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الرصيد الصافي (د.ل)' : 'Net Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {chartOfAccounts
                  .filter(a => accountTypeFilter === 'all' || a.type === accountTypeFilter)
                  .map(acc => (
                    <tr 
                      key={acc.code} 
                      className={`hover:bg-slate-50 ${acc.level === 1 ? 'bg-slate-50/80 font-bold' : ''}`}
                    >
                      <td className="py-2 px-3 font-bold text-slate-900">{acc.code}</td>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                        {acc.level > 1 && <span className="text-slate-300 me-2">└──</span>}
                        {acc.nameAr}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-600">{acc.nameEn}</td>
                      <td className="py-2 px-3 font-sans uppercase text-[10px]">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          acc.type === 'asset' ? 'bg-teal-50 text-teal-800' :
                          acc.type === 'liability' ? 'bg-rose-50 text-rose-800' :
                          acc.type === 'equity' ? 'bg-indigo-50 text-indigo-800' :
                          acc.type === 'revenue' ? 'bg-emerald-50 text-emerald-800' :
                          'bg-amber-50 text-amber-800'
                        }`}>
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-800">{acc.debitTotal.toLocaleString()}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">{acc.creditTotal.toLocaleString()}</td>
                      <td className="py-2 px-3 font-bold text-teal-900 text-sm">
                        {acc.balance.toLocaleString()} {acc.normalBalance === 'debit' ? (isAr ? 'مدين' : 'Dr') : (isAr ? 'دائن' : 'Cr')}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Journal Entries Log (قيود اليومية) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>{isAr ? 'سجل قيود اليومية العامة المحاسبية (General Journal Entries)' : 'General Journal Entries'}</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {journalEntries.length} {isAr ? 'قيود مسجلة' : 'posted entries'}
              </span>
            </div>

            <div className="space-y-4">
              {journalEntries.map(jv => (
                <div key={jv.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                        {jv.entryNumber}
                      </span>
                      <strong className="text-slate-800">{jv.descriptionAr}</strong>
                    </div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      <span>{jv.date}</span> · <span>المسؤول: {jv.postedBy}</span>
                    </div>
                  </div>

                  <table className="w-full text-xs text-right bg-white rounded-lg border border-slate-200 overflow-hidden font-mono">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-1.5 px-3">{isAr ? 'الحساب' : 'Account'}</th>
                        <th className="py-1.5 px-3">{isAr ? 'البيان' : 'Particulars'}</th>
                        <th className="py-1.5 px-3">{isAr ? 'مدين (د.ل)' : 'Debit'}</th>
                        <th className="py-1.5 px-3">{isAr ? 'دائن (د.ل)' : 'Credit'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jv.lines.map((l, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-3 font-sans">
                            <span className="font-mono font-bold text-teal-800 me-2">{l.accountCode}</span>
                            <span>{l.accountNameAr}</span>
                          </td>
                          <td className="py-1.5 px-3 font-sans text-slate-500 text-[11px]">{l.description}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{l.debit > 0 ? l.debit.toLocaleString() : '-'}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{l.credit > 0 ? l.credit.toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MEDICAL PACKAGES MANAGEMENT MODAL                                      */}
      {/* ========================================================================= */}
      <PackagesManagementModal
        isOpen={showPackagesModal}
        onClose={() => setShowPackagesModal(false)}
        packages={packages}
        currentUser={currentUser}
        language={language}
        onRefreshPackages={() => {
          onRefreshPackages?.();
          onRefresh();
          fetchInvoice();
          loadFinancialData();
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD RECEIPT VOUCHER (سند قبض دفعة مالية)                      */}
      {/* ========================================================================= */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? 'تحرير سند قبض نقدية / دفعة تحت الحساب' : 'Issue Receipt Voucher'}</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'المبلغ المقبوض (د.ل) *' : 'Amount (LYD) *'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-base font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'طريقة القبض والدفع *' : 'Payment Method *'}
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold"
                >
                  <option value="Cash">{isAr ? 'نقداً بالخزينة (Cash Drawer)' : 'Cash'}</option>
                  <option value="Card">{isAr ? 'بطاقة مصرفية / تداول / نمو' : 'Card POS'}</option>
                  <option value="Bank Transfer">{isAr ? 'تحويل مصرفي مباشر' : 'Bank Transfer'}</option>
                  <option value="Letter of Guarantee">{isAr ? 'خطاب ضمان شركة تأمين' : 'Letter of Guarantee'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'حساب ملف الإيواء المعني *' : 'Target Inpatient Stay *'}
                </label>
                <select
                  value={selectedAdmissionId}
                  onChange={(e) => setSelectedAdmissionId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                >
                  {admissions.map(a => (
                    <option key={a.admissionId} value={a.admissionId}>
                      {a.patientName} — {a.admissionId} (غرفة {a.roomNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {isAr ? 'البيان ورقم الإيصال / الشيك' : 'Notes / Cheque Ref.'}
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  placeholder={isAr ? 'دفعة إيداع مبدئي تحت حساب العملية القيصرية...' : 'Advance deposit for inpatient stay...'}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (isAr ? 'جاري الإصدار...' : 'Issuing...') : (isAr ? 'تأكيد وإصدار سند القبض' : 'Issue Receipt')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD DISBURSEMENT VOUCHER (تحرير سند صرف نقدية)                 */}
      {/* ========================================================================= */}
      {showDisbursementModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>{isAr ? 'تحرير سند صرف نقدية / مصاريف تشغيلية' : 'Issue Disbursement Voucher'}</span>
              </h3>
              <button onClick={() => setShowDisbursementModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDisbursement} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">{isAr ? 'الطرف المستفيد *' : 'Beneficiary *'}</label>
                  <input
                    type="text"
                    required
                    value={disbursementForm.beneficiary}
                    onChange={(e) => setDisbursementForm({ ...disbursementForm, beneficiary: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold"
                    placeholder="د. طارق / شركة الأوائل للأدوية..."
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">{isAr ? 'نوع المستفيد' : 'Type'}</label>
                  <select
                    value={disbursementForm.beneficiaryType}
                    onChange={(e) => setDisbursementForm({ ...disbursementForm, beneficiaryType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold"
                  >
                    <option value="doctor">{isAr ? 'طبيب / استشاري' : 'Doctor'}</option>
                    <option value="vendor">{isAr ? 'مورد مستلزمات طبية' : 'Vendor'}</option>
                    <option value="utility">{isAr ? 'غازات طبية / صيانة' : 'Utility/Maintenance'}</option>
                    <option value="employee">{isAr ? 'كوادر تمريض وموظفين' : 'Employee'}</option>
                    <option value="patient_refund">{isAr ? 'استرداد أمانات مريض' : 'Patient Refund'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">{isAr ? 'المبلغ المصروف (د.ل) *' : 'Amount (LYD) *'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={disbursementForm.amount}
                    onChange={(e) => setDisbursementForm({ ...disbursementForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">{isAr ? 'طريقة الصرف *' : 'Payment Method *'}</label>
                  <select
                    value={disbursementForm.paymentMethod}
                    onChange={(e) => setDisbursementForm({ ...disbursementForm, paymentMethod: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold"
                  >
                    <option value="Cash">{isAr ? 'نقداً من الصندوق الرئيسي' : 'Cash'}</option>
                    <option value="Bank Transfer">{isAr ? 'تحويل مصرفي (مصرف الجمهورية)' : 'Bank Transfer'}</option>
                    <option value="Cheque">{isAr ? 'صك مصدق' : 'Cheque'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">{isAr ? 'بند المصروف وشجرة الحسابات (Account Code) *' : 'Account Code *'}</label>
                <select
                  value={disbursementForm.accountCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    let name = 'أتعاب وأجور الأطباء والجراحين';
                    if (code === '5101') name = 'تكلفة الأدوية والمستهلكات الطبية';
                    if (code === '5103') name = 'أجور التمريض والكوادر الفنية';
                    if (code === '5104') name = 'صيانة الأجهزة وشبكة الغازات الطبية';
                    setDisbursementForm({ ...disbursementForm, accountCode: code, accountNameAr: name });
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="5102">5102 - أتعاب وأجور الأطباء والجراحين</option>
                  <option value="5101">5101 - تكلفة الأدوية والمستهلكات الطبية</option>
                  <option value="5104">5104 - صيانة الأجهزة وشبكة الغازات الطبية</option>
                  <option value="5103">5103 - أجور التمريض والكوادر الفنية</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">{isAr ? 'بيان وسبب الصرف *' : 'Description *'}</label>
                <input
                  type="text"
                  required
                  value={disbursementForm.description}
                  onChange={(e) => setDisbursementForm({ ...disbursementForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="سداد أتعاب عمليات قيصرية / صيانة أسطوانات الأكسجين..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDisbursementModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'تأكيد وإصدار سند الصرف' : 'Issue Voucher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SETTLE DOCTOR COMMISSIONS (تسوية وصرف أتعاب طبيب)               */}
      {/* ========================================================================= */}
      {showDoctorPayModal && selectedDoctorForPay && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'تسوية وصرف أتعاب الاستشاري' : 'Settle Doctor Commission'}</span>
              </h3>
              <button onClick={() => setShowDoctorPayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs">
              <strong className="block text-teal-950 text-sm font-bold">{selectedDoctorForPay.doctorName}</strong>
              <span className="text-teal-800">{selectedDoctorForPay.specialty}</span>
              <div className="mt-1 flex justify-between font-mono font-bold text-teal-900 border-t border-teal-200 pt-1">
                <span>{isAr ? 'الرصيد المعلق المستحق:' : 'Pending Balance:'}</span>
                <span>{selectedDoctorForPay.pendingBalance.toLocaleString()} د.ل</span>
              </div>
            </div>

            <form onSubmit={handleSettleDoctor} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">{isAr ? 'المبلغ المراد صرفه (د.ل) *' : 'Disbursement Amount *'}</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={doctorPayAmount}
                  onChange={(e) => setDoctorPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-base text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">{isAr ? 'طريقة الدفع *' : 'Payment Method *'}</label>
                <select
                  value={doctorPayMethod}
                  onChange={(e) => setDoctorPayMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold"
                >
                  <option value="Cash">{isAr ? 'نقداً من الصندوق الرئيسي' : 'Cash'}</option>
                  <option value="Bank Transfer">{isAr ? 'تحويل لحساب الطبيب المصرفي' : 'Bank Transfer'}</option>
                  <option value="Cheque">{isAr ? 'صك مصدق باسم الطبيب' : 'Cheque'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">{isAr ? 'البيان والملاحظات' : 'Notes'}</label>
                <input
                  type="text"
                  value={doctorPayNotes}
                  onChange={(e) => setDoctorPayNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDoctorPayModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (isAr ? 'جاري الصرف...' : 'Processing...') : (isAr ? 'تأكيد وصرف أتعاب الطبيب' : 'Confirm Settlement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SETTLE CORPORATE CLAIM REMITTANCE (سداد مطالبة تأمين)            */}
      {/* ========================================================================= */}
      {showClaimPayModal && selectedClaimForPay && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>{isAr ? 'تسجيل سداد تحويل شركة التأمين' : 'Settle Corporate Remittance'}</span>
              </h3>
              <button onClick={() => setShowClaimPayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-mono">
              <strong className="block text-indigo-950 font-bold font-sans text-sm">{selectedClaimForPay.corporateName}</strong>
              <div className="text-indigo-800 mt-1 flex justify-between">
                <span>المطالبة: {selectedClaimForPay.claimNumber}</span>
                <span>المتبقي: {selectedClaimForPay.outstandingBalance.toLocaleString()} د.ل</span>
              </div>
            </div>

            <form onSubmit={handleSettleCorporateClaim} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">{isAr ? 'المبلغ المحول والمسدد (د.ل) *' : 'Amount *'}</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={claimPayAmount}
                  onChange={(e) => setClaimPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-base text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">{isAr ? 'طريقة التحويل' : 'Method'}</label>
                <select
                  value={claimPayMethod}
                  onChange={(e) => setClaimPayMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold"
                >
                  <option value="Bank Transfer">{isAr ? 'تحويل مصرفي (حساب مصرف الجمهورية)' : 'Bank Transfer'}</option>
                  <option value="Cheque">{isAr ? 'صك مصدق من الشركة' : 'Certified Cheque'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">{isAr ? 'رقم الإشعار المصرفي / المرجع *' : 'Bank Reference / Advice *'}</label>
                <input
                  type="text"
                  required
                  value={claimPayRef}
                  onChange={(e) => setClaimPayRef(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  placeholder="TR-MADAR-2026-991"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowClaimPayModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (isAr ? 'جاري التسجيل...' : 'Processing...') : (isAr ? 'تأكيد استلام التحويل' : 'Confirm Settlement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: OFFICIAL PRINTABLE VOUCHER MODAL (معاينة وطباعة السند المالي)     */}
      {/* ========================================================================= */}
      {showVoucherPrintModal && voucherToPrint && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 text-slate-900 font-sans">
            
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <span className="text-xs font-bold text-slate-500">
                {isAr ? 'معاينة السند المالي الرسمي قبل الطباعة' : 'Official Financial Voucher'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isAr ? 'طباعة السند' : 'Print'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowVoucherPrintModal(false)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Official Printable Voucher Paper */}
            <div className="border-2 border-slate-800 rounded-xl p-5 space-y-4 bg-slate-50/30">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    أ
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-950">مستشفى الأمل التخصصي للنساء والولادة</h3>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      Al-Amal Hospital · Tripoli Finance Dept
                    </span>
                  </div>
                </div>

                <div className="text-end font-mono">
                  <span className={`px-2 py-0.5 rounded text-xs font-black block ${
                    voucherToPrint.type === 'receipt' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                  }`}>
                    {voucherToPrint.type === 'receipt' ? (isAr ? 'سند قبض مالي (RV)' : 'Receipt Voucher') : (isAr ? 'سند صرف مالي (PV)' : 'Payment Voucher')}
                  </span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {voucherToPrint.data.receiptNumber || voucherToPrint.data.voucherNumber}
                  </span>
                </div>
              </div>

              {/* Body particulars */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-dashed border-slate-300">
                  <span className="text-slate-500">{isAr ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
                  <span className="font-mono font-bold text-slate-900">{voucherToPrint.data.date || voucherToPrint.data.timestamp?.split('T')[0]}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-dashed border-slate-300">
                  <span className="text-slate-500">{isAr ? 'وصلنا من / صُرف إلى:' : 'Party / Beneficiary:'}</span>
                  <span className="font-bold text-slate-950">{voucherToPrint.data.beneficiary || voucherToPrint.data.partyName || activePat?.fullName}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-dashed border-slate-300">
                  <span className="text-slate-500">{isAr ? 'المبلغ بالحروف والأرقام:' : 'Amount:'}</span>
                  <span className="font-mono font-black text-slate-950 text-sm">
                    {voucherToPrint.data.amount?.toLocaleString()} {isAr ? 'دينار ليبي (فقط لا غير)' : 'LYD'}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-dashed border-slate-300">
                  <span className="text-slate-500">{isAr ? 'طريقة الدفع:' : 'Payment Method:'}</span>
                  <span className="font-semibold text-slate-800">{voucherToPrint.data.paymentMethod}</span>
                </div>

                <div className="py-1">
                  <span className="text-slate-500 block mb-0.5">{isAr ? 'البيان ومبرر العملية:' : 'Description:'}</span>
                  <p className="p-2 rounded bg-white border border-slate-200 text-slate-800 text-[11px] leading-relaxed">
                    {voucherToPrint.data.notes || voucherToPrint.data.description || 'دفعة إيواء وتغطية نفقات علاجية وسريرية'}
                  </p>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-4 border-t-2 border-slate-800 grid grid-cols-2 text-center text-xs">
                <div>
                  <span className="text-slate-500 block mb-5">{isAr ? 'توقيع المحاسب المستلم' : 'Cashier / Accountant'}</span>
                  <strong className="text-slate-900 border-t border-slate-400 pt-1 px-4 inline-block font-mono">
                    {voucherToPrint.data.receivedBy || voucherToPrint.data.issuedBy || currentUser.name}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 block mb-5">{isAr ? 'اعتماد المدير المالي والختم' : 'Financial Approval'}</span>
                  <strong className="text-slate-900 border-t border-slate-400 pt-1 px-4 inline-block">
                    {isAr ? 'د. سالم بن زياد (معتمد)' : 'Approved'}
                  </strong>
                  <div className="text-[9px] text-teal-800 font-mono mt-0.5">[Official Digital Stamp]</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
