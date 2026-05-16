import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-please-change-in-production'
);

export interface JwtPayload {
  sub: string; // user id
  email: string;
  name: string;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(req?: NextRequest): Promise<JwtPayload | null> {
  let token: string | undefined;

  if (req) {
    // API routes — get from cookie or Authorization header
    token = req.cookies.get('auth_token')?.value;
    if (!token) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }
  } else {
    // Server components — get from cookies()
    try {
      token = cookies().get('auth_token')?.value;
    } catch {
      return null;
    }
  }

  if (!token) return null;
  return verifyToken(token);
}

export function setAuthCookie(token: string): string {
  return `auth_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`;
}

export function clearAuthCookie(): string {
  return `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
