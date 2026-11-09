import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Check, 
  ExternalLink, 
  Bell, 
  Volume2, 
  VolumeX,
  ChevronRight,
  User,
  BedDouble,
  Clock,
  Loader2
} from 'lucide-react';
import { SmartAlert, SystemUser, Language } from '../types/hmis.ts';
import { api } from '../api/client.ts';
import { ActiveTabType } from './SidebarNavigation.tsx';

interface SmartAlertsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: SmartAlert[];
  currentUser: SystemUser;
  language: Language;
  onNavigateToTab: (tab: ActiveTabType) => void;
  onRefreshAlerts: () => void;
  onViewAllAlerts: () => void;
}

export const SmartAlertsCenterModal: React.FC<SmartAlertsCenterModalProps> = ({
  isOpen,
  onClose,
  alerts,
  currentUser,
  language,
  onNavigateToTab,
  onRefreshAlerts,
  onViewAllAlerts
}) => {
  if (!isOpen) return null;
  const isAr = language === 'ar';

  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'ai'>('all');

  const unacknowledgedAlerts = alerts.filter(a => !a.isAcknowledged);
  const criticalAlerts = unacknowledgedAlerts.filter(a => a.severity === 'critical');
  const aiAlerts = unacknowledgedAlerts.filter(a => a.severity === 'ai_insight');

  const displayedAlerts = activeTab === 'critical' 
    ? criticalAlerts 
    : activeTab === 'ai' 
      ? aiAlerts 
      : unacknowledgedAlerts;

  const handleQuickAcknowledge = async (alertId: string) => {
    setAcknowledgingId(alertId);
    try {
      await api.acknowledgeSmartAlert(alertId, currentUser, 'Quick acknowledged from Alerts Center');
      onRefreshAlerts();
    } catch (err: any) {
      alert(err.message || 'Error acknowledging alert');
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'مركز التنبيهات والإنذار السريري السريع' : 'Smart Clinical Alerts Center'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">
                  {criticalAlerts.length} {isAr ? 'حرج' : 'Critical'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? 'تنبيهات مؤشرات MEOWS والتحاليل والأدوية المهددة' : 'Maternal MEOWS, critical LIS labs, and drug safety flags'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'all' ? 'bg-white shadow-2xs text-slate-900 font-bold border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'جميع غير المقروءة' : 'All Pending'} ({unacknowledgedAlerts.length})
            </button>
            <button
              onClick={() => setActiveTab('critical')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'critical' ? 'bg-rose-50 shadow-2xs text-rose-800 font-bold border border-rose-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔴 {isAr ? 'الحرجة فقط' : 'Critical Panic'} ({criticalAlerts.length})
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'ai' ? 'bg-indigo-50 shadow-2xs text-indigo-800 font-bold border border-indigo-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ✨ {isAr ? 'الذكاء الاصطناعي' : 'AI Insights'} ({aiAlerts.length})
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onViewAllAlerts();
            }}
            className="text-xs text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1"
          >
            <span>{isAr ? 'عرض اللوحة الشاملة' : 'View Full Dashboard'}</span>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>

        {/* Alerts List Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 max-h-[500px]">
          {displayedAlerts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-semibold text-slate-700">
                {isAr ? 'لا توجد تنبيهات نشطة غير مقروءة في هذا التصنيف' : 'No pending clinical alerts in this category'}
              </p>
            </div>
          ) : (
            displayedAlerts.map((alert) => {
              const isCrit = alert.severity === 'critical';
              const isAi = alert.severity === 'ai_insight';

              return (
                <div
                  key={alert.id}
                  className={`border rounded-xl p-3.5 space-y-2 transition-all shadow-2xs ${
                    isCrit 
                      ? 'bg-rose-50/60 border-rose-200' 
                      : isAi 
                        ? 'bg-indigo-50/60 border-indigo-200' 
                        : 'bg-amber-50/60 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCrit ? 'bg-rose-600 text-white animate-pulse' : isAi ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        {alert.metricValue && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-white text-rose-700 border border-rose-200">
                            {alert.metricValue}
                          </span>
                        )}
                        {alert.patientName && (
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>{alert.patientName}</span>
                            {alert.roomNumber && <span className="text-slate-500 font-mono">({alert.roomNumber})</span>}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 pt-0.5">
                        {isAr ? alert.titleAr : alert.titleEn}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQuickAcknowledge(alert.id)}
                        disabled={acknowledgingId === alert.id}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1"
                      >
                        {acknowledgingId === alert.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span>{isAr ? 'إقرار' : 'Ack'}</span>
                      </button>

                      {alert.actionLink && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateToTab(alert.actionLink!.tab as any);
                          }}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-300 transition-colors"
                          title={isAr ? alert.actionLink.labelAr : alert.actionLink.labelEn}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    {isAr ? alert.messageAr : alert.messageEn}
                  </p>

                  {alert.aiRecommendation && (
                    <div className="p-2 rounded-lg bg-white/80 border border-indigo-200 text-[10px] text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span>{alert.aiRecommendation}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px]">
            {currentUser.name} ({currentUser.role})
          </span>
          <button
            onClick={() => {
              onClose();
              onViewAllAlerts();
            }}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs"
          >
            {isAr ? 'فتح لوحة التنبيهات الكاملة' : 'Open Full Alerts Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
};
