import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, query, orderBy 
} from 'firebase/firestore';
import { 
  ShieldCheck, Loader2, Plus, X, BarChart3, FileText, 
  LogOut, CheckCircle, Award, FileSpreadsheet, Calendar
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

  // State untuk Form Input (Sesuai fungsi asli)
  const [newReport, setNewReport] = useState({
    title: '', target: '', realisasi: '', satuan: 'Dokumen', kategori: 'Utama'
  });

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
    // Mengambil data laporan secara real-time
    const unsubReports = onSnapshot(collection(db, "reports"), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubReports();
  }, [user]);

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

  // === FUNGSI UTAMA: INPUT KINERJA KE FIREBASE ===
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    try {
      // Menambahkan data ke koleksi 'reports' di Firebase
      await addDoc(collection(db, "reports"), {
        title: newReport.title,
        target: Number(newReport.target),
        realisasi: Number(newReport.realisasi),
        satuan: newReport.satuan,
        kategori: newReport.kategori,
        userId: user.id,
        userName: user.name,
        month: selectedMonth,
        year: selectedYear,
        status: 'pending',
        nilai: 0,
        createdAt: serverTimestamp()
      });
      
      setShowReportModal(false);
      setNewReport({ title: '', target: '', realisasi: '', satuan: 'Dokumen', kategori: 'Utama' });
      alert("Laporan Berhasil Terkirim!");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan laporan. Pastikan koneksi internet stabil.");
    }
  };

  const filteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (user?.role === 'pegawai') res = res.filter(r => r.userId === user.id);
    return res;
  }, [reports, user, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const total = filteredReports.length;
    const selesai = filteredReports.filter(r => r.status === 'selesai').length;
    const avgNilai = total > 0 ? (filteredReports.reduce((acc, curr) => acc + (Number(curr.nilai) || 0), 0) / total).toFixed(2) : 0;
    return { total, selesai, avgNilai };
  }, [filteredReports]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (isAuthModalOpen) return (
    <div className="h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
        <h1 className="text-3xl font-black text-center mb-8 text-slate-800 tracking-tighter">PIRU LOGIN</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center">{authError}</div>}
          <input type="text" placeholder="Username" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" 
            onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-4 bg-slate-100 rounded-2xl outline-none" 
            onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">MASUK</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="w-64 bg-white border-r p-8 flex flex-col hidden md:flex">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-indigo-600 p-2 rounded-xl text-white"><ShieldCheck size={24}/></div>
          <span className="font-black text-2xl text-slate-800">PIRU</span>
        </div>
        <nav className="flex-1 space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><BarChart3 size={22}/> Dashboard</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><FileText size={22}/> Laporan</button>
        </nav>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} className="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 mt-auto"><LogOut size={22}/> Keluar</button>
      </div>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-black text-slate-800">Halo, {user.name}</h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{user.role} • BPS SBB</p>
            </div>
            <div className="flex items-center gap-4">
                <select className="bg-white border-none rounded-xl px-4 py-2 font-bold shadow-sm" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>Bulan {m}</option>)}
                </select>
                {user.role === 'pegawai' && (
                    <button onClick={() => setShowReportModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-indigo-700 flex items-center gap-2"><Plus size={20}/> LAPOR</button>
                )}
            </div>
        </header>

        {activeTab === 'dashboard' ? (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                        <p className="text-slate-400 text-xs font-black uppercase mb-2">Kegiatan</p>
                        <p className="text-5xl font-black">{stats.total}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 text-green-600">
                        <p className="text-slate-400 text-xs font-black uppercase mb-2">Disetujui</p>
                        <p className="text-5xl font-black">{stats.selesai}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 text-amber-500">
                        <p className="text-slate-400 text-xs font-black uppercase mb-2">Nilai Rata-rata</p>
                        <p className="text-5xl font-black">{stats.avgNilai}</p>
                    </div>
                </div>
                <div className="bg-indigo-900 rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8">
                    <h2 className="text-3xl font-black">Laporan Bulan {selectedMonth}</h2>
                    <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/10 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">"Kinerja Anda kebanggaan kami"</p>
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Kegiatan</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-center">Realisasi/Target</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-center">Status</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-center">Nilai</th>
                                {(user.role === 'admin' || user.role === 'pimpinan') && <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-center">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredReports.length === 0 ? (
                                <tr><td colSpan="5" className="p-10 text-center text-slate-400 italic font-medium">Belum ada laporan di bulan ini.</td></tr>
                            ) : filteredReports.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/50">
                                    <td className="p-6">
                                        <p className="font-bold text-slate-800">{r.title}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{r.userName} • {r.kategori}</p>
                                    </td>
                                    <td className="p-6 text-center font-bold text-slate-600">{r.realisasi} / {r.target} {r.satuan}</td>
                                    <td className="p-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${r.status === 'selesai' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-center font-black text-xl text-indigo-600">{r.nilai || '-'}</td>
                                    {(user.role === 'admin' || user.role === 'pimpinan') && (
                                        <td className="p-6 text-center">
                                            {r.status === 'pending' && (
                                                <button onClick={async () => {
                                                    const n = prompt("Berikan Nilai (0-100):", "85");
                                                    if(n) await updateDoc(doc(db, "reports", r.id), { status: 'selesai', nilai: Number(n) });
                                                }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-700 shadow-md">NILAI</button>
                                            )}
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

      {/* MODAL INPUT LAPORAN (FUNGSI UTAMA) */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmitReport} className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl space-y-5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Kirim Laporan</h3>
                    <button type="button" onClick={() => setShowReportModal(false)}><X size={32} className="text-slate-300 hover:text-red-500"/></button>
                </div>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Nama Kegiatan</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" 
                            onChange={e => setNewReport({...newReport, title: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Target</label>
                            <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" 
                                onChange={e => setNewReport({...newReport, target: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Realisasi</label>
                            <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" 
                                onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
                        </div>
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
                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest">KIRIM LAPORAN KINERJA</button>
            </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
