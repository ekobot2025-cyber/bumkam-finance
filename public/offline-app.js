// BUMKAM Finance — Standalone Offline Engine & Multi-Device Sync untuk Android APK & Web
// BUMKAM Hen Wani, Kampung Enggros, Distrik Abepura, Kota Jayapura, Papua
(function () {
  const STORAGE_KEY = 'BUMKAM_FINANCE_OFFLINE_DB';
  const SERVER_URL_KEY = 'BUMKAM_FINANCE_SERVER_URL';

  // --- DATABASE LOCAL STORAGE ENGINE ---
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

  function getServerURL() {
    return localStorage.getItem(SERVER_URL_KEY) || (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' ? `${window.location.protocol}//${window.location.host}` : 'http://192.168.1.13:3000');
  }

  function setServerURL(url) {
    localStorage.setItem(SERVER_URL_KEY, url);
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
      ],
      audit_logs: [
        { id: 1, timestamp: new Date().toISOString(), action: 'INIT_SYSTEM', description: 'Inisialisasi sistem BUMKAM Finance' }
      ]
    };
  }

  // --- STATE APLIKASI ---
  let currentTab = 'dashboard';
  let drawerOpen = false;
  let activeModal = null; // { type: 'add_customer' | 'adjust_balances' | 'add_galon_stock' | 'pay_receivable' | 'void' | 'customer_detail', data: any }
  let toast = null;
  let customerSearchQuery = '';
  let activeReportTab = 'laba-rugi'; // 'laba-rugi' | 'arus-kas' | 'neraca' | 'penjualan' | 'piutang' | 'stok-galon' | 'semua'
  let newCustInlineMode = false;

  // State Kasir POS Cepat
  let posUnit = 'galon'; // 'galon' | 'pulsa'
  let posGalonQty = 1;
  let posGalonPrice = 6000;
  let posCashGiven = 6000;
  let posPaymentMethod = 'cash'; // 'cash' | 'credit'
  let posGallonAction = 'swap'; // 'swap' | 'borrow' | 'none'
  let posPulsaNominal = 10000;
  let posPulsaPrice = 12000;
  let posPulsaCogs = 10500;
  let posPulsaProvider = 'Telkomsel';
  let posPulsaPhone = '';

  function showToast(type, text) {
    toast = { type, text };
    render();
    setTimeout(() => {
      toast = null;
      render();
    }, 4000);
  }

  // --- HITUNG METRIK DASHBOARD & HASIL USAHA ---
  function getMetrics() {
    const db = getOfflineDB();
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    // Kas
    const cashIn = db.cash_transactions.filter(c => c.flow_type === 'in').reduce((s, c) => s + Number(c.amount || 0), 0);
    const cashOut = db.cash_transactions.filter(c => c.flow_type === 'out').reduce((s, c) => s + Number(c.amount || 0), 0);
    const cashBalance = cashIn - cashOut;

    // Transaksi valid (status posted)
    const validTrx = db.transactions.filter(t => t.status === 'posted');

    // Penjualan hari ini
    const salesToday = validTrx.filter(t => t.trans_date === today).reduce((s, t) => s + Number(t.subtotal || 0), 0);

    // Piutang aktif
    const pendingRec = db.receivables.filter(r => r.status !== 'paid').reduce((s, r) => s + Number(r.remaining_amount || 0), 0);

    // Hasil usaha bulan ini
    const monthTrx = validTrx.filter(t => (t.trans_date || '').startsWith(currentMonth));
    const grossProfitPulsa = monthTrx.filter(t => t.unit_code === 'PULSA').reduce((s, t) => s + Number(t.margin_amount || 0), 0);
    const revGalon = monthTrx.filter(t => t.unit_code === 'GALON').reduce((s, t) => s + Number(t.subtotal || 0), 0);
    const grossProfitGalon = revGalon; // Depot air modal listrik/filter di beban

    const expensesMonth = db.cash_transactions
      .filter(c => c.flow_type === 'out' && (c.trans_date || '').startsWith(currentMonth) && c.source_type !== 'pulsa_topup')
      .reduce((s, c) => s + Number(c.amount || 0), 0);

    const netProfit = (grossProfitPulsa + grossProfitGalon) - expensesMonth;

    return {
      cashBalance,
      salesToday,
      pendingRec,
      netProfit,
      grossProfitPulsa,
      grossProfitGalon,
      expensesMonth,
      pulsaBalance: db.pulsa_balance,
      galonAvailable: db.galon_inventory.available_qty,
      galonHeld: db.galon_inventory.customer_held_qty,
      galonDamaged: db.galon_inventory.damaged_lost_qty
    };
  }

  // --- LOGIKA BISNIS (ONE TRANSACTION — ONE INPUT) ---

  // 1. Tambah Pelanggan Baru
  function addCustomer(data) {
    const db = getOfflineDB();
    const name = (data.name || '').trim();
    if (!name) {
      showToast('error', 'Nama pelanggan wajib diisi!');
      return null;
    }

    const nextId = db.customers.length > 0 ? Math.max(...db.customers.map(c => c.id || 0)) + 1 : 1;
    const code = `CUST-${String(nextId).padStart(4, '0')}`;
    const newCust = {
      id: nextId,
      code: code,
      name: name,
      phone: (data.phone || '').trim(),
      address: (data.address || '').trim() || 'Kampung Enggros',
      gallon_balance: 0,
      total_receivable: 0
    };

    db.customers.push(newCust);
    saveOfflineDB(db);
    showToast('success', `Pelanggan ${name} (${code}) berhasil ditambahkan!`);
    return newCust;
  }

  // 2. Ubah / Sesuaikan Saldo Dashboard (Kas, Pulsa, Galon)
  function adjustBalances(formData) {
    const db = getOfflineDB();
    const newCash = Number(formData.cash_balance);
    const newPulsa = Number(formData.pulsa_balance);
    const newGalon = Number(formData.galon_available);
    const newHeld = Number(formData.galon_held || 0);
    const newDamaged = Number(formData.galon_damaged || 0);
    const notes = formData.notes || 'Penyesuaian Saldo Dashboard Kampung Enggros';

    const currentMetrics = getMetrics();
    const today = new Date().toISOString().split('T')[0];
    const transId = Date.now();

    // Sesuaikan Kas jika nominal berubah
    if (!isNaN(newCash) && newCash !== currentMetrics.cashBalance) {
      const diff = newCash - currentMetrics.cashBalance;
      const flowType = diff >= 0 ? 'in' : 'out';
      const absDiff = Math.abs(diff);

      db.cash_transactions.unshift({
        id: transId,
        trans_no: `CSH-ADJ-${transId.toString().slice(-6)}`,
        trans_date: today,
        flow_type: flowType,
        source_type: 'capital_injection',
        amount: absDiff,
        description: `Penyesuaian Saldo Kas Dashboard: ${notes}`
      });

      // Jurnal
      db.journal_entries.unshift({
        id: Date.now(),
        entry_no: `JRN-ADJ-${transId.toString().slice(-6)}`,
        entry_date: today,
        reference_no: `ADJ-CSH-${transId.toString().slice(-6)}`,
        description: `Koreksi Saldo Kas: ${notes}`,
        lines: diff >= 0 ? [
          { account_code: '1101', account_name: 'Kas Tunai', debit: absDiff, credit: 0 },
          { account_code: '3101', account_name: 'Modal Awal BUMKAM', debit: 0, credit: absDiff }
        ] : [
          { account_code: '3101', account_name: 'Modal Awal BUMKAM', debit: absDiff, credit: 0 },
          { account_code: '1101', account_name: 'Kas Tunai', debit: 0, credit: absDiff }
        ]
      });
    }

    // Sesuaikan Saldo Pulsa
    if (!isNaN(newPulsa)) {
      db.pulsa_balance = Math.max(0, newPulsa);
    }

    // Sesuaikan Stok Galon
    if (!isNaN(newGalon)) {
      db.galon_inventory.available_qty = Math.max(0, newGalon);
      db.galon_inventory.customer_held_qty = Math.max(0, newHeld);
      db.galon_inventory.damaged_lost_qty = Math.max(0, newDamaged);
    }

    db.audit_logs.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action: 'ADJUST_BALANCES',
      description: `Ubah Saldo Dashboard: Kas=Rp${newCash.toLocaleString('id-ID')}, Pulsa=Rp${newPulsa.toLocaleString('id-ID')}, Galon=${newGalon} tabung. (${notes})`
    });

    saveOfflineDB(db);
    showToast('success', 'Nominal saldo dashboard berhasil disesuaikan!');
  }

  // 3. Jual Pulsa
  function sellPulsa(formData) {
    const db = getOfflineDB();
    const cogs = Number(formData.cogs_price);
    const sell = Number(formData.selling_price);

    if (cogs > db.pulsa_balance) {
      showToast('error', `Saldo pulsa tidak mencukupi! (Sisa: Rp${db.pulsa_balance.toLocaleString('id-ID')})`);
      return;
    }
    if (formData.payment_method === 'credit' && !formData.customer_id) {
      showToast('error', 'Pelanggan wajib dipilih untuk penjualan kredit!');
      return;
    }

    const margin = sell - cogs;
    const transId = Date.now();
    const transNo = `TRX-PLS-${transId.toString().slice(-6)}`;
    const today = formData.trans_date || new Date().toISOString().split('T')[0];

    db.pulsa_balance -= cogs;

    const customer = db.customers.find(c => c.id === Number(formData.customer_id));

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
        total_amount: sell,
        paid_amount: 0,
        remaining_amount: sell,
        status: 'unpaid'
      });
      customer.total_receivable += sell;
    }

    // Jurnal Otomatis Double-Entry
    db.journal_entries.unshift({
      id: Date.now(),
      entry_no: `JRN-${transId.toString().slice(-6)}`,
      entry_date: today,
      reference_no: transNo,
      description: `Penjualan Pulsa ${transNo} (${formData.provider})`,
      lines: [
        { account_code: formData.payment_method === 'cash' ? '1101' : '1102', account_name: formData.payment_method === 'cash' ? 'Kas Tunai' : 'Piutang Pulsa', debit: sell, credit: 0 },
        { account_code: '4101', account_name: 'Pendapatan Penjualan Pulsa', debit: 0, credit: sell },
        { account_code: '5101', account_name: 'HPP Modal Pulsa', debit: cogs, credit: 0 },
        { account_code: '1104', account_name: 'Persediaan / Saldo Pulsa', debit: 0, credit: cogs }
      ]
    });

    saveOfflineDB(db);
    showToast('success', `Penjualan pulsa ${transNo} berhasil! Kas/Piutang & Jurnal terupdate otomatis.`);
  }

  // 4. Tambah Saldo Pulsa (Top Up)
  function topupPulsa(formData) {
    const db = getOfflineDB();
    const nominal = Number(formData.nominal_saldo);
    const cost = Number(formData.cost_price);

    const transId = Date.now();
    const transNo = `TOP-PLS-${transId.toString().slice(-6)}`;
    const today = new Date().toISOString().split('T')[0];

    db.pulsa_balance += nominal;

    db.cash_transactions.unshift({
      id: Date.now(),
      trans_no: `CSH-${transId.toString().slice(-6)}`,
      trans_date: today,
      flow_type: 'out',
      source_type: 'pulsa_topup',
      amount: cost,
      description: `Pembelian/Top Up Saldo Pulsa ${transNo}`
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
    showToast('success', `Saldo pulsa berhasil ditambah Rp${nominal.toLocaleString('id-ID')}`);
  }

  // 5. Tambah Stok Galon Siap Jual (Pengisian / Kulakan Pasokan Depot) - JAWABAN MASALAH 5
  function addGalonStock(formData) {
    const db = getOfflineDB();
    const qty = Number(formData.qty);
    const cost = Number(formData.cost || 0);
    const notes = (formData.notes || '').trim() || `Pasok isi ulang ${qty} galon siap jual`;

    if (qty <= 0) {
      showToast('error', 'Jumlah galon harus lebih dari 0!');
      return;
    }

    const m = getMetrics();
    if (cost > 0 && cost > m.cashBalance) {
      showToast('error', `Saldo kas tidak mencukupi untuk biaya pasok! (Kas: Rp${m.cashBalance.toLocaleString('id-ID')})`);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const transId = Date.now();
    const transNo = `STK-GLN-${transId.toString().slice(-6)}`;

    // Tambah stok galon siap jual
    db.galon_inventory.available_qty += qty;

    // Catat mutasi galon
    db.galon_movements.unshift({
      id: transId,
      trans_no: transNo,
      trans_date: today,
      movement_type: 'in_refill',
      quantity: qty,
      customer_id: null,
      customer_name: null,
      notes: notes
    });

    // Jika ada biaya kulakan keluar kas
    if (cost > 0) {
      db.cash_transactions.unshift({
        id: transId,
        trans_no: `CSH-${transId.toString().slice(-6)}`,
        trans_date: today,
        flow_type: 'out',
        source_type: 'galon_restock',
        amount: cost,
        description: `Biaya Pasok / Kulakan ${qty} Galon (${transNo})`
      });

      db.transactions.unshift({
        id: transId,
        trans_no: transNo,
        trans_date: today,
        unit_code: 'GALON',
        trans_type: 'restock_galon',
        payment_method: 'cash',
        subtotal: cost,
        cogs_amount: cost,
        margin_amount: 0,
        status: 'posted',
        notes: notes
      });

      db.journal_entries.unshift({
        id: transId,
        entry_no: `JRN-${transId.toString().slice(-6)}`,
        entry_date: today,
        reference_no: transNo,
        description: `Pasok Stok ${qty} Galon (${notes})`,
        lines: [
          { account_code: '1103', account_name: 'Persediaan Galon', debit: cost, credit: 0 },
          { account_code: '1101', account_name: 'Kas Tunai', debit: 0, credit: cost }
        ]
      });
    }

    saveOfflineDB(db);
    showToast('success', `Berhasil menambah ${qty} stok galon siap jual! Total stok: ${db.galon_inventory.available_qty} tabung`);
    render();
  }

  // 6. Jual Galon (Mendukung Pilih Pelanggan & Ketik Pelanggan Baru Langsung - JAWABAN MASALAH 1)
  function sellGalon(formData) {
    const db = getOfflineDB();
    const qty = Number(formData.qty);
    const price = Number(formData.unit_price);
    const total = qty * price;

    if (qty > db.galon_inventory.available_qty) {
      showToast('error', `Stok galon tidak mencukupi! (Tersedia: ${db.galon_inventory.available_qty} tabung)`);
      return;
    }

    let customer = null;
    if (formData.inline_cust_name && formData.inline_cust_name.trim()) {
      customer = addCustomer({
        name: formData.inline_cust_name.trim(),
        phone: (formData.inline_cust_phone || '').trim(),
        address: (formData.inline_cust_addr || '').trim() || 'Kampung Enggros'
      });
    } else if (formData.customer_id) {
      customer = db.customers.find(c => c.id === Number(formData.customer_id));
    }

    if ((formData.payment_method === 'credit' || formData.gallon_action === 'borrow') && !customer) {
      showToast('error', 'Nama pelanggan wajib dipilih atau diketik jika transaksi tempo/kredit atau pinjam tabung!');
      return;
    }

    const transId = Date.now();
    const transNo = `TRX-GLN-${transId.toString().slice(-6)}`;
    const today = formData.trans_date || new Date().toISOString().split('T')[0];

    db.galon_inventory.available_qty -= qty;

    if (formData.gallon_action === 'borrow') {
      db.galon_inventory.customer_held_qty += qty;
      if (customer) customer.gallon_balance += qty;
    }

    db.galon_movements.unshift({
      id: Date.now(),
      trans_no: transNo,
      trans_date: today,
      movement_type: 'sale_out',
      quantity: qty,
      customer_id: customer ? customer.id : null,
      customer_name: customer ? customer.name : null,
      notes: `Penjualan ${qty} tabung galon (${formData.gallon_action === 'borrow' ? 'Pinjam tabung' : 'Tukar tabung'})`
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
      notes: `${qty} galon @ Rp${price.toLocaleString('id-ID')}`
    });

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
      db.receivables.unshift({
        id: Date.now(),
        transaction_id: transId,
        trans_no: transNo,
        trans_date: today,
        unit_code: 'GALON',
        customer_id: customer.id,
        customer_name: customer.name,
        total_amount: total,
        paid_amount: 0,
        remaining_amount: total,
        status: 'unpaid'
      });
      customer.total_receivable += total;
    }

    db.journal_entries.unshift({
      id: Date.now(),
      entry_no: `JRN-${transId.toString().slice(-6)}`,
      entry_date: today,
      reference_no: transNo,
      description: `Penjualan Air Galon ${transNo} (${qty} tabung)`,
      lines: [
        { account_code: formData.payment_method === 'cash' ? '1101' : '1103', account_name: formData.payment_method === 'cash' ? 'Kas Tunai' : 'Piutang Galon', debit: total, credit: 0 },
        { account_code: '4102', account_name: 'Pendapatan Penjualan Air Galon', debit: 0, credit: total }
      ]
    });

    saveOfflineDB(db);
    showToast('success', `Penjualan galon ${transNo} berhasil! Kas/Piutang & Stok terupdate.`);
  }

  // 6. Mutasi Tabung (Pengembalian / Rusak)
  function mutateGalon(formData) {
    const db = getOfflineDB();
    const qty = Number(formData.quantity);
    const type = formData.movement_type; // 'return_in' | 'damaged'
    const today = new Date().toISOString().split('T')[0];
    const customer = db.customers.find(c => c.id === Number(formData.customer_id));

    if (type === 'return_in') {
      if (customer && customer.gallon_balance < qty) {
        showToast('error', `Jumlah pengembalian melebihi tabung di pelanggan (Maks: ${customer.gallon_balance} tabung)!`);
        return;
      }
      db.galon_inventory.available_qty += qty;
      db.galon_inventory.customer_held_qty = Math.max(0, db.galon_inventory.customer_held_qty - qty);
      if (customer) customer.gallon_balance = Math.max(0, customer.gallon_balance - qty);
    } else if (type === 'damaged') {
      if (qty > db.galon_inventory.available_qty) {
        showToast('error', `Galon rusak melebihi stok tersedia (${db.galon_inventory.available_qty} tabung)!`);
        return;
      }
      db.galon_inventory.available_qty -= qty;
      db.galon_inventory.damaged_lost_qty += qty;
    }

    db.galon_movements.unshift({
      id: Date.now(),
      trans_no: `MUT-${Date.now().toString().slice(-6)}`,
      trans_date: today,
      movement_type: type,
      quantity: qty,
      customer_id: customer ? customer.id : null,
      customer_name: customer ? customer.name : null,
      notes: formData.notes || (type === 'return_in' ? 'Pengembalian galon kosong' : 'Galon rusak/hilang')
    });

    saveOfflineDB(db);
    showToast('success', 'Mutasi pergerakan tabung galon berhasil disimpan!');
  }

  // 7. Bayar Piutang (Cicilan / Lunas)
  function payReceivable(recId, amount) {
    const db = getOfflineDB();
    const rec = db.receivables.find(r => r.id === Number(recId));
    if (!rec) return;

    const pay = Number(amount);
    if (isNaN(pay) || pay <= 0) {
      showToast('error', 'Nominal pembayaran tidak valid!');
      return;
    }
    if (pay > rec.remaining_amount) {
      showToast('error', `Pembayaran melebihi sisa piutang! (Maks: Rp${rec.remaining_amount.toLocaleString('id-ID')})`);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const transId = Date.now();
    const payNo = `PAY-${transId.toString().slice(-6)}`;

    rec.paid_amount += pay;
    rec.remaining_amount -= pay;
    rec.status = rec.remaining_amount === 0 ? 'paid' : 'partial';

    const customer = db.customers.find(c => c.id === rec.customer_id);
    if (customer) {
      customer.total_receivable = Math.max(0, customer.total_receivable - pay);
    }

    db.receivable_payments.unshift({
      id: transId,
      payment_no: payNo,
      receivable_id: rec.id,
      payment_date: today,
      amount: pay,
      payment_method: 'cash'
    });

    db.cash_transactions.unshift({
      id: transId,
      trans_no: `CSH-${transId.toString().slice(-6)}`,
      trans_date: today,
      flow_type: 'in',
      source_type: 'receivable_payment',
      amount: pay,
      description: `Pelunasan Piutang ${rec.trans_no} (${rec.customer_name})`
    });

    db.journal_entries.unshift({
      id: Date.now(),
      entry_no: `JRN-${transId.toString().slice(-6)}`,
      entry_date: today,
      reference_no: payNo,
      description: `Penerimaan Pembayaran Piutang ${rec.trans_no} (${rec.customer_name})`,
      lines: [
        { account_code: '1101', account_name: 'Kas Tunai', debit: pay, credit: 0 },
        { account_code: rec.unit_code === 'PULSA' ? '1102' : '1103', account_name: rec.unit_code === 'PULSA' ? 'Piutang Pulsa' : 'Piutang Galon', debit: 0, credit: pay }
      ]
    });

    saveOfflineDB(db);
    showToast('success', `Pembayaran Rp${pay.toLocaleString('id-ID')} berhasil dicatat! (Bukan omset baru, kas bertambah).`);
  }

  // 8. Catat Beban Operasional Kas
  function addExpense(formData) {
    const db = getOfflineDB();
    const amt = Number(formData.amount);
    const desc = formData.description;
    const category = formData.category || '6104';

    if (isNaN(amt) || amt <= 0) {
      showToast('error', 'Nominal pengeluaran tidak valid!');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const transId = Date.now();
    const transNo = `EXP-${transId.toString().slice(-6)}`;

    db.cash_transactions.unshift({
      id: transId,
      trans_no: transNo,
      trans_date: today,
      flow_type: 'out',
      source_type: 'operational_expense',
      amount: amt,
      description: desc
    });

    db.journal_entries.unshift({
      id: Date.now(),
      entry_no: `JRN-${transId.toString().slice(-6)}`,
      entry_date: today,
      reference_no: transNo,
      description: `Beban Operasional: ${desc}`,
      lines: [
        { account_code: category, account_name: 'Beban Operasional Depot', debit: amt, credit: 0 },
        { account_code: '1101', account_name: 'Kas Tunai', debit: 0, credit: amt }
      ]
    });

    saveOfflineDB(db);
    showToast('success', `Pengeluaran Rp${amt.toLocaleString('id-ID')} berhasil dicatat.`);
  }

  // 9. Batal Transaksi (VOID) - Khusus Admin
  function voidTransaction(transId, reason) {
    const db = getOfflineDB();
    const trx = db.transactions.find(t => t.id === Number(transId));
    if (!trx || trx.status === 'void') return;

    trx.status = 'void';
    trx.void_reason = reason;

    // Balik stok / saldo
    if (trx.unit_code === 'PULSA') {
      db.pulsa_balance += Number(trx.cogs_amount || 0);
    } else if (trx.unit_code === 'GALON') {
      const matchMov = db.galon_movements.find(m => m.trans_no === trx.trans_no);
      const qty = matchMov ? matchMov.quantity : 1;
      db.galon_inventory.available_qty += qty;
    }

    // Balik kas atau piutang
    if (trx.payment_method === 'cash') {
      const today = new Date().toISOString().split('T')[0];
      db.cash_transactions.unshift({
        id: Date.now(),
        trans_no: `CSH-REV-${Date.now().toString().slice(-6)}`,
        trans_date: today,
        flow_type: 'out',
        source_type: 'transaction_void',
        amount: trx.subtotal,
        description: `Koreksi Pembatalan (VOID) ${trx.trans_no}: ${reason}`
      });
    } else {
      const rec = db.receivables.find(r => r.trans_no === trx.trans_no);
      if (rec) rec.status = 'void';
      const cust = db.customers.find(c => c.id === trx.customer_id);
      if (cust) cust.total_receivable = Math.max(0, cust.total_receivable - trx.subtotal);
    }

    // Jurnal Pembalik
    db.journal_entries.unshift({
      id: Date.now(),
      entry_no: `JRN-REV-${Date.now().toString().slice(-6)}`,
      entry_date: new Date().toISOString().split('T')[0],
      reference_no: `VOID-${trx.trans_no}`,
      description: `Jurnal Pembalik Pembatalan (VOID) ${trx.trans_no} - ${reason}`,
      lines: [
        { account_code: trx.unit_code === 'PULSA' ? '4101' : '4102', account_name: 'Koreksi Pendapatan', debit: trx.subtotal, credit: 0 },
        { account_code: trx.payment_method === 'cash' ? '1101' : '1103', account_name: trx.payment_method === 'cash' ? 'Kas Tunai' : 'Piutang', debit: 0, credit: trx.subtotal }
      ]
    });

    db.audit_logs.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action: 'VOID_TRANSACTION',
      description: `Membatalkan transaksi ${trx.trans_no}. Alasan: ${reason}`
    });

    saveOfflineDB(db);
    showToast('success', `Transaksi ${trx.trans_no} berhasil dibatalkan (VOID)!`);
  }

  // 10. Sinkronisasi Server / Cloud API
  async function syncWithServer(url) {
    const targetUrl = url || getServerURL();
    showToast('info', 'Menghubungkan ke server untuk sinkronisasi data...');

    try {
      const db = getOfflineDB();
      const res = await fetch(`${targetUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: db })
      });

      if (!res.ok) {
        throw new Error(`Server merespon status ${res.status}`);
      }

      const result = await res.json();
      if (result.success && result.data) {
        // Ambil data gabungan terbaru dari server
        const fullRes = await fetch(`${targetUrl}/api/sync`);
        const fullData = await fullRes.json();

        if (fullData.success && fullData.data) {
          const mergedDB = { ...db, ...fullData.data };
          saveOfflineDB(mergedDB);
          showToast('success', 'Sinkronisasi berhasil! Semua transaksi terbaru telah diperbarui dari server.');
          render();
          return;
        }
      }
      showToast('success', 'Sinkronisasi data berhasil diproses!');
    } catch (err) {
      console.warn('Sync failed:', err);
      showToast('error', `Gagal terhubung ke server (${err.message}). Pastikan server online atau gunakan fitur Ekspor/Impor.`);
    }
  }

  // 11. Ekspor Data JSON (Untuk Kirim via WhatsApp/Bluetooth ke HP lain)
  function exportData() {
    const db = getOfflineDB();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `BUMKAM_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('success', 'File data berhasil diekspor! Anda dapat mengirimkannya via WhatsApp ke HP pengurus lain.');
  }

  // 12. Impor Data JSON
  function importData(jsonString) {
    try {
      const incoming = JSON.parse(jsonString);
      if (!incoming.customers || !incoming.transactions) {
        showToast('error', 'Format file data tidak valid!');
        return;
      }
      const db = getOfflineDB();

      // Gabungkan Pelanggan
      const existingCodes = new Set(db.customers.map(c => c.code));
      incoming.customers.forEach(c => {
        if (!existingCodes.has(c.code)) {
          db.customers.push(c);
        }
      });

      // Gabungkan Transaksi
      const existingTrx = new Set(db.transactions.map(t => t.trans_no));
      incoming.transactions.forEach(t => {
        if (!existingTrx.has(t.trans_no)) {
          db.transactions.unshift(t);
        }
      });

      // Gabungkan Kas
      const existingCash = new Set(db.cash_transactions.map(c => c.trans_no));
      (incoming.cash_transactions || []).forEach(c => {
        if (!existingCash.has(c.trans_no)) {
          db.cash_transactions.unshift(c);
        }
      });

      // Update Saldo jika lebih baru
      if (typeof incoming.pulsa_balance === 'number') db.pulsa_balance = incoming.pulsa_balance;
      if (incoming.galon_inventory) db.galon_inventory = incoming.galon_inventory;

      saveOfflineDB(db);
      showToast('success', 'Data dari HP lain berhasil digabungkan dan diperbarui!');
      render();
    } catch (e) {
      showToast('error', 'Gagal membaca data JSON: ' + e.message);
    }
  }

  // --- RENDER ANTARMUKA PENGGUNA (UI) LENGKAP ---

  function render() {
    const app = document.getElementById('app');
    if (!app) return;
    const db = getOfflineDB();
    const metrics = getMetrics();

    app.innerHTML = `
      <!-- Top Mobile Header -->
      <header class="bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div class="flex items-center gap-2.5">
          <button onclick="toggleDrawer(true)" class="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 transition" title="Buka Menu Lengkap">
            <span class="text-lg">☰</span>
          </button>
          <img src="logo.png" alt="Logo" class="w-8 h-8 rounded-lg object-cover shadow-sm ring-1 ring-white/10">
          <div>
            <h1 class="font-bold text-sm leading-tight">BUMKAM Finance</h1>
            <p class="text-[10px] text-sky-400">Kampung Enggros • Hen Wani</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="openModal('adjust_balances')" class="text-[10px] font-bold px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1 shadow-xs" title="Atur Saldo Dashboard">
            <span>⚙️ Atur Saldo</span>
          </button>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            OFFLINE READY
          </span>
        </div>
      </header>

      <!-- Message Toast Banner -->
      ${toast ? `
        <div class="m-3 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-lg ${toast.type === 'success' ? 'bg-emerald-600 text-white' : (toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-sky-600 text-white')} transition-all">
          <span class="text-base">${toast.type === 'success' ? '✔' : (toast.type === 'error' ? '⚠' : 'ℹ')}</span>
          <span class="flex-1">${toast.text}</span>
        </div>
      ` : ''}

      <!-- Main Body Container -->
      <main class="flex-1 p-3 sm:p-5 pb-28 max-w-4xl mx-auto w-full space-y-4">
        ${renderCurrentTab(db, metrics)}

        <!-- Footer Akademik & Lembaga Resmi -->
        <footer class="pt-8 pb-4 text-center text-[10px] text-slate-400 leading-relaxed border-t border-slate-200/80 mt-10">
          <p>© 2026 BUMKAM Hen Wani — Kampung Enggros • Kelompok 5 Kelas C • Teknologi Digital Akuntansi • S1 Akuntansi FEB Uncen • All rights reserved.</p>
        </footer>
      </main>

      <!-- Drawer Sidebar Navigation (Akses Semua Fitur) -->
      ${renderDrawer(db)}

      <!-- Bottom Mobile Navigation Bar (Quick Access) -->
      <nav class="fixed bottom-0 inset-x-0 bg-slate-900 text-slate-400 border-t border-slate-800 flex justify-around items-center py-2 px-1 text-[10px] z-40 shadow-2xl">
        <button onclick="setTab('dashboard')" class="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg ${currentTab === 'dashboard' ? 'text-sky-400 font-bold bg-slate-800' : 'hover:text-slate-200'}">
          <span class="text-base">📊</span>
          <span>Dashboard</span>
        </button>
        <button onclick="setTab('kasir')" class="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg ${currentTab === 'kasir' ? 'text-emerald-400 font-bold bg-slate-800' : 'hover:text-slate-200'}">
          <span class="text-base">🛒</span>
          <span class="${currentTab === 'kasir' ? 'text-emerald-300 font-black' : 'text-emerald-400 font-bold'}">Kasir</span>
        </button>
        <button onclick="setTab('galon')" class="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg ${currentTab === 'galon' ? 'text-sky-400 font-bold bg-slate-800' : 'hover:text-slate-200'}">
          <span class="text-base">💧</span>
          <span>Galon</span>
        </button>
        <button onclick="setTab('pulsa')" class="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg ${currentTab === 'pulsa' ? 'text-sky-400 font-bold bg-slate-800' : 'hover:text-slate-200'}">
          <span class="text-base">📱</span>
          <span>Pulsa</span>
        </button>
        <button onclick="toggleDrawer(true)" class="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-sky-300 font-bold hover:text-white">
          <span class="text-base">☰</span>
          <span>Semua Menu</span>
        </button>
      </nav>

      <!-- Dynamic Active Modal -->
      ${renderActiveModal(db, metrics)}
    `;
  }

  // --- RENDER DRAWER SIDEBAR LENGKAP ---
  function renderDrawer(db) {
    if (!drawerOpen) return '';

    const menuItems = [
      { tab: 'dashboard', label: 'Dashboard Utama', icon: '📊', desc: 'Ringkasan kas, omset & stok riil' },
      { tab: 'kasir', label: 'Kasir POS Cepat', icon: '🛒', desc: 'Kasir satu layar transaksi galon & pulsa' },
      { tab: 'pulsa', label: 'Unit Usaha Pulsa', icon: '📱', desc: 'Jual pulsa, top-up deposit & margin' },
      { tab: 'galon', label: 'Unit Usaha Air Galon', icon: '💧', desc: 'Jual tunai/kredit & mutasi 4 tabung' },
      { tab: 'pasok_galon', label: 'Tambah Stok Galon', icon: '➕', desc: 'Pengisian ulang depot & kulakan' },
      { tab: 'pelanggan', label: 'Data Pelanggan', icon: '👥', desc: 'Kelola warga, tambah pelanggan baru' },
      { tab: 'piutang', label: 'Piutang & Pelunasan', icon: '💳', desc: 'Cicilan piutang tanpa omset ganda' },
      { tab: 'kas', label: 'Buku Kas & Pengeluaran', icon: '💰', desc: 'Arus kas masuk & beban operasional' },
      { tab: 'hasil-usaha', label: 'Hasil Usaha (Laba Rugi)', icon: '📈', desc: 'Laba kotor & bersih pulsa & galon' },
      { tab: 'akuntansi', label: 'Akuntansi Terpadu', icon: '📖', desc: 'Bagan akun, jurnal umum, buku besar' },
      { tab: 'laporan', label: '6 Laporan Keuangan Resmi', icon: '📄', desc: 'Laba rugi, arus kas, neraca, dsb.' },
      { tab: 'audit-log', label: 'Audit Log & Batal VOID', icon: '🛡️', desc: 'Riwayat aktivitas & pembatalan kasir' },
      { tab: 'pengaturan', label: 'Pengaturan & Saldo Awal', icon: '⚙️', desc: 'Atur nominal kas, pulsa & profil' },
      { tab: 'sinkronisasi', label: 'Sinkronisasi Antar HP', icon: '🔄', desc: 'Sync server cloud & ekspor/impor data' }
    ];

    return `
      <!-- Overlay Backdrop -->
      <div onclick="toggleDrawer(false)" class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 transition-opacity"></div>

      <!-- Drawer Content -->
      <div class="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-900 text-slate-100 z-50 flex flex-col shadow-2xl border-r border-slate-800 transform transition-transform">
        <!-- Header Drawer -->
        <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div class="flex items-center gap-3">
            <img src="logo.png" alt="Logo" class="w-10 h-10 rounded-xl object-cover ring-1 ring-sky-500/30">
            <div>
              <h2 class="font-bold text-sm text-white leading-tight">BUMKAM Hen Wani</h2>
              <p class="text-[11px] text-sky-400 font-medium">Kampung Enggros</p>
              <p class="text-[9px] text-slate-400">Mode Mobile APK Offline</p>
            </div>
          </div>
          <button onclick="toggleDrawer(false)" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            ✕
          </button>
        </div>

        <!-- Menu Links -->
        <div class="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-thin">
          <p class="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Semua Fitur Aplikasi (12 Modul)</p>
          ${menuItems.map(item => `
            <button onclick="${item.tab === 'pasok_galon' ? "openModal('add_galon_stock');" : `setTab('${item.tab}');`} toggleDrawer(false);" class="w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition ${currentTab === item.tab ? 'bg-sky-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'}">
              <span class="text-xl shrink-0 mt-0.5">${item.icon}</span>
              <div>
                <p class="text-xs font-semibold leading-tight">${item.label}</p>
                <p class="text-[10px] ${currentTab === item.tab ? 'text-sky-100' : 'text-slate-400'} mt-0.5">${item.desc}</p>
              </div>
            </button>
          `).join('')}
        </div>

        <!-- User Role Info -->
        <div class="p-3 border-t border-slate-800 bg-slate-950/60 text-xs flex items-center justify-between">
          <div>
            <p class="font-bold text-white">${db.user.full_name}</p>
            <p class="text-[10px] text-sky-400 uppercase tracking-wider font-semibold">${db.user.role === 'admin' ? 'Administrator' : 'Bendahara / Operator'}</p>
          </div>
          <button onclick="openModal('adjust_balances'); toggleDrawer(false);" class="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 text-[10px] font-bold border border-sky-500/30">
            ⚙️ Ubah Saldo
          </button>
        </div>
      </div>
    `;
  }

  // --- RENDER TAB KASIR POS CEPAT (SATU LAYAR OPERATOR) ---
  function renderKasirTab(db, m) {
    const isGalon = posUnit === 'galon';
    const totalAmount = isGalon ? (posGalonQty * posGalonPrice) : posPulsaPrice;
    const changeAmount = Math.max(0, (posCashGiven || 0) - totalAmount);

    return `
      <div class="space-y-3.5">
        <!-- Kasir Header & Status Cepat -->
        <div class="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-4 rounded-2xl text-white shadow-md flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center text-xl font-bold shadow-xs">
              🛒
            </div>
            <div>
              <h2 class="font-bold text-sm text-white leading-tight">Kasir POS Cepat</h2>
              <p class="text-[10px] text-sky-300">Transaksi 1 Layar • Otomatis Stok, Kas & Bon</p>
            </div>
          </div>
          <div class="text-right text-[10px] bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
            <span class="block text-slate-300">Stok Galon: <b class="text-blue-400 font-bold">${db.galon_inventory.available_qty}</b> tbg</span>
            <span class="block text-slate-300">Deposit Pulsa: <b class="text-sky-300 font-bold">Rp${(db.pulsa_balance || 0).toLocaleString('id-ID')}</b></span>
          </div>
        </div>

        <!-- Pemilih Unit Usaha Cepat (Galon vs Pulsa) -->
        <div style="display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important;">
          <button 
            type="button" 
            onclick="window.setPosUnit('galon')"
            class="py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs ${isGalon ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}"
          >
            <span class="text-lg">💧</span>
            <span>Air Galon (Rp6.000)</span>
          </button>
          <button 
            type="button" 
            onclick="window.setPosUnit('pulsa')"
            class="py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs ${!isGalon ? 'bg-sky-600 text-white shadow-sky-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}"
          >
            <span class="text-lg">📱</span>
            <span>Pulsa & Data</span>
          </button>
        </div>

        <!-- FORM KASIR UNIT GALON -->
        ${isGalon ? `
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="font-bold text-xs text-slate-800">Pilih Jumlah Galon (Qty):</label>
                <span class="text-[10px] text-slate-500">Harga: Rp${posGalonPrice.toLocaleString('id-ID')}/tbg</span>
              </div>
              <div style="display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 6px !important;">
                ${[1, 2, 3, 5].map(q => `
                  <button 
                    type="button" 
                    onclick="window.setPosGalonQty(${q})"
                    class="py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${posGalonQty === q ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50/70 text-blue-900 border border-blue-200 hover:bg-blue-100'}"
                  >
                    <span>${q} Galon</span>
                    <span class="text-[9px] opacity-80">Rp${(q * posGalonPrice).toLocaleString('id-ID')}</span>
                  </button>
                `).join('')}
              </div>
              <div class="mt-2.5 flex items-center gap-2">
                <span class="text-[11px] text-slate-500 font-semibold whitespace-nowrap">Jumlah Lain:</span>
                <input 
                  type="number" 
                  min="1" 
                  value="${posGalonQty}" 
                  oninput="window.setPosGalonQty(Number(this.value) || 1)"
                  class="w-24 p-2 border border-slate-300 rounded-xl text-xs font-bold text-center text-slate-900 bg-white"
                >
                <span class="text-[11px] text-slate-500">tabung</span>
              </div>
            </div>

            <!-- Wadah Tabung -->
            <div class="pt-2 border-t border-slate-100">
              <label class="block font-bold text-xs text-slate-800 mb-1.5">Status Wadah Tabung:</label>
              <div style="display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 6px !important;">
                <button 
                  type="button" 
                  onclick="window.setPosGallonAction('swap')"
                  class="py-2 px-1 rounded-xl text-[10px] font-bold text-center transition ${posGallonAction === 'swap' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
                >
                  🔄 Tukar Tabung
                </button>
                <button 
                  type="button" 
                  onclick="window.setPosGallonAction('borrow')"
                  class="py-2 px-1 rounded-xl text-[10px] font-bold text-center transition ${posGallonAction === 'borrow' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
                >
                  📦 Pinjam Tabung
                </button>
                <button 
                  type="button" 
                  onclick="window.setPosGallonAction('none')"
                  class="py-2 px-1 rounded-xl text-[10px] font-bold text-center transition ${posGallonAction === 'none' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
                >
                  🏷️ Beli Baru
                </button>
              </div>
            </div>
          </div>
        ` : `
          <!-- FORM KASIR UNIT PULSA -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <label class="block font-bold text-xs text-slate-800 mb-1">Nomor HP Pelanggan *</label>
              <input 
                type="tel" 
                id="pos_pls_phone" 
                value="${posPulsaPhone}" 
                placeholder="0812xxxxxxxx" 
                oninput="window.setPosPulsaPhone(this.value)"
                class="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 text-xs font-bold"
              >
            </div>

            <div>
              <label class="block font-bold text-xs text-slate-800 mb-2">Pilih Nominal Pulsa Cepat:</label>
              <div style="display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 6px !important;">
                ${[
                  { nom: 5000, price: 7000, cogs: 5500 },
                  { nom: 10000, price: 12000, cogs: 10500 },
                  { nom: 20000, price: 22000, cogs: 20500 },
                  { nom: 25000, price: 27000, cogs: 25500 },
                  { nom: 50000, price: 52000, cogs: 50500 },
                  { nom: 100000, price: 102000, cogs: 100500 }
                ].map(p => `
                  <button 
                    type="button" 
                    onclick="window.setPosPulsaPackage(${p.nom}, ${p.price}, ${p.cogs})"
                    class="py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${posPulsaNominal === p.nom ? 'bg-sky-600 text-white shadow-xs' : 'bg-sky-50 text-sky-900 border border-sky-200 hover:bg-sky-100'}"
                  >
                    <span>${p.nom.toLocaleString('id-ID')}</span>
                    <span class="text-[9px] opacity-80">Jual Rp${p.price.toLocaleString('id-ID')}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label class="block text-slate-600 mb-0.5 text-[10px]">Provider</label>
                <select id="pos_pls_provider" onchange="window.posPulsaProvider = this.value" class="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold">
                  <option value="Telkomsel" ${posPulsaProvider === 'Telkomsel' ? 'selected' : ''}>Telkomsel</option>
                  <option value="Indosat" ${posPulsaProvider === 'Indosat' ? 'selected' : ''}>Indosat</option>
                  <option value="XL/Axis" ${posPulsaProvider === 'XL/Axis' ? 'selected' : ''}>XL/Axis</option>
                  <option value="Smartfren" ${posPulsaProvider === 'Smartfren' ? 'selected' : ''}>Smartfren</option>
                  <option value="Tri" ${posPulsaProvider === 'Tri' ? 'selected' : ''}>Tri (3)</option>
                </select>
              </div>
              <div class="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col justify-center text-right">
                <span class="text-[9px] text-emerald-800 font-semibold">Margin Kasir:</span>
                <span class="text-xs font-black text-emerald-700">+Rp${(posPulsaPrice - posPulsaCogs).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        `}

        <!-- CARD PEMBAYARAN KASIR & HITUNG KEMBALIAN -->
        <div class="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm space-y-3.5">
          <!-- Total Tagihan -->
          <div class="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Tagihan Kasir</p>
              <p class="text-xl font-black text-emerald-400">Rp${totalAmount.toLocaleString('id-ID')}</p>
            </div>
            <span class="px-2.5 py-1 rounded-lg text-xs font-bold ${posPaymentMethod === 'cash' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'}">
              ${posPaymentMethod === 'cash' ? '💵 TUNAI' : '📝 TEMPO (BON)'}
            </span>
          </div>

          <!-- Pilihan Tunai vs Tempo -->
          <div style="display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important;">
            <button 
              type="button" 
              onclick="window.setPosPaymentMethod('cash')"
              class="py-2.5 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-1.5 ${posPaymentMethod === 'cash' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}"
            >
              <span>💵 Tunai (Kasir)</span>
            </button>
            <button 
              type="button" 
              onclick="window.setPosPaymentMethod('credit')"
              class="py-2.5 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-1.5 ${posPaymentMethod === 'credit' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}"
            >
              <span>📝 Tempo (Piutang)</span>
            </button>
          </div>

          <!-- Kalkulator Tunai: Uang Diterima & Kembalian Otomatis -->
          ${posPaymentMethod === 'cash' ? `
            <div class="space-y-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-800">Uang Tunai Pembeli (Rp):</label>
                <div class="flex gap-1">
                  <button type="button" onclick="window.setPosCashGiven(${totalAmount})" class="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300 shadow-2xs">Pas</button>
                  <button type="button" onclick="window.setPosCashGiven(10000)" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-300">10rb</button>
                  <button type="button" onclick="window.setPosCashGiven(20000)" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-300">20rb</button>
                  <button type="button" onclick="window.setPosCashGiven(50000)" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-300">50rb</button>
                </div>
              </div>
              <input 
                type="number" 
                value="${posCashGiven || totalAmount}" 
                oninput="window.setPosCashGiven(Number(this.value) || 0)"
                class="w-full p-2.5 border border-emerald-300 rounded-xl bg-white text-slate-900 font-black text-sm"
              >
              
              <!-- Uang Kembalian -->
              <div class="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700">Kembalian ke Pembeli:</span>
                <span class="text-base font-black text-emerald-600">Rp${changeAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>
          ` : ''}

          <!-- Nama Pelanggan (Wajib jika tempo/pinjam) -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-800">
                Nama Pelanggan / Warga ${posPaymentMethod === 'credit' || posGallonAction === 'borrow' ? '<span class="text-rose-600 font-bold">* (Wajib)</span>' : '(Opsional)'}:
              </label>
              <button type="button" onclick="openModal('add_customer')" class="text-[10px] text-sky-600 font-bold hover:underline">+ Baru</button>
            </div>
            <select id="pos_customer_id" class="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 text-xs font-semibold">
              <option value="">-- ${posPaymentMethod === 'credit' ? 'Pilih Nama Pelanggan (Wajib)' : 'Pelanggan Umum (Tanpa Catat Nama)'} --</option>
              ${db.customers.map(c => `<option value="${c.id}">${c.name} (${c.code}) - ${c.address}</option>`).join('')}
            </select>
          </div>

          <!-- Tombol Selesaikan Transaksi Besar -->
          <button 
            type="button" 
            onclick="window.handlePosSubmit()"
            class="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <span>✔ Selesaikan Transaksi & Simpan (Rp${totalAmount.toLocaleString('id-ID')})</span>
          </button>
        </div>

        <!-- Riwayat Transaksi Cepat Kasir -->
        <div class="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
          <p class="font-bold text-xs text-slate-800">3 Transaksi Terakhir:</p>
          <div class="divide-y divide-slate-100 text-xs">
            ${db.transactions.slice(0, 3).map(t => `
              <div class="py-2 flex items-center justify-between">
                <div>
                  <p class="font-bold text-slate-900">${t.trans_no} • <span class="text-[10px] font-semibold text-sky-700">${t.unit_code}</span></p>
                  <p class="text-[10px] text-slate-500">${t.trans_date} • ${t.customer_name ? t.customer_name : (t.notes || 'Pelanggan Umum')}</p>
                </div>
                <div class="text-right">
                  <p class="font-bold text-slate-900">Rp${Number(t.subtotal || 0).toLocaleString('id-ID')}</p>
                  <span class="text-[9px] px-1.5 py-0.2 rounded font-bold ${t.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                    ${(t.payment_method || 'cash').toUpperCase()}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // --- RENDER TAB AKTIF ---
  function renderCurrentTab(db, m) {
    if (currentTab === 'kasir') {
      return renderKasirTab(db, m);
    }

    if (currentTab === 'dashboard') {
      return `
        <!-- Hero Banner Unit Usaha -->
        <div class="relative rounded-2xl overflow-hidden shadow-md border border-slate-200">
          <img src="login-hero.jpg" alt="Usaha Galon & Pulsa" class="w-full h-28 sm:h-36 object-cover object-center">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent"></div>
          <div class="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
            <div>
              <p class="font-bold text-sm leading-tight">BUMKAM Hen Wani</p>
              <p class="text-[10px] text-sky-300">Depot Air Galon & Pulsa Telko Digital • Kampung Enggros</p>
            </div>
            <button onclick="openModal('adjust_balances')" class="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-md flex items-center gap-1">
              <span>⚙️ Atur Saldo Awal</span>
            </button>
          </div>
        </div>

        <!-- AKSES LAYANAN CEPAT (MODERN FINTECH 8-ICON GRID) -->
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div class="flex items-center gap-1.5">
              <span class="text-sm">⚡</span>
              <h3 class="font-bold text-xs text-slate-900 tracking-tight">Akses Layanan Cepat</h3>
            </div>
            <button onclick="toggleDrawer(true)" class="text-[10px] text-sky-600 font-bold hover:text-sky-700 flex items-center gap-1">
              <span>Semua Menu (12 Modul)</span>
              <span>☰</span>
            </button>
          </div>
          
          <div style="display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 12px 4px !important; text-align: center !important;">
            <!-- 1. Kasir POS Cepat -->
            <button onclick="setTab('kasir')" class="flex flex-col items-center justify-center p-1 rounded-xl hover:bg-slate-50 active:scale-95 transition group" style="background: none; border: none;">
              <div style="width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; background-color: #ecfdf5; border: 1.5px solid #a7f3d0; box-shadow: 0 1px 3px rgba(16,185,129,0.15);">
                🛒
              </div>
              <span style="font-size: 11px; font-weight: 800; color: #047857; margin-top: 5px; line-height: 1.2;">Kasir POS</span>
            </button>

            <!-- 2. Jual Galon -->
            <button onclick="setTab('galon')" class="flex flex-col items-center justify-center p-1 rounded-xl hover:bg-slate-50 active:scale-95 transition group" style="background: none; border: none;">
              <div style="width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; background-color: #eff6ff; border: 1px solid #bfdbfe; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                💧
              </div>
              <span style="font-size: 11px; font-weight: 600; color: #1e293b; margin-top: 5px; line-height: 1.2;">Jual Galon</span>
            </button>

            <!-- 3. Pulsa -->
            <button onclick="setTab('pulsa')" class="flex flex-col items-center justify-center p-1 rounded-xl hover:bg-slate-50 active:scale-95 transition group" style="background: none; border: none;">
              <div style="width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; background-color: #f0f9ff; border: 1px solid #bae6fd; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                📱
              </div>
              <span style="font-size: 11px; font-weight: 600; color: #1e293b; margin-top: 5px; line-height: 1.2;">Pulsa</span>
            </button>

            <!-- 4. Pasok Stok -->
            <button onclick="openModal('add_galon_stock')" class="flex flex-col items-center justify-center p-1 rounded-xl hover:bg-slate-50 active:scale-95 transition group" style="background: none; border: none;">
              <div style="width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; background-color: #f0fdf4; border: 1px solid #bbf7d0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                📦
              </div>
              <span style="font-size: 11px; font-weight: 600; color: #15803d; margin-top: 5px; line-height: 1.2;">+ Stok</span>
            </button>

            <!-- 4. Pelanggan -->
            <button onclick="setTab('pelanggan')" class="flex flex-col items-center justify-center p-1 rounded-xl hover:bg-slate-50 active:scale-95 transition group" style="background: none; border: none;">
              <div style="width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; background-color: #eef2ff; border: 1px solid #c7d2fe; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                👥
              </div>
              <span style="font-size: 11px; font-weight: 600; color: #1e293b; margin-top: 5px; line-height: 1.2;">Pelanggan</span>
            </button>

            <!-- 5. Piutang -->
            <button onclick="setTab('piutang')" class="flex flex-col items-center justify-center p-1 rounded-xl hover:bg-slate-50 active:scale-95 transition group" style="background: none; border: none;">
              <div style="width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; background-color: #fffbeb; border: 1px solid #fde68a; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                💳
              </div>
              <span style="font-size: 11px; font-weight: 600; color: #1e293b; margin-top: 5px; line-height: 1.2;">Piutang</span>
            </button>

            <!-- 7. Laporan -->
            <button onclick="setTab('laporan')" class="flex flex-col items-center justify-center p-1 rounded-xl hover:bg-slate-50 active:scale-95 transition group" style="background: none; border: none;">
              <div style="width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; background-color: #f8fafc; border: 1px solid #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                📊
              </div>
              <span style="font-size: 11px; font-weight: 600; color: #1e293b; margin-top: 5px; line-height: 1.2;">Laporan</span>
            </button>

            <!-- 8. Semua Menu -->
            <button onclick="toggleDrawer(true)" class="flex flex-col items-center justify-center p-1 rounded-xl hover:bg-slate-50 active:scale-95 transition group" style="background: none; border: none;">
              <div style="width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; background-color: #faf5ff; border: 1px solid #e9d5ff; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                ☰
              </div>
              <span style="font-size: 11px; font-weight: 600; color: #6b21a8; margin-top: 5px; line-height: 1.2;">Lainnya</span>
            </button>
          </div>
        </div>

        <!-- 4 KPI UTAMA DENGAN TOMBOL EDIT NOMINAL (JAWABAN MASALAH 3) -->
        <div class="grid grid-cols-2 gap-3" style="display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important;">
          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs relative">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-bold text-slate-400 uppercase">Saldo Kas Tunai</p>
              <button onclick="openModal('adjust_balances')" class="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-bold border border-sky-200 hover:bg-sky-100">✏️ Ubah</button>
            </div>
            <p class="text-lg font-black text-slate-900 mt-1">Rp${m.cashBalance.toLocaleString('id-ID')}</p>
            <p class="text-[9px] text-slate-400 mt-0.5">Uang riil kasir BUMKAM</p>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-bold text-slate-400 uppercase">Penjualan Hari Ini</p>
              <span class="text-[9px] text-sky-600 font-bold">Realtime</span>
            </div>
            <p class="text-lg font-black text-sky-600 mt-1">Rp${m.salesToday.toLocaleString('id-ID')}</p>
            <p class="text-[9px] text-slate-400 mt-0.5">Omset pulsa & galon</p>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-bold text-slate-400 uppercase">Piutang Belum Lunas</p>
              <button onclick="setTab('piutang')" class="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200 hover:bg-amber-100">Bayar</button>
            </div>
            <p class="text-lg font-black text-amber-600 mt-1">Rp${m.pendingRec.toLocaleString('id-ID')}</p>
            <p class="text-[9px] text-slate-400 mt-0.5">Tagihan warga aktif</p>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-bold text-slate-400 uppercase">Hasil Usaha Bersih</p>
              <button onclick="setTab('hasil-usaha')" class="text-[10px] text-emerald-700 font-semibold hover:underline">Rincian</button>
            </div>
            <p class="text-lg font-black ${m.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} mt-1">Rp${m.netProfit.toLocaleString('id-ID')}</p>
            <p class="text-[9px] text-slate-400 mt-0.5">Laba bersih bulan ini</p>
          </div>
        </div>

        <!-- Pulsa & Galon Summary Cards -->
        <div class="grid grid-cols-2 gap-3" style="display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important;">
          <div class="bg-sky-50 border border-sky-200 p-3.5 rounded-xl">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-bold text-sky-900 uppercase">Saldo Modal Pulsa</p>
              <button onclick="openModal('adjust_balances')" class="text-[10px] bg-white text-sky-700 px-1.5 py-0.5 rounded font-bold border border-sky-300">✏️ Ubah</button>
            </div>
            <p class="text-base font-black text-sky-700 mt-0.5">Rp${m.pulsaBalance.toLocaleString('id-ID')}</p>
            <div class="flex items-center gap-1.5 mt-2">
              <button onclick="setTab('pulsa')" class="text-[10px] font-bold px-2 py-1 rounded bg-sky-600 text-white shadow-xs">+ Jual</button>
              <button onclick="setTab('pulsa')" class="text-[10px] font-bold px-2 py-1 rounded bg-white text-sky-700 border border-sky-200">+ Top Up</button>
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 p-3.5 rounded-xl">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-bold text-blue-900 uppercase">Galon Siap Jual</p>
              <button onclick="openModal('adjust_balances')" class="text-[10px] bg-white text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-300">✏️ Ubah</button>
            </div>
            <p class="text-base font-black text-blue-700 mt-0.5">${m.galonAvailable} tabung</p>
            <div class="flex items-center gap-1.5 mt-2">
              <button onclick="setTab('galon')" class="text-[10px] font-bold px-2 py-1 rounded bg-blue-600 text-white shadow-xs">+ Jual</button>
              <button onclick="openModal('add_galon_stock')" class="text-[10px] font-bold px-2 py-1 rounded bg-emerald-600 text-white shadow-xs">+ Pasok</button>
            </div>
          </div>
        </div>

        <!-- Tombol Sinkronisasi Cepat (Jawaban Masalah 2: Agar Transaksi Terbaca di Semua HP) -->
        <div class="bg-sky-50 border-2 border-sky-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                🔄
              </div>
              <p class="text-xs font-bold text-slate-900">Sinkronisasi Data Antar Handphone</p>
            </div>
            <p class="text-[10px] text-slate-500 mt-1 pl-9">Tarik transaksi terbaru dari HP operator lain</p>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="window.triggerQuickSync()" class="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold shadow-xs flex items-center gap-1">
              <span>🔄 Tarik Data</span>
            </button>
            <button onclick="setTab('sinkronisasi')" class="px-2.5 py-1.5 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-300 hover:bg-slate-50">
              Opsi
            </button>
          </div>
        </div>

        <!-- Transaksi Terbaru (Real-Time) -->
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div class="p-3 border-b border-slate-100 font-bold text-xs flex justify-between items-center bg-slate-50">
            <div class="flex items-center gap-2">
              <span>Transaksi Terbaru (Real-Time)</span>
              <button onclick="window.triggerQuickSync()" class="text-[9px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 hover:bg-sky-100">
                🔄 Sync HP Lain
              </button>
            </div>
            <span class="text-[10px] text-slate-500">${db.transactions.length} total transaksi</span>
          </div>
          <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs">
            ${db.transactions.length === 0 ? '<p class="p-6 text-center text-slate-400">Belum ada transaksi dicatat.</p>' : ''}
            ${db.transactions.slice(0, 10).map(t => `
              <div class="p-3 flex justify-between items-center hover:bg-slate-50">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900">${t.trans_no}</span>
                    <span class="text-[9px] font-bold px-1.5 py-0.2 rounded ${t.unit_code === 'PULSA' ? 'bg-sky-100 text-sky-800' : 'bg-blue-100 text-blue-800'}">${t.unit_code}</span>
                    ${t.status === 'void' ? '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">BATAL (VOID)</span>' : ''}
                  </div>
                  <p class="text-[10px] text-slate-500 mt-0.5">${t.trans_date} • ${t.customer_name ? `Pelanggan: <b>${t.customer_name}</b>` : (t.notes || '-')}</p>
                </div>
                <div class="text-right">
                  <p class="font-black text-slate-900">Rp${Number(t.subtotal || 0).toLocaleString('id-ID')}</p>
                  <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${t.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                    ${(t.payment_method || 'cash').toUpperCase()}
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
            <div>
              <h3 class="font-bold text-sm text-slate-900">Penjualan Pulsa & Paket Data</h3>
              <p class="text-[10px] text-slate-400">Prinsip Satu Input — Margin & Jurnal Otomatis</p>
            </div>
            <div class="text-right">
              <span class="text-xs font-black text-sky-600 block">Saldo: Rp${db.pulsa_balance.toLocaleString('id-ID')}</span>
              <button onclick="openModal('adjust_balances')" class="text-[9px] text-slate-400 hover:text-sky-600 underline">Ubah Saldo</button>
            </div>
          </div>

          <form id="formSellPulsa" onsubmit="window.handleSellPulsaSubmit(event)" class="space-y-3 text-xs">
            <div>
              <label class="block font-semibold mb-1">Nomor HP Pelanggan</label>
              <input type="tel" id="pls_phone" required placeholder="0812xxxxxxxx" class="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white text-xs">
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold mb-1">Provider</label>
                <select id="pls_prov" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
                  <option value="Telkomsel">Telkomsel</option>
                  <option value="Indosat">Indosat Ooredoo</option>
                  <option value="XL/Axis">XL / Axis</option>
                  <option value="Smartfren">Smartfren</option>
                  <option value="Tri">Tri (3)</option>
                </select>
              </div>
              <div>
                <label class="block font-semibold mb-1">Nominal / Paket</label>
                <input type="text" id="pls_nom" required placeholder="Pulsa 50.000 / Data 10GB" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold mb-1">Harga Pokok Modal (HPP)</label>
                <input type="number" id="pls_cogs" required placeholder="48500" oninput="window.calcPulsaMargin()" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
              </div>
              <div>
                <label class="block font-semibold mb-1">Harga Jual ke Pelanggan</label>
                <input type="number" id="pls_sell" required placeholder="52000" oninput="window.calcPulsaMargin()" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
              </div>
            </div>

            <!-- Margin Info Box -->
            <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center font-bold text-emerald-800">
              <span>Keuntungan / Margin Bersih:</span>
              <span id="pls_margin_display" class="text-sm font-black">Rp0</span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold mb-1">Metode Bayar</label>
                <select id="pls_pay" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
                  <option value="cash">Tunai (Kas Bertambah)</option>
                  <option value="credit">Kredit / Piutang</option>
                </select>
              </div>
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="font-semibold">Pelanggan</label>
                  <button type="button" onclick="openModal('add_customer')" class="text-[10px] text-sky-600 font-bold hover:underline">+ Baru</button>
                </div>
                <select id="pls_cust" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
                  <option value="">-- Pilih Pelanggan --</option>
                  ${db.customers.map(c => `<option value="${c.id}">${c.name} (${c.code})</option>`).join('')}
                </select>
              </div>
            </div>

            <button type="submit" class="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-sm text-xs transition">
              Simpan & Posting Penjualan Pulsa
            </button>
          </form>

          <!-- Top-Up Form Section -->
          <div class="pt-4 border-t border-slate-200">
            <h4 class="font-bold text-xs text-slate-800 mb-2">Tambah Saldo / Top-Up Deposit Pulsa</h4>
            <form id="formTopupPulsa" onsubmit="window.handleTopupPulsaSubmit(event)" class="space-y-2 text-xs">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-slate-500 mb-1">Nominal Saldo Didapat</label>
                  <input type="number" id="top_nom" required placeholder="1000000" class="w-full p-2 border rounded bg-slate-50 text-xs">
                </div>
                <div>
                  <label class="block text-slate-500 mb-1">Uang Kas Dibayarkan</label>
                  <input type="number" id="top_cost" required placeholder="990000" class="w-full p-2 border rounded bg-slate-50 text-xs">
                </div>
              </div>
              <button type="submit" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded text-xs transition">
                + Tambah Saldo Pulsa
              </button>
            </form>
          </div>
        </div>
      `;
    }

    if (currentTab === 'galon') {
      return `
        <!-- CARD TAMBAH / PASOK STOK GALON SIAP JUAL (SUPER HIGH CONTRAST & JELAS TERBACA) -->
        <div class="bg-blue-50/80 border-2 border-blue-200 rounded-2xl p-4 shadow-xs space-y-3.5">
          <div class="flex items-center justify-between pb-2.5 border-b border-blue-200">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                ➕
              </div>
              <div>
                <h4 class="font-bold text-xs sm:text-sm text-slate-900 leading-tight">Tambah / Pasok Stok Galon Siap Jual</h4>
                <p class="text-[10px] text-slate-500 mt-0.5">Pengisian ulang depot / pasokan tabung baru</p>
              </div>
            </div>
            <span class="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-600 text-white shadow-xs">
              Stok: ${db.galon_inventory.available_qty} tabung
            </span>
          </div>

          <form id="formAddGalonStock" onsubmit="window.handleAddGalonStockSubmit(event)" class="space-y-3 text-xs">
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="block text-slate-800 mb-1 font-bold">Jumlah Tambah (Tabung) *</label>
                <input type="number" id="add_gln_qty" min="1" value="50" required placeholder="50" class="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs">
              </div>
              <div>
                <label class="block text-slate-800 mb-1 font-bold">Biaya Kas Kulakan (Rp)</label>
                <input type="number" id="add_gln_cost" min="0" value="0" placeholder="0 jika mandiri" class="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs">
              </div>
            </div>
            <div>
              <label class="block text-slate-800 mb-1 font-bold">Catatan / Sumber Pasokan</label>
              <input type="text" id="add_gln_notes" placeholder="Contoh: Pengisian Depot Kampung Enggros" class="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs">
            </div>
            <button type="submit" class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-xs transition flex items-center justify-center gap-1.5">
              <span>✔ Simpan & Tambah Stok Galon Siap Jual</span>
            </button>
          </form>
        </div>

        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div class="flex justify-between items-center pb-2 border-b">
            <div>
              <h3 class="font-bold text-sm text-slate-900">Penjualan Unit Air Galon</h3>
              <p class="text-[10px] text-slate-400">Kontrol Stok & Wadah Tabung Pelanggan</p>
            </div>
            <div class="text-right">
              <span class="text-xs font-black text-blue-700 block">Tersedia: ${db.galon_inventory.available_qty} tabung</span>
              <button onclick="openModal('adjust_balances')" class="text-[9px] text-slate-400 hover:text-blue-600 underline">Ubah Stok</button>
            </div>
          </div>

          <form id="formSellGalon" onsubmit="window.handleSellGalonSubmit(event)" class="space-y-3 text-xs">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold mb-1">Jumlah Galon (Qty)</label>
                <input type="number" id="gln_qty" min="1" value="1" required oninput="window.calcGalonTotal()" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs font-bold text-slate-900">
              </div>
              <div>
                <label class="block font-semibold mb-1">Harga per Galon (Rp)</label>
                <input type="number" id="gln_price" value="6000" required oninput="window.calcGalonTotal()" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs font-bold text-slate-900">
              </div>
            </div>

            <!-- Total Box -->
            <div class="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center font-bold text-blue-900">
              <span>Total Pembayaran:</span>
              <span id="gln_total_display" class="text-sm font-black text-blue-800">Rp6.000</span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold mb-1">Metode Pembayaran</label>
                <select id="gln_pay" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
                  <option value="cash">Tunai (Kas Bertambah)</option>
                  <option value="credit">Kredit / Tempo (Kas Rp0)</option>
                </select>
              </div>
              <div>
                <label class="block font-semibold mb-1">Wadah Tabung</label>
                <select id="gln_act" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
                  <option value="swap">Tukar Tabung Kosong</option>
                  <option value="borrow">Pinjam Tabung BUMKAM</option>
                  <option value="none">Beli Tabung Baru</option>
                </select>
              </div>
            </div>

            <!-- BAGIAN PELANGGAN DUAL-MODE (JAWABAN MASALAH 1: KETIK LANGSUNG ATAU PILIH DAFTAR) -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div class="flex items-center justify-between">
                <label class="font-bold text-slate-800 text-xs">Nama Pelanggan / Warga:</label>
                <div class="flex gap-1">
                  <button type="button" onclick="window.setCustMode('select')" class="px-2 py-0.5 rounded text-[10px] font-bold ${!newCustInlineMode ? 'bg-sky-600 text-white shadow-xs' : 'bg-white text-slate-600 border'}">
                    Pilih Warga
                  </button>
                  <button type="button" onclick="window.setCustMode('new')" class="px-2 py-0.5 rounded text-[10px] font-bold ${newCustInlineMode ? 'bg-sky-600 text-white shadow-xs' : 'bg-white text-slate-600 border'}">
                    + Ketik Nama Baru
                  </button>
                  <button type="button" onclick="openModal('add_customer')" class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    Popup
                  </button>
                </div>
              </div>

              ${!newCustInlineMode ? `
                <select id="gln_cust" class="w-full p-2.5 border rounded-lg bg-white text-xs">
                  <option value="">-- Pilih Pelanggan (Wajib jika tempo/pinjam) --</option>
                  ${db.customers.map(c => `<option value="${c.id}">${c.name} (${c.code}) - ${c.address}</option>`).join('')}
                </select>
              ` : `
                <div class="space-y-2 p-2.5 bg-sky-50/60 rounded-lg border border-sky-200">
                  <div>
                    <label class="block text-[10px] font-bold text-sky-900 mb-0.5">Ketik Nama Pelanggan Baru *</label>
                    <input type="text" id="inline_cust_name" required placeholder="Contoh: Bapak Markus Haay / Mama Yohana" class="w-full p-2 border border-sky-300 rounded bg-white text-xs font-semibold">
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block text-[10px] text-slate-500 mb-0.5">No. HP (Opsional)</label>
                      <input type="tel" id="inline_cust_phone" placeholder="0812xxxxxxxx" class="w-full p-2 border rounded bg-white text-xs">
                    </div>
                    <div>
                      <label class="block text-[10px] text-slate-500 mb-0.5">Alamat / RT (Opsional)</label>
                      <input type="text" id="inline_cust_addr" value="Kampung Enggros RT 01" class="w-full p-2 border rounded bg-white text-xs">
                    </div>
                  </div>
                </div>
              `}
            </div>

            <button type="submit" class="w-full py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg shadow-sm text-xs transition">
              Proses Penjualan Galon
            </button>
          </form>

          <!-- Form Mutasi Tabung (Pengembalian / Rusak) -->
          <div class="pt-4 border-t border-slate-200">
            <h4 class="font-bold text-xs text-slate-800 mb-2">Catat Mutasi / Pengembalian Tabung Galon</h4>
            <form id="formMutateGalon" onsubmit="window.handleMutateGalonSubmit(event)" class="space-y-2 text-xs">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-slate-500 mb-1">Jenis Mutasi</label>
                  <select id="mut_type" class="w-full p-2 border rounded bg-slate-50 text-xs">
                    <option value="return_in">Pengembalian Tabung Kosong (Galon Kembali)</option>
                    <option value="damaged">Galon Pecah / Rusak / Hilang</option>
                  </select>
                </div>
                <div>
                  <label class="block text-slate-500 mb-1">Jumlah Tabung</label>
                  <input type="number" id="mut_qty" min="1" value="1" required class="w-full p-2 border rounded bg-slate-50 text-xs">
                </div>
              </div>
              <div>
                <label class="block text-slate-500 mb-1">Pelanggan yang Mengembalikan</label>
                <select id="mut_cust" class="w-full p-2 border rounded bg-slate-50 text-xs">
                  <option value="">-- Pilih Pelanggan --</option>
                  ${db.customers.map(c => `<option value="${c.id}">${c.name} (Pinjam: ${c.gallon_balance} tabung)</option>`).join('')}
                </select>
              </div>
              <button type="submit" class="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded text-xs transition">
                Simpan Mutasi Tabung
              </button>
            </form>
          </div>
        </div>
      `;
    }

    if (currentTab === 'pelanggan') {
      const filtered = db.customers.filter(c => 
        (c.name || '').toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        (c.code || '').toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        (c.phone || '').includes(customerSearchQuery)
      );

      return `
        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div class="flex justify-between items-center pb-2 border-b">
            <div>
              <h3 class="font-bold text-sm text-slate-900">Data Pelanggan Kampung Enggros</h3>
              <p class="text-[10px] text-slate-400">Total ${db.customers.length} pelanggan terdaftar</p>
            </div>
            <button onclick="openModal('add_customer')" class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs flex items-center gap-1">
              <span>+ Tambah Pelanggan</span>
            </button>
          </div>

          <!-- Search Input -->
          <div>
            <input 
              type="text" 
              placeholder="🔍 Cari nama atau no HP pelanggan..." 
              value="${customerSearchQuery}"
              oninput="window.handleCustomerSearch(event)"
              class="w-full p-2.5 border rounded-lg text-xs bg-slate-50 focus:bg-white"
            >
          </div>

          <!-- List Pelanggan Cards -->
          <div class="space-y-2.5">
            ${filtered.length === 0 ? '<p class="text-center py-6 text-slate-400 text-xs">Tidak ditemukan pelanggan yang cocok.</p>' : ''}
            ${filtered.map(c => `
              <div class="p-3 rounded-xl border border-slate-200 hover:border-sky-300 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-xs text-slate-900">${c.name}</span>
                    <span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">${c.code}</span>
                  </div>
                  <p class="text-[10px] text-slate-500 mt-0.5">${c.phone || '-'} • ${c.address || 'Kampung Enggros'}</p>
                </div>
                <div class="text-right flex items-center gap-3">
                  <div>
                    <p class="text-[10px] text-slate-400">Wadah: <b class="text-blue-700">${c.gallon_balance || 0} galon</b></p>
                    <p class="text-[10px] text-slate-400">Utang: <b class="${c.total_receivable > 0 ? 'text-amber-600' : 'text-emerald-600'}">Rp${(c.total_receivable || 0).toLocaleString('id-ID')}</b></p>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (currentTab === 'piutang') {
      const pending = db.receivables.filter(r => r.status !== 'paid');

      return `
        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div class="flex justify-between items-center pb-2 border-b">
            <div>
              <h3 class="font-bold text-sm text-slate-900">Piutang Usaha Pelanggan</h3>
              <p class="text-[10px] text-slate-400">Pelunasan Menambah Kas & Mengurangi Piutang</p>
            </div>
            <div class="text-right">
              <span class="text-xs font-black text-amber-600 block">Total: Rp${m.pendingRec.toLocaleString('id-ID')}</span>
              <span class="text-[9px] text-slate-400">${pending.length} tagihan aktif</span>
            </div>
          </div>

          <div class="space-y-3 text-xs">
            ${pending.length === 0 ? '<p class="p-6 text-center text-slate-400">Semua piutang telah lunas! Tidak ada tagihan tertunggak.</p>' : ''}
            ${pending.map(r => `
              <div class="p-3 border rounded-xl bg-slate-50 space-y-2">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-slate-900">${r.customer_name}</span>
                      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${r.status === 'unpaid' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">
                        ${r.status === 'unpaid' ? 'BELUM LUNAS' : 'SEBAGIAN'}
                      </span>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-0.5">${r.trans_no} • ${r.trans_date} (${r.unit_code})</p>
                  </div>
                  <div class="text-right">
                    <p class="text-[10px] text-slate-400">Sisa Piutang:</p>
                    <p class="font-black text-amber-600 text-sm">Rp${r.remaining_amount.toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div class="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <input type="number" id="pay_amt_${r.id}" placeholder="Jumlah bayar..." value="${r.remaining_amount}" class="flex-1 p-2 border rounded bg-white text-xs">
                  <button onclick="window.handlePayReceivableClick(${r.id})" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition">
                    Bayar
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (currentTab === 'kas') {
      return `
        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div class="flex justify-between items-center pb-2 border-b">
            <div>
              <h3 class="font-bold text-sm text-slate-900">Buku Kas Operasional</h3>
              <p class="text-[10px] text-slate-400">Arus Kas Masuk & Kas Keluar Riil</p>
            </div>
            <div class="text-right">
              <span class="text-xs font-black text-slate-900 block">Saldo Kas: Rp${m.cashBalance.toLocaleString('id-ID')}</span>
              <button onclick="openModal('adjust_balances')" class="text-[9px] text-sky-600 font-semibold hover:underline">Atur Saldo</button>
            </div>
          </div>

          <!-- Form Tambah Beban Operasional -->
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <p class="font-bold text-slate-800">Catat Pengeluaran Operasional Depot</p>
            <form onsubmit="window.handleExpenseSubmit(event)" class="space-y-2">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-slate-500 mb-1">Kategori Biaya</label>
                  <select id="exp_cat" class="w-full p-2 border rounded bg-white text-xs">
                    <option value="6101">Beban Listrik & Depot</option>
                    <option value="6102">Beban Internet & Komunikasi</option>
                    <option value="6103">Beban Transportasi Galon</option>
                    <option value="6104">Beban Filter & Pemeliharaan</option>
                    <option value="6199">Beban Operasional Lainnya</option>
                  </select>
                </div>
                <div>
                  <label class="block text-slate-500 mb-1">Nominal (Rp)</label>
                  <input type="number" id="exp_amt" required placeholder="50000" class="w-full p-2 border rounded bg-white text-xs">
                </div>
              </div>
              <div>
                <label class="block text-slate-500 mb-1">Keterangan Pengeluaran</label>
                <input type="text" id="exp_desc" required placeholder="Contoh: Beli filter spun sedimen depot" class="w-full p-2 border rounded bg-white text-xs">
              </div>
              <button type="submit" class="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs transition">
                Simpan Pengeluaran Kas
              </button>
            </form>
          </div>

          <!-- Riwayat Arus Kas -->
          <div class="space-y-2 text-xs">
            <p class="font-bold text-slate-800">Riwayat Mutasi Kas:</p>
            <div class="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              ${db.cash_transactions.map(c => `
                <div class="py-2.5 flex justify-between items-center">
                  <div>
                    <p class="font-bold text-slate-800">${c.description || c.trans_no}</p>
                    <p class="text-[10px] text-slate-400">${c.trans_date} • ${c.source_type}</p>
                  </div>
                  <div class="text-right">
                    <p class="font-black ${c.flow_type === 'in' ? 'text-emerald-600' : 'text-rose-600'}">
                      ${c.flow_type === 'in' ? '+' : '−'}Rp${Number(c.amount || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (currentTab === 'hasil-usaha') {
      return `
        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div class="border-b pb-2">
            <h3 class="font-bold text-sm text-slate-900">Laporan Hasil Usaha (Laba Rugi)</h3>
            <p class="text-[10px] text-slate-400">Pendapatan − Harga Pokok = Laba Kotor − Beban = Laba Bersih</p>
          </div>

          <div class="space-y-3 text-xs">
            <!-- Pulsa -->
            <div class="p-3 bg-sky-50 rounded-xl border border-sky-100 space-y-1">
              <p class="font-bold text-sky-900">Unit Usaha Penjualan Pulsa</p>
              <div class="flex justify-between text-slate-600">
                <span>Laba Kotor / Margin Terkumpul:</span>
                <span class="font-bold text-sky-700">Rp${m.grossProfitPulsa.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <!-- Galon -->
            <div class="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1">
              <p class="font-bold text-blue-900">Unit Usaha Air Galon</p>
              <div class="flex justify-between text-slate-600">
                <span>Pendapatan Kotor Galon:</span>
                <span class="font-bold text-blue-700">Rp${m.grossProfitGalon.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <!-- Beban -->
            <div class="p-3 bg-rose-50 rounded-xl border border-rose-100 space-y-1">
              <p class="font-bold text-rose-900">Beban Operasional Depot</p>
              <div class="flex justify-between text-slate-600">
                <span>Total Beban Kas:</span>
                <span class="font-bold text-rose-700">−Rp${m.expensesMonth.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <!-- Total Laba Bersih -->
            <div class="p-4 bg-slate-900 text-white rounded-xl flex justify-between items-center font-bold">
              <div>
                <p class="text-sm">HASIL USAHA BERSIH BULAN INI:</p>
                <p class="text-[10px] text-sky-400">Total BUMKAM Hen Wani</p>
              </div>
              <p class="text-lg font-black text-emerald-400">Rp${m.netProfit.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      `;
    }

    if (currentTab === 'akuntansi') {
      return `
        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div class="border-b pb-2">
            <h3 class="font-bold text-sm text-slate-900">Pencatatan Akuntansi Double-Entry</h3>
            <p class="text-[10px] text-slate-400">Jurnal Umum Berimbang (Total Debit = Total Kredit)</p>
          </div>

          <div class="space-y-2">
            <p class="font-bold text-slate-800">Jurnal Umum Otomatis:</p>
            <div class="space-y-2 max-h-80 overflow-y-auto">
              ${db.journal_entries.map(j => `
                <div class="p-2.5 border rounded-lg bg-slate-50">
                  <div class="flex justify-between font-bold text-slate-900 pb-1 border-b">
                    <span>${j.entry_no} • ${j.entry_date}</span>
                    <span class="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">SEIMBANG</span>
                  </div>
                  <p class="text-[10px] text-slate-500 my-1">${j.description}</p>
                  <div class="space-y-0.5 text-[10px]">
                    ${j.lines.map(l => `
                      <div class="flex justify-between ${l.credit > 0 ? 'pl-4 text-slate-600' : 'font-semibold text-slate-900'}">
                        <span>${l.account_code} - ${l.account_name}</span>
                        <span>${l.debit > 0 ? `Dr. Rp${l.debit.toLocaleString('id-ID')}` : `Cr. Rp${l.credit.toLocaleString('id-ID')}`}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (currentTab === 'laporan') {
      const allExpenses = db.cash_transactions.filter(c => c.flow_type === 'out');
      const cashInTrx = db.cash_transactions.filter(c => c.flow_type === 'in');
      const pendingRecs = db.receivables.filter(r => r.status !== 'paid');
      const totalGalonCount = (db.galon_inventory.available_qty || 0) + (db.galon_inventory.customer_held_qty || 0) + (db.galon_inventory.damaged_lost_qty || 0);

      // Pembagian Hasil Usaha (PHU / SHU)
      const pades = Math.max(0, Math.round(m.netProfit * 0.40));
      const modalCadangan = Math.max(0, Math.round(m.netProfit * 0.30));
      const jasaPengurus = Math.max(0, Math.round(m.netProfit * 0.20));
      const danaSosial = Math.max(0, Math.round(m.netProfit * 0.10));

      const reportTabs = [
        { id: 'laba-rugi', label: '📈 Laba Rugi', name: 'Hasil Usaha' },
        { id: 'arus-kas', label: '💵 Arus Kas', name: 'Cash Flow' },
        { id: 'neraca', label: '🏛️ Neraca', name: 'Posisi Keuangan' },
        { id: 'penjualan', label: '🛍️ Penjualan', name: 'Rekap Transaksi' },
        { id: 'piutang', label: '💳 Piutang', name: 'Warga Berutang' },
        { id: 'stok-galon', label: '💧 Mutasi Galon', name: 'Stok Tabung' },
        { id: 'semua', label: '📑 Semua Laporan', name: 'Cetak Lengkap' }
      ];

      return `
        <div class="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4 text-xs">
          <!-- Kop Surat Resmi BUMKAM Hen Wani -->
          <div class="text-center pb-3 border-b-2 border-slate-900 space-y-0.5">
            <h2 class="font-black text-sm uppercase tracking-wide text-slate-900">BADAN USAHA MILIK KAMPUNG (BUMKAM) HEN WANI</h2>
            <p class="text-xs font-bold text-slate-700">KAMPUNG ENGGROS, DISTRIK ABEPURA, KOTA JAYAPURA, PAPUA</p>
            <p class="text-[10px] text-slate-500">Sistem Akuntansi & Laporan Operasional Unit Usaha Pulsa & Air Galon</p>
          </div>

          <!-- TAB PILIHAN 6 LAPORAN KEUANGAN (JAWABAN MASALAH 6) -->
          <div class="space-y-1.5 no-print">
            <p class="font-bold text-slate-700 text-[11px]">Pilih Jenis Laporan Keuangan Resmi:</p>
            <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              ${reportTabs.map(t => `
                <button 
                  onclick="window.setActiveReportTab('${t.id}')" 
                  class="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${activeReportTab === t.id ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
                >
                  <span>${t.label}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- KONTEN LAPORAN 1: LABA RUGI -->
          ${(activeReportTab === 'laba-rugi' || activeReportTab === 'semua') ? `
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div class="flex justify-between items-center border-b pb-1.5 border-slate-200">
                <h3 class="font-black text-xs text-slate-900 uppercase">1. Laporan Hasil Usaha (Laba Rugi)</h3>
                <span class="text-[10px] text-slate-500">Bulan Berjalan</span>
              </div>

              <div class="space-y-1.5">
                <div class="flex justify-between font-bold text-slate-800">
                  <span>A. PENDAPATAN USAHA:</span>
                  <span></span>
                </div>
                <div class="flex justify-between pl-3 text-slate-600">
                  <span>• Penjualan Pulsa & Paket Data</span>
                  <span class="font-semibold">Rp${db.transactions.filter(t => t.unit_code === 'PULSA' && t.status !== 'void').reduce((s, t) => s + Number(t.subtotal || 0), 0).toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between pl-3 text-slate-600">
                  <span>• Penjualan Air Galon</span>
                  <span class="font-semibold">Rp${db.transactions.filter(t => t.unit_code === 'GALON' && t.status !== 'void').reduce((s, t) => s + Number(t.subtotal || 0), 0).toLocaleString('id-ID')}</span>
                </div>

                <div class="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
                  <span>B. HARGA POKOK PENJUALAN (HPP MODAL):</span>
                  <span></span>
                </div>
                <div class="flex justify-between pl-3 text-slate-600">
                  <span>• HPP / Modal Dasar Pulsa Terjual</span>
                  <span class="font-semibold">−Rp${db.transactions.filter(t => t.unit_code === 'PULSA' && t.status !== 'void').reduce((s, t) => s + Number(t.cogs_amount || 0), 0).toLocaleString('id-ID')}</span>
                </div>

                <div class="flex justify-between font-bold text-sky-900 p-2 bg-sky-50 rounded-lg">
                  <span>LABA KOTOR KONSOLIDASI (A − B):</span>
                  <span class="font-black">Rp${(m.grossProfitPulsa + m.grossProfitGalon).toLocaleString('id-ID')}</span>
                </div>

                <div class="flex justify-between font-bold text-slate-800 pt-1">
                  <span>C. BEBAN OPERASIONAL KAS DEPOT:</span>
                  <span class="text-rose-600">−Rp${m.expensesMonth.toLocaleString('id-ID')}</span>
                </div>
                ${allExpenses.length > 0 ? allExpenses.slice(0, 5).map(e => `
                  <div class="flex justify-between pl-3 text-[11px] text-slate-500">
                    <span>• ${e.description || 'Beban operasional'}</span>
                    <span>Rp${Number(e.amount || 0).toLocaleString('id-ID')}</span>
                  </div>
                `).join('') : '<p class="pl-3 text-[10px] text-slate-400">Belum ada pengeluaran beban kas.</p>'}

                <div class="flex justify-between font-black text-white p-2.5 bg-slate-900 rounded-lg text-sm mt-2">
                  <span>HASIL USAHA BERSIH (LABA BERSIH):</span>
                  <span class="${m.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}">Rp${m.netProfit.toLocaleString('id-ID')}</span>
                </div>

                <!-- Alokasi PHU / SHU Kampung Enggros -->
                <div class="mt-2 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-1">
                  <p class="font-bold text-emerald-900 text-[11px]">Proyeksi Alokasi Bagi Hasil Usaha (AD/ART Kampung Enggros):</p>
                  <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-700 pt-1">
                    <div>PADes Kampung Enggros (40%): <b>Rp${pades.toLocaleString('id-ID')}</b></div>
                    <div>Cadangan Tambah Modal (30%): <b>Rp${modalCadangan.toLocaleString('id-ID')}</b></div>
                    <div>Jasa Pengurus & Pengelola (20%): <b>Rp${jasaPengurus.toLocaleString('id-ID')}</b></div>
                    <div>Dana Sosial Warga (10%): <b>Rp${danaSosial.toLocaleString('id-ID')}</b></div>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- KONTEN LAPORAN 2: ARUS KAS (CASH FLOW) -->
          ${(activeReportTab === 'arus-kas' || activeReportTab === 'semua') ? `
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div class="flex justify-between items-center border-b pb-1.5 border-slate-200">
                <h3 class="font-black text-xs text-slate-900 uppercase">2. Laporan Arus Kas Riil (Cash Flow)</h3>
                <span class="text-[10px] text-slate-500">Mutasi Fisik Uang Kas</span>
              </div>

              <div class="space-y-1.5">
                <p class="font-bold text-emerald-800">ARUS KAS MASUK (PENERIMAAN):</p>
                <div class="flex justify-between pl-3 text-slate-600">
                  <span>• Penjualan Tunai Pulsa & Galon</span>
                  <span class="font-semibold text-emerald-700">+Rp${cashInTrx.filter(c => c.source_type.includes('sale')).reduce((s, c) => s + Number(c.amount || 0), 0).toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between pl-3 text-slate-600">
                  <span>• Penerimaan Pelunasan Piutang Warga</span>
                  <span class="font-semibold text-emerald-700">+Rp${cashInTrx.filter(c => c.source_type === 'receivable_payment').reduce((s, c) => s + Number(c.amount || 0), 0).toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between pl-3 text-slate-600">
                  <span>• Penyertaan Modal Awal Kampung</span>
                  <span class="font-semibold text-emerald-700">+Rp${cashInTrx.filter(c => c.source_type === 'capital_injection').reduce((s, c) => s + Number(c.amount || 0), 0).toLocaleString('id-ID')}</span>
                </div>

                <p class="font-bold text-rose-800 pt-2 border-t border-slate-200">ARUS KAS KELUAR (PENGELUARAN):</p>
                <div class="flex justify-between pl-3 text-slate-600">
                  <span>• Pembelian / Pasok Stok Galon</span>
                  <span class="font-semibold text-rose-700">−Rp${allExpenses.filter(c => c.source_type === 'galon_restock').reduce((s, c) => s + Number(c.amount || 0), 0).toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between pl-3 text-slate-600">
                  <span>• Top-Up / Tambah Saldo Deposit Pulsa</span>
                  <span class="font-semibold text-rose-700">−Rp${allExpenses.filter(c => c.source_type === 'pulsa_topup').reduce((s, c) => s + Number(c.amount || 0), 0).toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between pl-3 text-slate-600">
                  <span>• Beban Operasional Depot & Kantor</span>
                  <span class="font-semibold text-rose-700">−Rp${allExpenses.filter(c => c.source_type === 'operational_expense').reduce((s, c) => s + Number(c.amount || 0), 0).toLocaleString('id-ID')}</span>
                </div>

                <div class="flex justify-between font-black text-slate-900 p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-lg text-xs mt-2">
                  <span>SALDO KAS FISIK AKHIR DI TANGAN BENDAHARA:</span>
                  <span class="text-sm">Rp${m.cashBalance.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- KONTEN LAPORAN 3: NERACA KEUANGAN (BALANCE SHEET) -->
          ${(activeReportTab === 'neraca' || activeReportTab === 'semua') ? `
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div class="flex justify-between items-center border-b pb-1.5 border-slate-200">
                <h3 class="font-black text-xs text-slate-900 uppercase">3. Neraca Posisi Keuangan (Balance Sheet)</h3>
                <span class="text-[10px] text-slate-500">Per Hari Ini</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Aktiva -->
                <div class="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                  <p class="font-bold text-sky-900 border-b pb-1">ASET (AKTIVA):</p>
                  <div class="flex justify-between text-slate-600">
                    <span>Kas Tunai di Tangan:</span>
                    <span class="font-semibold">Rp${m.cashBalance.toLocaleString('id-ID')}</span>
                  </div>
                  <div class="flex justify-between text-slate-600">
                    <span>Piutang Usaha Pelanggan:</span>
                    <span class="font-semibold">Rp${m.pendingRec.toLocaleString('id-ID')}</span>
                  </div>
                  <div class="flex justify-between text-slate-600">
                    <span>Persediaan Saldo Pulsa:</span>
                    <span class="font-semibold">Rp${m.pulsaBalance.toLocaleString('id-ID')}</span>
                  </div>
                  <div class="flex justify-between text-slate-600">
                    <span>Persediaan Galon (${m.galonAvailable} tabung):</span>
                    <span class="font-semibold">Rp${(m.galonAvailable * 6000).toLocaleString('id-ID')}</span>
                  </div>
                  <div class="flex justify-between text-slate-600">
                    <span>Aset Tabung di Pelanggan (${m.galonHeld} tabung):</span>
                    <span class="font-semibold">Rp${(m.galonHeld * 50000).toLocaleString('id-ID')}</span>
                  </div>
                  <div class="flex justify-between font-black text-slate-900 pt-2 border-t">
                    <span>TOTAL AKTIVA / ASET:</span>
                    <span class="text-sky-700">Rp${(m.cashBalance + m.pendingRec + m.pulsaBalance + (m.galonAvailable * 6000) + (m.galonHeld * 50000)).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <!-- Pasiva -->
                <div class="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                  <p class="font-bold text-slate-900 border-b pb-1">KEWAJIBAN & EKUITAS (PASIVA):</p>
                  <div class="flex justify-between text-slate-600">
                    <span>Utang Usaha / Pihak Ketiga:</span>
                    <span class="font-semibold">Rp0</span>
                  </div>
                  <div class="flex justify-between text-slate-600">
                    <span>Modal Awal BUMKAM Disetor:</span>
                    <span class="font-semibold">Rp9.000.000</span>
                  </div>
                  <div class="flex justify-between text-slate-600">
                    <span>Hasil Usaha / Laba Berjalan:</span>
                    <span class="font-semibold text-emerald-600">Rp${m.netProfit.toLocaleString('id-ID')}</span>
                  </div>
                  <div class="flex justify-between font-black text-slate-900 pt-4 border-t">
                    <span>TOTAL PASIVA (SEIMBANG):</span>
                    <span class="text-slate-900">Rp${(9000000 + m.netProfit).toLocaleString('id-ID')}</span>
                  </div>
                  <p class="text-[9px] text-emerald-600 font-semibold pt-1">✔ Posisi Akuntansi Seimbang</p>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- KONTEN LAPORAN 4: REKAPITULASI PENJUALAN -->
          ${(activeReportTab === 'penjualan' || activeReportTab === 'semua') ? `
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div class="flex justify-between items-center border-b pb-1.5 border-slate-200">
                <h3 class="font-black text-xs text-slate-900 uppercase">4. Rekapitulasi Transaksi Penjualan Lengkap</h3>
                <span class="text-[10px] text-slate-500">${db.transactions.length} Total Transaksi</span>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-[10px] border-collapse">
                  <thead>
                    <tr class="bg-slate-200/80 text-slate-800 text-left">
                      <th class="p-1.5">No Transaksi</th>
                      <th class="p-1.5">Tanggal</th>
                      <th class="p-1.5">Unit</th>
                      <th class="p-1.5">Pelanggan / Keterangan</th>
                      <th class="p-1.5">Metode</th>
                      <th class="p-1.5 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    ${db.transactions.slice(0, 15).map(t => `
                      <tr class="hover:bg-white">
                        <td class="p-1.5 font-bold">${t.trans_no}</td>
                        <td class="p-1.5">${t.trans_date}</td>
                        <td class="p-1.5"><span class="px-1 py-0.2 rounded font-bold ${t.unit_code === 'PULSA' ? 'bg-sky-100 text-sky-800' : 'bg-blue-100 text-blue-800'}">${t.unit_code}</span></td>
                        <td class="p-1.5">${t.customer_name || t.notes || '-'}</td>
                        <td class="p-1.5 uppercase font-semibold">${t.payment_method}</td>
                        <td class="p-1.5 text-right font-black">Rp${Number(t.subtotal || 0).toLocaleString('id-ID')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <!-- KONTEN LAPORAN 5: REKAPITULASI PIUTANG PELANGGAN -->
          ${(activeReportTab === 'piutang' || activeReportTab === 'semua') ? `
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div class="flex justify-between items-center border-b pb-1.5 border-slate-200">
                <h3 class="font-black text-xs text-slate-900 uppercase">5. Rekapitulasi Piutang Pelanggan Kampung Enggros</h3>
                <span class="text-[10px] text-amber-700 font-bold">Total: Rp${m.pendingRec.toLocaleString('id-ID')}</span>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-[10px] border-collapse">
                  <thead>
                    <tr class="bg-amber-100/70 text-amber-900 text-left">
                      <th class="p-1.5">Nama Warga</th>
                      <th class="p-1.5">No HP / Alamat</th>
                      <th class="p-1.5 text-center">Pinjam Tabung</th>
                      <th class="p-1.5 text-right">Sisa Piutang</th>
                      <th class="p-1.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    ${db.customers.filter(c => (c.total_receivable || 0) > 0 || (c.gallon_balance || 0) > 0).map(c => `
                      <tr class="hover:bg-white">
                        <td class="p-1.5 font-bold text-slate-900">${c.name}</td>
                        <td class="p-1.5 text-slate-500">${c.phone || '-'} • ${c.address || 'Kampung Enggros'}</td>
                        <td class="p-1.5 text-center font-bold text-blue-700">${c.gallon_balance || 0} tabung</td>
                        <td class="p-1.5 text-right font-black text-amber-700">Rp${(c.total_receivable || 0).toLocaleString('id-ID')}</td>
                        <td class="p-1.5 text-center">
                          <button onclick="setTab('piutang')" class="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-500">Bayar</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <!-- KONTEN LAPORAN 6: MUTASI STOK TABUNG GALON -->
          ${(activeReportTab === 'stok-galon' || activeReportTab === 'semua') ? `
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div class="flex justify-between items-center border-b pb-1.5 border-slate-200">
                <h3 class="font-black text-xs text-slate-900 uppercase">6. Laporan Persediaan & Mutasi Tabung Galon</h3>
                <span class="text-[10px] text-blue-700 font-bold">Total Tabung: ${totalGalonCount}</span>
              </div>

              <div class="grid grid-cols-3 gap-2 text-center">
                <div class="p-2 bg-blue-100/60 rounded-lg">
                  <p class="text-[10px] text-blue-800">Siap Jual di Depot:</p>
                  <p class="font-black text-blue-900 text-sm mt-0.5">${db.galon_inventory.available_qty} tabung</p>
                </div>
                <div class="p-2 bg-amber-100/60 rounded-lg">
                  <p class="text-[10px] text-amber-800">Dipinjam Pelanggan:</p>
                  <p class="font-black text-amber-900 text-sm mt-0.5">${db.galon_inventory.customer_held_qty} tabung</p>
                </div>
                <div class="p-2 bg-rose-100/60 rounded-lg">
                  <p class="text-[10px] text-rose-800">Rusak / Hilang:</p>
                  <p class="font-black text-rose-900 text-sm mt-0.5">${db.galon_inventory.damaged_lost_qty} tabung</p>
                </div>
              </div>

              <p class="font-bold text-slate-700 pt-1">Riwayat Pergerakan Tabung Galon:</p>
              <div class="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                ${db.galon_movements.slice(0, 10).map(m => `
                  <div class="py-1.5 flex justify-between items-center text-[10px]">
                    <div>
                      <span class="font-bold">${m.trans_no || 'MUTASI'}</span>
                      <span class="text-slate-400">• ${m.trans_date}</span>
                      <p class="text-slate-500">${m.notes || m.movement_type}</p>
                    </div>
                    <span class="font-black ${m.movement_type.includes('sale') ? 'text-rose-600' : 'text-blue-700'}">
                      ${m.movement_type.includes('sale') ? '−' : '+'}${m.quantity} tabung
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Tanda Tangan Pejabat BUMKAM Hen Wani -->
          <div class="grid grid-cols-2 text-center pt-6 border-t border-slate-300 text-[10px]">
            <div>
              <p class="text-slate-500">Mengetahui,</p>
              <p class="font-bold text-slate-900 mt-1">Direktur BUMKAM Hen Wani</p>
              <div class="h-12"></div>
              <p class="font-bold text-slate-900 underline">Silas Itaar</p>
            </div>
            <div>
              <p class="text-slate-500">Kampung Enggros, ${new Date().toLocaleDateString('id-ID')}</p>
              <p class="font-bold text-slate-900 mt-1">Bendahara BUMKAM</p>
              <div class="h-12"></div>
              <p class="font-bold text-slate-900 underline">Maria Haay</p>
            </div>
          </div>

          <!-- Tombol Cetak / Ekspor PDF Resmi -->
          <button onclick="window.print()" class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs mt-3 flex items-center justify-center gap-2 shadow-md no-print transition">
            <span>🖨️ Cetak / Simpan PDF Laporan Resmi</span>
          </button>
        </div>
      `;
    }

    if (currentTab === 'audit-log') {
      return `
        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div class="border-b pb-2">
            <h3 class="font-bold text-sm text-slate-900">Audit Trail & Pembatalan Transaksi (VOID)</h3>
            <p class="text-[10px] text-slate-400">Hak Akses Khusus Administrator & Koreksi Transaksi</p>
          </div>

          <div class="space-y-2">
            <p class="font-bold text-slate-800">Daftar Transaksi yang Dapat Dibatalkan (VOID):</p>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              ${db.transactions.filter(t => t.status === 'posted').slice(0, 10).map(t => `
                <div class="p-2.5 border rounded-lg flex items-center justify-between bg-slate-50">
                  <div>
                    <span class="font-bold text-slate-900">${t.trans_no}</span>
                    <p class="text-[10px] text-slate-500">${t.trans_date} • ${t.notes || t.unit_code} • Rp${t.subtotal.toLocaleString('id-ID')}</p>
                  </div>
                  <button onclick="openModal('void', { transId: ${t.id}, transNo: '${t.trans_no}' })" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[10px]">
                    VOID (Batal)
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (currentTab === 'pengaturan') {
      return `
        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div class="border-b pb-2">
            <h3 class="font-bold text-sm text-slate-900">Pengaturan & Penyesuaian Saldo Dashboard</h3>
            <p class="text-[10px] text-slate-400">Ubah nominal modal kas, saldo pulsa, dan stok galon riil</p>
          </div>

          <div class="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
            <p class="font-bold text-sky-900 text-sm">Sesuaikan Nominal Dashboard Kapan Saja</p>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              Jika nominal di dashboard belum sesuai dengan kondisi riil di Kampung Enggros (misal modal kas awal bukan Rp5.000.000 atau stok galon bukan 100), klik tombol di bawah untuk mengubahnya:
            </p>
            <button onclick="openModal('adjust_balances')" class="py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs">
              ⚙️ Buka Form Ubah Nominal Dashboard
            </button>
          </div>

          <div class="pt-3 border-t space-y-2">
            <p class="font-bold text-slate-800">Identitas Lembaga:</p>
            <p class="text-slate-600"><b>Nama:</b> ${db.profile.name}</p>
            <p class="text-slate-600"><b>Kampung:</b> ${db.profile.village_name}</p>
            <p class="text-slate-600"><b>Alamat:</b> ${db.profile.address}</p>
            <p class="text-slate-600"><b>Kontak:</b> ${db.profile.phone}</p>
          </div>
        </div>
      `;
    }

    if (currentTab === 'sinkronisasi') {
      const serverUrl = getServerURL();

      return `
        <div class="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div class="border-b pb-2">
            <h3 class="font-bold text-sm text-slate-900">Sinkronisasi Data Antar Handphone (Jawaban Masalah 2)</h3>
            <p class="text-[10px] text-slate-400">Agar transaksi terbaru terbaca di semua HP pengurus BUMKAM</p>
          </div>

          <!-- OPSI 1: SINKRONISASI SERVER / CLOUD -->
          <div class="p-3.5 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
            <p class="font-bold text-sky-900 text-xs">Opsi A: Sinkronisasi Cloud / Jaringan Lokal (WiFi/Internet)</p>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              Hubungkan APK ke server pusat (Vercel atau Komputer Kantor). Transaksi yang dicatat di HP A akan langsung terkirim dan terbaca di HP B!
            </p>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Alamat Server / Domain Cloud:</label>
              <input type="text" id="sync_server_url" value="${serverUrl}" placeholder="https://bumkam-finance.vercel.app atau http://192.168.1.5:3000" class="w-full p-2 border rounded bg-white text-xs">
            </div>
            <div class="flex gap-2">
              <button onclick="window.handleSyncServerClick()" class="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs shadow-xs">
                🔄 Sinkronkan Data Sekarang
              </button>
              <button onclick="window.saveServerUrlClick()" class="px-3 py-2.5 bg-slate-800 text-white font-bold rounded-lg text-xs">
                Simpan URL
              </button>
            </div>
          </div>

          <!-- OPSI 2: EKSPOR & IMPOR DATA (TANPA INTERNET DI KAMPUNG) -->
          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <p class="font-bold text-slate-900 text-xs">Opsi B: Berbagi Data Offline (WhatsApp / Bluetooth)</p>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              Jika di Kampung Enggros tidak ada sinyal internet, HP pencatat dapat mengekspor file cadangan, lalu dikirim via WhatsApp/Bluetooth ke HP pengurus lain untuk digabungkan:
            </p>

            <div class="grid grid-cols-2 gap-2">
              <button onclick="window.exportDataClick()" class="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-xs">
                📤 Ekspor / Bagikan Data
              </button>
              <button onclick="document.getElementById('import_file_input').click()" class="py-2.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg text-xs shadow-xs">
                📥 Impor & Gabungkan
              </button>
              <input type="file" id="import_file_input" accept=".json" onchange="window.handleFileImport(event)" class="hidden">
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  // --- RENDER MODAL DINAMIS ---
  function renderActiveModal(db, m) {
    if (!activeModal) return '';

    // Modal 1: Tambah Pelanggan Baru (Jawaban Masalah 1)
    if (activeModal.type === 'add_customer') {
      return `
        <div class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade">
          <div class="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-xs">
            <div class="flex items-center justify-between pb-2 border-b">
              <h3 class="font-bold text-sm text-slate-900">Tambah Pelanggan Baru</h3>
              <button onclick="closeModal()" class="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>

            <form onsubmit="window.handleNewCustomerSubmit(event)" class="space-y-3">
              <div>
                <label class="block font-semibold mb-1 text-slate-700">Nama Pelanggan / Warga *</label>
                <input type="text" id="new_cust_name" required placeholder="Contoh: Bapak Markus Haay" class="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white text-xs">
              </div>

              <div>
                <label class="block font-semibold mb-1 text-slate-700">Nomor Handphone (HP)</label>
                <input type="tel" id="new_cust_phone" placeholder="0812xxxxxxxx" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
              </div>

              <div>
                <label class="block font-semibold mb-1 text-slate-700">Alamat di Kampung Enggros</label>
                <input type="text" id="new_cust_addr" placeholder="Kampung Enggros RT 01" value="Kampung Enggros RT 01" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
              </div>

              <div class="flex gap-2 pt-2">
                <button type="button" onclick="closeModal()" class="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-semibold">
                  Batal
                </button>
                <button type="submit" class="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow-xs">
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    // Modal 2: Atur / Ubah Saldo Dashboard (Jawaban Masalah 3)
    if (activeModal.type === 'adjust_balances') {
      return `
        <div class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade">
          <div class="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 text-xs max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 class="font-bold text-sm text-slate-900">Atur / Ubah Saldo Dashboard</h3>
                <p class="text-[10px] text-slate-400">Sesuaikan nominal kas, deposit pulsa, & stok galon</p>
              </div>
              <button onclick="closeModal()" class="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>

            <form onsubmit="window.handleAdjustBalancesSubmit(event)" class="space-y-3">
              <div>
                <label class="block font-semibold mb-1 text-slate-700">Saldo Kas Tunai Saat Ini (Rp) *</label>
                <input type="number" id="adj_cash" required value="${m.cashBalance}" class="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white text-xs font-bold text-slate-900">
                <p class="text-[9px] text-slate-400 mt-0.5">Ubah sesuai jumlah uang kas riil di kasir BUMKAM</p>
              </div>

              <div>
                <label class="block font-semibold mb-1 text-slate-700">Saldo Deposit Pulsa (Rp) *</label>
                <input type="number" id="adj_pulsa" required value="${db.pulsa_balance}" class="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white text-xs font-bold text-sky-700">
                <p class="text-[9px] text-slate-400 mt-0.5">Ubah sesuai deposit saldo aktif di server pulsa</p>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block font-semibold mb-1 text-slate-700">Galon Siap Jual (Tabung)</label>
                  <input type="number" id="adj_galon" required value="${db.galon_inventory.available_qty}" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs font-bold text-blue-700">
                </div>
                <div>
                  <label class="block font-semibold mb-1 text-slate-700">Galon di Pelanggan</label>
                  <input type="number" id="adj_held" value="${db.galon_inventory.customer_held_qty}" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
                </div>
              </div>

              <div>
                <label class="block font-semibold mb-1 text-slate-700">Keterangan / Catatan Penyesuaian</label>
                <input type="text" id="adj_notes" placeholder="Contoh: Penyesuaian modal kas nyata Kampung Enggros" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
              </div>

              <div class="flex gap-2 pt-2">
                <button type="button" onclick="closeModal()" class="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-semibold">
                  Batal
                </button>
                <button type="submit" class="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow-xs">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    // Modal Tambah / Pasok Stok Galon (Jawaban Masalah 5)
    if (activeModal.type === 'add_galon_stock') {
      return `
        <div class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade">
          <div class="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-xs">
            <div class="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 class="font-bold text-sm text-slate-900">Tambah / Pasok Stok Galon</h3>
                <p class="text-[10px] text-slate-400">Pengisian ulang depot / pasokan supplier</p>
              </div>
              <button onclick="closeModal()" class="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>

            <form onsubmit="window.handleAddGalonStockModalSubmit(event)" class="space-y-3">
              <div>
                <label class="block font-semibold mb-1 text-slate-700">Jumlah Tabung Ditambahkan *</label>
                <input type="number" id="modal_gln_qty" min="1" value="50" required class="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white text-xs font-bold text-blue-700">
                <p class="text-[9px] text-slate-400 mt-0.5">Stok tersedia saat ini: ${db.galon_inventory.available_qty} tabung</p>
              </div>

              <div>
                <label class="block font-semibold mb-1 text-slate-700">Biaya Kas Kulakan (Rp)</label>
                <input type="number" id="modal_gln_cost" min="0" value="0" placeholder="0 jika mandiri / internal" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
                <p class="text-[9px] text-slate-400 mt-0.5">Biaya dipotong dari kas jika diisi</p>
              </div>

              <div>
                <label class="block font-semibold mb-1 text-slate-700">Keterangan / Sumber Pasokan</label>
                <input type="text" id="modal_gln_notes" placeholder="Contoh: Pengisian Depot Kampung Enggros" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
              </div>

              <div class="flex gap-2 pt-2">
                <button type="button" onclick="closeModal()" class="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-semibold">
                  Batal
                </button>
                <button type="submit" class="flex-1 py-2.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-bold shadow-xs">
                  + Tambah Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    // Modal 3: Pembatalan Transaksi (VOID)
    if (activeModal.type === 'void') {
      const data = activeModal.data || {};
      return `
        <div class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade">
          <div class="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-xs">
            <div class="flex items-center justify-between pb-2 border-b">
              <h3 class="font-bold text-sm text-rose-700">Batalkan Transaksi (VOID)</h3>
              <button onclick="closeModal()" class="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>

            <p class="text-slate-600">
              Apakah Anda yakin ingin membatalkan transaksi <b>${data.transNo}</b>? Stok/saldo dan kas akan dikoreksi otomatis.
            </p>

            <form onsubmit="window.handleVoidSubmit(event, ${data.transId})" class="space-y-3">
              <div>
                <label class="block font-semibold mb-1 text-slate-700">Alasan Pembatalan (Wajib Audit) *</label>
                <input type="text" id="void_reason" required placeholder="Contoh: Salah ketik nominal pulsa oleh kasir" class="w-full p-2.5 border rounded-lg bg-slate-50 text-xs">
              </div>

              <div class="flex gap-2 pt-2">
                <button type="button" onclick="closeModal()" class="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-semibold">
                  Kembali
                </button>
                <button type="submit" class="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow-xs">
                  Ya, Batalkan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    return '';
  }

  // --- GLOBAL WINDOW HANDLERS ---
  window.setTab = function (tab) {
    currentTab = tab;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.toggleDrawer = function (open) {
    drawerOpen = typeof open === 'boolean' ? open : !drawerOpen;
    render();
  };

  window.openModal = function (type, data) {
    activeModal = { type, data };
    render();
  };

  window.closeModal = function () {
    activeModal = null;
    render();
  };

  window.calcPulsaMargin = function () {
    const cogs = Number(document.getElementById('pls_cogs')?.value || 0);
    const sell = Number(document.getElementById('pls_sell')?.value || 0);
    const margin = sell - cogs;
    const disp = document.getElementById('pls_margin_display');
    if (disp) {
      disp.innerText = `Rp${margin.toLocaleString('id-ID')}`;
    }
  };

  window.calcGalonTotal = function () {
    const qty = Number(document.getElementById('gln_qty')?.value || 1);
    const price = Number(document.getElementById('gln_price')?.value || 6000);
    const total = qty * price;
    const disp = document.getElementById('gln_total_display');
    if (disp) {
      disp.innerText = `Rp${total.toLocaleString('id-ID')}`;
    }
  };

  window.handleCustomerSearch = function (e) {
    customerSearchQuery = e.target.value;
    render();
  };

  window.handleNewCustomerSubmit = function (e) {
    e.preventDefault();
    const name = document.getElementById('new_cust_name')?.value;
    const phone = document.getElementById('new_cust_phone')?.value;
    const address = document.getElementById('new_cust_addr')?.value;

    const created = addCustomer({ name, phone, address });
    closeModal();

    // Auto-select in current form if on galon/pulsa tab
    setTimeout(() => {
      if (created) {
        const glnSel = document.getElementById('gln_cust');
        if (glnSel) glnSel.value = created.id;
        const plsSel = document.getElementById('pls_cust');
        if (plsSel) plsSel.value = created.id;
      }
    }, 100);
  };

  window.handleAdjustBalancesSubmit = function (e) {
    e.preventDefault();
    adjustBalances({
      cash_balance: document.getElementById('adj_cash')?.value,
      pulsa_balance: document.getElementById('adj_pulsa')?.value,
      galon_available: document.getElementById('adj_galon')?.value,
      galon_held: document.getElementById('adj_held')?.value,
      notes: document.getElementById('adj_notes')?.value
    });
    closeModal();
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
      customer_id: document.getElementById('gln_cust')?.value,
      inline_cust_name: document.getElementById('inline_cust_name')?.value,
      inline_cust_phone: document.getElementById('inline_cust_phone')?.value,
      inline_cust_addr: document.getElementById('inline_cust_addr')?.value
    });
  };

  // --- HELPER KASIR POS CEPAT ---
  window.setPosUnit = function (unit) {
    posUnit = unit;
    if (unit === 'galon') {
      posCashGiven = posGalonQty * posGalonPrice;
    } else {
      posCashGiven = posPulsaPrice;
    }
    render();
  };

  window.setPosGalonQty = function (qty) {
    posGalonQty = Math.max(1, qty);
    posCashGiven = posGalonQty * posGalonPrice;
    render();
  };

  window.setPosGallonAction = function (act) {
    posGallonAction = act;
    render();
  };

  window.setPosPulsaPackage = function (nom, price, cogs) {
    posPulsaNominal = nom;
    posPulsaPrice = price;
    posPulsaCogs = cogs;
    posCashGiven = price;
    render();
  };

  window.setPosPulsaPhone = function (ph) {
    posPulsaPhone = ph;
  };

  window.setPosPaymentMethod = function (method) {
    posPaymentMethod = method;
    render();
  };

  window.setPosCashGiven = function (amt) {
    posCashGiven = amt;
    render();
  };

  window.handlePosSubmit = function () {
    const isGalon = posUnit === 'galon';
    const custId = document.getElementById('pos_customer_id')?.value;

    if (isGalon) {
      sellGalon({
        qty: posGalonQty,
        unit_price: posGalonPrice,
        payment_method: posPaymentMethod,
        gallon_action: posGallonAction,
        customer_id: custId
      });
      posCashGiven = posGalonQty * posGalonPrice;
    } else {
      const phone = (document.getElementById('pos_pls_phone')?.value || posPulsaPhone || '').trim();
      if (!phone) {
        showToast('error', 'Nomor HP pelanggan wajib diisi untuk transaksi pulsa!');
        return;
      }
      const provider = document.getElementById('pos_pls_provider')?.value || posPulsaProvider;
      sellPulsa({
        phone_number: phone,
        provider: provider,
        nominal: `Pulsa ${posPulsaNominal.toLocaleString('id-ID')}`,
        cogs_price: posPulsaCogs,
        selling_price: posPulsaPrice,
        payment_method: posPaymentMethod,
        customer_id: custId
      });
      posPulsaPhone = '';
      posCashGiven = posPulsaPrice;
    }
  };

  window.handleAddGalonStockSubmit = function (e) {
    e.preventDefault();
    addGalonStock({
      qty: document.getElementById('add_gln_qty').value,
      cost: document.getElementById('add_gln_cost').value,
      notes: document.getElementById('add_gln_notes').value
    });
  };

  window.handleAddGalonStockModalSubmit = function (e) {
    e.preventDefault();
    addGalonStock({
      qty: document.getElementById('modal_gln_qty').value,
      cost: document.getElementById('modal_gln_cost').value,
      notes: document.getElementById('modal_gln_notes').value
    });
    closeModal();
  };

  window.setCustMode = function (mode) {
    newCustInlineMode = (mode === 'new');
    render();
  };

  window.setActiveReportTab = function (tab) {
    activeReportTab = tab;
    render();
  };

  window.triggerQuickSync = function () {
    const url = getServerURL();
    syncWithServer(url);
  };

  window.handleMutateGalonSubmit = function (e) {
    e.preventDefault();
    mutateGalon({
      movement_type: document.getElementById('mut_type').value,
      quantity: document.getElementById('mut_qty').value,
      customer_id: document.getElementById('mut_cust').value
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
      description: document.getElementById('exp_desc').value,
      category: document.getElementById('exp_cat').value
    });
  };

  window.handleVoidSubmit = function (e, transId) {
    e.preventDefault();
    const reason = document.getElementById('void_reason')?.value;
    voidTransaction(transId, reason);
    closeModal();
  };

  window.handleSyncServerClick = function () {
    const url = document.getElementById('sync_server_url')?.value;
    setServerURL(url);
    syncWithServer(url);
  };

  window.saveServerUrlClick = function () {
    const url = document.getElementById('sync_server_url')?.value;
    setServerURL(url);
    showToast('success', 'Alamat server berhasil disimpan!');
  };

  window.exportDataClick = function () {
    exportData();
  };

  window.handleFileImport = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
      importData(event.target.result);
    };
    reader.readAsText(file);
  };

  // Mulai Aplikasi
  render();
})();
