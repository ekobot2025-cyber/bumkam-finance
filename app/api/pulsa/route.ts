import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Saldo Pulsa saat ini
  const balRow = db.prepare(`SELECT current_balance, last_updated FROM pulsa_balances ORDER BY id DESC LIMIT 1`).get() as any;
  const currentBalance = balRow ? balRow.current_balance : 0;

  // Riwayat Transaksi Pulsa (Penjualan & Top Up)
  const transactions = db.prepare(`
    SELECT 
      t.id,
      t.trans_no,
      t.trans_date,
      t.trans_type,
      t.payment_method,
      t.subtotal,
      t.cogs_amount,
      t.margin_amount,
      t.status,
      t.notes,
      c.name as customer_name,
      p.phone_number,
      p.provider,
      p.nominal,
      u.full_name as created_by_name
    FROM transactions t
    LEFT JOIN customers c ON t.customer_id = c.id
    LEFT JOIN pulsa_details p ON t.id = p.transaction_id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.unit_code = 'PULSA'
    ORDER BY t.id DESC
    LIMIT 50
  `).all();

  // Rekap Margin & Penjualan Bulan Ini
  const currentMonth = new Date().toISOString().substring(0, 7);
  const rekapRow = db.prepare(`
    SELECT 
      COALESCE(SUM(subtotal), 0) as total_sales,
      COALESCE(SUM(cogs_amount), 0) as total_cogs,
      COALESCE(SUM(margin_amount), 0) as total_margin,
      COUNT(*) as total_count
    FROM transactions
    WHERE unit_code = 'PULSA' AND trans_type = 'sale_pulsa' AND status = 'posted'
      AND trans_date LIKE ? || '%'
  `).get(currentMonth) as any;

  return NextResponse.json({
    success: true,
    data: {
      currentBalance,
      lastUpdated: balRow?.last_updated,
      rekap: rekapRow,
      transactions,
    },
  });
}
