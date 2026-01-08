import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, query, orderBy, deleteDoc
} from 'firebase/firestore';
import { 
  User, Users, CheckCircle, FileText, LogOut, Award, ChevronRight, 
  ClipboardList, ShieldCheck, Loader2, Send, Search, Filter, Trash2, 
  Calendar, BarChart3, Clock, CheckCircle2, AlertCircle, Plus, X, 
  Calculator, Download, FileSpreadsheet, Percent, Lock, UserPlus, 
  Settings, Building2, WifiOff, Wifi, Save, ChevronLeft
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
  // STATE DASAR
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
  
  // STATE FORM & MODAL (SESUAI FILE ASLI)
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  
  const [newReport, setNewReport] = useState({
    title: '', target: '', realisasi: '', satuan: 'Dokumen', kategori: 'Utama', keterangan: ''
  });

  const [newUser, setNewUser] = useState({
    username: '', password: '', name: '', role: 'pegawai', nip: '', jabatan: ''
  });

  // 1. SYNC AUTH & DATABASE
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

  // 2. FUNGSI LOGIKA (HANDLERS)
  const handleLogin = (e) => {
    e.preventDefault();
    const found = users.find(u => u.username === authForm.username && u.password === authForm.password);
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session_final', JSON.stringify(found));
      setIsAuthModalOpen(false);
    } else { setAuthError('Username/Password Salah'); }
  };

  const handleAddReport = async (e) => {
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
      notify("Laporan berhasil dikirim!");
    } catch (err) { alert("Gagal kirim laporan"); }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "users"), { ...newUser, id: `user_${Date.now()}` });
      setShowUserModal(false);
      setNewUser({ username: '', password: '', name: '', role: 'pegawai', nip: '', jabatan: '' });
      notify("Pegawai berhasil ditambahkan!");
    } catch (err) { alert("Gagal tambah pegawai"); }
  };

  const notify = (message) => {
    setShowNotification(message);
    setTimeout(() => setShowNotification(null), 3000);
  };

  // 3. PERHITUNGAN STATISTIK (SESUAI FILE ASLI)
  const filteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (user?.role === 'pegawai') res = res.filter(r => r.userId === user.id);
    return res;
  }, [reports, user, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const total = filteredReports.length;
    const selesai = filteredReports.filter(r => r.status === 'selesai').length;
    const pending = total - selesai;
    const avgNilai = total > 0 ? (filteredReports.reduce((acc, curr) => acc + (Number(curr.nilai) || 0), 0) / total).toFixed(1) : 0;
    return { total, selesai, pending, avgNilai };
  }, [filteredReports]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={50}/></div>;

  // TAMPILAN LOGIN
  if (isAuthModalOpen) return (
    <div className="h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
        <div className="text-center mb-8">
          <ShieldCheck size={64} className="mx-auto text-indigo-600 mb-4" />
          <h1 className="text-3xl font-black text-slate-800">PIRU BPS SBB</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {authError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold text-center">{authError}</div>}
          <input type="text" placeholder="Username" className="w-full p-5 bg-slate-50 rounded-2xl outline-none border border-slate-100" onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 rounded-2xl outline-none border border-slate-100" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">MASUK SISTEM</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
      {/* SIDEBAR ASLI */}
      <div className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-white border-r transition-all duration-300 flex flex-col`}>
        <div className="p-8 flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white"><ShieldCheck size={28}/></div>
          {isSidebarOpen && <span className="font-black text-2xl tracking-tighter text-slate-800">PIRU</span>}
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><BarChart3 size={22}/> {isSidebarOpen && "Dashboard"}</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={22}/> {isSidebarOpen && "Laporan Kerja"}</button>
          {user.role === 'admin' && (
            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={22}/> {isSidebarOpen && "Data Pegawai"}</button>
          )}
        </nav>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} className="p-8 flex items-center gap-4 text-red-500 font-black hover:bg-red-50 transition-all"><LogOut size={22}/> {isSidebarOpen && "KELUAR"}</button>
      </div>

      {/* MAIN CONTENT ASLI */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Halo, {user.name} 👋</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">{user.jabatan || user.role} • BPS Kab. Seram Bagian Barat</p>
          </div>
          <div className="flex items-center gap-4">
            <select className="p-4 bg-white border-none rounded-2xl shadow-sm font-black text-slate-600" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            {user.role === 'pegawai' && (
              <button onClick={() => setShowReportModal(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center gap-3 hover:bg-indigo-700 transition-all"><Plus size={20}/> LAPOR</button>
            )}
            {user.role === 'admin' && activeTab === 'users' && (
              <button onClick={() => setShowUserModal(true)} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl flex items-center gap-3 hover:bg-green-700 transition-all"><UserPlus size={20}/> PEGAWAI</button>
            )}
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-10 text-indigo-50 group-hover:text-indigo-100 transition-all"><FileText size={100}/></div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3 text-center">Total Kegiatan</p>
                <p className="text-6xl font-black text-slate-800 text-center">{stats.total}</p>
              </div>
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-10 text-green-50 group-hover:text-green-100 transition-all"><CheckCircle size={100}/></div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3 text-center">Selesai Dinilai</p>
                <p className="text-6xl font-black text-green-600 text-center">{stats.selesai}</p>
              </div>
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden group text-amber-500">
                <div className="absolute right-0 top-0 p-10 text-amber-50 group-hover:text-amber-100 transition-all"><Award size={100}/></div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3 text-center">Rata-rata Nilai</p>
                <p className="text-6xl font-black text-center">{stats.avgNilai}</p>
              </div>
            </div>

            <div className="bg-indigo-900 rounded-[3.5rem] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl">
              <div className="space-y-4">
                <h2 className="text-4xl font-black tracking-tight">Capaian Kinerja Anda</h2>
                <p className="text-indigo-200 text-lg font-medium">Bulan {selectedMonth}, Tahun {selectedYear}</p>
                <div className="flex gap-4 mt-6">
                  <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10 font-bold">Pending: {stats.pending}</div>
                  <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10 font-bold">Final: {stats.selesai}</div>
                </div>
              </div>
              <div className="bg-white/10 p-10 rounded-[2.5rem] backdrop-blur-md border border-white/10 text-center min-w-[300px]">
                <p className="text-xs font-black uppercase tracking-[0.3em] opacity-60 mb-2">Evaluasi Pimpinan</p>
                <p className="text-4xl font-black mb-2">{stats.avgNilai >= 90 ? "ISTIMEWA" : stats.avgNilai >= 80 ? "BAIK" : "CUKUP"}</p>
                <div className="h-2 w-full bg-white/10 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-white" style={{width: `${stats.avgNilai}%`}}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'laporan' && (
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter">Monitoring Laporan Kinerja</h3>
              <div className="flex gap-4">
                <button onClick={() => {
                   const data = filteredReports.map(r => ({ Kegiatan: r.title, Kategori: r.kategori, Realisasi: r.realisasi, Target: r.target, Nilai: r.nilai }));
                   const ws = XLSX.utils.json_to_sheet(data);
                   const wb = XLSX.utils.book_new();
                   XLSX.utils.book_append_sheet(wb, ws, "Laporan");
                   XLSX.writeFile(wb, `Laporan_${selectedMonth}.xlsx`);
                }} className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Download size={16}/> EXCEL</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Detail Kegiatan</th>
                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Progress</th>
                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Nilai</th>
                    {(user.role === 'admin' || user.role === 'pimpinan') && <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredReports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-6">
                        <p className="font-black text-slate-800 text-lg leading-tight">{r.title}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{r.kategori}</span>
                          <span className="text-slate-400 text-[10px] font-bold uppercase">{r.userName}</span>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="font-black text-slate-700">{r.realisasi} / {r.target}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{r.satuan}</div>
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-2 mx-auto overflow-hidden">
                          <div className="bg-indigo-500 h-full" style={{width: `${Math.min((r.realisasi/r.target)*100, 100)}%`}}></div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${r.status === 'selesai' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-6 text-center font-black text-2xl text-indigo-600">{r.nilai || '-'}</td>
                      {(user.role === 'admin' || user.role === 'pimpinan') && (
                        <td className="p-6 text-center">
                          {r.status === 'pending' ? (
                            <button onClick={async () => {
                              const n = prompt("Input Nilai (0-100):", "85");
                              if(n) await updateDoc(doc(db, "reports", r.id), { nilai: Number(n), status: 'selesai' });
                            }} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100">BERI NILAI</button>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <CheckCircle className="text-green-500" size={20}/>
                              <button onClick={() => deleteDoc(doc(db, "reports", r.id))} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
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

        {activeTab === 'users' && user.role === 'admin' && (
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden p-8">
            <h3 className="font-black text-xl mb-6">Database Pegawai BPS SBB</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map(u => (
                <div key={u.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-800">{u.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{u.role} • @{u.username}</p>
                  </div>
                  <button onClick={() => deleteDoc(doc(db, "users", u.id))} className="text-red-400 hover:text-red-600"><Trash2 size={20}/></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL LAPORAN UTUH */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddReport} className="bg-white w-full max-w-2xl rounded-[3.5rem] p-12 shadow-2xl space-y-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Input Capaian Kinerja</h3>
              <button type="button" onClick={() => setShowReportModal(false)}><X size={32} className="text-slate-300 hover:text-red-500"/></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Nama Kegiatan</label>
                <input required type="text" className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] outline-none font-bold focus:ring-2 focus:ring-indigo-600" 
                  onChange={e => setNewReport({...newReport, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Target</label>
                <input required type="number" className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] outline-none font-bold" 
                  onChange={e => setNewReport({...newReport, target: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Realisasi</label>
                <input required type="number" className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] outline-none font-bold" 
                  onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Satuan</label>
                <select className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] outline-none font-bold" onChange={e => setNewReport({...newReport, satuan: e.target.value})}>
                  <option>Dokumen</option><option>Berkas</option><option>O-B</option><option>Kunjungan</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Kategori</label>
                <select className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] outline-none font-bold" onChange={e => setNewReport({...newReport, kategori: e.target.value})}>
                  <option>Utama</option><option>Tambahan</option>
                </select>
              </div>
            </div>
            <button className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all uppercase tracking-[0.2em]">KIRIM LAPORAN KINERJA</button>
          </form>
        </div>
      )}

      {/* MODAL USER ADMIN */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddUser} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl space-y-6">
            <h3 className="text-2xl font-black uppercase">Tambah Pegawai Baru</h3>
            <input required type="text" placeholder="Nama Lengkap" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewUser({...newUser, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <input required type="text" placeholder="Username" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewUser({...newUser, username: e.target.value})} />
              <input required type="password" placeholder="Password" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <select className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewUser({...newUser, role: e.target.value})}>
              <option value="pegawai">Pegawai</option><option value="pimpinan">Pimpinan</option><option value="admin">Admin</option>
            </select>
            <button className="w-full bg-green-600 text-white font-black py-5 rounded-[2rem] shadow-xl">SIMPAN PEGAWAI</button>
            <button type="button" onClick={() => setShowUserModal(false)} className="w-full text-slate-400 font-bold">BATAL</button>
          </form>
        </div>
      )}

      {showNotification && (
        <div className="fixed bottom-10 right-10 bg-indigo-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl font-black animate-bounce z-50">
          {showNotification}
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
