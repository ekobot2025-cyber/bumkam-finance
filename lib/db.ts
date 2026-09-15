import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Dukungan Vercel Serverless (/tmp directory) dan Lokal (data/)
const isVercel = !!process.env.VERCEL;
const dataDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'bumkam.db');

// Singleton database instance
let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(dbPath);
    // Aktifkan Foreign Keys dan WAL mode
    dbInstance.pragma('foreign_keys = ON');
    if (!isVercel) {
      dbInstance.pragma('journal_mode = WAL');
    }
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: Database.Database) {
  db.exec(`
    -- 1. Pengguna & Autentikasi
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'operator')) NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Profil Lembaga BUMKAM
    CREATE TABLE IF NOT EXISTS bumkam_profile (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      village_name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      logo_path TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Unit Usaha
    CREATE TABLE IF NOT EXISTS business_units (
      id INTEGER PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    -- 4. Pelanggan
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      gallon_balance INTEGER DEFAULT 0,
      total_receivable REAL DEFAULT 0.00,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Saldo Deposit Pulsa
    CREATE TABLE IF NOT EXISTS pulsa_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      current_balance REAL NOT NULL DEFAULT 0.00,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Inventaris Tabung Galon
    CREATE TABLE IF NOT EXISTS galon_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      available_qty INTEGER NOT NULL DEFAULT 0,
      customer_held_qty INTEGER NOT NULL DEFAULT 0,
      damaged_lost_qty INTEGER NOT NULL DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. Bagan Akun (Chart of Accounts)
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_code TEXT UNIQUE NOT NULL,
      account_name TEXT NOT NULL,
      category TEXT CHECK(category IN ('asset', 'liability', 'equity', 'revenue', 'expense')) NOT NULL,
      normal_balance TEXT CHECK(normal_balance IN ('debit', 'credit')) NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    -- 8. Transaksi Induk
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trans_no TEXT UNIQUE NOT NULL,
      trans_date DATE NOT NULL,
      unit_code TEXT NOT NULL,
      trans_type TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      payment_method TEXT CHECK(payment_method IN ('cash', 'credit', 'transfer')) NOT NULL,
      subtotal REAL NOT NULL,
      cogs_amount REAL DEFAULT 0.00,
      margin_amount REAL DEFAULT 0.00,
      status TEXT CHECK(status IN ('draft', 'posted', 'void')) DEFAULT 'posted',
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      voided_at DATETIME,
      voided_by INTEGER REFERENCES users(id),
      void_reason TEXT
    );

    -- 9. Rincian Pulsa
    CREATE TABLE IF NOT EXISTS pulsa_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      phone_number TEXT NOT NULL,
      provider TEXT NOT NULL,
      nominal REAL NOT NULL,
      cogs_price REAL NOT NULL,
      selling_price REAL NOT NULL
    );

    -- 10. Pergerakan Mutasi Galon
    CREATE TABLE IF NOT EXISTS galon_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      movement_type TEXT CHECK(movement_type IN ('in_refill', 'out_sale', 'return_empty', 'damaged_lost', 'initial_stock')) NOT NULL,
      qty INTEGER NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 11. Kartu Piutang
    CREATE TABLE IF NOT EXISTS receivables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0.00,
      remaining_amount REAL NOT NULL,
      due_date DATE,
      status TEXT CHECK(status IN ('unpaid', 'partial', 'paid', 'overdue')) DEFAULT 'unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 12. Pembayaran Piutang
    CREATE TABLE IF NOT EXISTS receivable_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_no TEXT UNIQUE NOT NULL,
      receivable_id INTEGER NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
      payment_date DATE NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('cash', 'transfer')) DEFAULT 'cash',
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 13. Buku Kas (Cash Transactions)
    CREATE TABLE IF NOT EXISTS cash_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trans_no TEXT UNIQUE NOT NULL,
      trans_date DATE NOT NULL,
      flow_type TEXT CHECK(flow_type IN ('in', 'out')) NOT NULL,
      source_type TEXT NOT NULL,
      reference_id INTEGER,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 14. Jurnal Akuntansi
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_no TEXT UNIQUE NOT NULL,
      entry_date DATE NOT NULL,
      reference_no TEXT,
      source_type TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT CHECK(status IN ('posted', 'reversed')) DEFAULT 'posted',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 15. Garis Jurnal (Double-entry line items)
    CREATE TABLE IF NOT EXISTS journal_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      debit REAL DEFAULT 0.00,
      credit REAL DEFAULT 0.00
    );

    -- 16. Audit Log
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      old_data TEXT,
      new_data TEXT,
      reason TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Index untuk performa
    CREATE INDEX IF NOT EXISTS idx_trans_date ON transactions(trans_date);
    CREATE INDEX IF NOT EXISTS idx_trans_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_cash_date ON cash_transactions(trans_date);
    CREATE INDEX IF NOT EXISTS idx_journal_entry_date ON journal_entries(entry_date);
  `);

  // Auto-seed jika database masih kosong (terutama saat pertama jalan di Vercel /tmp)
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (userCount.cnt === 0) {
    autoSeed(db);
  }
}

