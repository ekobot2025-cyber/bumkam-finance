import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cash_balance, pulsa_balance, galon_available, galon_held, notes } = body;

    const db = getDb();

    const currentCashRes = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN flow_type = 'in' THEN amount ELSE -amount END), 0) as balance 
      FROM cash_transactions
    `).get() as any;
    const currentCash = currentCashRes?.balance || 0;

    const currentPulsaRes = db.prepare('SELECT current_balance FROM pulsa_balances WHERE id = 1').get() as any;
    const currentPulsa = currentPulsaRes?.current_balance || 0;

    const currentGalonRes = db.prepare('SELECT available_qty, customer_held_qty FROM galon_inventory WHERE id = 1').get() as any;
    const currentGalon = currentGalonRes?.available_qty || 0;

    const today = new Date().toISOString().split('T')[0];
    const transId = Date.now().toString().slice(-6);

    const adjustTx = db.transaction(() => {
      // 1. Adjust Cash
      if (typeof cash_balance === 'number' && !isNaN(cash_balance) && cash_balance !== currentCash) {
        const diff = cash_balance - currentCash;
        const flowType = diff >= 0 ? 'in' : 'out';
        const absAmount = Math.abs(diff);

        db.prepare(`
          INSERT INTO cash_transactions (trans_no, trans_date, flow_type, source_type, amount, description, created_by)
          VALUES (?, ?, ?, 'capital_injection', ?, ?, 1)
        `).run(`CSH-ADJ-${transId}`, today, flowType, absAmount, notes || `Penyesuaian Saldo Kas Dashboard (dari Rp${currentCash.toLocaleString('id-ID')} ke Rp${cash_balance.toLocaleString('id-ID')})`);

        // Journal Entry
        const jrnRes = db.prepare(`
          INSERT INTO journal_entries (entry_no, entry_date, reference_no, source_type, description, status)
          VALUES (?, ?, ?, 'manual_adjustment', ?, 'posted')
        `).run(`JRN-ADJ-${transId}`, today, `ADJ-CSH-${transId}`, `Koreksi Saldo Kas: ${notes || 'Penyesuaian Modal Kas'}`);

        const jrnId = Number(jrnRes.lastInsertRowid);
        const accKas = db.prepare(`SELECT id FROM accounts WHERE account_code = '1101'`).get() as any;
        const accModal = db.prepare(`SELECT id FROM accounts WHERE account_code = '3101'`).get() as any;

        if (accKas && accModal) {
          if (diff >= 0) {
            db.prepare(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)`).run(jrnId, accKas.id, absAmount);
            db.prepare(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)`).run(jrnId, accModal.id, absAmount);
          } else {
            db.prepare(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)`).run(jrnId, accKas.id, absAmount);
            db.prepare(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)`).run(jrnId, accModal.id, absAmount);
          }
        }
      }

      // 2. Adjust Pulsa Balance
      if (typeof pulsa_balance === 'number' && !isNaN(pulsa_balance)) {
        db.prepare(`
          UPDATE pulsa_balances 
          SET current_balance = ?, last_updated = CURRENT_TIMESTAMP 
          WHERE id = 1
        `).run(pulsa_balance);
      }

      // 3. Adjust Gallon Inventory
      if (typeof galon_available === 'number' && !isNaN(galon_available)) {
        db.prepare(`
          UPDATE galon_inventory 
          SET available_qty = ?, customer_held_qty = COALESCE(?, customer_held_qty), last_updated = CURRENT_TIMESTAMP 
          WHERE id = 1
        `).run(galon_available, typeof galon_held === 'number' ? galon_held : null);
      }

      // 4. Log Audit
      db.prepare(`
        INSERT INTO audit_logs (action_type, entity_type, entity_id, description, performed_by)
        VALUES ('UPDATE_BALANCES', 'dashboard', 1, ?, 1)
      `).run(`Penyesuaian Nominal Dashboard: Kas=${cash_balance}, Pulsa=${pulsa_balance}, Galon=${galon_available}. Ket: ${notes || '-'}`);
    });

    adjustTx();

    return NextResponse.json({
      success: true,
      message: 'Nominal saldo dashboard berhasil disesuaikan!'
    });
  } catch (error: any) {
    console.error('Adjust dashboard error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
