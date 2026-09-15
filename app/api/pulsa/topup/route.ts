import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordPulsaTopup } from '@/lib/transactionService';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { trans_date, nominal_saldo, cost_price, payment_method, notes } = body;

    const result = recordPulsaTopup({
      trans_date: trans_date || new Date().toISOString().split('T')[0],
      nominal_saldo: Number(nominal_saldo),
      cost_price: Number(cost_price),
      payment_method: payment_method || 'cash',
      notes,
      created_by: user.id,
    });

    return NextResponse.json({ success: true, message: 'Saldo pulsa berhasil ditambahkan.', data: result });
  } catch (error: any) {
    console.error('Pulsa topup error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
