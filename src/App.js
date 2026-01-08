import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, 
  serverTimestamp, deleteDoc, query 
} from 'firebase/firestore';
import { 
  User, Users, CheckCircle, FileText, LogOut, ShieldCheck, Loader2, 
  Plus, X, BarChart3, Clock, CheckCircle2, AlertCircle, Save, Trash2, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

// === JANGAN LUPA: ISI KEMBALI CONFIG FIREBASE ANDA DI SINI ===
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [newReport, setNewReport] = useState({ title: '', target: '', realisasi: '', month: new Date().getMonth() + 1 });

  useEffect(() => {
    signInAnonymously(auth);
    const unsubscribe = onAuthStateChanged(auth, (fUser) => {
      const saved = localStorage.getItem('piru_session');
      if (saved) { setUser(JSON.parse(saved)); setIsAuthModalOpen(false); }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubReports = onSnapshot(collection(db, "reports"), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubReports(); unsubUsers(); };
  }, [user]);

  const handleLogin = (e) => {
    e.preventDefault();
    const found = users.find(u => u.username === authForm.username && u.password === authForm.password);
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session', JSON.stringify(found));
      setIsAuthModalOpen(false);
    } else {
      setAuthError('Username/Password salah');
    }
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "reports"), {
        ...newReport,
        userId: user.id,
        userName: user.name,
        status: 'pending',
        createdAt: serverTimestamp(),
        year: new Date().getFullYear()
      });
      setShowReportModal(false);
      setNewReport({ title: '', target: '', realisasi: '', month: new Date().getMonth() + 1 });
    } catch (err) { alert("Gagal menyimpan laporan"); }
  };

  const updateStatus = async (reportId, newStatus) => {
    await updateDoc(doc(db, "reports", reportId), { status: newStatus });
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={48}/></div>;

  if (isAuthModalOpen) return (
    <div className="h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
        <ShieldCheck size={48} className="mx-auto text-indigo-600 mb-4" />
        <h1 className="text-2xl font-bold text-center">LOGIN PIRU</h1>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {authError && <div className="p-3 bg-red-100 text-red-600 rounded-lg text-xs">{authError}</div>}
          <input type="text" placeholder="Username" className="w-full p-4 bg-slate-100 rounded-xl outline-none" 
            onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-4 bg-slate-100 rounded-xl outline-none" 
            onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">MASUK</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Sederhana */}
      <div className="w-64 bg-white border-r p-6">
        <h1 className="font-bold text-2xl text-indigo-600 mb-10">PIRU BPS</h1>
        <nav className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><BarChart3 size={20}/> Dashboard</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'laporan' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><FileText size={20}/> Laporan Kerja</button>
          <button onClick={() => {localStorage.clear(); window.location.reload();}} className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-50"><LogOut size={20}/> Keluar</button>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold uppercase">Halo, {user?.name} ({user?.role})</h2>
          {user?.role === 'pegawai' && (
            <button onClick={() => setShowReportModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Plus size={20}/> Tambah Laporan</button>
          )}
        </div>

        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <p className="text-slate-400 text-xs font-bold uppercase">Total Laporan</p>
              <p className="text-3xl font-black">{reports.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-amber-600">
              <p className="text-slate-400 text-xs font-bold uppercase">Pending</p>
              <p className="text-3xl font-black">{reports.filter(r => r.status === 'pending').length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-green-600">
              <p className="text-slate-400 text-xs font-bold uppercase">Disetujui</p>
              <p className="text-3xl font-black">{reports.filter(r => r.status === 'selesai').length}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-bottom">
                <tr>
                  <th className="p-4 text-xs font-bold uppercase text-slate-400">Kegiatan</th>
                  <th className="p-4 text-xs font-bold uppercase text-slate-400">Target</th>
                  <th className="p-4 text-xs font-bold uppercase text-slate-400">Realisasi</th>
                  <th className="p-4 text-xs font-bold uppercase text-slate-400">Status</th>
                  <th className="p-4 text-xs font-bold uppercase text-slate-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="p-4 font-medium">{r.title}</td>
                    <td className="p-4">{r.target}</td>
                    <td className="p-4">{r.realisasi}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${r.status === 'selesai' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      {user?.role === 'admin' || user?.role === 'pimpinan' ? (
                        <button onClick={() => updateStatus(r.id, 'selesai')} className="text-indigo-600 font-bold text-xs">Setujui</button>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal Tambah Laporan */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleAddReport} className="bg-white w-full max-w-lg rounded-3xl p-8 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Tambah Laporan Baru</h3>
              <button type="button" onClick={() => setShowReportModal(false)}><X/></button>
            </div>
            <input required type="text" placeholder="Nama Kegiatan" className="w-full p-4 bg-slate-100 rounded-xl" onChange={e => setNewReport({...newReport, title: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <input required type="number" placeholder="Target" className="w-full p-4 bg-slate-100 rounded-xl" onChange={e => setNewReport({...newReport, target: e.target.value})} />
              <input required type="number" placeholder="Realisasi" className="w-full p-4 bg-slate-100 rounded-xl" onChange={e => setNewReport({...newReport, realisasi: e.target.value})} />
            </div>
            <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">Simpan Laporan</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PIRUApp;
