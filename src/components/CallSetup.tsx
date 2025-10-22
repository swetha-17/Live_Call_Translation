import React, { useState, useEffect } from 'react';
import { Phone, Mic, MicOff, Volume2, VolumeX, Settings, Shield, Zap, Globe2 } from 'lucide-react';
import LanguageSelector from './LanguageSelector';

interface CallSetupProps {
  onStartCall: (user1Lang: string, user2Lang: string) => void;
  user1Language: string;
  user2Language: string;
  onUser1LanguageChange: (lang: string) => void;
  onUser2LanguageChange: (lang: string) => void;
}

const CallSetup: React.FC<CallSetupProps> = ({
  onStartCall,
  user1Language,
  user2Language,
  onUser1LanguageChange,
  onUser2LanguageChange
}) => {
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicPermission(result.state);
      
      result.addEventListener('change', () => {
        setMicPermission(result.state);
      });
    } catch (error) {
      console.error('Error checking microphone permission:', error);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      setMicPermission('denied');
    }
  };

  const testMicrophone = async () => {
    if (micPermission !== 'granted') {
      await requestMicrophonePermission();
      return;
    }

    setIsTestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        
        if (isTestingMic) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
      
      setTimeout(() => {
        setIsTestingMic(false);
        setAudioLevel(0);
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
      }, 3000);
    } catch (error) {
      console.error('Error testing microphone:', error);
      setIsTestingMic(false);
    }
  };

  const handleStartCall = () => {
    if (micPermission !== 'granted') {
      requestMicrophonePermission();
      return;
    }
    onStartCall(user1Language, user2Language);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <Globe2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Live Call Translation</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Enable seamless communication between two people speaking different languages. 
            Each person speaks in their native language and hears the other in their own language.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Translation</h3>
            <p className="text-gray-600">Instant speech-to-speech translation with minimal latency for natural conversations.</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Private</h3>
            <p className="text-gray-600">End-to-end encryption ensures your conversations remain completely private.</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Globe2 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">12+ Languages</h3>
            <p className="text-gray-600">Support for major world languages including Tamil, Hindi, and accurate dialect recognition.</p>
          </div>
        </div>

        {/* Main Setup Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Setup Your Call Translation</h2>
            
            {/* Language Selection */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-2">
                <LanguageSelector
                  selectedLanguage={user1Language}
                  onLanguageChange={onUser1LanguageChange}
                  label="User 1 Language"
                />
              </div>
              
              <div className="space-y-2">
                <LanguageSelector
                  selectedLanguage={user2Language}
                  onLanguageChange={onUser2LanguageChange}
                  label="User 2 Language"
                />
              </div>
            </div>

            {/* Microphone Test */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Mic className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="font-medium text-gray-900">Microphone Test</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  micPermission === 'granted' 
                    ? 'bg-green-100 text-green-800' 
                    : micPermission === 'denied'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {micPermission === 'granted' ? 'Permitted' : micPermission === 'denied' ? 'Denied' : 'Not Set'}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={testMicrophone}
                  disabled={isTestingMic}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isTestingMic
                      ? 'bg-red-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isTestingMic ? (
                    <>
                      <MicOff className="w-4 h-4 mr-2" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Test Microphone
                    </>
                  )}
                </button>
                
                {isTestingMic && (
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-100"
                      style={{ width: `${Math.min(audioLevel / 50 * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              
              {micPermission === 'denied' && (
                <p className="text-sm text-red-600 mt-2">
                  Microphone access is required for translation. Please enable it in your browser settings.
                </p>
              )}
            </div>

            {/* Start Call Button */}
            <div className="text-center">
              <button
                onClick={handleStartCall}
                disabled={micPermission !== 'granted'}
                className={`inline-flex items-center px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 ${
                  micPermission === 'granted'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Phone className="w-6 h-6 mr-3" />
                Start Translation Call
              </button>
              
              {micPermission !== 'granted' && (
                <p className="text-sm text-gray-500 mt-3">
                  Please grant microphone permission to start a call
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p className="text-sm">
            Using free technologies: Web Speech API, MyMemory Translation API, and Speech Synthesis API
          </p>
        </div>
      </div>
    </div>
  );
};

export default CallSetup;