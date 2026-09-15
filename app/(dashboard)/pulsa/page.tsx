'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  PlusCircle,
  TrendingUp,
  History,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Wallet,
  Coins,
} from 'lucide-react';

export default function PulsaPage() {
  const [data, setData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jual' | 'tambah' | 'riwayat'>('jual');

  // Form Penjualan Pulsa
  const [sellForm, setSellForm] = useState({
    trans_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    phone_number: '',
    provider: 'Telkomsel',
    nominal: 50000,
    cogs_price: 48500,
    selling_price: 52000,
    payment_method: 'cash',
    notes: '',
  });

  // Form Tambah Saldo
  const [topupForm, setTopupForm] = useState({
    trans_date: new Date().toISOString().split('T')[0],
    nominal_saldo: 500000,
    cost_price: 500000,
    payment_method: 'cash',
    notes: '',
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Kalkulasi Margin Otomatis
  const calculatedMargin = Math.max(0, sellForm.selling_price - sellForm.cogs_price);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/pulsa').then((res) => res.json()),
      fetch('/api/customers').then((res) => res.json()),
    ])
      .then(([pulsaRes, custRes]) => {
        if (pulsaRes.success) setData(pulsaRes.data);
        if (custRes.success) setCustomers(custRes.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/pulsa/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sellForm),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setMessage({ type: 'error', text: result.message || 'Gagal memproses penjualan pulsa.' });
        setSubmitting(false);
        return;
      }

      setMessage({ type: 'success', text: result.message });
      // Reset form
      setSellForm((prev) => ({
        ...prev,
        phone_number: '',
        notes: '',
      }));
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/pulsa/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(topupForm),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setMessage({ type: 'error', text: result.message || 'Gagal menambah saldo deposit.' });
        setSubmitting(false);
        return;
      }

      setMessage({ type: 'success', text: result.message });
      fetchData();
      setActiveTab('riwayat');
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const currentBalance = data?.currentBalance || 0;
  const rekap = data?.rekap || { total_sales: 0, total_cogs: 0, total_margin: 0, total_count: 0 };
  const transactions = data?.transactions || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Smartphone className="w-7 h-7 text-sky-600" />
            <span>Unit Usaha Penjualan Pulsa</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola saldo modal deposit, penjualan pulsa, margin otomatis, dan riwayat transaksi.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Saldo & Rekap Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Saldo Pulsa */}
        <div className="bg-gradient-to-tr from-sky-600 to-blue-700 rounded-2xl p-5 text-white shadow-md shadow-sky-500/15">
          <div className="flex items-center justify-between opacity-80 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Saldo Deposit Modal Pulsa</span>
            <Wallet className="w-5 h-5" />
          </div>
          <h3 className="text-3xl font-black">
            Rp{currentBalance.toLocaleString('id-ID')}
          </h3>
          <p className="text-xs text-sky-100 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Siap digunakan untuk transaksi pelanggan
          </p>
        </div>

        {/* Card Penjualan Bulan Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Omset Penjualan Bulan Ini</span>
            <TrendingUp className="w-5 h-5 text-sky-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            Rp{rekap.total_sales.toLocaleString('id-ID')}
          </h3>
          <p className="text-xs text-slate-500 mt-2">
            Dari {rekap.total_count} transaksi pulsa berhasil
          </p>
        </div>

        {/* Card Keuntungan/Margin Bersih */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Laba / Margin Bulan Ini</span>
            <Coins className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-black text-emerald-600">
            Rp{rekap.total_margin.toLocaleString('id-ID')}
          </h3>
          <p className="text-xs text-slate-500 mt-2">
            Margin murni = Harga Jual − Harga Modal
          </p>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('jual')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'jual'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Form Penjualan Pulsa
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tambah')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'tambah'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tambah Saldo Deposit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'riwayat'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Riwayat & Rekap Transaksi
        </button>
      </div>

      {/* TAB 1: FORM PENJUALAN PULSA */}
      {activeTab === 'jual' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 text-lg">Catat Penjualan Pulsa Baru</h3>
            <p className="text-xs text-slate-500">
              Satu Kali Input: Saldo deposit langsung berkurang sebesar harga modal, kas atau piutang tercatat, jurnal otomatis terbentuk.
            </p>
          </div>

          <form onSubmit={handleSellSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={sellForm.trans_date}
                  onChange={(e) => setSellForm({ ...sellForm, trans_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Provider Operator</label>
                <select
                  value={sellForm.provider}
                  onChange={(e) => setSellForm({ ...sellForm, provider: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                >
                  <option value="Telkomsel">Telkomsel</option>
                  <option value="Indosat">Indosat</option>
                  <option value="XL Axiata">XL Axiata</option>
                  <option value="Smartfren">Smartfren</option>
                  <option value="Tri (3)">Tri (3)</option>
                  <option value="PLN Token">PLN Token Listrik</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor HP Pelanggan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 081234567890"
                  value={sellForm.phone_number}
                  onChange={(e) => setSellForm({ ...sellForm, phone_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Pulsa</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={1000}
                  value={sellForm.nominal}
                  onChange={(e) => setSellForm({ ...sellForm, nominal: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Harga Modal (Potong Saldo)
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={sellForm.cogs_price}
                  onChange={(e) => setSellForm({ ...sellForm, cogs_price: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">Modal beli dari distributor</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Harga Jual ke Pelanggan
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={sellForm.selling_price}
                  onChange={(e) => setSellForm({ ...sellForm, selling_price: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">Tarif yang ditagihkan</span>
              </div>
            </div>

            {/* Banner Perhitungan Margin Otomatis */}
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-sky-900">Perhitungan Keuntungan (Margin Otomatis):</p>
                <p className="text-xs text-sky-700 font-mono mt-0.5">
                  Rp{sellForm.selling_price.toLocaleString('id-ID')} (Jual) − Rp{sellForm.cogs_price.toLocaleString('id-ID')} (Modal)
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-sky-600 font-semibold uppercase tracking-wider block">Margin Keuntungan</span>
                <span className="text-xl font-black text-sky-700">
                  Rp{calculatedMargin.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
                <select
                  value={sellForm.payment_method}
                  onChange={(e) => setSellForm({ ...sellForm, payment_method: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                >
                  <option value="cash">Tunai (Langsung Tambah Kas)</option>
                  <option value="credit">Kredit / Tempo (Catat Sebagai Piutang Warga)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pelanggan {sellForm.payment_method === 'credit' ? '(Wajib Dipilih)' : '(Opsional)'}
                </label>
                <select
                  value={sellForm.customer_id}
                  onChange={(e) => setSellForm({ ...sellForm, customer_id: e.target.value })}
                  required={sellForm.payment_method === 'credit'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                >
                  <option value="">-- Pilih Pelanggan (Warga Kampung) --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) - {c.phone || 'No HP -'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Catatan Transaksi</label>
              <input
                type="text"
                placeholder="Catatan tambahan..."
                value={sellForm.notes}
                onChange={(e) => setSellForm({ ...sellForm, notes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || sellForm.cogs_price > currentBalance}
              className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-md shadow-sky-500/20 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Memproses Transaksi...</span>
              ) : sellForm.cogs_price > currentBalance ? (
                <span>Saldo Pulsa Tidak Cukup (Tersedia Rp{currentBalance.toLocaleString('id-ID')})</span>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Simpan & Terbitkan Penjualan Pulsa</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: FORM TAMBAH SALDO */}
      {activeTab === 'tambah' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs max-w-2xl">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 text-lg">Tambah Saldo Deposit Pulsa (Top-Up)</h3>
            <p className="text-xs text-slate-500">
              Menambah saldo pulsa yang tersedia dan otomatis mengurangi kas BUMKAM sebesar harga beli.
            </p>
          </div>

          <form onSubmit={handleTopupSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Top Up</label>
              <input
                type="date"
                required
                value={topupForm.trans_date}
                onChange={(e) => setTopupForm({ ...topupForm, trans_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Saldo Didapat</label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={10000}
                  value={topupForm.nominal_saldo}
                  onChange={(e) => setTopupForm({ ...topupForm, nominal_saldo: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Pembelian (Kas Keluar)</label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={10000}
                  value={topupForm.cost_price}
                  onChange={(e) => setTopupForm({ ...topupForm, cost_price: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Supplier</label>
              <input
                type="text"
                placeholder="Contoh: Beli deposit server pulsa Jayapura"
                value={topupForm.notes}
                onChange={(e) => setTopupForm({ ...topupForm, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Konfirmasi Tambah Saldo Pulsa</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: RIWAYAT TRANSAKSI */}
      {activeTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Riwayat Transaksi Pulsa</h3>
              <p className="text-xs text-slate-500">Histori penjualan pulsa dan pengadaan deposit</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {transactions.length} Catatan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">No Transaksi & Tanggal</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">Provider / No HP</th>
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4 text-right">Modal</th>
                  <th className="py-3 px-4 text-right">Jual</th>
                  <th className="py-3 px-4 text-right text-emerald-600 font-bold">Margin</th>
                  <th className="py-3 px-4 text-center">Bayar</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Belum ada transaksi pulsa tercatat.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{t.trans_no}</p>
                        <p className="text-[11px] text-slate-400">{t.trans_date}</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {t.trans_type === 'sale_pulsa' ? (
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold text-[10px]">
                            Penjualan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                            Top Up Saldo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{t.provider || '-'}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{t.phone_number || '-'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {t.customer_name || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                        Rp{t.cogs_amount?.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        Rp{t.subtotal?.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        {t.trans_type === 'sale_pulsa' ? `Rp${t.margin_amount?.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          t.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {t.payment_method === 'cash' ? 'Tunai' : 'Kredit'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          t.status === 'posted' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
