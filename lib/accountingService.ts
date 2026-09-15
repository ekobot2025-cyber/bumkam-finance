import Database from 'better-sqlite3';
import getDb from './db';
import { Account, JournalEntry } from './types';

// Standar COA BUMKAM Hen Wani
export const DEFAULT_ACCOUNTS = [
  // 1000: Aset
  { account_code: '1101', account_name: 'Kas Tunai', category: 'asset', normal_balance: 'debit' },
  { account_code: '1102', account_name: 'Kas Bank BUMKAM', category: 'asset', normal_balance: 'debit' },
  { account_code: '1103', account_name: 'Piutang Usaha', category: 'asset', normal_balance: 'debit' },
  { account_code: '1104', account_name: 'Persediaan / Saldo Pulsa', category: 'asset', normal_balance: 'debit' },
  { account_code: '1105', account_name: 'Persediaan Air Galon', category: 'asset', normal_balance: 'debit' },
  { account_code: '1201', account_name: 'Aset Tetap - Tabung Galon & Peralatan', category: 'asset', normal_balance: 'debit' },
  
  // 2000: Liabilitas
  { account_code: '2101', account_name: 'Utang Usaha / Operasional', category: 'liability', normal_balance: 'credit' },
  
  // 3000: Ekuitas
  { account_code: '3101', account_name: 'Modal Awal BUMKAM', category: 'equity', normal_balance: 'credit' },
  { account_code: '3201', account_name: 'Saldo Hasil Usaha Ditahan', category: 'equity', normal_balance: 'credit' },
  
  // 4000: Pendapatan
  { account_code: '4101', account_name: 'Pendapatan Penjualan Pulsa', category: 'revenue', normal_balance: 'credit' },
  { account_code: '4102', account_name: 'Pendapatan Penjualan Air Galon', category: 'revenue', normal_balance: 'credit' },
  { account_code: '4201', account_name: 'Pendapatan Usaha Lainnya', category: 'revenue', normal_balance: 'credit' },
  
  // 5000: Harga Pokok Penjualan (HPP)
  { account_code: '5101', account_name: 'HPP Modal Pulsa', category: 'expense', normal_balance: 'debit' },
  { account_code: '5102', account_name: 'HPP Air & Tutup Galon', category: 'expense', normal_balance: 'debit' },
  
  // 6000: Beban Operasional
  { account_code: '6101', account_name: 'Beban Listrik & Depot', category: 'expense', normal_balance: 'debit' },
  { account_code: '6102', account_name: 'Beban Internet & Komunikasi', category: 'expense', normal_balance: 'debit' },
  { account_code: '6103', account_name: 'Beban Transportasi & Logistik', category: 'expense', normal_balance: 'debit' },
  { account_code: '6104', account_name: 'Beban Pemeliharaan & Filter', category: 'expense', normal_balance: 'debit' },
  { account_code: '6105', account_name: 'Beban Galon Rusak / Hilang', category: 'expense', normal_balance: 'debit' },
  { account_code: '6199', account_name: 'Beban Operasional Lainnya', category: 'expense', normal_balance: 'debit' },
];

