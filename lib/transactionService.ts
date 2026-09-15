import Database from 'better-sqlite3';
import getDb from './db';
import { postJournalEntry } from './accountingService';
import { recordAuditLog } from './auditService';
import { PaymentMethod } from './types';

// Generator Nomor Transaksi
function generateTransNo(db: Database.Database, prefix: string, dateStr: string): string {
  const ym = dateStr.substring(0, 7).replace('-', '');
  const row = db.prepare(`
    SELECT COUNT(*) as cnt FROM transactions 
    WHERE trans_no LIKE ? || '-' || ? || '-%'
  `).get(prefix, ym) as { cnt: number };

  const nextSeq = (row.cnt + 1).toString().padStart(4, '0');
  return `${prefix}-${ym}-${nextSeq}`;
}

// Generator Nomor Pembayaran Piutang
function generatePayNo(db: Database.Database, dateStr: string): string {
  const ym = dateStr.substring(0, 7).replace('-', '');
  const row = db.prepare(`
    SELECT COUNT(*) as cnt FROM receivable_payments 
    WHERE payment_no LIKE 'PAY-' || ? || '-%'
  `).get(ym) as { cnt: number };

  const nextSeq = (row.cnt + 1).toString().padStart(4, '0');
  return `PAY-${ym}-${nextSeq}`;
}

// Generator Nomor Kas
function generateCashNo(db: Database.Database, dateStr: string): string {
  const ym = dateStr.substring(0, 7).replace('-', '');
  const row = db.prepare(`
    SELECT COUNT(*) as cnt FROM cash_transactions 
    WHERE trans_no LIKE 'CSH-' || ? || '-%'
  `).get(ym) as { cnt: number };

  const nextSeq = (row.cnt + 1).toString().padStart(4, '0');
  return `CSH-${ym}-${nextSeq}`;
}

export interface PulsaSaleInput {
  trans_date: string;
  customer_id?: number | null;
  phone_number: string;
  provider: string;
  nominal: number;
  cogs_price: number;
  selling_price: number;
  payment_method: 'cash' | 'credit';
  notes?: string;
  created_by: number;
}

/**
 * 1. Penjualan Pulsa
 * ONE INPUT -> SALDO PULSA BERKURANG MODAL -> KAS ATAU PIUTANG -> JURNAL -> DASHBOARD & LAPORAN
 */
