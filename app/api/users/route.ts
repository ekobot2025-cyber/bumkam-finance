import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { recordAuditLog } from '@/lib/auditService';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  const db = getDb();
  const users = db.prepare('SELECT id, username, full_name, role, is_active, created_at FROM users').all();
  return NextResponse.json({ success: true, data: users });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { username, password, full_name, role } = await req.json();
    if (!username || !password || !full_name) {
      return NextResponse.json({ success: false, message: 'Data belum lengkap.' }, { status: 400 });
    }

    const db = getDb();
    const hash = hashPassword(password);

    const res = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(username.trim(), hash, full_name.trim(), role || 'operator');

    recordAuditLog({
      userId: user.id,
      action: 'CREATE_USER',
      tableName: 'users',
      recordId: Number(res.lastInsertRowid),
      newData: { username, full_name, role },
    });

    return NextResponse.json({ success: true, message: 'Pengguna baru berhasil ditambahkan.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
