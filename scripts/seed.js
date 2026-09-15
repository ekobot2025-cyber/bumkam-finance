const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'bumkam.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

console.log('--- INISIALISASI DATABASE & SEEDER BUMKAM FINANCE ---');

// 1. Eksekusi Schema
const schemaSql = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'operator')) NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bumkam_profile (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    village_name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    logo_path TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS business_units (
    id INTEGER PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1
  );

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

  CREATE TABLE IF NOT EXISTS pulsa_balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    current_balance REAL NOT NULL DEFAULT 0.00,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS galon_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    available_qty INTEGER NOT NULL DEFAULT 0,
    customer_held_qty INTEGER NOT NULL DEFAULT 0,
    damaged_lost_qty INTEGER NOT NULL DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_code TEXT UNIQUE NOT NULL,
    account_name TEXT NOT NULL,
    category TEXT CHECK(category IN ('asset', 'liability', 'equity', 'revenue', 'expense')) NOT NULL,
    normal_balance TEXT CHECK(normal_balance IN ('debit', 'credit')) NOT NULL,
    is_active INTEGER DEFAULT 1
  );

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

  CREATE TABLE IF NOT EXISTS pulsa_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    provider TEXT NOT NULL,
    nominal REAL NOT NULL,
    cogs_price REAL NOT NULL,
    selling_price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS galon_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    movement_type TEXT CHECK(movement_type IN ('in_refill', 'out_sale', 'return_empty', 'damaged_lost', 'initial_stock')) NOT NULL,
    qty INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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

  CREATE TABLE IF NOT EXISTS journal_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    debit REAL DEFAULT 0.00,
    credit REAL DEFAULT 0.00
  );

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
`;

db.exec(schemaSql);
console.log('[OK] Skema tabel berhasil dibuat.');

// 2. Seed Users
const salt = bcrypt.genSaltSync(10);
const adminPass = bcrypt.hashSync('admin123', salt);
const opPass = bcrypt.hashSync('operator123', salt);

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role)
  VALUES (?, ?, ?, ?, ?)
`);
insertUser.run(1, 'admin', adminPass, 'Administrator BUMKAM', 'admin');
insertUser.run(2, 'operator', opPass, 'Bendahara / Operator Kampung', 'operator');
console.log('[OK] Data Pengguna berhasil di-seed (admin & operator).');

// 3. Seed Profil BUMKAM
const insertProfile = db.prepare(`
  INSERT OR REPLACE INTO bumkam_profile (id, name, village_name, address, phone)
  VALUES (1, 'BUMKAM Hen Wani', 'Kampung Enggros', 'Jl. Enggros No. 05, Distrik Abepura, Kota Jayapura, Papua', '081234567890')
`);
insertProfile.run();
console.log('[OK] Profil BUMKAM Hen Wani berhasil di-seed.');

// 4. Seed Unit Usaha
const insertUnit = db.prepare(`
  INSERT OR IGNORE INTO business_units (id, code, name)
  VALUES (?, ?, ?)
`);
insertUnit.run(1, 'PULSA', 'Unit Usaha Penjualan Pulsa');
insertUnit.run(2, 'GALON', 'Unit Usaha Depot Air Galon');
insertUnit.run(3, 'UMUM', 'Operasional Umum BUMKAM');
console.log('[OK] Unit Usaha berhasil di-seed.');

// 5. Seed Chart of Accounts
const defaultAccounts = [
  { account_code: '1101', account_name: 'Kas Tunai', category: 'asset', normal_balance: 'debit' },
  { account_code: '1102', account_name: 'Kas Bank BUMKAM', category: 'asset', normal_balance: 'debit' },
  { account_code: '1103', account_name: 'Piutang Usaha', category: 'asset', normal_balance: 'debit' },
  { account_code: '1104', account_name: 'Persediaan / Saldo Pulsa', category: 'asset', normal_balance: 'debit' },
  { account_code: '1105', account_name: 'Persediaan Air Galon', category: 'asset', normal_balance: 'debit' },
  { account_code: '1201', account_name: 'Aset Tetap - Tabung Galon & Peralatan', category: 'asset', normal_balance: 'debit' },
  { account_code: '2101', account_name: 'Utang Usaha / Operasional', category: 'liability', normal_balance: 'credit' },
  { account_code: '3101', account_name: 'Modal Awal BUMKAM', category: 'equity', normal_balance: 'credit' },
  { account_code: '3201', account_name: 'Saldo Hasil Usaha Ditahan', category: 'equity', normal_balance: 'credit' },
  { account_code: '4101', account_name: 'Pendapatan Penjualan Pulsa', category: 'revenue', normal_balance: 'credit' },
  { account_code: '4102', account_name: 'Pendapatan Penjualan Air Galon', category: 'revenue', normal_balance: 'credit' },
  { account_code: '4201', account_name: 'Pendapatan Usaha Lainnya', category: 'revenue', normal_balance: 'credit' },
  { account_code: '5101', account_name: 'HPP Modal Pulsa', category: 'expense', normal_balance: 'debit' },
  { account_code: '5102', account_name: 'HPP Air & Tutup Galon', category: 'expense', normal_balance: 'debit' },
  { account_code: '6101', account_name: 'Beban Listrik & Depot', category: 'expense', normal_balance: 'debit' },
  { account_code: '6102', account_name: 'Beban Internet & Komunikasi', category: 'expense', normal_balance: 'debit' },
  { account_code: '6103', account_name: 'Beban Transportasi & Logistik', category: 'expense', normal_balance: 'debit' },
  { account_code: '6104', account_name: 'Beban Pemeliharaan & Filter', category: 'expense', normal_balance: 'debit' },
  { account_code: '6105', account_name: 'Beban Galon Rusak / Hilang', category: 'expense', normal_balance: 'debit' },
  { account_code: '6199', account_name: 'Beban Operasional Lainnya', category: 'expense', normal_balance: 'debit' },
];