export function recordPulsaSale(input: PulsaSaleInput) {
  const db = getDb();

  // Validasi
  if (input.selling_price <= 0 || input.cogs_price <= 0) {
    throw new Error('Harga jual dan harga modal harus lebih dari 0.');
  }
  if (input.payment_method === 'credit' && !input.customer_id) {
    throw new Error('Pelanggan wajib dipilih untuk transaksi penjualan kredit!');
  }

  const margin = Math.round((input.selling_price - input.cogs_price) * 100) / 100;

  const runAtomic = db.transaction(() => {
    // 1. Cek saldo deposit pulsa saat ini
    const pulsaBalanceRow = db.prepare('SELECT current_balance FROM pulsa_balances ORDER BY id DESC LIMIT 1').get() as { current_balance: number } | undefined;
    const currentBalance = pulsaBalanceRow ? pulsaBalanceRow.current_balance : 0;

    if (currentBalance < input.cogs_price) {
      throw new Error(`Saldo pulsa tidak mencukupi untuk transaksi ini. (Saldo saat ini: Rp${currentBalance.toLocaleString('id-ID')}, Modal dibutuhkan: Rp${input.cogs_price.toLocaleString('id-ID')})`);
    }

    // 2. Generate Nomor Transaksi
    const transNo = generateTransNo(db, 'TRX-PLS', input.trans_date);

    // 3. Simpan Transaksi Induk
    const transStmt = db.prepare(`
      INSERT INTO transactions (
        trans_no, trans_date, unit_code, trans_type, customer_id, 
        payment_method, subtotal, cogs_amount, margin_amount, status, notes, created_by
      ) VALUES (?, ?, 'PULSA', 'sale_pulsa', ?, ?, ?, ?, ?, 'posted', ?, ?)
    `);
    const transRes = transStmt.run(
      transNo,
      input.trans_date,
      input.customer_id ?? null,
      input.payment_method,
      input.selling_price,
      input.cogs_price,
      margin,
      input.notes ?? `Penjualan pulsa ${input.provider} ${input.nominal} ke ${input.phone_number}`,
      input.created_by
    );
    const transId = Number(transRes.lastInsertRowid);

    // 4. Simpan Rincian Pulsa
    db.prepare(`
      INSERT INTO pulsa_details (transaction_id, phone_number, provider, nominal, cogs_price, selling_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(transId, input.phone_number, input.provider, input.nominal, input.cogs_price, input.selling_price);

    // 5. Potong Saldo Deposit Pulsa berdasarkan modal
    db.prepare(`
      UPDATE pulsa_balances 
      SET current_balance = current_balance - ?, last_updated = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM pulsa_balances ORDER BY id DESC LIMIT 1)
    `).run(input.cogs_price);

    // 6. Penanganan Kas vs Piutang
    if (input.payment_method === 'cash') {
      // Kas Bertambah
      const cashNo = generateCashNo(db, input.trans_date);
      db.prepare(`
        INSERT INTO cash_transactions (trans_no, trans_date, flow_type, source_type, reference_id, amount, description, created_by)
        VALUES (?, ?, 'in', 'sale_pulsa', ?, ?, ?, ?)
      `).run(cashNo, input.trans_date, transId, input.selling_price, `Penjualan Pulsa Tunai ${transNo}`, input.created_by);
    } else {
      // Piutang Bertambah (Kas TIDAK bertambah!)
      db.prepare(`
        INSERT INTO receivables (transaction_id, customer_id, total_amount, paid_amount, remaining_amount, status)
        VALUES (?, ?, ?, 0.00, ?, 'unpaid')
      `).run(transId, input.customer_id, input.selling_price, input.selling_price);

      db.prepare(`
        UPDATE customers 
        SET total_receivable = total_receivable + ? 
        WHERE id = ?
      `).run(input.selling_price, input.customer_id);
    }

    // 7. Jurnal Double-Entry Otomatis
    // Dr. Kas (1101) atau Piutang Usaha (1103)  = selling_price
    // Cr. Pendapatan Penjualan Pulsa (4101)     = selling_price
    // Dr. HPP Modal Pulsa (5101)                 = cogs_price
    // Cr. Persediaan / Saldo Pulsa (1104)        = cogs_price
    const debitAccount = input.payment_method === 'cash' ? '1101' : '1103';
    postJournalEntry(db, {
      entry_date: input.trans_date,
      reference_no: transNo,
      source_type: 'sale_pulsa',
      description: `Penjualan Pulsa ${input.provider} ${input.phone_number} (${transNo})`,
      lines: [
        { account_code: debitAccount, debit: input.selling_price, credit: 0 },
        { account_code: '4101', debit: 0, credit: input.selling_price },
        { account_code: '5101', debit: input.cogs_price, credit: 0 },
        { account_code: '1104', debit: 0, credit: input.cogs_price },
      ],
    });

    // 8. Catat Audit Log
    recordAuditLog({
      userId: input.created_by,
      action: 'SALE_PULSA',
      tableName: 'transactions',
      recordId: transId,
      newData: { transNo, margin, sellingPrice: input.selling_price, cogsPrice: input.cogs_price },
    });

    return { transId, transNo, margin };
  });

  return runAtomic();
}

export interface PulsaTopupInput {
  trans_date: string;
  nominal_saldo: number;
  cost_price: number;
  payment_method?: 'cash' | 'transfer';
  notes?: string;
  created_by: number;
}

/**
 * 2. Tambah Saldo Pulsa (Top-Up)
 * SALDO PULSA BERTAMBAH -> KAS BERKURANG -> JURNAL
 */
export function recordPulsaTopup(input: PulsaTopupInput) {
  const db = getDb();
  if (input.nominal_saldo <= 0 || input.cost_price <= 0) {
    throw new Error('Nominal saldo dan harga beli harus lebih dari 0.');
  }

  const runAtomic = db.transaction(() => {
    const transNo = generateTransNo(db, 'TOP-PLS', input.trans_date);

    // 1. Simpan Transaksi
    const transRes = db.prepare(`
      INSERT INTO transactions (
        trans_no, trans_date, unit_code, trans_type, 
        payment_method, subtotal, cogs_amount, margin_amount, status, notes, created_by
      ) VALUES (?, ?, 'PULSA', 'topup_pulsa', 'cash', ?, ?, 0.00, 'posted', ?, ?)
    `).run(
      transNo,
      input.trans_date,
      input.cost_price,
      input.cost_price,
      input.notes ?? `Top up saldo deposit pulsa Rp${input.nominal_saldo.toLocaleString('id-ID')}`,
      input.created_by
    );
    const transId = Number(transRes.lastInsertRowid);

    // 2. Tambah Saldo Pulsa
    db.prepare(`
      UPDATE pulsa_balances 
      SET current_balance = current_balance + ?, last_updated = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM pulsa_balances ORDER BY id DESC LIMIT 1)
    `).run(input.nominal_saldo);

    // 3. Kas Keluar
    const cashNo = generateCashNo(db, input.trans_date);
    db.prepare(`
      INSERT INTO cash_transactions (trans_no, trans_date, flow_type, source_type, reference_id, amount, description, created_by)
      VALUES (?, ?, 'out', 'topup_pulsa', ?, ?, ?, ?)
    `).run(cashNo, input.trans_date, transId, input.cost_price, `Pembelian Saldo Deposit Pulsa ${transNo}`, input.created_by);

    // 4. Jurnal:
    // Dr. Persediaan / Saldo Pulsa (1104) = cost_price
    // Cr. Kas Tunai (1101)                = cost_price
    postJournalEntry(db, {
      entry_date: input.trans_date,
      reference_no: transNo,
      source_type: 'topup_pulsa',
      description: `Pengadaan/Top-up Saldo Pulsa (${transNo})`,
      lines: [
        { account_code: '1104', debit: input.cost_price, credit: 0 },
        { account_code: '1101', debit: 0, credit: input.cost_price },
      ],
    });

    recordAuditLog({
      userId: input.created_by,
      action: 'TOPUP_PULSA',
      tableName: 'transactions',
      recordId: transId,
      newData: { transNo, nominalSaldo: input.nominal_saldo, costPrice: input.cost_price },
    });

    return { transId, transNo };
  });

  return runAtomic();
}

export interface GalonSaleInput {
  trans_date: string;
  customer_id?: number | null;
  qty: number;
  unit_price: number;
  payment_method: 'cash' | 'credit';
  gallon_action?: 'exchange' | 'borrow' | 'refill_only'; // exchange: tukar galon, borrow: bawa/pinjam galon depot, refill_only: isi ulang bawa galon sendiri
  notes?: string;
  created_by: number;
}

/**
 * 3. Penjualan Galon (Tunai atau Kredit)
 * ONE INPUT -> STOK GALON BERKURANG -> KAS/PIUTANG -> JURNAL -> DASHBOARD & LAPORAN
 */
export function recordGalonSale(input: GalonSaleInput) {
  const db = getDb();
  if (input.qty <= 0 || input.unit_price <= 0) {
    throw new Error('Jumlah galon dan harga satuan harus lebih dari 0.');
  }
  if (input.payment_method === 'credit' && !input.customer_id) {
    throw new Error('Pelanggan wajib dipilih untuk penjualan galon kredit!');
  }

  const total = Math.round(input.qty * input.unit_price * 100) / 100;
  const gallonAction = input.gallon_action || 'exchange';

  const runAtomic = db.transaction(() => {
    // 1. Cek ketersediaan galon fisik di depot
    const invRow = db.prepare('SELECT available_qty FROM galon_inventory ORDER BY id DESC LIMIT 1').get() as { available_qty: number } | undefined;
    const availableQty = invRow ? invRow.available_qty : 0;

    if (availableQty < input.qty) {
      throw new Error(`Stok galon tersedia tidak mencukupi untuk transaksi ini. (Tersedia: ${availableQty} galon, Permintaan: ${input.qty} galon)`);
    }

    // 2. Generate Nomor Transaksi
    const transNo = generateTransNo(db, 'TRX-GLN', input.trans_date);

    // 3. Simpan Transaksi
    const transRes = db.prepare(`
      INSERT INTO transactions (
        trans_no, trans_date, unit_code, trans_type, customer_id, 
        payment_method, subtotal, cogs_amount, margin_amount, status, notes, created_by
      ) VALUES (?, ?, 'GALON', 'sale_galon', ?, ?, ?, 0.00, ?, 'posted', ?, ?)
    `).run(
      transNo,
      input.trans_date,
      input.customer_id ?? null,
      input.payment_method,
      total,
      total, // Margin galon kotor
      input.notes ?? `Penjualan ${input.qty} galon @Rp${input.unit_price.toLocaleString('id-ID')}`,
      input.created_by
    );
    const transId = Number(transRes.lastInsertRowid);

    // 4. Update Stok & Pergerakan Galon
    // Stok siap jual di depot selalu berkurang sejumlah qty penjualan
    db.prepare(`
      UPDATE galon_inventory 
      SET available_qty = available_qty - ?, last_updated = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM galon_inventory ORDER BY id DESC LIMIT 1)
    `).run(input.qty);

    // Jika tabung galon dipinjam/dibawa pulang tanpa tukar galon kosong:
    if (gallonAction === 'borrow') {
      db.prepare(`
        UPDATE galon_inventory 
        SET customer_held_qty = customer_held_qty + ?
        WHERE id = (SELECT id FROM galon_inventory ORDER BY id DESC LIMIT 1)
      `).run(input.qty);

      if (input.customer_id) {
        db.prepare(`
          UPDATE customers 
          SET gallon_balance = gallon_balance + ? 
          WHERE id = ?
        `).run(input.qty, input.customer_id);
      }
    }

    // Catat mutasi galon keluar
    db.prepare(`
      INSERT INTO galon_movements (transaction_id, customer_id, movement_type, qty, notes)
      VALUES (?, ?, 'out_sale', ?, ?)
    `).run(transId, input.customer_id ?? null, input.qty, `Penjualan ${transNo} (${gallonAction})`);

    // 5. Penanganan Kas vs Piutang
    if (input.payment_method === 'cash') {
      // Kas Bertambah
      const cashNo = generateCashNo(db, input.trans_date);
      db.prepare(`
        INSERT INTO cash_transactions (trans_no, trans_date, flow_type, source_type, reference_id, amount, description, created_by)
        VALUES (?, ?, 'in', 'sale_galon', ?, ?, ?, ?)
      `).run(cashNo, input.trans_date, transId, total, `Penjualan Galon Tunai ${transNo}`, input.created_by);
    } else {
      // Piutang Bertambah (Kas SAMA SEKALI TIDAK BERTAMBAH!)
      db.prepare(`
        INSERT INTO receivables (transaction_id, customer_id, total_amount, paid_amount, remaining_amount, status)
        VALUES (?, ?, ?, 0.00, ?, 'unpaid')
      `).run(transId, input.customer_id, total, total);

      db.prepare(`
        UPDATE customers 
        SET total_receivable = total_receivable + ? 
        WHERE id = ?
      `).run(total, input.customer_id);
    }

    // 6. Jurnal Double-Entry Otomatis:
    // Dr. Kas (1101) atau Piutang Usaha (1103)  = total
    // Cr. Pendapatan Penjualan Air Galon (4102) = total
    const debitAccount = input.payment_method === 'cash' ? '1101' : '1103';
    postJournalEntry(db, {
      entry_date: input.trans_date,
      reference_no: transNo,
      source_type: 'sale_galon',
      description: `Penjualan Air Galon (${transNo}) - ${input.qty} tabung`,
      lines: [
        { account_code: debitAccount, debit: total, credit: 0 },
        { account_code: '4102', debit: 0, credit: total },
      ],
    });

    recordAuditLog({
      userId: input.created_by,
      action: 'SALE_GALON',
      tableName: 'transactions',
      recordId: transId,
      newData: { transNo, qty: input.qty, total, paymentMethod: input.payment_method },
    });

    return { transId, transNo, total };
  });

  return runAtomic();
}

export interface GalonMovementInput {
  movement_type: 'return_empty' | 'in_refill' | 'damaged_lost';
  customer_id?: number | null;
  qty: number;
  notes?: string;
  created_by: number;
}

/**
 * 4. Pergerakan / Mutasi Tabung Galon (Pengembalian, Rusak, Isi Pasokan)
 */
export function recordGalonMovement(input: GalonMovementInput) {
  const db = getDb();
  if (input.qty <= 0) {
    throw new Error('Jumlah galon harus lebih dari 0.');
  }

  const runAtomic = db.transaction(() => {
    if (input.movement_type === 'return_empty') {
      // Pelanggan mengembalikan tabung kosong
      db.prepare(`
        UPDATE galon_inventory 
        SET available_qty = available_qty + ?, 
            customer_held_qty = MAX(0, customer_held_qty - ?),
            last_updated = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM galon_inventory ORDER BY id DESC LIMIT 1)
      `).run(input.qty, input.qty);

      if (input.customer_id) {
        db.prepare(`
          UPDATE customers 
          SET gallon_balance = MAX(0, gallon_balance - ?)
          WHERE id = ?
        `).run(input.qty, input.customer_id);
      }
    } else if (input.movement_type === 'in_refill') {
      // Pasokan tabung galon baru / isi ulang depot bertambah
      db.prepare(`
        UPDATE galon_inventory 
        SET available_qty = available_qty + ?,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM galon_inventory ORDER BY id DESC LIMIT 1)
      `).run(input.qty);
    } else if (input.movement_type === 'damaged_lost') {
      // Galon rusak atau hilang
      db.prepare(`
        UPDATE galon_inventory 
        SET available_qty = MAX(0, available_qty - ?), 
            damaged_lost_qty = damaged_lost_qty + ?,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM galon_inventory ORDER BY id DESC LIMIT 1)
      `).run(input.qty, input.qty);
    }

    const res = db.prepare(`
      INSERT INTO galon_movements (customer_id, movement_type, qty, notes)
      VALUES (?, ?, ?, ?)
    `).run(input.customer_id ?? null, input.movement_type, input.qty, input.notes ?? null);

    recordAuditLog({
      userId: input.created_by,
      action: 'GALON_MOVEMENT',
      tableName: 'galon_movements',
      recordId: Number(res.lastInsertRowid),
      newData: input,
    });

    return { success: true };
  });

  return runAtomic();
}

export interface ReceivablePaymentInput {
  receivable_id: number;
  payment_date: string;
  amount: number;
  payment_method?: 'cash' | 'transfer';
  notes?: string;
  created_by: number;
}

/**
 * 5. Pembayaran Piutang
 * ATURAN MUTLAK: BUKAN PENJUALAN BARU!
 * KAS BERTAMBAH -> PIUTANG BERKURANG -> TIDAK MENAMBAH PENDAPATAN
 */
export function recordReceivablePayment(input: ReceivablePaymentInput) {
  const db = getDb();
  if (input.amount <= 0) {
    throw new Error('Jumlah pembayaran harus lebih dari 0.');
  }

  const runAtomic = db.transaction(() => {
    // 1. Ambil data piutang
    const rec = db.prepare(`
      SELECT r.*, c.name as customer_name 
      FROM receivables r 
      JOIN customers c ON r.customer_id = c.id
      WHERE r.id = ?
    `).get(input.receivable_id) as any;

    if (!rec) {
      throw new Error('Data piutang tidak ditemukan.');
    }
    if (rec.remaining_amount <= 0 || rec.status === 'paid') {
      throw new Error('Piutang ini sudah lunas.');
    }
    if (input.amount > rec.remaining_amount) {
      throw new Error(`Jumlah pembayaran (Rp${input.amount.toLocaleString('id-ID')}) melebihi sisa piutang (Rp${rec.remaining_amount.toLocaleString('id-ID')})!`);
    }

    // 2. Generate Nomor Pembayaran
    const payNo = generatePayNo(db, input.payment_date);

    // 3. Simpan Entri Pembayaran
    const payRes = db.prepare(`
      INSERT INTO receivable_payments (payment_no, receivable_id, payment_date, amount, payment_method, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      payNo,
      input.receivable_id,
      input.payment_date,
      input.amount,
      input.payment_method || 'cash',
      input.notes ?? `Pembayaran piutang ${rec.customer_name}`,
      input.created_by
    );
    const payId = Number(payRes.lastInsertRowid);

    // 4. Update Kartu Piutang
    const newPaidAmount = Math.round((rec.paid_amount + input.amount) * 100) / 100;
    const newRemainingAmount = Math.round((rec.remaining_amount - input.amount) * 100) / 100;
    const newStatus = newRemainingAmount === 0 ? 'paid' : 'partial';

    db.prepare(`
      UPDATE receivables 
      SET paid_amount = ?, remaining_amount = ?, status = ?
      WHERE id = ?
    `).run(newPaidAmount, newRemainingAmount, newStatus, input.receivable_id);

    // 5. Update Total Piutang di Master Pelanggan
    db.prepare(`
      UPDATE customers 
      SET total_receivable = MAX(0.00, total_receivable - ?)
      WHERE id = ?
    `).run(input.amount, rec.customer_id);

    // 6. Kas Bertambah
    const cashNo = generateCashNo(db, input.payment_date);
    db.prepare(`
      INSERT INTO cash_transactions (trans_no, trans_date, flow_type, source_type, reference_id, amount, description, created_by)
      VALUES (?, ?, 'in', 'receivable_payment', ?, ?, ?, ?)
    `).run(cashNo, input.payment_date, payId, input.amount, `Pembayaran Piutang (${payNo}) dari ${rec.customer_name}`, input.created_by);

    // 7. Jurnal Double-Entry:
    // Dr. Kas Tunai (1101)       = amount
    // Cr. Piutang Usaha (1103)   = amount
    // PENTING: TIDAK ADA AKUN PENDAPATAN (4xxx)!
    postJournalEntry(db, {
      entry_date: input.payment_date,
      reference_no: payNo,
      source_type: 'receivable_payment',
      description: `Penerimaan Pembayaran Piutang (${payNo}) - ${rec.customer_name}`,
      lines: [
        { account_code: '1101', debit: input.amount, credit: 0 },
        { account_code: '1103', debit: 0, credit: input.amount },
      ],
    });

    recordAuditLog({
      userId: input.created_by,
      action: 'PAY_RECEIVABLE',
      tableName: 'receivable_payments',
      recordId: payId,
      newData: { payNo, amount: input.amount, remaining: newRemainingAmount, status: newStatus },
    });

    return { payId, payNo, remaining: newRemainingAmount, status: newStatus };
  });

  return runAtomic();
}

