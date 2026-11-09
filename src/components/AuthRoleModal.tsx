import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Check, 
  X, 
  AlertCircle, 
  KeyRound, 
  Stethoscope, 
  HeartHandshake, 
  Heart,
  Package, 
  Building2, 
  CreditCard,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { SystemUser, UserRole, Language, Permission } from '../types/hmis.ts';
import { api } from '../api/client.ts';

interface AuthModalProps {
  currentUser: SystemUser;
  users: SystemUser[];
  language: Language;
  onSelectUser: (user: SystemUser) => void;
  onClose: () => void;
}

export function AuthRoleModal({
  currentUser,
  users,
  language,
  onSelectUser,
  onClose
}: AuthModalProps) {
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'quick_switch' | 'credentials' | 'matrix'>('quick_switch');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const result = await api.login(username, password);
      setSuccessMsg(isAr ? `تم تسجيل الدخول بنجاح كـ ${result.user.name}` : `Logged in successfully as ${result.user.name}`);
      setTimeout(() => {
        onSelectUser(result.user);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-rose-600" />;
      case 'doctor':
      case 'physician':
      case 'consultant':
      case 'surgeon':
        return <Stethoscope className="w-4 h-4 text-blue-600" />;
      case 'nurse':
      case 'nurse_supervisor':
        return <HeartHandshake className="w-4 h-4 text-emerald-600" />;
      case 'patient':
        return <Heart className="w-4 h-4 text-pink-600" />;
      case 'pharmacist':
        return <Package className="w-4 h-4 text-amber-600" />;
      case 'reception':
        return <Building2 className="w-4 h-4 text-teal-600" />;
      case 'accountant':
        return <CreditCard className="w-4 h-4 text-indigo-600" />;
      default:
        return <User className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'doctor':
      case 'physician':
      case 'consultant':
      case 'surgeon':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'nurse':
      case 'nurse_supervisor':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'patient':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const roleMatrixData = [
    {
      feature: isAr ? 'إدارة المنظومة والمستخدمين' : 'System & User Admin',
      admin: true, doctor: false, nurse: false, patient: false
    },
    {
      feature: isAr ? 'الملف الطبي وكتابة التشخيص والخطط' : 'Clinical Assessment & EMR Writing',
      admin: true, doctor: true, nurse: false, patient: false
    },
    {
      feature: isAr ? 'وصف الأدوية والتحاليل الطبية' : 'Prescribe Meds & Order Labs',
      admin: true, doctor: true, nurse: false, patient: false
    },
    {
      feature: isAr ? 'إعطاء وتوثيق تمريض eMAR' : 'Administer eMAR Medications',
      admin: true, doctor: false, nurse: true, patient: false
    },
    {
      feature: isAr ? 'تسجيل العلامات الحيوية' : 'Record Vitals & Nursing Care',
      admin: true, doctor: true, nurse: true, patient: false
    },
    {
      feature: isAr ? 'إدارة المستودع واعتماد أوامر الشراء' : 'Inventory & PO Approvals',
      admin: true, doctor: false, nurse: false, patient: false
    },
    {
      feature: isAr ? 'جدولة وحجز المواعيد' : 'Book & Reschedule Appointments',
      admin: true, doctor: true, nurse: true, patient: true
    },
    {
      feature: isAr ? 'عرض الملفات الطبية لكافة المرضى' : 'View All Inpatient Files',
      admin: true, doctor: true, nurse: true, patient: false
    },
    {
      feature: isAr ? 'بوابة المريض الخاصة فقط (عزل MRN)' : 'Dedicated Patient Portal (MRN Isolation)',
      admin: false, doctor: false, nurse: false, patient: true
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {isAr ? 'نظام التحكم في الوصول القائم على الأدوار (RBAC)' : 'Role-Based Access Control (RBAC)'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'المصادقة الأمنية، وتبديل الصلاحيات، ومصفوفة الأذونات' : 'Secure Authentication, Role Switching & Permission Matrix'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 text-xs font-semibold px-5 pt-3 bg-white">
          <button
            onClick={() => setActiveTab('quick_switch')}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              activeTab === 'quick_switch' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {isAr ? 'التبديل السريع للأدوار' : 'Role Switcher'}
          </button>

          <button
            onClick={() => setActiveTab('credentials')}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              activeTab === 'credentials' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {isAr ? 'تسجيل الدخول ببيانات الحساب' : 'Login with Credentials'}
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              activeTab === 'matrix' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {isAr ? 'مصفوفة الصلاحيات (RBAC Matrix)' : 'Permissions Matrix'}
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Quick Switcher */}
          {activeTab === 'quick_switch' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">{isAr ? 'المستخدم الحالي النشط:' : 'Current Active User:'}</span>{' '}
                <strong className="text-teal-700">{isAr ? currentUser.nameAr : currentUser.name}</strong> ({currentUser.role})
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {users.map(u => {
                  const isActive = u.id === currentUser.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        onSelectUser(u);
                        onClose();
                      }}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start justify-between ${
                        isActive 
                          ? 'border-teal-500 bg-teal-50/50 shadow-xs ring-1 ring-teal-500' 
                          : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          {getRoleIcon(u.role)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{isAr ? u.nameAr : u.name}</div>
                          <div className="text-[11px] text-slate-500">{u.title}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getRoleBadge(u.role)}`}>
                              {u.role}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">@{u.username}</span>
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <span className="px-2 py-0.5 rounded bg-teal-600 text-white font-bold text-[10px]">
                          {isAr ? 'نشط' : 'Active'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Login with Credentials */}
          {activeTab === 'credentials' && (
            <div className="space-y-4 max-w-md mx-auto">
              {/* Presets buttons */}
              <div className="text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-700">{isAr ? 'حسابات النظام التجريبية السريعة:' : 'Quick Demo Credentials:'}</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                    className="p-2 border border-slate-200 rounded text-left rtl:text-right hover:bg-slate-50"
                  >
                    <div className="font-bold text-rose-700">Admin</div>
                    <div className="text-[10px] text-slate-400 font-mono">admin / admin123</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUsername('dr_tarek'); setPassword('doctor123'); }}
                    className="p-2 border border-slate-200 rounded text-left rtl:text-right hover:bg-slate-50"
                  >
                    <div className="font-bold text-blue-700">Doctor (د. طارق)</div>
                    <div className="text-[10px] text-slate-400 font-mono">dr_tarek / doctor123</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUsername('nurse_fatima'); setPassword('nurse123'); }}
                    className="p-2 border border-slate-200 rounded text-left rtl:text-right hover:bg-slate-50"
                  >
                    <div className="font-bold text-emerald-700">Nurse (ممرضة فاطمة)</div>
                    <div className="text-[10px] text-slate-400 font-mono">nurse_fatima / nurse123</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUsername('mariam_patient'); setPassword('patient123'); }}
                    className="p-2 border border-slate-200 rounded text-left rtl:text-right hover:bg-slate-50"
                  >
                    <div className="font-bold text-pink-700">Patient (مريم الترهوني)</div>
                    <div className="text-[10px] text-slate-400 font-mono">mariam_patient / patient123</div>
                  </button>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'اسم المستخدم' : 'Username'}</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{isAr ? 'كلمة المرور' : 'Password'}</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold text-xs transition-colors shadow-xs"
                >
                  {isAr ? 'تسجيل الدخول والتحقق من الصلاحيات' : 'Authenticate & Set Role'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Permissions Matrix */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                {isAr 
                  ? 'جدول تفصيلي يوضح حدود الصلاحيات المقيدة لكل دور وفق سياسة الحماية وعزل بيانات المرضى الصارمة:' 
                  : 'Explicit Role-Based Access Control matrix demonstrating strict permissions and patient data isolation:'}
              </p>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">{isAr ? 'الوظيفة / الصلاحية' : 'Permission Feature'}</th>
                      <th className="py-2.5 px-3 text-center text-rose-700">Admin</th>
                      <th className="py-2.5 px-3 text-center text-blue-700">Doctor</th>
                      <th className="py-2.5 px-3 text-center text-emerald-700">Nurse</th>
                      <th className="py-2.5 px-3 text-center text-pink-700">Patient</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roleMatrixData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{row.feature}</td>
                        <td className="py-2.5 px-3 text-center">
                          {row.admin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {row.doctor ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {row.nurse ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {row.patient ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
