import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Hanya Admin yang berhak melihat audit log.' }, { status: 403 });
  }

  const db = getDb();
  const logs = db.prepare(`
    SELECT al.*, u.username, u.full_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.id DESC
    LIMIT 200
  `).all();

  return NextResponse.json({ success: true, data: logs });
}