export function ensureDefaultAccounts(db: Database.Database) {
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO accounts (account_code, account_name, category, normal_balance, is_active)
    VALUES (@account_code, @account_name, @category, @normal_balance, 1)
  `);

  const insertMany = db.transaction((accounts: typeof DEFAULT_ACCOUNTS) => {
    for (const acc of accounts) {
      insertStmt.run(acc);
    }
  });

  insertMany(DEFAULT_ACCOUNTS);
}

export interface JournalLineInput {
  account_code: string;
  debit: number;
  credit: number;
}

export interface CreateJournalParams {
  entry_date: string;
  reference_no?: string | null;
  source_type: string;
  description: string;
  lines: JournalLineInput[];
}

/**
 * Membuat entri jurnal dengan validasi Double-Entry Balance (Total Debit === Total Kredit)
 * Harus dijalankan di dalam context db transaction
 */
export function postJournalEntry(db: Database.Database, params: CreateJournalParams): number {
  // 1. Validasi Double-Entry: Total Debit harus sama dengan Total Kredit
  const totalDebit = Math.round(params.lines.reduce((sum, line) => sum + (line.debit || 0), 0) * 100) / 100;
  const totalCredit = Math.round(params.lines.reduce((sum, line) => sum + (line.credit || 0), 0) * 100) / 100;

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`JURNAL TIDAK BALANCE! Total Debit (Rp${totalDebit}) != Total Kredit (Rp${totalCredit}).`);
  }

  // Generate nomor jurnal otomatis JRN-YYYYMM-XXXX
  const yearMonth = params.entry_date.substring(0, 7).replace('-', '');
  const countRow = db.prepare(`
    SELECT COUNT(*) as count FROM journal_entries 
    WHERE entry_no LIKE 'JRN-' || ? || '-%'
  `).get(yearMonth) as { count: number };

  const nextSeq = (countRow.count + 1).toString().padStart(4, '0');
  const entryNo = `JRN-${yearMonth}-${nextSeq}`;

  const insertEntry = db.prepare(`
    INSERT INTO journal_entries (entry_no, entry_date, reference_no, source_type, description, status)
    VALUES (?, ?, ?, ?, ?, 'posted')
  `);

  const result = insertEntry.run(
    entryNo,
    params.entry_date,
    params.reference_no ?? null,
    params.source_type,
    params.description
  );
  const journalEntryId = Number(result.lastInsertRowid);

  // Simpan lines
  const insertLine = db.prepare(`
    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
    VALUES (?, ?, ?, ?)
  `);

  for (const line of params.lines) {
    // Cari account ID berdasarkan account_code
    const acc = db.prepare(`SELECT id FROM accounts WHERE account_code = ?`).get(line.account_code) as { id: number } | undefined;
    if (!acc) {
      throw new Error(`Akun dengan kode ${line.account_code} tidak ditemukan di Bagan Akun!`);
    }
    insertLine.run(journalEntryId, acc.id, line.debit || 0, line.credit || 0);
  }

  return journalEntryId;
}

/**
 * Ambil Buku Besar (General Ledger) untuk akun tertentu atau semua akun
 */
export function getGeneralLedger(startDate?: string, endDate?: string, accountCode?: string) {
  const db = getDb();
  let query = `
    SELECT 
      jl.id,
      je.entry_no,
      je.entry_date,
      je.reference_no,
      je.source_type,
      je.description,
      je.status,
      a.account_code,
      a.account_name,
      a.category,
      a.normal_balance,
      jl.debit,
      jl.credit
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    JOIN accounts a ON jl.account_id = a.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (startDate) {
    query += ` AND je.entry_date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND je.entry_date <= ?`;
    params.push(endDate);
  }
  if (accountCode) {
    query += ` AND a.account_code = ?`;
    params.push(accountCode);
  }

  query += ` ORDER BY je.entry_date ASC, je.id ASC, jl.id ASC`;

  return db.prepare(query).all(...params);
}

/**
 * Neraca Saldo (Trial Balance)
 */
export function getTrialBalance(asOfDate?: string) {
  const db = getDb();
  let query = `
    SELECT 
      a.id,
      a.account_code,
      a.account_name,
      a.category,
      a.normal_balance,
      COALESCE(SUM(jl.debit), 0) as total_debit,
      COALESCE(SUM(jl.credit), 0) as total_credit
    FROM accounts a
    LEFT JOIN journal_lines jl ON a.id = jl.account_id
    LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id AND je.status != 'reversed'
  `;
  const params: any[] = [];

  if (asOfDate) {
    query += ` AND je.entry_date <= ?`;
    params.push(asOfDate);
  }

  query += ` GROUP BY a.id ORDER BY a.account_code ASC`;

  const rows = db.prepare(query).all(...params) as any[];

  return rows.map((row) => {
    let endingBalance = 0;
    if (row.normal_balance === 'debit') {
      endingBalance = row.total_debit - row.total_credit;
    } else {
      endingBalance = row.total_credit - row.total_debit;
    }
    return {
      ...row,
      ending_balance: endingBalance,
    };
  });
}

/**
 * Laporan Laba Rugi (Income Statement / Hasil Usaha)
 * Memisahkan Laba Usaha Pulsa, Usaha Galon, dan Total Bersih BUMKAM
 */
