import { NextRequest, NextResponse } from 'next/server';
import { credentials } from '@/lib/courses';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body;

  if (username === credentials.username && password === credentials.password) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    return response;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
