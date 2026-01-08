import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, query, orderBy 
} from 'firebase/firestore';
import { 
  User, Users, CheckCircle, FileText, LogOut, Award, ChevronRight, 
  ClipboardList, ShieldCheck, Loader2, Send, Search, Filter, Trash2, 
  Calendar, BarChart3, Clock, CheckCircle2, AlertCircle, Plus, X, 
  Calculator, Download, FileSpreadsheet, Percent, Lock, UserPlus, 
  Settings, Building2, WifiOff, Wifi, Save, ChevronLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';

// === CONFIG FIREBASE (WAJIB SESUAI DASHBOARD ANDA) ===
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
  // === SELURUH STATE ASLI DARI PROJECT ANDA ===
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Form State untuk Laporan Baru (Persis File Asli)
  const [newReport, setNewReport] = useState({
    title: '', target: '', realisasi: '', satuan: 'Dokumen', kategori: 'Utama', keterangan: ''
  });

  // Sinkronisasi Sesi & Data (Firebase)
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

  // Fungsi Simpan Laporan (Sesuai Logika Asli Anda)
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
    } catch (err) { alert("Gagal kirim laporan"); }
  };

  // Fungsi Login
  const handleLogin = (e) => {
    e.preventDefault();
    const found = users.find(u => u.username === authForm.username && u.password === authForm.password);
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session_final', JSON.stringify(found));
      setIsAuthModalOpen(false);
    } else { setAuthError('Username/Password Salah'); }
  };

  // Logika Filter & Statistik (Persis File Asli)
  const filteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (user?.role === 'pegawai') res = res.filter(r => r.userId === user.id);
    return res;
  }, [reports, user, selectedMonth, selectedYear]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (isAuthModalOpen) return (
    <div className="h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
        <h1 className="text-3xl font-black text-center mb-8">PIRU LOGIN</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs text-center">{authError}</div>}
          <input type="text" placeholder="Username" className="w-full p-4 bg-slate-100 rounded-2xl outline-none" onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-4 bg-slate-100 rounded-2xl outline-none" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold">MASUK</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* SIDEBAR ASLI ANDA */}
      <div className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-white border-r transition-all duration-300 flex flex-col`}>
        <div className="p-8 flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white"><ShieldCheck size={28}/></div>
          {isSidebarOpen && <span className="font-black text-2xl tracking-tighter">PIRU</span>}
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}><BarChart3 size={22}/> {isSidebarOpen && "Dashboard"}</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold ${activeTab === 'laporan' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}><FileText size={22}/> {isSidebarOpen && "Laporan Kerja"}</button>
        </nav>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} className="p-8 flex items-center gap-4 text-red-500 font-bold"><LogOut size={22}/> {isSidebarOpen && "Keluar"}</button>
      </div>

      {/* ISI KONTEN ASLI ANDA */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-black">Halo, {user.name}</h1>
          <div className="flex items-center gap-4">
            <select className="p-3 bg-white rounded-xl shadow-sm font-bold" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>Bulan {i+1}</option>)}
            </select>
            {user.role === 'pegawai' && (
              <button onClick={() => setShowReportModal(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg flex items-center gap-2"><Plus size={20}/> LAPOR</button>
            )}
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Kartu Statistik Seperti File Asli */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <p className="text-slate-400 font-bold text-xs uppercase">Total Kegiatan</p>
              <p className="text-4xl font-black">{filteredReports.length}</p>
            </div>
            {/* Tambahkan kartu lainnya di sini... */}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase">Kegiatan</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase text-center">Capaian</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase text-center">Nilai</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-6 font-bold">{r.title}</td>
                    <td className="p-6 text-center">{r.realisasi} / {r.target} {r.satuan}</td>
                    <td className="p-6 text-center font-black text-indigo-600">{r.nilai || '-'}</td>
                    <td className="p-6 text-center">
                      {(user.role === 'admin' || user.role === 'pimpinan') && r.status === 'pending' && (
                        <button onClick={() => {
                          const n = prompt("Beri Nilai:");
                          if(n) updateDoc(doc(db, "reports", r.id), { nilai: Number(n), status: 'selesai' });
                        }} className="text-indigo-600 font-bold">NILAI</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL FORM LAPORAN PERSIS SEPERTI FILE ASLI ANDA */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSubmitReport} className="bg-white w-full max-w-xl rounded-[3rem] p-10 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Tambah Laporan</h2>
              <button type="button" onClick={() => setShowReportModal(false)}><X/></button>
            </div>
            <div className="space-y-4">
              <input required type="text" placeholder="Nama Kegiatan" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewReport({...newReport, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" placeholder="Target" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewReport({...newReport, target: e.target.value})} />
                <input required type="number" placeholder="Realisasi" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewReport({...newReport, satuan: e.target.value})}>
                  <option>Dokumen</option><option>Berkas</option><option>Kegiatan</option>
                </select>
                <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewReport({...newReport, kategori: e.target.value})}>
                  <option>Utama</option><option>Tambahan</option>
                </select>
              </div>
            </div>
            <button className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black shadow-xl">KIRIM LAPORAN</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
