import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/auditService';

export async function GET() {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM bumkam_profile WHERE id = 1').get();
  return NextResponse.json({ success: true, data: profile });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Hanya Admin yang dapat mengubah profil BUMKAM.' }, { status: 403 });
  }

  try {
    const { name, village_name, address, phone } = await req.json();
    const db = getDb();

    db.prepare(`
      UPDATE bumkam_profile 
      SET name = ?, village_name = ?, address = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(name, village_name, address, phone);

    recordAuditLog({
      userId: user.id,
      action: 'UPDATE_PROFILE',
      tableName: 'bumkam_profile',
      recordId: 1,
      newData: { name, village_name, address, phone },
    });

    return NextResponse.json({ success: true, message: 'Profil BUMKAM berhasil diperbarui.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
