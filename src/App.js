import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, query, orderBy, deleteDoc
} from 'firebase/firestore';
import { 
  ShieldCheck, Loader2, Plus, X, BarChart3, FileText, 
  LogOut, CheckCircle, Award, Users, Trash2, CheckCircle2, Edit3, TrendingUp, AlertCircle, Clock, Zap, UserPlus
} from 'lucide-react';

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
  const [filterStaffName, setFilterStaffName] = useState('Semua');
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [currentReportId, setCurrentReportId] = useState(null);
  const [newReport, setNewReport] = useState({ title: '', target: '', realisasi: '', satuan: '', keterangan: '', targetUser: '' });
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'pegawai', jabatan: '' });

  useEffect(() => {
    signInAnonymously(auth);
    const unsubAuth = onAuthStateChanged(auth, (fUser) => {
      const saved = localStorage.getItem('piru_session_final');
      if (saved) { setUser(JSON.parse(saved)); }
      setLoading(false);
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));
    });
    return () => { unsubAuth(); unsubUsers(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubReports = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubReports();
  }, [user]);

  const resetReportForm = () => {
    setIsEditing(false);
    setCurrentReportId(null);
    setNewReport({ title: '', target: '', realisasi: '', satuan: '', keterangan: '', targetUser: '' });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const inputUsername = authForm.username.trim().toLowerCase();
    const found = users.find(u => u.username.toLowerCase() === inputUsername && u.password === authForm.password);
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session_final', JSON.stringify(found));
    } else { setAuthError('Identitas tidak ditemukan atau password salah.'); }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "users"), { 
        ...newUser, 
        username: newUser.username.trim().toLowerCase(),
        createdAt: serverTimestamp() 
      });
      setShowUserModal(false);
      setNewUser({ name: '', username: '', password: '', role: 'pegawai', jabatan: '' });
      alert("Data pegawai berhasil ditambahkan ke sistem.");
    } catch (err) { alert("Terjadi kesalahan sistem."); }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    try {
      if (isEditing && currentReportId) {
        await updateDoc(doc(db, "reports", currentReportId), {
          ...newReport, target: Number(newReport.target), realisasi: Number(newReport.realisasi),
        });
      } else {
        let finalUserId = user.username;
        let finalUserName = user.name;
        let finalUserRole = user.role;
        let initialStatus = 'pending';
        let initialNilaiPimpinan = 0;

        if ((user.role === 'pimpinan' || user.role === 'admin') && newReport.targetUser) {
           const targetStaff = users.find(u => u.name === newReport.targetUser);
           if (targetStaff) {
              finalUserId = targetStaff.username;
              finalUserName = targetStaff.name;
              finalUserRole = targetStaff.role;
              const val = prompt(`Entri untuk: ${finalUserName}\nMasukkan Nilai Evaluasi (Opsional):`);
              if (val && !isNaN(val)) {
                initialNilaiPimpinan = parseFloat(val);
                initialStatus = 'selesai';
              }
           }
        }

        await addDoc(collection(db, "reports"), {
          ...newReport, target: Number(newReport.target), realisasi: Number(newReport.realisasi),
          userId: finalUserId, userName: finalUserName, userRole: finalUserRole,
          month: selectedMonth, year: selectedYear, status: initialStatus, 
          nilaiKetua: 0, nilaiPimpinan: initialNilaiPimpinan, createdAt: serverTimestamp()
        });
      }
      setShowReportModal(false); resetReportForm();
    } catch (err) { alert("Gagal memproses data."); }
  };

  const currentFilteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (user?.role === 'pegawai') res = res.filter(r => r.userId === user.username);
    if ((user?.role === 'pimpinan' || user?.role === 'admin' || user?.role === 'ketua') && filterStaffName !== 'Semua') {
      res = res.filter(r => r.userName === filterStaffName);
    }
    return res;
  }, [reports, user, selectedMonth, selectedYear, filterStaffName]);

  const dashboardStats = useMemo(() => {
    const periodReports = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    const staffSummary = users.filter(u => u.role !== 'admin' && u.role !== 'pimpinan').map(s => {
      const sReports = periodReports.filter(r => r.userId === s.username);
      const total = sReports.length;
      const selesai = sReports.filter(r => r.status === 'selesai').length;
      const progress = sReports.filter(r => r.status === 'dinilai_ketua').length;
      let statusText = total === 0 ? "Belum Ada Laporan" : (selesai === total ? "Selesai Dinilai" : (progress > 0 || selesai > 0 ? "Progres" : "Menunggu"));
      const avgCap = total > 0 ? (sReports.reduce((acc, curr) => acc + Math.min((curr.realisasi / curr.target) * 100, 100), 0) / total) : 0;
      const avgPimp = total > 0 ? (sReports.reduce((acc, curr) => acc + (Number(curr.nilaiPimpinan) || 0), 0) / total) : 0;
      return { name: s.name, total, nilaiAkhir: ((avgCap + avgPimp) / 2).toFixed(2), status: statusText, detailCount: `${selesai}/${total}` };
    });
    const myReports = periodReports.filter(r => r.userId === user?.username);
    const myTotal = myReports.length;
    const mySelesai = myReports.filter(r => r.status === 'selesai').length;
    return { myTotal, myNilaiAkhir: (myTotal > 0 ? (( (myReports.reduce((a,c)=>a+Math.min((c.realisasi/c.target)*100, 100),0)/myTotal) + (myReports.reduce((a,c)=>a+(Number(c.nilaiPimpinan)||0),0)/myTotal) )/2).toFixed(2) : 0), staffSummary, myStatus: myTotal === 0 ? "N/A" : (mySelesai === myTotal ? "Selesai" : "Progres"), myDetailCount: `${mySelesai}/${myTotal} Selesai` };
  }, [reports, users, user, selectedMonth, selectedYear]);

  const submitGrade = async (reportId, roleName) => {
    const label = roleName === 'ketua' ? 'Ketua Tim' : 'Pimpinan';
    const val = prompt(`Evaluasi ${label} (Masukkan Nilai):`);
    if (val && !isNaN(val)) {
        const grade = parseFloat(val);
        const ref = doc(db, "reports", reportId);
        if (roleName === 'ketua') await updateDoc(ref, { nilaiKetua: grade, status: 'dinilai_ketua' });
        else if (roleName === 'pimpinan') await updateDoc(ref, { nilaiPimpinan: grade, status: 'selesai' });
    }
  };

  const handleMassGrade = async () => {
    if (filterStaffName === 'Semua') return alert("Tentukan nama pegawai pada filter terlebih dahulu.");
    const val = prompt(`EVALUASI MASSAL: Berikan nilai akhir untuk seluruh kegiatan ${filterStaffName}:`);
    if (val && !isNaN(val)) {
      const grade = parseFloat(val);
      const targets = currentFilteredReports.filter(r => r.status !== 'selesai');
      for (const r of targets) { await updateDoc(doc(db, "reports", r.id), { nilaiPimpinan: grade, status: 'selesai' }); }
      alert(`Berhasil memproses ${targets.length} kegiatan.`);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (!user) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-12 shadow-2xl text-center font-sans border border-slate-100">
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <ShieldCheck size={45} className="text-indigo-600" />
        </div>
        <h1 className="text-4xl font-black mb-2 tracking-tighter text-slate-800 uppercase leading-none">PIRU</h1>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-10">BPS Kabupaten SBB</p>
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          {authError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black text-center uppercase tracking-widest">{authError}</div>}
          <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Username</label>
              <input type="text" placeholder="Masukkan username..." className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 ring-indigo-100 transition-all" onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          </div>
          <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Password</label>
              <input type="password" placeholder="••••••••" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 ring-indigo-100 transition-all" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 transition-all active:scale-95 mt-4">Akses Aplikasi</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden text-slate-800">
      <div className="w-72 bg-white border-r border-slate-100 p-8 flex flex-col hidden md:flex font-sans">
        <div className="flex items-center gap-4 mb-14 px-2">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100"><ShieldCheck size={28}/></div>
          <div>
            <h2 className="font-black text-2xl text-slate-800 tracking-tighter uppercase leading-none">PIRU</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dashboard Kinerja</p>
          </div>
        </div>
        <nav className="flex-1 space-y-3">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}><BarChart3 size={20}/> Ringkasan</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}><FileText size={20}/> Capaian Kerja</button>
          {user.role === 'admin' && (
            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}><Users size={20}/> Data Pegawai</button>
          )}
        </nav>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} className="w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all mt-auto"><LogOut size={20}/> Keluar Sistem</button>
      </div>

      <main className="flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{user.name}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-3 bg-white w-fit px-3 py-1 rounded-full border border-slate-100 shadow-sm">{user.jabatan || user.role}</p>
          </div>
          <div className="flex items-center gap-5">
            <select className="bg-white border-slate-200 border rounded-2xl px-6 py-4 font-black text-slate-600 shadow-sm outline-none cursor-pointer hover:border-indigo-200 transition-all" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            {user.role !== 'pegawai' && activeTab === 'laporan' && filterStaffName !== 'Semua' && (
                <button onClick={handleMassGrade} className="bg-amber-400 hover:bg-amber-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-amber-100 uppercase text-[10px] flex items-center gap-3 transition-all active:scale-95"><Zap size={18}/> Nilai Massal</button>
            )}
            
            {user.role === 'admin' && activeTab === 'users' && (
                <button onClick={() => setShowUserModal(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg uppercase text-[10px] tracking-widest flex items-center gap-2"><UserPlus size={18}/> Tambah Pegawai</button>
            )}
            
            {(user.role === 'pegawai' || user.role === 'ketua') && (
                <button onClick={() => { resetReportForm(); setShowReportModal(true); }} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 uppercase text-[10px] tracking-widest"><Plus size={20}/> Entri Kerja</button>
            )}
            {((user.role === 'pimpinan' || user.role === 'admin') && activeTab === 'laporan') && (
                <button onClick={() => { resetReportForm(); setShowReportModal(true); }} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 uppercase text-[10px] tracking-widest"><Plus size={20}/> Tambah Tugas</button>
            )}
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="space-y-10 animate-in fade-in duration-700">
            {(user.role === 'pimpinan' || user.role === 'admin') ? (
              <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-10">
                <div className="flex items-center gap-3 mb-10">
                    <TrendingUp className="text-indigo-600" size={28}/>
                    <h3 className="font-black text-2xl uppercase tracking-tighter">Monitoring Capaian Pegawai</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {dashboardStats.staffSummary.map((s, i) => (
                    <div key={i} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between hover:border-indigo-200 hover:bg-white transition-all shadow-sm hover:shadow-xl group">
                      <div className="mb-6">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-indigo-600 transition-colors">{s.name}</p>
                        <div className="flex items-center gap-2">
                             <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${s.status === 'Selesai Dinilai' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{s.status}</span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Progres: {s.detailCount}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Nilai Akhir</p>
                        <p className="text-5xl font-black text-indigo-600 tracking-tighter">{s.nilaiAkhir}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="bg-white p-14 rounded-[3.5rem] shadow-sm border border-slate-100 text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-150 transition-all duration-700"></div>
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mb-6 relative">Estimasi Nilai Akhir</p>
                    <p className="text-8xl font-black text-amber-500 tracking-tighter relative">{dashboardStats.myNilaiAkhir}</p>
                    <div className="mt-8 flex justify-center gap-4 relative">
                        <span className="bg-slate-50 px-4 py-2 rounded-2xl text-[10px] font-black text-slate-400 uppercase">{dashboardStats.myTotal} Pekerjaan</span>
                    </div>
                  </div>
                  <div className="bg-indigo-900 rounded-[3.5rem] p-14 text-white flex flex-col items-center justify-center shadow-2xl shadow-indigo-200 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-6">Tahapan Penilaian</p>
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-white/10 rounded-3xl animate-pulse">
                            <Clock size={32} className="text-amber-400"/>
                        </div>
                        <p className="text-4xl font-black uppercase tracking-tight italic">{dashboardStats.myStatus}</p>
                    </div>
                    <p className="text-[10px] font-black text-indigo-300 mt-8 uppercase tracking-[0.2em] bg-white/5 px-6 py-2 rounded-full border border-white/10">{dashboardStats.myDetailCount}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'users' ? (
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden p-10 font-sans animate-in slide-in-from-bottom duration-700">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="p-8">Identitas Pegawai</th><th className="p-8">Jabatan & Peran</th><th className="p-8 text-center">Manajemen</th></tr></thead>
              <tbody>{users.map(u => (<tr key={u.firestoreId} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="p-8">
                    <p className="font-black text-slate-800 uppercase text-lg tracking-tighter">{u.name}</p>
                    <p className="text-indigo-500 text-[10px] font-bold tracking-widest uppercase mt-1">ID: @{u.username}</p>
                </td>
                <td className="p-8 font-bold text-slate-500 text-xs uppercase tracking-widest">{u.jabatan} <span className="text-[10px] opacity-40 mx-2">/</span> {u.role}</td>
                <td className="p-8 text-center"><button onClick={() => deleteDoc(doc(db, "users", u.firestoreId))} className="p-4 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20}/></button></td>
              </tr>))}</tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 p-10 space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between gap-6 px-4">
              <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
                  <h3 className="font-black text-2xl uppercase tracking-tighter">Daftar Capaian Kinerja</h3>
              </div>
              {(user.role === 'admin' || user.role === 'pimpinan' || user.role === 'ketua') && (
                <div className="flex items-center gap-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Pegawai:</p>
                    <select className="p-4 bg-slate-50 border-slate-100 border rounded-2xl font-black text-xs outline-none cursor-pointer text-slate-600 focus:ring-2 ring-indigo-100" value={filterStaffName} onChange={e => setFilterStaffName(e.target.value)}>
                      <option value="Semua">Semua Pegawai</option>
                      {users.filter(u => u.role !== 'admin' && u.role !== 'pimpinan').map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                    </select>
                </div>
              )}
            </div>
            <div className="overflow-x-auto text-sm">
              <table className="w-full text-left font-sans">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr><th className="p-8">Deskripsi Kegiatan</th><th className="p-8 text-center">Volume</th><th className="p-8 text-center">Capaian</th><th className="p-8 text-center">Ketua</th><th className="p-8 text-center">Pimpinan</th><th className="p-8 text-center">Tindakan</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentFilteredReports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-8">
                        <p className="font-black text-xl text-slate-800 uppercase leading-none mb-3 tracking-tighter">{r.title}</p>
                        <div className="flex items-center gap-3">
                            <span className="text-indigo-600 text-[9px] font-black uppercase bg-indigo-50 px-3 py-1 rounded-full">{r.userName}</span>
                            <span className="text-slate-400 text-[9px] font-bold uppercase italic">{r.keterangan || "Tidak ada keterangan tambahan"}</span>
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        <p className="font-black text-slate-800 text-lg">{r.realisasi} / {r.target}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{r.satuan}</p>
                      </td>
                      <td className="p-8 text-center">
                        <div className="bg-slate-100 h-2 w-24 rounded-full mx-auto mb-2 overflow-hidden">
                            <div className="bg-indigo-600 h-full" style={{width: `${Math.min((r.realisasi/r.target)*100, 100)}%`}}></div>
                        </div>
                        <p className="font-black text-indigo-600">{((r.realisasi/r.target)*100).toFixed(1)}%</p>
                      </td>
                      <td className="p-8 text-center font-black text-slate-300 text-xl">{r.nilaiKetua || '-'}</td>
                      <td className="p-8 text-center font-black text-indigo-600 text-xl">{r.nilaiPimpinan || '-'}</td>
                      <td className="p-8 text-center">
                        <div className="flex justify-center items-center gap-3">
                            {r.userId === user.username && r.status === 'pending' && <><button onClick={() => { setIsEditing(true); setCurrentReportId(r.id); setNewReport({title: r.title, target: r.target, realisasi: r.realisasi, satuan: r.satuan, keterangan: r.keterangan || ''}); setShowReportModal(true); }} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all"><Edit3 size={18}/></button><button onClick={() => deleteDoc(doc(db, "reports", r.id))} className="p-3 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/></button></>}
                            {user.role === 'admin' && <button onClick={() => deleteDoc(doc(db, "reports", r.id))} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/></button>}
                            {(user.role === 'admin' || user.role === 'ketua') && r.userId !== user.username && r.status !== 'selesai' && <button onClick={() => submitGrade(r.id, 'ketua')} className="bg-amber-400 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-amber-100 transition-all hover:scale-105 active:scale-95">Ketua</button>}
                            {(user.role === 'pimpinan' || user.role === 'admin') && r.userId !== user.username && <button onClick={() => submitGrade(r.id, 'pimpinan')} className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95">{r.status === 'selesai' ? 'Koreksi' : 'Pimpinan'}</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL FORM */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <form onSubmit={handleSubmitReport} className="bg-white w-full max-w-2xl rounded-[3.5rem] p-16 shadow-2xl relative font-sans">
            <button type="button" onClick={() => { resetReportForm(); setShowReportModal(false); }} className="absolute top-10 right-10 p-4 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all"><X size={24}/></button>
            <h3 className="text-4xl font-black uppercase tracking-tighter mb-10 text-slate-800">{isEditing ? "Perbarui Data" : (user.role === 'pimpinan' || user.role === 'admin' ? "Penugasan Khusus" : "Laporan Capaian")}</h3>
            <div className="space-y-6">
               {(user.role === 'pimpinan' || user.role === 'admin') && !isEditing && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Pelaksana Tugas</label>
                    <select required className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-indigo-600 border border-slate-100 focus:ring-2 ring-indigo-50" onChange={e => setNewReport({...newReport, targetUser: e.target.value})}>
                        <option value="">-- Pilih Nama Pegawai --</option>
                        {users.filter(u => u.role !== 'admin' && u.role !== 'pimpinan').map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                    </select>
                  </div>
               )}
               <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Nama Kegiatan</label>
                    <input required type="text" placeholder="Deskripsi pekerjaan..." className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-800 border border-slate-100 focus:ring-2 ring-indigo-50" value={newReport.title} onChange={e => setNewReport({...newReport, title: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Target</label>
                    <input required type="number" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-800 border border-slate-100" value={newReport.target} onChange={e => setNewReport({...newReport, target: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Realisasi</label>
                    <input required type="number" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-800 border border-slate-100" value={newReport.realisasi} onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
                  </div>
               </div>
               <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Satuan</label>
                    <input list="satuan-list" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-800 border border-slate-100" placeholder="Pilih atau ketik satuan..." value={newReport.satuan} onChange={e => setNewReport({...newReport, satuan: e.target.value})} />
                    <datalist id="satuan-list"><option value="Dokumen"/><option value="Kegiatan"/><option value="Laporan"/><option value="Paket"/><option value="BS"/><option value="Ruta"/></datalist>
               </div>
               <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Keterangan Tambahan</label>
                    <textarea className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold h-32 resize-none text-slate-600 border border-slate-100" placeholder="Opsional..." value={newReport.keterangan} onChange={e => setNewReport({...newReport, keterangan: e.target.value})} />
               </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-7 rounded-[2.5rem] shadow-2xl shadow-indigo-200 uppercase tracking-widest text-xs mt-10 transition-all hover:bg-indigo-700 active:scale-95">Simpan Data Capaian</button>
          </form>
        </div>
      )}

      {/* MODAL USER */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 font-sans">
          <form onSubmit={handleAddUser} className="bg-white w-full max-w-xl rounded-[3.5rem] p-16 shadow-2xl relative">
            <button type="button" onClick={() => setShowUserModal(false)} className="absolute top-10 right-10 p-4 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900"><X size={24}/></button>
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-10 text-slate-800">Registrasi Pegawai</h3>
            <div className="space-y-5">
                <input required type="text" placeholder="Nama Lengkap Pegawai" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-700 border border-slate-100" onChange={e => setNewUser({...newUser, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-5">
                    <input required type="text" placeholder="Username" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-700 border border-slate-100" onChange={e => setNewUser({...newUser, username: e.target.value})} />
                    <input required type="password" placeholder="Password" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-700 border border-slate-100" onChange={e => setNewUser({...newUser, password: e.target.value})} />
                </div>
                <input type="text" placeholder="Jabatan Struktural/Fungsional" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-700 border border-slate-100" onChange={e => setNewUser({...newUser, jabatan: e.target.value})} />
                <select className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-slate-600 border border-slate-100" onChange={e => setNewUser({...newUser, role: e.target.value})}>
                    <option value="pegawai">Role: Pegawai</option>
                    <option value="ketua">Role: Ketua Tim</option>
                    <option value="pimpinan">Role: Pimpinan</option>
                    <option value="admin">Role: Administrator</option>
                </select>
                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-7 rounded-[2.5rem] shadow-xl uppercase tracking-widest text-[10px] mt-6 transition-all active:scale-95">Daftarkan Pegawai</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
