import React, { useState, useMemo } from 'react';
import {
  Bed,
  Patient,
  Admission,
  Language,
  SystemUser,
  InfectionIsolationStatus,
  RoomType
} from '../types/hmis.ts';
import {
  Building2,
  BedDouble,
  User,
  Users,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  UserPlus,
  Search,
  Filter,
  Sparkles,
  Layers,
  MapPin,
  Clock,
  DollarSign,
  Maximize2,
  Check,
  X,
  Flame,
  Info
} from 'lucide-react';

interface BedAssignmentMapProps {
  beds: Bed[];
  patients: Patient[];
  admissions: Admission[];
  currentUser: SystemUser;
  language: Language;
  onSelectAdmission: (adm: Admission) => void;
  onInitiateTransfer: (adm: Admission) => void;
  onAssignPatientToBed: (bed: Bed) => void;
  onUpdateBedStatus?: (bedId: string, status: any, infectionStatus?: InfectionIsolationStatus) => void;
}

export const BedAssignmentMap: React.FC<BedAssignmentMapProps> = ({
  beds,
  patients,
  admissions,
  currentUser,
  language,
  onSelectAdmission,
  onInitiateTransfer,
  onAssignPatientToBed,
  onUpdateBedStatus
}) => {
  const isAr = language === 'ar';

  const [selectedFloor, setSelectedFloor] = useState<'all' | '1' | '2' | '3'>('all');
  const [filterOccupancy, setFilterOccupancy] = useState<'all' | 'occupied' | 'vacant' | 'cleaning'>('all');
  const [filterInfection, setFilterInfection] = useState<'all' | 'standard' | 'isolation'>('all');
  const [selectedBedForModal, setSelectedBedForModal] = useState<Bed | null>(null);

  // Group beds by architectural zones/wings
  const wings = useMemo(() => {
    return [
      {
        id: 'wing-obgyn',
        floor: '1',
        nameAr: 'جناح النساء والولادة العام (Ob/Gyn Inpatient Ward)',
        nameEn: 'General Ob/Gyn Inpatient Wing (Floor 1)',
        roomNumbers: ['101', '102', '103'],
        accent: 'border-teal-500 bg-teal-500/10'
      },
      {
        id: 'wing-highrisk',
        floor: '1',
        nameAr: 'جناح الحمل الحرج ومراقبة الجنين (High-Risk Maternity Wing)',
        nameEn: 'High-Risk Maternity & Fetal Care Wing (Floor 1)',
        roomNumbers: ['104', '105'],
        accent: 'border-amber-500 bg-amber-500/10'
      },
      {
        id: 'wing-vip',
        floor: '2',
        nameAr: 'أجنحة الأمومة والولادة الفاخرة (Private VIP Maternity Suites)',
        nameEn: 'Private VIP Maternity Suites (Floor 2)',
        roomNumbers: ['201', '202', '203'],
        accent: 'border-purple-500 bg-purple-500/10'
      },
      {
        id: 'wing-recovery',
        floor: '3',
        nameAr: 'وحدة الرعاية ما بعد الجراحة وحضانة المواليد (Post-Op & Recovery)',
        nameEn: 'Post-Op Recovery & Special Care (Floor 3)',
        roomNumbers: ['301', '302', '303'],
        accent: 'border-blue-500 bg-blue-500/10'
      }
    ];
  }, []);

  // Filter beds
  const filteredBeds = useMemo(() => {
    return beds.filter(b => {
      // Floor filter
      if (selectedFloor !== 'all') {
        const floorPrefix = b.roomNumber.charAt(0);
        if (floorPrefix !== selectedFloor) return false;
      }
      // Occupancy filter
      if (filterOccupancy !== 'all' && b.status !== filterOccupancy) {
        return false;
      }
      // Infection filter
      if (filterInfection === 'isolation') {
        const isIso = b.infectionStatus && b.infectionStatus !== 'standard';
        if (!isIso) return false;
      } else if (filterInfection === 'standard') {
        const isStandard = !b.infectionStatus || b.infectionStatus === 'standard';
        if (!isStandard) return false;
      }
      return true;
    });
  }, [beds, selectedFloor, filterOccupancy, filterInfection]);

  // Summary counts
  const totalCount = beds.length;
  const occupiedCount = beds.filter(b => b.status === 'occupied').length;
  const vacantCount = beds.filter(b => b.status === 'vacant').length;
  const cleaningCount = beds.filter(b => b.status === 'cleaning').length;
  const isolationCount = beds.filter(b => b.infectionStatus && b.infectionStatus !== 'standard').length;

  // Helper for admission and patient details
  const getBedAdmission = (bed: Bed): Admission | null => {
    if (!bed.currentAdmissionId) return null;
    return admissions.find(a => a.admissionId === bed.currentAdmissionId) || null;
  };

  const getBedPatient = (bed: Bed): Patient | null => {
    const adm = getBedAdmission(bed);
    if (!adm) return null;
    return patients.find(p => p.mrn === adm.mrn) || null;
  };

  return (
    <div className="space-y-4">
      {/* Visual Floor Plan Top Control Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 sm:p-5 rounded-xl shadow-md border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>{isAr ? 'خريطة توزيع الأسرة والمخطط المعماري للطوابق (Bed Assignment Floor Plan)' : 'Interactive Hospital Floor Plan & Bed Assignment Map'}</span>
                  <span className="bg-teal-800 text-teal-200 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                    Floor Map View
                  </span>
                </h2>
                <p className="text-xs text-slate-300">
                  {isAr 
                    ? 'رؤية معمارية تفاعلية لتوزيع أجنحة وأسرّة المستشفى، ومتابعة الإشغال، جنس المرضى، واحتياطات العزل ومكافحة العدوى.' 
                    : 'Architectural ward overview showing occupancy status, patient gender, and infection isolation precautions.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Statistics Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-slate-800 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700 font-mono">
              {isAr ? 'الإجمالي:' : 'Total:'} <strong>{totalCount}</strong>
            </span>
            <span className="bg-rose-950/80 text-rose-300 px-2.5 py-1 rounded-md border border-rose-800 font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{isAr ? 'مشغول:' : 'Occupied:'} <strong>{occupiedCount}</strong></span>
            </span>
            <span className="bg-emerald-950/80 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-800 font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{isAr ? 'شاغر متاح:' : 'Vacant:'} <strong>{vacantCount}</strong></span>
            </span>
            {cleaningCount > 0 && (
              <span className="bg-blue-950/80 text-blue-300 px-2.5 py-1 rounded-md border border-blue-800 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>{isAr ? 'تعقيم:' : 'Cleaning:'} <strong>{cleaningCount}</strong></span>
              </span>
            )}
            {isolationCount > 0 && (
              <span className="bg-amber-950/80 text-amber-300 px-2.5 py-1 rounded-md border border-amber-800 font-mono flex items-center gap-1 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAr ? 'عزل مكافحة عدوى:' : 'Isolation:'} <strong>{isolationCount}</strong></span>
              </span>
            )}
          </div>
        </div>

        {/* Filters and Floor Selectors */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Floor Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">{isAr ? 'الطابق:' : 'Floor:'}</span>
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedFloor('all')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  selectedFloor === 'all' ? 'bg-teal-600 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isAr ? 'كافة الطوابق' : 'All Floors'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedFloor('1')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  selectedFloor === '1' ? 'bg-teal-600 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isAr ? 'الطابق 1 (نساء وولادة)' : 'Floor 1 (Ob/Gyn)'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedFloor('2')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  selectedFloor === '2' ? 'bg-teal-600 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isAr ? 'الطابق 2 (أجنحة VIP)' : 'Floor 2 (VIP Suites)'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedFloor('3')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  selectedFloor === '3' ? 'bg-teal-600 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isAr ? 'الطابق 3 (عناية وإفاقة)' : 'Floor 3 (Recovery)'}
              </button>
            </div>
          </div>

          {/* Occupancy and Infection Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterOccupancy}
              onChange={(e) => setFilterOccupancy(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs font-medium focus:outline-none"
            >
              <option value="all">{isAr ? 'كافة حالات الإشغال' : 'All Occupancy'}</option>
              <option value="occupied">{isAr ? 'مشغول فقط' : 'Occupied Only'}</option>
              <option value="vacant">{isAr ? 'شاغر متاح فقط' : 'Vacant Only'}</option>
              <option value="cleaning">{isAr ? 'قيد التعقيم' : 'Cleaning Only'}</option>
            </select>

            <select
              value={filterInfection}
              onChange={(e) => setFilterInfection(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs font-medium focus:outline-none"
            >
              <option value="all">{isAr ? 'كافة حالات العدوى' : 'All Infection Status'}</option>
              <option value="standard">{isAr ? 'احتياطات قياسية (نظيف)' : 'Standard Precautions'}</option>
              <option value="isolation">{isAr ? 'حالات العزل فقط (Isolation)' : 'Isolation Beds Only'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hospital Architectural Floor Plan Canvas */}
      <div className="space-y-6">
        {wings
          .filter(w => selectedFloor === 'all' || w.floor === selectedFloor)
          .map(wing => {
            const wingBeds = filteredBeds.filter(b => {
              const bedRoom = b.roomNumber;
              return wing.roomNumbers.some(rn => bedRoom.startsWith(rn) || bedRoom === rn);
            });

            if (wingBeds.length === 0 && (filterOccupancy !== 'all' || filterInfection !== 'all')) {
              return null;
            }

            return (
              <div 
                key={wing.id}
                className="bg-slate-50 border-2 border-slate-300/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden"
              >
                {/* Architectural Wing Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-800 text-xs">
                      F{wing.floor}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {isAr ? wing.nameAr : wing.nameEn}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {isAr ? `الغرف المعمارية: ${wing.roomNumbers.join(' ، ')}` : `Rooms: ${wing.roomNumbers.join(', ')}`}
                      </span>
                    </div>
                  </div>

                  {/* Corridor & Nurses Station Badge */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-700">
                      {isAr ? 'محطة التمريض متصلة' : 'Nurses Station Link'}
                    </span>
                    <span className="text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-mono font-bold">
                      {wingBeds.length} {isAr ? 'أسرّة' : 'beds'}
                    </span>
                  </div>
                </div>

                {/* Rooms & Bed Cards Floor Layout Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {wingBeds.map(bed => {
                    const isOccupied = bed.status === 'occupied';
                    const adm = getBedAdmission(bed);
                    const patient = getBedPatient(bed);
                    const gender = bed.patientGender || patient?.gender || (isOccupied ? 'female' : undefined);
                    const infection = bed.infectionStatus || 'standard';

                    return (
                      <div
                        key={bed.id}
                        onClick={() => setSelectedBedForModal(bed)}
                        className={`bg-white border rounded-xl p-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between ${
                          isOccupied 
                            ? infection !== 'standard' 
                              ? 'border-amber-400 bg-amber-50/20' 
                              : 'border-slate-300 hover:border-teal-500'
                            : bed.status === 'cleaning'
                              ? 'border-blue-300 bg-blue-50/20'
                              : 'border-emerald-300 hover:border-emerald-500 bg-emerald-50/10'
                        }`}
                      >
                        {/* Top Card Bar: Bed Number, Room, and Occupancy Pill */}
                        <div>
                          <div className="flex items-start justify-between gap-1.5 mb-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <BedDouble className={`w-4 h-4 ${
                                  isOccupied ? 'text-teal-700' : bed.status === 'cleaning' ? 'text-blue-600' : 'text-emerald-600'
                                }`} />
                                <strong className="text-sm font-bold text-slate-900 font-mono">
                                  {bed.number}
                                </strong>
                              </div>
                              <span className="text-[10px] text-slate-500 block font-mono">
                                {isAr ? `غرفة ${bed.roomNumber}` : `Rm ${bed.roomNumber}`} • {bed.roomType.toUpperCase()}
                              </span>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                bed.status === 'vacant' 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                  : bed.status === 'occupied'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : bed.status === 'cleaning'
                                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                                      : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}>
                                {bed.status === 'vacant' ? (isAr ? 'شاغر متاح' : 'Vacant') :
                                 bed.status === 'occupied' ? (isAr ? 'مشغول' : 'Occupied') :
                                 bed.status === 'cleaning' ? (isAr ? 'قيد التعقيم' : 'Cleaning') :
                                 (isAr ? 'محجوز' : 'Reserved')}
                              </span>

                              {/* Patient Gender Badge */}
                              {gender && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                                  gender === 'female' 
                                    ? 'bg-pink-100 text-pink-800' 
                                    : gender === 'male'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-purple-100 text-purple-800'
                                }`}>
                                  <span>{gender === 'female' ? '♀' : '♂'}</span>
                                  <span>{gender === 'female' ? (isAr ? 'أنثى' : 'Female') : (isAr ? 'ذكر/مولود' : 'Male/Infant')}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Infection / Isolation Status Badge */}
                          <div className="mb-2">
                            {infection === 'standard' ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>{isAr ? 'احتياطات قياسية (نظيف)' : 'Standard Clean'}</span>
                              </span>
                            ) : infection === 'contact_isolation' ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                <ShieldAlert className="w-3 h-3 text-amber-700" />
                                <span>{isAr ? 'عزل تلامسي (Contact Isolation)' : 'Contact Isolation'}</span>
                              </span>
                            ) : infection === 'droplet_isolation' ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                                <ShieldAlert className="w-3 h-3 text-rose-700" />
                                <span>{isAr ? 'عزل تنفسي قطيري (Droplet)' : 'Droplet Isolation'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-300">
                                <ShieldAlert className="w-3 h-3 text-purple-700" />
                                <span>{isAr ? 'عزل وقائي مشدد' : 'Protective Isolation'}</span>
                              </span>
                            )}
                          </div>

                          {/* Patient & Admission Info or Vacant Slot */}
                          {isOccupied && adm ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs space-y-1 mb-2">
                              <div className="flex items-center justify-between">
                                <strong className="text-slate-900 font-bold truncate block">
                                  {bed.currentPatientName || adm.patientName}
                                </strong>
                                <span className="text-[10px] text-teal-800 font-mono font-bold">
                                  {adm.admissionId}
                                </span>
                              </div>

                              <div className="text-[10px] text-slate-500 truncate flex items-center justify-between">
                                <span>{isAr ? 'الاستشاري:' : 'Consultant:'} {adm.attendingConsultantName}</span>
                                {patient?.mrn && <span className="font-mono">MRN: {patient.mrn}</span>}
                              </div>

                              {adm.packageName && (
                                <div className="text-[9.5px] text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded truncate font-medium">
                                  {adm.packageName}
                                </div>
                              )}
                            </div>
                          ) : bed.status === 'vacant' ? (
                            <div className="bg-emerald-50/50 border border-dashed border-emerald-300 rounded-lg p-3 text-center text-xs space-y-1 mb-2">
                              <span className="text-emerald-800 font-semibold block text-[11px]">
                                {isAr ? 'السرير متاح ومجهز للاستقبال' : 'Ready for Patient Assignment'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                {bed.dailyRate} {isAr ? 'د.ل / يوم' : 'LYD / day'}
                              </span>
                            </div>
                          ) : (
                            <div className="bg-blue-50/50 border border-dashed border-blue-300 rounded-lg p-3 text-center text-xs space-y-1 mb-2">
                              <span className="text-blue-800 font-semibold block text-[11px]">
                                {isAr ? 'جاري تعقيم وتجهيز الغرفة' : 'Disinfection & Terminal Cleaning'}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                {isAr ? 'فريق النظافة في الموقع' : 'Housekeeping assigned'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                          {isOccupied && adm ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAdmission(adm);
                                }}
                                className="text-teal-700 hover:text-teal-800 font-bold hover:underline"
                              >
                                {isAr ? 'فتح الملف السريري' : 'Open EMR'}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInitiateTransfer(adm);
                                }}
                                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200"
                              >
                                <ArrowRightLeft className="w-3 h-3 text-slate-500" />
                                <span>{isAr ? 'نقل' : 'Transfer'}</span>
                              </button>
                            </>
                          ) : bed.status === 'vacant' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAssignPatientToBed(bed);
                              }}
                              className="w-full py-1 text-center font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-md transition-colors flex items-center justify-center gap-1"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>{isAr ? 'تسكين مريض' : 'Assign Admission'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onUpdateBedStatus) {
                                  onUpdateBedStatus(bed.id, 'vacant', 'standard');
                                }
                              }}
                              className="w-full py-1 text-center font-bold text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                            >
                              {isAr ? 'اعتماد كشاغر بعد التعقيم' : 'Mark as Ready'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* Bed Inspection / Detail Modal */}
      {selectedBedForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm">
                  {isAr ? `تفاصيل وبطاقة السرير: ${selectedBedForModal.number}` : `Bed Card: ${selectedBedForModal.number}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBedForModal(null)}
                className="text-slate-300 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'رقم الغرفة والجناح:' : 'Room & Ward:'}</span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {isAr ? `غرفة ${selectedBedForModal.roomNumber}` : `Rm ${selectedBedForModal.roomNumber}`}
                  </strong>
                  <span className="text-[11px] text-slate-500 block">{selectedBedForModal.ward}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'فئة الإقامة والتعرفة:' : 'Room Class & Rate:'}</span>
                  <strong className="text-teal-800 font-bold text-sm block">
                    {selectedBedForModal.roomType.toUpperCase()}
                  </strong>
                  <span className="text-slate-600 font-mono text-[11px]">
                    {selectedBedForModal.dailyRate} {isAr ? 'دينار / ليلة' : 'LYD / night'}
                  </span>
                </div>
              </div>

              {/* Patient details if occupied */}
              {selectedBedForModal.status === 'occupied' && selectedBedForModal.currentAdmissionId ? (
                <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <span className="font-bold text-slate-900 block border-b border-slate-100 pb-1">
                    {isAr ? 'بيانات المريضة المنومة حالياً:' : 'Current Inpatient Demographics:'}
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? 'اسم المريضة:' : 'Patient Name:'}</span>
                    <strong className="text-slate-900">{selectedBedForModal.currentPatientName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? 'رقم الدخول:' : 'Admission ID:'}</span>
                    <span className="font-mono text-teal-800 font-bold">{selectedBedForModal.currentAdmissionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? 'الجنس المخصص:' : 'Gender:'}</span>
                    <span className="font-semibold text-pink-700">♀ {isAr ? 'أنثى' : 'Female'}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800 text-center font-medium">
                  {selectedBedForModal.status === 'vacant'
                    ? (isAr ? 'السرير شاغر وجاهز للاستقبال والتسكين فوراً' : 'Bed is vacant and ready for admission')
                    : (isAr ? 'السرير قيد التنظيف والتعقيم الدوري' : 'Under housekeeping & disinfection')}
                </div>
              )}

              {/* Infection & Isolation Status Selection */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'حالة مكافحة العدوى واحتياطات العزل (Infection Isolation):' : 'Infection Isolation Status:'}
                </label>
                <select
                  value={selectedBedForModal.infectionStatus || 'standard'}
                  onChange={(e) => {
                    const newIso = e.target.value as InfectionIsolationStatus;
                    setSelectedBedForModal(prev => prev ? { ...prev, infectionStatus: newIso } : null);
                    if (onUpdateBedStatus) {
                      onUpdateBedStatus(selectedBedForModal.id, selectedBedForModal.status, newIso);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-medium"
                >
                  <option value="standard">{isAr ? 'احتياطات قياسية (نظيف وغير معزول - Standard)' : 'Standard Precautions (Clean)'}</option>
                  <option value="contact_isolation">{isAr ? 'عزل تلامسي (Contact Isolation - MRSA / بكتيريا مقاومة)' : 'Contact Isolation (MRSA)'}</option>
                  <option value="droplet_isolation">{isAr ? 'عزل تنفسي قطيري (Droplet Isolation)' : 'Droplet Isolation'}</option>
                  <option value="airborne">{isAr ? 'عزل هوائي سالب الضغط (Airborne Isolation)' : 'Airborne Isolation'}</option>
                  <option value="protective">{isAr ? 'عزل وقائي لحالات نقص المناعة (Protective Isolation)' : 'Protective Isolation'}</option>
                </select>
              </div>

              {/* Action Buttons in Modal */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                {selectedBedForModal.status === 'occupied' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const adm = getBedAdmission(selectedBedForModal);
                        if (adm) onInitiateTransfer(adm);
                        setSelectedBedForModal(null);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold"
                    >
                      {isAr ? 'نقل المريض لسرير آخر' : 'Transfer Bed'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const adm = getBedAdmission(selectedBedForModal);
                        if (adm) onSelectAdmission(adm);
                        setSelectedBedForModal(null);
                      }}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold"
                    >
                      {isAr ? 'فتح الملف الطبي' : 'Open EMR'}
                    </button>
                  </>
                ) : selectedBedForModal.status === 'vacant' ? (
                  <button
                    type="button"
                    onClick={() => {
                      onAssignPatientToBed(selectedBedForModal);
                      setSelectedBedForModal(null);
                    }}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold"
                  >
                    {isAr ? 'تسكين مريض في هذا السرير' : 'Assign Admission'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateBedStatus) {
                        onUpdateBedStatus(selectedBedForModal.id, 'vacant', 'standard');
                      }
                      setSelectedBedForModal(null);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
                  >
                    {isAr ? 'اعتماد جاهزية السرير' : 'Mark as Ready'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
