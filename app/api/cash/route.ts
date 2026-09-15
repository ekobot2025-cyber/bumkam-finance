import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Hitung Saldo Kas
  const inRow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM cash_transactions WHERE flow_type = 'in'`).get() as { total: number };
  const outRow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM cash_transactions WHERE flow_type = 'out'`).get() as { total: number };
  const balance = inRow.total - outRow.total;

  // Riwayat Kas
  const transactions = db.prepare(`
    SELECT ct.*, u.full_name as created_by_name
    FROM cash_transactions ct
    LEFT JOIN users u ON ct.created_by = u.id
    ORDER BY ct.id DESC
    LIMIT 100
  `).all();

  return NextResponse.json({
    success: true,
    data: {
      balance,
      totalIn: inRow.total,
      totalOut: outRow.total,
      transactions,
    },
  });
}
