import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Loader2, Volume2, Globe } from 'lucide-react';
import { api } from '../api/client.ts';
import { Language } from '../types/hmis.ts';

interface VoiceDictationButtonProps {
  onTranscription: (text: string) => void;
  currentValue?: string;
  language?: Language;
  className?: string;
  enableAiClean?: boolean;
}

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export const VoiceDictationButton: React.FC<VoiceDictationButtonProps> = ({
  onTranscription,
  currentValue = '',
  language = 'ar',
  className = '',
  enableAiClean = true
}) => {
  const isAr = language === 'ar';
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [dictationLang, setDictationLang] = useState<'ar-SA' | 'en-US'>(
    language === 'ar' ? 'ar-SA' : 'en-US'
  );
  const [interimText, setInterimText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = dictationLang;

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
          let formatted = finalTrans
            .replace(/\s*(فاصلة|فاصله|comma)\s*/gi, '، ')
            .replace(/\s*(نقطة|نقطه|period|full stop)\s*/gi, '. ')
            .replace(/\s*(علامة استفهام|علامه استفهام|question mark)\s*/gi, '؟ ')
            .replace(/\s*(سطر جديد|new line)\s*/gi, '\n')
            .replace(/\s*(فقرة جديدة|فقره جديده|new paragraph)\s*/gi, '\n\n')
            .replace(/\s*(نقطتين|نقطتان|colon)\s*/gi, ': ')
            .replace(/\s*(شرطة|شرطه|dash)\s*/gi, ' - ');

          const separator = currentValue && !currentValue.endsWith(' ') && !currentValue.endsWith('\n') ? ' ' : '';
          onTranscription((currentValue + separator + formatted).trim());
          setInterimText('');
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition setup failed:', e);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [dictationLang, currentValue, onTranscription]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = dictationLang;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Could not start recognition:', err);
      }
    }
  };

  const handleAiFormat = async () => {
    if (!currentValue.trim()) return;
    setIsAiProcessing(true);
    try {
      const res = await api.aiClinicalAssist({
        task: 'voice_cleanup',
        text: currentValue,
        targetLanguage: isAr ? 'ar' : 'en'
      });
      if (res.result) {
        onTranscription(res.result);
      }
    } catch (err: any) {
      console.error('AI clinical cleanup error:', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  if (!isSupported) {
    return (
      <div className={`inline-flex items-center gap-1 text-[10px] text-slate-400 ${className}`}>
        <MicOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {isAr ? 'الطباعة الصوتية غير مدعومة بالمتصفح' : 'Dictation not supported'}
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Dictation Language Switcher */}
      <button
        type="button"
        onClick={() => setDictationLang(dictationLang === 'ar-SA' ? 'en-US' : 'ar-SA')}
        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        title={isAr ? 'تبديل لغة الإملاء الصوتي' : 'Switch speech language'}
      >
        {dictationLang === 'ar-SA' ? 'AR' : 'EN'}
      </button>

      {/* Main Microphone Button */}
      <button
        type="button"
        onClick={toggleListening}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs whitespace-nowrap ${
          isListening
            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
            : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300'
        }`}
        title={
          isListening 
            ? (isAr ? 'جاري الاستماع... اضغط للإيقاف' : 'Listening... click to stop')
            : (isAr ? 'بدء الطباعة الصوتية المباشرة' : 'Start live voice dictation')
        }
      >
        <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce' : 'text-teal-600'}`} />
        <span>
          {isListening
            ? (isAr ? 'استماع...' : 'Listening...')
            : (isAr ? 'إملاء صوتي' : 'Dictate')}
        </span>
      </button>

      {/* AI Smart Clean & Format Button (Free Gemini 3.8 Flash) */}
      {enableAiClean && currentValue.trim().length > 10 && (
        <button
          type="button"
          onClick={handleAiFormat}
          disabled={isAiProcessing}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors shadow-2xs disabled:opacity-50"
          title={isAr ? 'تنسيق وتصحيح ذكي مجاني عبر الذكاء الاصطناعي (Gemini 3.8 Flash)' : 'Free AI clinical polish & structuring'}
        >
          {isAiProcessing ? (
            <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
          ) : (
            <Sparkles className="w-3 h-3 text-indigo-600" />
          )}
          <span className="hidden sm:inline">
            {isAiProcessing 
              ? (isAr ? 'تنسيق AI...' : 'Polishing...') 
              : (isAr ? 'تنسيق ذكي AI' : 'AI Polish')}
          </span>
        </button>
      )}

      {/* Interim Listening Speech Indicator */}
      {isListening && interimText && (
        <span className="text-[10px] text-rose-600 font-medium italic animate-pulse max-w-44 truncate">
          "{interimText}"
        </span>
      )}
    </div>
  );
};
