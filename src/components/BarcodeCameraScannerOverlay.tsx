import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Scan,
  X,
  Maximize2,
  Minimize2,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  RotateCw,
  Search,
  User,
  FlaskConical,
  Pill,
  Heart,
  ShieldAlert,
  Layers,
  History,
  Sparkles,
  Clock,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Activity,
  Sun,
  Eye,
  CloudOff,
  RefreshCw,
  ShieldCheck,
  UploadCloud
} from 'lucide-react';
import {
  Patient,
  Admission,
  Language,
  SystemUser,
  MedicationOrder,
  LabOrder
} from '../types/hmis.ts';
import {
  parseScannedClinicalPayload,
  playScannerAudioBeep,
  ParsedClinicalScan
} from '../utils/barcodeService.ts';
import { api } from '../api/client.ts';
import jsQR from 'jsqr';

export type ScannerOverlayMode = 'minimized' | 'pip' | 'expanded';

export interface MedicationValidationResult {
  isMatch: boolean;
  order?: MedicationOrder;
  scannedDrugName: string;
  hasAllergyConflict: boolean;
  conflictingAllergy?: string;
  messageAr: string;
  messageEn: string;
}

export interface ScanHistoryRecord {
  id: string;
  scan: ParsedClinicalScan;
  matchedPatient?: Patient;
  matchedAdmission?: Admission;
  matchedMedication?: MedicationOrder;
  matchedLabOrder?: LabOrder;
  medicationValidation?: MedicationValidationResult;
  status: 'verified' | 'mismatch' | 'unknown';
  timestamp: string;
  syncedToServer: boolean;
}

export interface BarcodeCameraScannerOverlayProps {
  allPatients: Patient[];
  allAdmissions: Admission[];
  activePatient: Patient | null;
  activeAdmission: Admission | null;
  medications?: MedicationOrder[];
  labOrders?: LabOrder[];
  currentUser?: SystemUser | null;
  language: Language;
  onSelectPatient: (patient: Patient, admission?: Admission) => void;
  onItemVerified?: (item: ParsedClinicalScan) => void;
  initialMode?: ScannerOverlayMode;
  dockedInPage?: boolean;
}

const PENDING_SYNC_STORAGE_KEY = 'hmis_pending_barcode_scans';

