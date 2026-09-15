import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordPulsaSale } from '@/lib/transactionService';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const {
      trans_date,
      customer_id,
      phone_number,
      provider,
      nominal,
      cogs_price,
      selling_price,
      payment_method,
      notes,
    } = body;

    const result = recordPulsaSale({
      trans_date: trans_date || new Date().toISOString().split('T')[0],
      customer_id: customer_id ? Number(customer_id) : null,
      phone_number,
      provider,
      nominal: Number(nominal),
      cogs_price: Number(cogs_price),
      selling_price: Number(selling_price),
      payment_method: payment_method || 'cash',
      notes,
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Penjualan pulsa berhasil dicatat. Margin: Rp${result.margin.toLocaleString('id-ID')}`,
      data: result,
    });
  } catch (error: any) {
    console.error('Pulsa sell error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
