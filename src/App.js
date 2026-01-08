import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, query, orderBy, deleteDoc
} from 'firebase/firestore';
import { 
  ShieldCheck, Loader2, Plus, X, BarChart3, FileText, 
  LogOut, CheckCircle, Award, Users, Trash2, CheckCircle2, Edit3, TrendingUp, AlertCircle, Clock
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
  const [newReport, setNewReport] = useState({ title: '', target: '', realisasi: '', satuan: '', keterangan: '' });
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'pegawai', jabatan: '' });

  const resetForm = () => {
    setIsEditing(false);
    setCurrentReportId(null);
    setNewReport({ title: '', target: '', realisasi: '', satuan: '', keterangan: '' });
  };

  useEffect(() => {
    signInAnonymously(auth);
    const unsubscribe = onAuthStateChanged(auth, (fUser) => {
      const saved = localStorage.getItem('piru_session_final');
      if (saved) { setUser(JSON.parse(saved)); }
      setLoading(false);
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));
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
    // LOGIKA LOGIN: Case Insensitive (Huruf besar/kecil diabaikan)
    const inputUser = authForm.username.trim().toLowerCase();
    const found = users.find(u => u.username.toLowerCase() === inputUser && u.password === authForm.password);
    
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session_final', JSON.stringify(found));
    } else { setAuthError('Username atau Password Salah!'); }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    try {
      if (isEditing && currentReportId) {
        await updateDoc(doc(db, "reports", currentReportId), {
          ...newReport, target: Number(newReport.target), realisasi: Number(newReport.realisasi),
        });
      } else {
        await addDoc(collection(db, "reports"), {
          ...newReport, target: Number(newReport.target), realisasi: Number(newReport.realisasi),
          userId: user.username, userName: user.name, userRole: user.role,
          month: selectedMonth, year: selectedYear, status: 'pending', nilaiKetua: 0, nilaiPimpinan: 0, createdAt: serverTimestamp()
        });
      }
      setShowReportModal(false);
      resetForm();
    } catch (err) { alert("Gagal menyimpan laporan."); }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "users"), { 
        ...newUser, 
        username: newUser.username.trim().toLowerCase(), // Simpan username selalu huruf kecil
        createdAt: serverTimestamp() 
      });
      setShowUserModal(false);
      setNewUser({ name: '', username: '', password: '', role: 'pegawai', jabatan: '' });
      alert("Pegawai Berhasil Ditambahkan!");
    } catch (err) { alert("Gagal menambah pegawai."); }
  };

  const submitGrade = async (reportId, roleName) => {
    const val = prompt(`Masukkan Nilai ${roleName === 'ketua' ? 'Ketua Tim' : 'Pimpinan'} (Bisa Desimal):`);
    if (val && !isNaN(val)) {
        const grade = parseFloat(val);
        const ref = doc(db, "reports", reportId);
        if (roleName === 'ketua') await updateDoc(ref, { nilaiKetua: grade, status: 'dinilai_ketua' });
        else if (roleName === 'pimpinan') await updateDoc(ref, { nilaiPimpinan: grade, status: 'selesai' });
    }
  };

  const filteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (user?.role === 'pegawai') res = res.filter(r => r.userId === user.username);
    if (user?.role === 'pimpinan' || user?.role === 'admin' || user?.role === 'ketua') {
      if (filterStaffName !== 'Semua') res = res.filter(r => r.userName === filterStaffName);
    }
    return res;
  }, [reports, user, selectedMonth, selectedYear, filterStaffName]);

  const dashboardStats = useMemo(() => {
    const periodReports = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    const getStatusInfo = (userReports) => {
      const total = userReports.length;
      if (total === 0) return { text: "Belum Lapor", count: "0/0" };
      const selesai = userReports.filter(r => r.status === 'selesai').length;
      const progress = userReports.filter(r => r.status === 'dinilai_ketua').length;
      let statusText = "Pending (Ketua Tim)";
      if (selesai === total) statusText = "Selesai";
      else if (progress > 0 || selesai > 0) statusText = "Progres Penilaian";
      return { text: statusText, count: `${selesai} dari ${total} Selesai` };
    };
    const staffSummary = users.filter(u => u.role !== 'admin' && u.role !== 'pimpinan').map(s => {
      const sReports = periodReports.filter(r => r.userId === s.username);
      const total = sReports.length;
      const avgCap = total > 0 ? (sReports.reduce((acc, curr) => acc + Math.min((curr.realisasi / curr.target) * 100, 100), 0) / total) : 0;
      const avgPimp = total > 0 ? (sReports.reduce((acc, curr) => acc + (Number(curr.nilaiPimpinan) || 0), 0) / total) : 0;
      const statusInfo = getStatusInfo(sReports);
      return { name: s.name, total, nilaiAkhir: ((avgCap + avgPimp) / 2).toFixed(2), status: statusInfo.text, detailCount: statusInfo.count };
    });
    const myReports = periodReports.filter(r => r.userId === user?.username);
    const myTotal = myReports.length;
    const myAvgCap = myTotal > 0 ? (myReports.reduce((acc, curr) => acc + Math.min((curr.realisasi / curr.target) * 100, 100), 0) / myTotal) : 0;
    const myAvgPimp = myTotal > 0 ? (myReports.reduce((acc, curr) => acc + (Number(curr.nilaiPimpinan) || 0), 0) / myTotal) : 0;
    const myStatusInfo = getStatusInfo(myReports);
    return { myTotal, myNilaiAkhir: ((myAvgCap + myAvgPimp) / 2).toFixed(2), staffSummary, myAvgCap: myAvgCap.toFixed(2), myAvgPimp: myAvgPimp.toFixed(2), myStatus: myStatusInfo.text, myDetailCount: myStatusInfo.count };
  }, [reports, users, user, selectedMonth, selectedYear]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 font-sans"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (!user) return (
    <div className="h-screen bg-indigo-900 flex items-center justify-center p-4 text-slate-800 font-sans">
      <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl text-center">
        <ShieldCheck size={60} className="mx-auto text-indigo-600 mb-4" />
        <h1 className="text-3xl font-black mb-8 tracking-tighter uppercase leading-none font-sans">PIRU LOGIN</h1>
        <form onSubmit={handleLogin} className="space-y-4 text-left font-sans">
          <input type="text" placeholder="Username" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl uppercase active:scale-95 transition-all">Masuk</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden text-slate-800">
      <div className="w-72 bg-white border-r p-8 flex flex-col hidden md:flex">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-100"><ShieldCheck size={24}/></div>
          <span className="font-black text-2xl text-slate-800 tracking-tighter uppercase font-sans text-indigo-600 leading-none">PIRU BPS</span>
        </div>
        <nav className="flex-1 space-y-3 font-sans">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><BarChart3 size={20}/> Dashboard</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={20}/> Penilaian Kerja</button>
          {user.role === 'admin' && (
            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={20}/> Data Pegawai</button>
          )}
        </nav>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} className="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all mt-auto font-sans"><LogOut size={20}/> Keluar</button>
      </div>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none font-sans">HALO, {user.name}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 font-sans">{user.jabatan || user.role}</p>
          </div>
          <div className="flex items-center gap-4 font-sans">
            <select className="bg-white border rounded-2xl px-6 py-3 font-black text-slate-600 shadow-sm outline-none cursor-pointer" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            {(user.role === 'pegawai' || user.role === 'ketua') && (
                <button onClick={() => { resetForm(); setShowReportModal(true); }} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs active:scale-95 transition-all"><Plus size={18}/> Lapor</button>
            )}
            {user.role === 'admin' && activeTab === 'users' && (
                <button onClick={() => setShowUserModal(true)} className="bg-green-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs active:scale-95 transition-all"><Plus size={18}/> Pegawai</button>
            )}
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="space-y-8 animate-in fade-in duration-500 font-sans">
                {(user.role === 'pimpinan' || user.role === 'admin') ? (
                    <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden p-8">
                        <h3 className="font-black text-xl mb-6 flex items-center gap-2 uppercase tracking-tighter"><TrendingUp className="text-indigo-600"/> Pemantauan Seluruh Pegawai</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {dashboardStats.staffSummary.map((s, i) => (
                                <div key={i} className="p-7 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between hover:border-indigo-200 transition-all group">
                                    <div className="mb-4">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-tight">{s.name}</p>
                                            {s.status === "Selesai" ? <CheckCircle2 size={16} className="text-green-500"/> : 
                                             s.status === "Progres Penilaian" ? <Clock size={16} className="text-amber-500 animate-pulse"/> : 
                                             <AlertCircle size={16} className="text-slate-300"/>}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className={`text-[9px] w-fit font-black uppercase px-2 py-0.5 rounded-lg ${s.status === 'Selesai' ? 'bg-green-100 text-green-600' : s.status === 'Progres Penilaian' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                                              {s.status}
                                          </span>
                                          <span className="text-[9px] font-bold text-slate-400 ml-1 uppercase">{s.detailCount}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs font-bold text-slate-400">{s.total} Pekerjaan</p>
                                        <p className="text-4xl font-black text-indigo-600 tracking-tighter">{s.nilaiAkhir}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border"><p className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest leading-none font-sans">Pekerjaan Saya</p><p className="text-4xl font-black tracking-tighter">{dashboardStats.myTotal}</p></div>
                          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border text-indigo-500"><p className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest leading-none font-sans">Avg % Capaian</p><p className="text-4xl font-black tracking-tighter">{dashboardStats.myAvgCap}%</p></div>
                          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border text-green-600"><p className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-widest leading-none font-sans">Avg Pimpinan</p><p className="text-4xl font-black tracking-tighter">{dashboardStats.myAvgPimp}</p></div>
                          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border text-amber-500 ring-4 ring-amber-100"><p className="text-slate-400 text-[10px] font-black uppercase mb-3 font-bold tracking-widest leading-none font-sans">NILAI AKHIR</p><p className="text-5xl font-black tracking-tighter">{dashboardStats.myNilaiAkhir}</p></div>
                      </div>
                      <div className="bg-indigo-900 rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-200">
                          <div className="space-y-2">
                              <h2 className="text-3xl font-black uppercase tracking-tighter leading-none font-sans">Status Penilaian</h2>
                              <p className="text-indigo-200 font-sans text-sm">Update progres penyelesaian laporan kinerja bulan {selectedMonth}.</p>
                          </div>
                          <div className="bg-white/10 p-8 rounded-[2rem] text-center min-w-[280px] border border-white/10">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 font-sans">Progres Saat Ini</p>
                              <div className="flex flex-col items-center justify-center gap-1">
                                <div className="flex items-center gap-3">
                                  {dashboardStats.myStatus === "Selesai" ? <CheckCircle2 className="text-green-400"/> : <Clock className="text-amber-400 animate-pulse"/>}
                                  <p className="text-2xl font-black uppercase tracking-tight font-sans">{dashboardStats.myStatus}</p>
                                </div>
                                <p className="text-[11px] font-black text-indigo-200 uppercase tracking-widest mt-1">{dashboardStats.myDetailCount}</p>
                              </div>
                          </div>
                      </div>
                    </div>
                )}
          </div>
        ) : activeTab === 'users' && user.role === 'admin' ? (
            <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden p-8 text-sm font-sans">
                <table className="w-full text-left font-sans text-slate-800">
                    <thead><tr className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="p-6">Pegawai</th><th className="p-6">Jabatan</th><th className="p-6 text-center">Aksi</th></tr></thead>
                    <tbody>{users.map(u => (<tr key={u.firestoreId} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="p-6 font-black text-slate-800 uppercase text-sm">{u.name} <span className="text-indigo-400 text-[10px] font-bold lowercase ml-2">@{u.username}</span></td>
                        <td className="p-6 font-bold text-slate-500 text-xs uppercase">{u.jabatan} ({u.role})</td>
                        <td className="p-6 text-center"><button onClick={() => deleteDoc(doc(db, "users", u.firestoreId))} className="text-slate-300 hover:text-red-500 transition-all"><Trash2 size={20}/></button></td>
                    </tr>))}</tbody>
                </table>
            </div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden p-8 space-y-6 animate-in fade-in duration-500 font-sans text-slate-800">
            <div className="flex flex-col md:flex-row justify-between gap-4 font-sans">
                <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2 font-sans text-slate-800"><CheckCircle2 className="text-indigo-600"/> Daftar Penilaian Pegawai</h3>
                {(user.role === 'admin' || user.role === 'pimpinan' || user.role === 'ketua') && (
                    <select className="p-3 bg-slate-50 border-none rounded-xl font-bold text-xs outline-none cursor-pointer text-slate-600" value={filterStaffName} onChange={e => setFilterStaffName(e.target.value)}>
                        <option value="Semua">Semua Pegawai</option>
                        {users.filter(u => u.role !== 'admin' && u.role !== 'pimpinan').map(u => <option key={u.firestoreId} value={u.name}>{u.name}</option>)}
                    </select>
                )}
            </div>
            <div className="overflow-x-auto text-sm font-sans text-slate-800">
              <table className="w-full text-left font-sans text-slate-800">
                <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr><th className="p-8">Detail Kegiatan</th><th className="p-8 text-center">T/R</th><th className="p-8 text-center">Capaian</th><th className="p-8 text-center">N.Ketua</th><th className="p-8 text-center">N.Pimp</th><th className="p-8 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredReports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-8">
                        <p className="font-black text-xl text-slate-800 uppercase leading-none mb-2 tracking-tighter">{r.title}</p>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{r.userName} • {r.keterangan || "No Desc"}</p>
                      </td>
                      <td className="p-8 text-center font-black text-slate-700">{r.realisasi} / {r.target} <span className="text-[10px] block text-slate-400 lowercase">{r.satuan}</span></td>
                      <td className="p-8 text-center font-black text-indigo-600">{((r.realisasi/r.target)*100).toFixed(1)}%</td>
                      <td className="p-8 text-center font-black text-slate-400 text-lg">{r.nilaiKetua || '-'}</td>
                      <td className="p-8 text-center font-black text-indigo-600 text-lg">{r.nilaiPimpinan || '-'}</td>
                      <td className="p-8 text-center">
                         <div className="flex justify-center items-center gap-2">
                            {(r.userId === user.username && r.status === 'pending') && (
                                <><button onClick={() => handleEditClick(r)} className="text-indigo-600 p-2 hover:bg-indigo-50 rounded-xl"><Edit3 size={18}/></button><button onClick={() => deleteDoc(doc(db, "reports", r.id))} className="text-red-400 p-2 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button></>
                            )}
                            {user.role === 'admin' && (
                               <button onClick={() => { if(window.confirm("Hapus laporan?")) deleteDoc(doc(db, "reports", r.id)) }} className="text-red-200 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                            )}
                            {(user.role === 'admin' || user.role === 'ketua') && r.userId !== user.username && r.status !== 'selesai' && (
                                <button onClick={() => submitGrade(r.id, 'ketua')} className="bg-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md">{r.status === 'dinilai_ketua' ? 'Koreksi' : 'Ketua'}</button>
                            )}
                            {(user.role === 'pimpinan' || user.role === 'admin') && r.userId !== user.username && (r.status === 'dinilai_ketua' || r.status === 'selesai' || (r.userRole === 'ketua' && r.status === 'pending')) && (
                                <button onClick={() => submitGrade(r.id, 'pimpinan')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md">{r.status === 'selesai' ? 'Koreksi Nilai' : 'Pimpinan'}</button>
                            )}
                            {r.status === 'selesai' && user.role === 'pegawai' && <CheckCircle2 className="text-green-500" size={24}/>}
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

      {/* Modal Laporan */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 text-slate-800 font-sans">
          <form onSubmit={handleSubmitReport} className="bg-white w-full max-w-2xl rounded-[3.5rem] p-12 shadow-2xl space-y-6 animate-in zoom-in-95 font-sans">
            <h3 className="text-3xl font-black uppercase tracking-tighter">{isEditing ? "Edit Laporan" : "Entri Kinerja"}</h3>
            <div className="space-y-4 font-sans text-slate-800">
               <input required type="text" placeholder="Pekerjaan" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-700" value={newReport.title} onChange={e => setNewReport({...newReport, title: e.target.value})} />
               <div className="grid grid-cols-2 gap-4">
                  <input required type="number" placeholder="Target" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-700" value={newReport.target} onChange={e => setNewReport({...newReport, target: e.target.value})} />
                  <input required type="number" placeholder="Realisasi" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-700" value={newReport.realisasi} onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
               </div>
               <input list="satuan-list" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 font-sans" placeholder="Satuan" value={newReport.satuan} onChange={e => setNewReport({...newReport, satuan: e.target.value})} />
               <datalist id="satuan-list"><option value="Dokumen"/><option value="Kegiatan"/><option value="Laporan"/><option value="Paket"/><option value="BS"/><option value="Ruta"/></datalist>
               <textarea className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black h-24 resize-none text-slate-700" placeholder="Keterangan" value={newReport.keterangan} onChange={e => setNewReport({...newReport, keterangan: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-xl uppercase transition-all active:scale-95 tracking-widest">Simpan Laporan</button>
            <button type="button" onClick={() => { resetForm(); setShowReportModal(false); }} className="w-full text-slate-400 font-bold uppercase text-[10px]">Batal</button>
          </form>
        </div>
      )}

      {/* Modal User */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 text-slate-800 font-sans">
          <form onSubmit={handleAddUser} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl space-y-4 font-sans text-slate-800">
            <h3 className="text-2xl font-black uppercase tracking-tighter">Tambah Pegawai</h3>
            <input required type="text" placeholder="Nama Lengkap" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" onChange={e => setNewUser({...newUser, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
                <input required type="text" placeholder="Username" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" onChange={e => setNewUser({...newUser, username: e.target.value})} />
                <input required type="password" placeholder="Password" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <input type="text" placeholder="Jabatan" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" onChange={e => setNewUser({...newUser, jabatan: e.target.value})} />
            <select className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-600 font-sans" onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="pegawai">Pegawai</option><option value="ketua">Ketua Tim</option><option value="pimpinan">Pimpinan</option><option value="admin">Admin</option>
            </select>
            <button type="submit" className="w-full bg-green-600 text-white font-black py-5 rounded-[2rem] shadow-xl transition-all active:scale-95 uppercase tracking-widest font-sans">Simpan Pegawai</button>
            <button type="button" onClick={() => setShowUserModal(false)} className="w-full text-slate-400 font-bold uppercase text-[10px] mt-2">Batal</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
