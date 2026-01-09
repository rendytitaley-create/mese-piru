import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, query, orderBy, deleteDoc, enableIndexedDbPersistence, writeBatch, where, getDocs
} from 'firebase/firestore';
import { 
  ShieldCheck, Loader2, Plus, X, BarChart3, FileText, 
  LogOut, Trash2, Edit3, TrendingUp, Clock, Zap, UserPlus, Users, Download, ClipboardCheck, CheckCircle2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Offline Persistence Status:", err.code);
});

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
  
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
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

  const resetUserForm = () => {
    setIsEditingUser(false);
    setCurrentUserId(null);
    setNewUser({ name: '', username: '', password: '', role: 'pegawai', jabatan: '' });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const inputUsername = authForm.username.trim().toLowerCase();
    const found = users.find(u => u.username.toLowerCase() === inputUsername && u.password === authForm.password);
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session_final', JSON.stringify(found));
    } else { setAuthError('Username atau password salah.'); }
  };

  const handleAddOrEditUser = async (e) => {
    e.preventDefault();
    try {
      if (isEditingUser && currentUserId) {
        await updateDoc(doc(db, "users", currentUserId), { 
          ...newUser, 
          username: newUser.username.trim().toLowerCase() 
        });
        alert("Data pegawai diperbarui.");
      } else {
        await addDoc(collection(db, "users"), { 
          ...newUser, 
          username: newUser.username.trim().toLowerCase(),
          createdAt: serverTimestamp() 
        });
        alert("Pegawai berhasil ditambahkan.");
      }
      setShowUserModal(false);
      resetUserForm();
    } catch (err) { alert("Gagal memproses data pegawai."); }
  };

  const handleNilaiSemua = async () => {
    if (filterStaffName === 'Semua') return;
    const val = prompt(`Masukkan nilai untuk SEMUA pekerjaan ${filterStaffName} bulan ini:`);
    if (!val || isNaN(val)) return;
    
    const grade = parseFloat(val);
    const confirmAction = window.confirm(`Berikan nilai ${grade} ke seluruh pekerjaan ${filterStaffName}?`);
    if (!confirmAction) return;

    try {
      const batch = writeBatch(db);
      const targetReports = currentFilteredReports;
      
      targetReports.forEach((r) => {
        const ref = doc(db, "reports", r.id);
        if (user.role === 'ketua') {
          batch.update(ref, { nilaiKetua: grade, status: 'dinilai_ketua' });
        } else if (user.role === 'pimpinan' || user.role === 'admin') {
          batch.update(ref, { nilaiPimpinan: grade, status: 'selesai' });
        }
      });

      await batch.commit();
      alert(`Berhasil memberikan nilai ke ${targetReports.length} pekerjaan.`);
    } catch (err) { alert("Gagal melakukan penilaian massal."); }
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
        
        // Konteks Tambah Pekerjaan di Tab Penilaian (Koreksi Poin 1)
        if (activeTab === 'penilaian' && newReport.targetUser) {
           const targetStaff = users.find(u => u.name === newReport.targetUser);
           if (targetStaff) {
              finalUserId = targetStaff.username;
              finalUserName = targetStaff.name;
              finalUserRole = targetStaff.role;
           }
        }

        await addDoc(collection(db, "reports"), {
          ...newReport, target: Number(newReport.target), realisasi: Number(newReport.realisasi),
          userId: finalUserId, userName: finalUserName, userRole: finalUserRole,
          month: selectedMonth, year: selectedYear, status: 'pending', 
          nilaiKetua: 0, nilaiPimpinan: 0, createdAt: serverTimestamp()
        });
      }
      setShowReportModal(false); resetReportForm();
    } catch (err) { alert("Data berhasil disimpan."); }
  };

  const clearGrade = async (reportId, field) => {
    if (!window.confirm(`Hapus nilai ${field === 'nilaiKetua' ? 'Ketua' : 'Pimpinan'} ini?`)) return;
    try {
      await updateDoc(doc(db, "reports", reportId), {
        [field]: 0,
        status: field === 'nilaiPimpinan' ? 'dinilai_ketua' : 'pending'
      });
    } catch (err) { alert("Gagal membersihkan nilai."); }
  };

  const submitGrade = async (reportId, roleName) => {
    const val = prompt(`Masukkan Nilai ${roleName === 'ketua' ? 'Ketua Tim' : 'Pimpinan'}:`);
    if (val && !isNaN(val)) {
        const grade = parseFloat(val);
        const ref = doc(db, "reports", reportId);
        if (roleName === 'ketua') await updateDoc(ref, { nilaiKetua: grade, status: 'dinilai_ketua' });
        else if (roleName === 'pimpinan') await updateDoc(ref, { nilaiPimpinan: grade, status: 'selesai' });
    }
  };

  const currentFilteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (activeTab === 'laporan') res = res.filter(r => r.userId === user.username);
    if (activeTab === 'penilaian' && filterStaffName !== 'Semua') {
      res = res.filter(r => r.userName === filterStaffName);
    }
    return res;
  }, [reports, user, selectedMonth, selectedYear, filterStaffName, activeTab]);

  const dashboardStats = useMemo(() => {
    const periodReports = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    const staffSummary = users.filter(u => u.role !== 'admin' && u.role !== 'pimpinan').map(s => {
      const sReports = periodReports.filter(r => r.userId === s.username);
      const total = sReports.length;
      const selesai = sReports.filter(r => r.status === 'selesai').length;
      const progress = sReports.filter(r => r.status === 'dinilai_ketua').length;
      let statusText = total === 0 ? "Belum Lapor" : (selesai === total ? "Selesai" : (progress > 0 || selesai > 0 ? "Progres" : "Pending"));
      const avgCap = total > 0 ? (sReports.reduce((acc, curr) => acc + Math.min((curr.realisasi / curr.target) * 100, 100), 0) / total) : 0;
      const avgPimp = total > 0 ? (sReports.reduce((acc, curr) => acc + (Number(curr.nilaiPimpinan) || 0), 0) / total) : 0;
      return { name: s.name, total, nilaiAkhir: ((avgCap + avgPimp) / 2).toFixed(2), status: statusText, detailCount: `${selesai}/${total}` };
    });
    const myReports = periodReports.filter(r => r.userId === user?.username);
    const myTotal = myReports.length;
    const mySelesai = myReports.filter(r => r.status === 'selesai').length;
    return { myTotal, myNilaiAkhir: (myTotal > 0 ? (( (myReports.reduce((a,c)=>a+Math.min((c.realisasi/c.target)*100, 100),0)/myTotal) + (myReports.reduce((a,c)=>a+(Number(c.nilaiPimpinan)||0),0)/myTotal) )/2).toFixed(2) : 0), staffSummary, myStatus: myTotal === 0 ? "N/A" : (mySelesai === myTotal ? "Selesai" : "Progres"), myDetailCount: `${mySelesai}/${myTotal} Selesai` };
  }, [reports, users, user, selectedMonth, selectedYear]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 font-sans"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (!user) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-4 italic">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-12 shadow-2xl text-center font-sans">
        <ShieldCheck size={45} className="text-indigo-600 mx-auto mb-6" />
        <h1 className="text-4xl font-black mb-1 tracking-tighter text-slate-800 uppercase italic leading-none">PIRU</h1>
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-10 leading-none italic">BPS KABUPATEN SERAM BAGIAN BARAT</p>
        <form onSubmit={handleLogin} className="space-y-4 text-left font-sans not-italic">
          <input type="text" placeholder="Username" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-bold" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-bold" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs mt-4 transition-all active:scale-95 shadow-lg">Login</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 flex font-sans overflow-hidden text-slate-800 italic">
      {/* SIDEBAR FIXED */}
      <div className="w-72 bg-white border-r p-8 flex flex-col font-sans h-full sticky top-0 not-italic">
        <div className="flex items-center gap-4 mb-14 px-2 italic">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><ShieldCheck size={28}/></div>
          <div><h2 className="font-black text-2xl uppercase tracking-tighter leading-none italic">PIRU</h2></div>
        </div>
        <nav className="flex-1 space-y-3 font-sans not-italic">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><BarChart3 size={20}/> Dashboard</button>
          
          {user.role !== 'admin' && (
            <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={20}/> Entri Pekerjaan</button>
          )}

          {['admin', 'pimpinan', 'ketua'].includes(user.role) && (
            <button onClick={() => setActiveTab('penilaian')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'penilaian' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><ClipboardCheck size={20}/> Penilaian Anggota</button>
          )}
          {user.role === 'admin' && (<button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={20}/> Data Pegawai</button>)}
        </nav>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} className="w-full flex items-center gap-4 p-5 rounded-3xl font-black text-xs uppercase text-red-500 mt-auto transition-all italic"><LogOut size={20}/> Logout</button>
      </div>

      <main className="flex-1 flex flex-col h-screen overflow-hidden font-sans italic">
        {/* HEADER STICKY */}
        <header className="p-10 pb-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 italic sticky top-0 bg-slate-50 z-20">
          <div className="flex-1 max-w-md italic">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none italic break-words">{user.name}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-3 inline-block bg-white px-4 py-1 rounded-full border border-slate-100 italic">{user.jabatan || user.role}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 not-italic xl:justify-end">
             {activeTab === 'penilaian' && (
                <>
                  <select className="p-2 bg-white border border-slate-200 rounded-xl font-black text-[10px] text-slate-600 shadow-sm outline-none italic" value={filterStaffName} onChange={e => setFilterStaffName(e.target.value)}>
                    <option value="Semua">Semua Pegawai</option>
                    {users.filter(u => !['admin', 'pimpinan'].includes(u.role)).map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                  </select>
                  {filterStaffName !== 'Semua' && (
                    <button onClick={handleNilaiSemua} className="bg-amber-500 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 shadow-md italic"><CheckCircle2 size={14}/> Nilai Semua</button>
                  )}
                </>
              )}
            <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-[10px] text-slate-600 outline-none shadow-sm cursor-pointer italic" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <button className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 shadow-md italic"><Download size={14}/> Cetak</button>
            <button onClick={() => { resetReportForm(); setShowReportModal(true); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center gap-2 italic"><Plus size={14}/> Entri</button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-10 pt-0 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in duration-500 italic">
              {['admin', 'pimpinan'].includes(user.role) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
                  {dashboardStats.staffSummary.map((s, i) => (
                    <div key={i} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl italic group hover:border-indigo-500 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-slate-800 p-3 rounded-2xl group-hover:bg-indigo-900 transition-colors"><Users size={20} className="text-indigo-400"/></div>
                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${s.status === 'Selesai' ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-400'}`}>{s.status}</span>
                      </div>
                      <p className="font-black text-lg text-white uppercase tracking-tighter leading-none mb-1 italic">{s.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-4 italic">{s.detailCount} Laporan</p>
                      <div className="flex justify-between items-end border-t border-slate-800 pt-4">
                        <p className="text-[9px] font-black text-slate-500 uppercase italic">Estimasi Nilai</p>
                        <p className="text-3xl font-black text-indigo-400 italic">{s.nilaiAkhir}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 italic mb-10">
                  <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 text-center italic"><p className="text-slate-400 text-[11px] font-black uppercase mb-6 tracking-widest leading-none italic">Estimasi Nilai Akhir Saya</p><p className="text-8xl font-black text-amber-500 tracking-tighter leading-none italic">{dashboardStats.myNilaiAkhir}</p></div>
                  <div className="bg-indigo-900 rounded-[3rem] p-10 text-white flex flex-col items-center justify-center shadow-2xl relative overflow-hidden italic"><p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-6 leading-none italic">Tahapan Penilaian</p><div className="flex items-center gap-5 italic"><Clock size={32} className="text-amber-400"/><p className="text-4xl font-black uppercase italic leading-none italic">{dashboardStats.myStatus}</p></div><p className="text-[10px] font-black text-indigo-300 mt-8 uppercase tracking-widest leading-none italic">{dashboardStats.myDetailCount}</p></div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden p-6 font-sans italic mb-10">
              <table className="w-full text-left font-sans italic text-xs">
                <thead><tr className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase tracking-widest"><th className="p-4">Identitas Pegawai</th><th className="p-4">Jabatan & Role</th><th className="p-4 text-center">Aksi</th></tr></thead>
                <tbody>{users.map(u => (<tr key={u.firestoreId} className="border-b hover:bg-slate-50 transition-colors font-sans italic"><td className="p-4"><p className="font-black text-slate-800 uppercase tracking-tighter text-sm">{u.name}</p><p className="text-indigo-500 text-[9px] font-bold">@{u.username}</p></td><td className="p-4 font-bold text-slate-500 uppercase text-[10px]">{u.jabatan} / {u.role}</td><td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => { setIsEditingUser(true); setCurrentUserId(u.firestoreId); setNewUser({ name: u.name, username: u.username, password: u.password, role: u.role, jabatan: u.jabatan }); setShowUserModal(true); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm italic"><Edit3 size={14}/></button>
                    <button onClick={() => deleteDoc(doc(db, "users", u.firestoreId))} className="p-2 bg-red-50 text-red-400 rounded-xl shadow-sm"><Trash2 size={16}/></button>
                  </div>
                </td></tr>))}</tbody>
              </table>
              <button onClick={() => { resetUserForm(); setShowUserModal(true); }} className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 italic"><UserPlus size={14}/> Tambah Pegawai</button>
            </div>
          )}

          {(activeTab === 'laporan' || activeTab === 'penilaian') && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border p-6 space-y-8 italic mb-10">
                <table className="w-full text-left italic text-xs">
                  <thead className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase tracking-widest italic sticky top-0 z-10">
                    <tr><th className="p-4 italic">No</th><th className="p-4 italic">Kegiatan</th><th className="p-4 text-center italic">Volume</th><th className="p-4 text-center italic">Cap %</th><th className="p-4 text-center italic">Ketua</th><th className="p-4 text-center italic">Pimp</th><th className="p-4 text-center italic">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 italic">
                    {currentFilteredReports.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-all italic group">
                        <td className="p-4 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-4 italic"><p className="font-black text-sm text-slate-800 uppercase tracking-tight leading-none mb-1 italic">{r.title}</p><span className="text-indigo-600 text-[8px] font-black uppercase bg-indigo-50 px-2 py-0.5 rounded-lg italic">{r.userName}</span></td>
                        <td className="p-4 text-center font-black italic">{r.realisasi} / {r.target}</td>
                        <td className="p-4 text-center font-black text-indigo-600 italic">{((r.realisasi/r.target)*100).toFixed(1)}%</td>
                        <td className="p-4 text-center font-black text-slate-300 text-lg relative italic">
                          <div className="relative group inline-block">
                            {r.nilaiKetua || '-'}
                            {user.role === 'admin' && activeTab === 'penilaian' && r.nilaiKetua > 0 && (
                              <button onClick={() => clearGrade(r.id, 'nilaiKetua')} className="absolute -top-1 -right-3 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-all italic"><Trash2 size={10}/></button>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center font-black text-indigo-600 text-lg relative italic">
                          <div className="relative group inline-block">
                            {r.nilaiPimpinan || '-'}
                            {user.role === 'admin' && activeTab === 'penilaian' && r.nilaiPimpinan > 0 && (
                              <button onClick={() => clearGrade(r.id, 'nilaiPimpinan')} className="absolute -top-1 -right-3 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-all italic"><Trash2 size={10}/></button>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center italic">
                          <div className="flex justify-center gap-1 italic">
                            {activeTab === 'laporan' && r.status === 'pending' && <><button onClick={() => { setIsEditing(true); setCurrentReportId(r.id); setNewReport({title: r.title, target: r.target, realisasi: r.realisasi, satuan: r.satuan, keterangan: r.keterangan || ''}); setShowReportModal(true); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl italic"><Edit3 size={14}/></button><button onClick={() => deleteDoc(doc(db, "reports", r.id))} className="p-2 bg-red-50 text-red-400 rounded-xl italic"><Trash2 size={14}/></button></>}
                            {activeTab === 'penilaian' && (
                              <>
                                {['ketua', 'admin'].includes(user.role) && <button onClick={() => submitGrade(r.id, 'ketua')} className="bg-amber-400 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase shadow-sm italic">Ketua</button>}
                                {['pimpinan', 'admin'].includes(user.role) && <button onClick={() => submitGrade(r.id, 'pimpinan')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase shadow-sm italic">Pimp</button>}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL LAPORAN */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 font-sans italic">
          <form onSubmit={handleSubmitReport} className="bg-white w-full max-w-2xl rounded-[3.5rem] p-12 shadow-2xl relative italic">
            <button type="button" onClick={() => { resetReportForm(); setShowReportModal(false); }} className="absolute top-8 right-8 p-4 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all italic"><X size={20}/></button>
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-8 text-slate-800 italic">{isEditing ? "Update Pekerjaan" : (activeTab === 'penilaian' ? "Entri Pekerjaan Anggota" : "Entri Pekerjaan Saya")}</h3>
            <div className="space-y-5 italic">
               {activeTab === 'penilaian' && !isEditing && (
                  <select required className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-indigo-600 border border-slate-100 italic" value={newReport.targetUser} onChange={e => setNewReport({...newReport, targetUser: e.target.value})}>
                        <option value="">-- Pilih Nama Pegawai --</option>
                        {users.filter(u => !['admin', 'pimpinan'].includes(u.role)).map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                  </select>
               )}
               <input required type="text" placeholder="Uraian Pekerjaan" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 italic" value={newReport.title} onChange={e => setNewReport({...newReport, title: e.target.value})} />
               <div className="grid grid-cols-2 gap-5 italic">
                  <input required type="number" placeholder="Target" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 italic" value={newReport.target} onChange={e => setNewReport({...newReport, target: e.target.value})} />
                  <input required type="number" placeholder="Realisasi" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 italic" value={newReport.realisasi} onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
               </div>
               <input list="satuan-list" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-800 border border-slate-100 italic" placeholder="Satuan" value={newReport.satuan} onChange={e => setNewReport({...newReport, satuan: e.target.value})} />
               <datalist id="satuan-list"><option value="Dokumen"/><option value="Kegiatan"/><option value="Laporan"/><option value="Paket"/></datalist>
               <textarea className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold h-24 resize-none text-slate-600 border border-slate-100 italic" placeholder="Keterangan..." value={newReport.keterangan} onChange={e => setNewReport({...newReport, keterangan: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-6 rounded-2xl shadow-xl uppercase tracking-widest text-xs mt-8 italic">Simpan Data</button>
          </form>
        </div>
      )}

      {/* MODAL USER */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 font-sans italic">
          <form onSubmit={handleAddOrEditUser} className="bg-white w-full max-w-xl rounded-[3rem] p-12 shadow-2xl relative italic">
            <button type="button" onClick={() => { setShowUserModal(false); resetUserForm(); }} className="absolute top-8 right-8 p-4 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all italic"><X size={20}/></button>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 text-slate-800 italic">{isEditingUser ? "Edit Akun Pegawai" : "Tambah Pegawai"}</h3>
            <div className="space-y-4 italic">
                <input required type="text" placeholder="Nama Lengkap" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 border border-slate-100 italic" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4 italic">
                    <input required type="text" placeholder="Username" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 border border-slate-100 italic" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                    <input required type="password" placeholder="Password" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 border border-slate-100 italic" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                </div>
                <input type="text" placeholder="Jabatan" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 border border-slate-100 italic" value={newUser.jabatan} onChange={e => setNewUser({...newUser, jabatan: e.target.value})} />
                <select className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-600 border border-slate-100 italic" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                    <option value="pegawai">Pegawai</option><option value="ketua">Ketua Tim</option><option value="pimpinan">Pimpinan</option><option value="admin">Admin</option>
                </select>
                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-6 rounded-2xl shadow-xl uppercase tracking-widest text-[10px] mt-6 transition-all active:scale-95 italic">Simpan Pegawai</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
