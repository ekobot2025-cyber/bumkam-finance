'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  Droplets,
  Smartphone,
  Wallet,
  CreditCard,
  TrendingUp,
  Scale,
} from 'lucide-react';

export default function LaporanPage() {
  const [reportType, setReportType] = useState<'penjualan' | 'piutang' | 'kas' | 'laba-rugi' | 'neraca' | 'arus-kas'>('penjualan');
  const [profile, setProfile] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });

  const fetchProfileAndReport = () => {
    setLoading(true);

    // Fetch Profil BUMKAM
    fetch('/api/profile')
      .then((res) => res.json())
      .then((res) => { if (res.success) setProfile(res.data); });

    // Fetch data sesuai tipe laporan
    let fetchPromise: Promise<any>;

    if (reportType === 'penjualan') {
      fetchPromise = Promise.all([
        fetch('/api/pulsa').then((r) => r.json()),
        fetch('/api/galon').then((r) => r.json()),
      ]).then(([p, g]) => ({
        pulsa: p.data?.transactions || [],
        galon: g.data?.transactions || [],
      }));
    } else if (reportType === 'piutang') {
      fetchPromise = fetch('/api/receivables').then((r) => r.json()).then((r) => r.data);
    } else if (reportType === 'kas') {
      fetchPromise = fetch('/api/cash').then((r) => r.json()).then((r) => r.data);
    } else if (reportType === 'laba-rugi') {
      fetchPromise = fetch('/api/accounting?tab=income-statement').then((r) => r.json()).then((r) => r.data);
    } else if (reportType === 'neraca') {
      fetchPromise = fetch('/api/accounting?tab=balance-sheet').then((r) => r.json()).then((r) => r.data);
    } else {
      fetchPromise = fetch('/api/accounting?tab=cash-flow').then((r) => r.json()).then((r) => r.data);
    }

    fetchPromise
      .then((res) => setReportData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfileAndReport();
  }, [reportType]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Print Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-sky-600" />
            <span>Pusat Laporan Usaha & Keuangan</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ekspor dan cetak laporan resmi BUMKAM Hen Wani, Kampung Enggros.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProfileAndReport}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Ekspor PDF</span>
          </button>
        </div>
      </div>

      {/* Report Selector Tabs (No-Print) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 no-print">
        <button
          type="button"
          onClick={() => setReportType('penjualan')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            reportType === 'penjualan' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Laporan Penjualan (Pulsa & Galon)
        </button>
        <button
          type="button"
          onClick={() => setReportType('piutang')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            reportType === 'piutang' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Laporan Piutang
        </button>
        <button
          type="button"
          onClick={() => setReportType('kas')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            reportType === 'kas' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Laporan Buku Kas
        </button>
        <button
          type="button"
          onClick={() => setReportType('laba-rugi')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            reportType === 'laba-rugi' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Laporan Hasil Usaha (Laba Rugi)
        </button>
        <button
          type="button"
          onClick={() => setReportType('neraca')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            reportType === 'neraca' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Neraca Posisi Keuangan
        </button>
        <button
          type="button"
          onClick={() => setReportType('arus-kas')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            reportType === 'arus-kas' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Laporan Arus Kas
        </button>
      </div>

      {/* DOKUMEN CETAK RESMI (PRINT CONTAINER) */}
      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none">
        {/* Kop Surat BUMKAM */}
        <div className="text-center pb-6 border-b-2 border-slate-900 mb-6">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900">
            {profile?.name || 'BUMKAM HEN WANI'}
          </h2>
          <p className="text-sm font-bold text-sky-700 uppercase tracking-wider">
            {profile?.village_name || 'KAMPUNG ENGGROS, DISTRIK ABEPURA'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {profile?.address || 'Jl. Enggros No. 05, Kota Jayapura, Papua'} • Telp: {profile?.phone || '081234567890'}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-200 inline-block px-6">
            <h3 className="text-base font-bold uppercase tracking-wide text-slate-900">
              {reportType === 'penjualan' && 'LAPORAN REKAPITULASI PENJUALAN'}
              {reportType === 'piutang' && 'LAPORAN PIUTANG PELANGGAN'}
              {reportType === 'kas' && 'LAPORAN REKAPITULASI BUKU KAS'}
              {reportType === 'laba-rugi' && 'LAPORAN HASIL USAHA (LABA RUGI)'}
              {reportType === 'neraca' && 'LAPORAN POSISI KEUANGAN (NERACA)'}
              {reportType === 'arus-kas' && 'LAPORAN ARUS KAS (CASH FLOW)'}
            </h3>
            <p className="text-xs text-slate-500">
              Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* KONTEN LAPORAN */}
        {loading ? (
          <div className="py-12 text-center text-slate-400">Memuat laporan...</div>
        ) : (
          <div>
            {/* 1. LAPORAN PENJUALAN */}
            {reportType === 'penjualan' && (
              <div className="space-y-8">
                {/* Penjualan Pulsa */}
                <div>
                  <h4 className="font-bold text-sm text-sky-800 mb-2 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Unit Penjualan Pulsa</span>
                  </h4>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                      <tr>
                        <th className="p-2">No Transaksi</th>
                        <th className="p-2">Tanggal</th>
                        <th className="p-2">Provider & No HP</th>
                        <th className="p-2 text-right">Modal (Rp)</th>
                        <th className="p-2 text-right">Harga Jual (Rp)</th>
                        <th className="p-2 text-right font-bold text-emerald-700">Margin (Rp)</th>
                        <th className="p-2 text-center">Metode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData?.pulsa?.length === 0 ? (
                        <tr><td colSpan={7} className="p-4 text-center text-slate-400">Belum ada penjualan pulsa.</td></tr>
                      ) : (
                        reportData?.pulsa?.map((p: any) => (
                          <tr key={p.id}>
                            <td className="p-2 font-mono">{p.trans_no}</td>
                            <td className="p-2">{p.trans_date}</td>
                            <td className="p-2">{p.provider} ({p.phone_number})</td>
                            <td className="p-2 text-right">Rp{p.cogs_amount?.toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right font-bold">Rp{p.subtotal?.toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right font-bold text-emerald-700">Rp{p.margin_amount?.toLocaleString('id-ID')}</td>
                            <td className="p-2 text-center capitalize">{p.payment_method}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Penjualan Galon */}
                <div>
                  <h4 className="font-bold text-sm text-blue-800 mb-2 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4" />
                    <span>Unit Penjualan Air Galon</span>
                  </h4>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                      <tr>
                        <th className="p-2">No Transaksi</th>
                        <th className="p-2">Tanggal</th>
                        <th className="p-2">Pelanggan</th>
                        <th className="p-2 text-center">Jumlah Galon</th>
                        <th className="p-2 text-right">Total Transaksi (Rp)</th>
                        <th className="p-2 text-center">Metode</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData?.galon?.length === 0 ? (
                        <tr><td colSpan={7} className="p-4 text-center text-slate-400">Belum ada penjualan galon.</td></tr>
                      ) : (
                        reportData?.galon?.map((g: any) => (
                          <tr key={g.id}>
                            <td className="p-2 font-mono">{g.trans_no}</td>
                            <td className="p-2">{g.trans_date}</td>
                            <td className="p-2">{g.customer_name || 'Pembeli Langsung'}</td>
                            <td className="p-2 text-center">{g.qty || 1} tabung</td>
                            <td className="p-2 text-right font-bold">Rp{g.subtotal?.toLocaleString('id-ID')}</td>
                            <td className="p-2 text-center capitalize">{g.payment_method}</td>
                            <td className="p-2 text-center">{g.status?.toUpperCase()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. LAPORAN PIUTANG */}
            {reportType === 'piutang' && (
              <div className="space-y-4">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                    <tr>
                      <th className="p-2">Pelanggan</th>
                      <th className="p-2">No Transaksi</th>
                      <th className="p-2">Tanggal</th>
                      <th className="p-2 text-right">Total Piutang</th>
                      <th className="p-2 text-right">Sudah Dibayar</th>
                      <th className="p-2 text-right font-bold text-amber-700">Sisa Tagihan</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData?.receivables?.map((r: any) => (
                      <tr key={r.id}>
                        <td className="p-2 font-bold">{r.customer_name}</td>
                        <td className="p-2 font-mono">{r.trans_no}</td>
                        <td className="p-2">{r.trans_date}</td>
                        <td className="p-2 text-right">Rp{r.total_amount?.toLocaleString('id-ID')}</td>
                        <td className="p-2 text-right text-emerald-700">Rp{r.paid_amount?.toLocaleString('id-ID')}</td>
                        <td className="p-2 text-right font-black text-amber-700">Rp{r.remaining_amount?.toLocaleString('id-ID')}</td>
                        <td className="p-2 text-center uppercase font-bold">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 font-bold bg-slate-50">
                    <tr>
                      <td colSpan={3} className="p-2 text-right uppercase">Total:</td>
                      <td className="p-2 text-right">Rp{reportData?.rekap?.total_piutang?.toLocaleString('id-ID')}</td>
                      <td className="p-2 text-right text-emerald-700">Rp{reportData?.rekap?.total_dibayar?.toLocaleString('id-ID')}</td>
                      <td className="p-2 text-right font-black text-amber-700">Rp{reportData?.rekap?.total_sisa?.toLocaleString('id-ID')}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* 3. LAPORAN KAS */}
            {reportType === 'kas' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 mb-4 text-xs font-semibold p-3 bg-slate-50 border rounded-xl">
                  <div>Kas Masuk: <span className="font-bold text-emerald-700">Rp{reportData?.totalIn?.toLocaleString('id-ID')}</span></div>
                  <div>Kas Keluar: <span className="font-bold text-rose-700">Rp{reportData?.totalOut?.toLocaleString('id-ID')}</span></div>
                  <div>Saldo Kas Bersih: <span className="font-black text-slate-900">Rp{reportData?.balance?.toLocaleString('id-ID')}</span></div>
                </div>

                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                    <tr>
                      <th className="p-2">No Kas</th>
                      <th className="p-2">Tanggal</th>
                      <th className="p-2">Arus</th>
                      <th className="p-2">Keterangan</th>
                      <th className="p-2 text-right">Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData?.transactions?.map((c: any) => (
                      <tr key={c.id}>
                        <td className="p-2 font-mono">{c.trans_no}</td>
                        <td className="p-2">{c.trans_date}</td>
                        <td className="p-2 uppercase font-bold">{c.flow_type === 'in' ? 'MASUK' : 'KELUAR'}</td>
                        <td className="p-2">{c.description}</td>
                        <td className={`p-2 text-right font-bold ${c.flow_type === 'in' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {c.flow_type === 'in' ? '+' : '−'}Rp{c.amount?.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. LAPORAN HASIL USAHA (LABA RUGI) */}
            {reportType === 'laba-rugi' && (
              <div className="space-y-4 max-w-2xl mx-auto text-xs">
                <div className="border border-slate-300 p-4 rounded-xl space-y-3">
                  <div className="font-bold text-sm text-slate-900 border-b pb-1">I. PENDAPATAN USAHA</div>
                  <div className="flex justify-between pl-4">
                    <span>Pendapatan Penjualan Pulsa:</span>
                    <span className="font-semibold">Rp{reportData?.pulsa?.revenue?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span>Pendapatan Penjualan Air Galon:</span>
                    <span className="font-semibold">Rp{reportData?.galon?.revenue?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>TOTAL PENDAPATAN:</span>
                    <span>Rp{reportData?.total?.revenue?.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="font-bold text-sm text-slate-900 border-b pb-1 pt-3">II. HARGA POKOK PENJUALAN (HPP)</div>
                  <div className="flex justify-between pl-4">
                    <span>Modal Pulsa (COGS):</span>
                    <span className="font-semibold text-rose-700">Rp{reportData?.pulsa?.cogs?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span>Modal Air & Tutup Galon:</span>
                    <span className="font-semibold text-rose-700">Rp{reportData?.galon?.cogs?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>TOTAL HARGA POKOK PENJUALAN:</span>
                    <span className="text-rose-700">Rp{reportData?.total?.cogs?.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between font-bold text-sm bg-slate-100 p-2 rounded">
                    <span>LABA KOTOR BUMKAM:</span>
                    <span className="text-emerald-700">Rp{reportData?.total?.grossProfit?.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="font-bold text-sm text-slate-900 border-b pb-1 pt-3">III. BEBAN OPERASIONAL</div>
                  {reportData?.total?.expenses?.map((e: any, idx: number) => (
                    <div key={idx} className="flex justify-between pl-4">
                      <span>{e.account_name}:</span>
                      <span className="text-rose-700">Rp{e.amount?.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>TOTAL BEBAN OPERASIONAL:</span>
                    <span className="text-rose-700">Rp{reportData?.total?.totalExpenses?.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between font-black text-base bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-indigo-950 mt-4">
                    <span>HASIL USAHA BERSIH (LABA BERSIH):</span>
                    <span>Rp{reportData?.total?.netIncome?.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. NERACA POSISI KEUANGAN */}
            {reportType === 'neraca' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                {/* ASET */}
                <div className="border border-slate-300 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-sm text-slate-900 border-b pb-1">ASET (AKTIVA)</h4>
                  {reportData?.assets?.map((a: any) => (
                    <div key={a.id} className="flex justify-between">
                      <span>{a.account_name} ({a.account_code}):</span>
                      <span className="font-semibold">Rp{a.ending_balance?.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-sm border-t pt-2 mt-4 bg-slate-50 p-2 rounded">
                    <span>TOTAL ASET:</span>
                    <span className="text-sky-700 font-black">Rp{reportData?.totalAssets?.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* KEWAJIBAN & EKUITAS */}
                <div className="border border-slate-300 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-sm text-slate-900 border-b pb-1">KEWAJIBAN & EKUITAS</h4>
                  <p className="font-semibold text-slate-700 mt-2">Kewajiban:</p>
                  {reportData?.liabilities?.length === 0 ? (
                    <p className="pl-3 text-slate-400 italic">Tidak ada utang.</p>
                  ) : (
                    reportData?.liabilities?.map((l: any) => (
                      <div key={l.id} className="flex justify-between pl-3">
                        <span>{l.account_name}:</span>
                        <span>Rp{l.ending_balance?.toLocaleString('id-ID')}</span>
                      </div>
                    ))
                  )}

                  <p className="font-semibold text-slate-700 mt-3">Ekuitas:</p>
                  {reportData?.equities?.map((e: any) => (
                    <div key={e.id} className="flex justify-between pl-3">
                      <span>{e.account_name}:</span>
                      <span>Rp{e.ending_balance?.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pl-3 font-semibold text-indigo-700">
                    <span>Hasil Usaha Berjalan:</span>
                    <span>Rp{reportData?.currentPeriodProfit?.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between font-bold text-sm border-t pt-2 mt-4 bg-slate-50 p-2 rounded">
                    <span>TOTAL LIABILITAS & EKUITAS:</span>
                    <span className="text-indigo-700 font-black">Rp{reportData?.totalLiabilitiesAndEquity?.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. ARUS KAS */}
            {reportType === 'arus-kas' && (
              <div className="space-y-4 max-w-2xl mx-auto text-xs">
                <div className="border border-slate-300 p-4 rounded-xl space-y-3">
                  <div className="font-bold text-sm text-slate-900 border-b pb-1">ARUS KAS MASUK</div>
                  {reportData?.cashIn?.map((ci: any, idx: number) => (
                    <div key={idx} className="flex justify-between pl-3">
                      <span>{ci.description} ({ci.trans_date}):</span>
                      <span className="text-emerald-700 font-semibold">+Rp{ci.amount?.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t pt-1 text-emerald-800">
                    <span>TOTAL KAS MASUK:</span>
                    <span>Rp{reportData?.totalCashIn?.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="font-bold text-sm text-slate-900 border-b pb-1 pt-3">ARUS KAS KELUAR</div>
                  {reportData?.cashOut?.map((co: any, idx: number) => (
                    <div key={idx} className="flex justify-between pl-3">
                      <span>{co.description} ({co.trans_date}):</span>
                      <span className="text-rose-700 font-semibold">−Rp{co.amount?.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t pt-1 text-rose-800">
                    <span>TOTAL KAS KELUAR:</span>
                    <span>Rp{reportData?.totalCashOut?.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between font-black text-sm bg-slate-100 p-3 rounded-xl mt-4">
                    <span>ARUS KAS BERSIH:</span>
                    <span>Rp{reportData?.netCashFlow?.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Kolom Tanda Tangan Resmi Pengurus BUMKAM */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
          <div>
            <p className="text-slate-500">Mengetahui,</p>
            <p className="font-bold text-slate-900 mt-1">Direktur / Ketua BUMKAM Hen Wani</p>
            <div className="h-16"></div>
            <p className="font-bold text-slate-900 underline">Silas Itaar</p>
            <p className="text-[10px] text-slate-400">Kampung Enggros</p>
          </div>

          <div>
            <p className="text-slate-500">Kampung Enggros, {new Date().toLocaleDateString('id-ID')}</p>
            <p className="font-bold text-slate-900 mt-1">Bendahara BUMKAM</p>
            <div className="h-16"></div>
            <p className="font-bold text-slate-900 underline">Maria Haay</p>
            <p className="text-[10px] text-slate-400">Pengelola Keuangan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