export const BarcodeCameraScannerOverlay: React.FC<BarcodeCameraScannerOverlayProps> = ({
  allPatients,
  allAdmissions,
  activePatient,
  activeAdmission,
  medications = [],
  labOrders = [],
  currentUser,
  language,
  onSelectPatient,
  onItemVerified,
  initialMode = 'pip',
  dockedInPage = false
}) => {
  const isAr = language === 'ar';

  // Mode: 'minimized', 'pip' (floating picture-in-picture), 'expanded' (full HUD)
  const [mode, setMode] = useState<ScannerOverlayMode>(dockedInPage ? 'expanded' : initialMode);
  
  // High-Contrast Mode for low-light night-shift ward rounds
  const [highContrastMode, setHighContrastMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hmis_scanner_high_contrast') === 'true';
    } catch {
      return false;
    }
  });

  // Offline Pending Sync Queue
  const [pendingSyncQueue, setPendingSyncQueue] = useState<ScanHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(PENDING_SYNC_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Video & Canvas references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedRawRef = useRef<string>('');

  // Active Scan Result & History
  const [lastScanRecord, setLastScanRecord] = useState<ScanHistoryRecord | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryRecord[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [recentFlash, setRecentFlash] = useState<boolean>(false);

  // Persist High-Contrast preference
  const toggleHighContrast = () => {
    const next = !highContrastMode;
    setHighContrastMode(next);
    try {
      localStorage.setItem('hmis_scanner_high_contrast', String(next));
    } catch {
      // ignore
    }
  };

  // Monitor Network Online / Offline Status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      pushPendingSyncQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingSyncQueue]);

  // Push cached pending scans to the backend server
  const pushPendingSyncQueue = async () => {
    if (pendingSyncQueue.length === 0 || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await api.syncCachedBarcodeScans(
        pendingSyncQueue.map(item => ({
          id: item.id,
          raw: item.scan.raw,
          type: item.scan.type,
          format: item.scan.format,
          status: item.status,
          timestamp: item.timestamp
        })),
        currentUser || { id: 'usr-nurse', name: 'Nurse on Duty', role: 'nurse' }
      );

      setPendingSyncQueue([]);
      try {
        localStorage.removeItem(PENDING_SYNC_STORAGE_KEY);
      } catch {
        // ignore
      }

      setSyncFeedback(
        isAr 
          ? `تمت مزامنة ${res.syncedCount} عملية مسح بنجاح مع السيرفر المركزي!` 
          : `Successfully synchronized ${res.syncedCount} cached scan events!`
      );
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch (err: any) {
      console.warn('[Sync Queue Error]:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Stop camera media stream
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Start camera media stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setIsStartingCamera(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported on this browser or origin');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(err => {
          console.warn('Video play prevented:', err);
        });
      }

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      if (track && (track.getCapabilities as any)?.().torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }

      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera stream request failed:', err);
      setIsCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(isAr ? 'تم رفض إذن الوصول إلى الكاميرا. يرجى تفعيل الكاميرا من إعدادات المتصفح.' : 'Camera permission was denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError(isAr ? 'لم يتم العثور على كاميرا متصلة بالجهاز.' : 'No camera detected on this workstation.');
      } else {
        setCameraError(isAr ? 'تعذر تشغيل الكاميرا (ربما بسبب قيود الحماية أو بيئة المعاينة).' : 'Unable to initialize camera video stream.');
      }
    } finally {
      setIsStartingCamera(false);
    }
  }, [cameraFacing, isAr, stopCamera]);

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track.getCapabilities as any)?.().torch) {
      try {
        const next = !isTorchOn;
        await (track as any).applyConstraints({ advanced: [{ torch: next }] });
        setIsTorchOn(next);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  // Flip Camera (Front / Rear)
  const handleSwitchCameraFacing = () => {
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Process a detected raw string with real-time eMAR validation
  const processDetectedRaw = useCallback((raw: string, format?: string) => {
    const now = Date.now();
    // 1.5s cooldown for identical code to prevent continuous spamming
    if (raw === lastScannedRawRef.current && now - lastScanTimeRef.current < 1500) {
      return;
    }

    lastScanTimeRef.current = now;
    lastScannedRawRef.current = raw;

    // Trigger visual laser flash
    setRecentFlash(true);
    setTimeout(() => setRecentFlash(false), 450);

    // Parse payload using standardized medical parser
    const parsed = parseScannedClinicalPayload(raw, format);

    // Match with Hospital Database
    let matchedPatient: Patient | undefined;
    let matchedAdmission: Admission | undefined;
    let matchedMedication: MedicationOrder | undefined;
    let matchedLabOrder: LabOrder | undefined;
    let status: 'verified' | 'mismatch' | 'unknown' = 'unknown';
    let medValidation: MedicationValidationResult | undefined;

    // 1. Match Patient by MRN or parsed name
    if (parsed.mrn) {
      matchedPatient = allPatients.find(p => 
        p.mrn.toLowerCase() === parsed.mrn?.toLowerCase() ||
        p.mrn.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === parsed.mrn?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      );
      if (matchedPatient) {
        matchedAdmission = allAdmissions.find(a => a.mrn === matchedPatient?.mrn);
        status = 'verified';
      }
    }

    // 2. Match Specimen
    if (parsed.type === 'specimen') {
      if (parsed.orderId) {
        matchedLabOrder = labOrders.find(l => l.id.toLowerCase() === parsed.orderId?.toLowerCase());
      }
      if (!matchedPatient && parsed.mrn) {
        matchedPatient = allPatients.find(p => p.mrn.toLowerCase() === parsed.mrn?.toLowerCase());
        matchedAdmission = allAdmissions.find(a => a.mrn === matchedPatient?.mrn);
      }
      status = 'verified';
    }

    // 3. REAL-TIME EMAR MEDICATION VALIDATION (MATCH / MISMATCH FEEDBACK)
    if (parsed.type === 'medication') {
      const activePatientOrders = medications.filter(m => m.status === 'active');
      const drugSearch = (parsed.drugName || parsed.raw).toLowerCase();

      // Find by exact ID or trade/generic name
      if (parsed.orderId) {
        matchedMedication = activePatientOrders.find(m => m.id.toLowerCase() === parsed.orderId?.toLowerCase());
      }
      if (!matchedMedication) {
        matchedMedication = activePatientOrders.find(m => 
          m.tradeName.toLowerCase().includes(drugSearch) ||
          drugSearch.includes(m.tradeName.toLowerCase()) ||
          m.genericName.toLowerCase().includes(drugSearch) ||
          drugSearch.includes(m.genericName.toLowerCase())
        );
      }

      // Cross-reference with patient allergies
      let hasAllergy = false;
      let conflictAllergy = '';
      if (activePatient?.allergies) {
        for (const alg of activePatient.allergies) {
          if (drugSearch.includes(alg.toLowerCase()) || alg.toLowerCase().includes(drugSearch)) {
            hasAllergy = true;
            conflictAllergy = alg;
            break;
          }
        }
      }

      if (matchedMedication) {
        status = 'verified';
        medValidation = {
          isMatch: true,
          order: matchedMedication,
          scannedDrugName: matchedMedication.tradeName,
          hasAllergyConflict: hasAllergy,
          conflictingAllergy: conflictAllergy,
          messageAr: 'تطابق معتمد - الدواء موصوف للمريض ومدرج في سجل eMAR النشط!',
          messageEn: 'MATCH CONFIRMED · Prescribed in Active Patient eMAR Orders!'
        };
      } else {
        status = 'mismatch';
        medValidation = {
          isMatch: false,
          scannedDrugName: parsed.drugName || parsed.raw,
          hasAllergyConflict: hasAllergy,
          conflictingAllergy: conflictAllergy,
          messageAr: 'عدم تطابق دوائي! الدواء غير موصوف لهذا المريض أو تم إيقافه في سجل eMAR!',
          messageEn: 'MISMATCH ALERT! Medication is NOT prescribed or discontinued in eMAR!'
        };
      }
    }

    // Audio & Haptic feedback based on match/mismatch
    if (audioEnabled) {
      if (status === 'mismatch' || (medValidation && !medValidation.isMatch)) {
        playScannerAudioBeep('warning');
      } else {
        playScannerAudioBeep('success');
      }
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (status === 'mismatch') {
          navigator.vibrate([100, 50, 100, 50, 200]);
        } else {
          navigator.vibrate([40, 50, 40]);
        }
      } catch {
        // ignore
      }
    }

    const record: ScanHistoryRecord = {
      id: `scan-${now}-${Math.random().toString(36).substring(2, 6)}`,
      scan: parsed,
      matchedPatient,
      matchedAdmission,
      matchedMedication,
      matchedLabOrder,
      medicationValidation: medValidation,
      status,
      timestamp: new Date().toLocaleTimeString(),
      syncedToServer: isOnline
    };

    setLastScanRecord(record);
    setScanHistory(prev => [record, ...prev.slice(0, 29)]);

    // If offline or network unreachable, buffer to pending sync queue
    if (!isOnline) {
      setPendingSyncQueue(prev => {
        const next = [record, ...prev];
        try {
          localStorage.setItem(PENDING_SYNC_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }

    onItemVerified?.(parsed);
  }, [allPatients, allAdmissions, labOrders, medications, activePatient, audioEnabled, isOnline, onItemVerified]);

  // Video Frame Scanner Loop
  useEffect(() => {
    if (!isCameraActive) return;

    let isActive = true;

    const scanFrame = async () => {
      if (!isActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          let detectedRaw: string | null = null;
          let detectedFormat: string = 'qr_code';

          // 1. Try Hardware-Accelerated BarcodeDetector if available in browser
          if ('BarcodeDetector' in window) {
            try {
              const detector = new (window as any).BarcodeDetector({
                formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix']
              });
              const barcodes = await detector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedRaw = barcodes[0].rawValue;
                detectedFormat = barcodes[0].format || 'code_128';
              }
            } catch {
              // BarcodeDetector not supported or failed on frame, continue to jsQR
            }
          }

          // 2. Robust JSQR Engine Fallback / Parallel check
          if (!detectedRaw) {
            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth'
              });
              if (qrCode && qrCode.data) {
                detectedRaw = qrCode.data;
                detectedFormat = 'qr_code';
              }
            } catch {
              // ignore frame read error
            }
          }

          if (detectedRaw) {
            processDetectedRaw(detectedRaw, detectedFormat);
          }
        }
      }

      // Schedule next frame
      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isActive = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isCameraActive, processDetectedRaw]);

  // Auto-start camera when in PiP or Expanded mode, stop when minimized
  useEffect(() => {
    if (mode === 'minimized') {
      stopCamera();
    } else if (!isCameraActive && !isStartingCamera && !cameraError) {
      startCamera();
    }
  }, [mode, isCameraActive, isStartingCamera, cameraError, startCamera, stopCamera]);

  // Re-start camera when camera facing mode changes
  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }
  }, [cameraFacing, startCamera, isCameraActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Quick simulated scan presets for testing
  const handleSimulateScan = (code: string) => {
    processDetectedRaw(code, code.startsWith('{') ? 'qr_code' : 'code_128');
  };

  // Switch hospital-wide patient context
  const handleApplyMatchedPatient = (patient: Patient, adm?: Admission) => {
    onSelectPatient(patient, adm);
  };

  // Copy raw payload
  const handleCopyRaw = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 1. MINIMIZED FLOATING PILL
  if (mode === 'minimized' && !dockedInPage) {
    return (
      <div className="fixed bottom-6 rtl:left-6 ltr:right-6 z-40 no-print select-none animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={() => setMode('pip')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-2xl transition-all transform hover:scale-105 cursor-pointer group ${
            highContrastMode
              ? 'bg-black text-lime-400 border-2 border-lime-400'
              : 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-teal-600 hover:from-indigo-800 hover:to-teal-700 text-white border border-indigo-400/50'
          }`}
          title={isAr ? 'فتح ماسح الباركود وQR المباشر بالكاميرا' : 'Open Live Camera QR & Barcode Scanner'}
        >
          <div className="relative flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-xs font-bold tracking-tight">
            {isAr ? 'ماسح الكاميرا السريري' : 'Live Camera Scanner'}
          </span>
          {pendingSyncQueue.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500 text-black font-black flex items-center gap-1">
              <CloudOff className="w-2.5 h-2.5" />
              <span>{pendingSyncQueue.length}</span>
            </span>
          )}
          <Maximize2 className="w-3.5 h-3.5 text-indigo-200 group-hover:text-white" />
        </button>
      </div>
    );
  }

  // 2. DOCKED IN PAGE OR FLOATING PIP OR EXPANDED HUD
  const isExpanded = mode === 'expanded' || dockedInPage;

  return (
    <>
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Container */}
      <div className={
        dockedInPage
          ? `w-full rounded-2xl shadow-xl overflow-hidden border ${
              highContrastMode ? 'bg-black text-white border-lime-400' : 'bg-slate-900 text-white border-slate-800'
            }`
          : isExpanded
          ? "fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 no-print animate-in fade-in duration-200"
          : `fixed bottom-6 rtl:left-6 ltr:right-6 z-40 w-88 sm:w-96 rounded-2xl shadow-2xl overflow-hidden no-print animate-in fade-in zoom-in-95 duration-200 border-2 ${
              highContrastMode ? 'bg-black text-white border-lime-400' : 'bg-slate-900 text-white border-indigo-500/50'
            }`
      }>
        <div className={isExpanded && !dockedInPage ? `${highContrastMode ? 'bg-black border-2 border-lime-400' : 'bg-slate-900 border border-slate-800'} rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden` : "flex flex-col h-full"}>
          
          {/* SCANNER HEADER BAR */}
          <div className={`${highContrastMode ? 'bg-black border-b-2 border-lime-400/80 text-lime-400' : 'bg-slate-950 border-b border-slate-800 text-slate-200'} px-4 py-3 flex items-center justify-between gap-3 text-xs select-none`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                highContrastMode ? 'bg-lime-950 border border-lime-400 text-lime-400 font-black' : 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-400'
              }`}>
                <Scan className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold flex items-center gap-1.5">
                  <span className={highContrastMode ? 'text-lime-300 font-black' : 'text-white'}>
                    {isAr ? 'المسح الضوئي وتدقيق eMAR المباشر' : 'Live Camera & eMAR Scanner'}
                  </span>
                  {isCameraActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Camera Active" />
                  )}
                  {highContrastMode && (
                    <span className="px-1.5 py-0.2 rounded bg-lime-400 text-black font-black text-[9px] uppercase">
                      HIGH-CONTRAST
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                  <span>
                    {isCameraActive 
                      ? (cameraFacing === 'environment' ? 'Rear Camera (HD)' : 'Front Camera') 
                      : (isStartingCamera ? (isAr ? 'جاري الاتصال بالكاميرا...' : 'Connecting...') : (isAr ? 'الكاميرا متوقفة' : 'Camera inactive'))}
                  </span>
                  <span>·</span>
                  <span className={isOnline ? 'text-emerald-400' : 'text-amber-400 font-bold'}>
                    {isOnline ? (isAr ? 'متصل بالسيرفر' : 'Online') : (isAr ? 'وضع عدم الاتصال' : 'Offline Buffer')}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1.5">
              
              {/* High-Contrast Mode Toggle Button */}
              <button
                type="button"
                onClick={toggleHighContrast}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  highContrastMode 
                    ? 'bg-lime-400 text-black border-lime-300 font-black' 
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
                title={isAr ? 'تبديل وضع التباين العالي للورديات الليلية' : 'Toggle High-Contrast night mode'}
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              {/* Audio toggle */}
              <button
                type="button"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  audioEnabled ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title={audioEnabled ? (isAr ? 'كتم صوت الصافرة' : 'Mute beep') : (isAr ? 'تفعيل صوت الصافرة' : 'Enable beep')}
              >
                {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Torch toggle */}
              {hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isTorchOn ? 'bg-amber-500/30 border-amber-400 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                  title={isTorchOn ? (isAr ? 'إطفاء الفلاش' : 'Turn off torch') : (isAr ? 'تشغيل الفلاش' : 'Turn on torch')}
                >
                  <Zap className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Switch Camera facing */}
              <button
                type="button"
                onClick={handleSwitchCameraFacing}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
                title={isAr ? 'تبديل الكاميرا (أمامية / خلفية)' : 'Switch camera (rear / front)'}
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* Pending Sync Offline Queue Button */}
              {pendingSyncQueue.length > 0 && (
                <button
                  type="button"
                  onClick={pushPendingSyncQueue}
                  disabled={isSyncing}
                  className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] flex items-center gap-1 transition-all cursor-pointer animate-pulse"
                  title={isAr ? `يوجد ${pendingSyncQueue.length} عمليات مسح مخزنة محلياً. انقر للمزامنة مع السيرفر` : `${pendingSyncQueue.length} pending scans cached. Click to sync with server`}
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{pendingSyncQueue.length}</span>
                </button>
              )}

              {/* Scan History Drawer toggle */}
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                className={`p-1.5 rounded-lg border transition-colors relative cursor-pointer ${
                  showHistoryDrawer ? 'bg-teal-600/30 border-teal-500 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
                title={isAr ? 'سجل عمليات المسح' : 'Scan history log'}
              >
                <History className="w-3.5 h-3.5" />
                {scanHistory.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-teal-500 text-slate-950 font-bold rounded-full text-[9px] flex items-center justify-center font-mono">
                    {scanHistory.length}
                  </span>
                )}
              </button>

              {/* Window sizing controls (if floating) */}
              {!dockedInPage && (
                <>
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'pip' ? 'expanded' : 'pip')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title={mode === 'pip' ? (isAr ? 'تكبير ملء الشاشة' : 'Expand full screen') : (isAr ? 'تصغير إلى نافذة عائمة' : 'Minimize to PiP')}
                  >
                    {mode === 'pip' ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('minimized')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={isAr ? 'تصغير' : 'Minimize to pill'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sync Success Notification Toast */}
          {syncFeedback && (
            <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{syncFeedback}</span>
              </div>
              <button onClick={() => setSyncFeedback(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* SCANNER BODY */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* CAMERA VIEWFINDER VIEWPORT */}
            <div className={`relative bg-black rounded-2xl overflow-hidden flex items-center justify-center ${
              highContrastMode ? 'border-2 border-lime-400' : 'border border-slate-800'
            } ${
              isExpanded ? 'h-64 sm:h-84' : 'h-48'
            }`}>
              
              {/* HTML5 Video Element */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''} ${
                  isCameraActive ? 'opacity-100' : 'opacity-0'
                } transition-opacity duration-300`}
              />

              {/* REAL-TIME MATCH / MISMATCH IN-VIEWPORT OVERLAY */}
              {lastScanRecord?.medicationValidation && (
                <div className={`absolute top-3 inset-x-3 z-20 p-2.5 rounded-xl border backdrop-blur-md shadow-2xl animate-in zoom-in-95 duration-200 ${
                  lastScanRecord.medicationValidation.isMatch
                    ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100'
                    : 'bg-rose-950/95 border-rose-500 text-rose-100 animate-pulse'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {lastScanRecord.medicationValidation.isMatch ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
                      )}
                      <div>
                        <div className="font-black uppercase tracking-wider text-xs">
                          {lastScanRecord.medicationValidation.isMatch 
                            ? (isAr ? '✓ تطابق معتمد مع أمر الدواء بالـ eMAR' : '✓ MATCH CONFIRMED · ACTIVE EMAR ORDER')
                            : (isAr ? '⚠️ خطأ عدم تطابق دوائي! الدواء غير موصوف!' : '⚠️ MISMATCH ALERT · NOT PRESCRIBED IN eMAR')}
                        </div>
                        <div className="text-[11px] font-mono text-white mt-0.5">
                          {lastScanRecord.medicationValidation.scannedDrugName}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                      lastScanRecord.medicationValidation.isMatch ? 'bg-emerald-500 text-black' : 'bg-rose-600 text-white'
                    }`}>
                      {lastScanRecord.medicationValidation.isMatch ? 'MATCH' : 'MISMATCH'}
                    </span>
                  </div>

                  {lastScanRecord.medicationValidation.hasAllergyConflict && (
                    <div className="mt-1.5 p-1.5 rounded bg-rose-900 border border-rose-400 text-white text-[11px] font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>{isAr ? 'تنبيه حساسية مريض حرجة:' : 'CRITICAL ALLERGY CONFLICT:'} {lastScanRecord.medicationValidation.conflictingAllergy}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Visual Laser Line & Alignment Reticle (when active) */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  
                  {/* Sweep Laser Line */}
                  <div className={`absolute left-0 right-0 h-0.5 ${
                    highContrastMode 
                      ? 'bg-lime-400 shadow-[0_0_24px_#a3e635]' 
                      : recentFlash 
                      ? 'bg-emerald-400 shadow-[0_0_24px_#34d399]' 
                      : 'bg-red-500 shadow-[0_0_12px_#ef4444]'
                  } animate-pulse`} />

                  {/* 4 Corner Targeting Frame */}
                  <div className={`w-48 h-48 sm:w-60 sm:h-60 rounded-2xl relative border-2 ${
                    highContrastMode ? 'border-lime-400/60' : 'border-white/20'
                  }`}>
                    {/* Top-Left */}
                    <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-lg ${
                      highContrastMode ? 'border-lime-400' : 'border-teal-400'
                    }`} />
                    {/* Top-Right */}
                    <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-lg ${
                      highContrastMode ? 'border-lime-400' : 'border-teal-400'
                    }`} />
                    {/* Bottom-Left */}
                    <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-lg ${
                      highContrastMode ? 'border-lime-400' : 'border-teal-400'
                    }`} />
                    {/* Bottom-Right */}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-lg ${
                      highContrastMode ? 'border-lime-400' : 'border-teal-400'
                    }`} />

                    {/* Center Crosshair */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`w-3 h-3 rounded-full border ${highContrastMode ? 'border-lime-400' : 'border-white/40'}`} />
                    </div>
                  </div>

                  {/* Telemetry Footer Pill */}
                  <div className="absolute bottom-3 inset-x-0 flex justify-center">
                    <span className="bg-black/75 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] font-mono text-slate-300 border border-white/10 flex items-center gap-1.5">
                      <Zap className={`w-3 h-3 ${highContrastMode ? 'text-lime-400' : 'text-teal-400'} animate-pulse`} />
                      <span>{isAr ? 'وجه الكاميرا نحو الباركود أو الـ QR للتحقق السريري' : 'Align wristband, specimen tube, or eMAR dose'}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Camera Starting / Loading State */}
              {isStartingCamera && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs text-white p-4 text-center">
                  <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <span className="text-xs font-semibold">{isAr ? 'جاري بدء تشغيل عدسة الكاميرا...' : 'Initializing optical camera stream...'}</span>
                </div>
              )}

              {/* Camera Inactive / Denied State */}
              {!isCameraActive && !isStartingCamera && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      {cameraError ? (isAr ? 'تعذر تشغيل الكاميرا' : 'Camera Unavailable') : (isAr ? 'الكاميرا متوقفة' : 'Camera Inactive')}
                    </h4>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      {cameraError || (isAr ? 'انقر على زر البدء لتشغيل المسح عبر كاميرا الجهاز أو الماسح الضوئي' : 'Click activate to start live optical scanning on this workstation')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isAr ? 'تشغيل الكاميرا الآن' : 'Start Camera Now'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* RAPID MANUAL BARCODE / TEST INPUT ROW */}
            <div className="flex items-center gap-2 text-xs">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualInput.trim()) {
                      processDetectedRaw(manualInput.trim());
                      setManualInput('');
                    }
                  }}
                  placeholder={isAr ? 'اكتب كود الباركود / امسح بمسدس الليزر (مثال: MRN-2026-0812)...' : 'Manual barcode or USB scanner input (e.g. MRN-2026-0812)...'}
                  className={`w-full rounded-xl rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono ${
                    highContrastMode 
                      ? 'bg-black border-2 border-lime-400 text-lime-300 focus:ring-1 focus:ring-lime-300' 
                      : 'bg-slate-800/90 border border-slate-700 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (manualInput.trim()) {
                    processDetectedRaw(manualInput.trim());
                    setManualInput('');
                  }
                }}
                disabled={!manualInput.trim()}
                className={`px-3.5 py-2 font-bold rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40 ${
                  highContrastMode 
                    ? 'bg-lime-400 hover:bg-lime-300 text-black font-black' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isAr ? 'تحقق' : 'Verify'}
              </button>
            </div>

            {/* QUICK TEST BARCODES (PRESCRIBED VS MISMATCH TESTERS) */}
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400">
              <span className="font-semibold">{isAr ? 'أكواد اختبار المطابقة:' : 'eMAR Test Sweeps:'}</span>
              
              {/* Active Prescribed Med Match (Success) */}
              <button
                type="button"
                onClick={() => handleSimulateScan(`MED-${activePatient?.mrn || 'MRN-2026-0812'}-CLAFORAN`)}
                className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-mono border border-emerald-600 transition-colors cursor-pointer"
                title="Prescribed Active Medication (Claforan 1g)"
              >
                ✓ Match: Claforan 1g
              </button>

              {/* Unprescribed Med Mismatch (Failure) */}
              <button
                type="button"
                onClick={() => handleSimulateScan(`MED-${activePatient?.mrn || 'MRN-2026-0812'}-MORPHINE-10MG`)}
                className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-mono border border-rose-600 transition-colors cursor-pointer"
                title="Unprescribed Medication Mismatch (Morphine)"
              >
                ⚠️ Mismatch: Morphine
              </button>

              {/* Patient Wristband */}
              <button
                type="button"
                onClick={() => handleSimulateScan(activePatient?.mrn || 'MRN-2026-0812')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 font-mono border border-slate-700 transition-colors cursor-pointer"
              >
                {activePatient?.mrn || 'MRN'}
              </button>
            </div>

            {/* DETAILED VERIFICATION FEEDBACK CARD */}
            {lastScanRecord && (
              <div className={`p-4 rounded-2xl border transition-all animate-in fade-in zoom-in-95 duration-150 ${
                lastScanRecord.status === 'verified'
                  ? highContrastMode
                    ? 'bg-black border-2 border-lime-400 text-white'
                    : 'bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500/60 text-emerald-100'
                  : highContrastMode
                  ? 'bg-black border-2 border-red-500 text-white'
                  : 'bg-gradient-to-br from-rose-950/70 to-slate-900 border-rose-500/70 text-rose-100'
              }`}>
                {/* Header Badge */}
                <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      lastScanRecord.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {lastScanRecord.status === 'verified' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                    </span>
                    <div>
                      <strong className={`uppercase font-black text-xs tracking-wider ${
                        lastScanRecord.status === 'verified' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {lastScanRecord.scan.type === 'medication' && (
                          lastScanRecord.status === 'verified'
                            ? (isAr ? 'تطابق دوائي معتمد · 5-RIGHTS VALIDATED' : 'MEDICATION MATCH · 5-RIGHTS VALIDATED')
                            : (isAr ? 'تحذير عدم تطابق دوائي · MISMATCH' : 'MEDICATION MISMATCH ALERT')
                        )}
                        {lastScanRecord.scan.type === 'patient' && (isAr ? 'تم التحقق من هوية المريض' : 'PATIENT IDENTIFIED')}
                        {lastScanRecord.scan.type === 'specimen' && (isAr ? 'تم التحقق من عينة المختبر' : 'SPECIMEN TUBE VERIFIED')}
                        {lastScanRecord.scan.type === 'unknown' && (isAr ? 'رمز باركود غير مقترن' : 'UNMAPPED BARCODE')}
                      </strong>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {lastScanRecord.scan.format?.toUpperCase()} · {lastScanRecord.timestamp}
                        {!lastScanRecord.syncedToServer && (
                          <span className="ms-2 text-amber-400 font-bold">({isAr ? 'مخزن محلياً' : 'Offline Cached'})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyRaw(lastScanRecord.scan.raw)}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
                      title={isAr ? 'نسخ محتوى الكود' : 'Copy raw content'}
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Content Details */}
                <div className="pt-3 space-y-3">
                  
                  {/* MEDICATION 5-RIGHTS VERIFICATION DISPLAY */}
                  {lastScanRecord.scan.type === 'medication' && (
                    <div className="space-y-2.5">
                      {lastScanRecord.medicationValidation?.isMatch && lastScanRecord.matchedMedication ? (
                        <div className="space-y-2 bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-base font-black text-white">
                                {lastScanRecord.matchedMedication.tradeName}
                              </div>
                              <div className="text-xs text-emerald-300 font-semibold">
                                {lastScanRecord.matchedMedication.genericName} ({lastScanRecord.matchedMedication.strength})
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-emerald-500 text-black font-black text-[10px]">
                              ACTIVE ORDER
                            </span>
                          </div>

                          {/* 5-Rights Bedside Verification Checklist */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-200 pt-1 border-t border-emerald-500/20">
                            <div>✓ Right Patient: <strong className="text-white">{activePatient?.fullName || 'Patient'}</strong></div>
                            <div>✓ Right Dose: <strong className="text-white">{lastScanRecord.matchedMedication.dose}</strong></div>
                            <div>✓ Right Route: <strong className="text-white">{lastScanRecord.matchedMedication.route}</strong></div>
                            <div>✓ Frequency: <strong className="text-white">{lastScanRecord.matchedMedication.frequency}</strong></div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 bg-rose-950/50 p-3 rounded-xl border border-rose-500/40 text-xs">
                          <div className="flex items-center gap-2 text-rose-300 font-bold">
                            <ShieldAlert className="w-4 h-4 text-rose-400" />
                            <span>{isAr ? 'الدواء الممسوح غير مدرج في خطة علاج المريض الحالية!' : 'Scanned medication is NOT prescribed for this patient!'}</span>
                          </div>
                          <div className="text-[11px] text-slate-300 font-mono">
                            Scanned Payload: <strong className="text-rose-200">{lastScanRecord.scan.raw}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PATIENT MATCH CARD */}
                  {lastScanRecord.matchedPatient && (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-black text-white">
                            {lastScanRecord.matchedPatient.fullName}
                          </div>
                          <div className="flex items-center gap-2 font-mono text-xs text-teal-300 mt-0.5">
                            <span>MRN: <strong>{lastScanRecord.matchedPatient.mrn}</strong></span>
                            <span>·</span>
                            <span>{lastScanRecord.matchedPatient.gender === 'female' ? (isAr ? 'أنثى' : 'Female') : (isAr ? 'ذكر' : 'Male')}</span>
                            <span>·</span>
                            <span>DOB: {lastScanRecord.matchedPatient.dob}</span>
                          </div>
                        </div>

                        <div className="text-right font-mono shrink-0">
                          <span className="text-sm font-bold text-emerald-400 block">
                            {lastScanRecord.matchedAdmission ? `RM ${lastScanRecord.matchedAdmission.roomNumber}` : 'OPD'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {lastScanRecord.matchedAdmission?.bedId || 'INPATIENT'}
                          </span>
                        </div>
                      </div>

                      {/* Quick Action: Switch Active Patient */}
                      {activePatient?.mrn !== lastScanRecord.matchedPatient.mrn && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleApplyMatchedPatient(lastScanRecord.matchedPatient!, lastScanRecord.matchedAdmission)}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg"
                          >
                            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                            <span>{isAr ? 'تعيين هذا المريض كملف نشط بالمستشفى والمركز' : 'Switch Hospital EMR & Hub to This Patient'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCAN HISTORY DRAWER (WHEN TOGGLED) */}
            {showHistoryDrawer && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2.5 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between font-bold text-slate-300 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-teal-400" />
                    <span>{isAr ? 'سجل عمليات المسح بالجلسة الحالية' : 'Session Scan History'} ({scanHistory.length})</span>
                  </span>
                  {scanHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScanHistory([])}
                      className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      {isAr ? 'مسح السجل' : 'Clear'}
                    </button>
                  )}
                </div>

                {scanHistory.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-xs">
                    {isAr ? 'لم يتم مسح أي أكواد حتى الآن في هذه الجلسة' : 'No items scanned in this session yet.'}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {scanHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                      >
                        <div className="min-w-0">
                          <strong className="text-white text-[11px] block truncate">
                            {item.matchedPatient?.fullName || item.scan.drugName || item.scan.testName || item.scan.raw}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.scan.type.toUpperCase()} · {item.timestamp}
                          </span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                          item.status === 'verified' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {item.status === 'verified' ? '✓ MATCH' : '⚠️ MISMATCH'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
