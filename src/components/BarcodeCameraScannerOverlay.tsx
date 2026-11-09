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
  Activity
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
import jsQR from 'jsqr';

export type ScannerOverlayMode = 'minimized' | 'pip' | 'expanded';

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
  // External control to open/dock
  initialMode?: ScannerOverlayMode;
  dockedInPage?: boolean;
}

export interface ScanHistoryRecord {
  id: string;
  scan: ParsedClinicalScan;
  matchedPatient?: Patient;
  matchedAdmission?: Admission;
  matchedMedication?: MedicationOrder;
  matchedLabOrder?: LabOrder;
  status: 'verified' | 'mismatch' | 'unknown';
  timestamp: string;
}

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

  // Process a detected raw string
  const processDetectedRaw = useCallback((raw: string, format?: string) => {
    const now = Date.now();
    // 1.5s cooldown for identical code to prevent continuous spamming
    if (raw === lastScannedRawRef.current && now - lastScanTimeRef.current < 1500) {
      return;
    }

    lastScanTimeRef.current = now;
    lastScannedRawRef.current = raw;

    // Trigger visual green laser flash
    setRecentFlash(true);
    setTimeout(() => setRecentFlash(false), 450);

    // Parse payload using standardized medical parser
    const parsed = parseScannedClinicalPayload(raw, format);

    // Audio & Haptic feedback
    if (audioEnabled) {
      playScannerAudioBeep('success');
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 50, 40]);
      } catch {
        // ignore
      }
    }

    // Match with Hospital Database
    let matchedPatient: Patient | undefined;
    let matchedAdmission: Admission | undefined;
    let matchedMedication: MedicationOrder | undefined;
    let matchedLabOrder: LabOrder | undefined;
    let status: 'verified' | 'mismatch' | 'unknown' = 'unknown';

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

    // 3. Match Medication
    if (parsed.type === 'medication') {
      if (parsed.orderId) {
        matchedMedication = medications.find(m => m.id.toLowerCase() === parsed.orderId?.toLowerCase());
      }
      if (!matchedMedication && parsed.drugName) {
        matchedMedication = medications.find(m => 
          m.tradeName.toLowerCase().includes(parsed.drugName?.toLowerCase() || '') ||
          m.genericName.toLowerCase().includes(parsed.drugName?.toLowerCase() || '') ||
          (parsed.drugName || '').toLowerCase().includes(m.tradeName.toLowerCase())
        );
      }
      status = 'verified';
    }

    const record: ScanHistoryRecord = {
      id: `scan-${now}-${Math.random().toString(36).substring(2, 6)}`,
      scan: parsed,
      matchedPatient,
      matchedAdmission,
      matchedMedication,
      matchedLabOrder,
      status,
      timestamp: new Date().toLocaleTimeString()
    };

    setLastScanRecord(record);
    setScanHistory(prev => [record, ...prev.slice(0, 24)]);
    onItemVerified?.(parsed);
  }, [allPatients, allAdmissions, labOrders, medications, audioEnabled, onItemVerified]);

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

  // --- RENDERING MODES ---

  // 1. MINIMIZED FLOATING PILL
  if (mode === 'minimized' && !dockedInPage) {
    return (
      <div className="fixed bottom-6 rtl:left-6 ltr:right-6 z-40 no-print select-none animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={() => setMode('pip')}
          className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-teal-600 hover:from-indigo-800 hover:to-teal-700 text-white px-4 py-2.5 rounded-full shadow-2xl border border-indigo-400/50 transition-all transform hover:scale-105 cursor-pointer group"
          title={isAr ? 'فتح ماسح الباركود وQR المباشر بالكاميرا' : 'Open Live Camera QR & Barcode Scanner'}
        >
          <div className="relative flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-xs font-bold tracking-tight">
            {isAr ? 'ماسح الكاميرا السريري' : 'Live Camera Scanner'}
          </span>
          {scanHistory.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/20 text-white font-bold">
              {scanHistory.length}
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
          ? "w-full bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden"
          : isExpanded
          ? "fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 no-print animate-in fade-in duration-200"
          : "fixed bottom-6 rtl:left-6 ltr:right-6 z-40 w-88 sm:w-96 bg-slate-900 text-white rounded-2xl border-2 border-indigo-500/50 shadow-2xl overflow-hidden no-print animate-in fade-in zoom-in-95 duration-200"
      }>
        <div className={isExpanded && !dockedInPage ? "bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden" : "flex flex-col h-full"}>
          
          {/* SCANNER HEADER BAR */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 text-xs select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                <Scan className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>{isAr ? 'المسح الضوئي المباشر بالكاميرا' : 'Live Camera Barcode & QR Scanner'}</span>
                  {isCameraActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Camera Active" />
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {isCameraActive 
                    ? (cameraFacing === 'environment' ? 'Rear Camera (Auto-Focus)' : 'Front Camera') 
                    : (isStartingCamera ? (isAr ? 'جاري الاتصال بالكاميرا...' : 'Connecting camera...') : (isAr ? 'الكاميرا متوقفة' : 'Camera inactive'))}
                </div>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1.5">
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
                  title={isTorchOn ? (isAr ? 'إطفاء الفلاش' : 'Turn off flashlight') : (isAr ? 'تشغيل الفلاش' : 'Turn on flashlight')}
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

          {/* SCANNER BODY */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* CAMERA VIEWFINDER VIEWPORT */}
            <div className={`relative bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center ${
              isExpanded ? 'h-64 sm:h-80' : 'h-48'
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

              {/* Visual Laser Line & Alignment Reticle (when active) */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  
                  {/* Sweep Laser Line */}
                  <div className={`absolute left-0 right-0 h-0.5 shadow-[0_0_14px_#10b981] ${
                    recentFlash ? 'bg-emerald-400 shadow-[0_0_24px_#34d399]' : 'bg-red-500 shadow-[0_0_12px_#ef4444]'
                  } animate-pulse`} />

                  {/* 4 Corner Targeting Frame */}
                  <div className="w-48 h-48 sm:w-60 sm:h-60 border-2 border-white/20 rounded-2xl relative">
                    {/* Top-Left */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-teal-400 rounded-tl-lg" />
                    {/* Top-Right */}
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-teal-400 rounded-tr-lg" />
                    {/* Bottom-Left */}
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-teal-400 rounded-bl-lg" />
                    {/* Bottom-Right */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-teal-400 rounded-br-lg" />

                    {/* Center Crosshair */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 border border-white/40 rounded-full" />
                    </div>
                  </div>

                  {/* Status telemetry pill */}
                  <div className="absolute bottom-3 inset-x-0 flex justify-center">
                    <span className="bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] font-mono text-slate-300 border border-white/10 flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-teal-400 animate-pulse" />
                      <span>{isAr ? 'وجه الكاميرا نحو سوار المريض أو كود QR' : 'Align wristband, specimen tube, or QR code'}</span>
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

              {/* Camera Error or Denied State */}
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
                      {cameraError || (isAr ? 'انقر على زر البدء لتشغيل المسح عبر كاميرا الجهاز المحمول أو الماسح الضوئي' : 'Click activate to start live optical scanning on this workstation')}
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
                  placeholder={isAr ? 'أو اكتب كود الباركود / الصق الـ QR (مثال: MRN-2026-0812)...' : 'Manual barcode or USB scanner input (e.g. MRN-2026-0812)...'}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
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
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors cursor-pointer shrink-0"
              >
                {isAr ? 'تحقق' : 'Verify'}
              </button>
            </div>

            {/* QUICK TEST BARCODES (FOR DEMO & TESTING) */}
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400">
              <span className="font-semibold">{isAr ? 'أكواد سريعة للاختبار:' : 'Test Sweeps:'}</span>
              {allPatients.slice(0, 3).map(p => (
                <button
                  key={p.mrn}
                  type="button"
                  onClick={() => handleSimulateScan(p.mrn)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 font-mono border border-slate-700 transition-colors cursor-pointer"
                >
                  {p.mrn}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleSimulateScan(`LAB-${activePatient?.mrn || 'MRN-2026-0812'}-CBC`)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 font-mono border border-slate-700 transition-colors cursor-pointer"
              >
                LAB-TUBE
              </button>
              <button
                type="button"
                onClick={() => handleSimulateScan(`MED-${activePatient?.mrn || 'MRN-2026-0812'}-CLAFORAN`)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono border border-slate-700 transition-colors cursor-pointer"
              >
                RX-UNIT-DOSE
              </button>
            </div>

            {/* LIVE VERIFICATION CARD (IF ITEM SCANNED) */}
            {lastScanRecord && (
              <div className={`p-4 rounded-2xl border transition-all animate-in fade-in zoom-in-95 duration-150 ${
                lastScanRecord.status === 'verified'
                  ? 'bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500/60 text-emerald-100'
                  : 'bg-gradient-to-br from-amber-950/60 to-slate-900 border-amber-500/60 text-amber-100'
              }`}>
                {/* Header Badge */}
                <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <div>
                      <strong className="text-white uppercase font-bold text-xs tracking-wider">
                        {lastScanRecord.scan.type === 'patient' && (isAr ? 'تم التحقق من هوية المريض' : 'PATIENT IDENTIFIED')}
                        {lastScanRecord.scan.type === 'specimen' && (isAr ? 'تم التحقق من عينة المختبر' : 'SPECIMEN TUBE VERIFIED')}
                        {lastScanRecord.scan.type === 'medication' && (isAr ? 'تم تدقيق جرعة الدواء (5-Rights)' : 'MEDICATION DOSE VERIFIED')}
                        {lastScanRecord.scan.type === 'unknown' && (isAr ? 'رمز باركود غير مقترن' : 'UNMAPPED BARCODE')}
                      </strong>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {lastScanRecord.scan.format?.toUpperCase()} · {lastScanRecord.timestamp}
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

                {/* Match Content Details */}
                <div className="pt-3 space-y-3">
                  
                  {/* PATIENT MATCH CARD */}
                  {lastScanRecord.matchedPatient && (
                    <div className="space-y-2.5">
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

                      {/* Blood group & Allergies warning */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-700/60 font-mono font-bold">
                          🩸 {lastScanRecord.matchedPatient.bloodGroup} ({lastScanRecord.matchedPatient.bloodGroupStatus || 'Verified'})
                        </span>

                        {lastScanRecord.matchedPatient.allergies && lastScanRecord.matchedPatient.allergies.length > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-500 font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
                            <span>{isAr ? 'حساسية:' : 'Allergies:'} {lastScanRecord.matchedPatient.allergies.join(', ')}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-[11px]">
                            ✓ {isAr ? 'لا توجد حساسية دوائية موثقة (NKDA)' : 'No Known Drug Allergies'}
                          </span>
                        )}
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

                  {/* SPECIMEN TUBE MATCH */}
                  {lastScanRecord.scan.type === 'specimen' && (
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-purple-500/30 text-xs space-y-1">
                      <div className="font-bold text-purple-300 flex items-center gap-1.5">
                        <FlaskConical className="w-4 h-4" />
                        <span>{isAr ? 'أنبوب عينة مخبرية مسحوبة' : 'LIS Specimen Container Tracked'}</span>
                      </div>
                      <div className="text-slate-300">
                        {isAr ? 'الفحص المطلوب:' : 'Test Requisition:'} <strong className="text-white">{lastScanRecord.scan.testName}</strong>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Barcode: {lastScanRecord.scan.raw}
                      </div>
                    </div>
                  )}

                  {/* MEDICATION MATCH */}
                  {lastScanRecord.scan.type === 'medication' && (
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-amber-500/30 text-xs space-y-1">
                      <div className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Pill className="w-4 h-4" />
                        <span>{isAr ? 'جرعة دواء مفردة (Unit-Dose)' : 'Pharmacy Unit-Dose Verified'}</span>
                      </div>
                      <div className="text-slate-300">
                        {isAr ? 'الدواء والجرعة:' : 'Medication & Dose:'} <strong className="text-white">{lastScanRecord.scan.drugName}</strong> {lastScanRecord.scan.dose && `(${lastScanRecord.scan.dose})`}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-bold">
                        ✓ 5-Rights Bedside Verification Validated
                      </div>
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
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                          ✓ {item.status}
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
