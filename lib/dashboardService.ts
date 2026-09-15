import getDb from './db';
import { getIncomeStatement } from './accountingService';

export function getDashboardData(chartPeriod: '7days' | 'month' | 'year' = '7days') {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7); // 'YYYY-MM'

  // 1. Saldo Kas Riil (Total In - Total Out dari cash_transactions)
  const cashInRow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM cash_transactions WHERE flow_type = 'in'`).get() as { total: number };
  const cashOutRow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM cash_transactions WHERE flow_type = 'out'`).get() as { total: number };
  const cashBalance = Math.round((cashInRow.total - cashOutRow.total) * 100) / 100;

  // 2. Penjualan Hari Ini (Omset penjualan pulsa + galon posted hari ini)
  const salesTodayRow = db.prepare(`
    SELECT COALESCE(SUM(subtotal), 0) as total 
    FROM transactions 
    WHERE trans_date = ? AND status = 'posted' AND trans_type IN ('sale_pulsa', 'sale_galon')
  `).get(today) as { total: number };
  const salesToday = salesTodayRow.total;

  // 3. Piutang Belum Lunas
  const receivableRow = db.prepare(`
    SELECT COALESCE(SUM(remaining_amount), 0) as total 
    FROM receivables 
    WHERE remaining_amount > 0
  `).get() as { total: number };
  const pendingReceivables = receivableRow.total;

  // 4. Hasil Usaha Bulan Ini (Berdasarkan Laporan Laba Rugi Akuntansi Riil)
  const incomeStmtMonth = getIncomeStatement(`${currentMonth}-01`, `${currentMonth}-31`);
  const netIncomeMonth = incomeStmtMonth.total.netIncome;

  // --- UNIT PULSA METRICS ---
  const pulsaBalRow = db.prepare(`SELECT current_balance FROM pulsa_balances ORDER BY id DESC LIMIT 1`).get() as { current_balance: number } | undefined;
  const pulsaBalance = pulsaBalRow ? pulsaBalRow.current_balance : 0;

  const pulsaSalesTodayRow = db.prepare(`
    SELECT COALESCE(SUM(subtotal), 0) as total, COUNT(*) as count 
    FROM transactions 
    WHERE trans_date = ? AND status = 'posted' AND trans_type = 'sale_pulsa'
  `).get(today) as { total: number; count: number };

  const pulsaMarginMonth = incomeStmtMonth.pulsa.grossProfit;

  // --- UNIT GALON METRICS ---
  const galonInvRow = db.prepare(`
    SELECT available_qty, customer_held_qty, damaged_lost_qty 
    FROM galon_inventory ORDER BY id DESC LIMIT 1
  `).get() as { available_qty: number; customer_held_qty: number; damaged_lost_qty: number } | undefined;

  const galonAvailable = galonInvRow ? galonInvRow.available_qty : 0;
  const galonCustomerHeld = galonInvRow ? galonInvRow.customer_held_qty : 0;
  const galonDamagedLost = galonInvRow ? galonInvRow.damaged_lost_qty : 0;

  const galonSalesTodayRow = db.prepare(`
    SELECT COALESCE(SUM(subtotal), 0) as total, COUNT(*) as count 
    FROM transactions 
    WHERE trans_date = ? AND status = 'posted' AND trans_type = 'sale_galon'
  `).get(today) as { total: number; count: number };

  // --- GRAFIK PENDAPATAN & PENGELUARAN ---
  let chartData: Array<{ label: string; income: number; expense: number }> = [];

  if (chartPeriod === '7days') {
    // Ambil 7 hari terakhir
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'numeric' });

      const incRow = db.prepare(`
        SELECT COALESCE(SUM(subtotal), 0) as total 
        FROM transactions 
        WHERE trans_date = ? AND status = 'posted' AND trans_type IN ('sale_pulsa', 'sale_galon', 'income_other')
      `).get(dStr) as { total: number };

      const expRow = db.prepare(`
        SELECT COALESCE(SUM(subtotal), 0) as total 
        FROM transactions 
        WHERE trans_date = ? AND status = 'posted' AND trans_type IN ('expense', 'topup_pulsa')
      `).get(dStr) as { total: number };

      chartData.push({
        label,
        income: incRow.total,
        expense: expRow.total,
      });
    }
  } else if (chartPeriod === 'month') {
    // Group per minggu atau per beberapa hari dalam bulan ini
    for (let i = 1; i <= 31; i += 3) {
      const dayStart = `${currentMonth}-${i.toString().padStart(2, '0')}`;
      const dayEndNum = Math.min(31, i + 2);
      const dayEnd = `${currentMonth}-${dayEndNum.toString().padStart(2, '0')}`;
      const label = `Tgl ${i}-${dayEndNum}`;

      const incRow = db.prepare(`
        SELECT COALESCE(SUM(subtotal), 0) as total 
        FROM transactions 
        WHERE trans_date >= ? AND trans_date <= ? AND status = 'posted' AND trans_type IN ('sale_pulsa', 'sale_galon', 'income_other')
      `).get(dayStart, dayEnd) as { total: number };

      const expRow = db.prepare(`
        SELECT COALESCE(SUM(subtotal), 0) as total 
        FROM transactions 
        WHERE trans_date >= ? AND trans_date <= ? AND status = 'posted' AND trans_type IN ('expense', 'topup_pulsa')
      `).get(dayStart, dayEnd) as { total: number };

      chartData.push({
        label,
        income: incRow.total,
        expense: expRow.total,
      });
    }
  } else {
    // Tahun ini: 12 Bulan
    const currentYear = today.substring(0, 4);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    months.forEach((mName, idx) => {
      const mStr = `${currentYear}-${(idx + 1).toString().padStart(2, '0')}`;
      const incRow = db.prepare(`
        SELECT COALESCE(SUM(subtotal), 0) as total 
        FROM transactions 
        WHERE trans_date LIKE ? || '%' AND status = 'posted' AND trans_type IN ('sale_pulsa', 'sale_galon', 'income_other')
      `).get(mStr) as { total: number };

      const expRow = db.prepare(`
        SELECT COALESCE(SUM(subtotal), 0) as total 
        FROM transactions 
        WHERE trans_date LIKE ? || '%' AND status = 'posted' AND trans_type IN ('expense', 'topup_pulsa')
      `).get(mStr) as { total: number };

      chartData.push({
        label: mName,
        income: incRow.total,
        expense: expRow.total,
      });
    });
  }

  // --- 10 TRANSAKSI TERBARU ---
  const recentTransactions = db.prepare(`
    SELECT 
      t.id,
      t.trans_no,
      t.trans_date,
      t.unit_code,
      t.trans_type,
      t.payment_method,
      t.subtotal,
      t.margin_amount,
      t.status,
      c.name as customer_name,
      u.full_name as created_by_name
    FROM transactions t
    LEFT JOIN customers c ON t.customer_id = c.id
    LEFT JOIN users u ON t.created_by = u.id
    ORDER BY t.id DESC
    LIMIT 10
  `).all();

  return {
    kpis: {
      cashBalance,
      salesToday,
      pendingReceivables,
      netIncomeMonth,
    },
    pulsa: {
      balance: pulsaBalance,
      salesToday: pulsaSalesTodayRow.total,
      salesTodayCount: pulsaSalesTodayRow.count,
      marginMonth: pulsaMarginMonth,
    },
    galon: {
      availableQty: galonAvailable,
      customerHeldQty: galonCustomerHeld,
      damagedLostQty: galonDamagedLost,
      salesToday: galonSalesTodayRow.total,
      salesTodayCount: galonSalesTodayRow.count,
    },
    chartData,
    recentTransactions,
  };
}
