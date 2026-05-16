import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createUser, getUserByEmail } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const existing = getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already in use.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = createUser(`USR_${nanoid(12)}`, name, email, passwordHash);

    const token = await signToken({ sub: user.id, email: user.email, name: user.name });

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      {
        status: 201,
        headers: { 'Set-Cookie': setAuthCookie(token) },
      }
    );
  } catch (err) {
    console.error('[signup]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
