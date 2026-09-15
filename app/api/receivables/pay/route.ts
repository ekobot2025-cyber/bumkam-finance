import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordReceivablePayment } from '@/lib/transactionService';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { receivable_id, payment_date, amount, payment_method, notes } = body;

    const result = recordReceivablePayment({
      receivable_id: Number(receivable_id),
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      amount: Number(amount),
      payment_method: payment_method || 'cash',
      notes,
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Pembayaran piutang berhasil dicatat (${result.payNo}). Sisa: Rp${result.remaining.toLocaleString('id-ID')} (Status: ${result.status}).`,
      data: result,
    });
  } catch (error: any) {
    console.error('Receivable pay error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
