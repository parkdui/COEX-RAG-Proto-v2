import { createClient } from 'redis';
import { NextResponse } from 'next/server';

export async function GET() {
  let client: ReturnType<typeof createClient> | null = null;
  
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return NextResponse.json({
        success: false,
        error: 'REDIS_URL environment variable is not set'
      }, { status: 500 });
    }
    
    // Redis 클라이언트 생성 및 연결
    client = createClient({ url: redisUrl });
    await client.connect();
    
    // 테스트: 값 저장
    await client.set('test-key', 'test-value');
    
    // 테스트: 값 가져오기
    const value = await client.get('test-key');
    
    return NextResponse.json({
      success: true,
      value,
      message: 'Redis 연결 성공!'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    // 연결 종료
    if (client) {
      try {
        await client.quit();
      } catch (e) {
        // 연결 종료 중 에러는 무시
      }
    }
  }
}

