'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Smartphone,
  Droplets,
  Coins,
  Receipt,
  Calendar,
  RefreshCw,
  Scale,
  ArrowRight,
} from 'lucide-react';

export default function HasilUsahaPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });

  const fetchIncome = () => {
    setLoading(true);
    let url = `/api/accounting?tab=income-statement`;
    if (dateFilter.startDate) url += `&startDate=${dateFilter.startDate}`;
    if (dateFilter.endDate) url += `&endDate=${dateFilter.endDate}`;

    fetch(url)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIncome();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIncome();
  };

  const handleResetFilter = () => {
    setDateFilter({ startDate: '', endDate: '' });
    setTimeout(fetchIncome, 50);
  };

  const pulsa = data?.pulsa || { revenue: 0, cogs: 0, grossProfit: 0 };
  const galon = data?.galon || { revenue: 0, cogs: 0, grossProfit: 0 };
  const total = data?.total || { revenue: 0, cogs: 0, grossProfit: 0, expenses: [], totalExpenses: 0, netIncome: 0 };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-indigo-600" />
            <span>Laporan Hasil Usaha & Laba Rugi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Perhitungan transparan: Pendapatan − Harga Pokok Modal = Laba Kotor; Laba Kotor − Beban Operasional = Hasil Usaha Bersih.
          </p>
        </div>

        <button
          onClick={fetchIncome}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      {/* Filter Periode Tanggal */}
      <form onSubmit={handleFilterSubmit} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Periode:</span>
        </div>
        <input
          type="date"
          value={dateFilter.startDate}
          onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <span className="text-xs text-slate-400">s/d</span>
        <input
          type="date"
          value={dateFilter.endDate}
          onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition"
        >
          Terapkan Filter
        </button>
        {(dateFilter.startDate || dateFilter.endDate) && (
          <button
            type="button"
            onClick={handleResetFilter}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition"
          >
            Reset
          </button>
        )}
      </form>

      {/* KARTU BESAR HASIL USAHA BERSIH */}
      <div className="bg-gradient-to-tr from-indigo-700 via-blue-800 to-sky-700 text-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-indigo-700/15 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
            Hasil Usaha Bersih BUMKAM (Laba Bersih)
          </span>
          <h2 className="text-3xl sm:text-4xl font-black mt-2">
            Rp{total.netIncome?.toLocaleString('id-ID')}
          </h2>
          <p className="text-xs text-indigo-100 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Siap dialokasikan untuk Pendapatan Asli Kampung (PAK) Enggros & Kas Cadangan BUMKAM
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/15 text-xs min-w-[260px]">
          <div>
            <p className="text-indigo-200">Total Pendapatan:</p>
            <p className="font-bold text-base mt-0.5">Rp{total.revenue?.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-indigo-200">Total Modal & Beban:</p>
            <p className="font-bold text-base mt-0.5 text-rose-200">Rp{(total.cogs + total.totalExpenses)?.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* 2 UNIT KOMPARASI LABA KOTOR: PULSA VS GALON */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Unit Pulsa */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Smartphone className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900">Hasil Usaha Unit Pulsa</h3>
            </div>
            <span className="text-xs font-bold text-sky-600">Unit Komoditas Digital</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 text-slate-600">
              <span>Pendapatan Penjualan Pulsa:</span>
              <span className="font-semibold text-slate-900">Rp{pulsa.revenue?.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-1.5 text-slate-600">
              <span>Harga Pokok Penjualan (Modal Pulsa):</span>
              <span className="font-semibold text-rose-600">−Rp{pulsa.cogs?.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-2 border-t border-slate-100 font-bold text-sm bg-sky-50/60 px-3 rounded-xl text-sky-900">
              <span>Laba Kotor Pulsa (Margin):</span>
              <span className="text-sky-700">Rp{pulsa.grossProfit?.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Unit Galon */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Droplets className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900">Hasil Usaha Unit Air Galon</h3>
            </div>
            <span className="text-xs font-bold text-blue-600">Unit Depot Air Minum</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 text-slate-600">
              <span>Pendapatan Penjualan Air Galon:</span>
              <span className="font-semibold text-slate-900">Rp{galon.revenue?.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-1.5 text-slate-600">
              <span>Harga Pokok Bahan (Air/Tutup/Tisu):</span>
              <span className="font-semibold text-rose-600">−Rp{galon.cogs?.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-2 border-t border-slate-100 font-bold text-sm bg-blue-50/60 px-3 rounded-xl text-blue-900">
              <span>Laba Kotor Galon:</span>
              <span className="text-blue-700">Rp{galon.grossProfit?.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RINCIAN BEBAN OPERASIONAL & PERHITUNGAN AKHIR */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-900 text-base mb-1">Rincian Beban Operasional BUMKAM</h3>
        <p className="text-xs text-slate-500 mb-4">
          Biaya-biaya yang dikeluarkan untuk menjalankan operasional harian depot dan usaha pulsa.
        </p>

        <div className="space-y-2 text-xs">
          {total.expenses?.length === 0 ? (
            <p className="text-slate-400 py-3 italic">Belum ada beban operasional tercatat pada periode ini.</p>
          ) : (
            total.expenses.map((exp: any, i: number) => (
              <div key={i} className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-700 font-medium">
                  {exp.account_code} — {exp.account_name}
                </span>
                <span className="font-bold text-rose-600">
                  Rp{exp.amount?.toLocaleString('id-ID')}
                </span>
              </div>
            ))
          )}

          <div className="flex justify-between py-2.5 font-bold text-slate-900 text-xs bg-slate-50 px-3 rounded-xl mt-2">
            <span>Total Beban Operasional:</span>
            <span className="text-rose-600 font-black">−Rp{total.totalExpenses?.toLocaleString('id-ID')}</span>
          </div>

          <div className="flex justify-between items-center py-3.5 px-4 bg-indigo-50 border border-indigo-100 rounded-xl font-bold text-indigo-950 mt-4">
            <div>
              <span className="text-sm block">HASIL USAHA BERSIH (LABA BERSIH BUMKAM)</span>
              <span className="text-[11px] text-indigo-700 font-normal">Laba Kotor (Rp{total.grossProfit?.toLocaleString('id-ID')}) − Beban Operasional (Rp{total.totalExpenses?.toLocaleString('id-ID')})</span>
            </div>
            <span className="text-xl font-black text-indigo-700">
              Rp{total.netIncome?.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
