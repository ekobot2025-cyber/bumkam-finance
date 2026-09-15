import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { voidTransaction } from '@/lib/transactionService';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  // Hanya Admin yang memiliki hak pembatalan transaksi
  if (user.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Hanya Administrator yang memiliki wewenang membatalkan transaksi (VOID).' },
      { status: 403 }
    );
  }

  try {
    const transactionId = Number(params.id);
    const { reason } = await req.json();

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Alasan pembatalan (Void Reason) wajib diisi untuk audit trail.' },
        { status: 400 }
      );
    }

    const result = voidTransaction(transactionId, reason.trim(), user.id);

    return NextResponse.json({
      success: true,
      message: 'Transaksi berhasil dibatalkan (VOID). Stok, kas/piutang, dan jurnal pembalik telah diproses.',
      data: result,
    });
  } catch (error: any) {
    console.error('Void transaction error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