function autoSeed(db: Database.Database) {
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('admin123', salt);
  const opPass = bcrypt.hashSync('operator123', salt);

  // Users
  db.prepare(`
    INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role)
    VALUES (1, 'admin', ?, 'Administrator BUMKAM', 'admin'),
           (2, 'operator', ?, 'Bendahara / Operator Kampung', 'operator')
  `).run(adminPass, opPass);

  // Profile
  db.prepare(`
    INSERT OR REPLACE INTO bumkam_profile (id, name, village_name, address, phone)
    VALUES (1, 'BUMKAM Hen Wani', 'Kampung Enggros', 'Jl. Enggros No. 05, Distrik Abepura, Kota Jayapura, Papua', '081234567890')
  `).run();

  // Business Units
  db.prepare(`
    INSERT OR IGNORE INTO business_units (id, code, name)
    VALUES (1, 'PULSA', 'Unit Usaha Penjualan Pulsa'),
           (2, 'GALON', 'Unit Usaha Depot Air Galon'),
           (3, 'UMUM', 'Operasional Umum BUMKAM')
  `).run();

  // COA
  const coa = [
    ['1101', 'Kas Tunai', 'asset', 'debit'],
    ['1102', 'Kas Bank BUMKAM', 'asset', 'debit'],
    ['1103', 'Piutang Usaha', 'asset', 'debit'],
    ['1104', 'Persediaan / Saldo Pulsa', 'asset', 'debit'],
    ['1105', 'Persediaan Air Galon', 'asset', 'debit'],
    ['1201', 'Aset Tetap - Tabung Galon & Peralatan', 'asset', 'debit'],
    ['2101', 'Utang Usaha / Operasional', 'liability', 'credit'],
    ['3101', 'Modal Awal BUMKAM', 'equity', 'credit'],
    ['3201', 'Saldo Hasil Usaha Ditahan', 'equity', 'credit'],
    ['4101', 'Pendapatan Penjualan Pulsa', 'revenue', 'credit'],
    ['4102', 'Pendapatan Penjualan Air Galon', 'revenue', 'credit'],
    ['4201', 'Pendapatan Usaha Lainnya', 'revenue', 'credit'],
    ['5101', 'HPP Modal Pulsa', 'expense', 'debit'],
    ['5102', 'HPP Air & Tutup Galon', 'expense', 'debit'],
    ['6101', 'Beban Listrik & Depot', 'expense', 'debit'],
    ['6102', 'Beban Internet & Komunikasi', 'expense', 'debit'],
    ['6103', 'Beban Transportasi & Logistik', 'expense', 'debit'],
    ['6104', 'Beban Pemeliharaan & Filter', 'expense', 'debit'],
    ['6105', 'Beban Galon Rusak / Hilang', 'expense', 'debit'],
    ['6199', 'Beban Operasional Lainnya', 'expense', 'debit'],
  ];

  const insertAcc = db.prepare(`
    INSERT OR IGNORE INTO accounts (account_code, account_name, category, normal_balance, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);
  for (const a of coa) {
    insertAcc.run(a[0], a[1], a[2], a[3]);
  }

  // Initial balances
  db.prepare(`INSERT OR IGNORE INTO pulsa_balances (id, current_balance) VALUES (1, 1000000.00)`).run();
  db.prepare(`INSERT OR IGNORE INTO galon_inventory (id, available_qty, customer_held_qty, damaged_lost_qty) VALUES (1, 100, 0, 0)`).run();

  // Customers
  db.prepare(`
    INSERT OR IGNORE INTO customers (code, name, phone, address, gallon_balance, total_receivable)
    VALUES ('CUST-0001', 'Bapak Silas Itaar', '081344001122', 'Kampung Enggros RT 01', 0, 0.00),
           ('CUST-0002', 'Ibu Maria Haay', '081299887766', 'Kampung Enggros RT 02', 0, 0.00),
           ('CUST-0003', 'Bapak Yakob Sanyi', '085244556677', 'Kampung Enggros RT 01', 0, 0.00)
  `).run();

  // Initial Capital Journal
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT OR IGNORE INTO cash_transactions (trans_no, trans_date, flow_type, source_type, amount, description, created_by)
    VALUES ('CSH-INIT-001', ?, 'in', 'capital_injection', 5000000.00, 'Penyertaan Modal Kas Awal Kampung', 1)
  `).run(today);

  const jrnRes = db.prepare(`
    INSERT OR IGNORE INTO journal_entries (entry_no, entry_date, reference_no, source_type, description, status)
    VALUES ('JRN-INIT-0001', ?, 'MODAL-AWAL', 'capital_injection', 'Penyertaan Modal Awal BUMKAM Hen Wani', 'posted')
  `).run(today);
  const jrnId = Number(jrnRes.lastInsertRowid);

  if (jrnId > 0) {
    const accKas = db.prepare(`SELECT id FROM accounts WHERE account_code = '1101'`).get() as any;
    const accPulsa = db.prepare(`SELECT id FROM accounts WHERE account_code = '1104'`).get() as any;
    const accGalon = db.prepare(`SELECT id FROM accounts WHERE account_code = '1201'`).get() as any;
    const accModal = db.prepare(`SELECT id FROM accounts WHERE account_code = '3101'`).get() as any;

    const insLine = db.prepare(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)`);
    insLine.run(jrnId, accKas.id, 5000000.00, 0);
    insLine.run(jrnId, accPulsa.id, 1000000.00, 0);
    insLine.run(jrnId, accGalon.id, 3000000.00, 0);
    insLine.run(jrnId, accModal.id, 0, 9000000.00);
  }
}

export default getDb;
