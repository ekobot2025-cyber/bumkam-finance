'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldAlert,
  Search,
  RefreshCw,
  User,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Void Transaksi
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidTransId, setVoidTransId] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [submittingVoid, setSubmittingVoid] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLogs = () => {
    setLoading(true);
    fetch('/api/audit-logs')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setLogs(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTransId || !voidReason) return;

    setSubmittingVoid(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/transactions/${voidTransId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setMessage({ type: 'error', text: result.message || 'Gagal membatalkan transaksi.' });
        setSubmittingVoid(false);
        return;
      }

      setMessage({ type: 'success', text: result.message });
      setVoidModalOpen(false);
      setVoidTransId('');
      setVoidReason('');
      fetchLogs();
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan server.' });
    } finally {
      setSubmittingVoid(false);
    }
  };

  const filteredLogs = logs.filter((log) =>
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.table_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-indigo-600" />
            <span>Audit Trail & Log Aktivitas Sistem</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Rekam jejak setiap pembuatan, perubahan, pembatalan (void), dan login pengguna ke BUMKAM Finance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setVoidModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Batalkan Transaksi (VOID)</span>
          </button>
        </div>
      </div>

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

      {/* Filter / Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Cari aktivitas, nama pengguna, tabel, atau alasan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-sm outline-none bg-transparent placeholder-slate-400"
        />
      </div>

      {/* Tabel Audit Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Waktu</th>
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Tindakan / Action</th>
                <th className="py-3.5 px-4">Entitas & ID</th>
                <th className="py-3.5 px-4">Keterangan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tidak ada catatan aktivitas sistem.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {log.created_at}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{log.full_name || 'System'}</p>
                      <p className="text-[10px] text-slate-400">@{log.username || 'system'}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        log.action.includes('VOID')
                          ? 'bg-rose-100 text-rose-800'
                          : log.action.includes('SALE')
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-slate-700">
                        {log.table_name} #{log.record_id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {log.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL VOID TRANSAKSI */}
      {voidModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-slate-900 text-lg mb-1 flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
              <span>Pembatalan Transaksi (VOID)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pembatalan transaksi POSTED akan membalikkan stok galon/saldo pulsa, mengoreksi kas/piutang, dan membuat jurnal pembalik resmi.
            </p>

            <form onSubmit={handleVoidSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Transaksi yang Akan Dibatalkan
                </label>
                <input
                  type="number"
                  required
                  placeholder="Masukkan ID Transaksi (misal: 1, 2, 3...)"
                  value={voidTransId}
                  onChange={(e) => setVoidTransId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Pembatalan (Wajib Diisi untuk Audit)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan alasan pembatalan (misal: Pelanggan membatalkan pesanan, salah input nominal)..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVoidModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingVoid}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50"
                >
                  {submittingVoid ? 'Memproses VOID...' : 'Eksekusi Pembatalan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
