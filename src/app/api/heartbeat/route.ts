import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { 
  setSessionLastActive, 
  addToOnlineSessions 
} from '@/lib/kv';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session ID' },
        { status: 400 }
      );
    }
    
    const now = Date.now();
    await setSessionLastActive(sessionId, now);
    await addToOnlineSessions(sessionId);
    
    return NextResponse.json(
      { success: true, timestamp: now },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error in /api/heartbeat:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}







