import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const token = await signToken({ sub: user.id, email: user.email, name: user.name });

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { headers: { 'Set-Cookie': setAuthCookie(token) } }
    );
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
