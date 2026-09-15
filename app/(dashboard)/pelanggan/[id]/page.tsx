'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  User,
  ArrowLeft,
  Phone,
  MapPin,
  Droplets,
  CreditCard,
  History,
  Receipt,
  Calendar,
  Wallet,
} from 'lucide-react';

export default function CustomerDetailPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/customers/${params.id}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success) setData(res.data);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { customer, transactions, receivables, payments, gallonMovements } = data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <div>
        <Link
          href="/pelanggan"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Master Pelanggan</span>
        </Link>
      </div>

      {/* Customer Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-black text-xl">
            {customer.name?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{customer.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {customer.code}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1.5">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {customer.phone || '-'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {customer.address || 'Kampung Enggros'}
              </span>
            </div>
          </div>
        </div>

        {/* 2 Mini Badges */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[120px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-500" />
              Galon Dipegang
            </p>
            <p className="text-xl font-black text-blue-700 mt-0.5">
              {customer.gallon_balance} <span className="text-xs font-normal text-slate-500">tabung</span>
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[140px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-amber-500" />
              Total Piutang
            </p>
            <p className="text-xl font-black text-amber-600 mt-0.5">
              Rp{customer.total_receivable?.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Riwayat Piutang & Riwayat Pembayaran */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kartu Piutang */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Status Piutang & Tagihan</h3>
            <p className="text-[11px] text-slate-500">Daftar transaksi tempo pelanggan ini</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {receivables.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">Tidak ada piutang aktif.</p>
            ) : (
              receivables.map((r: any) => (
                <div key={r.id} className="p-4 hover:bg-slate-50 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{r.trans_no}</p>
                    <p className="text-[10px] text-slate-400">{r.trans_date}</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Total: Rp{r.total_amount?.toLocaleString('id-ID')} • Dibayar: Rp{r.paid_amount?.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-amber-600">
                      Sisa: Rp{r.remaining_amount?.toLocaleString('id-ID')}
                    </p>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                      r.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : r.status === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Riwayat Pembayaran Cicilan */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Riwayat Pembayaran Cicilan</h3>
            <p className="text-[11px] text-slate-500">Histori uang kas yang disetor untuk pelunasan piutang</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {payments.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">Belum ada riwayat pembayaran.</p>
            ) : (
              payments.map((p: any) => (
                <div key={p.id} className="p-4 hover:bg-slate-50 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{p.payment_no}</p>
                    <p className="text-[10px] text-slate-400">{p.payment_date}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{p.notes || 'Pembayaran piutang'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600 text-sm">
                      +Rp{p.amount?.toLocaleString('id-ID')}
                    </p>
                    <span className="text-[10px] font-medium text-slate-400 uppercase">
                      Metode: {p.payment_method}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Riwayat Transaksi Lengkap */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">Semua Transaksi Pembelian</h3>
          <p className="text-[11px] text-slate-500">Histori transaksi pulsa dan galon oleh pelanggan ini</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">No Transaksi</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Metode</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                transactions.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{t.trans_no}</td>
                    <td className="py-3 px-4 text-slate-500">{t.trans_date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{t.unit_code}</td>
                    <td className="py-3 px-4 text-slate-600">{t.notes || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      Rp{t.subtotal?.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        t.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {t.payment_method === 'cash' ? 'Tunai' : 'Kredit'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-[10px] text-slate-700">
                      {t.status.toUpperCase()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