export function getIncomeStatement(startDate?: string, endDate?: string) {
  const db = getDb();
  let dateFilter = '';
  const params: any[] = [];

  if (startDate) {
    dateFilter += ` AND je.entry_date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND je.entry_date <= ?`;
    params.push(endDate);
  }

  // 1. Pendapatan Pulsa (4101) & HPP Pulsa (5101)
  const pulsaRevRow = db.prepare(`
    SELECT COALESCE(SUM(jl.credit - jl.debit), 0) as amount
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id AND je.status != 'reversed'
    JOIN accounts a ON jl.account_id = a.id
    WHERE a.account_code = '4101' ${dateFilter}
  `).get(...params) as { amount: number };

  const pulsaCogsRow = db.prepare(`
    SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as amount
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id AND je.status != 'reversed'
    JOIN accounts a ON jl.account_id = a.id
    WHERE a.account_code = '5101' ${dateFilter}
  `).get(...params) as { amount: number };

  const pulsaRevenue = pulsaRevRow?.amount || 0;
  const pulsaCogs = pulsaCogsRow?.amount || 0;
  const pulsaGrossProfit = pulsaRevenue - pulsaCogs;

  // 2. Pendapatan Galon (4102) & HPP Galon (5102 jika ada)
  const galonRevRow = db.prepare(`
    SELECT COALESCE(SUM(jl.credit - jl.debit), 0) as amount
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id AND je.status != 'reversed'
    JOIN accounts a ON jl.account_id = a.id
    WHERE a.account_code = '4102' ${dateFilter}
  `).get(...params) as { amount: number };

  const galonCogsRow = db.prepare(`
    SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as amount
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id AND je.status != 'reversed'
    JOIN accounts a ON jl.account_id = a.id
    WHERE a.account_code = '5102' ${dateFilter}
  `).get(...params) as { amount: number };

  const galonRevenue = galonRevRow?.amount || 0;
  const galonCogs = galonCogsRow?.amount || 0;
  const galonGrossProfit = galonRevenue - galonCogs;

  // 3. Pendapatan Lain-lain (4201)
  const otherRevRow = db.prepare(`
    SELECT COALESCE(SUM(jl.credit - jl.debit), 0) as amount
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id AND je.status != 'reversed'
    JOIN accounts a ON jl.account_id = a.id
    WHERE a.account_code = '4201' ${dateFilter}
  `).get(...params) as { amount: number };
  const otherRevenue = otherRevRow?.amount || 0;

  // Total Laba Kotor
  const totalRevenue = pulsaRevenue + galonRevenue + otherRevenue;
  const totalCogs = pulsaCogs + galonCogs;
  const totalGrossProfit = totalRevenue - totalCogs;

  // 4. Rincian Beban Operasional (6xxx)
  const expenses = db.prepare(`
    SELECT 
      a.account_code,
      a.account_name,
      COALESCE(SUM(jl.debit - jl.credit), 0) as amount
    FROM accounts a
    LEFT JOIN journal_lines jl ON a.id = jl.account_id
    LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id AND je.status != 'reversed' ${dateFilter}
    WHERE a.category = 'expense' AND a.account_code LIKE '6%'
    GROUP BY a.id
    HAVING amount > 0
    ORDER BY a.account_code ASC
  `).all(...params) as Array<{ account_code: string; account_name: string; amount: number }>;

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

  // Hasil Usaha Bersih (Net Profit)
  const netIncome = totalGrossProfit - totalExpenses;

  return {
    pulsa: {
      revenue: pulsaRevenue,
      cogs: pulsaCogs,
      grossProfit: pulsaGrossProfit,
    },
    galon: {
      revenue: galonRevenue,
      cogs: galonCogs,
      grossProfit: galonGrossProfit,
    },
    otherRevenue,
    total: {
      revenue: totalRevenue,
      cogs: totalCogs,
      grossProfit: totalGrossProfit,
      expenses,
      totalExpenses,
      netIncome,
    },
  };
}

/**
 * Neraca Keuangan (Balance Sheet / Posisi Keuangan)
 */
export function getBalanceSheet(asOfDate?: string) {
  const trialBalance = getTrialBalance(asOfDate);

  const assets = trialBalance.filter(acc => acc.category === 'asset');
  const liabilities = trialBalance.filter(acc => acc.category === 'liability');
  const equities = trialBalance.filter(acc => acc.category === 'equity');

  const totalAssets = assets.reduce((sum, a) => sum + a.ending_balance, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.ending_balance, 0);
  
  // Hitung laba periode berjalan dari Laba Rugi hingga tanggal tersebut
  const incomeStmt = getIncomeStatement(undefined, asOfDate);
  const currentPeriodProfit = incomeStmt.total.netIncome;

  const baseEquity = equities.reduce((sum, e) => sum + e.ending_balance, 0);
  const totalEquity = baseEquity + currentPeriodProfit;

  return {
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equities,
    currentPeriodProfit,
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
}

/**
 * Laporan Arus Kas (Cash Flow)
 */
export function getCashFlowStatement(startDate?: string, endDate?: string) {
  const db = getDb();
  let query = `
    SELECT 
      flow_type,
      source_type,
      description,
      amount,
      trans_date
    FROM cash_transactions
    WHERE 1=1
  `;
  const params: any[] = [];
  if (startDate) {
    query += ` AND trans_date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND trans_date <= ?`;
    params.push(endDate);
  }
  query += ` ORDER BY trans_date ASC`;

  const rows = db.prepare(query).all(...params) as Array<{
    flow_type: 'in' | 'out';
    source_type: string;
    description: string;
    amount: number;
    trans_date: string;
  }>;

  const cashIn = rows.filter(r => r.flow_type === 'in');
  const cashOut = rows.filter(r => r.flow_type === 'out');

  const totalCashIn = cashIn.reduce((sum, r) => sum + r.amount, 0);
  const totalCashOut = cashOut.reduce((sum, r) => sum + r.amount, 0);
  const netCashFlow = totalCashIn - totalCashOut;

  return {
    cashIn,
    cashOut,
    totalCashIn,
    totalCashOut,
    netCashFlow,
  };
}
