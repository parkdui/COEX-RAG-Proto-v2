import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { 
  incrementDailyCount, 
  getDailyCount, 
  setSessionLastActive, 
  addToOnlineSessions,
  getConcurrentUsers
} from '@/lib/kv';
import { randomBytes } from 'crypto';

// 설정값
const DAILY_LIMIT = 1000;
const CONCURRENT_LIMIT = 100; // 동시 접속 제한

export async function GET() {
  try {
    const cookieStore = await cookies();
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    
    // 1. 1일 1회 제한 체크
    const usedToday = cookieStore.get('used_today')?.value;
    if (usedToday === today) {
      return NextResponse.json(
        { 
          allowed: false, 
          reason: 'ONCE_PER_DAY',
          message: '오늘은 이미 이용하셨습니다. 내일 다시 이용해 주세요.'
        },
        { status: 200 }
      );
    }
    
    // 2. 동시 접속량 체크 (먼저 체크하여 불필요한 카운트 증가 방지)
    const concurrentUsers = await getConcurrentUsers();
    if (concurrentUsers >= CONCURRENT_LIMIT) {
      return NextResponse.json(
        { 
          allowed: false, 
          reason: 'CONCURRENCY_LIMIT',
          message: '현재 접속이 많습니다. 잠시 후 다시 이용해 주세요.',
          concurrentUsers
        },
        { status: 200 }
      );
    }
    
    // 3. 일일 접속량 체크
    const visitedDate = cookieStore.get('visited_date')?.value;
    let total = 0;
    
    if (visitedDate !== today) {
      // 오늘 처음 방문
      total = await incrementDailyCount(today);
      
      // visited_date 쿠키 설정
      cookieStore.set('visited_date', today, { 
        maxAge: 60 * 60 * 24, // 24시간
        httpOnly: false,
        sameSite: 'lax'
      });
    } else {
      // 오늘 이미 방문했지만 used_today는 아님 (재진입)
      total = await getDailyCount(today);
    }
    
    if (total > DAILY_LIMIT) {
      return NextResponse.json(
        { 
          allowed: false, 
          reason: 'DAILY_LIMIT',
          message: '오늘 이용 인원이 모두 찼습니다. 내일 다시 이용해 주세요.',
          total
        },
        { status: 200 }
      );
    }
    
    // 4. 세션 발급
    let sessionId = cookieStore.get('session_id')?.value;
    if (!sessionId) {
      sessionId = randomBytes(16).toString('hex');
      cookieStore.set('session_id', sessionId, {
        maxAge: 60 * 60 * 24, // 24시간
        httpOnly: false,
        sameSite: 'lax'
      });
    }
    
    // 5. 세션 활성화
    const now = Date.now();
    await setSessionLastActive(sessionId, now);
    await addToOnlineSessions(sessionId);
    
    // 6. used_today 쿠키 설정 (1일 1회 제한)
    cookieStore.set('used_today', today, {
      maxAge: 60 * 60 * 24, // 24시간
      httpOnly: false,
      sameSite: 'lax'
    });
    
    return NextResponse.json({
      allowed: true,
      total,
      concurrentUsers: await getConcurrentUsers(),
      sessionId
    });
    
  } catch (error) {
    console.error('Error in /api/enter:', error);
    return NextResponse.json(
      { 
        allowed: false, 
        reason: 'SERVER_ERROR',
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      },
      { status: 500 }
    );
  }
}

