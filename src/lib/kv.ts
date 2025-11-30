import { kv } from '@vercel/kv';

// KV 클라이언트 export
export { kv };

// 유틸리티 함수들
export async function getDailyCount(date: string): Promise<number> {
  const count = await kv.get(`daily:${date}`);
  return Number(count) || 0;
}

export async function incrementDailyCount(date: string): Promise<number> {
  return await kv.incr(`daily:${date}`);
}

export async function setSessionLastActive(sessionId: string, timestamp: number): Promise<void> {
  await kv.set(`session:${sessionId}`, timestamp, { ex: 600 }); // 10분 TTL
}

export async function addToOnlineSessions(sessionId: string): Promise<void> {
  await kv.sadd('online_sessions', sessionId);
}

export async function removeFromOnlineSessions(sessionId: string): Promise<void> {
  await kv.srem('online_sessions', sessionId);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await kv.del(`session:${sessionId}`);
  await kv.srem('online_sessions', sessionId);
}

export async function getConcurrentUsers(): Promise<number> {
  const sessionIds: string[] = await kv.smembers('online_sessions');
  const now = Date.now();
  const fiveMin = 5 * 60 * 1000;
  
  let count = 0;
  const toRemove: string[] = [];
  
  for (const id of sessionIds) {
    const lastActive = Number(await kv.get(`session:${id}`)) || 0;
    if (now - lastActive < fiveMin) {
      count++;
    } else {
      // 오래된 세션 정리
      toRemove.push(id);
    }
  }
  
  // 오래된 세션 일괄 제거
  if (toRemove.length > 0) {
    await Promise.all(
      toRemove.map(id => deleteSession(id))
    );
  }
  
  return count;
}

