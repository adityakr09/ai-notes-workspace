import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, clearAuthCookie } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function GET(req: NextRequest) {
  const payload = await getAuthUser(req);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = getUserById(payload.sub);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}

export async function DELETE() {
  return NextResponse.json(
    { message: 'Logged out' },
    { headers: { 'Set-Cookie': clearAuthCookie() } }
  );
}
