'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User, ArrowRight, Droplets, Smartphone, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Gagal login. Periksa username dan password.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setErrorMsg('Gagal terhubung ke server.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* SISI KIRI: Visual Hero Ilustrasi Usaha Galon & Telko Digital */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            {/* Tag Lembaga */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                BUMKAM Hen Wani • Kampung Enggros
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                Distrik Abepura, Kota Jayapura
              </span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Sistem Informasi Keuangan Terpadu
              </h1>
              <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
                Platform digital pencatatan akuntansi dan operasional untuk dua unit usaha utama Kampung Enggros: <span className="text-sky-400 font-semibold">Penjualan Air Galon</span> dan <span className="text-blue-400 font-semibold">Usaha Pulsa / Telko Digital</span>.
              </p>
            </div>

            {/* Banner Gambar Ilustrasi */}
            <div className="relative group rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900">
              <img
                src="/login-hero.jpg"
                alt="Ilustrasi Usaha Depot Air Galon dan Pulsa Telko Digital BUMKAM Hen Wani"
                className="w-full h-56 sm:h-72 lg:h-80 object-cover object-center transform group-hover:scale-102 transition duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent"></div>
              
              {/* Overlay Keterangan Gambar */}
              <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Unit Usaha Air Galon & Pulsa Telko Digital
                  </p>
                  <p className="text-[11px] text-slate-300">
                    BUMKAM Hen Wani, Kampung Enggros, Jayapura, Papua
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur border border-white/20 text-white uppercase tracking-wider hidden sm:inline-block">
                  Satu Input — Akuntansi Otomatis
                </span>
              </div>
            </div>

            {/* 2 Kartu Penjelasan Unit Usaha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Kartu Usaha 1: Air Galon */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 transition duration-300 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Unit Usaha Air Galon</h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Kontrol depot isi ulang, pemantauan 4 status tabung (Tersedia, Pelanggan, Kembali, Rusak), penjualan tunai & tempo.
                  </p>
                </div>
              </div>

              {/* Kartu Usaha 2: Pulsa Telko Digital */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 transition duration-300 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Usaha Telko Digital (Pulsa)</h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Transaksi pulsa dan paket kuota data multi-operator, otomatis kalkulasi margin keuntungan dan kontrol deposit modal.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SISI KANAN: Formulir Login */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative">
              
              {/* Header Card dengan Logo BUMKAM */}
              <div className="text-center mb-6">
                <div className="inline-flex p-1.5 rounded-2xl bg-gradient-to-tr from-sky-500/30 to-blue-600/30 border border-sky-500/30 shadow-lg shadow-sky-500/10 mb-3">
                  <img
                    src="/logo.png"
                    alt="Logo BUMKAM Finance"
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">BUMKAM Finance</h2>
                <p className="text-xs text-sky-400 font-medium mt-0.5">Portal Masuk Pengelola</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Masukkan identitas pengguna untuk mengakses sistem
                </p>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping shrink-0"></span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form Input */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Nama Pengguna (Username)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Contoh: admin atau operator"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Kata Sandi (Password)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      className="w-full pl-10 pr-12 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-5 py-3.5 px-4 bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 text-sm transition duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Masuk ke Sistem Keuangan</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Box Akun Cepat (Quick-Login) */}
              <div className="mt-6 pt-5 border-t border-slate-800">
                <p className="text-[11px] text-slate-400 mb-2.5 font-medium text-center">
                  Klik akun di bawah untuk pengisian cepat:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                    className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-left transition group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">Admin</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400/70" />
                    </div>
                    <span className="text-slate-400 text-[10px] block mt-0.5">admin / admin123</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUsername('operator'); setPassword('operator123'); }}
                    className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-left transition group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">Bendahara</span>
                      <User className="w-3.5 h-3.5 text-emerald-400/70" />
                    </div>
                    <span className="text-slate-400 text-[10px] block mt-0.5">operator / operator123</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Footer Akademik & Lembaga Resmi */}
      <footer className="relative z-10 py-5 px-4 sm:px-6 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/80 backdrop-blur leading-relaxed">
        <p>© 2026 BUMKAM Hen Wani — Kampung Enggros • Kelompok 5 Kelas C • Teknologi Digital Akuntansi • S1 Akuntansi FEB Uncen • All rights reserved.</p>
      </footer>
    </div>
  );
}
