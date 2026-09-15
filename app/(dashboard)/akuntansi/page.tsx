'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Scale,
  FileSpreadsheet,
  Layers,
  Calendar,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Search,
} from 'lucide-react';

export default function AkuntansiPage() {
  const [activeTab, setActiveTab] = useState<'jurnal' | 'bukubesar' | 'neracasaldo' | 'coa'>('jurnal');
  const [data, setData] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    accountCode: '',
  });

  const fetchData = () => {
    setLoading(true);
    let tabQuery = 'journals';
    if (activeTab === 'bukubesar') tabQuery = 'ledger';
    if (activeTab === 'neracasaldo') tabQuery = 'trial-balance';
    if (activeTab === 'coa') tabQuery = 'accounts';

    let url = `/api/accounting?tab=${tabQuery}`;
    if (dateFilter.startDate) url += `&startDate=${dateFilter.startDate}`;
    if (dateFilter.endDate) url += `&endDate=${dateFilter.endDate}`;
    if (dateFilter.accountCode) url += `&accountCode=${dateFilter.accountCode}`;

    Promise.all([
      fetch(url).then((res) => res.json()),
      fetch('/api/accounting?tab=accounts').then((res) => res.json()),
    ])
      .then(([mainRes, accRes]) => {
        if (mainRes.success) setData(mainRes.data);
        if (accRes.success) setAccounts(accRes.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            <span>Pencatatan Akuntansi & Double-Entry</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pencatatan keuangan otomatis, Jurnal Umum, Buku Besar, Neraca Saldo, dan Bagan Akun (COA).
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      {/* Banner Akuntansi BUMKAM */}
      <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-900 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">INTEGRITAS DOUBLE-ENTRY: TOTAL DEBIT = TOTAL KREDIT</p>
          <p className="text-indigo-800 mt-0.5">
            Semua jurnal di bawah ini terbentuk secara otomatis ketika operator/bendahara menginput transaksi operasional harian. Pengguna tidak perlu menginput jurnal secara manual, namun buku akuntansi tetap rapi, tertib, dan dapat diaudit.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('jurnal')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'jurnal' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Jurnal Umum Otomatis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bukubesar')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'bukubesar' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Buku Besar (General Ledger)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('neracasaldo')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'neracasaldo' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Neraca Saldo (Trial Balance)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('coa')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'coa' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Bagan Akun (COA)
        </button>
      </div>

      {/* TAB 1: JURNAL UMUM */}
      {activeTab === 'jurnal' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Daftar Entri Jurnal Umum</h3>
              <p className="text-xs text-slate-500">Seluruh pencatatan akuntansi double-entry terposting</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {data.length} Entri Jurnal
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">Belum ada jurnal tercatat.</p>
            ) : (
              data.map((entry: any) => {
                const totalDeb = entry.lines?.reduce((s: number, l: any) => s + (l.debit || 0), 0);
                const totalCred = entry.lines?.reduce((s: number, l: any) => s + (l.credit || 0), 0);
                const isBalanced = Math.abs(totalDeb - totalCred) < 0.01;

                return (
                  <div key={entry.id} className="p-4 sm:p-5 hover:bg-slate-50 transition space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                          {entry.entry_no}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">({entry.entry_date})</span>
                        {entry.reference_no && (
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            Ref: {entry.reference_no}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          entry.status === 'posted' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {entry.status.toUpperCase()}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isBalanced ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isBalanced ? 'BALANCE (DEBIT = KREDIT)' : 'TIDAK SEIMBANG'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs font-medium text-slate-700">{entry.description}</p>

                    {/* Lines Table */}
                    <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/70 text-xs">
                      <table className="w-full">
                        <thead>
                          <tr className="text-slate-500 font-semibold text-[10px] uppercase border-b border-slate-200 pb-1">
                            <th className="text-left pb-1">Kode & Nama Akun</th>
                            <th className="text-right pb-1 w-28">Debit (Rp)</th>
                            <th className="text-right pb-1 w-28">Kredit (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {entry.lines?.map((l: any) => (
                            <tr key={l.id} className="py-1">
                              <td className="py-1 text-slate-800 font-medium">
                                <span className="font-mono font-semibold text-slate-600 mr-2">{l.account_code}</span>
                                {l.account_name}
                              </td>
                              <td className="py-1 text-right font-semibold text-slate-900">
                                {l.debit > 0 ? `Rp${l.debit.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="py-1 text-right font-semibold text-slate-900">
                                {l.credit > 0 ? `Rp${l.credit.toLocaleString('id-ID')}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200 font-bold text-slate-900">
                            <td className="pt-1.5 text-right text-[10px] text-slate-500 uppercase pr-3">Total:</td>
                            <td className="pt-1.5 text-right font-black text-indigo-700">Rp{totalDeb.toLocaleString('id-ID')}</td>
                            <td className="pt-1.5 text-right font-black text-indigo-700">Rp{totalCred.toLocaleString('id-ID')}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BUKU BESAR */}
      {activeTab === 'bukubesar' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Pilih Akun:</span>
            <select
              value={dateFilter.accountCode}
              onChange={(e) => {
                setDateFilter({ ...dateFilter, accountCode: e.target.value });
                setTimeout(fetchData, 50);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 outline-none"
            >
              <option value="">-- Semua Akun Buku Besar --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.account_code}>
                  {a.account_code} - {a.account_name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Tanggal & No Jurnal</th>
                    <th className="py-3.5 px-4">Akun</th>
                    <th className="py-3.5 px-4">Keterangan & Referensi</th>
                    <th className="py-3.5 px-4 text-right">Debit</th>
                    <th className="py-3.5 px-4 text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Tidak ada transaksi buku besar.
                      </td>
                    </tr>
                  ) : (
                    data.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <p className="font-mono font-bold text-slate-900">{row.entry_no}</p>
                          <p className="text-[11px] text-slate-400">{row.entry_date}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{row.account_name}</p>
                          <p className="text-[10px] font-mono text-indigo-600">{row.account_code}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <p>{row.description}</p>
                          {row.reference_no && <span className="text-[10px] font-mono text-slate-400">Ref: {row.reference_no}</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          {row.debit > 0 ? `Rp${row.debit.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          {row.credit > 0 ? `Rp${row.credit.toLocaleString('id-ID')}` : '-'}
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

      {/* TAB 3: NERACA SALDO */}
      {activeTab === 'neracasaldo' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Neraca Saldo (Trial Balance)</h3>
            <p className="text-xs text-slate-500">Ringkasan akumulasi debit, kredit, dan saldo akhir setiap akun</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Kode Akun</th>
                  <th className="py-3.5 px-4">Nama Akun</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4 text-right">Total Debit</th>
                  <th className="py-3.5 px-4 text-right">Total Kredit</th>
                  <th className="py-3.5 px-4 text-right text-indigo-700 font-bold">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{a.account_code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{a.account_name}</td>
                    <td className="py-3 px-4 text-slate-500 capitalize">{a.category}</td>
                    <td className="py-3 px-4 text-right text-slate-700">Rp{a.total_debit?.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4 text-right text-slate-700">Rp{a.total_credit?.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4 text-right font-black text-indigo-700">
                      Rp{a.ending_balance?.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BAGAN AKUN (COA) */}
      {activeTab === 'coa' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Bagan Akun Standar BUMKAM Hen Wani</h3>
            <p className="text-xs text-slate-500">Daftar kode rekening baku untuk klasifikasi transaksi</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Kode Akun</th>
                  <th className="py-3 px-4">Nama Akun</th>
                  <th className="py-3 px-4">Kelompok / Kategori</th>
                  <th className="py-3 px-4 text-center">Saldo Normal</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((acc: any) => (
                  <tr key={acc.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{acc.account_code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{acc.account_name}</td>
                    <td className="py-3 px-4 capitalize text-slate-600">{acc.category}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        acc.normal_balance === 'debit' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {acc.normal_balance.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        AKTIF
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
