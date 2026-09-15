import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const customerId = Number(params.id);
  const db = getDb();

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  if (!customer) {
    return NextResponse.json({ success: false, message: 'Pelanggan tidak ditemukan.' }, { status: 404 });
  }

  // Riwayat Transaksi Pelanggan
  const transactions = db.prepare(`
    SELECT * FROM transactions 
    WHERE customer_id = ? 
    ORDER BY id DESC
  `).all(customerId);

  // Riwayat Piutang Pelanggan
  const receivables = db.prepare(`
    SELECT r.*, t.trans_no, t.trans_date 
    FROM receivables r
    JOIN transactions t ON r.transaction_id = t.id
    WHERE r.customer_id = ?
    ORDER BY r.id DESC
  `).all(customerId);

  // Riwayat Pembayaran Piutang Pelanggan
  const payments = db.prepare(`
    SELECT rp.*, r.transaction_id, t.trans_no 
    FROM receivable_payments rp
    JOIN receivables r ON rp.receivable_id = r.id
    JOIN transactions t ON r.transaction_id = t.id
    WHERE r.customer_id = ?
    ORDER BY rp.id DESC
  `).all(customerId);

  // Riwayat Mutasi Galon Pelanggan
  const gallonMovements = db.prepare(`
    SELECT * FROM galon_movements 
    WHERE customer_id = ?
    ORDER BY id DESC
  `).all(customerId);

  return NextResponse.json({
    success: true,
    data: {
      customer,
      transactions,
      receivables,
      payments,
      gallonMovements,
    },
  });
}
