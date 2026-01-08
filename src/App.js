import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, query, orderBy, deleteDoc
} from 'firebase/firestore';
import { 
  ShieldCheck, Loader2, Plus, X, BarChart3, FileText, 
  LogOut, CheckCircle, Award, Users, Trash2, CheckCircle2
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
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [newReport, setNewReport] = useState({ title: '', target: '', realisasi: '', satuan: '', keterangan: '' });
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'pegawai', jabatan: '' });

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
    const found = users.find(u => u.username === authForm.username && u.password === authForm.password);
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session_final', JSON.stringify(found));
    } else { setAuthError('Username atau Password Salah!'); }
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "reports"), {
        ...newReport,
        target: Number(newReport.target),
        realisasi: Number(newReport.realisasi),
        userId: user.username,
        userName: user.name,
        month: selectedMonth,
        year: selectedYear,
        status: 'pending',
        nilaiKetua: 0,
        nilaiPimpinan: 0,
        createdAt: serverTimestamp()
      });
      setShowReportModal(false);
      setNewReport({ title: '', target: '', realisasi: '', satuan: '', keterangan: '' });
    } catch (err) { alert("Gagal menyimpan laporan."); }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "users"), { ...newUser, createdAt: serverTimestamp() });
      setShowUserModal(false);
      setNewUser({ name: '', username: '', password: '', role: 'pegawai', jabatan: '' });
    } catch (err) { alert("Gagal menambah pegawai."); }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Hapus pegawai?")) await deleteDoc(doc(db, "users", id));
  };

  // FUNGSI PENILAIAN BERJENJANG (DESIMAL SUPPORT)
  const submitGrade = async (reportId, role) => {
    const val = prompt(`Masukkan Nilai ${role === 'admin' ? 'Ketua Tim' : 'Pimpinan'} (Bisa Desimal, misal: 92.5):`);
    if (val && !isNaN(val)) {
        const grade = parseFloat(val);
        const ref = doc(db, "reports", reportId);
        if (role === 'admin') {
            await updateDoc(ref, { nilaiKetua: grade, status: 'dinilai_ketua' });
        } else if (role === 'pimpinan') {
            await updateDoc(ref, { nilaiPimpinan: grade, status: 'selesai' });
        }
    } else if (val) {
        alert("Masukkan angka yang valid!");
    }
  };

  const filteredReports = useMemo(() => {
    let res = reports.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (user?.role === 'pegawai') res = res.filter(r => r.userId === user.username);
    return res;
  }, [reports, user, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const total = filteredReports.length;
    const selesai = filteredReports.filter(r => r.status === 'selesai').length;
    const avg = total > 0 ? (filteredReports.reduce((acc, curr) => acc + (Number(curr.nilaiPimpinan) || 0), 0) / total).toFixed(2) : 0;
    return { total, selesai, avg };
  }, [filteredReports]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (!user) return (
    <div className="h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
        <h1 className="text-3xl font-black text-center mb-8 text-slate-800 tracking-tighter">PIRU LOGIN</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100">{authError}</div>}
          <input type="text" placeholder="Username" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl uppercase tracking-widest">Masuk</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
      <div className="w-72 bg-white border-r p-8 flex flex-col hidden md:flex">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg"><ShieldCheck size={24}/></div>
          <span className="font-black text-2xl text-slate-800 tracking-tighter">PIRU</span>
        </div>
        <nav className="flex-1 space-y-3">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><BarChart3 size={22}/> Dashboard</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'laporan' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={22}/> Laporan Kerja</button>
          {user.role === 'admin' && (
            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={22}/> Data Pegawai</button>
          )}
        </nav>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} className="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all mt-auto"><LogOut size={22}/> Keluar</button>
      </div>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight tracking-tighter uppercase">HALO, {user.name}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{user.jabatan || user.role}</p>
          </div>
          <div className="flex items-center gap-4">
            <select className="bg-white border rounded-2xl px-6 py-3 font-black text-slate-600 shadow-sm" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            {user.role !== 'pimpinan' && activeTab === 'laporan' && (
                <button onClick={() => setShowReportModal(true)} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs"><Plus size={18}/> Lapor</button>
            )}
            {user.role === 'admin' && activeTab === 'users' && (
                <button onClick={() => setShowUserModal(true)} className="bg-green-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all uppercase tracking-widest text-xs"><Plus size={18}/> Pegawai</button>
            )}
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Total Kegiatan</p>
              <p className="text-6xl font-black text-slate-800">{stats.total}</p>
            </div>
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 text-green-600">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Selesai (Pimpinan)</p>
              <p className="text-6xl font-black">{stats.selesai}</p>
            </div>
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 text-amber-500">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Rata-rata Nilai Akhir</p>
              <p className="text-6xl font-black">{stats.avg}</p>
            </div>
          </div>
        ) : activeTab === 'users' ? (
            <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                    <thead><tr className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="p-6">Pegawai</th><th className="p-6">Jabatan</th><th className="p-6 text-center">Aksi</th></tr></thead>
                    <tbody>{users.map(u => (<tr key={u.firestoreId} className="border-b">
                        <td className="p-6 font-black text-slate-800 uppercase text-sm">{u.name} <span className="text-indigo-300 lowercase text-[10px]">@{u.username}</span></td>
                        <td className="p-6 font-bold text-slate-500 text-xs uppercase">{u.jabatan}</td>
                        <td className="p-6 text-center"><button onClick={() => handleDeleteUser(u.firestoreId)} className="text-slate-300 hover:text-red-500"><Trash2 size={20}/></button></td>
                    </tr>))}</tbody>
                </table>
            </div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-8">Detail Kegiatan</th>
                    <th className="p-8 text-center">Target/Realisasi</th>
                    <th className="p-8 text-center">Capaian (%)</th>
                    <th className="p-8 text-center">Nilai Ketua</th>
                    <th className="p-8 text-center">Nilai Pimpinan</th>
                    <th className="p-8 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredReports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-8">
                        <p className="font-black text-xl text-slate-800 uppercase leading-none mb-2">{r.title}</p>
                        <p className="text-slate-400 text-[10px] font-black uppercase">{r.userName} • {r.keterangan || "Tanpa Keterangan"}</p>
                      </td>
                      <td className="p-8 text-center font-black text-slate-700 text-lg">{r.realisasi} / {r.target} <span className="text-[10px] block text-slate-400 uppercase">{r.satuan}</span></td>
                      <td className="p-8 text-center">
                        <div className="font-black text-indigo-600 text-xl">{((r.realisasi/r.target)*100).toFixed(1)}%</div>
                      </td>
                      <td className="p-8 text-center font-black text-2xl text-slate-400">{r.nilaiKetua || '-'}</td>
                      <td className="p-8 text-center font-black text-2xl text-indigo-600">{r.nilaiPimpinan || '-'}</td>
                      <td className="p-8 text-center">
                         {/* LOGIKA PENILAIAN BERJENJANG */}
                         {user.role === 'admin' && r.status === 'pending' && (
                            <button onClick={() => submitGrade(r.id, 'admin')} className="bg-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md">Beri Nilai Ketua</button>
                         )}
                         {user.role === 'pimpinan' && r.status === 'dinilai_ketua' && (
                            <button onClick={() => submitGrade(r.id, 'pimpinan')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md">Beri Nilai Pimpinan</button>
                         )}
                         {r.status === 'selesai' && <CheckCircle2 className="text-green-500 mx-auto" size={24}/>}
                         {r.status === 'pending' && user.role === 'pimpinan' && <span className="text-[9px] font-bold text-slate-300 uppercase">Menunggu Ketua Tim</span>}
                         {r.status === 'dinilai_ketua' && user.role === 'admin' && <span className="text-[9px] font-bold text-green-500 uppercase">Sudah Dinilai</span>}
                         {user.role === 'pegawai' && <span className={`text-[9px] font-black uppercase ${r.status === 'selesai' ? 'text-green-600' : 'text-amber-500'}`}>{r.status}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL LAPORAN */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddReport} className="bg-white w-full max-w-2xl rounded-[3.5rem] p-12 shadow-2xl space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black uppercase tracking-tighter">Entri Kinerja</h3><button type="button" onClick={() => setShowReportModal(false)}><X size={32}/></button></div>
            <div className="space-y-4">
               <input required type="text" placeholder="Pekerjaan" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black" onChange={e => setNewReport({...newReport, title: e.target.value})} />
               <div className="grid grid-cols-2 gap-4">
                  <input required type="number" placeholder="Target" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black" onChange={e => setNewReport({...newReport, target: e.target.value})} />
                  <input required type="number" placeholder="Realisasi" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black" onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
               </div>
               <input list="satuan-list" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black" placeholder="Satuan" onChange={e => setNewReport({...newReport, satuan: e.target.value})} />
               <datalist id="satuan-list"><option value="Dokumen"/><option value="Berkas"/><option value="Peta"/><option value="RT"/></datalist>
               <textarea className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black h-24" placeholder="Keterangan" onChange={e => setNewReport({...newReport, keterangan: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-xl uppercase">Kirim Laporan</button>
          </form>
        </div>
      )}

      {/* MODAL USER */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddUser} className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl space-y-4">
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Tambah Pegawai</h3>
            <input required type="text" placeholder="Nama Lengkap" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewUser({...newUser, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
                <input required type="text" placeholder="Username" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewUser({...newUser, username: e.target.value})} />
                <input required type="password" placeholder="Password" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <input type="text" placeholder="Jabatan" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewUser({...newUser, jabatan: e.target.value})} />
            <select className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="pegawai">Pegawai</option><option value="pimpinan">Pimpinan</option><option value="admin">Admin (Ketua Tim)</option>
            </select>
            <button type="submit" className="w-full bg-green-600 text-white font-black py-5 rounded-[2rem] shadow-xl">SIMPAN</button>
            <button type="button" onClick={() => setShowUserModal(false)} className="w-full text-slate-400 font-bold uppercase text-[10px]">Batal</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
