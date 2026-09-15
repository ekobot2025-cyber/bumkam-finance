import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordGalonMovement } from '@/lib/transactionService';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { movement_type, customer_id, qty, notes } = body;

    const result = recordGalonMovement({
      movement_type,
      customer_id: customer_id ? Number(customer_id) : null,
      qty: Number(qty),
      notes,
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Pergerakan galon berhasil dicatat.',
      data: result,
    });
  } catch (error: any) {
    console.error('Galon movement error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
