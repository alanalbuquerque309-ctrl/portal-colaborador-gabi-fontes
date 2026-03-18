import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set('admin_session', '', { maxAge: 0, path: '/' });
  return NextResponse.redirect(new URL('/admin', process.env.VERCEL_URL || 'http://localhost:3000'));
}
