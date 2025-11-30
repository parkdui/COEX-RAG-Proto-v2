import { createClient } from 'redis';

// Redis 클라이언트 생성 및 연결 관리
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set');
    }
    
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    await redisClient.connect();
  }
  
  return redisClient;
}

// 유틸리티 함수들
export async function getDailyCount(date: string): Promise<number> {
  try {
    const client = await getRedisClient();
    const count = await client.get(`daily:${date}`);
    return Number(count) || 0;
  } catch (error) {
    console.error('Error getting daily count:', error);
    return 0;
  }
}

export async function incrementDailyCount(date: string): Promise<number> {
  try {
    const client = await getRedisClient();
    return await client.incr(`daily:${date}`);
  } catch (error) {
    console.error('Error incrementing daily count:', error);
    throw error;
  }
}

export async function setSessionLastActive(sessionId: string, timestamp: number): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.setEx(`session:${sessionId}`, 600, timestamp.toString()); // 10분 TTL
  } catch (error) {
    console.error('Error setting session last active:', error);
  }
}

export async function addToOnlineSessions(sessionId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.sAdd('online_sessions', sessionId);
  } catch (error) {
    console.error('Error adding to online sessions:', error);
  }
}

export async function removeFromOnlineSessions(sessionId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.sRem('online_sessions', sessionId);
  } catch (error) {
    console.error('Error removing from online sessions:', error);
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(`session:${sessionId}`);
    await client.sRem('online_sessions', sessionId);
  } catch (error) {
    console.error('Error deleting session:', error);
  }
}

export async function getConcurrentUsers(): Promise<number> {
  try {
    const client = await getRedisClient();
    const sessionIds: string[] = await client.sMembers('online_sessions');
    const now = Date.now();
    const fiveMin = 5 * 60 * 1000;
    
    let count = 0;
    const toRemove: string[] = [];
    
    for (const id of sessionIds) {
      const lastActiveStr = await client.get(`session:${id}`);
      const lastActive = Number(lastActiveStr) || 0;
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
  } catch (error) {
    console.error('Error getting concurrent users:', error);
    return 0;
  }
}

