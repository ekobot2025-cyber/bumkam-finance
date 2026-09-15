'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  Smartphone,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  PlusCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'7days' | 'month' | 'year'>('7days');

  const fetchDashboard = () => {
    setLoading(true);
    fetch(`/api/dashboard?period=${chartPeriod}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, [chartPeriod]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm">Memuat data transaksi riil...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || { cashBalance: 0, salesToday: 0, pendingReceivables: 0, netIncomeMonth: 0 };
  const pulsa = data?.pulsa || { balance: 0, salesToday: 0, salesTodayCount: 0, marginMonth: 0 };
  const galon = data?.galon || { availableQty: 0, customerHeldQty: 0, damagedLostQty: 0, salesToday: 0, salesTodayCount: 0 };
  const chartData = data?.chartData || [];
  const recentTransactions = data?.recentTransactions || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ringkasan Keuangan & Usaha</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            BUMKAM Hen Wani, Kampung Enggros — Data Real-Time Berbasis Transaksi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            title="Muat Ulang"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-slate-50 shadow-xs transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>
          <Link
            href="/pulsa"
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-sky-600 text-white hover:bg-sky-500 flex items-center gap-1.5 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Jual Pulsa</span>
          </Link>
          <Link
            href="/galon"
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-blue-700 text-white hover:bg-blue-600 flex items-center gap-1.5 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Jual Galon</span>
          </Link>
        </div>
      </div>

      {/* 4 KPI UTAMA KARTU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Saldo Kas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Saldo Kas Tunai</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            Rp{kpis.cashBalance.toLocaleString('id-ID')}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">Kas Riil</span> di tangan bendahara BUMKAM
          </p>
        </div>

        {/* 2. Penjualan Hari Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Penjualan Hari Ini</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            Rp{kpis.salesToday.toLocaleString('id-ID')}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Total omset gabungan pulsa & galon hari ini
          </p>
        </div>

        {/* 3. Piutang Belum Lunas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Piutang Belum Lunas</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-amber-600">
            Rp{kpis.pendingReceivables.toLocaleString('id-ID')}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Tagihan aktif warga yang belum tertagih
          </p>
        </div>

        {/* 4. Hasil Usaha Bulan Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Hasil Usaha Bulan Ini</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <h3 className={`text-2xl font-black ${kpis.netIncomeMonth >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            Rp{kpis.netIncomeMonth.toLocaleString('id-ID')}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Laba bersih setelah dikurangi beban operasional
          </p>
        </div>
      </div>

      {/* SEKSI UNIT USAHA (PULSA & GALON) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UNIT PULSA */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Unit Usaha Pulsa</h3>
                <p className="text-xs text-slate-500">Saldo deposit modal & penjualan pulsa digital</p>
              </div>
            </div>
            <Link
              href="/pulsa"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>Kelola Pulsa</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[11px] font-medium text-slate-500">Saldo Deposit</p>
              <p className="text-base font-bold text-slate-900 mt-1">
                Rp{pulsa.balance.toLocaleString('id-ID')}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 inline-block">Tersedia untuk jual</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[11px] font-medium text-slate-500">Penjualan Hari Ini</p>
              <p className="text-base font-bold text-slate-900 mt-1">
                Rp{pulsa.salesToday.toLocaleString('id-ID')}
              </p>
              <span className="text-[10px] text-slate-500 mt-0.5 inline-block">{pulsa.salesTodayCount} transaksi</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[11px] font-medium text-slate-500">Margin Bulan Ini</p>
              <p className="text-base font-bold text-sky-600 mt-1">
                Rp{pulsa.marginMonth.toLocaleString('id-ID')}
              </p>
              <span className="text-[10px] text-slate-500 mt-0.5 inline-block">Keuntungan bersih</span>
            </div>
          </div>
        </div>

        {/* UNIT GALON */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Unit Depot Air Galon</h3>
                <p className="text-xs text-slate-500">Inventaris wadah tabung & pengisian galon</p>
              </div>
            </div>
            <Link
              href="/galon"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Kelola Galon</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[11px] font-medium text-slate-500">Galon Tersedia</p>
              <p className="text-base font-bold text-slate-900 mt-1">
                {galon.availableQty} <span className="text-xs font-normal text-slate-500">tabung</span>
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 inline-block">Siap jual di depot</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[11px] font-medium text-slate-500">Di Pelanggan</p>
              <p className="text-base font-bold text-slate-900 mt-1">
                {galon.customerHeldQty} <span className="text-xs font-normal text-slate-500">tabung</span>
              </p>
              <span className="text-[10px] text-amber-600 font-semibold mt-0.5 inline-block">Sedang dipinjam</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[11px] font-medium text-slate-500">Penjualan Hari Ini</p>
              <p className="text-base font-bold text-blue-600 mt-1">
                Rp{galon.salesToday.toLocaleString('id-ID')}
              </p>
              <span className="text-[10px] text-slate-500 mt-0.5 inline-block">{galon.salesTodayCount} transaksi</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRAFIK PENDAPATAN & PENGELUARAN */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Grafik Pendapatan & Pengeluaran Usaha</h3>
            <p className="text-xs text-slate-500">Komparasi pemasukan penjualan vs pengeluaran operasional BUMKAM</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setChartPeriod('7days')}
              className={`px-3 py-1.5 rounded-lg transition ${
                chartPeriod === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => setChartPeriod('month')}
              className={`px-3 py-1.5 rounded-lg transition ${
                chartPeriod === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setChartPeriod('year')}
              className={`px-3 py-1.5 rounded-lg transition ${
                chartPeriod === 'year' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Tahun Ini
            </button>
          </div>
        </div>

        {/* Visual Bar Chart Sederhana Responsif */}
        <div className="space-y-3 pt-2">
          {chartData.map((item: any, idx: number) => {
            const maxVal = Math.max(...chartData.map((d: any) => Math.max(d.income, d.expense)), 100000);
            const incPct = Math.min(100, Math.round((item.income / maxVal) * 100));
            const expPct = Math.min(100, Math.round((item.expense / maxVal) * 100));

            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 w-24 truncate">{item.label}</span>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-emerald-700 font-semibold">
                      Masuk: Rp{item.income.toLocaleString('id-ID')}
                    </span>
                    <span className="text-rose-700 font-semibold">
                      Keluar: Rp{item.expense.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${incPct}%` }}
                    className="bg-emerald-500 rounded-l-full transition-all duration-500"
                    title={`Pendapatan: Rp${item.income}`}
                  />
                  <div
                    style={{ width: `${expPct}%` }}
                    className="bg-rose-400 rounded-r-full transition-all duration-500"
                    title={`Pengeluaran: Rp${item.expense}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-5 mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span>Pendapatan / Omset Usaha</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-400"></span>
            <span>Pengeluaran / Beban Kas</span>
          </div>
        </div>
      </div>

      {/* TABEL TRANSAKSI TERBARU */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Transaksi Terbaru</h3>
            <p className="text-xs text-slate-500">10 transaksi terakhir yang tercatat di dalam sistem</p>
          </div>
          <Link
            href="/laporan"
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            <span>Seluruh Laporan</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Tanggal & No Transaksi</th>
                <th className="py-3 px-4">Unit Usaha</th>
                <th className="py-3 px-4">Jenis Transaksi</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Metode</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Belum ada transaksi tercatat.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((trx: any) => (
                  <tr key={trx.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{trx.trans_no}</p>
                      <p className="text-[11px] text-slate-400">{trx.trans_date}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        trx.unit_code === 'PULSA' ? 'bg-sky-100 text-sky-800' : trx.unit_code === 'GALON' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {trx.unit_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {trx.trans_type === 'sale_pulsa' && 'Jual Pulsa'}
                      {trx.trans_type === 'topup_pulsa' && 'Top Up Saldo'}
                      {trx.trans_type === 'sale_galon' && 'Jual Air Galon'}
                      {trx.trans_type === 'expense' && 'Beban Operasional'}
                      {trx.trans_type === 'income_other' && 'Pendapatan Lain'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {trx.customer_name || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      Rp{trx.subtotal.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        trx.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {trx.payment_method === 'cash' ? 'Tunai' : 'Kredit'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        trx.status === 'posted' ? 'bg-emerald-100 text-emerald-800' : trx.status === 'void' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {trx.status.toUpperCase()}
                      </span>
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
