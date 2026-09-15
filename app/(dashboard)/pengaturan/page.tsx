'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  UserPlus,
  Users,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
} from 'lucide-react';

export default function PengaturanPage() {
  const [profile, setProfile] = useState<any>({
    name: '',
    village_name: '',
    address: '',
    phone: '',
  });

  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'operator',
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/profile').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ])
      .then(([profRes, userRes]) => {
        if (profRes.success) setProfile(profRes.data);
        if (userRes.success) setUsers(userRes.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.message || 'Gagal memperbarui profil.' });
      } else {
        setMessage({ type: 'success', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setMessage(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.message || 'Gagal membuat pengguna.' });
      } else {
        setMessage({ type: 'success', text: data.message });
        setNewUser({ username: '', password: '', full_name: '', role: 'operator' });
        fetchSettings();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-slate-700" />
            <span>Pengaturan Profil Lembaga & Pengguna</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Konfigurasi identitas BUMKAM Hen Wani dan manajemen akun operator/bendahara.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-slate-700' : ''}`} />
        </button>
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

      {/* Grid 2 Kolom: Profil BUMKAM & User Baru */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FORM PROFIL BUMKAM */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
            <Store className="w-5 h-5 text-sky-600" />
            <span>Identitas BUMKAM</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Informasi ini otomatis tercetak pada kop surat laporan dan nota transaksi.
          </p>

          <form onSubmit={handleProfileSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama BUMKAM</label>
              <input
                type="text"
                required
                value={profile.name || ''}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kampung / Wilayah</label>
              <input
                type="text"
                required
                value={profile.village_name || ''}
                onChange={(e) => setProfile({ ...profile, village_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Kantor / Depot</label>
              <input
                type="text"
                value={profile.address || ''}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Kontak / Telepon</label>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
            >
              {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
            </button>
          </form>
        </div>

        {/* FORM TAMBAH USER */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            <span>Tambah Pengguna Baru</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Buat akun akses untuk bendahara atau operator kasir baru.
          </p>

          <form onSubmit={handleCreateUserSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Petugas</label>
              <input
                type="text"
                required
                placeholder="Contoh: Maria Haay"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
              <input
                type="text"
                required
                placeholder="Contoh: maria_bendahara"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="Minimal 6 karakter"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hak Akses (Role)</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="operator">Operator / Bendahara (Input Harian)</option>
                <option value="admin">Administrator (Penuh & Void)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={creatingUser}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
            >
              {creatingUser ? 'Membuat Akun...' : 'Daftarkan Pengguna'}
            </button>
          </form>
        </div>
      </div>

      {/* TABEL PENGGUNA TERDAFTAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">Daftar Akun Pengguna Terdaftar</h3>
          <p className="text-xs text-slate-500">Akses pengguna aktif pada sistem BUMKAM Finance</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Peran (Role)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Waktu Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{u.full_name}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">@{u.username}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-100 text-emerald-800">
                      AKTIF
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">{u.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
