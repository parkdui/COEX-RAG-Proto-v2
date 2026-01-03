import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/kv';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;
    
    if (sessionId) {
      await deleteSession(sessionId);
    }
    
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error in /api/leave:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
















