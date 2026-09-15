import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { comparePassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { recordAuditLog } from '@/lib/auditService';
import { User } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username dan password wajib diisi.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username) as (User & { password_hash: string }) | undefined;

    if (!user || !comparePassword(password, user.password_hash)) {
      return NextResponse.json(
        { success: false, message: 'Username atau password salah!' },
        { status: 401 }
      );
    }

    const token = createSessionToken(user);

    recordAuditLog({
      userId: user.id,
      action: 'LOGIN',
      tableName: 'users',
      recordId: user.id,
      reason: 'User berhasil masuk sistem',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil.',
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });

    // Pasang cookie HTTP-only
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