export interface CashExpenseInput {
  trans_date: string;
  account_code: string;
  amount: number;
  description: string;
  created_by: number;
}

/**
 * 6. Beban Operasional Kas Keluar Manual
 */
export function recordCashExpense(input: CashExpenseInput) {
  const db = getDb();
  if (input.amount <= 0) {
    throw new Error('Nominal pengeluaran harus lebih dari 0.');
  }

  const runAtomic = db.transaction(() => {
    const transNo = generateTransNo(db, 'EXP', input.trans_date);

    // 1. Simpan Transaksi
    const transRes = db.prepare(`
      INSERT INTO transactions (
        trans_no, trans_date, unit_code, trans_type, 
        payment_method, subtotal, cogs_amount, margin_amount, status, notes, created_by
      ) VALUES (?, ?, 'UMUM', 'expense', 'cash', ?, 0.00, 0.00, 'posted', ?, ?)
    `).run(transNo, input.trans_date, input.amount, input.description, input.created_by);
    const transId = Number(transRes.lastInsertRowid);

    // 2. Kas Keluar
    const cashNo = generateCashNo(db, input.trans_date);
    db.prepare(`
      INSERT INTO cash_transactions (trans_no, trans_date, flow_type, source_type, reference_id, amount, description, created_by)
      VALUES (?, ?, 'out', 'expense_operational', ?, ?, ?, ?)
    `).run(cashNo, input.trans_date, transId, input.amount, input.description, input.created_by);

    // 3. Jurnal:
    // Dr. Beban Terkait (input.account_code) = amount
    // Cr. Kas Tunai (1101)                  = amount
    postJournalEntry(db, {
      entry_date: input.trans_date,
      reference_no: transNo,
      source_type: 'expense',
      description: `Beban Operasional: ${input.description} (${transNo})`,
      lines: [
        { account_code: input.account_code, debit: input.amount, credit: 0 },
        { account_code: '1101', debit: 0, credit: input.amount },
      ],
    });

    recordAuditLog({
      userId: input.created_by,
      action: 'EXPENSE',
      tableName: 'transactions',
      recordId: transId,
      newData: { transNo, amount: input.amount, accountCode: input.account_code },
    });

    return { transId, transNo };
  });

  return runAtomic();
}

