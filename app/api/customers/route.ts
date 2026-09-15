import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/auditService';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const customers = db.prepare(`
    SELECT * FROM customers 
    ORDER BY name ASC
  `).all();

  return NextResponse.json({ success: true, data: customers });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const { name, phone, address } = await req.json();
    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, message: 'Nama pelanggan wajib diisi.' }, { status: 400 });
    }

    const db = getDb();
    // Generate kode pelanggan CUST-XXXX
    const countRow = db.prepare('SELECT COUNT(*) as cnt FROM customers').get() as { cnt: number };
    const code = `CUST-${(countRow.cnt + 1).toString().padStart(4, '0')}`;

    const res = db.prepare(`
      INSERT INTO customers (code, name, phone, address, gallon_balance, total_receivable, is_active)
      VALUES (?, ?, ?, ?, 0, 0.00, 1)
    `).run(code, name.trim(), phone || null, address || null);
    const newId = Number(res.lastInsertRowid);

    recordAuditLog({
      userId: user.id,
      action: 'CREATE_CUSTOMER',
      tableName: 'customers',
      recordId: newId,
      newData: { code, name },
    });

    return NextResponse.json({
      success: true,
      message: 'Pelanggan berhasil ditambahkan.',
      data: { id: newId, code, name },
    });
  } catch (error: any) {
    console.error('Create customer error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
