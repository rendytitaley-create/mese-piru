import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { 
  User, Users, CheckCircle, FileText, LogOut, Award, ShieldCheck, 
  Loader2, Plus, X, BarChart3, Calendar, Trash2, Download, FileSpreadsheet, 
  Percent, ChevronRight, AlertCircle, Save
} from 'lucide-react';
import * as XLSX from 'xlsx';

// === CONFIG FIREBASE ANDA ===
const firebaseConfig = {
  apiKey: "AIzaSyDVRt3zgojeVh8ek61yXFQ9r9ihpOt7BqQ",
  authDomain: "piru8106-b4f0a.firebaseapp.com",
  projectId: "piru8106-b4f0a",
  storageBucket: "piru8106-b4f0a.firebasestorage.app",
  messagingSenderId: "948735762696",
  appId: "1:948735762696:web:43674d0341fc8b05e14cbd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const PIRUApp = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Form State untuk Laporan (Sesuai File Asli)
  const [newReport, setNewReport] = useState({
    title: '', target: '', realisasi: '', satuan: 'Dokumen', kategori: 'Utama', keterangan: ''
  });

  // Sinkronisasi Auth & Data
  useEffect(() => {
    signInAnonymously(auth);
    const unsubscribe = onAuthStateChanged(auth, (fUser) => {
      const saved = localStorage.getItem('piru_session_final');
      if (saved) { setUser(JSON.parse(saved)); setIsAuthModalOpen(false); }
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubscribe(); unsubUsers(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubReports = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubReports();
  }, [user]);

  // Handler Login
  const handleLogin = (e) => {
    e.preventDefault();
    const found = users.find(u => 
      u.username?.toString().trim() === authForm.username.trim() && 
      u.password?.toString().trim() === authForm.password.trim()
    );
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session_final', JSON.stringify(found));
      setIsAuthModalOpen(false);
    } else {
      setAuthError('Username/Password salah!');
    }
  };

  // Fungsi Export Excel (Fitur Asli)
  const exportToExcel = () => {
    const dataToExport = filteredReports.map(r => ({
      'Nama Pegawai': r.userName,
      'Kegiatan': r.title,
      'Kategori': r.kategori,
      'Target': r.target,
      'Realisasi': r.realisasi,
      'Satuan': r.satuan,
      'Capaian (%)': ((r.realisasi / r.target) * 100).toFixed(2),
      'Nilai Pimpinan': r.nilai || 0,
      'Status': r.status
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan PIRU");
    XLSX.writeFile(wb, `Laporan_PIRU_${selectedMonth}_${selectedYear}.xlsx`);
  };

  // Filter Data Berdasarkan Bulan & Tahun (Fitur Asli)
  const filteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (user?.role === 'pegawai') res = res.filter(r => r.userId === user.id);
    return res;
  }, [reports, user, selectedMonth, selectedYear]);

  // Statistik (Fitur Asli)
  const stats = useMemo(() => {
    const total = filteredReports.length;
    const selesai = filteredReports.filter(r => r.status === 'selesai').length;
    const avgNilai = total > 0 ? (filteredReports.reduce((acc, curr) => acc + (Number(curr.nilai) || 0), 0) / total).toFixed(2) : 0;
    return { total, selesai, avgNilai };
  }, [filteredReports]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (isAuthModalOpen) {
    return (
      <div className="h-screen bg-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
          <div className="text-center mb-8">
              <ShieldCheck size={60} className="mx-auto text-indigo-600 mb-2" />
              <h1 className="text-3xl font-black text-slate-800">PIRU LOGIN</h1>
              <p className="text-slate-400 text-sm font-bold">BPS KAB. SERAM BAGIAN BARAT</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100">{authError}</div>}
            <input type="text" placeholder="Username" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" 
              onChange={e => setAuthForm({...authForm, username: e.target.value})} />
            <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" 
              onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">MASUK</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Sesuai Fitur Asli */}
      <div className="w-72 bg-white border-r p-8 flex flex-col hidden md:flex">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white"><ShieldCheck size={24}/></div>
          <span className="font-black text-2xl text-slate-800">PIRU</span>
        </div>
        <nav className="flex-1 space-y-3">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><BarChart3 size={22}/> Dashboard</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={22}/> Laporan Kerja</button>
          {user.role === 'admin' && <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={22}/> Kelola Pegawai</button>}
        </nav>
        <button onClick={() => {localStorage.removeItem('piru_session_final'); window.location.reload();}} className="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 mt-auto transition-all"><LogOut size={22}/> Keluar</button>
      </div>

      {/* Konten Utama */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-800">Halo, {user.name} 👋</h1>
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                    <span>{user.role}</span> • <span>BPS Kab. SBB</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-600 shadow-sm" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                    {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
                <button onClick={exportToExcel} className="bg-green-600 text-white p-2.5 rounded-xl shadow-lg hover:bg-green-700 transition-all"><FileSpreadsheet size={20}/></button>
                {user.role === 'pegawai' && (
                    <button onClick={() => setShowReportModal(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black shadow-lg hover:bg-indigo-700 flex items-center gap-2 transition-all"><Plus size={20}/> LAPOR</button>
                )}
            </div>
        </header>

        {activeTab === 'dashboard' ? (
            <div className="space-y-8">
                {/* Kartu Statistik Fitur Asli */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-8 text-indigo-50 group-hover:text-indigo-100 transition-colors"><FileText size={80}/></div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Total Kegiatan</p>
                        <p className="text-5xl font-black text-slate-800">{stats.total}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-8 text-green-50 group-hover:text-green-100 transition-colors"><CheckCircle size={80}/></div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Selesai Dinilai</p>
                        <p className="text-5xl font-black text-green-600">{stats.selesai}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-8 text-amber-50 group-hover:text-amber-100 transition-colors"><Award size={80}/></div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Rata-rata Nilai</p>
                        <p className="text-5xl font-black text-amber-500">{stats.avgNilai}</p>
                    </div>
                </div>

                {/* Banner Motivasi Fitur Asli */}
                <div className="bg-indigo-900 rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black tracking-tight">Capaian Kinerja {user.name}</h2>
                        <p className="text-indigo-200 font-medium">Bulan {selectedMonth} Tahun {selectedYear}</p>
                    </div>
                    <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/10 text-center min-w-[200px]">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status Capaian</p>
                        <p className="text-2xl font-black">{stats.avgNilai >= 90 ? "SANGAT BAIK" : stats.avgNilai >= 80 ? "BAIK" : "CUKUP"}</p>
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Kegiatan</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Realisasi/Target</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Nilai</th>
                                {(user.role === 'admin' || user.role === 'pimpinan') && <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredReports.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                                    <td className="p-6">
                                        <p className="font-bold text-slate-800">{r.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-black uppercase">{r.kategori}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{r.userName}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center font-bold text-slate-600">
                                        {r.realisasi} / {r.target} <span className="text-[10px] text-slate-400 ml-1">{r.satuan}</span>
                                        <div className="w-20 bg-slate-100 h-1 rounded-full mt-2 mx-auto overflow-hidden">
                                            <div className="bg-indigo-500 h-full" style={{width: `${Math.min((r.realisasi/r.target)*100, 100)}%`}}></div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${r.status === 'selesai' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-center font-black text-xl text-indigo-600">{r.nilai || '-'}</td>
                                    {(user.role === 'admin' || user.role === 'pimpinan') && (
                                        <td className="p-6 text-center">
                                            {r.status === 'pending' ? (
                                                <button onClick={async () => {
                                                    const n = prompt("Berikan Nilai (0-100):", "85");
                                                    if(n) await updateDoc(doc(db, "reports", r.id), { status: 'selesai', nilai: Number(n) });
                                                }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 transition-all shadow-md">Nilai</button>
                                            ) : <CheckCircle size={20} className="text-green-500 mx-auto"/>}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </main>

      {/* Modal Lapor Fitur Asli */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <form onSubmit={async (e) => {
                e.preventDefault();
                await addDoc(collection(db, "reports"), {
                    ...newReport, userId: user.id, userName: user.name, month: selectedMonth, year: selectedYear,
                    status: 'pending', nilai: 0, createdAt: serverTimestamp()
                });
                setShowReportModal(false);
                setNewReport({ title: '', target: '', realisasi: '', satuan: 'Dokumen', kategori: 'Utama', keterangan: '' });
            }} className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Kirim Laporan</h3>
                    <button type="button" onClick={() => setShowReportModal(false)} className="text-slate-300 hover:text-red-500"><X size={32}/></button>
                </div>
                <div className="space-y-4">
                    <input required type="text" placeholder="Nama Kegiatan" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" 
                        onChange={e => setNewReport({...newReport, title: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <input required type="number" placeholder="Target" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" 
                            onChange={e => setNewReport({...newReport, target: e.target.value})} />
                        <input required type="number" placeholder="Realisasi" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" 
                            onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" onChange={e => setNewReport({...newReport, satuan: e.target.value})}>
                            <option>Dokumen</option><option>Berkas</option><option>Kegiatan</option><option>O-B</option>
                        </select>
                        <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" onChange={e => setNewReport({...newReport, kategori: e.target.value})}>
                            <option>Utama</option><option>Tambahan</option>
                        </select>
                    </div>
                </div>
                <button className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest">KIRIM LAPORAN</button>
            </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
