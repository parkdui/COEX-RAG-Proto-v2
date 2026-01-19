import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

// Siren TTS API 설정 
const SIREN_GW_BASE_URL = 'https://public-stage-siren-gw.io.naver.com';
const SIREN_GW_PATH = '/tts/makeTTS';
const X_NAVER_SVCID = 'coex';
const X_CONSUMER_ID = 'siren-gw.coex';
const HMAC_KEY = 'OZKCBgilLC0dXQcbtXfWdQnEvkh3BrgUO2pEMq2sBCQrePSQWRE3AhbgrldHBdbl';
const DEFAULT_SPEAKER = 'xsori';

/**
 * HMAC SHA1 생성 함수
 * @param secretKey HMAC 키
 * @param data 서명할 데이터
 * @returns Base64로 인코딩된 HMAC 값
 */
function generateHmac(secretKey: string, data: string): string {
  const hmac = createHmac('sha1', secretKey);
  hmac.update(data);
  return hmac.digest('base64');
}

/**
 * Siren TTS API 인증 헤더 생성
 * @returns 인증 헤더 객체
 */
function generateAuthHeaders(): Record<string, string> {
  const msgpad = Date.now().toString();
  const hmacUrl = SIREN_GW_BASE_URL + SIREN_GW_PATH;
  // hmacUrl을 최대 255자로 제한
  const hmacUrlLimited = hmacUrl.substring(0, 255);
  const dataToSign = hmacUrlLimited + msgpad;
  const md = generateHmac(HMAC_KEY, dataToSign);

  // 디버깅을 위한 로그
  console.log('HMAC Debug:', {
    hmacUrl,
    hmacUrlLimited,
    msgpad,
    dataToSign,
    md,
    hmacKeyLength: HMAC_KEY.length,
  });

  // PDF의 curl 예제를 보면 x-naver-svcid를 사용하지만, 표에서는 x-naversvcid로 되어 있음
  // curl 예제를 따라 x-naver-svcid 사용
  return {
    'x-naver-svcid': X_NAVER_SVCID,
    'x-consumer-id': X_CONSUMER_ID,
    'x-hmac-msgpad': msgpad,
    'x-hmac-md': `v0:${md}`,
  };
}

/**
 * Siren TTS API 호출
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      speaker = DEFAULT_SPEAKER,
      speed = 0,
      volume = 0,
      alpha = 0,
      format = 'mp3',
    } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'text parameter is required' },
        { status: 400 }
      );
    }

    // 인증 헤더 생성
    const authHeaders = generateAuthHeaders();
    
    // 디버깅: 헤더 확인
    console.log('Auth Headers:', authHeaders);

    // 요청 파라미터 구성
    const formData = new URLSearchParams();
    formData.append('speaker', speaker);
    formData.append('text', text);
    if (speed !== undefined) {
      formData.append('speed', speed.toString());
    }
    if (volume !== undefined) {
      formData.append('volume', volume.toString());
    }
    if (alpha !== undefined) {
      formData.append('alpha', alpha.toString());
    }
    if (format !== undefined) {
      formData.append('format', format);
    }

    // Siren TTS API 호출
    const apiUrl = `${SIREN_GW_BASE_URL}${SIREN_GW_PATH}`;
    const requestStartTime = Date.now();
    console.log('[Siren TTS] API request started:', { 
      textLength: text.length,
      speaker,
      speed,
      volume,
      alpha,
      format 
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...authHeaders,
      },
      body: formData,
      // Next.js fetch는 기본적으로 타임아웃이 없으므로 signal을 사용할 수도 있지만,
      // 여기서는 외부 API 호출이므로 긴 타임아웃을 허용
    });
    
    const requestElapsedTime = Date.now() - requestStartTime;
    console.log('[Siren TTS] API response received:', { 
      status: response.status,
      elapsedTime: `${requestElapsedTime}ms`
    });

    if (!response.ok) {
      const errorText = await response.text();
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.error('Siren TTS API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        responseHeaders,
        requestHeaders: authHeaders,
      });
      return NextResponse.json(
        {
          error: `Siren TTS API failed: ${response.status} ${errorText}`,
        },
        { status: response.status }
      );
    }

    // 오디오 데이터를 Buffer로 변환
    const bufferStartTime = Date.now();
    const audioBuffer = await response.arrayBuffer();
    const bufferElapsedTime = Date.now() - bufferStartTime;
    const totalElapsedTime = Date.now() - requestStartTime;
    
    console.log('[Siren TTS] Audio buffer received:', {
      bufferSize: audioBuffer.byteLength,
      bufferTime: `${bufferElapsedTime}ms`,
      totalTime: `${totalElapsedTime}ms`
    });

    // Content-Type 결정 (format에 따라)
    const contentType =
      format === 'wav' ? 'audio/wav' : 'audio/mpeg';

    // 응답 헤더 설정
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', audioBuffer.byteLength.toString());
    headers.set('Cache-Control', 'no-cache');

    return new NextResponse(audioBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Siren TTS API error:', error);
    return NextResponse.json(
      {
        error: `TTS processing failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET 요청으로 TTS 테스트
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const text =
    url.searchParams.get('text') || '안녕하세요! COEX 이벤트 안내 AI입니다.';

  try {
    const response = await POST(
      new NextRequest(request.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
    );

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: `TTS test failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
      { status: 500 }
    );
  }
}
