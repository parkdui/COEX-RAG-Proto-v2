import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 환경 변수 확인
    const apiKeyId = process.env.CLOVA_CSR_API_KEY_ID;
    const apiKeySecret = process.env.CLOVA_CSR_API_KEY_SECRET;

    if (!apiKeyId || !apiKeySecret) {
      return NextResponse.json(
        { error: 'CLOVA CSR API 키가 설정되지 않았습니다. .env 파일에 CLOVA_CSR_API_KEY_ID와 CLOVA_CSR_API_KEY_SECRET을 설정해주세요.' },
        { status: 500 }
      );
    }

    // 요청에서 오디오 데이터 추출
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: '오디오 파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 오디오 파일을 ArrayBuffer로 변환
    const audioBuffer = await audioFile.arrayBuffer();

    // CLOVA CSR API 호출 (Kor 언어 코드 사용)
    const csrUrl = 'https://naveropenapi.apigw.ntruss.com/recog/v1/stt?lang=Kor';
    const csrResponse = await fetch(csrUrl, {
      method: 'POST',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': apiKeyId,
        'X-NCP-APIGW-API-KEY': apiKeySecret,
        'Content-Type': 'application/octet-stream',
      },
      body: audioBuffer,
    });

    if (!csrResponse.ok) {
      const errorText = await csrResponse.text();
      console.error('CLOVA CSR API 오류:', csrResponse.status, errorText);
      
      return NextResponse.json(
        { 
          error: `음성 인식 API 오류: ${csrResponse.status}`,
          details: errorText
        },
        { status: csrResponse.status }
      );
    }

    const result = await csrResponse.json();

    return NextResponse.json({
      success: true,
      text: result.text || '',
      confidence: result.confidence || 0,
    });

  } catch (error) {
    console.error('STT 처리 중 오류:', error);
    return NextResponse.json(
      { error: '음성 인식 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
