import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/utils';

// CLOVA Voice API 설정 (CSR 환경 변수 사용)
const CLOVA_VOICE_CLIENT_ID = getEnv("CLOVA_CSR_API_KEY_ID");
const CLOVA_VOICE_CLIENT_SECRET = getEnv("CLOVA_CSR_API_KEY_SECRET");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, speaker = 'nara', speed = '0', pitch = '0', volume = '0', format = 'mp3' } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'text parameter is required' }, { status: 400 });
    }

    if (!CLOVA_VOICE_CLIENT_ID || !CLOVA_VOICE_CLIENT_SECRET) {
      return NextResponse.json({ 
        error: 'CLOVA Voice API credentials not configured. Please set CLOVA_CSR_API_KEY_ID and CLOVA_CSR_API_KEY_SECRET environment variables.' 
      }, { status: 500 });
    }

    // CLOVA Voice API 호출
    const apiUrl = 'https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts';
    
    const formData = new URLSearchParams();
    formData.append('speaker', speaker);
    formData.append('volume', volume);
    formData.append('speed', speed);
    formData.append('pitch', pitch);
    formData.append('text', text);
    formData.append('format', format);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': CLOVA_VOICE_CLIENT_ID,
        'X-NCP-APIGW-API-KEY': CLOVA_VOICE_CLIENT_SECRET,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CLOVA Voice API error:', response.status, errorText);
      return NextResponse.json({ 
        error: `CLOVA Voice API failed: ${response.status} ${errorText}` 
      }, { status: response.status });
    }

    // 오디오 데이터를 Buffer로 변환
    const audioBuffer = await response.arrayBuffer();
    
    // 응답 헤더 설정
    const headers = new Headers();
    headers.set('Content-Type', 'audio/mpeg');
    headers.set('Content-Length', audioBuffer.byteLength.toString());
    headers.set('Cache-Control', 'no-cache');

    return new NextResponse(audioBuffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ 
      error: `TTS processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}

// GET 요청으로 TTS 테스트
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const text = url.searchParams.get('text') || '안녕하세요! COEX 이벤트 안내 AI입니다.';
  
  try {
    const response = await POST(new NextRequest(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    }));

    return response;
  } catch (error) {
    return NextResponse.json({ 
      error: `TTS test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
