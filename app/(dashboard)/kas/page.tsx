'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Coins,
  ShieldCheck,
} from 'lucide-react';

export default function KasPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Form Beban Kas Keluar Manual
  const [expenseForm, setExpenseForm] = useState({
    trans_date: new Date().toISOString().split('T')[0],
    account_code: '6101', // 6101: Beban Listrik, 6103: Transportasi, 6104: Pemeliharaan, 6199: Lainnya
    amount: 50000,
    description: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCashData = () => {
    setLoading(true);
    fetch('/api/cash')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCashData();
  }, []);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/cash/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setMessage({ type: 'error', text: result.message || 'Gagal mencatat pengeluaran kas.' });
        setSubmitting(false);
        return;
      }

      setMessage({ type: 'success', text: result.message });
      setExpenseForm({
        trans_date: new Date().toISOString().split('T')[0],
        account_code: '6101',
        amount: 50000,
        description: '',
      });
      setShowExpenseModal(false);
      fetchCashData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const balance = data?.balance || 0;
  const totalIn = data?.totalIn || 0;
  const totalOut = data?.totalOut || 0;
  const transactions = data?.transactions || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-emerald-600" />
            <span>Buku Kas Operasional BUMKAM</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Arus kas masuk otomatis dari penjualan tunai & cicilan piutang; kas keluar dari top up pulsa & beban operasional.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCashData}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Catat Pengeluaran Operasional</span>
          </button>
        </div>
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

      {/* 3 Kartu Saldo Kas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Saldo Kas Riil */}
        <div className="bg-gradient-to-tr from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-md shadow-emerald-600/15">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-85">Saldo Kas Tunai Saat Ini</span>
          <h3 className="text-3xl font-black mt-2">
            Rp{balance.toLocaleString('id-ID')}
          </h3>
          <p className="text-xs text-emerald-100 mt-2">
            Kas fisik riil yang tersimpan di kasir/bendahara
          </p>
        </div>

        {/* Total Kas Masuk */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Kas Masuk</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600">
            Rp{totalIn.toLocaleString('id-ID')}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Penjualan tunai & pelunasan piutang</p>
        </div>

        {/* Total Kas Keluar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Kas Keluar</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-rose-600">
            Rp{totalOut.toLocaleString('id-ID')}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Top up saldo pulsa & beban depot</p>
        </div>
      </div>

      {/* Catatan Integrasi Kas */}
      <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-sky-900 text-xs flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
        <p>
          <b>Otomatisasi Penuh:</b> Anda tidak perlu menginput kas masuk secara manual untuk penjualan pulsa tunai, galon tunai, atau cicilan piutang. Seluruh kas masuk tersebut telah diposting otomatis dari formulir penjualan terkait sesuai prinsip <i>One Transaction — One Input</i>.
        </p>
      </div>

      {/* Tabel Riwayat Transaksi Kas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Buku Mutasi Kas (Cash Flow Log)</h3>
            <p className="text-xs text-slate-500">Histori seluruh uang keluar dan uang masuk secara kronologis</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {transactions.length} Entri
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">No Kas & Tanggal</th>
                <th className="py-3.5 px-4">Arus</th>
                <th className="py-3.5 px-4">Sumber / Keperluan</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 text-right">Nominal</th>
                <th className="py-3.5 px-4 text-center">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Belum ada riwayat kas tercatat.
                  </td>
                </tr>
              ) : (
                transactions.map((ct: any) => (
                  <tr key={ct.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{ct.trans_no}</p>
                      <p className="text-[11px] text-slate-400">{ct.trans_date}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        ct.flow_type === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {ct.flow_type === 'in' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {ct.flow_type === 'in' ? 'MASUK' : 'KELUAR'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {ct.source_type === 'sale_pulsa' && 'Penjualan Pulsa Tunai'}
                      {ct.source_type === 'sale_galon' && 'Penjualan Galon Tunai'}
                      {ct.source_type === 'receivable_payment' && 'Penerimaan Cicilan Piutang'}
                      {ct.source_type === 'topup_pulsa' && 'Pembelian Saldo Pulsa'}
                      {ct.source_type === 'expense_operational' && 'Beban Operasional'}
                      {ct.source_type === 'capital_injection' && 'Setoran Modal Awal'}
                      {ct.source_type === 'void_reversal' && 'Koreksi / Void'}
                      {!['sale_pulsa', 'sale_galon', 'receivable_payment', 'topup_pulsa', 'expense_operational', 'capital_injection', 'void_reversal'].includes(ct.source_type) && ct.source_type}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {ct.description}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-sm">
                      <span className={ct.flow_type === 'in' ? 'text-emerald-600' : 'text-rose-600'}>
                        {ct.flow_type === 'in' ? '+' : '−'}Rp{ct.amount?.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500 text-[11px]">
                      {ct.created_by_name || 'Admin'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CATAT PENGELUARAN KAS MANUAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Catat Beban Operasional Kas Keluar</h3>
            <p className="text-xs text-slate-500 mb-4">
              Pengeluaran ini akan memotong saldo kas tunai dan otomatis dicatat pada Laporan Laba Rugi BUMKAM.
            </p>

            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pengeluaran</label>
                <input
                  type="date"
                  required
                  value={expenseForm.trans_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, trans_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pos Akun Beban</label>
                <select
                  value={expenseForm.account_code}
                  onChange={(e) => setExpenseForm({ ...expenseForm, account_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white font-medium"
                >
                  <option value="6101">6101 - Beban Listrik & Daya Depot</option>
                  <option value="6102">6102 - Beban Kuota Internet & Pulsa Usaha</option>
                  <option value="6103">6103 - Beban Transportasi & Pengantaran Galon</option>
                  <option value="6104">6104 - Beban Pemeliharaan, Filter & Pembersihan</option>
                  <option value="6105">6105 - Beban Penggantian Tabung Galon Rusak</option>
                  <option value="6199">6199 - Beban Operasional Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Pengeluaran (Rp)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={1000}
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Pengeluaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli pulsa token listrik depot air"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Pengeluaran Kas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
