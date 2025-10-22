import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Settings, Users, Globe } from 'lucide-react';

interface Message {
  id: string;
  speaker: 'user' | 'remote';
  originalText: string;
  translatedText: string;
  timestamp: Date;
  language: string;
}

interface CallInterfaceProps {
  isCallActive: boolean;
  onEndCall: () => void;
  userLanguage: string;
  remoteLanguage: string;
}

const CallInterface: React.FC<CallInterfaceProps> = ({
  isCallActive,
  onEndCall,
  userLanguage,
  remoteLanguage
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserText, setCurrentUserText] = useState('');
  const [currentRemoteText, setCurrentRemoteText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = getLanguageCode(userLanguage);

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          handleTranslateAndSpeak(finalTranscript, 'user');
        }
        setCurrentUserText(interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };
    }

    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [userLanguage]);

  const getLanguageCode = (language: string): string => {
    const langCodes: Record<string, string> = {
      'English': 'en-US',
      'Spanish': 'es-ES',
      'French': 'fr-FR',
      'German': 'de-DE',
      'Italian': 'it-IT',
      'Portuguese': 'pt-PT',
      'Russian': 'ru-RU',
      'Chinese': 'zh-CN',
      'Japanese': 'ja-JP',
      'Korean': 'ko-KR',
      'Arabic': 'ar-SA',
      'Hindi': 'hi-IN',
      'Tamil': 'ta-IN'
    };
    return langCodes[language] || 'en-US';
  };

  const translateText = async (text: string, fromLang: string, toLang: string): Promise<string> => {
    try {
      // Using MyMemory Translation API (free, no auth required)
      const fromCode = getLanguageCode(fromLang).split('-')[0];
      const toCode = getLanguageCode(toLang).split('-')[0];
      
      if (fromCode === toCode) {
        return text; // Same language, no translation needed
      }

      const encodedText = encodeURIComponent(text);
      const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${fromCode}|${toCode}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData) {
        return data.responseData.translatedText;
      } else {
        console.warn('Translation API error:', data);
        return `[Translation Error] ${text}`;
      }
    } catch (error) {
      console.error('Translation error:', error);
      return `[Translation Failed] ${text}`;
    }
  };

  const handleTranslateAndSpeak = async (text: string, speaker: 'user' | 'remote') => {
    const fromLang = speaker === 'user' ? userLanguage : remoteLanguage;
    const toLang = speaker === 'user' ? remoteLanguage : userLanguage;
    
    const translatedText = await translateText(text, fromLang, toLang);
    
    const message: Message = {
      id: Date.now().toString(),
      speaker,
      originalText: text,
      translatedText,
      timestamp: new Date(),
      language: fromLang
    };

    setMessages(prev => [...prev, message]);

    // Text-to-speech for translated text
    if (synthRef.current && !isMuted) {
      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = getLanguageCode(toLang);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      
      // Find appropriate voice
      const voices = synthRef.current.getVoices();
      const targetVoice = voices.find(voice => voice.lang.startsWith(getLanguageCode(toLang).split('-')[0]));
      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      synthRef.current.speak(utterance);
    }

    setCurrentUserText('');
    setCurrentRemoteText('');
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  // Simulate remote speaker for demo
  const simulateRemoteSpeaker = () => {
    const sampleTexts = [
      "Hola, ¿cómo estás hoy?",
      "Necesito ayuda con mi pedido.",
      "¿Puedes explicar este procedimiento?",
      "¿A qué hora comienza la reunión?",
      "Gracias por tu ayuda."
    ];
    const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    handleTranslateAndSpeak(randomText, 'remote');
  };

  if (!isCallActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white font-medium">Live Translation Active</span>
        </div>
        <div className="flex items-center space-x-2 text-white/70">
          <Globe className="w-4 h-4" />
          <span className="text-sm">{userLanguage} ↔ {remoteLanguage}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* User Side */}
        <div className="flex-1 p-6 border-r border-white/10">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">You</h3>
                  <p className="text-white/60 text-sm">{userLanguage}</p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full ${isRecording ? 'bg-red-400 animate-pulse' : 'bg-gray-400'}`}></div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.filter(m => m.speaker === 'user').map((message) => (
                <div key={message.id} className="bg-blue-500/20 rounded-lg p-3">
                  <p className="text-white text-sm mb-1">{message.originalText}</p>
                  <p className="text-blue-200 text-xs">{message.translatedText}</p>
                  <span className="text-white/40 text-xs">{message.timestamp.toLocaleTimeString()}</span>
                </div>
              ))}
              {currentUserText && (
                <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-400/30">
                  <p className="text-white/70 text-sm italic">{currentUserText}</p>
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={toggleRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25'
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </button>
              <p className="text-white/60 text-sm mt-2">
                {isRecording ? 'Recording...' : 'Tap to speak'}
              </p>
            </div>
          </div>
        </div>

        {/* Remote Side */}
        <div className="flex-1 p-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Remote Speaker</h3>
                  <p className="text-white/60 text-sm">{remoteLanguage}</p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse"></div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.filter(m => m.speaker === 'remote').map((message) => (
                <div key={message.id} className="bg-purple-500/20 rounded-lg p-3">
                  <p className="text-white text-sm mb-1">{message.originalText}</p>
                  <p className="text-purple-200 text-xs">{message.translatedText}</p>
                  <span className="text-white/40 text-xs">{message.timestamp.toLocaleTimeString()}</span>
                </div>
              ))}
              {currentRemoteText && (
                <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-400/30">
                  <p className="text-white/70 text-sm italic">{currentRemoteText}</p>
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={simulateRemoteSpeaker}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200"
              >
                <Volume2 className="w-8 h-8 text-white" />
              </button>
              <p className="text-white/60 text-sm mt-2">Test Translation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black/20 backdrop-blur-sm p-6 flex items-center justify-center space-x-6 border-t border-white/10">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
            isMuted
              ? 'bg-red-500/20 text-red-400 border border-red-400/30'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>

        <button
          onClick={onEndCall}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg shadow-red-500/25"
        >
          <PhoneOff className="w-8 h-8 text-white" />
        </button>

        <button className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200">
          <Settings className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default CallInterface;