const insertAcc = db.prepare(`
  INSERT OR IGNORE INTO accounts (account_code, account_name, category, normal_balance, is_active)
  VALUES (@account_code, @account_name, @category, @normal_balance, 1)
`);
for (const acc of defaultAccounts) {
  insertAcc.run(acc);
}
console.log('[OK] Bagan Akun (Chart of Accounts) berhasil di-seed.');

// 6. Seed Saldo Awal Pulsa & Galon jika belum ada
const pulsaCount = db.prepare(`SELECT COUNT(*) as cnt FROM pulsa_balances`).get().cnt;
if (pulsaCount === 0) {
  db.prepare(`INSERT INTO pulsa_balances (id, current_balance) VALUES (1, 1000000.00)`).run();
  console.log('[OK] Saldo Deposit Pulsa Awal di-seed: Rp1.000.000.');
}

const galonCount = db.prepare(`SELECT COUNT(*) as cnt FROM galon_inventory`).get().cnt;
if (galonCount === 0) {
  db.prepare(`INSERT INTO galon_inventory (id, available_qty, customer_held_qty, damaged_lost_qty) VALUES (1, 100, 0, 0)`).run();
  console.log('[OK] Stok Galon Tersedia Awal di-seed: 100 tabung.');
}

// 7. Seed Pelanggan Contoh
const sampleCustomers = [
  { code: 'CUST-0001', name: 'Bapak Silas Itaar', phone: '081344001122', address: 'Kampung Enggros RT 01' },
  { code: 'CUST-0002', name: 'Ibu Maria Haay', phone: '081299887766', address: 'Kampung Enggros RT 02' },
  { code: 'CUST-0003', name: 'Bapak Yakob Sanyi', phone: '085244556677', address: 'Kampung Enggros RT 01' },
];

const insertCust = db.prepare(`
  INSERT OR IGNORE INTO customers (code, name, phone, address, gallon_balance, total_receivable)
  VALUES (@code, @name, @phone, @address, 0, 0.00)
`);
for (const cust of sampleCustomers) {
  insertCust.run(cust);
}
console.log('[OK] Data Pelanggan awal berhasil di-seed.');

// 8. Seed Saldo Kas Awal & Jurnal Modal Awal BUMKAM jika belum pernah ada jurnal
const journalCount = db.prepare(`SELECT COUNT(*) as cnt FROM journal_entries`).get().cnt;
if (journalCount === 0) {
  const today = new Date().toISOString().split('T')[0];
  
  // Kas awal: Rp5.000.000, Saldo Pulsa: Rp1.000.000, Aset Galon: Rp3.000.000 -> Total Modal Awal: Rp9.000.000
  db.prepare(`
    INSERT INTO cash_transactions (trans_no, trans_date, flow_type, source_type, amount, description, created_by)
    VALUES ('CSH-INIT-001', ?, 'in', 'capital_injection', 5000000.00, 'Penyertaan Modal Kas Awal Kampung', 1)
  `).run(today);

  const jrnRes = db.prepare(`
    INSERT INTO journal_entries (entry_no, entry_date, reference_no, source_type, description, status)
    VALUES ('JRN-INIT-0001', ?, 'MODAL-AWAL', 'capital_injection', 'Penyertaan Modal Awal BUMKAM Hen Wani', 'posted')
  `).run(today);
  const jrnId = Number(jrnRes.lastInsertRowid);

  const accKas = db.prepare(`SELECT id FROM accounts WHERE account_code = '1101'`).get().id;
  const accPulsa = db.prepare(`SELECT id FROM accounts WHERE account_code = '1104'`).get().id;
  const accGalon = db.prepare(`SELECT id FROM accounts WHERE account_code = '1201'`).get().id;
  const accModal = db.prepare(`SELECT id FROM accounts WHERE account_code = '3101'`).get().id;

  const insertJrnLine = db.prepare(`
    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
    VALUES (?, ?, ?, ?)
  `);

  insertJrnLine.run(jrnId, accKas, 5000000.00, 0);
  insertJrnLine.run(jrnId, accPulsa, 1000000.00, 0);
  insertJrnLine.run(jrnId, accGalon, 3000000.00, 0);
  insertJrnLine.run(jrnId, accModal, 0, 9000000.00);

  console.log('[OK] Jurnal Penyertaan Modal Awal (Rp9.000.000) berhasil dibentuk (Debit = Kredit = Rp9.000.000).');
}

console.log('--- SEEDER SELESAI DENGAN SUKSES! ---');
