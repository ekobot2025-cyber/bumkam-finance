'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Coins,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';

export default function PiutangPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Bayar Piutang
  const [selectedReceivable, setSelectedReceivable] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'cash',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReceivables = () => {
    setLoading(true);
    fetch(`/api/receivables?status=${statusFilter}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReceivables();
  }, [statusFilter]);

  const openPayModal = (rec: any) => {
    setSelectedReceivable(rec);
    setPayForm({
      payment_date: new Date().toISOString().split('T')[0],
      amount: rec.remaining_amount,
      payment_method: 'cash',
      notes: `Pembayaran piutang ${rec.customer_name} (${rec.trans_no})`,
    });
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/receivables/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivable_id: selectedReceivable.id,
          payment_date: payForm.payment_date,
          amount: Number(payForm.amount),
          payment_method: payForm.payment_method,
          notes: payForm.notes,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        setMessage({ type: 'error', text: result.message || 'Gagal mencatat pembayaran.' });
        setSubmitting(false);
        return;
      }

      setMessage({ type: 'success', text: result.message });
      setSelectedReceivable(null);
      fetchReceivables();
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const receivables = data?.receivables || [];
  const rekap = data?.rekap || { total_piutang: 0, total_dibayar: 0, total_sisa: 0 };

  const filtered = receivables.filter((r: any) =>
    r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.trans_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-amber-600" />
            <span>Manajemen Piutang Pelanggan</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola tagihan penjualan kredit tempo, pembayaran cicilan, dan pencatatan kas masuk tanpa melipatgandakan pendapatan.
          </p>
        </div>

        <button
          onClick={fetchReceivables}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
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

      {/* Peringatan Prinsip Akuntansi */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">PRINSIP UTAMA: PEMBAYARAN PIUTANG BUKAN PENJUALAN BARU</p>
          <p className="text-amber-800 mt-0.5">
            Ketika warga mencicil atau melunasi piutang, sistem otomatis menambah Kas BUMKAM dan mengurangi saldo Piutang. Sistem <b>TIDAK</b> mencatat penjualan atau pendapatan baru lagi karena pendapatan sudah diakui saat penjualan kredit terjadi.
          </p>
        </div>
      </div>

      {/* 3 Kartu Rekap Piutang */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Nilai Kredit Terbit</span>
          <h3 className="text-2xl font-black text-slate-900 mt-2">
            Rp{rekap.total_piutang?.toLocaleString('id-ID')}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Akumulasi seluruh transaksi tempo</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sudah Diterima (Cicilan)</span>
          <h3 className="text-2xl font-black text-emerald-600 mt-2">
            Rp{rekap.total_dibayar?.toLocaleString('id-ID')}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Uang kas yang telah masuk ke BUMKAM</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sisa Piutang Belum Tertagih</span>
          <h3 className="text-2xl font-black text-amber-600 mt-2">
            Rp{rekap.total_sisa?.toLocaleString('id-ID')}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Tagihan aktif di warga yang harus ditagih</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Cari nama pelanggan atau nomor transaksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm outline-none bg-transparent placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="unpaid">Belum Lunas</option>
            <option value="partial">Sebagian (Cicilan)</option>
            <option value="paid">Lunas</option>
          </select>
        </div>
      </div>

      {/* Tabel Piutang */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Pelanggan & Kontak</th>
                <th className="py-3.5 px-4">No Transaksi & Tanggal</th>
                <th className="py-3.5 px-4 text-right">Total Kredit</th>
                <th className="py-3.5 px-4 text-right">Sudah Dibayar</th>
                <th className="py-3.5 px-4 text-right text-amber-600 font-bold">Sisa Piutang</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada catatan piutang yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{r.customer_name}</p>
                      <p className="text-[11px] text-slate-400">{r.customer_phone || '-'}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{r.trans_no}</p>
                      <p className="text-[11px] text-slate-400">{r.trans_date} ({r.unit_code})</p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      Rp{r.total_amount?.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-600">
                      Rp{r.paid_amount?.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-amber-600 text-sm">
                      Rp{r.remaining_amount?.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        r.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {r.status === 'paid' && 'LUNAS'}
                        {r.status === 'partial' && 'SEBAGIAN'}
                        {r.status === 'unpaid' && 'BELUM LUNAS'}
                        {r.status === 'overdue' && 'JATUH TEMPO'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {r.remaining_amount > 0 ? (
                        <button
                          type="button"
                          onClick={() => openPayModal(r)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1 mx-auto"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>BAYAR</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs font-semibold">Tuntas</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL BAYAR PIUTANG */}
      {selectedReceivable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Catat Penerimaan Pembayaran Piutang</h3>
            <p className="text-xs text-slate-500 mb-4">
              Uang yang disetor warga akan langsung menambah kas BUMKAM dan mengurangi sisa piutang.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Pelanggan:</span>
                <span className="font-bold text-slate-900">{selectedReceivable.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Transaksi:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedReceivable.trans_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Piutang:</span>
                <span>Rp{selectedReceivable.total_amount?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sudah Dibayar:</span>
                <span className="text-emerald-600 font-semibold">Rp{selectedReceivable.paid_amount?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                <span className="text-amber-700">Sisa Tagihan:</span>
                <span className="text-amber-700 text-sm">Rp{selectedReceivable.remaining_amount?.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Bayar</label>
                <input
                  type="date"
                  required
                  value={payForm.payment_date}
                  onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">Jumlah Pembayaran (Rp)</label>
                  <button
                    type="button"
                    onClick={() => setPayForm({ ...payForm, amount: selectedReceivable.remaining_amount })}
                    className="text-[11px] font-semibold text-emerald-600 hover:underline"
                  >
                    Bayar Lunas Penuh
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min={500}
                  max={selectedReceivable.remaining_amount}
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400">
                  Dapat membayar sebagian (cicilan) atau langsung lunas.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Metode Penerimaan</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="cash">Tunai (Kas BUMKAM)</option>
                  <option value="transfer">Transfer Bank BUMKAM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedReceivable(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || payForm.amount <= 0 || payForm.amount > selectedReceivable.remaining_amount}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
