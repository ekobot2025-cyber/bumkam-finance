import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status');

  const db = getDb();
  let query = `
    SELECT 
      r.id,
      r.transaction_id,
      r.customer_id,
      r.total_amount,
      r.paid_amount,
      r.remaining_amount,
      r.due_date,
      r.status,
      r.created_at,
      t.trans_no,
      t.trans_date,
      t.unit_code,
      c.name as customer_name,
      c.phone as customer_phone
    FROM receivables r
    JOIN transactions t ON r.transaction_id = t.id
    JOIN customers c ON r.customer_id = c.id
    WHERE t.status != 'void'
  `;
  const params: any[] = [];

  if (statusFilter && statusFilter !== 'all') {
    query += ` AND r.status = ?`;
    params.push(statusFilter);
  }

  query += ` ORDER BY r.remaining_amount DESC, r.id DESC`;

  const receivables = db.prepare(query).all(...params);

  // Rekap Piutang
  const rekap = db.prepare(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as total_piutang,
      COALESCE(SUM(paid_amount), 0) as total_dibayar,
      COALESCE(SUM(remaining_amount), 0) as total_sisa
    FROM receivables r
    JOIN transactions t ON r.transaction_id = t.id
    WHERE t.status != 'void'
  `).get() as any;

  return NextResponse.json({
    success: true,
    data: {
      receivables,
      rekap,
    },
  });
}
