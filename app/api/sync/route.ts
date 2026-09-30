import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    const profile = db.prepare('SELECT * FROM organization_profile WHERE id = 1').get() || {};
    const pulsaBalance = (db.prepare('SELECT current_balance FROM pulsa_balances WHERE id = 1').get() as any)?.current_balance || 0;
    const galonInventory = db.prepare('SELECT available_qty, customer_held_qty, damaged_lost_qty FROM galon_inventory WHERE id = 1').get() || { available_qty: 0, customer_held_qty: 0, damaged_lost_qty: 0 };
    const customers = db.prepare('SELECT * FROM customers WHERE is_active = 1 ORDER BY name ASC').all();
    const transactions = db.prepare('SELECT * FROM transactions ORDER BY id DESC LIMIT 200').all();
    const receivables = db.prepare('SELECT * FROM receivables ORDER BY id DESC').all();
    const receivablePayments = db.prepare('SELECT * FROM receivable_payments ORDER BY id DESC').all();
    const cashTransactions = db.prepare('SELECT * FROM cash_transactions ORDER BY id DESC LIMIT 200').all();
    const galonMovements = db.prepare('SELECT * FROM galon_movements ORDER BY id DESC LIMIT 200').all();
    const journalEntries = db.prepare('SELECT * FROM journal_entries ORDER BY id DESC LIMIT 200').all();
    const auditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all();

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      data: {
        profile,
        pulsa_balance: pulsaBalance,
        galon_inventory: galonInventory,
        customers,
        transactions,
        receivables,
        receivable_payments: receivablePayments,
        cash_transactions: cashTransactions,
        galon_movements: galonMovements,
        journal_entries: journalEntries,
        audit_logs: auditLogs
      }
    });
  } catch (error: any) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();
    const incoming = body.data || body;

    // Use a transaction for atomic merging
    const mergeTx = db.transaction(() => {
      // 1. Merge customers
      if (Array.isArray(incoming.customers)) {
        const checkCust = db.prepare('SELECT id FROM customers WHERE code = ? OR (name = ? AND phone = ?)');
        const insertCust = db.prepare(`
          INSERT INTO customers (code, name, phone, address, gallon_balance, total_receivable, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `);
        const updateCust = db.prepare(`
          UPDATE customers SET gallon_balance = ?, total_receivable = ? WHERE id = ?
        `);

        for (const c of incoming.customers) {
          const existing = checkCust.get(c.code, c.name, c.phone || '') as any;
          if (!existing) {
            insertCust.run(c.code, c.name, c.phone || '', c.address || '', c.gallon_balance || 0, c.total_receivable || 0);
          } else {
            updateCust.run(c.gallon_balance || 0, c.total_receivable || 0, existing.id);
          }
        }
      }

      // 2. Merge transactions
      if (Array.isArray(incoming.transactions)) {
        const checkTrx = db.prepare('SELECT id FROM transactions WHERE trans_no = ?');
        const insertTrx = db.prepare(`
          INSERT INTO transactions (trans_no, trans_date, unit_id, trans_type, customer_id, customer_name, payment_method, subtotal, cogs_amount, margin_amount, status, notes, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `);

        for (const t of incoming.transactions) {
          const existing = checkTrx.get(t.trans_no);
          if (!existing) {
            const unitId = t.unit_code === 'PULSA' ? 1 : (t.unit_code === 'GALON' ? 2 : 3);
            insertTrx.run(
              t.trans_no,
              t.trans_date,
              unitId,
              t.trans_type,
              t.customer_id || null,
              t.customer_name || null,
              t.payment_method || 'cash',
              t.subtotal || 0,
              t.cogs_amount || 0,
              t.margin_amount || 0,
              t.status || 'posted',
              t.notes || ''
            );
          }
        }
      }

      // 3. Merge cash transactions
      if (Array.isArray(incoming.cash_transactions)) {
        const checkCash = db.prepare('SELECT id FROM cash_transactions WHERE trans_no = ?');
        const insertCash = db.prepare(`
          INSERT INTO cash_transactions (trans_no, trans_date, flow_type, source_type, amount, description, created_by)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `);

        for (const ct of incoming.cash_transactions) {
          const existing = checkCash.get(ct.trans_no);
          if (!existing) {
            insertCash.run(ct.trans_no, ct.trans_date, ct.flow_type, ct.source_type, ct.amount, ct.description);
          }
        }
      }

      // 4. Update balances if provided
      if (typeof incoming.pulsa_balance === 'number') {
        db.prepare('UPDATE pulsa_balances SET current_balance = ?, last_updated = CURRENT_TIMESTAMP WHERE id = 1').run(incoming.pulsa_balance);
      }
      if (incoming.galon_inventory) {
        db.prepare(`
          UPDATE galon_inventory 
          SET available_qty = ?, customer_held_qty = ?, damaged_lost_qty = ?, last_updated = CURRENT_TIMESTAMP 
          WHERE id = 1
        `).run(
          incoming.galon_inventory.available_qty || 0,
          incoming.galon_inventory.customer_held_qty || 0,
          incoming.galon_inventory.damaged_lost_qty || 0
        );
      }
    });

    mergeTx();

    // Return the updated full state
    const profile = db.prepare('SELECT * FROM organization_profile WHERE id = 1').get() || {};
    const pulsaBalance = (db.prepare('SELECT current_balance FROM pulsa_balances WHERE id = 1').get() as any)?.current_balance || 0;
    const galonInventory = db.prepare('SELECT available_qty, customer_held_qty, damaged_lost_qty FROM galon_inventory WHERE id = 1').get() || {};
    const customers = db.prepare('SELECT * FROM customers WHERE is_active = 1 ORDER BY name ASC').all();
    const transactions = db.prepare('SELECT * FROM transactions ORDER BY id DESC LIMIT 200').all();

    return NextResponse.json({
      success: true,
      message: 'Sinkronisasi data berhasil diproses!',
      timestamp: Date.now(),
      data: {
        profile,
        pulsa_balance: pulsaBalance,
        galon_inventory: galonInventory,
        customers,
        transactions
      }
    });
  } catch (error: any) {
    console.error('Sync POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
