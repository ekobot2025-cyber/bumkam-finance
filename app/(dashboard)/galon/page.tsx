'use client';

import React, { useState, useEffect } from 'react';
import {
  Droplets,
  PlusCircle,
  RotateCcw,
  AlertTriangle,
  History,
  CheckCircle2,
  RefreshCw,
  Package,
  Users,
  ShieldAlert,
  ArrowDownLeft,
} from 'lucide-react';

export default function GalonPage() {
  const [data, setData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jual' | 'mutasi' | 'riwayat'>('jual');

  // Form Penjualan Galon
  const [sellForm, setSellForm] = useState({
    trans_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    qty: 1,
    unit_price: 6000,
    payment_method: 'cash',
    gallon_action: 'exchange', // 'exchange' (tukar galon), 'borrow' (bawa/pinjam tabung depot), 'refill_only'
    notes: '',
  });

  // Form Mutasi Galon
  const [movementForm, setMovementForm] = useState({
    movement_type: 'return_empty', // 'return_empty', 'in_refill', 'damaged_lost'
    customer_id: '',
    qty: 1,
    notes: '',
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Kalkulasi Total Otomatis: Jumlah * Harga
  const calculatedTotal = Math.max(0, sellForm.qty * sellForm.unit_price);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/galon').then((res) => res.json()),
      fetch('/api/customers').then((res) => res.json()),
    ])
      .then(([galonRes, custRes]) => {
        if (galonRes.success) setData(galonRes.data);
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
      const res = await fetch('/api/galon/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sellForm),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setMessage({ type: 'error', text: result.message || 'Gagal memproses penjualan galon.' });
        setSubmitting(false);
        return;
      }

      setMessage({ type: 'success', text: result.message });
      setSellForm((prev) => ({ ...prev, qty: 1, notes: '' }));
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/galon/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movementForm),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setMessage({ type: 'error', text: result.message || 'Gagal mencatat mutasi galon.' });
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

  const inventory = data?.inventory || { available_qty: 0, customer_held_qty: 0, damaged_lost_qty: 0 };
  const transactions = data?.transactions || [];
  const movements = data?.movements || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Droplets className="w-7 h-7 text-blue-600" />
            <span>Unit Depot Air Galon</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kontrol stok galon siap jual, wadah di pelanggan, mutasi pengembalian, dan pencatatan kas/piutang.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
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

      {/* 4 KARTU STATUS TABUNG GALON */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Galon Tersedia */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Galon Tersedia</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {inventory.available_qty} <span className="text-xs font-normal text-slate-500">tabung</span>
          </h3>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">Siap dijual di depot</p>
        </div>

        {/* 2. Galon di Pelanggan */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Di Pelanggan</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-blue-600">
            {inventory.customer_held_qty} <span className="text-xs font-normal text-slate-500">tabung</span>
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Sedang dipinjam warga</p>
        </div>

        {/* 3. Galon Rusak / Hilang */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rusak / Hilang</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-rose-600">
            {inventory.damaged_lost_qty} <span className="text-xs font-normal text-slate-500">tabung</span>
          </h3>
          <p className="text-[10px] text-rose-600 font-semibold mt-1">Aset tabung rusak</p>
        </div>

        {/* 4. Total Tabung BUMKAM */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between opacity-80 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tabung Fisik</span>
            <Droplets className="w-4 h-4 text-sky-400" />
          </div>
          <h3 className="text-2xl font-black">
            {inventory.available_qty + inventory.customer_held_qty + inventory.damaged_lost_qty}{' '}
            <span className="text-xs font-normal text-slate-400">tabung</span>
          </h3>
          <p className="text-[10px] text-sky-400 font-medium mt-1">Total aset wadah galon</p>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('jual')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'jual' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Form Penjualan Galon
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mutasi')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'mutasi' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Mutasi Tabung (Kembali / Rusak)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'riwayat' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Riwayat Penjualan & Mutasi
        </button>
      </div>

      {/* TAB 1: FORM PENJUALAN GALON */}
      {activeTab === 'jual' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 text-lg">Catat Penjualan Air Galon</h3>
            <p className="text-xs text-slate-500">
              Prinsip Satu Input: Jika TUNAI langsung menambah kas; Jika KREDIT otomatis menambah piutang tanpa menambah kas sepeser pun.
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pelanggan {sellForm.payment_method === 'credit' ? '(Wajib Dipilih)' : '(Opsional)'}
                </label>
                <select
                  value={sellForm.customer_id}
                  onChange={(e) => setSellForm({ ...sellForm, customer_id: e.target.value })}
                  required={sellForm.payment_method === 'credit'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">-- Pilih Pelanggan (Warga Kampung) --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) - Galon dipegang: {c.gallon_balance} tabung
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Wadah Tabung</label>
                <select
                  value={sellForm.gallon_action}
                  onChange={(e) => setSellForm({ ...sellForm, gallon_action: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="exchange">Tukar Galon (Pelanggan bawa galon kosong)</option>
                  <option value="borrow">Pinjam Tabung Depot (Galon dibawa/diantar)</option>
                  <option value="refill_only">Isi Ulang Sendiri (Tanpa tabung depot)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Tabung (Qty)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={sellForm.qty}
                  onChange={(e) => setSellForm({ ...sellForm, qty: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Satuan (Rp)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={500}
                  value={sellForm.unit_price}
                  onChange={(e) => setSellForm({ ...sellForm, unit_price: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
                <select
                  value={sellForm.payment_method}
                  onChange={(e) => setSellForm({ ...sellForm, payment_method: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold"
                >
                  <option value="cash">TUNAI (Langsung Tambah Kas)</option>
                  <option value="credit">KREDIT / TEMPO (Masuk Piutang, Kas Tetap Rp0)</option>
                </select>
              </div>
            </div>

            {/* Banner Total Otomatis */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-950">Total Tagihan (Otomatis: Qty × Harga):</p>
                <p className="text-xs text-blue-800 font-mono mt-0.5">
                  {sellForm.qty} tabung × Rp{sellForm.unit_price.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider block">Total Penjualan</span>
                <span className="text-2xl font-black text-blue-800">
                  Rp{calculatedTotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Tambahan</label>
              <input
                type="text"
                placeholder="Contoh: Diantar ke rumah RT 01"
                value={sellForm.notes}
                onChange={(e) => setSellForm({ ...sellForm, notes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || sellForm.qty > inventory.available_qty}
              className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Menyimpan Transaksi...</span>
              ) : sellForm.qty > inventory.available_qty ? (
                <span>Stok Galon Tidak Cukup (Tersedia: {inventory.available_qty} tabung)</span>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Simpan Transaksi Penjualan Galon</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: MUTASI TABUNG */}
      {activeTab === 'mutasi' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs max-w-2xl">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 text-lg">Catat Mutasi Tabung Galon</h3>
            <p className="text-xs text-slate-500">
              Gunakan untuk mencatat pengembalian galon kosong dari warga, mencatat tabung rusak/pecah, atau pasokan galon baru.
            </p>
          </div>

          <form onSubmit={handleMovementSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Mutasi Pergerakan</label>
              <select
                value={movementForm.movement_type}
                onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
              >
                <option value="return_empty">Galon Kembali (Warga menyerahkan kembali tabung kosong)</option>
                <option value="damaged_lost">Galon Rusak / Hilang (Tabung pecah atau hilang)</option>
                <option value="in_refill">Pasokan Galon Baru / Masuk (Pengadaan tabung depot)</option>
              </select>
            </div>

            {movementForm.movement_type === 'return_empty' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pelanggan yang Mengembalikan
                </label>
                <select
                  value={movementForm.customer_id}
                  onChange={(e) => setMovementForm({ ...movementForm, customer_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">-- Pilih Pelanggan --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Memegang: {c.gallon_balance} tabung)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Tabung</label>
              <input
                type="number"
                required
                min={1}
                value={movementForm.qty}
                onChange={(e) => setMovementForm({ ...movementForm, qty: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan</label>
              <input
                type="text"
                placeholder="Keterangan..."
                value={movementForm.notes}
                onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Simpan Mutasi Tabung</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: RIWAYAT TRANSAKSI & MUTASI */}
      {activeTab === 'riwayat' && (
        <div className="space-y-6">
          {/* Riwayat Penjualan */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Riwayat Penjualan Galon</h3>
                <p className="text-xs text-slate-500">Daftar transaksi penjualan air galon tunai dan kredit</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {transactions.length} Transaksi
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">No Transaksi & Tanggal</th>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4 text-center">Jumlah Galon</th>
                    <th className="py-3 px-4 text-right">Total Transaksi</th>
                    <th className="py-3 px-4 text-center">Metode Bayar</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Belum ada penjualan galon.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">{t.trans_no}</p>
                          <p className="text-[11px] text-slate-400">{t.trans_date}</p>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {t.customer_name || 'Pembeli Langsung (Umum)'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                          {t.qty || 1} tabung
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          Rp{t.subtotal?.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            t.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {t.payment_method === 'cash' ? 'Tunai (Kas +)' : 'Kredit (Piutang +)'}
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

          {/* Riwayat Mutasi Tabung */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Riwayat Pergerakan Tabung Galon</h3>
              <p className="text-xs text-slate-500">Catatan logistik tabung masuk, keluar, kembali, dan rusak</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Jenis Pergerakan</th>
                    <th className="py-3 px-4">Pelanggan / Pihak Terkait</th>
                    <th className="py-3 px-4 text-center">Jumlah</th>
                    <th className="py-3 px-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Belum ada catatan mutasi tabung.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {m.created_at}
                        </td>
                        <td className="py-3.5 px-4 font-semibold">
                          {m.movement_type === 'out_sale' && <span className="text-blue-600">Galon Keluar (Jual)</span>}
                          {m.movement_type === 'return_empty' && <span className="text-emerald-600">Galon Kembali (Kosong)</span>}
                          {m.movement_type === 'damaged_lost' && <span className="text-rose-600">Galon Rusak / Hilang</span>}
                          {m.movement_type === 'in_refill' && <span className="text-sky-600">Pasokan Masuk Depot</span>}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {m.customer_name || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                          {m.qty} tabung
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {m.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
