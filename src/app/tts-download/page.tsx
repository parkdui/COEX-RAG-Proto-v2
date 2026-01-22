'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

export default function TTSDownloadPage() {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [ttsType, setTtsType] = useState<'clova' | 'siren'>('siren');
  const [speaker, setSpeaker] = useState('xsori');
  const [speed, setSpeed] = useState('0');
  const [volume, setVolume] = useState('0');

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('텍스트를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioUrl(null);

    try {
      const apiUrl = ttsType === 'siren' ? '/api/tts-siren' : '/api/tts';
      
      const requestBody: any = {
        text: text.trim(),
        format: 'mp3',
      };

      if (ttsType === 'siren') {
        requestBody.speaker = speaker;
        requestBody.speed = parseInt(speed);
        requestBody.volume = parseInt(volume);
      } else {
        requestBody.speaker = speaker === 'xsori' ? 'vyuna' : speaker;
        requestBody.speed = speed;
        requestBody.volume = volume;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS 생성 실패: ${response.status} ${errorText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TTS 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `tts_${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-2">TTS 음성 파일 생성</h1>
          <p className="text-gray-300 mb-8">원하는 문구를 입력하고 음성 파일을 다운로드하세요.</p>

          {/* TTS 타입 선택 */}
          <div className="mb-6">
            <label className="block text-white mb-2">TTS 엔진</label>
            <div className="flex gap-4">
              <button
                onClick={() => setTtsType('siren')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  ttsType === 'siren'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Siren TTS
              </button>
              <button
                onClick={() => setTtsType('clova')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  ttsType === 'clova'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                CLOVA Voice
              </button>
            </div>
          </div>

          {/* 텍스트 입력 */}
          <div className="mb-6">
            <label className="block text-white mb-2">텍스트 입력</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="음성으로 변환할 텍스트를 입력하세요..."
              className="w-full min-h-[150px] bg-white/10 border-white/20 text-white placeholder-gray-400"
              rows={6}
            />
          </div>

          {/* 설정 옵션 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-white mb-2 text-sm">화자</label>
              <select
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
              >
                {ttsType === 'siren' ? (
                  <>
                    <option value="xsori">xsori</option>
                  </>
                ) : (
                  <>
                    <option value="vyuna">vyuna</option>
                    <option value="nara">nara</option>
                    <option value="nhajun">nhajun</option>
                    <option value="ndain">ndain</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-white mb-2 text-sm">속도</label>
              <input
                type="range"
                min="-5"
                max="5"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                className="w-full"
              />
              <div className="text-gray-400 text-xs mt-1">{speed}</div>
            </div>
            <div>
              <label className="block text-white mb-2 text-sm">볼륨</label>
              <input
                type="range"
                min="-5"
                max="5"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full"
              />
              <div className="text-gray-400 text-xs mt-1">{volume}</div>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* 생성 버튼 */}
          <div className="flex gap-4 mb-6">
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !text.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '생성 중...' : '음성 생성'}
            </Button>
          </div>

          {/* 오디오 플레이어 및 다운로드 */}
          {audioUrl && (
            <div className="mt-6 p-6 bg-white/5 rounded-lg border border-white/10">
              <div className="mb-4">
                <audio controls src={audioUrl} className="w-full">
                  브라우저가 오디오 재생을 지원하지 않습니다.
                </audio>
              </div>
              <Button
                onClick={handleDownload}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                다운로드
              </Button>
            </div>
          )}

          {/* 사용 방법 안내 */}
          <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-white font-semibold mb-2">사용 방법</h3>
            <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
              <li>텍스트를 입력하고 &quot;음성 생성&quot; 버튼을 클릭하세요.</li>
              <li>생성된 음성을 미리 들어볼 수 있습니다.</li>
              <li>&quot;다운로드&quot; 버튼을 클릭하여 MP3 파일로 저장하세요.</li>
              <li>API 직접 호출: <code className="bg-white/10 px-2 py-1 rounded">GET /api/tts-siren?text=안녕하세요</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
