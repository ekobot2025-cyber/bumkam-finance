import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Inventaris Galon saat ini
  const invRow = db.prepare(`SELECT * FROM galon_inventory ORDER BY id DESC LIMIT 1`).get() as any;

  // Riwayat Penjualan Galon
  const transactions = db.prepare(`
    SELECT 
      t.id,
      t.trans_no,
      t.trans_date,
      t.payment_method,
      t.subtotal,
      t.status,
      t.notes,
      c.name as customer_name,
      gm.qty,
      u.full_name as created_by_name
    FROM transactions t
    LEFT JOIN customers c ON t.customer_id = c.id
    LEFT JOIN galon_movements gm ON t.id = gm.transaction_id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.unit_code = 'GALON' AND t.trans_type = 'sale_galon'
    ORDER BY t.id DESC
    LIMIT 50
  `).all();

  // Riwayat Mutasi Galon Keseluruhan
  const movements = db.prepare(`
    SELECT 
      gm.id,
      gm.movement_type,
      gm.qty,
      gm.notes,
      gm.created_at,
      c.name as customer_name,
      t.trans_no
    FROM galon_movements gm
    LEFT JOIN customers c ON gm.customer_id = c.id
    LEFT JOIN transactions t ON gm.transaction_id = t.id
    ORDER BY gm.id DESC
    LIMIT 50
  `).all();

  return NextResponse.json({
    success: true,
    data: {
      inventory: invRow || { available_qty: 0, customer_held_qty: 0, damaged_lost_qty: 0 },
      transactions,
      movements,
    },
  });
}
