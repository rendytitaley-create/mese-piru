import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, deleteDoc, query, where, orderBy 
} from 'firebase/firestore';
import { 
  User, Users, CheckCircle, FileText, LogOut, Award, ChevronRight, 
  ClipboardList, ShieldCheck, Loader2, Send, Search, Filter, Trash2, 
  Calendar, BarChart3, Clock, CheckCircle2, AlertCircle, Plus, X, 
  Calculator, Download, FileSpreadsheet, Percent, Lock, UserPlus, 
  Settings, Building2, WifiOff, Wifi, Save, ChevronLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';

// === KONFIGURASI FIREBASE ===
const firebaseConfig = {
  apiKey: "AIzaSyDVRt3zgojeVh8ek61yXFQ9r9ihpOt7BqQ",
  authDomain: "piru8106-b4f0a.firebaseapp.com",
  projectId: "piru8106-b4f0a",
  storageBucket: "piru8106-b4f0a.firebasestorage.app",
  messagingSenderId: "948735762696",
  appId: "1:948735762696:web:43674d0341fc8b05e14cbd"
};

// Inisialisasi
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const PIRUApp = () => {
  // === STATE UTAMA ===
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

  // Form Laporan Baru
  const [newReport, setNewReport] = useState({
    title: '',
    target: '',
    realisasi: '',
    satuan: 'Dokumen',
    kategori: 'Utama',
    keterangan: ''
  });

  // === SISTEM AUTH & SYNC ===
  useEffect(() => {
    signInAnonymously(auth).catch(e => console.error("Firebase Auth Error"));
    
    const unsubscribe = onAuthStateChanged(auth, (fUser) => {
      const saved = localStorage.getItem('piru_session_final');
      if (saved) {
        setUser(JSON.parse(saved));
        setIsAuthModalOpen(false);
      }
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubscribe(); unsubUsers(); };
  }, []);

  // Sync Data Laporan
  useEffect(() => {
    if (!user) return;
    const unsubReports = onSnapshot(collection(db, "reports"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(data);
    });
    return () => unsubReports();
  }, [user]);

  // === HANDLER LOGIN ===
  const handleLogin = (e) => {
    e.preventDefault();
    const found = users.find(u => 
      u.username.toString().trim() === authForm.username.trim() && 
      u.password.toString().trim() === authForm.password.trim()
    );
    
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session_final', JSON.stringify(found));
      setIsAuthModalOpen(false);
    } else {
      setAuthError('Username atau Password salah!');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('piru_session_final');
    window.location.reload();
  };

  // === HANDLER LAPORAN ===
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "reports"), {
        ...newReport,
        userId: user.id,
        userName: user.name,
        month: selectedMonth,
        year: selectedYear,
        status: 'pending',
        nilai: 0,
        createdAt: serverTimestamp()
      });
      setShowReportModal(false);
      setNewReport({ title: '', target: '', realisasi: '', satuan: 'Dokumen', kategori: 'Utama', keterangan: '' });
      alert("Laporan berhasil dikirim!");
    } catch (err) {
      alert("Gagal mengirim laporan.");
    }
  };

  const handleApprove = async (reportId, nilai) => {
    await updateDoc(doc(db, "reports", reportId), {
      status: 'selesai',
      nilai: Number(nilai)
    });
  };

  // === LOGIKA FILTER & PERHITUNGAN ===
  const filteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (user?.role === 'pegawai') res = res.filter(r => r.userId === user.id);
    return res;
  }, [reports, user, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const total = filteredReports.length;
    const selesai = filteredReports.filter(r => r.status === 'selesai').length;
    const avgNilai = total > 0 ? (filteredReports.reduce((acc, curr) => acc + (curr.nilai || 0), 0) / total).toFixed(2) : 0;
    return { total, selesai, avgNilai };
  }, [filteredReports]);

  // === TAMPILAN ===
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (isAuthModalOpen) return (
    <div className="h-screen bg-indigo-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
        <div className="text-center mb-8">
            <div className="bg-indigo-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                <ShieldCheck size={40} />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter">PIRU LOGIN</h1>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mt-1">BPS Kabupaten SBB</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          {authError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold text-center border border-red-100 animate-pulse">{authError}</div>}
          <div className="space-y-1">
            <input type="text" placeholder="Username" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
              onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          </div>
          <div className="space-y-1">
            <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
              onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black shadow-xl shadow-indigo-200 active:scale-95 transition-all uppercase tracking-widest">Masuk ke Sistem</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r p-8 flex flex-col hidden md:flex">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-200"><ShieldCheck size={24}/></div>
          <span className="font-black text-2xl text-slate-800 tracking-tighter">PIRU</span>
        </div>
        <nav className="flex-1 space-y-3">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><BarChart3 size={22}/> Dashboard</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={22}/> Laporan Kerja</button>
          {user.role === 'admin' && <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={22}/> Kelola Pegawai</button>}
        </nav>
        <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all mt-auto"><LogOut size={22}/> Keluar</button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Halo, {user.name} 👋</h1>
                <p className="text-slate-400 font-medium">BPS Kabupaten Seram Bagian Barat</p>
            </div>
            <div className="flex items-center gap-4">
                <select className="bg-white border-none rounded-2xl px-4 py-3 font-bold text-slate-600 shadow-sm" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                    {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>Bulan {i+1}</option>)}
                </select>
                {user.role === 'pegawai' && (
                    <button onClick={() => setShowReportModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all"><Plus size={20}/> LAPOR</button>
                )}
            </div>
        </header>

        {activeTab === 'dashboard' ? (
            <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-8 text-indigo-50 group-hover:text-indigo-100 transition-colors"><FileText size={80}/></div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Total Kegiatan</p>
                        <p className="text-5xl font-black text-slate-800">{stats.total}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-8 text-green-50 group-hover:text-green-100 transition-colors"><CheckCircle2 size={80}/></div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Selesai Dinilai</p>
                        <p className="text-5xl font-black text-green-600">{stats.selesai}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-8 text-amber-50 group-hover:text-amber-100 transition-colors"><Award size={80}/></div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Rata-rata Nilai</p>
                        <p className="text-5xl font-black text-amber-500">{stats.avgNilai}</p>
                    </div>
                </div>

                <div className="bg-indigo-900 rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-200">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black tracking-tight">Sudah lapor kegiatan hari ini?</h2>
                        <p className="text-indigo-200 font-medium">Jangan lupa untuk mendokumentasikan setiap capaian kinerja Anda.</p>
                    </div>
                    <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/10">
                        <Calendar className="mb-2 opacity-50"/>
                        <p className="text-sm font-bold opacity-60">Periode Aktif</p>
                        <p className="text-xl font-black">Bulan {selectedMonth}, {selectedYear}</p>
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter">Daftar Laporan Kinerja</h3>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total: {filteredReports.length} Laporan</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Kegiatan</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Target</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Realisasi</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Nilai</th>
                                {(user.role === 'admin' || user.role === 'pimpinan') && <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredReports.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6">
                                        <p className="font-bold text-slate-800">{r.title}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{r.userName}</p>
                                    </td>
                                    <td className="p-6 text-center font-bold text-slate-600">{r.target} {r.satuan}</td>
                                    <td className="p-6 text-center font-bold text-slate-600">{r.realisasi} {r.satuan}</td>
                                    <td className="p-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${r.status === 'selesai' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-center font-black text-lg text-indigo-600">{r.nilai || '-'}</td>
                                    {(user.role === 'admin' || user.role === 'pimpinan') && (
                                        <td className="p-6 text-center">
                                            {r.status === 'pending' ? (
                                                <button onClick={() => {
                                                    const n = prompt("Berikan Nilai (0-100):", "85");
                                                    if(n) handleApprove(r.id, n);
                                                }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">Nilai</button>
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

      {/* Modal Laporan */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmitReport} className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Kirim Laporan Baru</h3>
                    <button type="button" onClick={() => setShowReportModal(false)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={32}/></button>
                </div>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">Nama Kegiatan</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" 
                            onChange={e => setNewReport({...newReport, title: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">Target</label>
                            <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" 
                                onChange={e => setNewReport({...newReport, target: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">Realisasi</label>
                            <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" 
                                onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
                        </div>
                    </div>
                </div>
                <button className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-widest">Kirim Laporan Kinerja</button>
            </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
