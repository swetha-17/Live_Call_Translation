import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Settings, User, Globe, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  speaker: 'user1' | 'user2';
  originalText: string;
  translatedText: string;
  timestamp: Date;
  originalLanguage: string;
  translatedLanguage: string;
}

interface TwoUserInterfaceProps {
  isCallActive: boolean;
  onEndCall: () => void;
  user1Language: string;
  user2Language: string;
}

const TwoUserInterface: React.FC<TwoUserInterfaceProps> = ({
  isCallActive,
  onEndCall,
  user1Language,
  user2Language
}) => {
  const [user1Recording, setUser1Recording] = useState(false);
  const [user2Recording, setUser2Recording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser1Text, setCurrentUser1Text] = useState('');
  const [currentUser2Text, setCurrentUser2Text] = useState('');
  const [activeUser, setActiveUser] = useState<'user1' | 'user2' | null>(null);
  
  const user1RecognitionRef = useRef<SpeechRecognition | null>(null);
  const user2RecognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    setupSpeechRecognition();
    synthRef.current = window.speechSynthesis;

    return () => {
      if (user1RecognitionRef.current) {
        user1RecognitionRef.current.stop();
      }
      if (user2RecognitionRef.current) {
        user2RecognitionRef.current.stop();
      }
    };
  }, [user1Language, user2Language]);

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

  const setupSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      // User 1 Speech Recognition
      user1RecognitionRef.current = new SpeechRecognition();
      user1RecognitionRef.current.continuous = true;
      user1RecognitionRef.current.interimResults = true;
      user1RecognitionRef.current.lang = getLanguageCode(user1Language);

      user1RecognitionRef.current.onresult = (event) => {
        handleSpeechResult(event, 'user1');
      };

      user1RecognitionRef.current.onerror = (event) => {
        console.error('User 1 speech recognition error:', event.error);
      };

      // User 2 Speech Recognition
      user2RecognitionRef.current = new SpeechRecognition();
      user2RecognitionRef.current.continuous = true;
      user2RecognitionRef.current.interimResults = true;
      user2RecognitionRef.current.lang = getLanguageCode(user2Language);

      user2RecognitionRef.current.onresult = (event) => {
        handleSpeechResult(event, 'user2');
      };

      user2RecognitionRef.current.onerror = (event) => {
        console.error('User 2 speech recognition error:', event.error);
      };
    }
  };

  const handleSpeechResult = (event: SpeechRecognitionEvent, user: 'user1' | 'user2') => {
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
      handleTranslateAndSpeak(finalTranscript, user);
    }

    if (user === 'user1') {
      setCurrentUser1Text(interimTranscript);
    } else {
      setCurrentUser2Text(interimTranscript);
    }
  };

  const translateText = async (text: string, fromLang: string, toLang: string): Promise<string> => {
    try {
      const fromCode = getLanguageCode(fromLang).split('-')[0];
      const toCode = getLanguageCode(toLang).split('-')[0];
      
      if (fromCode === toCode) {
        return text;
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

  const handleTranslateAndSpeak = async (text: string, speaker: 'user1' | 'user2') => {
    const fromLang = speaker === 'user1' ? user1Language : user2Language;
    const toLang = speaker === 'user1' ? user2Language : user1Language;
    
    const translatedText = await translateText(text, fromLang, toLang);
    
    const message: Message = {
      id: Date.now().toString(),
      speaker,
      originalText: text,
      translatedText,
      timestamp: new Date(),
      originalLanguage: fromLang,
      translatedLanguage: toLang
    };

    setMessages(prev => [...prev, message]);

    // Text-to-speech for the OTHER user (they hear the translation)
    if (synthRef.current && !isMuted) {
      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = getLanguageCode(toLang);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      
      const voices = synthRef.current.getVoices();
      const targetVoice = voices.find(voice => voice.lang.startsWith(getLanguageCode(toLang).split('-')[0]));
      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      synthRef.current.speak(utterance);
    }

    if (speaker === 'user1') {
      setCurrentUser1Text('');
    } else {
      setCurrentUser2Text('');
    }
  };

  const toggleUser1Recording = () => {
    if (!user1RecognitionRef.current) return;

    if (user1Recording) {
      user1RecognitionRef.current.stop();
      setUser1Recording(false);
      setActiveUser(null);
    } else {
      // Stop user 2 if they're recording
      if (user2Recording && user2RecognitionRef.current) {
        user2RecognitionRef.current.stop();
        setUser2Recording(false);
      }
      
      user1RecognitionRef.current.start();
      setUser1Recording(true);
      setActiveUser('user1');
    }
  };

  const toggleUser2Recording = () => {
    if (!user2RecognitionRef.current) return;

    if (user2Recording) {
      user2RecognitionRef.current.stop();
      setUser2Recording(false);
      setActiveUser(null);
    } else {
      // Stop user 1 if they're recording
      if (user1Recording && user1RecognitionRef.current) {
        user1RecognitionRef.current.stop();
        setUser1Recording(false);
      }
      
      user2RecognitionRef.current.start();
      setUser2Recording(true);
      setActiveUser('user2');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (synthRef.current) {
      synthRef.current.cancel();
    }
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
          {activeUser && (
            <span className="text-white/70 text-sm">
              ({activeUser === 'user1' ? 'User 1' : 'User 2'} speaking)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-white/70">
          <Globe className="w-4 h-4" />
          <span className="text-sm">{user1Language} ↔ {user2Language}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* User 1 Side */}
        <div className="flex-1 p-6 border-r border-white/10">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">User 1</h3>
                  <p className="text-white/60 text-sm">Speaks {user1Language}</p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full ${user1Recording ? 'bg-red-400 animate-pulse' : 'bg-gray-400'}`}></div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {/* Show what User 1 said (original) and what they hear (translations from User 2) */}
              {messages.map((message) => (
                <div key={message.id}>
                  {message.speaker === 'user1' ? (
                    <div className="bg-blue-500/20 rounded-lg p-3 ml-4">
                      <div className="flex items-center mb-1">
                        <MessageCircle className="w-3 h-3 text-blue-300 mr-1" />
                        <span className="text-blue-300 text-xs">You said:</span>
                      </div>
                      <p className="text-white text-sm">{message.originalText}</p>
                      <span className="text-white/40 text-xs">{message.timestamp.toLocaleTimeString()}</span>
                    </div>
                  ) : (
                    <div className="bg-green-500/20 rounded-lg p-3 mr-4">
                      <div className="flex items-center mb-1">
                        <Volume2 className="w-3 h-3 text-green-300 mr-1" />
                        <span className="text-green-300 text-xs">You hear:</span>
                      </div>
                      <p className="text-white text-sm">{message.translatedText}</p>
                      <p className="text-green-200 text-xs">Original: "{message.originalText}"</p>
                      <span className="text-white/40 text-xs">{message.timestamp.toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              ))}
              
              {currentUser1Text && (
                <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-400/30 ml-4">
                  <p className="text-white/70 text-sm italic">{currentUser1Text}</p>
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={toggleUser1Recording}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                  user1Recording
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25'
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                {user1Recording ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </button>
              <p className="text-white/60 text-sm mt-2">
                {user1Recording ? 'Recording...' : 'Tap to speak'}
              </p>
            </div>
          </div>
        </div>

        {/* User 2 Side */}
        <div className="flex-1 p-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">User 2</h3>
                  <p className="text-white/60 text-sm">Speaks {user2Language}</p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full ${user2Recording ? 'bg-red-400 animate-pulse' : 'bg-gray-400'}`}></div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {/* Show what User 2 said (original) and what they hear (translations from User 1) */}
              {messages.map((message) => (
                <div key={`user2-${message.id}`}>
                  {message.speaker === 'user2' ? (
                    <div className="bg-purple-500/20 rounded-lg p-3 ml-4">
                      <div className="flex items-center mb-1">
                        <MessageCircle className="w-3 h-3 text-purple-300 mr-1" />
                        <span className="text-purple-300 text-xs">You said:</span>
                      </div>
                      <p className="text-white text-sm">{message.originalText}</p>
                      <span className="text-white/40 text-xs">{message.timestamp.toLocaleTimeString()}</span>
                    </div>
                  ) : (
                    <div className="bg-green-500/20 rounded-lg p-3 mr-4">
                      <div className="flex items-center mb-1">
                        <Volume2 className="w-3 h-3 text-green-300 mr-1" />
                        <span className="text-green-300 text-xs">You hear:</span>
                      </div>
                      <p className="text-white text-sm">{message.translatedText}</p>
                      <p className="text-green-200 text-xs">Original: "{message.originalText}"</p>
                      <span className="text-white/40 text-xs">{message.timestamp.toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              ))}
              
              {currentUser2Text && (
                <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-400/30 ml-4">
                  <p className="text-white/70 text-sm italic">{currentUser2Text}</p>
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={toggleUser2Recording}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                  user2Recording
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25'
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                {user2Recording ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </button>
              <p className="text-white/60 text-sm mt-2">
                {user2Recording ? 'Recording...' : 'Tap to speak'}
              </p>
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

      {/* Instructions */}
      <div className="bg-black/10 backdrop-blur-sm p-3 text-center">
        <p className="text-white/70 text-sm">
          Only one person can speak at a time. Click your microphone button to speak in your language.
        </p>
      </div>
    </div>
  );
};

export default TwoUserInterface;