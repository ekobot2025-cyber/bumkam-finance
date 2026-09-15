import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import getDb from './db';
import { User } from './types';

const SESSION_COOKIE_NAME = 'bumkam_session';

export function hashPassword(plainText: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plainText, salt);
}

export function comparePassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}

export function createSessionToken(user: User): string {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    createdAt: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function parseSessionToken(token: string): { userId: number; username: string; role: string } | null {
  try {
    const jsonStr = Buffer.from(token, 'base64').toString('utf-8');
    const data = JSON.parse(jsonStr);
    if (!data.userId || !data.role) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) return null;

  const parsed = parseSessionToken(sessionCookie.value);
  if (!parsed) return null;

  const db = getDb();
  const user = db.prepare('SELECT id, username, full_name, role, is_active, created_at FROM users WHERE id = ? AND is_active = 1').get(parsed.userId) as User | undefined;
  return user || null;
}

export { SESSION_COOKIE_NAME };
