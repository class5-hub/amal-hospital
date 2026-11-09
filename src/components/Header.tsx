import React from 'react';
import { 
  Building2, 
  UserCheck, 
  Clock, 
  Languages, 
  ShieldCheck, 
  AlertTriangle,
  BedDouble,
  Search,
  Bell,
  Mic,
  ShieldAlert
} from 'lucide-react';
import { SystemUser, Language } from '../types/hmis.ts';

interface HeaderProps {
  currentUser: SystemUser;
  users: SystemUser[];
  onSelectUser: (user: SystemUser) => void;
  language: Language;
  onToggleLanguage: () => void;
  activeModule: string;
  totalBedsCount: number;
  occupiedBedsCount: number;
  unacknowledgedAlertsCount?: number;
  criticalAlertsCount?: number;
  onOpenAlertsModal?: () => void;
  onOpenVoiceDictationModal?: () => void;
  onOpenAuthModal?: () => void;
  onOpenOmniSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  users,
  onSelectUser,
  language,
  onToggleLanguage,
  totalBedsCount,
  occupiedBedsCount,
  unacknowledgedAlertsCount = 0,
  criticalAlertsCount = 0,
  onOpenAlertsModal,
  onOpenVoiceDictationModal,
  onOpenAuthModal,
  onOpenOmniSearch
}) => {
  const isAr = language === 'ar';
  const occupancyPercent = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'doctor':
      case 'physician':
      case 'consultant':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'nurse':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'patient':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 select-none no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm font-bold text-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              {isAr ? 'مستشفى الأمل التخصصي | HMIS' : 'Al-Amal Specialized Hospital | HMIS'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {isAr ? 'النساء والتوليد والإيواء السريري' : 'Obstetrics, Gynecology & Inpatient Care'}
            </span>
          </div>
        </div>

        {/* Zone 2: System Status & Occupancy Indicators */}
        <div className="hidden lg:flex items-center gap-6 text-xs text-slate-300 font-mono">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700/60">
            <BedDouble className="w-4 h-4 text-teal-400" />
            <span>
              {isAr ? 'إشغال الأسرّة:' : 'Bed Occupancy:'} <strong className="text-white tabular-nums">{occupiedBedsCount}/{totalBedsCount}</strong> ({occupancyPercent}%)
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700/60">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="tabular-nums">2026-11-07 11:00 AM (Tripoli Time)</span>
          </div>
        </div>

        {/* Zone 3: Search, User Role Switcher & RBAC Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onOpenOmniSearch && (
            <button
              onClick={onOpenOmniSearch}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-md border border-slate-700 text-xs transition-colors"
              title={isAr ? 'البحث الشامل في النظام (Ctrl+K)' : 'Omni Search (Ctrl+K)'}
            >
              <Search className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">{isAr ? 'بحث سريع...' : 'Quick search...'}</span>
              <kbd className="hidden md:inline-block text-[10px] font-mono bg-slate-900 text-slate-400 px-1 py-0.2 rounded border border-slate-700">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Quick Voice Dictation Studio Launcher */}
          {onOpenVoiceDictationModal && (
            <button
              onClick={onOpenVoiceDictationModal}
              className="flex items-center gap-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 hover:text-white border border-teal-500/40 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all shadow-2xs"
              title={isAr ? 'محطة الطباعة والإملاء الصوتي الذكي (Voice Dictation)' : 'Voice Dictation Studio'}
            >
              <Mic className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              <span className="hidden md:inline">{isAr ? 'إملاء صوتي' : 'Dictate'}</span>
            </button>
          )}

          {/* Smart Alerts & Clinical Decision Support Bell */}
          {onOpenAlertsModal && (
            <button
              onClick={onOpenAlertsModal}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-all ${
                criticalAlertsCount > 0
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30 ring-1 ring-rose-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isAr ? `مركز التنبيهات السريرية (${unacknowledgedAlertsCount} تنبيه غير مقروء)` : `Smart Clinical Alerts (${unacknowledgedAlertsCount} pending)`}
            >
              {criticalAlertsCount > 0 ? (
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
              ) : (
                <Bell className="w-4 h-4 text-amber-400" />
              )}
              <span className="hidden lg:inline">{isAr ? 'التنبيهات' : 'Alerts'}</span>
              {unacknowledgedAlertsCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  criticalAlertsCount > 0 
                    ? 'bg-rose-600 text-white animate-pulse' 
                    : 'bg-amber-500 text-slate-900'
                }`}>
                  {unacknowledgedAlertsCount}
                </span>
              )}
            </button>
          )}

          {/* Role badge & Switch button */}
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md px-3 py-1.5 text-xs transition-colors"
            title={isAr ? 'إدارة الصلاحيات وتبديل المستخدم' : 'Manage RBAC & Switch User'}
          >
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <div className="text-left rtl:text-right hidden sm:block">
              <div className="font-semibold text-slate-200 leading-tight">
                {isAr ? currentUser.nameAr : currentUser.name}
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getRoleBadgeColor(currentUser.role)}`}>
              {currentUser.role}
            </span>
          </button>

          {/* Language Toggle Button */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 whitespace-nowrap"
            title="تبديل اللغة / Toggle Language"
          >
            <Languages className="w-3.5 h-3.5 text-teal-400" />
            <span>{isAr ? 'English' : 'عربي'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
