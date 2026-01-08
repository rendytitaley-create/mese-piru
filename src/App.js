import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ShieldCheck, Loader2, LogOut, BarChart3, FileText, Plus, X } from 'lucide-react';

// === 🚩 PASTIKAN DATA INI BENAR-BENAR COCOK DENGAN FIREBASE ANDA ===
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
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Login anonim supaya bisa baca database
    signInAnonymously(auth).catch(e => console.error("Koneksi Firebase Gagal:", e));

    // Ambil data user & report dari Firebase secara otomatis
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unsubReports = onSnapshot(collection(db, "reports"), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Cek apakah sudah ada sesi login tersimpan
    const saved = localStorage.getItem('piru_session_final');
    if (saved) {
      setUser(JSON.parse(saved));
    }
    
    setLoading(false);
    return () => { unsubUsers(); unsubReports(); };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    // Pastikan database sudah terisi sebelum mengecek
    if (users.length === 0) {
      setAuthError('Database masih kosong atau sedang memuat...');
      return;
    }

    const found = users.find(u => 
      u.username.toString().trim() === authForm.username.trim() && 
      u.password.toString().trim() === authForm.password.trim()
    );
    
    if (found) {
      setUser(found);
      localStorage.setItem('piru_session_final', JSON.stringify(found));
      setAuthError('');
    } else {
      setAuthError('Username atau Password salah!');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('piru_session_final');
    setUser(null);
    window.location.reload();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={50} /></div>;

  if (!user) return (
    <div className="h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
            <ShieldCheck size={60} className="mx-auto text-indigo-600 mb-2" />
            <h1 className="text-3xl font-black text-slate-800">PIRU LOGIN</h1>
            <p className="text-slate-400 text-sm">BPS Kabupaten Seram Bagian Barat</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100">{authError}</div>}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 ml-2">USERNAME</label>
            <input type="text" placeholder="Masukkan username" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
              onChange={e => setAuthForm({...authForm, username: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 ml-2">PASSWORD</label>
            <input type="password" placeholder="Masukkan password" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
              onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">MASUK APLIKASI</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Menu */}
      <div className="w-64 bg-white border-r p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-10">
          <div className="bg-indigo-600 p-2 rounded-lg text-white"><ShieldCheck size={20}/></div>
          <span className="font-black text-xl text-slate-800">PIRU</span>
        </div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}><BarChart3 size={20}/> Dashboard</button>
          <button onClick={() => setActiveTab('laporan')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'laporan' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={20}/> Laporan</button>
        </nav>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all mt-auto"><LogOut size={20}/> Keluar</button>
      </div>

      {/* Konten Utama */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[2.5rem] p-10 text-white mb-10 shadow-xl shadow-indigo-100">
           <h1 className="text-3xl font-black">Halo, {user.name}!</h1>
           <p className="opacity-80 font-medium">Anda login sebagai <span className="bg-white/20 px-2 py-0.5 rounded text-sm uppercase">{user.role}</span></p>
        </div>

        {activeTab === 'dashboard' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Laporan</p>
                    <p className="text-4xl font-black text-slate-800">{reports.length}</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <p className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-2">Pending</p>
                    <p className="text-4xl font-black text-slate-800">{reports.filter(r => r.status === 'pending').length}</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all text-green-600">
                    <p className="text-green-500 text-xs font-bold uppercase tracking-wider mb-2">Disetujui</p>
                    <p className="text-4xl font-black">{reports.filter(r => r.status === 'selesai').length}</p>
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <p className="text-center text-slate-400 py-10 font-medium italic">Data laporan akan muncul di sini. Silakan gunakan fitur tambah laporan di menu asli Anda nanti.</p>
            </div>
        )}
      </main>
    </div>
  );
};

export default PIRUApp;
