import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  getGeneralLedger,
  getTrialBalance,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlowStatement,
} from '@/lib/accountingService';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab') || 'accounts';
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const accountCode = searchParams.get('accountCode') || undefined;

  const db = getDb();

  try {
    if (tab === 'accounts') {
      const accounts = db.prepare('SELECT * FROM accounts ORDER BY account_code ASC').all();
      return NextResponse.json({ success: true, data: accounts });
    }

    if (tab === 'journals') {
      let q = `
        SELECT je.*, 
          json_group_array(
            json_object(
              'id', jl.id,
              'account_id', jl.account_id,
              'account_code', a.account_code,
              'account_name', a.account_name,
              'debit', jl.debit,
              'credit', jl.credit
            )
          ) as lines_json
        FROM journal_entries je
        JOIN journal_lines jl ON je.id = jl.journal_entry_id
        JOIN accounts a ON jl.account_id = a.id
        WHERE 1=1
      `;
      const p: any[] = [];
      if (startDate) {
        q += ` AND je.entry_date >= ?`;
        p.push(startDate);
      }
      if (endDate) {
        q += ` AND je.entry_date <= ?`;
        p.push(endDate);
      }
      q += ` GROUP BY je.id ORDER BY je.entry_date DESC, je.id DESC LIMIT 100`;

      const rows = db.prepare(q).all(...p) as any[];
      const entries = rows.map((r) => ({
        ...r,
        lines: JSON.parse(r.lines_json),
      }));

      return NextResponse.json({ success: true, data: entries });
    }

    if (tab === 'ledger') {
      const ledger = getGeneralLedger(startDate, endDate, accountCode);
      return NextResponse.json({ success: true, data: ledger });
    }

    if (tab === 'trial-balance') {
      const tb = getTrialBalance(endDate);
      return NextResponse.json({ success: true, data: tb });
    }

    if (tab === 'income-statement') {
      const is = getIncomeStatement(startDate, endDate);
      return NextResponse.json({ success: true, data: is });
    }

    if (tab === 'balance-sheet') {
      const bs = getBalanceSheet(endDate);
      return NextResponse.json({ success: true, data: bs });
    }

    if (tab === 'cash-flow') {
      const cf = getCashFlowStatement(startDate, endDate);
      return NextResponse.json({ success: true, data: cf });
    }

    return NextResponse.json({ success: false, message: 'Tab akuntansi tidak valid.' }, { status: 400 });
  } catch (error: any) {
    console.error('Accounting API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
