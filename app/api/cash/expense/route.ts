import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordCashExpense } from '@/lib/transactionService';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { trans_date, account_code, amount, description } = body;

    const result = recordCashExpense({
      trans_date: trans_date || new Date().toISOString().split('T')[0],
      account_code: account_code || '6199',
      amount: Number(amount),
      description,
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Pengeluaran kas operasional berhasil dicatat.',
      data: result,
    });
  } catch (error: any) {
    console.error('Cash expense error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
