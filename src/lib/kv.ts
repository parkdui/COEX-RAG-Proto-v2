import { kv } from '@vercel/kv';
import { getEnv } from './utils';

function getKVClient() {
  const kvUrl = getEnv('KV_REST_API_URL');
  const kvToken = getEnv('KV_REST_API_TOKEN');
  
  // 환경 변수가 없거나 플레이스홀더 값인 경우 null 반환
  if (!kvUrl || !kvToken) {
    return null;
  }
  
  // 플레이스홀더 값 체크
  if (
    kvUrl.includes('your_kv_rest_api_url_here') ||
    kvUrl.includes('placeholder') ||
    kvToken.includes('your_kv_rest_api_token_here') ||
    kvToken.includes('placeholder')
  ) {
    return null;
  }
  
  // URL이 유효한 형식인지 확인 (https로 시작해야 함)
  if (!kvUrl.startsWith('https://')) {
    return null;
  }
  
  return kv;
}

const DAILY_COUNT_PREFIX = 'daily_count:';
const SESSION_PREFIX = 'session:';
const ONLINE_SESSIONS_KEY = 'online_sessions';

export async function incrementDailyCount(date: string): Promise<number> {
  const client = getKVClient();
  if (!client) {
    return 0;
  }

  try {
    const key = `${DAILY_COUNT_PREFIX}${date}`;
    const current = await client.get<number>(key);
    const count = (current || 0) + 1;
    await client.set(key, count, { ex: 86400 * 2 });
    return count;
  } catch (error) {
    console.error('Error incrementing daily count:', error);
    return 0;
  }
}

export async function getDailyCount(date: string): Promise<number> {
  const client = getKVClient();
  if (!client) {
    return 0;
  }

  try {
    const key = `${DAILY_COUNT_PREFIX}${date}`;
    const current = await client.get<number>(key);
    return current || 0;
  } catch (error) {
    console.error('Error getting daily count:', error);
    return 0;
  }
}

export async function setSessionLastActive(sessionId: string, timestamp: number): Promise<void> {
  const client = getKVClient();
  if (!client) {
    return;
  }

  try {
    const key = `${SESSION_PREFIX}${sessionId}`;
    await client.set(key, timestamp, { ex: 86400 });
  } catch (error) {
    console.error('Error setting session last active:', error);
  }
}

export async function addToOnlineSessions(sessionId: string): Promise<void> {
  const client = getKVClient();
  if (!client) {
    return;
  }

  try {
    const onlineSessions = await getOnlineSessions();
    if (!onlineSessions.includes(sessionId)) {
      onlineSessions.push(sessionId);
      await client.set(ONLINE_SESSIONS_KEY, onlineSessions, { ex: 86400 });
    }
  } catch (error) {
    console.error('Error adding to online sessions:', error);
  }
}

async function getOnlineSessions(): Promise<string[]> {
  const client = getKVClient();
  if (!client) {
    return [];
  }

  try {
    const data = await client.get<string[]>(ONLINE_SESSIONS_KEY);
    return data || [];
  } catch (error) {
    console.error('Error getting online sessions:', error);
    return [];
  }
}

export async function getConcurrentUsers(): Promise<number> {
  const client = getKVClient();
  if (!client) {
    return 0;
  }

  try {
    const onlineSessions = await getOnlineSessions();
    const now = Date.now();
    const activeSessions: string[] = [];

    for (const sessionId of onlineSessions) {
      const key = `${SESSION_PREFIX}${sessionId}`;
      const lastActive = await client.get<number>(key);
      
      if (lastActive) {
        const inactiveTime = now - lastActive;
        if (inactiveTime < 60000) {
          activeSessions.push(sessionId);
        }
      }
    }

    if (activeSessions.length !== onlineSessions.length) {
      await client.set(ONLINE_SESSIONS_KEY, activeSessions, { ex: 86400 });
    }

    return activeSessions.length;
  } catch (error) {
    console.error('Error getting concurrent users:', error);
    return 0;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const client = getKVClient();
  if (!client) {
    return;
  }

  try {
    const key = `${SESSION_PREFIX}${sessionId}`;
    await client.del(key);

    const onlineSessions = await getOnlineSessions();
    const filtered = onlineSessions.filter(id => id !== sessionId);
    if (filtered.length !== onlineSessions.length) {
      await client.set(ONLINE_SESSIONS_KEY, filtered, { ex: 86400 });
    }
  } catch (error) {
    console.error('Error deleting session:', error);
  }
}
