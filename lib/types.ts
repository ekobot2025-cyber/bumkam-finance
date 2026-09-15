export type UserRole = 'admin' | 'operator';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: number;
  created_at: string;
}

export interface BumkamProfile {
  id: number;
  name: string;
  village_name: string;
  address: string;
  phone: string;
  logo_path?: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  phone: string;
  address: string;
  gallon_balance: number; // Jumlah galon milik BUMKAM yang sedang dipegang
  total_receivable: number; // Total rupiah piutang aktif
  is_active: number;
  created_at: string;
}

export type TransactionType =
  | 'sale_pulsa'
  | 'topup_pulsa'
  | 'sale_galon'
  | 'galon_return'
  | 'expense'
  | 'income_other';

export type PaymentMethod = 'cash' | 'credit' | 'transfer';
export type TransactionStatus = 'draft' | 'posted' | 'void';

export interface Transaction {
  id: number;
  trans_no: string;
  trans_date: string;
  unit_code: 'PULSA' | 'GALON' | 'UMUM';
  trans_type: TransactionType;
  customer_id?: number | null;
  customer_name?: string | null;
  payment_method: PaymentMethod;
  subtotal: number;
  cogs_amount: number;
  margin_amount: number;
  status: TransactionStatus;
  notes?: string | null;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  voided_at?: string | null;
  voided_by?: number | null;
  void_reason?: string | null;
}

export interface PulsaDetail {
  id: number;
  transaction_id: number;
  phone_number: string;
  provider: string;
  nominal: number;
  cogs_price: number;
  selling_price: number;
}

export type GallonMovementType =
  | 'in_refill'
  | 'out_sale'
  | 'return_empty'
  | 'damaged_lost'
  | 'initial_stock';

export interface GalonMovement {
  id: number;
  transaction_id?: number | null;
  customer_id?: number | null;
  movement_type: GallonMovementType;
  qty: number;
  notes?: string | null;
  created_at: string;
}

export type ReceivableStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export interface Receivable {
  id: number;
  transaction_id: number;
  trans_no?: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date?: string | null;
  status: ReceivableStatus;
  created_at: string;
}

export interface ReceivablePayment {
  id: number;
  payment_no: string;
  receivable_id: number;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  notes?: string | null;
  created_by: number;
  created_at: string;
}

export interface CashTransaction {
  id: number;
  trans_no: string;
  trans_date: string;
  flow_type: 'in' | 'out';
  source_type: string;
  reference_id?: number | null;
  amount: number;
  description: string;
  created_by: number;
  created_at: string;
}

export type AccountCategory = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type NormalBalance = 'debit' | 'credit';

export interface Account {
  id: number;
  account_code: string;
  account_name: string;
  category: AccountCategory;
  normal_balance: NormalBalance;
  is_active: number;
}

export interface JournalEntry {
  id: number;
  entry_no: string;
  entry_date: string;
  reference_no?: string | null;
  source_type: string;
  description: string;
  status: 'posted' | 'reversed';
  created_at: string;
  lines?: JournalLine[];
}

export interface JournalLine {
  id: number;
  journal_entry_id: number;
  account_id: number;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
}

export interface AuditLog {
  id: number;
  user_id?: number | null;
  username?: string | null;
  action: string;
  table_name: string;
  record_id: number;
  old_data?: string | null;
  new_data?: string | null;
  reason?: string | null;
  ip_address?: string | null;
  created_at: string;
}
