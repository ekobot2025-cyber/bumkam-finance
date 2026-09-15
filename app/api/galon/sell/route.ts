import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordGalonSale } from '@/lib/transactionService';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const {
      trans_date,
      customer_id,
      qty,
      unit_price,
      payment_method,
      gallon_action,
      notes,
    } = body;

    const result = recordGalonSale({
      trans_date: trans_date || new Date().toISOString().split('T')[0],
      customer_id: customer_id ? Number(customer_id) : null,
      qty: Number(qty),
      unit_price: Number(unit_price),
      payment_method: payment_method || 'cash',
      gallon_action: gallon_action || 'exchange',
      notes,
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Penjualan galon berhasil dicatat. Total: Rp${result.total.toLocaleString('id-ID')}`,
      data: result,
    });
  } catch (error: any) {
    console.error('Galon sell error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
