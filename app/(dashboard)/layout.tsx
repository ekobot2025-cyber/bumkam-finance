'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Smartphone,
  Droplets,
  Users,
  CreditCard,
  Wallet,
  TrendingUp,
  FileText,
  BookOpen,
  History,
  Settings,
  CheckCircle2,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface UserSession {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'operator';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Unit Pulsa', href: '/pulsa', icon: Smartphone },
    { name: 'Unit Galon', href: '/galon', icon: Droplets },
    { name: 'Pelanggan', href: '/pelanggan', icon: Users },
    { name: 'Piutang', href: '/piutang', icon: CreditCard },
    { name: 'Buku Kas', href: '/kas', icon: Wallet },
    { name: 'Hasil Usaha', href: '/hasil-usaha', icon: TrendingUp },
    { name: 'Laporan', href: '/laporan', icon: FileText },
    { name: 'Akuntansi (COA & Jurnal)', href: '/akuntansi', icon: BookOpen },
    { name: 'Verifikasi TEST 01-12', href: '/pengujian', icon: CheckCircle2, highlight: true },
    ...(user?.role === 'admin'
      ? [
          { name: 'Audit Trail / Log', href: '/audit-log', icon: History },
          { name: 'Pengaturan & User', href: '/pengaturan', icon: Settings },
        ]
      : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Memuat BUMKAM Finance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md no-print">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white leading-tight">BUMKAM Finance</h1>
            <p className="text-[10px] text-sky-400">Kampung Enggros</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            user?.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            {user?.role === 'admin' ? 'Admin' : 'Bendahara'}
          </span>
          <button
            onClick={handleLogout}
            title="Keluar"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-72 bg-slate-900 text-slate-300 flex flex-col z-50 transition-transform duration-300 ease-in-out border-r border-slate-800 no-print ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Section */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
              BF
            </div>
            <div>
              <h2 className="font-bold text-white text-base leading-tight">BUMKAM Hen Wani</h2>
              <p className="text-xs text-sky-400 font-medium">Kampung Enggros</p>
              <p className="text-[10px] text-slate-400">Pulsa & Depot Galon</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Menu Operasional
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 font-semibold'
                    : item.highlight
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-white/70" />}
              </Link>
            );
          })}
        </nav>

        {/* User Card at Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs uppercase">
                {user?.username?.substring(0, 2) || 'US'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
                <p className="text-[10px] text-slate-400 capitalize">{user?.role === 'admin' ? 'Administrator' : 'Bendahara / Operator'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Desktop Top Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs no-print">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Sistem Informasi Keuangan BUMKAM</h1>
            <p className="text-xs text-slate-500">Prinsip Satu Input — Stok, Kas, Piutang, & Jurnal Terintegrasi Otomatis</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-800">{user?.full_name}</p>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                user?.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {user?.role === 'admin' ? 'Hak Akses: ADMIN' : 'Hak Akses: OPERATOR'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-slate-200 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
