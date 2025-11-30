import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 테스트: 값 저장
    await kv.set('test-key', 'test-value');
    
    // 테스트: 값 가져오기
    const value = await kv.get('test-key');
    
    return NextResponse.json({
      success: true,
      value,
      message: 'KV 연결 성공!'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

