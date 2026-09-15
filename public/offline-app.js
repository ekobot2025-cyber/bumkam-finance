// BUMKAM Finance — Standalone Offline Engine untuk Android APK
// BUMKAM Hen Wani, Kampung Enggros
(function () {
  const STORAGE_KEY = 'BUMKAM_FINANCE_OFFLINE_DB';

  // Inisialisasi Database Lokal HP jika belum ada
  function getOfflineDB() {
    let dbStr = localStorage.getItem(STORAGE_KEY);
    if (!dbStr) {
      const initialDB = createInitialDB();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDB));
      return initialDB;
    }
    try {
      return JSON.parse(dbStr);
    } catch {
      const initialDB = createInitialDB();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDB));
      return initialDB;
    }
  }

  function saveOfflineDB(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function createInitialDB() {
    return {
      profile: {
        name: 'BUMKAM Hen Wani',
        village_name: 'Kampung Enggros',
        address: 'Jl. Enggros No. 05, Distrik Abepura, Kota Jayapura, Papua',
        phone: '081234567890'
      },
      user: {
        id: 1,
        username: 'operator',
        full_name: 'Bendahara / Operator Kampung',
        role: 'operator'
      },
      pulsa_balance: 1000000,
      galon_inventory: {
        available_qty: 100,
        customer_held_qty: 0,
        damaged_lost_qty: 0
      },
      customers: [
        { id: 1, code: 'CUST-0001', name: 'Bapak Silas Itaar', phone: '081344001122', address: 'Kampung Enggros RT 01', gallon_balance: 0, total_receivable: 0 },
        { id: 2, code: 'CUST-0002', name: 'Ibu Maria Haay', phone: '081299887766', address: 'Kampung Enggros RT 02', gallon_balance: 0, total_receivable: 0 },
        { id: 3, code: 'CUST-0003', name: 'Bapak Yakob Sanyi', phone: '085244556677', address: 'Kampung Enggros RT 01', gallon_balance: 0, total_receivable: 0 }
      ],
      transactions: [],
      receivables: [],
      receivable_payments: [],
      cash_transactions: [
        { id: 1, trans_no: 'CSH-INIT-001', trans_date: new Date().toISOString().split('T')[0], flow_type: 'in', source_type: 'capital_injection', amount: 5000000, description: 'Penyertaan Modal Kas Awal Kampung' }
      ],
      galon_movements: [],
      journal_entries: [
        {
          id: 1,
          entry_no: 'JRN-INIT-0001',
          entry_date: new Date().toISOString().split('T')[0],
          reference_no: 'MODAL-AWAL',
          description: 'Penyertaan Modal Awal BUMKAM Hen Wani',
          lines: [
            { account_code: '1101', account_name: 'Kas Tunai', debit: 5000000, credit: 0 },
            { account_code: '1104', account_name: 'Persediaan / Saldo Pulsa', debit: 1000000, credit: 0 },
            { account_code: '1201', account_name: 'Aset Tetap Tabung & Depot', debit: 3000000, credit: 0 },
            { account_code: '3101', account_name: 'Modal Awal BUMKAM', debit: 0, credit: 9000000 }
          ]
        }
      ]
    };
  }

  // State Aplikasi
  let currentTab = 'dashboard';
  let message = null;

  function showMessage(type, text) {
    message = { type, text };
    render();
    setTimeout(() => {
      message = null;
      render();
    }, 4000);
  }

  // --- BUSINESS LOGIC SERVICES (100% OFFLINE) ---

  function sellPulsa(formData) {
    const db = getOfflineDB();
    const cogs = Number(formData.cogs_price);
    const sell = Number(formData.selling_price);

    if (cogs > db.pulsa_balance) {
      showMessage('error', `Saldo pulsa tidak mencukupi! (Sisa: Rp${db.pulsa_balance.toLocaleString('id-ID')})`);
      return;
    }
    if (formData.payment_method === 'credit' && !formData.customer_id) {
      showMessage('error', 'Pelanggan wajib dipilih untuk penjualan kredit!');
      return;
    }

    const margin = sell - cogs;
    const transId = Date.now();
    const transNo = `TRX-PLS-${transId.toString().slice(-6)}`;
    const today = formData.trans_date || new Date().toISOString().split('T')[0];

    // Potong saldo deposit pulsa
    db.pulsa_balance -= cogs;

    const customer = db.customers.find(c => c.id === Number(formData.customer_id));

    // Simpan transaksi
    db.transactions.unshift({
      id: transId,
      trans_no: transNo,
      trans_date: today,
      unit_code: 'PULSA',
      trans_type: 'sale_pulsa',
      customer_id: customer ? customer.id : null,
      customer_name: customer ? customer.name : null,
      payment_method: formData.payment_method,
      subtotal: sell,
      cogs_amount: cogs,
      margin_amount: margin,
      status: 'posted',
      notes: `${formData.provider} ${formData.nominal} (${formData.phone_number})`
    });

    // Kas atau Piutang
    if (formData.payment_method === 'cash') {
      db.cash_transactions.unshift({
        id: Date.now(),
        trans_no: `CSH-${transId.toString().slice(-6)}`,
        trans_date: today,
        flow_type: 'in',
        source_type: 'sale_pulsa',
        amount: sell,
        description: `Penjualan Pulsa Tunai ${transNo}`
      });
    } else {
      db.receivables.unshift({
        id: Date.now(),
        transaction_id: transId,
        trans_no: transNo,
        trans_date: today,
        unit_code: 'PULSA',
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        total_amount: sell,
        paid_amount: 0,
        remaining_amount: sell,
        status: 'unpaid'
      });
      customer.total_receivable += sell;
    }

    // Jurnal Double-Entry
    db.journal_entries.unshift({
      id: Date.now(),
      entry_no: `JRN-${transId.toString().slice(-6)}`,
      entry_date: today,
      reference_no: transNo,
      description: `Penjualan Pulsa ${formData.provider} ${formData.phone_number}`,
      lines: [
        { account_code: formData.payment_method === 'cash' ? '1101' : '1103', account_name: formData.payment_method === 'cash' ? 'Kas Tunai' : 'Piutang Usaha', debit: sell, credit: 0 },
        { account_code: '4101', account_name: 'Pendapatan Pulsa', debit: 0, credit: sell },
        { account_code: '5101', account_name: 'HPP Modal Pulsa', debit: cogs, credit: 0 },
        { account_code: '1104', account_name: 'Persediaan / Saldo Pulsa', debit: 0, credit: cogs }
      ]
    });

    saveOfflineDB(db);
    showMessage('success', `Penjualan pulsa berhasil disimpan! Margin: Rp${margin.toLocaleString('id-ID')}`);
  }

  function topupPulsa(formData) {
    const db = getOfflineDB();
    const nominal = Number(formData.nominal_saldo);
    const cost = Number(formData.cost_price);
    const today = formData.trans_date || new Date().toISOString().split('T')[0];
    const transId = Date.now();
    const transNo = `TOP-PLS-${transId.toString().slice(-6)}`;

    db.pulsa_balance += nominal;

    db.cash_transactions.unshift({
      id: Date.now(),
      trans_no: `CSH-${transId.toString().slice(-6)}`,
      trans_date: today,
      flow_type: 'out',
      source_type: 'topup_pulsa',
      amount: cost,
      description: `Top Up Saldo Pulsa ${transNo}`
    });

    db.transactions.unshift({
      id: transId,
      trans_no: transNo,
      trans_date: today,
      unit_code: 'PULSA',
      trans_type: 'topup_pulsa',
      payment_method: 'cash',
      subtotal: cost,
      cogs_amount: cost,
      margin_amount: 0,
      status: 'posted',
      notes: `Top up saldo Rp${nominal.toLocaleString('id-ID')}`
    });

    db.journal_entries.unshift({
      id: Date.now(),
      entry_no: `JRN-${transId.toString().slice(-6)}`,
      entry_date: today,
      reference_no: transNo,
      description: `Top up Saldo Deposit Pulsa (${transNo})`,
      lines: [
        { account_code: '1104', account_name: 'Persediaan / Saldo Pulsa', debit: cost, credit: 0 },
        { account_code: '1101', account_name: 'Kas Tunai', debit: 0, credit: cost }
      ]
    });

    saveOfflineDB(db);
    showMessage('success', `Saldo pulsa berhasil ditambah Rp${nominal.toLocaleString('id-ID')}`);
  }

  function sellGalon(formData) {
    const db = getOfflineDB();
    const qty = Number(formData.qty);
    const price = Number(formData.unit_price);
    const total = qty * price;

    if (qty > db.galon_inventory.available_qty) {
      showMessage('error', `Stok galon tidak mencukupi! (Tersedia: ${db.galon_inventory.available_qty} tabung)`);
      return;
    }
    if (formData.payment_method === 'credit' && !formData.customer_id) {
      showMessage('error', 'Pelanggan wajib dipilih untuk penjualan galon kredit!');
      return;
    }

    const transId = Date.now();
    const transNo = `TRX-GLN-${transId.toString().slice(-6)}`;
    const today = formData.trans_date || new Date().toISOString().split('T')[0];
    const customer = db.customers.find(c => c.id === Number(formData.customer_id));

    // Potong stok galon siap jual
    db.galon_inventory.available_qty -= qty;

    if (formData.gallon_action === 'borrow') {
      db.galon_inventory.customer_held_qty += qty;
      if (customer) customer.gallon_balance += qty;
    }

    db.galon_movements.unshift({
      id: Date.now(),
      movement_type: 'out_sale',
      qty,
      customer_name: customer ? customer.name : 'Umum',
      created_at: today,
      notes: `Penjualan ${transNo}`
    });

    db.transactions.unshift({
      id: transId,
      trans_no: transNo,
      trans_date: today,
      unit_code: 'GALON',
      trans_type: 'sale_galon',
      customer_id: customer ? customer.id : null,
      customer_name: customer ? customer.name : null,
      payment_method: formData.payment_method,
      subtotal: total,
      cogs_amount: 0,
      margin_amount: total,
      status: 'posted',
      notes: `Penjualan ${qty} galon @Rp${price.toLocaleString('id-ID')}`
    });

    // Kas atau Piutang
    if (formData.payment_method === 'cash') {
      db.cash_transactions.unshift({
        id: Date.now(),
        trans_no: `CSH-${transId.toString().slice(-6)}`,
        trans_date: today,
        flow_type: 'in',
        source_type: 'sale_galon',
        amount: total,
        description: `Penjualan Galon Tunai ${transNo}`
      });
    } else {
      // KAS SAMA SEKALI TIDAK BERTAMBAH!
      db.receivables.unshift({
        id: Date.now(),
        transaction_id: transId,
        trans_no: transNo,
        trans_date: today,
        unit_code: 'GALON',
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        total_amount: total,
        paid_amount: 0,
        remaining_amount: total,
        status: 'unpaid'
      });
      customer.total_receivable += total;
    }

    // Jurnal Double-Entry
    db.journal_entries.unshift({
      id: Date.now(),
      entry_no: `JRN-${transId.toString().slice(-6)}`,
      entry_date: today,
      reference_no: transNo,
      description: `Penjualan Galon ${qty} tabung (${transNo})`,
      lines: [
        { account_code: formData.payment_method === 'cash' ? '1101' : '1103', account_name: formData.payment_method === 'cash' ? 'Kas Tunai' : 'Piutang Usaha', debit: total, credit: 0 },
        { account_code: '4102', account_name: 'Pendapatan Air Galon', debit: 0, credit: total }
      ]
    });

    saveOfflineDB(db);
    showMessage('success', `Penjualan ${qty} galon berhasil disimpan! (Total Rp${total.toLocaleString('id-ID')})`);
  }

  function payReceivable(recId, amount) {
    const db = getOfflineDB();
    const rec = db.receivables.find(r => r.id === Number(recId));
    if (!rec) return;

    const payAmt = Number(amount);
    if (payAmt <= 0 || payAmt > rec.remaining_amount) {
      showMessage('error', 'Nominal pembayaran tidak valid atau melebihi sisa!');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const payNo = `PAY-${Date.now().toString().slice(-6)}`;

    rec.paid_amount += payAmt;
    rec.remaining_amount -= payAmt;
    rec.status = rec.remaining_amount === 0 ? 'paid' : 'partial';

    const customer = db.customers.find(c => c.id === rec.customer_id);
    if (customer) {
      customer.total_receivable = Math.max(0, customer.total_receivable - payAmt);
    }

    // Kas Bertambah (BUKAN PENJUALAN BARU!)
    db.cash_transactions.unshift({
      id: Date.now(),
      trans_no: `CSH-${Date.now().toString().slice(-6)}`,
      trans_date: today,
      flow_type: 'in',
      source_type: 'receivable_payment',
      amount: payAmt,
      description: `Penerimaan Cicilan Piutang ${rec.customer_name} (${payNo})`
    });

    // Jurnal: Dr Kas, Cr Piutang
    db.journal_entries.unshift({
      id: Date.now(),
      entry_no: `JRN-${Date.now().toString().slice(-6)}`,
      entry_date: today,
      reference_no: payNo,
      description: `Penerimaan Pembayaran Piutang ${rec.customer_name}`,
      lines: [
        { account_code: '1101', account_name: 'Kas Tunai', debit: payAmt, credit: 0 },
        { account_code: '1103', account_name: 'Piutang Usaha', debit: 0, credit: payAmt }
      ]
    });

    saveOfflineDB(db);
    showMessage('success', `Pembayaran Rp${payAmt.toLocaleString('id-ID')} berhasil dicatat! Sisa: Rp${rec.remaining_amount.toLocaleString('id-ID')}`);
  }

  function addExpense(formData) {
    const db = getOfflineDB();
    const amt = Number(formData.amount);
    const today = formData.trans_date || new Date().toISOString().split('T')[0];
    const transId = Date.now();
    const transNo = `EXP-${transId.toString().slice(-6)}`;

    db.cash_transactions.unshift({
      id: Date.now(),
      trans_no: `CSH-${transId.toString().slice(-6)}`,
      trans_date: today,
      flow_type: 'out',
      source_type: 'expense_operational',
      amount: amt,
      description: formData.description
    });

    db.transactions.unshift({
      id: transId,
      trans_no: transNo,
      trans_date: today,
      unit_code: 'UMUM',
      trans_type: 'expense',
      payment_method: 'cash',
      subtotal: amt,
      cogs_amount: 0,
      margin_amount: 0,
      status: 'posted',
      notes: formData.description
    });

    db.journal_entries.unshift({
      id: Date.now(),
      entry_no: `JRN-${transId.toString().slice(-6)}`,
      entry_date: today,
      reference_no: transNo,
      description: `Beban Operasional: ${formData.description}`,
      lines: [
        { account_code: formData.account_code || '6101', account_name: 'Beban Operasional', debit: amt, credit: 0 },
        { account_code: '1101', account_name: 'Kas Tunai', debit: 0, credit: amt }
      ]
    });

    saveOfflineDB(db);
    showMessage('success', `Pengeluaran kas Rp${amt.toLocaleString('id-ID')} berhasil dicatat!`);
  }

  // --- PERHITUNGAN REKAP DASHBOARD ---
  function getMetrics() {
    const db = getOfflineDB();
    const cashIn = db.cash_transactions.filter(c => c.flow_type === 'in').reduce((s, c) => s + c.amount, 0);
    const cashOut = db.cash_transactions.filter(c => c.flow_type === 'out').reduce((s, c) => s + c.amount, 0);
    const cashBalance = cashIn - cashOut;

    const today = new Date().toISOString().split('T')[0];
    const salesToday = db.transactions
      .filter(t => t.trans_date === today && t.status === 'posted' && (t.trans_type === 'sale_pulsa' || t.trans_type === 'sale_galon'))
      .reduce((s, t) => s + t.subtotal, 0);

    const pendingRec = db.receivables.reduce((s, r) => s + r.remaining_amount, 0);

    const pulsaRev = db.transactions.filter(t => t.trans_type === 'sale_pulsa' && t.status === 'posted').reduce((s, t) => s + t.subtotal, 0);
    const pulsaCogs = db.transactions.filter(t => t.trans_type === 'sale_pulsa' && t.status === 'posted').reduce((s, t) => s + t.cogs_amount, 0);
    const galonRev = db.transactions.filter(t => t.trans_type === 'sale_galon' && t.status === 'posted').reduce((s, t) => s + t.subtotal, 0);
    const expenses = db.cash_transactions.filter(c => c.source_type === 'expense_operational').reduce((s, c) => s + c.amount, 0);

    const netProfit = (pulsaRev - pulsaCogs) + galonRev - expenses;

    return {
      cashBalance,
      salesToday,
      pendingRec,
      netProfit,
      pulsaBalance: db.pulsa_balance,
      galonAvailable: db.galon_inventory.available_qty,
      galonCustomerHeld: db.galon_inventory.customer_held_qty,
      galonDamaged: db.galon_inventory.damaged_lost_qty
    };
  }

  // --- RENDER UI KOMPREHENSIF ---
  function render() {
    const app = document.getElementById('app');
    const db = getOfflineDB();
    const metrics = getMetrics();

    app.innerHTML = `
      <!-- Top Mobile Header -->
      <header class="bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div class="flex items-center gap-2">
          <img src="logo.png" alt="BUMKAM Logo" class="w-8 h-8 rounded-lg object-cover shadow-sm ring-1 ring-white/10">
          <div>
            <h1 class="font-bold text-sm leading-tight">BUMKAM Finance</h1>
            <p class="text-[10px] text-sky-400">Kampung Enggros (Mode Offline APK)</p>
          </div>
        </div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          OFFLINE READY
        </span>
      </header>

      <!-- Message Banner -->
      ${message ? `
        <div class="m-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
          <span>${message.type === 'success' ? '✔' : '⚠'}</span>
          <span>${message.text}</span>
        </div>
      ` : ''}

      <!-- Main Body Container -->
      <main class="flex-1 p-4 pb-28 max-w-4xl mx-auto w-full space-y-4">
        ${renderCurrentTab(db, metrics)}

        <!-- Footer -->
        <footer class="pt-6 pb-2 text-center text-[10px] text-slate-400 leading-relaxed border-t border-slate-200/80 mt-8">
          © 2026 BUMKAM Hen Wani — Kampung Enggros • Kelompok 5 Kelas C • Teknologi Digital Akuntansi • S1 Akuntansi FEB Uncen • All rights reserved.
        </footer>
      </main>

      <!-- Bottom Mobile Navigation Bar -->
      <nav class="fixed bottom-0 inset-x-0 bg-slate-900 text-slate-400 border-t border-slate-800 flex justify-around items-center py-2 px-1 text-[10px] z-40">
        <button onclick="setTab('dashboard')" class="flex flex-col items-center gap-0.5 ${currentTab === 'dashboard' ? 'text-sky-400 font-bold' : ''}">
          <span class="text-base">📊</span>
          <span>Dashboard</span>
        </button>
        <button onclick="setTab('pulsa')" class="flex flex-col items-center gap-0.5 ${currentTab === 'pulsa' ? 'text-sky-400 font-bold' : ''}">
          <span class="text-base">📱</span>
          <span>Pulsa</span>
        </button>
        <button onclick="setTab('galon')" class="flex flex-col items-center gap-0.5 ${currentTab === 'galon' ? 'text-sky-400 font-bold' : ''}">
          <span class="text-base">💧</span>
          <span>Galon</span>
        </button>
        <button onclick="setTab('piutang')" class="flex flex-col items-center gap-0.5 ${currentTab === 'piutang' ? 'text-sky-400 font-bold' : ''}">
          <span class="text-base">💳</span>
          <span>Piutang</span>
        </button>
        <button onclick="setTab('kas')" class="flex flex-col items-center gap-0.5 ${currentTab === 'kas' ? 'text-sky-400 font-bold' : ''}">
          <span class="text-base">💰</span>
          <span>Buku Kas</span>
        </button>
        <button onclick="setTab('laporan')" class="flex flex-col items-center gap-0.5 ${currentTab === 'laporan' ? 'text-sky-400 font-bold' : ''}">
          <span class="text-base">📄</span>
          <span>Laporan</span>
        </button>
      </nav>
    `;
  }

  function renderCurrentTab(db, m) {
    if (currentTab === 'dashboard') {
      return `
        <!-- Hero Banner Unit Usaha -->
        <div class="relative rounded-2xl overflow-hidden shadow-md border border-slate-200">
          <img src="login-hero.jpg" alt="Usaha Galon & Pulsa" class="w-full h-36 object-cover object-center">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
          <div class="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
            <div>
              <p class="font-bold text-xs leading-tight">BUMKAM Hen Wani</p>
              <p class="text-[9px] text-sky-300">Depot Air Galon & Pulsa Telko Digital</p>
            </div>
            <span class="text-[9px] font-bold px-2 py-0.5 rounded bg-sky-500/80 text-white">Kampung Enggros</span>
          </div>
        </div>

        <!-- 4 KPI UTAMA -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <p class="text-[10px] font-bold text-slate-400 uppercase">Saldo Kas Tunai</p>
            <p class="text-lg font-black text-slate-900 mt-0.5">Rp${m.cashBalance.toLocaleString('id-ID')}</p>
          </div>
          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <p class="text-[10px] font-bold text-slate-400 uppercase">Penjualan Hari Ini</p>
            <p class="text-lg font-black text-sky-600 mt-0.5">Rp${m.salesToday.toLocaleString('id-ID')}</p>
          </div>
          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <p class="text-[10px] font-bold text-slate-400 uppercase">Piutang Belum Lunas</p>
            <p class="text-lg font-black text-amber-600 mt-0.5">Rp${m.pendingRec.toLocaleString('id-ID')}</p>
          </div>
          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <p class="text-[10px] font-bold text-slate-400 uppercase">Hasil Usaha Bersih</p>
            <p class="text-lg font-black ${m.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} mt-0.5">Rp${m.netProfit.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <!-- Pulsa & Galon Summary -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-sky-50 border border-sky-100 p-3.5 rounded-xl">
            <p class="text-[10px] font-bold text-sky-900 uppercase">Saldo Deposit Pulsa</p>
            <p class="text-base font-black text-sky-700 mt-0.5">Rp${m.pulsaBalance.toLocaleString('id-ID')}</p>
            <button onclick="setTab('pulsa')" class="mt-2 text-[10px] font-bold text-sky-600 hover:underline block">+ Jual Pulsa</button>
          </div>
          <div class="bg-blue-50 border border-blue-100 p-3.5 rounded-xl">
            <p class="text-[10px] font-bold text-blue-900 uppercase">Galon Siap Jual</p>
            <p class="text-base font-black text-blue-700 mt-0.5">${m.galonAvailable} tabung</p>
            <button onclick="setTab('galon')" class="mt-2 text-[10px] font-bold text-blue-600 hover:underline block">+ Jual Galon</button>
          </div>
        </div>

        <!-- Transaksi Terbaru -->
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div class="p-3 border-b border-slate-100 font-bold text-xs flex justify-between items-center">
            <span>Transaksi Terbaru</span>
            <span class="text-[10px] text-slate-400">${db.transactions.length} transaksi</span>
          </div>
          <div class="divide-y divide-slate-100 max-h-64 overflow-y-auto text-xs">
            ${db.transactions.length === 0 ? '<p class="p-4 text-center text-slate-400">Belum ada transaksi.</p>' : ''}
            ${db.transactions.slice(0, 8).map(t => `
              <div class="p-3 flex justify-between items-center">
                <div>
                  <p class="font-bold text-slate-900">${t.trans_no}</p>
                  <p class="text-[10px] text-slate-400">${t.trans_date} • ${t.notes || t.unit_code}</p>
                </div>
                <div class="text-right">
                  <p class="font-black text-slate-900">Rp${t.subtotal.toLocaleString('id-ID')}</p>
                  <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${t.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                    ${t.payment_method.toUpperCase()}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (currentTab === 'pulsa') {
      return `
        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div class="flex justify-between items-center pb-2 border-b">
            <h3 class="font-bold text-sm">Penjualan Pulsa (One Input)</h3>
            <span class="text-xs font-bold text-sky-600">Saldo: Rp${db.pulsa_balance.toLocaleString('id-ID')}</span>
          </div>

          <form id="formSellPulsa" onsubmit="window.handleSellPulsaSubmit(event)" class="space-y-3 text-xs">
            <div>
              <label class="block font-semibold mb-1">Nomor HP Pelanggan</label>
              <input type="text" id="pls_phone" required placeholder="081234567890" class="w-full p-2.5 rounded-lg border text-xs">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold mb-1">Provider</label>
                <select id="pls_prov" class="w-full p-2.5 rounded-lg border bg-white text-xs">
                  <option value="Telkomsel">Telkomsel</option>
                  <option value="Indosat">Indosat</option>
                  <option value="XL">XL</option>
                  <option value="PLN Token">PLN Listrik</option>
                </select>
              </div>
              <div>
                <label class="block font-semibold mb-1">Nominal</label>
                <input type="number" id="pls_nom" value="50000" class="w-full p-2.5 rounded-lg border text-xs">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold mb-1">Modal (Potong Saldo)</label>
                <input type="number" id="pls_cogs" value="48500" oninput="window.updatePulsaMargin()" class="w-full p-2.5 rounded-lg border text-xs">
              </div>
              <div>
                <label class="block font-semibold mb-1">Harga Jual</label>
                <input type="number" id="pls_sell" value="52000" oninput="window.updatePulsaMargin()" class="w-full p-2.5 rounded-lg border text-xs">
              </div>
            </div>
            <div class="p-2.5 rounded-lg bg-sky-50 text-sky-900 flex justify-between font-bold">
              <span>Margin Otomatis:</span>
              <span id="pls_margin_display" class="text-sky-700">Rp3.500</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold mb-1">Metode Bayar</label>
                <select id="pls_pay" class="w-full p-2.5 rounded-lg border bg-white text-xs">
                  <option value="cash">Tunai (Kas +)</option>
                  <option value="credit">Kredit (Piutang +)</option>
                </select>
              </div>
              <div>
                <label class="block font-semibold mb-1">Pelanggan</label>
                <select id="pls_cust" class="w-full p-2.5 rounded-lg border bg-white text-xs">
                  <option value="">-- Pilih --</option>
                  ${db.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <button type="submit" class="w-full py-3 rounded-lg bg-sky-600 text-white font-bold text-xs shadow-xs">
              Simpan Penjualan Pulsa
            </button>
          </form>
        </div>

        <!-- Form Tambah Saldo -->
        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
          <h3 class="font-bold text-sm">Tambah Saldo Deposit Pulsa</h3>
          <form onsubmit="window.handleTopupPulsaSubmit(event)" class="space-y-3 text-xs">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold mb-1">Nominal Didapat</label>
                <input type="number" id="top_nom" value="200000" class="w-full p-2 rounded-lg border text-xs">
              </div>
              <div>
                <label class="block font-semibold mb-1">Harga Beli (Kas Keluar)</label>
                <input type="number" id="top_cost" value="200000" class="w-full p-2 rounded-lg border text-xs">
              </div>
            </div>
            <button type="submit" class="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold text-xs">
              Konfirmasi Top Up
            </button>
          </form>
        </div>
      `;
    }

    if (currentTab === 'galon') {
      return `
        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div class="flex justify-between items-center pb-2 border-b">
            <h3 class="font-bold text-sm">Penjualan Air Galon</h3>
            <span class="text-xs font-bold text-blue-600">Tersedia: ${db.galon_inventory.available_qty} tabung</span>
          </div>

          <form onsubmit="window.handleSellGalonSubmit(event)" class="space-y-3 text-xs">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold mb-1">Jumlah Tabung</label>
                <input type="number" id="gln_qty" value="1" min="1" oninput="window.updateGalonTotal()" class="w-full p-2.5 rounded-lg border text-xs">
              </div>
              <div>
                <label class="block font-semibold mb-1">Harga Satuan (Rp)</label>
                <input type="number" id="gln_price" value="6000" oninput="window.updateGalonTotal()" class="w-full p-2.5 rounded-lg border text-xs">
              </div>
            </div>
            <div class="p-2.5 rounded-lg bg-blue-50 text-blue-900 flex justify-between font-bold">
              <span>Total Penjualan:</span>
              <span id="gln_total_display" class="text-blue-700 text-sm">Rp6.000</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold mb-1">Metode Bayar</label>
                <select id="gln_pay" class="w-full p-2.5 rounded-lg border bg-white text-xs font-bold">
                  <option value="cash">TUNAI (Kas +)</option>
                  <option value="credit">KREDIT (Piutang +, Kas Rp0)</option>
                </select>
              </div>
              <div>
                <label class="block font-semibold mb-1">Status Wadah</label>
                <select id="gln_act" class="w-full p-2.5 rounded-lg border bg-white text-xs">
                  <option value="exchange">Tukar Galon Kosong</option>
                  <option value="borrow">Pinjam Tabung Depot</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block font-semibold mb-1">Pelanggan</label>
              <select id="gln_cust" class="w-full p-2.5 rounded-lg border bg-white text-xs">
                <option value="">-- Pembeli Langsung (Umum) --</option>
                ${db.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            <button type="submit" class="w-full py-3 rounded-lg bg-blue-700 text-white font-bold text-xs shadow-xs">
              Simpan Penjualan Galon
            </button>
          </form>
        </div>
      `;
    }

    if (currentTab === 'piutang') {
      return `
        <div class="space-y-3">
          <div class="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
            <b>ATURAN AKUNTANSI:</b> Pembayaran piutang hanya menambah kas dan mengurangi piutang. <b>Bukan penjualan baru</b> (tidak menambah omset/laba kembali).
          </div>

          <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div class="p-3 border-b border-slate-100 font-bold text-xs">Daftar Tagihan Piutang Pelanggan</div>
            <div class="divide-y divide-slate-100 text-xs">
              ${db.receivables.length === 0 ? '<p class="p-6 text-center text-slate-400">Tidak ada piutang aktif.</p>' : ''}
              ${db.receivables.map(r => `
                <div class="p-3 space-y-2">
                  <div class="flex justify-between items-start">
                    <div>
                      <p class="font-bold text-slate-900">${r.customer_name}</p>
                      <p class="text-[10px] text-slate-400">${r.trans_no} • Sisa: Rp${r.remaining_amount.toLocaleString('id-ID')}</p>
                    </div>
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${r.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                      ${r.status.toUpperCase()}
                    </span>
                  </div>
                  ${r.remaining_amount > 0 ? `
                    <div class="flex gap-2">
                      <input type="number" id="pay_amt_${r.id}" value="${r.remaining_amount}" max="${r.remaining_amount}" class="flex-1 p-1.5 rounded border text-xs">
                      <button onclick="window.handlePayReceivableClick(${r.id})" class="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded text-[11px]">
                        BAYAR
                      </button>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (currentTab === 'kas') {
      return `
        <div class="space-y-4">
          <div class="bg-gradient-to-tr from-emerald-600 to-teal-700 text-white p-4 rounded-xl shadow-xs">
            <p class="text-[10px] font-bold uppercase opacity-80">Saldo Kas Tunai</p>
            <p class="text-2xl font-black mt-1">Rp${m.cashBalance.toLocaleString('id-ID')}</p>
          </div>

          <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
            <h3 class="font-bold text-sm">Catat Beban Operasional Kas Keluar</h3>
            <form onsubmit="window.handleExpenseSubmit(event)" class="space-y-3 text-xs">
              <div>
                <label class="block font-semibold mb-1">Nominal (Rp)</label>
                <input type="number" id="exp_amt" value="50000" class="w-full p-2 rounded-lg border text-xs font-bold">
              </div>
              <div>
                <label class="block font-semibold mb-1">Keterangan Pengeluaran</label>
                <input type="text" id="exp_desc" required placeholder="Contoh: Beli pulsa listrik depot galon" class="w-full p-2 rounded-lg border text-xs">
              </div>
              <button type="submit" class="w-full py-2.5 rounded-lg bg-rose-600 text-white font-bold text-xs">
                Simpan Beban Kas
              </button>
            </form>
          </div>
        </div>
      `;
    }

    if (currentTab === 'laporan') {
      return `
        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3 text-xs">
          <div class="text-center border-b pb-3">
            <h2 class="font-black text-sm uppercase">${db.profile.name}</h2>
            <p class="text-[10px] text-slate-500">${db.profile.village_name}</p>
            <p class="font-bold text-xs text-sky-700 mt-1">LAPORAN HASIL USAHA (LABA RUGI)</p>
          </div>

          <div class="space-y-1.5 pt-2">
            <div class="flex justify-between"><span>Pendapatan Pulsa:</span><b>Rp${db.transactions.filter(t => t.trans_type==='sale_pulsa').reduce((s,t)=>s+t.subtotal,0).toLocaleString('id-ID')}</b></div>
            <div class="flex justify-between"><span>Modal Pulsa (COGS):</span><b class="text-rose-600">−Rp${db.transactions.filter(t => t.trans_type==='sale_pulsa').reduce((s,t)=>s+t.cogs_amount,0).toLocaleString('id-ID')}</b></div>
            <div class="flex justify-between"><span>Pendapatan Galon:</span><b>Rp${db.transactions.filter(t => t.trans_type==='sale_galon').reduce((s,t)=>s+t.subtotal,0).toLocaleString('id-ID')}</b></div>
            <div class="flex justify-between"><span>Beban Operasional:</span><b class="text-rose-600">−Rp${db.cash_transactions.filter(c => c.source_type==='expense_operational').reduce((s,c)=>s+c.amount,0).toLocaleString('id-ID')}</b></div>
            <div class="flex justify-between font-black text-sm border-t pt-2 mt-2 bg-indigo-50 p-2 rounded text-indigo-950">
              <span>HASIL USAHA BERSIH:</span>
              <span>Rp${m.netProfit.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  // Window methods for HTML events
  window.setTab = function (tab) {
    currentTab = tab;
    render();
  };

  window.updatePulsaMargin = function () {
    const cogs = Number(document.getElementById('pls_cogs').value) || 0;
    const sell = Number(document.getElementById('pls_sell').value) || 0;
    const margin = Math.max(0, sell - cogs);
    const disp = document.getElementById('pls_margin_display');
    if (disp) disp.innerText = `Rp${margin.toLocaleString('id-ID')}`;
  };

  window.updateGalonTotal = function () {
    const qty = Number(document.getElementById('gln_qty').value) || 0;
    const price = Number(document.getElementById('gln_price').value) || 0;
    const total = qty * price;
    const disp = document.getElementById('gln_total_display');
    if (disp) disp.innerText = `Rp${total.toLocaleString('id-ID')}`;
  };

  window.handleSellPulsaSubmit = function (e) {
    e.preventDefault();
    sellPulsa({
      phone_number: document.getElementById('pls_phone').value,
      provider: document.getElementById('pls_prov').value,
      nominal: document.getElementById('pls_nom').value,
      cogs_price: document.getElementById('pls_cogs').value,
      selling_price: document.getElementById('pls_sell').value,
      payment_method: document.getElementById('pls_pay').value,
      customer_id: document.getElementById('pls_cust').value
    });
  };

  window.handleTopupPulsaSubmit = function (e) {
    e.preventDefault();
    topupPulsa({
      nominal_saldo: document.getElementById('top_nom').value,
      cost_price: document.getElementById('top_cost').value
    });
  };

  window.handleSellGalonSubmit = function (e) {
    e.preventDefault();
    sellGalon({
      qty: document.getElementById('gln_qty').value,
      unit_price: document.getElementById('gln_price').value,
      payment_method: document.getElementById('gln_pay').value,
      gallon_action: document.getElementById('gln_act').value,
      customer_id: document.getElementById('gln_cust').value
    });
  };

  window.handlePayReceivableClick = function (recId) {
    const input = document.getElementById(`pay_amt_${recId}`);
    if (input) {
      payReceivable(recId, input.value);
    }
  };

  window.handleExpenseSubmit = function (e) {
    e.preventDefault();
    addExpense({
      amount: document.getElementById('exp_amt').value,
      description: document.getElementById('exp_desc').value
    });
  };

  // Start app
  render();
})();
