import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  FileText, 
  Volume2, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  Calendar, 
  User, 
  Stethoscope, 
  Activity, 
  Scissors, 
  Building2, 
  Baby, 
  Loader2, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { Patient, Admission, SystemUser, Language, VoiceNote, VoiceNoteCategory } from '../types/hmis.ts';
import { api } from '../api/client.ts';
import { VoiceDictationButton } from './VoiceDictationButton.tsx';

interface VoiceNotesModuleProps {
  currentPatient: Patient | null;
  currentAdmission: Admission | null;
  currentUser: SystemUser;
  language: Language;
  onRefresh?: () => void;
  onApplySoapToAssessment?: (soap: { subjective: string; objective: string; assessment: string; plan: string }) => void;
}

export const VoiceNotesModule: React.FC<VoiceNotesModuleProps> = ({
  currentPatient,
  currentAdmission,
  currentUser,
  language,
  onRefresh,
  onApplySoapToAssessment
}) => {
  const isAr = language === 'ar';

  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewScope, setViewScope] = useState<'current_stay' | 'all'>('current_stay');

  // Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // New Note Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<VoiceNoteCategory>('clinical_round');
  const [transcript, setTranscript] = useState('');
  const [structuredSoap, setStructuredSoap] = useState<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  } | null>(null);
  const [aiSummary, setAiSummary] = useState('');

  // AI Assistant states
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiTaskType, setAiTaskType] = useState<'soap' | 'summary' | 'discharge' | 'consent'>('soap');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // Audio Playback states
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const loadVoiceNotes = async () => {
    setIsLoading(true);
    try {
      const admId = viewScope === 'current_stay' && currentAdmission ? currentAdmission.admissionId : undefined;
      const mrn = viewScope === 'current_stay' && currentPatient ? currentPatient.mrn : undefined;
      const notes = await api.getVoiceNotes(admId, mrn);
      setVoiceNotes(notes);
    } catch (err) {
      console.error('Error fetching voice notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVoiceNotes();
  }, [viewScope, currentAdmission]);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  // Start MediaRecorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setRecordedAudioUrl(reader.result as string);
        };
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordedAudioUrl(null);
    } catch (err) {
      alert(isAr ? 'تعذر الوصول إلى الميكروفون. يرجى منح الإذن في المتصفح.' : 'Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    setIsRecording(false);
    setRecordingDuration(0);
    setRecordedAudioUrl(null);
    audioChunksRef.current = [];
  };

  // AI Transformation (Free Gemini 3.8 Flash)
  const handleAiTransform = async (task: 'soap' | 'summary' | 'discharge' | 'consent') => {
    if (!transcript.trim()) {
      alert(isAr ? 'يرجى تسجيل أو كتابة النص الصوتي أولاً.' : 'Please record or dictate audio transcript first.');
      return;
    }

    setIsAiProcessing(true);
    setAiTaskType(task);

    try {
      const taskMap: Record<string, any> = {
        soap: 'soap_structuring',
        summary: 'voice_cleanup',
        discharge: 'discharge_summary',
        consent: 'consent_draft'
      };

      const res = await api.aiClinicalAssist({
        task: taskMap[task],
        text: transcript,
        patientContext: {
          patientName: currentPatient?.fullName,
          mrn: currentPatient?.mrn,
          department: currentAdmission?.department,
          diagnosis: currentAdmission?.packageName || 'Post-Op / Inpatient Recovery',
          roomNumber: currentAdmission?.roomNumber
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
      alert(err.message || 'AI processing failed');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSaveVoiceNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient || !currentAdmission) {
      alert(isAr ? 'يرجى تحديد مريض نشط أولاً' : 'Please select an active inpatient first');
      return;
    }

    if (!transcript.trim()) {
      alert(isAr ? 'يرجى تسجيل أو إملاء النص الصوتي للملاحظة السريرية' : 'Please record or enter clinical note text');
      return;
    }

    try {
      const notePayload: Partial<VoiceNote> = {
        admissionId: currentAdmission.admissionId,
        mrn: currentPatient.mrn,
        patientName: currentPatient.fullName,
        recordedBy: currentUser.name,
        recordedByRole: currentUser.role,
        timestamp: new Date().toISOString(),
        durationSeconds: recordingDuration > 0 ? recordingDuration : 30,
        audioUrl: recordedAudioUrl || undefined,
        category,
        title: title || (isAr ? `${category} - ${new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}` : `${category} round`),
        transcript,
        aiStructuredSoap: structuredSoap || undefined,
        aiSummary: aiSummary || undefined,
        tags: [category, currentUser.role]
      };

      await api.saveVoiceNote(notePayload, currentUser);
      // Reset form
      setTitle('');
      setTranscript('');
      setStructuredSoap(null);
      setAiSummary('');
      resetRecording();
      loadVoiceNotes();
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Error saving voice note');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذه الملاحظة الصوتية؟' : 'Are you sure you want to delete this voice note?')) return;
    try {
      await api.deleteVoiceNote(id, currentUser);
      loadVoiceNotes();
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Error deleting voice note');
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const filteredNotes = voiceNotes.filter((n) => {
    if (filterCategory !== 'all' && n.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {isAr ? 'محطة الملاحظات والطباعة الصوتية والذكاء الاصطناعي' : 'Clinical Voice Notes & Free AI Scribe'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                FREE AI · GEMINI 3.8 FLASH
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr 
                ? 'إملاء صوتي فوري، تسجيل الملاحظات السريرية، وهيكلتها آلياً لصيغة SOAP وتقارير العمليات' 
                : 'Live audio dictation, speech-to-text, and automated AI SOAP clinical structuring'}
            </p>
          </div>
        </div>

        {/* View Scope Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setViewScope('current_stay')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewScope === 'current_stay'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'المريض الحالي' : 'Active Patient'}
          </button>
          <button
            onClick={() => setViewScope('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewScope === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'جميع إقامات المستشفى' : 'All Inpatients'}
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Recorder & AI Scribe, Right = History Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Voice Recorder & AI Scribe Studio */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mic className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'استوديو التسجيل والإملاء الصوتي السريري' : 'Audio Dictation & AI Scribe Studio'}</span>
              </h3>
              {currentPatient && (
                <span className="text-xs text-slate-500 font-medium">
                  {currentPatient.fullName} ({currentPatient.mrn})
                </span>
              )}
            </div>

            {/* Audio Recording Console */}
            <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
                  <span className="font-mono text-sm font-bold">
                    {isRecording ? (isAr ? 'جاري التسجيل الصوتي المباشر' : 'Recording Audio...') : (isAr ? 'جاهز للتسجيل' : 'Ready')}
                  </span>
                </div>
                <div className="font-mono text-lg font-bold text-teal-400">
                  {formatSeconds(recordingDuration)}
                </div>
              </div>

              {/* Pulsing Visual Waveform Bar */}
              <div className="h-10 bg-slate-800/80 rounded-lg flex items-center justify-center gap-1.5 px-4 overflow-hidden">
                {isRecording ? (
                  Array.from({ length: 28 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-teal-400 rounded-full animate-pulse"
                      style={{
                        height: `${Math.max(15, Math.sin(i * 0.5 + recordingDuration) * 36 + 10)}%`,
                        animationDelay: `${(i % 5) * 0.15}s`
                      }}
                    />
                  ))
                ) : recordedAudioUrl ? (
                  <span className="text-xs text-teal-300 font-mono">
                    {isAr ? '✓ تم التقاط التسجيل الصوتي بنجاح' : 'Audio recording captured successfully'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-mono">
                    {isAr ? 'اضغط على زر التسجيل أدناه لبدء المرور الصوتي' : 'Press Record button below to start dictating'}
                  </span>
                )}
              </div>

              {/* Audio Playback if recorded */}
              {recordedAudioUrl && (
                <div className="pt-2 border-t border-slate-800">
                  <audio controls src={recordedAudioUrl} className="w-full h-8" />
                </div>
              )}

              {/* Recorder Control Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow transition-all"
                    >
                      <Mic className="w-4 h-4" />
                      <span>{isAr ? 'بدء التسجيل الحي' : 'Start Audio Recording'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow transition-all animate-pulse"
                    >
                      <Square className="w-4 h-4" />
                      <span>{isAr ? 'إيقاف وحفظ الصوت' : 'Stop & Save Audio'}</span>
                    </button>
                  )}

                  {recordedAudioUrl && !isRecording && (
                    <button
                      type="button"
                      onClick={resetRecording}
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-xs"
                      title={isAr ? 'إعادة التسجيل' : 'Reset'}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Instant Speech Dictation Helper */}
                <div className="bg-slate-800/80 p-1 rounded-lg">
                  <VoiceDictationButton
                    onTranscription={(text) => {
                      const sep = transcript && !transcript.endsWith(' ') ? ' ' : '';
                      setTranscript(transcript + sep + text);
                    }}
                    currentValue={transcript}
                    language={language}
                    enableAiClean={false}
                  />
                </div>
              </div>
            </div>

            {/* Form Details */}
            <form onSubmit={handleSaveVoiceNote} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'تصنيف الملاحظة الصوتية *' : 'Voice Note Category *'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900"
                  >
                    <option value="clinical_round">{isAr ? 'مرور سريري صباحي/مسائي' : 'Clinical Ward Round'}</option>
                    <option value="operative_dictation">{isAr ? 'إملاء تقرير عملية جراحية' : 'Operative Surgical Dictation'}</option>
                    <option value="nursing_handover">{isAr ? 'تسليم وملاحظات التمريض' : 'Nursing Handover Note'}</option>
                    <option value="discharge_instruction">{isAr ? 'تعليمات وتوصيات الخروج' : 'Discharge Instructions'}</option>
                    <option value="consent_explanation">{isAr ? 'شرح الإقرار الطبي للمريض' : 'Informed Consent Explanation'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {isAr ? 'عنوان الملاحظة' : 'Note Title'}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isAr ? 'مثال: مرور اليوم الأول بعد القيصرية' : 'e.g. Post-Op Day 1 Round'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Dictation Transcript Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>{isAr ? 'النص الصوتي المفرَّغ (Speech Transcript) *' : 'Speech Transcript *'}</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {transcript.length} {isAr ? 'حرف' : 'chars'}
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={
                    isAr
                      ? 'يمكنك التحدث مباشرة عبر زر (إملاء صوتي) أو كتابة تفاصيل المرور والعلامات الحيوية وحالة الجرح والرحم...'
                      : 'Speak via the microphone button or type clinical observations, vitals, incision status, and care plan...'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 leading-relaxed"
                />
              </div>

              {/* Free AI Transformation Actions Bar */}
              <div className="p-3 bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      {isAr ? 'معالجة الذكاء الاصطناعي المجاني (Gemini 3.8 Flash):' : 'Free AI Clinical Structuring:'}
                    </span>
                  </div>
                  {isAiProcessing && (
                    <span className="flex items-center gap-1.5 text-[10px] text-indigo-700 font-bold animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {isAr ? 'جاري التحليل السريري...' : 'Processing...'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isAiProcessing || !transcript.trim()}
                    onClick={() => handleAiTransform('soap')}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg font-bold text-[11px] shadow-2xs transition-colors flex items-center gap-1"
                  >
                    <span>{isAr ? '✨ تحويل لصيغة SOAP الطبية' : '✨ Structure as SOAP Note'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isAiProcessing || !transcript.trim()}
                    onClick={() => handleAiTransform('summary')}
                    className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-900 border border-teal-200 rounded-lg font-bold text-[11px] shadow-2xs transition-colors flex items-center gap-1"
                  >
                    <span>{isAr ? '📝 تنقيح وتلخيص سريري' : '📝 Clinical Polish'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isAiProcessing || !transcript.trim()}
                    onClick={() => handleAiTransform('discharge')}
                    className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 rounded-lg font-bold text-[11px] shadow-2xs transition-colors flex items-center gap-1"
                  >
                    <span>{isAr ? '📋 توليد تعليمات الخروج' : '📋 Discharge Advice'}</span>
                  </button>
                </div>
              </div>

              {/* AI Structured Output Card */}
              {structuredSoap && (
                <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isAr ? 'التقرير السريري المهيكل بصيغة SOAP:' : 'AI Structured SOAP Record:'}</span>
                    </span>
                    {onApplySoapToAssessment && (
                      <button
                        type="button"
                        onClick={() => onApplySoapToAssessment(structuredSoap)}
                        className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold hover:bg-indigo-700"
                      >
                        {isAr ? 'اعتماد بالملف السريري الرئيسي' : 'Apply to Assessment'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                      <strong className="text-indigo-900 block mb-0.5 font-bold">S - شكوى المريضة (Subjective):</strong>
                      <p className="text-slate-700 leading-relaxed">{structuredSoap.subjective}</p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                      <strong className="text-indigo-900 block mb-0.5 font-bold">O - الفحص والمؤشرات (Objective):</strong>
                      <p className="text-slate-700 leading-relaxed">{structuredSoap.objective}</p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                      <strong className="text-indigo-900 block mb-0.5 font-bold">A - التقييم والتشخيص (Assessment):</strong>
                      <p className="text-slate-700 leading-relaxed">{structuredSoap.assessment}</p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                      <strong className="text-indigo-900 block mb-0.5 font-bold">P - الخطة العلاجية (Plan):</strong>
                      <p className="text-slate-700 leading-relaxed">{structuredSoap.plan}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-sm transition-colors text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isAr ? 'حفظ وتوثيق الملاحظة الصوتية' : 'Save & Archive Voice Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Voice Notes Archive & Feed */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-teal-600" />
                  <span>{isAr ? 'سجل الملاحظات الصوتية والمحادثات الموثقة' : 'Voice Notes & Audio Rounds Archive'}</span>
                </h3>
                <span className="text-xs text-slate-500">
                  {filteredNotes.length} {isAr ? 'ملاحظة مسجلة' : 'records'}
                </span>
              </div>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                <option value="all">{isAr ? 'كل الفئات' : 'All Categories'}</option>
                <option value="clinical_round">{isAr ? 'مرور سريري' : 'Clinical Round'}</option>
                <option value="operative_dictation">{isAr ? 'إملاء عمليات' : 'Operative'}</option>
                <option value="nursing_handover">{isAr ? 'تسليم تمريض' : 'Nursing'}</option>
                <option value="discharge_instruction">{isAr ? 'تعليمات خروج' : 'Discharge'}</option>
                <option value="consent_explanation">{isAr ? 'شرح إقرار' : 'Consent'}</option>
              </select>
            </div>

            {/* List of Voice Notes */}
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 font-mono text-xs">
                {isAr ? 'جاري تحميل الملاحظات الصوتية...' : 'Loading voice notes...'}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <Mic className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-medium">
                  {isAr ? 'لا توجد ملاحظات صوتية مسجلة بعد لهذا النطاق.' : 'No clinical voice notes found for this scope.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                {filteredNotes.map((note) => {
                  const isExpanded = expandedNoteId === note.id;
                  return (
                    <div
                      key={note.id}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-white hover:border-teal-300 transition-all shadow-2xs space-y-3"
                    >
                      {/* Top note header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-xs">{note.title}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                              {note.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 font-mono">
                            <span>{note.patientName}</span>
                            <span>•</span>
                            <span>MRN: {note.mrn}</span>
                            <span>•</span>
                            <span>{new Date(note.timestamp).toLocaleDateString('ar-LY')} {new Date(note.timestamp).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyText(note.transcript, note.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                            title={isAr ? 'نسخ النص' : 'Copy transcript'}
                          >
                            {copiedId === note.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title={isAr ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Recorded By Badge & Duration */}
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 font-sans">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">{note.recordedBy}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({note.recordedByRole})</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-teal-700">
                          <Clock className="w-3 h-3" />
                          <span>{formatSeconds(note.durationSeconds)}</span>
                        </div>
                      </div>

                      {/* Audio Player if URL exists */}
                      {note.audioUrl && (
                        <div className="pt-1">
                          <audio controls src={note.audioUrl} className="w-full h-8" />
                        </div>
                      )}

                      {/* Transcript Preview */}
                      <div className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed font-medium">
                        "{note.transcript}"
                      </div>

                      {/* AI Structured SOAP Accordion */}
                      {note.aiStructuredSoap && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                            className="flex items-center justify-between w-full text-[11px] font-bold text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100/70 p-2 rounded-lg transition-colors"
                          >
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{isAr ? 'عرض التحليل السريري المهيكل (SOAP Note)' : 'View AI SOAP Record'}</span>
                            </span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 bg-indigo-50/40 border border-indigo-200 rounded-lg p-3 text-[11px] space-y-2 animate-in fade-in duration-100">
                              <div>
                                <strong className="text-indigo-950 font-bold block">S (Subjective):</strong>
                                <p className="text-slate-700">{note.aiStructuredSoap.subjective}</p>
                              </div>
                              <div>
                                <strong className="text-indigo-950 font-bold block">O (Objective):</strong>
                                <p className="text-slate-700">{note.aiStructuredSoap.objective}</p>
                              </div>
                              <div>
                                <strong className="text-indigo-950 font-bold block">A (Assessment):</strong>
                                <p className="text-slate-700">{note.aiStructuredSoap.assessment}</p>
                              </div>
                              <div>
                                <strong className="text-indigo-950 font-bold block">P (Plan):</strong>
                                <p className="text-slate-700">{note.aiStructuredSoap.plan}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