/**
 * 7. Pembatalan Transaksi (VOID & REVERSAL)
 * Mengembalikan seluruh efek transaksi: stok, kas, piutang, dan jurnal pembalik
 */
export function voidTransaction(transactionId: number, voidReason: string, voidedBy: number) {
  const db = getDb();

  const runAtomic = db.transaction(() => {
    const trx = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(transactionId) as any;
    if (!trx) {
      throw new Error('Transaksi tidak ditemukan.');
    }
    if (trx.status === 'void') {
      throw new Error('Transaksi ini sudah dibatalkan sebelumnya (VOID).');
    }

    // 1. Ubah status transaksi menjadi VOID
    db.prepare(`
      UPDATE transactions 
      SET status = 'void', voided_at = CURRENT_TIMESTAMP, voided_by = ?, void_reason = ?
      WHERE id = ?
    `).run(voidedBy, voidReason, transactionId);

    // 2. Kembalikan Efek Stok / Saldo
    if (trx.trans_type === 'sale_pulsa') {
      // Kembalikan saldo pulsa sebesar modal
      db.prepare(`
        UPDATE pulsa_balances 
        SET current_balance = current_balance + ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM pulsa_balances ORDER BY id DESC LIMIT 1)
      `).run(trx.cogs_amount);
    } else if (trx.trans_type === 'topup_pulsa') {
      // Tarik kembali saldo pulsa
      db.prepare(`
        UPDATE pulsa_balances 
        SET current_balance = MAX(0.00, current_balance - ?), last_updated = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM pulsa_balances ORDER BY id DESC LIMIT 1)
      `).run(trx.subtotal);
    } else if (trx.trans_type === 'sale_galon') {
      // Ambil pergerakan galon
      const movement = db.prepare(`SELECT * FROM galon_movements WHERE transaction_id = ?`).get(transactionId) as any;
      const qty = movement ? movement.qty : 0;
      if (qty > 0) {
        // Kembalikan stok tersedia
        db.prepare(`
          UPDATE galon_inventory 
          SET available_qty = available_qty + ?, last_updated = CURRENT_TIMESTAMP
          WHERE id = (SELECT id FROM galon_inventory ORDER BY id DESC LIMIT 1)
        `).run(qty);

        // Jika sebelumnya dipinjam pelanggan
        if (movement.notes && movement.notes.includes('borrow') && trx.customer_id) {
          db.prepare(`
            UPDATE galon_inventory 
            SET customer_held_qty = MAX(0, customer_held_qty - ?)
            WHERE id = (SELECT id FROM galon_inventory ORDER BY id DESC LIMIT 1)
          `).run(qty);

          db.prepare(`
            UPDATE customers 
            SET gallon_balance = MAX(0, gallon_balance - ?)
            WHERE id = ?
          `).run(qty, trx.customer_id);
        }
      }
    }

    // 3. Kembalikan Efek Kas / Piutang
    if (trx.payment_method === 'cash') {
      if (trx.trans_type === 'topup_pulsa' || trx.trans_type === 'expense') {
        // Dulu kas keluar, sekarang kas kembali masuk
        const revCashNo = generateCashNo(db, new Date().toISOString().split('T')[0]);
        db.prepare(`
          INSERT INTO cash_transactions (trans_no, trans_date, flow_type, source_type, reference_id, amount, description, created_by)
          VALUES (?, CURRENT_DATE, 'in', 'void_reversal', ?, ?, ?, ?)
        `).run(revCashNo, transactionId, trx.subtotal, `Pembatalan Transaksi Keluar ${trx.trans_no}`, voidedBy);
      } else {
        // Dulu kas masuk, sekarang kas dikeluarkan kembali
        const revCashNo = generateCashNo(db, new Date().toISOString().split('T')[0]);
        db.prepare(`
          INSERT INTO cash_transactions (trans_no, trans_date, flow_type, source_type, reference_id, amount, description, created_by)
          VALUES (?, CURRENT_DATE, 'out', 'void_reversal', ?, ?, ?, ?)
        `).run(revCashNo, transactionId, trx.subtotal, `Pembatalan Transaksi Masuk ${trx.trans_no}`, voidedBy);
      }
    } else if (trx.payment_method === 'credit') {
      // Hapus piutang pelanggan
      const rec = db.prepare(`SELECT * FROM receivables WHERE transaction_id = ?`).get(transactionId) as any;
      if (rec) {
        if (rec.paid_amount > 0) {
          throw new Error('Transaksi kredit ini sudah memiliki histori pembayaran cicilan piutang dan tidak dapat di-void langsung.');
        }
        db.prepare(`DELETE FROM receivables WHERE id = ?`).run(rec.id);
        db.prepare(`
          UPDATE customers 
          SET total_receivable = MAX(0.00, total_receivable - ?)
          WHERE id = ?
        `).run(rec.total_amount, trx.customer_id);
      }
    }

    // 4. Buat Jurnal Pembalik (Reversal Entry)
    const origJournal = db.prepare(`SELECT * FROM journal_entries WHERE reference_no = ? AND status = 'posted'`).get(trx.trans_no) as any;
    if (origJournal) {
      const origLines = db.prepare(`SELECT * FROM journal_lines WHERE journal_entry_id = ?`).all(origJournal.id) as any[];
      // Buat lines terbalik (Debit menjadi Kredit, Kredit menjadi Debit)
      const reversedLines = origLines.map(line => {
        const acc = db.prepare(`SELECT account_code FROM accounts WHERE id = ?`).get(line.account_id) as any;
        return {
          account_code: acc.account_code,
          debit: line.credit,
          credit: line.debit,
        };
      });

      postJournalEntry(db, {
        entry_date: new Date().toISOString().split('T')[0],
        reference_no: `REV-${trx.trans_no}`,
        source_type: 'void_reversal',
        description: `PEMBALIKAN / VOID: ${origJournal.description} (Alasan: ${voidReason})`,
        lines: reversedLines,
      });

      // Tandai jurnal lama sebagai reversed
      db.prepare(`UPDATE journal_entries SET status = 'reversed' WHERE id = ?`).run(origJournal.id);
    }

    recordAuditLog({
      userId: voidedBy,
      action: 'VOID_TRANSACTION',
      tableName: 'transactions',
      recordId: transactionId,
      oldData: trx,
      reason: voidReason,
    });

    return { success: true };
  });

  return runAtomic();
}
