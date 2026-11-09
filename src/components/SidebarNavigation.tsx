import React from 'react';
import { 
  Building2, 
  Users, 
  BedDouble, 
  ClipboardList, 
  Pill, 
  CheckCircle2, 
  FlaskConical, 
  Scissors, 
  Package, 
  Stethoscope, 
  DollarSign, 
  FileText, 
  ShieldCheck, 
  Baby, 
  Calendar, 
  Boxes, 
  Heart, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  ShieldAlert,
  Languages,
  FileSignature,
  Mic,
  UsersRound,
  Barcode
} from 'lucide-react';
import { SystemUser, Language } from '../types/hmis.ts';

export type ActiveTabType = 
  | 'portal' 
  | 'reception' 
  | 'barcodes'
  | 'clinical' 
  | 'handover'
  | 'orders' 
  | 'emar' 
  | 'lis' 
  | 'surgery' 
  | 'pharmacy' 
  | 'inventory' 
  | 'appointments' 
  | 'consultations' 
  | 'billing' 
  | 'discharge' 
  | 'consents'
  | 'voice'
  | 'alerts'
  | 'audit';

interface SidebarNavigationProps {
  activeTab: ActiveTabType;
  onSelectTab: (tab: ActiveTabType) => void;
  currentUser: SystemUser;
  language: Language;
  onToggleLanguage: () => void;
  onOpenAuthModal: () => void;
  onOpenOmniSearch: () => void;
  totalBedsCount: number;
  occupiedBedsCount: number;
  criticalLabsCount: number;
  unacknowledgedAlertsCount?: number;
  criticalAlertsCount?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  language,
  onToggleLanguage,
  onOpenAuthModal,
  onOpenOmniSearch,
  totalBedsCount,
  occupiedBedsCount,
  criticalLabsCount,
  unacknowledgedAlertsCount = 0,
  criticalAlertsCount = 0,
  isCollapsed,
  onToggleCollapse
}) => {
  const isAr = language === 'ar';
  const isPatientRole = currentUser.role === 'patient';

  // Navigation items grouped logically
  const clinicalGroup = [
    { id: 'clinical' as ActiveTabType, nameAr: 'الملف الطبي والنساء والولادة', nameEn: 'Clinical & Ob/Gyn EMR', icon: Baby },
    { 
      id: 'alerts' as ActiveTabType, 
      nameAr: 'التنبيهات السريرية الذكية', 
      nameEn: 'Smart Clinical Alerts', 
      icon: ShieldAlert,
      badge: unacknowledgedAlertsCount > 0 ? `${unacknowledgedAlertsCount}` : undefined,
      badgeColor: criticalAlertsCount > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-600 text-white'
    },
    { id: 'voice' as ActiveTabType, nameAr: 'الطباعة الصوتية وذكاء AI', nameEn: 'Voice Dictation & AI Scribe', icon: Mic },
    { id: 'consents' as ActiveTabType, nameAr: 'نماذج الإقرارات والموافقات', nameEn: 'Informed Consent Forms', icon: FileSignature },
    { id: 'emar' as ActiveTabType, nameAr: 'التمريض وسجل الأدوية eMAR', nameEn: 'Nursing eMAR', icon: CheckCircle2 },
    { id: 'handover' as ActiveTabType, nameAr: 'تسليم واستلام المناوبة (SBAR)', nameEn: 'Shift Handover (SBAR)', icon: UsersRound },
    { id: 'orders' as ActiveTabType, nameAr: 'الأوامر الطبية والوجبات', nameEn: 'Orders & Dietary', icon: ClipboardList },
    { id: 'surgery' as ActiveTabType, nameAr: 'العمليات والتخدير والولادات', nameEn: 'OT & Anesthesia', icon: Scissors },
    { id: 'consultations' as ActiveTabType, nameAr: 'الاستشارات التخصصية', nameEn: 'Consultations', icon: Stethoscope },
    { id: 'discharge' as ActiveTabType, nameAr: 'وثائق الخروج والتقارير', nameEn: 'Discharge & Reports', icon: FileText },
  ];

  const diagnosticsGroup = [
    { 
      id: 'lis' as ActiveTabType, 
      nameAr: 'المختبر والتحاليل LIS', 
      nameEn: 'Laboratory LIS', 
      icon: FlaskConical,
      badge: criticalLabsCount > 0 ? `${criticalLabsCount} ⚠️` : undefined,
      badgeColor: 'bg-rose-600 text-white animate-pulse'
    },
    { id: 'pharmacy' as ActiveTabType, nameAr: 'الصيدلية وصرف الأدوية', nameEn: 'Pharmacy Dispense', icon: Package },
  ];

  const operationsGroup = [
    { 
      id: 'reception' as ActiveTabType, 
      nameAr: 'الاستقبال وإشغال الأسرّة', 
      nameEn: 'Reception & Beds', 
      icon: BedDouble,
      badge: `${occupiedBedsCount}/${totalBedsCount}`,
      badgeColor: 'bg-slate-700 text-slate-300 font-mono'
    },
    { id: 'barcodes' as ActiveTabType, nameAr: 'طباعة وتدقيق الباركود وQR', nameEn: 'Barcode & QR Hub', icon: Barcode },
    { id: 'appointments' as ActiveTabType, nameAr: 'العيادات وحجز المواعيد', nameEn: 'Clinic Appointments', icon: Calendar },
    { id: 'inventory' as ActiveTabType, nameAr: 'المستودع وأوامر الشراء', nameEn: 'Inventory & PO', icon: Boxes },
  ];

  const governanceGroup = [
    { id: 'billing' as ActiveTabType, nameAr: 'المحاسبة المالية والفوترة', nameEn: 'Financial Accounting & Billing', icon: DollarSign },
    { id: 'audit' as ActiveTabType, nameAr: 'سجل التدقيق والحوكمة', nameEn: 'Audit Trail', icon: ShieldCheck },
  ];

  const patientGroup = [
    { id: 'portal' as ActiveTabType, nameAr: 'بوابة المريض الرقمية', nameEn: 'My Health Portal', icon: Heart },
    { id: 'appointments' as ActiveTabType, nameAr: 'مواعيدي واستشاراتي', nameEn: 'My Appointments', icon: Calendar },
    { id: 'billing' as ActiveTabType, nameAr: 'كشف الحساب والفوترة', nameEn: 'Provisional Bill', icon: DollarSign },
  ];

  const renderNavItem = (item: { id: ActiveTabType; nameAr: string; nameEn: string; icon: any; badge?: string; badgeColor?: string }) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelectTab(item.id)}
        title={isAr ? item.nameAr : item.nameEn}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all group relative select-none ${
          isActive
            ? 'bg-teal-600 text-white shadow-xs'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
        } ${isCollapsed ? 'justify-center px-2' : 'justify-between'}`}
      >
        <div className="flex items-center gap-3 truncate">
          <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-white' : 'text-teal-400 group-hover:scale-110'}`} />
          {!isCollapsed && (
            <span className="truncate whitespace-nowrap">
              {isAr ? item.nameAr : item.nameEn}
            </span>
          )}
        </div>

        {!isCollapsed && item.badge && (
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
            {item.badge}
          </span>
        )}

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute rtl:right-full ltr:left-full ml-2 mr-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 z-50 transition-opacity border border-slate-700">
            {isAr ? item.nameAr : item.nameEn}
          </div>
        )}
      </button>
    );
  };

  return (
    <aside 
      className={`bg-slate-900 text-white flex flex-col shrink-0 border-slate-800 transition-all duration-200 select-none no-print sticky top-0 h-screen z-40 ${
        isCollapsed ? 'w-16' : 'w-64'
      } rtl:border-l ltr:border-r`}
    >
      {/* Sidebar Header Brand */}
      <div className="h-16 px-3 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
            <Building2 className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold tracking-tight text-white truncate">
                {isAr ? 'مستشفى الأمل التخصصي' : 'Al-Amal Hospital'}
              </span>
              <span className="text-[10px] text-teal-400 font-mono truncate">
                {isAr ? 'منظومة HMIS السريرية' : 'Clinical HMIS Core'}
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? (isAr ? 'توسيع القائمة' : 'Expand Sidebar') : (isAr ? 'طي القائمة' : 'Collapse Sidebar')}
        >
          {isCollapsed ? (
            isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Quick Omni-Search Button inside Sidebar */}
      <div className="p-2 border-b border-slate-800 shrink-0">
        <button
          type="button"
          onClick={onOpenOmniSearch}
          className={`w-full flex items-center gap-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700/70 text-xs transition-colors ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
          title={isAr ? 'البحث الشامل (Ctrl+K)' : 'Omni Search (Ctrl+K)'}
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            {!isCollapsed && (
              <span className="text-slate-400 truncate text-[11px]">
                {isAr ? 'بحث سريع بالنظام...' : 'Quick search...'}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <kbd className="text-[10px] font-mono bg-slate-900 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700">
              ⌘K
            </kbd>
          )}
        </button>
      </div>

      {/* Vertical Navigation Items List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 no-scrollbar">
        {isPatientRole ? (
          /* Patient Mode */
          <div>
            {!isCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                {isAr ? 'بوابة المريض الرقمية' : 'Patient Portal'}
              </div>
            )}
            <div className="space-y-1">
              {patientGroup.map(renderNavItem)}
            </div>
          </div>
        ) : (
          /* Hospital Staff Mode with Categorized Sections */
          <>
            {/* Section 1: Clinical Workstation */}
            <div>
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  {isAr ? 'الرعاية السريرية والإيواء' : 'Clinical & Inpatient'}
                </div>
              )}
              <div className="space-y-0.5">
                {clinicalGroup.map(renderNavItem)}
              </div>
            </div>

            {/* Section 2: Diagnostics & Pharmacy */}
            <div>
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  {isAr ? 'التشخيص والصيدلية' : 'Diagnostics & Pharmacy'}
                </div>
              )}
              <div className="space-y-0.5">
                {diagnosticsGroup.map(renderNavItem)}
              </div>
            </div>

            {/* Section 3: Operations & Front Desk */}
            <div>
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  {isAr ? 'إدارة المستشفى والعمليات' : 'Operations & Front Desk'}
                </div>
              )}
              <div className="space-y-0.5">
                {operationsGroup.map(renderNavItem)}
              </div>
            </div>

            {/* Section 4: Finance & Governance */}
            <div>
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  {isAr ? 'المالية والحوكمة' : 'Finance & Governance'}
                </div>
              )}
              <div className="space-y-0.5">
                {governanceGroup.map(renderNavItem)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom User Profile & Preferences Strip */}
      <div className="p-2 border-t border-slate-800 shrink-0 bg-slate-900/95 space-y-1.5">
        {/* User Card */}
        <button
          type="button"
          onClick={onOpenAuthModal}
          className={`w-full flex items-center gap-2 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 transition-colors border border-slate-700/60 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
          title={isAr ? 'إدارة الصلاحيات وتبديل المستخدم' : 'Manage RBAC / Switch User'}
        >
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center text-xs font-bold shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-right rtl:text-right ltr:text-left truncate">
                <span className="text-xs font-semibold text-slate-200 truncate leading-tight">
                  {isAr ? currentUser.nameAr : currentUser.name}
                </span>
                <span className="text-[10px] text-teal-400 uppercase font-bold font-mono">
                  {currentUser.role}
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
          )}
        </button>

        {/* Language Toggle in Sidebar */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggleLanguage}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-teal-400" />
              <span>{isAr ? 'اللغة الحالية:' : 'Current Language:'}</span>
            </span>
            <span className="font-semibold text-slate-200">{isAr ? 'العربية' : 'English'}</span>
          </button>
        )}
      </div>
    </aside>
  );
};
