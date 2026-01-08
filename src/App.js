import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, query, orderBy, deleteDoc
} from 'firebase/firestore';
import { 
  ShieldCheck, Loader2, Plus, X, BarChart3, FileText, 
  LogOut, CheckCircle, Award, FileSpreadsheet, Trash2, Download,
  Calendar, ClipboardList, Target, TrendingUp
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showReportModal, setShowReportModal] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  // State Form Entri Sesuai Permintaan Baru
  const [newReport, setNewReport] = useState({
    title: '', target: '', realisasi: '', satuan: '', keterangan: ''
  });

  useEffect(() => {
    signInAnonymously(auth);
    const unsubscribe = onAuthStateChanged(auth, (fUser) => {
      const saved = localStorage.getItem('piru_session_final');
      if (saved) { setUser(JSON.parse(saved)); }
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

  const handleLogin = (e) => {
    e.preventDefault();
    const found = users.find(u => u.username === authForm.username && u.password === authForm.password);
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session_final', JSON.stringify(found));
    } else { setAuthError('Username/Password Salah'); }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "reports"), {
        ...newReport,
        target: Number(newReport.target),
        realisasi: Number(newReport.realisasi),
        userId: user.id,
        userName: user.name,
        month: selectedMonth,
        year: selectedYear,
        status: 'pending',
        nilai: 0,
        createdAt: serverTimestamp()
      });
      setShowReportModal(false);
      setNewReport({ title: '', target: '', realisasi: '', satuan: '', keterangan: '' });
    } catch (err) { alert("Gagal menyimpan data."); }
  };

  const filteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (user?.role === 'pegawai') res = res.filter(r => r.userId === user.id);
    return res;
  }, [reports, user, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const total = filteredReports.length;
    const selesai = filteredReports.filter(r => r.status === 'selesai').length;
    const avgNilai = total > 0 ? (filteredReports.reduce((a, b) => a + (Number(b.nilai) || 0), 0) / total).toFixed(1) : 0;
    return { total, selesai, avgNilai };
  }, [filteredReports]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (!user) return (
    <div className="h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
        <div className="text-center mb-8">
          <ShieldCheck size={60} className="mx-auto text-indigo-600 mb-2" />
          <h1 className="text-3xl font-black text-slate-800">PIRU LOGIN</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center">{authError}</div>}
          <input type="text" placeholder="Username" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" 
            onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" 
            onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">MASUK SISTEM</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar Sesuai Project Asli */}
      <div className="w-72 bg-white border-r p-8 flex flex-col hidden md:flex">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-200"><ShieldCheck size={24}/></div>
          <span className="font-black text-2xl text-slate-800 tracking-tighter">PIRU BPS</span>
        </div>
        <nav className="flex-1 space-y-3">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><BarChart3 size={22}/> Dashboard</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={22}/> Laporan Kerja</button>
        </nav>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} className="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all mt-auto"><LogOut size={22}/> Keluar</button>
      </div>

      <main className="flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Halo, {user.name} 👋</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">{user.role} • BPS Kab. Seram Bagian Barat</p>
          </div>
          <div className="flex items-center gap-4">
            <select className="bg-white border border-slate-100 rounded-2xl px-6 py-3 font-black text-slate-600 shadow-sm outline-none" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <button onClick={() => setShowReportModal(true)} className="bg-indigo-600 text-white px-8 py-3.5 rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest text-sm"><Plus size={20}/> Lapor</button>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 relative overflow-hidden group hover:shadow-xl hover:shadow-indigo-50 transition-all">
                <div className="absolute right-0 top-0 p-10 text-indigo-50 group-hover:text-indigo-100 transition-colors"><ClipboardList size={80}/></div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3">Total Kegiatan</p>
                <p className="text-6xl font-black text-slate-800">{stats.total}</p>
              </div>
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 relative overflow-hidden group hover:shadow-xl hover:shadow-green-50 transition-all text-green-600">
                <div className="absolute right-0 top-0 p-10 text-green-50 group-hover:text-green-100 transition-colors"><CheckCircle size={80}/></div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3">Disetujui</p>
                <p className="text-6xl font-black">{stats.selesai}</p>
              </div>
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 relative overflow-hidden group hover:shadow-xl hover:shadow-amber-50 transition-all text-amber-500">
                <div className="absolute right-0 top-0 p-10 text-amber-50 group-hover:text-amber-100 transition-colors"><Award size={80}/></div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3">Rata-rata Nilai</p>
                <p className="text-6xl font-black">{stats.avgNilai}</p>
              </div>
            </div>

            <div className="bg-indigo-900 rounded-[3.5rem] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-200">
              <div className="space-y-3">
                <h2 className="text-4xl font-black tracking-tighter uppercase">Capaian Kinerja</h2>
                <p className="text-indigo-200 text-lg font-medium">Bulan {selectedMonth}, Tahun {selectedYear}</p>
              </div>
              <div className="bg-white/10 p-10 rounded-[2.5rem] backdrop-blur-md border border-white/10 text-center min-w-[280px]">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Evaluasi Kerja</p>
                <p className="text-3xl font-black uppercase">{stats.avgNilai >= 90 ? "Sangat Baik" : stats.avgNilai >= 80 ? "Baik" : stats.avgNilai > 0 ? "Cukup" : "-"}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Detail Pekerjaan</th>
                    <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Target/Realisasi</th>
                    <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Capaian (%)</th>
                    <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Nilai</th>
                    <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredReports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-8">
                        <p className="font-black text-xl text-slate-800 tracking-tight leading-none mb-2">{r.title}</p>
                        <div className="flex items-center gap-3">
                           <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{r.userName}</span>
                           <span className="text-slate-400 text-[10px] font-bold uppercase italic">{r.keterangan || "Tanpa Keterangan"}</span>
                        </div>
                      </td>
                      <td className="p-8 text-center font-black text-slate-600">
                         {r.realisasi} / {r.target}
                         <div className="text-[10px] text-slate-400 font-black uppercase mt-1">{r.satuan}</div>
                      </td>
                      <td className="p-8 text-center">
                        <div className="font-black text-indigo-600 text-xl">{((r.realisasi / r.target) * 100).toFixed(0)}%</div>
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full mt-2 mx-auto overflow-hidden">
                           <div className="bg-indigo-500 h-full" style={{width: `${Math.min((r.realisasi/r.target)*100, 100)}%`}}></div>
                        </div>
                      </td>
                      <td className="p-8 text-center font-black text-3xl text-slate-800">{r.nilai || '-'}</td>
                      <td className="p-8 text-center">
                         {(user.role === 'admin' || user.role === 'pimpinan') && r.status === 'pending' ? (
                            <button onClick={async () => {
                               const n = prompt("Input Nilai Pimpinan (0-100):");
                               if(n) await updateDoc(doc(db, "reports", r.id), { status: 'selesai', nilai: Number(n) });
                            }} className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Beri Nilai</button>
                         ) : (
                            <div className="flex justify-center gap-3">
                               <CheckCircle size={22} className={r.status === 'selesai' ? "text-green-500" : "text-slate-200"}/>
                               <button onClick={() => deleteDoc(doc(db, "reports", r.id))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                            </div>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL ENTRI PEKERJAAN - VERSI LENGKAP */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSubmitReport} className="bg-white w-full max-w-2xl rounded-[3.5rem] p-12 shadow-2xl space-y-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
               <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Input Kinerja</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase mt-2 tracking-widest">Bulan {selectedMonth}, Tahun {selectedYear}</p>
               </div>
               <button type="button" onClick={() => setShowReportModal(false)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><X size={32}/></button>
            </div>
            
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Nama Kegiatan / Pekerjaan</label>
                  <input required type="text" className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] outline-none font-black text-slate-700 focus:ring-2 focus:ring-indigo-600" 
                    placeholder="Contoh: Pengolahan Data Regsosek" onChange={e => setNewReport({...newReport, title: e.target.value})} />
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Target Angka</label>
                     <input required type="number" className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] outline-none font-black text-slate-700 focus:ring-2 focus:ring-indigo-600" 
                        placeholder="0" onChange={e => setNewReport({...newReport, target: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Realisasi Angka</label>
                     <input required type="number" className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] outline-none font-black text-slate-700 focus:ring-2 focus:ring-indigo-600" 
                        placeholder="0" onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Satuan (Entri Bebas)</label>
                  <input required type="text" className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] outline-none font-black text-slate-700 focus:ring-2 focus:ring-indigo-600" 
                    placeholder="Contoh: Dokumen, Berkas, atau Peta" onChange={e => setNewReport({...newReport, satuan: e.target.value})} />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Keterangan / Catatan</label>
                  <textarea className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] outline-none font-black text-slate-700 focus:ring-2 focus:ring-indigo-600 h-24 resize-none" 
                    placeholder="Tambahkan catatan jika diperlukan..." onChange={e => setNewReport({...newReport, keterangan: e.target.value})} />
               </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest">Kirim Laporan Kerja</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
