import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Square, 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  FileText, 
  Loader2, 
  Volume2, 
  Globe, 
  Stethoscope, 
  Baby, 
  Scissors, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown, 
  HelpCircle,
  Clock,
  Layers,
  Send
} from 'lucide-react';
import { Patient, Admission, SystemUser, Language } from '../types/hmis.ts';
import { api } from '../api/client.ts';

interface GlobalVoiceDictationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  currentUser: SystemUser;
  language: Language;
  onInsertTextIntoAssessment?: (text: string) => void;
  onInsertSoapIntoAssessment?: (soap: { subjective: string; objective: string; assessment: string; plan: string }) => void;
}

export const GlobalVoiceDictationModal: React.FC<GlobalVoiceDictationModalProps> = ({
  isOpen,
  onClose,
  currentPatient,
  currentAdmission,
  currentUser,
  language,
  onInsertTextIntoAssessment,
  onInsertSoapIntoAssessment
}) => {
  if (!isOpen) return null;
  const isAr = language === 'ar';

  // Dictation States
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [speechLang, setSpeechLang] = useState<'ar-SA' | 'en-US'>('ar-SA');
  const [dictatedText, setDictatedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPunctuationHelp, setShowPunctuationHelp] = useState(false);

  // Audio Recording States
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<any>(null);

  // AI Processing States
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [structuredSoap, setStructuredSoap] = useState<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  } | null>(null);
  const [aiSummary, setAiSummary] = useState('');

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }

        setInterimText(interimTrans);

        if (finalTrans) {
          // Format vocal punctuation
          const formatted = finalTrans
            .replace(/\s*(فاصلة|فاصله|comma)\s*/gi, '، ')
            .replace(/\s*(نقطة|نقطه|period|full stop)\s*/gi, '. ')
            .replace(/\s*(علامة استفهام|علامه استفهام|question mark)\s*/gi, '؟ ')
            .replace(/\s*(سطر جديد|new line)\s*/gi, '\n')
            .replace(/\s*(فقرة جديدة|فقره جديده|new paragraph)\s*/gi, '\n\n')
            .replace(/\s*(نقطتين|نقطتان|colon)\s*/gi, ': ')
            .replace(/\s*(شرطة|شرطه|dash)\s*/gi, ' - ');

          setDictatedText((prev) => {
            const separator = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
            return prev + separator + formatted;
          });
          setInterimText('');
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition init error:', err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [speechLang]);

  // Audio recording timer
  useEffect(() => {
    if (isRecordingAudio) {
      audioTimerRef.current = setInterval(() => {
        setAudioDuration((p) => p + 1);
      }, 1000);
    } else {
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    }
    return () => {
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    };
  }, [isRecordingAudio]);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = speechLang;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Failed to start speech recognition:', err);
      }
    }
  };

  // Direct Audio MediaRecorder
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setRecordedAudioUrl(reader.result as string);
        };
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mr;
      mr.start(200);
      setIsRecordingAudio(true);
      setAudioDuration(0);
      setRecordedAudioUrl(null);
    } catch (err) {
      alert(isAr ? 'تعذر الوصول إلى الميكروفون. يرجى مراجعة إذن المتصفح.' : 'Microphone access denied or unavailable.');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  // Transcribe recorded audio with Gemini 3.8 Flash
  const handleTranscribeRecordedAudio = async () => {
    if (!recordedAudioUrl) return;
    setIsAiProcessing(true);
    try {
      const res = await api.transcribeAudio({
        audioData: recordedAudioUrl,
        language: speechLang === 'ar-SA' ? 'ar' : 'en',
        context: {
          patientName: currentPatient?.fullName,
          mrn: currentPatient?.mrn
        }
      });
      if (res.transcript) {
        const sep = dictatedText && !dictatedText.endsWith('\n') ? '\n' : '';
        setDictatedText((prev) => prev + sep + res.transcript);
      }
      if (res.summary) {
        setAiSummary(res.summary);
      }
    } catch (err: any) {
      alert(err.message || 'Audio transcription failed');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Clinical Templates
  const handleApplyTemplate = (type: 'post_cs' | 'active_labor' | 'nursing_note' | 'discharge_clearance') => {
    let tpl = '';
    if (type === 'post_cs') {
      tpl = isAr
        ? `مرور اليوم الأول بعد الولادة القيصرية (Post-C/S Day 1):
- العلامات الحيوية: ضغط الدم مستقر، النبض منتظم، لا توجد حمى.
- فحص الجرح: شاش الجرح نظيف وجاف ولا يوجد نزيف أو علامات التهاب.
- فحص البطن والرحم: الرحم منقبض جيداً بمستوى السرة، أصوات الأمعاء مسموعة.
- النزف المهبلي: دم نفاسي معتدل وطبيعي (Lochia rubra).
- الخطة: البدء بالسوائل الفموية، إزالة القسطرة البولية وتشجيع الحركة التدريجية، والاستمرار على مسكنات الألم والمضاد الحيوي وفق جدول eMAR.`
        : `Post-C-Section Day 1 Ward Round:
- Vital signs: Hemodynamically stable, afebrile.
- Wound dressing: Dry and intact, no erythema or active oozing.
- Abdomen: Soft, uterine fundus well-contracted at umbilical level.
- Lochia: Moderate physiological rubra, no clots.
- Plan: Encourage early ambulation, remove Foley catheter, step up oral fluids, analgesia as per eMAR schedule.`;
    } else if (type === 'active_labor') {
      tpl = isAr
        ? `تقييم المخاض النشط (Active Labor Assessment):
- عمر الحمل: مكتمل (Term). نبض قلب الجنين: 140 نبضة/دقيقة وتخطيط CTG تفاعلي مطمئن.
- الفحص المهبلي: اتساع عنق الرحم 6 سم، إمحاء 80%، المجيء قمي (Cephalic Station 0).
- تقلصات الرحم: 3 تقلصات قوية كل 10 دقائق تدوم 45 ثانية.
- السائل السلوي: الأغشية سليمة (Intact membranes).
- الخطة: مراقبة النبض الجنيني المستمر بالـ CTG، تقديم الدعم المسكن (تخدير فوق الجافية Epidural)، ومتابعة مخطط الولادة Partogram.`
        : `Active Labor Assessment:
- Gestational age: Term. FHR: 140 bpm, reactive CTG.
- Cervical exam: 6 cm dilation, 80% effacement, cephalic presentation at station 0.
- Uterine contractions: 3 strong contractions per 10 mins.
- Amniotic membranes: Intact.
- Plan: Continuous CTG monitoring, epidural analgesia top-up, update partogram every 2 hours.`;
    } else if (type === 'nursing_note') {
      tpl = isAr
        ? `ملاحظة تمريضية إيوائية (Inpatient Nursing Note):
- تم قياس العلامات الحيوية: الضغط 120/80، النبض 76، الحرارة 37.0°C، الأكسجين 99%.
- تم إعطاء العلاجات المقررة في جدول eMAR في مواعيدها بدون تأخير.
- المريضة قادرة على الحركة والمشي الخفيف وتغذيتها مقبولة. لا توجد شكوى من غثيان أو ألم غير محتمل.`
        : `Nursing Ward Progress Note:
- Vitals checked: BP 120/80, HR 76, Temp 37.0°C, SpO2 99%.
- Scheduled eMAR medications administered on time.
- Patient ambulating comfortably, tolerating oral diet, pain controlled (VAS 2/10).`;
    } else {
      tpl = isAr
        ? `تعليمات وتوصيات الخروج (Discharge Clearance):
- خروج المريضة بحالة سريرية ممتازة ومستقرة بعد استكمال فترة الملاحظة المقررة.
- الاستمرار على الفيتامينات والحديد ومسكن الباراسيتامول عند اللزوم لمدة أسبوعين.
- الحفاظ على نظافة وجفاف الجرح، وتجنب حمل الأوزان الثقيلة.
- مراجعة العيادة الخارجية بعد 7 أيام للكشف الروتيني، أو التوجه فوراً للطوارئ في حال حدوث حمى أو نزف غزير.`
        : `Postpartum Discharge Instructions:
- Discharged in stable condition.
- Continue oral iron and analgesia as prescribed for 14 days.
- Keep wound clean and dry; avoid strenuous activities.
- Follow up in outpatient clinic in 7 days or immediate ER return if fever or excessive bleeding occurs.`;
    }

    setDictatedText((prev) => (prev ? prev + '\n\n' + tpl : tpl));
  };

  // AI Polish & Structuring
  const handleAiPolish = async () => {
    if (!dictatedText.trim()) return;
    setIsAiProcessing(true);
    try {
      const res = await api.aiClinicalAssist({
        task: 'voice_cleanup',
        text: dictatedText,
        patientContext: {
          patientName: currentPatient?.fullName,
          mrn: currentPatient?.mrn
        },
        targetLanguage: isAr ? 'ar' : 'en'
      });
      if (res.result) {
        setDictatedText(res.result);
      }
    } catch (err: any) {
      alert(err.message || 'AI Polish failed');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAiSoapStructure = async () => {
    if (!dictatedText.trim()) return;
    setIsAiProcessing(true);
    try {
      const res = await api.aiClinicalAssist({
        task: 'soap_structuring',
        text: dictatedText,
        patientContext: {
          patientName: currentPatient?.fullName,
          mrn: currentPatient?.mrn,
          department: currentAdmission?.department,
          diagnosis: currentAdmission?.packageName
        },
        targetLanguage: isAr ? 'ar' : 'en'
      });
      if (res.structuredSoap) {
        setStructuredSoap(res.structuredSoap);
      }
      if (res.result) {
        setAiSummary(res.result);
      }
    } catch (err: any) {
      alert(err.message || 'AI SOAP Structuring failed');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(dictatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertIntoAssessment = () => {
    if (structuredSoap && onInsertSoapIntoAssessment) {
      onInsertSoapIntoAssessment(structuredSoap);
      onClose();
      return;
    }

    if (onInsertTextIntoAssessment && dictatedText.trim()) {
      onInsertTextIntoAssessment(dictatedText);
      onClose();
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isListening || isRecordingAudio 
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse ring-2 ring-rose-400' 
                : 'bg-teal-500/20 border-teal-500 text-teal-300'
            }`}>
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'محطة الطباعة الصوتية والإملاء السريري الذكي' : 'Clinical Voice Dictation & AI Scribe'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/40">
                  GEMINI 3.8 FLASH
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAr 
                  ? 'إملاء صوتي فوري، اختصارات الترقيم اللفظي، قوالب النساء والتوليد، وهيكلة SOAP' 
                  : 'Live dictation, verbal punctuation, obstetric templates, and SOAP structuring'}
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

        {/* Patient Context Banner */}
        {currentPatient && (
          <div className="bg-teal-50/70 border-b border-teal-100 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-teal-950 flex items-center gap-1.5">
                <Baby className="w-4 h-4 text-teal-700" />
                <span>{currentPatient.fullName}</span>
              </span>
              <span className="font-mono text-teal-800 text-[11px]">
                MRN: {currentPatient.mrn}
              </span>
              {currentAdmission && (
                <span className="text-teal-700 font-medium">
                  {isAr ? `غرفة: ${currentAdmission.roomNumber}` : `Room: ${currentAdmission.roomNumber}`}
                </span>
              )}
            </div>
            <span className="text-[10px] text-teal-800 font-bold bg-teal-100 px-2 py-0.5 rounded">
              {currentAdmission?.packageName || 'Inpatient Stay'}
            </span>
          </div>
        )}

        {/* Studio Controls Row */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Dictation Trigger & Language Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-2 ring-rose-400'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
              >
                <Mic className={`w-4 h-4 ${isListening ? 'animate-bounce' : ''}`} />
                <span>
                  {isListening
                    ? (isAr ? 'جاري الاستماع... اضغط للإيقاف' : 'Listening... click to pause')
                    : (isAr ? 'بدء الإملاء الصوتي الحي' : 'Start Voice Dictation')}
                </span>
              </button>

              {/* Speech Language Switcher */}
              <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 text-xs font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setSpeechLang('ar-SA')}
                  className={`px-2 py-1 rounded transition-colors ${
                    speechLang === 'ar-SA' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  عربي AR
                </button>
                <button
                  type="button"
                  onClick={() => setSpeechLang('en-US')}
                  className={`px-2 py-1 rounded transition-colors ${
                    speechLang === 'en-US' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English EN
                </button>
              </div>

              {/* Audio Recording Button as alternative */}
              {!isRecordingAudio ? (
                <button
                  type="button"
                  onClick={startAudioRecording}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors"
                  title={isAr ? 'تسجيل ملف صوتي مباشر وتفريغه بـ Gemini' : 'Record audio clip & transcribe'}
                >
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAr ? 'تسجيل مقطع صوتي' : 'Record Audio Clip'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopAudioRecording}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs animate-pulse"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>{isAr ? `إيقاف التسجيل (${formatSeconds(audioDuration)})` : `Stop (${formatSeconds(audioDuration)})`}</span>
                </button>
              )}
            </div>

            {/* Vocal Punctuation Legend Toggle */}
            <button
              type="button"
              onClick={() => setShowPunctuationHelp(!showPunctuationHelp)}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{isAr ? 'أوامر الترقيم الصوتي' : 'Voice Commands'}</span>
            </button>
          </div>

          {/* Voice Wave Animation when active */}
          {(isListening || isRecordingAudio) && (
            <div className="h-8 bg-slate-900 rounded-lg flex items-center justify-center gap-1.5 px-4 overflow-hidden">
              <span className="text-[11px] font-mono text-teal-400 font-bold ml-2">
                {isListening ? (isAr ? 'الميكروفون يستمع بنشاط...' : 'Listening...') : (isAr ? 'جاري تسجيل الصوت...' : 'Recording Audio...')}
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-teal-400 rounded-full animate-pulse"
                    style={{
                      height: `${Math.max(20, Math.sin(i * 0.4) * 80 + 20)}%`,
                      animationDelay: `${(i % 4) * 0.15}s`
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recorded audio clip actions if present */}
          {recordedAudioUrl && !isRecordingAudio && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Volume2 className="w-4 h-4 text-indigo-700 shrink-0" />
                <audio controls src={recordedAudioUrl} className="h-7 w-full max-w-xs" />
              </div>
              <button
                type="button"
                onClick={handleTranscribeRecordedAudio}
                disabled={isAiProcessing}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isAiProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isAr ? 'تفريغ التسجيل الصوتي عبر Gemini 3.8 Flash' : 'Transcribe via Gemini 3.8'}</span>
              </button>
            </div>
          )}

          {/* Vocal Punctuation Legend Callout */}
          {showPunctuationHelp && (
            <div className="bg-white border border-indigo-200 rounded-xl p-3 text-[11px] text-slate-700 space-y-1.5 animate-in fade-in duration-100">
              <strong className="text-indigo-900 font-bold block">
                {isAr ? 'أوامر الترقيم اللفظي أثناء الإملاء الصوتي:' : 'Voice Punctuation Shortcuts:'}
              </strong>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                <div className="bg-slate-50 p-1.5 rounded font-mono">قول: <strong>"فاصلة"</strong> ➔ ( ، )</div>
                <div className="bg-slate-50 p-1.5 rounded font-mono">قول: <strong>"نقطة"</strong> ➔ ( . )</div>
                <div className="bg-slate-50 p-1.5 rounded font-mono">قول: <strong>"سطر جديد"</strong> ➔ سطر تالٍ</div>
                <div className="bg-slate-50 p-1.5 rounded font-mono">قول: <strong>"فقرة جديدة"</strong> ➔ سطرين</div>
              </div>
            </div>
          )}

          {/* Rapid Clinical Templates Row */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span>{isAr ? 'قوالب سريعة جاهزة:' : 'Quick Templates:'}</span>
            </span>

            <button
              type="button"
              onClick={() => handleApplyTemplate('post_cs')}
              className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-900 border border-teal-200 rounded-lg text-[11px] font-semibold transition-colors"
            >
              {isAr ? 'مرور يوم 1 قيصرية' : 'Post-C/S Round'}
            </button>

            <button
              type="button"
              onClick={() => handleApplyTemplate('active_labor')}
              className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-900 border border-teal-200 rounded-lg text-[11px] font-semibold transition-colors"
            >
              {isAr ? 'تقييم مخاض وولادة' : 'Active Labor'}
            </button>

            <button
              type="button"
              onClick={() => handleApplyTemplate('nursing_note')}
              className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-900 border border-teal-200 rounded-lg text-[11px] font-semibold transition-colors"
            >
              {isAr ? 'ملاحظة تمريضية' : 'Nursing Note'}
            </button>

            <button
              type="button"
              onClick={() => handleApplyTemplate('discharge_clearance')}
              className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-900 border border-teal-200 rounded-lg text-[11px] font-semibold transition-colors"
            >
              {isAr ? 'توصيات خروج' : 'Discharge Advice'}
            </button>
          </div>
        </div>

        {/* Text Area & Live Transcript */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          <div className="relative">
            <textarea
              rows={7}
              value={dictatedText}
              onChange={(e) => setDictatedText(e.target.value)}
              placeholder={
                isAr 
                  ? 'تحدث الآن بعد الضغط على (بدء الإملاء الصوتي الحي) أو اختر قالباً أعلاه وسيقوم النظام بتفريغ الكلمات الطبية وترتيبها...'
                  : 'Start dictating via microphone or pick a template above...'
              }
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 font-medium leading-relaxed focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {isListening && interimText && (
              <div className="absolute bottom-3 rtl:right-3 ltr:left-3 bg-slate-900/90 text-teal-300 px-3 py-1 rounded-lg text-xs font-mono animate-pulse shadow-md">
                "{interimText}"
              </div>
            )}
          </div>

          {/* AI Clinical Polish & Structuring Toolbar */}
          <div className="p-3 bg-gradient-to-r from-teal-50 via-slate-50 to-indigo-50 border border-teal-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-slate-900 text-xs">
                {isAr ? 'معالجة الذكاء الاصطناعي السريري (Gemini 3.8 Flash):' : 'AI Clinical Structuring:'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isAiProcessing || !dictatedText.trim()}
                onClick={handleAiPolish}
                className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isAiProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                <span>{isAr ? 'تنقيح وتصحيح طبي' : 'Clinical Polish'}</span>
              </button>

              <button
                type="button"
                disabled={isAiProcessing || !dictatedText.trim()}
                onClick={handleAiSoapStructure}
                className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{isAr ? '✨ تحويل لصيغة SOAP' : '✨ Structure as SOAP'}</span>
              </button>
            </div>
          </div>

          {/* Structured SOAP View if Generated */}
          {structuredSoap && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-2 text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAr ? 'التقرير السريري المهيكل بصيغة SOAP:' : 'Structured SOAP Record:'}</span>
                </span>
                <span className="text-[10px] text-indigo-700 font-mono font-bold">
                  READY FOR EMR INSERTION
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <strong className="text-indigo-900 block mb-0.5">S (Subjective) شكوى المريضة:</strong>
                  <p className="text-slate-700">{structuredSoap.subjective}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <strong className="text-indigo-900 block mb-0.5">O (Objective) الفحص والمؤشرات:</strong>
                  <p className="text-slate-700">{structuredSoap.objective}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <strong className="text-indigo-900 block mb-0.5">A (Assessment) التقييم والتشخيص:</strong>
                  <p className="text-slate-700">{structuredSoap.assessment}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <strong className="text-indigo-900 block mb-0.5">P (Plan) الخطة العلاجية:</strong>
                  <p className="text-slate-700">{structuredSoap.plan}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!dictatedText.trim()}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ النص' : 'Copy Text')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDictatedText('');
                setStructuredSoap(null);
                setRecordedAudioUrl(null);
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
              title={isAr ? 'مسح النص' : 'Clear'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>

            {(onInsertTextIntoAssessment || onInsertSoapIntoAssessment) && (
              <button
                type="button"
                onClick={handleInsertIntoAssessment}
                disabled={!dictatedText.trim()}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                <span>
                  {structuredSoap
                    ? (isAr ? 'إدراج تقرير SOAP بالملف السريري' : 'Insert SOAP into EMR')
                    : (isAr ? 'إدراج النص بالملف السريري' : 'Insert Text into EMR')}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
